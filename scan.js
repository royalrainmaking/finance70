/**
 * สแกนเอกสารกันเงินด้วยมือถือ -> เติมข้อมูลลงฟอร์ม "กันเงินใหม่" ให้ผู้ใช้ตรวจสอบก่อนบันทึก
 * ต้องโหลดหลัง app.js (ใช้ API, call, addReserveRow, syncCode, reserveRowCount)
 */
(function () {
  let pollTimer = null;
  let pollUntil = 0;

  // ---------- สไตล์ ----------
  const css = document.createElement('style');
  css.textContent = `
    .scan-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;margin-bottom:16px;padding:12px 16px;
      border:1px dashed #6366f1;border-radius:10px;background:#eef2ff;color:#4338ca;font-weight:700;font-size:14px;cursor:pointer}
    .scan-btn:hover{background:#e0e7ff}
    .scan-filled{background:#fef9c3 !important;box-shadow:inset 0 0 0 2px #facc15 !important}
    #scanPanel{position:fixed;top:72px;right:16px;bottom:16px;width:min(420px,calc(100vw - 32px));background:#fff;border-radius:14px;
      box-shadow:0 20px 50px rgba(15,23,42,.25);z-index:900;display:flex;flex-direction:column;overflow:hidden;border:1px solid #e2e8f0}
    #scanPanel header{display:flex;align-items:center;gap:8px;padding:12px 14px;background:#4f46e5;color:#fff;font-weight:700;font-size:14px}
    #scanPanel header button{margin-left:auto;background:transparent;border:0;color:#fff;cursor:pointer;font-size:20px;line-height:1}
    #scanPanel .sp-note{padding:10px 14px;font-size:13px;line-height:1.5;border-bottom:1px solid #e2e8f0}
    #scanPanel .sp-imgs{flex:1;overflow:auto;padding:10px;background:#f1f5f9}
    #scanPanel .sp-imgs img{width:100%;display:block;margin-bottom:10px;border-radius:8px;cursor:zoom-in;background:#fff}
    #scanPanel .sp-imgs .sp-load{padding:30px;text-align:center;color:#64748b;font-size:13px}
    #scanPanel.min .sp-imgs,#scanPanel.min .sp-note{display:none}
    #scanPanel.min{bottom:auto}
  `;
  document.head.appendChild(css);

  // ---------- ปุ่มในฟอร์ม ----------
  function injectButton() {
    const form = document.getElementById('reserveForm');
    if (!form || form.querySelector('.scan-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scan-btn';
    btn.innerHTML = '<span class="material-symbols-outlined">qr_code_scanner</span> สแกนเอกสารด้วยมือถือ ให้ระบบกรอกให้';
    btn.onclick = startDocScan;
    const grid = form.querySelector('.form-grid');
    form.insertBefore(btn, grid || form.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', injectButton);
  else injectButton();

  // ---------- เริ่มสแกน ----------
  async function startDocScan() {
    const form = document.getElementById('reserveForm');
    const sel = form.querySelector('.catSelect');
    const cats = sel ? Array.from(sel.options).filter(o => o.dataset.code).map(o => ({ code: o.dataset.code, text: o.textContent })) : [];
    const depts = Array.from(form.querySelectorAll('select[name="dept"] option')).map(o => o.value).filter(Boolean);

    const r = await call('scan_create', { cats, depts });
    if (!r || !r.success) {
      Swal.fire('สร้าง QR ไม่สำเร็จ', 'กรุณาตรวจสอบว่าได้เพิ่มไฟล์ ScanReserve.gs และ Deploy เวอร์ชันใหม่แล้ว', 'error');
      return;
    }
    const sid = r.session;
    const url = API + (API.indexOf('?') > -1 ? '&' : '?') + 'action=scan&s=' + sid;

    Swal.fire({
      title: 'สแกน QR ด้วยมือถือ',
      html: `
        <div id="scanQr" style="display:flex;justify-content:center;margin:8px 0 14px;"></div>
        <div style="font-size:14px;color:#475569;line-height:1.6;">เปิดกล้องมือถือสแกน QR นี้ แล้วถ่ายรูปเอกสารกันเงิน</div>
        <div id="scanStatus" style="margin-top:14px;padding:10px;border-radius:8px;background:#f1f5f9;font-weight:600;color:#334155;">⏳ รอรูปจากมือถือ...</div>
        <div style="margin-top:10px;font-size:12px;"><a href="${url}" target="_blank" rel="noopener" style="color:#6366f1;">เปิดลิงก์บนเครื่องนี้แทน</a> · QR หมดอายุใน ${Math.round(r.ttl / 60)} นาที</div>`,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'ยกเลิก',
      allowOutsideClick: false,
      didOpen: () => {
        const box = document.getElementById('scanQr');
        if (typeof QRCode !== 'undefined') new QRCode(box, { text: url, width: 220, height: 220, correctLevel: QRCode.CorrectLevel.M });
        else box.innerHTML = '<div style="color:#b91c1c">โหลดตัวสร้าง QR ไม่ได้ ใช้ลิงก์ด้านล่างแทน</div>';
        startPolling(sid, r.ttl);
      },
      willClose: stopPolling
    });
  }

  function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

  function startPolling(sid, ttl) {
    stopPolling();
    pollUntil = Date.now() + ttl * 1000;
    let busy = false;
    let procSince = 0;
    pollTimer = setInterval(async () => {
      if (busy) return;
      if (Date.now() > pollUntil) { stopPolling(); setStatus('⌛ QR หมดอายุแล้ว กรุณากดสแกนใหม่'); return; }
      busy = true;
      try {
        const res = await fetch(API + (API.indexOf('?') > -1 ? '&' : '?') + 'action=scan_status&s=' + sid + '&t=' + Date.now());
        const j = await res.json();
        if (j.status === 'processing') {
          if (!procSince) procSince = Date.now();
          const sec = Math.round((Date.now() - procSince) / 1000);
          setStatus('🔎 ได้รับรูปแล้ว กำลังอ่านเอกสาร... (' + sec + ' วินาที)');
        }
        else if (j.status === 'done') { stopPolling(); Swal.close(); applyResult(sid, j.result, j.fileIds, '', j.text); }
        else if (j.status === 'error') { stopPolling(); Swal.close(); applyResult(sid, null, j.fileIds, j.message, j.text); }
        else if (j.status === 'expired') { stopPolling(); setStatus('⌛ QR หมดอายุแล้ว กรุณากดสแกนใหม่'); }
      } catch (e) { /* เน็ตสะดุด ลองใหม่รอบถัดไป */ }
      busy = false;
    }, 2500);
  }

  function setStatus(t) { const el = document.getElementById('scanStatus'); if (el) el.textContent = t; }

  // ---------- เติมข้อมูลลงฟอร์ม ----------
  function mark(el) {
    if (!el) return;
    el.classList.add('scan-filled');
    const clear = () => el.classList.remove('scan-filled');
    el.addEventListener('input', clear, { once: true });
    el.addEventListener('change', clear, { once: true });
  }
  function setVal(el, v) {
    if (!el || v === '' || v == null) return false;
    if (el.tagName === 'SELECT' && !Array.from(el.options).some(o => o.value === String(v))) return false;
    if (el._flatpickr) { el._flatpickr.setDate(v, true); mark(el._flatpickr.altInput || el); return true; }
    el.value = v; mark(el); return true;
  }

  function applyResult(sid, r, fileIds, errMsg, text) {
    const form = document.getElementById('reserveForm');
    let filled = 0;

    if (r) {
      if (setVal(form.querySelector('[name="refNo"]'), r.refNo)) filled++;
      if (setVal(form.querySelector('[name="letterDate"]'), r.letterDate)) filled++;
      if (setVal(form.querySelector('select[name="dept"]'), r.dept)) filled++;
      if (setVal(form.querySelector('[name="name"]'), r.name)) filled++;
      if (setVal(form.querySelector('[name="remark"]'), r.remark)) filled++;

      const items = (r.items && r.items.length) ? r.items : [];
      if (items.length) {
        const container = document.getElementById('reserveRowsContainer');
        container.innerHTML = '';
        reserveRowCount = 0;
        items.forEach(() => addReserveRow());
        const rows = container.querySelectorAll('.reserve-row');
        items.forEach((it, i) => {
          const row = rows[i]; if (!row) return;
          const sel = row.querySelector('.catSelect');
          if (sel && it.catCode) {
            const opt = Array.from(sel.options).find(o => o.dataset.code === it.catCode);
            if (opt) { sel.value = opt.value; syncCode(sel); mark(sel); filled++; }
          }
          if (setVal(row.querySelector('[name^="amount_"]'), it.amount)) filled++;
          if (setVal(row.querySelector('[name^="desc_"]'), it.desc)) filled++;
        });
      }
    }

    showPanel(sid, fileIds || [], r, errMsg, text || '');

    if (errMsg) {
      const hasImg = (fileIds || []).length > 0 || !!text;
      Swal.fire({ icon: 'warning', title: 'ระบบอ่านเอกสารไม่สำเร็จ',
        html: `${escapeHtml(errMsg)}<br><br>` + (hasImg ? 'กด "ลองอ่านใหม่" (ใช้รูปเดิม ไม่ต้องสแกนซ้ำ) หรือกรอกเองโดยดูรูปด้านขวา' : 'กรุณาสแกนใหม่อีกครั้ง'),
        showCancelButton: hasImg, confirmButtonText: hasImg ? 'ลองอ่านใหม่' : 'ตกลง', cancelButtonText: 'กรอกเอง'
      }).then(res => { if (hasImg && res.isConfirmed) retryRead(sid, fileIds, text); });
    } else {
      Swal.fire({ icon: filled ? 'success' : 'info', title: filled ? 'กรอกข้อมูลให้แล้ว' : 'อ่านข้อมูลไม่ได้',
        html: filled ? 'ช่อง<b style="background:#fef9c3;padding:0 4px;">สีเหลือง</b>คือช่องที่ระบบกรอกให้<br>กรุณาตรวจสอบกับเอกสารด้านขวา แก้ไขให้ถูกต้อง แล้วกดบันทึก'
                     : 'กรุณากรอกข้อมูลเองโดยดูจากรูปเอกสารด้านขวา',
        confirmButtonText: 'ตรวจสอบ' });
    }
  }

  // ---------- แผงเอกสารด้านขวา ----------
  const qs = () => (API.indexOf('?') > -1 ? '&' : '?');

  function showPanel(sid, fileIds, r, errMsg, text) {
    closePanel();
    const p = document.createElement('div');
    p.id = 'scanPanel';
    let note = '';
    if (errMsg) note = `<div class="sp-note" style="background:#fee2e2;color:#991b1b;">⚠️ ${escapeHtml(errMsg)}</div>`;
    else if (r && r.notes) note = `<div class="sp-note" style="background:#fffbeb;color:#92400e;">📝 ระบบแจ้ง: ${escapeHtml(r.notes)}</div>`;
    const canRetry = errMsg && (fileIds.length || text);
    let body;
    if (text) body = `<pre style="white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.6;margin:0;background:#fff;padding:12px;border-radius:8px;">${escapeHtml(text)}</pre>`;
    else if (fileIds.length) body = fileIds.map((f, i) => `<div data-f="${f}" class="sp-load">กำลังโหลดหน้า ${i + 1}...</div>`).join('');
    else body = '<div class="sp-load" data-wait="1">กำลังโหลดรูปเอกสาร...</div>';
    p.innerHTML = `
      <header><span class="material-symbols-outlined" style="font-size:20px;">description</span>${text ? 'ข้อความจากเอกสาร' : 'เอกสารที่สแกน'}
        ${canRetry ? '<button type="button" title="ลองอ่านใหม่" data-act="retry" style="font-size:13px;border:1px solid rgba(255,255,255,.6);border-radius:6px;padding:2px 8px;">ลองอ่านใหม่</button>' : ''}
        <button type="button" title="ย่อ/ขยาย" data-act="min">▁</button><button type="button" title="ปิด" data-act="close">×</button></header>
      ${note}
      <div class="sp-imgs">${body}</div>`;
    p.querySelector('[data-act="close"]').onclick = closePanel;
    p.querySelector('[data-act="min"]').onclick = () => p.classList.toggle('min');
    const rb = p.querySelector('[data-act="retry"]'); if (rb) rb.onclick = () => retryRead(sid, fileIds, text);
    document.body.appendChild(p);

    if (text) return;
    if (fileIds.length) loadImages(sid, fileIds, p);
    else waitForImages(sid, p);
  }

  // รูปถูกบันทึกลง Drive หลังจากอ่านเสร็จ -> รอสักครู่แล้วค่อยดึงมาแสดง
  async function waitForImages(sid, p) {
    for (let i = 0; i < 20; i++) {
      await new Promise(res => setTimeout(res, 2000));
      if (!document.body.contains(p)) return;
      try {
        const j = await (await fetch(API + qs() + 'action=scan_status&s=' + sid + '&t=' + Date.now())).json();
        if (j.fileIds && j.fileIds.length) {
          p.querySelector('.sp-imgs').innerHTML = j.fileIds.map((f, k) => `<div data-f="${f}" class="sp-load">กำลังโหลดหน้า ${k + 1}...</div>`).join('');
          loadImages(sid, j.fileIds, p);
          return;
        }
        if (j.status === 'expired') break;
      } catch (e) {}
    }
    const w = p.querySelector('[data-wait]'); if (w) w.textContent = 'โหลดรูปไม่ได้';
  }

  function loadImages(sid, fileIds, p) {
    fileIds.forEach(async f => {
      const slot = p.querySelector(`[data-f="${f}"]`);
      try {
        const res = await fetch(API + qs() + 'action=scan_image&s=' + sid + '&f=' + encodeURIComponent(f) + '&t=' + Date.now());
        const j = await res.json();
        if (!j.success) throw new Error(j.error || 'โหลดไม่ได้');
        const img = document.createElement('img');
        img.src = `data:${j.mime};base64,${j.data}`;
        img.title = 'คลิกเพื่อดูภาพเต็ม';
        img.onclick = () => Swal.fire({ imageUrl: img.src, width: '90vw', showConfirmButton: false, showCloseButton: true,
          footer: j.url ? `<a href="${j.url}" target="_blank" rel="noopener">เปิดไฟล์ใน Google Drive</a>` : '' });
        slot.replaceWith(img);
      } catch (e) { if (slot) slot.textContent = 'โหลดรูปไม่ได้: ' + e.message; }
    });
  }

  async function retryRead(sid, fileIds, text) {
    Swal.fire({ title: 'กำลังอ่านเอกสารใหม่...', html: 'ปกติใช้เวลา 5–20 วินาที', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    let r = null, err = '';
    try {
      const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action: 'scan_retry', data: { session: sid } }) });
      r = await res.json();
      if (r.error) { err = r.error; r = null; }
    } catch (e) { err = 'เชื่อมต่อไม่ได้: ' + e.message; }
    Swal.close();
    applyResult(sid, r ? r.result : null, (r && r.fileIds) || fileIds, err, text);
  }

  function closePanel() { const p = document.getElementById('scanPanel'); if (p) p.remove(); }

  // บันทึกสำเร็จ (ฟอร์มถูก reset) -> ปิดแผงรูปและล้างสีไฮไลต์
  document.addEventListener('reset', e => {
    if (e.target && e.target.id === 'reserveForm') {
      closePanel();
      e.target.querySelectorAll('.scan-filled').forEach(el => el.classList.remove('scan-filled'));
    }
  }, true);

  function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  window.startDocScan = startDocScan;
})();
