/* Google Apps Script V8. Hoja privada: no se publica ni se envía su contenido al cliente.
 * Configurar las propiedades del script (Configuración del proyecto):
 * SHEET_ID, ALLOWED_ORIGIN, COLLECTION_OPEN ('true' para aceptar).
 * ALLOWED_ORIGIN = https://anibalmastobiza.github.io (sin ruta ni barra final).
 */
const HEADERS=['received_at_utc','session_id','protocol_version','consent_version','age_band','spanish_level','education','reading_frequency','gender','list_id','bank_id','elapsed_ms','gaze_status','validation_json','viewport_json','quality_json','trials_json'];
function doGet(){
 const t=HtmlService.createTemplateFromFile('Bridge');
 t.origin=PropertiesService.getScriptProperties().getProperty('ALLOWED_ORIGIN')||'';
 return t.evaluate().setTitle('Receptor EME').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function assert_(x,m){if(!x)throw new Error(m);}
function enum_(v,values){assert_(values.indexOf(v)>=0,'Valor no permitido');return v;}
function num_(v,min,max,nullable){if(nullable&&v===null)return null;assert_(typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max,'Número fuera de rango');return v;}
function integer_(v,min,max){num_(v,min,max,false);assert_(Number.isInteger(v),'Entero requerido');return v;}
function validate_(p){
 assert_(p&&JSON.stringify(p).length<30000,'Solicitud inválida o demasiado grande');
 assert_(p.mode==='live'&&p.consent_accepted===true,'Sin consentimiento');
 assert_(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(p.session_id),'Identificador inválido');
 assert_(p.protocol_version==='EME-INT-1.0.0'&&p.consent_version==='EME-CI-1.0.0','Versión incorrecta');
 integer_(p.list_id,0,3);integer_(p.bank_id,0,1);num_(p.elapsed_ms,1000,300000);
 assert_(typeof p.camera_consent==='boolean','Falta consentimiento de cámara');
 enum_(p.gaze_status,['valid','invalid','declined','failed']);
 if(!p.camera_consent)assert_(p.gaze_status==='declined','Cámara no consentida');
 assert_(Array.isArray(p.trials)&&p.trials.length===4,'Se requieren cuatro ensayos');
 const answers=[0,1,2,1,0,2,1,0],seen={};
 const trials=p.trials.map((t,order)=>{
  assert_(/^S0[1-8]$/.test(t.item_id)&&!seen[t.item_id],'Ítem inválido o repetido');seen[t.item_id]=true;
  const idx=Number(t.item_id.slice(1))-1;assert_(Math.floor(idx/4)===p.bank_id,'Banco incorrecto');
  assert_(t.order===order,'Orden incorrecto');
  const condition=(idx%4+p.list_id)%4;
  assert_(t.segmented===Number(condition>=2)&&t.interrupted===condition%2,'Condición incorrecta');
  if(t.response!==null)integer_(t.response,0,2);
  assert_(typeof t.timed_out==='boolean','Falta censura');
  const r={item_id:t.item_id,order,segmented:t.segmented,interrupted:t.interrupted,response:t.response,correct:t.response===null?null:Number(t.response===answers[idx]),timed_out:t.timed_out};
  ['reading_active_ms','reading_wall_ms','interruption_actual_ms'].forEach(k=>r[k]=num_(t[k],0,300000));
  ['question_rt_ms','interrupt_rt_ms','gaze_return_ms'].forEach(k=>r[k]=num_(t[k],0,300000,true));
  r.interrupt_correct=enum_(t.interrupt_correct,[true,false,null]);
  ['gaze_n','gaze_inside','gaze_post_n','gaze_post_inside'].forEach(k=>r[k]=integer_(t[k],0,10000));
  assert_(r.gaze_inside<=r.gaze_n&&r.gaze_post_inside<=r.gaze_post_n,'Conteos de mirada inválidos');
  if(!p.camera_consent)assert_(r.gaze_n===0&&r.gaze_return_ms===null,'Mirada sin consentimiento');
  r.aoi={};['x','y','w','h'].forEach(k=>r.aoi[k]=num_(t.aoi[k],0,20000));return r;
 });
 assert_(Array.isArray(p.validation)&&p.validation.length<=5,'Validación inválida');
 if(!p.camera_consent)assert_(p.validation.length===0,'Validación sin consentimiento');
 const points=p.validation.map(v=>({x:num_(v.x,0,20000),y:num_(v.y,0,20000),n:integer_(v.n,0,1000),in_roi:num_(v.in_roi,0,1),mean_error_px:num_(v.mean_error_px,0,30000,true),samples_per_sec:num_(v.samples_per_sec,0,1000)}));
 assert_(p.gaze_status!=='valid'||(points.length===5&&points.every(v=>v.n>=5&&v.in_roi>=.5)),'Validación insuficiente');
 const viewport={width:integer_(p.viewport.width,0,20000),height:integer_(p.viewport.height,0,20000),dpr:num_(p.viewport.dpr,.1,20)};
 const quality={hidden:integer_(p.quality.hidden,0,10000),resize:integer_(p.quality.resize,0,10000),consent_elapsed_ms:num_(p.consent_elapsed_ms,0,300000),task_start_ms:num_(p.task_start_ms,0,300000)};
 return [new Date().toISOString(),p.session_id,p.protocol_version,p.consent_version,
  enum_(p.age_band,['18-29','30-44','45-59','60+']),enum_(p.spanish_level,['native','advanced']),
  enum_(p.education,['','secondary','vocational','university']),enum_(p.reading_frequency,['','rare','weekly','daily']),enum_(p.gender,['','woman','man','other']),
  p.list_id,p.bank_id,p.elapsed_ms,p.gaze_status,JSON.stringify({camera_consent:p.camera_consent,points}),JSON.stringify(viewport),JSON.stringify(quality),JSON.stringify(trials)];
}
function saveSession(p){
 const props=PropertiesService.getScriptProperties();
 assert_(props.getProperty('COLLECTION_OPEN')==='true','La recogida está cerrada');
 const row=validate_(p),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{
  const sheet=SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('Sesiones');
  assert_(sheet,'Falta la pestaña Sesiones');
  assert_(JSON.stringify(sheet.getRange(1,1,1,HEADERS.length).getValues()[0])===JSON.stringify(HEADERS),'Cabecera incompatible');
  const last=sheet.getLastRow();
  if(last>1&&sheet.getRange(2,2,last-1,1).createTextFinder(p.session_id).matchEntireCell(true).findNext())return {ok:true,duplicate:true,session_id:p.session_id};
  const today=new Date().toISOString().slice(0,10),key='DAY_'+today;
  const count=Number(props.getProperty(key)||0);assert_(count<1000,'Límite diario alcanzado');
  sheet.getRange(last+1,1,1,row.length).setValues([row]);SpreadsheetApp.flush();
  props.setProperty(key,String(count+1));return {ok:true,session_id:p.session_id};
 }finally{lock.releaseLock();}
}
// Ejecutar únicamente desde el editor del investigador. Las funciones con sufijo _
// son privadas para google.script.run. No existe API pública de lectura/borrado.
function purgeExpired_(){
 const p=PropertiesService.getScriptProperties(),lock=LockService.getScriptLock();lock.waitLock(10000);
 try{const s=SpreadsheetApp.openById(p.getProperty('SHEET_ID')).getSheetByName('Sesiones');
  const cutoff=new Date();cutoff.setUTCMonth(cutoff.getUTCMonth()-12);
  if(s.getLastRow()<2)return;
  const dates=s.getRange(2,1,s.getLastRow()-1,1).getValues();
  for(let i=dates.length-1;i>=0;i--)if(new Date(dates[i][0])<cutoff)s.deleteRow(i+2);
 }finally{lock.releaseLock();}
}
function installRetentionTrigger_(){
 if(!ScriptApp.getProjectTriggers().some(t=>t.getHandlerFunction()==='purgeExpired_'))ScriptApp.newTrigger('purgeExpired_').timeBased().everyDays(1).create();
}
