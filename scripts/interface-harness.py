#!/usr/bin/env python3
"""Measure the interface the way the balance harness measures lives.

The Design Bible (Volume II) asks for a script that runs the real game in a
headless browser and reports what a player meets on the page: how far down
the decision sits, whether a choice shows its cost, how tall the Fight page
is, how much of a phone screen is content, how many rows of sub-tabs a view
stacks, the smallest type, how many files the title screen loads, and
whether a toast outstays its welcome. v0.70 only measures; nothing in the
game changes.

The game is driven through its own controls (the `data-op` click handlers),
at two viewports (1440x900 and 390x844), each at the default text size and
at the largest reading-scale setting (150%, the top of the slider under
Settings). Lives come from the real engine: the eighteen-year-old life the
creator makes for a fixed seed (scripts/lib/interface-harness-lives.mjs),
that life standing in a fight (the v0.68 field page), and a life of the old
edition standing in a fight (the older battle page). The creator itself is
also walked once, so its path stays measured.

    python3 scripts/interface-harness.py                 # the full run, ~3 minutes
    python3 scripts/interface-harness.py --quick         # title + Life screen, one viewport
    python3 scripts/interface-harness.py --snapshot docs/measures/interface-harness-v070.md

Reports go to artifacts/interface-harness/report.json and report.md (or
--out). --snapshot also writes the Markdown where the release keeps it.
Exit code 3 means the browser could not be used (Python Playwright or
Chromium missing); 1 means the run itself failed.
"""
import argparse
import datetime as dt
import json
import socket
import subprocess
import sys
import time
import traceback
from pathlib import Path

PROJECT = Path(__file__).resolve().parents[1]
DIST = PROJECT / 'dist'
LIVES_SCRIPT = PROJECT / 'scripts' / 'lib' / 'interface-harness-lives.mjs'
DEFAULT_OUT = PROJECT / 'artifacts' / 'interface-harness'
SLOT_KEY = 'hearth-and-oath:slots:v1'
DISPLAY_KEY = 'hearth-and-oath:display:v1'
LARGEST_SCALE = 1.5  # the top of the Text size slider (display.js clamps to 1.5)

VIEWPORTS = {'desktop': (1440, 900), 'phone': (390, 844)}
SCALES = {'default': 1, 'large': LARGEST_SCALE}
MAIN_VIEWS = ['life', 'activities', 'map', 'relationships', 'inventory', 'journal', 'character', 'party', 'legacy']
VIEW_LABELS = {'title': 'Title screen', 'life-right-now': 'Life (Right now)', 'life': 'Life', 'activities': 'Activities', 'map': 'Explore', 'relationships': 'Relationships', 'inventory': 'Inventory',
               'journal': 'Journal', 'character': 'Character', 'party': 'Party', 'legacy': 'Family history'}

# The 22 October evaluation of v0.66 and the Bible's aims, as given.
BASELINES = {
    'decision': {'baseline': '555px desktop, 611px phone', 'aim': 'under 200px'},
    'costVisibility': {'baseline': 'not measured', 'aim': 'all'},
    'fightHeight': {'baseline': 'old page 2,637px desktop, 3,348px phone; field page not measured', 'aim': 'fits the viewport without scrolling; scrolls only with larger text'},
    'phoneContent': {'baseline': 'about 66 %', 'aim': '70 % or more'},
    'subTabRows': {'baseline': 'up to 2', 'aim': '1'},
    'smallestFont': {'baseline': '8px', 'aim': '12px'},
    'requests': {'baseline': '288', 'aim': 'under 40'},
    'toast': {'baseline': 'yes', 'aim': 'never'},
}

METHODS = {
    'decision': 'With every scroll position at 0, the top edge (getBoundingClientRect().top, px) of the "Right now" panel ([data-right-now]) or, when a scene is open, of the scene\'s first choice card (.story-scene .choice-card) on the Life view; "as arrived" is the Life view as the creator leaves it (opening scene and first-day guide on), "right now" after the scene is answered and the guide dismissed.',
    'costVisibility': 'Visible choice controls ([data-op=activity], [data-op=choice], [data-op=battle-action], [data-op=practice-action]) that carry a visible line naming time, gold, Health, Focus or a danger: a descendant (or, for a battle command, a sibling in its .field-action/.battle-action-option wrapper) whose class contains cost, risk, detail, reason, preview or outlook and has text, or any text matching /\\b\\d+\\s*(d|days?|g|gold)\\b|\\bnow\\b|\\d+\\s*%|risk|danger|deadly|wound|bleed|death|die\\b|dead\\b|health|focus/i. Share = carrying / visible choices; measured on every view, headlined for the Life view.',
    'fightHeight': 'Height the page would need to show the whole fight without any inner scrolling: document.documentElement.scrollHeight plus, for every visible element whose overflow-y is auto or scroll, its scrollHeight minus clientHeight ("unrolled height"). The tactics rehearsal is also reported as the practice dialog\'s own scrollHeight (.practice-modal), which is how the v0.66 figures were taken. "Fits" means the unrolled height is no more than the viewport height.',
    'phoneContent': 'At 390x844 on the Life view with scroll at 0: 844 minus the union of the vertical extents of .game-header, .game-commandbar, .mobile-command-dock and .bottom-nav (so the dock and the nav inside it count once), over 844. The height of #main-content is reported beside it as a check. In game mode the body is 100dvh with overflow hidden, so these bars are on screen whatever their CSS position.',
    'subTabRows': 'Inside #main-content, every visible nav, [role=tablist] or element whose class contains tabs, scope, categories, sections or filters that holds two or more visible buttons of one data-op with one marked current (aria-pressed=true, aria-current or .active/.selected); its rows are the distinct vertical positions (3px tolerance) of those buttons. A view\'s count is the sum over its groups.',
    'smallestFont': 'For every non-empty text node on the page whose parent is rendered (has a box, not display:none, visibility:hidden, opacity 0, [hidden] or .sr-only), the computed font-size of that parent; the smallest, with the element and text it belongs to, and how many such elements are under 12px.',
    'requests': 'Network requests the page makes from navigation to index.html until the network has been idle for 500ms (Playwright networkidle) on the title screen, counted by resource type.',
    'toast': 'Save in this browser (Menu) is pressed on the Life view; #toast is read 0.4s later and again 10s after the press: whether it is shown (not hidden, has a box) and whether its box intersects any visible button, link or input.',
    'firstControl': 'With scroll at 0, the top edge of the first enabled button, link or form control inside #main-content in document order, and of the first choice control ([data-op=activity], [data-op=choice], [data-op=battle-action]).',
    'viewHeight': 'The unrolled height (see the Fight page) of each main view, and whether it fits the viewport.',
}

# ----------------------------------------------------------------------------- page-side measurement
MEASURE_JS = r"""
(opts) => {
  const vis = el => { if (!el || !el.getClientRects || !el.getClientRects().length) return false; const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const cls = el => (el.getAttribute && el.getAttribute('class')) || '';
  const tag = el => el.tagName.toLowerCase() + (cls(el) ? '.' + cls(el).trim().split(/\s+/).slice(0, 2).join('.') : '') + (el.id ? '#' + el.id : '');
  const round = v => Math.round(v * 10) / 10;
  // scroll everything to the top so distances are layout distances
  window.scrollTo(0, 0);
  for (const el of document.querySelectorAll('*')) { if (el.scrollTop) el.scrollTop = 0; }
  const main = document.querySelector('#main-content') || document.querySelector('.practice-modal') || document.body;
  const top = el => el ? round(el.getBoundingClientRect().top + window.scrollY) : null;
  // unrolled height
  let extra = 0; const containers = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el); if (!/(auto|scroll)/.test(cs.overflowY)) continue;
    if (el.scrollHeight > el.clientHeight + 1 && vis(el)) { extra += el.scrollHeight - el.clientHeight; containers.push({ el: tag(el), scrollHeight: el.scrollHeight, clientHeight: el.clientHeight }); }
  }
  const docHeight = document.documentElement.scrollHeight, unrolled = docHeight + extra;
  // first control / first choice
  const controlSel = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [role="button"]';
  const firstControl = [...main.querySelectorAll(controlSel)].find(vis) || null;
  const choiceSel = '[data-op="activity"], [data-op="choice"], [data-op="battle-action"], [data-op="practice-action"]';
  const choices = [...main.querySelectorAll(choiceSel)].filter(vis);
  const firstChoice = choices[0] || null;
  const rightNow = document.querySelector('[data-right-now]');
  const rightNowRow = rightNow ? [...rightNow.querySelectorAll('[data-op="activity"]')].find(vis) : null;
  const sceneChoice = [...document.querySelectorAll('.story-scene .choice-card')].find(vis) || null;
  // choices with a visible cost / risk line
  const costClass = /cost|risk|detail|reason|preview|outlook/i;
  const costText = /\b\d+\s*(d|days?|g|gold)\b|\bnow\b|\d+\s*%|risk|danger|deadly|wound|bleed|death|die\b|dead\b|health|focus/i;
  const scopeOf = c => { const wrap = c.parentElement && c.parentElement.matches('.field-action, .battle-action-option') ? c.parentElement : c; return wrap; };
  const carries = c => { const scope = scopeOf(c); if ([...scope.querySelectorAll('*')].some(el => vis(el) && costClass.test(cls(el)) && el.textContent.trim())) return true; return costText.test(scope.innerText || scope.textContent || ''); };
  const lacking = choices.filter(c => !carries(c)).map(c => (c.querySelector('strong') || c).textContent.trim().replace(/\s+/g, ' ').slice(0, 60));
  // sub-tab groups
  const groupSel = 'nav, [role="tablist"], [class*="tabs"], [class*="-scope"], [class*="categories"], [class*="sections"], [class*="filters"]';
  const current = b => b.getAttribute('aria-pressed') === 'true' || b.hasAttribute('aria-current') || b.classList.contains('active') || b.classList.contains('selected');
  const groups = [];
  for (const g of main.querySelectorAll(groupSel)) {
    if (!vis(g) || g.matches('.bottom-nav, .quick-actions, .choice-grid')) continue;
    const buttons = [...g.children].filter(c => c.matches('button, .button') && vis(c));
    if (buttons.length < 2 || !buttons.some(current)) continue;
    const ops = new Set(buttons.map(b => b.dataset.op || '')); if (ops.size > 1) continue;
    const tops = buttons.map(b => b.getBoundingClientRect().top).sort((a, b) => a - b);
    let rows = 1; for (let i = 1; i < tops.length; i++) if (tops[i] - tops[i - 1] > 3) rows++;
    groups.push({ group: tag(g), op: buttons[0].dataset.op || null, buttons: buttons.length, rows });
  }
  // fonts
  let min = Infinity, under = 0, total = 0, sample = null;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (!node.textContent.trim()) continue;
    const el = node.parentElement; if (!el || el.closest('script, style, [hidden], .sr-only')) continue;
    if (!vis(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize); if (!size) continue;
    total++; if (size < 12) under++;
    if (size < min) { min = size; sample = tag(el) + ' "' + node.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + '"'; }
  }
  // chrome (phone)
  const bars = ['.game-header', '.game-commandbar', '.mobile-command-dock', '.bottom-nav'].map(sel => document.querySelector(sel)).filter(vis)
    .map(el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return { el: tag(el), top: round(r.top), bottom: round(r.bottom), height: round(r.height), position: cs.position }; });
  const H = window.innerHeight;
  const spans = bars.map(b => [Math.max(0, b.top), Math.min(H, b.bottom)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
  let covered = 0, cursor = -1;
  for (const [a, b] of spans) { const start = Math.max(a, cursor); if (b > start) covered += b - start; cursor = Math.max(cursor, b); }
  const mainBox = document.querySelector('#main-content');
  const fixed = [...document.querySelectorAll('body *')].filter(el => { const cs = getComputedStyle(el); return (cs.position === 'fixed' || cs.position === 'sticky') && vis(el) && el.getBoundingClientRect().height > 0; }).map(el => ({ el: tag(el), top: round(el.getBoundingClientRect().top), height: round(el.getBoundingClientRect().height) })).slice(0, 12);
  const page = document.querySelector('.field-workspace') ? 'field' : document.querySelector('.battle-workspace') ? 'battle' : document.querySelector('.practice-modal') ? 'practice' : document.querySelector('.story-scene') ? 'scene' : document.querySelector('.title-screen') ? 'title' : document.querySelector('.creator-screen') ? 'creator' : 'view';
  return {
    page, innerWidth: window.innerWidth, innerHeight: H, readingScale: getComputedStyle(document.documentElement).getPropertyValue('--reading-scale').trim() || '1',
    docHeight, unrolledHeight: unrolled, fits: unrolled <= H, scrollContainers: containers.slice(0, 6),
    firstControlTop: top(firstControl), firstControl: firstControl ? tag(firstControl) + ' "' + firstControl.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + '"' : null,
    firstChoiceTop: top(firstChoice), rightNowTop: top(rightNow), rightNowFirstRowTop: top(rightNowRow), sceneFirstChoiceTop: top(sceneChoice),
    sceneTitle: document.querySelector('.story-scene h2') ? document.querySelector('.story-scene h2').textContent.trim() : null,
    firstDayGuide: Boolean(document.querySelector('[data-op="footing-dismiss"]')),
    choices: { total: choices.length, withCost: choices.length - lacking.length, lacking: lacking.slice(0, 8) },
    subTabRows: groups.reduce((n, g) => n + g.rows, 0), tabGroups: groups,
    fonts: { min: Number.isFinite(min) ? min : null, under12: under, total, sample },
    chrome: { bars, coveredPx: round(covered), contentPx: round(H - covered), contentShare: Math.round((H - covered) / H * 1000) / 10, mainContentHeight: mainBox ? round(mainBox.getBoundingClientRect().height) : null },
    fixedOrSticky: fixed,
  };
}
"""

PRACTICE_JS = r"""
() => { const m = document.querySelector('.practice-modal'); if (!m) return null; const cs = getComputedStyle(m);
  return { scrollHeight: m.scrollHeight, clientHeight: m.clientHeight, overflowY: cs.overflowY, lesson: (m.querySelector('[data-op="practice-lesson"][aria-pressed="true"]') || {}).textContent, commands: m.querySelectorAll('[data-op="practice-action"]').length }; }
"""

TOAST_JS = r"""
() => { const t = document.getElementById('toast'); if (!t) return { present: false };
  const vis = el => el && el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none';
  const shown = !t.hidden && vis(t); const r = t.getBoundingClientRect();
  const overlaps = [];
  const label = c => (c.getAttribute('aria-label') || c.innerText || c.textContent || c.className).toString().replace(/[^\p{L}\p{N}\s'’&-]/gu, ' ').trim().replace(/\s+/g, ' ').slice(0, 32);
  if (shown) for (const c of document.querySelectorAll('button, a[href], input, select, [role="button"]')) { if (!vis(c) || c === t) continue; const b = c.getBoundingClientRect(); if (b.width && b.height && b.left < r.right && b.right > r.left && b.top < r.bottom && b.bottom > r.top) overlaps.push(label(c)); }
  return { present: true, shown, text: t.textContent.trim().slice(0, 80), box: shown ? { top: Math.round(r.top), left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height) } : null, coversControl: overlaps.length > 0, covered: overlaps.slice(0, 6) }; }
"""

READ_SLOTS_JS = r"""
() => new Promise((resolve, reject) => { let r; try { r = indexedDB.open('hearth-and-oath', 1); } catch (e) { reject(String(e)); return; }
  r.onerror = () => reject(String(r.error)); r.onblocked = () => reject('blocked');
  r.onsuccess = () => { const db = r.result; let g; try { g = db.transaction('keyvalue').objectStore('keyvalue').get('hearth-and-oath:slots:v1'); } catch (e) { reject(String(e)); return; }
    g.onsuccess = () => { resolve(g.result || null); db.close(); }; g.onerror = () => reject(String(g.error)); }; })
"""


# ----------------------------------------------------------------------------- helpers
def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


def serve(directory):
    port = free_port()
    proc = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1', '--directory', str(directory)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    url = f'http://127.0.0.1:{port}/'
    for _ in range(50):
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=0.2):
                break
        except OSError:
            time.sleep(0.1)
    return proc, url


def build_lives(out_dir, seed):
    """Make the three lives with the real engine; return {name: envelope JSON text}."""
    lives_dir = out_dir / 'lives'
    lives_dir.mkdir(parents=True, exist_ok=True)
    result = subprocess.run(['node', str(LIVES_SCRIPT), str(lives_dir), seed], cwd=str(PROJECT), capture_output=True, text=True, timeout=240)
    if result.returncode != 0:
        raise RuntimeError('the lives could not be made: ' + (result.stderr.strip().splitlines() or ['no output'])[-1])
    summary = json.loads(result.stdout.strip().splitlines()[-1])
    return {name: (lives_dir / f'{name}.json').read_text() for name in ('edition', 'field', 'legacy')}, summary


class BrowserUnavailable(RuntimeError):
    """Chromium could not be launched; the caller exits with code 3."""


class Harness:
    def __init__(self, playwright, args, url, lives):
        self.pw = playwright
        self.args = args
        self.url = url
        self.lives = lives
        self.browser = None
        self.report = {
            'harness': 'Hearth & Oath interface harness (v0.70, measuring only)',
            'generatedAt': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'),
            'quick': bool(args.quick), 'url': url, 'localServer': args.url is None,
            'viewports': {k: {'width': w, 'height': h} for k, (w, h) in VIEWPORTS.items()}, 'scales': dict(SCALES),
            'baselines': BASELINES, 'methods': METHODS,
            'measures': {}, 'views': {}, 'fight': {}, 'reached': {}, 'notes': [], 'errors': [],
        }

    # -- browser plumbing -------------------------------------------------------
    def launch(self):
        kwargs = {'headless': True, 'args': ['--no-sandbox']}
        if self.args.chromium:
            kwargs['executable_path'] = self.args.chromium
        try:
            self.browser = self.pw.chromium.launch(**kwargs)
        except Exception as error:  # noqa: BLE001 - reported as exit code 3
            raise BrowserUnavailable(str(error).splitlines()[0] if str(error) else type(error).__name__) from error
        self.report['browser'] = 'Chromium ' + self.browser.version

    def context(self, viewport, scale, envelope=None):
        w, h = VIEWPORTS[viewport]
        ctx = self.browser.new_context(viewport={'width': w, 'height': h})
        seeds = [f"localStorage.setItem({json.dumps(DISPLAY_KEY)}, {json.dumps(json.dumps({'scale': scale}))});"]
        if envelope:
            seeds.append(f"localStorage.setItem({json.dumps(SLOT_KEY)}, {json.dumps(envelope)});")
        ctx.add_init_script('try {' + ''.join(seeds) + '} catch (e) {}')
        page = ctx.new_page()
        page.set_default_timeout(self.args.timeout * 1000)
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page._harness_errors = errors
        return ctx, page

    def goto_title(self, page, count_requests=False):
        requests = []
        if count_requests:
            page.on('request', lambda r: requests.append(r.resource_type))
        page.goto(self.url, wait_until='networkidle')
        page.locator('.title-screen').wait_for()
        if count_requests:
            by_type = {}
            for kind in requests:
                by_type[kind] = by_type.get(kind, 0) + 1
            return {'total': len(requests), 'byType': dict(sorted(by_type.items(), key=lambda kv: -kv[1]))}
        return None

    def measure(self, page, settle_ms=150):
        page.wait_for_timeout(settle_ms)
        return page.evaluate(MEASURE_JS, {})

    def close_modal(self, page):
        if page.locator('.modal-overlay').count():
            page.keyboard.press('Escape')
            page.wait_for_timeout(100)

    def view(self, page, view_id):
        """Switch to a main view through its own tab control, opening the menu drawer when the tab is not on the shell."""
        selector = f'[data-op="tab"][data-id="{view_id}"]'
        self.close_modal(page)
        visible = page.locator(selector + ':visible')
        if visible.count():
            visible.first.click()
        else:
            page.locator('[data-op="menu"]:visible').first.click()
            page.locator('.menu-drawer').wait_for()
            page.locator('.menu-drawer ' + selector).first.click()
        page.locator(f'.game-content.{view_id}-content').wait_for()
        if page.locator('.modal-overlay').count():
            self.close_modal(page)

    def answer_scene(self, page):
        """Answer open scenes and dismiss the first-day guide so the Life view shows Right now."""
        steps = []
        for _ in range(8):
            choice = page.locator('.story-scene .choice-card:not([disabled]):visible')
            reply = page.locator('[data-op="reply"]:not([disabled]):visible')
            if choice.count():
                label = choice.first.locator('.choice-label').inner_text() if choice.first.locator('.choice-label').count() else choice.first.inner_text()
                steps.append(label.strip()[:40])
                choice.first.click()
                page.wait_for_timeout(150)
            elif reply.count():
                steps.append('reply')
                reply.first.click()
                page.wait_for_timeout(150)
            else:
                break
        dismiss = page.locator('[data-op="footing-dismiss"]:visible')
        if dismiss.count():
            dismiss.first.click()
            page.wait_for_timeout(150)
            steps.append('guide dismissed')
        return steps

    def continue_life(self, page):
        page.locator('[data-op="title-continue"]').first.click()
        page.locator('.app-shell.has-life').wait_for()
        page.wait_for_timeout(200)

    def create_life(self, page):
        """Walk the creator with its defaults (an eighteen-year-old life) and return how long the game took to draw it."""
        page.locator('[data-op="title-new"]').first.click()
        page.locator('.save-slots-screen').wait_for()
        slot = page.locator('[data-op="slot-new"]:not([disabled])').first
        slot.click()
        page.locator('#character-form').wait_for()
        start_age = page.locator('#start-age').input_value()
        page.locator('[data-op="creator-step"][data-id="2"]').click()
        page.locator('#character-form .begin-button').wait_for()
        started = time.time()
        page.locator('#character-form .begin-button').click()
        page.locator('.app-shell.has-life').wait_for(timeout=150000)
        page.wait_for_timeout(200)
        return {'seconds': round(time.time() - started, 1), 'startAge': start_age}

    def read_envelope(self, page, expect_name=None):
        for _ in range(40):
            text = page.evaluate(READ_SLOTS_JS)
            if text and (not expect_name or expect_name in text):
                return text
            page.wait_for_timeout(150)
        return None

    # -- the runs -----------------------------------------------------------------
    def run(self):
        started = time.time()
        self.launch()
        runs = [('desktop', 'default')] if self.args.quick else [(v, s) for v in VIEWPORTS for s in SCALES]
        for viewport, scale_name in runs:
            key = f'{viewport}/{scale_name}'
            try:
                self.run_views(viewport, scale_name, key)
            except Exception as error:  # noqa: BLE001 - one page must not end the run
                self.fail(key, 'views', error)
            if not self.args.quick:
                for life, want in (('field', '.field-workspace'), ('legacy', '.battle-workspace')):
                    try:
                        self.run_fight(viewport, scale_name, key, life, want)
                    except Exception as error:  # noqa: BLE001
                        self.fail(key, life, error)
        if not self.args.quick:
            try:
                self.run_creator()
            except Exception as error:  # noqa: BLE001
                self.fail('desktop/default', 'creator', error)
        self.report['durationSeconds'] = round(time.time() - started, 1)
        self.summarise()
        return self.report

    def fail(self, key, stage, error):
        why = f'{type(error).__name__}: {str(error).splitlines()[0][:160] if str(error) else ""}'
        self.report['errors'].append({'run': key, 'stage': stage, 'error': why})
        self.report['reached'][f'{key}/{stage}'] = 'not reached: ' + why
        if self.args.verbose:
            traceback.print_exc()

    def run_views(self, viewport, scale_name, key):
        scale = SCALES[scale_name]
        envelope = self.lives.get('edition') if self.lives else None
        ctx, page = self.context(viewport, scale, envelope)
        try:
            requests = self.goto_title(page, count_requests=True)
            views = self.report['views'].setdefault(key, {})
            views['title'] = self.measure(page)
            views['title']['requests'] = requests
            self.report['reached'][f'{key}/title'] = 'the title screen, a fresh browser profile with the display setting seeded'
            # the tactics rehearsal: the old battle page in a modal, from the title screen
            try:
                page.locator('[data-op="practice-open"]').first.click()
                page.locator('.practice-modal').wait_for()
                practice = self.measure(page)
                practice['modal'] = page.evaluate(PRACTICE_JS)
                self.report['fight'][f'{key}/practice'] = practice
                self.report['reached'][f'{key}/practice'] = 'Title screen → Tactics rehearsal (data-op practice-open, lesson protect_ally); the dialog draws the older battle page for a fictional party'
                page.locator('[data-op="practice-close"]').first.click()
                page.locator('.practice-modal').wait_for(state='detached')
            except Exception as error:  # noqa: BLE001
                self.fail(key, 'practice', error)
                self.close_modal(page)
            # the life
            if envelope:
                self.continue_life(page)
                self.report['reached'][f'{key}/life'] = 'Title screen → Continue (the seeded eighteen-year-old life the creator makes for the harness seed, its birthday scene waiting)'
            else:
                made = self.create_life(page)
                views['creator'] = {'seconds': made['seconds'], 'startAge': made['startAge']}
                self.report['reached'][f'{key}/life'] = 'Title screen → Begin a new life → an empty slot → the creator with its defaults → Begin This Life'
            views['life'] = self.measure(page)
            steps = self.answer_scene(page)
            views['life-right-now'] = self.measure(page)
            views['life-right-now']['stepsTaken'] = steps
            self.report['reached'][f'{key}/life-right-now'] = 'the Life view after answering the opening scene (' + ', '.join(steps[:4]) + ') and dismissing the first-day guide'
            for view_id in MAIN_VIEWS:
                if view_id == 'life' or self.args.quick:
                    continue
                try:
                    self.view(page, view_id)
                    views[view_id] = self.measure(page)
                except Exception as error:  # noqa: BLE001
                    self.fail(key, view_id, error)
                    self.close_modal(page)
            if scale_name == 'default':
                try:
                    self.view(page, 'life')
                    views['toast'] = self.toast(page)
                except Exception as error:  # noqa: BLE001
                    self.fail(key, 'toast', error)
            views['pageErrors'] = page._harness_errors[:5]
        finally:
            ctx.close()

    def toast(self, page):
        save = page.locator('[data-op="save"]:visible')
        if not save.count():
            page.locator('[data-op="menu"]:visible').first.click()
            page.locator('.menu-drawer').wait_for()
            save = page.locator('.menu-drawer [data-op="save"]')
        pressed = time.time()
        save.first.click()
        page.wait_for_timeout(400)
        soon = page.evaluate(TOAST_JS)
        remaining = 10 - (time.time() - pressed)
        if remaining > 0:
            page.wait_for_timeout(int(remaining * 1000))
        later = page.evaluate(TOAST_JS)
        self.close_modal(page)
        return {'at0_4s': soon, 'at10s': later, 'stillShownAt10s': bool(later.get('shown')), 'coversControlAt10s': bool(later.get('coversControl'))}

    def run_fight(self, viewport, scale_name, key, life, want):
        if not self.lives or life not in self.lives:
            self.report['reached'][f'{key}/{life}'] = 'not reached: no life was built'
            return
        ctx, page = self.context(viewport, SCALES[scale_name], self.lives[life])
        try:
            self.goto_title(page)
            self.continue_life(page)
            page.locator(want).wait_for()
            result = self.measure(page)
            result['pageErrors'] = page._harness_errors[:5]
            self.report['fight'][f'{key}/{life}'] = result
            self.report['reached'][f'{key}/{life}'] = ('Title screen → Continue a seeded save of the harness life standing in a roaming fight (createBattle on the edition life, fieldVersion 68); the Life view draws field-ui.js'
                                                      if life == 'field' else
                                                      'Title screen → Continue a seeded save of a life born without a station (the old edition), grown to twenty and put into a forest fight; the Life view draws battle-ui.js')
        finally:
            ctx.close()

    def run_creator(self):
        """Walk the creator once at desktop/default so its path and the life it leaves stay measured."""
        ctx, page = self.context('desktop', 1, None)
        try:
            self.goto_title(page)
            made = self.create_life(page)
            arrived = self.measure(page)
            envelope = self.read_envelope(page)
            summary = None
            if envelope:
                state = json.loads(envelope)['slots'][0]['state']
                summary = {'name': state['hero']['name'], 'age': state['age'], 'seed': state['seed'], 'station': bool(state['hero'].get('station')), 'event': (state.get('event') or {}).get('id')}
            self.report['views'].setdefault('desktop/default', {})['creator'] = {'seconds': made['seconds'], 'startAge': made['startAge'], 'life': summary, 'lifeAsArrived': arrived}
            self.report['reached']['desktop/default/creator'] = 'Title screen → Begin a new life → an empty slot → the creator with its defaults (Begin at age 18) → Begin This Life; a random seed, so this life differs from the seeded one'
        finally:
            ctx.close()

    # -- the summary -------------------------------------------------------------
    def summarise(self):
        views, fight = self.report['views'], self.report['fight']
        m = self.report['measures']

        def pick(run, view, field):
            v = views.get(run, {}).get(view)
            return v.get(field) if isinstance(v, dict) else None

        def decision(run, view):
            v = views.get(run, {}).get(view)
            if not isinstance(v, dict):
                return None
            if v.get('sceneFirstChoiceTop') is not None:
                return {'px': v['sceneFirstChoiceTop'], 'target': 'first choice of the scene "%s"' % (v.get('sceneTitle') or ''), 'firstDayGuide': v.get('firstDayGuide')}
            if v.get('rightNowTop') is not None:
                return {'px': v['rightNowTop'], 'target': 'the Right now panel', 'firstRowPx': v.get('rightNowFirstRowTop'), 'firstDayGuide': v.get('firstDayGuide')}
            return {'px': None, 'target': 'neither a scene nor a Right now panel was on the Life view (page: %s)' % v.get('page')}

        m['decision'] = {**BASELINES['decision'], 'method': METHODS['decision'], 'results': {
            run: {'asArrived': decision(run, 'life'), 'rightNow': decision(run, 'life-right-now')} for run in views}}
        m['costVisibility'] = {**BASELINES['costVisibility'], 'method': METHODS['costVisibility'], 'results': {
            run: {view: views[run][view]['choices'] for view in views[run] if isinstance(views[run][view], dict) and 'choices' in views[run][view]} for run in views}}
        m['fightHeight'] = {**BASELINES['fightHeight'], 'method': METHODS['fightHeight'], 'results': {
            k: {'unrolledHeight': v.get('unrolledHeight'), 'viewportHeight': v.get('innerHeight'), 'fits': v.get('fits'), 'page': v.get('page'),
                **({'practiceModalScrollHeight': v['modal']['scrollHeight'], 'practiceModalClientHeight': v['modal']['clientHeight']} if v.get('modal') else {})}
            for k, v in fight.items()}}
        phone = {run: pick(run, 'life-right-now', 'chrome') or pick(run, 'life', 'chrome') for run in views if run.startswith('phone/')}
        m['phoneContent'] = {**BASELINES['phoneContent'], 'method': METHODS['phoneContent'], 'results': {run: c for run, c in phone.items() if c}}
        m['subTabRows'] = {**BASELINES['subTabRows'], 'method': METHODS['subTabRows'], 'results': {
            run: {view: views[run][view]['subTabRows'] for view in MAIN_VIEWS + ['life-right-now'] if isinstance(views[run].get(view), dict)} for run in views}}
        for run in m['subTabRows']['results']:
            rows = m['subTabRows']['results'][run]
            rows['max'] = max([v for v in rows.values() if isinstance(v, int)] or [0])
        m['smallestFont'] = {**BASELINES['smallestFont'], 'method': METHODS['smallestFont'], 'results': {
            run: {view: views[run][view]['fonts'] for view in ['title'] + MAIN_VIEWS + ['life-right-now'] if isinstance(views[run].get(view), dict)} for run in views}}
        for run in m['smallestFont']['results']:
            fonts = m['smallestFont']['results'][run]
            mins = [v['min'] for v in fonts.values() if isinstance(v, dict) and v.get('min') is not None]
            fonts['min'] = min(mins) if mins else None
        m['requests'] = {**BASELINES['requests'], 'method': METHODS['requests'], 'results': {run: pick(run, 'title', 'requests') for run in views if pick(run, 'title', 'requests')}}
        m['toast'] = {**BASELINES['toast'], 'method': METHODS['toast'], 'results': {run: views[run]['toast'] for run in views if isinstance(views[run].get('toast'), dict)}}
        m['viewHeights'] = {'method': METHODS['viewHeight'], 'results': {
            run: {view: {'unrolledHeight': views[run][view]['unrolledHeight'], 'fits': views[run][view]['fits']} for view in ['title'] + MAIN_VIEWS + ['life-right-now'] if isinstance(views[run].get(view), dict)} for run in views}}
        m['firstControl'] = {'method': METHODS['firstControl'], 'results': {
            run: {view: {'firstControlTop': views[run][view]['firstControlTop'], 'firstChoiceTop': views[run][view]['firstChoiceTop']} for view in ['title'] + MAIN_VIEWS + ['life-right-now'] if isinstance(views[run].get(view), dict)} for run in views}}
        self.report['notes'].append('Figures are from a local static server (python3 -m http.server over dist/) in headless Chromium; no network latency, no cache warmth from a previous visit.')
        self.report['notes'].append('Distances are layout distances with every scroll position at 0; the game may itself scroll a scene heading into view when it focuses it.')
        self.report['notes'].append('The game shell is 100dvh with overflow hidden: views scroll inside .game-content, so "unrolled height" adds the hidden overflow of every inner scroll container to the document height.')


# ----------------------------------------------------------------------------- Markdown
def px(value):
    return '—' if value is None else f'{value:g}px'


def render_markdown(report):
    m = report['measures']
    views = report['views']
    runs = list(views)
    lines = []
    lines.append('# Interface harness — v0.70')
    lines.append('')
    lines.append(f"Measured {report['generatedAt']} with {report.get('browser', 'Chromium')} against `{report['url']}`"
                 + (' (a local static server over `dist/`; no network latency)' if report.get('localServer') else '') + f". Run time {report.get('durationSeconds', '?')} s."
                 + (' **Quick run**: one viewport, title and Life screen only.' if report.get('quick') else ''))
    lines.append('')
    lines.append('Viewports: desktop 1440×900 and phone 390×844, each at the default text size and at the largest reading-scale setting (150%). '
                 'Baselines are the 22 October evaluation of v0.66; aims are the Design Bible\'s. v0.70 measures only; nothing in the game changed for it.')
    lines.append('')
    lines.append('## The measures')
    lines.append('')
    lines.append('| Measure | v0.66 baseline | Aim | v0.70 measured |')
    lines.append('|---|---|---|---|')

    def dec(run, which):
        d = m['decision']['results'].get(run, {}).get(which)
        if not d or d.get('px') is None:
            return '—'
        return f"{round(d['px']):,}px"

    def runlabel(run):
        return run.replace('desktop/', 'desktop, ').replace('phone/', 'phone, ').replace('default', 'default text').replace('large', '150% text')

    def pair(fn, scale):
        """'desktop X, phone Y' for one scale, from fn(run)."""
        cells = [f"{vp} {fn(f'{vp}/{scale}')}" for vp in VIEWPORTS if f'{vp}/{scale}' in views]
        return '; '.join(cells) if cells else None

    def both(fn):
        """The default-text pair, then the 150% pair on its own line."""
        out = []
        default, large = pair(fn, 'default'), pair(fn, 'large')
        if default:
            out.append(default)
        if large:
            out.append(f'150% text: {large}')
        return '<br>'.join(out) if out else '—'

    guide = any((m['decision']['results'].get(run, {}).get('asArrived') or {}).get('firstDayGuide') for run in runs)
    cell = both(lambda run: f"{dec(run, 'asArrived')} as arrived, {dec(run, 'rightNow')} to Right now")
    cell += '<br>"as arrived" is the opening scene' + (' with the first-day guide above it' if guide else '') + '; "Right now" after the scene is answered.'
    lines.append(f"| Distance from the top of the page to the decision on the Day/Life screen, default text | {BASELINES['decision']['baseline']} | {BASELINES['decision']['aim']} | {cell} |")

    def cost(run):
        c = m['costVisibility']['results'].get(run, {})
        life, scene = c.get('life-right-now'), c.get('life')
        bits = []
        if life:
            bits.append(f"{life['withCost']}/{life['total']} in Right now")
        if scene and scene['total']:
            bits.append(f"{scene['withCost']}/{scene['total']} in the scene")
        return ', '.join(bits) or '—'
    allc = [v for run in runs for v in m['costVisibility']['results'].get(run, {}).values()]
    total = sum(v['total'] for v in allc)
    with_cost = sum(v['withCost'] for v in allc)
    cell = both(cost) + f"<br>every view, state and run together: {with_cost}/{total} ({(with_cost / total * 100) if total else 0:.0f}%)"
    lines.append(f"| Share of choices on screen whose cost and serious risks are visible without any gesture | {BASELINES['costVisibility']['baseline']} | {BASELINES['costVisibility']['aim']} | {cell} |")

    def fight(page, field):
        def fn(run):
            v = m['fightHeight']['results'].get(f'{run}/{page}')
            return f"{v[field]:,}px" if v and v.get(field) is not None else '—'
        return fn
    cells = []
    if any(k.endswith('/practice') for k in m['fightHeight']['results']):
        cells.append('Old page, the tactics rehearsal dialog (its scrollHeight, as v0.66 measured it): ' + both(fight('practice', 'practiceModalScrollHeight')))
    if any(k.endswith('/legacy') for k in m['fightHeight']['results']):
        cells.append('Old page, a legacy life in a forest fight (unrolled): ' + both(fight('legacy', 'unrolledHeight')))
    if any(k.endswith('/field') for k in m['fightHeight']['results']):
        cells.append('Field page, the edition life in a roaming fight (unrolled): ' + both(fight('field', 'unrolledHeight')))
    fits = [k for k, v in m['fightHeight']['results'].items() if v.get('fits')]
    if m['fightHeight']['results']:
        cells.append(('Fits without scrolling: ' + ', '.join(fits)) if fits else 'None fits its viewport (900px desktop, 844px phone) at either text size.')
    lines.append(f"| The Fight page's total document height at default text | {BASELINES['fightHeight']['baseline']} | {BASELINES['fightHeight']['aim']} | {'<br>'.join(cells) or 'not reached'} |")

    cells = []
    for run, c in m['phoneContent']['results'].items():
        bars = ', '.join(f"{b['el'].split('.')[1] if '.' in b['el'] else b['el']} {b['height']:g}px" for b in c['bars'] if 'bottom-nav' not in b['el'])
        cells.append(f"{runlabel(run)}: {c['contentShare']:g}% ({c['contentPx']:g}px of 844; {bars}; #main-content is {c['mainContentHeight']:g}px)")
    lines.append(f"| Share of a phone screen that is content | {BASELINES['phoneContent']['baseline']} | {BASELINES['phoneContent']['aim']} | {'<br>'.join(cells) or '—'} |")

    def tabs(run):
        rows = m['subTabRows']['results'].get(run)
        if not rows:
            return '—'
        worst = sorted([(v, k) for k, v in rows.items() if k != 'max' and isinstance(v, int) and v > 1], reverse=True)[:3]
        bars = lambda k: len((views[run].get(k) or {}).get('tabGroups') or [])  # noqa: E731
        return f"up to {rows['max']}" + (' (' + ', '.join(f"{VIEW_LABELS.get(k, k)} {v} row{'s' if v != 1 else ''} from {bars(k)} bar{'s' if bars(k) != 1 else ''}" for v, k in worst) + ')' if worst else '')
    lines.append(f"| Sub-tab rows per view | {BASELINES['subTabRows']['baseline']} | {BASELINES['subTabRows']['aim']} | {both(tabs)}<br>A bar is one group of tab controls; a bar that wraps counts each wrapped row. |")

    def font(run):
        fonts = m['smallestFont']['results'].get(run)
        if not fonts:
            return '—'
        smallest = min(((v['min'], k, v['sample']) for k, v in fonts.items() if isinstance(v, dict) and v.get('min') is not None), default=None)
        return f"{smallest[0]:g}px ({VIEW_LABELS.get(smallest[1], smallest[1])}: {smallest[2]})" if smallest else '—'
    life_font = []
    for run in runs:
        v = (m['smallestFont']['results'].get(run) or {}).get('life-right-now')
        if v and v.get('min') is not None:
            life_font.append(f"{runlabel(run)} {v['min']:g}px, {v['under12']} elements under 12px")
    cell = both(font) + ('<br>On the Life view: ' + '; '.join(life_font) if life_font else '')
    lines.append(f"| Smallest rendered font size on each main view | {BASELINES['smallestFont']['baseline']} | {BASELINES['smallestFont']['aim']} | {cell} |")

    def requests(run):
        r = m['requests']['results'].get(run)
        return f"{r['total']} (" + ', '.join(f'{k} {v}' for k, v in list(r['byType'].items())[:4]) + ')' if r else '—'
    lines.append(f"| Number of network requests before the title screen settles | {BASELINES['requests']['baseline']} | {BASELINES['requests']['aim']} | {both(requests)} |")

    cells = []
    for run, t in m['toast']['results'].items():
        soon, later = t['at0_4s'], t['at10s']
        cells.append(f"{runlabel(run)}: at 10 s {'still shown' if later.get('shown') else 'gone'}{', covering ' + ', '.join(later['covered']) if later.get('coversControl') else ''}"
                     + f" (at 0.4 s it was {'shown' if soon.get('shown') else 'not shown'}{', over ' + ', '.join(soon['covered']) if soon.get('coversControl') else ''})")
    lines.append(f"| A toast still covering a control after 10 s | {BASELINES['toast']['baseline']} | {BASELINES['toast']['aim']} | {'<br>'.join(cells) or '—'} |")
    lines.append('')

    # per-view tables
    lines.append('## Each view')
    lines.append('')
    lines.append('First control / first choice: top edge in px with scroll at 0. Height: the unrolled height (fits = no scrolling needed). Type: the smallest font and how many text elements are under 12px. Tabs: rows of sub-tab controls. Choices: how many visible choices carry a cost/risk line, of how many.')
    for run in runs:
        lines.append('')
        lines.append(f'### {runlabel(run)}')
        lines.append('')
        lines.append('| View | First control | First choice | Height | Type | Tabs | Choices |')
        lines.append('|---|---|---|---|---|---|---|')
        for view in ['title', 'life', 'life-right-now'] + [v for v in MAIN_VIEWS if v != 'life']:
            v = views[run].get(view)
            if not isinstance(v, dict) or 'fonts' not in v:
                if not report.get('quick'):
                    lines.append(f"| {VIEW_LABELS.get(view, view)} | not reached | | | | | |")
                continue
            label = {'title': 'Title screen', 'life': 'Life, as arrived' + (' (scene: %s)' % v['sceneTitle'] if v.get('sceneTitle') else ''), 'life-right-now': 'Life, Right now'}.get(view, VIEW_LABELS.get(view, view))
            fonts = v['fonts']
            lines.append(f"| {label} | {px(v['firstControlTop'])} | {px(v['firstChoiceTop'])} | {v['unrolledHeight']}px{' fits' if v['fits'] else ''} | {fonts['min']:g}px, {fonts['under12']} under 12px | {v['subTabRows']} | {v['choices']['withCost']}/{v['choices']['total']} |")
        creator = views[run].get('creator')
        if creator:
            lines.append('')
            lines.append(f"The creator drew its own life in {creator['seconds']} s (Begin at age {creator['startAge']})" + (f"; it left {creator['life']['name']}, age {creator['life']['age']}, scene {creator['life']['event']}, decision at {px(creator['lifeAsArrived'].get('sceneFirstChoiceTop') or creator['lifeAsArrived'].get('rightNowTop'))}." if creator.get('life') else '.'))
        lacking = [(view, views[run][view]['choices']['lacking']) for view in views[run] if isinstance(views[run][view], dict) and views[run][view].get('choices', {}).get('lacking')]
        if lacking:
            lines.append('')
            lines.append('Choices without a visible cost/risk line: ' + '; '.join(f"{VIEW_LABELS.get(view, view)}: " + ', '.join(f'“{x}”' for x in items[:4]) for view, items in lacking[:5]) + '.')
    # the fights
    if report['fight']:
        lines.append('')
        lines.append('## The Fight pages')
        lines.append('')
        lines.append('| Run | Page | Unrolled height | Viewport | Fits | Dialog scrollHeight | Type | Choices |')
        lines.append('|---|---|---|---|---|---|---|---|')
        for k, v in report['fight'].items():
            run, page = k.rsplit('/', 1)
            name = {'practice': 'Tactics rehearsal (old page, practice dialog)', 'legacy': 'Old battle page, legacy life', 'field': 'Field page (v0.68), edition life'}[page]
            modal = v.get('modal') or {}
            lines.append(f"| {runlabel(run)} | {name} | {v['unrolledHeight']}px | {v['innerHeight']}px | {'yes' if v['fits'] else 'no'} | {str(modal.get('scrollHeight')) + 'px' if modal.get('scrollHeight') else '—'} | {v['fonts']['min']:g}px, {v['fonts']['under12']} under 12px | {v['choices']['withCost']}/{v['choices']['total']} |")
    lines.append('')
    lines.append('## How each measure is taken')
    lines.append('')
    for key, text in METHODS.items():
        lines.append(f'- **{key}** — {text}')
    lines.append('')
    lines.append('## How each page was reached')
    lines.append('')
    seen = set()
    for key, how in report['reached'].items():
        stage = key.split('/', 2)[-1]
        if how.startswith('not reached'):
            lines.append(f'- {key}: {how}')
        elif stage not in seen:
            seen.add(stage)
            lines.append(f'- {stage}: {how}')
    if report['errors']:
        lines.append('')
        lines.append('## Not measured')
        lines.append('')
        for err in report['errors']:
            lines.append(f"- {err['run']} / {err['stage']}: {err['error']}")
    lines.append('')
    lines.append('## Notes')
    lines.append('')
    for note in report['notes']:
        lines.append(f'- {note}')
    lines.append('')
    return '\n'.join(lines)


# ----------------------------------------------------------------------------- main
def main(argv=None):
    parser = argparse.ArgumentParser(description='Measure the Hearth & Oath interface in headless Chromium.')
    parser.add_argument('--url', help='serve nothing; measure this running game instead')
    parser.add_argument('--chromium', help='path to a Chromium/Chrome binary (default: the Playwright browser)')
    parser.add_argument('--out', default=str(DEFAULT_OUT), help='directory for report.json, report.md and the lives (default artifacts/interface-harness)')
    parser.add_argument('--snapshot', help='also write the Markdown report to this path (for docs/measures)')
    parser.add_argument('--quick', action='store_true', help='title screen and Life screen only, one viewport, no engine-built lives')
    parser.add_argument('--seed', default='harness-v070', help='seed of the engine-built lives')
    parser.add_argument('--timeout', type=float, default=20, help='seconds to wait for any one control or page')
    parser.add_argument('--verbose', action='store_true')
    parser.add_argument('--from-json', help='do not measure; render the Markdown again from this report.json')
    args = parser.parse_args(argv)

    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    if args.from_json:
        report = json.loads(Path(args.from_json).read_text())
    else:
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            print('interface-harness: Python Playwright is not importable (pip install playwright; playwright install chromium).', file=sys.stderr)
            return 3
        server = None
        url = args.url
        if not url:
            server, url = serve(DIST)
        lives, lives_summary = {}, None
        try:
            if not args.quick:
                try:
                    lives, lives_summary = build_lives(out, args.seed)
                except Exception as error:  # noqa: BLE001
                    print(f'interface-harness: {error}', file=sys.stderr)
            with sync_playwright() as playwright:
                harness = Harness(playwright, args, url, lives)
                try:
                    report = harness.run()
                except BrowserUnavailable as error:
                    print(f'interface-harness: Chromium could not be launched: {error}', file=sys.stderr)
                    return 3
                report['lives'] = lives_summary
                harness.browser.close()
        finally:
            if server:
                server.terminate()
        (out / 'report.json').write_text(json.dumps(report, indent=1))
    markdown = render_markdown(report)
    (out / 'report.md').write_text(markdown)
    if args.snapshot:
        snapshot = Path(args.snapshot)
        snapshot.parent.mkdir(parents=True, exist_ok=True)
        snapshot.write_text(markdown)
    print(markdown.split('## Each view')[0])
    print(f"Reports: {out / 'report.json'} and {out / 'report.md'}" + (f"; snapshot {args.snapshot}" if args.snapshot else ''))
    if report['errors']:
        print(f"{len(report['errors'])} stage(s) not reached; see the report.", file=sys.stderr)
    return 0


if __name__ == '__main__':
    sys.exit(main())
