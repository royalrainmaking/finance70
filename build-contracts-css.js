// Dependency-free CSS scoper for the contract-management module.
// Puts every rule from _contract_src/styles.css under #view-contracts so the
// module neither changes the host app (sidebar colours, buttons, modals...)
// nor gets restyled by it.
const SCOPE = '#view-contracts';

// Selectors that belong to the standalone app's own shell. The host app
// already has its own sidebar/header, so these rules are dropped.
const SHELL = /^(html|body|\.app-container|\.mobile-header|\.mobile-logo-group|\.menu-toggle|\.sidebar|\.sidebar-overlay|\.user-profile|\.avatar|\.user-info|\.username|\.role|\.nav-[\w-]+|\.main-content|\.top-header|#page-title|\.current-date|\.logo[\w-]*)(?![\w-])/;

// Host styles that leak into elements with the same class/tag names.
// Placed BEFORE the module rules so the module's own rules still win.
const ISOLATION = `
${SCOPE}, ${SCOPE} *, ${SCOPE} *::before, ${SCOPE} *::after { box-sizing: border-box; }
${SCOPE} { font-family: var(--font-family); color: var(--text-main); font-size: 14px; }
${SCOPE} h1, ${SCOPE} h2, ${SCOPE} h3, ${SCOPE} h4, ${SCOPE} p, ${SCOPE} ul { margin: 0; padding: 0; }
${SCOPE} label { font-size: inherit; font-weight: inherit; color: inherit; text-transform: none; letter-spacing: normal; }
${SCOPE} input, ${SCOPE} select, ${SCOPE} textarea { background: #fff; border-width: 1px; font-size: 14px; font-family: var(--font-family); }
${SCOPE} input:focus, ${SCOPE} select:focus, ${SCOPE} textarea:focus { box-shadow: none; }
${SCOPE} .stat-card { display: block; border: none; gap: 0; cursor: default; }
${SCOPE} .stat-title, ${SCOPE} .stat-value { color: inherit; }
${SCOPE} .stat-icon { width: auto; height: auto; background: none; color: inherit; border-radius: 0; display: block; margin-bottom: 0; }
${SCOPE} .search-box { flex: none; min-width: 0; margin-bottom: 0; }
${SCOPE} .search-box input { font-size: 14px; background: #fff; }
`;

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Parse a block body into a list of {type:'rule'|'at'|'decl-at', prelude, body}
function parseBlocks(css) {
  const items = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf('{', i);
    const semi = css.indexOf(';', i);
    if (open === -1) break;
    // statement at-rule like @import ...;
    if (semi !== -1 && semi < open && css.slice(i, semi).trim().startsWith('@')) {
      items.push({ type: 'stmt', prelude: css.slice(i, semi).trim() });
      i = semi + 1;
      continue;
    }
    const prelude = css.slice(i, open).trim();
    let depth = 1, j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const body = css.slice(open + 1, j - 1);
    items.push({ type: prelude.startsWith('@') ? 'at' : 'rule', prelude, body });
    i = j;
  }
  return items;
}

function splitSelectors(sel) {
  const out = []; let depth = 0, cur = '';
  for (const ch of sel) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; } else cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function scopeBlocks(css, indent = '') {
  let out = '';
  for (const b of parseBlocks(css)) {
    if (b.type === 'stmt') { out += `${indent}${b.prelude};\n`; continue; }
    if (b.type === 'at') {
      if (/^@(-webkit-)?keyframes/.test(b.prelude)) {
        out += `${indent}${b.prelude.replace(/(keyframes\s+)/, '$1cm-')} {${b.body}}\n`;
      } else if (/^@(media|supports)/.test(b.prelude)) {
        const inner = scopeBlocks(b.body, indent + '  ');
        if (inner.trim()) out += `${indent}${b.prelude} {\n${inner}${indent}}\n`;
      } else {
        out += `${indent}${b.prelude} {${b.body}}\n`;
      }
      continue;
    }
    let body = b.body.replace(/(animation(?:-name)?\s*:\s*)([A-Za-z][\w-]*)/g, (m, p, name) =>
      /^(none|inherit|initial|unset|ease|ease-in|ease-out|ease-in-out|linear|infinite)$/.test(name) ? m : p + 'cm-' + name);
    if (b.prelude === ':root') { out += `${indent}${SCOPE} {${body}}\n`; continue; }
    const sels = splitSelectors(b.prelude).filter(s => !SHELL.test(s)).map(s => `${SCOPE} ${s}`);
    if (sels.length) out += `${indent}${sels.join(',\n' + indent)} {${body}}\n`;
  }
  return out;
}

module.exports = function scopeCss(css) {
  return '/* AUTO-GENERATED from _contract_src/styles.css by build.js — edit the source, not this file */\n'
    + ISOLATION + '\n' + scopeBlocks(stripComments(css));
};

if (require.main === module) {
  const fs = require('fs');
  const [, , src, out] = process.argv;
  fs.writeFileSync(out, module.exports(fs.readFileSync(src, 'utf8')));
  console.log('wrote', out);
}
