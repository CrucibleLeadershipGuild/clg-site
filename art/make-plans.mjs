import { readFileSync, writeFileSync } from "node:fs";
const logo = readFileSync("../brand/seal-reversed.svg","utf8").replace(/<style>[\s\S]*?<\/style>/,"").replace(/<\?xml[\s\S]*?\?>/,"").replace(/<svg ([^>]*?)\swidth="\d+"\sheight="\d+"/,'<svg $1 class="logo"');
const hex=(cx,cy,r,a)=>{const p=[0,1,2,3,4,5].map(i=>{const t=Math.PI/180*(60*i-90);return `${(cx+r*Math.cos(t)).toFixed(1)},${(cy+r*Math.sin(t)).toFixed(1)}`}).join(" ");return `<polygon points="${p}" ${a}/>`};
const css=`
@font-face{font-family:Cinzel;font-weight:500;src:url(../static/fonts/cinzel-latin-500-normal.woff2)}
@font-face{font-family:Cinzel;font-weight:700;src:url(../static/fonts/cinzel-latin-700-normal.woff2)}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:1200px;background:#1C2430;color:#F4F1EA;font-family:Cinzel,Georgia,serif;position:relative;overflow:hidden}
.frame{position:absolute;inset:48px;border:2px solid #C9A45C;opacity:.55}
.tag{position:absolute;left:110px;top:110px;font-weight:700;font-size:34px;letter-spacing:.22em;color:#C9A45C}
.title{position:absolute;left:110px;top:200px;font-weight:700;font-size:150px;line-height:1.05}
.rule{position:absolute;left:110px;top:430px;width:180px;height:6px;background:#B5562A}
.sub{position:absolute;left:110px;width:470px;top:480px;font-weight:500;font-size:40px;line-height:1.3}
.cad{position:absolute;left:110px;top:700px;font-weight:700;font-size:36px;letter-spacing:.12em;color:#C9A45C}
.logo{position:absolute;left:100px;bottom:90px;width:480px;height:180px}
.motif{position:absolute;left:600px;top:440px}
`;
const motif=(n)=>{const cx=300,cy=300,rs=[250,190,130].slice(0,n===1?1:n===2?2:3);
 // outermost ring first; innermost ring is filled Ember so the count reads at a glance
 const rings=rs.map((r,i)=>hex(cx,cy,r,i===rs.length-1?'fill="#B5562A" stroke="#C9A45C" stroke-width="4"':'fill="none" stroke="#F4F1EA" stroke-width="5"')).join("");
 return `<svg class="motif" width="600" height="600" viewBox="0 0 600 600">${rings}</svg>`};
const plans=[["starter","STARTER","Weekly",1],["pro","PRO","Monthly",2],["advanced","ADVANCED","Quarterly",3]];
for(const [slug,name,cad,n] of plans){
 writeFileSync(`mentoring-${slug}.html`,`<!doctype html><meta charset=utf-8><style>${css}</style><body><div class=frame></div>
<div class=tag>MENTORING</div><div class=title>${name}</div><div class=rule></div>
<div class=sub>One hour a week, one-on-one, focused on your goals as a leader.</div>
<div class=cad>BILLED ${cad.toUpperCase()}</div>${motif(n)}${logo}</body>`);
}
