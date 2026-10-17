import {CONFIG as C} from './config.js';
import {schedule,renderText,mulberry32,shuffle} from './stimuli.js';
const app=document.querySelector('#app'),exitButton=document.querySelector('#withdraw');
const start=performance.now();
let stopped=false,submitted=false,watchdog,jsPsych,gazeHandler=null,camera=false,lastEyeFeatures=null;
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
function stopCamera(){
 gazeHandler=null;camera=false;lastEyeFeatures=null;
 document.querySelectorAll('video').forEach(v=>v.srcObject?.getTracks().forEach(t=>t.stop()));
 if(window.webgazer){
  try{window.webgazer.clearGazeListener();window.webgazer.end();}catch{}
  // La versión fijada de end() puede fallar al quitar un vídeo anidado.
  try{window.webgazer.clearData();}catch{}
 }
 document.querySelectorAll('#webgazerVideoContainer,#webgazerGazeDot,#webgazerVideoFeed,#webgazerVideoCanvas,#webgazerFaceOverlay,#webgazerFaceFeedbackBox').forEach(e=>e.remove());
}
function exit(reason='withdrawn'){
 if(stopped||submitted)return;stopped=true;clearTimers();clearTimeout(watchdog);stopCamera();
 document.querySelectorAll('.overlay,.dot').forEach(e=>e.remove());exitButton.hidden=true;
 session.trials=[];session.validation=[];
 view(`<h1>${reason==='timeout'?'Tiempo finalizado':reason==='camera'?'No se pudo registrar la mirada':'Has salido del estudio'}</h1>${reason==='camera'?'<p>El estudio requiere la cámara activa y datos de mirada en cada lectura. Puedes recargar para intentarlo de nuevo.</p>':''}<p>No se han enviado tus respuestas. La cámara está apagada y los datos de esta sesión se han descartado.</p><p>Puedes cerrar esta pestaña.</p>`);
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
 <p>No pedimos tu nombre ni correo. Guardamos respuestas, tiempos, datos demográficos y medidas técnicas con un identificador interno de sesión. Para participar es obligatorio usar la cámara: estima la mirada en tu ordenador, sin grabar ni enviar imágenes, vídeo o audio. Durante las lecturas guardamos las coordenadas estimadas de la mirada en la pantalla y el tiempo de cada muestra, además de los resúmenes de mirada y precisión de calibración.</p>
 <p>En el estudio activo, tus respuestas se enviarán automáticamente a una hoja privada de Google Sheets al terminar las cuatro lecturas y sus preguntas. Conservaremos los datos ${C.retentionMonths} meses y publicaremos resultados agregados. GitHub, Google y los proveedores de bibliotecas reciben datos técnicos de conexión.</p>
 <p>Puedes retirarte del estudio en cualquier momento. Si sales antes del envío, se descartan tus respuestas. Puedes contactar conmigo para conocer los resultados del estudio. Consentimiento ${esc(C.consent)}.</p></details>
 <form id="consent"><label><input type="checkbox" required name="adult">Tengo 18 años o más y puedo leer español con fluidez.</label><label><input type="checkbox" required name="agree">He leído la información y acepto participar y el tratamiento descrito.</label><label><input type="checkbox" required name="webcam">Acepto usar mi cámara y guardar las coordenadas y tiempos de mi mirada durante las lecturas. Es obligatorio para participar.</label><div class="buttons"><button type="submit">Continuar</button><button type="button" class="secondary" id="decline">No participar</button></div></form>`);
 document.querySelector('#decline').onclick=()=>exit();
 document.querySelector('#consent').onsubmit=e=>{e.preventDefault();if(!e.target.reportValidity()||!new FormData(e.target).has('webcam'))return;session.consent_accepted=true;session.camera_consent=true;session.consent_elapsed_ms=elapsed();exitButton.hidden=false;demographics();};
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
 document.querySelector('#demo').onsubmit=e=>{e.preventDefault();Object.assign(session,Object.fromEntries(new FormData(e.target)));cameraIntro();};
}
function cameraIntro(){view('<h1>Preparar la cámara</h1><p>Busca buena iluminación. Mantén la cabeza fija, sin moverla ni girarla, durante la calibración y la comprobación. Dirige la mirada al centro de cada punto, tanto cuando hagas clic como cuando solo tengas que mirarlo. Para seguir los puntos, mueve únicamente los ojos. La cámara es obligatoria para participar.</p><button id="camera">Activar cámara</button>');document.querySelector('#camera').onclick=initCamera;}
function cameraProblem(message,retry=true){
 if(stopped)return;stopCamera();
 view(`<h1>Comprueba la cámara</h1><p>${message}</p><p>Para continuar necesitas activar la cámara y superar la comprobación de la mirada. También puedes salir del estudio.</p><button id="retry-camera">${retry?'Reintentar cámara y calibración':'Recargar para reintentar'}</button>`);
 document.querySelector('#retry-camera').onclick=retry?initCamera:()=>window.location.reload();
}
async function initCamera(){
 if(stopped)return;if(!session.camera_consent){exit('camera');return;}
 session.validation=[];session.gaze_status='failed';lastEyeFeatures=null;
 view('<h1>Conectando la cámara…</h1><p>Acepta el permiso de cámara del navegador para participar. No se solicitará micrófono.</p>');
 let abandoned=false,initializing=true;const fail=(error)=>{if(abandoned||stopped)return;abandoned=true;clearTimeout(timeout);stopCamera();session.gaze_status='failed';
 const message=error?.name==='NotAllowedError'?'El navegador no ha permitido la cámara. Revisa el permiso de cámara de esta página.':error?.name==='NotFoundError'?'No se ha encontrado una cámara conectada.':'No se pudo iniciar la cámara. Comprueba los permisos y que otra aplicación no la esté usando.';
 cameraProblem(message,!initializing);
 };
 const timeout=after(fail,25000);
 try{
  if(!window.webgazer)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=C.webgazerURL;s.onload=resolve;s.onerror=reject;document.head.append(s);});
  if(abandoned||stopped)return;
  window.saveDataAcrossSessions=false;await window.webgazer.clearData();
  window.webgazer.setGazeListener((data)=>{if(data?.eyeFeatures)lastEyeFeatures=data.eyeFeatures;if(Number.isFinite(data?.x)&&Number.isFinite(data?.y)&&gazeHandler)gazeHandler(data,performance.now());});
  await window.webgazer.begin();initializing=false;
  if(abandoned||stopped){stopCamera();return;}
  window.webgazer.removeMouseEventListeners();
  window.webgazer.showPredictionPoints(false);window.webgazer.showVideo(true);window.webgazer.showFaceOverlay(true);window.webgazer.showFaceFeedbackBox(true);window.webgazer.showVideoPreview(true);camera=true;
  document.querySelector('#webgazerVideoContainer')?.classList.remove('tracking-video');
  const video=document.querySelector('#webgazerVideoFeed');if(video){video.muted=true;await video.play();}
  if(abandoned||stopped){stopCamera();return;}
  document.querySelectorAll('video').forEach(v=>v.srcObject?.getVideoTracks().forEach(t=>t.addEventListener('ended',()=>exit('camera'),{once:true})));
  view('<h1>Ajusta tu posición</h1><p>Comprueba que se ve tu rostro y mantén la cámara activa durante todo el estudio.</p><p id="face-status" role="status">Esperando a que se detecte tu rostro. Mira hacia la pantalla.</p><button id="ready" disabled>Calibrar: mirar y pulsar puntos</button>');
  const ready=document.querySelector('#ready');ready.onclick=calibrate;
  const checkFace=()=>{if(abandoned||stopped)return;if(faceReady()){clearTimeout(timeout);ready.disabled=false;document.querySelector('#face-status').textContent='Rostro detectado. Ya puedes comenzar la calibración.';}else after(checkFace,100);};checkFace();
 }catch(error){initializing=false;fail(error);}
}
function faceReady(){return Boolean(camera&&window.webgazer.isReady()&&window.webgazer.getTracker().getPositions()?.length);}
function calibrate(){
 if(stopped)return;if(!camera||!session.camera_consent){cameraProblem('La cámara debe estar activa para calibrar.');return;}
 if(!faceReady()){cameraProblem('No se detecta tu rostro. Mira hacia la pantalla y revisa la iluminación.');return;}
 session.validation=[];session.gaze_status='failed';
 // Mantener el vídeo renderizado evita depender de la reproducción con display:none.
 window.webgazer.showFaceOverlay(false);window.webgazer.showFaceFeedbackBox(false);
 document.querySelector('#webgazerVideoContainer')?.classList.add('tracking-video');
 view('<h1>Calibración</h1><p>Mantén la cabeza fija, sin moverla ni girarla. Mira el centro de cada punto y haz dos clics separados, esperando a que el punto vuelva a ponerse rojo. No hagas doble clic. Cuando cambie de posición, mueve únicamente los ojos para mirar el siguiente punto y repite.</p><p id="calibration-status" role="status"></p>');
 const points=shuffle([[15,20],[50,20],[85,20],[15,50],[50,50],[85,50],[15,80],[50,80],[85,80]],rng);let i=0,count=0;
 const b=document.createElement('button');b.className='dot';b.setAttribute('aria-label','Punto de calibración');document.body.append(b);
 const status=document.querySelector('#calibration-status'),video=document.querySelector('#webgazerVideoFeed');let previousEyes=null;
 const arm=delay=>{b.disabled=true;after(()=>{let positions=window.webgazer.getTracker().getPositions(),newFrames=0;const videoTime=video?.currentTime;
  const fresh=()=>{if(b.removed||stopped)return;const current=window.webgazer.getTracker().getPositions();if(current&&current!==positions){positions=current;newFrames++;}if(faceReady()&&newFrames>=2&&(!video||video.currentTime>videoTime)&&(!previousEyes||lastEyeFeatures&&lastEyeFeatures!==previousEyes)){b.disabled=false;status.textContent=count?'Haz el segundo clic sin apartar la mirada.':'Mira el centro del punto y haz el primer clic.';}else{status.textContent='Mantén la mirada en el punto. Esperando una imagen nueva de la cámara.';after(fresh,50);}};fresh();
 },delay);};
 const place=()=>{b.style.left=points[i][0]+'vw';b.style.top=points[i][1]+'vh';arm(1000);};place();
 const timeout=after(()=>{b.removed=true;b.remove();session.gaze_status='failed';cameraProblem('La calibración no ha recibido suficientes imágenes nuevas a tiempo. Comprueba que la vista previa se mueve al ajustar tu posición.');},60000);
 b.onclick=()=>{if(b.disabled||stopped)return;if(!faceReady()){status.textContent='Se ha perdido el seguimiento del rostro. Mira hacia la pantalla.';arm(300);return;}const model=window.webgazer.getRegression()[0],before=model.getData().length,r=b.getBoundingClientRect();window.webgazer.recordScreenPosition(r.x+r.width/2,r.y+r.height/2,'click');if(model.getData().length===before){status.textContent='No se ha registrado una imagen de los ojos. Mantén la mirada en el punto.';arm(300);return;}previousEyes=model.getData().at(-1).eyes;status.textContent='';if(++count===2){count=0;if(++i===points.length){clearTimeout(timeout);b.removed=true;b.remove();validate();}else place();}else arm(300);};
}
function validate(){
 view('<h1>Calibración completada</h1><p>Ahora verás cinco puntos que cambian de posición solos. Mantén la cabeza fija, sin moverla ni girarla, y mira el centro de cada punto hasta que cambie de posición. Sigue cada punto moviendo únicamente los ojos, sin hacer clic.</p><button id="validate">Comenzar comprobación</button>');
 document.querySelector('#validate').onclick=validateGaze;
}
function validateGaze(){
 view('<h1>Comprobación de la mirada</h1><p>Mantén la cabeza fija, sin moverla ni girarla. Mira el centro de cada punto hasta que cambie de posición y sigue el siguiente moviendo únicamente los ojos, sin hacer clic. Esta fase mide la precisión; no entrena el sistema.</p>');
 const points=[[25,30],[75,30],[50,50],[25,70],[75,70]];let i=0;const centers=[],completeWindows=[];
 const b=document.createElement('span');b.className='dot';document.body.append(b);
 function next(){if(i===points.length){b.remove();gazeHandler=null;const valid=session.validation.length===5&&completeWindows.every(Boolean)&&session.validation.every(v=>v.n>=5&&v.in_roi>=.5);session.gaze_status=valid?'valid':'invalid';if(valid)instructions();else{
  const enough=completeWindows.every(Boolean)&&session.validation.every(v=>v.n>=5),staticGaze=centers.length===5&&centers.every(p=>Math.hypot(p.x-centers[0].x,p.y-centers[0].y)<30);
  cameraProblem(!enough?'No llegan suficientes muestras nuevas de mirada. La vista previa puede mostrar el rostro aunque el seguimiento no se actualice.':staticGaze?'La estimación permanece en la misma zona aunque los puntos cambien. El seguimiento no está distinguiendo la dirección de la mirada. Prueba a abrir el estudio en Chrome o Edge.':'Se recibe la mirada, pero su posición no coincide con los puntos con suficiente precisión. Mantén la cabeza fija y vuelve a calibrar.');
 }return;}
  const [px,py]=points[i++],x=innerWidth*px/100,y=innerHeight*py/100;b.style.left=px+'vw';b.style.top=py+'vh';const shown=performance.now();let errors=[],samples=[],warmFrames=0,measureStart=null,previousFeatures=null,done=false,measureTimer;
  const finishPoint=force=>{if(done||(!force&&(measureStart===null||performance.now()-measureStart<1500||errors.length<5)))return;done=true;clearTimeout(limit);clearTimeout(measureTimer);gazeHandler=null;const duration=measureStart===null?0:performance.now()-measureStart;completeWindows.push(duration>=1500);
   session.validation.push({x,y,n:errors.length,in_roi:errors.length?errors.filter(e=>e<=150).length/errors.length:0,mean_error_px:errors.length?Math.round(errors.reduce((a,b)=>a+b,0)/errors.length):null,samples_per_sec:duration?errors.length*1000/duration:0});
   if(samples.length)centers.push({x:samples.reduce((n,p)=>n+p.x,0)/samples.length,y:samples.reduce((n,p)=>n+p.y,0)/samples.length});next();
  };
  const limit=after(()=>finishPoint(true),7000);
  gazeHandler=(d,t)=>{if(d.eyeFeatures&&d.eyeFeatures===previousFeatures)return;previousFeatures=d.eyeFeatures;const captured=Number.isFinite(d.t)?d.t:t;if(captured<shown)return;
   if(measureStart===null){warmFrames++;if(captured-shown>=1200&&warmFrames>=6){measureStart=t;measureTimer=after(()=>finishPoint(false),1500);}return;}
   errors.push(Math.hypot(d.x-x,d.y-y));samples.push({x:d.x,y:d.y});finishPoint(false);
  };
 }next();
}
function instructions(){
 if(stopped)return;
 if(!session.camera_consent||!camera||session.gaze_status!=='valid'){cameraProblem('Falta una comprobación válida de la mirada.');return;}
 if(C.totalBudgetMs-elapsed()<C.taskBudgetMs+10000){exit('timeout');return;}
 view('<h1>Cómo participar</h1><p>Lee cada texto para comprenderlo. Pulsa «He terminado» cuando acabes. Si aparece un número, indica si es par o impar; el texto volverá tras cuatro segundos. Después responde una pregunta sin consultar el texto.</p><p>Las pantallas avanzan automáticamente si se agota su tiempo. Mantén esta pestaña y el tamaño de la ventana durante la tarea.</p><button id="begin">Empezar las cuatro lecturas</button>');
 document.querySelector('#begin').onclick=run;
}
class ReadingTrial {
 static info={name:'eme-reading',version:'1.0.0',parameters:{},data:{}};
 constructor(jsPsych){this.jsPsych=jsPsych;}
 trial(display,trial){
  const {item,segmented,interrupted}=trial.condition,t0=performance.now();let ended=false,blocked=false,interruptionStart=null,interruptionEnd=null,interruptResponse=null,interruptRT=null;
  const samples={n:0,inside:0,post_n:0,post_inside:0,return_ms:null,run:0,path:[]};let gazeLast=-Infinity;
  const options=shuffle(item.options.map((text,i)=>({text,index:i})),rng);let rect;
  display.innerHTML=`<p class="trial-progress">Lectura ${trial.order+1} de 4</p><div id="passage" class="reading">${esc(renderText(item,segmented))}</div><div class="buttons"><button id="done" disabled>He terminado</button></div>`;
  const passage=display.querySelector('#passage');rect=passage.getBoundingClientRect();const button=display.querySelector('#done');
  const gaze=(d,t)=>{if(t-gazeLast<95||blocked||samples.path.length>=350)return;const x=Math.round(d.x),y=Math.round(d.y);if(Math.abs(x)>100000||Math.abs(y)>100000)return;gazeLast=t;samples.n++;samples.path.push([Math.round(t-t0),x,y]);const inside=d.x>=rect.left&&d.x<=rect.right&&d.y>=rect.top&&d.y<=rect.bottom;if(inside)samples.inside++;if(interruptionEnd!==null){samples.post_n++;if(inside)samples.post_inside++;samples.run=inside?samples.run+1:0;if(samples.run===3&&samples.return_ms===null)samples.return_ms=Math.round(t-interruptionEnd);}};
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
   const record={item_id:item.id,order:trial.order,segmented:Number(segmented),interrupted:Number(interrupted),reading_active_ms:Math.round(wall-pause),reading_wall_ms:wall,timed_out:timedOut,interrupt_correct:interruptResponse,interrupt_rt_ms:interruptRT,interruption_actual_ms:Math.round(pause),interruption_start_ms:interruptionStart===null?null:Math.round(interruptionStart-t0),interruption_end_ms:interruptionEnd===null?null:Math.round(interruptionEnd-t0),gaze_n:samples.n,gaze_inside:samples.inside,gaze_return_ms:samples.return_ms,gaze_post_n:samples.post_n,gaze_post_inside:samples.post_inside,gaze_path:samples.path,aoi:{x:Math.round(rect.x),y:Math.round(rect.y),w:Math.round(rect.width),h:Math.round(rect.height)}};
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
 if(!session.camera_consent||!camera||session.gaze_status!=='valid'){cameraProblem('Falta una comprobación válida de la mirada.');return;}
 if(C.totalBudgetMs-elapsed()<C.taskBudgetMs+10000){exit('timeout');return;}
 session.task_start_ms=elapsed();session.quality={hidden:0,resize:0};app.innerHTML='';
 jsPsych=initJsPsych({display_element:app,on_finish:finish,on_close:stopCamera});
 jsPsych.run(schedule(session.list_id,session.bank_id,rng).map((condition,order)=>({type:ReadingTrial,condition,order})));
}
function finish(){
 if(stopped)return;
 if(!session.camera_consent||session.gaze_status!=='valid'||session.trials.length!==4||session.trials.some(t=>!(t.gaze_n>0))){exit('camera');return;}
 stopCamera();clearTimers();session.elapsed_ms=elapsed();
 view(`<h1>Has terminado las lecturas</h1><p>Estudiamos si la puntuación que divide un texto en unidades más cortas ayuda a leer cuando aparecen interrupciones.</p><p>Para solicitar la retirada de tus datos, contacta con el investigador: <a href="mailto:${esc(C.email)}">${esc(C.email)}</a>.</p><p>${C.mode==='demo'?'Esta demostración no enviará datos.':'Tus respuestas se envían automáticamente. Mantén esta pestaña abierta hasta recibir la confirmación.'}</p><div class="buttons"><button id="send" ${C.mode==='live'?'hidden':''}>${C.mode==='demo'?'Finalizar demostración':'Enviar mis respuestas'}</button><button class="secondary" id="discard">Descartar</button></div><p id="delivery" role="status"></p>`);
 document.querySelector('#discard').onclick=()=>exit();document.querySelector('#send').onclick=send;
 if(C.mode==='live')send();
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
 // El envío comienza automáticamente al terminar; ya no se ofrece una retirada
 // local que pudiera prometer borrar un envío en curso. Retirada posterior por contacto.
 clearTimeout(watchdog);exitButton.hidden=true;document.querySelector('#discard').hidden=true;
 status.textContent='Enviando y esperando confirmación de Google Sheets…';
 try{await deliver({...session,mode:'live'});submitted=true;status.textContent='Google Sheets ha confirmado la recepción. Ya puedes cerrar la pestaña.';btn.hidden=true;}
 catch(e){status.textContent='No podemos confirmar la recepción. Puedes reintentar sin duplicar la sesión. Para solicitar la retirada de un envío que haya llegado, escribe al investigador.';btn.hidden=false;btn.disabled=false;btn.textContent='Reintentar envío';}
}
landing();
