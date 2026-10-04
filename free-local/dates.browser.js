export const seasons={voorjaar:[2,5],zomer:[5,8],herfst:[8,11],winter:[-1,2]};
export function seasonTime(season,year){
  if(!Object.hasOwn(seasons,season)||!Number.isInteger(year)||year<1||year>9999)throw new Error('Kies een seizoen en jaartal.');
  return {kind:'season',season,year};
}
export function validTime(story){return Boolean(story.date&&/^\d{4}-\d{2}-\d{2}$/.test(story.date)&&Number.isFinite(Date.parse(story.date))&&new Date(story.date).toISOString().slice(0,10)===story.date)||Boolean(story.eventTime?.kind==='season'&&Object.hasOwn(seasons,story.eventTime.season)&&Number.isInteger(story.eventTime.year)&&story.eventTime.year>0&&story.eventTime.year<10000);}
export function timeLabel(story){return story.eventTime?.kind==='season'?`${story.eventTime.season} ${story.eventTime.year}`:story.date?new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric'}).format(new Date(story.date+'T12:00:00')):'Kies een datum of tijdvak';}
export function timelineStories(stories){
  const groups=new Map();for(const story of stories){if(story.eventTime?.kind!=='season')continue;const key=story.eventTime.season+story.eventTime.year;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(story);}
  const positions=new Map();for(const group of groups.values()){
    group.sort((a,b)=>(a.timelineOrder??a.postedAt??a.createdAt??0)-(b.timelineOrder??b.postedAt??b.createdAt??0)||a.id.localeCompare(b.id));
    const {season,year}=group[0].eventTime,[from,to]=seasons[season];const boundary=month=>{const d=new Date(0);d.setFullYear(year,month,1);d.setHours(12,0,0,0);return d.getTime();};const start=boundary(from),end=Math.min(boundary(to),Date.now());
    group.forEach((story,i)=>positions.set(story.id,start+(end-start)*(i+1)/(group.length+1)));
  }
  return stories.map(story=>({...story,displayMs:positions.get(story.id)||Date.parse((story.date||new Date(story.createdAt||0).toISOString().slice(0,10))+'T12:00:00')})).sort((a,b)=>a.displayMs-b.displayMs||(a.timelineOrder??a.postedAt??a.createdAt??0)-(b.timelineOrder??b.postedAt??b.createdAt??0)||a.id.localeCompare(b.id));
}
