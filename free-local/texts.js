import {nl} from './copy.browser.js';
export const catalog=nl;
export function applyCatalog(html){
  return html.replace(/(<script[^>]*>)([\s\S]*?)(<\/script>)/g,(_,open,code,close)=>{
    for(const [key,text] of Object.entries(catalog)) {
      for(const quote of ["'",'"'])code=code.split(quote+text+quote).join(`window.__taleraT(${JSON.stringify(key)})`);
    }
    return open+code+close;
  });
}
