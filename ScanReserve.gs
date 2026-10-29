/**
 * ===== สแกนเอกสารกันเงินด้วยมือถือ (อ่านด้วย Gemini) =====
 *
 * ขั้นตอน:
 * 1) หน้าเว็บบนคอมเรียก scan_create  -> ได้รหัสเซสชัน แล้วแสดงเป็น QR
 * 2) มือถือสแกน QR -> เปิดหน้า ?action=scan&s=<รหัส> (หน้านี้ Apps Script สร้างเอง)
 * 3) มือถือถ่ายรูปแล้วส่งมาที่ scan_upload -> เก็บรูปลง Drive + ให้ Gemini อ่าน
 * 4) หน้าเว็บบนคอมถาม scan_status เป็นระยะ -> ได้ผลแล้วเติมลงช่องให้ผู้ใช้ตรวจ
 *
 * การตั้งค่า (ครั้งเดียว):
 *  - Project Settings > Script Properties > เพิ่ม GEMINI_API_KEY = <key ของคุณ>
 *  - (ไม่บังคับ) GEMINI_MODEL = ชื่อรุ่นที่ต้องการใช้ก่อน ถ้าไม่ใส่จะไล่ตาม SCAN_MODELS_
 *  - รันฟังก์ชัน scan_testGemini ในหน้าแก้ไขสคริปต์ 1 ครั้ง เพื่ออนุญาตสิทธิ์ Drive/UrlFetch
 *  - Deploy > Manage deployments > Edit > New version  (URL เดิมไม่เปลี่ยน)
 */

const SCAN_TTL = 600; // อายุ QR (วินาที)
const SCAN_FOLDER_NAME = 'BudgetFlow - สแกนเอกสารกันเงิน';
const SCAN_MAX_IMAGES = 5;
const SCAN_AI_DEADLINE_MS = 75000;    // ให้ AI อ่านได้นานสุด 75 วินาที
const SCAN_STUCK_MS = 240000;         // ถ้า 'กำลังอ่าน' นานเกิน 4 นาที ถือว่าค้าง

function scan_cache_() { return CacheService.getScriptCache(); }
function scan_get_(id) { const v = scan_cache_().get('scan_' + id); return v ? JSON.parse(v) : null; }
function scan_put_(id, obj) { scan_cache_().put('scan_' + id, JSON.stringify(obj), SCAN_TTL); }
function scan_validId_(id) { return /^[a-f0-9]{16}$/.test(String(id || '')); }

function scan_json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** POST action=scan_create  data: { cats:[{code,text}], depts:[...] } */
function scan_create(data) {
  const id = Utilities.getUuid().replace(/-/g, '').slice(0, 16);
  const cats = ((data && data.cats) || []).slice(0, 300).map(c => ({ code: String(c.code || ''), text: String(c.text || '') }));
  const depts = ((data && data.depts) || []).slice(0, 50).map(String);
  scan_put_(id, { status: 'waiting', cats: cats, depts: depts });
  return { success: true, session: id, ttl: SCAN_TTL };
}

/** GET action=scan_status&s=<id> */
function scan_status(id) {
  if (!scan_validId_(id)) return { error: 'รหัสไม่ถูกต้อง' };
  const s = scan_get_(id);
  if (!s) return { success: true, status: 'expired' };
  // สคริปต์ถูกตัดกลางทาง (เช่น เกินเวลา) จะไม่ได้อัปเดตสถานะ -> แจ้งเป็น error แทนการค้าง
  if (s.status === 'processing' && s.startedAt && Date.now() - s.startedAt > SCAN_STUCK_MS) {
    return { success: true, status: 'error', result: null, fileIds: s.fileIds || [], message: 'อ่านเอกสารนานเกินไป (Gemini อาจตอบช้า)' };
  }
  return { success: true, status: s.status, result: s.result || null, fileIds: s.fileIds || [], message: s.message || '', text: s.text || '' };
}

/** GET action=scan_image&s=<id>&f=<fileId>  ส่งรูปกลับเป็น base64 (ไม่ต้องแชร์ไฟล์ใน Drive) */
function scan_image(id, fileId) {
  if (!scan_validId_(id)) return { error: 'รหัสไม่ถูกต้อง' };
  const s = scan_get_(id);
  if (!s || (s.fileIds || []).indexOf(fileId) === -1) return { error: 'ไม่พบรูป หรือ QR หมดอายุแล้ว' };
  const file = DriveApp.getFileById(fileId);
  const blob = file.getBlob();
  return { success: true, mime: blob.getContentType(), data: Utilities.base64Encode(blob.getBytes()), url: file.getUrl() };
}

function scan_folder_() {
  const it = DriveApp.getFoldersByName(SCAN_FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(SCAN_FOLDER_NAME);
}

/** ตั้งสถานะ 'กำลังอ่าน' (กันส่งซ้อน) */
function scan_begin_(id) {
  if (!scan_validId_(id)) throw new Error('QR ไม่ถูกต้อง');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = scan_get_(id);
    if (!s) throw new Error('QR หมดอายุแล้ว กรุณากดปุ่มสแกนใหม่บนคอมพิวเตอร์');
    if (s.status === 'processing' && s.startedAt && Date.now() - s.startedAt < SCAN_STUCK_MS) throw new Error('กำลังอ่านเอกสารชุดก่อนหน้าอยู่ กรุณารอสักครู่');
    s.status = 'processing'; s.result = null; s.message = ''; s.startedAt = Date.now();
    s.fileIds = []; s.text = '';
    scan_put_(id, s);
    return s;
  } finally { lock.releaseLock(); }
}

function scan_saveImages_(images) {
  const folder = scan_folder_();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd_HHmmss');
  return images.map((im, i) => {
    const blob = Utilities.newBlob(Utilities.base64Decode(im.data), im.mime || 'image/jpeg', 'กันเงิน_' + stamp + '_' + (i + 1) + '.jpg');
    return folder.createFile(blob).getId();
  });
}

/** เรียกจากหน้ามือถือผ่าน google.script.run  images: [{mime, data(base64)}] */
function scan_upload(id, images) {
  if (!images || !images.length) throw new Error('ยังไม่มีรูป');
  images = images.slice(0, SCAN_MAX_IMAGES);
  const s = scan_begin_(id);

  let result = null, errMsg = '';
  try {
    // 1) ให้ Gemini อ่านก่อน แล้วส่งผลให้หน้าคอมทันที
    result = scan_askGemini_(images, s.cats, s.depts, '');
    s.status = 'done'; s.result = result;
    scan_put_(id, s);
  } catch (err) { errMsg = err.message; }

  // 2) ค่อยเก็บรูปลง Drive ทีหลัง (หน้าคอมจะดึงรูปมาแสดงเมื่อพร้อม / ใช้กด "ลองอ่านใหม่")
  try {
    s.fileIds = scan_saveImages_(images);
  } catch (err) { if (!errMsg) Logger.log('บันทึกรูปลง Drive ไม่ได้: ' + err.message); }

  if (errMsg) { s.status = 'error'; s.message = errMsg; }
  scan_put_(id, s);
  if (errMsg) throw new Error(errMsg);
  return { success: true, result: result };
}

/** เรียกจากหน้ามือถือ: ส่งข้อความที่คัดลอกจากเอกสาร (เช่น Google Lens) แทนรูป — เร็วกว่ามาก */
function scan_uploadText(id, text) {
  text = String(text || '').trim().slice(0, 20000);
  if (text.length < 10) throw new Error('ข้อความสั้นเกินไป');
  const s = scan_begin_(id);
  s.text = text;
  try {
    const result = scan_askGemini_([], s.cats, s.depts, text);
    s.status = 'done'; s.result = result;
    scan_put_(id, s);
    return { success: true, result: result };
  } catch (err) {
    s.status = 'error'; s.message = err.message;
    scan_put_(id, s);
    throw err;
  }
}

function scan_askGemini_(images, cats, depts, text) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Script Properties');
  const model = props.getProperty('GEMINI_MODEL') || '';

  const catText = (cats || []).filter(c => c.code).map(c => '- ' + c.code + ' : ' + c.text).join('\n') || '(ไม่มีรายการ)';
  const deptText = (depts || []).join(', ') || '(ไม่มีรายการ)';

  const prompt =
`คุณคือเจ้าหน้าที่การเงินของหน่วยงานราชการไทย ข้อมูลที่ให้ (รูป หรือข้อความที่คัดลอกมา) คือเอกสารขออนุมัติกันเงิน/ขอใช้เงินงบประมาณ (อาจมีหลายหน้า)
ให้อ่านแล้วตอบเป็น JSON ตาม schema เท่านั้น โดย:
- refNo: เลขที่หนังสือ (ข้อความหลังคำว่า "ที่" ตอนต้นหนังสือ เช่น "กษ 0915/1234") แปลงเลขไทยเป็นเลขอารบิก
- letterDate: วันที่ของหนังสือ ในรูปแบบ YYYY-MM-DD เป็นปี ค.ศ. (ปี พ.ศ. ลบ 543)
- dept: ฝ่ายเจ้าของเรื่อง เลือกจากรายการนี้เท่านั้น: ${deptText} ถ้าไม่ตรงให้ใส่ ""
- name: ชื่อ-สกุลผู้ขอเบิก/ผู้ยืม/ผู้รับผิดชอบโครงการ ตามที่เขียนในเอกสาร
- items: รายการเงินแต่ละหมวด แต่ละรายการมี
    desc = รายละเอียดโครงการ/วัตถุประสงค์โดยสรุป (ภาษาไทย ไม่เกิน 200 ตัวอักษร)
    amount = จำนวนเงิน (ตัวเลขล้วน ไม่มีจุลภาค)
    catCode = รหัสหมวดที่ตรงที่สุดจากรายการด้านล่าง ถ้าไม่แน่ใจให้ใส่ ""
  ถ้ามียอดรวมและรายการย่อย ให้ใส่เฉพาะรายการย่อย อย่าใส่ยอดรวมซ้ำ
- remark: ใส่ "" เสมอ ยกเว้นเอกสารระบุเลข PO/เลขสัญญาชัดเจน
- notes: หมายเหตุสั้นๆ ภาษาไทย ถึงช่องที่อ่านไม่ชัดหรือไม่แน่ใจ (ถ้าชัดทั้งหมดใส่ "")
ห้ามเดาตัวเลขหรือข้อความที่อ่านไม่ออก ให้ใส่ "" (หรือ 0 สำหรับ amount) แทน

รายการหมวดงบประมาณ:
${catText}`;

  const parts = [{ text: prompt }].concat(images.map(im => ({ inline_data: { mime_type: im.mime || 'image/jpeg', data: im.data } })));
  if (text) parts.push({ text: 'ข้อความจากเอกสาร (คัดลอกด้วย OCR อาจมีตัวอักษรผิดบ้าง):\n' + text });
  const body = {
    contents: [{ role: 'user', parts: parts }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          refNo: { type: 'STRING' },
          letterDate: { type: 'STRING' },
          dept: { type: 'STRING' },
          name: { type: 'STRING' },
          remark: { type: 'STRING' },
          notes: { type: 'STRING' },
          items: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: { desc: { type: 'STRING' }, amount: { type: 'NUMBER' }, catCode: { type: 'STRING' } },
              required: ['desc', 'amount', 'catCode']
            }
          }
        },
        required: ['refNo', 'letterDate', 'dept', 'name', 'items', 'remark', 'notes']
      }
    }
  };

  const txt = scan_callGemini_(key, model, body);
  const j = JSON.parse(txt);
  const outParts = (((j.candidates || [])[0] || {}).content || {}).parts || [];
  const outText = outParts.map(p => p.text || '').join('').trim();
  if (!outText) throw new Error('Gemini ไม่ได้ส่งข้อมูลกลับมา (รูปอาจไม่ชัด)');
  return scan_clean_(JSON.parse(outText), cats, depts);
}

/**
 * เรียก Gemini พร้อมลองใหม่อัตโนมัติ
 * - ถ้าเจอ 429/500/503 (คนใช้เยอะ) จะรอแล้วลองใหม่ 2 ครั้ง
 * - ถ้ายังไม่ได้ จะสลับไปรุ่นสำรองตามลำดับ
 */
// เรียงจากเร็ว -> ช้า  (รุ่น lite เร็วสุดและคนแย่งใช้น้อยกว่า)
// noThink = ปิดโหมด "คิดก่อนตอบ" ของรุ่น 2.5 ซึ่งไม่จำเป็นสำหรับงานอ่านเอกสาร และทำให้ช้าขึ้นหลายเท่า
const SCAN_MODELS_ = [
  { name: 'gemini-2.5-flash-lite', noThink: true },
  { name: 'gemini-2.5-flash', noThink: true },
  { name: 'gemini-flash-lite-latest' },
  { name: 'gemini-flash-latest' }
];

/**
 * เรียก Gemini แบบเน้นเร็ว
 * - ไม่รอลองซ้ำรุ่นเดิม: ถ้ารุ่นไหนล้น (429/5xx) หรือไม่มี (404) ข้ามไปรุ่นถัดไปทันที
 * - ใช้เวลารวมไม่เกิน SCAN_AI_DEADLINE_MS
 */
function scan_callGemini_(key, preferredModel, body) {
  const list = (preferredModel ? [{ name: preferredModel }] : []).concat(SCAN_MODELS_.filter(m => m.name !== preferredModel));
  let lastErr = '';
  const deadline = Date.now() + SCAN_AI_DEADLINE_MS;
  for (let mi = 0; mi < list.length; mi++) {
    const m = list[mi];
    let useNoThink = !!m.noThink;
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() > deadline) throw new Error((lastErr || 'Gemini ตอบช้าเกินไป') + ' — หมดเวลา');
      const req = JSON.parse(JSON.stringify(body));
      if (useNoThink) { req.generationConfig = req.generationConfig || {}; req.generationConfig.thinkingConfig = { thinkingBudget: 0 }; }
      const t0 = Date.now();
      const res = UrlFetchApp.fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(m.name) + ':generateContent',
        { method: 'post', contentType: 'application/json', headers: { 'x-goog-api-key': key }, payload: JSON.stringify(req), muteHttpExceptions: true }
      );
      const code = res.getResponseCode();
      const txt = res.getContentText();
      Logger.log('Gemini ' + m.name + ' -> HTTP ' + code + ' (' + Math.round((Date.now() - t0) / 1000) + ' วินาที)');
      if (code === 200) return txt;
      let msg = txt;
      try { msg = JSON.parse(txt).error.message; } catch (e) {}
      lastErr = 'Gemini ตอบกลับผิดพลาด (' + code + ', ' + m.name + '): ' + String(msg).slice(0, 300);
      if (code === 400 && useNoThink) { useNoThink = false; continue; }  // รุ่นนี้ไม่รับการปิด thinking -> ลองแบบปกติ
      if (code === 401 || code === 403) throw new Error(lastErr);       // key ผิด/ไม่มีสิทธิ์ ลองต่อไม่ช่วย
      break;                                                              // 404/429/5xx/อื่นๆ -> รุ่นถัดไปทันที
    }
  }
  throw new Error(lastErr + ' — ลองกด "ลองอ่านใหม่" อีกครั้งในอีกสักครู่');
}

/** POST action=scan_retry  data:{session}  ให้ Gemini อ่านรูปที่เก็บไว้แล้วใหม่ (ไม่ต้องสแกนซ้ำ) */
function scan_retry(data) {
  const id = data && data.session;
  if (!scan_validId_(id)) return { error: 'รหัสไม่ถูกต้อง' };
  const s = scan_get_(id);
  if (!s) return { error: 'QR หมดอายุแล้ว กรุณาสแกนใหม่' };
  if ((!s.fileIds || !s.fileIds.length) && !s.text) return { error: 'ไม่มีรูปหรือข้อความที่บันทึกไว้ กรุณาสแกนใหม่' };
  try {
    const images = (s.fileIds || []).map(f => {
      const b = DriveApp.getFileById(f).getBlob();
      return { mime: b.getContentType() || 'image/jpeg', data: Utilities.base64Encode(b.getBytes()) };
    });
    s.status = 'processing'; s.startedAt = Date.now(); scan_put_(id, s);
    const result = scan_askGemini_(images, s.cats, s.depts, s.text || '');
    s.status = 'done'; s.result = result; s.message = '';
    scan_put_(id, s);
    return { success: true, result: result, fileIds: s.fileIds };
  } catch (err) {
    s.status = 'error'; s.message = err.message;
    scan_put_(id, s);
    return { error: err.message };
  }
}

/** ตรวจค่าที่ AI ส่งมา ตัดค่าที่ไม่ถูกรูปแบบทิ้ง (ให้ผู้ใช้กรอกเอง ดีกว่าใส่ค่าผิด) */
function scan_clean_(r, cats, depts) {
  r = r || {};
  const str = v => (v == null ? '' : String(v).trim());
  const thaiDigits = s => s.replace(/[๐-๙]/g, d => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(d)));
  const codes = (cats || []).map(c => c.code);

  let date = thaiDigits(str(r.letterDate));
  const m = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    let y = parseInt(m[1], 10);
    if (y > 2400) y -= 543; // เผื่อ AI ส่งปี พ.ศ. มา
    date = (y >= 2000 && y <= 2100) ? (y + '-' + m[2] + '-' + m[3]) : '';
  } else date = '';

  const dept = str(r.dept);
  const items = (Array.isArray(r.items) ? r.items : []).slice(0, 10).map(it => {
    const amt = parseFloat(thaiDigits(str(it.amount)).replace(/,/g, ''));
    const cc = str(it.catCode).toUpperCase();
    return { desc: str(it.desc).slice(0, 500), amount: isFinite(amt) && amt > 0 ? Math.round(amt * 100) / 100 : '', catCode: codes.indexOf(cc) > -1 ? cc : '' };
  }).filter(it => it.desc || it.amount);

  return {
    refNo: thaiDigits(str(r.refNo)).slice(0, 100),
    letterDate: date,
    dept: (depts || []).indexOf(dept) > -1 ? dept : '',
    name: str(r.name).slice(0, 150),
    remark: str(r.remark).slice(0, 200),
    notes: str(r.notes).slice(0, 500),
    items: items
  };
}

/** GET action=scan  -> หน้าเว็บสำหรับมือถือ */
function scan_page(id) {
  const t = HtmlService.createTemplate(SCAN_MOBILE_HTML_);
  t.sid = scan_validId_(id) ? id : '';
  return t.evaluate()
    .setTitle('สแกนเอกสารกันเงิน')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

/** รันในหน้าแก้ไขสคริปต์ 1 ครั้ง: ขอสิทธิ์ Drive/UrlFetch และทดสอบ key */
function scan_testGemini() {
  scan_folder_();
  const key = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!key) throw new Error('ยังไม่ได้ตั้งค่า GEMINI_API_KEY ใน Script Properties');
  const model = PropertiesService.getScriptProperties().getProperty('GEMINI_MODEL') || '';
  const txt = scan_callGemini_(key, model, { contents: [{ parts: [{ text: 'ตอบคำว่า OK คำเดียว' }] }] });
  Logger.log('HTTP 200 : ' + txt.slice(0, 300));
}

const SCAN_MOBILE_HTML_ = `<!DOCTYPE html>
<html><head><base target="_top"><meta charset="utf-8">
<style>
  *{box-sizing:border-box} body{margin:0;font-family:-apple-system,"Segoe UI",Tahoma,sans-serif;background:#f1f5f9;color:#0f172a}
  .wrap{max-width:520px;margin:0 auto;padding:20px 16px 40px}
  h1{font-size:20px;margin:4px 0 4px} p.sub{margin:0 0 18px;color:#64748b;font-size:14px}
  .btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:0;border-radius:12px;padding:16px;font-size:17px;font-weight:700;cursor:pointer}
  .cam{background:#4f46e5;color:#fff} .send{background:#16a34a;color:#fff;margin-top:12px} .send:disabled{background:#94a3b8}
  .thumbs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:16px 0}
  .th{position:relative;border-radius:10px;overflow:hidden;background:#e2e8f0;aspect-ratio:3/4}
  .th img{width:100%;height:100%;object-fit:cover}
  .th button{position:absolute;top:4px;right:4px;border:0;border-radius:50%;width:28px;height:28px;background:rgba(15,23,42,.7);color:#fff;font-size:16px}
  .msg{margin-top:16px;padding:14px;border-radius:12px;font-size:15px;line-height:1.5;display:none}
  .ok{background:#dcfce7;color:#166534} .err{background:#fee2e2;color:#991b1b} .info{background:#e0e7ff;color:#3730a3}
  .tip{font-size:13px;color:#64748b;margin-top:14px;line-height:1.6}
  .or{display:flex;align-items:center;gap:10px;color:#94a3b8;font-size:13px;margin:22px 0 12px}
  .or:before,.or:after{content:"";flex:1;height:1px;background:#cbd5e1}
  textarea{width:100%;min-height:120px;border:1px solid #cbd5e1;border-radius:12px;padding:12px;font-size:15px;font-family:inherit}
  .sendtxt{background:#0ea5e9;color:#fff;margin-top:10px} .sendtxt:disabled{background:#94a3b8}
</style></head>
<body><div class="wrap">
  <h1>📄 สแกนเอกสารกันเงิน</h1>
  <p class="sub">ถ่ายรูปเอกสารทีละหน้า แล้วกดส่ง ข้อมูลจะไปขึ้นที่หน้าจอคอมพิวเตอร์</p>
  <div id="main">
    <button class="btn cam" onclick="document.getElementById('f').click()">📷 ถ่ายรูปเอกสาร</button>
    <input type="file" id="f" accept="image/*" capture="environment" style="display:none">
    <div class="thumbs" id="thumbs"></div>
    <button class="btn send" id="send" disabled onclick="send()">ส่งไปที่คอมพิวเตอร์</button>
    <div class="tip">• วางเอกสารบนพื้นเรียบ ให้เห็นครบทั้งแผ่น ไม่มีเงา<br>• ถ่ายได้สูงสุด ${SCAN_MAX_IMAGES} หน้า</div>
    <div class="or">หรือ (เร็วกว่า)</div>
    <div class="tip" style="margin-top:0;margin-bottom:8px">⚡ เปิด <b>Google Lens</b> ส่องเอกสาร → แตะ <b>"เลือกข้อความทั้งหมด"</b> → <b>"คัดลอก"</b> แล้วกดค้างในช่องด้านล่างเพื่อวาง</div>
    <textarea id="txt" placeholder="วางข้อความจากเอกสารที่นี่" oninput="document.getElementById('sendtxt').disabled=this.value.trim().length<10"></textarea>
    <button class="btn sendtxt" id="sendtxt" disabled onclick="sendText()">ส่งข้อความไปที่คอมพิวเตอร์</button>
  </div>
  <div class="msg" id="msg"></div>
</div>
<script>
  var SID = "<?= sid ?>";
  var MAX = ${SCAN_MAX_IMAGES};
  var imgs = [];
  function show(cls, html){ var m=document.getElementById('msg'); m.className='msg '+cls; m.innerHTML=html; m.style.display='block'; }
  if (!SID) { document.getElementById('main').style.display='none'; show('err','QR ไม่ถูกต้อง กรุณากดสแกนใหม่จากหน้าคอมพิวเตอร์'); }

  document.getElementById('f').addEventListener('change', function(e){
    var file = e.target.files && e.target.files[0]; e.target.value='';
    if (!file) return;
    if (imgs.length >= MAX) { show('err','ถ่ายได้สูงสุด '+MAX+' หน้า'); return; }
    shrink(file, function(dataUrl){ imgs.push(dataUrl); render(); });
  });

  // ย่อรูปให้ด้านยาวไม่เกิน 1600px เพื่อให้ส่งเร็ว แต่ยังอ่านตัวหนังสือได้ชัด
  function shrink(file, cb){
    var r = new FileReader();
    r.onload = function(){
      var im = new Image();
      im.onload = function(){
        var s = Math.min(1, 1600/Math.max(im.width, im.height));
        var c = document.createElement('canvas'); c.width=Math.round(im.width*s); c.height=Math.round(im.height*s);
        c.getContext('2d').drawImage(im,0,0,c.width,c.height);
        cb(c.toDataURL('image/jpeg', 0.8));
      };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  function render(){
    var h=''; imgs.forEach(function(u,i){ h+='<div class="th"><img src="'+u+'"><button onclick="del('+i+')">×</button></div>'; });
    document.getElementById('thumbs').innerHTML=h;
    var b=document.getElementById('send'); b.disabled=!imgs.length;
    b.textContent = imgs.length ? 'ส่ง '+imgs.length+' หน้าไปที่คอมพิวเตอร์' : 'ส่งไปที่คอมพิวเตอร์';
  }
  function del(i){ imgs.splice(i,1); render(); }

  function send(){
    var b=document.getElementById('send'); b.disabled=true; b.textContent='กำลังส่งและอ่านเอกสาร...';
    show('info','⏳ กำลังส่งรูปและให้ระบบอ่านเอกสาร ปกติใช้เวลา 5–20 วินาที');
    var payload = imgs.map(function(u){ return { mime:'image/jpeg', data:u.split(',')[1] }; });
    google.script.run
      .withSuccessHandler(function(){
        document.getElementById('main').style.display='none';
        show('ok','✅ ส่งเรียบร้อย<br>กลับไปที่หน้าคอมพิวเตอร์ ตรวจสอบช่องที่ระบบกรอกให้ แล้วกดบันทึก');
      })
      .withFailureHandler(function(err){
        show('err','❌ '+(err && err.message ? err.message : err)+'<br><small>รูปที่ส่งแล้วจะแสดงบนคอมพิวเตอร์ให้กรอกเองได้</small>');
        b.disabled=false; render();
      })
      .scan_upload(SID, payload);
  }

  function sendText(){
    var b=document.getElementById('sendtxt'); b.disabled=true; b.textContent='กำลังส่ง...';
    show('info','⏳ กำลังจัดข้อมูลลงช่อง ปกติไม่เกิน 10 วินาที');
    google.script.run
      .withSuccessHandler(function(){
        document.getElementById('main').style.display='none';
        show('ok','✅ ส่งเรียบร้อย<br>กลับไปที่หน้าคอมพิวเตอร์ ตรวจสอบช่องที่ระบบกรอกให้ แล้วกดบันทึก');
      })
      .withFailureHandler(function(err){
        show('err','❌ '+(err && err.message ? err.message : err));
        b.disabled=false; b.textContent='ส่งข้อความไปที่คอมพิวเตอร์';
      })
      .scan_uploadText(SID, document.getElementById('txt').value);
  }
</script></body></html>`;
