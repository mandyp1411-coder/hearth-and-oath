# The archive, checked in a browser (v0.70)

32 of 32 steps passed. Headless Chromium, the main game served from `dist/` and the archive from `out-legacy/` on two ports (two origins, as published); the offline files opened from disk.

| Step | Result | Seen |
|---|---|---|
| main game opens at its own origin | pass | http://127.0.0.1:42913/ |
| archive opens at its own origin and names itself | pass | http://127.0.0.1:43217/ |
| import review in the main game labels the old-rules life | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.  Old rules  This life was written under t |
| the slot says Old rules | pass | [('old', 'Old rules')] |
| the slot carries the way to the archive, in the game’s voice | pass | This life was written under the old rules. It plays on here for now; the archive keeps those rules for good, and a life exported from here opens there.  Export  |
| the export is named for its rules and carries the stamp | pass | hearth-and-oath-Vesper-Hearthkeeper-old-rules.json edition={'rules': 'old', 'began': None, 'step': 71} |
| the archive’s import review labels the life Old rules | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.   |
| the archive loads the life | pass |  |
| the life plays on in the archive | pass | errors=[] |
| the archive’s slot says Old rules | pass | [('old', 'Old rules')] |
| the archive’s export is named for the archive | pass | hearth-and-oath-Vesper-Hearthkeeper-old-rules-archive.json |
| a life played in the archive opens in the main game again | pass | errors=[] |
| a v0.69 new-rules save is labelled "New rules, begun before v0.70" | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Tamsin Reed · Age 18 · release-save-0.69.0.  New rul |
| the new-rules export is named for its rules | pass | hearth-and-oath-Tamsin-Reed-new-rules.json |
| the archive turns the new-rules life away in a line | pass | This life lives by the new rules. It belongs in the main game; open it there. |
| a life begins in the archive | pass |  |
| a life begun in the archive is labelled New rules, begun in v0.69 | pass | [('old', 'Old rules'), ('new', 'New rules, begun in v0.69')] |
| the main game takes a life begun in the archive and keeps its date | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Drova kin Kavdrukh · Age 18 · thorn-hearth-1c72f8b5. |
| the main game keeps its saves in hearth-and-oath | pass | {"dbs": ["hearth-and-oath"], "keys": []} |
| the archive keeps its saves in hearth-and-oath-legacy and nowhere else | pass | {"dbs": ["hearth-and-oath-legacy"], "keys": []} |
| rehearsed cutover: the title counts the lives kept for the archive | pass | Saved lives 3 of 3 slots occupied · 2 kept for the archive → |
| rehearsed cutover: the old slot is kept, not opened | pass | 01 Vesper Hearthkeeper Age 18 · The Morrow Reach Mossbell Old rules KEPT FOR THE ARCHIVE |
| rehearsed cutover: the kept slot exports exactly what it held | pass | rehearsed-hearth-and-oath-Vesper-Hearthkeeper-old-rules.json |
| rehearsed cutover: the archive takes the kept life and opens it | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v |
| rehearsed cutover: an old file meets the archive’s door, with no slot offered | pass | This life lives by the old rules. It belongs in the archive; open it there. Nothing here was changed. |
| rehearsed cutover: no page errors | pass | [] |
| main offline file opens from disk | pass | 318 MB |
| main offline file labels an imported old-rules life | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.   |
| main offline file loads the imported life | pass | errors=[] |
| archive offline file opens from disk | pass | 318 MB |
| archive offline file labels an imported old-rules life | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.   |
| archive offline file loads the imported life | pass | errors=[] |

Page errors: none.
