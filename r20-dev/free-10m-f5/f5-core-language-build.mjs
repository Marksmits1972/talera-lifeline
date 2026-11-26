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
const dynamicPositions={
 "/mijn-leven": [
  [
   "title.textContent='Jaren '+decade;",
   "window.TaleraI18n.setText(title,'core.home.decadeTitle',{year:decade});"
  ],
  [
   "summary.textContent=own?own+' eigen':example?example+' voorbeelden':'nog leeg';",
   "window.TaleraI18n.setText(summary,own?(own===1?'core.home.yearOwnOne':'core.home.yearOwnMany'):example?(example===1?'core.home.yearExampleOne':'core.home.yearExampleMany'):'core.home.yearEmpty',{count:own||example});"
  ],
  [
   "detail.textContent=ownCount?ownCount+' eigen herinneringen':memories.length+' voorbeelden';",
   "window.TaleraI18n.setText(detail,ownCount?(ownCount===1?'core.home.decadeOwnOne':'core.home.decadeOwnMany'):(memories.length===1?'core.home.decadeExampleOne':'core.home.decadeExampleMany'),{count:ownCount||memories.length});"
  ],
  [
   "$('myCount').textContent=own.length+' bewaard';",
   "window.TaleraI18n.setText($('myCount'),own.length===1?'core.home.savedOne':'core.home.savedMany',{count:own.length});"
  ],
  [
   "kind.textContent=m.demo?'Voorbeeldherinnering · '+m.year:'Mijn herinnering · '+m.year;",
   "window.TaleraI18n.setText(kind,m.demo?'core.home.heroYearExample':'core.home.heroYearOwn',{year:m.year});"
  ],
  [
   "<small id=\"myCount\">0 bewaard</small>",
   "<small id=\"myCount\" data-i18n=\"core.home.savedInitial\">0 bewaard</small>"
  ],
  [
   "<span id=\"v17-year-summary\">Kies een jaar",
   "<span id=\"v17-year-summary\" data-i18n=\"core.home.yearSummaryInitial\">Kies een jaar"
  ],
  [
   "<p class=\"v17-empty-year\">Kies een jaar om je herinneringen terug te vinden.",
   "<p class=\"v17-empty-year\" data-i18n=\"core.home.yearEmptyInitial\">Kies een jaar om je herinneringen terug te vinden."
  ],
  [
   "<div class=\"empty\"><strong data-i18n=\"core.home.sharedSoon\">Hier komt straks jullie gedeelde verhaal.</strong>Contacten, uitnodigingen en ontvangen herinneringen worden nog ontwikkeld. Deze eerste versie laat zien hoe je ze straks vanzelf terugvindt.",
   "<div class=\"empty\" data-i18n=\"core.home.sharedEmptyDescription\"><strong data-i18n=\"core.home.sharedSoon\">Hier komt straks jullie gedeelde verhaal.</strong>Contacten, uitnodigingen en ontvangen herinneringen worden nog ontwikkeld. Deze eerste versie laat zien hoe je ze straks vanzelf terugvindt."
  ],
  [
   "<div class=\"empty\"><strong data-i18n=\"core.home.notificationSoon\">Hier verschijnen straks je meldingen.</strong>Bijvoorbeeld wanneer iemand een herinnering met je deelt. Er worden in deze proefversie nog geen meldingen verzonden of opgeslagen.",
   "<div class=\"empty\" data-i18n=\"core.home.notificationsEmptyDescription\"><strong data-i18n=\"core.home.notificationSoon\">Hier verschijnen straks je meldingen.</strong>Bijvoorbeeld wanneer iemand een herinnering met je deelt. Er worden in deze proefversie nog geen meldingen verzonden of opgeslagen."
  ],
  [
   "<a id=\"navMore\" href=\"/present?talera_menu=hub\" aria-label=\"Meer\" data-i18n-aria-label=\"core.home.navMoreAria\">",
   "<a id=\"navMore\" href=\"/present?talera_menu=hub\" aria-label=\"Meer\" data-i18n-aria-label=\"core.home.navMoreAria\" data-i18n=\"core.home.moreNavText\">"
  ],
  [
   "p.textContent='Nog geen herinneringen uit '+current+'. Je kunt wel naar dit jaar reizen op de tijdlijn.'",
   "window.TaleraI18n.setText(p,'core.home.emptyYearMessage',{year:current})",
   1
  ],
  [
   "p.textContent='En nog '+(matches.length-2)+' herinneringen uit dit jaar.'",
   "window.TaleraI18n.setText(p,matches.length-2===1?'core.home.moreYearOne':'core.home.moreYearMany',{count:matches.length-2})",
   1
  ],
  [
   "$('myCards').textContent='Je eigen herinneringen konden niet worden geopend.'",
   "window.TaleraI18n.setText($('myCards'),'core.home.loadError')",
   1
  ],
  [
   "p.textContent='Nog geen levensjaren om te bekijken.'",
   "window.TaleraI18n.setText(p,'core.home.noLifeYears')",
   1
  ],
  [
   "msg.textContent='Verwijderen mislukt: '+err.message",
   "window.TaleraI18n.setText(msg,'core.home.deleteFailure',{detail:err.message})",
   1
  ],
  [
   "action.textContent='Bezig…'",
   "window.TaleraI18n.setText(action,'core.home.deleting')",
   1
  ],
  [
   "action.textContent='Verwijderen'",
   "window.TaleraI18n.setText(action,'core.home.delete')",
   1
  ]
 ],
 "/present": [
  [
   "audioLabel.textContent='Pauze';",
   "window.TaleraI18n.setText(audioLabel,'core.present.audioPaused');"
  ],
  [
   "loadingBadge.textContent='Foto wordt geladen…'",
   "window.TaleraI18n.setText(loadingBadge,'core.present.photoLoading')",
   1
  ],
  [
   "savedBadge.textContent='Je verhaal is veilig opgeslagen'",
   "window.TaleraI18n.setText(savedBadge,'core.present.safeSaved')",
   1
  ],
  [
   "retry.textContent='Opnieuw proberen'",
   "window.TaleraI18n.setText(retry,'core.present.retry')",
   1
  ],
  [
   "audioLabel.textContent='Opnieuw'",
   "window.TaleraI18n.setText(audioLabel,'core.present.playRetry')",
   1
  ],
  [
   "button.textContent='▶ Beluister'",
   "window.TaleraI18n.setText(button,'core.present.legacyListenButton')",
   1
  ],
  [
   "hint.textContent='▶ Beluister'",
   "window.TaleraI18n.setText(hint,'core.present.legacyListenHint')",
   1
  ],
  [
   "<span>Foto’s beheren</span><span>›</span></button>",
   "<span data-i18n=\"core.present.managePhotosAction\">Foto’s beheren</span><span>›</span></button>"
  ]
 ],
 "/tell": [
  [
   "playback.textContent=preview.paused?'▶ Terugluisteren':'Ⅱ Pauze'",
   "window.TaleraI18n.setText(playback,preview.paused?'core.tell.previewReplay':'core.tell.previewPause')"
  ],
  [
   "pause.textContent='Pauze';",
   "window.TaleraI18n.setText(pause,'core.tell.recordPause');"
  ],
  [
   "if(write)write.textContent='Schrijven';",
   "if(write)window.TaleraI18n.setText(write,'core.tell.writeButton1');"
  ],
  [
   "  write.textContent='Schrijven';",
   "  window.TaleraI18n.setText(write,'core.tell.writeButton2');"
  ],
  [
   "write.setAttribute('aria-label','Schrijven');",
   "window.TaleraI18n.setTextAttribute(write,'aria-label','core.tell.writeAria');"
  ],
  [
   "write.textContent='✎ Schrijven';",
   "window.TaleraI18n.setText(write,'core.tell.writeButtonIcon');"
  ],
  [
   "if(b)b.setAttribute('aria-label','Terug')",
   "if(b)window.TaleraI18n.setTextAttribute(b,'aria-label','core.tell.backAriaDynamic')"
  ],
  [
   "new Date(draft.date+'T12:00:00').toLocaleDateString('nl-NL',",
   "new Date(draft.date+'T12:00:00').toLocaleDateString(window.TaleraI18n.locale,"
  ],
  [
   "$('busyProgress').textContent='Origineel '+(i+1)+' van '+keys.length",
   "window.TaleraI18n.setText($('busyProgress'),'core.tell.originalProgress',{index:i+1,total:keys.length})",
   1
  ],
  [
   "$('busyProgress').textContent='Bestaande herinneringen vergelijken · '+checked",
   "window.TaleraI18n.setText($('busyProgress'),'core.tell.compareProgress',{count:checked})",
   1
  ],
  [
   "confirm.textContent='Bezig…'",
   "window.TaleraI18n.setText(confirm,'core.tell.deleteBusy')",
   1
  ],
  [
   "confirm.textContent='Verwijderen'",
   "window.TaleraI18n.setText(confirm,'core.tell.deleteConfirm')",
   1
  ],
  [
   "speak.textContent='Vertellen'",
   "window.TaleraI18n.setText(speak,'core.tell.speakLabel1')",
   2
  ],
  [
   "speak.textContent='Vertellen'",
   "window.TaleraI18n.setText(speak,'core.tell.speakLabel2')",
   1
  ],
  [
   "speak.textContent='🎙 Vertellen'",
   "window.TaleraI18n.setText(speak,'core.tell.speakIcon')",
   1
  ],
  [
   "publish.textContent='Plaatsen op tijdlijn'",
   "window.TaleraI18n.setText(publish,'core.tell.publishTimeline')",
   1
  ],
  [
   "done.textContent='Klaar'",
   "window.TaleraI18n.setText(done,'core.tell.writerDone')",
   1
  ],
  [
   "error.textContent='Kies een geldige dag, maand, seizoen of jaar.'",
   "window.TaleraI18n.setText(error,'core.tell.dateValidation')",
   1
  ],
  [
   "$('publish').textContent='Op mijn tijdlijn plaatsen'",
   "window.TaleraI18n.setText($('publish'),'core.tell.publishButton')",
   1
  ],
  [
   "status.textContent='Stop eerst je opname en wacht tot deze is bewaard.'",
   "window.TaleraI18n.setText(status,'core.tell.recordWait')",
   1
  ],
  [
   "start.textContent='Opname bewaren…'",
   "window.TaleraI18n.setText(start,'core.tell.recordSaving')",
   1
  ],
  [
   "start.textContent='■ Stoppen'",
   "window.TaleraI18n.setText(start,'core.tell.recordStop1')",
   2
  ],
  [
   "start.textContent='■ Stoppen'",
   "window.TaleraI18n.setText(start,'core.tell.recordStop2')",
   1
  ],
  [
   "status.textContent='Deze browser ondersteunt opnemen niet.'",
   "window.TaleraI18n.setText(status,'core.tell.recordUnsupported')",
   1
  ],
  [
   "start.textContent='Microfoon openen…'",
   "window.TaleraI18n.setText(start,'core.tell.micOpening')",
   1
  ],
  [
   "start.textContent='● Opnemen'",
   "window.TaleraI18n.setText(start,'core.tell.recordStart1')",
   4
  ],
  [
   "start.textContent='● Opnemen'",
   "window.TaleraI18n.setText(start,'core.tell.recordStart2')",
   3
  ],
  [
   "start.textContent='● Opnemen'",
   "window.TaleraI18n.setText(start,'core.tell.recordStart3')",
   2
  ],
  [
   "start.textContent='● Opnemen'",
   "window.TaleraI18n.setText(start,'core.tell.recordStart4')",
   1
  ],
  [
   "start.textContent='Opslaan…'",
   "window.TaleraI18n.setText(start,'core.tell.recordSave')",
   1
  ],
  [
   "status.textContent='Bewaren niet gelukt: '+e.message+'. De vorige opname is behouden.'",
   "window.TaleraI18n.setText(status,'core.tell.recordRestoreFailure',{detail:e.message})",
   1
  ],
  [
   "pause.textContent='Hervatten'",
   "window.TaleraI18n.setText(pause,'core.tell.resume')",
   1
  ],
  [
   "status.textContent='Opname gepauzeerd.'",
   "window.TaleraI18n.setText(status,'core.tell.pausedStatus')",
   1
  ],
  [
   "status.textContent='Opname hervat.'",
   "window.TaleraI18n.setText(status,'core.tell.resumedStatus')",
   1
  ],
  [
   "approve.textContent='Je herinnering bewaren…'",
   "window.TaleraI18n.setText(approve,'core.tell.savingMemory')",
   1
  ],
  [
   "approve.textContent='Op mijn tijdlijn plaatsen'",
   "window.TaleraI18n.setText(approve,'core.tell.publishApprove1')",
   2
  ],
  [
   "approve.textContent='Op mijn tijdlijn plaatsen'",
   "window.TaleraI18n.setText(approve,'core.tell.publishApprove2')",
   1
  ],
  [
   "$('v13Error').textContent='Kies een geldige datum.'",
   "window.TaleraI18n.setText($('v13Error'),'core.tell.dateInvalid')",
   1
  ],
  [
   "$('v13Error').textContent='Datumveld niet beschikbaar.'",
   "window.TaleraI18n.setText($('v13Error'),'core.tell.dateUnavailable')",
   1
  ],
  [
   "$('v13Error').textContent='Probeer opnieuw.'",
   "window.TaleraI18n.setText($('v13Error'),'core.tell.dateTryAgain')",
   1
  ],
  [
   "$('back').textContent=view==='work'?'← Herinneringen':view==='overview'?'← Terug':'← Terug'",
   "window.TaleraI18n.setText($('back'),view==='work'?'core.tell.workBack':view==='overview'?'core.tell.overviewBack':'core.tell.startBack')"
  ],
  [
   "<textarea id=\"story\" placeholder=\"Wat wil je over dit moment vertellen?\">",
   "<textarea id=\"story\" data-i18n-placeholder=\"core.tell.storyPlaceholder\" placeholder=\"Wat wil je over dit moment vertellen?\">"
  ],
  [
   "choices.setAttribute('aria-label',text('tag.selected','Mijn favoriete kenmerken'))",
   "window.TaleraI18n.setTextAttribute(choices,'aria-label','core.tell.favoriteChoicesAria')"
  ],
  [
   "id=\"taleraV61RecPause\" hidden>Pauze</button>",
   "id=\"taleraV61RecPause\" data-i18n=\"core.tell.recorderPauseInitial\" hidden>Pauze</button>"
  ],
  [
   "state.recipientListening?'Pauze':'Luisteren'",
   "window.TaleraI18n.t(state.recipientListening?'core.tell.shareRecipientPause':'core.tell.shareRecipientListen')"
  ],
  [
   "buttonAction('prototype-setting','NL','Taal','Nederlands')",
   "buttonAction('prototype-setting','NL',window.TaleraI18n.t('core.tell.legacySettingsLanguage'),'Nederlands')"
  ],
  [
   "class=\"talera-share-back\" type=\"button\" data-action=\"back\" aria-label=\"Terug\"",
   "class=\"talera-share-back\" type=\"button\" data-action=\"back\" data-i18n-aria-label=\"core.tell.shareBackAria\" aria-label=\"Terug\""
  ],
  [
   "class=\"talera-share-secondary\" type=\"button\" data-action=\"back\">Terug</button>",
   "class=\"talera-share-secondary\" type=\"button\" data-action=\"back\" data-i18n=\"core.tell.sharePreviewBack\">Terug</button>"
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
 const packs=Object.fromEntries(Object.entries(languageCatalog).map(([lang,pack])=>[lang,Object.fromEntries(Object.entries(pack).filter(([key])=>originalKeys.includes(key)||key.startsWith('core.')||key.startsWith('pwa.')||key.startsWith('menu.')||key.startsWith('guest.native.')||key.startsWith('guest.api.')))]));
 lines.splice(2,3,'const PACKS='+JSON.stringify(packs).replace(/</g,'\\u003c')+';');
 let next=lines.join('\n');
 const replace=(old,value)=>{assert.equal(next.split(old).length,2,'TALERA_LANGUAGE_RUNTIME_SOURCE_DRIFT: '+old);next=next.replace(old,value)};
 replace("const LANGS=['nl','en','de','fr','es'];","const LANGS=Object.keys(PACKS);");
 replace("const browser=(navigator.languages?.[0]||navigator.language||'nl').slice(0,2).toLowerCase();return LANGS.includes(browser)?browser:'nl'","const browser=(navigator.languages?.length?navigator.languages:[navigator.language]).map(x=>String(x).slice(0,2).toLowerCase());return browser.find(l=>LANGS.includes(l))||'en'");
 replace("for(const [key,val] of Object.entries(PACKS.nl)){if(!sourceToKey.has(val))sourceToKey.set(val,key)}","for(const key of "+JSON.stringify(originalKeys)+"){const val=PACKS.nl[key];if(!sourceToKey.has(val))sourceToKey.set(val,key)}");
 replace("const localized=(key)=>PACKS[lang]?.[key]||PACKS.nl[key]||key;","const localized=(key,params={})=>(PACKS[lang]?.[key]||PACKS.en[key]||key).replace(/\\{([a-zA-Z][a-zA-Z0-9_]*)\\}/g,(whole,name)=>Object.prototype.hasOwnProperty.call(params,name)?String(params[name]):whole);");
 replace("if(!node?.parentElement||isUserContent(node))return;","if(!node?.parentElement||node.parentElement.closest('[data-talera-explicit-language]')||isUserContent(node))return;");
 replace("function renderAttrs(el){","function renderAttrs(el){if(el.closest('[data-talera-explicit-language]'))return;");
 replace("const ATTRIBUTE_NAMES=['aria-label','placeholder','title'];","const ATTRIBUTE_NAMES=['aria-label','placeholder','title','alt'];");
 replace("[aria-label],[title],[placeholder]","[aria-label],[title],[placeholder],[alt]");
 replace("document.documentElement.setAttribute('lang',lang);","document.documentElement.setAttribute('lang',lang); const manifest=document.querySelector('link[rel=manifest]'); if(manifest){const url=new URL(manifest.href,location.href); if(url.origin===location.origin&&url.pathname==='/manifest.webmanifest'&&url.searchParams.get('lang')!==lang){url.searchParams.set('lang',lang);manifest.href=url.pathname+url.search}}");

 replace("function dynamic(source){\n let match;\n if((match=/^Jaren\\s+(\\d{4})$/i.exec(source)))return localized('home.era')+' '+match[1];\n if((match=/^(\\d+)\\s+eigen herinneringen$/i.exec(source)))return match[1]+' '+localized('home.ownedCount');\n if((match=/^(\\d+)\\s+voorbeelden$/i.exec(source)))return match[1]+' '+localized('home.examples').toLocaleLowerCase(LOCALES[lang]);\n if((match=/^(\\d+)\\s+eigen$/i.exec(source)))return match[1]+' '+localized('home.ownShort');\n if((match=/^(\\d+)\\s+bewaard$/i.exec(source)))return match[1]+' '+localized('home.saved');\n if((match=/^(Mijn herinnering|Voorbeeldherinnering)\\s+·\\s+(\\d{4})$/i.exec(source)))return localized(match[1]==='Mijn herinnering'?'home.myMemory':'home.example')+' · '+match[2];\n if((match=/^(\\d+)\\s+(voorbeelden|eigen)\\s*$/i.exec(source)))return match[1]+' '+localized(match[2]==='eigen'?'home.ownShort':'home.examples').toLocaleLowerCase(LOCALES[lang]);\n if((match=/^(←|↗|✎|●|■|🎙)\\s+(.+)$/u.exec(source))){\n  const key=sourceToKey.get(match[2]);\n  if(key)return match[1]+' '+localized(key);\n }\n const date=translateDate(source);if(date!==null)return date;\n return null;\n}\n","function dynamic(source){\n // Transitional fallback for older non-migrated positions: always translate complete phrases.\n let match;\n if((match=/^Jaren\\s+(\\d{4})$/i.exec(source)))return localized('core.home.decadeTitle',{year:match[1]});\n if((match=/^(\\d+)\\s+eigen herinnering(?:en)?$/i.exec(source)))return localized(Number(match[1])===1?'core.home.decadeOwnOne':'core.home.decadeOwnMany',{count:match[1]});\n if((match=/^(\\d+)\\s+voorbeeld(?:en)?$/i.exec(source)))return localized(Number(match[1])===1?'core.home.decadeExampleOne':'core.home.decadeExampleMany',{count:match[1]});\n if((match=/^(\\d+)\\s+eigen$/i.exec(source)))return localized(Number(match[1])===1?'core.home.yearOwnOne':'core.home.yearOwnMany',{count:match[1]});\n if((match=/^(\\d+)\\s+bewaard$/i.exec(source)))return localized(Number(match[1])===1?'core.home.savedOne':'core.home.savedMany',{count:match[1]});\n if((match=/^(Mijn herinnering|Voorbeeldherinnering)\\s+·\\s+(\\d{4})$/i.exec(source)))return localized(match[1]==='Mijn herinnering'?'core.home.heroYearOwn':'core.home.heroYearExample',{year:match[2]});\n if((match=/^(←|↗|✎|●|■|🎙)\\s+(.+)$/u.exec(source))){\n  const key=sourceToKey.get(match[2]);\n  if(key)return match[1]+' '+localized(key);\n }\n const date=translateDate(source);if(date!==null)return date;\n return null;\n}\n");
 replace("const textInfo=new WeakMap(),attrInfo=new WeakMap();","const textInfo=new WeakMap(),attrInfo=new WeakMap(),boundText=new WeakMap();\nfunction setText(el,key,params={}){\n if(!el)return;\n const value=localized(key,params);\n el.removeAttribute('data-i18n');\n el.setAttribute('data-talera-bound-text','');\n boundText.set(el,{key,params,rendered:value});\n if(el.textContent!==value)el.textContent=value;\n}\nfunction setTextAttribute(el,attr,key){\n if(!el)return;\n el.setAttribute('data-i18n-'+attr,key);\n el.setAttribute(attr,localized(key));\n}\nfunction refreshBoundText(){\n for(const el of document.querySelectorAll('[data-talera-bound-text]')){\n  const old=boundText.get(el);\n  if(!old||el.textContent!==old.rendered){boundText.delete(el);el.removeAttribute('data-talera-bound-text');continue}\n  const value=localized(old.key,old.params);old.rendered=value;\n  if(el.textContent!==value)el.textContent=value;\n }\n}");
 replace("if(!node?.parentElement||node.parentElement.closest('[data-talera-explicit-language]')||isUserContent(node))return;","if(!node?.parentElement||node.parentElement.closest('[data-talera-explicit-language],[data-talera-bound-text]')||isUserContent(node))return;");
 replace(" if(!document.body)return;\n const walker="," if(!document.body)return;\n refreshBoundText();\n const walker=");
 replace("t:localized,formatDate,setLanguage,refresh:schedule","t:localized,setText,setTextAttribute,formatDate,setLanguage,refresh:schedule");
 replace("document.title='TALERA · '+(page.startsWith('/tell')?localized('tell.title'):page.startsWith('/present')?localized('present.title'):page.startsWith('/meldingen')?localized('home.notifications'):page.startsWith('/gedeeld')?localized('home.sharedTitle'):localized('home.myLife'));","document.title=localized(page.startsWith('/tell')?'core.document.tell':page.startsWith('/present')?'core.document.present':page.startsWith('/meldingen')?'core.document.notifications':page.startsWith('/gedeeld')?'core.document.shared':'core.document.home');");
 replace("select.setAttribute('aria-label',localized('common.language'))}","select.setAttribute('aria-label',localized('core.picker.aria'));const label=document.querySelector('.talera-v23-language-label');if(label&&label.textContent!==localized('core.picker.label'))label.textContent=localized('core.picker.label')}");
 replace("label.textContent=localized('common.language');","label.textContent=localized('core.picker.label'); label.setAttribute('data-i18n','core.picker.label');");
 replace("select.setAttribute('aria-label',localized('common.language'));","select.setAttribute('data-i18n-aria-label','core.picker.aria');select.setAttribute('aria-label',localized('core.picker.aria'));");

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
 return {html:applyContextualCore(chunks.join(''),route),engine:next,asset:sourceHash(next)+'.js'};
}
export function applyContextualCore(html,route){
 let localizedHtml=html;
 for(const [before,after,expected=1] of dynamicPositions[route]||[]){
  const count=localizedHtml.split(before).length-1;
  assert.equal(count,expected,'TALERA_DYNAMIC_LANGUAGE_POSITION_DRIFT '+route+' '+before);
  localizedHtml=localizedHtml.replace(before,()=>after);
 }
 return localizedHtml;
}
