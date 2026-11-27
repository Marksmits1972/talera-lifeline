#!/usr/bin/env python3
"""Build a deterministic, public data-only index from the official GeoNames cities500 archive.

No account data or private input. CC BY 4.0, https://www.geonames.org/
"""
import argparse, hashlib, json, pathlib, re, struct, zipfile
from collections import defaultdict

MAGIC = b"TLPLC001"
SLOTS = 26 * 26
RECORD = struct.Struct("<iiIH")
MAX_NAME = 120
SCALE = 100_000
def sha(raw):
    return hashlib.sha256(raw).hexdigest()
def slot(code):
    return (ord(code[0])-65)*26 + ord(code[1])-65
def valid_name(s):
    return bool(s and len(s) <= MAX_NAME and not re.search(r"[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]", s))
def build(archive, output):
    raw = archive.read_bytes()
    by_country = defaultdict(list)
    seen = set()
    with zipfile.ZipFile(archive) as z:
        member = z.getinfo("cities500.txt")
        assert 10_000_000 < member.file_size < 150_000_000, "Unexpected GeoNames source size"
        with z.open(member) as f:
            for line in f:
                fields = line.decode("utf-8").rstrip("\r\n").split("\t")
                assert len(fields) == 19, "Invalid GeoNames TSV row"
                ident, name, lat, lon, feature, code = fields[0], fields[1], fields[4], fields[5], fields[6], fields[8]
                if not re.fullmatch("[A-Z]{2}", code) or feature != "P" or not valid_name(name):
                    continue
                lat,lon=float(lat),float(lon)
                assert -90<=lat<=90 and -180<=lon<=180 and ident.isdecimal()
                assert ident not in seen, "Duplicate GeoNames id"
                seen.add(ident)
                by_country[code].append((round(lat*SCALE),round(lon*SCALE),name,int(ident)))
    count=sum(map(len,by_country.values()))
    assert 150_000 <= count <= 400_000 and len(by_country)>=190, "Incomplete cities500 world coverage"
    directory=bytearray(SLOTS*8); records=bytearray(); names=bytearray(); name_offsets={}; ordinal=0
    for code in sorted(by_country):
        options=sorted(by_country[code])
        struct.pack_into("<II",directory,slot(code)*8,ordinal,len(options))
        for lat,lon,name,_ in options:
            encoded=name.encode("utf-8")
            if name not in name_offsets:
                name_offsets[name]=len(names);names.extend(encoded)
            records.extend(RECORD.pack(lat,lon,name_offsets[name],len(encoded)));ordinal+=1
    assert ordinal==count
    blob=MAGIC+struct.pack("<II",count,len(names))+directory+records+names
    assert len(blob)<12_000_000
    output.write_bytes(blob)
    meta={"format":"TLPLC001","source":"https://download.geonames.org/export/dump/cities500.zip",
        "sourceSha256":sha(raw),"sourceBytes":len(raw),
        "archiveMemberDate":list(member.date_time),"license":"CC BY 4.0","attribution":"GeoNames — https://www.geonames.org/",
        "licenseUrl":"https://creativecommons.org/licenses/by/4.0/","changes":"Filtered populated places, quantized coordinates, retained one display name, indexed by country and latitude; no personal data.",
        "records":count,"countries":len(by_country),"bytes":len(blob),"sha256":sha(blob)}
    output.with_suffix(".json").write_text(json.dumps(meta,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("TALERA_LOCALITY_DATA_PREPARED",json.dumps(meta,ensure_ascii=False))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("archive",type=pathlib.Path);p.add_argument("output",type=pathlib.Path)
    a=p.parse_args();build(a.archive,a.output)
