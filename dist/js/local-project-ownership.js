/** Pure ownership selectors. Saved offers/plans and suspended cards are not work. */
export function countingTableCommitment(state) {
  const run=state?.justice?.countingTableJob;
  if(run?.status!=='active'||!['approach','departure'].includes(run.stage))return null;
  const phase=run.attempt?.[run.stage];
  return phase?.commitment&&phase.completedDay===null?{run,phase}:null;
}
export const localTournamentLocked=state=>['preparing','ready','bout'].includes(state?.adultTournament?.stage);
export const localWorkLocked=state=>Boolean(countingTableCommitment(state)||localTournamentLocked(state));
