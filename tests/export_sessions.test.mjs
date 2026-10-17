import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const exporter=fileURLToPath(new URL('../scripts/export_sessions.py',import.meta.url));
const fixtureProgram=`
import csv, importlib.util, json, pathlib, sys
spec=importlib.util.spec_from_file_location('export_sessions',sys.argv[1])
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
folder=pathlib.Path(sys.argv[2])
sessions=json.loads(sys.argv[3])
source=folder/'sessions.csv'
destination=folder/'trials.csv'
with source.open('w',encoding='utf-8',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=list(sessions[0]))
    writer.writeheader()
    writer.writerows(sessions)
module.convert(source,destination)
with destination.open(encoding='utf-8',newline='') as f:
    reader=csv.DictReader(f)
    rows=list(reader)
    print(json.dumps({'fields':reader.fieldnames,'rows':rows}))
`;

function session(id,version,trial){
  return {session_id:id,protocol_version:version,age_band:'30-44',spanish_level:'native',education:'',reading_frequency:'',gender:'',list_id:0,bank_id:0,elapsed_ms:150000,gaze_status:'valid',quality_json:JSON.stringify({hidden:0,resize:0}),trials_json:JSON.stringify([trial])};
}

function convert(sessions){
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'eme-export-test-'));
  try{
    const result=spawnSync('python3',['-B','-c',fixtureProgram,exporter,folder,JSON.stringify(sessions)],{encoding:'utf8'});
    assert.ifError(result.error);
    assert.equal(result.status,0,result.stderr);
    return JSON.parse(result.stdout.trim().split('\n').at(-1));
  }finally{fs.rmSync(folder,{recursive:true,force:true});}
}

test('Exporta versiones mezcladas con unión de columnas independiente del orden',()=>{
  const aoi={x:300,y:200,w:600,h:300};
  const oldTrial={item_id:'fixture-old',gaze_n:2,gaze_inside:1,aoi};
  const gazePath=[[0,-12,240],[100,451,820]];
  const newTrial={item_id:'fixture-new',gaze_n:2,gaze_inside:1,gaze_path:gazePath,interruption_start_ms:7000,interruption_end_ms:11000,aoi};
  const sessions=[session('fixture-old','EME-INT-1.0.0',oldTrial),session('fixture-new','EME-INT-1.1.0',newTrial)];
  const forward=convert(sessions);
  const reverse=convert([...sessions].reverse());
  assert.deepEqual(forward.fields,reverse.fields);
  assert.equal(forward.rows.length,2);
  assert.equal(forward.rows[0].gaze_path,'');
  assert.equal(forward.rows[0].interruption_start_ms,'');
  assert.deepEqual(JSON.parse(forward.rows[1].gaze_path),gazePath);
  assert.equal(forward.rows[1].gaze_path,JSON.stringify(gazePath));
  assert.equal(forward.rows[1].interruption_start_ms,'7000');
  assert.equal(forward.rows[1].interruption_end_ms,'11000');
  assert.equal(forward.rows[1].gaze_n,'2');
  assert.deepEqual(JSON.parse(forward.rows[1].aoi_json),aoi);
});

test('Distingue una trayectoria vacía de un campo ausente en datos anteriores',()=>{
  const result=convert([session('fixture-empty','EME-INT-1.1.0',{item_id:'fixture-empty',gaze_path:[],interruption_start_ms:null,interruption_end_ms:null,aoi:{x:0,y:0,w:600,h:300}})]);
  assert.deepEqual(JSON.parse(result.rows[0].gaze_path),[]);
  assert.equal(result.rows[0].interruption_start_ms,'');
  assert.equal(result.rows[0].interruption_end_ms,'');
});
