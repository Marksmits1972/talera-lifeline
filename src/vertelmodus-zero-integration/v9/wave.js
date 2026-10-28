/* V9: voice-only waveform samples actual microphone input during recording and replays its stored envelope in the same session. No change to recorder/audio destination. */
let taleraV9Envelope=[],taleraV9SampleAt=-1000;
function taleraV9PlaybackRms(ms){
 if(!taleraV9Envelope.length)return 0;
 let lo=0,hi=taleraV9Envelope.length-1;
 while(lo<hi){const mid=(lo+hi+1)>>1;if(taleraV9Envelope[mid].t<=ms)lo=mid;else hi=mid-1}
 return taleraV9Envelope[lo].rms;
}