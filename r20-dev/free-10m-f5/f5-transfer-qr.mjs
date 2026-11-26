// Fixed-size QR Model 2 version 2-M, alphanumeric only, one 28-data/16-ECC
// Reed-Solomon block. No URL, account ID, media, network, or third-party service.
// A single format is accepted exclusively for this existing pairing flow.
const PREFIX='TALERA1:',ALPHABET='0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
export function pairingPayload(code){
 if(typeof code!=='string'||!/^[a-f0-9]{20}$/.test(code))throw Error('PAIR_CODE');
 return PREFIX+code.toUpperCase();
}
export function readPairingPayload(text){
 if(typeof text!=='string'||!/^TALERA1:[0-9A-F]{20}$/.test(text))return null;
 return text.slice(PREFIX.length).toLowerCase();
}
const mul=(a,b)=>{
 let r=0;
 while(b){if(b&1)r^=a;b>>=1;a<<=1;if(a&256)a^=0x11d}
 return r;
};
function ecc(data){
 let poly=[1],root=1;
 for(let i=0;i<16;i++){
  const next=Array(poly.length+1).fill(0);
  for(let j=0;j<poly.length;j++){next[j]^=poly[j];next[j+1]^=mul(poly[j],root)}
  poly=next;root=mul(root,2);
 }
 const work=[...data,...Array(16).fill(0)];
 for(let i=0;i<data.length;i++){
  const lead=work[i];for(let j=0;j<poly.length;j++)work[i+j]^=mul(poly[j],lead);
 }
 return work.slice(data.length);
}
function words(payload){
 const bits=[],put=(value,len)=>{for(let i=len-1;i>=0;i--)bits.push((value>>i)&1)};
 put(2,4);put(payload.length,9);
 for(let i=0;i<payload.length;i+=2){
  const a=ALPHABET.indexOf(payload[i]);
  if(i+1<payload.length)put(a*45+ALPHABET.indexOf(payload[i+1]),11);else put(a,6);
 }
 put(0,Math.min(4,224-bits.length));while(bits.length%8)bits.push(0);
 const data=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>a*2+b,0));
 for(let i=0;data.length<28;i++)data.push(i%2?0x11:0xec);
 return [...data,...ecc(data)];
}
const n=25;
const MASKS=[
 (x,y)=>(x+y)%2===0,(x,y)=>y%2===0,(x,y)=>x%3===0,(x,y)=>(x+y)%3===0,
 (x,y)=>(Math.floor(y/2)+Math.floor(x/3))%2===0,
 (x,y)=>x*y%2+x*y%3===0,(x,y)=>(x*y%2+x*y%3)%2===0,
 (x,y)=>((x+y)%2+x*y%3)%2===0
];
function format(mask){
 // ECL M format selector = 00. BCH(15,5), standard format XOR mask.
 let rem=mask<<10;
 for(let i=14;i>=10;i--)if((rem>>>i)&1)rem^=0x537<<(i-10);
 return ((mask<<10)|rem)^0x5412;
}
function matrix(codewords,mask){
 const m=Array.from({length:n},()=>Array(n).fill(null));
 const set=(x,y,v)=>{if(x>=0&&x<n&&y>=0&&y<n)m[y][x]=v?1:0};
 const finder=(cx,cy)=>{for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){
  const distance=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,distance!==2&&distance!==4);
 }};
 finder(3,3);finder(n-4,3);finder(3,n-4);
 for(let i=8;i<n-8;i++){set(i,6,i%2===0);set(6,i,i%2===0)}
 for(let y=-2;y<=2;y++)for(let x=-2;x<=2;x++)set(18+x,18+y,Math.max(Math.abs(x),Math.abs(y))!==1);
 const f=format(mask),bit=i=>(f>>>i)&1;
 for(let i=0;i<=5;i++)set(8,i,bit(i));
 set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));
 for(let i=9;i<15;i++)set(14-i,8,bit(i));
 for(let i=0;i<8;i++)set(n-1-i,8,bit(i));
 for(let i=8;i<15;i++)set(8,n-15+i,bit(i));
 set(8,n-8,1);
 let index=0,up=true;
 for(let x=n-1;x>=1;x-=2){
  if(x===6)x--;
  for(let i=0;i<n;i++){
   const y=up?n-1-i:i;
   for(let dx=0;dx<2;dx++)if(m[y][x-dx]===null){
    const value=index<codewords.length*8?(codewords[index>>>3]>>>(7-index%8))&1:0;
    set(x-dx,y,value^Number(MASKS[mask](x-dx,y)));index++;
   }
  }
  up=!up;
 }
 if(index!==359||m.some(row=>row.includes(null)))throw Error('QR_MATRIX');
 return m;
}
function score(m){
 let p=0,black=0;
 for(let y=0;y<n;y++)for(let x=0;x<n;x++){
  black+=m[y][x];
  if(x<n-1&&y<n-1&&m[y][x]===m[y][x+1]&&m[y][x]===m[y+1][x]&&m[y][x]===m[y+1][x+1])p+=3;
 }
 for(const rows of [m,m[0].map((_,x)=>m.map(row=>row[x]))])for(const row of rows){
  let count=1;for(let i=1;i<n;i++){
   if(row[i]===row[i-1])count++;else{if(count>=5)p+=count-2;count=1}
  }
  if(count>=5)p+=count-2;
  const line='0000'+row.join('')+'0000';
  for(let i=0;i<=line.length-11;i++)if(['00001011101','10111010000'].includes(line.slice(i,i+11)))p+=40;
 }
 p+=Math.floor(Math.abs(black*100/(n*n)-50)/5)*10;return p;
}
export function pairingMatrix(code){
 const data=words(pairingPayload(code));
 let best=null,min=Infinity;
 for(let mask=0;mask<8;mask++){
  const m=matrix(data,mask),s=score(m);if(s<min){best=m;min=s}
 }
 return best;
}
export function drawPairingQR(canvas,code){
 const m=pairingMatrix(code),size=8,quiet=4;
 canvas.width=canvas.height=(n+quiet*2)*size;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('QR_CANVAS');
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.fillStyle='#000';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(m[y][x])ctx.fillRect((x+quiet)*size,(y+quiet)*size,size,size);
}
