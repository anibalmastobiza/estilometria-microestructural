"""Extrae puntuación de TXT o cuerpo TEI, sin normalizar signos.
Uso: python3 scripts/extract_microstructure.py ruta/corpus data/rasgos.csv
No elimina puntuación ni stopwords. No confundir sus conteos heurísticos con sintaxis.
"""
import csv,sys,pathlib,re,hashlib,xml.etree.ElementTree as ET,statistics,collections,math
SIGNS={',':'comma','.':'period',';':'semicolon',':':'colon','…':'ellipsis','!':'exclamation_close','?':'question_close','—':'em_dash','–':'en_dash','(':'paren_open','«':'guillemet_open','"':'double_quote'}
def read(path):
    raw=path.read_bytes();s=raw.decode('utf-8-sig')
    if path.suffix.lower()=='.xml':
        root=ET.fromstring(s);body=root.find('.//{*}body')
        if body is None:raise ValueError('Sin cuerpo TEI: '+str(path))
        # No sumar lecturas alternativas de <choice>; conservar orig/sic/abbr cuando existen.
        def text(node):
            tag=node.tag.split('}')[-1]
            if tag in ('note','fw'):return ''
            if tag=='choice':
                child=next((c for c in node if c.tag.split('}')[-1] in ('orig','sic','abbr')),None)
                return text(child if child is not None else list(node)[0]) if len(node) else ''
            result=node.text or ''
            for c in node:result+=text(c)+(c.tail or '')
            return result+ ('\n\n' if tag in ('p','l','head') else '')
        s=text(body)
    return s,hashlib.sha256(raw).hexdigest()
def features(s):
    words=re.findall(r'\b[^\W\d_]+\b',s,re.UNICODE);n=len(words)
    signs=[c for c in s if c in SIGNS];freq=collections.Counter(signs)
    distances=[len(re.findall(r'\b[^\W\d_]+\b',part,re.UNICODE)) for part in re.split(r'[.,;:!?…]',s)]
    distances=[x for x in distances if x>0]
    out={'words':n,'paragraph_blocks':len([x for x in re.split(r'\n\s*\n',s) if x.strip()]),'mean_intermark_words':statistics.mean(distances) if distances else None,'sd_intermark_words':statistics.pstdev(distances) if distances else None}
    for mark,name in SIGNS.items():out[name+'_n']=freq[mark];out[name+'_per1000']=1000*freq[mark]/n if n else None
    total=len(signs);out['sign_entropy_bits']=-sum((v/total)*math.log2(v/total) for v in freq.values()) if total else None
    out['dot_triplets_n']=s.count('...')
    return out
def main(source,destination):
    paths=sorted(p for p in pathlib.Path(source).rglob('*') if p.suffix.lower() in ('.txt','.xml'))
    rows=[]
    for p in paths:
        s,digest=read(p);rows.append({'file':str(p),'sha256':digest,**features(s)})
    if not rows:raise ValueError('No hay TXT/TEI en la ruta.')
    pathlib.Path(destination).parent.mkdir(parents=True,exist_ok=True)
    with open(destination,'w',encoding='utf-8',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
    print(f'{len(rows)} documentos procesados. Auditar OCR, abreviaturas y edición antes de inferir.')
if __name__=='__main__':main(*sys.argv[1:3])
