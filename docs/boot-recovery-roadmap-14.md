# Readable boot recovery (roadmap 14)

## Scope

The hosted source entry no longer starts with an empty app. It shows one quiet,
responsive Loading state while its existing static module graph is fetched and
initialized. The normal first app render replaces that placeholder without a
second success message or an artificial delay.

The inline guard is deliberately independent of the module graph. It recognizes
an entry-script resource failure, or a startup error whose reported source is in
the game's same-origin module directory. The standalone builder substitutes an
inline module; there, a same-document error is the relevant source. Recovery
also appears if deferred module execution completes without replacing the
placeholder. It uses a generic explanation, not a claim that every failure is a
network outage. No diagnostic strings, save contents or exception details are
inserted into the page.

Recovery explains that a startup error does not mean saved lives have been
erased. Retry performs one ordinary full-page reload and immediately disables
itself. It does not retry an import inside a partly initialized document, modify
browser storage, add an account service, or make its own network request. A full
reload also avoids reusing a failed module instance in that document. There is
no timeout: a slow but still-pending module remains Loading rather than being
declared broken.

Plain `noscript` text explains that JavaScript must be enabled and the page
reloaded; a no-script-only head style hides the otherwise permanent Loading
label. The existing separate `view-status` region remains outside the
replaceable app.

## Entry and offline contract

- The exact `<script type="module" src="./js/app.js"></script>` entry is
  preserved. The offline builder's existing replacement remains unchanged.
- The guard is a classic inline script after that entry. Parser-inserted modules
  defer, so the guard runs before module execution.
- Successful initialization is checked at `DOMContentLoaded`, after the current
  synchronous deferred module graph. Inline modules do not emit the external
  script element's `load` event, so relying on that event would leak the guard in
  the standalone file. Both temporary listeners are removed on success or
  recognized failure.
- This readiness contract assumes the current app's synchronous first render.
  If a later change makes app startup depend on top-level await or another
  asynchronous rendering step, add an explicit ready signal rather than timing
  it out or treating `DOMContentLoaded` alone as proof of completion.
- The generated hosted offline-download opener retains its separate existing
  Opening/failure handling. This patch does not rebuild or change that generated
  entry or the stored offline parts.
- The app captures only its initial static pre-render shell. Its existing
  already-open `file:` re-download path includes that shell alongside the
  inline scripts, so re-downloaded standalone copies retain both Loading and
  failure recovery. It does not serialize the current game's rendered UI.
- No source CSP is relaxed and no dynamic import, external bootstrap URL, or
  additional resource is introduced. The inline guard still requires script
  execution to be permitted, just as the existing standalone inline game does.

The module deferral, external/inline distinction and error/load events were
checked against the [HTML script processing model](https://html.spec.whatwg.org/multipage/scripting.html#execute-the-script-element).

## Boundaries

This is startup recovery, not a catch-all runtime error overlay. Image and
stylesheet resource errors, extension URLs, unrelated page-script URLs, and
errors without a usable source filename do not independently establish a game
boot failure. The no-render completion check still prevents a completed but
blank entry from leaving Loading indefinitely. After successful startup, later
game errors and asynchronous rejections are outside this guard's scope.

No save repair, reset, deletion, migration, gameplay rule, balancing, story,
identity, account, permission, or security-setting behavior is added.

## Verification (isolated source branch)

PASS:

```sh
node --test tests/boot-recovery.test.js
# 12 passed, 0 failed

node --test --test-name-pattern='persistent polite selection announcements' tests/menus-focus.test.js
# 1 passed, 0 failed

git diff --check
```

The lightweight boot tests execute the actual inline code extracted from
`dist/index.html` on the project's modeled DOM surface. They cover delayed
startup; entry resource errors representing blocked/missing modules; scoped
runtime/parse error events, including after a partial title render; unrelated
image/style/extension errors; readiness without rendering; success cleanup;
repeated failure signals; a queued double Retry; and the next document's fresh
handlers. Storage access, extra fetches and timeouts would throw in the harness;
all synthetic saved bytes remain exact.

The offline contract test executes the actual builder replacement statement
with a small representative bundle, runs that inline bundle on the surface,
and checks recovery and cleanup for both `file:` and hosted document URLs. It
does not generate, load, or hash the complete media-embedded offline artifact.
An additional lightweight test executes the production `downloadGame` function
with a modeled file document and real Blob, then runs the guard from its
exported HTML. It verifies that static opening markup survives this existing
re-download path while synthetic live-session markup is absent.

NOT RUN here: an actual browser module-loader failure, responsive rendering,
JavaScript-disabled browser rendering, the complete current regression gate,
the heavy offline build, deployed-site smoke, or publication. Simulated DOM and
event contracts are not browser verification. The sole release owner must run
the applicable combined-release/build/browser checks before claiming deployed
verification.

## Integration hardening

A partial startup failure also clears only the app-owned title, creation, game and dialog body modes before restoring the static recovery shell. These modes can fix the viewport and hide overflow; keeping them after a partial render could clip Retry on a short or enlarged-text viewport. Unrelated body preferences remain untouched. The two partial-render guard cases assert this cleanup. Final integrated runtime/build/browser validation is recorded separately in the v0.46 release record.

The exact integrated standalone handler verifier found an existing lexical collision missed by the initially extracted download-function test: the local place helper named location shadowed the browser location object. The file-mode check now explicitly reads globalThis.location.protocol, so a downloaded game re-downloads its own inline shell/scripts instead of trying to fetch hosted parts. The focused extracted regression now includes the real local place helper in the same closure, and the exact full embedded handler remains the integration acceptance check.
