/** Coordinate the generic patrol with an already saved local hearing. This
 * changes no evidence, deadline, case or calendar merely by checking it. */
export function localLawWindow(s){
  const data=s.sanctuaries,c=data?.cases.find(c=>c.locationId===s.locationId&&c.status!=='resolved');
  if(!c)return {hold:false};
  if(data.commitment?.refId===c.id&&data.commitment.kind.startsWith('legal_'))return {hold:true,caseId:c.id};
  if(['fugitive','deferred'].includes(c.status)&&c.returnDay!==null){
    if(s.day>=c.returnDay)return {hold:true,caseId:c.id}; // the local return/capture scene owns this transition
    const current=s.legal?.incidents?.find(i=>i.locationId===c.locationId)?.evidence||0;
    // A genuine older case has no count captured at the promise. Do not infer
    // a new charge merely from that absence. onEvidence captures a baseline
    // before appending the first actual new report to such a case.
    if(c.protectedEvidence===undefined||current<=c.protectedEvidence)return {hold:true,caseId:c.id};
    return {hold:false,caseId:c.id,independent:true,returnDay:c.returnDay,source:c.sources.at(-1)?.description||c.description};
  }
  const queued=[data.pending,...data.queue].some(q=>q?.refId===c.id&&['sanctuary_case_hearing','sanctuary_case_capture'].includes(q.eventId));
  return {hold:queued&&['hearing','captured'].includes(c.status),caseId:c.id};
}
