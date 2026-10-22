/**
 * Units 5–8 Revision: receives results from students who turn on "Share with my teacher".
 *
 * Sheets (created by setup()):
 *   Rounds    one row per game played
 *   Mistakes  one row per wrong answer
 *   Summary   formulas: players, rounds, time, weakest topics, most-missed questions
 *
 * Nothing here records IP addresses or device details: Apps Script does not give the script
 * the sender's IP address, and only the fields listed below are saved.
 * Rows older than KEEP_DAYS are deleted every night by cleanup() (installed by setup()).
 */
const KEEP_DAYS = 180;   // the game's privacy notice says "about 6 months"; change both together

const ROUND_HEAD = ['Received', 'Name', 'Section', 'Topic', 'Topic title', 'Game', 'Correct', 'Questions', 'Score %', 'Seconds', 'Session started', 'Mistakes'];
const MISTAKE_HEAD = ['Received', 'Name', 'Section', 'Topic', 'Question (correct answer)', 'Their answer'];

function setup(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const rounds = sheet_(ss, 'Rounds', ROUND_HEAD), mistakes = sheet_(ss, 'Mistakes', MISTAKE_HEAD);
  rounds.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm'); rounds.getRange('K:K').setNumberFormat('yyyy-mm-dd hh:mm');
  mistakes.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm');
  const sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary');
  sum.clear();
  sum.getRange('A1:B5').setValues([
    ['Summary (updates automatically)', ''],
    ['Different names', '=COUNTUNIQUE(Rounds!B2:B)'],
    ['Games played', '=COUNTA(Rounds!A2:A)'],
    ['Total minutes played', '=ROUND(SUM(Rounds!J2:J)/60)'],
    ['Average score %', '=IFERROR(ROUND(AVERAGE(Rounds!I2:I)),"")']
  ]);
  sum.getRange('A7').setValue('By student (most recent first)');
  sum.getRange('A8').setFormula('=IFERROR(QUERY(Rounds!A:J,"select B, count(B), sum(J)/60, avg(I), max(A) where B is not null group by B order by max(A) desc label count(B) \'Games\', sum(J)/60 \'Minutes\', avg(I) \'Average %\', max(A) \'Last played\'",1),"No data yet")');
  sum.getRange('H7').setValue('By topic (weakest first)');
  sum.getRange('H8').setFormula('=IFERROR(QUERY(Rounds!A:J,"select D, E, count(D), avg(I) where D is not null and D <> \'Mixed\' group by D, E order by avg(I) label count(D) \'Games\', avg(I) \'Average %\'",1),"No data yet")');
  sum.getRange('M7').setValue('Most-missed questions');
  sum.getRange('M8').setFormula('=IFERROR(QUERY(Mistakes!A:F,"select D, E, count(E) where E is not null group by D, E order by count(E) desc limit 40 label count(E) \'Times missed\'",1),"No data yet")');
  sum.getRange('A1').setFontWeight('bold'); sum.getRange('A7:M7').setFontWeight('bold');
  ScriptApp.getProjectTriggers().filter(t => t.getHandlerFunction() === 'cleanup').forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('cleanup').timeBased().everyDays(1).atHour(3).create();
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
function doGet(){ return out_('This address only receives results from the revision game.'); }
function out_(s){ return ContentService.createTextOutput(s); }

/* Deletes rows received more than KEEP_DAYS days ago (rows are in date order, oldest first). */
function cleanup(){
  const ss = SpreadsheetApp.getActiveSpreadsheet(), limit = Date.now() - KEEP_DAYS * 864e5;
  ['Rounds', 'Mistakes'].forEach(n => {
    const sh = ss.getSheetByName(n); if (!sh || sh.getLastRow() < 2) return;
    const dates = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    let k = 0; while (k < dates.length && dates[k][0] instanceof Date && dates[k][0].getTime() < limit) k++;
    if (k) sh.deleteRows(2, k);
  });
}
