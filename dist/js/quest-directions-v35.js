import { activeJournalQuests } from './journal-ui-v30.js';
import { markSiteKnowledge } from './cartography.js';

/** Accepted requests carry directions. Offers and read-only map views reveal nothing. */
export function learnQuestDirections(s){
 if(!s.cartography)return;
 for(const q of activeJournalQuests(s))if(q.locationId&&!s.cartography.sites[q.locationId])markSiteKnowledge(s,q.locationId,'Rumored',('Directions: '+q.title).slice(0,240));
}
