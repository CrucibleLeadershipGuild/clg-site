import { readFileSync, writeFileSync } from "node:fs";
const logo = readFileSync("../brand/seal-reversed.svg","utf8").replace(/<style>[\s\S]*?<\/style>/,"").replace(/<\?xml[\s\S]*?\?>/,"").replace(/<svg ([^>]*?)\swidth="\d+"\sheight="\d+"/,'<svg $1 class="logo"');
const hex=(cx,cy,r,attrs)=>{const p=[0,1,2,3,4,5].map(i=>{const a=Math.PI/180*(60*i-90);return `${(cx+r*Math.cos(a)).toFixed(1)},${(cy+r*Math.sin(a)).toFixed(1)}`}).join(" ");return `<polygon points="${p}" ${attrs}/>`};
const css=`
@font-face{font-family:Cinzel;font-weight:500;src:url(../static/fonts/cinzel-latin-500-normal.woff2)}
@font-face{font-family:Cinzel;font-weight:700;src:url(../static/fonts/cinzel-latin-700-normal.woff2)}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:1200px;background:#1C2430;color:#F4F1EA;font-family:Cinzel,Georgia,serif;position:relative;overflow:hidden}
.wm{position:absolute;right:-260px;top:-200px;opacity:.9}
.frame{position:absolute;inset:48px;border:2px solid #C9A45C;opacity:.55}
.tag{position:absolute;left:110px;top:110px;font-weight:700;font-size:34px;letter-spacing:.22em;color:#C9A45C}
.title{position:absolute;left:110px;right:110px;top:230px;font-weight:700;line-height:1.08}
.rule{position:absolute;left:110px;width:180px;height:6px;background:#B5562A}
.sub{position:absolute;left:110px;right:110px;font-weight:500;font-size:42px;line-height:1.3;color:#F4F1EA}
.logo{position:absolute;left:100px;bottom:90px;width:480px;height:180px}
.price{position:absolute;right:110px;bottom:120px;font-weight:700;font-size:64px;color:#C9A45C}
`;
const wm=`<svg class="wm" width="900" height="900" viewBox="0 0 900 900">${hex(450,450,420,'fill="none" stroke="#6B7178" stroke-opacity=".35" stroke-width="3"')}${hex(450,450,340,'fill="none" stroke="#C9A45C" stroke-opacity=".3" stroke-width="2"')}</svg>`;
const doc=(inner)=>`<!doctype html><meta charset=utf-8><style>${css}</style><body>${wm}<div class=frame></div>${inner}${logo}</body>`;

const kit=doc(`<div class=tag>PDF GUIDE</div>
<div class=title style="font-size:128px">REVIEW<br>SEASON<br>KIT</div>
<div class=rule style="top:700px"></div>
<div class=sub style="top:740px">300+ phrases, 5 scripts and the templates to write fair, specific reviews.</div>`);

const mini=(x,label,fill)=>`<svg style="position:absolute;left:${x}px;top:925px" width="150" height="190" viewBox="0 0 150 190">${hex(75,64,58,fill?'fill="#B5562A" stroke="#C9A45C" stroke-width="3"':'fill="none" stroke="#F4F1EA" stroke-width="3"')}<text x="75" y="165" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="24" letter-spacing="3" fill="#F4F1EA">${label}</text></svg>`;
const course=doc(`<div class=tag>COURSE &middot; 7 MODULES</div>
<div class=title style="font-size:76px;top:200px">YOU'RE NOT FAILING AT LEADERSHIP.<br><span style="color:#C9A45C">YOU'RE USING THE WRONG MODE.</span></div>
<div class=rule style="top:610px"></div>
<div class=sub style="top:650px;font-size:38px">Lead, manage or mentor: choose the right mode for the moment.</div>
${mini(640,"LEAD",false)}${mini(800,"MANAGE",true)}${mini(960,"MENTOR",false)}`);
writeFileSync("review-season-kit.html",kit);writeFileSync("wrong-mode-course.html",course);
