import {createTitle} from './title.js';
export function installGuidedTell({getStory,flush,saveTitle,notice}){
  const screen=document.getElementById('screen'),title=document.getElementById('title'),date=document.querySelector('.top .date'),field=document.getElementById('storyText'),publish=document.getElementById('timelinePublish');
  const guide=document.createElement('section');guide.id='freeGuide';guide.innerHTML='<p id="freeStep"></p><button id="freeSkipPhoto" type="button">Zonder foto verder</button><button id="freeReview" type="button" hidden>Verder · titel en datum</button>';
  screen.classList.add('free-guided');screen.append(guide);const step=guide.querySelector('p'),skip=guide.querySelector('#freeSkipPhoto'),review=guide.querySelector('#freeReview');
  const status=document.createElement('p');status.id='freeTitleStatus';status.setAttribute('role','status');document.getElementById('editTitle').after(status);
  const aiButton=document.createElement('button');aiButton.id='freeTitleRetry';aiButton.type='button';aiButton.textContent='AI-titel maken · eerste download circa 750 MB';status.after(aiButton);let generate=()=>{};aiButton.onclick=()=>generate();
  const ai=createTitle({onStatus:text=>status.textContent=text});let phase='photo',manual=false,token=0,lastText='',proposed='';
  const content=()=>Boolean(getStory().photos.length||field.value.trim()||getStory().audioId);
  function paint(){if(phase==='photo'&&(getStory().photos.length||content()))phase='story';screen.dataset.freeStep=phase;screen.classList.toggle('free-story-only',phase!=='photo'&&!getStory().photos.length);title.hidden=phase!=='review';if(date)date.hidden=phase!=='review';skip.hidden=phase!=='photo';review.hidden=phase==='photo'||!content();document.getElementById('editBtn').hidden=!content();publish.hidden=phase!=='review';step.textContent=phase==='photo'?'1 · Kies foto’s, of begin zonder foto.':phase==='story'?getStory().photos.length?'2 · Vertel bij je foto, of ga verder naar titel en datum.':'2 · Vertel of schrijf je herinnering.':'3 · Controleer je titel en kies wanneer dit was.';}
  function edited(){manual=true;token++;status.textContent='Je eigen titel wordt bewaard.';}
  title.addEventListener('input',edited);document.getElementById('editTitle').addEventListener('input',edited);
  skip.onclick=()=>{phase='story';paint();};
  const prepareReview=async()=>{
    if(window.__taleraFreeRecording?.busy()||window.__taleraFreeSpeech?.busy()){notice('Rond eerst je opname en tekst af.');return;}
    if(!content()){notice('Voeg eerst een foto of verhaal toe.');return;}
    await flush();phase='review';
    const story=getStory(),text=field.value.trim();aiButton.hidden=!text;if(!story.date&&!story.eventTime){const capture=story.photos.find(p=>p.captureDate)?.captureDate;if(capture)document.getElementById('editDate').value=capture;}
    if((story.title&&!['ai','suggestion'].includes(story.titleSource))||manual){status.textContent='Je kunt je titel aanpassen.';aiButton.hidden=true;return;}
    if(!text){if(!story.title){const request=++token;const saved=await saveTitle('Mijn herinnering',()=>request===token&&!manual,'suggestion');if(saved){title.value='Mijn herinnering';document.getElementById('editTitle').value=title.value;}}status.textContent='Voorstel zonder verhaaltekst · pas de titel aan, of vertel eerst bij je foto voor een AI-titel.';return;}
    const request=++token;
    if(!story.title||story.titleSource==='suggestion'){const initial=text.split(/[.!?\n]/)[0].trim().split(/\s+/).slice(0,6).join(' ');const saved=await saveTitle(initial,()=>request===token&&!manual&&field.value.trim()===text,'suggestion');if(saved){proposed=initial;title.value=initial;document.getElementById('editTitle').value=initial;}}
    status.textContent='Titelvoorstel uit je tekst · pas het gerust aan. De AI-optie draait op dit toestel.';
    generate=async()=>{if(manual){status.textContent='Je eigen titel wordt bewaard.';return;}const request=++token;aiButton.disabled=true;
      try{const suggestion=await ai.suggest(text);if(request!==token||manual||field.value.trim()!==text)return;const saved=await saveTitle(suggestion,()=>request===token&&!manual&&field.value.trim()===text,'ai');if(!saved)return;proposed=suggestion;title.value=suggestion;document.getElementById('editTitle').value=suggestion;localStorage.setItem('talera.free.aiTitles','1');status.textContent='AI-titelvoorstel · pas het gerust aan.';aiButton.textContent='Nieuw AI-titelvoorstel';}
      catch{if(request===token)status.textContent='Het lokale AI-titelvoorstel is niet beschikbaar. Je kunt de titel zelf aanpassen en verdergaan.';}
      finally{aiButton.disabled=false;}
    };
    if(localStorage.getItem('talera.free.aiTitles')==='1')generate();
  };
  review.onclick=()=>prepareReview().catch(error=>notice(error.message)).finally(()=>{if(phase==='review'){paint();document.getElementById('editBtn').click();document.getElementById('editTitle').value=title.value;if(!getStory().date&&!getStory().eventTime){const capture=getStory().photos.find(p=>p.captureDate)?.captureDate;if(capture)document.getElementById('editDate').value=capture;}}});
  document.getElementById('editBtn').addEventListener('click',event=>{if(phase!=='review'){event.stopImmediatePropagation();if(content())review.click();else notice('Voeg eerst een foto of verhaal toe.');}},true);
  field.addEventListener('input',()=>{token++;paint();});window.addEventListener('talera-free-saved',paint);
  window.addEventListener('talera-guided-ready',()=>{if(getStory().status==='published')phase='review';paint();});
  paint();return {refresh:paint};
}
