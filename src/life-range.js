// Canonical, presentation-independent life range. The same function is used
// by the approved RH19 timeline and the newer phone timeline.
export function deriveLifeRange(memories, birthYear, now=new Date()) {
  const present=now instanceof Date?now:new Date(now);
  if(!Number.isFinite(present.getTime()))throw Error('Invalid current date');
  const endYear=present.getFullYear();
  let startYear=endYear;
  const born=Number(birthYear);
  if(Number.isInteger(born)&&born>=1000&&born<=endYear)startYear=born;
  if(Array.isArray(memories))for(const memory of memories){
    if(!memory)continue;
    const date=String(memory.date||memory.at||'');
    let year=/^\d{4}-\d{2}-\d{2}/.test(date)?Number(date.slice(0,4)):NaN;
    if(!Number.isInteger(year) && Number.isFinite(memory.ms))year=new Date(memory.ms).getFullYear();
    if(Number.isInteger(year)&&year>=1000&&year<=endYear)startYear=Math.min(startYear,year);
  }
  const startMs=new Date(startYear,0,1).getTime();
  const endMs=present.getTime();
  return {startYear,endYear,startMs,endMs,totalDays:Math.floor((endMs-startMs)/86400000)+1};
}
// The browser implementation is literally this function; no second date model.
export const LIFE_RANGE_SCRIPT='<script id="talera-life-range-model">window.TaleraLifeRange='+deriveLifeRange.toString()+';</script>';
