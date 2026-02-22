// tests/feedback-loop.mjs
// Tests the reply feedback loop file I/O without requiring the Next.js server.

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const LOG_PATH = join(ROOT, 'src/lib/reply-log.json');
const BACKUP_PATH = join(ROOT, 'src/lib/reply-log.json.bak');

let passed = 0;
let failed = 0;

function ok(label, value) {
  if (value) {
    console.log(`  ✓  ${label}`);
    passed++;
  } else {
    console.error(`  ✗  ${label}`);
    failed++;
  }
}

function section(title) {
  console.log(`\n── ${title}`);
}

// ─── helpers (mirrors API route logic) ──────────────────────────────────────

function readLog() {
  try {
    return JSON.parse(readFileSync(LOG_PATH, 'utf-8'));
  } catch {
    return { replies: [] };
  }
}

function writeLog(log) {
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2), 'utf-8');
}

function appendReply(entry) {
  const log = readLog();
  log.replies.unshift(entry);
  writeLog(log);
  return log;
}

// ─── Backup original log ──────────────────────────────────────────────────────

if (existsSync(LOG_PATH)) {
  copyFileSync(LOG_PATH, BACKUP_PATH);
}
// Reset to empty for clean test
writeLog({ replies: [] });

try {
  // ─── 1. Initial state ───────────────────────────────────────────────────────
  section('1. Initial state');
  const initial = readLog();
  ok('reply-log.json is readable', initial !== null);
  ok('replies array exists', Array.isArray(initial.replies));
  ok('starts empty', initial.replies.length === 0);

  // ─── 2. Append a generate reply ─────────────────────────────────────────────
  section('2. Append a "generate" reply entry');
  const entry1 = {
    id: 1700000000001,
    date: '2026-02-22',
    source: 'generate',
    label: 'The Direct Approach',
    subject: 'Field marking in 30 min?',
    body: 'Hi Sarah,\n\nSaw you manage 12 fields at Denver Parks. Marking them manually each week is roughly 36 staff-hours.\n\nWorth a quick look at how we cut that to under 4?\n\n— Alex',
    score: 84,
    offering: 'GPS-guided field marking robots',
    targetPersona: 'Directors of Operations at sports complexes',
    industry: 'Parks & Recreation',
    emailType: 'Cold outreach (1st touch)',
    note: 'booked a 20-min demo',
  };

  const afterFirst = appendReply(entry1);
  ok('entry appended', afterFirst.replies.length === 1);
  ok('entry is at index 0 (newest first)', afterFirst.replies[0].id === entry1.id);
  ok('source field correct', afterFirst.replies[0].source === 'generate');
  ok('label field correct', afterFirst.replies[0].label === 'The Direct Approach');
  ok('subject preserved', afterFirst.replies[0].subject === entry1.subject);
  ok('score preserved', afterFirst.replies[0].score === 84);
  ok('note preserved', afterFirst.replies[0].note === 'booked a 20-min demo');
  ok('offering preserved', afterFirst.replies[0].offering === entry1.offering);

  // ─── 3. Append a sequence reply ─────────────────────────────────────────────
  section('3. Append a "sequence" reply entry');
  const entry2 = {
    id: 1700000000002,
    date: '2026-02-22',
    source: 'sequence',
    label: 'Touch 2 — The Angle',
    touchNumber: 2,
    subject: 'One field, 28 minutes',
    body: 'Madison City just cut per-field marking time from 2h 45m to 28 minutes.\n\nStill worth catching up on how?\n\n— Alex',
    score: 79,
    offering: 'GPS-guided field marking robots',
    targetPersona: 'Parks & Rec Directors',
    note: 'said not now, follow up in Q3',
  };

  const afterSecond = appendReply(entry2);
  ok('two entries now', afterSecond.replies.length === 2);
  ok('newest entry is at index 0', afterSecond.replies[0].id === entry2.id);
  ok('older entry still at index 1', afterSecond.replies[1].id === entry1.id);
  ok('touchNumber preserved', afterSecond.replies[0].touchNumber === 2);
  ok('source is sequence', afterSecond.replies[0].source === 'sequence');

  // ─── 4. File persistence (re-read from disk) ─────────────────────────────────
  section('4. Persistence — re-read from disk');
  const reread = readLog();
  ok('file still has 2 entries', reread.replies.length === 2);
  ok('entry1 subject survives round-trip', reread.replies[1].subject === entry1.subject);
  ok('entry2 note survives round-trip', reread.replies[0].note === entry2.note);

  // ─── 5. Validation — required fields ─────────────────────────────────────────
  section('5. Required-field check (mirrors API validation)');
  function simulatePost(body) {
    if (!body.subject || !body.body || !body.source) {
      return { status: 400, error: 'subject, body, and source are required' };
    }
    return { status: 200, success: true };
  }

  const missingSubject = simulatePost({ body: 'x', source: 'generate' });
  ok('rejects missing subject (400)', missingSubject.status === 400);

  const missingBody = simulatePost({ subject: 'x', source: 'generate' });
  ok('rejects missing body (400)', missingBody.status === 400);

  const missingSource = simulatePost({ subject: 'x', body: 'y' });
  ok('rejects missing source (400)', missingSource.status === 400);

  const valid = simulatePost({ subject: 'x', body: 'y', source: 'generate' });
  ok('accepts valid minimal payload (200)', valid.status === 200);

  // ─── 6. Optional fields default gracefully ────────────────────────────────────
  section('6. Optional fields');
  const minimalEntry = {
    id: 1700000000003,
    date: '2026-02-22',
    source: 'generate',
    label: '',
    subject: 'Quick question',
    body: 'Still relevant?',
    score: undefined,
    offering: '',
    targetPersona: '',
    note: undefined,
  };
  const afterMinimal = appendReply(minimalEntry);
  ok('entry with no note/score/offering appended', afterMinimal.replies.length === 3);
  ok('undefined score stored as undefined', afterMinimal.replies[0].score === undefined);

  // ─── 7. Ordering (newest first) ───────────────────────────────────────────────
  section('7. Ordering');
  const finalLog = readLog();
  ok('3 entries total', finalLog.replies.length === 3);
  ok('most recent id is highest', finalLog.replies[0].id > finalLog.replies[2].id);

  // ─── 8. Admin read simulation ────────────────────────────────────────────────
  section('8. Admin read (mirrors /api/admin/replies logic)');
  function simulateAdminRead(password, adminPassword) {
    if (!adminPassword || password !== adminPassword) {
      return { status: 401, error: 'Unauthorized.' };
    }
    const data = readLog();
    return { status: 200, success: true, replies: data.replies };
  }

  const wrongPw = simulateAdminRead('wrong', 'secret');
  ok('rejects wrong password (401)', wrongPw.status === 401);

  const noPw = simulateAdminRead('secret', undefined);
  ok('rejects missing ADMIN_PASSWORD env (401)', noPw.status === 401);

  const correct = simulateAdminRead('secret', 'secret');
  ok('accepts correct password (200)', correct.status === 200);
  ok('returns all 3 replies', correct.replies.length === 3);

} finally {
  // ─── Restore original log ───────────────────────────────────────────────────
  if (existsSync(BACKUP_PATH)) {
    copyFileSync(BACKUP_PATH, LOG_PATH);
    const { unlinkSync } = await import('fs');
    unlinkSync(BACKUP_PATH);
  } else {
    writeLog({ replies: [] });
  }
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(40)}`);
if (failed === 0) {
  console.log(`✓ All ${passed} tests passed`);
} else {
  console.log(`${passed} passed, ${failed} FAILED`);
  process.exit(1);
}
