// Every system has one shelf, and each shelf shows one subject at a time.
export const WORKSPACE_SECTIONS = {
 life:[['present','Today'],['plans','Plans & calendar'],['years','Your Years']],
 character:[['overview','Identity'],['training','Skills & training'],['personality','Personality & tastes'],['callings','Callings'],['condition','Supernatural']],

 journal:[['active','Active Quests'],['archive','Archive'],['notes','Notes']],
};
export function workspaceSection(route,value) {const rows=WORKSPACE_SECTIONS[route];return rows?.some(([id])=>id===value)?value:rows?.[0]?.[0]||null;}
export function selectSection(ui,sections) {
 const entries=Object.entries(sections);if(!ui.section)return entries.map(([,content])=>content).join('');
 return sections[ui.section]??entries[0]?.[1]??'';
}
export function renderWorkspaceNavigation(route,selected,ui) {
 const rows=WORKSPACE_SECTIONS[route];if(!rows)return '';
 const active=workspaceSection(route,selected);
 return `<nav class="workspace-sections" aria-label="${ui.e(route==='relationships'?'People':route)} sections">${rows.map(([id,label])=>ui.button(ui.e(label),'workspace-section',route+':'+id,`ghost ${active===id?'active':''}`,false,active===id)).join('')}</nav>`;
}
