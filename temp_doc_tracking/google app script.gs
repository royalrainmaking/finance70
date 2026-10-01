/**
 * ฟังก์ชันสำหรับรับข้อมูลจากหน้าเว็บเพื่อบันทึกลง Sheet (POST)
 */
/**function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0]; // ใช้ชีตแรกของไฟล์
  var data = JSON.parse(e.postData.contents);
  
  var rows = sheet.getDataRange().getValues();
  var found = false;
  
  // ค้นหาข้อมูลเดิมตาม planId (คอลัมน์ A) และ id (คอลัมน์ B) เพื่ออัปเดต
  for (var i = 1; i < rows.length; i++) {
    // rows[i][0] คือ planId, rows[i][1] คือ id
    if (rows[i][0] == data.planId && rows[i][1] == data.id) {
      sheet.getRange(i + 1, 3).setValue(data.step);      // คอลัมน์ C: ขั้นตอนปัจจุบัน
      sheet.getRange(i + 1, 4).setValue(data.location);  // คอลัมน์ D: วันที่ได้รับเอกสาร
      sheet.getRange(i + 1, 5).setValue(data.notes);     // คอลัมน์ E: หมายเหตุเพิ่มเติม
      found = true;
      break;
    }
  }
  
  // หากไม่พบข้อมูลเดิม ให้เพิ่มแถวใหม่ที่ท้ายชีต
  if (!found) {
    sheet.appendRow([
      data.planId,   // คอลัมน์ A
      data.id,       // คอลัมน์ B
      data.step,     // คอลัมน์ C
      data.location, // คอลัมน์ D
      data.notes     // คอลัมน์ E
    ]);
  }
  
  return ContentService.createTextOutput("Success")
    .setMimeType(ContentService.MimeType.TEXT);
}
*/

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var data = JSON.parse(e.postData.contents);
  
  var planId = data.planId;
  var id = data.id;
  var step = data.step;
  var location = data.location;
  var notes = data.notes;
  var lastModified = data.lastModified; // รับค่าวันที่แก้ไขล่าสุด

  var rows = sheet.getDataRange().getValues();
  
  // ค้นหาแถวที่ตรงกับ planId และ id
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0] == planId && rows[i][1] == id) {
      sheet.getRange(i + 1, 3).setValue(step);         // คอลัมน์ C: ขั้นตอน
      sheet.getRange(i + 1, 4).setValue(location);     // คอลัมน์ D: วันที่ได้รับ
      sheet.getRange(i + 1, 5).setValue(notes);        // คอลัมน์ E: หมายเหตุ
      sheet.getRange(i + 1, 6).setValue(lastModified); // คอลัมน์ F: วันที่แก้ไขล่าสุด (เพิ่มใหม่)
      return ContentService.createTextOutput("Updated");
    }
  }

  // หากไม่พบ ให้เพิ่มแถวใหม่
  sheet.appendRow([planId, id, step, location, notes, lastModified]);
  return ContentService.createTextOutput("Added");
}


/**
 * ฟังก์ชันสำหรับการตรวจสอบสถานะ API (GET)
 */
function doGet(e) {
  return ContentService.createTextOutput("Document Tracking Database API is Ready.")
    .setMimeType(ContentService.MimeType.TEXT);
}
