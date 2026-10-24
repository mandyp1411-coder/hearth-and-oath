# Farmer session materials: preparation checks

Human playtest: **NOT RUN**. These checks prepare the published v0.71.0
candidate for people; they do not satisfy the Bible's gate or certify the
full software release gate.

## Two genuine starts

Both files are untouched output from production `createLifeAtAge`, with
normal current-creator inputs and naturally rolled stations. Their earlier
years were generated through actual engine commands. No station, money,
people, field, age or history was edited into a save.

| Start | Actual opening | Preserved state |
| --- | --- | --- |
| `common-freeholder-age16.json` | Isven Terassi, common/freeholder, Stormbay | Age 16, day 5840, 43 gold; birthday pending, no chosen ambition, promise, plan or harvest |
| `bound-tenant-age16.json` | Marei Laveno, bound/tenant, Tide Light; field at The Beacon Cistern Arch | Age 16, day 5840, 8 gold; birthday pending, no chosen ambition, promise, plan or harvest |

The tenant's generated childhood ends away from the field. Its actual
address remains intact; the farmer Day is available there. The player
retains the normal choices about what happens next.

Independent checks on both committed copies passed full `validateSave`,
whole-state exact `migrateSave` round trips, byte counts and SHA-256 checks.
Disposable diagnostic clones answer only the real opening birthday and
reach an unanswered `farm_ambition` without advancing the day. Those clones
are not the delivered files.

The [starter manifest](starter-manifest.json) retains generation inputs,
full hashes, actual locations, diagnostic commands and the two corrected
harness assumptions. Three bounded creation calls were made, including one
unretained call. The [Day proof](starter-day-surface-proof.json) records the
actual pure read models and public birthday commands. No simulated person
or questionnaire response appears in either report.

## Live import

Real cloud Chrome opened the published Sites version 104, chose **Import a
saved life**, selected the freeholder JSON, reviewed the three empty slots,
and imported into slot 1. The game displayed Isven Terassi, age 16,
Stormbay, 43 gold and the untouched opening birthday. Its normal Life,
Today and Book controls remained available. [Screenshot](imported-start.jpg).

The tenant has the exact engine/import checks above; a separate live-browser
tenant import was **NOT RUN**. These observations are setup checks, not a
real player session or a whole-browser accessibility assessment.

The opening birthday still displays the existing generic choice caption
“Choose this action.” This belongs to the known repository voice debt; it
is visible in the screenshot and is not claimed repaired by this kit.
Record its effect on real players rather than treating these materials as
evidence that every first-screen caption is finished.

## Player bundle and observer materials

The [player ZIP](farmer-starts.zip) contains only the short player guide and
the two JSON starts. It excludes the observer questions and criteria.
Its three members were extracted and compared byte-for-byte with the source
files, and ZIP integrity passed.

Bundle: 207,351 bytes, SHA-256
`88fba1c7378f05f82a58ce67f8bc3033657b05ecdeb9333d61721b11765d9423`.

The observer has separate blank session and aggregate forms. Initial recall
comes before follow-up questions; owner and new-player results stay separate.
Unfinished lives and absent heirs remain visible, with no forced ending or
child. The heir record captures age, time played, Book opening and first
meaningful decision rather than counting a succession click as a chapter.

The game runtime is unchanged from the published candidate: 1,052 files,
SHA-256 `43559063337c7bc243bc152ad153d672a9c933d61d85a494f17d3f46bddfa311`.
No engine, UI, content, build, test or checker source changed. The existing
3,939 selected assertions, five skips and formal-gate limitations remain
the earlier software evidence; they are not a new run for these materials.
No new game version or production deployment is required for this kit.
