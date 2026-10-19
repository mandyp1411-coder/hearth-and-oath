import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createLifeAtAge } from '../dist/js/new-life.js';
import { chooseEventOption, replyMessage, continueAgeUp, validateSave } from '../dist/js/engine.js';
import { mountApp } from '../tests/helpers/ui-surface.mjs';

/**
 * Source and delegated-handler inventory. This deliberately does not start a
 * server, launch a browser, model layout, or label a viewport as a browser pass.
 */
const views = ['life','activities','relationships','map','adventure','quests','realm','household','career','health','legacy','workshop','character','party','inventory','lore','journal'];
const sizes = [[320,568],[360,640],[390,844],[768,1024],[1024,768],[1280,720],[1366,768],[1474,654],[1920,1080],[2560,1440],[667,375],[683,384]];
const output = path.resolve(process.argv[2] || 'ui-structural-audit-v22.json');
const css = await readFile(new URL('../dist/styles.css', import.meta.url), 'utf8');
const appSource = await readFile(new URL('../dist/js/app.js', import.meta.url), 'utf8');
const hash = value => createHash('sha256').update(value).digest('hex');
const releaseSource = css.slice(css.indexOf('/* v22:'));
function declarationsFor(selector) {
  const normalize = value => value.trim().replace(/\s+/g, ' ');
  const blocks = [...releaseSource.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  return blocks.filter(block => normalize(block[1]) === normalize(selector)).map(block => normalize(block[2]));
}
const contracts = Object.fromEntries([
  'body.game-mode, body.creation-mode, body.title-mode',
  'body.game-mode .app-shell.has-life',
  'body.game-mode .app-shell.has-life .main-shell',
  'body.game-mode .app-shell.has-life .phone-header.game-header',
  'body.game-mode .app-shell.has-life #main-content',
  'body.game-mode .game-content',
  'body.game-mode .workspace-body',
  'body.game-mode .game-commandbar',
  'body.game-mode .mobile-command-dock',
].map(selector => [selector, declarationsFor(selector)]));

let state = await createLifeAtAge({ seed: 'hearth-v22-structural-audit', originId: 'hearthborn', startAge: 18 });
for (let step = 0; step < 80 && (state.event || state.conversations?.pending || state.timeline.yearTarget !== null); step++) {
  if (state.event) state = chooseEventOption(state, state.event.choices.find(choice => !choice.disabledReason).id);
  else if (state.conversations?.pending) { const pending = state.conversations.pending; state = replyMessage(state, pending.personId, pending.replies[0].id); }
  else state = continueAgeUp(state);
}
if (!validateSave(state) || state.event || state.conversations?.pending) throw new Error('The source audit needs a valid resolved life fixture.');
const cleanups = [], before = JSON.stringify(state), markupInventory = [];
try {
  const surface = await mountApp({ after(callback) { cleanups.push(callback); } }, { states: [state] });
  await surface.click('title-continue');
  const baseline = JSON.stringify(surface.current());
  for (const view of views) {
    await surface.click('menu', 'header'); await surface.click('tab', view);
    const html = surface.root.innerHTML, controls = surface.root.controls;
    if (JSON.stringify(surface.current()) !== baseline) throw new Error(`Opening ${view} changed the life.`);
    markupInventory.push({
      view,
      markupBytes: Buffer.byteLength(html),
      controls: controls.length,
      enabledSimulationCommands: controls.filter(control => ['activity','choice','reply','battle-action'].includes(control.dataset.op) && !control.disabled).length,
      headings: surface.root.querySelectorAll('h1,h2,h3').length,
      labeledRegions: surface.root.querySelectorAll('[role="region"][aria-label]').map(node => node['aria-label']),
      hexPins: controls.filter(control => control.dataset.op === 'hex-select').length,
      cityRoomPins: controls.filter(control => control.classList.contains('city-map-door')).length,
      dialogueReplies: controls.filter(control => control.dataset.op === 'reply').length,
      lifeArchiveOnPrimaryMoment: view === 'life' && /class="life-feed/.test(html),
      workspacePresent: Boolean(surface.root.querySelector('.workspace-body')),
      simulationStateUnchanged: true,
      browserGeometry: 'not measured',
    });
  }
} finally { for (const callback of cleanups.reverse()) callback(); }

// Nominal allocations supplied by the authored CSS contract. Auto rows can
// expand for long names, text wrapping or enlarged reading text. Consequently,
// remaining-height numbers are design estimates, never measured usable space.
const rows = sizes.map(([width,height]) => {
  const short = height <= 500, phone = width < 760;
  const shellInsets = phone || short ? 0 : 20;
  const rail = phone ? 0 : width < 1100 ? 64 : 164;
  const header = short ? 64 : 89, command = short ? 48 : 54, navigation = phone && !short ? 52 : 0;
  const warnings = [
    'Auto header and command rows can grow; these budgets are not measured bounds.',
    '150% text size, long names and safe-area insets need authorized browser QA.',
  ];
  if (width <= 419) warnings.push('Narrow header uses extra rows; nominal desktop HUD height understates actual phone chrome.');
  if (short) warnings.push('Short-viewport mode hides the phone navigation row; Menu and keyboard shortcuts must retain every destination.');
  if (width > 1680) warnings.push('The game stage caps its width at 1680px; margins are intentional outside the stage.');
  return {
    viewport: `${width}x${height}`,
    evidenceKind: 'structural/source-derived',
    mode: short ? 'short viewport' : phone ? 'phone' : width < 1100 ? 'compact rail' : 'full rail',
    nominalChrome: { header, command, navigation, shellInsets },
    nominalRemainingHeight: Math.max(0,height-shellInsets-header-command-navigation),
    nominalMainWidth: Math.max(0,Math.min(width,1680)-shellInsets-rail),
    readingScalesRequested: [1,1.5],
    zoomScenario: width === 683 && height === 384 ? 'Approximate CSS viewport for 1366x768 at 200% browser zoom; real browser UI can change usable dimensions.' : null,
    browserResult: 'not run',
    overflowResult: 'not measured',
    focusAndTouchGeometry: 'not measured',
    warnings,
  };
});
const result = {
  title: 'Hearth & Oath v22 UI source and handler inventory',
  method: 'Production HTML and delegated handlers over the shared semantic test surface. No browser, server, CSS layout model, human survey or measured resolution pass.',
  actualBrowserSessions: 0,
  cssSha256: hash(css),
  appSha256: hash(appSource),
  sourceFixtureSha256: hash(before),
  cssContracts: contracts,
  markupInventory,
  resolutionMatrix: rows,
  compatibilityStillRequired: ['Chromium desktop','Firefox desktop','Safari and iOS','Android Chromium','Keyboard and screen reader','Safe areas and software keyboard','200% browser zoom and 150% text'],
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ output, productionViews: markupInventory.length, sourceDerivedResolutionRows: rows.length, browserSessions:0, documentOverflowMeasured:false, simulationNavigationPurity:markupInventory.every(row=>row.simulationStateUnchanged) }));
