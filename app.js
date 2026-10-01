
let API = typeof CONFIG !== 'undefined' ? CONFIG.API_URL : 'https://script.google.com/macros/s/AKfycbydvJ5ClEUqKX2xr-jSCR-U5m6mESvqDw6yB8UZdCyQqki1PgmikMRx98wd7jvCIng/exec';
let currentPlan = null;
let cache = null;

// Helper: format any date value to Thai date string "16 มิ.ย. 69"

function getCategoryOptionsHTML(selectedCatCode = '') {
  let html = '<option value="">-- เลือกหมวด --</option>';
  const addedCodes = new Set();

  if (typeof FIXED_CATEGORIES !== 'undefined') {
    Object.keys(FIXED_CATEGORIES).forEach(groupLabel => {
      html += `<optgroup label="${groupLabel}">`;
      FIXED_CATEGORIES[groupLabel].forEach(sub => {
        sub.options.forEach(opt => {
          const code = opt.code || opt.value;
          const text = opt.text || code;
          addedCodes.add(code);
          const isSel = (code === selectedCatCode) ? 'selected' : '';
          html += `<option value="${code}" ${isSel}>${text}</option>`;
        });
      });
      html += `</optgroup>`;
    });
  }

  if (cache && cache.entries) {
    const customCodes = new Set();
    cache.entries.forEach(e => {
      if (e.catCode && !addedCodes.has(e.catCode)) {
        customCodes.add(e.catCode);
      }
    });
    if (customCodes.size > 0) {
      html += `<optgroup label="หมวดอื่นๆ">`;
      customCodes.forEach(code => {
        const isSel = (code === selectedCatCode) ? 'selected' : '';
        html += `<option value="${code}" ${isSel}>${code}</option>`;
      });
      html += `</optgroup>`;
    }
  }
  return html;
}

async function updatePendingCategory(id, catCode) {
  if (cache && cache.entries) {
    const item = cache.entries.find(x => x.id == id);
    if (item) item.catCode = catCode;
  }
  const res = await call('submitUpdate', { id: id, catCode: catCode });
  if (res && res.success) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      icon: 'success',
      title: 'บันทึกหมวดงบประมาณเรียบร้อย',
      showConfirmButton: false,
      timer: 1500
    });
  }
}


function formatThaiDate(val) {
  if (!val) return '-';
  const s = val.toString().trim();
  if (/^\d{1,2}\s+[ก-ฮ\.]+\s+\d{2,4}$/.test(s)) return s;

  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    let year = d.getFullYear();
    if (year < 2400) year += 543;
    return `${d.getDate()} ${months[d.getMonth()]} ${year.toString().slice(-2)}`;
  }
  return s;
}

function parseSafeFloat(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.toString().replace(/,/g, '')) || 0;
}

let excludedSpendingItems = new Set();
let expandedSpendingCategories = new Set();

const themeColors = {
  '1.ฝนหลวง': { p: '#10b981', l: '#d1fae5', d: '#065f46' },
  '2.ด้านการบิน': { p: '#f59e0b', l: '#fef3c7', d: '#b45309' },
  '2.1 บินสาธาฯ': { p: '#0ea5e9', l: '#e0f2fe', d: '#0369a1' },
  '3.แก้ปัญหาฝุ่น': { p: '#ef4444', l: '#fef2f2', d: '#991b1b' },
  '4.บรรเทาลูกเห็บ': { p: '#8b5cf6', l: '#ede9fe', d: '#5b21b6' }
};

const PLAN_CATEGORIES = {
  'default': [
    {
      label: '2.1.1 ค่าตอบแทน', options: [
        { value: '14', code: 'A1', text: 'A1 - ค่าอาหารทำการนอกเวลา' },
        { value: '17', code: 'A2', text: 'A2 - ค่าตอบแทนคณะกรรมการ' },
        { value: '20', code: 'A3', text: 'A3 - ค่าตอบแทนผู้ปฏิบัติงานบนอากาศยาน' },
        { value: '23', code: 'A4', text: 'A4 - ค่าสมนาคุณวิทยากร' }
      ]
    },
    {
      label: '2.1.2 ค่าใช้สอย', options: [
        { value: '26', code: 'B1', text: 'B1 - ค่าเบี้ยเลี้ยงที่พักพาหนะ' },
        { value: '29', code: 'B2', text: 'B2 - ค่าซ่อมแซมยานพาหนะ' },
        { value: '32', code: 'B3', text: 'B3 - ค่าซ่อมแซมครุภัณฑ์' },
        { value: '35', code: 'B4', text: 'B4 - ค่าซ่อมแซมสิ่งก่อสร้าง' },
        { value: '38', code: 'B5', text: 'B5 - ค่าทำความสะอาด' },
        { value: '41', code: 'B6', text: 'B6 - รักษาความปลอดภัย' },
        { value: '44', code: 'B7', text: 'B7 - จ้างเหมาเอกชนดำเนินงาน' },
        { value: '47', code: 'B8', text: 'B8 - ค่าสัมมนาและฝึกอบรม' },
        { value: '50', code: 'B9', text: 'B9 - ค่าภาษี/ค่าธรรมเนียมศ' },
        { value: '53', code: 'B10', text: 'B10 - ค่ารับรองและพิธีการ' },
        { value: '56', code: 'B11', text: 'B11 - ค่าตรวจสุขภาพ' },
        { value: '59', code: 'B12', text: 'B12 - ค่าใช้สอยอื่นๆ' },
        { value: '62', code: 'B13', text: 'B13 - จ้างเหมาบริการอื่นๆ' }
      ]
    },
    {
      label: '2.1.3 ค่าวัสดุ', options: [
        { value: '65', code: 'C1', text: 'C1 - วัสดุสำนักงาน' },
        { value: '68', code: 'C2', text: 'C2 - วัสดุเชื้อเพลิง (อวก.)' },
        { value: '71', code: 'C3', text: 'C3 - วัสดุเชื้อเพลิง (รถยนต์)' },
        { value: '74', code: 'C4', text: 'C4 - วัสดุก่อสร้าง' },
        { value: '77', code: 'C5', text: 'C5 - วัสดุวิทย์/การแพทย์' },
        { value: '80', code: 'C6', text: 'C6 - วัสดุคอมพิวเตอร์' },
        { value: '83', code: 'C7', text: 'C7 - วัสดุอากาศยาน' },
        { value: '86', code: 'C8', text: 'C8 - วัสดุยานพาหนะขนส่ง' },
        { value: '89', code: 'C9', text: 'C9 - วัสดุการเกษตร' },
        { value: '92', code: 'C10', text: 'C10 - วัสดุงานบ้านงานครัว' },
        { value: '95', code: 'C11', text: 'C11 - วัสดุไฟฟ้า/วิทยุ' },
        { value: '98', code: 'C12', text: 'C12 - วัสดุอื่นๆ' },
        { value: '101', code: 'C13', text: 'C13 - วัสดุโรงงาน' }
      ]
    }
  ],
  '2.1 บินสาธาฯ': [
    {
      label: 'หมวด ค่าสาธารณูปโภค', options: [
        { value: '14', code: 'ก.', text: 'ก. - ค่าโทรศัพท์สำนักงาน' },
        { value: '17', code: 'ข.', text: 'ข. - ค่าโทรศัพท์เคลื่อนที่' },
        { value: '20', code: 'ค.', text: 'ค. - ค่าน้ำประปา' },
        { value: '23', code: 'ง.', text: 'ง. - ค่าไปรษณีย์' },
        { value: '26', code: 'จ.', text: 'จ. - ค่าไฟฟ้า' },
        { value: '29', code: 'ฉ.', text: 'ฉ. - ค่าบริการโทรคมนาคม (Internet)' },
        { value: '32', code: 'ช.', text: 'ช. - ค่า GPS' }
      ]
    }
  ]
};

function setStatus(state, text) {
  const dot = document.getElementById('statusDot');
  const label = document.getElementById('statusText');
  if (!dot || !label) return;
  dot.className = 'status-dot';
  if (state === 'loading') dot.classList.add('loading');
  if (state === 'active') dot.classList.add('active');
  if (state === 'error') dot.classList.add('error');
  label.innerText = text;
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}
function lighten(hex, amount = 0.88) {
  const { r, g, b } = hexToRgb(hex);
  const lr = Math.round(r + (255 - r) * amount), lg = Math.round(g + (255 - g) * amount), lb = Math.round(b + (255 - b) * amount);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}
function darken(hex, amount = 0.25) {
  const { r, g, b } = hexToRgb(hex);
  const dr = Math.round(r * (1 - amount)), dg = Math.round(g * (1 - amount)), db = Math.round(b * (1 - amount));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

function updateTheme(plan) {
  // Try to get color from cache.plans first (dynamic from PlanSettings)
  let color = '#6366f1';
  if (cache && cache.plans) {
    const p = cache.plans.find(x => x.shortName === plan);
    if (p && p.color) color = p.color;
  } else {
    // Fallback to old hardcoded themeColors
    const c = themeColors[plan];
    if (c) color = c.p;
  }
  const lightColor = lighten(color, 0.88);
  const darkColor = darken(color, 0.2);
  const r = document.documentElement.style;
  r.setProperty('--primary', color);
  r.setProperty('--primary-light', lightColor);
  r.setProperty('--primary-dark', darkColor);
}

async function call(action, data = null) {
  setStatus('loading', 'กำลังเชื่อมต่อ...');
  document.getElementById('loader').style.display = 'flex';
  try {
    // data.plan is only passed when explicitly specified
    const cfg = data ? { method: 'POST', body: JSON.stringify({ action, data }) } : { method: 'GET' };
    const url = API + (data ? '' : `?action=${action}&t=${new Date().getTime()}`);
    const res = await fetch(url, cfg);
    const json = await res.json();
    document.getElementById('loader').style.display = 'none';
    if (json.error) throw new Error(json.error);
    setStatus('active', 'ออนไลน์: ' + currentPlan);
    return json;
  } catch (e) {
    document.getElementById('loader').style.display = 'none';
    setStatus('error', 'ขัดข้อง: ' + e.message);
    return null;
  }
}

async function init() {
  const d = await call('getInitialData');
  console.log('[init] raw API response:', d);
  if (d) {
    console.log('[init] entries count:', d.entries ? d.entries.length : 'NO entries field');
    console.log('[init] plans count:', d.plans ? d.plans.length : 'NO plans field');
    if (d.entries && d.entries.length > 0) {
      console.log('[init] first entry sample:', d.entries[0]);
    }
    if (d.entries) {
      d.entries.forEach(e => {
        if (e.dept) e.dept = e.dept.toString().replace(/\.+$/, '').trim();
      });
    }
    cache = d; document.getElementById('dateDisplay').innerText = d.todayThai;
    updateDataLists(d.entries);
    updateCategoryDropdowns();

    document.querySelectorAll('.submit-btn').forEach(b => b.disabled = false);
    if (currentPlan) updateTheme(currentPlan);

    // ตรวจสอบ view ปัจจุบัน — ถ้าอยู่ที่ pending-plan อยู่แล้ว ให้ render แทนที่จะ redirect
    const activeView = document.querySelector('.app-view.active');
    const activeViewId = activeView ? activeView.id.replace('view-', '') : '';

    if (activeViewId === 'pending-plan') {
      renderPendingPlanView();
    } else {
      const defaultNav = document.getElementById('nav-doc-tracking');
      setView('doc-tracking', defaultNav); renderDocTracking();
    }
    updatePendingBadge();
    updateAdminUI();
  } else {
    console.log('[init] API returned null/falsy — possible network error');
  }
}

function updateDataLists(entries) {
  if (!entries) return;
  window.recentNames = [...new Set(entries.map(e => (e.name || "").toString().trim()))].filter(Boolean).slice(0, 100);
  window.recentDescs = [...new Set(entries.map(e => (e.desc || "").toString().trim()))].filter(Boolean).slice(0, 200);

  // Update Filter Dropdowns
  const depts = [...new Set(entries.map(e => e.dept))].filter(Boolean).sort();
  const cats = [...new Set(entries.map(e => e.catCode))].filter(Boolean).sort();
  const remarks = [...new Set(entries.map(e => e.type))].filter(Boolean).sort();
  const fiscalMonthsOrder = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];
  const months = [...new Set(entries.map(e => e.month))].filter(Boolean).sort((a, b) => {
    let ia = fiscalMonthsOrder.indexOf(a);
    let ib = fiscalMonthsOrder.indexOf(b);
    if (ia === -1) ia = 99;
    if (ib === -1) ib = 99;
    return ia - ib;
  });

  const fDept = document.getElementById('filterDept');
  const fCat = document.getElementById('filterCat');
  const fRem = document.getElementById('filterRemark');
  const fMonth = document.getElementById('filterMonth');
  const gfMonth = document.getElementById('gfMonthFilter');
  const spMonth = document.getElementById('spendingMonthFilter');
  const spDept = document.getElementById('spendingDeptFilter');

  const rdDept = document.getElementById('rdDept');
  const rdCat = document.getElementById('rdCat');

  if (fDept) fDept.innerHTML = '<option value="">-- กรองตามฝ่าย --</option>' + depts.map(d => `<option value="${d}">${d}</option>`).join('');
  if (fCat) fCat.innerHTML = '<option value="">-- กรองตามหมวด --</option>' + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  if (fRem) fRem.innerHTML = '<option value="">-- กรองตามหมายเหตุ (B) --</option>' + remarks.map(r => `<option value="${r}">${r}</option>`).join('');

  const monthOptions = '<option value="">-- ทุกเดือน (N) --</option>' + months.map(m => `<option value="${m}">${m}</option>`).join('');
  if (fMonth) fMonth.innerHTML = monthOptions;
  if (gfMonth) gfMonth.innerHTML = monthOptions;
  if (spMonth) spMonth.innerHTML = monthOptions;

  const gfPlanSelector = document.getElementById('gfPlanSelector');
  if (gfPlanSelector) {
    // รวม Plan จาก cache (ถ้ามี) กับ Plan ที่ดึงมาจากข้อมูลชีท (คอลัมน์ B)
    const cachePlans = (window.cache && window.cache.plans) ? window.cache.plans.map(p => p.shortName) : [];
    const dynamicPlans = [...new Set(entries.map(e => String(e.plan || e.planName || "").trim()))].filter(Boolean);
    const allPlans = [...new Set([...cachePlans, ...dynamicPlans])].sort();

    gfPlanSelector.innerHTML = '<option value="">-- เลือกแผน (B) --</option>' + allPlans.map(r => `<option value="${r}">${r}</option>`).join('');
  }

  if (spDept) spDept.innerHTML = '<option value="">ทุกกลุ่ม/ฝ่าย</option>' + depts.map(d => `<option value="${d}">${d}</option>`).join('');

  // Update RD Dropdowns
  if (rdDept) rdDept.innerHTML = '<option value="">-- เลือกฝ่าย --</option>' + depts.map(d => `<option value="${d}">${d}</option>`).join('');
  if (rdCat && window.planConfig && window.planConfig.categories) {
    let html = '<option value="">-- เลือกหมวด --</option>';
    window.planConfig.categories.forEach(group => {
      html += `<optgroup label="${group.label}">`;
      group.options.forEach(opt => {
        html += `<option value="${opt.value}" data-code="${opt.code}">${opt.text || opt.label}</option>`;
      });
      html += `</optgroup>`;
    });
    rdCat.innerHTML = html;
  }
}

function showFloatingSuggestions(input, sugId, type) {
  const container = document.getElementById(sugId);
  if (!container) return;

  const val = (input.value || "").trim().toLowerCase();

  // Ensure source is populated
  let source = type === 'names' ? window.recentNames : window.recentDescs;
  if ((!source || !source.length) && cache && cache.entries) {
    if (type === 'names') {
      window.recentNames = [...new Set(cache.entries.map(e => (e.name || "").toString().trim()))].filter(Boolean).slice(0, 100);
      source = window.recentNames;
    } else {
      window.recentDescs = [...new Set(cache.entries.map(e => (e.desc || "").toString().trim()))].filter(Boolean).slice(0, 200);
      source = window.recentDescs;
    }
  }

  if (!source || !source.length) {
    container.style.display = 'none';
    return;
  }

  let matches = [];
  if (!val) {
    matches = source.slice(0, 8);
  } else {
    matches = source.filter(d => d.toLowerCase().includes(val)).slice(0, 8);
  }

  if (matches.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.innerHTML = matches.map(m => {
    const safeText = m.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    return `<div class="sug-item" onmousedown="selectSug('${sugId}', '${input.id}', this.textContent)">${safeText}</div>`;
  }).join('');
  container.style.display = 'block';
}

function selectSug(sugId, inputId, val) {
  const inp = document.getElementById(inputId);
  if (inp) inp.value = val;
  const sug = document.getElementById(sugId);
  if (sug) sug.style.display = 'none';
}

function hideFloatingSuggestions(sugId) {
  setTimeout(() => {
    const sug = document.getElementById(sugId);
    if (sug) sug.style.display = 'none';
  }, 200);
}

function goBack() {
  // Default back behavior: always go to table view if possible
  setView('table', document.getElementById('nav-table'));
  renderTable();
}

function showHome() {
  // Now acts as a reset/go-to-table function since home is removed
  setView('table', document.getElementById('nav-table'));
  renderTable();
}


function setPlan(el) {
  document.querySelectorAll('.plan-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  currentPlan = el.dataset.plan;
  updateTheme(currentPlan);
  updateCategoryDropdowns(currentPlan);
  renderTable();
  // Auto-jump to table view
  setView('table', document.getElementById('nav-table'));
}

function populateReservePlanSelect() {
  const sel = document.getElementById('reservePlanSelect');
  if (!sel || !cache || !cache.plans) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">\u23f3 \u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e17\u0e23\u0e32\u0e1a\u0e41\u0e1c\u0e19 (\u0e08\u0e30\u0e19\u0e33\u0e21\u0e32\u0e01\u0e33\u0e2b\u0e19\u0e14\u0e20\u0e32\u0e22\u0e2b\u0e25\u0e31\u0e07)</option>';
  cache.plans.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p.shortName;
    opt.textContent = p.shortName + (p.fullName ? ' \u2014 ' + p.fullName : '');
    sel.appendChild(opt);
  });
  if (cur) sel.value = cur;
}


const FIXED_CATEGORIES = {
  'ตอบแทน ใช้สอย วัสดุ': [
    {
      label: 'ค่าตอบแทน (ระบุ)', options: [
        { value: 'ค่าอาหารทำการนอกเวลา', code: 'ค่าอาหารทำการนอกเวลา', text: 'ค่าอาหารทำการนอกเวลา' },
        { value: 'ค่าตอบแทนคณะกรรมการ', code: 'ค่าตอบแทนคณะกรรมการ', text: 'ค่าตอบแทนคณะกรรมการ' },
        { value: 'ค่าตอบแทนผู้ปฏิบัติงานบนอากาศยาน', code: 'ค่าตอบแทนผู้ปฏิบัติงานบนอากาศยาน', text: 'ค่าตอบแทนผู้ปฏิบัติงานบนอากาศยาน' },
        { value: 'ค่าสมนาคุณวิทยากร', code: 'ค่าสมนาคุณวิทยากร', text: 'ค่าสมนาคุณวิทยากร' }
      ]
    },
    {
      label: 'ค่าใช้สอย (ระบุ)', options: [
        { value: 'ค่าเบี้ยเลี้ยงที่พักพาหนะ', code: 'ค่าเบี้ยเลี้ยงที่พักพาหนะ', text: 'ค่าเบี้ยเลี้ยงที่พักพาหนะ' },
        { value: 'ค่าซ่อมแซมยานพาหนะ', code: 'ค่าซ่อมแซมยานพาหนะ', text: 'ค่าซ่อมแซมยานพาหนะ' },
        { value: 'ค่าซ่อมแซมครุภัณฑ์', code: 'ค่าซ่อมแซมครุภัณฑ์', text: 'ค่าซ่อมแซมครุภัณฑ์' },
        { value: 'ค่าซ่อมแซมสิ่งก่อสร้าง', code: 'ค่าซ่อมแซมสิ่งก่อสร้าง', text: 'ค่าซ่อมแซมสิ่งก่อสร้าง' },
        { value: 'ค่าทำความสะอาด', code: 'ค่าทำความสะอาด', text: 'ค่าทำความสะอาด' },
        { value: 'รักษาความปลอดภัย', code: 'รักษาความปลอดภัย', text: 'รักษาความปลอดภัย' },
        { value: 'จ้างเหมาเอกชนดำเนินงาน', code: 'จ้างเหมาเอกชนดำเนินงาน', text: 'จ้างเหมาเอกชนดำเนินงาน' },
        { value: 'ค่าสัมมนาและฝึกอบรม', code: 'ค่าสัมมนาและฝึกอบรม', text: 'ค่าสัมมนาและฝึกอบรม' },
        { value: 'ค่าภาษี/ค่าธรรมเนียมศาล/ค่าเบี้ยประกัน/ค่าธรรมเนียม', code: 'ค่าภาษี/ค่าธรรมเนียมศาล/ค่าเบี้ยประกัน/ค่าธรรมเนียม', text: 'ค่าภาษี/ค่าธรรมเนียมศาล/ค่าเบี้ยประกัน/ค่าธรรมเนียม' },
        { value: 'ค่ารับรองและพิธีการ (ค่าอาหาร)', code: 'ค่ารับรองและพิธีการ (ค่าอาหาร)', text: 'ค่ารับรองและพิธีการ (ค่าอาหาร)' },
        { value: 'ค่าตรวจสุขภาพ', code: 'ค่าตรวจสุขภาพ', text: 'ค่าตรวจสุขภาพ' },
        { value: 'ค่าใช้สอยอื่นๆ', code: 'ค่าใช้สอยอื่นๆ', text: 'ค่าใช้สอยอื่นๆ' },
        { value: 'จ้างเหมาบริการอื่นๆ', code: 'จ้างเหมาบริการอื่นๆ', text: 'จ้างเหมาบริการอื่นๆ' }
      ]
    },
    {
      label: 'ค่าวัสดุ (ระบุ)', options: [
        { value: 'วัสดุสำนักงาน', code: 'วัสดุสำนักงาน', text: 'วัสดุสำนักงาน' },
        { value: 'วัสดุเชื้อเพลิงและหล่อลื่น (อากาศยาน)', code: 'วัสดุเชื้อเพลิงและหล่อลื่น (อากาศยาน)', text: 'วัสดุเชื้อเพลิงและหล่อลื่น (อากาศยาน)' },
        { value: 'วัสดุเชื้อเพลิงและหล่อลื่น (รถยนต์)', code: 'วัสดุเชื้อเพลิงและหล่อลื่น (รถยนต์)', text: 'วัสดุเชื้อเพลิงและหล่อลื่น (รถยนต์)' },
        { value: 'วัสดุก่อสร้าง', code: 'วัสดุก่อสร้าง', text: 'วัสดุก่อสร้าง' },
        { value: 'วัสดุวิทยาศาสตร์และการแพทย์', code: 'วัสดุวิทยาศาสตร์และการแพทย์', text: 'วัสดุวิทยาศาสตร์และการแพทย์' },
        { value: 'วัสดุคอมพิวเตอร์', code: 'วัสดุคอมพิวเตอร์', text: 'วัสดุคอมพิวเตอร์' },
        { value: 'วัสดุอากาศยาน', code: 'วัสดุอากาศยาน', text: 'วัสดุอากาศยาน' },
        { value: 'วัสดุยานพาหนะและขนส่ง', code: 'วัสดุยานพาหนะและขนส่ง', text: 'วัสดุยานพาหนะและขนส่ง' },
        { value: 'วัสดุการเกษตร', code: 'วัสดุการเกษตร', text: 'วัสดุการเกษตร' }
      ]
    }
  ],
  'สาธารณูปโภค': [
    {
      label: 'ค่าสาธารณูปโภค', options: [
        { value: 'ค่าโทรศัพท์', code: 'ค่าโทรศัพท์', text: 'ค่าโทรศัพท์' },
        { value: 'ค่าน้ำประปา', code: 'ค่าน้ำประปา', text: 'ค่าน้ำประปา' },
        { value: 'ค่าไปรษณีย์โทรเลข', code: 'ค่าไปรษณีย์โทรเลข', text: 'ค่าไปรษณีย์โทรเลข' },
        { value: 'ค่าไฟฟ้า', code: 'ค่าไฟฟ้า', text: 'ค่าไฟฟ้า' },
        { value: 'ค่าบริการโทรคมนาคม (Internet)', code: 'ค่าบริการโทรคมนาคม (Internet)', text: 'ค่าบริการโทรคมนาคม (Internet)' }
      ]
    }
  ]
};

function updateCategoryDropdowns(plan) {
  document.querySelectorAll('.type-select').forEach(el => handleTypeChange(el));

  const allSelects = document.querySelectorAll('.catSelect, #rdCat, select[name="col"], select[name="cat"]');
  if (!allSelects || !allSelects.length) return;

  const allCats = [];
  if (typeof PLAN_CATEGORIES !== 'undefined' && PLAN_CATEGORIES['default']) {
    allCats.push(...PLAN_CATEGORIES['default']);
  }
  if (typeof FIXED_CATEGORIES !== 'undefined') {
    if (FIXED_CATEGORIES['ตอบแทน ใช้สอย วัสดุ']) allCats.push(...FIXED_CATEGORIES['ตอบแทน ใช้สอย วัสดุ']);
    if (FIXED_CATEGORIES['สาธารณูปโภค']) allCats.push(...FIXED_CATEGORIES['สาธารณูปโภค']);
  }
  if (cache && cache.customCategories) {
    if (cache.customCategories['งบลงทุน']) {
      allCats.push({ label: 'งบลงทุน', options: cache.customCategories['งบลงทุน'] });
    }
    if (cache.customCategories['รายจ่ายอื่น']) {
      allCats.push({ label: 'รายจ่ายอื่น', options: cache.customCategories['รายจ่ายอื่น'] });
    }
  }

  allSelects.forEach(selectEl => {
    const currentVal = selectEl.value;
    selectEl.innerHTML = '<option value="">-- เลือกหมวด --</option>';

    allCats.forEach(group => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      group.options.forEach(opt => {
        const option = document.createElement('option');
        const val = opt.value || opt.code || '';
        const code = opt.code || opt.value || '';
        const text = opt.text || (opt.code && opt.code !== opt.value ? `${opt.code} - ${opt.value}` : opt.value);
        option.value = val;
        option.dataset.code = code;
        option.textContent = text;
        optgroup.appendChild(option);
      });
      selectEl.appendChild(optgroup);
    });

    if (currentVal) selectEl.value = currentVal;
  });
}

function handleTypeChange(el) {
  const form = el.closest('form');
  if (!form) return;
  const catSelect = form.querySelector('.catSelect, #rdCat');
  const addBtn = form.querySelector('.add-cat-btn');
  const typeValue = el.value;

  let cats = [];
  if (typeValue === 'ตอบแทน ใช้สอย วัสดุ' || typeValue === 'สาธารณูปโภค') {
    cats = FIXED_CATEGORIES[typeValue];
    if (addBtn) addBtn.style.display = 'none';
  } else if (typeValue === 'งบลงทุน' || typeValue === 'รายจ่ายอื่น') {
    if (cache && cache.customCategories && cache.customCategories[typeValue]) {
      cats = [{ label: typeValue, options: cache.customCategories[typeValue] }];
    } else {
      cats = [{ label: typeValue, options: [] }];
    }
    if (addBtn) addBtn.style.display = 'block';
  }

  if (catSelect) {
    const currentVal = catSelect.value;
    catSelect.innerHTML = '<option value="">-- เลือกหมวด --</option>';
    cats.forEach(group => {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.label;
      group.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.dataset.code = opt.code;
        option.textContent = opt.text;
        optgroup.appendChild(option);
      });
      catSelect.appendChild(optgroup);
    });
    catSelect.value = currentVal;
  }
}

async function promptAddCategory(btn) {
  const form = btn.closest('form');
  const typeSelect = form.querySelector('.type-select');
  const typeValue = typeSelect.value;

  const { value: catName } = await Swal.fire({
    title: 'สร้างหมวดใหม่',
    text: `สร้างหมวดใหม่สำหรับประเภท "${typeValue}"`,
    input: 'text',
    inputPlaceholder: 'กรอกชื่อหมวดที่ต้องการสร้าง',
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    inputValidator: (value) => {
      if (!value) {
        return 'กรุณากรอกชื่อหมวด!'
      }
    }
  });

  if (catName) {
    const res = await call('saveCustomCategory', { type: typeValue, categoryName: catName });
    if (res && res.success) {
      if (!cache.customCategories) cache.customCategories = {};
      if (!cache.customCategories[typeValue]) cache.customCategories[typeValue] = [];
      cache.customCategories[typeValue].push({ value: catName, code: catName, text: catName });

      document.querySelectorAll('.type-select').forEach(el => {
        if (el.value === typeValue) handleTypeChange(el);
      });

      updateCategoryDropdowns(currentPlan); // to update eCol as well

      Swal.fire('สำเร็จ', 'สร้างหมวดใหม่เรียบร้อยแล้ว', 'success');
    }
  }
}


let isAdmin = localStorage.getItem('isAdmin') === 'true';

function updateAdminUI() {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(el => {
    el.style.display = isAdmin ? '' : 'none';
  });

  const adminStatusDisplay = document.getElementById('adminStatusDisplay');
  if (adminStatusDisplay) {
    if (isAdmin) {
      adminStatusDisplay.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
          <div style="display:flex; align-items:center; gap:6px; color:#10b981; font-size:12px; font-weight:700;">
            <span class="material-symbols-outlined" style="font-size:18px;">verified_user</span>
            <span>Admin Mode</span>
          </div>
          <button onclick="logoutAdmin()" style="background:rgba(239,68,68,0.2); color:#fca5a5; border:1px solid rgba(239,68,68,0.3); border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer; font-weight:bold; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.4)';" onmouseout="this.style.background='rgba(239,68,68,0.2)';">
            ออกจากระบบ
          </button>
        </div>
      `;
    } else {
      adminStatusDisplay.innerHTML = `
        <button onclick="promptAdminLogin()" style="width:100%; background:rgba(255,255,255,0.08); color:rgba(255,255,255,0.85); border:1px solid rgba(255,255,255,0.2); border-radius:8px; padding:8px 12px; font-size:12px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.18)'; this.style.color='#fff';" onmouseout="this.style.background='rgba(255,255,255,0.08)'; this.style.color='rgba(255,255,255,0.85)';">
          <span class="material-symbols-outlined" style="font-size:18px; color:#f59e0b;">lock</span>
          <span>เข้าสู่ระบบ Admin</span>
        </button>
      `;
    }
  }

  const currentViewActive = document.querySelector('.app-view.active');
  if (!isAdmin && currentViewActive) {
    const currentViewId = currentViewActive.id.replace('view-', '');
    if (['table', 'pending-plan', 'spending-plan', 'reserve-deduct', 'settings', 'gf'].includes(currentViewId)) {
      document.querySelectorAll('.app-view').forEach(av => av.classList.remove('active'));
      const docView = document.getElementById('view-doc-tracking');
      if (docView) docView.classList.add('active');

      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      const docNav = document.getElementById('nav-doc-tracking');
      if (docNav) docNav.classList.add('active');
    }
  }
}

function promptAdminLogin() {
  Swal.fire({
    title: '🔑 เข้าสู่ระบบผู้ดูแลระบบ (Admin)',
    text: 'กรุณากรอกรหัสผ่านเพื่อเข้าใช้งานทุกเมนูระบบ',
    input: 'password',
    inputValue: '',
    inputPlaceholder: 'กรอกรหัสผ่าน...',
    inputAttributes: {
      autocomplete: 'new-password',
      autocorrect: 'off',
      autocapitalize: 'off',
      spellcheck: 'false'
    },
    didOpen: () => {
      const input = Swal.getInput();
      if (input) {
        input.value = '';
        input.setAttribute('autocomplete', 'new-password');
      }
    },
    showCancelButton: true,
    confirmButtonText: 'เข้าสู่ระบบ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#2563eb',
    preConfirm: (inputPassword) => {
      if (inputPassword === 'admin1234') {
        return true;
      } else {
        Swal.showValidationMessage('รหัสผ่านไม่ถูกต้อง! กรุณาลองใหม่อีกครั้ง');
        return false;
      }
    }
  }).then((result) => {
    if (result.isConfirmed && result.value) {
      isAdmin = true;
      localStorage.setItem('isAdmin', 'true');
      updateAdminUI();
      Swal.fire({
        icon: 'success',
        title: 'ปลดล็อกสิทธิ์ Admin เรียบร้อย!',
        text: 'แสดงเมนูการใช้งานทั้งหมดเรียบร้อยแล้ว',
        timer: 1800,
        showConfirmButton: false
      });
    }
  });
}

function logoutAdmin() {
  isAdmin = false;
  localStorage.setItem('isAdmin', 'false');
  updateAdminUI();
  Swal.fire({
    icon: 'info',
    title: 'ออกจากระบบแล้ว',
    text: 'สลับกลับสู่โหมดผู้ใช้งานทั่วไป (Public)',
    timer: 1500,
    showConfirmButton: false
  });
}

function setView(v, el) {
  if (!el) return;

  const adminOnlyViews = ['table', 'pending-plan', 'spending-plan', 'reserve-deduct', 'settings', 'gf'];
  if (!isAdmin && adminOnlyViews.includes(v)) {
    return;
  }

  document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');

  document.querySelectorAll('.app-view').forEach(av => av.classList.remove('active'));
  const t = document.getElementById('view-' + v);
  if (t) t.classList.add('active');

  // Update Top Filter Visibility
  const topFilter = document.getElementById('topFilterBar');
  if (topFilter) {
    topFilter.style.display = (v === 'table') ? 'flex' : 'none';
  }

  const planBar = document.querySelector('.plan-bar');
  const splash = document.getElementById('splash');
  const backBtn = document.getElementById('backBtn');

  // Visibility Rules
  if (v === 'pending-plan') {
    if (planBar) planBar.style.display = 'none';
    const titleEl = document.getElementById('viewTitle');
    if (titleEl) titleEl.textContent = 'รายการรออนุมัติแผนงาน';
    if (backBtn) backBtn.style.display = 'flex';
    // Auto-render pending plan table
    if (typeof renderPendingPlanView === 'function') renderPendingPlanView();
  } else if (v === 'home' || v === 'dashboard') {
    if (planBar) planBar.style.display = 'none';

    if (backBtn) backBtn.style.display = 'none';
  } else {
    if (splash) splash.classList.add('hidden');
    if (planBar && currentPlan) planBar.style.display = 'flex';
    if (backBtn) backBtn.style.display = (v === 'table' ? 'none' : 'flex');
  }

  // Auto-collapse sidebar for wider views
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    if (v === 'gf') {
      sidebar.classList.add('collapsed');
    } else {
      sidebar.classList.remove('collapsed');
    }
  }

  // Special case for GF
  if (v === 'gf') {
    if (planBar) planBar.style.display = 'none';
    renderGFSummary();
  }

  // Auto-render settings plan list
  if (v === 'settings') {
    renderSettings();
  }

  if (v === 'summary') {
    renderSummaryReport();
  }

  const titleSpan = el.querySelector('span:not(.material-symbols-outlined)');
  if (titleSpan) document.getElementById('viewTitle').innerText = titleSpan.innerText;
}

function updateSelectedTotal() {
  let total = 0;
  let count = 0;
  document.querySelectorAll('.row-checkbox:checked').forEach(cb => {
    total += Number(cb.dataset.amt) || 0;
    count++;
  });
  const el = document.getElementById('sumSelected');
  const badge = document.getElementById('selectedBadge');
  if (el) el.innerText = total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ฿';
  if (badge) {
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function toggleAllRows(checked) {
  document.querySelectorAll('.row-checkbox').forEach(cb => {
    cb.checked = checked;
  });
  updateSelectedTotal();
}



function createPreviewHTML(e, isError = false, errorMsg = "") {
  const isPO = (e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO');
  const statusClass = isPO ? 'status-po' : 'status-normal';
  const statusLabel = isPO ? 'PURCHASE ORDER' : (e.type === 'หักล้างเงินยืม' ? 'หักล้าง' : 'NORMAL');
  const fmt = (v) => (v !== "" && v !== null && v !== undefined && v !== 0) ? Number(v).toLocaleString() + " ฿" : "";

  return `
        <div class="preview-card ${isError ? 'error' : ''}">
          <div class="preview-header">
            <div>
              <div style="font-size:10px; font-weight:800; color:var(--text-muted); margin-bottom:4px; text-transform:uppercase;">Category Sector</div>
              <span class="cat-badge">${e.catCode || ''}</span>
            </div>
            <span class="status-tag ${statusClass}">${statusLabel}</span>
          </div>
          
          <div style="font-weight:800; font-size:18px; color:var(--text-main); margin: 16px 0 12px; line-height:1.4;">${e.desc || ''}</div>
          
          <div style="display:grid; grid-template-columns: repeat(2, 1fr); gap:16px; margin-top:20px;">
            <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
              <label style="font-size:10px;">ผู้เบิก/ยืม</label>
              <div style="font-weight:700; font-size:14px; margin-top:4px;">${e.name || ''}</div>
            </div>
            <div style="background:#f8fafc; padding:12px; border-radius:12px; border:1px solid #e2e8f0;">
              <label style="font-size:10px;">หน่วยงาน/ฝ่าย</label>
              <div style="font-weight:700; font-size:14px; margin-top:4px;">${e.dept || ''}</div>
            </div>
            <div style="background:var(--primary-light); padding:12px; border-radius:12px; border:1px solid var(--primary);">
              <label style="font-size:10px; color:var(--primary-dark)">งบประมาณกั้นไว้</label>
              <div style="font-weight:800; font-size:16px; color:var(--primary-dark); margin-top:4px;">${fmt(e.amount)}</div>
            </div>
            <div style="background:#fff7ed; padding:12px; border-radius:12px; border:1px solid #fdba74;">
              <label style="font-size:10px; color:#9a3412">ใช้จริง/คืนเงิน</label>
              <div style="font-weight:800; font-size:16px; color:#9a3412; margin-top:4px;">${fmt(e.amountDeduct)}</div>
            </div>
          </div>

          <div style="margin-top:20px; padding-top:16px; border-top:1px dashed #e2e8f0; display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:12px;">
            <div><label style="font-size:9px;">เลขหนังสือ:</label> <b>${e.refNo || ''}</b></div>
            <div><label style="font-size:9px;">เลขตัดยอด:</label> <b>${e.liquidateRefNo || ''}</b></div>
            <div><label style="font-size:9px;">เลขที่ระบบ:</label> <b>${e.colF || ''}</b></div>
            <div><label style="font-size:9px;">รหัส ID:</label> <b style="color:var(--primary)">#${e.id}</b></div>
            <div><label style="font-size:9px;">เลขกันเงิน:</label> <b style="color:var(--primary)">${e.reserveNumber || '-'}</b></div>
          </div>

          ${isError ? `<div style="background:#fef2f2; color:#ef4444; padding:12px; border-radius:8px; font-size:12px; font-weight:800; margin-top:20px; border:1px solid #fecaca; text-align:center;">
            <span class="material-symbols-outlined" style="font-size:18px; vertical-align:middle; margin-right:4px;">warning</span> ${errorMsg}
          </div>` : ''}
        </div>`;
}

function omniSearch(val, view) {
  const prv = document.getElementById('prv' + view); if (!val || !cache) { prv.style.display = 'none'; return; }
  const q = val.toString().trim().toLowerCase();
  const match = cache.entries.find(e =>
    e.id.toString().toLowerCase() === q ||
    e.refNo.toString().toLowerCase() === q ||
    (e.liquidateRefNo && e.liquidateRefNo.toString().toLowerCase() === q) ||
    (e.colF && e.colF.toString().toLowerCase() === q)
  );
  if (match) {
    document.getElementById('hiddenId' + view).value = match.id;
    if (view === 'E') loadEdit(match.id);
    else if (view === 'RA') loadReserveAdd(match.id);
    else validateSearch(view, match);
  } else { prv.innerHTML = '<div class="preview-card error" style="text-align:center;">❌ ไม่พบข้อมูลจาก ID หรือ เลขหนังสือนี้</div>'; prv.style.display = 'block'; }
}

function loadReserveAdd(id) {
  const e = cache.entries.find(x => x.id == id);
  const prv = document.getElementById('prvRA');
  const flds = document.getElementById('reserveAddFields');
  if (!e) return;
  prv.innerHTML = createPreviewHTML(e); prv.style.display = 'block';
  flds.style.display = 'block';
  // Pre-fill fields for consistency
  document.getElementById('raRef').value = e.refNo;
  document.getElementById('raDate').valueAsDate = new Date();
  document.getElementById('raDept').value = e.dept;
  document.getElementById('raName').value = e.name;
  document.getElementById('raDesc').value = "(กันเงินเพิ่ม) " + e.desc;
  document.getElementById('raCol').value = e.col;
  document.getElementById('catCodeRA').value = e.catCode;
}

function validateSearch(view, entry = null) {
  const id = document.getElementById('hiddenId' + view).value;
  const e = entry || cache.entries.find(x => x.id == id);
  const prv = document.getElementById('prv' + view); const btn = document.getElementById('btn' + view); const nm = document.getElementById('nm' + view);
  if (!e) { btn.disabled = true; return; }
  let err = "";
  if (view === 'D' || view === 'O' || view === 'DA' || view === 'C') {
    const modeEl = document.querySelector('input[name="mode"]:checked');
    const mode = modeEl ? modeEl.value : 'Normal';
    const isPO = (e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO');
    if (view === 'D') {
      if (mode === 'PO' && !isPO) err = "⚠️ รายการนี้ไม่ใช่ PO";
      if (mode === 'Normal' && isPO) err = "⚠️ รายการนี้เป็น PO (ต้องตัดแบบ PO)";
    }
    if (e.liquidateRefNo === '2025-10-28T17:00:00.000Z' || e.liquidateRefNo === '69-05-00033') err = "⚠️ รายการนี้ถูกตัดยอดแล้ว (Locked: 69-05-00033)";
  }



  btn.disabled = !!err;
  if (nm) nm.value = e.name;
  const descInput = document.getElementById('desc' + view);
  if (descInput) descInput.value = e.desc;
  prv.innerHTML = createPreviewHTML(e, !!err, err); prv.style.display = 'block';
}

function performGlobalSearch(q) {
  const container = document.getElementById('searchResultsContainer');
  const detail = document.getElementById('searchDetail');
  if (detail) detail.innerHTML = ''; // Clear old details
  if (!q || q.trim().length < 2) { container.innerHTML = ''; return; }
  const query = q.trim().toLowerCase();
  const matches = cache.entries.filter(e =>
    (e.id && e.id.toString().toLowerCase().includes(query)) ||
    (e.refNo && e.refNo.toString().toLowerCase().includes(query)) ||
    (e.liquidateRefNo && e.liquidateRefNo.toString().toLowerCase().includes(query)) ||
    (e.colF && e.colF.toString().toLowerCase().includes(query)) ||
    (e.name && e.name.toString().toLowerCase().includes(query)) ||
    (e.dept && e.dept.toString().toLowerCase().includes(query)) ||
    (e.desc && e.desc.toString().toLowerCase().includes(query)) ||
    (e.date && e.date.toString().toLowerCase().includes(query))
  ).slice(0, 10);

  container.innerHTML = matches.map(m => `
        <div class="search-result-item" onclick="showSearchDetail('${m.id}')">
          <div>
            <div style="font-weight:800; font-size:14px;">#${m.id} - ${m.refNo}</div>
            <div style="font-size:12px; color:var(--text-muted);">${m.name} | ${m.dept}</div>
          </div>
          <div style="font-weight:700; color:var(--primary-dark);">${Number(m.amount).toLocaleString()} ฿</div>
        </div>
      `).join('');
}

function showSearchDetail(id) {
  const e = cache.entries.find(x => x.id == id);
  const detailContainer = document.getElementById('searchDetail');

  const targetInfo = extractMissionInfo(e.desc);
  const targetDate = targetInfo.timestamp || (e.letterDateRaw ? new Date(e.letterDateRaw).getTime() : 0);

  const related = cache.entries.filter(x => {
    if (x.id == id) return false;
    const xInfo = extractMissionInfo(x.desc);
    if (xInfo.mission !== targetInfo.mission || xInfo.province !== targetInfo.province || xInfo.detail !== targetInfo.detail) return false;

    const xDate = xInfo.timestamp || (x.letterDateRaw ? new Date(x.letterDateRaw).getTime() : 0);
    return Math.abs(xDate - targetDate) <= 3 * 24 * 60 * 60 * 1000;
  });

  let relatedHtml = '';
  if (related.length > 0) {
    const groupTotal = related.reduce((sum, r) => sum + (Number(r.amount) || 0), Number(e.amount) || 0);
    const totalItems = related.length + 1; // including the main item

    relatedHtml = `
          <div style="margin-top:30px; border-top: 2px solid var(--border); padding-top:20px; text-align:left;">
            <div style="font-size:14px; font-weight:800; color:var(--text-muted); margin-bottom:12px;">รายการใกล้เคียง คุณอาจจะลืม (กลุ่มเดียวกัน)</div>
            
            <div style="background:var(--primary-light); padding:12px; border-radius:8px; border:1px solid var(--primary); margin-bottom:12px; display:flex; align-items:center; gap:12px;">
              <div style="width:32px; height:32px; background:white; color:var(--primary); border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
                <span class="material-symbols-outlined" style="font-size:18px;">explore</span>
              </div>
              <div>
                <div style="font-weight:800; color:var(--primary-dark); font-size:13px;">ภารกิจ: ${targetInfo.mission} | จ.${targetInfo.province}</div>
                <div style="font-size:11px; color:var(--primary); font-weight:700; margin-top:2px;">รวมทั้งสิ้น ${totalItems} รายการ | ยอดงบประมาณกลุ่ม: ${groupTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
              </div>
            </div>

            <div style="margin-top:30px; position:relative;">
              <div style="position:absolute; top:50%; left:0; right:0; height:2px; background:var(--border); z-index:1;"></div>
              <div style="position:relative; z-index:2; text-align:center;">
                <span style="background:#fffbeb; padding:6px 16px; font-size:13px; font-weight:800; color:#b45309; border:2px dashed #fbbf24; border-radius:20px; display:inline-flex; align-items:center; gap:8px;">
                  <span class="material-symbols-outlined" style="font-size:18px;">linear_scale</span>
                  รายการที่คล้ายกัน (${related.length} รายการ)
                </span>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:10px; margin-top:20px;">
              ${related.map(r => `
                <div style="padding:12px; border:1px solid var(--border); border-radius:8px; cursor:pointer; background:#f8fafc; transition:0.2s;" onclick="showSearchDetail('${r.id}')" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
                  <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div style="font-weight:800; font-size:13px; color:var(--primary-dark);">#${r.id} - ${r.refNo}</div>
                    <div style="font-weight:700; color:var(--primary); font-size:13px; white-space:nowrap; margin-left:10px;">${Number(r.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿</div>
                  </div>
                  <div style="font-size:12px; color:var(--text-main); margin-top:6px; line-height:1.4;">${r.desc}</div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
  }

  detailContainer.innerHTML = createPreviewHTML(e) + `
        <button class="submit-btn" style="margin-top:20px;" onclick="selectFromTable('${id}')">
          <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <span class="material-symbols-outlined">settings</span>
            ดำเนินการกับรายการนี้
          </div>
        </button>
      ` + relatedHtml;
}

function loadEdit(id) {
  const e = cache.entries.find(x => x.id == id);
  if (!e) return;
  document.getElementById('editFields').style.display = 'block';
  document.getElementById('hiddenIdE').value = e.id;
  document.getElementById('eRef').value = e.refNo; document.getElementById('eDate').value = e.letterDateFormatted;
  document.getElementById('eName').value = e.name; document.getElementById('eDept').value = e.dept;
  document.getElementById('eLiq').value = e.liquidateRefNo || ''; document.getElementById('eF').value = e.colF || '';
  document.getElementById('eDesc').value = e.desc;
  document.getElementById('eAmt').value = e.amount;
  document.getElementById('eAmtD').value = e.amountDeduct || 0;
  if (document.getElementById('eReserve')) document.getElementById('eReserve').value = e.reserveNumber || '';
  document.getElementById('eCol').value = e.col; document.getElementById('catCodeE').value = e.catCode;
}

function syncCode(s) { document.getElementById(s.dataset.hidden).value = s.options[s.selectedIndex].dataset.code || ''; }
function showModal(title, text) { document.getElementById('mTitle').innerText = title; document.getElementById('mBody').innerText = text; document.getElementById('modalOverlay').classList.add('active'); }
function closeModal() { document.getElementById('modalOverlay').classList.remove('active'); }

function syncRDRef(v) {
  const target = document.getElementById('rdLiqRef');
  if (target) target.value = v;
}

function extractMissionInfo(desc) {
  // Handle non-string or empty input safely
  const d = (desc || "").toString().trim();
  if (!d) return { mission: 'ทั่วไป', province: 'ส่วนกลาง', timestamp: 0 };

  // 1. Mission Detection
  let mission = 'ทั่วไป';
  const mMatch = d.match(/(?:ภารกิจ|เพื่อ)\s*([^\s,()#-]{3,})/);
  if (mMatch) {
    mission = mMatch[1].trim();
  }

  // Normalize common missions
  if (d.includes('ภัยแล้ง')) mission = 'บรรเทาภัยแล้ง';
  if (d.includes('ฝนหลวง')) mission = 'ปฏิบัติการฝนหลวง';
  if (d.includes('ยาเสพติด')) mission = 'ปราบปรามยาเสพติด';

  // 2. Province Detection (Take the FIRST one found)
  const p = d.match(/(?:จังหวัด|จ\.)\s*([^\s,()#-]+)/);
  const province = p ? p[1].trim() : 'ส่วนกลาง';

  // 3. Date Detection (e.g. "14 พ.ค. 69", "ว.14พ.ค. 69" or "พ.ค. 69")
  let timestamp = 0;
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const dateMatch = d.match(/(?:(?:วันที่|ว\.)?\s*(\d{1,2})\s*(?:-|ถึง)?\s*(\d{1,2})?\s*)?(ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.|มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)\s*(\d{2,4})/);

  if (dateMatch) {
    let day = parseInt(dateMatch[2] || dateMatch[1]);
    const monthStr = dateMatch[3].replace(/\./g, '');
    const monthIdx = thaiMonths.findIndex(tm => tm.replace(/\./g, '').startsWith(monthStr.substring(0, 2)));
    let year = parseInt(dateMatch[4]);
    if (year < 2400) year += 2500;

    if (monthIdx !== -1) {
      if (isNaN(day)) {
        // หากไม่มีการระบุวันที่ (เช่น "พ.ค. 69") ให้ถือว่าเป็นวันสิ้นเดือนนั้น
        day = new Date(year - 543, monthIdx + 1, 0).getDate();
      }
      // กำหนดเวลาเป็น 23:59:59 เพื่อให้ครอบคลุมจนหมดวัน
      timestamp = new Date(year - 543, monthIdx, day, 23, 59, 59).getTime();
    }
  }

  // 4. Specific Detail (Aircraft/Vehicle) Detection for better grouping
  let detail = '';
  const detailMatch = d.match(/([A-Za-z0-9-]+\s*มล\.\s*\d+|มล\.\s*\d+|[A-Za-z]{4,}\s*\d{2,})/i);
  if (detailMatch) {
    detail = detailMatch[1].trim().toUpperCase();
  }

  return { mission, province, timestamp, detail };
}

function toggleSpendingItem(id, event) {
  if (event) event.stopPropagation();
  if (excludedSpendingItems.has(id)) {
    excludedSpendingItems.delete(id);
  } else {
    excludedSpendingItems.add(id);
  }
  renderSpendingPlan();
}

function toggleSpendingCategory(catCode, event) {
  if (event) event.stopPropagation();
  if (!cache || !cache.entries) return;

  const isCancelled = (e) => e.colF && e.colF.toString().includes("ยกเลิก");
  const items = cache.entries.filter(e =>
    e.id !== undefined && e.id !== null && e.id !== "" &&
    e.date !== undefined && e.date !== null && e.date !== "" &&
    !isCancelled(e) &&
    (e.catCode || 'ไม่ระบุหมวด') === catCode
  );

  let allExcluded = true;
  let validItemsCount = 0;
  items.forEach(e => {
    const deduct = Number(e.amountDeduct || 0);
    const isPending = (!deduct || deduct === 0) && (!e.colE || e.colE.toString().trim() === "") && (!e.colF || e.colF.toString().trim() === "" || e.colF.toString().trim().toUpperCase() === "PO");
    const isPendingGF = (deduct && deduct !== 0) && (!e.colE || e.colE.toString().trim() === "");
    if (isPending || isPendingGF) {
      validItemsCount++;
      if (!excludedSpendingItems.has(e.id)) {
        allExcluded = false;
      }
    }
  });

  if (validItemsCount === 0) return;

  if (allExcluded) {
    items.forEach(e => excludedSpendingItems.delete(e.id));
  } else {
    items.forEach(e => excludedSpendingItems.add(e.id));
  }

  renderSpendingPlan();
}

function renderSpendingPlan() {
  const tbody = document.getElementById('spendingPlanBody');
  if (!currentPlan || !cache || !cache.entries || !cache.plans) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:40px;"><div class="loader-inner" style="margin:20px auto;"></div>กำลังโหลดข้อมูล...</td></tr>';
    return;
  }
  const p = cache.plans.find(x => x.shortName === currentPlan);
  if (!p) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:40px; color:var(--text-muted);">ไม่พบข้อมูลตั้งค่าแผนงาน</td></tr>';
    return;
  }

  const subtitle = document.getElementById('spendingPlanPrintSubtitle');
  if (subtitle) {
    let titleHtml = 'แผนปฏิบัติการ: ' + (p.fullName || currentPlan || '');
    if (p.output || p.activity) {
      titleHtml += `<div style="font-size:14px; margin-top:6px; color:#555;">`;
      if (p.output) titleHtml += `โครงการ/ผลผลิต: ${p.output} &nbsp;&nbsp;&nbsp;`;
      if (p.activity) titleHtml += `กิจกรรม: ${p.activity}`;
      titleHtml += `</div>`;
    }
    subtitle.innerHTML = titleHtml;
  }

  // Initialize summary structure based on PlanSettings
  const summary = {};
  const groupMap = {}; // Keep track of items per group
  p.budgets.forEach((b, index) => {
    const itemCode = b.item;
    const gName = b.group || 'อื่นๆ';
    if (!groupMap[gName]) groupMap[gName] = [];
    if (!groupMap[gName].includes(itemCode)) groupMap[gName].push(itemCode);

    if (!summary[itemCode]) {
      summary[itemCode] = {
        code: itemCode,
        name: itemCode,
        group: gName,
        order: index + 1,
        alloc: 0,
        increase: 0,
        decrease: 0,
        afterAdj: 0,
        resNonPO: 0,
        resPO: 0,
        deductPO: 0,
        deductTotal: 0,
        gfTotal: 0,
        entries: [], // store transactions
        adjustments: [] // store adjustment history
      };
    }

    summary[itemCode].alloc += parseSafeFloat(b.allocated);
    summary[itemCode].increase += parseSafeFloat(b.increase);
    summary[itemCode].decrease += parseSafeFloat(b.decrease);
    summary[itemCode].afterAdj = summary[itemCode].alloc + summary[itemCode].increase - summary[itemCode].decrease;
    summary[itemCode].adjustments.push(b);
  });

  const isCancelled = (e) => e.colF && e.colF.toString().includes("ยกเลิก");

  const spDept = document.getElementById('spendingDeptFilter') ? document.getElementById('spendingDeptFilter').value : "";
  let filtered = cache.entries.filter(e =>
    e.id !== undefined && e.id !== null && e.id !== "" &&
    e.date !== undefined && e.date !== null && e.date !== "" &&
    e.plan === currentPlan &&
    !isCancelled(e) &&
    (!spDept || e.dept === spDept)
  );



  filtered.forEach(e => {
    let catCode = e.catCode ? e.catCode.toString().trim() : 'ไม่ระบุหมวด';
    if (!summary[catCode]) {
      // Match 'A1' with 'A1 - ค่าอาหารทำการนอกเวลา'
      let foundKey = Object.keys(summary).find(k =>
        k.trim() === catCode ||
        k.split(' -')[0].trim() === catCode ||
        k.split('-')[0].trim() === catCode
      );

      let bestName = catCode;
      let bestGroup = 'รายการอื่นๆ (ไม่อยู่ในแผน)';
      let foundInPlanCats = false;

      if (!foundKey && typeof PLAN_CATEGORIES !== 'undefined') {
        // Check target plan first, then fallback to 'default'
        const configsToCheck = [];
        if (PLAN_CATEGORIES[currentPlan]) configsToCheck.push(PLAN_CATEGORIES[currentPlan]);
        if (PLAN_CATEGORIES['default']) configsToCheck.push(PLAN_CATEGORIES['default']);
        
        for (const planConfig of configsToCheck) {
          if (foundInPlanCats) break;
          for (const grp of planConfig) {
            if (grp.options) {
              const opt = grp.options.find(o => o.code === catCode || o.text === catCode || o.text.startsWith(catCode + ' '));
              if (opt) {
                // Strip the "B1 - " prefix if it exists
                bestName = opt.text.includes('-') ? opt.text.substring(opt.text.indexOf('-') + 1).trim() : opt.text;
                let cleanLabel = grp.label.replace(/^[0-9.]+\s*/, '').replace(/^หมวด\s*/, '').trim();
                bestGroup = cleanLabel || 'รายการอื่นๆ (ไม่อยู่ในแผน)';
                foundInPlanCats = true;
                break;
              }
            }
          }
        }

        // Try to match again using the resolved bestName
        if (foundInPlanCats) {
          foundKey = Object.keys(summary).find(k => 
             k.trim() === bestName || 
             (k.includes('-') && k.substring(k.indexOf('-') + 1).trim() === bestName) ||
             (k.includes('-') && k.substring(0, k.indexOf('-')).trim() === catCode)
          );
        }
      }

      if (foundKey) {
        catCode = foundKey;
      } else {
        // Create it dynamically
        summary[catCode] = {
          code: catCode,
          name: bestName,
          group: bestGroup,
          order: 999,
          alloc: 0,
          afterAdj: 0,
          resNonPO: 0, resPO: 0, deductPO: 0, deductTotal: 0, gfTotal: 0, entries: []
        };
        if (!groupMap[bestGroup]) groupMap[bestGroup] = [];
        if (!groupMap[bestGroup].includes(catCode)) {
          groupMap[bestGroup].push(catCode);
        }
      }
    }

    const amt = parseSafeFloat(e.amount);
    const deduct = parseSafeFloat(e.amountDeduct);

    const colE = e.date ? e.date.toString().trim() : "";
    const colH = e.colF ? e.colF.toString().trim() : "";
    const colC = e.type ? e.type.toString().toUpperCase() : "";
    const colG = e.colE ? e.colE.toString().trim() : "";

    const hasColH = colH !== "";
    const hasColE = colE !== "";
    const hasColG = colG !== "";
    const isPO = colC.includes('PO');
    const hasGF = hasColG;

    // Core math for remain/pipeline (do not change logic to preserve equations)
    if (isPO) {
      summary[catCode].resPO += amt;
      summary[catCode].deductPO += deduct;
    } else {
      summary[catCode].resNonPO += amt;
    }
    summary[catCode].deductTotal += deduct;
    if (hasGF) {
      summary[catCode].gfTotal += deduct;
    }

    // --- Custom User Definitions for Display Columns ---
    // 1. เงินกัน/ทดรอง คือ คอลั่ม E ไม่ว่าง แต่ H ว่าง
    if (hasColE && !hasColH && !isPO) {
      summary[catCode].displayResNonPO = (summary[catCode].displayResNonPO || 0) + amt;
    }

    // 2. สัญญา PO คือ คอลั่ม C มีคำว่า PO และ E ไม่ว่าง และ H ว่าง
    if (isPO && hasColE && !hasColH) {
      summary[catCode].displayResPO = (summary[catCode].displayResPO || 0) + amt;
    }

    // 3. สัญญาคงเหลือ คือ คอลั่ม C มีคำว่า PO และ H ไม่ว่าง
    if (isPO && hasColH) {
      summary[catCode].displayPoRemain = (summary[catCode].displayPoRemain || 0) + Math.max(0, amt - deduct);
      summary[catCode].displayPoDeduct = (summary[catCode].displayPoDeduct || 0) + deduct; // Keep track of deduction for PO
    }

    // 4. เบิกจ่ายลดยอด [กองแผน] คอลั่ม H ไม่ว่าง
    if (hasColH) {
      summary[catCode].displayDeductTotal = (summary[catCode].displayDeductTotal || 0) + deduct;
    }

    // 5. GF รวมทั้งหมด คือ H และ G ไม่ว่าง
    if (hasColH && hasColG) {
      summary[catCode].displayGfTotal = (summary[catCode].displayGfTotal || 0) + deduct;
      const spMonthFilter = document.getElementById('spendingMonthFilter') ? document.getElementById('spendingMonthFilter').value : "";
      const fiscalMonths = ["ต.ค.", "พ.ย.", "ธ.ค.", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย."];

      if (spMonthFilter) {
        const mIdx = fiscalMonths.indexOf(e.month);
        const selectedIdx = fiscalMonths.indexOf(spMonthFilter);
        if (mIdx !== -1 && selectedIdx !== -1) {
          if (mIdx < selectedIdx) {
            summary[catCode].displayGfAccum = (summary[catCode].displayGfAccum || 0) + deduct;
          } else if (mIdx === selectedIdx) {
            summary[catCode].displayGfMonth = (summary[catCode].displayGfMonth || 0) + deduct;
          }
        }
      } else {
        summary[catCode].displayGfMonth = (summary[catCode].displayGfMonth || 0) + deduct;
      }
    }

    // Add to sub-entries
    const isPending = (!deduct || deduct === 0) && (!hasGF) && (!e.colF || e.colF.toString().trim() === "" || e.colF.toString().trim().toUpperCase() === "PO");
    const isPendingGF = (deduct && deduct !== 0) && (!hasGF);
    summary[catCode].entries.push({ ...e, isPending, isPendingGF });
  });

  let html = '';
  let grandTotals = {
    alloc: 0, increase: 0, decrease: 0, afterAdj: 0, resNonPO: 0, po: 0, poDeduct: 0, poRemain: 0,
    deductTotal: 0, gfTotal: 0, gfAccum: 0, gfMonth: 0, pipeline: 0, remain: 0
  };
  let opTotals = {
    alloc: 0, increase: 0, decrease: 0, afterAdj: 0, resNonPO: 0, po: 0, poDeduct: 0, poRemain: 0,
    deductTotal: 0, gfTotal: 0, gfAccum: 0, gfMonth: 0, pipeline: 0, remain: 0
  };

  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (val, total) => total > 0 ? (val * 100 / total).toFixed(2) + '%' : '0.00%';

  let orderGroup = 1;

  for (const [gName, itemsInGroup] of Object.entries(groupMap)) {
    let gt = { alloc: 0, increase: 0, decrease: 0, afterAdj: 0, resNonPO: 0, po: 0, poDeduct: 0, poRemain: 0, deductTotal: 0, gfTotal: 0, gfAccum: 0, gfMonth: 0, pipeline: 0, remain: 0 };
    let itemsHtml = '';
    let groupHasIncludedItems = false;
    let groupHasPrintableItems = false;

    let orderItem = 1;

    itemsInGroup.forEach(catCode => {
      const r = summary[catCode];

      let includedCount = 0;
      r.entries.forEach(entry => {
        if (!excludedSpendingItems.has(entry.id)) includedCount++;
      });
      let isExcludedCat = (r.entries.length > 0 && includedCount === 0);
      let isNoDataCat = (r.afterAdj === 0 && r.entries.length === 0);
      let isHiddenInPrint = isExcludedCat || isNoDataCat;

      if (!isExcludedCat) groupHasIncludedItems = true;
      if (!isHiddenInPrint) groupHasPrintableItems = true;

      // Apply user's custom logic for the display columns
      const displayResNonPO = r.displayResNonPO || 0;
      const displayResPO = r.displayResPO || 0;
      const displayPoDeduct = r.displayPoDeduct || 0;
      const displayPoRemain = displayResPO - displayPoDeduct;
      const displayDeductTotal = r.displayDeductTotal || 0;
      const displayGfTotal = r.displayGfTotal || 0;
      const displayGfAccum = r.displayGfAccum || 0;
      const displayGfMonth = r.displayGfMonth || 0;

      const pipeline = displayDeductTotal - displayGfTotal;
      const remain = r.afterAdj - displayResNonPO - displayPoRemain - displayDeductTotal;

      // Add to group totals using the CUSTOM display values so the summary rows match
      gt.alloc += r.alloc;
      gt.increase += r.increase;
      gt.decrease += r.decrease;
      gt.afterAdj += r.afterAdj;
      gt.resNonPO += displayResNonPO;
      gt.po += displayResPO;
      gt.poDeduct += displayPoDeduct;
      gt.poRemain += displayPoRemain;
      gt.deductTotal += displayDeductTotal;
      gt.gfTotal += displayGfTotal;
      gt.gfAccum += displayGfAccum;
      gt.gfMonth += displayGfMonth;

      gt.pipeline += pipeline;
      gt.remain += remain;

      // Checkbox for transactions
      let indeterminateScript = (includedCount > 0 && includedCount < r.entries.length) ? `<script>setTimeout(() => { const cb = document.getElementById('cb-${r.code}'); if(cb) cb.indeterminate = true; }, 10);<\/script>` : '';
      let catCheckbox = r.entries.length > 0 ? `<input type="checkbox" id="cb-${r.code}" style="cursor:pointer; transform:scale(1.2);" class="hide-on-print" ${includedCount > 0 ? 'checked' : ''} onclick="toggleSpendingCategory('${r.code}', event)">${indeterminateScript}` : '';

      let isExpanded = expandedSpendingCategories.has('sub-' + r.code);

      itemsHtml += `
            <tr class="table-row-clickable ${isExcludedCat ? 'excluded-row' : ''} ${isHiddenInPrint ? 'hide-on-print' : ''}" onclick="toggleSubTable('sub-${r.code}', 'all', event)" title="คลิกเพื่อดูรายละเอียดทั้งหมด" style="cursor:pointer; ${isExcludedCat ? 'opacity:0.5; background-color:#f8fafc;' : ''}">
              <td style="font-weight:700; color:var(--primary-dark); padding:8px 12px; white-space:normal; word-break:break-word; line-height:1.4; ${isExcludedCat ? 'text-decoration:line-through;' : ''}">
                 <div style="display:flex; align-items:flex-start; gap:8px;">
                    ${r.name}
                 </div>
              </td>
              <td style="text-align:right; font-weight:bold;" onclick="toggleSubTable('sub-${r.code}', 'all', event)">${fmt(r.afterAdj)}</td>
              <td style="text-align:right; color:#1e40af;" title="คลิกเพื่อดูเฉพาะเงินกัน (Non-PO)" onclick="toggleSubTable('sub-${r.code}', 'resNonPO', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayResNonPO)}</span></td>
              <td style="text-align:right;" title="คลิกเพื่อดูเฉพาะสัญญา (PO)" onclick="toggleSubTable('sub-${r.code}', 'resPO', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayResPO)}</span></td>
              <td style="text-align:right;" title="คลิกเพื่อดูเฉพาะเบิกเงิน (PO)" onclick="toggleSubTable('sub-${r.code}', 'poRemain', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayPoDeduct)}</span></td>
              <td style="text-align:right;" title="คลิกเพื่อดูเฉพาะสัญญาคงเหลือ" onclick="toggleSubTable('sub-${r.code}', 'poRemain', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayPoRemain)}</span></td>
              <td style="text-align:right;" title="คลิกเพื่อดูเฉพาะเบิกจ่ายลดยอด" onclick="toggleSubTable('sub-${r.code}', 'deductTotal', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayDeductTotal)}</span></td>
              <td style="text-align:right; color:#064e3b; font-weight:bold;" title="คลิกเพื่อดูเฉพาะ GF" onclick="toggleSubTable('sub-${r.code}', 'gf', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayGfAccum)}</span></td>
              <td style="text-align:right; color:#047857; font-weight:bold;" title="คลิกเพื่อดูเฉพาะ GF" onclick="toggleSubTable('sub-${r.code}', 'gf', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayGfMonth)}</span></td>
              <td style="text-align:right; color:#10b981; font-weight:bold;" title="คลิกเพื่อดูเฉพาะ GF" onclick="toggleSubTable('sub-${r.code}', 'gf', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(displayGfTotal)}</span></td>
              <td style="text-align:right; color:#b45309;" title="คลิกเพื่อดูเฉพาะค้างท่อ" onclick="toggleSubTable('sub-${r.code}', 'pipeline', event)"><span style="border-bottom:1px dashed #cbd5e1;">${fmt(pipeline)}</span></td>
              <td style="text-align:right; color:${remain < 0 ? '#ef4444' : '#16a34a'};" onclick="toggleSubTable('sub-${r.code}', 'all', event)">${fmt(remain)}</td>
            </tr>
          `;

      // Sub rows for entries
      let subRowsHtml = '';
      r.entries.forEach(entry => {
        const hasGF = !!(entry.colE && entry.colE.toString().trim() !== "");
        let badge = '';
        if (hasGF) {
          badge = `<span class="status-tag status-success" style="font-size:9px; padding:2px 4px; border-radius:4px; display:inline-block; margin-bottom:4px;">GF สำเร็จ</span><br>
                        <div style="font-size:10px; font-weight:600; color:var(--text-main);">${formatThaiDate(entry.colE)}</div>
                        ${entry.colF ? `<div style="font-size:9px; opacity:0.6; margin-top:2px;">(${entry.colF})</div>` : ''}`;
        } else if (entry.amountDeduct && entry.amountDeduct != 0) {
          badge = `<span class="status-tag status-normal" style="font-size:9px; padding:2px 4px; border-radius:4px; display:inline-block; margin-bottom:4px;">ตัดยอดแล้ว</span><br>
                        <div style="font-size:10px; font-weight:600; color:var(--text-main);">${entry.colF || '-'}</div>`;
        } else {
          badge = `<span class="status-tag status-pending" style="font-size:9px; padding:2px 4px; border-radius:4px;">ยังไม่ตัดยอด</span>
                        ${entry.colF && entry.colF.toString().trim().toUpperCase() === 'PO' ? `<br><div style="font-size:10px; font-weight:600; color:var(--text-main); margin-top:4px;">PO</div>` : ''}`;
        }

        const money = parseSafeFloat(entry.amount);
        const deduct = parseSafeFloat(entry.amountDeduct);
        let isExcludedItem = excludedSpendingItems.has(entry.id);
        const isPOItem = ((entry.type && entry.type.toString().toUpperCase() === 'PO') || (entry.colF && entry.colF.toString().toUpperCase() === 'PO'));

        const hasColE = !!(entry.date && entry.date.toString().trim() !== "");
        const hasColH = !!(entry.colF && entry.colF.toString().trim() !== "");
        const hasColG = !!(entry.colE && entry.colE.toString().trim() !== "");
        let types = [];
        if (hasColE && !hasColH && !isPOItem) types.push('resNonPO');
        if (isPOItem && hasColE && !hasColH) types.push('resPO');
        if (isPOItem && hasColH) types.push('poRemain');
        if (hasColH) types.push('deductTotal');
        if (hasColH && hasColG) types.push('gf');
        if (hasColH && !hasColG) types.push('pipeline');

        subRowsHtml += `
                  <tr data-types="${types.join(',')}" data-reserve="${money}" data-deduct="${deduct}" style="cursor:context-menu; ${isExcludedItem ? 'opacity:0.5; background-color:#f8fafc;' : ''}" class="sub-entry-row ${isExcludedItem ? 'excluded-row hide-on-print' : ''} table-row-clickable" oncontextmenu="event.preventDefault(); event.stopPropagation(); selectFromTable('${entry.id}', event)">
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; color:var(--primary); font-weight:700; ${isExcludedItem ? 'text-decoration:line-through;' : ''}">#${entry.id}</td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; text-align:center; white-space:nowrap;">${formatThaiDate(entry.date)}</td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; text-align:center;"><span class="cat-badge" style="font-size:10px; padding:2px 6px; background:#eef2ff; color:#4338ca; border-radius:4px; font-weight:700; white-space:nowrap;">${entry.catCode || '-'}</span></td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; white-space:nowrap;">${entry.refNo || '-'}</td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; font-weight:700; white-space:normal;">
                       <div style="word-break:break-word; overflow-wrap:break-word; white-space:normal;">
                         ${entry.name || '-'}
                       </div>
                     </td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; text-align:center;"><span class="cat-badge" style="font-size:10px; padding:2px 6px; background:var(--primary-light); color:var(--primary-dark); border-radius:4px; font-weight:700; white-space:nowrap;">${entry.dept || '-'}</span></td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; white-space:normal;">
                       <div style="word-break:break-word; overflow-wrap:break-word; white-space:normal;">
                         ${isPOItem ? '<span class="status-tag status-po" style="font-size:9px; padding:1px 4px; margin-right:4px;">PO</span>' : ''}
                         ${entry.desc || '-'}
                       </div>
                     </td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:700; color:var(--primary-dark); white-space:nowrap;">${money.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; text-align:right; font-weight:700; color:#c2410c; white-space:nowrap;">${deduct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                     <td style="padding:8px; font-size:11px; border-bottom:1px solid #e2e8f0; text-align:center; white-space:nowrap;">${badge}</td>
                  </tr>
              `;
      });
      itemsHtml += `
            <tr id="sub-${r.code}" style="display:${isExpanded ? 'table-row' : 'none'}; background-color:#f1f5f9;" class="${isHiddenInPrint ? 'hide-on-print' : ''}">
              <td colspan="12" style="padding:0; border-bottom:2px solid var(--border);">
                 <div style="overflow-x:auto;">
                   <table class="data-table" style="width:100%; border-collapse:collapse;">
                      <thead style="background:#e2e8f0; font-size:10px; color:var(--text-main); text-transform:uppercase; letter-spacing:0.5px;">
                         <tr>
                           <th style="padding:8px; text-align:left; border-bottom:none; width:5%;">ID</th>
                           <th style="padding:8px; text-align:center; border-bottom:none; width:7%;">วันที่</th>
                           <th style="padding:8px; text-align:center; border-bottom:none; width:6%;">หมวด</th>
                           <th style="padding:8px; text-align:left; border-bottom:none; width:8%;">เลขที่หนังสือ</th>
                           <th style="padding:8px; text-align:left; border-bottom:none; width:14%;">ผู้เบิก</th>
                           <th style="padding:8px; text-align:center; border-bottom:none; width:6%;">ฝ่าย</th>
                           <th style="padding:8px; text-align:left; border-bottom:none; width:34%;">รายการ</th>
                           <th style="padding:8px; text-align:right; border-bottom:none; width:7%;">กันเงิน (฿)</th>
                           <th style="padding:8px; text-align:right; border-bottom:none; width:7%;">เบิกจ่าย (฿)</th>
                           <th style="padding:8px; text-align:center; border-bottom:none; width:6%;">สถานะ</th>
                         </tr>
                         ${subRowsHtml ? `
                         <tr style="background:#fef9c3; font-weight:bold; font-size:12px; color:#854d0e; border-bottom:2px solid #eab308;">
                             <td colspan="7" style="text-align:right; padding:8px; text-transform:none;">ยอดรวม (เฉพาะที่แสดง):</td>
                             <td style="text-align:right; padding:8px; color:#b45309;" id="sub-sum-reserve-${r.code}">0.00</td>
                             <td style="text-align:right; padding:8px; color:#b45309;" id="sub-sum-deduct-${r.code}">0.00</td>
                             <td style="padding:8px;"></td>
                         </tr>
                         ` : ''}
                      </thead>
                      <tbody style="background:#f8fafc;">
                         ${subRowsHtml || '<tr class="no-data-msg"><td colspan="10" style="text-align:center; padding:16px; font-size:12px; color:var(--text-muted);">ไม่มีรายการย่อย</td></tr>'}
                         ${subRowsHtml ? '<tr class="no-data-msg" style="display:none;"><td colspan="10" style="text-align:center; padding:16px; font-size:12px; color:var(--text-muted);">ไม่มีรายการที่ตรงกับเงื่อนไข</td></tr>' : ''}
                      </tbody>

                   </table>
                 </div>
              </td>
            </tr>
          `;

      orderItem++;
    });

    // Add Group totals to Grand Totals
    // Accumulate grand totals
    grandTotals.alloc += gt.alloc;
    grandTotals.increase += gt.increase;
    grandTotals.decrease += gt.decrease;
    grandTotals.afterAdj += gt.afterAdj;
    grandTotals.resNonPO += gt.resNonPO;
    grandTotals.po += gt.po;
    grandTotals.poDeduct += gt.poDeduct;
    grandTotals.poRemain += gt.poRemain;
    grandTotals.deductTotal += gt.deductTotal;
    grandTotals.gfTotal += gt.gfTotal;
    grandTotals.gfAccum += gt.gfAccum;
    grandTotals.gfMonth += gt.gfMonth;
    grandTotals.pipeline += gt.pipeline;
    grandTotals.remain += gt.remain;

    if (gName.includes('ค่าตอบแทน') || gName.includes('ค่าใช้สอย') || gName.includes('ค่าวัสดุ')) {
      opTotals.alloc += gt.alloc;
      opTotals.increase += gt.increase;
      opTotals.decrease += gt.decrease;
      opTotals.afterAdj += gt.afterAdj;
      opTotals.resNonPO += gt.resNonPO;
      opTotals.po += gt.po;
      opTotals.poDeduct += gt.poDeduct;
      opTotals.poRemain += gt.poRemain;
      opTotals.deductTotal += gt.deductTotal;
      opTotals.gfTotal += gt.gfTotal;
      opTotals.gfAccum += gt.gfAccum;
      opTotals.gfMonth += gt.gfMonth;
      opTotals.pipeline += gt.pipeline;
      opTotals.remain += gt.remain;
    }

    html += `
          <tr class="summary-row-group ${groupHasPrintableItems ? '' : 'hide-on-print'}">
            <td>รวม ${gName}</td>
            <td style="text-align:right;">${fmt(gt.afterAdj)}</td>
            <td style="text-align:right;">${fmt(gt.resNonPO)}</td>
            <td style="text-align:right;">${fmt(gt.po)}</td>
            <td style="text-align:right;">${fmt(gt.poDeduct)}</td>
            <td style="text-align:right;">${fmt(gt.poRemain)}</td>
            <td style="text-align:right;">${fmt(gt.deductTotal)}</td>
            <td style="text-align:right; font-weight:bold; color:#064e3b;">${fmt(gt.gfAccum)}</td>
            <td style="text-align:right; font-weight:bold; color:#047857;">${fmt(gt.gfMonth)}</td>
            <td style="text-align:right; font-weight:bold; color:#10b981;">${fmt(gt.gfTotal)}</td>
            <td style="text-align:right;">${fmt(gt.pipeline)}</td>
            <td style="text-align:right;">${fmt(gt.remain)}</td>
          </tr>
        `;
    html += itemsHtml;

    orderGroup++;
  }

  // Grand total rows at TOP
  let topHtml = `
        <tr class="summary-row-grand">
          <td style="text-align:right; padding:14px 16px; font-size:11px;">รวมทั้งสิ้นตามแผน</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.afterAdj)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.resNonPO)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.po)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.poDeduct)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.poRemain)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.deductTotal)}</td>
          <td style="text-align:right; font-size:11px; font-weight:bold; color:#064e3b;">${fmt(grandTotals.gfAccum)}</td>
          <td style="text-align:right; font-size:11px; font-weight:bold; color:#047857;">${fmt(grandTotals.gfMonth)}</td>
          <td style="text-align:right; font-size:11px; font-weight:bold; color:#10b981;">${fmt(grandTotals.gfTotal)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.pipeline)}</td>
          <td style="text-align:right; font-size:11px;">${fmt(grandTotals.remain)}</td>
        </tr>
        <tr class="summary-row-op">
          <td style="text-align:right; padding:12px 16px; font-size:10.5px;">รวม ค่าตอบแทน ใช้สอย และวัสดุ</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.afterAdj)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.resNonPO)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.po)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.poDeduct)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.poRemain)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.deductTotal)}</td>
          <td style="text-align:right; font-size:10.5px; font-weight:bold; color:#064e3b;">${fmt(opTotals.gfAccum)}</td>
          <td style="text-align:right; font-size:10.5px; font-weight:bold; color:#047857;">${fmt(opTotals.gfMonth)}</td>
          <td style="text-align:right; font-size:10.5px; font-weight:bold; color:#10b981;">${fmt(opTotals.gfTotal)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.pipeline)}</td>
          <td style="text-align:right; font-size:10.5px;">${fmt(opTotals.remain)}</td>
        </tr>
      `;

  window.currentGrandTotal = grandTotals.pipeline;
  setTimeout(updateFinalRemainingUI, 50);

  tbody.innerHTML = topHtml + html;
}

function toggleSubTable(id, filterType = 'all', event = null) {
  if (event) event.stopPropagation();
  const el = document.getElementById(id);
  if (!el) return;

  const isCurrentlyVisible = el.style.display !== 'none';
  const currentFilter = el.getAttribute('data-current-filter') || 'none';

  if (isCurrentlyVisible && (filterType === 'all' || filterType === currentFilter)) {
    el.style.display = 'none';
    expandedSpendingCategories.delete(id);
    el.setAttribute('data-current-filter', 'none');
    return;
  }

  el.style.display = 'table-row';
  expandedSpendingCategories.add(id);
  el.setAttribute('data-current-filter', filterType);

  const rows = el.querySelectorAll('tbody tr.sub-entry-row');
  let hasVisible = false;
  let sumReserve = 0;
  let sumDeduct = 0;

  rows.forEach(r => {
    let show = false;
    if (filterType === 'all') {
      show = true;
    } else {
      const types = r.getAttribute('data-types') || '';
      if (types.split(',').includes(filterType)) {
        show = true;
      }
    }

    if (show) {
      r.style.display = 'table-row';
      hasVisible = true;
      // Add to sums only if it's not an excluded row
      if (!r.classList.contains('excluded-row')) {
        const reserveVal = parseFloat(r.getAttribute('data-reserve')) || 0;
        const deductVal = parseFloat(r.getAttribute('data-deduct')) || 0;
        sumReserve += reserveVal;
        sumDeduct += deductVal;
      }
    } else {
      r.style.display = 'none';
    }
  });

  const noDataRow = el.querySelector('tbody .no-data-msg');
  if (noDataRow) {
    noDataRow.style.display = hasVisible ? 'none' : 'table-row';
  }

  // Update footer sums
  const rawId = id.replace('sub-', '');
  const reserveSumEl = document.getElementById(`sub-sum-reserve-${rawId}`);
  const deductSumEl = document.getElementById(`sub-sum-deduct-${rawId}`);
  if (reserveSumEl) reserveSumEl.innerText = sumReserve.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (deductSumEl) deductSumEl.innerText = sumDeduct.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTable(q = "") {
  const tbody = document.getElementById('tableBody');

  if (!cache || !cache.entries) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px;"><div class="loader-inner" style="margin:20px auto;"></div>กำลังโหลดข้อมูล...</td></tr>';
    return;
  }

  // Status Toggle Filter (Column F)
  const tsValue = document.querySelector('input[name="tableStatus"]:checked')?.value || 'pending';
  const isCancelled = (e) => e.colF && e.colF.toString().includes("ยกเลิก");

  // Special: show only entries with no plan assignment
  if (tsValue === 'no-plan') {
    let noPlanFiltered = cache.entries.filter(e =>
      e.id !== undefined && e.id !== null && e.id !== "" &&
      e.date !== undefined && e.date !== null && e.date !== "" &&
      (!e.plan || e.plan.toString().trim() === "") &&
      !isCancelled(e)
    );
    tbody.innerHTML = noPlanFiltered.length > 0
      ? noPlanFiltered.map(rowTpl).join('')
      : '<tr><td colspan="11" style="text-align:center; padding:40px; color:var(--text-muted);">ไม่มีรายการที่รอเลือกแผน</td></tr>';
    return;
  }

  if (!currentPlan) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px;">กรุณาเลือกแผนปฏิบัติการก่อน</td></tr>';
    return;
  }

  let filtered = cache.entries.filter(e => e.id !== undefined && (!currentPlan || e.plan === currentPlan) && e.id !== null && e.id !== "" &&
    e.date !== undefined && e.date !== null && e.date !== ""
  );

  if (tsValue === 'pending') {
    // Pending: No deduction amount AND no GF completion AND no system ID AND NOT cancelled
    filtered = filtered.filter(e =>
      !isCancelled(e) &&
      (!e.amountDeduct || e.amountDeduct == 0) &&
      (!e.colE || e.colE.toString().trim() === "") &&
      (!e.colF || e.colF.toString().trim() === "" || e.colF.toString().trim().toUpperCase() === "PO")
    );
  } else if (tsValue === 'liq-pending-gf') {
    filtered = filtered.filter(e => !isCancelled(e) && (e.amountDeduct && e.amountDeduct != 0) && (!e.colE || e.colE.toString().trim() === ""));
  } else if (tsValue === 'completed') {
    filtered = filtered.filter(e => !isCancelled(e) && e.colE && e.colE.toString().trim() !== "");
  } else if (tsValue === 'cancelled') {
    filtered = filtered.filter(isCancelled);
  }
  // Apply Filter Selects
  const fDept = document.getElementById('filterDept') ? document.getElementById('filterDept').value : "";
  const fCat = document.getElementById('filterCat') ? document.getElementById('filterCat').value : "";
  const fRem = document.getElementById('filterRemark') ? document.getElementById('filterRemark').value : "";
  const fMonth = document.getElementById('filterMonth') ? document.getElementById('filterMonth').value : "";

  if (fDept) filtered = filtered.filter(e => e.dept === fDept);
  if (fCat) filtered = filtered.filter(e => e.catCode === fCat);
  if (fRem) filtered = filtered.filter(e => e.type === fRem);
  if (fMonth) filtered = filtered.filter(e => e.month === fMonth);

  const doGroup = document.getElementById('groupToggle').checked;
  let query = q.trim().toLowerCase();

  // If NOT grouping, apply search filter directly to items
  if (!doGroup && query) {
    filtered = filtered.filter(e =>
      (e.id && e.id.toString().toLowerCase().includes(query)) ||
      (e.refNo && e.refNo.toString().toLowerCase().includes(query)) ||
      (e.liquidateRefNo && e.liquidateRefNo.toString().toLowerCase().includes(query)) ||
      (e.colF && e.colF.toString().toLowerCase().includes(query)) ||
      (e.name && e.name.toString().toLowerCase().includes(query)) ||
      (e.dept && e.dept.toString().toLowerCase().includes(query)) ||
      (e.desc && e.desc.toString().toLowerCase().includes(query)) ||
      (e.catCode && e.catCode.toString().toLowerCase().includes(query)) ||
      (e.date && e.date.toString().toLowerCase().includes(query))
    );
  }

  // Update Selection Total (Reset on render)
  document.getElementById('sumSelected').innerText = '0.00 ฿';
  const selectAllCb = document.getElementById('selectAll');
  if (selectAllCb) selectAllCb.checked = false;

  // --- Grouping Logic ---
  let groups = [];
  if (filtered.length > 0) {
    // Sort by date (descending to show newest groups first)
    filtered.sort((a, b) => {
      const da = a.letterDateRaw ? new Date(a.letterDateRaw).getTime() : 0;
      const db = b.letterDateRaw ? new Date(b.letterDateRaw).getTime() : 0;
      if (da !== db) return db - da;
      return b.id - a.id;
    });

    filtered.forEach(e => {
      const info = extractMissionInfo(e.desc);
      const eDate = info.timestamp || (e.letterDateRaw ? new Date(e.letterDateRaw).getTime() : 0);

      let targetGroup = groups.find(g => {
        if (g.mission !== info.mission || g.province !== info.province || g.detail !== info.detail) return false;
        // Check if within 3 days of any entry in this group
        return g.entries.some(ge => {
          const geInfo = extractMissionInfo(ge.desc);
          const geDate = geInfo.timestamp || (ge.letterDateRaw ? new Date(ge.letterDateRaw).getTime() : 0);
          return Math.abs(geDate - eDate) <= 3 * 24 * 60 * 60 * 1000;
        });
      });

      if (targetGroup) {
        targetGroup.entries.push(e);
      } else {
        groups.push({ mission: info.mission, province: info.province, detail: info.detail, entries: [e] });
      }
    });
  }

  // If grouping is enabled and there's a search query, filter groups by keeping the whole group if any entry matches
  if (doGroup && query) {
    groups = groups.filter(g => {
      return g.entries.some(e =>
        (e.id && e.id.toString().toLowerCase().includes(query)) ||
        (e.refNo && e.refNo.toString().toLowerCase().includes(query)) ||
        (e.liquidateRefNo && e.liquidateRefNo.toString().toLowerCase().includes(query)) ||
        (e.colF && e.colF.toString().toLowerCase().includes(query)) ||
        (e.name && e.name.toString().toLowerCase().includes(query)) ||
        (e.dept && e.dept.toString().toLowerCase().includes(query)) ||
        (e.desc && e.desc.toString().toLowerCase().includes(query)) ||
        (e.catCode && e.catCode.toString().toLowerCase().includes(query)) ||
        (e.date && e.date.toString().toLowerCase().includes(query))
      );
    });
  }

  const rowTpl = (e) => {
    let bgStyle = "";
    const isCancelled = e.colF && e.colF.toString().includes("ยกเลิก");
    if (!isCancelled) {
      if (!e.reserveNumber || e.reserveNumber.toString().trim() === "") {
        bgStyle = "background-color: #fee2e2;";
      } else {
        bgStyle = "background-color: #dcfce7;";
      }
    }
    return `
        <tr class="table-row-clickable" oncontextmenu="event.preventDefault(); selectFromTable('${e.id}', event)" style="cursor:context-menu; ${bgStyle}">
          <td style="text-align:center;" onclick="event.stopPropagation()" oncontextmenu="event.stopPropagation()">
             <input type="checkbox" class="row-checkbox" data-amt="${e.amount || 0}" onchange="updateSelectedTotal()">
          </td>
          <td class="id-col" style="color:var(--primary); font-weight:700;">#${e.id}</td>
          <td style="text-align:center; font-size:12px;">${formatThaiDate(e.date)}</td>
          <td style="text-align:center;"><span class="cat-badge" style="font-size:11px; padding:2px 8px; background:#eef2ff; color:#4338ca; border-radius:6px; font-weight:700;">${e.catCode || '-'}</span></td>
          <td style="font-size:12px;">${e.refNo || '-'}</td>
          <td><b>${e.name || '-'}</b></td>
          <td style="text-align:center;"><span class="cat-badge" style="font-size:11px; padding:2px 6px; background:var(--primary-light); color:var(--primary-dark); border-radius:4px; font-weight:700;">${e.dept || '-'}</span></td>
          <td style="width:auto; min-width:350px; text-align:left; font-size:13px; font-weight:600; color:#1e293b; line-height:1.5; white-space:normal; word-break:break-word; padding:10px 14px;">
            ${((e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO')) ? '<span class="status-tag status-po" style="font-size:9px; padding:1px 4px; margin-right:4px;">PO</span>' : ''}
            ${e.desc || ''}
          </td>
          <td style="text-align:center; font-weight:700; color:#059669; font-size:12px;">${e.reserveNumber || '-'}</td>
          <td class="amt-col" style="color:var(--primary-dark);">${Number(e.amount || 0).toLocaleString()}</td>
          <td class="amt-col" style="color:#c2410c;">${Number(e.amountDeduct || 0).toLocaleString()}</td>
          <td style="white-space:nowrap; text-align:center;">
            ${e.colE ? `
              <span class="status-tag status-success" style="font-size:9px; padding:2px 4px; border-radius:4px; display:inline-block; margin-bottom:4px;">GF สำเร็จ</span><br>
              <div style="font-size:10px; font-weight:600; color:var(--text-main);">${formatThaiDate(e.colE)}</div>
              ${e.colF ? `<div style="font-size:9px; opacity:0.6; margin-top:2px;">(${e.colF})</div>` : ''}
            ` : (e.amountDeduct && e.amountDeduct != 0 ? `
              <span class="status-tag status-normal" style="font-size:9px; padding:2px 4px; border-radius:4px; display:inline-block; margin-bottom:4px;">ตัดยอดแล้ว</span><br>
              <div style="font-size:10px; font-weight:600; color:var(--text-main);">${e.colF || '-'}</div>
            ` : `
              <span class="status-tag status-pending" style="font-size:9px; padding:2px 4px; border-radius:4px;">ยังไม่ตัดยอด</span>
              ${e.colF && e.colF.toString().trim().toUpperCase() === 'PO' ? `<br><div style="font-size:10px; font-weight:600; color:var(--text-main); margin-top:4px;">PO</div>` : ''}
            `)}
          </td>
        </tr>
      `;
  };

  if (doGroup) {
    tbody.innerHTML = groups.length > 0 ? groups.map(g => {
      const groupTotal = g.entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

      let matchedEntries = [];
      let relatedEntries = [];

      if (query) {
        g.entries.forEach(e => {
          const isMatch = (e.id && e.id.toString().toLowerCase().includes(query)) ||
            (e.refNo && e.refNo.toString().toLowerCase().includes(query)) ||
            (e.liquidateRefNo && e.liquidateRefNo.toString().toLowerCase().includes(query)) ||
            (e.colF && e.colF.toString().toLowerCase().includes(query)) ||
            (e.name && e.name.toString().toLowerCase().includes(query)) ||
            (e.dept && e.dept.toString().toLowerCase().includes(query)) ||
            (e.desc && e.desc.toString().toLowerCase().includes(query)) ||
            (e.catCode && e.catCode.toString().toLowerCase().includes(query)) ||
            (e.date && e.date.toString().toLowerCase().includes(query));
          if (isMatch) matchedEntries.push(e);
          else relatedEntries.push(e);
        });
      } else {
        matchedEntries = g.entries;
      }

      const groupHeader = `
            <tr class="group-header">
              <td colspan="9" style="background:#f8fafc; border-bottom:1px solid var(--border); padding:12px 16px;">
                <div style="display:flex; align-items:center; gap:12px;">
                  <div style="width:32px; height:32px; background:var(--primary-light); color:var(--primary); border-radius:8px; display:flex; align-items:center; justify-content:center;">
                    <span class="material-symbols-outlined" style="font-size:18px;">explore</span>
                  </div>
                  <div>
                    <div style="font-weight:800; color:var(--text-main); font-size:13px;">ภารกิจ: ${g.mission} | จ.${g.province}</div>
                    <div style="font-size:10px; color:var(--text-muted); font-weight:600;">รวมทั้งสิ้น ${g.entries.length} รายการ | ยอดงบประมาณกลุ่ม: ${groupTotal.toLocaleString()} ฿</div>
                  </div>
                  <div style="margin-left:auto;">
                     <span class="status-tag" style="background:var(--primary); color:white; font-size:9px;">CLUSTER ACTIVE</span>
                  </div>
                </div>
              </td>
            </tr>
          `;

      let htmlStr = groupHeader;
      if (matchedEntries.length > 0) {
        htmlStr += matchedEntries.map(rowTpl).join('');
      }
      if (relatedEntries.length > 0) {
        htmlStr += `
              <tr>
                <td colspan="11" style="background: linear-gradient(90deg, #fef3c7, #fde68a); text-align:center; padding:12px; font-size:13px; font-weight:900; color:#92400e; border-top: 2px dashed #fbbf24; border-bottom: 2px dashed #fbbf24; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); letter-spacing: 0.5px;">
                  <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
                    <span class="material-symbols-outlined" style="font-size:18px;">linear_scale</span>
                    รายการที่คล้ายกัน (${relatedEntries.length} รายการ)
                    <span class="material-symbols-outlined" style="font-size:18px;">linear_scale</span>
                  </div>
                </td>
              </tr>
            `;
        htmlStr += relatedEntries.map(rowTpl).join('');
      }
      return htmlStr;
    }).join('') : '<tr><td colspan="11" style="text-align:center; padding:40px; color:var(--text-muted);">ไม่พบข้อมูลในเงื่อนไขที่เลือก หรือ คอลัมน์ G ยังไม่มีเลขหนังสือ</td></tr>';
  } else {
    tbody.innerHTML = filtered.length > 0 ? filtered.map(rowTpl).join('') : '<tr><td colspan="11" style="text-align:center; padding:40px; color:var(--text-muted);">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>';
  }
}

let selectedId = null;
function selectFromTable(id, evt) {
  selectedId = id;
  const e = cache.entries.find(x => x.id == id);
  const isLiquidated = e && e.colF && e.colF.toString().trim() !== "" && e.colF.toString().trim().toUpperCase() !== "PO";
  const hasNoPlan = e && (!e.plan || e.plan.toString().trim() === "");

  // Update context menu header
  const ctxMenu = document.getElementById('rowContextMenu');
  document.getElementById('ctxMenuId').textContent = 'รายการ #' + id;

  // Show/hide menu items based on liquidation status and plan assignment
  // Show 'อนุมัติจัดเข้าแผน' for unassigned items, and 'ย้ายกลับมารออนุมัติแผน' for assigned items
  const ctxAssign = document.getElementById('ctx-assign-plan');
  const ctxUnassign = document.getElementById('ctx-unassign-plan');
  if (ctxAssign) ctxAssign.style.display = hasNoPlan ? 'flex' : 'none';
  if (ctxUnassign) ctxUnassign.style.display = hasNoPlan ? 'none' : 'flex';
  const assignBtnText = document.getElementById('ctx-assign-plan').querySelector('span:not(.material-symbols-outlined)');
  if (assignBtnText) assignBtnText.textContent = hasNoPlan ? 'อนุมัติจัดเข้าแผน' : 'เปลี่ยนแผน / ย้ายกลับรออนุมัติ';
  document.getElementById('ctx-deduct').style.display = isLiquidated ? 'none' : 'flex';
  document.getElementById('ctx-offset').style.display = isLiquidated ? 'none' : 'flex';
  document.getElementById('ctx-cancel').style.display = isLiquidated ? 'none' : 'flex';
  document.getElementById('ctx-reserve-add').style.display = isLiquidated ? 'none' : 'flex';
  document.getElementById('ctx-edit').style.display = 'flex';
  document.getElementById('ctx-deduct-add').style.display = 'flex';

  // Position context menu near cursor
  const menuW = 210, menuH = 280;
  let x = evt ? evt.clientX : window.innerWidth / 2;
  let y = evt ? evt.clientY : window.innerHeight / 2;
  if (x + menuW > window.innerWidth) x = window.innerWidth - menuW - 8;
  if (y + menuH > window.innerHeight) y = window.innerHeight - menuH - 8;
  ctxMenu.style.left = x + 'px';
  ctxMenu.style.top = y + 'px';
  ctxMenu.classList.add('visible');
}

function closeActionMenu() {
  document.getElementById('rowContextMenu').classList.remove('visible');
}

// Close context menu on outside click or Escape
document.addEventListener('click', () => closeActionMenu());
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeActionMenu(); });

function clearTableFilters() {
  document.getElementById('filterDept').value = "";
  document.getElementById('filterCat').value = "";
  document.getElementById('filterRemark').value = "";
  document.getElementById('groupToggle').checked = true;
  document.getElementById('tsPending').checked = true;
  document.getElementById('tableSearchInput').value = "";
  renderTable();
}

// closeActionMenu is defined above (hides right-click context menu)

function doAction(act) {
  closeActionMenu();
  if (act === 'unassign-plan') {
    const e = cache.entries.find(x => x.id == selectedId);
    const planName = (e && e.plan) ? e.plan : 'แผนงาน';
    Swal.fire({
      title: 'ปลดเข้าหน้ารออนุมัติแผน?',
      text: `ย้ายรายการ #${selectedId} (ปัจจุบันอยู่ "${planName}") กลับไปที่ "รายการรออนุมัติแผน" ใช่หรือไม่?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#f59e0b',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'ใช่, ย้ายกลับรออนุมัติ',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const res = await call('submitUpdate', { id: selectedId, plan: '' });
        if (res && res.success) {
          if (cache && cache.entries) {
            const targetItem = cache.entries.find(x => x.id == selectedId);
            if (targetItem) targetItem.plan = '';
          }
          showModal('สำเร็จ', `ย้ายรายการ #${selectedId} กลับมารออนุมัติแผนเรียบร้อยแล้ว`);
          await init();
          setView('pending-plan', document.getElementById('nav-pending-plan'));
          renderPendingPlanView();
        }
      }
    });
    return;
  }

  if (act === 'assign-plan') {
    const e = cache.entries.find(x => x.id == selectedId);
    if (!e || !cache || !cache.plans) return;

    // Disallow editing plan directly for items that already have a plan
    if (e.plan && e.plan.toString().trim() !== "") {
      Swal.fire({
        icon: 'warning',
        title: 'ไม่อนุญาตให้เปลี่ยนแผนโดยตรง',
        text: 'รายการในตารางมีแผนงานอยู่แล้ว หากต้องการเปลี่ยนแผน กรุณากดย้ายกลับมารออนุมัติแผนก่อน',
        confirmButtonText: 'เข้าใจแล้ว',
        confirmButtonColor: '#d97706'
      });
      return;
    }

    const currentP = (e.plan || "").toString().trim();
    const unassignOpt = `<option value="" ${!currentP ? 'selected' : ''}>⏳ ย้ายกลับมารออนุมัติแผน (ยังไม่จัดเข้าแผน)</option>`;
    const planOptions = unassignOpt + cache.plans.map(p =>
      `<option value="${p.shortName}" ${p.shortName === currentP ? 'selected' : ''}>${p.shortName}${p.fullName ? ' — ' + p.fullName : ''}</option>`
    ).join('');

    const catOptions = getCategoryOptionsHTML(e.catCode);

    Swal.fire({
      title: 'อนุมัติจัดเข้าแผนงาน & หมวดงบประมาณ',
      html: `
        <div style="font-size:12px; background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:16px; border:1px solid #e2e8f0; text-align:left; line-height:1.7;">
          <div><b>รายการ ID:</b> #${selectedId}</div>
          <div><b>เลขหนังสือ:</b> ${e.refNo || '-'}</div>
          <div><b>ชื่อผู้เบิก:</b> ${e.name || '-'}</div>
          <div><b>รายละเอียด:</b> ${e.desc || '-'}</div>
          <div><b>จำนวนเงิน:</b> ${Number(e.amount || 0).toLocaleString()} บาท</div>
        </div>
        
        <div style="text-align:left; margin-bottom:12px;">
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:#1e293b;">1. เลือกแผนงานสำหรับอนุมัติ:</label>
          <select id="swal-plan-select" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            ${planOptions}
          </select>
        </div>

        <div style="text-align:left;">
          <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:#1e293b;">2. หมวดงบประมาณ (ระบุ/แก้ไข):</label>
          <select id="swal-cat-select" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
            ${catOptions}
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'บันทึกอนุมัติ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: 'var(--primary)',
      preConfirm: () => {
        const plan = document.getElementById('swal-plan-select').value;
        const catCode = document.getElementById('swal-cat-select').value;
        return { plan, catCode };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        const { plan, catCode } = result.value;
        const r = await call('submitUpdate', { id: selectedId, plan: plan, catCode: catCode });
        if (r?.success) {
          if (cache && cache.entries) {
            const item = cache.entries.find(x => x.id == selectedId);
            if (item) {
              item.plan = plan;
              item.catCode = catCode;
            }
          }
          Swal.fire('สำเร็จ', plan ? `จัดรายการ #${selectedId} เข้าแผน "${plan}" เรียบร้อย` : `ย้ายรายการ #${selectedId} กลับมารออนุมัติแผนเรียบร้อย`, 'success');
          await init();
          if (plan) {
            const planTabs = document.querySelectorAll('.plan-tab');
            planTabs.forEach(t => { if (t.dataset.plan === plan) setPlan(t); });
          } else {
            setView('pending-plan', document.getElementById('nav-pending-plan'));
            renderPendingPlanView();
          }
        }
      }
    });
    return;
  }

  if (act === 'set-reserve-no') {
    const e = cache.entries.find(x => x.id == selectedId);
    let detailHtml = '';
    if (e) {
      detailHtml = `
            <div style="text-align:left; font-size:13px; background:#f8fafc; padding:12px; border-radius:8px; margin-top:12px; margin-bottom:16px; border:1px solid #e2e8f0; max-height:250px; overflow-y:auto; line-height:1.6;">
              <div style="margin-bottom:4px;"><b>วันที่:</b> ${formatThaiDate(e.date)}</div>
              <div style="margin-bottom:4px;"><b>หมวด:</b> ${e.catCode || '-'}</div>
              <div style="margin-bottom:4px;"><b>เลขหนังสือ:</b> ${e.refNo || '-'}</div>
              <div style="margin-bottom:4px;"><b>ชื่อผู้เบิก:</b> ${e.name || '-'}</div>
              <div style="margin-bottom:4px;"><b>กลุ่ม/ฝ่าย:</b> ${e.dept || '-'}</div>
              <div style="margin-bottom:4px;"><b>รายการ:</b> ${e.desc || '-'}</div>
              <div style="margin-bottom:4px;"><b>จำนวนเงินกัน:</b> <span style="color:var(--primary-dark); font-weight:700;">${Number(e.amount || 0).toLocaleString()} ฿</span></div>
            </div>
          `;
    }
    Swal.fire({
      title: 'ลงเลขกันเงิน',
      html: `<div style="font-size:15px; margin-bottom:8px;">กรุณากรอกเลขกันเงินสำหรับรายการ <b style="color:var(--primary);">#${selectedId}</b></div>${detailHtml}`,
      input: 'text',
      inputValue: e ? (e.reserveNumber || '') : '',
      showCancelButton: true,
      confirmButtonText: 'บันทึกเลขกันเงิน',
      cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const reserveNumber = result.value;
        const r = await call('submitReserveNo', { id: selectedId, reserveNumber: reserveNumber });
        if (r?.success) {
          Swal.fire('สำเร็จ', 'บันทึกเลขกันเงินเรียบร้อย', 'success');
          init(); // reload data
        }
      }
    });
    return;
  }

  // nav-deduct / nav-edit etc. don't exist in the sidebar.
  // Find the real nav element or fall back to nav-table so setView() won't bail.
  const navEl = document.getElementById('nav-' + act) || document.getElementById('nav-table');
  setView(act, navEl);

  const titles = {
    'deduct': 'ตัดยอดงบประมาณ',
    'deduct-add': 'ตัดยอดเพิ่มเติม',
    'offset': 'หักล้างเงินยืม',
    'reserve-add': 'กันเงินเพิ่มเติม',
    'cancel': 'ยกเลิกรายการกันเงิน',
    'edit': 'แก้ไขข้อมูลรายการ'
  };
  if (titles[act]) document.getElementById('viewTitle').innerText = titles[act];

  let searchInputId = '';
  if (act === 'deduct') searchInputId = 'deductSearchId';
  else if (act === 'deduct-add') searchInputId = 'daSearchInput';
  else if (act === 'cancel') searchInputId = 'cancelSearchId';
  else if (act === 'offset') searchInputId = 'offsetSearchId';

  else if (act === 'edit') {
    // Special case for edit since it doesn't have a fixed search input ID in the HTML
    const editInput = document.querySelector('#view-edit input[placeholder*="ID"]');
    if (editInput) {
      editInput.value = selectedId;
      omniSearch(selectedId, 'E');
    }
    return;
  }
  else if (act === 'reserve-add') searchInputId = 'raSearchInput';

  if (searchInputId) {
    const input = document.getElementById(searchInputId);
    if (input) {
      input.value = selectedId;
      const vCode = act === 'deduct' ? 'D' : (act === 'deduct-add' ? 'DA' : (act === 'offset' ? 'O' : (act === 'cancel' ? 'C' : 'RA')));
      omniSearch(selectedId, vCode);

    }
  }

}

document.getElementById('reserveForm').onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  data.plan = ''; // รายการใหม่ไม่มีแผน — ไปรออนุมัติ
  const r = await call('submitReserve', data);
  if (r?.success) {
    e.target.reset();
    // โหลดข้อมูลใหม่ แล้วไปแสดง pending-plan
    const pendingNav = document.getElementById('nav-pending-plan');
    // ตั้งหน้าที่ pending-plan ก่อนเรียก init
    if (pendingNav) {
      document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
      const pv = document.getElementById('view-pending-plan');
      if (pv) pv.classList.add('active');
      document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
      pendingNav.classList.add('active');
    }
    const newId = r.id;
    await init(); // โหลดข้อมูลใหม่ (จะ render pending-plan อัตโนมัติเนื่องจาก active view)
    Swal.fire({
      icon: 'success',
      title: 'บันทึกสำเร็จ!',
      html: `รายการ <b>#${newId}</b> ถูกส่งเข้า “รออนุมัติแผน” เรียบร้อยแล้ว`,
      timer: 2500,
      showConfirmButton: false
    });
  }
};

document.getElementById('reserveAddForm').onsubmit = async (e) => { e.preventDefault(); const r = await call('submitReserveAdd', Object.fromEntries(new FormData(e.target))); if (r?.success) { showModal('สำเร็จ', 'แทรกรายการกันเงินเพิ่มเรียบร้อย ID: ' + r.id); init(); e.target.reset(); document.getElementById('reserveAddFields').style.display = 'none'; document.getElementById('prvRA').style.display = 'none'; } };
document.getElementById('deductForm').onsubmit = async (e) => { e.preventDefault(); const r = await call('submitDeduct', Object.fromEntries(new FormData(e.target))); if (r?.success) { showModal('สำเร็จ', 'ตัดยอดเรียบร้อย' + (r.id ? ' ID: ' + r.id : '')); setView('table'); init(); e.target.reset(); } };
document.getElementById('deductAddForm').onsubmit = async (e) => { e.preventDefault(); const r = await call('submitDeductAdd', Object.fromEntries(new FormData(e.target))); if (r?.success) { showModal('สำเร็จ', 'แทรกรายการตัดยอดเพิ่มเรียบร้อย ID: ' + r.id); init(); e.target.reset(); } };
document.getElementById('cancelForm').onsubmit = async (e) => { e.preventDefault(); if (!confirm('ยืนยันระบบการยกเลิกกันเงิน?')) return; const data = Object.fromEntries(new FormData(e.target)); const r = await call('submitCancel', data); if (r?.success) { showModal('สำเร็จ', 'ยกเลิกรายการกันเงินเรียบร้อยแล้ว' + (data.id ? ' ID: ' + data.id : '')); setView('table'); init(); e.target.reset(); } };
document.getElementById('offsetForm').onsubmit = async (e) => { e.preventDefault(); const r = await call('submitOffset', Object.fromEntries(new FormData(e.target))); if (r?.success) { showModal('สำเร็จ', 'หักล้างเรียบร้อย ID: ' + r.id); setView('table'); init(); e.target.reset(); } };


document.getElementById('editForm').onsubmit = async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); const r = await call('submitUpdate', data); if (r?.success) { showModal('สำเร็จ', 'แก้ไขข้อมูลเรียบร้อย' + (data.id ? ' ID: ' + data.id : '')); setView('table'); init(); e.target.reset(); } };
document.getElementById('reserveDeductForm').onsubmit = async (e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); data.col = data.cat; data.plan = ''; const r = await call('submitReserveAndDeduct', data); if (r?.success) { showModal('สำเร็จ', 'บันทึกรายการด่วนเรียบร้อย ID: ' + r.id); init(); e.target.reset(); } };


// === Plan Settings Logic ===
const defaultCategories = [
  { group: "ค่าตอบแทน", item: "ค่าอาหารทำการนอกเวลา" }, { group: "ค่าตอบแทน", item: "ค่าตอบแทนคณะกรรมการ" }, { group: "ค่าตอบแทน", item: "ค่าตอบแทนผู้ปฏิบัติงานบนอากาศยาน" }, { group: "ค่าตอบแทน", item: "ค่าสมนาคุณวิทยากร" },
  { group: "ค่าใช้สอย", item: "ค่าเบี้ยเลี้ยงที่พักพาหนะ" }, { group: "ค่าใช้สอย", item: "ค่าซ่อมแซมยานพาหนะ" }, { group: "ค่าใช้สอย", item: "ค่าซ่อมแซมครุภัณฑ์" }, { group: "ค่าใช้สอย", item: "ค่าซ่อมแซมสิ่งก่อสร้าง" },
  { group: "ค่าใช้สอย", item: "ค่าทำความสะอาด" }, { group: "ค่าใช้สอย", item: "รักษาความปลอดภัย" }, { group: "ค่าใช้สอย", item: "จ้างเหมาเอกชนดำเนินงาน" }, { group: "ค่าใช้สอย", item: "ค่าสัมมนาและฝึกอบรม" },
  { group: "ค่าใช้สอย", item: "ค่าภาษี/ค่าธรรมเนียมศาล/ค่าเบี้ยประกัน/ค่าธรรมเนียม" }, { group: "ค่าใช้สอย", item: "ค่ารับรองและพิธีการ (ค่าอาหาร)" }, { group: "ค่าใช้สอย", item: "ค่าตรวจสุขภาพ" }, { group: "ค่าใช้สอย", item: "ค่าใช้สอยอื่นๆ" }, { group: "ค่าใช้สอย", item: "จ้างเหมาบริการอื่นๆ" },
  { group: "ค่าวัสดุ", item: "วัสดุสำนักงาน" }, { group: "ค่าวัสดุ", item: "วัสดุเชื้อเพลิงและหล่อลื่น (อากาศยาน)" }, { group: "ค่าวัสดุ", item: "วัสดุเชื้อเพลิงและหล่อลื่น (รถยนต์)" }, { group: "ค่าวัสดุ", item: "วัสดุก่อสร้าง" },
  { group: "ค่าวัสดุ", item: "วัสดุวิทยาศาสตร์และการแพทย์" }, { group: "ค่าวัสดุ", item: "วัสดุคอมพิวเตอร์" }, { group: "ค่าวัสดุ", item: "วัสดุอากาศยาน" }, { group: "ค่าวัสดุ", item: "วัสดุยานพาหนะและขนส่ง" },
  { group: "ค่าวัสดุ", item: "วัสดุการเกษตร" }, { group: "ค่าวัสดุ", item: "วัสดุงานบ้านงานครัว" }, { group: "ค่าวัสดุ", item: "วัสดุไฟฟ้าและวิทยุ" }, { group: "ค่าวัสดุ", item: "วัสดุอื่นๆ" }, { group: "ค่าวัสดุ", item: "วัสดุโรงงาน" },
  { group: "ค่าสาธารณูปโภค", item: "ค่าโทรศัพท์" }, { group: "ค่าสาธารณูปโภค", item: "ค่าน้ำประปา" }, { group: "ค่าสาธารณูปโภค", item: "ค่าไปรษณีย์โทรเลข" }, { group: "ค่าสาธารณูปโภค", item: "ค่าไฟฟ้า" }, { group: "ค่าสาธารณูปโภค", item: "ค่าบริการโทรคมนาคม (Internet)" },
  { group: "งบลงทุน", item: "ที่ดินและสิ่งก่อสร้าง" }, { group: "งบรายจ่ายอื่น", item: "งบรายจ่ายอื่น" }
];

function renderSettings() {
  const tbody = document.getElementById('planListTable');
  if (!cache || !cache.plans) return;
  let html = '<div style="border-radius:12px; overflow:hidden; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);"><table class="data-table" style="width:100%; border-collapse:collapse; margin:0;"><thead style="background-color:var(--primary-dark); color:white;"><tr><th style="padding:12px 16px; font-weight:600; text-align:left;">ตัวย่อแผนงาน</th><th style="padding:12px 16px; font-weight:600; text-align:left;">ชื่อแผนงานเต็ม</th><th style="padding:12px 16px; font-weight:600; text-align:left;">ผลผลิต</th><th style="padding:12px 16px; font-weight:600; text-align:left;">กิจกรรม</th><th style="padding:12px 16px; font-weight:600; text-align:center;">จัดการ</th></tr></thead><tbody>';
  cache.plans.forEach(p => {
    html += `<tr style="border-bottom:1px solid #e2e8f0; transition:background-color 0.2s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor=''">
          <td style="padding:12px 16px; font-weight:bold; color:var(--primary-dark);">${p.shortName}</td>
          <td style="padding:12px 16px; color:var(--text-main);">${p.fullName}</td>
          <td style="padding:12px 16px; color:var(--text-main);">${p.output}</td>
          <td style="padding:12px 16px; color:var(--text-main);">${p.activity}</td>
          <td style="padding:12px 16px; text-align:center;">
            <button onclick="editPlan('${p.shortName}')" style="display:inline-flex; align-items:center; gap:4px; padding:6px 16px; font-size:13px; font-weight:600; color:var(--primary-dark); background:var(--primary-light); border:1px solid transparent; border-radius:6px; cursor:pointer; transition:all 0.2s;" onmouseover="this.style.background='var(--primary)'; this.style.color='white';" onmouseout="this.style.background='var(--primary-light)'; this.style.color='var(--primary-dark)';">
              <span class="material-symbols-outlined" style="font-size:16px;">edit</span> แก้ไข
            </button>
          </td>
        </tr>`;
  });
  html += '</tbody></table></div>';
  tbody.innerHTML = html;
  document.getElementById('planListContainer').style.display = 'block';
  document.getElementById('planEditContainer').style.display = 'none';
}

let editPlanBudgets = [];

function closePlanEdit() {
  document.getElementById('planListContainer').style.display = 'block';
  document.getElementById('planEditContainer').style.display = 'none';
}

function editPlan(shortName) {
  document.getElementById('planListContainer').style.display = 'none';
  document.getElementById('planEditContainer').style.display = 'block';
  const tbody = document.getElementById('budgetSettingsTbody');
  tbody.innerHTML = '';

  let p = null;
  if (shortName && cache && cache.plans) {
    p = cache.plans.find(x => x.shortName === shortName);
  }

  document.getElementById('settingPlanShort').value = p ? p.shortName : '';
  document.getElementById('settingPlanShort').disabled = !!p;
  document.getElementById('settingPlanFull').value = p ? p.fullName : '';
  document.getElementById('settingPlanOutput').value = p ? p.output : '';
  document.getElementById('settingPlanActivity').value = p ? p.activity : '';
  document.getElementById('settingPlanColor').value = (p && p.color) ? p.color : '#6366f1';

  if (p && p.budgets) {
    editPlanBudgets = JSON.parse(JSON.stringify(p.budgets));
  } else {
    editPlanBudgets = defaultCategories.map(c => ({ group: c.group, item: c.item, allocated: 0, increase: 0, decrease: 0, remark: 'ตั้งต้น' }));
  }
  renderEditPlanTable();
}

function renderEditPlanTable() {
  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  let groupMap = {};
  let grandAlloc = 0, grandInc = 0, grandDec = 0;

  editPlanBudgets.forEach((b, idx) => {
    let g = b.group || 'อื่นๆ';
    let i = b.item || 'ไม่มีชื่อรายการ';
    if (!groupMap[g]) groupMap[g] = {};
    if (!groupMap[g][i]) groupMap[g][i] = [];
    groupMap[g][i].push({ ...b, originalIndex: idx });
    grandAlloc += parseFloat(b.allocated) || 0;
    grandInc += parseFloat(b.increase) || 0;
    grandDec += parseFloat(b.decrease) || 0;
  });
  let grandTotal = grandAlloc + grandInc - grandDec;

  let html = '';
  if (editPlanBudgets.length > 0) {
    html += `<tr style="background:linear-gradient(180deg, var(--primary) 0%, var(--primary-dark) 100%); color:white; font-weight:bold; font-size:14px; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);">
          <td style="padding:12px 8px; padding-left:12px;">รวมทั้งสิ้น</td>
          <td style="padding:12px 8px; text-align:right;">${fmt(grandAlloc)}</td>
          <td style="padding:12px 8px; text-align:right; color:#a7f3d0;">+ ${fmt(grandInc)}</td>
          <td style="padding:12px 8px; text-align:right; color:#fecaca;">- ${fmt(grandDec)}</td>
          <td style="padding:12px 8px; text-align:right; font-size:15px;">${fmt(grandTotal)}</td>
          <td></td>
        </tr>`;
  }
  let gIndex = 0;
  for (let gName in groupMap) {
    let groupAlloc = 0, groupInc = 0, groupDec = 0;
    for (let iName in groupMap[gName]) {
      groupMap[gName][iName].forEach(r => {
        groupAlloc += parseFloat(r.allocated) || 0;
        groupInc += parseFloat(r.increase) || 0;
        groupDec += parseFloat(r.decrease) || 0;
      });
    }
    let groupTotal = groupAlloc + groupInc - groupDec;

    html += `<tr class="summary-row-group" style="background-color:var(--primary-light); color:var(--primary-dark); font-weight:700;">
          <td style="padding:10px 8px; padding-left:12px; text-align:left;">รวม ${gName}</td>
          <td style="padding:10px 8px; text-align:right;">${fmt(groupAlloc)}</td>
          <td style="padding:10px 8px; text-align:right; color:#047857;">+ ${fmt(groupInc)}</td>
          <td style="padding:10px 8px; text-align:right; color:#b91c1c;">- ${fmt(groupDec)}</td>
          <td style="padding:10px 8px; text-align:right;">${fmt(groupTotal)}</td>
          <td></td>
        </tr>`;

    for (let iName in groupMap[gName]) {
      let rows = groupMap[gName][iName];
      let sumAlloc = rows.reduce((s, r) => s + (parseFloat(r.allocated) || 0), 0);
      let sumInc = rows.reduce((s, r) => s + (parseFloat(r.increase) || 0), 0);
      let sumDec = rows.reduce((s, r) => s + (parseFloat(r.decrease) || 0), 0);
      let sumTotal = sumAlloc + sumInc - sumDec;
      let subId = `edit-sub-${gIndex}`;

      html += `
                <tr class="table-row-clickable" onclick="toggleSubTable('${subId}', 'all', event)" style="cursor:pointer; background:#fff;">
                   <td style="padding:6px 8px; font-weight:700; color:var(--primary-dark); padding-left:20px; text-align:left;">
                      ${iName}
                   </td>
                   <td style="padding:6px 8px; text-align:right;">${fmt(sumAlloc)}</td>
                   <td style="padding:6px 8px; text-align:right; color:#047857;">+ ${fmt(sumInc)}</td>
                   <td style="padding:6px 8px; text-align:right; color:#b91c1c;">- ${fmt(sumDec)}</td>
                   <td style="padding:6px 8px; text-align:right; font-weight:bold;">${fmt(sumTotal)}</td>
                   <td style="padding:6px 8px; text-align:center;">
                      <button class="btn-cancel" style="padding:4px 8px; font-size:11px; border:1px solid var(--primary); color:var(--primary);" onclick="event.stopPropagation(); addEditAdjustment('${gName}', '${iName}', '${subId}')">+ ปรับฐาน</button>
                   </td>
                </tr>
             `;

      html += `<tr id="${subId}" style="display:${expandedSpendingCategories.has(subId) ? 'table-row' : 'none'}; background-color:#f1f5f9;"><td colspan="6" style="padding:0; border-bottom:2px solid var(--border);">`;
      html += `<div style="overflow-x:auto;">
                      <table class="data-table" style="table-layout:fixed; width:100%; border-collapse:collapse; margin:0;">
                        <thead><tr style="background-color:var(--primary-dark); color:#fff;">
                          <th style="width:30%; padding:4px 8px; font-size:11px; font-weight:normal; border:1px solid rgba(255,255,255,0.2); text-align:left; white-space:normal;">หมายเหตุ/รายการปรับฐาน</th>
                          <th style="width:14%; padding:4px 8px; font-size:11px; font-weight:normal; border:1px solid rgba(255,255,255,0.2); text-align:right;">งบที่ได้รับ</th>
                          <th style="width:14%; padding:4px 8px; font-size:11px; font-weight:normal; border:1px solid rgba(255,255,255,0.2); text-align:right;">ปรับฐาน (+)</th>
                          <th style="width:14%; padding:4px 8px; font-size:11px; font-weight:normal; border:1px solid rgba(255,255,255,0.2); text-align:right;">ปรับฐาน (-)</th>
                          <th style="width:28%; padding:4px 8px; font-size:11px; font-weight:normal; border:1px solid rgba(255,255,255,0.2); text-align:center;">ลบ</th>
                        </tr></thead>
                        <tbody>`;
      rows.forEach(r => {
        const isInitial = r.remark === 'ตั้งต้น' || r.allocated > 0;
        html += `<tr>
                  <td style="padding:4px 8px; border-bottom:1px solid #e2e8f0; font-size:11px; color:var(--text-main); white-space:normal;">${r.remark || '-'}</td>
                  <td style="padding:4px 8px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:11px; color:var(--text-main);">${fmt(r.allocated)}</td>
                  <td style="padding:4px 8px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:11px; color:#047857;">${r.increase ? '+ ' + fmt(r.increase) : '-'}</td>
                  <td style="padding:4px 8px; border-bottom:1px solid #e2e8f0; text-align:right; font-size:11px; color:#b91c1c;">${r.decrease ? '- ' + fmt(r.decrease) : '-'}</td>
                  <td style="padding:4px 8px; border-bottom:1px solid #e2e8f0; text-align:center;">
                    ${isInitial ? '' : `<button class="btn-cancel" style="color:var(--text-muted); border:none; padding:2px; background:none; cursor:pointer; transition:color 0.2s;" onmouseover="this.style.color='red'" onmouseout="this.style.color='var(--text-muted)'" onclick="deleteEditBudget(${r.originalIndex})"><span class="material-symbols-outlined" style="font-size:16px;">delete</span></button>`}
                  </td>
                </tr>`;
      });
      html += `</tbody></table></div></td></tr>`;
      gIndex++;
    }
  }

  if (editPlanBudgets.length === 0) {
    html = '<tr><td colspan="6" style="text-align:center; padding:20px;">ไม่มีข้อมูล กรุณาเพิ่มรายการ</td></tr>';
  }

  document.getElementById('budgetSettingsTbody').innerHTML = html;
}

function updateEditBudget(input) {
  // No longer used since rows are read-only text
}

function addEditAdjustment(g, i, subId) {
  Swal.fire({
    title: '<div style="font-size:20px; font-weight:700; color:var(--text-main);">เพิ่มรายการปรับฐาน</div>',
    html: `
          <div style="text-align:left; display:flex; flex-direction:column; gap:16px; margin-top:10px;">
            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:6px;">หมายเหตุ/รายการ (เช่น ปรับปรุงงบฯ ไตรมาส 2)</label>
              <input id="swal-remark" type="text" value="ปรับฐาน" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none; font-family:inherit; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#6366f1'" onblur="this.style.borderColor='#cbd5e1'">
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
              <div>
                <label style="display:block; font-size:13px; font-weight:600; color:#047857; margin-bottom:6px;">ยอดที่ต้องการเพิ่ม (+)</label>
                <input id="swal-inc" type="number" value="0" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none; font-family:inherit; box-sizing:border-box; color:#047857; font-weight:bold; transition:border-color 0.2s;" onfocus="this.style.borderColor='#10b981'; this.select();" onblur="this.style.borderColor='#cbd5e1'">
              </div>
              <div>
                <label style="display:block; font-size:13px; font-weight:600; color:#b91c1c; margin-bottom:6px;">ยอดที่ต้องการลด (-)</label>
                <input id="swal-dec" type="number" value="0" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none; font-family:inherit; box-sizing:border-box; color:#b91c1c; font-weight:bold; transition:border-color 0.2s;" onfocus="this.style.borderColor='#ef4444'; this.select();" onblur="this.style.borderColor='#cbd5e1'">
              </div>
            </div>
          </div>
        `,
    showCancelButton: true,
    confirmButtonText: 'บันทึกรายการ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: 'var(--primary)',
    cancelButtonColor: '#94a3b8',
    preConfirm: () => {
      return {
        remark: document.getElementById('swal-remark').value,
        inc: parseFloat(document.getElementById('swal-inc').value) || 0,
        dec: parseFloat(document.getElementById('swal-dec').value) || 0
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      editPlanBudgets.push({ group: g, item: i, allocated: 0, increase: result.value.inc, decrease: result.value.dec, remark: result.value.remark });
      if (subId) expandedSpendingCategories.add(subId);
      renderEditPlanTable();
    }
  });
}

function deleteEditBudget(idx) {
  if (!confirm("คุณแน่ใจหรือไม่ที่จะลบรายการนี้?")) return;
  editPlanBudgets.splice(idx, 1);
  renderEditPlanTable();
}

function addNewEditItem() {
  Swal.fire({
    title: '<div style="font-size:20px; font-weight:700; color:var(--text-main);">เพิ่มหมวด/รายการใหม่</div>',
    html: `
          <div style="text-align:left; display:flex; flex-direction:column; gap:16px; margin-top:10px;">
            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:6px;">ชื่อหมวดหลัก</label>
              <input id="swal-group" type="text" placeholder="เช่น ค่าใช้สอย" value="ค่าใช้สอย" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none; font-family:inherit; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.select();" onblur="this.style.borderColor='#cbd5e1'">
            </div>
            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:6px;">ชื่อรายการ</label>
              <input id="swal-item" type="text" placeholder="เช่น ค่าจ้างเหมาบริการ" value="รายการใหม่" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none; font-family:inherit; box-sizing:border-box; transition:border-color 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.select();" onblur="this.style.borderColor='#cbd5e1'">
            </div>
            <div>
              <label style="display:block; font-size:13px; font-weight:600; color:#475569; margin-bottom:6px;">งบตั้งต้น (Allocated)</label>
              <input id="swal-alloc" type="number" value="0" style="width:100%; padding:10px 12px; border:1px solid #cbd5e1; border-radius:8px; font-size:14px; outline:none; font-family:inherit; box-sizing:border-box; font-weight:bold; color:var(--primary-dark); transition:border-color 0.2s;" onfocus="this.style.borderColor='#6366f1'; this.select();" onblur="this.style.borderColor='#cbd5e1'">
            </div>
          </div>
        `,
    showCancelButton: true,
    confirmButtonText: 'บันทึกรายการ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: 'var(--primary)',
    cancelButtonColor: '#94a3b8',
    preConfirm: () => {
      return {
        group: document.getElementById('swal-group').value,
        item: document.getElementById('swal-item').value,
        alloc: parseFloat(document.getElementById('swal-alloc').value) || 0
      }
    }
  }).then((result) => {
    if (result.isConfirmed) {
      editPlanBudgets.push({ group: result.value.group, item: result.value.item, allocated: result.value.alloc, increase: 0, decrease: 0, remark: 'ตั้งต้น' });
      renderEditPlanTable();
    }
  });
}

async function deleteCurrentPlan() {
  const shortName = document.getElementById('settingPlanShort').value.trim();
  if (!shortName) return alert("ยังไม่ได้บันทึกแผนงานนี้");
  if (!confirm("ยืนยันการลบแผนงานนี้และข้อมูลที่เกี่ยวข้องทั้งหมด?\\n\\n** ไม่สามารถเรียกคืนได้ **")) return;

  const res = await call('deletePlan', { shortName: shortName });
  if (res && res.success) {
    showModal('สำเร็จ', 'ลบแผนงานเรียบร้อย');
    setTimeout(() => location.reload(), 1500);
  }
}

async function savePlanSettings() {
  const shortName = document.getElementById('settingPlanShort').value.trim();
  if (!shortName) return alert("กรุณาระบุตัวย่อแผนงาน");

  const budgets = editPlanBudgets.filter(b => b.group && b.item);

  const planData = {
    shortName: shortName,
    fullName: document.getElementById('settingPlanFull').value.trim(),
    output: document.getElementById('settingPlanOutput').value.trim(),
    activity: document.getElementById('settingPlanActivity').value.trim(),
    color: document.getElementById('settingPlanColor').value || '#6366f1',
    budgets: budgets
  };

  const res = await call('savePlan', planData);
  if (res && res.success) {
    showModal('สำเร็จ', 'บันทึกข้อมูลแผนงานเรียบร้อย');
    setTimeout(() => location.reload(), 1500);
  }
}

function renderGFSummary() {
  const tbody = document.getElementById('gfSummaryTbody');
  const header = document.getElementById('gfSummaryHeader');
  if (!tbody || !header) return;
  if (!currentPlan) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">กรุณาเลือกแผน</td></tr>';
    return;
  }

  const p = cache.plans ? cache.plans.find(x => x.shortName === currentPlan) : null;
  if (!p) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">ไม่พบข้อมูลตั้งค่าแผนงาน (กรุณาไปที่หน้าตั้งค่าแผนงาน)</td></tr>';
    return;
  }

  header.innerHTML = `
        <div style="margin-bottom:4px;"><b>แผนงาน:</b> ${p.fullName || p.shortName}</div>
        <div style="margin-bottom:4px;"><b>ผลผลิต:</b> ${p.output || '-'}</div>
        <div><b>กิจกรรม:</b> ${p.activity || '-'}</div>
      `;

  const expenses = {};
  cache.entries.filter(e => e.plan === currentPlan && e.catCode && e.id !== undefined && e.id !== null && e.id !== "").forEach(e => {
    const cost = (e.amountDeduct && e.amountDeduct > 0) ? e.amountDeduct : (e.amount || 0);
    const isCancelled = (e.colF && e.colF.toString().includes("ยกเลิก"));
    if (!isCancelled) {
      expenses[e.catCode] = (expenses[e.catCode] || 0) + cost;
    }
  });

  let html = '';
  let currentGroup = '';
  let groupTotals = { alloc: 0, inc: 0, dec: 0, afterAdj: 0, used: 0, remain: 0 };
  let grandTotals = { alloc: 0, inc: 0, dec: 0, afterAdj: 0, used: 0, remain: 0 };

  const fmt = n => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const renderGroupRow = (gName, sums) => {
    return `<tr style="background:#eef2ff; font-weight:bold;">
          <td>รวม ${gName}</td>
          <td style="text-align:right;">${fmt(sums.alloc)}</td>
          <td style="text-align:right; color:#166534;">${fmt(sums.inc)}</td>
          <td style="text-align:right; color:#991b1b;">${fmt(sums.dec)}</td>
          <td style="text-align:right; font-weight:800; color:#0f172a;">${fmt(sums.afterAdj)}</td>
          <td style="text-align:right;">${fmt(sums.used)}</td>
          <td style="text-align:right; color:${sums.remain < 0 ? 'red' : 'var(--primary-dark)'};">${fmt(sums.remain)}</td>
        </tr>`;
  };

  p.budgets.forEach((b, i) => {
    if (b.group !== currentGroup) {
      if (currentGroup !== '') {
        html += renderGroupRow(currentGroup, groupTotals);
      }
      currentGroup = b.group;
      groupTotals = { alloc: 0, inc: 0, dec: 0, afterAdj: 0, used: 0, remain: 0 };
      html += `<tr style="background:#f8fafc;"><td colspan="6" style="font-weight:800; color:#475569;">${b.group}</td></tr>`;
    }

    const used = expenses[b.item] || 0;
    const afterAdj = b.allocated + (b.increase || 0) - (b.decrease || 0);
    const remain = afterAdj - used;

    groupTotals.alloc += b.allocated; groupTotals.inc += (b.increase || 0); groupTotals.dec += (b.decrease || 0); groupTotals.afterAdj += afterAdj; groupTotals.used += used; groupTotals.remain += remain;
    grandTotals.alloc += b.allocated; grandTotals.inc += (b.increase || 0); grandTotals.dec += (b.decrease || 0); grandTotals.afterAdj += afterAdj; grandTotals.used += used; grandTotals.remain += remain;

    html += `<tr style="transition:all 0.2s;">
          <td style="padding-left:24px;">- ${b.item}</td>
          <td style="text-align:right;">${fmt(b.allocated)}</td>
          <td style="text-align:right; color:#166534; background:#f0fdf4;">${fmt(b.increase || 0)}</td>
          <td style="text-align:right; color:#991b1b; background:#fef2f2;">${fmt(b.decrease || 0)}</td>
          <td style="text-align:right; font-weight:600;">${fmt(afterAdj)}</td>
          <td style="text-align:right;">${fmt(used)}</td>
          <td style="text-align:right; color:${remain < 0 ? 'red' : 'inherit'};">${fmt(remain)}</td>
        </tr>`;
  });

  if (currentGroup !== '') {
    html += renderGroupRow(currentGroup, groupTotals);
  }

  html += `<tr style="background:#1e293b; color:white; font-weight:bold;">
        <td style="color:white;">รวมทั้งสิ้น</td>
        <td style="text-align:right; color:white;">${fmt(grandTotals.alloc)}</td>
        <td style="text-align:right; color:#86efac;">${fmt(grandTotals.inc)}</td>
        <td style="text-align:right; color:#fca5a5;">${fmt(grandTotals.dec)}</td>
        <td style="text-align:right; color:white;">${fmt(grandTotals.afterAdj)}</td>
        <td style="text-align:right; color:white;">${fmt(grandTotals.used)}</td>
        <td style="text-align:right; color:${grandTotals.remain < 0 ? '#fca5a5' : '#86efac'};">${fmt(grandTotals.remain)}</td>
      </tr>`;

  tbody.innerHTML = html;
}

function renderSummaryReport() {
  const tbody = document.getElementById('summaryTbody');
  if (!currentPlan || !cache.plans || !cache.entries) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;">กรุณาเลือกแผน หรือรอโหลดข้อมูล</td></tr>';
    return;
  }

  const p = cache.plans.find(x => x.shortName === currentPlan);
  if (!p) {
    tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;">ไม่พบข้อมูลตั้งค่าแผนงาน</td></tr>';
    return;
  }

  // Initialize aggregation objects
  const data = {};
  p.budgets.forEach(b => {
    data[b.item] = {
      allocated: b.allocated || 0,
      increase: b.increase || 0,
      decrease: b.decrease || 0,
      group: b.group || 'อื่นๆ',
      reserveNonPO: 0,
      reservePO: 0,
      deductPO: 0,
      deductTotal: 0,
      gfTotal: 0
    };
  });

  // Aggregate transactions
  cache.entries.filter(e => e.plan === currentPlan && e.catCode).forEach(e => {
    const item = data[e.catCode];
    if (!item) return;

    const isCancelled = (e.colF && e.colF.toString().includes("ยกเลิก"));
    if (isCancelled) return;

    const isPO = ((e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO'));
    const amt = parseSafeFloat(e.amount);
    const deduct = parseSafeFloat(e.amountDeduct);
    const hasGF = !!e.colE;
    const gfMonthFilter = document.getElementById('gfMonthFilter').value;

    if (isPO) {
      item.reservePO += amt;
      item.deductPO += deduct;
    } else {
      item.reserveNonPO += amt;
    }

    item.deductTotal += deduct;
    if (hasGF && (!gfMonthFilter || e.month === gfMonthFilter)) {
      item.gfTotal += deduct;
    }
  });

  let html = '';
  let currentGroup = '';

  // Totals
  const gt = {
    alloc: 0, afterAdj: 0, resNonPO: 0, po: 0, poDeduct: 0, poRemain: 0,
    deductTotal: 0, gfTotal: 0, pipeline: 0, remain: 0
  };

  let grp = {
    alloc: 0, afterAdj: 0, resNonPO: 0, po: 0, poDeduct: 0, poRemain: 0,
    deductTotal: 0, gfTotal: 0, pipeline: 0, remain: 0
  };

  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (val, total) => total > 0 ? (val * 100 / total).toFixed(2) + '%' : '0.00%';

  const renderGroupRow = (gName, sums) => {
    return `<tr style="background:#eef2ff; font-weight:bold;">
          <td></td>
          <td>รวม ${gName}</td>
          <td style="text-align:right;">${fmt(sums.alloc)}</td>
          <td style="text-align:right;">${fmt(sums.afterAdj)}</td>
          <td style="text-align:right;">${fmt(sums.resNonPO)}</td>
          <td style="text-align:right;">${fmt(sums.po)}</td>
          <td style="text-align:right;">${fmt(sums.poDeduct)}</td>
          <td style="text-align:right;">${fmt(sums.poRemain)}</td>
          <td style="text-align:right; color:var(--primary-dark);">${fmt(sums.deductTotal)}</td>
          <td style="text-align:right; color:#166534;">${fmt(sums.gfTotal)}</td>
          <td style="text-align:right;">${fmt(sums.pipeline)}</td>
          <td style="text-align:right; color:${sums.remain < 0 ? 'red' : 'inherit'};">${fmt(sums.remain)}</td>
          <td style="text-align:right;">${fmtPct(sums.gfTotal, sums.afterAdj)}</td>
        </tr>`;
  };

  let rowIndex = 1;
  p.budgets.forEach(b => {
    const item = data[b.item];
    if (b.group !== currentGroup) {
      if (currentGroup !== '') {
        html += renderGroupRow(currentGroup, grp);
      }
      currentGroup = b.group;
      grp = { alloc: 0, afterAdj: 0, resNonPO: 0, po: 0, poDeduct: 0, poRemain: 0, deductTotal: 0, gfTotal: 0, pipeline: 0, remain: 0 };
      html += `<tr style="background:#f8fafc;"><td colspan="13" style="font-weight:800; color:#475569;">${b.group}</td></tr>`;
    }

    const afterAdj = item.allocated + item.increase - item.decrease;
    const poRemain = item.reservePO - item.deductPO;
    // ค้างท่อ = (เงินทดรอง + สัญญา PO) - เบิกจ่ายลดยอด
    const pipeline = (item.reserveNonPO + item.reservePO) - item.deductTotal;
    // งบประมาณคงเหลือ = หลังปรับแผน - (เบิกจ่ายลดยอด + ค้างท่อ) => ก็คือ หลังปรับแผน - เงินกันรวม
    const remain = afterAdj - (item.reserveNonPO + item.reservePO);

    grp.alloc += item.allocated; grp.afterAdj += afterAdj; grp.resNonPO += item.reserveNonPO;
    grp.po += item.reservePO; grp.poDeduct += item.deductPO; grp.poRemain += poRemain;
    grp.deductTotal += item.deductTotal; grp.gfTotal += item.gfTotal; grp.pipeline += pipeline; grp.remain += remain;

    gt.alloc += item.allocated; gt.afterAdj += afterAdj; gt.resNonPO += item.reserveNonPO;
    gt.po += item.reservePO; gt.poDeduct += item.deductPO; gt.poRemain += poRemain;
    gt.deductTotal += item.deductTotal; gt.gfTotal += item.gfTotal; gt.pipeline += pipeline; gt.remain += remain;

    html += `<tr style="transition:all 0.2s; border-bottom: 1px solid #e2e8f0;">
          <td style="text-align:center;">${rowIndex++}</td>
          <td style="padding-left:16px;">${b.item}</td>
          <td style="text-align:right;">${fmt(item.allocated)}</td>
          <td style="text-align:right; font-weight:600;">${fmt(afterAdj)}</td>
          <td style="text-align:right;">${fmt(item.reserveNonPO)}</td>
          <td style="text-align:right;">${fmt(item.reservePO)}</td>
          <td style="text-align:right;">${fmt(item.deductPO)}</td>
          <td style="text-align:right;">${fmt(poRemain)}</td>
          <td style="text-align:right; color:var(--primary-dark);">${fmt(item.deductTotal)}</td>
          <td style="text-align:right; color:#166534; font-weight:600;">${fmt(item.gfTotal)}</td>
          <td style="text-align:right; color:#ca8a04;">${fmt(pipeline)}</td>
          <td style="text-align:right; color:${remain < 0 ? 'red' : 'inherit'};">${fmt(remain)}</td>
          <td style="text-align:right; font-weight:600;">${fmtPct(item.gfTotal, afterAdj)}</td>
        </tr>`;
  });

  if (currentGroup !== '') {
    html += renderGroupRow(currentGroup, grp);
  }

  // Grand Total
  html += `<tr style="background:#1e293b; color:white; font-weight:bold;">
        <td colspan="2" style="text-align:center; color:white;">รวมทั้งสิ้น</td>
        <td style="text-align:right; color:white;">${fmt(gt.alloc)}</td>
        <td style="text-align:right; color:white;">${fmt(gt.afterAdj)}</td>
        <td style="text-align:right; color:white;">${fmt(gt.resNonPO)}</td>
        <td style="text-align:right; color:white;">${fmt(gt.po)}</td>
        <td style="text-align:right; color:white;">${fmt(gt.poDeduct)}</td>
        <td style="text-align:right; color:white;">${fmt(gt.poRemain)}</td>
        <td style="text-align:right; color:#93c5fd;">${fmt(gt.deductTotal)}</td>
        <td style="text-align:right; color:#86efac;">${fmt(gt.gfTotal)}</td>
        <td style="text-align:right; color:#fde047;">${fmt(gt.pipeline)}</td>
        <td style="text-align:right; color:${gt.remain < 0 ? '#fca5a5' : 'white'};">${fmt(gt.remain)}</td>
        <td style="text-align:right; color:white;">${fmtPct(gt.gfTotal, gt.afterAdj)}</td>
      </tr>`;

  tbody.innerHTML = html;
}


window.onload = async () => {
  await init(); // Ensure cache is loaded before drawing plans
  // Generate Dynamic Plans
  const planBar = document.getElementById('dynamicPlanBar');
  const splashGrid = document.getElementById('dynamicSplashGrid');

  const plans = (cache && cache.plans && cache.plans.length > 0) ? cache.plans.map(p => p.shortName) : [];


  if (planBar) {
    planBar.innerHTML = (cache && cache.plans && cache.plans.length > 0 ? cache.plans : []).map((planObj, i) => {
      const color = planObj.color || '#6366f1';
      const name = planObj.shortName;
      return `<div class="plan-tab" data-plan="${name}" data-color="${color}" onclick="setPlan(this)">${name}</div>`;
    }).join('');

    // Auto-select first plan if available
    if (planBar.firstElementChild) {
      setPlan(planBar.firstElementChild);
    }
  }

  populateReservePlanSelect();

  const input = document.getElementById('apiInput');
  if (input) {
    input.value = API;
    input.onchange = () => {
      API = input.value;
      localStorage.setItem('budgetApiUrl', API);
      setStatus('ready', 'อัปเดต API แล้ว');
    };
  }
  setStatus('ready', 'พร้อมเริ่มงาน');
};

window.currentBuranakanRemaining = 0;
window.currentGrandTotal = 0;

function updateFinalRemainingUI() {
  const remain = window.currentBuranakanRemaining || 0;
  const plan = window.currentGrandTotal || 0;
  const finalVal = remain - plan;

  const elCard = document.getElementById('bk-final-remain');
  if (elCard) elCard.innerText = finalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const elRow = document.getElementById('finalRemainingValue');
  if (elRow) elRow.innerText = finalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fetchBuranakanData() {
  document.getElementById('buranakanLoader').style.display = 'block';
  document.getElementById('buranakanError').style.display = 'none';
  document.getElementById('buranakanCards').style.display = 'none';

  const pKey = encodeURIComponent(currentPlan || '');
  fetch(`${API}?action=getBuranakanData&planKey=${pKey}`)
    .then(res => res.json())
    .then(data => {
      document.getElementById('buranakanLoader').style.display = 'none';
      if (data.error) {
        document.getElementById('buranakanError').style.display = 'block';
        document.getElementById('buranakanError').innerText = data.error;
      } else if (data.success) {
        document.getElementById('buranakanCards').style.display = 'grid';
        document.getElementById('bk-g9').innerText = data.data.budgetAfterAdjust.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('bk-n9').innerText = data.data.gfTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('bk-l9').innerText = data.data.contractRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        document.getElementById('bk-remain').innerText = data.data.budgetRemaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        window.currentBuranakanRemaining = data.data.budgetRemaining;
        updateFinalRemainingUI();
      }
    })
    .catch(err => {
      document.getElementById('buranakanLoader').style.display = 'none';
      document.getElementById('buranakanError').style.display = 'block';
      document.getElementById('buranakanError').innerText = 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message;
    });
}

// --- Document Tracking Logic ---

function getStepBadge(step) {
  if (!step) return `<span class="status-badge" style="background:#e2e8f0; color:#475569; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">ว่าง (รอการกรอก)</span>`;
  switch (step) {
    case 'WAITING': return `<span class="status-badge" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">WAITING (รอการกรอก)</span>`;
    case 'ยังไม่ได้รับเอกสารตัวจริง': return `<span class="status-badge" style="background:#fce7f3; color:#be185d; border:1px solid #fbcfe8; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">ยังไม่ได้รับเอกสารตัวจริง</span>`;
    case 'อยู่ระหว่างแก้ไข': return `<span class="status-badge" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">อยู่ระหว่างแก้ไข</span>`;
    case 'กำลังดำเนินการ': return `<span class="status-badge" style="background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">กำลังดำเนินการ</span>`;
    case 'ส่งเบิกแล้ว (การเงิน)': return `<span class="status-badge" style="background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">ส่งเบิกแล้ว (การเงิน)</span>`;
    case 'ส่งไปยังกลุ่ม/ฝ่าย': return `<span class="status-badge" style="background:#fae8ff; color:#a21caf; border:1px solid #f0abfc; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">ส่งไปยังกลุ่ม/ฝ่าย</span>`;
    case 'ยังไม่จบภารกิจ':
    case 'ยังไม่เสร็จสิ้นภารกิจ': return `<span class="status-badge" style="background:#e5e7eb; color:#374151; border:1px solid #9ca3af; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">ยังไม่จบภารกิจ</span>`;
    case 'ยกเลิก/ไม่เบิก': return `<span class="status-badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">ยกเลิก/ไม่เบิก</span>`;
    default: return `<span class="status-badge" style="background:#e2e8f0; color:#475569; padding:4px 8px; border-radius:12px; font-size:12px; display:inline-block; line-height:1.3; white-space:normal; word-break:break-word;">${step}</span>`;
  }
}

function getStepRowBackground(step) {
  if (!step) return 'transparent';
  switch (step.trim()) {
    case 'WAITING': return '#fef3c7';
    case 'ยังไม่ได้รับเอกสารตัวจริง': return '#fce7f3';
    case 'อยู่ระหว่างแก้ไข': return '#fef3c7';
    case 'กำลังดำเนินการ': return '#dbeafe';
    case 'ส่งเบิกแล้ว (การเงิน)': return '#dcfce7';
    case 'ส่งไปยังกลุ่ม/ฝ่าย': return '#fae8ff';
    case 'ยังไม่จบภารกิจ':
    case 'ยังไม่เสร็จสิ้นภารกิจ': return '#e5e7eb';
    case 'ยกเลิก/ไม่เบิก': return '#fee2e2';
    default: return 'transparent';
  }
}

window.currentDocGroupFilter = "";
window.currentDocGroupFilters = new Set();
window.toggleDocGroupFilter = function (cat) {
  if (cat === '') {
    window.currentDocGroupFilters.clear();
  } else {
    if (window.currentDocGroupFilters.has(cat)) {
      window.currentDocGroupFilters.delete(cat);
    } else {
      window.currentDocGroupFilters.add(cat);
    }
  }
  renderDocTracking();
};

window.currentDocDeptFilter = "";
window.setDocDeptFilter = function (dept) {
  window.currentDocDeptFilter = dept;
  renderDocTracking();
};

function renderDocTracking() {
  if (!cache || !cache.entries) return;

  const q = (document.getElementById('docSearchInput').value || "").toLowerCase().trim();
  const hideFinished = document.getElementById('docFilterFinished').checked;
  const isAllGroups = window.currentDocGroupFilters.size === 0;
  const filterDept = window.currentDocDeptFilter || "";

  // 1. First Pass: Filter out non-applicable items
  let fullList = cache.entries.filter(e => {
    if (currentPlan && currentPlan !== 'All' && e.plan !== currentPlan) return false;
    if (!e.amount || parseFloat(e.amount) <= 0) return false; // Must be a reserved item

    // Exclude PO items
    const isPO = (e.type && e.type.toString().toUpperCase().includes('PO')) ||
      (e.colF && e.colF.toString().toUpperCase().includes('PO'));
    if (isPO) return false;

    const isFinished = (e.amountDeduct && parseFloat(e.amountDeduct) >= parseFloat(e.amount)) || (e.colF && e.colF !== '') || (e.type === 'หักล้างเงินยืม');
    if (hideFinished && isFinished) return false;

    return true;
  });

  // Update Dept Filter Buttons
  const deptContainer = document.getElementById('docFilterDeptContainer');
  const deptFullNames = {
    'กกบ.': 'กลุ่มกำกับและบริหารระบบเงินงบประมาณ',
    'กกบ': 'กลุ่มกำกับและบริหารระบบเงินงบประมาณ',
    'กซอ.': 'กลุ่มซ่อมบำรุงอากาศยาน',
    'กซอ': 'กลุ่มซ่อมบำรุงอากาศยาน',
    'กอบ.': 'กลุ่มอำนวยการบิน',
    'กอบ': 'กลุ่มอำนวยการบิน',
    'ฝบบ.': 'ฝ่ายบริหารทั่วไป',
    'ฝบบ': 'ฝ่ายบริหารทั่วไป',
    'สบค.': 'สำนักบริหารกลาง',
    'สบค': 'สำนักบริหารกลาง',
    'สบน.': 'สำนักปฏิบัติการฝนหลวง',
    'สบน': 'สำนักปฏิบัติการฝนหลวง',
    'กวบ.': 'กลุ่มวิชาการและวิจัย',
    'กวบ': 'กลุ่มวิชาการและวิจัย'
  };

  if (deptContainer) {
    const deptSet = new Set();
    fullList.forEach(e => {
      if (e.dept && e.dept.trim() !== '') deptSet.add(e.dept.trim());
    });

    let deptBtnHtml = `<span style="font-size:12px; font-weight:700; color:var(--text-muted); margin-right:4px;">กลุ่ม/ฝ่าย:</span><button class="btn ${filterDept === '' ? 'btn-primary' : 'btn-secondary'}" style="padding:6px 16px; font-size:12px; border-radius:20px; font-weight:600;" onclick="setDocDeptFilter('')">ทั้งหมด</button>`;

    Array.from(deptSet).sort().forEach(d => {
      const isActive = filterDept === d;
      const btnClass = isActive ? 'btn-primary' : 'btn-secondary';
      const styleExtra = isActive ? 'box-shadow:0 4px 6px -1px rgba(59, 130, 246, 0.3);' : '';
      const fullName = deptFullNames[d] || d;
      deptBtnHtml += `<button class="btn ${btnClass}" title="${fullName}" style="padding:6px 16px; font-size:12px; border-radius:20px; font-weight:600; ${styleExtra}" onclick="setDocDeptFilter('${d}')">${d}</button>`;
    });
    deptContainer.innerHTML = deptBtnHtml;
  }

  // Apply Dept Filter
  let baseList = fullList;
  if (filterDept) {
    baseList = baseList.filter(e => e.dept && e.dept.trim() === filterDept);
  }

  const fallbackCatNames = {
    'A1': 'เงินเดือน',
    'A2': 'ค่าจ้างประจำ',
    'A3': 'ค่าจ้างชั่วคราว',
    'A4': 'ค่าตอบแทนพนักงานราชการ',
    'B1': 'ค่าตอบแทน',
    'B2': 'ค่าใช้สอย',
    'B3': 'ค่าวัสดุ',
    'B4': 'ค่าสาธารณูปโภค',
    'C1': 'ค่าครุภัณฑ์',
    'C2': 'ที่ดินและสิ่งก่อสร้าง',
    'C3': 'สิ่งก่อสร้าง',
    'D1': 'เงินอุดหนุน',
    'E1': 'รายจ่ายอื่น'
  };

  function getFullCatName(code) {
    if (!code) return 'ไม่ระบุหมวด';
    let name = code;

    // 1. Try to find in the current plan's budgets (Spending Plan Summary)
    if (currentPlan && cache && cache.plans) {
      const p = cache.plans.find(x => x.shortName === currentPlan);
      if (p && p.budgets) {
        const foundB = p.budgets.find(b =>
          b.item.trim() === code ||
          b.item.split(' -')[0].trim() === code ||
          b.item.split('-')[0].trim() === code
        );
        if (foundB) {
          return foundB.item;
        }
      }
    }

    // 2. Try to find in PLAN_CATEGORIES
    if (typeof PLAN_CATEGORIES !== 'undefined') {
      const targetPlan = PLAN_CATEGORIES[currentPlan] ? currentPlan : 'default';
      const catGroups = PLAN_CATEGORIES[targetPlan];
      if (catGroups) {
        catGroups.forEach(group => {
          if (group.options) {
            group.options.forEach(opt => {
              if (opt.code === code || opt.value === code) {
                name = opt.text || opt.label || code;
              }
            });
          }
        });
      }
    }

    if (name !== code) return name;

    // 3. Fallback
    if (fallbackCatNames[code]) {
      name = `${code} ${fallbackCatNames[code]}`;
    } else if (!name.startsWith(code)) {
      name = `${code} ${name}`;
    }
    return name;
  }

  // Build Summary and Categories
  const summaryMap = {};
  let totalAmount = 0;
  baseList.forEach(e => {
    const cat = e.catCode || 'ไม่ระบุหมวด';
    if (!summaryMap[cat]) summaryMap[cat] = { count: 0, amount: 0 };
    summaryMap[cat].count++;
    summaryMap[cat].amount += parseFloat(e.amount) || 0;
    totalAmount += parseFloat(e.amount) || 0;
  });

  // Update Filter Buttons
  const groupContainer = document.getElementById('docFilterGroupContainer');
  if (groupContainer) {
    let btnHtml = `
          <button class="btn ${isAllGroups ? 'btn-primary' : 'btn-secondary'}" 
            style="padding:8px 12px; border-radius:8px; text-align:left; border:1px solid var(--border); box-shadow:0 1px 2px rgba(0,0,0,0.05); width:100%; display:flex; justify-content:space-between; align-items:center;" 
            onclick="toggleDocGroupFilter('')">
            <span style="font-size:13px; font-weight:700;">รวมทุกหมวด</span>
            ${isAllGroups ? '<span class="material-symbols-outlined" style="font-size:18px;">check_circle</span>' : '<span class="material-symbols-outlined" style="font-size:18px; opacity:0.3;">radio_button_unchecked</span>'}
          </button>
        `;

    Object.keys(summaryMap).sort().forEach(cat => {
      const isActive = window.currentDocGroupFilters.has(cat);
      const btnClass = isActive ? 'btn-primary' : 'btn-secondary';
      const styleExtra = isActive ? 'box-shadow:0 4px 6px -1px rgba(59, 130, 246, 0.3); border:1px solid var(--primary);' : 'border:1px solid var(--border); box-shadow:0 1px 2px rgba(0,0,0,0.05);';
      const fullCatName = getFullCatName(cat);
      btnHtml += `
            <button class="btn ${btnClass}" 
              style="padding:8px 12px; border-radius:8px; text-align:left; width:100%; display:flex; justify-content:space-between; align-items:center; gap:8px; ${styleExtra}" 
              onclick="toggleDocGroupFilter('${cat}')" title="${fullCatName}">
              <span style="font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${fullCatName}</span>
              ${isActive ? '<span class="material-symbols-outlined" style="font-size:18px;">check_box</span>' : '<span class="material-symbols-outlined" style="font-size:18px; opacity:0.3;">check_box_outline_blank</span>'}
            </button>
          `;
    });
    groupContainer.innerHTML = btnHtml;
  }

  const stepCheckboxes = document.querySelectorAll('#stepDropdown input[type="checkbox"]');
  const selectedSteps = new Set();
  if (stepCheckboxes.length > 0) {
    stepCheckboxes.forEach(cb => {
      if (cb.checked) selectedSteps.add(cb.value);
    });
  }
  const filterDaysStr = document.getElementById('docFilterDays') ? document.getElementById('docFilterDays').value : "";
  const filterDays = filterDaysStr !== "" ? parseInt(filterDaysStr, 10) : -1;

  // 2. Second Pass: Apply search and group filters for display
  let displayList = baseList.filter(e => {
    const cat = e.catCode || 'ไม่ระบุหมวด';
    if (window.currentDocGroupFilters.size > 0 && !window.currentDocGroupFilters.has(cat)) return false;

    // Step Filter
    if (selectedSteps.size > 0) {
      const dt = e.docTracking || {};
      let step = (dt.step || "").trim();

      // Apply the same dynamic step overrides as rendering logic
      const info = extractMissionInfo(e.desc);
      if (info.timestamp > 0) {
        const days = Math.floor((Date.now() - info.timestamp) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          if (step === 'ยังไม่จบภารกิจ' || step === 'ยังไม่เสร็จสิ้นภารกิจ') {
            step = '';
          }
        } else {
          if (!step || step === 'ยังไม่จบภารกิจ' || step === 'ยังไม่เสร็จสิ้นภารกิจ') {
            step = 'ยังไม่จบภารกิจ';
          }
        }
      }

      const effectiveStep = step === "" ? "WAITING" : step;
      if (!selectedSteps.has(effectiveStep)) return false;
    }

    // Days Passed Filter
    if (filterDays > -1) {
      const info = extractMissionInfo(e.desc);
      let daysPassed = -1;
      if (info.timestamp > 0) {
        daysPassed = Math.floor((Date.now() - info.timestamp) / (1000 * 60 * 60 * 24));
      }
      if (daysPassed < filterDays) return false;
    }

    if (q) {
      return (e.id && e.id.toString().includes(q)) ||
        (e.refNo && e.refNo.toLowerCase().includes(q)) ||
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.desc && e.desc.toLowerCase().includes(q));
    }
    return true;
  });

  const container = document.getElementById('docTrackingTablesContainer');
  if (!container) return;

  if (displayList.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:30px; color:var(--text-muted); background:white; border-radius:8px; border:1px solid var(--border);">ไม่พบรายการที่ตรงเงื่อนไข</div>`;
    const summaryContainer = document.getElementById('docTotalSummary');
    if (summaryContainer) summaryContainer.innerHTML = '';
    return;
  }

  // Grouping by category
  const groupedList = {};
  displayList.forEach(e => {
    const cat = e.catCode || 'ไม่ระบุหมวด';
    if (!groupedList[cat]) groupedList[cat] = [];
    groupedList[cat].push(e);
  });

  // Populate total summary
  let totalFilteredAmount = 0;

  let deptText = 'รวมทุกฝ่าย';
  if (filterDept) {
    deptText = deptFullNames[filterDept] ? `${filterDept} (${deptFullNames[filterDept]})` : filterDept;
  }

  let planFullName = 'รวมทุกแผนงาน';
  if (currentPlan && currentPlan !== 'All') {
    if (cache && cache.plans) {
      const p = cache.plans.find(x => x.shortName === currentPlan);
      if (p && p.fullName) {
        planFullName = p.fullName;
      } else {
        planFullName = currentPlan;
      }
    } else {
      planFullName = currentPlan;
    }
  }

  let summaryHtml = '<div class="print-header" style="display:none; text-align:center; margin-bottom:20px;">' +
    '<h2 style="margin:0 0 8px 0; font-size:24px; color:#000;">รายงานระบบติดตามเอกสาร (รอเบิก)</h2>' +
    `<div style="font-size:16px; margin-bottom:4px; font-weight:bold; color:#333;">แผนงาน: ${planFullName}</div>` +
    `<div style="font-size:16px; margin-bottom:8px; font-weight:bold; color:#333;">กลุ่ม/ฝ่าย: ${deptText}</div>` +
    '</div>' +
    '<div style="display:flex; flex-wrap:wrap; gap:12px; background:#f8fafc; padding:16px; border-radius:8px; border:1px solid var(--border);">';
  summaryHtml += '<div style="flex:1; min-width:200px;">';

  const catTotals = [];
  Object.keys(groupedList).sort().forEach(cat => {
    let catSum = 0;
    groupedList[cat].forEach(e => catSum += parseFloat(e.amount) || 0);
    totalFilteredAmount += catSum;
    catTotals.push(`
          <div style="display:inline-flex; align-items:baseline; gap:6px; background:white; padding:4px 8px; border-radius:6px; border:1px solid var(--border);">
            <span style="font-size:11px; color:var(--text-muted); font-weight:600;">หมวด ${cat}:</span>
            <span style="font-size:13px; font-weight:800; color:var(--primary-dark);">${catSum.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
          </div>
        `);
  });

  summaryHtml += `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div style="display:flex; align-items:flex-end; gap:12px; flex-wrap:wrap;">
            <h3 style="margin:0; font-size:16px; color:var(--text-main);">สรุปยอดเงินที่ผ่านการกรอง</h3>
            <div style="font-size:22px; font-weight:800; color:var(--primary); line-height:1;">
              ${totalFilteredAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} <span style="font-size:14px; font-weight:700; color:var(--text-muted);">บาท</span>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${catTotals.join('')}
          </div>
        </div>
      </div>`;

  const summaryContainer = document.getElementById('docTotalSummary');
  if (summaryContainer) {
    summaryContainer.innerHTML = summaryHtml;
  }

  let html = '';
  Object.keys(groupedList).sort().forEach(cat => {
    const items = groupedList[cat];
    let catTotal = 0;

    let rowsHtml = items.map(e => {
      catTotal += parseFloat(e.amount) || 0;
      const dt = e.docTracking || {};
      let step = (dt.step || "").trim();
      const notes = dt.notes || "";

      // Extract mission info to get timestamp
      const info = extractMissionInfo(e.desc);
      let daysPassedHtml = '-';
      if (info.timestamp > 0) {
        // Note: Use an end-of-day timestamp or just naive check
        const days = Math.floor((Date.now() - info.timestamp) / (1000 * 60 * 60 * 24));
        if (days >= 0) {
          let color = days > 30 ? '#dc2626' : (days > 15 ? '#d97706' : '#059669');
          daysPassedHtml = `<span style="color:${color}; font-weight:800; font-size:16px;">${days}</span><br><span style="font-size:11px; color:var(--text-muted);">วัน</span>`;
          if (step === 'ยังไม่จบภารกิจ' || step === 'ยังไม่เสร็จสิ้นภารกิจ') {
            step = '';
          }
        } else {
          daysPassedHtml = `<span style="color:#2563eb; font-weight:700; font-size:12px; line-height:1.2; display:inline-block;">ยังไม่จบ<br>ภารกิจ</span>`;
          // Override step only if it hasn't been manually updated to something else
          if (!step || step === 'ยังไม่จบภารกิจ' || step === 'ยังไม่เสร็จสิ้นภารกิจ') {
            step = 'ยังไม่จบภารกิจ';
          }
        }
      }

      let rowBgColor = getStepRowBackground(step);

      return `
            <tr style="cursor:pointer; border-bottom:1px solid #f1f5f9; background-color:${rowBgColor} !important;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'" onclick="openDocEditModal('${e.id}')">
              <td style="text-align:center; font-weight:800; font-size:13px; color:var(--primary-dark); white-space:nowrap;">#${e.id}</td>
              <td style="text-align:center; font-size:13px; white-space:nowrap;">${e.refNo || '-'}</td>
              <td style="text-align:center; white-space:normal; word-break:break-word;">
                <div style="font-weight:700; font-size:13px; line-height:1.4;">${e.name || '-'}</div>
                <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">${e.dept || '-'}</div>
              </td>
              <td style="text-align:left; font-size:13px; line-height:1.5; white-space:normal; word-break:break-word;">
                <span style="font-weight:700; color:var(--primary); font-size:12px;">[${e.catCode || '-'}]</span> 
                ${e.desc || '-'}
              </td>
              <td style="text-align:center; line-height:1; white-space:nowrap;">${daysPassedHtml}</td>
              <td style="text-align:right; font-weight:700; color:var(--primary); font-size:14px; white-space:nowrap;">${Number(e.amount || 0).toLocaleString()}</td>
              <td style="text-align:center; white-space:normal;">${getStepBadge(step)}</td>
              <td style="font-size:13px; color:var(--text-main); white-space:normal; word-break:break-word;">${notes || '-'}</td>
            </tr>
          `;
    }).join('');

    const fullCatName = getFullCatName(cat);
    html += `
          <div class="category-card" style="margin-bottom:32px; background:white; border:1px solid var(--border); border-radius:8px; box-shadow:0 1px 3px rgba(0,0,0,0.1); display:block; height:max-content;">
            <div style="background:var(--primary-light); padding:10px 16px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; border-radius:8px 8px 0 0;">
              <h3 style="margin:0; font-size:15px; color:var(--primary-dark);">หมวด ${fullCatName} <span style="font-size:12px; font-weight:normal; color:var(--primary); margin-left:8px;">(${items.length} รายการ)</span></h3>
              <span style="font-size:13px; font-weight:700; color:var(--primary-dark);">ยอดรวม ${catTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} ฿</span>
            </div>
            <div style="overflow-x:auto; overflow-y:hidden; width:100%; min-height:max-content;">
              <table class="data-table" style="table-layout: fixed; width: 100%; min-width: 900px; border-top:none; border-radius:0 0 8px 8px;">
                <thead style="background:#f8fafc;">
                  <tr>
                    <th style="width:60px; text-align:center;">ID</th>
                    <th style="width:110px; text-align:center;">เลขหนังสือ</th>
                    <th style="width:160px; text-align:center;">ชื่อผู้เบิก</th>
                    <th style="width:auto; text-align:left;">รายละเอียดภารกิจ</th>
                    <th style="width:60px; text-align:center;">ผ่านไป</th>
                    <th style="width:80px; text-align:right;">วงเงินกัน</th>
                    <th style="width:130px; text-align:center;">ขั้นตอนปัจจุบัน</th>
                    <th style="width:140px;">หมายเหตุ</th>
                  </tr>
                </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
            </div>
          </div>
        `;
  });

  container.innerHTML = html;
}

function openDocEditModal(id) {
  if (!cache || !cache.entries) return;
  const e = cache.entries.find(x => x.id == id);
  if (!e) return;

  const dt = e.docTracking || {};
  document.getElementById('docEditIdDisplay').innerText = id;
  document.getElementById('docEditId').value = id;
  document.getElementById('docEditStep').value = dt.step || "";
  document.getElementById('docEditLocation').value = dt.location || "";
  document.getElementById('docEditNotes').value = dt.notes || "";

  document.getElementById('docEditModal').style.display = 'flex';
}

async function saveDocTracking() {
  const id = document.getElementById('docEditId').value;
  const step = document.getElementById('docEditStep').value;
  const location = document.getElementById('docEditLocation').value;
  const notes = document.getElementById('docEditNotes').value;
  const lastModified = new Date().toISOString();

  const docTracking = { step, location, notes, lastModified };

  // Optimistic update
  const e = cache.entries.find(x => x.id == id);
  if (e) {
    e.docTracking = docTracking;
    renderDocTracking();
  }

  document.getElementById('docEditModal').style.display = 'none';

  // Save to server
  const res = await call('submitDocTracking', { id, docTracking });
  if (res && res.success) {
    Swal.fire({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      icon: 'success',
      title: 'อัปเดตสถานะเอกสารเรียบร้อย'
    });
  } else {
    Swal.fire('ข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่', 'error');
  }
}

// ==========================================
// GF AUTOMATIC SYSTEM
// ==========================================
let gfExcelData = null;
let gfTargetSheetData = null;
let mergedCellsMap = {};

function showGfStatus(msg, type) {
  const el = document.getElementById('gfStatusMessage');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = msg;
  if (type === 'progress') {
    el.style.backgroundColor = '#e0f2fe';
    el.style.color = '#0369a1';
    el.style.borderLeft = '4px solid #0ea5e9';
  } else if (type === 'error') {
    el.style.backgroundColor = '#fef2f2';
    el.style.color = '#b91c1c';
    el.style.borderLeft = '4px solid #ef4444';
  } else if (type === 'success') {
    el.style.backgroundColor = '#d1fae5';
    el.style.color = '#047857';
    el.style.borderLeft = '4px solid #10b981';
  }
}

function updateGfProgress(percent) {
  const bar = document.getElementById('gfProgressBar');
  const fill = document.getElementById('gfProgressBarFill');
  if (!bar || !fill) return;
  bar.style.display = 'block';
  fill.style.width = percent + '%';
}

document.getElementById('gfExcelFile')?.addEventListener('change', function (e) {
  const btn1 = document.getElementById('gfProcessBtn');
  const btn2 = document.getElementById('gfSearchAmountBtn');
  const hasFile = e.target.files.length > 0;
  if (btn1) btn1.disabled = !hasFile;
  if (btn2) btn2.disabled = !hasFile;
});

document.getElementById('gfProcessBtn')?.addEventListener('click', function () {
  const fileInput = document.getElementById('gfExcelFile');
  if (!fileInput.files.length) {
    showGfStatus('กรุณาเลือกไฟล์ก่อน', 'error');
    return;
  }
  processGfExcelFile(fileInput.files[0], 'update');
});

document.getElementById('gfSearchAmountBtn')?.addEventListener('click', function () {
  const fileInput = document.getElementById('gfExcelFile');
  if (!fileInput.files.length) {
    showGfStatus('กรุณาเลือกไฟล์ก่อน', 'error');
    return;
  }
  processGfExcelFile(fileInput.files[0], 'search');
});

function processGfExcelFile(file, mode) {
  showGfStatus('กำลังอ่านไฟล์ Excel...', 'progress');
  updateGfProgress(10);

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array', cellText: true, cellDates: true, cellStyles: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      gfExcelData = [];
      mergedCellsMap = {};

      if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let r = range.s.r; r <= range.e.r; ++r) {
          const row = [];
          for (let c = range.s.c; c <= range.e.c; ++c) {
            const cell_ref = XLSX.utils.encode_cell({ c, r });
            const cell = worksheet[cell_ref];
            let cellValue = '';
            if (cell) {
              if (cell.w) cellValue = cell.w;
              else if (cell.v !== undefined) cellValue = String(cell.v);

              if (typeof cell.v === 'number' && cellValue.indexOf('-') === -1) {
                const numStr = String(cell.v);
                if (numStr.includes('.')) {
                  const parts = numStr.split('.');
                  if (parts.length === 2 && parts[0].length <= 2) {
                    if (parts[1].length === 2) cellValue = `${parts[0]}-${parts[1]}`;
                    else if (parts[1].length === 5) cellValue = `${parts[0]}-${parts[1].substring(0, 2)}-${parts[1].substring(2)}`;
                  }
                }
              }
            }
            row.push(cellValue);
          }
          gfExcelData.push(row);
        }
      }

      const mergedCells = worksheet['!merges'] || [];
      mergedCells.forEach((mergeInfo, index) => {
        for (let r = mergeInfo.s.r; r <= mergeInfo.e.r; r++) {
          for (let c = mergeInfo.s.c; c <= mergeInfo.e.c; c++) {
            if (r === mergeInfo.s.r && c === mergeInfo.s.c) continue;
            mergedCellsMap[`${r},${c}`] = { mainCell: { r: mergeInfo.s.r, c: mergeInfo.s.c }, mergeIndex: index };
          }
        }
      });

      if (!gfExcelData || gfExcelData.length === 0) {
        gfExcelData = [['No data']];
      }

      showGfStatus('อ่านไฟล์ Excel เรียบร้อย กำลังดึงข้อมูลจาก Google Sheet...', 'progress');
      updateGfProgress(30);

      call('gf_getSheetData').then(jsonData => {
        if (!jsonData) {
          showGfStatus('เกิดข้อผิดพลาดในการดึงข้อมูลจาก Google Sheet: Unknown Error', 'error');
          return;
        }
        // jsonData comes directly as an array from backend
        processGfTargetSheetData(jsonData.result || jsonData, mode);
      });

    } catch (error) {
      showGfStatus('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ' + error.message, 'error');
    }
  };

  reader.onerror = function (error) {
    showGfStatus('เกิดข้อผิดพลาดในการอ่านไฟล์: ' + error, 'error');
  };
  reader.readAsArrayBuffer(file);
}

function processGfTargetSheetData(data, mode) {
  try {
    showGfStatus('กำลังวิเคราะห์ข้อมูลและค้นหาการจับคู่...', 'progress');
    updateGfProgress(50);

    let parsed = data;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch (e) { }
    }

    gfTargetSheetData = parsed.map(row => {
      if (Array.isArray(row)) {
        return row.map(cell => {
          if (cell === null || cell === undefined) return '';
          if (typeof cell === 'number') {
            const cellStr = String(cell);
            if (cellStr.includes('.')) {
              const parts = cellStr.split('.');
              if (parts.length === 2) {
                // เฉพาะกรณีที่เลขหน้ามี 1-2 หลัก (เช่น 69.05 -> 69-05) ไม่ใช่ยอดเงินหลักแสน
                if (parts[0].length <= 2) {
                  if (parts[1].length === 2) return `${parts[0]}-${parts[1]}`;
                  else if (parts[1].length === 5) return `${parts[0]}-${parts[1].substring(0, 2)}-${parts[1].substring(2)}`;
                }
              }
            }
            return cellStr;
          }
          return String(cell);
        });
      }
      return row;
    });

    if (mode === 'update') findGfMatches();
    else if (mode === 'search') searchGfAmounts();

  } catch (error) {
    showGfStatus('เกิดข้อผิดพลาดในการประมวลผลข้อมูล: ' + error.message, 'error');
  }
}

function addLeadingZeros(value) {
  if (value.includes('-')) {
    const parts = value.split('-');
    if (parts.length === 3) return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2].padStart(5, '0')}`;
    else if (parts.length === 2) return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return value;
}

function findGfMatches() {
  try {
    showGfStatus('กำลังค้นหาการจับคู่ระหว่างข้อมูล...', 'progress');
    updateGfProgress(60);

    const planSelector = document.getElementById('gfPlanSelector');
    const selectedPlan = planSelector.value;

    const excelMatchCol = 0; // A
    const excelValueCol1 = 5; // F
    const excelNegativeCol = 6; // G
    const excelValueCol2 = 7; // H

    const sheetFilterCol = 1; // B (index 1)
    const sheetMatchCol = 7; // H (index 7)

    const updates = [];
    const matchMap = new Map();

    for (let i = 0; i < gfExcelData.length; i++) {
      const excelRow = gfExcelData[i];
      if (!excelRow || excelRow.length === 0) continue;

      if (mergedCellsMap[`${i},${excelMatchCol}`]) continue;

      const excelMatchValue = excelRow[excelMatchCol];

      let excelValueCol1Value = excelRow.length > excelValueCol1 ? excelRow[excelValueCol1] : null;
      let excelNegativeColValue = excelRow.length > excelNegativeCol ? excelRow[excelNegativeCol] : null;
      let excelValueCol2Value = excelRow.length > excelValueCol2 ? excelRow[excelValueCol2] : null;

      if (mergedCellsMap[`${i},${excelValueCol1}`]) excelValueCol1Value = gfExcelData[mergedCellsMap[`${i},${excelValueCol1}`].mainCell.r][mergedCellsMap[`${i},${excelValueCol1}`].mainCell.c];
      if (mergedCellsMap[`${i},${excelNegativeCol}`]) excelNegativeColValue = gfExcelData[mergedCellsMap[`${i},${excelNegativeCol}`].mainCell.r][mergedCellsMap[`${i},${excelNegativeCol}`].mainCell.c];
      if (mergedCellsMap[`${i},${excelValueCol2}`]) excelValueCol2Value = gfExcelData[mergedCellsMap[`${i},${excelValueCol2}`].mainCell.r][mergedCellsMap[`${i},${excelValueCol2}`].mainCell.c];

      let sourceColumn = 'H';
      const isNegative = excelNegativeColValue !== null && (String(excelNegativeColValue).trim().startsWith('-') || (typeof excelNegativeColValue === 'number' && excelNegativeColValue < 0));
      const isValueEmpty = excelValueCol2Value === null || excelValueCol2Value === undefined || String(excelValueCol2Value).trim() === '' || String(excelValueCol2Value).trim() === '0';

      let valueToUse;
      if (isNegative && isValueEmpty && excelValueCol1Value !== null) {
        valueToUse = excelValueCol1Value;
        sourceColumn = 'F';
      } else if (excelValueCol2Value === null) {
        if (excelRow.length > 1) {
          valueToUse = excelRow[excelRow.length - 1];
          sourceColumn = 'Last';
        } else {
          valueToUse = null;
        }
      } else {
        valueToUse = excelValueCol2Value;
      }

      if (excelMatchValue === undefined || excelMatchValue === null || excelMatchValue === "" || valueToUse === undefined || valueToUse === null || valueToUse === "") {
        continue;
      }

      // กรองเอาเฉพาะข้อมูลที่มีฟอร์มแบบ 69-05-00001 (XX-XX-XXXXX)
      const excelStrForCheck = addLeadingZeros(String(excelMatchValue).trim());
      if (!/^\d{2}-\d{2}-\d+$/.test(excelStrForCheck)) {
        continue;
      }

      for (let j = 0; j < gfTargetSheetData.length; j++) {
        const targetRow = gfTargetSheetData[j];
        if (!targetRow || targetRow.length <= Math.max(sheetMatchCol, sheetFilterCol)) continue;

        const targetPlan = String(targetRow[sheetFilterCol] || "").trim();
        if (selectedPlan && targetPlan !== selectedPlan) continue;

        const targetMatchValue = targetRow[sheetMatchCol];
        if (targetMatchValue === undefined || targetMatchValue === null || targetMatchValue === "") continue;

        let excelStr = addLeadingZeros(String(excelMatchValue).trim());
        let targetStr = addLeadingZeros(String(targetMatchValue).trim());

        let isMatch = false;
        let matchMethod = '';

        if (excelStr === targetStr) { isMatch = true; matchMethod = 'exact'; }
        else if (excelStr.toLowerCase() === targetStr.toLowerCase()) { isMatch = true; matchMethod = 'caseInsensitive'; }
        else if (excelStr.replace(/\s+/g, '') === targetStr.replace(/\s+/g, '')) { isMatch = true; matchMethod = 'ignoreSpaces'; }

        if (isMatch) {
          updates.push({
            row: j + 1,
            value: valueToUse,
            matchValue: targetStr,
            matchMethod: matchMethod,
            sourceColumn: sourceColumn
          });

          if (!matchMap.has(targetStr)) matchMap.set(targetStr, []);
          matchMap.get(targetStr).push({ row: j + 1, value: valueToUse, matchValue: targetStr, sourceColumn: sourceColumn });
        }
      }
    }

    let duplicateCount = 0;
    matchMap.forEach(matches => { if (matches.length > 1) duplicateCount++; });

    let columnFCount = updates.filter(u => u.sourceColumn === 'F').length;

    document.getElementById('gfMatchesFound').innerText = updates.length;
    document.getElementById('gfResultStats').style.display = 'block';
    document.getElementById('gfAmountSearchResults').style.display = 'none';

    if (updates.length > 0) {
      executeGfUpdates(updates, selectedPlan);
    } else {
      showGfStatus('ไม่พบข้อมูลที่ตรงกัน', 'error');
      updateGfProgress(100);
    }

  } catch (error) {
    showGfStatus('เกิดข้อผิดพลาดในการค้นหาการจับคู่: ' + error.message, 'error');
  }
}

async function executeGfUpdates(updates, selectedPlan) {
  showGfStatus('กำลังส่งข้อมูลอัปเดตไปยัง Google Sheet...', 'progress');
  updateGfProgress(80);

  const config = { plan: selectedPlan, updateColumn: "G" };
  const res = await call('gf_updateSheetData', { updates: updates, config: config });

  updateGfProgress(100);
  if (res && res.success) {
    showGfStatus(res.message, 'success');
    document.getElementById('gfUpdatedCount').innerText = res.updatedCount || 0;
    document.getElementById('gfSkippedCount').innerText = res.skippedCount || 0;
    document.getElementById('gfColumnFCount').innerText = res.columnFCount || updates.filter(u => u.sourceColumn === 'F').length;
    init();
  } else {
    showGfStatus('เกิดข้อผิดพลาด: ' + (res?.message || 'ไม่สามารถติดต่อ Backend'), 'error');
  }
}

function searchGfAmounts() {
  try {
    showGfStatus('กำลังตรวจสอบยอดเงิน...', 'progress');
    updateGfProgress(60);

    const selectedPlan = document.getElementById('gfPlanSelector').value;

    const excelMatchCol = 0; // A
    const excelAmountCol = 6; // G

    const sheetFilterCol = 1; // B
    const sheetMatchCol = 7; // H
    const sheetAmountCol = 15; // P
    const sheetDescCol = 16; // Q

    let totalChecked = 0;
    const matchedItems = [];
    const unmatchedItems = [];

    const sheetMap = new Map();
    const candidates = []; // แถวใน Sheet ที่ H ว่างเปล่า เพื่อเอาไว้แนะนำ

    console.log("=== เริ่มสร้างข้อมูลเปรียบเทียบจาก Google Sheet ===");
    console.log("แผนที่เลือก (selectedPlan):", selectedPlan);

    let debugLogCount = 0;
    for (let j = 4; j < gfTargetSheetData.length; j++) {
      const row = gfTargetSheetData[j];
      if (!row) continue;

      const planInSheet = String(row[sheetFilterCol] || "").trim();
      const matchValRaw = String(row[sheetMatchCol] || "").trim();

      if (matchValRaw && debugLogCount < 20) {
        console.log(`Sheet Row ${j + 1} | Plan(B): "${planInSheet}" | Match(H): "${matchValRaw}"`);
        debugLogCount++;
      }

      if (row.length <= sheetMatchCol) {
        console.log(`ข้ามแถว ${j + 1}: row.length (${row.length}) <= sheetMatchCol (${sheetMatchCol})`);
        continue;
      }
      if (selectedPlan && planInSheet !== selectedPlan) {
        if (matchValRaw && debugLogCount < 25) console.log(`ข้ามแถว ${j + 1}: แผนไม่ตรง (Sheet: "${planInSheet}" != เลือก: "${selectedPlan}")`);
        continue;
      }

      const amountVal = row.length > sheetAmountCol ? parseSafeFloat(row[sheetAmountCol]) : 0;

      if (!matchValRaw) {
        // ถ้า H ว่าง เก็บเป็น candidate สำหรับแนะนำ
        candidates.push({
          rowIndex: j + 1,
          desc: String(row[sheetDescCol] || "").trim(),
          amount: amountVal
        });
        continue;
      }

      const matchVal = addLeadingZeros(matchValRaw);
      if (!matchVal) continue;

      if (!sheetMap.has(matchVal)) sheetMap.set(matchVal, { amount: 0, rows: [] });
      sheetMap.get(matchVal).amount += amountVal;
      sheetMap.get(matchVal).rows.push(j + 1);
    }

    const excelMap = new Map();

    for (let i = 0; i < gfExcelData.length; i++) {
      const row = gfExcelData[i];
      if (!row || !row[excelMatchCol]) continue;
      if (mergedCellsMap[`${i},${excelMatchCol}`]) continue;

      const matchVal = addLeadingZeros(String(row[excelMatchCol]).trim());
      const excelAmt = parseSafeFloat(row[excelAmountCol] || row[excelAmountCol + 1]);
      if (!matchVal || matchVal === 'undefined' || matchVal === 'null') continue;

      // เงื่อนไข: ถ้า G >= 0 และ H เป็นค่าว่าง ให้ข้าม (ยังไม่ GF)
      const valG = parseSafeFloat(row[6]);
      const rawH = row[7];
      const isHEmpty = rawH === null || rawH === undefined || String(rawH).trim() === '' || String(rawH).trim() === '0';

      if (valG >= 0 && isHEmpty) {
        continue;
      }

      if (!/^\d{2}-\d{2}-\d+$/.test(matchVal)) {
        console.log("Excel ข้ามแถว (ผิดฟอร์แมต):", matchVal);
        continue;
      }

      totalChecked++;

      const excelDescCol = 2; // C

      if (!excelMap.has(matchVal)) excelMap.set(matchVal, { amount: 0, rows: [], descs: [] });
      excelMap.get(matchVal).amount += excelAmt;
      excelMap.get(matchVal).rows.push(i + 1);
      excelMap.get(matchVal).descs.push(String(row[excelDescCol] || "").trim());
    }

    // ฟังก์ชันเปรียบเทียบความเหมือนของข้อความ (Bigram Sørensen–Dice coefficient)
    function calcSimilarity(s1, s2) {
      if (!s1 || !s2) return 0;
      const getBigrams = str => {
        const s = str.replace(/\s+/g, '').toLowerCase();
        const bigrams = [];
        for (let i = 0; i < s.length - 1; i++) bigrams.push(s.substring(i, i + 2));
        return bigrams;
      };
      const b1 = getBigrams(s1), b2 = getBigrams(s2);
      if (b1.length === 0 || b2.length === 0) return 0;
      let intersection = 0, b2Copy = [...b2];
      for (const bg of b1) {
        const idx = b2Copy.indexOf(bg);
        if (idx > -1) { intersection++; b2Copy.splice(idx, 1); }
      }
      return (2.0 * intersection) / (b1.length + b2.length);
    }

    // เปรียบเทียบรหัสที่ดึงมาจากทั้ง Excel และ Sheet
    for (const matchVal of excelMap.keys()) {
      const excelData = excelMap.get(matchVal);
      const sheetData = sheetMap.get(matchVal) || { amount: 0, rows: [] };

      const diff = Math.abs(excelData.amount - sheetData.amount);
      const rowInfo = `(Excel แถว: ${excelData.rows.join(', ')} | Sheet แถว: ${sheetData.rows.length > 0 ? sheetData.rows.join(', ') : 'ไม่มี'})`;

      if (sheetData.rows.length > 0) {
        if (diff < 0.01) {
          matchedItems.push({ id: matchVal, excel: excelData.amount, sheet: sheetData.amount, rowInfo: rowInfo });
        } else {
          unmatchedItems.push({ id: matchVal, excel: excelData.amount, sheet: sheetData.amount, diff: diff, reason: 'ยอดไม่ตรงกัน', rowInfo: rowInfo, excelDesc: excelData.descs.join(" | ") });
        }
      } else {
        let suggestionsHTML = '';
        const excelDesc = excelData.descs.join(" ");
        if (excelDesc) {
          const scored = candidates.map(c => ({ ...c, score: calcSimilarity(excelDesc, c.desc) }))
            .filter(c => c.score > 0.15) // ต้องเหมือนอย่างน้อย 15%
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // แนะนำไม่เกิน 3 อันดับ

          if (scored.length > 0) {
            suggestionsHTML = `
                  <div style="margin-top: 12px; font-size: 0.9em; background: #fefce8; border: 1px solid #fde047; padding: 12px; border-radius: 8px; color: #854d0e;">
                    <div style="font-weight: bold; margin-bottom: 6px;">💡 รายการใน Sheet ที่อาจจะตรงกัน (คอลัมน์ H ว่าง)</div>
                    <ul style="margin: 0 0 0 20px; padding: 0;">
                      ${scored.map(c => `<li style="margin-bottom: 4px;"><strong>แถว ${c.rowIndex}</strong> (คอลัมน์ Q: "${c.desc}") - ยอดเงิน: <strong>${Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> <span style="color: #64748b; font-size: 0.9em;">(เหมือน ${Math.round(c.score * 100)}%)</span></li>`).join('')}
                    </ul>
                  </div>`;
          }
        }

        unmatchedItems.push({ id: matchVal, excel: excelData.amount, sheet: 0, diff: excelData.amount, reason: 'ไม่พบใน Google Sheet', rowInfo: rowInfo, excelDesc: excelDesc, suggestionsHTML: suggestionsHTML });
      }
    }

    updateGfProgress(100);
    showGfStatus('ตรวจสอบยอดเงินเสร็จสิ้น', 'success');

    document.getElementById('gfAmountSearchResults').style.display = 'block';
    document.getElementById('gfResultStats').style.display = 'none';
    document.getElementById('gfTotalCheckedItems').innerText = totalChecked;
    document.getElementById('gfMatchedItems').innerText = matchedItems.length;
    document.getElementById('gfUnmatchedItems').innerText = unmatchedItems.length;

    const fmtAmt = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const unmatchedList = document.getElementById('gfUnmatchedList');
    if (unmatchedItems.length > 0) {
      unmatchedList.style.display = 'block';
      unmatchedList.innerHTML = unmatchedItems.map(item => `
            <div style="border-bottom: 2px dashed #fca5a5; padding-bottom: 24px; margin-bottom: 24px;">
              <div style="display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 16px;">
                <div>
                  <strong style="font-size: 1.1em; color: #991b1b;">ID: ${item.id}</strong> 
                  <span style="font-size: 0.85em; color: #64748b; background: #f1f5f9; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${item.rowInfo}</span><br>
                  ${item.excelDesc ? `<div style="margin-top: 8px; font-size: 0.9em; color: #334155; background: #f8fafc; padding: 8px 12px; border-left: 4px solid #94a3b8; border-radius: 4px;">📝 <strong>Excel (คอลัมน์ C):</strong> ${item.excelDesc}</div>` : ''}
                  <div style="margin-top: 12px; font-size: 1.05em;">
                    <span style="color: #475569;">Excel: <strong style="color: #334155;">${fmtAmt(item.excel)}</strong></span> 
                    <span style="margin: 0 8px; color: #cbd5e1;">|</span> 
                    <span style="color: #475569;">Sheet: <strong style="color: #334155;">${fmtAmt(item.sheet)}</strong></span>
                  </div>
                </div>
                <div style="text-align: right; background: #fef2f2; padding: 12px 20px; border-radius: 8px; border: 1px solid #fecaca; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                  <div style="font-size: 0.85em; color: #dc2626; margin-bottom: 6px;">ผลต่าง (${item.reason})</div>
                  <strong style="font-size: 1.3em; color: #b91c1c;">${fmtAmt(item.diff)}</strong>
                </div>
              </div>
              ${item.suggestionsHTML || ''}
            </div>
          `).join('');
    } else {
      unmatchedList.style.display = 'none';
    }

  } catch (error) {
    showGfStatus('เกิดข้อผิดพลาดในการตรวจสอบยอดเงิน: ' + error.message, 'error');
  }
}


function renderPendingPlanView() {
  const tbody = document.getElementById('pendingPlanTableBody');
  if (!tbody) return;

  if (!cache || !cache.entries) {
    tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:40px;"><div class="loader-inner" style="margin:20px auto;"></div>กำลังโหลดข้อมูล...</td></tr>';
    return;
  }

  const isCancelled = (e) => e.colF && e.colF.toString().includes("ยกเลิก");
  let pendingEntries = cache.entries.filter(e =>
    e.id !== undefined && e.id !== null && e.id !== "" &&
    e.date !== undefined && e.date !== null && e.date !== "" &&
    (!e.plan || e.plan.toString().trim() === "") &&
    !isCancelled(e)
  );

  // Update Stats & Badge
  const countEl = document.getElementById('pendingStatCount');
  const amountEl = document.getElementById('pendingStatAmount');
  const totalAmount = pendingEntries.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  if (countEl) countEl.textContent = `${pendingEntries.length} รายการ`;
  if (amountEl) amountEl.textContent = `${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท`;

  updatePendingBadge(pendingEntries.length);

  // Populate department filter if needed
  const deptFilter = document.getElementById('pendingDeptFilter');
  if (deptFilter && deptFilter.options.length <= 1) {
    const depts = [...new Set(cache.entries.map(e => e.dept))].filter(Boolean).sort();
    deptFilter.innerHTML = '<option value="">ทุกฝ่าย</option>' + depts.map(d => `<option value="${d}">${d}</option>`).join('');
  }

  // Apply filters
  const searchVal = document.getElementById('pendingSearchInput')?.value.trim().toLowerCase() || "";
  const deptVal = document.getElementById('pendingDeptFilter')?.value || "";

  if (deptVal) {
    pendingEntries = pendingEntries.filter(e => e.dept === deptVal);
  }

  if (searchVal) {
    pendingEntries = pendingEntries.filter(e =>
      (e.id && e.id.toString().toLowerCase().includes(searchVal)) ||
      (e.refNo && e.refNo.toString().toLowerCase().includes(searchVal)) ||
      (e.name && e.name.toString().toLowerCase().includes(searchVal)) ||
      (e.desc && e.desc.toString().toLowerCase().includes(searchVal)) ||
      (e.catCode && e.catCode.toString().toLowerCase().includes(searchVal))
    );
  }

  if (pendingEntries.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px; color:var(--text-muted); font-size:14px;">🎉 ไม่มีรายการค้าง (รายการทั้งหมดได้รับการอนุมัติจัดเข้าแผนเรียบร้อยแล้ว)</td></tr>';
    return;
  }

  tbody.innerHTML = pendingEntries.map(e => `
    <tr class="table-row-clickable" oncontextmenu="event.preventDefault(); selectFromTable('${e.id}', event)" style="cursor:context-menu;">
      <td style="text-align:center;" onclick="event.stopPropagation()" oncontextmenu="event.stopPropagation()">
         <input type="checkbox" class="row-checkbox" data-amt="${e.amount || 0}" onchange="updateSelectedTotal()">
      </td>
      <td class="id-col" style="color:var(--primary); font-weight:700;">#${e.id}</td>
      <td style="text-align:center; font-size:12px;">${formatThaiDate(e.date)}</td>
      <td style="text-align:center;"><span class="cat-badge" style="font-size:11px; padding:2px 8px; background:#eef2ff; color:#4338ca; border-radius:6px; font-weight:700;">${e.catCode || '-'}</span></td>
      <td style="font-size:12px;">${e.refNo || '-'}</td>
      <td><b>${e.name || '-'}</b></td>
      <td style="text-align:center;"><span class="cat-badge" style="font-size:11px; padding:2px 6px; background:var(--primary-light); color:var(--primary-dark); border-radius:4px; font-weight:700;">${e.dept || '-'}</span></td>
      <td style="width:auto; min-width:300px; text-align:left; font-size:13px; font-weight:600; color:#1e293b; line-height:1.5; white-space:normal; word-break:break-word; padding:10px 14px;">
        ${((e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO')) ? '<span class="status-tag status-po" style="font-size:9px; padding:1px 4px; margin-right:4px;">PO</span>' : ''}
        ${e.desc || ''}
      </td>
      <td class="amt-col" style="color:var(--primary-dark); font-weight:700;">${(parseFloat(e.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td style="white-space:nowrap; text-align:center; padding:6px 4px;">
        <button onclick="assignPlanForId('${e.id}')" style="background:#d97706; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(217,119,6,0.2);">
          <span class="material-symbols-outlined" style="font-size:15px;">account_tree</span>
          <span>อนุมัติเข้าแผน</span>
        </button>
      </td>
    </tr>
  `).join('');
}

function updatePendingBadge(count) {
  if (count === undefined && cache && cache.entries) {
    const isCancelled = (e) => e.colF && e.colF.toString().includes("ยกเลิก");
    count = cache.entries.filter(e =>
      e.id !== undefined && e.id !== null && e.id !== "" &&
      e.date !== undefined && e.date !== null && e.date !== "" &&
      (!e.plan || e.plan.toString().trim() === "") &&
      !isCancelled(e)
    ).length;
  }
  const badge = document.getElementById('sidebarPendingBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function assignPlanForId(id) {
  selectedId = id;
  doAction('assign-plan');
}




function ThaiBahtText(num) {
  if (num === null || num === undefined || num === "" || isNaN(num)) return "........................................................................................................";
  num = parseFloat(num);
  if (num === 0) return "ศูนย์บาทถ้วน";

  const numbers = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
  const units = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

  let split = num.toFixed(2).split(".");
  let baht = split[0];
  let satang = split[1];

  let bahtStr = "";
  let len = baht.length;

  for (let i = 0; i < len; i++) {
    let digit = parseInt(baht.charAt(i));
    let pos = len - i - 1;
    if (digit !== 0) {
      if (pos % 6 === 1 && digit === 1) {
        bahtStr += "สิบ";
      } else if (pos % 6 === 1 && digit === 2) {
        bahtStr += "ยี่สิบ";
      } else if (pos % 6 === 0 && digit === 1 && len > 1 && baht.charAt(i - 1) !== "0") {
        bahtStr += "เอ็ด";
      } else {
        bahtStr += numbers[digit] + units[pos % 6];
      }
    }
  }

  bahtStr += "บาท";
  if (parseInt(satang) === 0) {
    bahtStr += "ถ้วน";
  } else {
    let sLen = satang.length;
    for (let i = 0; i < sLen; i++) {
      let digit = parseInt(satang.charAt(i));
      let pos = sLen - i - 1;
      if (digit !== 0) {
        if (pos === 1 && digit === 1) bahtStr += "สิบ";
        else if (pos === 1 && digit === 2) bahtStr += "ยี่สิบ";
        else if (pos === 0 && digit === 1 && satang.charAt(0) !== "0") bahtStr += "เอ็ด";
        else bahtStr += numbers[digit] + (pos === 1 ? "สิบ" : "");
      }
    }
    bahtStr += "สตางค์";
  }
  return bahtStr;
}

function toThaiDigits(str) {
  if (str === null || str === undefined) return "";
  const thaiNumerals = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(str).replace(/[0-9]/g, digit => thaiNumerals[parseInt(digit)]);
}

/* ═══ PLAN STAMP SETTINGS & GOOGLE SHEET SYNC ═══ */
function getStampSettingsForPlan(planKey) {
  const defaultP = cache && cache.plans ? cache.plans.find(p => p.shortName === planKey) : null;
  const defaultVal = {
    year: "๗๐",
    plan: defaultP ? (defaultP.fullName || defaultP.shortName) : "ยุทธศาสตร์เสริมสร้างประสิทธิภาพการบริหารจัดการทรัพยากรน้ำ",
    output: defaultP && defaultP.output ? defaultP.output : "การสนับสนุนการปฏิบัติการฝนหลวงและบริการด้านการบิน",
    act: defaultP && defaultP.activity ? defaultP.activity : "การบริการด้านการบิน",
    subAct: "ด้านการปฏิบัติการฝนหลวง",
    expenseCat: "งบดำเนินงาน หมวดค่าตอบแทน ใช้สอยและวัสดุ"
  };

  if (cache && cache.stampSettings && cache.stampSettings[planKey]) {
    return { ...defaultVal, ...cache.stampSettings[planKey] };
  }
  try {
    const local = localStorage.getItem('stamp_settings_' + planKey);
    if (local) return { ...defaultVal, ...JSON.parse(local) };
  } catch (e) { }
  return defaultVal;
}

function openStampSettingsModal(selectedPlan = null) {
  const planToEdit = selectedPlan || currentPlan || (cache.plans && cache.plans[0] ? cache.plans[0].shortName : '');
  const currentStamp = getStampSettingsForPlan(planToEdit);

  let planOptionsHtml = '';
  if (cache && cache.plans) {
    cache.plans.forEach(p => {
      planOptionsHtml += `<option value="${p.shortName}" ${p.shortName === planToEdit ? 'selected' : ''}>${p.shortName} ${p.fullName ? `(${p.fullName})` : ''}</option>`;
    });
  } else {
    planOptionsHtml = `<option value="${planToEdit}">${planToEdit}</option>`;
  }

  const modalHtml = `
    <div style="text-align:left; font-size:13px; font-family:'Sarabun', sans-serif;">
      <div style="margin-bottom:12px;">
        <label style="font-weight:bold; display:block; margin-bottom:4px; color:#1e293b;">เลือกแผนงานที่ต้องการตั้งค่าตรายาง:</label>
        <select id="setStampPlanSelect" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600; background:#f8fafc;" onchange="onStampPlanSelectChange(this.value)">
          ${planOptionsHtml}
        </select>
      </div>

      <div style="background:#f1f5f9; padding:14px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:12px;">
        <div style="margin-bottom:8px;">
          <label style="font-weight:bold; font-size:12px; color:#334155;">ปี พ.ศ. ๒๕... :</label>
          <input type="text" id="setStampYear" value="${currentStamp.year}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-weight:bold; font-size:12px; color:#334155;">แผนงาน :</label>
          <input type="text" id="setStampPlan" value="${currentStamp.plan}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>
        <div style="margin-bottom:8px;">
          <label style="font-weight:bold; font-size:12px; color:#334155;">ผลผลิต :</label>
          <input type="text" id="setStampOutput" value="${currentStamp.output}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
          <div>
            <label style="font-weight:bold; font-size:12px; color:#334155;">กิจกรรม :</label>
            <input type="text" id="setStampAct" value="${currentStamp.act}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
          <div>
            <label style="font-weight:bold; font-size:12px; color:#334155;">กิจกรรมย่อย :</label>
            <input type="text" id="setStampSubAct" value="${currentStamp.subAct}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
          </div>
        </div>
        <div>
          <label style="font-weight:bold; font-size:12px; color:#334155;">หมวดรายจ่าย :</label>
          <input type="text" id="setStampExpenseCat" value="${currentStamp.expenseCat}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;">
        </div>
      </div>
    </div>
  `;

  Swal.fire({
    title: '⚙️ ตั้งค่าข้อความตรายางประจำแผนงาน',
    html: modalHtml,
    showCancelButton: true,
    confirmButtonText: '💾 บันทึกลง Google Sheet',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#16a34a',
    width: '540px',
    preConfirm: () => {
      const selectedPlanKey = document.getElementById('setStampPlanSelect').value;
      return {
        planKey: selectedPlanKey,
        stampData: {
          year: document.getElementById('setStampYear').value,
          plan: document.getElementById('setStampPlan').value,
          output: document.getElementById('setStampOutput').value,
          act: document.getElementById('setStampAct').value,
          subAct: document.getElementById('setStampSubAct').value,
          expenseCat: document.getElementById('setStampExpenseCat').value
        }
      };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      await saveStampSettings(result.value.planKey, result.value.stampData);
    }
  });
}

function onStampPlanSelectChange(planKey) {
  const currentStamp = getStampSettingsForPlan(planKey);
  document.getElementById('setStampYear').value = currentStamp.year || '';
  document.getElementById('setStampPlan').value = currentStamp.plan || '';
  document.getElementById('setStampOutput').value = currentStamp.output || '';
  document.getElementById('setStampAct').value = currentStamp.act || '';
  document.getElementById('setStampSubAct').value = currentStamp.subAct || '';
  document.getElementById('setStampExpenseCat').value = currentStamp.expenseCat || '';
}

async function saveStampSettings(planKey, stampData) {
  if (!cache.stampSettings) cache.stampSettings = {};
  cache.stampSettings[planKey] = stampData;
  try {
    localStorage.setItem('stamp_settings_' + planKey, JSON.stringify(stampData));
  } catch (e) { }

  const res = await call('saveStampSettings', { planKey, stampData });

  Swal.fire({
    icon: 'success',
    title: 'บันทึกสำเร็จ!',
    text: `บันทึกการตั้งค่าตรายางสำหรับแผน "${planKey}" ลง Google Sheet เรียบร้อยแล้ว`,
    timer: 2000,
    showConfirmButton: false
  });
}

/* ═══ PRINT PLAN RUBBER STAMP LOGIC (ตรายางข้อความ) ═══ */
function openPrintPlanModal(id = null) {
  closeActionMenu();

  let targetPlan = currentPlan;
  let defaultItemTag = "#804 (C1)";
  let defaultAmountNum = "........................................";
  let defaultAmountBaht = "";

  if (id && cache && cache.entries) {
    const item = cache.entries.find(x => x.id == id);
    if (item) {
      if (item.plan) targetPlan = item.plan;
      let cat = item.catCode || item.category || item.code || "C1";
      if (!cat.startsWith("(")) cat = `(${cat})`;
      defaultItemTag = `#${item.id} ${cat}`;

      if (item.amount) {
        const amt = parseFloat(item.amount);
        const formattedAmt = amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        defaultAmountNum = toThaiDigits(formattedAmt);
        defaultAmountBaht = ThaiBahtText(amt);
      }
    }
  }

  const stampConfig = getStampSettingsForPlan(targetPlan);

  let defaultYear = stampConfig.year;
  let defaultPlan = stampConfig.plan;
  let defaultOutput = stampConfig.output;
  let defaultAct = stampConfig.act;
  let defaultSubAct = stampConfig.subAct;
  let defaultExpenseCat = stampConfig.expenseCat;

  const modalHtml = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <filter id="rubberStampEffect" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency="0.25" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.6" xChannelSelector="R" yChannelSelector="G" result="displaced" />
      </filter>
    </svg>

    <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; margin-bottom:12px; color:#475569;">
      <span>ตัวอย่างตรายางปั๊มจริง (มุมซ้ายล่าง A4):</span>
      <button type="button" onclick="openStampSettingsModal('${targetPlan}')" style="background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:6px; padding:4px 10px; font-size:11px; font-weight:bold; cursor:pointer;">
        ⚙️ ตั้งค่าข้อความตรายางประจำแผน
      </button>
    </div>
    
    <div style="background:#f1f5f9; border:1px dashed #cbd5e1; padding:24px 20px; border-radius:8px; margin-bottom:16px; display:flex; justify-content:center; background-image: radial-gradient(#cbd5e1 1px, transparent 1px); background-size: 12px 12px;">
      <div class="rubber-stamp-container" style="position:relative; background:white; padding:10px 12px; border:2px solid #001f60; border-radius:3px; box-shadow:0 3px 10px rgba(0,0,0,0.06); filter: url(#rubberStampEffect); transform: rotate(-0.5deg); width:365px;">
        <div style="position:absolute; top:-20px; left:0; font-size:11px; font-weight:bold; color:#001f60; font-family:'Sarabun', sans-serif;">${defaultItemTag}</div>
        <div class="stamp-line"><b>โดยเบิกจ่ายจากเงินงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ.๒๕</b><span id="prevYear" style="color:#001f60;">${defaultYear}</span></div>
        <div class="stamp-line"><b>แผนงาน : </b><span id="prevPlan" style="color:#001f60;">${defaultPlan}</span></div>
        <div class="stamp-line"><b>ผลผลิต : </b><span id="prevOutput" style="color:#001f60;">${defaultOutput}</span></div>
        <div class="stamp-line stamp-flex">
          <span><b>กิจกรรม : </b><span id="prevAct" style="color:#001f60;">${defaultAct}</span></span>
          <span><b>กิจกรรมย่อย : </b><span id="prevSubAct" style="color:#001f60;">${defaultSubAct}</span></span>
        </div>
        <div class="stamp-line"><b>${defaultExpenseCat}</b></div>
        <div class="stamp-line">
          <b>ภายในวงเงินงบประมาณ เป็นจำนวนเงิน </b>
          <span id="prevAmtNum" style="color:#001f60; font-weight:bold; border-bottom:1px dotted #001f60; padding:0 4px; min-width:110px; display:inline-block; text-align:center;">${defaultAmountNum}</span> 
          <b>บาท</b>
        </div>
        <div class="stamp-line" style="display:flex; align-items:center; width:100%; margin-top:3px;">
          <b style="color:#001f60;">(</b>
          <span id="prevAmtBaht" style="color:#001f60; flex:1; border-bottom:1px dotted #001f60; text-align:center; margin:0 4px; min-height:14px; display:inline-block; font-weight:bold;">${defaultAmountBaht}</span>
          <b style="color:#001f60;">)</b>
        </div>
      </div>
    </div>

    <div style="text-align:left; display:grid; grid-template-columns:1fr 1fr; gap:10px; font-size:12px;">
      <div>
        <label style="font-weight:bold;">ปี พ.ศ. ๒๕...</label>
        <input type="text" id="inpYear" value="${defaultYear}" style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;" oninput="document.getElementById('prevYear').textContent=toThaiDigits(this.value)||\'................\';">
      </div>
      <div>
        <label style="font-weight:bold;">จำนวนเงิน (บาท)</label>
        <input type="text" id="inpAmtNum" value="" placeholder="ระบุจำนวนเงิน..." style="width:100%; padding:6px; border:1px solid #cbd5e1; border-radius:6px;" oninput="updateStampAmt(this.value)">
      </div>
    </div>
  `;

  Swal.fire({
    title: '🖨️ พิมพ์ตรายางอนุมัติ (มุมซ้ายล่าง A4)',
    html: modalHtml,
    showCancelButton: true,
    confirmButtonText: '🖨️ สั่งพิมพ์เอกสาร A4',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#001f60',
    width: '540px',
    preConfirm: () => {
      return {
        itemTag: defaultItemTag,
        year: toThaiDigits(document.getElementById('inpYear').value) || "๗๐",
        plan: defaultPlan,
        output: defaultOutput,
        act: defaultAct,
        subAct: defaultSubAct,
        expenseCat: defaultExpenseCat,
        amtNum: document.getElementById('prevAmtNum').textContent || "........................................",
        amtBaht: document.getElementById('prevAmtBaht').textContent || ""
      };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      triggerPrintWithStamp(result.value);
    }
  });
}

function updateStampAmt(val) {
  const prevNum = document.getElementById('prevAmtNum');
  const prevBaht = document.getElementById('prevAmtBaht');
  if (!val || val.trim() === "" || val.includes("...")) {
    if (prevNum) prevNum.textContent = "........................................";
    if (prevBaht) prevBaht.textContent = "";
    return;
  }
  const cleanVal = val.replace(/,/g, '').replace(/[๐-๙]/g, d => '๐๑๒๓๔๕๖๗๘๙'.indexOf(d));
  if (!isNaN(cleanVal)) {
    const num = parseFloat(cleanVal);
    const formattedAmt = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (prevNum) prevNum.textContent = toThaiDigits(formattedAmt);
    if (prevBaht) prevBaht.textContent = ThaiBahtText(num);
  } else {
    if (prevNum) prevNum.textContent = toThaiDigits(val);
    if (prevBaht) prevBaht.textContent = val;
  }
}

function triggerPrintWithStamp(data) {
  let frame = document.getElementById('printStampIframe');
  if (frame) frame.remove();

  frame = document.createElement('iframe');
  frame.id = 'printStampIframe';
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.zIndex = '-9999';
  document.body.appendChild(frame);

  const doc = frame.contentWindow.document;
  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="UTF-8">
      <title>ตราประทับอนุมัติแผน</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            width: 210mm !important;
            height: 297mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            overflow: hidden !important;
          }
        }
        body {
          margin: 0;
          padding: 0;
          width: 210mm;
          height: 297mm;
          position: relative;
          background: #ffffff;
          font-family: 'Sarabun', 'TH Sarabun PSK', sans-serif;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .stamp-box {
          position: absolute;
          left: 5mm;
          bottom: 40mm;
          width: 365px;
          font-size: 11px;
          font-weight: 700;
          color: #001f60;
          line-height: 1.45;
          text-align: left;
          transform: rotate(-0.5deg);
          filter: url(#rubberStampPrintEffect);
          border: 2px solid #001f60;
          border-radius: 3px;
          padding: 8px 10px;
          box-sizing: border-box;
        }
        .stamp-line {
          margin-bottom: 2px;
          white-space: nowrap;
          color: #001f60;
          text-shadow: 0 0 0.3px rgba(0, 31, 96, 0.5);
        }
        .stamp-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .stamp-center {
          text-align: center;
          margin-top: 4px;
        }
      </style>
    </head>
    <body>
      <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
        <filter id="rubberStampPrintEffect" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.22" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div class="stamp-box">
        <div style="position:absolute; top:-18px; left:0; font-size:11px; font-weight:bold; color:#001f60;">${data.itemTag || '#804 (C1)'}</div>
        <div class="stamp-line"><b>โดยเบิกจ่ายจากเงินงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ.๒๕</b><span>${data.year}</span></div>
        <div class="stamp-line"><b>แผนงาน : </b><span>${data.plan}</span></div>
        <div class="stamp-line"><b>ผลผลิต : </b><span>${data.output}</span></div>
        <div class="stamp-line stamp-flex">
          <span><b>กิจกรรม : </b><span>${data.act}</span></span>
          <span><b>กิจกรรมย่อย : </b><span>${data.subAct}</span></span>
        </div>
        <div class="stamp-line"><b>${data.expenseCat || 'งบดำเนินงาน หมวดค่าตอบแทน ใช้สอยและวัสดุ'}</b></div>
        <div class="stamp-line">
          <b>ภายในวงเงินงบประมาณ เป็นจำนวนเงิน </b>
          <span style="color:#001f60; font-weight:bold; border-bottom:1px dotted #001f60; padding:0 4px; min-width:110px; display:inline-block; text-align:center;">${data.amtNum}</span> 
          <b>บาท</b>
        </div>
        <div class="stamp-line" style="display:flex; align-items:center; width:100%; margin-top:3px;">
          <b style="color:#001f60;">(</b>
          <span style="color:#001f60; flex:1; border-bottom:1px dotted #001f60; text-align:center; margin:0 4px; min-height:14px; display:inline-block; font-weight:bold;">${data.amtBaht}</span>
          <b style="color:#001f60;">)</b>
        </div>
      </div>
    </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    frame.contentWindow.focus();
    frame.contentWindow.print();
  }, 400);
}

// ============================================================
// รายการรออนุมัติแผนงาน (Pending Plan View)
// ============================================================

function updatePendingBadge() {
  if (!cache || !cache.entries) return;
  // หลักการ: column B (plan) ว่าง = รออนุมัติแผน
  const pendingItems = cache.entries.filter(e =>
    e.id && String(e.plan || '').trim() === ''
  );
  const badge = document.getElementById('sidebarPendingBadge');
  if (badge) {
    if (pendingItems.length > 0) {
      badge.textContent = pendingItems.length;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function renderPendingPlanView() {
  const tbody = document.getElementById('pendingPlanTableBody');
  const statCount = document.getElementById('pendingStatCount');
  const statAmount = document.getElementById('pendingStatAmount');
  const deptFilter = document.getElementById('pendingDeptFilter');
  const searchInput = document.getElementById('pendingSearchInput');

  if (!tbody) return;

  if (!cache || !cache.entries) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px;"><div class="loader-inner" style="margin:20px auto;"></div>กำลังโหลดข้อมูล...</td></tr>';
    return;
  }

  // หลักการ: column B (plan) ว่าง = รออนุมัติแผน แสดงทั้งหมด
  let items = cache.entries.filter(e =>
    e.id && String(e.plan || '').trim() === ''
  );

  // === DEBUG: แสดงใน console และ UI ===
  console.log('[PendingPlan] cache.entries total:', cache.entries.length);
  console.log('[PendingPlan] items with empty plan:', items.length);
  if (cache.entries.length > 0) {
    const sample = cache.entries.slice(0, 5);
    sample.forEach(e => console.log(`  id=${e.id} plan=[${JSON.stringify(e.plan)}] type=${typeof e.plan}`));
  }

  // แสดง diagnostic ใน UI ถ้าไม่มีรายการ
  if (items.length === 0 && cache.entries.length > 0) {
    const planSample = cache.entries.slice(0, 10).map(e =>
      `#${e.id}: plan=[${JSON.stringify(e.plan)}]`
    ).join('<br>');
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:left; padding:20px; font-size:12px; background:#fef9c3; border:1px solid #fde68a;">
      <b>🔍 Debug:</b> พบ entries ทั้งหมด ${cache.entries.length} รายการ แต่ไม่มีที่ plan ว่าง<br>
      <b>ตัวอย่าง 10 รายการแรก:</b><br>${planSample}<br><br>
      <i>กรุณาดู Console (F12) เพื่อข้อมูลเพิ่มเติม</i>
    </td></tr>`;
    if (statCount) statCount.textContent = '0 รายการ';
    if (statAmount) statAmount.textContent = '0.00 บาท';
    return;
  }

  // Populate dept filter — ดึงจาก items ทั้งหมดที่ col B ว่าง
  if (deptFilter) {
    const depts = [...new Set(
      cache.entries
        .filter(e => e.id && String(e.plan || '').trim() === '')
        .map(e => e.dept).filter(Boolean)
    )].sort();
    const prevDept = deptFilter.value;
    deptFilter.innerHTML = '<option value="">ทุกฝ่าย</option>' +
      depts.map(d => `<option value="${d}">${d}</option>`).join('');
    if (prevDept) deptFilter.value = prevDept;
  }

  // Apply dept filter
  const selectedDept = deptFilter ? deptFilter.value : '';
  if (selectedDept) {
    items = items.filter(e => e.dept === selectedDept);
  }

  // Apply search filter
  const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
  if (q) {
    items = items.filter(e =>
      (e.id && e.id.toString().toLowerCase().includes(q)) ||
      (e.refNo && e.refNo.toString().toLowerCase().includes(q)) ||
      (e.name && e.name.toString().toLowerCase().includes(q)) ||
      (e.dept && e.dept.toString().toLowerCase().includes(q)) ||
      (e.desc && e.desc.toString().toLowerCase().includes(q)) ||
      (e.catCode && e.catCode.toString().toLowerCase().includes(q))
    );
  }

  // Sort: newest first (by ID descending as proxy)
  items = items.slice().sort((a, b) => {
    const da = new Date(a.date || 0).getTime();
    const db = new Date(b.date || 0).getTime();
    return db - da || (Number(b.id) - Number(a.id));
  });

  // Update stats
  const totalAmt = items.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  if (statCount) statCount.textContent = items.length + ' รายการ';
  if (statAmount) statAmount.textContent = totalAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';

  if (items.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:48px; color:#6b7280;">' +
      '<span class="material-symbols-outlined" style="font-size:48px; display:block; margin-bottom:12px; opacity:0.3;">hourglass_empty</span>' +
      'ไม่มีรายการรออนุมัติแผนงาน</td></tr>';
    return;
  }

  const planOptions = (cache.plans || []).map(p =>
    `<option value="${p.shortName}">${p.shortName}${p.fullName ? ' — ' + p.fullName : ''}</option>`
  ).join('');

  tbody.innerHTML = items.map(e => {
    const amt = Number(e.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const isPO = (e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO');
    const rowStyle = isPO ? 'background:#fffbeb;' : '';

    return `<tr style="cursor:pointer; transition:background 0.15s; ${rowStyle}"
        onmouseover="this.style.background='#f0f9ff'"
        onmouseout="this.style.background='${isPO ? '#fffbeb' : ''}'">
      <td style="text-align:center; width:40px;">
        <input type="checkbox" class="row-checkbox" data-amt="${e.amount || 0}"
          onchange="updateSelectedTotal()">
      </td>
      <td style="text-align:center; font-weight:800; color:var(--primary); font-size:13px;">#${e.id}</td>
      <td style="text-align:center; font-size:12px; white-space:nowrap;">${formatThaiDate(e.date)}</td>
      <td style="text-align:center;">
        <span style="background:var(--primary-light); color:var(--primary-dark); padding:2px 6px; border-radius:6px; font-size:10px; font-weight:700;">
          ${e.catCode || '-'}
        </span>
      </td>
      <td style="font-size:12px; text-align:center;">${e.refNo || '-'}</td>
      <td style="font-size:12px; font-weight:600;">${e.name || '-'}</td>
      <td style="text-align:center;">
        <span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:700;">${e.dept || '-'}</span>
      </td>
      <td style="font-size:12px; color:#374151; max-width:300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${(e.desc || '').replace(/"/g, '&quot;')}">
        ${isPO ? '<span style="background:#d97706; color:white; font-size:9px; font-weight:800; padding:1px 5px; border-radius:4px; margin-right:4px;">PO</span>' : ''}
        ${e.desc || '-'}
      </td>
      <td style="text-align:right; font-weight:800; font-size:13px; color:#0f172a; white-space:nowrap;">${amt} ฿</td>
      <td style="text-align:center; width:135px;">
        <select onchange="quickAssignPlan(this, '${e.id}')"
          style="width:100%; padding:4px 6px; border:1px solid #d97706; border-radius:6px; font-size:11px; background:#fffbeb; color:#92400e; font-weight:700; cursor:pointer;"
          title="เลือกแผนงานเพื่ออนุมัติ">
          <option value="">⏳ รออนุมัติ</option>
          ${planOptions}
        </select>
      </td>
    </tr>`;
  }).join('');

  // Update sidebar badge
  updatePendingBadge();
}

async function quickAssignPlan(selectEl, id) {
  const plan = selectEl.value;
  if (!plan) return;

  const e = cache && cache.entries ? cache.entries.find(x => x.id == id) : null;
  if (!e) return;

  const catOptions = getCategoryOptionsHTML(e.catCode);

  const result = await Swal.fire({
    title: `อนุมัติจัดเข้าแผน "${plan}"`,
    html: `
      <div style="font-size:12px; background:#f8fafc; padding:12px; border-radius:8px; margin-bottom:16px; border:1px solid #e2e8f0; text-align:left; line-height:1.7;">
        <div><b>รายการ ID:</b> #${id}</div>
        <div><b>เลขหนังสือ:</b> ${e.refNo || '-'}</div>
        <div><b>ชื่อผู้เบิก:</b> ${e.name || '-'}</div>
        <div><b>จำนวนเงิน:</b> ${Number(e.amount || 0).toLocaleString()} บาท</div>
      </div>
      <div style="text-align:left;">
        <label style="display:block; font-size:12px; font-weight:700; margin-bottom:4px; color:#1e293b;">หมวดงบประมาณ (ระบุ/แก้ไข):</label>
        <select id="swal-cat-quick" style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:8px; font-size:13px; font-family:inherit; outline:none;">
          ${catOptions}
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: '✅ อนุมัติ',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#d97706',
    preConfirm: () => {
      return { catCode: document.getElementById('swal-cat-quick').value };
    }
  });

  if (result.isConfirmed) {
    const { catCode } = result.value;
    const r = await call('submitUpdate', { id: id, plan: plan, catCode: catCode });
    if (r && r.success) {
      if (cache && cache.entries) {
        const item = cache.entries.find(x => x.id == id);
        if (item) { item.plan = plan; item.catCode = catCode; }
      }
      Swal.fire({
        toast: true, position: 'top-end', icon: 'success',
        title: `จัดรายการ #${id} เข้าแผน "${plan}" เรียบร้อย`,
        showConfirmButton: false, timer: 2000
      });
      renderPendingPlanView();
      updatePendingBadge();
    }
  } else {
    // Reset select back to blank if cancelled
    selectEl.value = '';
  }
}

// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateAdminUI === 'function') updateAdminUI();
});
