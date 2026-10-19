import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import * as combat from '../dist/js/combat.js';
import {ordinaryGame,goldenSnapshot} from './helpers/tournament-golden-fixture.mjs';
const fixture=JSON.parse(readFileSync(new URL('./fixtures/tournament-ordinary-golden.json',import.meta.url)));
test('ordinary battle, action, preview and five-command serialized sequences retain exact 99e19bd golden hashes',()=>{for(const [key,hash]of Object.entries(fixture.hashes)){const [kind,difficulty,encounter]=key.split(':'),actual=goldenSnapshot(combat,ordinaryGame(kind,difficulty),encounter);assert.equal(createHash('sha256').update(actual).digest('hex'),hash,key);}});
