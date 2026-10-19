// Cure, hunger and moon tests assume a prior rare meeting. Discovery and its
// incidence are tested separately in features-v25; ordinary menus offer none.
export function knownCurseMeeting(state,id) {
  if(!['vampire_invitation','lycan_invitation'].includes(id))return state;
  const next=structuredClone(state);
  next.nightEncounters ||= {lastWeek:Math.floor(next.day/7),pending:null,day:next.day};
  next.nightEncounters[id==='vampire_invitation'?'patronMet':'rangerMet']=true;
  return next;
}
