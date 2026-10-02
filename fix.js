const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

const faultyFunctionStart = "function renderPaginationControls";
const idx = code.indexOf(faultyFunctionStart);
if (idx > -1) {
  code = code.substring(0, idx);
}

const newFunc = 
function renderPaginationControls(containerId, totalPages, currentPage, onPageChange) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }
  let html = '';
  html += '<button class="page-btn" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="window.__page_'+containerId+'(1)"><<</button>';
  html += '<button class="page-btn" ' + (currentPage === 1 ? 'disabled' : '') + ' onclick="window.__page_'+containerId+'(' + (currentPage - 1) + ')"><</button>';
  html += '<span class="page-info">???? ' + currentPage + ' ??? ' + totalPages + '</span>';
  html += '<button class="page-btn" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="window.__page_'+containerId+'(' + (currentPage + 1) + ')">></button>';
  html += '<button class="page-btn" ' + (currentPage === totalPages ? 'disabled' : '') + ' onclick="window.__page_'+containerId+'(' + totalPages + ')">>></button>';
  
  container.innerHTML = html;
  window['__page_' + containerId] = onPageChange;
}
;

fs.writeFileSync('app.js', code + newFunc, 'utf8');
