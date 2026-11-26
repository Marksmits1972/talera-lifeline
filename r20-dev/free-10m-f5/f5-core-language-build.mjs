import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {languageCatalog} from './f5-language-catalog.mjs';
const originalSha='f237d640d0aa49810488294e20b11373bce25684ae418d1f2034726d280e1576';
const originalKeys=["common.back", "common.close", "common.done", "common.add", "common.cancel", "common.edit", "common.share", "common.save", "common.next", "common.previous", "common.loading", "common.language", "home.myLife", "home.shared", "home.notifications", "home.myMemories", "home.subtitle", "home.timeline", "home.selectYear", "home.selectYearHelp", "home.yearHelp", "home.previousPeriod", "home.nextPeriod", "home.travel", "home.guide", "home.newMemory", "home.browseYears", "home.lifeInImages", "home.eraHelp", "home.discover", "home.examples", "home.example", "home.ownMemories", "home.myMemory", "home.memories", "home.storyFallback", "home.examplesNotice", "home.sharedTitle", "home.sharedSubtitle", "home.sharedSoon", "home.sharedDesc", "home.backLife", "home.notificationsSubtitle", "home.notificationSoon", "home.notificationDesc", "home.galleryTitle", "home.openClose", "home.viewMemory", "home.timelineAria", "home.mainNav", "home.era", "home.ownedCount", "home.ownShort", "home.empty", "home.saved", "home.noPeriods", "home.examplesUpper", "tell.title", "tell.backMemories", "tell.whichMoment", "tell.beginPhotos", "tell.addPhotos", "tell.maxPhotos", "tell.withoutPhotos", "tell.draftNote", "tell.storyStarts", "tell.givePlace", "tell.noDate", "tell.dateHelp", "tell.storyTitle", "tell.giveTitle", "tell.changeDateAria", "tell.dateRight", "tell.dateFromPhotos", "tell.changeDate", "tell.yesCorrect", "tell.when", "tell.approximateDate", "tell.precision", "tell.day", "tell.month", "tell.year", "tell.season", "tell.exampleYear", "tell.speak", "tell.write", "tell.startRecord", "tell.stopRecord", "tell.pause", "tell.resume", "tell.microphoneOff", "tell.ownWords", "tell.tellPlaceholder", "tell.publish", "tell.addTag", "tell.tagsGroup", "tell.newTag", "tell.editMemory", "tell.recorded", "tell.noTellRequired", "tell.recordAgain", "tell.tellSomething", "present.backLife", "present.title", "present.shareMemory", "present.editMemory", "present.timeline", "present.activeSpace", "present.autoListen", "present.allowAudio", "present.listen", "present.listening", "present.manage", "present.managePhotos", "present.deleteMemory", "present.savedSafe", "present.personallySaved", "present.whatShare", "present.activeReady", "present.activeMemory", "present.chooseAccess", "present.oneStory", "present.oneStoryDesc", "present.myTimeline", "present.myTimelineDesc", "present.shareSeparate", "present.photoLoading", "present.myMemory", "offline.title", "offline.message", "tell.yourStoryKicker", "tell.myPhotos", "tell.photoOverview", "tell.memories", "tell.backToMemories", "tell.share", "tell.photosProcessing", "tell.voiceSaved", "tell.ready", "tell.correctDate", "tell.chooseMonth", "tell.chooseSeason", "tell.spring", "tell.summer", "tell.autumn", "tell.winter", "tell.voice", "tell.memoryAdded", "present.tell", "present.timelineTab", "present.more", "present.back", "present.turnSoundOn", "present.audioOff", "present.audioOn", "present.pause", "present.play", "present.audioResume", "present.photoManage", "present.deleteUndo", "present.menu", "present.viewMemory", "present.photoReady", "share.recipientNoDownload", "share.validUntil", "share.hours24", "share.days7", "share.days30", "share.noEnd", "share.makeInvite", "share.defaultDays", "share.requestFirst", "share.chooseAccess", "share.innerCircle", "share.innerDesc", "share.trustedCircle", "share.trustedDesc", "share.widerCircle", "share.widerDesc", "share.circlePrivate", "share.makeTimelineInvite", "share.onlyMe", "share.invitation", "share.copyLink", "share.linkCopied", "share.copy", "share.send", "share.revoke", "tell.yourStorySubhead", "tag.add", "tag.selected", "tag.noFavorites", "tag.remove", "tag.preferencesTitle", "tag.preferencesHelp", "tag.favoritesHeading", "tag.selectedCount", "tag.makeOwn", "tag.ownExample", "tag.ownLabel", "tag.keepOld", "tag.settingsSubtitle", "tag.saveFailure", "writer.title", "writer.dialog", "writer.media", "writer.prompt", "writer.image", "writer.saveError", "tag.name.family", "tag.name.friends", "tag.name.holiday", "tag.name.childhood", "tag.name.baby", "tag.name.primarySchool", "tag.name.secondarySchool", "tag.name.work", "tag.name.love", "tag.name.children", "tag.name.birthday", "tag.name.travel", "tag.name.study", "tag.name.sport", "tag.name.hobby", "tag.name.party", "tag.name.wedding", "tag.name.home", "tag.name.moving", "tag.name.pets", "tag.name.nature", "tag.name.health", "tag.name.grandparents", "tag.name.specialMoments", "tag.name.milestones", "social.role.maker", "social.role.broer", "social.role.oom", "social.role.vriendin", "social.role.buitenstaander", "social.demo.person", "social.demo.warning", "social.demo.thread", "social.inbox.subtitle", "social.inbox.open", "social.inbox.empty", "social.inbox.invite", "social.inbox.reply", "social.inbox.comment", "social.inbox.read", "social.inbox.unread", "social.denied.title", "social.denied.text", "social.denied.back", "social.comment.placeholder", "social.comment.replyTo", "social.comment.latest", "social.comment.back", "social.comment.newOne", "social.comment.newMany", "social.comment.reply", "social.comment.countOne", "social.comment.countMany", "social.comment.ariaRoot", "social.comment.ariaDepth", "social.comment.like", "social.comment.likeAria", "social.comment.unlikeAria", "social.error.network", "social.error.access", "social.error.role", "social.error.story", "social.error.comment", "social.error.parent", "social.error.like", "social.error.likeId", "social.error.origin", "social.error.input", "social.error.db", "social.error.owner", "social.error.person", "social.error.route", "topic.family", "topic.travel", "topic.friends", "topic.special", "topic.daily", "topic.work", "topic.uncategorized", "topic.examples", "topic.testExamples", "topic.countOne", "topic.countMany", "topic.headMine", "topic.headEmpty", "topic.inspiration", "topic.noteMine", "topic.noteEmpty", "more.hub.title", "more.hub.account", "more.hub.signIn", "more.hub.contactsSection", "more.hub.people", "more.hub.peopleHint", "more.hub.sent", "more.hub.sentHint", "more.hub.received", "more.hub.receivedHint", "more.hub.accountSection", "more.hub.privacy", "more.hub.privacyHint", "more.hub.settings", "more.hub.settingsHint", "more.hub.subscription", "more.hub.subscriptionHint", "more.hub.support", "more.hub.knowledge", "more.hub.knowledgeHint", "more.nav.back", "more.nav.previous", "more.account.title", "more.account.profileSection", "more.account.profile", "more.account.profileHint", "more.account.privacySection", "more.account.discoverability", "more.account.visibilityHint", "more.account.recovery", "more.account.recoveryHint", "more.account.signOut", "more.account.signedOut", "more.account.signedOutText", "more.account.signIn", "more.account.create", "more.account.signedInAs", "more.account.profileIntro", "more.account.name", "more.account.saveName", "more.account.email", "more.account.username", "more.account.notProvided", "more.account.notSet", "more.account.change", "more.account.usernamePrivacy", "more.account.canEdit", "more.account.changeEmail", "more.account.emailUnavailable", "more.account.signInRequired", "more.account.signInProfile", "more.account.loginHint", "more.account.password", "more.account.forgot", "more.account.newAccountHint", "more.account.uniqueUsername", "more.account.repeatPassword", "more.account.haveAccount", "more.account.showPassword", "more.account.hidePassword", "more.account.loginComplete", "more.account.logoutComplete", "more.account.nameSaved", "more.privacy.title", "more.privacy.explanation", "more.privacy.findable", "more.privacy.myUsername", "more.privacy.save", "more.privacy.temporary", "more.privacy.links", "more.privacy.revokeHint", "more.privacy.saved", "more.people.find", "more.people.search", "more.people.found", "more.people.share", "more.people.empty", "more.people.findHint", "more.people.signIn", "more.sharing.select", "more.sharing.none", "more.sharing.saveFirst", "more.sharing.noPerson", "more.sharing.goBack", "more.sharing.links", "more.sharing.revoked", "more.sharing.expired", "more.sharing.revoke", "more.sharing.owned", "more.sharing.empty", "more.sharing.noneHint", "more.sharing.loginManage", "more.sharing.receivedSection", "more.sharing.noReceived", "more.sharing.receivedHint", "more.sharing.loginReceived", "more.messages.title", "more.messages.conversations", "more.messages.none", "more.messages.noneHint", "more.messages.signIn", "more.messages.thread", "more.messages.threadIntro", "more.messages.loading", "more.messages.wait", "more.messages.reply", "more.messages.write", "more.messages.send", "more.messages.sent", "more.settings.intro", "more.settings.general", "more.settings.accountHint", "more.settings.privacyHint", "more.settings.language", "more.settings.languageHint", "more.settings.accessibility", "more.settings.accessibilityHint", "more.settings.display", "more.settings.displayHint", "more.settings.storage", "more.settings.storageHint", "more.settings.audioSection", "more.settings.enableListen", "more.settings.disableListen", "more.settings.spoken", "more.settings.languagePicker", "more.settings.languageExplain", "more.settings.languageAvailable", "more.settings.accessInfo", "more.settings.accessText", "more.settings.accessLater", "more.settings.displayInfo", "more.settings.displayText", "more.settings.displayLater", "more.storage.intro", "more.storage.onDevice", "more.storage.account", "more.storage.notChecked", "more.storage.unavailable", "more.storage.checkError", "more.storage.warning", "more.storage.warningText", "more.storage.refresh", "more.subscription.title", "more.subscription.explain", "more.subscription.noCharge", "more.help.about", "more.help.privacy", "more.help.who", "more.help.knowledge", "more.help.explain", "more.help.open", "present.today", "present.ageUnit", "backup.create", "backup.restore", "backup.save", "backup.saved", "backup.choose", "backup.preview", "backup.confirmRestore", "backup.ready", "backup.notVerified", "backup.empty", "backup.conflict", "backup.restored", "backup.lastConfirmed", "backup.neverConfirmed", "backup.reminderTitle", "backup.reminderMessage", "backup.later", "backup.already", "backup.preparing", "backup.checking", "backup.intro", "backup.previewCounts", "more.messages.actorNotice", "account.birth.label", "account.birth.title", "account.birth.privacy", "account.birth.save", "account.birth.currentSaved", "account.birth.saved", "account.birth.saveFailed", "account.birth.invalid", "account.birth.signIn", "account.birth.createdPending", "account.password.minimum"];
const positions={
 "/mijn-leven": [
  [
   "aria-label",
   "<section class=\"hero\" aria-label=\"Je leven in beeld\" data-i18n-aria-label=\"home.galleryTitle\">",
   "",
   "home.galleryTitle",
   "core.home.heroAria"
  ],
  [
   "aria-label",
   "<section class=\"life-sheet\" id=\"sheet\" aria-label=\"Mijn leven\">",
   "",
   "home.myLife",
   "core.home.sheetAria"
  ],
  [
   "aria-label",
   "<button class=\"sheet-handle\" id=\"sheetHandle\" aria-label=\"Herinneringenoverzicht openen of sluiten\" data-i18n-aria-label=\"home.openClose\" aria-expanded=\"false\">",
   "",
   "home.openClose",
   "core.home.sheetHandleAria"
  ],
  [
   "text",
   "<h1 class=\"sheet-title\" data-i18n=\"home.myLife\">",
   "Mijn leven",
   "home.myLife",
   "core.home.sheetHeading"
  ],
  [
   "text",
   "<p class=\"sheet-sub\" data-i18n=\"home.subtitle\">",
   "Je mooiste momenten op één plek.",
   "home.subtitle",
   "core.home.sheetSubtitle"
  ],
  [
   "aria-label",
   "<section id=\"v17-timebox\" aria-label=\"Door de tijd reizen\">",
   "",
   "home.timelineAria",
   "core.home.timelineAria"
  ],
  [
   "text",
   "<strong data-i18n=\"home.timeline\">",
   "Door de tijd",
   "home.timeline",
   "core.home.timelineHeading"
  ],
  [
   "aria-label",
   "<button id=\"v17-prev\" class=\"v17-arrow\" type=\"button\" aria-label=\"Vorige periode\">",
   "",
   "home.previousPeriod",
   "core.home.prevAria"
  ],
  [
   "aria-label",
   "<button id=\"v17-next\" class=\"v17-arrow\" type=\"button\" aria-label=\"Volgende periode\">",
   "",
   "home.nextPeriod",
   "core.home.nextAria"
  ],
  [
   "aria-label",
   "<input id=\"v17-year-slider\" aria-label=\"Kies een jaar in je levenslijn\" data-i18n-aria-label=\"home.yearHelp\" type=\"range\" min=\"1976\" max=\"2026\" value=\"1995\" step=\"1\">",
   "",
   "home.yearHelp",
   "core.home.yearSliderAria"
  ],
  [
   "text",
   "<a class=\"v17-viewyear\" id=\"v17-go-year\" href=\"/present\">",
   "Reis verder door de tijd ↗",
   "home.travel",
   "core.home.travelLink"
  ],
  [
   "text",
   "<p class=\"v17-guide\">",
   "Vrij bladeren of gericht zoeken — dezelfde herinneringen.",
   "home.guide",
   "core.home.guide"
  ],
  [
   "text",
   "<span data-i18n=\"home.newMemory\">",
   "Bewaar een nieuw moment",
   "home.newMemory",
   "core.home.newMemory"
  ],
  [
   "aria-label",
   "<section id=\"v18-phases\" class=\"v18-eras\" aria-label=\"Blader door je levensfases\">",
   "",
   "core.home.lifePhasesAria",
   "core.home.lifePhasesAria"
  ],
  [
   "text",
   "<strong data-i18n=\"home.browseYears\">",
   "Blader door je jaren",
   "home.browseYears",
   "core.home.browseHeading"
  ],
  [
   "text",
   "<span data-i18n=\"home.lifeInImages\">",
   "Een leven in beelden",
   "home.lifeInImages",
   "core.home.browseSubtitle"
  ],
  [
   "text",
   "<p class=\"v18-era-note\">",
   "Ontdek je jaren in beelden. Je eigen herinneringen en voorbeelden blijven apart herkenbaar.",
   "home.eraHelp",
   "core.home.eraHelp"
  ],
  [
   "text",
   "<h2 data-i18n=\"home.myMemories\">",
   "Mijn herinneringen",
   "home.myMemories",
   "core.home.myMemoriesHeading"
  ],
  [
   "text",
   "<h2 data-i18n=\"home.discover\">",
   "Ontdek TALERA",
   "home.discover",
   "core.home.discoverHeading"
  ],
  [
   "text",
   "<h1 class=\"sheet-title\" data-i18n=\"home.sharedTitle\">",
   "Gedeeld met mij",
   "home.sharedTitle",
   "core.home.sharedHeading"
  ],
  [
   "text",
   "<p class=\"sheet-sub\">",
   "Herinneringen van mensen die belangrijk voor je zijn.",
   "home.sharedSubtitle",
   "core.home.sharedSubtitle"
  ],
  [
   "text",
   "<strong>",
   "Hier komt straks jullie gedeelde verhaal.",
   "home.sharedSoon",
   "core.home.sharedSoon"
  ],
  [
   "text",
   "<span>",
   "Terug naar mijn leven",
   "home.backLife",
   "core.home.sharedBack"
  ],
  [
   "text",
   "<h1 class=\"sheet-title\" data-i18n=\"home.notifications\">",
   "Meldingen",
   "home.notifications",
   "core.home.notificationsHeading"
  ],
  [
   "text",
   "<p class=\"sheet-sub\">",
   "Belangrijke momenten, zonder dat je steeds hoeft te zoeken.",
   "home.notificationsSubtitle",
   "core.home.notificationsSubtitle"
  ],
  [
   "text",
   "<strong>",
   "Hier verschijnen straks je meldingen.",
   "home.notificationSoon",
   "core.home.notificationSoon"
  ],
  [
   "text",
   "<span>",
   "Terug naar mijn leven",
   "home.backLife",
   "core.home.notificationsBack"
  ],
  [
   "aria-label",
   "<nav class=\"flow-nav\" aria-label=\"TALERA hoofdnavigatie\">",
   "",
   "home.mainNav",
   "core.home.mainNavAria"
  ],
  [
   "aria-label",
   "<a id=\"navMore\" href=\"/present?talera_menu=hub\" aria-label=\"Meer\">",
   "",
   "present.more",
   "core.home.navMoreAria"
  ]
 ],
 "/present": [
  [
   "aria-label",
   "<section class=\"timeline\" id=\"surface\" aria-label=\"TALERA levenslijn\">",
   "",
   "present.timeline",
   "core.present.timelineAria"
  ],
  [
   "text",
   "<div class=\"zoom-hint\" id=\"zoomHint\">",
   "Knijp om in te zoomen",
   "core.present.zoomHint",
   "core.present.zoomHint"
  ],
  [
   "aria-label",
   "<section class=\"memory-space\" aria-label=\"Ruimte voor actieve herinnering\">",
   "",
   "present.activeSpace",
   "core.present.activeSpaceAria"
  ],
  [
   "alt",
   "<img class=\"example-photo\" id=\"memoryPhotoA\" alt=\"Foto bij actieve herinnering\">",
   "",
   "core.present.photoAlt",
   "core.present.photoAlt"
  ],
  [
   "aria-label",
   "<nav aria-label=\"TALERA navigatie\">",
   "",
   "core.present.navAria",
   "core.present.navAria"
  ],
  [
   "text",
   "<span>",
   "Vertellen",
   "present.tell",
   "core.present.tellButton"
  ],
  [
   "aria-label",
   "<button class=\"home active\" type=\"button\" aria-label=\"Home\" aria-current=\"page\">",
   "",
   "core.present.homeAria",
   "core.present.homeAria"
  ],
  [
   "text",
   "<span>",
   "Meer",
   "present.more",
   "core.present.moreButton"
  ],
  [
   "aria-label",
   "<nav class=\"bottom-nav\" id=\"taleraPageNav\" aria-label=\"Hoofdnavigatie TALERA\">",
   "",
   "core.present.mainNavAria",
   "core.present.mainNavAria"
  ],
  [
   "text",
   "<span>",
   "Vertel",
   "core.present.tellTab",
   "core.present.tellTab"
  ],
  [
   "text",
   "<span>",
   "Tijdlijn",
   "present.timelineTab",
   "core.present.timelineTab"
  ],
  [
   "text",
   "<span>",
   "Presentatie",
   "present.title",
   "core.present.presentationTab"
  ]
 ],
 "/tell": [
  [
   "text",
   "<button id=\"back\" type=\"button\">",
   "← Terug",
   "core.tell.backButton",
   "core.tell.backButton"
  ]
 ]
};
const sourceHash=s=>createHash('sha256').update(s).digest('hex');
export function centralizeCoreLanguage(html,route){
 const pattern=/<script id="talera-v23-i18n">([\s\S]*?)<\/script>/g;
 const matches=[...html.matchAll(pattern)];
 assert.equal(matches.length,1,'TALERA_LANGUAGE_ENGINE_MARKER_DRIFT '+route);
 const engine=matches[0][1];
 assert.equal(sourceHash(engine),originalSha,'TALERA_LANGUAGE_ENGINE_SOURCE_DRIFT');
 const lines=engine.split('\n');
 assert.ok(lines[2].startsWith('const PACKS=')&&lines[3].startsWith('const TALERA_AUDIT_EXTRA_PACKS='),'TALERA_LANGUAGE_PACK_SOURCE_DRIFT');
 const packs=Object.fromEntries(Object.entries(languageCatalog).map(([lang,pack])=>[lang,Object.fromEntries(Object.entries(pack).filter(([key])=>originalKeys.includes(key)||key.startsWith('core.')||key.startsWith('pwa.')))]));
 lines.splice(2,3,'const PACKS='+JSON.stringify(packs).replace(/</g,'\\u003c')+';');
 let next=lines.join('\n');
 const replace=(old,value)=>{assert.equal(next.split(old).length,2,'TALERA_LANGUAGE_RUNTIME_SOURCE_DRIFT: '+old);next=next.replace(old,value)};
 replace("const LANGS=['nl','en','de','fr','es'];","const LANGS=Object.keys(PACKS);");
 replace("const browser=(navigator.languages?.[0]||navigator.language||'nl').slice(0,2).toLowerCase();return LANGS.includes(browser)?browser:'nl'","const browser=(navigator.languages?.length?navigator.languages:[navigator.language]).map(x=>String(x).slice(0,2).toLowerCase());return browser.find(l=>LANGS.includes(l))||'en'");
 replace("for(const [key,val] of Object.entries(PACKS.nl)){if(!sourceToKey.has(val))sourceToKey.set(val,key)}","for(const key of "+JSON.stringify(originalKeys)+"){const val=PACKS.nl[key];if(!sourceToKey.has(val))sourceToKey.set(val,key)}");
 replace("const localized=(key)=>PACKS[lang]?.[key]||PACKS.nl[key]||key;","const localized=(key,params={})=>(PACKS[lang]?.[key]||PACKS.en[key]||key).replace(/\\{([a-zA-Z][a-zA-Z0-9_]*)\\}/g,(whole,name)=>Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):whole);");
 replace("const ATTRIBUTE_NAMES=['aria-label','placeholder','title'];","const ATTRIBUTE_NAMES=['aria-label','placeholder','title','alt'];");
 replace("[aria-label],[title],[placeholder]","[aria-label],[title],[placeholder],[alt]");
 replace("document.documentElement.setAttribute('lang',lang);","document.documentElement.setAttribute('lang',lang); const manifest=document.querySelector('link[rel=manifest]'); if(manifest){const url=new URL(manifest.href,location.href); if(url.origin===location.origin&&url.pathname==='/manifest.webmanifest'&&url.searchParams.get('lang')!==lang){url.searchParams.set('lang',lang);manifest.href=url.pathname+url.search}}");

 // Fixed position tags are inserted only into markup, never inline JS, user data, or media state.
 let output=html.replace(pattern,()=>'<script id="talera-v23-i18n">'+next+'</script>');
 const chunks=output.split(/(<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)\s*>)/gi);
 for(const [kind,tag,text,sourceKey,key] of positions[route]||[]){
  const search=tag+(kind==='text'?text:'');
  let index=chunks.findIndex((chunk,i)=>i%2===0&&chunk.includes(search));
  if(index<0)throw Error('TALERA_LANGUAGE_POSITION_DRIFT: '+route+' '+key);
  const c=chunks[index],at=c.indexOf(search);
  const attr=kind==='text'?'data-i18n':'data-i18n-'+kind;
  const existing=new RegExp('\\s'+attr+'="[^"]*"');
  const updated=existing.test(tag)?tag.replace(existing,' '+attr+'="'+key+'"'):tag.replace(/>$/,' '+attr+'="'+key+'">');
  chunks[index]=c.slice(0,at)+updated+(kind==='text'?text:'')+c.slice(at+search.length);
 }
 return {html:chunks.join(''),engine:next,asset:sourceHash(next)+'.js'};
}
