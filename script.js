const fs = require('fs');
let code = fs.readFileSync('app.js', 'utf8');

// Replace grouping logic pagination
const targetGroup = "if (doGroup) {\r\n    tbody.innerHTML = groups.length > 0 \? groups.map";
const replaceGroup = "if (doGroup) {\n    const totalPages = Math.ceil(groups.length / ITEMS_PER_PAGE);\n    if (tableCurrentPage > totalPages) tableCurrentPage = totalPages;\n    if (tableCurrentPage < 1) tableCurrentPage = 1;\n    const startIndex = (tableCurrentPage - 1) * ITEMS_PER_PAGE;\n    const pagedGroups = groups.slice(startIndex, startIndex + ITEMS_PER_PAGE);\n    tbody.innerHTML = pagedGroups.length > 0 ? pagedGroups.map";
code = code.replace(targetGroup, replaceGroup);

// Append pagination controls to end of doGroup
const targetGroupEnd = "}).join('') : '<tr><td colspan=\"11\" style=\"text-align:center; padding:40px; color:var(--text-muted);\">????????????????????????????? ???? ??????? G ??????????????????</td></tr>';\r\n  } else {";
const replaceGroupEnd = "}).join('') : '<tr><td colspan=\"11\" style=\"text-align:center; padding:40px; color:var(--text-muted);\">???????????</td></tr>';\n    renderPaginationControls('tablePagination', totalPages, tableCurrentPage, (p) => { tableCurrentPage = p; renderTable(q); });\n  } else {";
code = code.replace(targetGroupEnd, replaceGroupEnd);

// Replace filtered pagination
const targetFiltered = "tbody.innerHTML = filtered.length > 0 ? filtered.map(rowTpl).join('') : '<tr><td colspan=\"11\" style=\"text-align:center; padding:40px; color:var(--text-muted);\">????????????????????????????</td></tr>';\r\n  }";
const replaceFiltered = "const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);\n    if (tableCurrentPage > totalPages) tableCurrentPage = totalPages;\n    if (tableCurrentPage < 1) tableCurrentPage = 1;\n    const startIndex = (tableCurrentPage - 1) * ITEMS_PER_PAGE;\n    const pagedData = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);\n    tbody.innerHTML = pagedData.length > 0 ? pagedData.map(rowTpl).join('') : '<tr><td colspan=\"11\" style=\"text-align:center; padding:40px; color:var(--text-muted);\">???????????</td></tr>';\n    renderPaginationControls('tablePagination', totalPages, tableCurrentPage, (p) => { tableCurrentPage = p; renderTable(q); });\n  }";
code = code.replace(targetFiltered, replaceFiltered);

fs.writeFileSync('app.js', code, 'utf8');
console.log("Done");
