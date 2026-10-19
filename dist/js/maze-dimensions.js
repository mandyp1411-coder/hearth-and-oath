import { seededRoll } from './world.js';

// Historical runs have no layout metadata and always retain their 11x11 map.
export function newMazeDimensions(m){
 const size=[5,7,11][seededRoll(m.seed,'expedition-length-v1',3)];
 return {layoutVersion:1,layoutSize:size};
}
export function mazeDimensions(m){
 const size=m?.layoutVersion===1&&[5,7,11].includes(m.layoutSize)?m.layoutSize:11;
 return {size,count:size*size};
}
export function validMazeDimensions(m){
 if(m.layoutVersion===undefined)return m.layoutSize===undefined;
 const expected=newMazeDimensions(m);
 return m.version===1&&['radiant','contract'].includes(m.kind)&&m.layoutVersion===1&&m.layoutSize===expected.layoutSize;
}
