export const EDUCATION_ROUTES = ['community','shrine','academy','apprenticeship'];
export const EDUCATION_LABELS = {community:'Community school',shrine:'Shrine school',academy:'Academy studies',apprenticeship:'Craft apprenticeship'};
const fields=['year','attendance','progress','performance'];
const currentCourse=e=>Object.fromEntries(fields.map(k=>[k,e[k]]));
export function ensureCourseBook(s) {
  const e=s.education;
  if(!e.courseBook)e.courseBook={version:1,introducedDay:s.day,termAge:e.lastAge,priorAttendance:e.attendanceThisYear,priorCourse:e.route,attendance:{},paused:{}};
  return e.courseBook;
}
export function courseTransferDetails(e,route) {
  const returning=e.courseBook?.paused?.[route];
  return {from:e.route,to:route,current:e.route?currentCourse(e):null,returning:!!returning,prepared:returning?Object.fromEntries(fields.map(k=>[k,returning[k]])):{year:1,attendance:0,progress:0,performance:50},annualLessons:e.lessonsThisYear,annualRevisions:e.preparationsThisYear,examinedYear:e.examinedYear};
}
export function activateCourse(s,route) {
  const e=s.education,book=ensureCourseBook(s),q=courseTransferDetails(e,route);
  if(e.route&&e.route!==route)book.paused[e.route]={...currentCourse(e),pausedDay:s.day};
  delete book.paused[route];
  Object.assign(e,q.prepared,{route,schoolId:`school-${route}`,enrolled:true});
  // Annual attendance, revision and examination limits belong to the pupil,
  // across all routes. Transfer never refreshes them or creates another lesson.
  return q;
}
export function recordCourseAttendance(s) {
  const b=ensureCourseBook(s),route=s.education.route;
  b.attendance[route]=(b.attendance[route] || 0)+1;
}
export function courseYearSummary(s,nameForRoute=route=>EDUCATION_LABELS[route]) {
  const e=s.education,b=e.courseBook;
  if(!b)return `${EDUCATION_LABELS[e.route]}: ${e.attendanceThisYear} attended sessions this year.`;
  const rows=Object.entries(b.attendance).filter(([,n])=>n>0).map(([route,n])=>`${n} at ${nameForRoute(route)}`);
  if(b.priorAttendance)rows.push(`${b.priorAttendance} recorded before the course ledger opened (route attribution unrecorded)`);
  return `${e.attendanceThisYear} attended sessions this year${rows.length?`: ${rows.join('; ')}`:'. No sessions were attended'}.`;
}
export function openCourseYear(s) {
  const b=ensureCourseBook(s);b.termAge=s.age;b.priorAttendance=0;b.priorCourse=s.education.route;b.attendance={};
}
export function courseRecords(s) {
  const e=s.education;if(!e)return [];
  return EDUCATION_ROUTES.flatMap(route=>{
    const active=e.route===route,record=active?currentCourse(e):e.courseBook?.paused?.[route];
    return record?[{route,label:EDUCATION_LABELS[route],...record,active,qualified:e.qualifications.some(q=>q.route===route)}]:[];
  });
}
export function validateCourseBook(e,s) {
  const b=e.courseBook;if(b===undefined)return true;
  const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
  if(!obj(b)||b.version!==1||!int(b.introducedDay)||s&&b.introducedDay>s.day||!int(b.termAge,300)||b.termAge!==e.lastAge||!int(b.priorAttendance,8)||!(b.priorCourse===null||EDUCATION_ROUTES.includes(b.priorCourse))||!obj(b.attendance)||!obj(b.paused)||Object.keys(b.paused).length>3)return false;
  if(!Object.entries(b.attendance).every(([route,n])=>EDUCATION_ROUTES.includes(route)&&int(n,8))||b.priorAttendance+Object.values(b.attendance).reduce((n,v)=>n+v,0)!==e.attendanceThisYear)return false;
  return Object.entries(b.paused).every(([route,r])=>EDUCATION_ROUTES.includes(route)&&route!==e.route&&obj(r)&&fields.every(k=>int(r[k],k==='performance'?100:Number.MAX_SAFE_INTEGER))&&int(r.pausedDay)&&r.pausedDay>=b.introducedDay&&(!s||r.pausedDay<=s.day));
}
