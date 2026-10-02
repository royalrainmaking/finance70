const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// For renderPendingPlanView
const targetPending = "tbody.innerHTML = entries.length > 0\r\n    ? entries.map(rowTpl).join('')\r\n    : '<tr><td colspan=\"12\" style=\"text-align:center; padding:40px; color:var(--text-muted);\">??????????????????????????</td></tr>';";
const replacePending = "const totalPages = Math.ceil(entries.length / ITEMS_PER_PAGE);\n  if (pendingCurrentPage > totalPages) pendingCurrentPage = totalPages;\n  if (pendingCurrentPage < 1) pendingCurrentPage = 1;\n  const startIndex = (pendingCurrentPage - 1) * ITEMS_PER_PAGE;\n  const pagedData = entries.slice(startIndex, startIndex + ITEMS_PER_PAGE);\n\n  tbody.innerHTML = pagedData.length > 0\n    ? pagedData.map(rowTpl).join('')\n    : '<tr><td colspan=\"12\" style=\"text-align:center; padding:40px; color:var(--text-muted);\">??????????????????????????</td></tr>';\n\n  renderPaginationControls('pendingPlanPagination', totalPages, pendingCurrentPage, (p) => { pendingCurrentPage = p; renderPendingPlanView(); });";
code = code.replace(targetPending, replacePending);

fs.writeFileSync('app.js', code, 'utf8');
console.log("Done2");
