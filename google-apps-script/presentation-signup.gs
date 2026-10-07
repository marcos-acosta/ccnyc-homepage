const SHEET_NAME = "Presentation Signups";
const CAPACITY = 10;
const TIME_ZONE = "America/New_York";

function doGet() {
  return jsonResponse_(getToday_());
}

function doPost(event) {
  if ((event.parameter.action || "signup") !== "signup") {
    return jsonResponse_({ ok: false, error: "Unknown action." });
  }

  const name = String(event.parameter.name || "").trim();
  if (!name) return jsonResponse_({ ok: false, error: "Please enter your name." });
  if (name.length > 60) return jsonResponse_({ ok: false, error: "Please use 60 characters or fewer." });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const date = todayKey_();
    const names = namesForDate_(sheet, date);
    if (names.some((existing) => existing.toLowerCase() === name.toLowerCase())) {
      return jsonResponse_({ ok: false, error: "That name is already signed up today." });
    }
    if (names.length >= CAPACITY) {
      return jsonResponse_({ ok: false, error: "Today’s presentation list is full." });
    }
    sheet.appendRow([date, name, new Date()]);
    names.push(name);
    return jsonResponse_({ ok: true, date, capacity: CAPACITY, names });
  } finally {
    lock.releaseLock();
  }
}

function getToday_() {
  const date = todayKey_();
  return { ok: true, date, capacity: CAPACITY, names: namesForDate_(getSheet_(), date) };
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["Date", "Name", "Signed up at"]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function namesForDate_(sheet, date) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues()
    .filter((row) => row[0] === date && row[1])
    .map((row) => row[1])
    .slice(0, CAPACITY);
}

function todayKey_() {
  return Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
