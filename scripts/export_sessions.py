"""Despliega el CSV privado de Sesiones a una fila por ensayo. Solo biblioteca estándar.
python3 scripts/export_sessions.py data/Sesiones.csv data/ensayos.csv
No publicar los CSV individuales en GitHub.
"""
import csv,json,sys,pathlib
def convert(source,destination):
    rows=[]
    with open(source,encoding='utf-8-sig',newline='') as f:
        seen=set()
        for s in csv.DictReader(f):
            sid=s['session_id']
            if sid in seen: raise ValueError('Sesión duplicada: '+sid)
            seen.add(sid)
            quality=json.loads(s['quality_json'])
            for t in json.loads(s['trials_json']):
                base={k:s[k] for k in ['session_id','protocol_version','age_band','spanish_level','education','reading_frequency','gender','list_id','bank_id','elapsed_ms','gaze_status']}
                base.update({k:v for k,v in t.items() if k!='aoi'})
                base.update({'hidden':quality['hidden'],'resize':quality['resize'],'aoi_json':json.dumps(t['aoi'])})
                rows.append(base)
    if not rows: raise ValueError('Sin respuestas: no se generan resultados ficticios.')
    pathlib.Path(destination).parent.mkdir(parents=True,exist_ok=True)
    with open(destination,'w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(rows[0]));writer.writeheader();writer.writerows(rows)
    print(f'{len(seen)} sesiones; {len(rows)} ensayos -> {destination}')
if __name__=='__main__':convert(*sys.argv[1:3])
