const SHEET_NAME = "Presentation Signups";
const CAPACITY = 10;
const TIME_ZONE = "America/New_York";

function doGet(event) {
  const requestedDate = String((event && event.parameter && event.parameter.date) || "");
  return jsonResponse_(getCurrentLineup_(requestedDate));
}

function doPost(event) {
  if ((event.parameter.action || "signup") !== "signup") {
    return jsonResponse_({ ok: false, error: "Unknown action." });
  }

  const name = String(event.parameter.name || "").trim();
  const instagram = String(event.parameter.instagram || "").trim().replace(/^@/, "");
  if (!name) return jsonResponse_({ ok: false, error: "Please enter your name." });
  if (name.length > 60) return jsonResponse_({ ok: false, error: "Please use 60 characters or fewer." });
  if (instagram && !/^[A-Za-z0-9._]{1,30}$/.test(instagram)) {
    return jsonResponse_({ ok: false, error: "Please enter a valid Instagram handle." });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = getSheet_();
    const meetingDate = currentMeetingTuesdayKey_();
    const presenters = presentersForDate_(sheet, meetingDate);
    if (presenters.some((presenter) => presenter.name.toLowerCase() === name.toLowerCase())) {
      return jsonResponse_({ ok: false, error: "That name is already signed up for this Tuesday." });
    }
    if (presenters.length >= CAPACITY) {
      return jsonResponse_({ ok: false, error: "This Tuesday’s demo list is full." });
    }
    sheet.appendRow([meetingDate, name, instagram, new Date()]);
    presenters.push({ name, instagram });
    return jsonResponse_({ ok: true, meetingDate, capacity: CAPACITY, presenters });
  } finally {
    lock.releaseLock();
  }
}

function getCurrentLineup_(requestedDate) {
  const meetingDate = currentMeetingTuesdayKey_();
  // The public lineup only exposes the current signup cycle. On Tuesday this
  // points at the new date immediately, so last week's names cannot carry over.
  if (requestedDate && requestedDate !== meetingDate) {
    return { ok: true, meetingDate, capacity: CAPACITY, presenters: [] };
  }
  return { ok: true, meetingDate, capacity: CAPACITY, presenters: presentersForDate_(getSheet_(), meetingDate) };
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["Meeting date", "Name", "Instagram", "Signed up at"]);
    sheet.setFrozenRows(1);
  } else if (sheet.getRange(1, 3).getDisplayValue() === "Signed up at") {
    sheet.insertColumnBefore(3);
    sheet.getRange(1, 1, 1, 4).setValues([["Meeting date", "Name", "Instagram", "Signed up at"]]);
  }
  return sheet;
}

function presentersForDate_(sheet, date) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, 3).getDisplayValues()
    .filter((row) => row[0] === date && row[1])
    .map((row) => ({ name: row[1], instagram: row[2] }))
    .slice(0, CAPACITY);
}

function currentMeetingTuesdayKey_() {
  const localDate = Utilities.formatDate(new Date(), TIME_ZONE, "yyyy-MM-dd");
  const parts = localDate.split("-").map(Number);
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const daysSinceTuesday = (date.getUTCDay() - 2 + 7) % 7;
  date.setUTCDate(date.getUTCDate() - daysSinceTuesday);
  return Utilities.formatDate(date, "UTC", "yyyy-MM-dd");
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
