/**
 * English File Pre-Intermediate revision: receives results from students who turn on "Share with my teacher".
 *
 * Sheets (created by setup()):
 *   Rounds    one row per game played
 *   Mistakes  one row per wrong answer
 *   Flags     one row per question a student flagged for the teacher (tick Done when handled)
 *   Summary   formulas: players, rounds, time, weakest topics, most-missed questions
 *
 * The teacher dashboard (teacher.html) reads the data with a secret dashboard key. setup() makes the key,
 * writes it in the Summary tab (cell E3) and the execution log. Without the key, this address only accepts
 * results; it never gives any data back.
 *
 * Nothing here records IP addresses or device details: Apps Script does not give the script
 * the sender's IP address, and only the fields listed below are saved.
 * Rows older than KEEP_DAYS are deleted every night by cleanup() (installed by setup()).
 */
const KEEP_DAYS = 180;   // the game's privacy notice says "about 6 months"; change both together

const ROUND_HEAD = ['Received', 'Name', 'Section', 'Topic', 'Topic title', 'Game', 'Correct', 'Questions', 'Score %', 'Seconds', 'Session started', 'Mistakes'];
const MISTAKE_HEAD = ['Received', 'Name', 'Section', 'Topic', 'Question (correct answer)', 'Their answer'];
const FLAG_HEAD = ['Received', 'Name', 'Section', 'Topic', 'Topic title', 'Question (correct answer)', 'Their answer', 'They got it right', 'Note', 'Question id', 'Done', 'Flag id'];
const VERSION = 2;

function setup(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rounds = sheet_(ss, 'Rounds', ROUND_HEAD), mistakes = sheet_(ss, 'Mistakes', MISTAKE_HEAD);
  rounds.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm'); rounds.getRange('K:K').setNumberFormat('yyyy-mm-dd hh:mm');
  mistakes.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  const flags = sheet_(ss, 'Flags', FLAG_HEAD); flags.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  const key = dashKey_();
  const sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.clear();
  sum.getRange('A1:B5').setValues([
    ['Summary (updates automatically)', ''],
    ['Different names', '=COUNTUNIQUE(Rounds!B2:B)'],
    ['Games played', '=COUNTA(Rounds!A2:A)'],
    ['Total minutes played', '=ROUND(SUM(Rounds!J2:J)/60)'],
    ['Average score %', '=IFERROR(ROUND(AVERAGE(Rounds!I2:I)),"")']
  ]);
  sum.getRange('D2:E4').setValues([
    ['Flags not done yet', '=COUNTIFS(Flags!B2:B,"<>",Flags!K2:K,FALSE)'],
    ['Dashboard key (keep it private)', key],
    ['Dashboard', 'https://omachale.github.io/EF-Review/teacher.html']
  ]);
  sum.getRange('D2:D4').setFontWeight('bold');
  sum.getRange('A7').setValue('By student (most recent first)');
  sum.getRange('A8').setFormula('=IFERROR(QUERY(Rounds!A:J,"select B, count(B), sum(J)/60, avg(I), max(A) where B is not null group by B order by max(A) desc label count(B) \'Games\', sum(J)/60 \'Minutes\', avg(I) \'Average %\', max(A) \'Last played\'",1),"No data yet")');
  sum.getRange('H7').setValue('By topic (weakest first)');
  sum.getRange('H8').setFormula('=IFERROR(QUERY(Rounds!A:J,"select D, E, count(D), avg(I) where D is not null and D <> \'Mixed\' group by D, E order by avg(I) label count(D) \'Games\', avg(I) \'Average %\'",1),"No data yet")');
  sum.getRange('M7').setValue('Most-missed questions');
  sum.getRange('M8').setFormula('=IFERROR(QUERY(Mistakes!A:F,"select D, E, count(E) where E is not null group by D, E order by count(E) desc limit 40 label count(E) \'Times missed\'",1),"No data yet")');
  sum.getRange('A1').setFontWeight('bold'); sum.getRange('A7:M7').setFontWeight('bold');
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'cleanup').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cleanup').timeBased().everyDays(1).atHour(3).create();
  Logger.log('Set up. Dashboard key: ' + key);
}

/* The secret the dashboard needs to read data. Made once; run newDashboardKey() to replace it if it leaks. */
function dashKey_(){
  const props = PropertiesService.getScriptProperties();
  let k = props.getProperty('DASH_KEY');
  if (!k){ k = Utilities.getUuid().replace(/-/g, ''); props.setProperty('DASH_KEY', k); }
  return k;
}
function newDashboardKey(){
  PropertiesService.getScriptProperties().deleteProperty('DASH_KEY');
  const k = dashKey_(), sum = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Summary');
  if (sum) sum.getRange('E3').setValue(k);
  Logger.log('New dashboard key: ' + k);
}

function sheet_(ss, name, head){
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0){ sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold'); }
  return sh;
}

const str_ = (v, n) => String(v == null ? '' : v).slice(0, n);
const num_ = v => (isFinite(+v) ? +v : 0);

function doPost(e){
  try {
    const d = JSON.parse(e.postData.contents);
    if (d && d.v === 2 && d.type === 'flag') return flag_(d);
    if (d && d.v === 2 && d.type === 'dash') return dash_(d);
    if (d && d.v === 2 && d.type === 'done') return done_(d);
    if (!d || d.v !== 1 || !str_(d.name, 60).trim()) return out_('ignored');
    const ss = SpreadsheetApp.getActiveSpreadsheet(), now = new Date();
    const lock = LockService.getScriptLock(); lock.waitLock(20000);
    try {
      const name = str_(d.name, 60).trim(), sec = str_(d.sec, 20), topic = str_(d.topic, 12);
      const c = num_(d.c), t = num_(d.t), list = Array.isArray(d.mistakes) ? d.mistakes.slice(0, 60) : [];
      const at = now, session = d.session ? new Date(num_(d.session)) : '';   // server time, so rows stay in date order for cleanup()
      ss.getSheetByName('Rounds').appendRow([at, name, sec, topic, str_(d.title, 60), str_(d.mode, 30), c, t, t ? Math.round(100 * c / t) : 0,
        Math.min(num_(d.secs), 7200), session, list.map(m => str_(m.q, 200) + (m.a ? ' [wrote: ' + str_(m.a, 80) + ']' : '')).join(' | ')]);
      if (list.length) ss.getSheetByName('Mistakes').getRange(ss.getSheetByName('Mistakes').getLastRow() + 1, 1, list.length, 6)
        .setValues(list.map(m => [at, name, sec, str_(m.p, 12), str_(m.q, 300), str_(m.a, 120)]));
    } finally { lock.releaseLock(); }
    return out_('ok');
  } catch (err){ return out_('error'); }
}
function flag_(d){
  const name = str_(d.name, 60).trim(); if (!name) return out_('ignored');
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('Flags') || sheet_(ss, 'Flags', FLAG_HEAD);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    sh.appendRow([new Date(), name, str_(d.sec, 20), str_(d.topic, 12), str_(d.title, 60), str_(d.q, 300), str_(d.a, 120),
      d.ok ? 'yes' : 'no', str_(d.note, 200), str_(d.id, 30), false, Utilities.getUuid().slice(0, 8)]);
    sh.getRange(sh.getLastRow(), 11).insertCheckboxes();
  } finally { lock.releaseLock(); }
  return out_('ok');
}

/* Dashboard: everything in Rounds, Mistakes and Flags, only for a request carrying the dashboard key. */
const keyOk_ = d => typeof d.key === 'string' && d.key.length >= 16 && d.key === dashKey_();
function rows_(ss, name){
  const sh = ss.getSheetByName(name); if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues()
    .map(r => r.map(v => v instanceof Date ? v.toISOString() : v));
}
function dash_(d){
  if (!keyOk_(d)) return json_({ ok: false, error: 'key' });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return json_({ ok: true, version: VERSION, keepDays: KEEP_DAYS, sheet: ss.getName(), url: ss.getUrl(),
    rounds: rows_(ss, 'Rounds'), mistakes: rows_(ss, 'Mistakes'), flags: rows_(ss, 'Flags') });
}
/* Dashboard ticks (or unticks) Done on a flag, found by its Flag id. */
function done_(d){
  if (!keyOk_(d)) return json_({ ok: false, error: 'key' });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Flags');
  if (!sh || sh.getLastRow() < 2) return json_({ ok: false, error: 'missing' });
  const ids = sh.getRange(2, 12, sh.getLastRow() - 1, 1).getValues();
  const i = ids.findIndex(r => String(r[0]) === String(d.flag));
  if (i < 0) return json_({ ok: false, error: 'missing' });
  sh.getRange(i + 2, 11).setValue(!!d.done);
  return json_({ ok: true });
}
function json_(o){ return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doGet(){ return out_('This address only receives results from the revision game.'); }
function out_(s){ return ContentService.createTextOutput(s); }

/* Deletes rows received more than KEEP_DAYS days ago (rows are in date order, oldest first). */
function cleanup(){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), limit = Date.now() - KEEP_DAYS * 864e5;
  ['Rounds', 'Mistakes', 'Flags'].forEach(n => {
    const sh = ss.getSheetByName(n); if (!sh || sh.getLastRow() < 2) return;
    const dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    let k = 0; while (k < dates.length && dates[k][0] instanceof Date && dates[k][0].getTime() < limit) k++;
    if (k) sh.deleteRows(2, k);
  });
}
