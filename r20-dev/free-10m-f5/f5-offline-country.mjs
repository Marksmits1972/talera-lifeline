// Pure offline country classifier. The only input is coordinates from the
// existing bounded original-media reader (or an explicitly confirmed fix).
// Map units without a trusted code still participate in ambiguity checks.
export function createOfflineCountryResolver(data){
 if(!data||data.version!=='natural-earth-50m-5.1.2-independent')throw Error('TALERA_COUNTRY_DATA_VERSION');
 let polygons;
 function decode(){
  const arcs=data.arcs.map(encoded=>{
   const bytes=atob(encoded),points=[];let value=0,shift=0,x=0,y=0,axis=0;
   for(let i=0;i<bytes.length;i++){
    const b=bytes.charCodeAt(i);value+=(b&127)*2**shift;
    if(b&128){shift+=7;if(shift>28)throw Error('TALERA_COUNTRY_ARC');continue}
    const d=value%2?-(value+1)/2:value/2;value=0;shift=0;
    if(axis===0)x+=d;else{y+=d;points.push([x*data.scale[0]+data.translate[0],y*data.scale[1]+data.translate[1]])}
    axis^=1;
   }
   if(axis||shift||points.length<2)throw Error('TALERA_COUNTRY_ARC');
   return points;
  });
  const ring=refs=>{
   const points=[];
   for(const ref of refs){
    const arc=arcs[ref<0?~ref:ref];if(!arc)throw Error('TALERA_COUNTRY_ARC_REF');
    for(let i=points.length?1:0;i<arc.length;i++)points.push(arc[ref<0?arc.length-1-i:i]);
   }
   return points;
  };
  return data.units.flatMap(([code,parts])=>parts.map(part=>{
   const rings=part.map(ring),outer=rings[0];let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
   for(const [x,y] of outer){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y)}
   return {code,rings,west,east,south,north};
  }));
 }
 function inRing(points,x,y){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const [ax,ay]=points[j],[bx,by]=points[i];
   if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
 }
 function inPolygon(p,x,y){return inRing(p.rings[0],x,y)&&!p.rings.slice(1).some(r=>inRing(r,x,y))}
 // 2 km conservative competing-land margin, not a legal boundary guarantee.
 // Longitude is scaled locally by latitude; no nearest-country fallback.
 function closeRing(points,x,y,cosLat){
  const threshold=(2/111.195)**2;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
   const ax=(points[j][0]-x)*cosLat,ay=points[j][1]-y,bx=(points[i][0]-x)*cosLat,by=points[i][1]-y;
   const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy;
   const t=d?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/d)):0;
   if((ax+t*dx)**2+(ay+t*dy)**2<=threshold)return true;
  }
  return false;
 }
 return ({latitude,longitude}={})=>{
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
  polygons??=decode();
  const y=latitude,x=longitude;
  const hits=polygons.filter(p=>x>=p.west&&x<=p.east&&y>=p.south&&y<=p.north&&inPolygon(p,x,y));
  if(!hits.length||!hits[0].code||hits.some(p=>p.code!==hits[0].code))return null;
  const code=hits[0].code,dy=2/111.195,cosLat=Math.max(.001,Math.cos(y*Math.PI/180)),dx=dy/cosLat;
  // Dateline edges in the source are clipped at +/-180. Check both sides.
  for(const lon of [x,x-360,x+360]){
   if(lon< -180-dx||lon>180+dx)continue;
   for(const p of polygons){
    if(p.code===code||lon<p.west-dx||lon>p.east+dx||y<p.south-dy||y>p.north+dy)continue;
    if(p.rings.some(r=>closeRing(r,lon,y,cosLat)))return null;
   }
  }
  const country=new Intl.DisplayNames(['nl'],{type:'region',fallback:'none'}).of(code);
  return country?{countryCode:code,country,city:'',source:'offline-country-v1'}:null;
 };
}
