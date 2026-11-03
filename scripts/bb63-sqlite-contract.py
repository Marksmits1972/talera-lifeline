#!/usr/bin/env python3
"""BB63 offline D1/SQLite migration contract. ONLY a transient in-memory DB.
Exercises the actual SQL migration and the current-only manifest JOIN queries
against deliberately old, duplicate and cross-account snapshot rows.
"""
import pathlib
import sqlite3

ROOT = pathlib.Path(__file__).resolve().parents[1]
DB = sqlite3.connect(":memory:")
DB.execute("PRAGMA foreign_keys=ON")
DB.execute("CREATE TABLE accounts (id TEXT PRIMARY KEY)")
DB.execute("CREATE TABLE talera_premium_uploads (account_id TEXT, media_id TEXT)")
for acc in ("account_a", "account_b"):
    DB.execute("INSERT INTO accounts(id) VALUES(?)", (acc,))
for file in (
    "20261102_premium_private_media.sql",
    "20261102_premium_private_records.sql",
    "20261102_premium_media_source_key.sql",
    "20261103_premium_current_version.sql",
):
    DB.executescript((ROOT / "migrations" / file).read_text(encoding="utf-8"))
# Idempotent schema only, no current-row or history replacement.
DB.executescript((ROOT / "migrations/20261103_premium_current_version.sql").read_text(encoding="utf-8"))
assert DB.execute("SELECT count(*) FROM talera_premium_current").fetchone() == (0,)

def media(account, ident, key):
    DB.execute("""INSERT INTO talera_premium_media
      (account_id,media_id,object_key,content_type,byte_size,sha256,created_at,source_key)
      VALUES(?,?,?,'image/jpeg',4,?,1,?)""", (account, ident, account+'/'+ident, "a"*64, key))

def record(account, ident, kind):
    DB.execute("""INSERT INTO talera_premium_records
      (account_id,record_id,kind,object_key,sha256,byte_size,created_at)
      VALUES(?,?,?,?,?,20,1)""", (account, ident, kind, account+'/'+ident, "b"*64))

media("account_a","photo_old","photo")
media("account_a","photo_new","photo")
media("account_b","photo_other","photo")
record("account_a","story_old","story")
record("account_a","story_new","story")
record("account_b","story_other","story")
DB.executemany("""INSERT INTO talera_premium_current
 (account_id,kind,source_key,current_id,revision,updated_at)
 VALUES(?,?,?,?,?,1)""",[
 ("account_a","media","photo","photo_new",2),
 ("account_a","story","story:one","story_new",2),
 ("account_b","media","photo","photo_other",1),
 ("account_b","story","story:one","story_other",1)
])
# Query uses the same JOIN and parameter shape as the Core route.
qmedia="""SELECT m.media_id,m.content_type,m.byte_size,m.sha256,m.digest_kind,
 m.source_key,m.created_at
 FROM talera_premium_media m JOIN talera_premium_current c
 ON c.account_id=m.account_id AND c.kind='media' AND c.current_id=m.media_id
 WHERE m.account_id=? AND m.media_id>?
 ORDER BY m.media_id ASC LIMIT 501"""
qrecord="""SELECT r.record_id,r.kind,r.sha256,r.byte_size,r.created_at
 FROM talera_premium_records r JOIN talera_premium_current c
 ON c.account_id=r.account_id AND c.kind=r.kind AND c.current_id=r.record_id
 WHERE r.account_id=? AND r.record_id>?
 ORDER BY r.record_id ASC LIMIT 501"""
assert [x[0] for x in DB.execute(qmedia,("account_a",""))] == ["photo_new"]
assert [x[0] for x in DB.execute(qrecord,("account_a",""))] == ["story_new"]
assert [x[0] for x in DB.execute(qmedia,("account_b",""))] == ["photo_other"]
assert [x[0] for x in DB.execute(qrecord,("account_b",""))] == ["story_other"]
assert DB.execute("SELECT count(*) FROM talera_premium_media").fetchone() == (3,)
assert DB.execute("SELECT count(*) FROM talera_premium_records").fetchone() == (3,)
# CAS exactly mirrors the Core SQL and never updates a stale revision.
cas="""UPDATE talera_premium_current
 SET current_id=?,revision=revision+1,updated_at=?
 WHERE account_id=? AND kind=? AND source_key=? AND current_id=? AND revision=?"""
result=DB.execute(cas,("photo_old",2,"account_a","media","photo","photo_new",2))
assert result.rowcount == 1
result=DB.execute(cas,("photo_new",3,"account_a","media","photo","photo_new",2))
assert result.rowcount == 0
assert DB.execute("""SELECT current_id,revision FROM talera_premium_current
 WHERE account_id='account_a' AND kind='media' AND source_key='photo'""").fetchone() == ("photo_old",3)
assert DB.execute("""SELECT current_id FROM talera_premium_current
 WHERE account_id='account_b' AND kind='media' AND source_key='photo'""").fetchone() == ("photo_other",)
try:
    DB.execute("""INSERT INTO talera_premium_current
    (account_id,kind,source_key,current_id,revision,updated_at)
    VALUES('account_a','media','photo','x',1,2)""")
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("duplicate current logical key accepted")
try:
    DB.execute("""INSERT INTO talera_premium_current
    (account_id,kind,source_key,current_id,revision,updated_at)
    VALUES('unknown','story','story:x','x',1,2)""")
except sqlite3.IntegrityError:
    pass
else:
    raise AssertionError("unowned current pointer accepted")
print("BB63 D1 SQLite contract PASS: additive migration, snapshot history, current-only queries, CAS, ownership")
