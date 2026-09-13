import {CONFIG as C} from './config.js';
import {schedule,renderText,mulberry32,shuffle} from './stimuli.js';
const app=document.querySelector('#app'),exitButton=document.querySelector('#withdraw');
const start=performance.now();
let stopped=false,submitted=false,watchdog,jsPsych,gazeHandler=null,camera=false;
const timers=new Set();
const after=(fn,ms)=>{const t=setTimeout(()=>{timers.delete(t);if(!stopped)fn();},ms);timers.add(t);return t;};
const clearTimers=()=>{for(const t of timers)clearTimeout(t);timers.clear();};
const seed=crypto.getRandomValues(new Uint32Array(1))[0],rng=mulberry32(seed);
const session={session_id:crypto.randomUUID(),protocol_version:C.protocol,consent_version:C.consent,
 list_id:Math.floor(rng()*4),bank_id:Math.floor(rng()*2),gaze_status:'declined',validation:[],
 viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},quality:{hidden:0,resize:0},trials:[]};
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=html=>{app.innerHTML=html;window.scrollTo(0,0);};
const elapsed=()=>Math.round(performance.now()-start);
function stopCamera(){document.querySelectorAll('video').forEach(v=>v.srcObject?.getTracks().forEach(t=>t.stop()));gazeHandler=null;if(window.webgazer){try{window.webgazer.clearGazeListener();window.webgazer.end();window.webgazer.clearData();}catch{}}camera=false;document.querySelectorAll('video').forEach(v=>v.srcObject?.getTracks().forEach(t=>t.stop()));}
function exit(reason='withdrawn'){
 if(stopped||submitted)return;stopped=true;clearTimers();clearTimeout(watchdog);stopCamera();
 document.querySelectorAll('.overlay,.dot').forEach(e=>e.remove());exitButton.hidden=true;
 session.trials=[];session.validation=[];
 view(`<h1>${reason==='timeout'?'Tiempo finalizado':'Has salido del estudio'}</h1><p>No se han enviado tus respuestas. La cámara está apagada y los datos de esta sesión se han descartado.</p><p>Puedes cerrar esta pestaña.</p>`);
}
exitButton.onclick=()=>exit();
window.addEventListener('pagehide',()=>{stopCamera();});
document.addEventListener('visibilitychange',()=>{if(!stopped&&!submitted&&document.hidden)session.quality.hidden++;});
window.addEventListener('resize',()=>{if(!stopped&&!submitted)session.quality.resize++;});
function landing(){
 if(innerWidth<900||innerHeight<650){view('<h1>Participa desde un ordenador</h1><p>Amplía la ventana al menos a 900 × 650 píxeles y recarga la página. Este estudio necesita una distribución estable del texto.</p>');return;}
 if(!window.initJsPsych){view('<h1>No se pudo cargar el estudio</h1><p>Comprueba la conexión y recarga. No se han recogido respuestas.</p>');return;}
 if(C.mode==='live'&&!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(C.endpoint)){view('<h1>Estudio aún no disponible</h1><p>La recogida no está configurada.</p>');return;}
 view(`<p class="muted">Estudio de lectura · Personas de 18 años o más</p><h1>Leer y retomar el hilo.</h1>
 ${C.mode==='demo'?'<p class="notice">Demostración: las respuestas no se envían ni se guardan en Google Sheets.</p>':''}
 <p>Cuatro lecturas con preguntas y breves interrupciones. Máximo 4 minutos y 50 segundos desde esta pantalla.</p>
 <details open><summary><strong>Información y consentimiento</strong></summary>
 <p>Investigador: ${esc(C.researcher)}, ${esc(C.institution)}. Contacto: <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>.</p>
 <p>Participar es voluntario y sin remuneración. Puedes omitir los datos opcionales y salir sin penalización. Las tareas pueden causar cansancio leve.</p>
 <p>No pedimos tu nombre ni correo. Guardamos respuestas, tiempos, datos demográficos y medidas técnicas con un código aleatorio de sesión. La cámara es opcional: estima la mirada en tu ordenador, sin grabar ni enviar imágenes, vídeo o audio. Solo se envían medidas resumidas.</p>
 <p>En el estudio activo, confirmarás el envío a una hoja privada de Google Sheets. Conservaremos los datos ${C.retentionMonths} meses y publicaremos resultados agregados. GitHub, Google y los proveedores de bibliotecas reciben datos técnicos de conexión.</p>
 <p>Puedes retirarte del estudio en cualquier momento. Si sales antes del envío, se descartan tus respuestas. Puedes contactar conmigo para conocer los resultados del estudio. Consentimiento ${esc(C.consent)}.</p></details>
 <form id="consent"><label><input type="checkbox" required name="adult">Tengo 18 años o más y puedo leer español con fluidez.</label><label><input type="checkbox" required name="agree">He leído la información y acepto participar y el tratamiento descrito.</label><label><input type="checkbox" name="webcam">Acepto, de forma opcional, usar mi cámara para estimar la mirada.</label><div class="buttons"><button type="submit">Continuar</button><button type="button" class="secondary" id="decline">No participar</button></div></form>`);
 document.querySelector('#decline').onclick=()=>exit();
 document.querySelector('#consent').onsubmit=e=>{e.preventDefault();session.consent_accepted=true;session.camera_consent=new FormData(e.target).has('webcam');session.consent_elapsed_ms=elapsed();exitButton.hidden=false;demographics();};
 watchdog=setTimeout(()=>exit('timeout'),C.totalBudgetMs);
}
function demographics(){
 const select=(name,label,opts,required=false)=>`<label>${label}<select name="${name}" ${required?'required':''}><option value="">${required?'Selecciona una opción':'Prefiero no responder'}</option>${opts.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></label>`;
 view(`<h1>Un poco sobre tu lectura</h1><p>Edad y dominio del español son necesarios. El resto es opcional.</p><form id="demo"><div class="grid">
 ${select('age_band','Edad',[['18-29','18–29'],['30-44','30–44'],['45-59','45–59'],['60+','60 o más']],true)}
 ${select('spanish_level','Dominio del español',[['native','Lengua materna'],['advanced','Avanzado / C1–C2']],true)}
 ${select('education','Estudios completados',[['secondary','Secundaria o menos'],['vocational','Formación profesional'],['university','Universitarios']])}
 ${select('reading_frequency','Lectura por ocio',[['rare','Menos de una vez por semana'],['weekly','Algunas veces por semana'],['daily','A diario']])}
 ${select('gender','Género',[['woman','Mujer'],['man','Hombre'],['other','Otra identidad']])}</div><button>Continuar</button></form>`);
 document.querySelector('#demo').onsubmit=e=>{e.preventDefault();Object.assign(session,Object.fromEntries(new FormData(e.target)));session.camera_consent?cameraIntro():instructions();};
}
function cameraIntro(){view('<h1>Preparar la cámara</h1><p>Busca buena iluminación y mantén la cabeza estable. La cámara es opcional. Después mirarás y pulsarás unos puntos; al validar solo tendrás que mirarlos.</p><div class="buttons"><button id="camera">Activar cámara</button><button class="secondary" id="skip">Continuar sin cámara</button></div>');document.querySelector('#skip').onclick=instructions;document.querySelector('#camera').onclick=initCamera;}
async function initCamera(){
 view('<h1>Conectando la cámara…</h1><p>Acepta el permiso del navegador si deseas usarla. No se solicitará micrófono.</p><button class="secondary" id="skip">Continuar sin cámara</button>');
 let abandoned=false;const fail=(error)=>{if(abandoned||stopped)return;abandoned=true;clearTimeout(timeout);stopCamera();session.gaze_status='failed';
 const message=error?.name==='NotAllowedError'?'El navegador no ha permitido la cámara. Revisa el permiso de cámara de esta página.':error?.name==='NotFoundError'?'No se ha encontrado una cámara conectada.':'No se pudo iniciar la cámara. Comprueba los permisos y que otra aplicación no la esté usando.';
 view(`<h1>La cámara no se ha activado</h1><p>${message}</p><p>Puedes recargar para intentarlo de nuevo o elegir continuar sin cámara.</p><button id="skip">Continuar sin cámara</button>`);document.querySelector('#skip').onclick=instructions;
 };document.querySelector('#skip').onclick=()=>{abandoned=true;clearTimeout(timeout);stopCamera();session.gaze_status='failed';instructions();};
 const timeout=after(fail,25000);
 try{
  if(!window.webgazer)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=C.webgazerURL;s.onload=resolve;s.onerror=reject;document.head.append(s);});
  if(abandoned||stopped)return;
  window.saveDataAcrossSessions=false;await window.webgazer.clearData();
  window.webgazer.setGazeListener((data)=>{if(data&&gazeHandler)gazeHandler(data,performance.now());});
  await window.webgazer.begin();
  if(abandoned||stopped){stopCamera();return;}
  clearTimeout(timeout);window.webgazer.removeMouseEventListeners();
  window.webgazer.showPredictionPoints(false);window.webgazer.showVideoPreview(true);camera=true;
  view('<h1>Ajusta tu posición</h1><p>Comprueba que se ve tu rostro. Si la cámara no funciona, continúa sin ella.</p><div class="buttons"><button id="ready">Calibrar: mirar y pulsar puntos</button><button id="skip" class="secondary">Continuar sin cámara</button></div>');
  document.querySelector('#ready').onclick=calibrate;document.querySelector('#skip').onclick=()=>{stopCamera();session.gaze_status='failed';instructions();};
 }catch(error){fail(error);}
}
function calibrate(){
 window.webgazer.showVideoPreview(false);view('<h1>Calibración</h1><p>Mira cada punto y pulsa dos veces. Mantén la cabeza estable.</p>');
 const points=shuffle([[15,20],[50,20],[85,20],[15,50],[50,50],[85,50],[15,80],[50,80],[85,80]],rng);let i=0,count=0;
 const b=document.createElement('button');b.className='dot';b.setAttribute('aria-label','Punto de calibración');document.body.append(b);
 const place=()=>{b.style.left=points[i][0]+'vw';b.style.top=points[i][1]+'vh';};place();
 const timeout=after(()=>{b.remove();stopCamera();session.gaze_status='failed';instructions();},35000);
 b.onclick=()=>{const r=b.getBoundingClientRect();window.webgazer.recordScreenPosition(r.x+r.width/2,r.y+r.height/2,'click');if(++count===2){count=0;if(++i===points.length){clearTimeout(timeout);b.remove();validate();}else place();}};
}
function validate(){
 view('<h1>Calibración completada</h1><p>Ahora verás cinco puntos que cambian de posición solos. Mira cada punto sin hacer clic.</p><button id="validate">Comenzar comprobación</button>');
 document.querySelector('#validate').onclick=validateGaze;
}
function validateGaze(){
 view('<h1>Comprobación de la mirada</h1><p>Mira los puntos sin pulsar. Esta fase mide la precisión; no entrena el sistema.</p>');
 const points=[[25,30],[75,30],[50,50],[25,70],[75,70]];let i=0;
 const b=document.createElement('span');b.className='dot';document.body.append(b);
 function next(){if(i===points.length){b.remove();gazeHandler=null;const valid=session.validation.every(v=>v.n>=5&&v.in_roi>=.5);session.gaze_status=valid?'valid':'invalid';instructions();return;}
  const [px,py]=points[i++],x=innerWidth*px/100,y=innerHeight*py/100;b.style.left=px+'vw';b.style.top=py+'vh';let errors=[];gazeHandler=null;
  after(()=>{gazeHandler=d=>errors.push(Math.hypot(d.x-x,d.y-y));after(()=>{gazeHandler=null;session.validation.push({x,y,n:errors.length,in_roi:errors.length?errors.filter(e=>e<=150).length/errors.length:0,mean_error_px:errors.length?Math.round(errors.reduce((a,b)=>a+b,0)/errors.length):null,samples_per_sec:errors.length});next();},1000);},400);
 }next();
}
function instructions(){
 if(stopped)return;
 if(C.totalBudgetMs-elapsed()<C.taskBudgetMs+10000){exit('timeout');return;}
 view('<h1>Cómo participar</h1><p>Lee cada texto para comprenderlo. Pulsa «He terminado» cuando acabes. Si aparece un número, indica si es par o impar; el texto volverá tras cuatro segundos. Después responde una pregunta sin consultar el texto.</p><p>Las pantallas avanzan automáticamente si se agota su tiempo. Mantén esta pestaña y el tamaño de la ventana durante la tarea.</p><button id="begin">Empezar las cuatro lecturas</button>');
 document.querySelector('#begin').onclick=run;
}
class ReadingTrial {
 static info={name:'eme-reading',version:'1.0.0',parameters:{},data:{}};
 constructor(jsPsych){this.jsPsych=jsPsych;}
 trial(display,trial){
  const {item,segmented,interrupted}=trial.condition,t0=performance.now();let ended=false,blocked=false,interruptionStart=null,interruptionEnd=null,interruptResponse=null,interruptRT=null;
  const samples={n:0,inside:0,post_n:0,post_inside:0,return_ms:null,run:0};let gazeLast=-Infinity;
  const options=shuffle(item.options.map((text,i)=>({text,index:i})),rng);let rect;
  display.innerHTML=`<p class="trial-progress">Lectura ${trial.order+1} de 4</p><div id="passage" class="reading">${esc(renderText(item,segmented))}</div><div class="buttons"><button id="done" disabled>He terminado</button></div>`;
  const passage=display.querySelector('#passage');rect=passage.getBoundingClientRect();const button=display.querySelector('#done');
  const gaze=(d,t)=>{if(t-gazeLast<95||blocked)return;gazeLast=t;samples.n++;const inside=d.x>=rect.left&&d.x<=rect.right&&d.y>=rect.top&&d.y<=rect.bottom;if(inside)samples.inside++;if(interruptionEnd!==null){samples.post_n++;if(inside)samples.post_inside++;samples.run=inside?samples.run+1:0;if(samples.run===3&&samples.return_ms===null)samples.return_ms=Math.round(t-interruptionEnd);}};
  if(camera)gazeHandler=gaze;
  const local=[];const later=(fn,ms)=>{const t=after(fn,ms);local.push(t);return t;};
  later(()=>{button.disabled=false;},interrupted?C.interruptAtMs+C.interruptionMs+1500:C.interruptAtMs+1500);
  if(interrupted)later(()=>{
   blocked=true;interruptionStart=performance.now();const number=2+Math.floor(rng()*7);
   const overlay=document.createElement('div');overlay.className='overlay';overlay.innerHTML=`<div class="panel"><p>Indica si este número es par o impar.</p><p class="number">${number}</p><div class="buttons"><button data-parity="0">Par</button><button data-parity="1">Impar</button></div><p class="muted">El texto volverá automáticamente.</p></div>`;document.body.append(overlay);
   overlay.querySelectorAll('button').forEach(b=>b.onclick=()=>{interruptResponse=Number(b.dataset.parity)===(number%2);interruptRT=Math.round(performance.now()-interruptionStart);overlay.querySelectorAll('button').forEach(x=>x.disabled=true);});
   later(()=>{overlay.remove();interruptionEnd=performance.now();blocked=false;},C.interruptionMs);
  },C.interruptAtMs);
  const finishReading=timedOut=>{
   if(ended||blocked||stopped)return;ended=true;for(const t of local)clearTimeout(t);gazeHandler=null;
   const wall=Math.round(performance.now()-t0),pause=interruptionEnd===null?0:interruptionEnd-interruptionStart;
   const record={item_id:item.id,order:trial.order,segmented:Number(segmented),interrupted:Number(interrupted),reading_active_ms:Math.round(wall-pause),reading_wall_ms:wall,timed_out:timedOut,interrupt_correct:interruptResponse,interrupt_rt_ms:interruptRT,interruption_actual_ms:Math.round(pause),gaze_n:samples.n,gaze_inside:samples.inside,gaze_return_ms:samples.return_ms,gaze_post_n:samples.post_n,gaze_post_inside:samples.post_inside,aoi:{x:Math.round(rect.x),y:Math.round(rect.y),w:Math.round(rect.width),h:Math.round(rect.height)}};
   display.innerHTML=`<p class="trial-progress">Pregunta ${trial.order+1} de 4</p><h2>${esc(item.question)}</h2><div class="buttons">${options.map((o,i)=>`<button data-choice="${i}">${esc(o.text)}</button>`).join('')}</div>`;
   const q0=performance.now();let answered=false;
   const answer=choice=>{if(answered||stopped)return;answered=true;clearTimeout(qTimer);record.response=choice;record.correct=choice===null?null:Number(choice===item.answer);record.question_rt_ms=choice===null?null:Math.round(performance.now()-q0);session.trials.push(record);this.jsPsych.finishTrial(record);};
   const qTimer=after(()=>answer(null),C.answerMs);
   display.querySelectorAll('button').forEach(b=>b.onclick=()=>answer(options[Number(b.dataset.choice)].index));
  };
  button.onclick=()=>finishReading(false);
  later(()=>finishReading(true),C.readingMs+(interrupted?C.interruptionMs:0));
 }
}
function run(){
 if(stopped)return;
 if(C.totalBudgetMs-elapsed()<C.taskBudgetMs+10000){exit('timeout');return;}
 session.task_start_ms=elapsed();session.quality={hidden:0,resize:0};app.innerHTML='';
 jsPsych=initJsPsych({display_element:app,on_finish:finish,on_close:stopCamera});
 jsPsych.run(schedule(session.list_id,session.bank_id,rng).map((condition,order)=>({type:ReadingTrial,condition,order})));
}
function finish(){
 if(stopped)return;stopCamera();clearTimers();session.elapsed_ms=elapsed();
 view(`<h1>Has terminado las lecturas</h1><p>Estudiamos si la puntuación que divide un texto en unidades más cortas ayuda a leer cuando aparecen interrupciones.</p><p>Tu código: <strong>${session.session_id}</strong>. Consérvalo si deseas solicitar la retirada de los datos durante los próximos ${C.retentionMonths} meses.</p><p>${C.mode==='demo'?'Esta demostración no enviará datos.':'Puedes confirmar el envío de tus respuestas o descartarlas.'}</p><div class="buttons"><button id="send">${C.mode==='demo'?'Finalizar demostración':'Enviar mis respuestas'}</button><button class="secondary" id="discard">Descartar</button></div><p id="delivery" role="status"></p>`);
 document.querySelector('#discard').onclick=()=>exit();document.querySelector('#send').onclick=send;
}
let bridge=null,bridgeOrigin=null,bridgeWindow=null;const bridgeChannel=crypto.randomUUID();
async function deliver(payload){
 return new Promise((resolve,reject)=>{
  const requestId=crypto.randomUUID();let ready=false;
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',handler);};
  const handler=e=>{
   if(e.data?.channel!==bridgeChannel||!/^https:\/\/([a-z0-9-]+[.-])?script\.googleusercontent\.com$/.test(e.origin))return;
   if(bridgeWindow&&e.source!==bridgeWindow)return;
   if(e.data?.type==='eme-ready'){bridgeOrigin=e.origin;bridgeWindow=e.source;ready=true;bridgeWindow.postMessage({type:'eme-save',channel:bridgeChannel,requestId,payload},bridgeOrigin);}
   if(e.data?.type==='eme-saved'&&e.data.requestId===requestId){cleanup();e.data.ok?resolve(e.data):reject(new Error(e.data.error||'No se confirmó el envío'));}
  };
  window.addEventListener('message',handler);
  const timer=setTimeout(()=>{cleanup();reject(new Error('No se ha recibido confirmación.'));},12000);
  if(!bridge){bridge=document.createElement('iframe');bridge.id='bridge';bridge.src=C.endpoint+'?channel='+bridgeChannel;bridge.title='Receptor de respuestas';document.body.append(bridge);}
  else if(bridgeOrigin){ready=true;bridgeWindow.postMessage({type:'eme-save',channel:bridgeChannel,requestId,payload},bridgeOrigin);}else bridge.src=C.endpoint+'?channel='+bridgeChannel;
 });
}
async function send(){
 const btn=document.querySelector('#send'),status=document.querySelector('#delivery');btn.disabled=true;
 if(C.mode==='demo'){clearTimeout(watchdog);submitted=true;session.trials=[];exitButton.hidden=true;view('<h1>Demostración finalizada</h1><p>No se ha enviado ningún dato. Gracias por probar el estudio.</p>');return;}
 // Esta acción constituye la confirmación de envío; ya no se ofrece una retirada
 // local que pudiera prometer borrar un envío en curso. Retirada posterior por código.
 clearTimeout(watchdog);exitButton.hidden=true;document.querySelector('#discard').hidden=true;
 status.textContent='Enviando y esperando confirmación de Google Sheets…';
 try{await deliver({...session,mode:'live'});submitted=true;status.textContent='Google Sheets ha confirmado la recepción. Ya puedes cerrar la pestaña.';btn.hidden=true;}
 catch(e){status.textContent='No podemos confirmar la recepción. Puedes reintentar sin duplicar la sesión. Para retirar un envío que haya llegado, escribe al investigador con tu código.';btn.disabled=false;btn.textContent='Reintentar envío';}
}
landing();
