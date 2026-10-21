/**
 * Plug'Heur V13 · receives test sessions from v13/tracker.js and writes them to this Sheet.
 * One row per session (updated in place as the tester moves through the prototype).
 *
 * Setup (once): in the Sheet, Extensions > Apps Script, paste this file, Save,
 * then Deploy > New deployment > Web app: Execute as "Me", Who has access "Anyone".
 * Copy the web-app URL (ends with /exec) into ENDPOINT at the top of v13/tracker.js.
 * After editing this script: Deploy > Manage deployments > edit (pencil) > Version: New version > Deploy.
 * The /exec URL stays the same.
 */
var SHEET_NAME = "sessions";
var COLUMNS = [
  "session_id", "started_at", "updated_at", "mode", "partner", "lang", "flow", "device",
  "returning_user", "last_screen", "furthest_step", "screens_reached", "completed",
  "t_to_battery_s", "t_total_s", "screen_times", "profile_status", "birth_year_filled",
  "postcode_filled", "dni_filled", "optin_data", "optin_partner", "offer_code_requested",
  "rating", "rating_reasons", "comment", "question_answer", "end_clicks", "google_review",
  "help_actions", "version", "popups_opened", "popup_times"
];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.appendRow(COLUMNS);
    sh.setFrozenRows(1);
  }
  return sh;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var data = JSON.parse(e.postData.contents || "{}");
    var r = data.row;
    if (!r || !/^s[a-z0-9]{6,20}$/.test(String(r.session_id || ""))) return out_("ignored");
    var sh = sheet_();
    /* header row = column order; any new field sent by the tracker gets its own column automatically */
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    Object.keys(r).forEach(function (k) {
      if (header.indexOf(k) < 0) { header.push(k); sh.getRange(1, header.length).setValue(k); }
    });
    var values = header.map(function (c) {
      var v = r[c];
      if (v === undefined || v === null) return "";
      v = typeof v === "object" ? JSON.stringify(v) : v;
      if (typeof v === "string") {
        v = v.slice(0, 1000);
        if (/^[=+\-@]/.test(v)) v = "'" + v;   // never let a value run as a formula
      }
      return v;
    });
    var found = sh.getRange("A:A").createTextFinder(r.session_id).matchEntireCell(true).findNext();
    if (found) sh.getRange(found.getRow(), 1, 1, header.length).setValues([values]);
    else sh.appendRow(values);
    return out_("ok");
  } catch (err) {
    return out_("error");
  } finally {
    lock.releaseLock();
  }
}

function doGet() { return out_("Plug'Heur tracker is running"); }

function out_(t) { return ContentService.createTextOutput(t).setMimeType(ContentService.MimeType.TEXT); }
