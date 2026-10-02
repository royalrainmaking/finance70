/* ═══════════════════════════════════════════════════════════════
   STAMP ONLINE — Upload PDF, Drag-Drop Stamp, Save PDF
   Uses: pdf-lib + fontkit (Thai fonts), pdfjs-dist (PDF preview)
   ═══════════════════════════════════════════════════════════════ */

const stampOnlineState = {
  pdfBytes: null,
  pdfDoc: null,
  currentPage: 1,
  totalPages: 0,
  zoomLevel: 1.0,
  stampPlaced: false,
  stampPositions: {},
  fileName: 'document.pdf',
  selectedItem: null,
  cachedFontBytes: null
};

// ── Populate plan selector from cache ──
function populateStampOnlinePlanSelect() {
  const sel = document.getElementById('stampOnlinePlanSelect');
  if (!sel) return;
  const prev = sel.value;
  let html = '<option value="">-- \u0e40\u0e25\u0e37\u0e2d\u0e01\u0e41\u0e1c\u0e19\u0e07\u0e32\u0e19 --</option>';
  if (cache && cache.plans) {
    cache.plans.forEach(p => {
      html += '<option value="' + p.shortName + '"' + (p.shortName === (prev || currentPlan) ? ' selected' : '') + '>' + p.shortName + (p.fullName ? ' \u2014 ' + p.fullName : '') + '</option>';
    });
  }
  sel.innerHTML = html;
  if (!prev && currentPlan) sel.value = currentPlan;
  updateStampOnlinePreview();
}

// ── Search items from cache.entries ──
function searchStampOnlineItems(query) {
  var resultsEl = document.getElementById('stampItemResults');
  if (!resultsEl) return;
  if (!cache || !cache.entries) { resultsEl.style.display = 'none'; return; }

  var q = (query || '').trim().toLowerCase();
  var items;
  if (q.length === 0) {
    items = cache.entries.filter(function(e) { return e.id && e.amount; }).slice(0, 15);
  } else {
    items = cache.entries.filter(function(e) {
      if (!e.id) return false;
      return (
        e.id.toString().toLowerCase().indexOf(q) >= 0 ||
        (e.name && e.name.toLowerCase().indexOf(q) >= 0) ||
        (e.refNo && e.refNo.toLowerCase().indexOf(q) >= 0) ||
        (e.desc && e.desc.toLowerCase().indexOf(q) >= 0)
      );
    }).slice(0, 20);
  }
  renderStampItemResults(items);
}

function renderStampItemResults(results) {
  var resultsEl = document.getElementById('stampItemResults');
  if (!resultsEl) return;
  if (results.length === 0) {
    resultsEl.innerHTML = '<div style="padding:16px; text-align:center; color:#94a3b8; font-size:12px;">\u0e44\u0e21\u0e48\u0e1e\u0e1a\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23</div>';
    resultsEl.style.display = 'block';
    return;
  }
  var fmtAmt = function(n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
  var html = '';
  results.forEach(function(e) {
    html += '<div class="stamp-item-row" onclick="selectStampOnlineItem(\'' + e.id + '\')">';
    html += '<span class="item-id">#' + e.id + '</span>';
    html += '<span style="color:#64748b; font-size:11px;">' + (e.catCode || '') + '</span>';
    html += '<span class="item-amt">' + fmtAmt(e.amount) + ' \u0e3f</span>';
    html += '<span class="item-desc">' + (e.name || '') + ' \u2014 ' + ((e.desc || '').substring(0, 60)) + '</span>';
    html += '</div>';
  });
  resultsEl.innerHTML = html;
  resultsEl.style.display = 'block';
}

// ── Select an item and auto-fill stamp data ──
function selectStampOnlineItem(id) {
  var resultsEl = document.getElementById('stampItemResults');
  if (resultsEl) resultsEl.style.display = 'none';
  if (!cache || !cache.entries) return;

  var item = cache.entries.find(function(x) { return x.id == id; });
  if (!item) return;
  stampOnlineState.selectedItem = item;

  // Auto-set plan selector if item has a plan
  if (item.plan) {
    var planSel = document.getElementById('stampOnlinePlanSelect');
    if (planSel) planSel.value = item.plan;
  }

  // Update search input
  var searchInput = document.getElementById('stampItemSearch');
  if (searchInput) searchInput.value = '#' + item.id + ' \u2014 ' + (item.name || '');

  // Show selected item card
  var infoEl = document.getElementById('stampSelectedItemInfo');
  if (infoEl) {
    var fmtAmt = function(n) { return Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    infoEl.innerHTML = '<div class="sel-label">\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e17\u0e35\u0e48\u0e40\u0e25\u0e37\u0e2d\u0e01</div>' +
      '<div class="sel-id">#' + item.id + ' <span style="font-size:12px; color:#7c3aed; font-weight:600;">(' + (item.catCode || item.category || '-') + ')</span></div>' +
      '<div class="sel-detail">' +
      '<div><b>\u0e0a\u0e37\u0e48\u0e2d:</b> ' + (item.name || '-') + '</div>' +
      '<div><b>\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19:</b> ' + fmtAmt(item.amount) + ' \u0e1a\u0e32\u0e17</div>' +
      '<div><b>\u0e41\u0e1c\u0e19\u0e07\u0e32\u0e19:</b> ' + (item.plan || '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e23\u0e30\u0e1a\u0e38') + '</div>' +
      '<div style="margin-top:4px; color:#334155; font-size:10px; white-space:normal; word-break:break-word;">' + ((item.desc || '').substring(0, 100)) + '</div>' +
      '</div>';
    infoEl.style.display = 'block';
  }

  // Enable upload button
  var uploadBtn = document.getElementById('stampUploadMiniBtn');
  if (uploadBtn) { uploadBtn.style.opacity = '1'; uploadBtn.style.pointerEvents = 'auto'; }

  // Enable place button if PDF is already loaded
  if (stampOnlineState.pdfDoc) {
    document.getElementById('btnPlaceStamp').disabled = false;
  }

  updateStampOnlinePreview();
}

// Close search results on click outside
document.addEventListener('click', function(e) {
  var results = document.getElementById('stampItemResults');
  var search = document.getElementById('stampItemSearch');
  if (results && !results.contains(e.target) && e.target !== search) {
    results.style.display = 'none';
  }
});

// ── Get stamp data (identical to openPrintPlanModal logic) ──
function getStampOnlineData() {
  var item = stampOnlineState.selectedItem;
  var planKey = '';
  var planSel = document.getElementById('stampOnlinePlanSelect');
  if (planSel && planSel.value) planKey = planSel.value;
  else if (item && item.plan) planKey = item.plan;
  else planKey = currentPlan || '';

  var stampConfig;
  if (planKey && typeof getStampSettingsForPlan === 'function') {
    stampConfig = getStampSettingsForPlan(planKey);
  } else {
    stampConfig = { year: '\u0e67\u0e60', plan: '', output: '', act: '', subAct: '', expenseCat: '\u0e07\u0e1a\u0e14\u0e33\u0e40\u0e19\u0e34\u0e19\u0e07\u0e32\u0e19 \u0e2b\u0e21\u0e27\u0e14\u0e04\u0e48\u0e32\u0e15\u0e2d\u0e1a\u0e41\u0e17\u0e19 \u0e43\u0e0a\u0e49\u0e2a\u0e2d\u0e22\u0e41\u0e25\u0e30\u0e27\u0e31\u0e2a\u0e14\u0e38' };
  }

  // Build itemTag exactly like openPrintPlanModal
  var itemTag = '#000 (C1)';
  var amtNum = '........................................';
  var amtBaht = '';

  if (item) {
    if (item.combinedTags) {
      itemTag = item.combinedTags;
    } else {
      var cat = item.catCode || item.category || item.code || 'C1';
      if (cat.indexOf('(') !== 0) cat = '(' + cat + ')';
      itemTag = '#' + item.id + ' ' + cat;
    }

    if (item.amount) {
      var amt = parseFloat(item.amount);
      amtNum = toThaiDigits(amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      amtBaht = ThaiBahtText(amt);
    }
  }

  return {
    year: stampConfig.year || '\u0e67\u0e60',
    plan: stampConfig.plan || '',
    output: stampConfig.output || '',
    act: stampConfig.act || '',
    subAct: stampConfig.subAct || '',
    expenseCat: stampConfig.expenseCat || '',
    itemTag: itemTag,
    amtNum: amtNum,
    amtBaht: amtBaht
  };
}

// ── Build stamp HTML for preview ──
function buildStampHtml(data, fontSize) {
  var fs = fontSize || 10;
  return '<div style="font-size:' + fs + 'px; line-height:1.45; white-space:nowrap; color:#001f60;">' +
    '<div style="margin-bottom:1px;"><b>\u0e42\u0e14\u0e22\u0e40\u0e1a\u0e34\u0e01\u0e08\u0e48\u0e32\u0e22\u0e08\u0e32\u0e01\u0e40\u0e07\u0e34\u0e19\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e1b\u0e35\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 \u0e1e.\u0e28.\u0e52\u0e55</b>' + data.year + '</div>' +
    '<div style="margin-bottom:1px;"><b>\u0e41\u0e1c\u0e19\u0e07\u0e32\u0e19 : </b>' + data.plan + '</div>' +
    '<div style="margin-bottom:1px;"><b>\u0e1c\u0e25\u0e1c\u0e25\u0e34\u0e15 : </b>' + data.output + '</div>' +
    '<div style="display:flex; justify-content:space-between; margin-bottom:1px;">' +
    '<span><b>\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21 : </b>' + data.act + '</span>' +
    '<span style="margin-left:8px;"><b>\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21\u0e22\u0e48\u0e2d\u0e22 : </b>' + data.subAct + '</span>' +
    '</div>' +
    '<div style="margin-bottom:1px;"><b>' + data.expenseCat + '</b></div>' +
    '<div style="margin-bottom:1px;"><b>\u0e20\u0e32\u0e22\u0e43\u0e19\u0e27\u0e07\u0e40\u0e07\u0e34\u0e19\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 \u0e40\u0e1b\u0e47\u0e19\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19 </b><span style="border-bottom:1px dotted #001f60; padding:0 3px;">' + data.amtNum + '</span> <b>\u0e1a\u0e32\u0e17</b></div>' +
    '<div style="display:flex; align-items:center;"><b>(</b><span style="flex:1; border-bottom:1px dotted #001f60; text-align:center; margin:0 3px;">' + data.amtBaht + '</span><b>)</b></div>' +
    '</div>';
}

function updateStampOnlinePreview() {
  var data = getStampOnlineData();
  var fontSizeEl = document.getElementById('stampOnlineFontSize');
  var fontSize = fontSizeEl ? parseInt(fontSizeEl.value) : 10;
  var label = document.getElementById('stampFontSizeLabel');
  if (label) label.textContent = fontSize + 'px';

  var mini = document.getElementById('stampOnlineMiniPreview');
  if (mini) {
    if (!stampOnlineState.selectedItem) {
      mini.innerHTML = '<div style="color:#94a3b8; font-size:11px; text-align:center; padding:20px 0;">\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e08\u0e32\u0e01\u0e15\u0e32\u0e23\u0e32\u0e07\u0e01\u0e48\u0e2d\u0e19</div>';
    } else {
      mini.innerHTML = '<div style="margin-bottom:3px; color:#001f60; font-weight:800; font-size:10px;">' + data.itemTag + '</div>' + 
                       '<div style="border: 1.2px solid #001f60; padding: 4px; display: inline-block;">' + buildStampHtml(data, 9) + '</div>';
    }
  }

  var dragContent = document.getElementById('stampDraggableContent');
  if (dragContent && stampOnlineState.selectedItem) {
    var scale = (stampOnlineState.pdfDoc) ? stampOnlineState.zoomLevel * 1.5 : 1.5;
    var pdfFontSize = fontSize * 0.85;
    var previewSize = pdfFontSize * scale;
    var tagSize = (pdfFontSize + 0.5) * scale;
    var borderWidth = 1.2 * scale;
    var padding = 4 * scale;
    
    dragContent.innerHTML = '<div style="position:relative; top:-2px; color:#001f60; font-weight:800; font-size:' + tagSize + 'px; margin-bottom:2px;">' + data.itemTag + '</div>' + 
                            '<div style="border: ' + borderWidth + 'px solid #001f60; padding: ' + padding + 'px;">' + buildStampHtml(data, previewSize) + '</div>';
  }
}

// ── PDF Upload ──
function handleStampPdfUpload(file) {
  if (!file) return;
  if (file.type !== 'application/pdf') {
    Swal.fire({ icon: 'error', title: '\u0e44\u0e1f\u0e25\u0e4c\u0e44\u0e21\u0e48\u0e16\u0e39\u0e01\u0e15\u0e49\u0e2d\u0e07', text: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e44\u0e1f\u0e25\u0e4c PDF \u0e40\u0e17\u0e48\u0e32\u0e19\u0e31\u0e49\u0e19', timer: 2500, showConfirmButton: false });
    return;
  }
  if (!stampOnlineState.selectedItem) {
    Swal.fire({ icon: 'warning', title: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e01\u0e48\u0e2d\u0e19', text: '\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e01\u0e32\u0e23\u0e08\u0e32\u0e01\u0e15\u0e32\u0e23\u0e32\u0e07\u0e01\u0e48\u0e2d\u0e19\u0e2d\u0e31\u0e1e\u0e42\u0e2b\u0e25\u0e14 PDF', timer: 2500, showConfirmButton: false });
    return;
  }

  stampOnlineState.fileName = file.name;

  // Show filename
  var fnDisplay = document.getElementById('stampFileNameDisplay');
  var fnText = document.getElementById('stampFileNameText');
  if (fnDisplay) fnDisplay.style.display = 'flex';
  if (fnText) fnText.textContent = file.name;

  var reader = new FileReader();
  reader.onload = async function(e) {
    try {
      stampOnlineState.pdfBytes = new Uint8Array(e.target.result);
      stampOnlineState.pdfDoc = await pdfjsLib.getDocument({ data: stampOnlineState.pdfBytes.slice() }).promise;
      stampOnlineState.totalPages = stampOnlineState.pdfDoc.numPages;
      stampOnlineState.currentPage = 1;
      stampOnlineState.stampPlaced = false;
      stampOnlineState.stampPositions = {};

      document.getElementById('stampUploadZone').style.display = 'none';
      document.getElementById('stampPdfViewer').style.display = 'block';
      document.getElementById('btnSaveStampPdf').disabled = true;
      document.getElementById('stampDraggable').style.display = 'none';
      document.getElementById('btnPlaceStamp').disabled = !stampOnlineState.selectedItem;

      renderStampPdfPage();
    } catch (err) {
      console.error('PDF load error:', err);
      Swal.fire({ icon: 'error', title: '\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e40\u0e1b\u0e34\u0e14 PDF \u0e44\u0e14\u0e49', text: err.message, showConfirmButton: true });
    }
  };
  reader.readAsArrayBuffer(file);
}

// ── Render current PDF page ──
async function renderStampPdfPage() {
  if (!stampOnlineState.pdfDoc) return;
  var page = await stampOnlineState.pdfDoc.getPage(stampOnlineState.currentPage);
  var viewport = page.getViewport({ scale: stampOnlineState.zoomLevel * 1.5 });
  var canvas = document.getElementById('stampPdfCanvas');
  var ctx = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  await page.render({ canvasContext: ctx, viewport: viewport }).promise;

  document.getElementById('stampPageIndicator').textContent = stampOnlineState.currentPage + ' / ' + stampOnlineState.totalPages;
  document.getElementById('stampZoomLevel').textContent = Math.round(stampOnlineState.zoomLevel * 100) + '%';
  updateStampOnlinePreview();

  var dragEl = document.getElementById('stampDraggable');
  if (stampOnlineState.stampPlaced) {
    var pos = stampOnlineState.stampPositions[stampOnlineState.currentPage];
    if (pos) {
      dragEl.style.display = 'block';
      var scaleX = canvas.width / pos.pageW;
      var scaleY = canvas.height / pos.pageH;
      dragEl.style.left = (canvas.offsetLeft + pos.x * scaleX) + 'px';
      dragEl.style.top = (canvas.offsetTop + pos.y * scaleY) + 'px';
    } else {
      dragEl.style.display = 'none';
    }
  }
}

// ── Navigation ──
function stampPdfPrevPage() { if (stampOnlineState.currentPage > 1) { saveCurrentStampPosition(); stampOnlineState.currentPage--; renderStampPdfPage(); } }
function stampPdfNextPage() { if (stampOnlineState.currentPage < stampOnlineState.totalPages) { saveCurrentStampPosition(); stampOnlineState.currentPage++; renderStampPdfPage(); } }
function stampPdfZoomIn() { if (stampOnlineState.zoomLevel < 2.5) { stampOnlineState.zoomLevel = Math.min(2.5, stampOnlineState.zoomLevel + 0.15); renderStampPdfPage(); } }
function stampPdfZoomOut() { if (stampOnlineState.zoomLevel > 0.4) { stampOnlineState.zoomLevel = Math.max(0.4, stampOnlineState.zoomLevel - 0.15); renderStampPdfPage(); } }

// ── Place stamp ──
function placeStampOnPdf() {
  if (!stampOnlineState.pdfDoc || !stampOnlineState.selectedItem) return;
  updateStampOnlinePreview();
  var canvas = document.getElementById('stampPdfCanvas');
  var dragEl = document.getElementById('stampDraggable');
  dragEl.style.left = (canvas.offsetLeft + 10) + 'px';
  dragEl.style.top = (canvas.offsetTop + canvas.height - 140) + 'px';
  dragEl.style.display = 'block';
  stampOnlineState.stampPlaced = true;
  saveCurrentStampPosition();
  document.getElementById('btnSaveStampPdf').disabled = false;
  Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: '\u0e25\u0e32\u0e01\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07\u0e44\u0e1b\u0e27\u0e32\u0e07\u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07\u0e17\u0e35\u0e48\u0e15\u0e49\u0e2d\u0e07\u0e01\u0e32\u0e23', text: '\u0e41\u0e25\u0e49\u0e27\u0e01\u0e14\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01 PDF', showConfirmButton: false, timer: 3000 });
}

function saveCurrentStampPosition() {
  var canvas = document.getElementById('stampPdfCanvas');
  var dragEl = document.getElementById('stampDraggable');
  if (!canvas || !dragEl || dragEl.style.display === 'none') return;
  var x = parseInt(dragEl.style.left) - canvas.offsetLeft;
  var y = parseInt(dragEl.style.top) - canvas.offsetTop;
  stampOnlineState.stampPositions[stampOnlineState.currentPage] = { x: x, y: y, pageW: canvas.width, pageH: canvas.height };
}

function stampPdfApplyAll() {
  if (!stampOnlineState.stampPlaced) {
    Swal.fire({ icon: 'warning', title: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e27\u0e32\u0e07\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07', text: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e01\u0e14\u0e1b\u0e38\u0e48\u0e21 "\u0e27\u0e32\u0e07\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07\u0e1a\u0e19 PDF" \u0e01\u0e48\u0e2d\u0e19', timer: 2500, showConfirmButton: false });
    return;
  }
  saveCurrentStampPosition();
  var currentPos = stampOnlineState.stampPositions[stampOnlineState.currentPage];
  if (!currentPos) return;
  for (var i = 1; i <= stampOnlineState.totalPages; i++) {
    stampOnlineState.stampPositions[i] = { x: currentPos.x, y: currentPos.y, pageW: currentPos.pageW, pageH: currentPos.pageH };
  }
  Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: '\u0e1b\u0e31\u0e49\u0e21\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07\u0e17\u0e38\u0e01\u0e2b\u0e19\u0e49\u0e32 (' + stampOnlineState.totalPages + ' \u0e2b\u0e19\u0e49\u0e32) \u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22', showConfirmButton: false, timer: 2000 });
}

// ── Reset ──
function removeStampPdf() {
  stampOnlineState.pdfBytes = null;
  stampOnlineState.pdfDoc = null;
  stampOnlineState.totalPages = 0;
  stampOnlineState.currentPage = 1;
  stampOnlineState.stampPlaced = false;
  stampOnlineState.stampPositions = {};
  stampOnlineState.zoomLevel = 1.0;
  document.getElementById('stampUploadZone').style.display = 'flex';
  document.getElementById('stampPdfViewer').style.display = 'none';
  document.getElementById('stampDraggable').style.display = 'none';
  document.getElementById('btnPlaceStamp').disabled = true;
  document.getElementById('btnSaveStampPdf').disabled = true;
  document.getElementById('stampPdfFileInput').value = '';
  var fnDisplay = document.getElementById('stampFileNameDisplay');
  if (fnDisplay) fnDisplay.style.display = 'none';
}

function resetStampOnline() {
  removeStampPdf();
  stampOnlineState.selectedItem = null;
  var si = document.getElementById('stampItemSearch');
  if (si) si.value = '';
  var infoEl = document.getElementById('stampSelectedItemInfo');
  if (infoEl) { infoEl.style.display = 'none'; infoEl.innerHTML = ''; }
  var uploadBtn = document.getElementById('stampUploadMiniBtn');
  if (uploadBtn) { uploadBtn.style.opacity = '0.5'; uploadBtn.style.pointerEvents = 'none'; }
  document.getElementById('stampOnlineFontSize').value = 10;
  updateStampOnlinePreview();
}

// ── Load Thai font (cached) ──
async function loadSarabunFont() {
  if (stampOnlineState.cachedFontBytes) return stampOnlineState.cachedFontBytes;
  var fontUrls = [
    'https://cdn.jsdelivr.net/gh/Phonbopit/sarabun-webfont@master/fonts/thsarabunnew_bold-webfont.ttf',
    'https://cdn.jsdelivr.net/gh/Phonbopit/sarabun-webfont@master/fonts/thsarabunnew-webfont.ttf'
  ];
  for (var i = 0; i < fontUrls.length; i++) {
    try {
      var response = await fetch(fontUrls[i]);
      if (response.ok) {
        var bytes = await response.arrayBuffer();
        stampOnlineState.cachedFontBytes = bytes;
        console.log('[StampOnline] Loaded font from:', fontUrls[i]);
        return bytes;
      }
    } catch (e) {
      console.warn('[StampOnline] Font URL failed:', fontUrls[i], e.message);
    }
  }
  throw new Error('\u0e44\u0e21\u0e48\u0e2a\u0e32\u0e21\u0e32\u0e23\u0e16\u0e42\u0e2b\u0e25\u0e14\u0e1f\u0e2d\u0e19\u0e15\u0e4c\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22\u0e44\u0e14\u0e49');
}

// ══════════════════════════════════════════════════════
// ★ SAVE STAMPED PDF — with fontkit for Thai support ★
// ══════════════════════════════════════════════════════
async function saveStampedPdf() {
  if (!stampOnlineState.pdfBytes || !stampOnlineState.selectedItem) return;
  saveCurrentStampPosition();

  var pagesToStamp = Object.keys(stampOnlineState.stampPositions);
  if (pagesToStamp.length === 0) {
    Swal.fire({ icon: 'warning', title: '\u0e22\u0e31\u0e07\u0e44\u0e21\u0e48\u0e44\u0e14\u0e49\u0e27\u0e32\u0e07\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07', text: '\u0e01\u0e23\u0e38\u0e13\u0e32\u0e27\u0e32\u0e07\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07\u0e01\u0e48\u0e2d\u0e19\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01', timer: 2500, showConfirmButton: false });
    return;
  }

  Swal.fire({ title: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e2a\u0e23\u0e49\u0e32\u0e07 PDF...', html: '\u0e01\u0e33\u0e25\u0e31\u0e07\u0e42\u0e2b\u0e25\u0e14\u0e1f\u0e2d\u0e19\u0e15\u0e4c\u0e20\u0e32\u0e29\u0e32\u0e44\u0e17\u0e22\u0e41\u0e25\u0e30\u0e2a\u0e23\u0e49\u0e32\u0e07\u0e44\u0e1f\u0e25\u0e4c...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });

  try {
    var PDFDocument = PDFLib.PDFDocument;
    var rgb = PDFLib.rgb;

    var pdfDoc = await PDFDocument.load(stampOnlineState.pdfBytes);

    // ★★★ CRITICAL: Register fontkit for Thai font support ★★★
    pdfDoc.registerFontkit(fontkit);

    // Load and embed Sarabun font (supports Thai)
    var fontBytes = await loadSarabunFont();
    var font = await pdfDoc.embedFont(fontBytes, { subset: false });

    var data = getStampOnlineData();
    var fontSizeEl = document.getElementById('stampOnlineFontSize');
    var baseFontSize = parseInt(fontSizeEl ? fontSizeEl.value : 10);
    var pdfFontSize = baseFontSize * 0.85;

    var pages = pdfDoc.getPages();
    var stampColor = rgb(0, 0.122, 0.376); // #001f60

    for (var pi = 0; pi < pagesToStamp.length; pi++) {
      var pgNum = parseInt(pagesToStamp[pi]);
      var pos = stampOnlineState.stampPositions[pgNum];
      if (!pos || pgNum < 1 || pgNum > pages.length) continue;

      var page = pages[pgNum - 1];
      var pageSize = page.getSize();
      var pageW = pageSize.width;
      var pageH = pageSize.height;

      // Convert canvas coords to PDF coords (flip Y)
      var scaleX = pageW / pos.pageW;
      var scaleY = pageH / pos.pageH;
      var pdfX = pos.x * scaleX;
      var pdfY = pageH - (pos.y * scaleY);

      // Stamp text lines (without item tag as it goes outside the border)
      var lines = [
        '\u0e42\u0e14\u0e22\u0e40\u0e1a\u0e34\u0e01\u0e08\u0e48\u0e32\u0e22\u0e08\u0e32\u0e01\u0e40\u0e07\u0e34\u0e19\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13\u0e23\u0e32\u0e22\u0e08\u0e48\u0e32\u0e22\u0e1b\u0e23\u0e30\u0e08\u0e33\u0e1b\u0e35\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 \u0e1e.\u0e28.\u0e52\u0e55' + data.year,
        '\u0e41\u0e1c\u0e19\u0e07\u0e32\u0e19 : ' + data.plan,
        '\u0e1c\u0e25\u0e1c\u0e25\u0e34\u0e15 : ' + data.output,
        '\u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21 : ' + data.act + '    \u0e01\u0e34\u0e08\u0e01\u0e23\u0e23\u0e21\u0e22\u0e48\u0e2d\u0e22 : ' + data.subAct,
        data.expenseCat,
        '\u0e20\u0e32\u0e22\u0e43\u0e19\u0e27\u0e07\u0e40\u0e07\u0e34\u0e19\u0e07\u0e1a\u0e1b\u0e23\u0e30\u0e21\u0e32\u0e13 \u0e40\u0e1b\u0e47\u0e19\u0e08\u0e33\u0e19\u0e27\u0e19\u0e40\u0e07\u0e34\u0e19 ' + data.amtNum + ' \u0e1a\u0e32\u0e17',
        '(' + data.amtBaht + ')'
      ];

      var lineH = pdfFontSize * 1.55;
      
      // 1. Draw item tag outside (above) the border
      var topTextY = pdfY;
      page.drawText(data.itemTag, { x: pdfX, y: topTextY, size: pdfFontSize + 0.5, font: font, color: stampColor });

      // 2. Draw border
      var boxY = topTextY - (lineH * 0.3); // Start border slightly below the tag
      var rectW = 290 * (pdfFontSize / 8.5); // Scale width relative to base size 10 (pdfFontSize 8.5)
      var rectH = lines.length * lineH + (8 * (pdfFontSize / 8.5));
      page.drawRectangle({
        x: pdfX, y: boxY - rectH, width: rectW, height: rectH,
        borderColor: stampColor, borderWidth: 1.2, opacity: 0
      });

      // 3. Draw text lines inside the border
      for (var li = 0; li < lines.length; li++) {
        var drawX = pdfX + (5 * (pdfFontSize / 8.5));
        var drawY = boxY - ((li + 1) * lineH);
        page.drawText(lines[li], { x: drawX, y: drawY, size: pdfFontSize, font: font, color: stampColor });
      }
    }

    var pdfBytesOut = await pdfDoc.save();
    var blob = new Blob([pdfBytesOut], { type: 'application/pdf' });
    var url = URL.createObjectURL(blob);

    var downloadName = stampOnlineState.fileName.replace('.pdf', '_stamped.pdf');
    var a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (stampOnlineState.selectedItem && stampOnlineState.selectedItem.id) {
      var sid = String(stampOnlineState.selectedItem.id);
      var stamped = JSON.parse(localStorage.getItem('stampedItems') || '[]');
      if (!stamped.includes(sid)) {
        stamped.push(sid);
        localStorage.setItem('stampedItems', JSON.stringify(stamped));
        if (typeof renderTable === 'function') renderTable();
      }
    }

    Swal.fire({
      icon: 'success',
      title: '\u0e1a\u0e31\u0e19\u0e17\u0e36\u0e01 PDF \u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08!',
      html: '<div style="font-size:13px;">\u0e44\u0e1f\u0e25\u0e4c <b>' + downloadName + '</b> \u0e16\u0e39\u0e01\u0e14\u0e32\u0e27\u0e19\u0e4c\u0e42\u0e2b\u0e25\u0e14\u0e40\u0e23\u0e35\u0e22\u0e1a\u0e23\u0e49\u0e2d\u0e22\u0e41\u0e25\u0e49\u0e27<br>\u0e15\u0e23\u0e32\u0e22\u0e32\u0e07\u0e1b\u0e31\u0e49\u0e21\u0e43\u0e19 ' + pagesToStamp.length + ' \u0e2b\u0e19\u0e49\u0e32</div>',
      timer: 3000, showConfirmButton: false
    });
  } catch (err) {
    console.error('PDF save error:', err);
    Swal.fire({ icon: 'error', title: '\u0e40\u0e01\u0e34\u0e14\u0e02\u0e49\u0e2d\u0e1c\u0e34\u0e14\u0e1e\u0e25\u0e32\u0e14', text: err.message, showConfirmButton: true });
  }
}

// ── Drag & Drop for stamp element ──
(function() {
  var isDragging = false;
  var dragStartX, dragStartY, elemStartX, elemStartY;

  document.addEventListener('mousedown', function(e) {
    var dragEl = document.getElementById('stampDraggable');
    if (!dragEl || dragEl.style.display === 'none') return;
    if (e.target.id === 'stampResizeHandle' || (e.target.closest && e.target.closest('#stampResizeHandle'))) return;
    if (e.target.closest && e.target.closest('#stampDraggable')) {
      isDragging = true;
      dragEl.classList.add('dragging');
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      elemStartX = parseInt(dragEl.style.left) || 0;
      elemStartY = parseInt(dragEl.style.top) || 0;
      e.preventDefault();
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    var dragEl = document.getElementById('stampDraggable');
    var canvas = document.getElementById('stampPdfCanvas');
    if (!dragEl || !canvas) return;
    var newX = elemStartX + (e.clientX - dragStartX);
    var newY = elemStartY + (e.clientY - dragStartY);
    var minX = canvas.offsetLeft;
    var minY = canvas.offsetTop;
    var maxX = canvas.offsetLeft + canvas.width - dragEl.offsetWidth;
    var maxY = canvas.offsetTop + canvas.height - dragEl.offsetHeight;
    newX = Math.max(minX, Math.min(maxX, newX));
    newY = Math.max(minY, Math.min(maxY, newY));
    dragEl.style.left = newX + 'px';
    dragEl.style.top = newY + 'px';
  });

  document.addEventListener('mouseup', function() {
    if (isDragging) {
      isDragging = false;
      var dragEl = document.getElementById('stampDraggable');
      if (dragEl) dragEl.classList.remove('dragging');
      saveCurrentStampPosition();
    }
  });
})();

// ── Drag & Drop file on upload zone ──
document.addEventListener('DOMContentLoaded', function() {
  var zone = document.getElementById('stampUploadZone');
  if (!zone) return;
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function() { zone.classList.remove('drag-over'); });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file) handleStampPdfUpload(file);
  });
});
