import assert from 'node:assert/strict';
import {freshStory} from './story-life-fixtures.mjs';
import {validateSave,migrateSave} from '../../dist/js/engine.js';
/** Controlled legal adult decision for competing save branches. Infants retain
 * their sole observation control; this fixture does not claim an earned birthday. */
export function decisionLife(){
 const s=freshStory();s.event={id:'life_birthday',title:'A current birthday decision',category:'Life',body:'Choose how to spend this birthday.',choices:[{id:'calling',label:'Work',description:'Take stock of your work.'},{id:'people',label:'People',description:'Spend the day with people.'},{id:'self',label:'Self',description:'Keep a quiet day.'}]};
 assert.ok(validateSave(s));assert.deepEqual(migrateSave(s),s);return s;
}
