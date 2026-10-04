import {createTitle} from './title.js';
export function installGuidedTell({getStory,flush,saveTitle,saveAnalysis=async()=>{},notice}){
  const screen=document.getElementById('screen'),title=document.getElementById('title'),date=document.querySelector('.top .date'),field=document.getElementById('storyText'),publish=document.getElementById('timelinePublish');
  const guide=document.createElement('section');guide.id='freeGuide';guide.innerHTML='<p id="freeStep"></p><button id="freeSkipPhoto" type="button">Zonder foto verder</button><button id="freeReview" type="button" hidden>Verder · titel en datum</button>';
  screen.classList.add('free-guided');screen.append(guide);const step=guide.querySelector('p'),skip=guide.querySelector('#freeSkipPhoto'),review=guide.querySelector('#freeReview');
  const status=document.createElement('p');status.id='freeTitleStatus';status.setAttribute('role','status');document.getElementById('editTitle').after(status);
  const ai=createTitle({onStatus:text=>status.textContent=text});let phase='photo',manual=false,token=0;
  const content=()=>Boolean(getStory().photos.length||field.value.trim()||getStory().audioId);
  function paint(){if(phase==='photo'&&(getStory().photos.length||content()))phase='story';screen.dataset.freeStep=phase;screen.classList.toggle('free-story-only',phase!=='photo'&&!getStory().photos.length);title.hidden=phase!=='review';if(date)date.hidden=phase!=='review';skip.hidden=phase!=='photo';review.hidden=phase==='photo'||!content();document.getElementById('editBtn').hidden=!content();publish.hidden=phase!=='review';step.textContent=phase==='photo'?'1 · Kies foto’s, of begin zonder foto.':phase==='story'?getStory().photos.length?'2 · Vertel bij je foto, of ga verder naar titel en datum.':'2 · Vertel of schrijf je herinnering.':'3 · Controleer je titel en kies wanneer dit was.';}
  function edited(){manual=true;status.textContent='Je eigen titel wordt bewaard.';}
  title.addEventListener('input',edited);document.getElementById('editTitle').addEventListener('input',edited);
  skip.onclick=()=>{phase='story';paint();};
  const prepareReview=async()=>{
    if(window.__taleraFreeRecording?.busy()||window.__taleraFreeSpeech?.busy()){notice('Rond eerst je opname en tekst af.');return;}
    if(!content()){notice('Voeg eerst een foto of verhaal toe.');return;}
    await flush();phase='review';
    const story=getStory(),text=field.value.trim();if(!story.date&&!story.eventTime){const capture=story.photos.find(p=>p.captureDate)?.captureDate;if(capture)document.getElementById('editDate').value=capture;}
    manual=manual||Boolean(story.title&&!['ai','suggestion'].includes(story.titleSource));
    if(!text){if(!story.title){const request=++token;const saved=await saveTitle('Mijn herinnering',()=>request===token&&!manual,'suggestion');if(saved){title.value='Mijn herinnering';document.getElementById('editTitle').value=title.value;}}status.textContent='Pas de titel gerust aan.';return;}
    if(story.analysis?.sourceText===text&&story.titleSource==='ai'){status.textContent='Pas de titel gerust aan.';return;}
    const request=++token;
    status.textContent='Titel wordt gemaakt…';
    // Background work does not block choosing a date or editing the proposed title.
    ai.analyze(text,async suggestion=>{const current=()=>request===token&&field.value.trim()===text&&!manual;if(current()&&await saveTitle(suggestion,current,'ai')){title.value=suggestion;document.getElementById('editTitle').value=suggestion;}}).then(async result=>{
      const current=()=>request===token&&field.value.trim()===text;
      if(!current())return;
      await saveAnalysis(result.analysis,current);
      if(!manual&&await saveTitle(result.title,()=>current()&&!manual,'ai')){title.value=result.title;document.getElementById('editTitle').value=result.title;}
      if(current())status.textContent='Pas de titel gerust aan.';
    }).catch(()=>{if(request===token)status.textContent='Je kunt zelf een titel invullen.';});
  };
  review.onclick=()=>prepareReview().catch(error=>notice(error.message)).finally(()=>{if(phase==='review'){paint();document.getElementById('editBtn').click();document.getElementById('editTitle').value=title.value;if(!getStory().date&&!getStory().eventTime){const capture=getStory().photos.find(p=>p.captureDate)?.captureDate;if(capture)document.getElementById('editDate').value=capture;}}});
  document.getElementById('editBtn').addEventListener('click',event=>{if(phase!=='review'){event.stopImmediatePropagation();if(content())review.click();else notice('Voeg eerst een foto of verhaal toe.');}},true);
  field.addEventListener('input',()=>{token++;paint();});window.addEventListener('talera-free-saved',paint);
  window.addEventListener('talera-guided-ready',()=>{if(getStory().status==='published')phase='review';paint();});
  paint();return {refresh:paint};
}
