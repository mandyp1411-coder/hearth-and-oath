# Hearth & Oath prototype contract

Buildless, dependency-free browser game. Files served from dist. JavaScript ES modules.

## Simulation API (dist/js/engine.js)

- createGame(config): config includes name, origin ('village'/'city'), household ('poor'/'tradesfolk'/'noble'), path ('warrior'/'mage'/'rogue'), seed string, appearance object, ambition string.
- getActions(state): array of {id,label,description,days,cost,group,disabledReason?}. Only applicable actions; disabledReason indicates unavailability.
- chooseAction(state,id), chooseEventOption(state,id), travelTo(state,locationId), recruitCompanion(state,id), toggleCompanion(state,id): return updated state, never throw on invalid gameplay action.
- resolveBattle(state,battle): apply completed combat outcome once and clear battle.
- validateSave(value): boolean with meaningful structural checks.
- All state-changing APIs return an independent state (structuredClone).

State fields: version:1; seed; phase ('childhood'/'adult'/'retired'); day (adult days elapsed); age; hero:{name,origin,household,path,specialization:null/string,profession:string,appearance,ambition,level,exp,hp,maxHp,mp,maxMp,gold,attributes:{strength,agility,vitality,intellect,willpower,presence},skills:{weapons,defense,arcana,devotion,stealth,survival,scholarship,persuasion},condition:null/{type:'vampire',hunger:number},potions:number}; locationId; world:{name,crisis,locations:[{id,name,type,description,travelDays,safety,necromancyLaw}],laws:string}; companions:[{id,name,role,goal,values,relationship,memories:[],recruited:boolean,active:boolean,hp,maxHp,mp,maxMp,agility}]; factions:{villagers,academy,order,underworld}; legal:{wanted:boolean,evidence:number,description:string}; flags:{}; obligations:[{id,title,dueDay,description,resolved:boolean}]; event:null/{id,title,category,body,choices:[{id,label,description}]}; journal:[{id,day,age,title,text,tag}]; battle:null/object; notice:string; chronicle:null/string.

Initial childhood event immediately active. Three meaningful milestone episodes then adulthood at 18. Specific persistent facts cause followups. Time/resources visible on actions. Combat begins by chooseAction setting battle. Engine may import createBattle from combat.js. Local world contains city, two villages, forest, ruin; seeded world connects all class routes. Every advertised advanced route can be earned.

## Combat API (dist/js/combat.js)

- createBattle(game,encounterId): accepts 'forest', 'ruin', 'initiation'; returns battle.
- getBattleActions(battle): [{id,label,description,cost,needsTarget,disabledReason?}].
- takeBattleAction(battle,actionId,targetId?): returns independent updated battle, processes enemy turns until next living party actor.

Battle:{encounterId,title,actors:[{id,name,side:'party'/'enemy',role,hp,maxHp,mp,maxMp,agility,defending,status}],turnOrder:[id],currentActorId,round,log:[string],potions,outcome:null/'victory'/'defeat'/'retreat',rewards:{gold,exp},potionsUsed:number}. Player controls all party actors. Active recruited companions included, maximum three. Only living actors can take turns or targets. Defense, path-specific skills, consumables, clear retreat and nonlethal defeat. No window/DOM dependency, deterministic.

## Interface ownership

UI agent owns dist/index.html and dist/styles.css only. Root owns dist/js/app.js. Layout HTML has #app as the main app mounting node, optional global header/footer included in app. stylesheet should cover classes described in agent instructions. No inline application JS. index references /styles.css and /js/app.js as module with relative paths.
