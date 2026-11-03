import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const menu=readFileSync(new URL("../src/mijn-talera/menu-integration.txt",import.meta.url),"utf8");
const translations=JSON.parse(readFileSync(new URL("../src/mijn-talera/vertalingen-menu.json",import.meta.url),"utf8"));

test("existing single Messages view renders grouped in-app notifications",()=>{
 assert.doesNotThrow(()=>new Function(menu));
 assert.ok(menu.includes("const grouped=new Map()"));
 assert.ok(menu.includes("if(!g.count&&['comment','guest_comment'].includes(msg.kind)&&msg.actor_name)"));
 assert.ok(menu.includes("g.actor=String(msg.actor_name)"));
 assert.ok(menu.includes("g.owner=String(msg.owner_name"));
 assert.ok(menu.includes("more.messages.actorNotice"));
 assert.ok(menu.includes("x.unread?x.unread+' ongelezen"));
 assert.ok(menu.includes("data-thread="));
 assert.ok(!menu.includes("https://api.whatsapp.com/send"));
});

test("named activity respects the original five-language app catalog",()=>{
 const locales=["nl","en","de","fr","es"];
 assert.deepEqual(translations.languages,locales);
 for(const lang of locales){
  const template=translations.catalog[lang]["more.messages.actorNotice"];
  assert.ok(template&&template.includes("{actor}")&&template.includes("{owner}"),lang);
  const rendered=template.replace("{actor}","Peter").replace("{owner}","Mark");
  assert.ok(rendered.includes("Peter")&&rendered.includes("Mark"));
 }
 assert.equal(translations.catalog.nl["more.messages.actorNotice"],"{actor} reageerde op de herinnering van {owner}");
});

test("no separate WhatsApp notification route or external guest push in More",()=>{
 assert.ok(menu.includes("api('/api/messages')"));
 assert.ok(menu.includes("api('/api/messages/unread-count')"));
 assert.ok(!menu.includes("guest_notification_provider"));
 assert.ok(!menu.includes("whatsapp.push"));
});
