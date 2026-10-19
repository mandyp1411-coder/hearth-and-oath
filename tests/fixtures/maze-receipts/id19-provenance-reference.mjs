// Explicit identity for new story content. The numeric archive ID alone is not
// a run identity, especially across generations. This leaf has no state effects.
export const mazeActorId = s => s.dynasty?.activePersonId || 'hero';
export const validMazeActor = (s,id) => typeof id==='string' && id.length>0 && id.length<=160
  && (id===mazeActorId(s)||(s.dynasty?.history||[]).some(row=>row.personId===id)||(s.lineage?.people||[]).some(row=>row.id===id));
export function mazeRunIdentity(m) {
  return {mazeId:m.id,runSeed:m.seed,runGeneration:m.generation,
    manifestVersion:1,family:m.content.family,sourceId:m.sourceId,locationId:m.locationId};
}
export function sameMazeRun(value,m) {
  return !!value && Object.entries(mazeRunIdentity(m)).every(([key,v])=>value[key]===v);
}
