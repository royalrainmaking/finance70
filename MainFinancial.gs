const SPREADSHEET_ID = '1WCXrR9h7sMig6uebRcxJHL6A1EGVBPj6zeObixkuxDU';
const SHEET_GID = 1567872987; 
const STAMP_SETTINGS_GID = 1243086150;

function doGet(e) {
  try {
    const action = e.parameter.action;
    if (action === 'getInitialData') return ContentService.createTextOutput(JSON.stringify(budget_getInitialData())).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getBuranakanData') return ContentService.createTextOutput(JSON.stringify(budget_getBuranakanData(e.parameter.planKey))).setMimeType(ContentService.MimeType.JSON);
    if (action === 'gf_getSheetData') return ContentService.createTextOutput(JSON.stringify(gf_getSheetData())).setMimeType(ContentService.MimeType.JSON);
    if (action === 'foreign_getData') return ContentService.createTextOutput(JSON.stringify(foreign_getData())).setMimeType(ContentService.MimeType.JSON);
    if (action === 'getContracts') return ContentService.createTextOutput(JSON.stringify(contract_getContracts())).setMimeType(ContentService.MimeType.JSON);
    return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid Action' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON); }
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const action = params.action;
    let res;
    if (action === 'submitReserve') res = budget_submitReserve(params.data);
    else if (action === 'submitReserveAdd') res = budget_submitReserveAdd(params.data);
    else if (action === 'submitDeduct') res = budget_submitDeduct(params.data);
    else if (action === 'submitOffset') res = budget_submitOffset(params.data);
    else if (action === 'submitDeductAdd') res = budget_submitDeductAdd(params.data);
    else if (action === 'submitUpdate') res = budget_submitUpdate(params.data);
    else if (action === 'submitCancel') res = budget_submitCancel(params.data);
    else if (action === 'deleteItem') res = budget_deleteItem(params.data);
    else if (action === 'submitReserveNo') res = budget_submitReserveNo(params.data);
    else if (action === 'submitReserveAndDeduct') res = budget_submitReserveAndDeduct(params.data);
    else if (action === 'savePlan') res = budget_savePlan(params.data);
    else if (action === 'deletePlan') res = budget_deletePlan(params.data);
    else if (action === 'saveCustomCategory') res = budget_saveCustomCategory(params.data);
    else if (action === 'submitDocTracking') res = budget_submitDocTracking(params.data);
    else if (action === 'gf_updateSheetData') res = gf_updateSheetData(params.data);
    else if (action === 'saveStampSettings') res = budget_saveStampSettings(params.data);
    else if (action === 'updateStampStatus') res = updateStampStatus(params.data);
    else if (action === 'saveContract') res = contract_saveContract(params.data);
    else if (action === 'deleteContract') res = contract_deleteContract(params.data);
    else if (action === 'foreign_add') res = foreign_add(params.data);
    else if (action === 'gf_updateExtra') res = gf_updateExtra(params.data);
    else if (action === 'foreign_update') res = foreign_update(params.data);
    else if (action === 'foreign_delete') res = foreign_delete(params.data);

    return ContentService.createTextOutput(JSON.stringify(res || { error: 'Action not found' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return ContentService.createTextOutput(JSON.stringify({ error: err.message })).setMimeType(ContentService.MimeType.JSON); }
}

const DATA_START_ROW = 3; // สเปรดชีตมี Header 2 แถว (แถว 1-2) ข้อมูลเริ่มที่แถว 3

function budget_getTargetSheet() { 
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  for (const sheet of sheets) {
    if (sheet.getSheetId() === SHEET_GID) {
      return sheet;
    }
  }
  return sheets[0]; 
}

function budget_getBuranakanData(planKey) {
  return {
    success: true,
    data: {
      budgetAfterAdjust: 0,
      gfTotal: 0,
      contractRemaining: 0,
      budgetRemaining: 0
    }
  };
}

function budget_formatThaiDate(date) {
  if (!date || !(date instanceof Date) || isNaN(date)) return date;
  const months = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  let year = date.getFullYear();
  if (year < 2400) year += 543;
  return `${date.getDate()} ${months[date.getMonth()]} ${year.toString().slice(-2)}`;
}

function budget_applyFormulas(sheet, row) {
  sheet.getRange(row, 14).setFormula(`=IF(G${row}="","",TEXT(G${row},"mmm"))`);
}

function budget_isLiquidated(liqVal) {
  if (!liqVal) return false;
  const liqStr = (liqVal instanceof Date) ? liqVal.toISOString() : liqVal.toString();
  return liqStr === '2025-10-28T17:00:00.000Z' || liqStr === '69-05-00033';
}

function budget_findParentAndInsertIndex(idData, parentIdStr) {
  let pIdx = -1; 
  let mSub = 0; 
  let insAt = -1;
  for (let i = 0; i < idData.length; i++) {
    const cur = idData[i][0].toString();
    if (cur === parentIdStr) { 
      pIdx = i + 5; 
      insAt = pIdx; 
    }
    if (cur.startsWith(parentIdStr + ".")) {
      const s = parseInt(cur.split(".")[1], 10); 
      if (s > mSub) mSub = s;
      insAt = i + 5;
    }
  }
  return { pIdx, insAt, nextSub: mSub + 1 };
}

function budget_getInitialData() {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const lastCol = Math.max(19, sheet.getLastColumn());
  if (lastRow < DATA_START_ROW) return { entries: [], todayThai: budget_formatThaiDate(new Date()) };
  
  const data = sheet.getRange(DATA_START_ROW, 1, lastRow - (DATA_START_ROW - 1), lastCol).getValues();
  let parentMap = {};
  
  const entries = data.filter(r => r[0]).map(row => {
    const id = row[0].toString();
    const plan = row[1];
    const type = row[2];
    const remark = row[3];
    const dateCrl = row[4];
    const liqRef = row[5];
    const dateGF = row[6];
    const colF = row[7];
    const refNo = row[8];
    const letterDate = row[9];
    let name = row[10];
    let dept = row[11];
    let cat = row[12];
    const month = row[13];
    const reserveAmount = parseFloat(row[14]) || 0;
    const deductAmount = parseFloat(row[15]) || 0;
    let desc = row[16];
    let reserveNumber = row[17] || "";
    let docTrackingRaw = row[18];
    let docTracking = { step: "", location: "", notes: "", lastModified: "" };
    try {
      if (docTrackingRaw) docTracking = JSON.parse(docTrackingRaw);
    } catch(e) {}
    
    const isSub = id.includes(".");
    
    if (!isSub) {
      parentMap[id] = { name, dept, desc, cat, type, plan };
    } else {
      const parentId = id.split('.')[0];
      const pInfo = parentMap[parentId] || {};
      if (!name) name = pInfo.name || name;
      if (!dept) dept = pInfo.dept || dept;
      if (!desc) desc = pInfo.desc || desc;
      if (!cat) cat = pInfo.cat || cat;
    }

    return { 
      id: id, 
      plan: plan,
      type: type || remark, 
      remark: remark,
      date: budget_formatThaiDate(dateCrl), 
      letterDateRaw: letterDate, 
      letterDateFormatted: budget_formatThaiDate(letterDate), 
      refNo: refNo, 
      name: name, 
      dept: dept, 
      desc: desc, 
      catCode: cat, 
      amount: reserveAmount, 
      amountDeduct: deductAmount, 
      colE: budget_formatThaiDate(dateGF),
      colF: budget_formatThaiDate(colF), 
      liquidateRefNo: liqRef,
      month: month,
      reserveNumber: reserveNumber,
      docTracking: docTracking,
      stampStatus: row[19] || ""
    };
  }).reverse();
  const plans = budget_getPlans();
  const customCategories = budget_getCustomCategories();
  const stampSettings = budget_getStampSettings();
  return { entries, todayThai: budget_formatThaiDate(new Date()), plans: plans, customCategories: customCategories, stampSettings: stampSettings };
}

function budget_submitReserve(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  let max = 0; ids.forEach(r => { let v = parseInt(r[0]); if(v > max) max = v; });
  const nextId = max + 1;
  const nr = lastRow + 1;
  
  sheet.getRange(nr, 1).setValue(nextId);
  sheet.getRange(nr, 2).setValue(data.plan || "");
  sheet.getRange(nr, 3).setValue(data.type || "PO"); 
  sheet.getRange(nr, 4).setValue(data.remark || "");
  sheet.getRange(nr, 5).setValue(new Date()); 
  sheet.getRange(nr, 9).setValue(data.refNo || "");
  sheet.getRange(nr, 10).setValue(data.letterDate || "");
  sheet.getRange(nr, 11).setValue(data.name || "");
  sheet.getRange(nr, 12).setValue(data.dept || "");
  sheet.getRange(nr, 13).setValue(data.catCode || "");
  sheet.getRange(nr, 15).setValue(parseFloat(data.amount) || 0); 
  sheet.getRange(nr, 17).setValue(data.desc || "");
  
  budget_applyFormulas(sheet, nr);
  return { success: true, id: nextId };
}

function budget_submitDeduct(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const idData = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  
  if (data.mode === 'PO') {
    const pIdStr = data.id.toString();
    const { pIdx, insAt, nextSub } = budget_findParentAndInsertIndex(idData, pIdStr);
    
    if (pIdx === -1) throw new Error("Parent ID not found");
    
    const parentLiq = sheet.getRange(pIdx, 6).getValue();
    if (budget_isLiquidated(parentLiq)) throw new Error("รายการหลักถูกตัดยอดแล้ว");

    const nId = pIdStr + "." + nextSub;
    sheet.insertRowAfter(insAt);
    const nr = insAt + 1;
    
    const pVals = sheet.getRange(pIdx, 1, 1, 17).getValues()[0];
    
    sheet.getRange(nr, 1).setValue(nId);
    sheet.getRange(nr, 2).setValue(pVals[1]); 
    sheet.getRange(nr, 3).setValue(pVals[2]); 
    sheet.getRange(nr, 4).setValue(pVals[3]); 
    sheet.getRange(nr, 5).setValue(new Date()); 
    sheet.getRange(nr, 6).setValue(data.liquidateRefNo || "");
    if (data.colF) sheet.getRange(nr, 8).setValue(data.colF);
    
    sheet.getRange(nr, 9).setValue(pVals[8]); 
    sheet.getRange(nr, 10).setValue(data.liquidateLetterDate || ""); 
    sheet.getRange(nr, 11).setValue(data.name || pVals[10]);
    sheet.getRange(nr, 12).setValue(pVals[11]);
    sheet.getRange(nr, 13).setValue(pVals[12]);
    sheet.getRange(nr, 16).setValue(parseFloat(data.amount) || 0); 
    sheet.getRange(nr, 17).setValue(data.desc || pVals[16]);
    
    budget_applyFormulas(sheet, nr);
    return { success: true, id: nId };
  } else {
    let target = -1; for (let i = idData.length - 1; i >= 0; i--) if(idData[i][0].toString().trim() === data.id.toString().trim()) { target = i + DATA_START_ROW; break; }
    if (target === -1) throw new Error("ID not found");
    
    const currentLiq = sheet.getRange(target, 6).getValue();
    if (budget_isLiquidated(currentLiq)) throw new Error("รายการนี้ถูกตัดยอดแล้ว");

    if (data.name) sheet.getRange(target, 11).setValue(data.name);
    if (data.desc) sheet.getRange(target, 17).setValue(data.desc);
    if (data.colF) sheet.getRange(target, 8).setValue(data.colF);
    sheet.getRange(target, 5).setValue(new Date()); 
    sheet.getRange(target, 6).setValue(data.liquidateRefNo);
    sheet.getRange(target, 10).setValue(data.liquidateLetterDate); 
    sheet.getRange(target, 16).setValue(parseFloat(data.amount) || 0);
    
    budget_applyFormulas(sheet, target);
    return { success: true };
  }
}

function budget_submitOffset(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const idData = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  const pIdStr = data.id.toString();
  const { pIdx, insAt, nextSub } = budget_findParentAndInsertIndex(idData, pIdStr);
  
  if (pIdx === -1) throw new Error("Parent ID not found");
  
  const parentLiq = sheet.getRange(pIdx, 6).getValue();
  if (budget_isLiquidated(parentLiq)) throw new Error("รายการหลักถูกตัดยอดแล้ว");

  const nId = pIdStr + "." + nextSub;
  sheet.insertRowAfter(insAt);
  const nr = insAt + 1;
  
  const pVals = sheet.getRange(pIdx, 1, 1, 17).getValues()[0];
  
  sheet.getRange(nr, 1).setValue(nId);
  sheet.getRange(nr, 2).setValue(pVals[1]); 
  sheet.getRange(nr, 3).setValue("หักล้างเงินยืม");
  sheet.getRange(nr, 4).setValue(pVals[3]);
  sheet.getRange(nr, 5).setValue(new Date()); 
  sheet.getRange(nr, 6).setValue(data.liquidateRefNo || "");
  if (data.colF) sheet.getRange(nr, 8).setValue(data.colF);
  
  sheet.getRange(nr, 9).setValue(pVals[8]); 
  sheet.getRange(nr, 10).setValue(data.liquidateLetterDate || ""); 
  sheet.getRange(nr, 11).setValue(data.name || pVals[10]);
  sheet.getRange(nr, 12).setValue(pVals[11]);
  sheet.getRange(nr, 13).setValue(pVals[12]);
  
  sheet.getRange(nr, 15).setValue(Math.abs(parseFloat(data.amount || pVals[14])) * -1); 
  sheet.getRange(nr, 17).setValue(data.desc || pVals[16]);
  
  budget_applyFormulas(sheet, nr);
  return { success: true, id: nId };
}

function budget_submitUpdate(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  let target = -1; for (let i = ids.length - 1; i >= 0; i--) if(ids[i][0].toString().trim() === data.id.toString().trim()) { target = i + DATA_START_ROW; break; }
  if (target === -1) throw new Error("ID not found");
  
  if (data.plan !== undefined) sheet.getRange(target, 2).setValue(data.plan || "");
  if (data.type) sheet.getRange(target, 3).setValue(data.type);
  if (data.liquidateRefNo !== undefined) sheet.getRange(target, 6).setValue(data.liquidateRefNo || "");
  if (data.colF !== undefined) sheet.getRange(target, 8).setValue(data.colF || "");
  if (data.refNo !== undefined) sheet.getRange(target, 9).setValue(data.refNo || "");
  if (data.letterDate !== undefined) sheet.getRange(target, 10).setValue(data.letterDate || ""); 
  if (data.name !== undefined) sheet.getRange(target, 11).setValue(data.name || "");
  if (data.dept !== undefined) sheet.getRange(target, 12).setValue(data.dept || "");
  if (data.catCode !== undefined) sheet.getRange(target, 13).setValue(data.catCode || "");
  if (data.amount !== undefined) sheet.getRange(target, 15).setValue(data.amount === "" ? "" : parseFloat(data.amount));
  if (data.amountDeduct !== undefined) sheet.getRange(target, 16).setValue(data.amountDeduct === "" ? "" : parseFloat(data.amountDeduct));
  if (data.desc !== undefined) sheet.getRange(target, 17).setValue(data.desc || "");
  if (data.reserveNumber !== undefined) sheet.getRange(target, 18).setValue(data.reserveNumber || "");
  
  budget_applyFormulas(sheet, target);
  return { success: true };
}

function budget_submitReserveNo(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  let target = -1; for (let i = ids.length - 1; i >= 0; i--) if(ids[i][0].toString().trim() === data.id.toString().trim()) { target = i + DATA_START_ROW; break; }
  if (target === -1) throw new Error("ID not found");
  
  sheet.getRange(target, 18).setValue(data.reserveNumber || "");
  SpreadsheetApp.flush();
  
  return { success: true };
}

function budget_submitDocTracking(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  let target = -1; 
  for (let i = ids.length - 1; i >= 0; i--) {
    if(ids[i][0].toString().trim() === data.id.toString().trim()) { target = i + DATA_START_ROW; break; }
  }
  if (target === -1) throw new Error("ID not found");
  
  sheet.getRange(target, 19).setValue(JSON.stringify(data.docTracking));
  
  return { success: true };
}

function budget_submitReserveAdd(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const idData = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  
  const pIdStr = data.parentId.toString();
  const { pIdx, insAt, nextSub } = budget_findParentAndInsertIndex(idData, pIdStr);
  
  if (pIdx === -1) throw new Error("Parent ID not found");
  
  const pVals = sheet.getRange(pIdx, 1, 1, 17).getValues()[0];
  
  const nId = pIdStr + "." + nextSub;
  sheet.insertRowAfter(insAt);
  const nr = insAt + 1;
  
  sheet.getRange(nr, 1).setValue(nId);
  sheet.getRange(nr, 2).setValue(data.plan || pVals[1]);
  sheet.getRange(nr, 3).setValue(data.type || "กันเงินเพิ่ม");
  sheet.getRange(nr, 4).setValue(data.remark || "");
  sheet.getRange(nr, 5).setValue(new Date()); 
  sheet.getRange(nr, 9).setValue(data.refNo || "");
  sheet.getRange(nr, 10).setValue(data.letterDate || "");
  sheet.getRange(nr, 11).setValue(data.name || "");
  sheet.getRange(nr, 12).setValue(data.dept || "");
  sheet.getRange(nr, 13).setValue(data.catCode || "");
  sheet.getRange(nr, 15).setValue(parseFloat(data.amount) || 0);
  sheet.getRange(nr, 17).setValue(data.desc || "");
  
  budget_applyFormulas(sheet, nr);
  return { success: true, id: nId };
}

function budget_submitDeductAdd(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const idData = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  
  const pIdStr = data.id.toString();
  const { pIdx, insAt, nextSub } = budget_findParentAndInsertIndex(idData, pIdStr);
  
  if (pIdx === -1) throw new Error("Parent ID not found");
  
  const parentLiq = sheet.getRange(pIdx, 6).getValue();
  if (budget_isLiquidated(parentLiq)) throw new Error("รายการหลักถูกตัดยอดแล้ว");

  const nId = pIdStr + "." + nextSub;
  sheet.insertRowAfter(insAt);
  const nr = insAt + 1;
  const pVals = sheet.getRange(pIdx, 1, 1, 17).getValues()[0];

  sheet.getRange(nr, 1).setValue(nId);
  sheet.getRange(nr, 2).setValue(pVals[1]);
  sheet.getRange(nr, 3).setValue("ตัดยอดเพิ่ม");
  sheet.getRange(nr, 4).setValue(pVals[3]);
  sheet.getRange(nr, 5).setValue(new Date()); 
  sheet.getRange(nr, 6).setValue(data.liquidateRefNo || "");
  if (data.colF) sheet.getRange(nr, 8).setValue(data.colF);
  
  sheet.getRange(nr, 9).setValue(pVals[8]); 
  sheet.getRange(nr, 10).setValue(data.liquidateLetterDate || ""); 
  sheet.getRange(nr, 11).setValue(data.name || pVals[10]);
  sheet.getRange(nr, 12).setValue(pVals[11]);
  sheet.getRange(nr, 13).setValue(pVals[12]);
  sheet.getRange(nr, 16).setValue(parseFloat(data.amount) || 0); 
  sheet.getRange(nr, 17).setValue(data.desc || pVals[16]);
  
  budget_applyFormulas(sheet, nr);
  return { success: true, id: nId };
}

function budget_deleteItem(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const idData = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();

  let target = -1;
  for (let i = idData.length - 1; i >= 0; i--) {
    if (idData[i][0].toString().trim() === data.id.toString().trim()) { target = i + DATA_START_ROW; break; }
  }
  if (target === -1) throw new Error("ID not found");

  sheet.deleteRow(target);
  return { success: true };
}

function budget_submitCancel(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const idData = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();

  let target = -1;
  for (let i = idData.length - 1; i >= 0; i--) {
    if (idData[i][0].toString().trim() === data.id.toString().trim()) { target = i + DATA_START_ROW; break; }
  }
  if (target === -1) throw new Error("ID not found");

  const reserveAmt = sheet.getRange(target, 15).getValue();
  
  sheet.getRange(target, 8).setValue("ยกเลิก"); 
  sheet.getRange(target, 15).setValue(0);
  sheet.getRange(target, 4).setValue("ยกเลิกเงิน " + reserveAmt);
  
  budget_applyFormulas(sheet, target);
  return { success: true };
}

function budget_submitReserveAndDeduct(data) {
  const sheet = budget_getTargetSheet();
  const lastRow = sheet.getLastRow();
  const ids = sheet.getRange(DATA_START_ROW, 1, Math.max(1, lastRow - (DATA_START_ROW - 1)), 1).getValues();
  let max = 0; ids.forEach(r => { let v = parseInt(r[0]); if(v > max) max = v; });
  const nextId = max + 1;
  const nr = lastRow + 1;
  
  sheet.getRange(nr, 1).setValue(nextId);
  sheet.getRange(nr, 2).setValue(data.plan || "");
  sheet.getRange(nr, 3).setValue(data.type || "PO"); 
  sheet.getRange(nr, 4).setValue(data.remark || "");
  sheet.getRange(nr, 5).setValue(new Date()); 
  sheet.getRange(nr, 6).setValue(data.liquidateRefNo || "");
  sheet.getRange(nr, 8).setValue(data.colF || "");
  sheet.getRange(nr, 9).setValue(data.refNo || "");
  sheet.getRange(nr, 10).setValue(data.letterDate || "");
  sheet.getRange(nr, 11).setValue(data.name || "");
  sheet.getRange(nr, 12).setValue(data.dept || "");
  sheet.getRange(nr, 13).setValue(data.catCode || "");
  
  const amt = parseFloat(data.amount) || 0;
  sheet.getRange(nr, 15).setValue(amt); 
  sheet.getRange(nr, 16).setValue(amt); 
  
  sheet.getRange(nr, 17).setValue(data.desc || "");
  
  budget_applyFormulas(sheet, nr);
  return { success: true, id: nextId };
}

function budget_getPlanSettingsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('PlanSettings');
  if (!sheet) {
    sheet = ss.insertSheet('PlanSettings');
    sheet.appendRow(['PlanShortName', 'PlanFullName', 'Output', 'Activity', 'Group', 'Item', 'Allocated', 'Increase', 'Decrease', 'Color', 'Remark']);
    sheet.getRange(1, 1, 1, 11).setFontWeight("bold").setBackground("#f3f4f6");
  }
  return sheet;
}

function budget_getPlans() {
  const sheet = budget_getPlanSettingsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  const maxCols = Math.max(10, sheet.getLastColumn());
  const data = sheet.getRange(2, 1, lastRow - 1, maxCols).getValues();
  
  const plansMap = {};
  data.forEach(row => {
    const shortName = row[0];
    const fullName = row[1];
    const output = row[2];
    const activity = row[3];
    const group = row[4];
    const item = row[5];
    const allocated = row[6];
    const increase = row[7];
    const decrease = row[8] || 0;
    const color = row[9] || '#6366f1';
    const remark = row[10] || '';
    
    if (!shortName) return;
    
    if (!plansMap[shortName]) {
      plansMap[shortName] = {
        shortName: String(shortName),
        fullName: fullName ? String(fullName) : '',
        output: output ? String(output) : '',
        activity: activity ? String(activity) : '',
        color: color ? String(color) : '#6366f1',
        budgets: []
      };
    }
    
    if (group && item) {
      plansMap[shortName].budgets.push({
        group: String(group),
        item: String(item),
        allocated: Number(allocated) || 0,
        increase: Number(increase) || 0,
        decrease: Number(decrease) || 0,
        remark: String(remark)
      });
    }
  });
  
  return Object.values(plansMap);
}

function budget_savePlan(planData) {
  const sheet = budget_getPlanSettingsSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow >= 2) {
    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = data.length - 1; i >= 0; i--) {
      if (String(data[i][0]) === planData.shortName) {
        sheet.deleteRow(i + 2);
      }
    }
  }
  
  const newRows = [];
  if (planData.budgets && planData.budgets.length > 0) {
    planData.budgets.forEach(b => {
      newRows.push([
        planData.shortName,
        planData.fullName,
        planData.output,
        planData.activity,
        b.group,
        b.item,
        b.allocated || 0,
        b.increase || 0,
        b.decrease || 0,
        planData.color || '#6366f1',
        b.remark || ''
      ]);
    });
  } else {
    newRows.push([planData.shortName, planData.fullName, planData.output, planData.activity, '', '', 0, 0, 0, planData.color || '#6366f1', '']);
  }
  
  if (newRows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 11).setValues(newRows);
  }
  
  return { success: true };
}

function budget_deletePlan(data) {
  const sheet = budget_getPlanSettingsSheet();
  const lastRow = sheet.getLastRow();
  
  if (lastRow >= 2) {
    const sheetData = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (let i = sheetData.length - 1; i >= 0; i--) {
      if (String(sheetData[i][0]) === data.shortName) {
        sheet.deleteRow(i + 2);
      }
    }
  }
  
  return { success: true };
}

function budget_getCustomCategoriesSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('CustomCategories');
  if (!sheet) {
    sheet = ss.insertSheet('CustomCategories');
    sheet.appendRow(['Type', 'CategoryName', 'CategoryCode']);
    sheet.getRange(1, 1, 1, 3).setFontWeight("bold").setBackground("#f3f4f6");
  }
  return sheet;
}

function budget_getCustomCategories() {
  const sheet = budget_getCustomCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { "งบลงทุน": [], "รายจ่ายอื่น": [] };
  const data = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
  
  const result = { "งบลงทุน": [], "รายจ่ายอื่น": [] };
  data.forEach(row => {
    const type = row[0];
    const catName = row[1];
    const catCode = row[2];
    if (type && catName) {
      if (!result[type]) result[type] = [];
      result[type].push({ value: catCode || catName, text: catName });
    }
  });
  return result;
}

function budget_saveCustomCategory(data) {
  const sheet = budget_getCustomCategoriesSheet();
  const type = data.type;
  const catName = data.categoryName;
  const catCode = data.categoryCode || catName;
  
  if (!type || !catName) throw new Error("Invalid custom category data");
  
  sheet.appendRow([type, catName, catCode]);
  return { success: true };
}

// ==========================================
// ระบบอัปเดตข้อมูล GF อัตโนมัติ
// ==========================================

function gf_getSheetData() {
  try {
    const sheet = budget_getTargetSheet();
    // ดึงข้อมูลทั้งหมดในชีท
    const data = sheet.getDataRange().getDisplayValues();
    return { result: data, success: true };
  } catch(e) {
    return { error: e.message, success: false };
  }
}

function gf_updateSheetData(data) {
  try {
    let updates = data.updates;
    let config = data.config;
    
    if (typeof updates === 'string') updates = JSON.parse(updates);
    if (typeof config === 'string') config = JSON.parse(config);
    
    const sheet = budget_getTargetSheet();
    const updateColumnIndex = 7; // คอลัมน์ G คือ Index 7 (1-indexed)
    
    let updatedCount = 0;
    let skippedCount = 0;
    let columnFCount = 0;
    
    for (let i = 0; i < updates.length; i++) {
      const update = updates[i];
      const rowIndex = update.row; // 1-indexed
      
      const targetCell = sheet.getRange(rowIndex, updateColumnIndex);
      const currentValue = targetCell.getValue();
      
      // อัปเดตเฉพาะช่องว่างหรือเป็น 0
      if (currentValue === '' || currentValue === null || currentValue === 0) {
        targetCell.setValue(update.value);
        updatedCount++;
        if (update.sourceColumn === 'F') columnFCount++;
      } else {
        skippedCount++;
      }
    }
    
    return {
      success: true,
      message: 'อัปเดตข้อมูลเสร็จสมบูรณ์',
      updatedCount: updatedCount,
      skippedCount: skippedCount,
      columnFCount: columnFCount
    };
    
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// ระบบตั้งค่าตรายางประจำแผน (Sheet GID 1243086150)
// ==========================================

function budget_getStampSettingsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  for (const sheet of sheets) {
    if (String(sheet.getSheetId()) === String(STAMP_SETTINGS_GID) || sheet.getName() === 'StampSettings') {
      return sheet;
    }
  }
  let sheet = ss.insertSheet('StampSettings');
  sheet.appendRow(['PlanKey', 'Year', 'Plan', 'Output', 'Act', 'SubAct', 'ExpenseCat', 'LastUpdated']);
  sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e0f2fe");
  return sheet;
}

function budget_getStampSettings() {
  try {
    const sheet = budget_getStampSettingsSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return {};

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const settings = {};
    data.forEach(r => {
      const pKey = String(r[0]).trim();
      if (pKey) {
        settings[pKey] = {
          year: String(r[1]),
          plan: String(r[2]),
          output: String(r[3]),
          act: String(r[4]),
          subAct: String(r[5]),
          expenseCat: String(r[6])
        };
      }
    });
    return settings;
  } catch(e) {
    return {};
  }
}

function budget_saveStampSettings(data) {
  try {
    if (!data) return { success: false, error: 'No data provided' };
    const sheet = budget_getStampSettingsSheet();
    const planKey = data.planKey || (data.stampData && data.stampData.plan) || "Default";
    const stamp = data.stampData || data;

    const lastRow = sheet.getLastRow();
    let foundRow = -1;

    if (lastRow >= 2) {
      const pKeys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < pKeys.length; i++) {
        if (String(pKeys[i][0]).trim() === String(planKey).trim()) {
          foundRow = i + 2;
          break;
        }
      }
    }

    const rowValues = [
      planKey,
      stamp.year || "๗๐",
      stamp.plan || "",
      stamp.output || "",
      stamp.act || "",
      stamp.subAct || "",
      stamp.expenseCat || "",
      new Date().toISOString()
    ];

    if (foundRow > -1) {
      sheet.getRange(foundRow, 1, 1, 8).setValues([rowValues]);
    } else {
      sheet.appendRow(rowValues);
    }

    return { success: true, planKey: planKey };
  } catch(e) {
    return { success: false, error: e.message };
  }
}

// ==========================================
// ระบบบันทึกสถานะตรายาง (Column T)
// ==========================================
function updateStampStatus(data) {
  try {
    const sheet = budget_getTargetSheet(data.plan || '1.ฝนหลวง');
    const ids = (data.ids || '').toString().split(',');
    const status = data.status || '';
    
    const targetCol = 20; // คอลัมน์ T คือคอลัมน์ที่ 20
    
    const lastRow = sheet.getLastRow();
    if (lastRow < 5) return { success: false, message: 'No data' };
    
    const idData = sheet.getRange(5, 1, lastRow - 4, 1).getValues();
    let updatedCount = 0;
    
    for (let i = 0; i < idData.length; i++) {
      if (ids.includes(idData[i][0].toString())) {
        sheet.getRange(i + 5, targetCol).setValue(status);
        updatedCount++;
      }
    }
    
    return { success: true, updatedCount: updatedCount };
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// ==========================================
// ระบบบริหารสัญญา (Contracts)
// ==========================================

// ระบบบริหารสัญญา: เก็บข้อมูลในชีต "สัญญา" ของสเปรดชีตกันเงิน (SPREADSHEET_ID)
// ตั้งค่าครั้งแรก: เลือกฟังก์ชัน setupContractSheet แล้วกด Run
//   -> สร้างชีต "สัญญา" และย้ายข้อมูลจากชีต "Contracts" เดิมมาให้ (ชีตเดิมเก็บไว้เป็นแบ็กอัป)
const CONTRACT_SHEET_NAME = 'สัญญา';
const CONTRACT_OLD_SHEET_NAME = 'Contracts';
const CONTRACT_LEGACY_SHEET_ID = '1IIVGMkbANWYbWAsRXGBKUJuvkXxPUsECatdzRPauvtw';
const CONTRACT_LEGACY_SHEET_NAME = 'Projects';
const AIRCRAFT_PLAN = 'จัดหาอากาศยาน';

// ลำดับคอลัมน์ของชีต "สัญญา" (key = ชื่อฟิลด์ในระบบ, label = หัวคอลัมน์ในชีต)
const CONTRACT_COLS = [
  ['id', 'ID'],
  ['plan', 'แผนงาน'],
  ['itemType', 'ประเภทงบ'],
  ['name', 'ชื่อโครงการ'],
  ['contractType', 'วิธีจัดซื้อจัดจ้าง'],
  ['contractor', 'ผู้รับจ้าง'],
  ['supervisor', 'ผู้ควบคุมงาน'],
  ['contractNo', 'เลขที่สัญญา'],
  ['allocated', 'งบที่ได้รับจัดสรร'],
  ['budget', 'วงเงินโครงการ'],
  ['po', 'PO'],
  ['disbursed', 'เบิกจ่าย'],
  ['duration', 'ระยะเวลา (วัน)'],
  ['tor', 'TOR'],
  ['announce', 'ประกาศ'],
  ['consideration', 'พิจารณา'],
  ['appeal', 'อุทธรณ์'],
  ['waitsign', 'รอลงนาม'],
  ['signed', 'ลงนามสัญญา'],
  ['date_inspection', 'วันที่ตรวจรับ'],
  ['date_payment', 'วันที่เบิกจ่าย'],
  ['gfRefNo', 'เลขที่ขอเบิก (GF)'],
  ['gfDate', 'วันที่ GF'],
  ['comm_tor', 'กก.กำหนด TOR'],
  ['comm_eval', 'กก.พิจารณา'],
  ['comm_inspect', 'กก.ตรวจรับ'],
  ['notes_json', 'ข้อมูลอื่น (JSON)'],
  ['updatedAt', 'อัปเดตล่าสุด']
];
const CONTRACT_KEYS = CONTRACT_COLS.map(c => c[0]);
const CONTRACT_NOTE_KEYS = ['plan', 'itemType', 'contractNo', 'date_inspection', 'date_payment', 'gfRefNo', 'gfDate', 'comm_tor', 'comm_eval', 'comm_inspect'];
const CONTRACT_DATE_KEYS = ['tor', 'announce', 'consideration', 'appeal', 'waitsign', 'signed'];

function contract_cellStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
  return v === null || v === undefined ? '' : String(v);
}

// แปลงแถวในชีต -> object รูปแบบที่หน้าเว็บใช้ { ..., dates: {}, notes: {} }
function contract_rowToObj_(row) {
  const r = {};
  CONTRACT_KEYS.forEach((k, i) => r[k] = row[i]);
  let notes = {};
  try { notes = r.notes_json ? JSON.parse(String(r.notes_json)) : {}; } catch (e) {}
  CONTRACT_NOTE_KEYS.forEach(k => { const v = contract_cellStr_(r[k]); if (v !== '') notes[k] = v; else delete notes[k]; });
  const dates = {};
  CONTRACT_DATE_KEYS.forEach(k => dates[k] = contract_cellStr_(r[k]));
  return {
    id: Number(r.id),
    name: contract_cellStr_(r.name),
    contractType: contract_cellStr_(r.contractType),
    contractor: contract_cellStr_(r.contractor),
    supervisor: contract_cellStr_(r.supervisor),
    allocated: Number(r.allocated) || 0,
    budget: Number(r.budget) || 0,
    po: Number(r.po) || 0,
    disbursed: Number(r.disbursed) || 0,
    duration: Number(r.duration) || 0,
    dates: dates,
    notes: notes
  };
}

// แปลง object จากหน้าเว็บ -> แถวในชีต
function contract_objToRow_(p, id) {
  const notes = Object.assign({}, p.notes || {});
  const d = p.dates || {};
  // แผนจัดหาอากาศยาน: ประเภทงบเป็นงบลงทุนเสมอ
  if (notes.itemType === AIRCRAFT_PLAN) { notes.plan = AIRCRAFT_PLAN; notes.itemType = 'งบลงทุน'; }
  if (notes.plan === AIRCRAFT_PLAN && !notes.itemType) notes.itemType = 'งบลงทุน';
  const rest = Object.assign({}, notes);
  CONTRACT_NOTE_KEYS.forEach(k => delete rest[k]);
  const v = {
    id: id, plan: notes.plan || '', itemType: notes.itemType || '', name: p.name || '',
    contractType: p.contractType || '', contractor: p.contractor || '', supervisor: p.supervisor || '',
    contractNo: notes.contractNo || '',
    allocated: Number(p.allocated) || 0, budget: Number(p.budget) || 0, po: Number(p.po) || 0, disbursed: Number(p.disbursed) || 0,
    duration: Number(p.duration) || 0,
    date_inspection: notes.date_inspection || '', date_payment: notes.date_payment || '',
    gfRefNo: notes.gfRefNo || '', gfDate: notes.gfDate || '',
    comm_tor: notes.comm_tor || '', comm_eval: notes.comm_eval || '', comm_inspect: notes.comm_inspect || '',
    notes_json: Object.keys(rest).length ? JSON.stringify(rest) : '',
    updatedAt: new Date()
  };
  CONTRACT_DATE_KEYS.forEach(k => v[k] = d[k] || '');
  return CONTRACT_KEYS.map(k => v[k]);
}

function contract_getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(CONTRACT_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONTRACT_SHEET_NAME);
    contract_formatSheet_(sheet);
    contract_migrate_(ss, sheet);
  } else {
    contract_ensureColumns_(sheet);
  }
  return sheet;
}

// ชีตที่สร้างไว้ก่อนแล้ว: แทรกคอลัมน์ใหม่ (เช่น เลขที่ขอเบิก/วันที่ GF) ให้ตรงตำแหน่ง โดยข้อมูลเดิมไม่เลื่อนผิดช่อง
function contract_ensureColumns_(sheet) {
  for (let i = 0; i < CONTRACT_COLS.length; i++) {
    const width = Math.max(sheet.getLastColumn(), 1);
    const header = sheet.getRange(1, 1, 1, width).getValues()[0].map(String);
    const label = CONTRACT_COLS[i][1];
    if (header.indexOf(label) !== -1) continue;
    if (i < width) sheet.insertColumnBefore(i + 1);
    sheet.getRange(1, i + 1).setValue(label).setFontWeight('bold').setBackground('#1bb295').setFontColor('white');
  }
}

function contract_formatSheet_(sheet) {
  const n = CONTRACT_COLS.length;
  sheet.getRange(1, 1, 1, n).setValues([CONTRACT_COLS.map(c => c[1])])
    .setFontWeight('bold').setBackground('#1bb295').setFontColor('white').setWrap(true).setVerticalAlignment('middle');
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(4);
  // คอลัมน์เงิน: งบที่ได้รับจัดสรร, วงเงินโครงการ, PO, เบิกจ่าย
  sheet.getRange(2, 9, sheet.getMaxRows() - 1, 4).setNumberFormat('#,##0.00');
  sheet.setColumnWidth(4, 320);
  // คอลัมน์ที่ระบบใช้ภายใน
  sheet.getRange(1, CONTRACT_KEYS.indexOf('notes_json') + 1, 1, 2).setBackground('#94a3b8');
}

// ย้ายข้อมูลจากชีต Contracts (หรือชีตระบบสัญญาเดิม) มาชีตใหม่ — ทำครั้งเดียวตอนสร้างชีต
function contract_migrate_(ss, sheet) {
  let src = ss.getSheetByName(CONTRACT_OLD_SHEET_NAME);
  if (!src || src.getLastRow() < 2) {
    try { src = SpreadsheetApp.openById(CONTRACT_LEGACY_SHEET_ID).getSheetByName(CONTRACT_LEGACY_SHEET_NAME); } catch (e) { src = null; }
  }
  if (!src || src.getLastRow() < 2) return 0;
  const cols = Math.min(src.getLastColumn(), 17);
  const rows = src.getRange(2, 1, src.getLastRow() - 1, cols).getValues().filter(r => r[0] !== '' && r[0] !== null);
  const out = rows.map(r => {
    let notes = {};
    try { notes = r[15] ? JSON.parse(String(r[15])) : {}; } catch (e) {}
    const p = {
      name: r[1], contractType: r[2], contractor: r[3], supervisor: r[4],
      budget: r[5], po: r[6], disbursed: r[7], duration: r[14], allocated: cols >= 17 ? r[16] : 0,
      dates: { tor: contract_cellStr_(r[8]), announce: contract_cellStr_(r[9]), consideration: contract_cellStr_(r[10]),
               appeal: contract_cellStr_(r[11]), waitsign: contract_cellStr_(r[12]), signed: contract_cellStr_(r[13]) },
      notes: notes
    };
    return contract_objToRow_(p, Number(r[0]));
  });
  if (out.length) sheet.getRange(2, 1, out.length, CONTRACT_COLS.length).setValues(out);
  return out.length;
}

// ตั้งค่าครั้งแรก: สร้างชีต "สัญญา" + ย้ายข้อมูล + เพิ่มแผนงาน "จัดหาอากาศยาน" (รันซ้ำได้)
function setupContractSheet() {
  const sheet = contract_getSheet();
  Logger.log('✔ ชีต ' + CONTRACT_SHEET_NAME + ' พร้อมใช้ — มี ' + Math.max(0, sheet.getLastRow() - 1) + ' โครงการ');

  const planSheet = budget_getPlanSettingsSheet();
  const names = planSheet.getLastRow() >= 2 ? planSheet.getRange(2, 1, planSheet.getLastRow() - 1, 1).getValues().map(r => String(r[0])) : [];
  if (names.indexOf(AIRCRAFT_PLAN) === -1) {
    planSheet.appendRow([AIRCRAFT_PLAN, 'จัดหาอากาศยาน', '', '', '', '', 0, 0, 0, '#0ea5e9', '']);
    Logger.log('✔ เพิ่มแผนงาน "' + AIRCRAFT_PLAN + '" แล้ว');
  } else {
    Logger.log('✔ มีแผนงาน "' + AIRCRAFT_PLAN + '" อยู่แล้ว');
  }

  // ลบแผนงาน "ต่างประเทศ" ที่ค้างอยู่ (ต่างประเทศไม่ใช่แผน — ใช้เมนูรายจ่ายอื่น (ต่างประเทศ) แทน)
  const removedPlan = contract_deleteRowsWhere_(planSheet, r => String(r[0]) === 'ต่างประเทศ');
  const removedCat = contract_deleteRowsWhere_(budget_getCustomCategoriesSheet(), r => String(r[1]) === 'เดินทางไปต่างประเทศ');
  if (removedPlan || removedCat) Logger.log('✔ ลบแผนงาน "ต่างประเทศ" ' + removedPlan + ' แถว และหมวด ' + removedCat + ' แถว');
}

function contract_deleteRowsWhere_(sheet, test) {
  const last = sheet.getLastRow();
  if (last < 2) return 0;
  const rows = sheet.getRange(2, 1, last - 1, Math.max(2, sheet.getLastColumn())).getValues();
  let n = 0;
  for (let i = rows.length - 1; i >= 0; i--) if (test(rows[i])) { sheet.deleteRow(i + 2); n++; }
  return n;
}

function contract_getContracts() {
  try {
    const sheet = contract_getSheet();
    const last = sheet.getLastRow();
    if (last < 2) return { status: 'success', data: [] };
    const rows = sheet.getRange(2, 1, last - 1, CONTRACT_COLS.length).getValues();
    const data = rows.filter(r => r[0] !== '' && r[0] !== null).map(contract_rowToObj_);
    return { status: 'success', data: data };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function contract_saveContract(project) {
  try {
    const sheet = contract_getSheet();
    const last = sheet.getLastRow();
    const ids = last >= 2 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(r => Number(r[0])) : [];
    const isEdit = project.id !== undefined && project.id !== null && project.id !== '';
    let id, row = -1;
    if (isEdit) {
      id = Number(project.id);
      const i = ids.indexOf(id);
      if (i >= 0) row = i + 2;
    } else {
      id = ids.reduce((m, v) => (v > m ? v : m), 0) + 1;
    }
    const values = contract_objToRow_(project, id);
    if (row > 0) sheet.getRange(row, 1, 1, values.length).setValues([values]);
    else sheet.appendRow(values);
    return { status: 'success', id: id };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function contract_deleteContract(data) {
  try {
    const sheet = contract_getSheet();
    const last = sheet.getLastRow();
    if (last >= 2) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (Number(ids[i][0]) === Number(data.id)) { sheet.deleteRow(i + 2); return { status: 'success' }; }
      }
    }
    return { status: 'error', message: 'Not found' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// ==========================================
// รายจ่ายอื่น (เดินทางไปต่างประเทศ) — เก็บในชีต ต่างประเทศ
// type: จัดสรร | กันเงิน | ตัดยอด | ตัดยอดเพิ่ม | หักล้าง
// ==========================================
const FOREIGN_SHEET_NAME = 'ต่างประเทศ';
const FOREIGN_HEADERS = ['id', 'parentId', 'type', 'date', 'refNo', 'name', 'desc', 'allocation', 'reserve', 'deduct', 'liqRefNo', 'gfDate', 'remark', 'createdAt'];

function foreign_getSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(FOREIGN_SHEET_NAME);
  if (!sheet) {
    // ข้อมูลเดิมอยู่ในชีต ForeignTravel -> เปลี่ยนชื่อเป็น ต่างประเทศ (ข้อมูลไม่หาย)
    const old = ss.getSheetByName('ForeignTravel');
    sheet = old ? old.setName(FOREIGN_SHEET_NAME) : ss.insertSheet(FOREIGN_SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, FOREIGN_HEADERS.length).setValues([FOREIGN_HEADERS])
      .setFontWeight('bold').setBackground('#0d9488').setFontColor('white');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function foreign_fmtDate_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Bangkok', 'yyyy-MM-dd');
  return v ? String(v) : '';
}

function foreign_getData() {
  try {
    const sheet = foreign_getSheet();
    const last = sheet.getLastRow();
    if (last < 2) return { status: 'success', data: [] };
    const rows = sheet.getRange(2, 1, last - 1, FOREIGN_HEADERS.length).getValues();
    const data = rows.filter(r => r[0] !== '').map(r => ({
      id: String(r[0]), parentId: String(r[1] || ''), type: String(r[2] || ''),
      date: foreign_fmtDate_(r[3]), refNo: String(r[4] || ''), name: String(r[5] || ''), desc: String(r[6] || ''),
      allocation: Number(r[7]) || 0, reserve: Number(r[8]) || 0, deduct: Number(r[9]) || 0,
      liqRefNo: String(r[10] || ''), gfDate: foreign_fmtDate_(r[11]), remark: String(r[12] || '')
    }));
    return { status: 'success', data: data };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function foreign_add(d) {
  try {
    const sheet = foreign_getSheet();
    const last = sheet.getLastRow();
    let id;
    if (d.parentId) {
      // รายการย่อย: 5.1, 5.2 ...
      const ids = last >= 2 ? sheet.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0])) : [];
      let maxSub = 0;
      ids.forEach(x => { if (x.indexOf(d.parentId + '.') === 0) maxSub = Math.max(maxSub, parseInt(x.split('.')[1], 10) || 0); });
      id = d.parentId + '.' + (maxSub + 1);
    } else {
      const ids = last >= 2 ? sheet.getRange(2, 1, last - 1, 1).getValues() : [];
      let max = 0; ids.forEach(r => { const v = parseInt(r[0], 10); if (!isNaN(v) && v > max) max = v; });
      id = String(max + 1);
    }
    sheet.appendRow([
      id, d.parentId || '', d.type || '', d.date || new Date(), d.refNo || '', d.name || '', d.desc || '',
      Number(d.allocation) || 0, Number(d.reserve) || 0, Number(d.deduct) || 0,
      d.liqRefNo || '', d.gfDate || '', d.remark || '', new Date()
    ]);
    return { status: 'success', id: id };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function foreign_findRow_(sheet, id) {
  const last = sheet.getLastRow();
  if (last < 2) return -1;
  const ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function foreign_update(d) {
  try {
    const sheet = foreign_getSheet();
    const row = foreign_findRow_(sheet, d.id);
    if (row < 0) return { status: 'error', message: 'ไม่พบรายการ ' + d.id };
    const fields = { date: 4, refNo: 5, name: 6, desc: 7, allocation: 8, reserve: 9, deduct: 10, liqRefNo: 11, gfDate: 12, remark: 13 };
    Object.keys(fields).forEach(k => { if (d[k] !== undefined) sheet.getRange(row, fields[k]).setValue(d[k]); });
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

function foreign_delete(d) {
  try {
    const sheet = foreign_getSheet();
    const last = sheet.getLastRow();
    if (last < 2) return { status: 'error', message: 'ไม่พบรายการ' };
    const ids = sheet.getRange(2, 1, last - 1, 2).getValues();
    // ลบรายการและรายการย่อยทั้งหมด (จากล่างขึ้นบน)
    for (let i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(d.id) || String(ids[i][1]) === String(d.id)) sheet.deleteRow(i + 2);
    }
    return { status: 'success' };
  } catch (e) {
    return { status: 'error', message: e.message };
  }
}

// สร้างชีต "ต่างประเทศ": เลือก setupForeignSheet แล้วกด Run (รันซ้ำได้)
function setupForeignSheet() {
  const f = foreign_getSheet();
  Logger.log('✔ ชีต ต่างประเทศ พร้อมใช้ — มี ' + Math.max(0, f.getLastRow() - 1) + ' รายการ');
}

// ==========================================
// ระบบอัปเดต GF: เขียนวันที่ GF ให้สัญญา (ชีต สัญญา) และรายการตัดยอดต่างประเทศ
// data = { contracts: [{id, gfDate}], foreign: [{id, gfDate}] } — เขียนเฉพาะช่องที่ยังว่าง
// ==========================================
function gf_updateExtra(data) {
  try {
    let contracts = 0, foreign = 0, skipped = 0;
    if (data && data.contracts && data.contracts.length) {
      const sh = contract_getSheet();
      const col = CONTRACT_KEYS.indexOf('gfDate') + 1;
      const last = sh.getLastRow();
      const ids = last >= 2 ? sh.getRange(2, 1, last - 1, 1).getValues().map(r => Number(r[0])) : [];
      data.contracts.forEach(u => {
        const i = ids.indexOf(Number(u.id));
        if (i < 0) return;
        const cell = sh.getRange(i + 2, col);
        if (cell.getValue() === '' || cell.getValue() === null) { cell.setValue(u.gfDate); contracts++; } else skipped++;
      });
    }
    if (data && data.foreign && data.foreign.length) {
      const sh = foreign_getSheet();
      const col = FOREIGN_HEADERS.indexOf('gfDate') + 1;
      data.foreign.forEach(u => {
        const row = foreign_findRow_(sh, u.id);
        if (row < 0) return;
        const cell = sh.getRange(row, col);
        if (cell.getValue() === '' || cell.getValue() === null) { cell.setValue(u.gfDate); foreign++; } else skipped++;
      });
    }
    return { success: true, contracts: contracts, foreign: foreign, skipped: skipped };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
