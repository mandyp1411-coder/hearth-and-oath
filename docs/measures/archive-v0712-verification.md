# v0.71.2: the old lives have a home

The [main game](https://hearth-and-oath-v1-a73f.nilled463.chatgpt.site/) is published as Sites version 106. Old Rules slots and import reviews now link to the [public archive](https://hearth-and-oath-old-rules.nilled463.chatgpt.site/), version 1. PR [#18](https://github.com/mandyp1411-coder/hearth-and-oath/pull/18) carries this bounded release. The farmer layout and gameplay are unchanged.

## What changed

Current main exports Old Rules saves with migration step 71. The pinned archive capped that metadata at 70 and rejected those complete saves. Its exact two-file overlay accepts Old Rules step 71 while retaining the incoming stamp, and refuses actual New Rules markers before migration. New Rules still have the archive's original step-70 ceiling. Unknown later steps are refused. Ordinary exports retain the whole saved life; no past deed, person or history is invented.

The builder pins `065d54cd91c8cfea390ba0f71fb046351153d6fa`, applies overlay SHA256 `b63cb3553eff1b314932219b247a496b425300edcc369e3f364730174ba06940` in a disposable worktree, and preserves the caller's source. The 333,537,633-byte standalone stays under `artifacts/old-rules-archive/`; hosting gets its 730-byte loader alias. The final archive host is 262,553,396 bytes across 1,049 files, below 256 MiB. `ARCHIVE.json` binds the baseline, overlay, runtime, storage and artifact. The archive keeps `hearth-and-oath-legacy` and its own origin.

The first native source push exceeded the receive-pack size limit. Seven smaller source batches produced the exact intended final tree without rewriting shared history. Only the complete source was saved and published.

## Verification

| Scope | Actual result |
| --- | --- |
| Full fresh FAST | 244 files; 3,208 assertions passed, zero failed, four skipped |
| Full fresh SLOW | 36 files; 741 assertions passed, zero failed, one skipped |
| Frozen input and raw output guards | PASS for both complete lanes |
| Archive source-engine handoffs | 16 cases passed; all 14 genuine legacy states, 22 public commands, whole JSON and typed stamps preserved |
| Pinned archive engine/storage baseline | 71 assertions passed, zero failed or skipped |
| Compiled main offline startup | One actual execution; 14 semantic cases passed, exit 0, 19.175 seconds |
| Strict content build | 15 files, 50 items, 4,343 fields; zero errors, warnings or content voice hits; acyclic offline build passed |
| Whole-game voice lint | 614 existing audit hits, zero placeholders; 23,059 strings, 287 modules, 12 modules skipped |

Both official lanes ran wholly on clean frozen commit `f82160cae5561f851f99c3c7fb1274fec04a30f7`, tree `930cade8eabd247d8003cd2213aca29e0c145b6d`. There is no historical result reuse. Every actual Node test process closed with exit zero. Strict lane status remains **FAIL**, because skipped tests remain skipped. Four skips concern unavailable original reference artwork; one concerns the unavailable Python Playwright harness. The formal full release check is **NOT RUN**. The other 29 offline checkers are **NOT RUN**.

The native startup wrapper first refused an unrelated untracked QA transfer residue before any checker execution. That file's identity and quarantine are retained; the listed source and artifact stayed exact. The one actual checker then passed. Its auxiliary capture summary failed because stdout contained two JSON documents. A separate strict parser consumed every byte of the sealed closed output and verified both documents without rerunning the VM. The initial guard refusal, repair, auxiliary failure and derived checker PASS remain distinct in the proof.

Main runtime is `37a1ee3f84ef6b589d3daa9daca80d594e6a7c5320a31d100459eb5b6b4f518f`; verification inputs are `a2307d32771cc1066527c3e6e766c9e8a22e9b64c3f9a816acfa582eac6e5242`. Main standalone is 333,660,486 bytes, SHA256 `8e395a3b2b1a5a124bc34bb8138c434b11d686d8f304bca9aac465d113402c7b`. Main `engine.js` is unchanged. The diagnostic bench measured create-at-18 4,696 ms, getActions 14 ms, walk 26 ms, ageUp 166 ms, and 711,240 saved characters; these are not browser-speed promises.

## Browser limits

Chrome opened the public archive and its Old Rules title. An actual Old Rules slot export from main version 105/v0.71.1 matched the complete saved life, including step 71; its 1,036,749 bytes are retained, SHA256 `feb4b10aec9a5afb8f72e047e0a24ff1c45a5e2e775e988e2433acdb635c78a4`.

The public archive import transfer stalled twice. The first was interrupted; the second timed out despite explicit chooser and outer tool timeouts. No import review or acceptance returned. The full browser round trip remains **NOT RUN**; these service results do not establish an application failure. No further browser call was made. This release claims neither a completed human farmer playtest nor permission to remove legacy rules or widen the life engines.

## Publication and retained proof

| Field | Main | Archive |
| --- | --- | --- |
| Sites version | 106 | 1 |
| Source commit | `1ac4853f19c0f824ddaaecbb230264d03979a637` | `43ee1a8b1b48cb5aee8ad060d206a94bc09723b9` |
| Source tree | `930cade8eabd247d8003cd2213aca29e0c145b6d` | `848a699448cd4d1fa81bd71559f584ce74ce786a` |
| Deployment | `appgdep_6adc722f3ec08191aa0d964b478feac6` | `appgdep_6adc364b751c8191a42a75feade2fa53` |
| Result | succeeded; public audience preserved | succeeded; public archive |

Archive runtime is `f4d05cc7efe20a433a67ef16a170999326b438cef7c7a0eda85ba124e2f73b28`. GitHub and Sites commit metadata are distinct; their trees and runtime identities are recorded explicitly. GitHub returned no statuses or workflow runs for the code head; this is not a CI PASS.

The [proof archive](archive-v0712-proofs.tar.gz) contains 1,455 members, 11,254,091 raw bytes and 1,410,452 compressed bytes. Two deterministic builds match and every member was read back. Archive SHA256 is `2a43c8a26d9a02840effdc7b793a2b2e3095eda108d3488230e025139ed1fc4c`. The [manifest](archive-v0712-proof-manifest.json) and [machine record](archive-v0712-verification.json) retain paths, hashes, scopes and actual terminal results. PR #18 merged as `d1e218259b81e09fb33a2cb65913106a727e2996`, from head `14a2876901feb22f8912cdc0d72d5443bf93253f` and evidence tree `c976c20a8ecba7597dc39163a3f69da49fb99310`. The deployed Sites source predates evidence-only notes; its runtime remains the tested runtime.
