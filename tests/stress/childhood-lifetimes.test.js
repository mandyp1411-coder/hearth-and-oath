import test from 'node:test';
import {checkPublicChildhoods} from '../helpers/childhood-cohort.mjs';

// Reviewed stress tier: every original seed, birthday fork, validation and
// cross-cohort variety assertion is retained. No failure is waived.
test('twelve public-engine childhoods can reach adulthood with all three decision forks validated',()=>{
  checkPublicChildhoods(Array.from({length:12},(_,n)=>n));
});
