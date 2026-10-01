#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Make Pending Plan view table match the main 'All Entries Table' 100% in design, columns, and styling"""

# ---------------------------------------------------------
# 1. UPDATE index.html
# ---------------------------------------------------------
with open('index.html', 'rb') as f:
    html = f.read().decode('utf-8-sig')

old_pending_table = '''            <table class="data-table">
              <thead>
                <tr style="background:#d97706; color:white;">
                  <th style="width:55px; text-align:center;">ID</th>
                  <th style="width:105px; text-align:center;">เลขหนังสือ</th>
                  <th style="width:85px; text-align:center;">วันที่</th>
                  <th style="width:60px; text-align:center;">ฝ่าย</th>
                  <th style="width:130px;">ชื่อผู้เบิก/ยืม</th>
                  <th style="width:130px;">หมวดงบประมาณ</th>
                  <th style="width:auto; min-width:350px; text-align:left;">รายละเอียดโครงการ (ข้อมูลทั้งหมดเพื่อการพิจารณาแผน)</th>
                  <th style="width:115px; text-align:right;">จำนวนเงิน (บาท)</th>
                  <th style="width:125px; text-align:center;">การจัดการ</th>
                </tr>
              </thead>
              <tbody id="pendingPlanTableBody">
              </tbody>
            </table>'''

new_pending_table = '''            <table class="data-table" style="table-layout: fixed; width: 100%;">
              <thead>
                <tr>
                  <th style="width:40px; text-align:center;"><input type="checkbox" id="selectAllPending" onchange="toggleAllRows(this.checked)"></th>
                  <th style="width:70px; text-align:center;">ID</th>
                  <th style="width:90px; text-align:center;">วันที่</th>
                  <th style="width:70px; text-align:center;">หมวด</th>
                  <th style="width:110px; text-align:center;">เลขหนังสือ</th>
                  <th style="width:140px;">ชื่อผู้เบิก</th>
                  <th style="width:55px; text-align:center;">ฝ่าย</th>
                  <th style="width:auto;">รายการ (รายละเอียดโครงการเพื่อการพิจารณาแผน)</th>
                  <th style="width:90px; text-align:center;">เลขกันเงิน</th>
                  <th style="width:95px; text-align:right;">เงินกัน</th>
                  <th style="width:95px; text-align:right;">ตัดยอด/คืน</th>
                  <th style="width:135px; text-align:center;">การอนุมัติ / แผนงาน</th>
                </tr>
              </thead>
              <tbody id="pendingPlanTableBody">
              </tbody>
            </table>'''

html_norm = html.replace('\r\n', '\n')
old_pending_table_norm = old_pending_table.replace('\r\n', '\n')
new_pending_table_norm = new_pending_table.replace('\r\n', '\n')

if old_pending_table_norm in html_norm:
    html_norm = html_norm.replace(old_pending_table_norm, new_pending_table_norm, 1)
    with open('index.html', 'wb') as f:
        f.write(html_norm.replace('\n', '\r\n').encode('utf-8-sig'))
    print("index.html: pending plan table headers updated to match main table 100%!")
else:
    print("index.html: old_pending_table_norm not found")

# ---------------------------------------------------------
# 2. UPDATE app.js - renderPendingPlanView
# ---------------------------------------------------------
with open('app.js', 'rb') as f:
    js = f.read().decode('utf-8-sig')

old_pending_render = """      if (pendingEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:40px; color:var(--text-muted); font-size:14px;">🎉 ไม่มีรายการค้าง (รายการทั้งหมดได้รับการอนุมัติจัดเข้าแผนเรียบร้อยแล้ว)</td></tr>';
        return;
      }

      tbody.innerHTML = pendingEntries.map(e => `
        <tr oncontextmenu="selectFromTable('${e.id}', event)">
          <td style="text-align:center; font-weight:700; color:var(--primary);">${e.id}</td>
          <td style="text-align:center; font-weight:600;">${e.refNo || '-'}</td>
          <td style="text-align:center; font-size:11px;">${formatThaiDate(e.date)}</td>
          <td style="text-align:center;"><span style="background:#f1f5f9; color:#334155; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:600;">${e.dept || '-'}</span></td>
          <td style="font-weight:600;">${e.name || '-'}</td>
          <td style="font-size:12px; color:#475569;">${e.catCode || '-'}</td>
          <td style="font-size:13px; font-weight:600; color:#1e293b; line-height:1.5; white-space:normal; word-break:break-word; max-width:650px; padding:10px 14px;">
            ${((e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO')) ? '<span class="status-tag status-po" style="font-size:10px; padding:2px 6px; margin-right:6px; font-weight:800;">PO</span>' : ''}
            ${e.desc || '-'}
          </td>
          <td style="text-align:right; font-weight:700; color:#d97706;">${(parseFloat(e.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td style="text-align:center;">
            <button onclick="assignPlanForId('${e.id}')" style="background:#fffbeb; color:#92400e; border:1px solid #fde68a; padding:4px 10px; border-radius:6px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">
              <span class="material-symbols-outlined" style="font-size:15px; color:#d97706;">account_tree</span>
              <span>อนุมัติเข้าแผน</span>
            </button>
          </td>
        </tr>
      `).join('');"""

new_pending_render = """      if (pendingEntries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding:40px; color:var(--text-muted); font-size:14px;">🎉 ไม่มีรายการค้าง (รายการทั้งหมดได้รับการอนุมัติจัดเข้าแผนเรียบร้อยแล้ว)</td></tr>';
        return;
      }

      tbody.innerHTML = pendingEntries.map(e => {
        let bgStyle = "";
        const isCanc = e.colF && e.colF.toString().includes("ยกเลิก");
        if (!isCanc) {
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
          <td style="width:auto; min-width:300px; text-align:left; font-size:13px; font-weight:600; color:#1e293b; line-height:1.5; white-space:normal; word-break:break-word; padding:10px 14px;">
            ${((e.type && e.type.toString().toUpperCase() === 'PO') || (e.colF && e.colF.toString().toUpperCase() === 'PO')) ? '<span class="status-tag status-po" style="font-size:9px; padding:1px 4px; margin-right:4px;">PO</span>' : ''}
            ${e.desc || ''}
          </td>
          <td style="text-align:center; font-weight:700; color:#059669; font-size:12px;">${e.reserveNumber || '-'}</td>
          <td class="amt-col" style="color:var(--primary-dark);">${Number(e.amount || 0).toLocaleString()}</td>
          <td class="amt-col" style="color:#c2410c;">${Number(e.amountDeduct || 0).toLocaleString()}</td>
          <td style="white-space:nowrap; text-align:center; padding:6px 4px;">
            <button onclick="assignPlanForId('${e.id}')" style="background:#d97706; color:white; border:none; padding:5px 10px; border-radius:6px; font-size:11px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:4px; box-shadow:0 2px 4px rgba(217,119,6,0.2);">
              <span class="material-symbols-outlined" style="font-size:14px;">account_tree</span>
              <span>อนุมัติเข้าแผน</span>
            </button>
          </td>
        </tr>
      `;
      }).join('');"""

js_norm = js.replace('\r\n', '\n')
old_pending_render_norm = old_pending_render.replace('\r\n', '\n')
new_pending_render_norm = new_pending_render.replace('\r\n', '\n')

if old_pending_render_norm in js_norm:
    js_norm = js_norm.replace(old_pending_render_norm, new_pending_render_norm, 1)
    with open('app.js', 'wb') as f:
        f.write(js_norm.replace('\n', '\r\n').encode('utf-8-sig'))
    print("app.js: renderPendingPlanView table row design updated to match main table 100%!")
else:
    print("app.js: old_pending_render_norm not found")

print("Pending plan table redesign complete!")
