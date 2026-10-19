// Development opens small childhood choices before independent correspondence.
export const CHILD_AGENCY_AGE=3;
export const PERSONAL_CORRESPONDENCE_AGE=6;
export function observationalInfancy(s){return Number.isFinite(s?.age)&&s.age<CHILD_AGENCY_AGE;}
export function personalCorrespondenceAllowed(s){return !Number.isFinite(s?.age)||s.age>=PERSONAL_CORRESPONDENCE_AGE;}
export function infantAgencyReason(s){return observationalInfancy(s)?'For now, you watch the world around you. Your caregivers make the decisions; let time pass to keep growing.':null;}
export function observationalCareEvent(s,event){
  if(!observationalInfancy(s)||event?.id!=='health_concern')return event;
  return {...event,observationVersion:1,choices:[{id:'continue',label:'Continue watching',description:'The adults caring for you arrange rest and comfort while you recover.',owner:'observer'}]};
}
