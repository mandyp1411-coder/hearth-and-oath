export const STARTING_ATTRIBUTES=['strength','agility','vitality','intellect','willpower','presence'];
export const ATTRIBUTE_LABELS={strength:'Strength',agility:'Agility',vitality:'Vitality',intellect:'Intellect',willpower:'Willpower',presence:'Presence'};
export function attributePointBudget(age=0){return Math.min(18,Math.floor(Math.max(0,Math.min(80,Number(age)||0))/3));}
export function normalizeAttributePoints(value,age=0){
 let remaining=attributePointBudget(age);const points={};
 for(const key of STARTING_ATTRIBUTES){const n=Number(value?.[key]);points[key]=Number.isSafeInteger(n)?Math.max(0,Math.min(6,remaining,n)):0;remaining-=points[key];}
 return points;
}
export function attributePointsSpent(points){return STARTING_ATTRIBUTES.reduce((sum,key)=>sum+(points?.[key]||0),0);}
/** Only new lives draw unspent points. Loading a recorded life never rerolls it. */
export function completeAttributePoints(value,age,seed){
 const points=normalizeAttributePoints(value,age),remaining=attributePointBudget(age)-attributePointsSpent(points);
 for(let i=0;i<remaining;i++){const eligible=STARTING_ATTRIBUTES.filter(key=>points[key]<6);if(!eligible.length)break;points[eligible[seededRoll(seed,`creation:unspent:${age}:${i}`,eligible.length)]]++;}
 return points;
}
export function applyStartingAttributes(state,points,age=state.age){
 if(state.hero.startingAttributes)return false;
 const selected=normalizeAttributePoints(points,age);
 for(const key of STARTING_ATTRIBUTES)state.hero.attributes[key]+=selected[key];
 state.hero.maxHp+=selected.vitality*3;state.hero.hp=Math.min(state.hero.maxHp,state.hero.hp+selected.vitality*3);
 state.hero.maxMp+=selected.intellect*3;state.hero.mp=Math.min(state.hero.maxMp,state.hero.mp+selected.intellect*3);
 state.hero.startingAttributes={version:1,age,points:selected};return true;
}
export function validateStartingAttributes(value,state){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||!Number.isInteger(value.age)||value.age<0||value.age>80||value.age>state.age)return false;
 if(!value.points||typeof value.points!=='object'||Array.isArray(value.points)||Object.keys(value.points).length!==6)return false;
 return STARTING_ATTRIBUTES.every(key=>Number.isSafeInteger(value.points[key])&&value.points[key]>=0&&value.points[key]<=6)&&attributePointsSpent(value.points)<=attributePointBudget(value.age);
}
import { seededRoll } from './world.js';
