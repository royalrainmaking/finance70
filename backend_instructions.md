# คำแนะนำการแก้ไข Google Apps Script (MainFinancial.gs)

เนื่องจากมีการรวมระบบ GF เข้ามาในหน้าเว็บหลัก คุณจำเป็นต้องเพิ่มโค้ดด้านล่างนี้ลงในไฟล์ `MainFinancial.gs` ของคุณ เพื่อให้ระบบสามารถอ่านและอัปเดตข้อมูลได้ถูกต้อง

## 1. เพิ่มในฟังก์ชัน `doGet(e)`
ค้นหาฟังก์ชัน `doGet(e)` แล้วเพิ่มบรรทัดนี้ก่อนบรรทัด `return ContentService.createTextOutput(JSON.stringify({ error: 'Invalid Action' })).setMimeType(ContentService.MimeType.JSON);`

```javascript
    if (action === 'gf_getSheetData') return ContentService.createTextOutput(JSON.stringify(gf_getSheetData(planKey))).setMimeType(ContentService.MimeType.JSON);
```

## 2. เพิ่มในฟังก์ชัน `doPost(e)`
ค้นหาฟังก์ชัน `doPost(e)` ในส่วนที่มี `else if (action === ...)` ให้เพิ่มบรรทัดนี้ต่อท้าย:

```javascript
    else if (action === 'gf_updateSheetData') res = gf_updateSheetData(params.data);
```

## 3. เพิ่มฟังก์ชันใหม่ท้ายไฟล์ `MainFinancial.gs`
นำโค้ดด้านล่างนี้ไปวางไว้ที่ล่างสุดของไฟล์:

```javascript
// ==========================================
// ระบบอัปเดตข้อมูล GF อัตโนมัติ
// ==========================================

function gf_getSheetData(planKey) {
  try {
    const sheet = budget_getTargetSheet(planKey || '1.ฝนหลวง');
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
    
    const planKey = config.plan || '1.ฝนหลวง';
    const sheet = budget_getTargetSheet(planKey);
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
```

เมื่อคุณนำโค้ดทั้งหมดนี้ไปใส่ใน Apps Script แล้ว ให้กด Deploy (การทำให้ใช้งานได้) แบบเวอร์ชันใหม่ (New version) จึงจะสามารถใช้งานระบบ GF บนหน้าเว็บใหม่ได้อย่างสมบูรณ์
