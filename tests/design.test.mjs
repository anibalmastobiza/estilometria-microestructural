import test from 'node:test';import assert from 'node:assert/strict';
import {STIMULI,renderText,schedule,mulberry32} from '../docs/stimuli.js';
test('Las versiones conservan todas las palabras y su orden',()=>{
 for(const s of STIMULI){const words=t=>t.toLocaleLowerCase('es').match(/\p{L}+/gu);assert.deepEqual(words(renderText(s,true)),words(renderText(s,false)));assert.equal((renderText(s,true).match(/\./g)||[]).length,5);assert.equal((renderText(s,false).match(/;/g)||[]).length,4);}
});
test('Cada lista contiene las cuatro condiciones, sin repetir ítems',()=>{
 for(let bank=0;bank<2;bank++)for(let list=0;list<4;list++){const s=schedule(list,bank,mulberry32(42));assert.equal(new Set(s.map(x=>`${x.segmented}${x.interrupted}`)).size,4);assert.equal(new Set(s.map(x=>x.item.id)).size,4);}
});
test('Cada ítem pasa por todas las condiciones entre las cuatro listas',()=>{
 for(let bank=0;bank<2;bank++)for(const item of STIMULI.slice(bank*4,bank*4+4)){const cells=new Set();for(let list=0;list<4;list++){const x=schedule(list,bank).find(x=>x.item.id===item.id);cells.add(`${x.segmented}${x.interrupted}`);}assert.equal(cells.size,4);}
});
test('Duración máxima de los cuatro ensayos = 132 s',()=>{assert.equal(4*(22000+9000)+2*4000,132000);});
