#!/usr/bin/env python3
"""Prepare a reproducible larger GeoNames offline index (public data only).

The existing TLPLC001 format is kept byte-compatible. Each immutable part is
below Cloudflare's 25 MiB limit; the manifest records its country/latitude
coverage and SHA-256. Travel toponyms are separate, NOT automatically city
labels. No app deployment or user data access. CC BY 4.0.
"""
import argparse, collections, hashlib, json, math, pathlib, re, struct, tempfile, time, zipfile
MAGIC = b'TLPLC001'
HEAD = 16 + 676*8
REC = struct.Struct('<iiIH')
TMP = struct.Struct('<iiH')
SCALE = 100000
CAP = 24*1024*1024
# Historical, destroyed or abandoned settlements are not modern place names.
RETIRED = {'PPLQ','PPLW','PPLH','PPLCH'}
TRAVEL = {('T',x) for x in ('PASS','MT','PK','BCH','BCHS','ISL','ISLS','MTS','VAL') } | {('S',x) for x in ('RSRT','HUT','HUTS')} | {('L',x) for x in ('PRK','RESN','RESW')} | {('H','LK')}
SOURCE = 'https://download.geonames.org/export/dump/allCountries.zip'
INVALID = re.compile(r'[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]')
def digest(path):
    with path.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()
def slot(code): return (ord(code[0])-65)*26+ord(code[1])-65
def valid_country(code): return len(code)==2 and code.isascii() and code.isalpha() and code.isupper()
def valid_name(name):
    # JS validates UTF-16 length; match this boundary during build.
    return bool(name and len(name.encode('utf-16-le'))//2<=120 and not INVALID.search(name))
def encode(country_rows):
    directory=bytearray(676*8); records=bytearray(); names=bytearray(); offsets={}; n=0; coverage={}
    for cc,rows in sorted(country_rows.items()):
        if not rows: continue
        rows.sort(); struct.pack_into('<II',directory,slot(cc)*8,n,len(rows))
        coverage[cc]={'records':len(rows),'minLat':rows[0][0]/SCALE,'maxLat':rows[-1][0]/SCALE}
        for lat,lon,name in rows:
            if name not in offsets:
                offsets[name]=len(names);names.extend(name)
            records.extend(REC.pack(lat,lon,offsets[name],len(name)));n+=1
    out=MAGIC+struct.pack('<II',n,len(names))+directory+records+names
    assert n and len(out)<=CAP, 'asset size boundary'
    return out,coverage
def read_rows(path):
    data=path.read_bytes();i=0;rows=[]
    while i<len(data):
        lat,lon,n=TMP.unpack_from(data,i);i+=TMP.size
        assert n and i+n<=len(data)
        rows.append((lat,lon,data[i:i+n]));i+=n
    return rows
def weight(row): return REC.size+len(row[2])
def make_parts(root,kind,counts,output):
    # Upper bound including unshared names means no excessive-size asset even
    # before deduplication. Countries are kept intact whenever possible.
    parts=[]; group={};size=HEAD
    def flush():
        nonlocal group,size
        if not group:return
        data,coverage=encode(group); sha=hashlib.sha256(data).hexdigest()
        filename=f'places-{sha}.bin'
        p=output/filename;p.write_bytes(data)
        parts.append({'file':filename,'sha256':sha,'bytes':len(data),'records':sum(x['records'] for x in coverage.values()),'coverage':coverage})
        group={};size=HEAD
    for cc in sorted(counts):
        rows=read_rows(root/f'{kind}-{cc}.tmp')
        assert len(rows)==counts[cc]
        rows.sort()
        total=sum(map(weight,rows))
        if total+HEAD<=CAP:
            if size+total>CAP:flush()
            group[cc]=rows;size+=total
        else:
            flush(); chunk=[];size=HEAD
            for row in rows:
                w=weight(row)
                if size+w>CAP:
                    group={cc:chunk};flush();chunk=[]
                chunk.append(row);size+=w
            group={cc:chunk};flush()
    flush()
    assert sum(p['records'] for p in parts)==sum(counts.values())
    return parts
def build(archive,output,fixture=False):
    t=time.monotonic();output.mkdir(parents=True,exist_ok=True)
    source_sha=digest(archive)
    counts={k:collections.Counter() for k in ('populated','travel')}
    codes=collections.Counter(); reasons=collections.Counter(); all_rows=0
    with tempfile.TemporaryDirectory() as directory:
        root=pathlib.Path(directory); handles={}
        try:
            with zipfile.ZipFile(archive) as z:
                member=z.getinfo('allCountries.txt')
                if not fixture: assert 1_000_000_000<member.file_size<8_000_000_000, 'unexpected allCountries source size'
                with z.open(member) as f:
                    for raw in f:
                        all_rows+=1
                        fields=raw.rstrip(b'\r\n').split(b'\t')
                        assert len(fields)==19, f'invalid GeoNames row {all_rows}'
                        fc=fields[6].decode('ascii');code=fields[7].decode('ascii')
                        kind='populated' if fc=='P' and code not in RETIRED else 'travel' if (fc,code) in TRAVEL else None
                        if not kind:
                            if fc=='P': reasons['historical_abandoned_destroyed']+=1
                            continue
                        cc=fields[8].decode('ascii'); name=fields[1].decode('utf-8')
                        if not valid_country(cc) or not valid_name(name):
                            reasons['invalid_country_or_name']+=1;continue
                        lat,lon=float(fields[4]),float(fields[5])
                        if not (math.isfinite(lat) and math.isfinite(lon) and -90<=lat<=90 and -180<=lon<=180):
                            reasons['invalid_coordinates']+=1;continue
                        raw_name=fields[1]
                        k=(kind,cc)
                        if k not in handles: handles[k]=(root/f'{kind}-{cc}.tmp').open('wb')
                        handles[k].write(TMP.pack(round(lat*SCALE),round(lon*SCALE),len(raw_name))+raw_name)
                        counts[kind][cc]+=1;codes[fc+'.'+code]+=1
                        if all_rows%1_000_000==0:print('TALERA_GEONAMES_PROGRESS',all_rows,flush=True)
        finally:
            for f in handles.values():f.close()
        if not fixture:
            assert 10_000_000<=all_rows<=25_000_000, 'incomplete GeoNames world source'
            assert 4_000_000<=sum(counts['populated'].values())<=8_000_000
            assert len(counts['populated'])>=190
        layers={}
        for kind in ('populated','travel'):
            parts=make_parts(root,kind,counts[kind],output)
            layers[kind]={'records':sum(counts[kind].values()),'countries':len(counts[kind]),'bytes':sum(x['bytes'] for x in parts),'parts':parts}
        meta={'format':'TLPLC001','source':SOURCE,'sourceSha256':source_sha,'sourceBytes':archive.stat().st_size,'archiveMemberDate':list(member.date_time),'rawRows':all_rows,
            'license':'CC BY 4.0','attribution':'GeoNames — https://www.geonames.org/','licenseUrl':'https://creativecommons.org/licenses/by/4.0/',
            'changes':'Selected modern populated places and separate travel features; quantized coordinates, one display name, country and latitude indexes, split immutable public parts; no personal data.',
            'excluded':dict(reasons),'featureCounts':dict(sorted(codes.items())),'layers':layers}
        (output/'world-manifest.json').write_text(json.dumps(meta,ensure_ascii=False,sort_keys=True,indent=2)+'\n',encoding='utf-8')
        summary={k:{x:y for x,y in v.items() if x!='parts'}|{'parts':len(v['parts']),'maxPartBytes':max((p['bytes'] for p in v['parts']),default=0),'multiPartCountries':sorted(cc for cc in counts[k] if sum(cc in p['coverage'] for p in v['parts'])>1)} for k,v in layers.items()}
        print('TALERA_GEONAMES_WORLD_DATA_MEASURED',json.dumps({'sourceBytes':meta['sourceBytes'],'sourceSha256':source_sha,'rawRows':all_rows,'archiveMemberDate':meta['archiveMemberDate'],'excluded':meta['excluded'],'features':meta['featureCounts'],'layers':summary,'seconds':round(time.monotonic()-t,3)},ensure_ascii=False),flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('archive',type=pathlib.Path);p.add_argument('output',type=pathlib.Path);p.add_argument('--fixture',action='store_true')
    a=p.parse_args();build(a.archive,a.output,a.fixture)
