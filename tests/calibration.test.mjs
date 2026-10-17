import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
import {CONFIG} from '../docs/config.js';
import * as stimuli from '../docs/stimuli.js';

const source=fs.readFileSync(new URL('../docs/app.js',import.meta.url),'utf8')
 .replace(/^import .*;\n/gm,'')+`\nglobalThis.testApp={initCamera,calibrate,validateGaze,instructions,run,finish,exit,session,
 state:()=>({camera,stopped,submitted,watchdog,bridgeChannel}),setCamera(value){camera=value;}};`;
const tick=()=>new Promise(resolve=>setImmediate(resolve));

// The application runs unchanged in a VM. The fixture supplies browser elements,
// camera frames and a clock; no camera, external script or Google Sheet is used.
function fixture({faceDetected=true,beginError=null,beginPending=false,endThrows=false}={}){
 let now=0,nextTimer=1,listener=null,eyes={},positions=[[1,2]],beginCalls=0,reloads=0,plays=0,clearCalls=0,endCalls=0,trackStops=0;
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
  getBoundingClientRect(){const x=parseFloat(this.style.left)*12,y=parseFloat(this.style.top)*9;return {x:x-15,y:y-15,width:30,height:30};}
 }
 const body=new Element('body'),head=new Element('head'),app=new Element(),withdraw=new Element('button');app.id='app';withdraw.id='withdraw';body.append(app);body.append(withdraw);
 let container,video,currentTrack;
 function createMedia(){container=new Element();container.id='webgazerVideoContainer';video=new Element('video');video.id='webgazerVideoFeed';video.currentTime=now/1000;video.play=async()=>{plays++;};currentTrack={handlers:[],stop(){trackStops++;},addEventListener(type,fn){if(type==='ended')this.handlers.push(fn);}};const track=currentTrack;video.srcObject={getTracks:()=>[track],getVideoTracks:()=>[track]};container.append(video);for(const id of ['webgazerVideoCanvas','webgazerFaceOverlay','webgazerFaceFeedbackBox']){const el=new Element();el.id=id;container.append(el);}const gazeDot=new Element();gazeDot.id='webgazerGazeDot';body.append(container);body.append(gazeDot);}
 createMedia();
 const document={body,head,hidden:false,createElement:tag=>new Element(tag),querySelector:selector=>body.querySelector(selector)??head.querySelector(selector),querySelectorAll:selector=>[...body.querySelectorAll(selector),...head.querySelectorAll(selector)],addEventListener(){}};
 const webgazer={clearData:async()=>{clearCalls++;training.length=0;},setGazeListener(fn){listener=fn;},clearGazeListener(){listener=null;},end(){endCalls++;if(endThrows)throw Object.assign(new Error('nested node'),{name:'NotFoundError'});},begin(){beginCalls++;if(!document.querySelector('#webgazerVideoFeed'))createMedia();return beginPending?new Promise(()=>{}):beginError?Promise.reject(beginError):Promise.resolve();},removeMouseEventListeners(){},isReady:()=>true,getTracker:()=>({getPositions:()=>faceDetected?positions:[]}),getRegression:()=>[{getData:()=>training}],recordScreenPosition(x,y,event){training.push({eyes,screenPos:[x,y],event});}};
 for(const name of ['showPredictionPoints','showVideo','showFaceOverlay','showFaceFeedbackBox','showVideoPreview'])webgazer[name]=value=>showCalls.push([name,value]);
 const window={webgazer,scrollTo(){},location:{reload(){reloads++;}},addEventListener(type,fn){if(!events.has(type))events.set(type,new Set());events.get(type).add(fn);},removeEventListener(type,fn){events.get(type)?.delete(fn);}};
 const initJsPsych=options=>({run:timeline=>runs.push({options,timeline})});window.initJsPsych=initJsPsych;
 class FormData {constructor(form){this.entries=Object.entries(form.values??{});}has(key){return this.entries.some(([k])=>k===key);}[Symbol.iterator](){return this.entries[Symbol.iterator]();}}
 const context=vm.createContext({C:CONFIG,...stimuli,document,window,initJsPsych,FormData,crypto:webcrypto,performance:{now:()=>now},innerWidth:1200,innerHeight:900,devicePixelRatio:1,console,setTimeout(fn,ms){const id=nextTimer++;timers.set(id,{fn,due:now+ms,ms});return id;},clearTimeout:id=>timers.delete(id)});
 vm.runInContext(source,context);const api=context.testApp;
 function advance(ms){const end=now+ms;let iterations=0;while(true){const next=[...timers].filter(([,timer])=>timer.due<=end).sort((a,b)=>a[1].due-b[1].due||a[0]-b[0])[0];if(!next)break;assert.ok(++iterations<20000,'timer loop terminates');const [id,timer]=next;timers.delete(id);now=timer.due;timer.fn();}now=end;}
 function frame({x=600,y=450,eyeFeatures={},captured=now,updatePositions=true,updateVideo=true}={}){eyes=eyeFeatures;if(updatePositions)positions=[[now,now]];if(updateVideo)video.currentTime=now/1000;listener?.({x,y,eyeFeatures,t:captured});}
 function stream(fps,ms,predict=()=>({})){const period=1000/fps,end=now+ms;while(now+period<=end+.00001){advance(Math.min(period,end-now));frame(predict());}if(now<end)advance(end-now);}
 async function activate(){api.session.consent_accepted=true;api.session.camera_consent=true;await api.initCamera();assert.equal(api.state().camera,true);}
 const remote={postMessage:(message,origin)=>posts.push({message,origin})};
 function ready(){for(const handler of events.get('message')??[])handler({origin:'https://script.googleusercontent.com',source:remote,data:{type:'eme-ready',channel:api.state().bridgeChannel}});}
 function ack(ok=true){const sent=posts.at(-1).message;for(const handler of [...(events.get('message')??[])])handler({origin:'https://script.googleusercontent.com',source:remote,data:{type:'eme-saved',channel:sent.channel,requestId:sent.requestId,ok}});}
 return {api,app,document,get container(){return container;},get video(){return video;},timers,training,posts,runs,showCalls,advance,frame,stream,activate,ready,ack,now:()=>now,calls:()=>({beginCalls,reloads,plays}),cleanupCalls:()=>({clearCalls,endCalls,trackStops}),endTrack(){for(const handler of [...currentTrack.handlers])handler();},setFace(value){faceDetected=value;},pendingWork:()=>[...timers].filter(([id])=>id!==api.state().watchdog)};
}
function currentTarget(f){const dot=f.document.querySelector('.dot');return {x:parseFloat(dot.style.left)*12,y:parseFloat(dot.style.top)*9};}
function validSession(f){Object.assign(f.api.session,{consent_accepted:true,camera_consent:true,gaze_status:'valid',validation:Array.from({length:5},()=>({x:300,y:270,n:6,in_roi:1,mean_error_px:0,samples_per_sec:3})),trials:Array.from({length:4},(_,order)=>({order,gaze_n:1,gaze_path:[[100,200,250]]}))});}

test('Consentimiento de cámara obligatorio y permiso denegado sin acceso a las lecturas',async()=>{
 const f=fixture({beginError:Object.assign(new Error('denied'),{name:'NotAllowedError'})});const webcam=f.document.querySelectorAll('input').find(el=>el.name==='webcam');assert.equal(webcam.required,true);const consent=f.document.querySelector('#consent');consent.values={adult:'on',agree:'on'};consent.onsubmit({preventDefault(){},target:consent});assert.equal(f.document.querySelector('#demo'),null);f.api.session.camera_consent=true;await f.api.initCamera();assert.equal(f.document.querySelector('#skip'),null);assert.equal(f.document.querySelector('#begin'),null);assert.ok(f.document.querySelector('#retry-camera'));assert.equal(f.runs.length,0);
});
test('Permiso pendiente exige recarga tras el límite y no inicia otra cámara',async()=>{
 const f=fixture({beginPending:true});f.api.session.camera_consent=true;void f.api.initCamera();await tick();f.advance(25000);const retry=f.document.querySelector('#retry-camera');assert.match(retry.textContent,/Recargar/);retry.onclick();assert.deepEqual(f.calls(),{beginCalls:1,reloads:1,plays:0});
});
test('Vídeo reproducido sin audio permanece renderizado durante la calibración',async()=>{
 const f=fixture();await f.activate();assert.equal(f.video.muted,true);assert.equal(f.calls().plays,1);f.api.calibrate();assert.equal(f.container.classList.contains('tracking-video'),true);assert.ok(!f.showCalls.some(([method,value])=>method==='showVideoPreview'&&value===false));const css=fs.readFileSync(new URL('../docs/style.css',import.meta.url),'utf8');assert.match(css,/#webgazerVideoContainer\.tracking-video\{[^}]*width:1px/);assert.doesNotMatch(css,/#webgazerVideoContainer\.tracking-video(?: video)?\{[^}]*display\s*:\s*none/);
});
test('El primer clic descarta la inferencia antigua que termina tras el asentamiento y espera otra imagen',async()=>{
 const f=fixture();await f.activate();f.api.calibrate();const dot=f.document.querySelector('.dot');f.advance(900);f.frame();f.advance(100);assert.equal(dot.disabled,true);f.advance(100);assert.equal(dot.disabled,true);dot.onclick();assert.equal(f.training.length,0);f.frame({captured:900});f.advance(50);assert.equal(dot.disabled,true);f.frame();f.advance(50);assert.equal(dot.disabled,false);dot.onclick();assert.equal(f.training.length,1);
});
test('El segundo clic exige separación temporal y una imagen de ojos distinta',async()=>{
 const f=fixture();await f.activate();f.api.calibrate();const dot=f.document.querySelector('.dot');f.advance(1000);const first={};f.frame();f.advance(50);f.frame({eyeFeatures:first});f.advance(50);dot.onclick();assert.equal(f.training.length,1);dot.onclick();assert.equal(f.training.length,1);f.advance(300);f.frame({eyeFeatures:first});f.advance(50);f.frame({eyeFeatures:first});f.advance(50);assert.equal(dot.disabled,true);f.frame();f.advance(50);assert.equal(dot.disabled,false);dot.onclick();assert.equal(f.training.length,2);assert.notEqual(f.training[0].eyes,f.training[1].eyes);assert.equal(dot.disabled,true);
});
test('Cada punto de calibración requiere dos imágenes nuevas y solo nueve puntos completan la fase',async()=>{
 const f=fixture();await f.activate();f.api.calibrate();const dot=f.document.querySelector('.dot');for(let point=0;point<9;point++){f.advance(1000);f.frame();f.advance(50);f.frame();f.advance(50);assert.equal(dot.disabled,false);dot.onclick();f.advance(300);f.frame();f.advance(50);f.frame();f.advance(50);assert.equal(dot.disabled,false);dot.onclick();}assert.equal(f.training.length,18);assert.equal(new Set(f.training.map(item=>item.eyes)).size,18);assert.equal(new Set(f.training.map(item=>item.screenPos.join(','))).size,9);assert.equal(f.document.querySelector('.dot'),null);assert.ok(f.document.querySelector('#validate'));assert.equal(f.pendingWork().length,0);
});
test('Cámara congelada no habilita el punto y el límite detiene los sondeos futuros',async()=>{
 const f=fixture();await f.activate();f.api.calibrate();f.advance(61000);assert.match(f.app.innerHTML,/imágenes nuevas/);assert.ok(f.document.querySelector('#retry-camera'));assert.equal(f.document.querySelector('.dot'),null);assert.equal(f.pendingWork().length,0);const page=f.app.innerHTML;f.advance(5000);assert.equal(f.app.innerHTML,page);assert.equal(f.pendingWork().length,0);
});
test('Cambiar landmarks sin avanzar el vídeo no habilita la calibración',async()=>{
 const f=fixture();await f.activate();f.api.calibrate();f.advance(1000);f.frame({updateVideo:false});f.advance(50);f.frame({updateVideo:false});f.advance(50);assert.equal(f.document.querySelector('.dot').disabled,true);f.frame();f.advance(50);assert.equal(f.document.querySelector('.dot').disabled,false);
});
for(const fps of [3,5,30])test(`Validación a ${fps} fps conserva precisión y exige muestras suficientes`,async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.stream(fps,25000,()=>f.document.querySelector('.dot')?currentTarget(f):{});assert.equal(f.api.session.gaze_status,'valid');assert.equal(f.api.session.validation.length,5);assert.ok(f.api.session.validation.every(v=>v.n>=5&&v.in_roi===1));assert.ok(f.api.session.validation.every(v=>v.samples_per_sec<=fps+.001&&fps-v.samples_per_sec<=1/1.5+.001&&v.n*1000/v.samples_per_sec>=1499.99),JSON.stringify(f.api.session.validation));assert.ok(f.document.querySelector('#begin'));assert.equal(f.training.length,0);assert.equal(f.pendingWork().length,0);
});
test('Validación no mide antes de 1200 ms aunque lleguen seis imágenes',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.stream(30,1000,()=>currentTarget(f));assert.equal(f.api.session.validation.length,0);assert.equal([...f.timers.values()].some(t=>t.ms===1500),false);f.stream(30,300,()=>currentTarget(f));assert.equal([...f.timers.values()].some(t=>t.ms===1500),true);
});
test('Validación espera seis imágenes nuevas aunque haya transcurrido el asentamiento',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.stream(3,1700,()=>currentTarget(f));assert.equal([...f.timers.values()].some(t=>t.ms===1500),false);f.stream(3,400,()=>currentTarget(f));assert.equal([...f.timers.values()].some(t=>t.ms===1500),true);
});
test('Imágenes capturadas antes del punto no cuentan como asentamiento ni medición',async()=>{
 const f=fixture();await f.activate();const stale=f.now();f.advance(100);f.api.validateGaze();f.stream(30,2000,()=>({...currentTarget(f),captured:stale}));assert.equal([...f.timers.values()].some(t=>t.ms===1500),false);f.stream(30,4000,()=>currentTarget(f));assert.ok(f.api.session.validation.length>=1);assert.ok(f.api.session.validation[0].n>=5);assert.equal(f.api.session.validation[0].in_roi,1);
});
test('Repetir el mismo objeto de ojos no simula nuevas muestras de validación',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();const same={};f.stream(30,36000,()=>({x:600,y:450,eyeFeatures:same}));assert.equal(f.api.session.gaze_status,'invalid');assert.ok(f.api.session.validation.every(v=>v.n===0));assert.match(f.app.innerHTML,/No llegan suficientes muestras nuevas/);assert.equal(f.pendingWork().length,0);
});
test('Señal ausente termina sin lecturas ni temporizadores de validación',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.advance(35000);assert.equal(f.api.session.gaze_status,'invalid');assert.ok(f.api.session.validation.every(v=>v.n===0));assert.match(f.app.innerHTML,/No llegan suficientes muestras nuevas/);assert.equal(f.document.querySelector('#begin'),null);assert.equal(f.runs.length,0);assert.equal(f.pendingWork().length,0);f.advance(5000);assert.equal(f.pendingWork().length,0);
});
test('Predicción estática con imágenes nuevas produce diagnóstico de dirección inmóvil',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.stream(10,25000,()=>({x:600,y:450}));assert.equal(f.api.session.gaze_status,'invalid');assert.ok(f.api.session.validation.every(v=>v.n>=5));assert.match(f.app.innerHTML,/permanece en la misma zona/);assert.equal(f.document.querySelector('#begin'),null);assert.equal(f.pendingWork().length,0);
});
test('Predicción que cambia pero falla la precisión conserva los criterios de aceptación',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();f.stream(10,25000,()=>f.document.querySelector('.dot')?{x:currentTarget(f).x+200,y:currentTarget(f).y}:{});assert.equal(f.api.session.gaze_status,'invalid');assert.ok(f.api.session.validation.every(v=>v.n>=5&&v.in_roi===0));assert.match(f.app.innerHTML,/su posición no coincide/);assert.equal(f.document.querySelector('#begin'),null);
});
test('Las lecturas requieren cámara activa y validación válida',async()=>{
 for(const camera of [false,true])for(const status of ['invalid','valid']){const f=fixture();f.api.session.camera_consent=true;f.api.session.gaze_status=status;f.api.setCamera(camera);f.api.run();assert.equal(f.runs.length,Number(camera&&status==='valid'));}
});
test('Fin automático conserva identificador interno y trayectorias sin mostrar código de retirada',async()=>{
 const f=fixture();validSession(f);f.api.finish();assert.ok(!f.app.innerHTML.includes(f.api.session.session_id));assert.equal(f.document.querySelector('#send').hidden,true);f.ready();assert.equal(f.posts.length,1);assert.equal(f.posts[0].message.payload.session_id,f.api.session.session_id);assert.ok(f.posts[0].message.payload.trials.every(t=>t.gaze_path.length===t.gaze_n));f.ack();await tick();assert.equal(f.api.state().submitted,true);assert.equal(f.pendingWork().length,0);
});
test('Una lectura sin mirada bloquea el envío y un reintento mantiene el identificador',async()=>{
 const missing=fixture();validSession(missing);missing.api.session.trials[2].gaze_n=0;missing.api.finish();assert.equal(missing.posts.length,0);assert.equal(missing.document.querySelector('#bridge'),null);assert.equal(missing.api.state().stopped,true);
 const f=fixture();validSession(f);f.api.finish();f.ready();const first=f.posts[0].message;f.ack(false);await tick();f.document.querySelector('#send').onclick();assert.equal(f.posts.length,2);assert.equal(f.posts[1].message.payload.session_id,first.payload.session_id);assert.notEqual(f.posts[1].message.requestId,first.requestId);f.ack();await tick();assert.equal(f.api.state().submitted,true);
});

test('Fallo de end() elimina todos los elementos antiguos y limpia los datos antes del reintento',async()=>{
 const f=fixture({endThrows:true});await f.activate();const firstVideo=f.video,firstStream=firstVideo.srcObject;f.api.calibrate();f.advance(61000);assert.ok(f.cleanupCalls().endCalls>=1);assert.ok(f.cleanupCalls().clearCalls>=2);assert.ok(f.cleanupCalls().trackStops>=1);for(const id of ['webgazerVideoContainer','webgazerGazeDot','webgazerVideoFeed','webgazerVideoCanvas','webgazerFaceOverlay','webgazerFaceFeedbackBox'])assert.equal(f.document.querySelector('#'+id),null,id);await f.document.querySelector('#retry-camera').onclick();assert.equal(f.api.state().camera,true);assert.notEqual(f.video,firstVideo);assert.notEqual(f.video.srcObject,firstStream);assert.equal(f.calls().beginCalls,2);assert.equal(f.calls().plays,2);assert.equal(f.video.muted,true);assert.equal(f.container.classList.contains('tracking-video'),false);assert.ok(f.cleanupCalls().clearCalls>=3);
});
test('Pérdida de la pista de vídeo tras reintentar detiene el estudio y limpia datos y temporizadores',async()=>{
 const f=fixture({endThrows:true});await f.activate();f.api.calibrate();f.advance(61000);await f.document.querySelector('#retry-camera').onclick();const clears=f.cleanupCalls().clearCalls;f.endTrack();assert.equal(f.api.state().stopped,true);assert.equal(f.api.state().camera,false);assert.match(f.app.innerHTML,/No se pudo registrar la mirada/);assert.equal(f.document.querySelector('#webgazerVideoFeed'),null);assert.ok(f.cleanupCalls().clearCalls>clears);assert.equal(f.timers.size,0);assert.equal(f.posts.length,0);
});

test('El límite por punto no acepta cinco muestras precisas tomadas durante una ventana incompleta',async()=>{
 const f=fixture();await f.activate();f.api.validateGaze();for(let point=0;point<5;point++){f.advance(6000);f.frame(currentTarget(f));for(let warm=1;warm<6;warm++){f.advance(100);f.frame(currentTarget(f));}for(let sample=0;sample<5;sample++){f.advance(50);f.frame(currentTarget(f));}f.advance(250);assert.equal(f.api.session.validation.length,point+1);assert.equal(f.api.session.validation[point].n,5);assert.equal(f.api.session.validation[point].in_roi,1);}assert.equal(f.api.session.gaze_status,'invalid');assert.equal(f.document.querySelector('#begin'),null);assert.match(f.app.innerHTML,/No llegan suficientes muestras nuevas/);assert.equal(f.pendingWork().length,0);f.advance(2000);assert.equal(f.pendingWork().length,0);
});
