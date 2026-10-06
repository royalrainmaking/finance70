const fs = require('fs');

let html = fs.readFileSync('_contract_src/index.html', 'utf8');

const startViewDashboard = html.indexOf('<div class="view-section active" id="view-dashboard">');
const endReport = html.indexOf('</div>\r\n    </main>');
let viewsHtml = '';
if (startViewDashboard !== -1 && endReport !== -1) {
    viewsHtml = html.substring(startViewDashboard, endReport);
} else {
    viewsHtml = html.substring(html.indexOf('<div class="view-section active" id="view-dashboard">'), html.indexOf('</main>'));
}

const startModal = html.indexOf('<!-- Modal for Adding/Editing Project -->');
const endModal = html.indexOf('<script src="script.js"></script>');
let modalHtml = '';
if (startModal !== -1 && endModal !== -1) {
    modalHtml = html.substring(startModal, endModal);
}

let combinedHtml = (viewsHtml + '\n' + modalHtml).replace(/`/g, '\\`').replace(/<script.*?>.*?<\/script>/gi, '');

let js = fs.readFileSync('_contract_src/script.js', 'utf8');

// Strip out the original DOMContentLoaded listener block entirely
js = js.replace(/document\.addEventListener\('DOMContentLoaded'[\s\S]*?\}\);/, '');

let newJs = `
window.contract_init = function() {
    const root = document.getElementById('contracts-root');
    if(root.innerHTML.trim() === '') {
        root.innerHTML = \`
        <div class="contracts-wrap">
            ${combinedHtml}
        </div>
        \`;
        
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

`;

js = js.replace(/async function fetchProjects\(\) \{[\s\S]*?\}\s*async function/g, `
async function fetchProjects() {
    if (typeof API === 'undefined') {
        Swal.fire('ข้อผิดพลาด', 'ไม่พบ API Endpoint ในระบบ', 'error');
        return;
    }
    try {
        Swal.fire({ title: 'กำลังโหลดข้อมูล...', text: 'กรุณารอสักครู่', allowOutsideClick: false, didOpen: () => { Swal.showLoading() } });
        const response = await fetch(\`\${API}?action=getContracts\`);
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
async function`);

js = js.replace(/async function apiSaveProject\(projectData\) \{[\s\S]*?\}\s*async function/g, `
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
async function`);

js = js.replace(/async function apiDeleteProject\(id\) \{[\s\S]*?\}\s*function switchView/g, `
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
function switchView`);

js = js.replace(/onclick=\\".*?switchView\('report'\)\\"/g, 'onclick="window.contract_switchView(\\\'report\\\')"');
js = js.replace(/switchView\('dashboard'\)/g, "window.contract_switchView('dashboard')");
js = js.replace(/switchView\('report'\)/g, "window.contract_switchView('report')");

newJs += js + `

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
`;

fs.writeFileSync('contracts.js', newJs);
console.log('Successfully created contracts.js');

// Scope the module's CSS under #view-contracts (see build-contracts-css.js)
const scopeCss = require('./build-contracts-css.js');
fs.writeFileSync('contracts.css', scopeCss(fs.readFileSync('_contract_src/styles.css', 'utf8')));
console.log('Successfully created contracts.css');
