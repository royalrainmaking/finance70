// =====================================================================
// รายจ่ายอื่น (เดินทางไปต่างประเทศ)
// เงินที่ได้รับจัดสรร / กันเงิน / ตัดยอด / ตัดยอดเพิ่ม / หักล้าง / GF
// ข้อมูลอยู่ในชีต ต่างประเทศ (ดู MainFinancial.gs: foreign_*)
//
// หลักคำนวณ (เหมือนระบบกันเงินหลัก):
//   - กันเงินที่ยังไม่ตัดยอด = ยอดกันค้าง (หักล้างทำให้ยอดกันค้างลดลง)
//   - เมื่อตัดยอดแล้ว ยอดกันของรายการนั้นไม่นับ ให้นับยอดตัดยอด (+ ตัดยอดเพิ่ม) แทน
//   - GF = ยอดตัดยอดที่บันทึกวันที่ GF แล้ว, ค้างท่อ = ตัดยอด − GF
//   - แต่ละรายการมีงบที่ได้รับจัดสรรของตัวเอง: คงเหลือ = จัดสรร − กันค้าง − ตัดยอด
// =====================================================================
(function () {
  let ftRows = [];
  let ftLoaded = false;

  const fmt = n => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const thDate = v => (typeof formatThaiDate === 'function' ? formatThaiDate(v) : (v || '-'));

  async function ftLoad() {
    try {
      Swal.fire({ title: 'กำลังโหลดข้อมูล...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const res = await fetch(`${API}?action=foreign_getData&t=${Date.now()}`);
      const json = await res.json();
      Swal.close();
      if (json.status !== 'success') throw new Error(json.message || json.error || 'โหลดข้อมูลไม่สำเร็จ');
      ftRows = json.data || [];
      ftLoaded = true;
      ftRender();
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', 'โหลดข้อมูลรายจ่ายต่างประเทศไม่ได้: ' + e.message, 'error');
    }
  }

  async function ftPost(action, data, okText) {
    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch(API, { method: 'POST', body: JSON.stringify({ action, data }) });
      const json = await res.json();
      if (json.status !== 'success') throw new Error(json.message || json.error || 'บันทึกไม่สำเร็จ');
      await ftLoad();
      if (typeof loadForeignForSpending === 'function') loadForeignForSpending(true);
      if (okText) Swal.fire({ icon: 'success', title: okText, timer: 1200, showConfirmButton: false });
      return true;
    } catch (e) {
      Swal.fire('เกิดข้อผิดพลาด', e.message, 'error');
      return false;
    }
  }

  // ---------- calculation ----------
  function ftCompute() {
    const reserves = ftRows.filter(r => r.type === 'กันเงิน' && !r.parentId);
    const kids = id => ftRows.filter(r => r.parentId === id);

    const items = reserves.map(r => {
      const ch = kids(r.id);
      const offset = ch.filter(c => c.type === 'หักล้าง').reduce((a, c) => a + Math.abs(c.reserve), 0);
      // ยอดกันเงิน = กันตอนสร้างรายการ + กันเงินที่ทำภายหลัง (รายการย่อยประเภท "กันเงิน")
      const reserveSum = r.reserve + ch.filter(c => c.type === 'กันเงิน').reduce((a, c) => a + c.reserve, 0);
      const deductRows = ch.filter(c => c.type === 'ตัดยอด' || c.type === 'ตัดยอดเพิ่ม');
      const deduct = deductRows.reduce((a, c) => a + c.deduct, 0);
      const gf = deductRows.filter(c => c.gfDate).reduce((a, c) => a + c.deduct, 0);
      const closed = ch.some(c => c.type === 'ตัดยอด');
      const outstanding = closed ? 0 : Math.max(0, reserveSum - offset);
      const remain = r.allocation - outstanding - deduct;
      return { ...r, reserveSum, children: ch, offset, deduct, gf, closed, outstanding, remain };
    });

    const t = {
      allocation: items.reduce((a, i) => a + i.allocation, 0),
      reserve: items.reduce((a, i) => a + i.reserveSum, 0),
      outstanding: items.reduce((a, i) => a + i.outstanding, 0),
      offset: items.reduce((a, i) => a + i.offset, 0),
      deduct: items.reduce((a, i) => a + i.deduct, 0),
      gf: items.reduce((a, i) => a + i.gf, 0)
    };
    t.pipeline = t.deduct - t.gf;
    t.remain = t.allocation - t.outstanding - t.deduct;
    return { items, t };
  }

  // ---------- render ----------
  function ftRender() {
    const root = document.getElementById('foreign-root');
    if (!root) return;
    const { items, t } = ftCompute();

    const card = (label, val, cls, sub) => `
      <div class="ft-card ${cls}">
        <div class="ft-card-label">${label}</div>
        <div class="ft-card-value">${fmt(val)}</div>
        ${sub ? `<div class="ft-card-sub">${sub}</div>` : ''}
      </div>`;

    const status = i => i.closed
      ? (i.deduct && i.gf >= i.deduct ? '<span class="ft-tag ok">GF แล้ว</span>' : '<span class="ft-tag done">ตัดยอดแล้ว</span>')
      : (i.reserveSum ? '<span class="ft-tag wait">กันเงิน</span>' : '<span class="ft-tag">ยังไม่กันเงิน</span>');

    const childRow = c => {
      const canGF = (c.type === 'ตัดยอด' || c.type === 'ตัดยอดเพิ่ม');
      const resAmt = c.type === 'หักล้าง' ? -Math.abs(c.reserve) : (c.type === 'กันเงิน' ? c.reserve : null);
      const dedAmt = canGF ? c.deduct : null;
      return `
        <tr class="ft-child">
          <td class="id">#${esc(c.id)}</td>
          <td>${thDate(c.date)}</td>
          <td colspan="2"><span class="ft-type">${esc(c.type)}</span> ${esc(c.liqRefNo || c.refNo) || ''}</td>
          <td>${esc(c.desc) || ''}</td>
          <td class="num"></td>
          <td class="num ${resAmt < 0 ? 'neg' : ''}">${resAmt === null ? '' : fmt(resAmt)}</td>
          <td class="num">${dedAmt === null ? '' : fmt(dedAmt)}</td>
          <td class="num"></td>
          <td>${canGF ? (c.gfDate ? `<span class="ft-tag ok">GF ${thDate(c.gfDate)}</span>` : '<span class="ft-tag pipe">ค้างท่อ</span>') : ''}</td>
          <td class="act">
            ${canGF ? `<button class="ft-icon" title="${c.gfDate ? 'แก้ไขวันที่ GF' : 'บันทึก GF'}" onclick="ftGF('${c.id}')"><span class="material-symbols-outlined">verified</span></button>` : ''}
            <button class="ft-icon danger" title="ลบ" onclick="ftDelete('${c.id}')"><span class="material-symbols-outlined">delete</span></button>
          </td>
        </tr>`;
    };

    const itemRows = items.slice().reverse().map(i => `
      <tr class="ft-parent ${i.closed ? 'closed' : ''}">
        <td class="id">#${esc(i.id)}</td>
        <td>${thDate(i.date)}</td>
        <td>${esc(i.refNo) || '-'}</td>
        <td>${esc(i.name) || '-'}</td>
        <td>${esc(i.desc) || '-'}</td>
        <td class="num">${fmt(i.allocation)}</td>
        <td class="num">${i.reserveSum ? fmt(i.reserveSum) : '-'}</td>
        <td class="num">${i.deduct ? fmt(i.deduct) : '-'}</td>
        <td class="num ${i.remain < 0 ? 'neg' : 'pos'}">${fmt(i.remain)}</td>
        <td>${status(i)}</td>
        <td class="act">
          ${!i.closed ? `<button class="ft-btn" onclick="ftReserveMore('${i.id}')">${i.reserveSum ? 'กันเงินเพิ่ม' : 'กันเงิน'}</button>` : ''}
          ${!i.closed ? `<button class="ft-btn" onclick="ftDeduct('${i.id}', 'ตัดยอด')">ตัดยอด</button>` : ''}
          <button class="ft-btn ghost" onclick="ftDeduct('${i.id}', 'ตัดยอดเพิ่ม')">ตัดยอดเพิ่ม</button>
          ${!i.closed ? `<button class="ft-btn ghost" onclick="ftOffset('${i.id}')">หักล้าง</button>` : ''}
          <button class="ft-icon" title="แก้ไขรายการ / งบจัดสรร" onclick="ftEdit('${i.id}')"><span class="material-symbols-outlined">edit</span></button>
          <button class="ft-icon danger" title="ลบรายการและรายการย่อย" onclick="ftDelete('${i.id}')"><span class="material-symbols-outlined">delete</span></button>
        </td>
      </tr>
      ${i.children.map(childRow).join('')}`).join('')
      || `<tr><td colspan="11" class="empty">ยังไม่มีรายการ</td></tr>`;

    root.innerHTML = `
      <div class="ft-head">
        <div>
          <h2>รายจ่ายอื่น — เดินทางไปต่างประเทศ</h2>
          <div class="ft-subtitle">กันเงิน · ตัดยอด · ตัดยอดเพิ่ม · หักล้าง · GF</div>
        </div>
        <div class="ft-head-actions">
          <button class="ft-btn ghost" onclick="ftReload()"><span class="material-symbols-outlined">refresh</span>โหลดใหม่</button>
          <button class="ft-btn" onclick="ftReserve()"><span class="material-symbols-outlined">add</span>เพิ่มรายการ (งบจัดสรร)</button>
        </div>
      </div>

      <div class="ft-cards">
        ${card('งบที่ได้รับจัดสรร (รวมทุกรายการ)', t.allocation, 'c-alloc')}
        ${card('กันเงิน (คงค้าง)', t.outstanding, 'c-res', `กันทั้งหมด ${fmt(t.reserve)} · หักล้าง ${fmt(t.offset)}`)}
        ${card('ตัดยอด (รวมตัดยอดเพิ่ม)', t.deduct, 'c-ded')}
        ${card('GF แล้ว', t.gf, 'c-gf')}
        ${card('ค้างท่อ', t.pipeline, 'c-pipe')}
        ${card('คงเหลือ', t.remain, t.remain < 0 ? 'c-neg' : 'c-remain')}
      </div>

      <div class="ft-box">
        <div class="ft-box-title">รายการ</div>
        <div class="ft-scroll">
          <table class="ft-table">
            <colgroup><col style="width:56px"><col style="width:84px"><col style="width:110px"><col style="width:110px"><col style="min-width:180px"><col style="width:105px"><col style="width:105px"><col style="width:105px"><col style="width:105px"><col style="width:92px"><col style="width:190px"></colgroup>
            <thead><tr>
              <th>ID</th><th>วันที่</th><th>เลขที่หนังสือ</th><th>ผู้เบิก</th><th>รายละเอียด</th>
              <th class="num">งบจัดสรร</th><th class="num">กันเงิน</th><th class="num">ตัดยอด</th><th class="num">คงเหลือ</th><th>สถานะ</th><th></th>
            </tr></thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>
      </div>
`;
  }

  // ---------- forms ----------
  const field = (id, label, type = 'text', value = '', extra = '') =>
    `<label class="ft-f"><span>${label}</span><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const formHtml = parts => `<div class="ft-form">${parts.join('')}</div>`;
  const val = id => (document.getElementById(id) || {}).value || '';
  const num = id => parseFloat(val(id)) || 0;

  window.ftReserve = async () => {
    const r = await Swal.fire({
      title: 'เพิ่มรายการ — เดินทางไปต่างประเทศ',
      html: formHtml([
        field('ft-date', 'วันที่', 'date', today()),
        field('ft-ref', 'เลขที่หนังสือ'),
        field('ft-name', 'ผู้เบิก / ผู้เดินทาง'),
        field('ft-desc', 'รายละเอียด (ภารกิจ / ประเทศ)'),
        field('ft-alloc', 'งบที่ได้รับจัดสรร (บาท)', 'number', '', 'step="0.01" min="0"'),
        field('ft-amt', 'จำนวนเงินกัน (บาท) — เว้นว่างได้ถ้ายังไม่กัน', 'number', '', 'step="0.01" min="0"')
      ]),
      showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', focusConfirm: false,
      preConfirm: () => (num('ft-alloc') > 0 || num('ft-amt') > 0) ? true : Swal.showValidationMessage('กรุณาระบุงบจัดสรรหรือจำนวนเงินกัน')
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_add', { type: 'กันเงิน', date: val('ft-date'), refNo: val('ft-ref'), name: val('ft-name'), desc: val('ft-desc'), allocation: num('ft-alloc'), reserve: num('ft-amt') }, 'บันทึกแล้ว');
  };

  window.ftEdit = async id => {
    const it = ftRows.find(r => r.id === id);
    if (!it) return;
    const r = await Swal.fire({
      title: `แก้ไขรายการ #${id}`,
      html: formHtml([
        field('ft-date', 'วันที่', 'date', it.date),
        field('ft-ref', 'เลขที่หนังสือ', 'text', it.refNo),
        field('ft-name', 'ผู้เบิก / ผู้เดินทาง', 'text', it.name),
        field('ft-desc', 'รายละเอียด (ภารกิจ / ประเทศ)', 'text', it.desc),
        field('ft-alloc', 'งบที่ได้รับจัดสรร (บาท)', 'number', it.allocation || '', 'step="0.01" min="0"'),
        field('ft-amt', 'จำนวนเงินกัน (บาท)', 'number', it.reserve || '', 'step="0.01" min="0"')
      ]),
      showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', focusConfirm: false
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_update', { id, date: val('ft-date'), refNo: val('ft-ref'), name: val('ft-name'), desc: val('ft-desc'), allocation: num('ft-alloc'), reserve: num('ft-amt') }, 'แก้ไขแล้ว');
  };

  window.ftDeduct = async (parentId, type) => {
    const item = ftCompute().items.find(i => i.id === parentId);
    if (!item) return;
    const suggest = type === 'ตัดยอด' ? Math.max(0, item.reserveSum - item.offset) : '';
    const r = await Swal.fire({
      title: `${type} — รายการ #${parentId}`,
      html: `<div class="ft-note">${esc(item.desc || item.name || '')}<br>กันเงิน ${fmt(item.reserveSum)} บาท${item.deduct ? ` · ตัดยอดแล้ว ${fmt(item.deduct)} บาท` : ''}</div>` +
        formHtml([
          field('ft-date', 'วันที่', 'date', today()),
          field('ft-liq', 'เลขที่ตัดยอด / เลขที่หนังสือ'),
          field('ft-desc', 'หมายเหตุ'),
          field('ft-amt', 'จำนวนเงินเบิกจ่าย (บาท)', 'number', suggest, 'step="0.01" min="0"'),
          field('ft-gf', 'วันที่ GF (ถ้ามี)', 'date', '')
        ]),
      showCancelButton: true, confirmButtonText: type, cancelButtonText: 'ยกเลิก', focusConfirm: false,
      preConfirm: () => num('ft-amt') > 0 ? true : Swal.showValidationMessage('กรุณาระบุจำนวนเงิน')
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_add', { parentId, type, date: val('ft-date'), liqRefNo: val('ft-liq'), desc: val('ft-desc'), deduct: num('ft-amt'), gfDate: val('ft-gf') }, `${type}แล้ว`);
  };

  window.ftReserveMore = async parentId => {
    const item = ftCompute().items.find(i => i.id === parentId);
    if (!item) return;
    const avail = Math.max(0, item.remain);
    const title = item.reserveSum ? 'กันเงินเพิ่ม' : 'กันเงิน';
    const r = await Swal.fire({
      title: `${title} — รายการ #${parentId}`,
      html: `<div class="ft-note">${esc(item.desc || item.name || '')}<br>งบจัดสรร ${fmt(item.allocation)} · กันแล้ว ${fmt(item.reserveSum)} · คงเหลือให้กันได้ ${fmt(avail)} บาท</div>` +
        formHtml([
          field('ft-date', 'วันที่', 'date', today()),
          field('ft-ref', 'เลขที่หนังสือขอกันเงิน'),
          field('ft-desc', 'หมายเหตุ'),
          field('ft-amt', 'จำนวนเงินกัน (บาท)', 'number', avail || '', 'step="0.01" min="0"')
        ]),
      showCancelButton: true, confirmButtonText: title, cancelButtonText: 'ยกเลิก', focusConfirm: false,
      preConfirm: () => num('ft-amt') > 0 ? true : Swal.showValidationMessage('กรุณาระบุจำนวนเงินกัน')
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_add', { parentId, type: 'กันเงิน', date: val('ft-date'), refNo: val('ft-ref'), desc: val('ft-desc'), reserve: num('ft-amt') }, `${title}แล้ว`);
  };

  window.ftOffset = async parentId => {
    const item = ftCompute().items.find(i => i.id === parentId);
    if (!item) return;
    const r = await Swal.fire({
      title: `หักล้าง — รายการ #${parentId}`,
      html: `<div class="ft-note">ยอดกันคงค้าง ${fmt(item.outstanding)} บาท</div>` + formHtml([
        field('ft-date', 'วันที่', 'date', today()),
        field('ft-liq', 'เลขที่หนังสือ'),
        field('ft-desc', 'หมายเหตุ', 'text', 'หักล้างเงินยืม'),
        field('ft-amt', 'จำนวนเงินหักล้าง (บาท)', 'number', '', 'step="0.01" min="0"')
      ]),
      showCancelButton: true, confirmButtonText: 'หักล้าง', cancelButtonText: 'ยกเลิก', focusConfirm: false,
      preConfirm: () => num('ft-amt') > 0 ? true : Swal.showValidationMessage('กรุณาระบุจำนวนเงิน')
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_add', { parentId, type: 'หักล้าง', date: val('ft-date'), liqRefNo: val('ft-liq'), desc: val('ft-desc'), reserve: -Math.abs(num('ft-amt')) }, 'หักล้างแล้ว');
  };

  window.ftGF = async id => {
    const row = ftRows.find(r => r.id === id);
    const r = await Swal.fire({
      title: `บันทึก GF — #${id}`,
      html: formHtml([field('ft-gf', 'วันที่ GF (เว้นว่างเพื่อยกเลิก)', 'date', (row && row.gfDate) || today())]),
      showCancelButton: true, confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก', focusConfirm: false
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_update', { id, gfDate: val('ft-gf') }, 'บันทึก GF แล้ว');
  };

  window.ftDelete = async id => {
    const hasKids = ftRows.some(r => r.parentId === id);
    const r = await Swal.fire({
      icon: 'warning', title: `ลบรายการ #${id}?`,
      text: hasKids ? 'รายการย่อย (ตัดยอด/หักล้าง) ของรายการนี้จะถูกลบด้วย' : 'ลบแล้วกู้คืนไม่ได้',
      showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#dc2626'
    });
    if (!r.isConfirmed) return;
    ftPost('foreign_delete', { id }, 'ลบแล้ว');
  };

  window.ftReload = () => ftLoad();

  window.foreign_init = function () {
    const planBar = document.querySelector('.plan-bar');
    if (planBar) planBar.style.display = 'none';
    const titleEl = document.getElementById('viewTitle');
    if (titleEl) titleEl.textContent = 'รายจ่ายอื่น (ต่างประเทศ)';
    if (!ftLoaded) ftLoad(); else ftRender();
  };
})();
