import test from 'node:test';
import assert from 'node:assert/strict';
import { VOICE_RULES, RULE_IDS, PLACEHOLDER, lintText, inVoice } from '../scripts/lib/voice-rules.mjs';
import { extractStrings, isPlayerFacing, readableText, lintSource, skipReason, scanRepo, renderMarkdown, main } from '../scripts/voice-lint.mjs';

const texts = src => extractStrings(src).map(s => s.text);

test('the tokenizer keeps string literals and skips comments', () => {
  const src = [
    "// a line comment with 'words in quotes' and \"more of them\"",
    "const a = 'The first line kept.'; /* a block \"comment\" with 'quotes' */",
    '/* a block comment',
    "   across lines with 'a string inside it' */ const b = \"The second line kept.\";",
    "const url = 'http://example.com/not//a/comment';",
  ].join('\n');
  const found = extractStrings(src);
  assert.deepEqual(found.map(s => s.text), ['The first line kept.', 'The second line kept.', 'http://example.com/not//a/comment']);
  assert.deepEqual(found.map(s => s.line), [2, 4, 5], 'each string carries the line it starts on');
});

test('the tokenizer skips regex literals but not division', () => {
  assert.deepEqual(texts("const re = /settled 'separately' [/'\"]+/gi; const s = 'After the regex.';"), ['After the regex.']);
  assert.deepEqual(texts("return /^atlas_room_(.+)$/.exec(id) ? 'One way' : 'The other way';"), ['One way', 'The other way']);
  assert.deepEqual(texts("x = a / b; const t = 'Kept between divisions.'; y = c / d / 'Still a string.';"), ['Kept between divisions.', 'Still a string.']);
  assert.deepEqual(texts("if (/'quote' in class/.test(v)) y = 2 / 1; z = 'After the test.';"), ['After the test.']);
  assert.deepEqual(texts("const n = x.replace(/\\/'/g, '').length / 2; const m = 'A line after an escaped slash.';"), ['', 'A line after an escaped slash.']);
});

test('a template literal is one string with a placeholder for each expression, and the strings inside the expressions are found too', () => {
  const src = 'const t = `You owe ${b.debt} gold and ${late ? \'the interest is running\' : `nothing ${more} yet`}.`;';
  const found = extractStrings(src);
  assert.deepEqual(found.map(s => s.text), ['the interest is running', `nothing ${PLACEHOLDER} yet`, `You owe ${PLACEHOLDER} gold and ${PLACEHOLDER}.`]);
  assert.equal(found[2].kind, 'template');
  assert.equal(found[2].placeholders, 2);
  assert.deepEqual(texts("const s = 'It\\u2019s a line.'; const w = 'A ${leak} in a plain string.';"), ['It’s a line.', 'A ${leak} in a plain string.']);
  assert.deepEqual(texts('const h = `<p class="muted">${v ? \'Part of your past.\' : \'\'}</p>`;'), ['Part of your past.', '', `<p class="muted">${PLACEHOLDER}</p>`]);
});

test('prose detection accepts what a player reads and rejects identifiers, selectors, paths and class lists', () => {
  for (const yes of ['Walk there. It costs no days.', 'Requires 12 gold', 'Two days · a favour owed', 'Three days of it. The pay comes after.',
    '<p class="small-copy">This decision added no recorded destruction.</p>', `You owe ${PLACEHOLDER} gold and the interest is running.`,
    `Showing ${PLACEHOLDER}–${PLACEHOLDER} of ${PLACEHOLDER} matching people`, 'A MOMENT THAT MATTERS', '<label aria-label="Search the recorded quests here"></label>'])
    assert.ok(isPlayerFacing(yes), `accepts ${JSON.stringify(yes)}`);
  for (const no of ['kebab-case-only', 'snake_case_thing', 'ironman-standard-return', '.panel .story-scene', '#journal-active-results', '[data-return-life-card]',
    'https://example.com/a/b', './art/presets/beastfolk-adult-00.avif', 'secondary small', 'panel story-scene small', 'quest-location', '<div class="a b c"></div>',
    `${PLACEHOLDER}: ${PLACEHOLDER}${PLACEHOLDER}${PLACEHOLDER}.`, 'Return', '', 'x y z', 'fieldVersion must be 68'])
    assert.ok(!isPlayerFacing(no), `rejects ${JSON.stringify(no)}`);
  assert.equal(readableText('<button class="x" aria-label="Open the pack">Take it</button>'), 'Take it Open the pack');
  assert.equal(readableText('Bread &amp; a blanket'), 'Bread & a blanket');
});

test('every rule catches its sample once, and the engine’s own lines are not hits', () => {
  const samples = {
    recorded: 'Their concern is recorded.',
    'record-not-kept': 'An exact date was not kept in this earlier record.',
    category: 'Choose another slot or category to see its requirements.',
    'settled-separately': 'Household costs are settled separately.',
    accrues: 'Interest accrues over this time.',
    'not-a-promise-of': 'This is not a promise of damage.',
    'choose-this-action': 'Choose this action.',
    estimate: 'Household estimate: +4 Gold over this time.',
    prediction: 'Enemy recipients are current predictions.',
    'offers-count': 'Offers: 4 waiting in the hall',
    'range-of-total': 'Showing 1–4 of 4 matching people.',
    'saved-trailer': 'Current equipment saved.',
    'browser-save-status': 'Browser save status for slot 2',
    'is-unchanged': 'Your note is unchanged.',
    'retained-archives': 'Retained archives must first be reviewed.',
    reattached: 'The archive was reattached.',
    'dependent-choices': 'Locked dependent choices keep their ancestry.',
    compatible: 'This is not a compatible save.',
    unlocked: 'Unlocked: the east gate',
    'assigned-point': 'Maximum six assigned points.',
    metadata: 'Suitability metadata for the scene.',
    schema: 'The schema version is 27.',
    placeholder: 'A placeholder line for the keeper.',
    todo: 'TODO write the keeper’s reply',
    lorem: 'Lorem ipsum dolor sit amet',
    undefined: 'You owe undefined gold.',
    null: 'The keeper of null greets you.',
    nan: 'You owe NaN gold.',
    'object-object': 'You meet [object Object] at the gate.',
    'template-leak': 'You owe ${debt} gold.',
  };
  assert.deepEqual(Object.keys(samples).sort(), [...RULE_IDS].sort(), 'every rule has a sample and every sample a rule');
  for (const r of VOICE_RULES) {
    const hits = lintText(samples[r.id]);
    assert.deepEqual(hits.map(h => h.id), [r.id], `${r.id} alone catches ${JSON.stringify(samples[r.id])}`);
    assert.equal(hits[0].severity, r.severity);
    assert.ok(['audit', 'placeholder'].includes(r.severity));
    assert.ok(r.reason.length > 10 && hits[0].match.length > 0);
  }
  // The placeholder form of the pager text is a hit as well.
  assert.deepEqual(lintText(`Showing ${PLACEHOLDER}–${PLACEHOLDER} of ${PLACEHOLDER} matching people`).map(h => h.id), ['range-of-total']);
  // One line can say several forbidden things.
  assert.deepEqual(lintText('Household estimate: +0 Gold accrues over this time; settled separately from the fee.').map(h => h.id), ['settled-separately', 'accrues', 'estimate']);
  // The engine's reason lines and the game's own voice are not hits.
  for (const fine of ['Requires 12 gold', 'Two days · a favour owed', 'Walk there. It costs no days.', 'Three days of it. The pay comes after.',
    'The offices were not kept. The grey comes off.', 'The jailer records your request.', 'Hand the lender what you can. Interest stops on what is paid.',
    'Unlocked the gate with the warden’s key.', 'She saved the child from the river. He was not grateful.', 'Nullity is a word nobody here uses.'])
    assert.ok(inVoice(fine), `${JSON.stringify(fine)}: ${lintText(fine).map(h => h.id).join(', ')}`);
  assert.deepEqual(lintText(''), []); assert.deepEqual(lintText(null), []);
});

test('a module is linted through its player-facing strings only', () => {
  const src = [
    "// 'recorded' in a comment is not a hit",
    "const re = /recorded/; const key = 'recorded_items';",
    "const line = `Their concern is recorded. ${n} of ${m} kept.`;",
    "const toast = '<p class=\"muted\">Your note is unchanged.</p>';",
  ].join('\n');
  const { strings, hits } = lintSource(src, 'x.js');
  assert.equal(strings, 2);
  assert.deepEqual(hits.map(h => [h.line, h.rule]), [[3, 'recorded'], [4, 'is-unchanged']]);
  assert.equal(hits[1].text, 'Your note is unchanged.', 'the report shows what the reader sees, tags removed');
  assert.equal(hits[0].file, 'x.js');
});

test('the art catalogues and generated modules are skipped and named', () => {
  assert.match(skipReason('/p/dist/js/aged-portraits-v57.js', 3_000_000, '// Generated only from accepted paintings.'), /catalogue/);
  assert.match(skipReason('/p/dist/js/foe-catalog.js', 30_000, '// Generated from six illustrated, registered enemy atlases.'), /generated/);
  assert.equal(skipReason('/p/dist/js/audit-content-v25.js', 10_000, '// Authored, original dilemmas. Content is selected once, not generated by views.'), null);
  assert.equal(skipReason('/p/dist/js/portrait-gallery.js', 9_000, 'import x from "./y.js";'), null, 'a small portrait UI module is scanned');
  assert.equal(skipReason('/p/dist/js/app.js', 295_000, 'import x from "./y.js";'), null);
});

test('the whole repo scans in seconds and the report has its shape', () => {
  const started = performance.now();
  const report = scanRepo();
  assert.ok(performance.now() - started < 20_000, 'under twenty seconds');
  for (const key of ['version', 'generatedAt', 'scanned', 'skipped', 'strings', 'hits', 'bySeverity', 'byRule', 'rules', 'worst', 'modules', 'findings']) assert.ok(key in report, key);
  assert.ok(report.scanned > 200 && report.strings > 10_000, `${report.scanned} modules, ${report.strings} strings`);
  assert.ok(report.skipped.some(s => s.file === 'dist/js/aged-portraits-v57.js'), 'the big catalogue is skipped');
  assert.ok(report.skipped.every(s => s.reason && s.bytes > 0));
  assert.ok(!report.modules.some(m => m.file.startsWith('dist/offline/')));
  assert.ok(report.modules.some(m => m.file === 'dist/js/app.js') && report.modules.some(m => m.file === 'dist/js/voice.js'));
  assert.deepEqual(Object.keys(report.byRule).sort(), [...RULE_IDS].sort());
  assert.equal(Object.values(report.byRule).reduce((a, b) => a + b, 0), report.hits);
  assert.equal(report.bySeverity.audit + report.bySeverity.placeholder, report.hits);
  assert.equal(report.findings.length, report.hits);
  assert.ok(report.worst.length <= 20 && report.worst.every((m, i, all) => !i || all[i - 1].hits >= m.hits), 'the worst twenty, worst first');
  for (const h of report.findings.slice(0, 50)) { assert.ok(h.file && Number.isInteger(h.line) && h.line > 0 && RULE_IDS.includes(h.rule) && h.match && h.text); }
  const markdown = renderMarkdown(report);
  for (const heading of ['# Voice lint', '## The count', '## Hits by rule', '## The worst twenty modules', '## Hits by module', '## Skipped', '## Known false positives']) assert.ok(markdown.includes(heading), heading);
  assert.ok(markdown.includes('`dist/js/aged-portraits-v57.js`'));
  // v0.70 reports only; --strict is how a later release turns the failures on.
  assert.equal(main(['--quiet']), 0);
  assert.equal(main(['--quiet', '--strict']), report.hits > 0 ? 1 : 0);
  assert.throws(() => main(['--nonsense']), /Usage/);
});
