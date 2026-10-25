# The archive, checked in a browser (main 0.72.1 at 6b29e6d)

28 of 28 steps passed. Headless Chromium, the main game served from `dist/` and the archive from `out-legacy/` on two ports (two origins, as published); the offline files opened from disk.

| Step | Result | Seen |
|---|---|---|
| main game opens at its own origin | pass | http://127.0.0.1:48999/ |
| archive opens at its own origin and names itself | pass | http://127.0.0.1:37927/ |
| main: an old-rules file meets the archive’s door, with no slot offered | pass | This life lives by the old rules. It belongs in the archive; open it there. Nothing here was changed. |
| main: the door links to the public archive | pass | https://hearth-and-oath-old-rules.nilled463.chatgpt.site |
| archive: the import review labels the life Old rules | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Vesper Hearthkeeper · Age 18 · v5-dynasty-fixture.   |
| archive: the old life plays on | pass | errors=[] |
| archive: its export is named for the archive | pass | hearth-and-oath-Vesper-Hearthkeeper-old-rules-archive.json |
| main: a life played in the archive meets the door, not a slot | pass |  |
| main: a v0.69 new-rules save is labelled "New rules, begun before v0.70" | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Tamsin Reed · Age 18 · release-save-0.69.0.  New rul |
| main: the new-rules life plays | pass | errors=[] |
| main: the new-rules export is named for its rules | pass | hearth-and-oath-Tamsin-Reed-new-rules.json |
| archive: turns the new-rules life away in a line | pass | This life lives by the new rules. It belongs in the main game; open it there. |
| archive: a life begun there is labelled New rules, begun in v0.69 | pass | [('old', 'Old rules'), ('new', 'New rules, begun in v0.69')] |
| main: takes a life begun in the archive and keeps its date | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Mardella Mavrell · Age 18 · thorn-fen-3548ee6e.  New |
| main keeps its saves in hearth-and-oath | pass | {"dbs": ["hearth-and-oath"], "keys": []} |
| the archive keeps its saves in hearth-and-oath-legacy and nowhere else | pass | {"dbs": ["hearth-and-oath-legacy"], "keys": []} |
| returning: the title continues the new-rules life and counts the kept one | pass | Saved lives 2 of 3 slots occupied · 1 kept for the archive → |
| returning: the old slot is kept, not opened | pass | 01 Tamsin Reed Age 18 Wetgardenlanding Old rules KEPT FOR THE ARCHIVE |
| returning: the kept life exports exactly as stored, named for its rules | pass | returning-hearth-and-oath-Tamsin-Reed-old-rules.json |
| archive: takes the returning player’s kept life and opens it | pass | × REVIEW AN IMPORTED LIFE Choose where this life belongs  Incoming: Tamsin Reed · Age 18 · release-s |
| returning: no page errors | pass | [] |
| single save: the title shows the old life kept, with nothing to continue | pass | Kept for the archive Tamsin Reed Age 18 · Slot 1 Old rules Wetgardenlanding  This life was written under the old rules,  |
| single save: it is kept in the first slot, not opened | pass | 01 Tamsin Reed Age 18 Wetgardenlanding Old rules KEPT FOR THE ARCHIVE |
| single save: it exports exactly as stored | pass | single-hearth-and-oath-Tamsin-Reed-old-rules.json |
| single save: no page errors | pass | [] |
| main offline file: an old-rules file meets the door | pass | errors=[] |
| main offline file: a new-rules file is reviewed and loads | pass | 318 MB; errors=[] |
| archive offline file: an old-rules file is reviewed and loads | pass | 318 MB; errors=[] |

Page errors: none.
