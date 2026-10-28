
function mode(m){
 state.mode=m;document.body.dataset.stage=m;
 $('record').hidden=m!=='idle';
 $('pause').hidden=m!=='recording'&&m!=='paused';
 $('pause').textContent=m==='paused'?'▶ Hervat':'Ⅱ Pauze';
 $('stop').hidden=m!=='recording'&&m!=='paused';
 $('play').hidden=m!=='ready';
 $('playpause').hidden=m!=='playing'&&m!=='playPaused';
 $('playpause').textContent=m==='playing'?'Ⅱ Pauze':'▶ Verder';
 $('reset').hidden=m!=='ready';
 $('files').disabled=['recording','paused','playing','playPaused'].includes(m);
}
