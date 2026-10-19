# Second Wind: bounded resource experiment

Source baseline: v0.43.0, commit `9e1d7a74916203a7e8946e3120e5c89e6f322751`.

## Decision and scope

Suppress MP recovery only when Second Wind targets its own caster. Keep its 5 MP cost, 8 HP healing, 4 ward, fear cleanse, self-targeting and full 5 MP transfer to another living ally. The same rule applies to companions and retained Bard training under another active calling. Update the shared combat/training description to explain this distinction.

No enemy stats, attributes, gear, traits, calling prerequisites, party size, rewards, maze topology, fog, exploration costs, camp rules, stairs or peaceful routes change.

## Method

Three deterministic balanced characters were generated through the ordinary age-18 life generator. Their opening birthday was resolved, savings earned through actual work, and Bard qualifications/initiation and advanced training completed through offered actions. Second Wind required its actual 12-gold fee and three attended days. Recovery, travel and living costs were paid normally. No attributes, skills, equipment, gold, health or magic were granted for balance runs.

The paired encounter tests clone these earned snapshots. Cohorts are solo; one recruited Orrin (other companions legally placed in reserve); three recruited companions (Mira, Orrin, Kest); and the same party after a genuinely earned Guardian cross-calling. The Guardian setup is not free and is not a same-level build comparison. Each baseline/candidate pair uses exactly the same snapshot and normal enemy opening turns.

Four fixed encounters: road bandits, forest, ruin, covenant guardian. Six fixed policies: attacks; Second Wind when missing at least 8 HP; basic Rallying Verse when missing at least 6 HP; repeated self Second Wind until unavailable; self Second Wind with Defend recovery; and ally-support Second Wind with Orrin's offensive skill. Each probe is bounded at 240 party actions. A resource-exhausted repeated-cast probe stops without declaring victory or defeat. These policies are deliberately simple, not optimal play.

This is a deterministic resource-contract experiment, not a sampled win rate, a whole-dungeon completion study, or proof that all combat is balanced. The command regression fixtures are separate and explicitly synthetic.

## Earned setup

| Seed suffix | Legal traits | Setup days after opening | Level | HP / MP | Gold remaining |
| --- | --- | ---: | ---: | ---: | ---: |
| a | compassionate, curious, brave | 55 | 1 | 62 / 34 | 82 |
| b | patient, diligent, honest | 97 | 2 | 66 / 33 | 68 |
| c | cautious, stoic, content | 41 | 1 | 65 / 31 | 195 |

Full seeds are `balance-earned-bard-a`, `balance-earned-bard-b`, `balance-earned-bard-c`. No gear or potions were added. Gold deltas during training include the fee plus ordinary calendar/living expenses, so the observed action delta is not always exactly 12 gold. Earned setup traces and source snapshots are local reproducibility artifacts, not shipped gameplay assets.

## Findings

- Baseline self-use spends 5 MP then refunds the same 5 MP. Road-bandit repeat probes reach all 240 actions on all three seeds with their initial 34 / 33 / 31 MP intact. Forest repeat probes reach 240 on seeds a and c; b eventually falls at action 106, still with all 33 MP. This is pressure-dependent sustain, not universal invulnerability.
- Candidate self-use pays the full 5 MP. With 34 / 33 / 31 starting MP, six consecutive casts leave 4 / 3 / 1 MP. The next cast is unavailable. Healing, ward and fear cleanse are unchanged per cast.
- Hard covenant-guardian solo repeat probes defeat all three baseline builds at action 6. The candidate does not claim to make these encounters survivable.
- Taking away a refund can change a naive bot's behavior in non-monotonic ways. For example, seed a's heal-at-8-HP-deficit policy stalls into defeat in the baseline ruin, but resource exhaustion forces attacks and wins in the candidate. This is a policy artifact, not evidence that a nerf makes the game globally easier.
- Ally support, attacks and basic Rallying Verse are unchanged by construction. Paired case counts and effective ally casts are recorded in the summary alongside outcomes and remaining resources.

## Preserved tradeoffs and limits

1. Defend still restores 2 MP, draws attacks and reduces incoming damage by 65%. Two self Second Winds and five Defends are MP-neutral over seven personal actions, not two. Low-pressure sustain with deliberate recovery turns is not automatically a defect.
2. Current Bards still have Rallying Verse: cost 4 MP, self refund 3 MP, 6 HP and 4 ward. A Second-Wind-only policy must not be mistaken for the Bard's full tactical repertoire.
3. Two trained allies can still exchange Second Wind at zero party-net MP. A hero with retained Bard training and a stage-five Vesper are a legal example. This remaining two-actor support loop is recorded, not silently removed in this self-only patch.
4. Traits and equipment do not scale Second Wind's fixed healing/refund/ward values. Intellect traits enlarge finite MP reserves; armor and initiative change incoming pressure and turn order. No gear/trait retuning is justified by this experiment alone.
5. These four encounters do not measure procedural tier cliffs, reward economics, equipment acquisition, companion long-run attrition, or ordinary dungeon completion. Those remain separate evidence requirements.

## Regression and save verification

The focused Second Wind suite covers exact-cost explicit/default self casts; ally transfer and caps; zero-MP-pool allies; absent/dead/wrong-side targets; insufficient MP, silence, seals and stale/untrained commands; retained non-Bard training; companion self and ally use; preview purity/deltas; full-health/full-ward self use; Defend and Rallying Verse preservation; depleted-caster JSON reload; and MP-neutral mutual support.

A separate actual-engine check travels from the earned save, starts the offered `forest_expedition`, casts until MP is insufficient, validates each serialized save, checks equivalent next actions after reload, rejects the unaffordable command without advancing resources/turns, retreats and resolves the encounter to another valid save. Travel Focus depletion is retained, not replaced with a refill.

Final targeted command suite: 21 passed, 0 failed. The broader selected run completed 156 tests: 147 passed and 9 failed, all in `tests/rpg-v18.test.js`. Its old setup expects absent roam/faith actions, direct provider access, an old 25–32-place world-size bound, a rebuilding provider and an immediately available bounty battle. None of the failing paths reaches a Second Wind cast. These are classified by their failed step and source dependency; a complete baseline replay was not run, so baseline parity is not claimed. All selected combat, gear, trait, roadmap-v27 and save tests passed. The broader run loaded the earlier 20-test version of the new file; the final 21-test version was rerun separately and passed.

The detailed numeric summary records the exact aggregate failures and the actual save check. The offline package must be regenerated through the normal build during release integration; this source-only commit intentionally does not hand-edit generated offline parts.

## Reproduction

1. Run `node scripts/experiment-second-wind.mjs earn` to regenerate the three earned snapshots. Ordinary state transitions assert input immutability, save validity and nonnegative gold.
2. Against the baseline combat module graph, run `node scripts/experiment-second-wind.mjs baseline`. To compare from this candidate checkout without mutating its source, copy `dist/js` to a temporary directory, replace only `techniques-v27.js` with its baseline version from the commit above, then point `SECOND_WIND_COMBAT_MODULE` at that temporary graph's `combat.js` file URL.
3. In this candidate checkout, run `node scripts/experiment-second-wind.mjs candidate` and `node scripts/experiment-second-wind.mjs verify-save`.
4. Run `node --test tests/second-wind-balance.test.js` and the focused commands recorded in the summary.

Machine-readable runs are written under the ignored `artifacts/balance-second-wind/` directory. The checked-in summary retains compact evidence rather than generated full-life saves.
