# The archive, checked in a browser (v0.70)

26 of 26 steps passed. Headless Chromium, the main game served from `dist/` and the archive from `out-legacy/` on two ports (two origins, as published); the offline files opened from disk.

| Step | Result | Seen |
|---|---|---|
| main game opens at its own origin | pass | http://127.0.0.1:57819/ |
| archive opens at its own origin and names itself | pass | http://127.0.0.1:48967/ |
| import review in the main game labels the old-rules life | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.  Old rules This life was written under th |
| the slot says Old rules | pass | [('old', 'Old rules')] |
| the slot carries the way to the archive, in the game’s voice | pass | This life was written under the old rules. It plays on here for now; the archive keeps those rules for good, and a life exported from here opens there.  Export  |
| the export is named for its rules and carries the stamp | pass | hearth-and-oath-Vesper-Hearthkeeper-old-rules.json edition={'rules': 'old', 'began': None, 'step': 70} |
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
| the main game takes a life begun in the archive and keeps its date | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Demerio Cavesta · Age 18 · thorn-grove-f8b02100.  Ne |
| the main game keeps its saves in hearth-and-oath | pass | {"dbs": ["hearth-and-oath"], "keys": []} |
| the archive keeps its saves in hearth-and-oath-legacy and nowhere else | pass | {"dbs": ["hearth-and-oath-legacy"], "keys": []} |
| main offline file opens from disk | pass | 318 MB |
| main offline file labels an imported old-rules life | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.   |
| main offline file loads the imported life | pass | errors=[] |
| archive offline file opens from disk | pass | 318 MB |
| archive offline file labels an imported old-rules life | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.   |
| archive offline file loads the imported life | pass | errors=[] |

Page errors: none.
