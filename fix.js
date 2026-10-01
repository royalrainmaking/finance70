const fs = require('fs');
let content = fs.readFileSync('index.html', 'utf8');

const regex = /<div id="mIcon" style="margin-bottom:20px;">[\s\S]*?<div class="nav-item" id="nav-reserve-deduct" onclick="setView\('reserve-deduct', this\)">/;

const newPart = `<div id="mIcon" style="margin-bottom:20px;">
        <span class="material-symbols-outlined" style="font-size: 80px; color: #10b981;">check_circle</span>
      </div>
      <div id="mTitle" style="font-size:24px; font-weight:800; margin-bottom:12px; color:var(--text-main);">
        ดำเนินการสำเร็จ</div>
      <div id="mBody" style="font-size:15px; color:var(--text-muted); line-height:1.6; margin-bottom:32px;">
        บันทึกข้อมูลและอัปเดตระบบเรียบร้อยแล้ว</div>
      <button class="modal-btn" style="width:100%;" onclick="closeModal()">ตกลง เข้าใจแล้ว</button>
    </div>
  </div>

  <!-- actionOverlay hidden – replaced by right-click context menu -->
  <div id="actionOverlay" style="display:none !important;">
    <div id="actionIdDisplay" style="display:none;"></div>
    <button id="btn-deduct" style="display:none;"></button>
    <button id="btn-deduct-add" style="display:none;"></button>
    <button id="btn-offset" style="display:none;"></button>
    <button id="btn-reserve-add" style="display:none;"></button>
    <button id="btn-cancel" style="display:none;"></button>
    <button id="btn-edit" style="display:none;"></button>
  </div>

  <!-- Right-click context menu -->
  <div id="rowContextMenu">
    <div class="ctx-header" id="ctxMenuId">รายการ #-</div>
    <button class="ctx-item" id="ctx-deduct" onclick="doAction('deduct')">
      <span class="material-symbols-outlined">payments</span>ตัดยอด
    </button>
    <button class="ctx-item" id="ctx-deduct-add" onclick="doAction('deduct-add')">
      <span class="material-symbols-outlined">library_add</span>ตัดยอดเพิ่ม
    </button>
    <button class="ctx-item" id="ctx-offset" onclick="doAction('offset')">
      <span class="material-symbols-outlined">sync_alt</span>หักล้าง
    </button>
    <button class="ctx-item" id="ctx-reserve-add" onclick="doAction('reserve-add')">
      <span class="material-symbols-outlined">post_add</span>กันเงินเพิ่ม
    </button>
    <button class="ctx-item" id="ctx-edit" onclick="doAction('edit')">
      <span class="material-symbols-outlined">edit_square</span>แก้ไขข้อมูล
    </button>
    <button class="ctx-item" id="ctx-set-reserve-no" onclick="doAction('set-reserve-no')">
      <span class="material-symbols-outlined">tag</span>ลงเลขกันเงิน
    </button>
    <div class="ctx-divider"></div>
    <button class="ctx-item ctx-danger" id="ctx-cancel" onclick="doAction('cancel')">
      <span class="material-symbols-outlined">cancel</span>ยกเลิกรายการ
    </button>
  </div>

  <aside class="sidebar">
    <div class="logo-container">
      <img src="Emblem_of_Department_of_Royal_Rainmaking_and_Agricultural_Aviation.png" class="logo-img" alt="Logo">
      <div class="logo-text">BUDGET FLOW PRO</div>
    </div>

    <nav class="nav-menu">
      <div class="nav-category">ศูนย์กลางข้อมูล</div>
      <div class="nav-item active" id="nav-table" onclick="setView('table', this); renderTable()">
        <span class="material-symbols-outlined">grid_on</span>
        <span>ตารางรายการทั้งหมด</span>
      </div>
      <div class="nav-item" id="nav-spending-plan" onclick="setView('spending-plan', this); renderSpendingPlan()">
        <span class="material-symbols-outlined">pie_chart</span>
        <span>แผนการใช้จ่าย</span>
      </div>
      <div class="nav-category">การจัดการงบประมาณ</div>
      <div class="nav-item" id="nav-reserve" onclick="setView('reserve', this)">
        <span class="material-symbols-outlined">add_circle</span>
        <span>กันเงินใหม่</span>
      </div>
      <div class="nav-item" id="nav-reserve-deduct" onclick="setView('reserve-deduct', this)">`;

if(regex.test(content)) {
  content = content.replace(regex, newPart);
  fs.writeFileSync('index.html', content);
  console.log('Fixed using regex!');
} else {
  console.log('Regex did not match!');
}
