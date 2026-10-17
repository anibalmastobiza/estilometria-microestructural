import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {schedule,mulberry32} from '../docs/stimuli.js';
const src=fs.readFileSync(new URL('../backend/Code.gs',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(src,ctx);
function packet(){return {mode:'live',consent_accepted:true,session_id:'00000000-0000-4000-8000-000000000000',protocol_version:'EME-INT-1.0.0',consent_version:'EME-CI-1.0.0',camera_consent:false,list_id:0,bank_id:0,elapsed_ms:150000,consent_elapsed_ms:20000,task_start_ms:35000,age_band:'30-44',spanish_level:'native',education:'',reading_frequency:'',gender:'',gaze_status:'declined',validation:[],viewport:{width:1200,height:800,dpr:1},quality:{hidden:0,resize:0},trials:schedule(0,0,mulberry32(1)).map((x,order)=>({item_id:x.item.id,order,segmented:Number(x.segmented),interrupted:Number(x.interrupted),response:x.item.answer,correct:0,timed_out:false,reading_active_ms:12000,reading_wall_ms:x.interrupted?16000:12000,interruption_actual_ms:x.interrupted?4000:0,question_rt_ms:2000,interrupt_rt_ms:x.interrupted?1000:null,interrupt_correct:x.interrupted?true:null,gaze_return_ms:null,gaze_n:0,gaze_inside:0,gaze_post_n:0,gaze_post_inside:0,aoi:{x:300,y:200,w:600,h:300}}))};}
test('Acepta sesión íntegra y recalcula aciertos en servidor',()=>{const row=ctx.validate_(packet());assert.equal(row.length,17);assert.ok(JSON.parse(row[16]).every(t=>t.correct===1));});
test('Rechaza demo, falta de consentimiento, inyección y falsos datos de cámara',()=>{for(const mutate of [p=>p.mode='demo',p=>p.consent_accepted=false,p=>p.age_band='=IMPORTXML("bad")',p=>p.trials[0].gaze_n=1,p=>p.trials[0].segmented=1-p.trials[0].segmented,p=>p.trials.pop(),p=>p.gaze_status='valid']){const p=packet();mutate(p);assert.throws(()=>ctx.validate_(p));}});
test('No guarda campos inesperados ni coordenadas crudas',()=>{const p=packet();p.secret='unexpected';p.raw_gaze=[{x:1}];const text=JSON.stringify(ctx.validate_(p));assert.ok(!text.includes('unexpected'));assert.ok(!text.includes('raw_gaze'));});
test('Omisión queda null y no se convierte en un acierto/error observado',()=>{const p=packet();p.trials[0].response=null;assert.equal(JSON.parse(ctx.validate_(p)[16])[0].correct,null);});
test('Reintento idempotente: una sola fila por sesión',()=>{
 const rows=[vm.runInContext('HEADERS',ctx)],props=new Map([['COLLECTION_OPEN','true'],['SHEET_ID','test']]);
 const sheet={getLastRow:()=>rows.length,getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(row=>row.slice(c-1,c-1+w)),setValues:v=>{rows[r-1]=v[0];},createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>rows.slice(1).some(row=>row[1]===id)})})})};
 ctx.PropertiesService={getScriptProperties:()=>({getProperty:k=>props.get(k),setProperty:(k,v)=>props.set(k,v)})};ctx.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};ctx.SpreadsheetApp={openById:()=>({getSheetByName:()=>sheet}),flush(){}};
 assert.equal(ctx.saveSession(packet()).ok,true);assert.equal(ctx.saveSession(packet()).duplicate,true);assert.equal(rows.length,2);
 const modern=trajectoryPacket();modern.session_id='10000000-0000-4000-8000-000000000000';
 assert.equal(ctx.saveSession(modern).ok,true);assert.equal(ctx.saveSession(modern).duplicate,true);assert.equal(rows.length,3);
 assert.deepEqual(JSON.parse(rows[2][16]).map(t=>t.gaze_path),modern.trials.map(t=>t.gaze_path));
 const simplified=trajectoryPacket('EME-INT-1.2.0');simplified.session_id='20000000-0000-4000-8000-000000000000';simplified.gaze_status='invalid';simplified.validation[0].in_roi=.2;
 assert.equal(ctx.saveSession(simplified).ok,true);assert.equal(ctx.saveSession(simplified).duplicate,true);assert.equal(rows.length,4);
 assert.equal(rows[3][12],'invalid');assert.deepEqual(JSON.parse(rows[3][16]).map(t=>t.gaze_path),simplified.trials.map(t=>t.gaze_path));
});
function trajectoryPacket(protocol='EME-INT-1.1.0'){
 const p=packet();Object.assign(p,{protocol_version:protocol,consent_version:'EME-CI-1.1.0',camera_consent:true,gaze_status:'valid'});
 p.validation=[[300,240],[900,240],[600,400],[300,560],[900,560]].map(([x,y])=>({x,y,n:8,in_roi:.75,mean_error_px:50,samples_per_sec:8}));
 for(const t of p.trials)Object.assign(t,{interruption_start_ms:t.interrupted?7000:null,interruption_end_ms:t.interrupted?11000:null,gaze_path:[[0,300,200],[100,350,250],[11900,1300,-50]],gaze_n:3,gaze_inside:2,gaze_post_n:t.interrupted?1:0,gaze_post_inside:0});
 return p;
}
test('Protocolo 1.1 conserva trayectorias y offsets sin redondear ni alterar el paquete',()=>{
 const p=trajectoryPacket(),before=JSON.stringify(p),row=ctx.validate_(p),trials=JSON.parse(row[16]);
 assert.equal(row.length,17);assert.equal(row[2],'EME-INT-1.1.0');assert.equal(row[3],'EME-CI-1.1.0');
 for(let i=0;i<trials.length;i++){
  assert.deepEqual(trials[i].gaze_path,p.trials[i].gaze_path);
  assert.equal(trials[i].interruption_start_ms,p.trials[i].interruption_start_ms);
  assert.equal(trials[i].interruption_end_ms,p.trials[i].interruption_end_ms);
 }
 assert.equal(JSON.stringify(p),before);
});
test('Protocolo histórico conserva compatibilidad y omite las trayectorias nuevas',()=>{
 const p=packet();p.trials[0].gaze_path=[[1,2,3]];p.trials[0].interruption_start_ms=1;p.trials[0].interruption_end_ms=2;
 const trials=JSON.parse(ctx.validate_(p)[16]);assert.ok(trials.every(t=>!('gaze_path' in t)&&!('interruption_start_ms' in t)&&!('interruption_end_ms' in t)));
});
test('Protocolo 1.1 exige cámara consentida, validación completa y versiones compatibles',()=>{
 for(const mutate of [p=>p.camera_consent=false,p=>p.gaze_status='invalid',p=>p.gaze_status='failed',p=>p.validation.pop(),p=>p.validation[0].n=4,p=>p.validation[0].in_roi=.49,p=>p.consent_version='EME-CI-1.0.0',p=>p.protocol_version='EME-INT-1.3.0']){
  const p=trajectoryPacket();mutate(p);assert.throws(()=>ctx.validate_(p));
 }
 const p=packet();p.consent_version='EME-CI-1.1.0';assert.throws(()=>ctx.validate_(p));
});
test('Protocolo 1.2 conserva señal precisa o imprecisa, su etiqueta y las trayectorias',()=>{
 for(const status of ['valid','invalid']){
  const p=trajectoryPacket('EME-INT-1.2.0');p.gaze_status=status;if(status==='invalid')p.validation[0].in_roi=.2;
  const before=JSON.stringify(p),row=ctx.validate_(p);
  assert.equal(row.length,17);assert.equal(row[2],'EME-INT-1.2.0');assert.equal(row[3],'EME-CI-1.1.0');assert.equal(row[12],status);
  assert.deepEqual(JSON.parse(row[13]),{camera_consent:true,points:p.validation});
  assert.deepEqual(JSON.parse(row[16]).map(t=>t.gaze_path),p.trials.map(t=>t.gaze_path));
  assert.equal(JSON.stringify(p),before);
 }
});
test('Protocolo 1.2 rechaza falsa precisión y conserva una marca invalid conservadora',()=>{
 const p=trajectoryPacket('EME-INT-1.2.0');p.validation[0].in_roi=.49;assert.throws(()=>ctx.validate_(p),/Validación insuficiente/);
 p.gaze_status='invalid';assert.equal(ctx.validate_(p)[12],'invalid');
 p.validation[0].in_roi=.5;assert.equal(ctx.validate_(p)[12],'invalid');
 p.gaze_status='valid';assert.equal(ctx.validate_(p)[12],'valid');
});
test('Protocolo 1.2 conserva errores grandes de una mirada imprecisa sin bloquear el envío',()=>{
 const p=trajectoryPacket('EME-INT-1.2.0');p.gaze_status='invalid';
 for(const v of p.validation){v.in_roi=0;v.mean_error_px=Math.round(Math.hypot(50000-v.x,50000-v.y));}
 for(const t of p.trials){t.gaze_path=t.gaze_path.map(([time])=>[time,50000,50000]);t.gaze_inside=0;}
 const row=ctx.validate_(p);assert.equal(row[12],'invalid');assert.ok(p.validation.every(v=>v.mean_error_px>30000));
 assert.deepEqual(JSON.parse(row[13]).points,p.validation);assert.deepEqual(JSON.parse(row[16]).map(t=>t.gaze_path),p.trials.map(t=>t.gaze_path));
 p.validation[0].mean_error_px=200000;assert.doesNotThrow(()=>ctx.validate_(p));
 p.validation[0].mean_error_px=200001;assert.throws(()=>ctx.validate_(p),/Número fuera de rango/);
 for(const protocol of ['EME-INT-1.0.0','EME-INT-1.1.0']){
  const old=trajectoryPacket(protocol);if(protocol==='EME-INT-1.0.0')old.consent_version='EME-CI-1.0.0';
  old.validation[0].mean_error_px=30001;assert.throws(()=>ctx.validate_(old),/Número fuera de rango/);
 }
});
test('Protocolo 1.2 exige cámara, consentimiento compatible y señal en los cinco puntos aun si es imprecisa',()=>{
 for(const status of ['valid','invalid'])for(const mutate of [p=>p.camera_consent=false,p=>delete p.camera_consent,p=>p.gaze_status='failed',p=>p.gaze_status='declined',p=>p.validation=[],p=>p.validation.pop(),p=>p.validation[0].n=4,p=>p.consent_version='EME-CI-1.0.0',p=>p.consent_version='EME-CI-1.2.0']){
  const p=trajectoryPacket('EME-INT-1.2.0');p.gaze_status=status;mutate(p);assert.throws(()=>ctx.validate_(p));
 }
 const p=trajectoryPacket('EME-INT-1.2.0');p.gaze_status='invalid';p.validation.forEach(v=>{v.n=5;v.in_roi=0;});assert.equal(ctx.validate_(p)[12],'invalid');
});
test('Protocolo 1.2 mantiene trayectorias no vacías, conteos, enteros, orden y huecos de interrupción',()=>{
 for(const status of ['valid','invalid'])for(const mutate of [t=>delete t.gaze_path,t=>{t.gaze_path=[];t.gaze_n=0;t.gaze_inside=0;},t=>t.gaze_n=2,t=>t.gaze_path[0]=[0,1],t=>t.gaze_path[0][1]=.5,t=>t.gaze_path[0][1]=100001,t=>t.gaze_path[1][0]=0,t=>t.gaze_path[1][0]=7001]){
  const p=trajectoryPacket('EME-INT-1.2.0');p.gaze_status=status;mutate(p.trials.find(t=>t.interrupted));assert.throws(()=>ctx.validate_(p));
 }
});
test('Trayectorias rechazan muestras mal formadas, no finitas, fraccionarias o fuera de rango',()=>{
 const invalid=[[0,1],[0,1,2,3],null,'0,1,2',[0,'1',2],[0,NaN,2],[0,1,Infinity],[0,1.5,2],[.5,1,2],[-1,1,2],[0,-100001,2],[0,1,100001],[12001,1,2]];
 for(const point of invalid){const p=trajectoryPacket(),t=p.trials.find(t=>!t.interrupted);t.gaze_path[0]=point;assert.throws(()=>ctx.validate_(p));}
 const p=trajectoryPacket();p.trials[0].gaze_path=[[0,-100000,100000],[95,100000,-100000],[190,0,0]];assert.doesNotThrow(()=>ctx.validate_(p));
});
test('Trayectorias requieren orden temporal estricto y conteos coincidentes',()=>{
 for(const mutate of [t=>t.gaze_path[1][0]=0,t=>t.gaze_path[2][0]=50,t=>t.gaze_n=2,t=>t.gaze_path=[],t=>delete t.gaze_path,t=>t.gaze_path={},t=>{t.gaze_path=Array.from({length:351},(_,i)=>[i,1,2]);t.gaze_n=351;}]){
  const p=trajectoryPacket();mutate(p.trials[0]);assert.throws(()=>ctx.validate_(p));
 }
});
test('Interrupciones rechazan muestras en el intervalo y conservan los límites permitidos',()=>{
 for(const time of [7001,10999]){const p=trajectoryPacket(),t=p.trials.find(t=>t.interrupted);t.gaze_path=[[time,1,2]];t.gaze_n=1;t.gaze_inside=0;assert.throws(()=>ctx.validate_(p));}
 const p=trajectoryPacket(),t=p.trials.find(t=>t.interrupted);t.gaze_path=[[7000,1,2],[11000,3,4],[t.reading_wall_ms,5,6]];
 assert.deepEqual(JSON.parse(ctx.validate_(p)[16]).find(t=>t.interrupted).gaze_path,t.gaze_path);
});
test('Offsets de interrupción deben ser enteros, coherentes y estar dentro de la lectura',()=>{
 for(const mutate of [t=>t.interruption_start_ms=null,t=>t.interruption_end_ms=null,t=>t.interruption_start_ms=-1,t=>t.interruption_start_ms=7000.5,t=>t.interruption_end_ms=16001,t=>t.interruption_end_ms=7000,t=>t.interruption_actual_ms=3998,t=>{t.interruption_start_ms=null;t.interruption_end_ms=null;}]){
  const p=trajectoryPacket();mutate(p.trials.find(t=>t.interrupted));assert.throws(()=>ctx.validate_(p));
 }
 const p=trajectoryPacket(),t=p.trials.find(t=>t.interrupted);t.interruption_actual_ms=3999;assert.doesNotThrow(()=>ctx.validate_(p));
 t.interruption_start_ms=null;t.interruption_end_ms=null;t.interruption_actual_ms=0;assert.doesNotThrow(()=>ctx.validate_(p));
 const plain=p.trials.find(t=>!t.interrupted);plain.interruption_start_ms=0;plain.interruption_end_ms=4000;assert.throws(()=>ctx.validate_(p));
});
test('Admite 350 muestras por lectura y limita el tamaño total y de la celda',()=>{
 for(const protocol of ['EME-INT-1.1.0','EME-INT-1.2.0']){
 const p=trajectoryPacket(protocol);if(protocol==='EME-INT-1.2.0')p.gaze_status='invalid';
 for(const t of p.trials){t.reading_wall_ms=t.interrupted?39000:35000;t.reading_active_ms=35000;t.gaze_path=Array.from({length:350},(_,i)=>[i*100+(t.interrupted&&i>=70?4000:0),-100000,100000]);t.gaze_n=350;}
 const row=ctx.validate_(p);assert.ok(JSON.stringify(p).length>30000);assert.ok(row[16].length<=48000);assert.ok(JSON.parse(row[16]).every(t=>t.gaze_path.length===350));
 p.padding='';p.padding='x'.repeat(50000-JSON.stringify(p).length);assert.equal(JSON.stringify(p).length,50000);assert.doesNotThrow(()=>ctx.validate_(p));
 p.padding+='x';assert.throws(()=>ctx.validate_(p),/demasiado grande/);
 }
});
