import assert from 'node:assert/strict';
import {languageBootstrap,languageText} from './f5-language.mjs';
const markup=[
 [
  "<title>TALERA · Vertelmodus vanaf nul</title>",
  "title",
  "title"
 ],
 [
  "<span>Zelfstandige test · vanaf nul</span>",
  "badge",
  "text"
 ],
 [
  "<h1>Vertelmodus</h1>",
  "heading",
  "text"
 ],
 [
  "<p>Jij vertelt. Jij wisselt de beelden. De stem bepaalt de timing.</p>",
  "intro",
  "text"
 ],
 [
  "<button id=\"prev\" aria-label=\"vorig beeld\">",
  "previousAria",
  "aria-label"
 ],
 [
  "<button id=\"next\" aria-label=\"volgend beeld\">",
  "nextAria",
  "aria-label"
 ],
 [
  "<span id=\"status\">Klaar om in te spreken</span>",
  "readyInitial",
  "text"
 ],
 [
  "<button id=\"record\" class=\"main\">● Begin met vertellen</button>",
  "recordButton",
  "text"
 ],
 [
  "<button id=\"pause\" hidden>Pauze</button>",
  "pauseButton",
  "text"
 ],
 [
  "<button id=\"stop\" class=\"stop\" hidden>■ Stop</button>",
  "stopButton",
  "text"
 ],
 [
  "<button id=\"play\" class=\"main\" hidden>▶ Terugkijken</button>",
  "playButton",
  "text"
 ],
 [
  "<button id=\"playpause\" hidden>Pauze</button>",
  "playPauseButton",
  "text"
 ],
 [
  "<button id=\"reset\" hidden>↻ Opnieuw</button>",
  "resetButton",
  "text"
 ],
 [
  "<label>＋ Eigen foto's of video's",
  "fileLabel",
  "label"
 ],
 [
  "<small id=\"chosen\">3 voorbeeldbeelden</small>",
  "initialImages",
  "text"
 ],
 [
  "<p>Tik rechts of veeg naar links voor het volgende beeld. Bij terugkijken volgen de beelden jouw wisselmomenten.</p>",
  "instruction",
  "text"
 ],
 [
  "<summary>Technische controle (verborgen tijdstempels)</summary>",
  "technicalHeading",
  "text"
 ],
 [
  "<pre id=\"cues\">Nog geen opname</pre>",
  "noRecordingInitial",
  "text"
 ]
];
const messages=[
 [
  "msg(\"Geen geluid opgenomen.\",true)",
  "msg(t(\"noSound\"),true)"
 ],
 [
  "msg(\"Opname bewaard\")",
  "msg(t(\"recordingSaved\"))"
 ],
 [
  "msg(\"Voor opnemen is een beveiligde browser met microfoon nodig.\",true)",
  "msg(t(\"secureRequired\"),true)"
 ],
 [
  "msg(\"● Opname loopt\")",
  "msg(t(\"recordingStarted\"))"
 ],
 [
  "msg(\"Microfoon niet beschikbaar: \"+e.message,true)",
  "msg(t(\"micUnavailable\",{detail:e.message}),true)"
 ],
 [
  "msg(\"Opname gepauzeerd\")",
  "msg(t(\"recordingPaused\"))"
 ],
 [
  "msg(\"● Opname loopt\")",
  "msg(t(\"recordingResumed\"))"
 ],
 [
  "msg(\"Opname verwerken…\")",
  "msg(t(\"processing\"))"
 ],
 [
  "msg(\"Terugkijken\")",
  "msg(t(\"playStarted\"))"
 ],
 [
  "msg(\"Afspelen niet gestart. Probeer opnieuw.\",true)",
  "msg(t(\"playFailed\"),true)"
 ],
 [
  "msg(\"Gepauzeerd\")",
  "msg(t(\"playPaused\"))"
 ],
 [
  "msg(\"Terugkijken\")",
  "msg(t(\"playResumed\"))"
 ],
 [
  "msg(\"Afspelen niet gestart\",true)",
  "msg(t(\"resumeFailed\"),true)"
 ],
 [
  "msg(\"Klaar om opnieuw in te spreken\")",
  "msg(t(\"readyAgain\"))"
 ],
 [
  "msg(\"Klaar om in te spreken\")",
  "msg(t(\"readyFiles\"))"
 ],
 [
  "msg(\"Herinnering afgelopen\")",
  "msg(t(\"memoryEnded\"))"
 ],
 [
  "msg(\"Originele video met geluid\")",
  "msg(t(\"originalSound\"))"
 ],
 [
  "msg(\"Terugkijken afgelopen\")",
  "msg(t(\"playEnded\"))"
 ],
 [
  "msg(presenter?'Herinnering terugkijken':'Luister je opname terug')",
  "msg(t(presenter?\"presenterPrompt\":\"recordingPrompt\"))"
 ],
 [
  "msg('Klaar om in te spreken')",
  "msg(t(\"readyRestored\"))"
 ],
 [
  "m==='paused'?'▶ Hervat':'Ⅱ Pauze'",
  "t(m==='paused'?\"recordResume\":\"recordPause\")"
 ],
 [
  "m==='playing'?'Ⅱ Pauze':'▶ Verder'",
  "t(m==='playing'?\"playingPause\":\"playingResume\")"
 ],
 [
  ":\"Nog geen opname\"}",
  ":t(\"noRecordingDynamic\")}"
 ],
 [
  "files.length+\" eigen beelden\"",
  "t(files.length===1?\"ownImageOne\":\"ownImageMany\",{count:files.length})"
 ],
 [
  "(taleraOriginalIndex+1)+\" / \"+taleraOriginalQueue.length+\" · Video met geluid\"",
  "t(\"videoPosition\",{index:taleraOriginalIndex+1,total:taleraOriginalQueue.length})"
 ],
 [
  "btn.textContent=\"▶ Video met geluid\"",
  "btn.textContent=t(\"videoButton\")"
 ],
 [
  "textContent='Geen beelden'",
  "textContent=t('noImages')"
 ],
 [
  "textContent='▶ Afspelen'",
  "textContent=t('startButton')"
 ],
 [
  "state.items.length+' bestaande beelden'",
  "t(state.items.length===1?'existingImageOne':'existingImageMany',{count:state.items.length})"
 ],
 [
  "setAttribute(\"aria-label\",\"Opnieuw inspreken\")",
  "setAttribute(\"aria-label\",t(\"rerecordAria\"))"
 ]
];
export function localizeEmbeddedPlayer(source,mode){
 assert.ok(['record','present'].includes(mode));
 const prefix='embed.'+mode+'.';
 let html=source;
 const replace=(before,after)=>{assert.equal(html.split(before).length,2,'EMBED_LANGUAGE_SOURCE_DRIFT '+mode+' '+before);html=html.replace(before,()=>after)};
 // Keep exact tags and existing DOM structure. Localize the text node of the file label
 // without replacing its nested native input.
 for(const [before,key,kind] of markup){
  let after=before;
  if(kind==='aria-label')after=before.replace(/>$/,' data-talera-aria-label="'+prefix+key+'">');
  else if(kind==='title')after=before.replace('<title>','<title data-talera-text="'+prefix+key+'">');
  else if(kind==='label')after=before.replace('<label>','<label><span data-talera-text="'+prefix+key+'">')+'</span>';
  else after=before.replace(/>/,' data-talera-text="'+prefix+key+'">');
  replace(before,after);
 }
 for(const [before,after] of messages){
  // Only the identical messages below have two occurrences; each gets a key for its own position.
  const count=html.split(before).length-1;
  assert.ok(count===1||(count===2&&['msg("● Opname loopt")','msg("Terugkijken")'].includes(before)),'EMBED_LANGUAGE_MESSAGE_DRIFT '+mode+' '+before);
  html=html.replace(before,()=>after);
 }
 const start='<script>(function(){"use strict";';
 // Run the localization bootstrap at the same point as the existing player.
 // Its body DOM is already parsed. No changes to recording, playback or message protocol.
 replace(start,'<script>'+languageBootstrap([prefix])+'</script>'+start+'\nconst t=(key,params={})=>window.TaleraLanguage.t('+JSON.stringify(prefix)+'+key,params);');
 return html;
}
