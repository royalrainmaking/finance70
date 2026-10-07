
window.contract_init = function() {
    const root = document.getElementById('contracts-root');
    if(root.innerHTML.trim() === '') {
        root.innerHTML = `
        <div class="contracts-wrap">
            <div class="view-section active" id="view-dashboard">

                <div class="cm-hero">
                    <div class="cm-hero-text">
                        <div class="cm-hero-title"><i class="fa-solid fa-file-signature"></i> ระบบบริหารสัญญา</div>
                        <div class="cm-hero-sub">งบลงทุน · งบรายจ่ายอื่น · จัดหาอากาศยาน</div>
                    </div>
                    <button type="button" class="cm-add-btn" onclick="openModal()">
                        <i class="fa-solid fa-plus"></i> เพิ่มโครงการใหม่
                    </button>
                </div>

                <div
                    style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 20px; background: white; padding: 15px 20px; border-radius: 8px; border: 1px solid #e1e8ed; box-shadow: 0 2px 4px rgba(0,0,0,0.02); flex-wrap: wrap; gap: 15px;">
                    <div style="font-weight: 600; color: #2c3e50; font-size: 16px;"><i class="fa-solid fa-chart-line"
                            style="color:var(--teal)"></i> งบประมาณและการเบิกจ่ายรวม</div>
                    <div style="display:flex; gap: 15px; flex-wrap: wrap;">
                        <div style="display:flex; align-items:center;">
                            <span style="font-size:13px; color:#666; margin-right:8px; font-weight:500;">แผนงาน:</span>
                            <select id="filter-plan" onchange="handleSearch()"
                                style="padding:6px 12px; border-radius:4px; border:1px solid #ddd; font-family: Sarabun; background:#fafbfc; min-width: 220px;">
                                <option value="all">-- ทุกแผนงาน --</option>
                                <option value="การปฏิบัติการฝนหลวง">1. การปฏิบัติการฝนหลวง</option>
                                <option value="บริการด้านการบิน">2. บริการด้านการบิน</option>
                                <option value="ปฏิบัติการดัดแปรสภาพอากาศแก้ปัญหาฝุ่นละอองขนาดเล็ก">3.
                                    ปฏิบัติการดัดแปรสภาพอากาศแก้ปัญหาฝุ่นละอองขนาดเล็ก</option>
                                <option value="ปฏิบัติการดัดแปรสภาพอากาศบรรเทาความรุนแรงของพายุลูกเห็บ">4.
                                    ปฏิบัติการดัดแปรสภาพอากาศบรรเทาความรุนแรงของพายุลูกเห็บ</option>
                                <option value="จัดหาอากาศยาน">5. จัดหาอากาศยาน</option>
                            </select>
                        </div>
                        <div style="display:flex; align-items:center;">
                            <span style="font-size:13px; color:#666; margin-right:8px; font-weight:500;">รายการ:</span>
                            <select id="filter-item-type" onchange="handleSearch()"
                                style="padding:6px 12px; border-radius:4px; border:1px solid #ddd; font-family: Sarabun; background:#fafbfc; min-width: 150px;">
                                <option value="all">-- ทุกรายการ --</option>
                                <option value="งบรายจ่ายอื่น">1. งบรายจ่ายอื่น</option>
                                <option value="งบลงทุน">2. งบลงทุน</option>
                            </select>
                        </div>
                        <div style="display:flex; align-items:center;">
                            <span
                                style="font-size:13px; color:#666; margin-right:8px; font-weight:500;">วิธีจัดซื้อ:</span>
                            <select id="filter-type" onchange="handleSearch()"
                                style="padding:6px 12px; border-radius:4px; border:1px solid #ddd; font-family: Sarabun; background:#fafbfc; min-width: 120px;">
                                <option value="all">-- ทุกวิธี --</option>
                                <option value="เฉพาะเจาะจง">เฉพาะเจาะจง</option>
                                <option value="e-bidding">e-bidding</option>
                                <option value="คัดเลือก">คัดเลือก</option>
                                <option value="สอบราคา">สอบราคา</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="stats-grid">
                    <div class="stat-card teal">
                        <div class="stat-icon"><i class="fa-regular fa-folder-open"></i></div>
                        <div class="stat-title">โครงการทั้งหมด</div>
                        <div class="stat-value" id="stat-total-projects">0</div>
                    </div>
                    <div class="stat-card green">
                        <div class="stat-icon"><i class="fa-solid fa-check-circle"></i></div>
                        <div class="stat-title">วงเงินงบประมาณรวม (บาท)</div>
                        <div class="stat-value" id="stat-total-budget">0.00</div>
                    </div>
                    <div class="stat-card yellow">
                        <div class="stat-icon"><i class="fa-solid fa-file-invoice-dollar"></i></div>
                        <div class="stat-title">PO / ก่อหนี้รวม (บาท)</div>
                        <div class="stat-value" id="stat-total-po">0.00</div>
                    </div>
                    <div class="stat-card cyan">
                        <div class="stat-icon"><i class="fa-regular fa-credit-card"></i></div>
                        <div class="stat-title">เบิกจ่ายแล้ว (บาท)</div>
                        <div class="stat-value" id="stat-total-disbursed">0.00</div>
                    </div>
                </div>

                <div class="content-box">
                    <div class="box-header">
                        <h2 class="box-title"><i class="fa-solid fa-border-all"></i> ตารางรายการโครงการ</h2>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <div class="search-box">
                                <i class="fa-solid fa-search"></i>
                                <input type="text" id="search-input" placeholder="ค้นหาโครงการ..."
                                    onkeyup="handleSearch()">
                            </div>
                            <button class="btn btn-teal" onclick="printProjectSummary()"><i
                                    class="fa-solid fa-print"></i> พิมพ์สรุปแยกหมวด</button>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="project-table">
                            <thead>
                                <tr>
                                    <th>ลำดับ</th>
                                    <th>ชื่อโครงการ</th>
                                    <th>ผู้รับจ้าง/ผู้ควบคุมงาน</th>
                                    <th>สถานะปัจจุบัน</th>
                                    <th>PO / ก่อหนี้</th>
                                    <th>กำหนดส่งมอบ</th>
                                    <th>ความคืบหน้า</th>
                                    <th style="min-width: 80px;">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody id="project-table-body">
                                <!-- Data injected via JS -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- View: Report/Details -->
            <div class="view-section" id="view-report">
                <div class="content-box report-box">
                    <div class="box-header report-header">
                        <h2 class="box-title"><i class="fa-solid fa-file-lines"></i>
                            รายงานแผนการดำเนินงานและการใช้จ่ายงบลงทุน<br><small
                                class="sub-title">ประจำปีงบประมาณ</small></h2>
                        <button class="btn btn-teal" onclick="openModal()"><i class="fa-solid fa-plus"></i>
                            เพิ่มโครงการใหม่</button>
                    </div>

                    <div class="report-details-card" id="report-content" style="display: none;">
                        <div class="card-header-actions">
                            <div class="badges">
                                <span class="badge teal-badge" id="r-id">ลำดับที่ -</span>
                                <span class="badge outline-badge" id="r-type">-</span>
                                <span class="badge outline-badge" id="r-contract-no"
                                    style="display:none; color:#c2185b; border-color:#f48fb1; background:#fce4ec;">เลขที่สัญญา:
                                    -</span>
                            </div>
                            <div style="display: flex; gap: 10px;">
                                <button class="btn btn-outline" onclick="openEditModal()"><i
                                        class="fa-solid fa-pen"></i> อัปเดตข้อมูล</button>
                                <button class="btn btn-outline" style="color: #e74c3c; border-color: #f1a9a0;"
                                    onclick="deleteCurrentProject()"><i class="fa-solid fa-trash"></i> ลบทิ้ง</button>
                            </div>
                        </div>

                        <h3 class="project-name" id="r-name">-</h3>

                        <div class="personnel-info">
                            <p><i class="fa-solid fa-users"></i> <span>ผู้รับจ้าง:</span> <span
                                    id="r-contractor">-</span></p>
                            <p><i class="fa-regular fa-user"></i> <span>ผู้ควบคุมงาน:</span> <span
                                    id="r-supervisor">-</span></p>
                        </div>

                        <div class="committee-info"
                            style="margin-top: 15px; margin-bottom: 20px; padding: 15px; background: #fdfdfd; border: 1px dashed #ced4da; border-radius: 6px;">
                            <div
                                style="display:flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                                <h4 style="font-size: 13px; color: #555; margin: 0;"><i
                                        class="fa-solid fa-users-gear"></i> คณะกรรมการ 3 ชุด</h4>
                                <button onclick="openCommitteeModal()"
                                    style="padding: 4px 10px; font-size: 11px; background: white; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; color: #555; transition: 0.2s;"
                                    onmouseover="this.style.background='#f0f0f0'"
                                    onmouseout="this.style.background='white'"><i class="fa-solid fa-pen"></i>
                                    จัดการรายชื่อ</button>
                            </div>
                            <div
                                style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 12px; line-height: 1.5;">
                                <div
                                    style="background: white; padding: 10px; border: 1px solid #eee; border-radius: 6px;">
                                    <strong style="color:var(--teal); display:block; margin-bottom:4px;">1. กรรมการร่าง
                                        TOR</strong><span id="r-comm-tor"
                                        style="color:#666; white-space: pre-line;">-</span>
                                </div>
                                <div
                                    style="background: white; padding: 10px; border: 1px solid #eee; border-radius: 6px;">
                                    <strong style="color:var(--teal); display:block; margin-bottom:4px;">2.
                                        กรรมการพิจารณาผล</strong><span id="r-comm-eval"
                                        style="color:#666; white-space: pre-line;">-</span>
                                </div>
                                <div
                                    style="background: white; padding: 10px; border: 1px solid #eee; border-radius: 6px;">
                                    <strong style="color:var(--teal); display:block; margin-bottom:4px;">3.
                                        กรรมการตรวจรับฯ</strong><span id="r-comm-inspect"
                                        style="color:#666; white-space: pre-line;">-</span>
                                </div>
                            </div>
                        </div>

                        <div class="progress-section">
                            <div class="progress-bar-container">
                                <div class="progress-bar" id="r-progress-bar" style="width: 0%;"></div>
                            </div>
                            <div class="progress-text" id="r-progress-text">0.0% เบิกจ่ายแล้ว</div>
                        </div>

                        <div class="budget-summary-grid">
                            <div class="budget-item">
                                <div class="budget-label">วงเงินโครงการ (บาท)</div>
                                <div class="budget-value text-dark" id="r-budget">0.00</div>
                            </div>
                            <div class="budget-item">
                                <div class="budget-label">PO / ก่อหนี้ (บาท)</div>
                                <div class="budget-value text-yellow" id="r-po">0.00</div>
                            </div>
                            <div class="budget-item">
                                <div class="budget-label">เบิกจ่าย (บาท)</div>
                                <div class="budget-value text-teal" id="r-disbursed">0.00</div>
                            </div>
                            <!-- Removed Net Balance -->
                        </div>

                        <div class="status-tracker">
                            <h4 class="section-heading"><i class="fa-regular fa-circle-check"></i>
                                สถานะการจัดซื้อจัดจ้างและก่อหนี้ผูกพัน <small
                                    style="color:var(--teal); font-size:12px; font-weight:normal; margin-left:10px;">(คลิกที่ไทม์ไลน์เพื่ออัปเดต)</small>
                            </h4>

                            <div id="contract-end-alert"
                                style="display:none; background: linear-gradient(135deg, #c2185b, #e91e63); padding: 20px; border-radius: 12px; margin-bottom: 25px; color: white; border: none; box-shadow: 0 6px 20px rgba(233, 30, 99, 0.25); text-align: center;">
                                <i class="fa-regular fa-calendar-check"
                                    style="font-size: 24px; vertical-align: middle; margin-right: 12px;"></i>
                                <span id="contract-end-text"
                                    style="font-size: 20px; font-weight: 700; letter-spacing: 0.5px; vertical-align: middle;">วันสิ้นสุดสัญญา:
                                    คำนวณอัตโนมัติ</span>
                            </div>

                            <div class="steps-container">
                                <div class="step completed interactive-step" id="step-tor"
                                    onclick="updateSingleStep('tor')">
                                    <div class="step-icon"><i class="fa-solid fa-check"></i></div>
                                    <div class="step-label">ร่าง TOR</div>
                                    <div class="step-date" id="date-tor">-</div>
                                </div>
                                <div class="step-line" id="line-1"></div>
                                <div class="step pending interactive-step" id="step-announce"
                                    onclick="updateSingleStep('announce')">
                                    <div class="step-icon">2</div>
                                    <div class="step-label">ประกาศฯ</div>
                                    <div class="step-date" id="date-announce">-</div>
                                </div>
                                <div class="step-line" id="line-2"></div>
                                <div class="step pending interactive-step" id="step-consideration"
                                    onclick="updateSingleStep('consideration')">
                                    <div class="step-icon">3</div>
                                    <div class="step-label">พิจารณาผล</div>
                                    <div class="step-date" id="date-consideration">-</div>
                                </div>
                                <div class="step-line" id="line-3"></div>
                                <div class="step pending interactive-step" id="step-appeal"
                                    onclick="updateSingleStep('appeal')">
                                    <div class="step-icon">4</div>
                                    <div class="step-label">ประกาศผู้ชนะ</div>
                                    <div class="step-date" id="date-appeal">-</div>
                                </div>
                                <div class="step-line" id="line-4"></div>
                                <div class="step pending interactive-step" id="step-waitsign"
                                    onclick="updateSingleStep('waitsign')">
                                    <div class="step-icon">5</div>
                                    <div class="step-label">สนอง</div>
                                    <div class="step-date" id="date-waitsign">-</div>
                                </div>
                                <div class="step-line" id="line-5"></div>
                                <div class="step pending interactive-step" id="step-signed"
                                    onclick="updateSingleStep('signed')">
                                    <div class="step-icon">6</div>
                                    <div class="step-label">วันครบกำหนดสัญญา</div>
                                    <div class="step-date" id="date-signed">-</div>
                                </div>
                                <div class="step-line" id="line-6"></div>
                                <div class="step pending interactive-step" id="step-inspection"
                                    onclick="updateSingleStep('inspection')">
                                    <div class="step-icon">7</div>
                                    <div class="step-label">ตรวจรับฯ</div>
                                    <div class="step-date" id="date-inspection">-</div>
                                </div>
                                <div class="step-line" id="line-7"></div>
                                <div class="step pending interactive-step" id="step-payment"
                                    onclick="updateSingleStep('payment')">
                                    <div class="step-icon">8</div>
                                    <div class="step-label">เบิกเงิน</div>
                                    <div class="step-date" id="date-payment">-</div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
                <div id="no-report-selection" style="padding: 40px; text-align: center; color: var(--text-muted);">
                    <i class="fa-regular fa-folder-open" style="font-size: 40px; margin-bottom: 15px;"></i>
                    <p>คลิกเลือกโครงการจากหน้ารายการเพื่อดูรายละเอียด</p>
                </div>
            </div>
    
<!-- Modal for Adding/Editing Project -->
    <div class="modal-overlay" id="projectModal">
        <div class="modal-content">
            <form id="projectForm" onsubmit="saveProject(event)"
                style="display: flex; flex-direction: column; overflow: hidden; min-height: 0; flex: 1;">
                <div class="modal-header">
                    <h2><i class="fa-solid fa-pen"></i> <span id="modal-title">เพิ่มโครงการใหม่</span></h2>
                    <button class="close-modal" onclick="closeModal()" type="button"><i
                            class="fa-solid fa-times"></i></button>
                </div>

                <input type="hidden" id="p-id" value="">
                <div class="modal-body">
                    <div class="form-section">
                        <h3 class="form-section-title"><i class="fa-solid fa-file-lines text-teal"></i>
                            ข้อมูลทั่วไปของโครงการ</h3>
                        <div class="form-group full-width">
                            <label>ชื่อโครงการ <span class="required">*</span></label>
                            <input type="text" id="p-name" placeholder="ระบุชื่อโครงการ..." required>
                        </div>

                        <div class="form-row" style="grid-template-columns: 2fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div class="form-group">
                                <label>แผนงาน <span class="required">*</span></label>
                                <select id="p-plan" required>
                                    <option value="การปฏิบัติการฝนหลวง">1. การปฏิบัติการฝนหลวง</option>
                                    <option value="บริการด้านการบิน">2. บริการด้านการบิน</option>
                                    <option value="ปฏิบัติการดัดแปรสภาพอากาศแก้ปัญหาฝุ่นละอองขนาดเล็ก">3.
                                        ปฏิบัติการดัดแปรสภาพอากาศแก้ปัญหาฝุ่นละอองขนาดเล็ก</option>
                                    <option value="ปฏิบัติการดัดแปรสภาพอากาศบรรเทาความรุนแรงของพายุลูกเห็บ">4.
                                        ปฏิบัติการดัดแปรสภาพอากาศบรรเทาความรุนแรงของพายุลูกเห็บ</option>
                                    <option value="จัดหาอากาศยาน">5. จัดหาอากาศยาน</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>รายการ (ประเภทงบ) <span class="required">*</span></label>
                                <select id="p-item-type" required>
                                    <option value="งบรายจ่ายอื่น">1. งบรายจ่ายอื่น</option>
                                    <option value="งบลงทุน">2. งบลงทุน</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row three-cols">
                            <div class="form-group">
                                <label>วิธีจัดซื้อจัดจ้าง</label>
                                <select id="p-type">
                                    <option value="เฉพาะเจาะจง">เฉพาะเจาะจง</option>
                                    <option value="e-bidding">e-bidding</option>
                                    <option value="คัดเลือก">คัดเลือก</option>
                                    <option value="สอบราคา">สอบราคา</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>บริษัท/ห้างหุ้นส่วนจำกัด (ผู้รับจ้าง)</label>
                                <input type="text" id="p-contractor" placeholder="ระบุชื่อผู้รับจ้าง...">
                            </div>
                            <div class="form-group">
                                <label>ผู้ควบคุมงาน</label>
                                <input type="text" id="p-supervisor" placeholder="ระบุชื่อผู้ควบคุมงาน...">
                            </div>
                            <div class="form-group">
                                <label>สัญญากี่วัน (ระยะเวลา)</label>
                                <input type="number" id="p-duration" placeholder="เช่น 120" value="0">
                            </div>
                        </div>
                    </div>

                    <div class="form-section no-bg">
                        <div class="number-badge">1</div>
                        <h3 class="form-section-title inline text-dark">งบประมาณและการเบิกจ่ายรวม</h3>
                        <div class="form-row three-cols mt-3">
                            <div class="form-group">
                                <label>งบที่ได้รับจัดสรร</label>
                                <input type="number" step="0.01" id="p-allocated" value="0">
                            </div>
                        </div>
                        <div class="form-row three-cols mt-3">
                            <div class="form-group">
                                <label>วงเงินโครงการ (1) <small style="font-weight:400;color:#888;">ใช้เป็นเงินกันจนกว่าจะมี PO</small></label>
                                <input type="number" step="0.01" id="p-budget" value="0">
                            </div>
                            <div class="form-group">
                                <label>PO (2)</label>
                                <input type="number" step="0.01" id="p-po" value="0">
                            </div>
                            <div class="form-group">
                                <label>เบิกจ่าย (3)</label>
                                <input type="number" step="0.01" id="p-disbursed" value="0" class="text-teal">
                            </div>
                        </div>
                        <div class="form-row three-cols mt-3">
                            <div class="form-group">
                                <label>เลขตัดยอด</label>
                                <input type="text" id="p-gfref" placeholder="เช่น 69-05-00033">
                            </div>
                            <div class="form-group">
                                <label>วันที่ GF <small style="font-weight:400;color:#888;">ระบบอัปเดต GF เติมให้อัตโนมัติ</small></label>
                                <input type="text" id="p-gfdate" placeholder="เช่น 15/01/2569">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-outline" onclick="closeModal()">ยกเลิก</button>
                    <button type="submit" class="btn btn-teal"><i class="fa-solid fa-check-circle"></i>
                        บันทึกและอัปเดต</button>
                </div>
            </form>
        </div>
    </div>
    </div>

    <!-- Scripts -->
    
        </div>
        `;
        
        document.getElementById('view-dashboard').style.display = 'block';
        document.getElementById('view-report').style.display = 'none';

        if(typeof initStepValidation === 'function') initStepValidation();
        fetchProjects();
    }
};

window.contract_switchView = function(viewName) {
    document.querySelectorAll('#view-contracts .view-section').forEach(section => section.style.display = 'none');
    
    if (viewName === 'dashboard') {
        const viewDashboard = document.getElementById('view-dashboard');
        if (viewDashboard) viewDashboard.style.display = 'block';
        renderDashboard();
    } else if (viewName === 'report') {
        const viewReport = document.getElementById('view-report');
        if (viewReport) viewReport.style.display = 'block';
        renderReport();
    }
};

// ----------------------------------------------------
// ระบบจัดซื้อจัดจ้าง - Client Side Logic (เชื่อมต่อ Google Apps Script)
// ----------------------------------------------------

// คุณต้องนำ URL ของ Web App เปลี่ยนตรงนี้ หลังจาก Deploy ใน Google Apps Script
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzl1hh0siZl5fAUBlG-_7BGzsC7s992Q35j1iVNBgANrXiiAZ8y03XC1NOt7UyS3cyO/exec';

let projects = [];
let selectedProjectId = null;

const statusSteps = ['s-tor-date', 's-announce-date', 's-consideration-date', 's-appeal-date', 's-waitsign-date', 's-signed-date'];

function initStepValidation() {
    statusSteps.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', checkStatusStepsSequence);
    });
}

function checkStatusStepsSequence() {
    let allowNext = true;
    for (let i = 0; i < statusSteps.length; i++) {
        const id = statusSteps[i];
        const dateInput = document.getElementById(id);
        // Note inputs are typically next to date inputs, derive id
        const noteInput = document.getElementById(id.replace('-date', '-note'));

        if (!dateInput) continue;

        if (i === 0) {
            dateInput.disabled = false;
            if (noteInput) noteInput.disabled = false;
        } else {
            dateInput.disabled = !allowNext;
            if (noteInput) noteInput.disabled = !allowNext;

            if (dateInput.disabled) {
                dateInput.value = "";
                if (noteInput) noteInput.value = "";
            }
        }

        const val = dateInput.value.trim();
        allowNext = allowNext && val !== "" && !val.includes("รอ");
    }
}



// API Functions

async function fetchProjects() {
    if (typeof API === 'undefined') {
        Swal.fire('ข้อผิดพลาด', 'ไม่พบ API Endpoint ในระบบ', 'error');
        return;
    }
    try {
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const response = await fetch(`${API}?action=getContracts`);
        const json = await response.json();

        if (json.status === 'success') {
            projects = json.data.map(p => {
                p.dates = p.dates || {};
                p.notes = p.notes || {};
                p.dates.inspection = (p.notes && p.notes.date_inspection) ? p.notes.date_inspection : '';
                p.dates.payment = (p.notes && p.notes.date_payment) ? p.notes.date_payment : '';
                return p;
            });
            renderDashboard();
            if (document.getElementById('view-report') && document.getElementById('view-report').style.display !== 'none') renderReport();
            Swal.close();
        } else {
            Swal.fire('เกิดข้อผิดพลาด', json.message || 'โหลดข้อมูลล้มเหลว', 'error');
        }
    } catch (e) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้ ' + e.message, 'error');
    }
}

async function apiSaveProject(projectData) {
    if (typeof call === 'function') {
        Swal.fire({ title: 'กำลังบันทึกข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const res = await call('saveContract', projectData);
        if (res && res.status === 'success') { if (typeof loadContractsForSpending === 'function') loadContractsForSpending(true); return true; }
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
        return false;
    }
    return false;
}

async function apiDeleteProject(id) {
    if (typeof call === 'function') {
        Swal.fire({ title: 'กำลังลบข้อมูล...', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const res = await call('deleteContract', {id: id});
        if (res && res.status === 'success') { if (typeof loadContractsForSpending === 'function') loadContractsForSpending(true); return true; }
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        return false;
    }
    return false;
}
function switchView(viewName) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(section => section.classList.remove('active'));

    const headerActionsContainer = document.getElementById('header-actions');
    const pageTitle = document.getElementById('page-title');

    if (viewName === 'dashboard') {
        const navDashboard = document.getElementById('nav-dashboard');
        const viewDashboard = document.getElementById('view-dashboard');
        if (navDashboard) navDashboard.classList.add('active');
        if (viewDashboard) viewDashboard.classList.add('active');
        pageTitle.innerText = "ระบบจัดซื้อจัดจ้าง กองบริหารการบินเกษตร";
        headerActionsContainer.innerHTML = '';
        renderDashboard();
    } else if (viewName === 'report') {
        const navReport = document.getElementById('nav-report');
        const viewReport = document.getElementById('view-report');
        if (navReport) navReport.classList.add('active');
        if (viewReport) viewReport.classList.add('active');
        pageTitle.innerText = "รายละเอียดโครงการ / แผนการส่งมอบ";
        headerActionsContainer.innerHTML = '<button class="btn btn-teal" onclick="window.print()"><i class="fa-solid fa-print"></i> พิมพ์รายงาน</button>';
        renderReport();
    }

    // Auto-close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && sidebar.classList.contains('show')) {
            toggleSidebar();
        }
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('show');
}

const formatCurrency = (num) => Number(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function getCurrentProjectStatusHTML(p) {
    const stepNames = { payment: 'เบิกจ่ายเงินเสร็จสิ้น', inspection: 'ตรวจรับแล้ว', signed: 'วันครบกำหนดสัญญา', waitsign: 'สนอง', appeal: 'ประกาศผู้ชนะ', consideration: 'พิจารณาผลผู้ชนะ', announce: 'ประกาศจัดซื้อจัดจ้าง', tor: 'ร่าง TOR' };
    const order = ['payment', 'inspection', 'signed', 'waitsign', 'appeal', 'consideration', 'announce', 'tor'];

    let currentStepText = '<span style="color:#888;">ยังไม่เริ่มดำเนินการ</span>';
    const isStepDone = (k) => (p.dates && p.dates[k] && p.dates[k] !== '-' && !p.dates[k].includes('รอ')) || (k === 'signed' && p.notes && (p.notes.contractNo || p.notes.signed));

    // In reversed order, the first 'done' step is the current status
    // and it implies all subsequent steps in this REVERSED order (which are previous steps in time) are also done.
    for (let k of order) {
        let isDone = isStepDone(k);
        if (!isDone) {
            // Check if any step that comes AFTER this one in natural order is done
            const naturalOrder = ['tor', 'announce', 'consideration', 'appeal', 'waitsign', 'signed', 'inspection', 'payment'];
            const currentIdx = naturalOrder.indexOf(k);
            for (let i = currentIdx + 1; i < naturalOrder.length; i++) {
                if (isStepDone(naturalOrder[i])) {
                    isDone = true;
                    break;
                }
            }
        }

        if (isDone) {
            let updateVal = p.dates && p.dates[k] && p.dates[k] !== '-' && !p.dates[k].includes('รอ') ? formatThaiShort(p.dates[k]) : 'เรียบร้อย';
            // If it's step 6 and no date, show the note if exists
            if (k === 'signed' && (updateVal === 'เรียบร้อย' || !updateVal) && p.notes && p.notes.signed) {
                updateVal = p.notes.signed;
            }
            currentStepText = `<span style="color:var(--teal); font-weight:600;"><i class="fa-regular fa-circle-check"></i> ${stepNames[k]}</span><br><span style="font-size:12px; color:#666;">อัปเดต: ${updateVal}</span>`;
            break;
        }
    }

    let expiryHtml = '';
    const isSigned = isStepDone('signed');
    const isInspection = isStepDone('inspection');
    const isPayment = isStepDone('payment');
    
    if (isSigned && !isInspection && !isPayment) {
        const expStr = p.dates.signed;
        if (expStr && expStr !== '-' && !expStr.includes('รอ')) {
            const expDate = parseThaiDate(expStr);
            if (expDate) {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                expDate.setHours(0, 0, 0, 0);

                const diffTime = expDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let daysText = '';
                let bColor = '#f0fdfa', tColor = 'var(--teal)';

                if (diffDays > 0) {
                    daysText = `เหลือ ${diffDays} วัน`;
                    if (diffDays <= 30) { bColor = '#fff8e1'; tColor = '#d4a529'; }
                } else if (diffDays === 0) {
                    daysText = 'ครบกำหนดวันนี้พอดี';
                    bColor = '#fdf0cc'; tColor = '#e67e3a';
                } else {
                    daysText = `เลยกำหนด ${Math.abs(diffDays)} วัน!`;
                    bColor = '#fce4ec'; tColor = '#c2185b';
                }

                expiryHtml = `<div style="margin-top:8px; font-size:11.5px; border: 1px solid ${tColor}; background-color: ${bColor}; color: ${tColor}; padding: 4px 8px; border-radius: 4px; display:inline-block; font-weight:500; min-width: 140px;">
                    <div><i class="fa-regular fa-clock"></i> สิ้นสุด: ${formatThaiShort(expStr)}</div>
                    <div style="margin-top:2px;">&#10148; ${daysText}</div>
                </div>`;
            }
        }
    }

    return `<div style="line-height:1.4;">${currentStepText}</div>${expiryHtml}`;
}

function handleSearch() {
    renderDashboard();
}

function renderDashboard() {
    const searchInputEl = document.getElementById('search-input');
    const filterPlanEl = document.getElementById('filter-plan');
    const filterItemEl = document.getElementById('filter-item-type');
    const filterTypeEl = document.getElementById('filter-type');

    const searchTerm = searchInputEl ? searchInputEl.value : '';
    const filterPlan = filterPlanEl ? filterPlanEl.value : 'all';
    const filterItem = filterItemEl ? filterItemEl.value : 'all';
    const filterType = filterTypeEl ? filterTypeEl.value : 'all';

    let totalBudget = 0;
    let totalPO = 0;
    let totalDisbursed = 0;

    const filteredProjects = projects.filter(p => {
        const c_no = (p.notes && p.notes.contractNo) ? p.notes.contractNo.toLowerCase() : '';
        const search = searchTerm.toLowerCase();
        const matchSearch = p.name.toLowerCase().includes(search) ||
            (p.contractor && p.contractor.toLowerCase().includes(search)) ||
            c_no.includes(search);

        const pPlan = (p.notes && p.notes.plan) ? p.notes.plan : 'การปฏิบัติการฝนหลวง';
        const pItem = (p.notes && p.notes.itemType) ? p.notes.itemType : 'งบรายจ่ายอื่น';

        const matchPlan = filterPlan === 'all' || pPlan === filterPlan;
        const matchItem = filterItem === 'all' || pItem === filterItem;
        const matchType = filterType === 'all' || p.contractType === filterType;

        return matchSearch && matchPlan && matchItem && matchType;
    });

    const tbody = document.getElementById('project-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    filteredProjects.forEach((p) => {
        totalBudget += Number(p.budget);
        totalPO += Number(p.po || 0);
        totalDisbursed += Number(p.disbursed);
    });

    document.getElementById('stat-total-projects').innerText = filteredProjects.length;
    document.getElementById('stat-total-budget').innerText = formatCurrency(totalBudget);
    document.getElementById('stat-total-po').innerText = formatCurrency(totalPO);
    document.getElementById('stat-total-disbursed').innerText = formatCurrency(totalDisbursed);

    filteredProjects.forEach((p, index) => {
        const tr = document.createElement('tr');
        tr.onclick = (e) => {
            if (!e.target.closest('.icon-btn')) openProjectReport(p.id);
        };

        const contractBadge = (p.notes && p.notes.contractNo) ? `<div style="margin-top:6px; font-size:12px; color:#c2185b; border: 1px solid #f48fb1; padding: 2px 6px; border-radius: 4px; display: inline-block; background-color: #fce4ec;"><i class="fa-solid fa-file-signature"></i> สัญญาเลขที่: ${p.notes.contractNo}</div>` : '';
        const badgesHtml = `
            <div style="margin-top: 5px;">
                <span class="badge outline-badge" style="font-size:10px;">${(p.notes && p.notes.plan) ? p.notes.plan : 'การปฏิบัติการฝนหลวง'}</span>
                <span class="badge outline-badge" style="font-size:10px; border-color:#d4a529; color:#d4a529;">${(p.notes && p.notes.itemType) ? p.notes.itemType : 'งบรายจ่ายอื่น'}</span>
            </div>
        `;

        // Calculate operational progress based on steps (1-8)
        const stepsToCheck = ['tor', 'announce', 'consideration', 'appeal', 'waitsign', 'signed', 'inspection', 'payment'];
        let maxCompletedIdx = -1;
        stepsToCheck.forEach((k, i) => {
            const isActuallyDone = (p.dates && p.dates[k] && p.dates[k] !== '-' && !p.dates[k].includes('รอ'));
            const isSignedReached = (k === 'signed' && p.notes && (p.notes.contractNo || p.notes.signed));
            if (isActuallyDone || isSignedReached) {
                maxCompletedIdx = i;
            }
        });

        const completedSteps = maxCompletedIdx + 1;
        const progressPercent = (completedSteps / 8) * 100;
        const progressColor = progressPercent >= 100 ? '#8bc36a' : (progressPercent >= 50 ? '#1bb295' : '#f5965b');

        // Expiry & Deadline Calculation
        const expiryDate = parseThaiDate(p.dates.signed);
        let remainingDays = '-';
        let remainingColor = '#333';
        if (expiryDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            expiryDate.setHours(0, 0, 0, 0);
            const timeDiff = expiryDate.getTime() - today.getTime();
            remainingDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
            remainingColor = remainingDays > 7 ? '#1bb295' : (remainingDays >= 0 ? '#f5965b' : '#e74c3c');
        }

        const isCompleted = maxCompletedIdx === 7;
        if (isCompleted) tr.classList.add('row-completed');

        tr.innerHTML = `
            <td data-label="ลำดับ">${index + 1}</td>
            <td data-label="ชื่อโครงการ">
                <div style="display:flex; align-items:flex-start;">
                    <div style="flex:1;">
                        ${p.name.substring(0, 80) + (p.name.length > 80 ? '...' : '')}<br>
                        ${badgesHtml}
                        ${contractBadge}
                    </div>
                </div>
            </td>
            <td data-label="ผู้รับจ้าง/ผู้ควบคุม">
                <div class="sub-text bold">${p.contractor || '-'}</div>
                <div class="sub-text">ผู้ควบคุมงาน: ${p.supervisor || '-'}</div>
            </td>
            <td data-label="สถานะ">${getCurrentProjectStatusHTML(p)}</td>
            <td data-label="PO / ก่อหนี้" class="text-yellow">฿${formatCurrency(p.po || 0)}</td>
            <td data-label="กำหนดส่งมอบ" style="font-weight:600; text-align:center;">${expiryDate ? formatThaiShort(p.dates.signed) : '-'}</td>
            <td data-label="ความคืบหน้า">
                <div style="font-size: 11px; margin-bottom: 4px; font-weight: 600; color: ${progressColor};">${progressPercent.toFixed(1)}%</div>
                <div style="width: 80px; height: 6px; background: #eee; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${progressPercent}%; height: 100%; background: ${progressColor}; transition: width 0.4s ease;"></div>
                </div>
            </td>
            <td data-label="จัดการ">
                <button class="icon-btn" onclick="openEditModal(${p.id})" title="แก้ไข"><i class="fa-solid fa-pen"></i></button>
                <button class="icon-btn" style="color: #e74c3c; margin-left: 10px;" onclick="deleteProject(event, ${p.id})" title="ลบ"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openProjectReport(id) {
    selectedProjectId = id;
    window.contract_switchView('report');
}

function printProjectSummary() {
    const filterPlan = document.getElementById('filter-plan').value;
    const filterItem = document.getElementById('filter-item-type').value;
    const filterType = document.getElementById('filter-type').value;
    const searchVal = document.getElementById('search-input').value;

    const filtered = projects.filter(p => {
        const c_no = (p.notes && p.notes.contractNo) ? p.notes.contractNo.toLowerCase() : '';
        const search = searchVal.toLowerCase();
        const matchSearch = p.name.toLowerCase().includes(search) || (p.contractor && p.contractor.toLowerCase().includes(search)) || c_no.includes(search);
        const pPlan = (p.notes && p.notes.plan) ? p.notes.plan : 'การปฏิบัติการฝนหลวง';
        const pItem = (p.notes && p.notes.itemType) ? p.notes.itemType : 'งบรายจ่ายอื่น';
        const matchPlan = filterPlan === 'all' || pPlan === filterPlan;
        const matchItem = filterItem === 'all' || pItem === filterItem;
        const matchType = filterType === 'all' || p.contractType === filterType;
        return matchSearch && matchPlan && matchItem && matchType;
    });

    if (filtered.length === 0) {
        Swal.fire('ไม่มีข้อมูล', 'ไม่พบรายการโครงการที่จะพิมพ์', 'info');
        return;
    }

    const groups = {};
    filtered.forEach(p => {
        const plan = (p.notes && p.notes.plan) || 'ไม่ระบุแผนงาน';
        const itemType = (p.notes && p.notes.itemType) || 'ไม่ระบุแหล่งเงิน';
        if (!groups[plan]) groups[plan] = {};
        if (!groups[plan][itemType]) groups[plan][itemType] = { projects: [], budget: 0, po: 0, disbursed: 0 };
        groups[plan][itemType].projects.push(p);
        groups[plan][itemType].budget += Number(p.budget);
        groups[plan][itemType].po += Number(p.po || 0);
        groups[plan][itemType].disbursed += Number(p.disbursed);
    });

    const printWindow = window.open('', '_blank');
    const thaiDate = new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });

    let summaryHtml = '';
    for (let plan in groups) {
        summaryHtml += `<div class="group-header">${plan}</div>`;
        summaryHtml += `<div class="sc-container">`;
        for (let itemType in groups[plan]) {
            const g = groups[plan][itemType];
            summaryHtml += `
                <div class="summary-card">
                    <div class="sc-title">${itemType}</div>
                    <div class="sc-grid">
                        <div class="sc-item"><span>โครงการ:</span> <strong>${g.projects.length}</strong></div>
                        <div class="sc-item"><span>งบประมาณ:</span> <strong>${formatCurrency(g.budget)}</strong></div>
                        <div class="sc-item"><span>PO/ก่อหนี้:</span> <strong>${formatCurrency(g.po)}</strong></div>
                        <div class="sc-item"><span>เบิกจ่าย:</span> <strong style="color:#1bb295">${formatCurrency(g.disbursed)}</strong></div>
                    </div>
                </div>
            `;
        }
        summaryHtml += `</div>`;
    }

    let rowsHtml = filtered.map((p, index) => {
        const statusHtml = getCurrentProjectStatusHTML(p).replace(/<[^>]*>?/gm, '');
        const expiryDate = parseThaiDate(p.dates.signed);
        return `
            <tr>
                <td style="text-align: center;">${index + 1}</td>
                <td>${p.name} <br> <small style="color:#666;">(${(p.notes && p.notes.plan) || '-'} / ${(p.notes && p.notes.itemType) || '-'})</small></td>
                <td>${p.contractor || '-'} <br> <small>เลขสัญญา: ${(p.notes && p.notes.contractNo) || '-'}</small></td>
                <td style="text-align:center">${statusHtml}</td>
                <td style="text-align: right;">${formatCurrency(p.po || 0)}</td>
                <td style="text-align: center;">${p.duration || '-'}</td>
                <td style="text-align: center; font-weight:bold; color:#d81b60;">${expiryDate ? formatThaiShort(p.dates.signed) : '-'}</td>
            </tr>
        `;
    }).join('');

    printWindow.document.write(`
        <html>
        <head>
            <title>รายงานสรุปการดำเนินงาน - กองบริหารการบินเกษตร</title>
            <link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;700&display=swap" rel="stylesheet">
            <style>
                @page { size: landscape; margin: 10mm; }
                body { font-family: 'Sarabun', sans-serif; padding: 20px; color: #333; line-height: 1.5; font-size: 13px; }
                h1 { text-align: center; color: #1e564d; margin: 0 0 5px 0; font-size: 24px; }
                .subtitle { text-align: center; margin-bottom: 25px; font-size: 14px; color: #666; }
                
                .group-header { background: #1e564d; color: white; padding: 6px 15px; border-radius: 6px; margin: 20px 0 10px 0; font-weight: bold; font-size: 16px; }
                .sc-container { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 5px; }
                .summary-card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; min-width: 250px; flex: 1; background: #fafafa; }
                .sc-title { font-weight: bold; color: #1e564d; border-bottom: 1px solid #1bb295; padding-bottom: 4px; margin-bottom: 8px; font-size: 14px; }
                .sc-grid { display: grid; grid-template-columns: 1fr 1.5fr; gap: 4px; font-size: 12px; }
                .sc-item span { color: #666; }
                
                table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
                th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; vertical-align: middle; }
                th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
                
                .footer { margin-top: 40px; text-align: right; font-size: 11px; color: #888; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <h1>รายงานสรุปการดำเนินงานและการส่งมอบ</h1>
            <div class="subtitle">กองบริหารการบินเกษตร | ข้อมูล ณ วันที่ ${thaiDate}</div>
            
            <div style="font-weight:bold; color:#1e564d; border-left: 5px solid #1bb295; padding-left:10px; font-size: 18px; margin-bottom:15px;">1. สรุปภาพรวมรายแผนงานและแหล่งเงิน</div>
            ${summaryHtml}

            <div style="font-weight:bold; color:#1e564d; border-left: 5px solid #1bb295; padding-left:10px; font-size: 18px; margin: 30px 0 15px 0;">2. รายละเอียดโครงการรายรายการ</div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35px;">ที่</th>
                        <th>ชื่อโครงการ / แผนงาน / แหล่งเงิน</th>
                        <th style="width: 180px;">ผู้รับจ้าง / เลขสัญญา</th>
                        <th style="width: 120px;">สถานะปัจจุบัน</th>
                        <th style="width: 120px;">PO / ก่อหนี้</th>
                        <th style="width: 80px;">ระยะเวลา (วัน)</th>
                        <th style="width: 140px;">วันครบกำหนดสัญญา</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">พิมพ์โดย: ระบบบริหารจัดการสัญญา กองบริหารการบินเกษตร</div>
            <script>
                window.onload = function() { setTimeout(() => { window.print(); }, 500); }
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

function parseThaiDate(thaiDateStr) {
    if (!thaiDateStr) return null;

    // Check if it's an auto-corrupted Date object from Google Sheets (e.g. "Thu Apr 03 1969")
    if (thaiDateStr.includes('GMT') || thaiDateStr.includes('T') || thaiDateStr.length > 20) {
        let dt = new Date(thaiDateStr);
        if (!isNaN(dt.getTime())) {
            let y = dt.getFullYear();
            if (y >= 1900 && y < 2000) {
                y += 57; // 1969 -> 2026, recovers the data
                dt.setFullYear(y);
            } else if (y > 2400) {
                // Google auto-parsed "03/04/2569" as 2569 AD
                dt.setFullYear(y - 543);
            }
            return dt;
        }
    }

    if (!thaiDateStr.includes('/')) return null;
    const p = thaiDateStr.split('/');
    if (p.length !== 3) return null;
    let year = parseInt(p[2], 10);
    if (year < 100) year += 2500;
    if (year > 2400) year -= 543;
    return new Date(year, parseInt(p[1], 10) - 1, parseInt(p[0], 10));
}

const shortMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

function formatThaiShort(dateStr) {
    if (!dateStr || dateStr === '-' || dateStr.includes('รอ')) return dateStr;
    const dt = parseThaiDate(dateStr);
    if (dt) {
        return `${dt.getDate()} ${shortMonths[dt.getMonth()]} ${String(dt.getFullYear() + 543).slice(-2)}`;
    }
    return dateStr;
}

function calculateExpiryDate(signedDateStr, durationDays) {
    if (!signedDateStr || signedDateStr === '-' || signedDateStr.includes('รอ') || !durationDays || durationDays <= 0) return null;

    const startDate = parseThaiDate(signedDateStr);
    if (!startDate || isNaN(startDate.getTime())) return null;

    startDate.setDate(startDate.getDate() + parseInt(durationDays, 10));

    const eDay = String(startDate.getDate()).padStart(2, '0');
    const eMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const eYear = startDate.getFullYear() + 543;

    return `${eDay}/${eMonth}/${eYear}`;
}

function renderReport() {
    const reportContent = document.getElementById('report-content');
    const noSelection = document.getElementById('no-report-selection');

    if (!selectedProjectId) {
        if (reportContent) reportContent.style.display = 'none';
        if (noSelection) noSelection.style.display = 'block';
        return;
    }

    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    if (reportContent) reportContent.style.display = 'block';
    if (noSelection) noSelection.style.display = 'none';

    document.getElementById('r-id').innerText = `ลำดับที่ ${project.id}`;
    document.getElementById('r-type').innerText = project.contractType;

    const rContractNoBox = document.getElementById('r-contract-no');
    if (project.notes && project.notes.contractNo) {
        rContractNoBox.style.display = 'inline-block';
        rContractNoBox.innerText = `สัญญาเลขที่: ${project.notes.contractNo}`;
    } else {
        rContractNoBox.style.display = 'none';
        rContractNoBox.innerText = '';
    }

    document.getElementById('r-name').innerText = project.name;
    document.getElementById('r-contractor').innerText = project.contractor || '-';
    document.getElementById('r-supervisor').innerText = project.supervisor || '-';

    document.getElementById('r-comm-tor').innerText = (project.notes && project.notes.comm_tor) ? project.notes.comm_tor : '-';
    document.getElementById('r-comm-eval').innerText = (project.notes && project.notes.comm_eval) ? project.notes.comm_eval : '-';
    document.getElementById('r-comm-inspect').innerText = (project.notes && project.notes.comm_inspect) ? project.notes.comm_inspect : '-';

    const balance = Number(project.budget) - Number(project.po) - Number(project.disbursed);

    document.getElementById('r-budget').innerText = formatCurrency(project.budget);
    document.getElementById('r-po').innerText = formatCurrency(project.po);
    document.getElementById('r-disbursed').innerText = formatCurrency(project.disbursed);

    const progressPercent = project.budget > 0 ? (Number(project.disbursed) / Number(project.budget)) * 100 : 0;
    document.getElementById('r-progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('r-progress-text').innerText = `${progressPercent.toFixed(1)}% เบิกจ่ายแล้ว`;

    const notes = project.notes || {};

    // Calculate days between steps
    const dOrder = ['tor', 'announce', 'consideration', 'appeal', 'waitsign', 'signed', 'inspection', 'payment'];
    let daysDiffText = {};
    let earliestDate = null;

    for (let i = 0; i < dOrder.length; i++) {
        const key = dOrder[i];
        const currentDt = parseThaiDate(project.dates[key]);
        if (currentDt) {
            if (!earliestDate || currentDt < earliestDate) earliestDate = currentDt;

            // Look backward for previous valid date to diff against
            let prevDt = null;
            for (let j = i - 1; j >= 0; j--) {
                const checkDt = parseThaiDate(project.dates[dOrder[j]]);
                if (checkDt) { prevDt = checkDt; break; }
            }

            if (prevDt) {
                const diffTime = Math.abs(currentDt - prevDt);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                daysDiffText[key] = `(ใช้เวลา ${diffDays} วัน)`;
            } else {
                daysDiffText[key] = '';
            }
        } else {
            daysDiffText[key] = '';
        }
    }

    let maxIdx = -1;
    dOrder.forEach((k, i) => {
        const isActuallyDone = (project.dates[k] && project.dates[k] !== '-' && !project.dates[k].includes('รอ'));
        const isSignedReached = (k === 'signed' && project.notes && (project.notes.contractNo || project.notes.signed));
        if (isActuallyDone || isSignedReached) maxIdx = i;
    });

    updateTimelineStep('tor', '1', project.dates.tor || (maxIdx >= 0 ? 'เรียบร้อย' : ''), notes.tor, daysDiffText['tor']);
    updateTimelineStep('announce', '2', project.dates.announce || (maxIdx >= 1 ? 'เรียบร้อย' : ''), notes.announce, daysDiffText['announce']);
    updateTimelineStep('consideration', '3', project.dates.consideration || (maxIdx >= 2 ? 'เรียบร้อย' : ''), notes.consideration, daysDiffText['consideration']);
    updateTimelineStep('appeal', '4', project.dates.appeal || (maxIdx >= 3 ? 'เรียบร้อย' : ''), notes.appeal, daysDiffText['appeal']);
    updateTimelineStep('waitsign', '5', project.dates.waitsign || (maxIdx >= 4 ? 'เรียบร้อย' : ''), notes.waitsign, daysDiffText['waitsign']);
    updateTimelineStep('signed', '6', project.dates.signed || (maxIdx >= 5 ? 'เรียบร้อย' : ''), notes.signed, daysDiffText['signed']);
    updateTimelineStep('inspection', '7', project.dates.inspection || (maxIdx >= 6 ? 'เรียบร้อย' : ''), notes.inspection, daysDiffText['inspection']);
    updateTimelineStep('payment', '8', project.dates.payment || (maxIdx >= 7 ? 'เรียบร้อย' : ''), notes.payment, daysDiffText['payment']);

    // Contract End Calculation
    const endAlert = document.getElementById('contract-end-alert');
    const endText = document.getElementById('contract-end-text');
    const expiryDateStr = project.dates.signed;

    if (expiryDateStr && expiryDateStr !== '-' && !expiryDateStr.includes('รอ')) {
        endAlert.style.display = 'block';
        endText.innerText = `วันครบกำหนดสัญญา: ${formatThaiShort(expiryDateStr)} (ระยะเวลา ${project.duration} วัน)`;
    } else {
        endAlert.style.display = 'none';
        endText.innerText = '';
    }

}

function updateTimelineStep(stepId, iconNum, dateValue, noteValue, daysTaken) {
    const elDate = document.getElementById(`date-${stepId}`);
    const elStep = document.getElementById(`step-${stepId}`);
    // HTML uses line-1 through line-7 (line between step N and N+1 = line-N)
    // iconNum is '1'...'8', the LINE after step N is line-N (not line-(N-1))
    const elLine = document.getElementById(`line-${parseInt(iconNum)}`);

    if (!elDate || !elStep) return;

    let displayTxt = formatThaiShort(dateValue) || '-';
    if (daysTaken && daysTaken !== '') {
        displayTxt += `<br><span style="color:#e67e3a; font-size:11px; font-weight:bold;">${daysTaken}</span>`;
    }
    if (noteValue && noteValue.trim() !== '') {
        displayTxt += `<br><small style="color:#888; font-size: 11px;">(${noteValue})</small>`;
    }
    elDate.innerHTML = displayTxt;

    const iconContainer = elStep.querySelector('.step-icon');

    if (dateValue && dateValue !== '-' && !dateValue.includes('รอ')) {
        elStep.classList.remove('pending');
        elStep.classList.add('completed');
        if (iconContainer) iconContainer.innerHTML = '<i class="fa-solid fa-check"></i>';
        if (elLine) elLine.classList.add('completed');
    } else {
        elStep.classList.remove('completed');
        elStep.classList.add('pending');
        if (iconContainer) iconContainer.innerHTML = iconNum;
        if (elLine) elLine.classList.remove('completed');
    }
}


// --- MAIN PROJECT MODAL ---
function openModal() {
    document.getElementById('projectForm').reset();
    document.getElementById('p-id').value = '';
    document.getElementById('modal-title').innerText = 'เพิ่มโครงการใหม่';
    document.getElementById('projectModal').classList.add('show');
}

function openEditModal(id) {
    if (!id) id = selectedProjectId;
    const project = projects.find(p => p.id === id);
    if (!project) return;

    document.getElementById('p-id').value = project.id;
    document.getElementById('p-name').value = project.name;
    const legacyAircraft = project.notes && project.notes.itemType === 'จัดหาอากาศยาน';
    document.getElementById('p-plan').value = legacyAircraft ? 'จัดหาอากาศยาน' : ((project.notes && project.notes.plan) ? project.notes.plan : 'การปฏิบัติการฝนหลวง');
    document.getElementById('p-item-type').value = legacyAircraft ? 'งบลงทุน' : ((project.notes && project.notes.itemType) ? project.notes.itemType : 'งบรายจ่ายอื่น');
    document.getElementById('p-type').value = project.contractType;
    document.getElementById('p-contractor').value = project.contractor;
    document.getElementById('p-supervisor').value = project.supervisor;
    document.getElementById('p-allocated').value = project.allocated || 0;
    document.getElementById('p-budget').value = project.budget;
    document.getElementById('p-po').value = project.po;
    document.getElementById('p-disbursed').value = project.disbursed;
    if (document.getElementById('p-gfref')) document.getElementById('p-gfref').value = (project.notes && project.notes.gfRefNo) || '';
    if (document.getElementById('p-gfdate')) document.getElementById('p-gfdate').value = (project.notes && project.notes.gfDate) || '';
    if (document.getElementById('p-duration')) document.getElementById('p-duration').value = project.duration || 0;

    document.getElementById('modal-title').innerText = 'อัปเดตโครงการ';
    document.getElementById('projectModal').classList.add('show');
}

function closeModal() {
    document.getElementById('projectModal').classList.remove('show');
}

async function saveProject(e) {
    e.preventDefault();

    const idVal = document.getElementById('p-id').value;
    // We fetch existing dates/notes to preserve them if we only edit main info
    let existingDates = { tor: '', announce: '', consideration: '', appeal: '', waitsign: '', signed: '' };
    let existingNotes = {};
    if (idVal) {
        const found = projects.find(p => p.id === parseInt(idVal));
        if (found) {
            existingDates = found.dates;
            existingNotes = found.notes;
        }
    }

    const projectData = {
        name: document.getElementById('p-name').value,
        contractType: document.getElementById('p-type').value,
        contractor: document.getElementById('p-contractor').value,
        supervisor: document.getElementById('p-supervisor').value,
        allocated: parseFloat(document.getElementById('p-allocated').value) || 0,
        budget: parseFloat(document.getElementById('p-budget').value) || 0,
        po: parseFloat(document.getElementById('p-po').value) || 0,
        disbursed: parseFloat(document.getElementById('p-disbursed').value) || 0,
        duration: parseInt(document.getElementById('p-duration')?.value || 0, 10),
        dates: existingDates,
        notes: existingNotes
    };

    projectData.notes.plan = document.getElementById('p-plan').value;
    projectData.notes.itemType = document.getElementById('p-item-type').value;
    if (document.getElementById('p-gfref')) projectData.notes.gfRefNo = document.getElementById('p-gfref').value.trim();
    if (document.getElementById('p-gfdate')) projectData.notes.gfDate = document.getElementById('p-gfdate').value.trim();
    projectData.notes.date_inspection = projectData.dates.inspection || '';
    projectData.notes.date_payment = projectData.dates.payment || '';

    if (idVal) projectData.id = parseInt(idVal);

    closeModal();
    const success = await apiSaveProject(projectData);
    if (success) {
        await fetchProjects();
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'บันทึกข้อมูลสำเร็จ', showConfirmButton: false, timer: 2000 });
    }
}


function toISODate(thaiDateStr) {
    const dt = parseThaiDate(thaiDateStr);
    if (!dt) return '';
    let day = String(dt.getDate()).padStart(2, '0');
    let month = String(dt.getMonth() + 1).padStart(2, '0');
    let year = dt.getFullYear();
    return `${year}-${month}-${day}`;
}

function toThaiDate(isoDateStr) {
    if (!isoDateStr) return '';
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;
    const year = parseInt(parts[0], 10) + 543;
    return `${parts[2]}/${parts[1]}/${year}`;
}

// --- STATUS UPDATE ---
async function updateSingleStep(stepKey) {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    const stepNames = {
        tor: 'ร่าง TOR',
        announce: 'ประกาศจัดซื้อจัดจ้าง',
        consideration: 'พิจารณาผลผู้ชนะ',
        appeal: 'ประกาศผู้ชนะ',
        waitsign: 'สนอง',
        signed: 'วันครบกำหนดสัญญา',
        inspection: 'ตรวจรับงาน/พัสดุ',
        payment: 'เบิกจ่ายเงิน'
    };

    const order = ['tor', 'announce', 'consideration', 'appeal', 'waitsign', 'signed', 'inspection', 'payment'];
    const idx = order.indexOf(stepKey);

    // ทุก step อนุญาตให้กดข้ามได้ (auto-fill ขั้นตอนก่อนหน้าเป็น 'เรียบร้อย' อัตโนมัติ)
    // ไม่บล็อกการกดใดๆ ทั้งสิ้น

    const currentIsoDate = toISODate(project.dates[stepKey]);

    let extraInputHtml = '';
    let currentContractNo = (project.notes && project.notes.contractNo) ? project.notes.contractNo : '';
    if (stepKey === 'signed') {
        extraInputHtml = `
            <label style="display:block; margin-bottom:5px; font-weight:600; color:#555; font-size:14px; margin-top: 15px;">เลขที่สัญญา (เพื่อให้ค้นหาง่ายขึ้น)</label>
            <input type="text" id="swal-contract" class="swal2-input" placeholder="ตัวอย่าง: 11/2569" value="${currentContractNo}" style="width: 100%; margin: 0; font-size:14px; height: 40px;">
        `;
    }

    const { value: formValues, isDismissed } = await Swal.fire({
        title: `อัปเดต: ${stepNames[stepKey]}`,
        html: `
            <div style="text-align: left; padding: 0 10px; font-family: Sarabun;">
                <label style="display:block; margin-bottom:5px; font-weight:600; color:#555; font-size:14px;">วันที่${stepKey === 'signed' ? 'ครบกำหนดสัญญา' : ''}</label>
                <input type="text" id="swal-date" class="swal2-input" placeholder="${stepKey === 'signed' ? 'ระบุวันครบกำหนดสัญญา' : 'เลือกวันที่จากปฏิทิน'}" value="${currentIsoDate}" style="width: 100%; margin: 0 0 15px 0; font-size:14px; height: 40px; cursor: pointer; background: white;">
                <label style="display:block; margin-bottom:5px; font-weight:600; color:#555; font-size:14px;">หมายเหตุ</label>
                <input type="text" id="swal-note" class="swal2-input" placeholder="เว้นว่างได้ หรือระบุสถานะ..." value="${(project.notes && project.notes[stepKey]) || ''}" style="width: 100%; margin: 0; font-size:14px; height: 40px;">
                ${extraInputHtml}
                <div style="margin-top:15px; font-size:12px; color:#888;">* หากต้องการถอยขั้นตอน (Reset) ให้ล้างวันที่ให้ว่างแล้วกดบันทึก</div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        showDenyButton: !!currentIsoDate,
        confirmButtonText: 'บันทึก',
        denyButtonText: 'ล้างข้อมูลขั้นตอนนี้',
        cancelButtonText: 'ยกเลิก',
        customClass: {
            denyButton: 'swal2-deny-custom'
        },
        didOpen: () => {
            flatpickr("#swal-date", {
                locale: "th",
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "d M Y",
                allowInput: false,
                formatDate: (date, formatStr) => {
                    if (formatStr === "d M Y") {
                        const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
                        let y = date.getFullYear() + 543;
                        let m = thaiMonths[date.getMonth()];
                        let d = String(date.getDate()).padStart(2, '0');
                        return `${d} ${m} ${y}`;
                    }
                    return flatpickr.formatDate(date, formatStr);
                }
            });
        },
        preDeny: () => {
            return { date: '', note: '', contractNo: '' };
        },
        preConfirm: () => {
            const rawDate = document.getElementById('swal-date').value;
            return {
                date: toThaiDate(rawDate),
                note: document.getElementById('swal-note').value,
                contractNo: document.getElementById('swal-contract') ? document.getElementById('swal-contract').value : null
            }
        }
    });

    if (formValues) {
        // Allow empty date for 'signed' if there's contact info or notes
        if (formValues.date.trim() === '' && (stepKey !== 'signed' || (formValues.note.trim() === '' && (!formValues.contractNo || formValues.contractNo.trim() === '')))) {
            for (let i = idx; i < order.length; i++) {
                project.dates[order[i]] = '';
                if (project.notes) project.notes[order[i]] = '';
            }
            if (stepKey === 'signed' && project.notes) project.notes.contractNo = '';
        } else {
            // Auto-complete ขั้นตอนก่อนหน้าทั้งหมดที่ยังไม่ได้กรอก ให้เป็น 'เรียบร้อย'
            for (let i = 0; i < idx; i++) {
                const k = order[i];
                if (!project.dates[k] || project.dates[k] === '-' || project.dates[k].includes('รอ')) {
                    project.dates[k] = 'เรียบร้อย';
                }
            }

            project.dates[stepKey] = formValues.date;
            if (!project.notes) project.notes = {};
            project.notes[stepKey] = formValues.note;
            if (formValues.contractNo !== null) project.notes.contractNo = formValues.contractNo;
        }

        project.notes.date_inspection = project.dates.inspection || '';
        project.notes.date_payment = project.dates.payment || '';

        const success = await apiSaveProject(project);
        if (success) {
            await fetchProjects();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปเดตสถานะสำเร็จ', showConfirmButton: false, timer: 1500 });
        }
    }
}

// Global Deletions
async function deleteProject(e, id) {
    if (e) e.stopPropagation();

    const result = await Swal.fire({
        title: 'ยืนยันการลบ?',
        text: "คุณแน่ใจหรือไม่ว่าต้องการลบโครงการนี้?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74c3c',
        cancelButtonColor: '#bdc3c7',
        confirmButtonText: 'ใช่, ฉันต้องการลบ',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        const success = await apiDeleteProject(id);
        if (success) {
            if (selectedProjectId === id) selectedProjectId = null;
            await fetchProjects();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'ลบโครงการเรียบร้อย', showConfirmButton: false, timer: 2000 });
        }
    }
}

function deleteCurrentProject() {
    if (selectedProjectId) deleteProject(null, selectedProjectId);
}

// Global Committee Updates
async function openCommitteeModal() {
    if (!selectedProjectId) return;
    const project = projects.find(p => p.id === selectedProjectId);
    if (!project) return;

    const comm_tor = (project.notes && project.notes.comm_tor) ? project.notes.comm_tor : '';
    const comm_eval = (project.notes && project.notes.comm_eval) ? project.notes.comm_eval : '';
    const comm_inspect = (project.notes && project.notes.comm_inspect) ? project.notes.comm_inspect : '';

    const { value: formValues } = await Swal.fire({
        title: 'อัปเดตรายชื่อคณะกรรมการ',
        width: '600px',
        html: `
            <div style="text-align: left; padding: 0 10px; font-family: Sarabun;">
                <label style="display:block; margin-bottom:5px; font-weight:600; color:#555; font-size:14px;">1. คณะกรรมการร่าง TOR</label>
                <textarea id="swal-comm-tor" class="swal2-textarea" style="width: 100%; margin: 0 0 15px 0; font-size:14px; height: 80px;" placeholder="ระบุรายชื่อ (ขึ้นบรรทัดใหม่ได้)">${comm_tor}</textarea>
                
                <label style="display:block; margin-bottom:5px; font-weight:600; color:#555; font-size:14px;">2. คณะกรรมการพิจารณาผล</label>
                <textarea id="swal-comm-eval" class="swal2-textarea" style="width: 100%; margin: 0 0 15px 0; font-size:14px; height: 80px;" placeholder="ระบุรายชื่อ (ขึ้นบรรทัดใหม่ได้)">${comm_eval}</textarea>
                
                <label style="display:block; margin-bottom:5px; font-weight:600; color:#555; font-size:14px;">3. คณะกรรมการตรวจรับพัสดุ</label>
                <textarea id="swal-comm-inspect" class="swal2-textarea" style="width: 100%; margin: 0 0 15px 0; font-size:14px; height: 80px;" placeholder="ระบุรายชื่อ (ขึ้นบรรทัดใหม่ได้)">${comm_inspect}</textarea>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก',
        preConfirm: () => {
            return {
                tor: document.getElementById('swal-comm-tor').value,
                eval: document.getElementById('swal-comm-eval').value,
                inspect: document.getElementById('swal-comm-inspect').value
            };
        }
    });

    if (formValues) {
        if (!project.notes) project.notes = {};
        project.notes.comm_tor = formValues.tor;
        project.notes.comm_eval = formValues.eval;
        project.notes.comm_inspect = formValues.inspect;

        const success = await apiSaveProject(project);
        if (success) {
            await fetchProjects();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'อัปเดตรายชื่อเรียบร้อย', showConfirmButton: false, timer: 1500 });
        }
    }
}


// Expose handlers
window.handleSearch = handleSearch;
window.openModal = openModal;
window.closeModal = closeModal;
window.saveProject = saveProject;
window.openEditModal = openEditModal;
window.deleteCurrentProject = deleteCurrentProject;
window.openCommitteeModal = openCommitteeModal;
window.updateSingleStep = updateSingleStep;
window.printProjectSummary = printProjectSummary;
