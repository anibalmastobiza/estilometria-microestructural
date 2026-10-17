import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {CONFIG} from '../docs/config.js';
import * as stimuli from '../docs/stimuli.js';

const source=fs.readFileSync(new URL('../docs/app.js',import.meta.url),'utf8')
 .replace(/^import .*;\n/gm,'')+`\nglobalThis.testApp={cameraIntro,initCamera,calibrate,validateGaze,instructions,run,finish,exit,session,ReadingTrial,
 state:()=>({camera,stopped,submitted,watchdog,bridgeChannel}),setCamera(value){camera=value;}};`;
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// The application runs unchanged in a VM. The fixture supplies browser elements,
// camera frames and a clock; no camera, external script or Google Sheet is used.
function fixture({faceDetected=true,beginError=null,beginPending=false,endThrows=false,nullUntilTrained=false,alwaysNullPrediction=false}={}){
 let now=0,nextTimer=1,listener=null,eyes={},positions=[[1,2]],beginCalls=0,reloads=0,plays=0,clearCalls=0,endCalls=0,trackStops=0,nullCallbacks=0,predictionCallbacks=0;
 const timers=new Map(),events=new Map(),training=[],posts=[],runs=[],showCalls=[];
 class Element {
  constructor(tag='div'){this.tagName=tag;this.children=[];this.style={};this.dataset={};this.disabled=false;this.hidden=false;this.textContent='';this.html='';this.classes=new Set();this.classList={add:label=>this.classes.add(label),remove:label=>this.classes.delete(label),contains:label=>this.classes.has(label)};}
  set innerHTML(html){this.html=html;this.children=[];for(const m of html.matchAll(/<([a-z0-9]+)\b([^>]*)>/g)){const el=new Element(m[1]);for(const a of m[2].matchAll(/([\w-]+)(?:="([^"]*)")?/g)){el[a[1]]=a[2]??true;if(a[1].startsWith('data-'))el.dataset[a[1].slice(5)]=a[2];}const rest=html.slice(m.index+m[0].length),end=rest.indexOf(`</${m[1]}>`);if(end>=0)el.textContent=rest.slice(0,end).replace(/<[^>]*>/g,'');el.parent=this;this.children.push(el);}}
  get innerHTML(){return this.html;}
  append(el){el.parent=this;this.children.push(el);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}
  setAttribute(key,value){this[key]=value;}
  reportValidity(){return true;}
  querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
  querySelectorAll(selector){const elements=this.children.flatMap(el=>[el,...el.querySelectorAll('*')]);return elements.filter(el=>selector.split(',').some(part=>{const s=part.trim();return s==='*'||(s.startsWith('#')?el.id===s.slice(1):s.startsWith('.')?el.className===s.slice(1):el.tagName===s);}));}
  getBoundingClientRect(){if(this.id==='passage')return {x:100,y:200,left:100,top:200,width:1000,height:300,right:1100,bottom:500};const x=parseFloat(this.style.left)*12,y=parseFloat(this.style.top)*9;return {x:x-15,y:y-15,width:30,height:30};}
 }
 const body=new Element('body'),head=new Element('head'),app=new Element(),withdraw=new Element('button');app.id='app';withdraw.id='withdraw';body.append(app);body.append(withdraw);
 let container,video,currentTrack;
 function createMedia(){container=new Element();container.id='webgazerVideoContainer';video=new Element('video');video.id='webgazerVideoFeed';video.currentTime=now/1000;video.play=async()=>{plays++;};currentTrack={handlers:[],stop(){trackStops++;},addEventListener(type,fn){if(type==='ended')this.handlers.push(fn);}};const track=currentTrack;video.srcObject={getTracks:()=>[track],getVideoTracks:()=>[track]};container.append(video);for(const id of ['webgazerVideoCanvas','webgazerFaceOverlay','webgazerFaceFeedbackBox']){const el=new Element();el.id=id;container.append(el);}const gazeDot=new Element();gazeDot.id='webgazerGazeDot';body.append(container);body.append(gazeDot);}
 createMedia();
 const document={body,head,hidden:false,createElement:tag=>new Element(tag),querySelector:selector=>body.querySelector(selector)??head.querySelector(selector),querySelectorAll:selector=>[...body.querySelectorAll(selector),...head.querySelectorAll(selector)],addEventListener(){}};
 const webgazer={clearData:async()=>{clearCalls++;training.length=0;},setGazeListener(fn){listener=fn;},clearGazeListener(){listener=null;},end(){endCalls++;if(endThrows)throw Object.assign(new Error('nested node'),{name:'NotFoundError'});},begin(){beginCalls++;if(!document.querySelector('#webgazerVideoFeed'))createMedia();return beginPending?new Promise(()=>{}):beginError?Promise.reject(beginError):Promise.resolve();},removeMouseEventListeners(){},isReady:()=>true,getTracker:()=>({getPositions:()=>faceDetected?positions:[]}),getRegression:()=>[{getData:()=>training}],recordScreenPosition(x,y,event){training.push({eyes,screenPos:[x,y],event,time:now});}};
 for(const name of ['showPredictionPoints','showVideo','showFaceOverlay','showFaceFeedbackBox','showVideoPreview'])webgazer[name]=value=>showCalls.push([name,value]);
 const window={webgazer,scrollTo(){},location:{reload(){reloads++;}},addEventListener(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},removeEventListener(type,fn){events.get(type)?.delete(fn);}};
 const initJsPsych=options=>({run:timeline=>runs.push({options,timeline})});window.initJsPsych=initJsPsych;
 class FormData {constructor(form){this.entries=Object.entries(form.values??{});}has(key){return this.entries.some(([k])=>k===key);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}}
 const context=vm.createContext({C:CONFIG,...stimuli,document,window,initJsPsych,FormData,crypto:webcrypto,performance:{now:()=>now},innerWidth:1200,innerHeight:900,devicePixelRatio:1,console,setTimeout(fn,ms){const id=nextTimer++;timers.set(id,{fn,due:now+ms,ms});return id;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(source,context);const api=context.testApp;
 function advance(ms){const end=now+ms;let iterations=0;while(true){const next=[...timers].filter(([,timer])=>timer.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;assert.ok(++iterations<20000,'timer loop terminates');const [id,timer]=next;timers.delete(id);now=timer.due;timer.fn();}now=end;}
 function frame({x=600,y=450,eyeFeatures={},captured=now,updatePositions=true,updateVideo=true}={}){eyes=eyeFeatures;if(updatePositions)positions=[[now,now]];if(updateVideo)video.currentTime=now/1000;if(alwaysNullPrediction||(nullUntilTrained&&training.length===0)){nullCallbacks++;listener?.(null);}else{predictionCallbacks++;listener?.({x,y,eyeFeatures,t:captured});}}
 function stream(fps,ms,predict=()=>({})){const period=1000/fps,end=now+ms;while(now+period<=end+.00001){advance(Math.min(period,end-now));frame(predict());}if(now<end)advance(end-now);}
 async function activate(){api.session.consent_accepted=true;api.session.camera_consent=true;await api.initCamera();assert.equal(api.state().camera,true);}
 const remote={postMessage:(message,origin)=>posts.push({message,origin})};
 function ready(){for(const handler of events.get('message')??[])handler({origin:'https://script.googleusercontent.com',source:remote,data:{type:'eme-ready',channel:api.state().bridgeChannel}});}
 function ack(ok=true){const sent=posts.at(-1).message;for(const handler of [...(events.get('message')??[])])handler({origin:'https://script.googleusercontent.com',source:remote,data:{type:'eme-saved',channel:sent.channel,requestId:sent.requestId,ok}});}
 return {api,app,document,get container(){return container;},get video(){return video;},timers,training,posts,runs,showCalls,advance,frame,stream,activate,ready,ack,now:()=>now,calls:()=>({beginCalls,reloads,plays}),cleanupCalls:()=>({clearCalls,endCalls,trackStops}),predictionCalls:()=>({nullCallbacks,predictionCallbacks}),endTrack(){for(const handler of [...currentTrack.handlers])handler();},setFace(value){faceDetected=value;},pendingWork:()=>[...timers].filter(([id])=>id!==api.state().watchdog)};
}
function currentTarget(f){const dot=f.document.querySelector('.dot');return {x:parseFloat(dot.style.left)*12,y:parseFloat(dot.style.top)*9};}
function validSession(f){Object.assign(f.api.session,{consent_accepted:true,camera_consent:true,gaze_status:'valid',validation:Array.from({length:5},()=>({x:300,y:270,n:6,in_roi:1,mean_error_px:0,samples_per_sec:3})),trials:Array.from({length:4},(_,order)=>({order,gaze_n:1,gaze_path:[[100,200,250]]}))});}

function followUntil(f,fps,done,maxMs=60000,predict=()=>f.document.querySelector('.dot')?currentTarget(f):{}){const end=f.now()+maxMs;while(!done()&&f.now()<end){f.advance(1000/fps);f.frame(predict());}assert.ok(done(),'La fase termina dentro del límite de la prueba');}
function assertTerminal(f){assert.equal(f.api.state().stopped,true);assert.equal(f.api.state().camera,false);assert.equal(f.document.querySelector('#begin'),null);assert.equal(f.document.querySelector('#retry-camera'),null);assert.equal(f.document.querySelector('.dot'),null);assert.equal(f.runs.length,0);assert.equal(f.posts.length,0);assert.equal(f.timers.size,0);assert.match(f.app.innerHTML,/No se pudo registrar la mirada/);}

test('Cámara obligatoria y consentimiento sin opción de omitirla',async()=>{
 const f=fixture({beginError:Object.assign(new Error('denied'),{name:'NotAllowedError'})});const webcam=f.document.querySelectorAll('input').find(el=>el.name==='webcam');assert.equal(webcam.required,true);const consent=f.document.querySelector('#consent');consent.values={adult:'on',agree:'on'};consent.onsubmit({preventDefault(){},target:consent});assert.equal(f.document.querySelector('#demo'),null);f.api.session.camera_consent=true;await f.api.initCamera();assert.equal(f.document.querySelector('#skip'),null);assert.equal(f.document.querySelector('#begin'),null);assert.equal(f.runs.length,0);
});
test('Permiso pendiente exige recarga tras el límite y no inicia otra cámara',async()=>{
 const f=fixture({beginPending:true});f.api.session.camera_consent=true;void f.api.initCamera();await tick();f.advance(25000);const retry=f.document.querySelector('#retry-camera');assert.match(retry.textContent,/Recargar/);retry.onclick();assert.deepEqual(f.calls(),{beginCalls:1,reloads:1,plays:0});
});
test('Instrucciones exigen cabeza fija y solo ojos; los puntos no requieren clics',async()=>{
 const f=fixture();f.api.cameraIntro();assert.match(f.app.innerHTML,/cabeza fija/);assert.match(f.app.innerHTML,/únicamente los ojos/);assert.match(f.app.innerHTML,/no tienes que hacer clic/);await f.activate();f.api.calibrate();assert.match(f.app.innerHTML,/no hagas clic/);const dot=f.document.querySelector('.dot');assert.equal(dot.tagName,'span');assert.equal(typeof dot.onclick,'undefined');assert.equal(f.video.muted,true);assert.equal(f.calls().plays,1);assert.equal(f.container.classList.contains('tracking-video'),true);assert.ok(!f.showCalls.some(([method,value])=>method==='showVideoPreview'&&value===false));
});
for(const fps of [3,5,30])test(`Calibración automática y comprobación completas a ${fps} fps, sin predicciones iniciales ni clics`,async()=>{
 const f=fixture({nullUntilTrained:true});await f.activate();f.api.calibrate();followUntil(f,fps,()=>Boolean(f.document.querySelector('#begin'))||f.api.state().stopped);assert.equal(f.api.state().stopped,false);assert.equal(f.api.session.gaze_status,'valid');assert.equal(f.api.session.validation.length,5);assert.ok(f.api.session.validation.every(v=>v.n>=5&&v.in_roi===1));assert.ok(f.api.session.validation.every(v=>v.samples_per_sec<=fps+.001&&fps-v.samples_per_sec<=1/1.5+.001));assert.ok(f.predictionCalls().nullCallbacks>0);assert.ok(f.predictionCalls().predictionCallbacks>0);const groups=new Map();for(const item of f.training){const key=item.screenPos.join(',');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}assert.equal(groups.size,9);for(const rows of groups.values()){assert.ok(rows.length>=5);assert.ok(rows.at(-1).time-rows[0].time>=1500-1000/fps-50);assert.equal(new Set(rows.map(row=>row.eyes)).size,rows.length);}assert.equal(f.pendingWork().length,0);assert.equal(f.document.querySelector('.dot'),null);
});
test('Calibración descarta la inferencia pendiente tras un segundo y registra solo imágenes nuevas',async()=>{
 const f=fixture({nullUntilTrained:true});await f.activate();f.api.calibrate();f.advance(900);f.frame();f.advance(100);assert.equal(f.training.length,0);f.frame({captured:900});f.advance(50);assert.equal(f.training.length,0);f.frame();f.advance(50);assert.equal(f.training.length,1);assert.ok(f.predictionCalls().nullCallbacks>=3);f.advance(500);assert.equal(f.training.length,1);
});
test('Sin avance del vídeo no se registran muestras aunque cambien las posiciones del rostro',async()=>{
 const f=fixture({nullUntilTrained:true});await f.activate();f.api.calibrate();f.advance(1000);f.frame({updateVideo:false});f.advance(50);f.frame({updateVideo:false});f.advance(50);assert.equal(f.training.length,0);f.frame();f.advance(50);assert.equal(f.training.length,1);
});
test('La comprobación integrada no añade muestras al entrenamiento',async()=>{
 const f=fixture({nullUntilTrained:true});await f.activate();f.api.calibrate();followUntil(f,10,()=>!f.document.querySelector('#calibration-status'));assert.match(f.app.innerHTML,/Últimos cinco puntos/);const trained=f.training.length;assert.ok(trained>=45);followUntil(f,10,()=>Boolean(f.document.querySelector('#begin')));assert.equal(f.training.length,trained);
});
test('Cámara congelada durante calibración termina sin repetir ni dejar temporizadores',async()=>{
 const f=fixture();await f.activate();f.api.calibrate();f.advance(5000);assertTerminal(f);const page=f.app.innerHTML;f.advance(10000);assert.equal(f.app.innerHTML,page);assert.equal(f.timers.size,0);
});
test('Calibración con vídeo pero sin predicciones de mirada termina tras una única comprobación',async()=>{
 const f=fixture({alwaysNullPrediction:true});await f.activate();f.api.calibrate();followUntil(f,10,()=>f.api.state().stopped,80000);assertTerminal(f);assert.ok(f.predictionCalls().nullCallbacks>0);assert.equal(f.predictionCalls().predictionCallbacks,0);
});
test('Validación exige 1200 ms y seis fotogramas antes de medir',async()=>{
 const fast=fixture();await fast.activate();fast.api.validateGaze();fast.stream(30,1000,()=>currentTarget(fast));assert.equal([...fast.timers.values()].some(t=>t.ms===1500),false);fast.stream(30,300,()=>currentTarget(fast));assert.equal([...fast.timers.values()].some(t=>t.ms===1500),true);
 const slow=fixture();await slow.activate();slow.api.validateGaze();slow.stream(3,1700,()=>currentTarget(slow));assert.equal([...slow.timers.values()].some(t=>t.ms===1500),false);slow.stream(3,400,()=>currentTarget(slow));assert.equal([...slow.timers.values()].some(t=>t.ms===1500),true);
});
test('Imágenes capturadas antes del punto no cuentan como asentamiento ni medición',async()=>{
 const f=fixture();await f.activate();const stale=f.now();f.advance(100);f.api.validateGaze();f.stream(30,2000,()=>({...currentTarget(f),captured:stale}));assert.equal([...f.timers.values()].some(t=>t.ms===1500),false);f.stream(30,4000,()=>currentTarget(f));assert.ok(f.api.session.validation.length>=1);assert.ok(f.api.session.validation[0].n>=5);assert.equal(f.api.session.validation[0].in_roi,1);
});
test('Repetir los mismos ojos no sustituye muestras nuevas y termina sin reintentos',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();const same={};f.stream(30,36000,()=>({x:600,y:450,eyeFeatures:same}));assertTerminal(f);
});
test('Señal ausente durante validación termina sin lecturas ni nuevos temporizadores',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.advance(35000);assertTerminal(f);f.advance(5000);assert.equal(f.timers.size,0);
});
test('Señal estática suficiente se conserva como precisión baja y permite continuar una sola vez',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();followUntil(f,10,()=>Boolean(f.document.querySelector('#begin')),25000,()=>({x:600,y:450}));assert.equal(f.api.session.gaze_status,'invalid');assert.equal(f.api.session.validation.length,5);assert.ok(f.api.session.validation.every(v=>v.n>=5));assert.match(f.app.innerHTML,/precisión baja/);assert.match(f.app.innerHTML,/cabeza fija/);assert.equal(f.document.querySelector('#retry-camera'),null);f.document.querySelector('#begin').onclick();assert.equal(f.runs.length,1);
});
test('Señal móvil imprecisa mantiene los errores y permite la lectura sin recalibrar',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();followUntil(f,10,()=>Boolean(f.document.querySelector('#begin')),25000,()=>f.document.querySelector('.dot')?{x:currentTarget(f).x+200,y:currentTarget(f).y}:{});assert.equal(f.api.session.gaze_status,'invalid');assert.ok(f.api.session.validation.every(v=>v.n>=5&&v.in_roi===0&&v.mean_error_px===200));assert.equal(f.document.querySelector('#retry-camera'),null);f.document.querySelector('#begin').onclick();assert.equal(f.runs.length,1);
});
test('Las lecturas admiten valid o invalid con cámara, y bloquean estados sin señal',()=>{
 for(const camera of [false,true])for(const status of ['failed','declined','invalid','valid']){const f=fixture();f.api.session.camera_consent=true;f.api.session.gaze_status=status;f.api.setCamera(camera);f.api.run();assert.equal(f.runs.length,Number(camera&&['valid','invalid'].includes(status)));}
});
test('Fin automático conserva identificador interno y trayectorias sin mostrar código de retirada',async()=>{
 const f=fixture();validSession(f);f.api.finish();assert.ok(!f.app.innerHTML.includes(f.api.session.session_id));assert.equal(f.document.querySelector('#send').hidden,true);f.ready();assert.equal(f.posts.length,1);assert.equal(f.posts[0].message.payload.session_id,f.api.session.session_id);assert.equal(f.posts[0].message.payload.protocol_version,'EME-INT-1.2.0');assert.ok(f.posts[0].message.payload.trials.every(t=>t.gaze_path.length===t.gaze_n));f.ack();await tick();assert.equal(f.api.state().submitted,true);assert.equal(f.pendingWork().length,0);
});
test('Una lectura sin mirada bloquea el envío y un reintento mantiene el identificador',async()=>{
 const missing=fixture();validSession(missing);missing.api.session.trials[2].gaze_n=0;missing.api.finish();assertTerminal(missing);
 const f=fixture();validSession(f);f.api.finish();f.ready();const first=f.posts[0].message;f.ack(false);await tick();f.document.querySelector('#send').onclick();assert.equal(f.posts.length,2);assert.equal(f.posts[1].message.payload.session_id,first.payload.session_id);assert.notEqual(f.posts[1].message.requestId,first.requestId);f.ack();await tick();assert.equal(f.api.state().submitted,true);
});
test('Fallo de end() elimina vídeo antiguo y limpia datos antes del reintento de cámara',async()=>{
 const f=fixture({faceDetected:false,endThrows:true});await f.activate();const firstVideo=f.video,firstStream=firstVideo.srcObject;f.advance(25000);assert.ok(f.cleanupCalls().endCalls>=1);assert.ok(f.cleanupCalls().clearCalls>=2);assert.ok(f.cleanupCalls().trackStops>=1);for(const id of ['webgazerVideoContainer','webgazerGazeDot','webgazerVideoFeed','webgazerVideoCanvas','webgazerFaceOverlay','webgazerFaceFeedbackBox'])assert.equal(f.document.querySelector('#'+id),null,id);f.setFace(true);await f.document.querySelector('#retry-camera').onclick();assert.equal(f.api.state().camera,true);assert.notEqual(f.video,firstVideo);assert.notEqual(f.video.srcObject,firstStream);assert.equal(f.calls().beginCalls,2);assert.equal(f.calls().plays,2);assert.equal(f.video.muted,true);assert.equal(f.container.classList.contains('tracking-video'),false);
});
test('Pérdida de vídeo detiene el estudio y limpia datos y temporizadores',async()=>{
 const f=fixture({endThrows:true});await f.activate();f.api.calibrate();const clears=f.cleanupCalls().clearCalls;f.endTrack();assertTerminal(f);assert.ok(f.cleanupCalls().clearCalls>clears);assert.equal(f.document.querySelector('#webgazerVideoFeed'),null);
});
test('El límite por punto no acepta cinco muestras precisas en una ventana incompleta',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();for(let point=0;point<5;point++){f.advance(6000);f.frame(currentTarget(f));for(let warm=1;warm<6;warm++){f.advance(100);f.frame(currentTarget(f));}for(let sample=0;sample<5;sample++){f.advance(50);f.frame(currentTarget(f));}f.advance(250);}assertTerminal(f);f.advance(2000);assert.equal(f.timers.size,0);
});

for(const displacement of [200,50000])test(`Precisión baja con error ${displacement}: cuatro lecturas envían trayectorias e invalid a la hoja simulada`,async()=>{
 const f=fixture({nullUntilTrained:true});Object.assign(f.api.session,{age_band:'30-44',spanish_level:'native',education:'university',reading_frequency:'daily',gender:'',consent_elapsed_ms:500});f.advance(1000);await f.activate();f.api.calibrate();followUntil(f,5,()=>Boolean(f.document.querySelector('#begin')),60000,()=>f.document.querySelector('.dot')?{x:currentTarget(f).x+displacement,y:currentTarget(f).y}:{});assert.equal(f.api.session.gaze_status,'invalid');assert.ok(f.api.session.validation.every(v=>v.n>=5&&v.in_roi===0&&v.mean_error_px===displacement));f.document.querySelector('#begin').onclick();const timeline=f.runs[0].timeline;assert.equal(new Set(timeline.map(t=>t.condition.item.id)).size,4);
 for(const entry of timeline){const trial=new entry.type({finishTrial(){}});trial.trial(f.app,entry);f.frame({x:200.4,y:250.6});f.advance(100);f.frame({x:210.4,y:260.6});if(entry.condition.interrupted){f.advance(CONFIG.interruptAtMs-100);f.frame({x:900,y:800});f.advance(CONFIG.interruptionMs);for(let sample=0;sample<3;sample++){f.advance(100);f.frame({x:220.4+sample,y:270.6});}f.advance(1200);}else f.advance(CONFIG.interruptAtMs+1500-100);f.document.querySelector('#done').onclick();f.advance(50);f.document.querySelectorAll('button').find(el=>el.dataset.choice!==undefined).onclick();}
 assert.equal(f.api.session.trials.length,4);f.api.finish();assert.equal(f.document.querySelector('#send').hidden,true);assert.ok(!f.app.innerHTML.includes(f.api.session.session_id));f.ready();const payload=JSON.parse(JSON.stringify(f.posts[0].message.payload));assert.equal(payload.protocol_version,'EME-INT-1.2.0');assert.equal(payload.consent_version,'EME-CI-1.1.0');assert.equal(payload.gaze_status,'invalid');assert.ok(payload.trials.every(t=>t.gaze_path.length===t.gaze_n&&t.gaze_n>0));assert.ok(payload.trials.filter(t=>t.interrupted).every(t=>t.gaze_path.every(([time])=>time<=t.interruption_start_ms||time>=t.interruption_end_ms)));
 const backend=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../backend/Code.gs',import.meta.url),'utf8'),backend);const row=backend.validate_(payload);assert.equal(row[12],'invalid');assert.ok(JSON.parse(row[13]).points.every(v=>v.in_roi===0));const rows=[vm.runInContext('HEADERS',backend)],props=new Map([['COLLECTION_OPEN','true'],['SHEET_ID','simulated']]);const sheet={getLastRow:()=>rows.length,getRange:(r,c,n,w)=>({getValues:()=>rows.slice(r-1,r-1+n).map(item=>item.slice(c-1,c-1+w)),setValues:values=>{rows[r-1]=values[0];},createTextFinder:id=>({matchEntireCell:()=>({findNext:()=>rows.slice(1).some(item=>item[1]===id)})})})};backend.PropertiesService={getScriptProperties:()=>({getProperty:key=>props.get(key),setProperty:(key,value)=>props.set(key,value)})};backend.LockService={getScriptLock:()=>({waitLock(){},releaseLock(){}})};backend.SpreadsheetApp={openById:id=>{assert.equal(id,'simulated');return {getSheetByName:()=>sheet};},flush(){}};assert.equal(backend.saveSession(payload).ok,true);assert.equal(rows.length,2);assert.equal(rows[1][12],'invalid');assert.deepEqual(JSON.parse(rows[1][16]).map(t=>t.gaze_path),payload.trials.map(t=>t.gaze_path));f.ack();await tick();assert.equal(f.api.state().submitted,true);assert.equal(backend.saveSession(payload).duplicate,true);assert.equal(rows.length,2);
});

test('Predicciones fuera del intervalo admitido no cuentan como señal suficiente',async()=>{
 for(const prediction of [{x:100001,y:450},{x:-100001,y:450},{x:600,y:100001},{x:600,y:-100001}]){const f=fixture();await f.activate();f.api.validateGaze();f.stream(10,36000,()=>prediction);assertTerminal(f);}
});
