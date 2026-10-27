/* ═══ INGRID-EGGET v2 · «Fire dager i København» ═══
   Skriv «ingrid» på forsiden, eller åpne evers.no/#ingrid.
   Uomtalt og utelles med vilje, som «jobb»: står ikke i EGGS/WORDS.
   Alt er tegnet og komponert i kode: ingen bilder, ingen lydfiler, ingen biblioteker.
   Esc eller ✕ lukker, M slår lyden av og på. Redusert bevegelse: sluttbildet stille, uten lyd.
   Bildet er en ren funksjon av tiden t, så det kan spoles og tas opp bilde for bilde. */
(function(){
'use strict';
if(window.ingridEgg)return;

/* ───────────── verktøy ───────────── */
var TAU=Math.PI*2;
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function lerp(a,b,k){return a+(b-a)*k;}
function sstep(a,b,v){var k=clamp((v-a)/(b-a),0,1);return k*k*(3-2*k);}
function eio(k){k=clamp(k,0,1);return k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2;}
function eout(k){k=clamp(k,0,1);return 1-Math.pow(1-k,3);}
function ein(k){k=clamp(k,0,1);return k*k*k;}
function lin(k){return clamp(k,0,1);}
function eback(k){k=clamp(k,0,1);var c1=1.4,c3=c1+1;return 1+c3*Math.pow(k-1,3)+c1*Math.pow(k-1,2);}
function win(t,a,b,i,o){if(t<=a||t>=b)return 0;return Math.min(clamp((t-a)/i,0,1),clamp((b-t)/o,0,1));}
function kf(t,K,ef){if(t<=K[0][0])return K[0][1];
  for(var i=1;i<K.length;i++){if(t<=K[i][0]){var a=K[i-1],b=K[i];return lerp(a[1],b[1],(ef||eio)((t-a[0])/(b[0]-a[0])));}}
  return K[K.length-1][1];}
function kfc(t,K){if(t<=K[0][0])return K[0][1];
  for(var i=1;i<K.length;i++){if(t<=K[i][0]){var a=K[i-1],b=K[i];return mix(a[1],b[1],(t-a[0])/(b[0]-a[0]));}}
  return K[K.length-1][1];}
function hash(i){var x=Math.sin(i*127.1+311.7)*43758.5453;return x-Math.floor(x);}
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;var t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function mix(a,b,k){return[a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k,a[2]+(b[2]-a[2])*k];}
function rgba(c,a){return'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+(a==null?1:Math.round(clamp(a,0,1)*1000)/1000)+')';}

/* ───────────── manus ───────────── */
var END=56;
var CAM=[[0,150],[4,170],[7,600],[11,640],[13,1900],[18.6,1945],[21,3300],[26.6,3335],[28.6,4300],[32.6,4330],[34.2,5410],[39.4,5430],[42,6480],[56,6560]];
var CAMY=[[0,0],[46.5,0],[51,.07]];
var TOD=[[0,.12],[4,.15],[7,1],[39.4,1],[42,.46],[47,.47],[50.2,1]];
var CAPS=[
  {a:7.0, b:11.0,l:'Tirsdag',t:'Middag på Barr'},
  {a:12.2,b:18.6,l:'Tirsdag',t:'Sirkus i Skuespilhuset'},
  {a:20.4,b:26.6,l:'Onsdag', t:'Pluto, så jazz på Montmartre'},
  {a:27.8,b:32.6,l:'Torsdag',t:'Kunst under palmene'},
  {a:33.6,b:39.4,l:'Torsdag',t:'FCK i Parken'},
  {a:41.0,b:47.0,l:'Fredag', t:'Hjem sammen'},
  {a:52.8,b:1e9, l:'Vi ses snart',t:'København venter'}
];
var GATHER=50.0;

/* ───────────── farger ───────────── */
var NIGHT=[9,14,30];
var WARMS=[[255,198,120],[255,214,150],[255,186,110],[250,226,182],[255,206,140]];
var SKY=[[0,[[92,142,198],[160,196,228],[226,236,242]]],[.12,[[92,142,198],[160,196,228],[226,236,242]]],
  [.46,[[44,60,112],[178,108,122],[248,166,94]]],[.7,[[18,28,60],[58,60,108],[160,94,108]]],[1,[[5,10,24],[15,28,58],[50,50,90]]]];
var WATER=[[0,[80,114,142]],[.12,[80,114,142]],[.46,[60,58,90]],[.7,[20,24,50]],[1,[5,10,22]]];
var DARK=[[0,0],[.12,.03],[.46,.42],[.7,.7],[1,.84]];
var C={ochre:[204,158,80],roof:[66,52,46],frame:[236,231,218],glass:[46,56,70],brick:[152,80,62],dbrick:[64,46,44],
  copper:[96,108,100],stone:[208,192,166],grey:[122,126,134],white:[218,220,224],wood:[72,56,46],quay:[86,82,78],
  far:[126,144,168],far2:[106,122,148],patina:[110,150,140],tree:[44,58,48]};

window.ingridEgg=function(opts){
opts=opts||{};
if(document.getElementById('ingridEgg'))return null;
var MANUAL=!!opts.manual;
var RED=!MANUAL&&window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
var DISPLAY='"IngridDisplay","Cormorant Garamond","Newsreader",Georgia,serif';
var SANS='"Hanken Grotesk",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
var Q={hi:true,strip:2,grain:true,parts:2300,bloom:true};
var prevFocus=document.activeElement;

/* ───────────── DOM ───────────── */
var wrap=document.createElement('div');
wrap.id='ingridEgg';wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');
wrap.setAttribute('aria-label','Fire dager i København, for Ingrid');
wrap.style.cssText='position:fixed;inset:0;z-index:100000;background:#05080f;opacity:0;transition:opacity .8s ease;overflow:hidden;-webkit-user-select:none;user-select:none';
var cv=document.createElement('canvas');
cv.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
cv.setAttribute('aria-hidden','true');
var title=document.createElement('div');
title.style.cssText='position:absolute;left:0;right:0;top:19vh;text-align:center;color:#fff8ec;pointer-events:none;opacity:0;padding:0 20px';
var tLab=document.createElement('div'),tBig=document.createElement('div');
tLab.textContent='3.–6. november';
tLab.style.cssText='font:600 13px/1 '+SANS+';letter-spacing:.32em;text-transform:uppercase;color:#f6dfae;margin-bottom:14px;text-shadow:0 1px 12px rgba(0,0,0,.35)';
tBig.textContent='København';
tBig.style.cssText='font:italic 600 clamp(54px,10vw,132px)/1 '+DISPLAY+';text-shadow:0 2px 30px rgba(20,30,60,.45)';
title.appendChild(tLab);title.appendChild(tBig);
var cap=document.createElement('div');
cap.setAttribute('aria-live','polite');
cap.style.cssText='position:absolute;left:0;right:0;bottom:max(10vh,74px);text-align:center;color:#f6eddc;pointer-events:none;opacity:0;padding:0 20px';
var cLab=document.createElement('div'),cTit=document.createElement('div');
cLab.style.cssText='font:600 12px/1 '+SANS+';letter-spacing:.34em;text-transform:uppercase;color:#e9bd6e;margin-bottom:12px';
cTit.style.cssText='font:italic 500 clamp(24px,3.4vw,40px)/1.15 '+DISPLAY+';text-shadow:0 2px 18px rgba(0,0,0,.55)';
cap.appendChild(cLab);cap.appendChild(cTit);
function mkBtn(txt,label,css){var b=document.createElement('button');b.type='button';b.textContent=txt;b.setAttribute('aria-label',label);
  b.style.cssText='position:absolute;border:1px solid rgba(246,237,220,.32);background:rgba(8,12,24,.42);color:#f6eddc;cursor:pointer;'+
  'font:500 13px/1 '+SANS+';letter-spacing:.04em;border-radius:999px;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);transition:opacity .5s ease,background .2s ease;'+css;
  b.addEventListener('mouseenter',function(){b.style.background='rgba(30,40,70,.6)';});
  b.addEventListener('mouseleave',function(){b.style.background='rgba(8,12,24,.42)';});
  b.addEventListener('focus',function(){b.style.outline='2px solid #e9bd6e';b.style.outlineOffset='3px';});
  b.addEventListener('blur',function(){b.style.outline='none';});return b;}
var xBtn=mkBtn('✕','Lukk','top:max(16px,env(safe-area-inset-top));right:max(16px,env(safe-area-inset-right));width:42px;height:42px;font-size:16px');
var sBtn=mkBtn('♪ Lyd av','Slå av lyden','left:max(16px,env(safe-area-inset-left));bottom:max(16px,env(safe-area-inset-bottom));height:36px;padding:0 16px');
var rBtn=mkBtn('↻ Se igjen','Spill av på nytt','left:50%;transform:translateX(-50%);bottom:max(4.2vh,24px);height:38px;padding:0 20px;opacity:0;pointer-events:none');
sBtn.setAttribute('aria-pressed','false');
wrap.appendChild(cv);wrap.appendChild(title);wrap.appendChild(cap);wrap.appendChild(xBtn);wrap.appendChild(sBtn);wrap.appendChild(rBtn);
document.body.appendChild(wrap);
var ctx=cv.getContext('2d',{alpha:false});
function mkCanvas(){return document.createElement('canvas');}
var bc=mkCanvas(),bctx=bc.getContext('2d'),bc2=mkCanvas(),b2ctx=bc2.getContext('2d');
var rc=mkCanvas(),rctx=rc.getContext('2d'),vg=mkCanvas(),moonC=mkCanvas();
var noise=[],clouds=[];

/* ───────────── tilstand ───────────── */
var W,H,DPR,s,HZ,R,hz,bw,bh,bs,cam,camY,tod,dk,nf;
var mxs=0,mys=0,mx=-1e4,my=-1e4;
var stars=[],targets=[],pOff=null,raf=0,closed=false,tVis=0,lastNow=null,paused=false,frameN=0,ft=[];
var SH=[],LI=[],LA=[],SP=[],CROWD=[];
var LAY=[{p:.45,sc:.72,m:-6},{p:1,sc:1,m:-14},{p:1.25,sc:1.15,m:-22}];

/* ───────────── verden (bygges én gang, i verdensenheter) ───────────── */
function buildWorld(){
  var r=rng(1809);
  function pick(a){return a[Math.floor(r()*a.length)];}
  function rect(l,x,y,w,h,c,o){var o2={l:l,k:0,d:[x,y,w,h],c:c,x0:x,x1:x+w,o:o||0,cs:[]};SH.push(o2);return o2;}
  function poly(l,p,c,o){var x0=1e9,x1=-1e9;for(var i=0;i<p.length;i+=2){x0=Math.min(x0,p[i]);x1=Math.max(x1,p[i]);}
    var o2={l:l,k:1,d:p,c:c,x0:x0,x1:x1,o:o||0,cs:[]};SH.push(o2);return o2;}
  function light(l,x,y,w,h,c,on,g,amp,it){LI.push({l:l,x:x,y:y,w:w,h:h,c:c,on:on,g:g||null,ph:r()*TAU,amp:amp==null?.1:amp,it:it==null?1:it});}
  function lamp(l,x,y,rad,c,on,g,bl){LA.push({l:l,x:x,y:y,r:rad,c:c,on:on,g:g||null,bl:bl||0,ph:r()*TAU});}
  function sp(l,x0,x1,fn,o){SP.push({l:l,x0:x0,x1:x1,fn:fn,o:o||0});}
  function grid(l,x,y,w,h,cols,rows,ww,wh,pL,onA,onB,g,frame,c){
    for(var i=0;i<rows;i++)for(var j=0;j<cols;j++){
      var wx=x+(j+.5)*w/cols-ww/2,wy=y+(i+.5)*h/rows-wh/2;
      if(frame)rect(l,wx-1.4,wy-1.4,ww+2.8,wh+2.8,frame);
      rect(l,wx,wy,ww,wh,C.glass);
      if(r()<pL)light(l,wx,wy,ww,wh,c||pick(WARMS),onA+(onB-onA)*r(),g);}}
  function house(x,w,h,col,roof){ // vanlig bygård med vinduer
    rect(1,x,-h,w+.5,h,col);
    if(roof===1)poly(1,[x-3,-h,x+w*.5,-h-w*.32,x+w+3,-h],C.roof);
    else if(roof===2)rect(1,x-2,-h-8,w+4,8,C.roof);
    var fl=Math.max(2,Math.round(h/42)),cols=Math.max(2,Math.round(w/30));
    grid(1,x+6,-h+10,w-12,h-26,cols,fl,10,15,.62,.6,.97,null,null);
    rect(1,x+w-2,-h,2,h,[0,0,0]).a=.18;}
  function streetLamp(x){lamp(1,x,-34,2.2,[255,214,160],.62);sp(1,x-2,x+2,function(t){var X=PX(1,x),Y=PY(1,0),Y2=PY(1,-34);
    ctx.fillStyle=col(C.roof);ctx.fillRect(X-.6*s,Y2,1.2*s,Y-Y2);});}
  /* ── bakre lag: hav av tak og tårn ── */
  var x=-1700;
  while(x<4800){var w=30+r()*70,h=36+r()*110;if(r()<.12)h+=50;rect(0,x,-h,w+1,h,r()<.5?C.far:C.far2);
    var n=Math.floor(w*h/700);for(var i=0;i<n;i++)if(r()<.5)light(0,x+4+r()*(w-8),-h+6+r()*(h-12),2.6,3.4,pick(WARMS),.7+r()*.28,null,.2);
    x+=w;}
  // Vor Frelsers Kirke: tårn og spiralspir
  rect(0,800,-96,120,96,C.far2);rect(0,847,-150,26,150,C.far2);poly(0,[849,-150,860,-276,871,-150],C.far2);
  lamp(0,860,-280,2,[255,220,150],.6,null,1);
  sp(0,840,880,function(t){var a=mix([200,160,80],[255,212,135],nf),al=.5+.5*nf;ctx.lineWidth=Math.max(1,1.4*s*.72);ctx.lineCap='round';
    for(var k=0;k<.98;k+=.012){var a1=k*24,a2=(k+.012)*24,r1=11*(1-k),r2=11*(1-k-.012);var fr=Math.sin(a1);
      ctx.strokeStyle=rgba(a,al*(fr>0?.95:.25));ctx.beginPath();ctx.moveTo(PX(0,860+Math.cos(a1)*r1),PY(0,-150-125*k+fr*1.5*(1-k)));
      ctx.lineTo(PX(0,860+Math.cos(a2)*r2),PY(0,-150-125*(k+.012)+Math.sin(a2)*1.5*(1-k)));ctx.stroke();}
    if(nf>0)glowB(PX(0,860),PY(0,-200),70*s*.72,[255,200,120],.18*nf);});
  // Marmorkirken: kuppel
  var dome=[];for(var q=0;q<=24;q++){var an=Math.PI+q/24*Math.PI;dome.push(1480+Math.cos(an)*58,-122+Math.sin(an)*62);}
  rect(0,1418,-122,124,40,C.far2);poly(0,dome,C.patina);rect(0,1473,-196,14,16,C.far2);poly(0,[1474,-196,1480,-216,1486,-196],C.far2);
  lamp(0,1480,-218,1.8,[255,226,170],.7);
  // Rådhustårnet
  rect(0,1940,-262,22,262,C.far2);poly(0,[1938,-262,1951,-330,1964,-262],C.far2);lamp(0,1951,-232,3,[255,236,190],.6);
  // Middelgrunden: vindmøller
  sp(0,2680,2900,function(t){var c2=col(C.far,1),k;ctx.strokeStyle=c2;ctx.fillStyle=c2;
    for(k=0;k<5;k++){var X=2700+k*45,a0=t*1.1+k*1.3,top=PY(0,-104),bx=PX(0,X);ctx.lineWidth=Math.max(1,2*s*.72);
      ctx.beginPath();ctx.moveTo(bx,PY(0,0));ctx.lineTo(bx,top);ctx.stroke();ctx.lineWidth=Math.max(.8,1.2*s*.72);
      for(var b=0;b<3;b++){var an=a0+b*TAU/3;ctx.beginPath();ctx.moveTo(bx,top);ctx.lineTo(bx+Math.cos(an)*30*s*.72,top+Math.sin(an)*30*s*.72);ctx.stroke();}
      if(nf>.2&&((t*.9+k*.23)%1)<.5){ctx.fillStyle=rgba([255,60,50],nf);ctx.fillRect(bx-1.4,top-1.4,2.8,2.8);glowB(bx,top,9*s,[255,70,50],.5*nf);ctx.fillStyle=c2;}}});
  // Øresundsbroen
  rect(0,2930,-26,820,4,C.far2);
  for(var pq=0;pq<2;pq++){var px0=3150+pq*300;rect(0,px0-3,-196,6,172,C.far2);}
  for(var dl=2940;dl<3750;dl+=26)lamp(0,dl,-28,1.4,[255,226,170],.6);
  sp(0,2930,3750,function(t){ctx.strokeStyle=col(C.far2,.8);ctx.lineWidth=Math.max(.6,.8*s*.72);
    for(var pq=0;pq<2;pq++){var px0=3150+pq*300,tx=PX(0,px0),ty=PY(0,-192);
      for(var k=1;k<=7;k++){ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(PX(0,px0-k*24),PY(0,-26));ctx.moveTo(tx,ty);ctx.lineTo(PX(0,px0+k*24),PY(0,-26));ctx.stroke();}}});

  /* ── hovedlaget: kaifronten ── */
  rect(1,-1400,-5,9200,5,C.quay);
  house(-420,190,210,[176,92,70],1);house(-230,200,176,[188,178,156],2);house(-30,180,220,[128,96,74],1);house(150,180,190,[204,192,170],2);
  streetLamp(345);streetLamp(415);
  // Barr i Nordatlantens Brygge: okergult pakkhus
  rect(1,430,-232,440,232,C.ochre);poly(1,[426,-232,470,-296,830,-296,874,-232],C.roof);
  for(var dm=0;dm<5;dm++){var dx=500+dm*72;poly(1,[dx,-262,dx+12,-280,dx+24,-262],C.roof);rect(1,dx+7,-268,10,7,C.glass);light(1,dx+7,-268,10,7,pick(WARMS),.8+r()*.15,null);}
  grid(1,446,-224,408,150,13,4,16,22,.55,.68,.97,null,C.frame);
  [452,520,580,672,736,800].forEach(function(gx){rect(1,gx-2,-70,34,52,C.frame);rect(1,gx,-68,30,48,C.glass);light(1,gx,-68,30,48,[255,176,96],.58,'barr',.06,.78);});
  rect(1,624,-74,36,74,[54,40,30]);lamp(1,618,-62,2,[255,200,130],.55);lamp(1,666,-62,2,[255,200,130],.55);
  // Infill og broen
  rect(1,882,-150,150,150,[144,120,98]);grid(1,890,-140,134,120,4,3,12,18,.6,.62,.96,null,null);poly(1,[878,-150,957,-176,1036,-150],C.roof);
  var deck=[],rail=[];
  for(var bx=1040;bx<=1640;bx+=20){var by=-4-22*Math.sin(Math.PI*(bx-1040)/600);deck.push(bx,by);}
  var deckP=deck.slice();for(var bi=deck.length-2;bi>=0;bi-=2)deckP.push(deck[bi],deck[bi+1]+7);
  poly(1,deckP,[52,56,64]);
  for(var lb=1060;lb<1640;lb+=60){var ly=-4-22*Math.sin(Math.PI*(lb-1040)/600);lamp(1,lb,ly-14,1.8,[255,232,190],.6);
    rect(1,lb-.5,ly-14,1,14,[40,44,52]);}
  sp(1,1040,1640,function(t){ctx.strokeStyle=col([60,64,72]);ctx.lineWidth=Math.max(1,1.1*s);ctx.beginPath();
    for(var bx=1040;bx<=1640;bx+=20){var by=-13-22*Math.sin(Math.PI*(bx-1040)/600);if(bx===1040)ctx.moveTo(PX(1,bx),PY(1,by));else ctx.lineTo(PX(1,bx),PY(1,by));}ctx.stroke();
    cyclists(t);});
  // Skuespilhuset
  rect(1,1680,-10,760,10,C.wood);
  rect(1,1720,-80,660,70,[104,122,132]);light(1,1720,-80,660,70,[255,178,104],.62,'foyer',.03,.5);
  for(var mu=1720;mu<=2380;mu+=30)rect(1,mu-1,-80,2,70,[34,32,34],1);
  for(var pp=0;pp<11;pp++){var ppx=1745+pp*58+r()*26,pph=24+r()*6;rect(1,ppx,-12-pph,7,pph,[44,30,30],1);rect(1,ppx+1,-19-pph,5,6,[44,30,30],1);}
  rect(1,1720,-82,660,3,[30,28,30],1);
  rect(1,1760,-192,570,112,C.dbrick);grid(1,1780,-186,530,90,9,2,30,6,.5,.7,.95,null,null,[255,206,150]);
  rect(1,1690,-248,580,56,C.copper);rect(1,1690,-222,580,10,C.glass);light(1,1694,-221,572,8,[255,214,160],.66,null,.04,.42);
  rect(1,2050,-292,150,44,[56,52,52]);
  lamp(1,1700,-18,1.6,[255,226,180],.6);lamp(1,2420,-18,1.6,[255,226,180],.6);
  // Nyhavn: gavlhus i farger
  var cols=['#d9a441','#b5523b','#3f6e8c','#e3c26b','#c46a3c','#6f8f6a','#c98b8b','#e0b25a','#5a7fa3','#d4c08a'];
  x=2480;var hi=0;
  while(x<3070){var hw=44+r()*28,hh=150+r()*60,cc=cols[hi++%cols.length],cn=parseInt(cc.slice(1),16),cv0=[cn>>16,cn>>8&255,cn&255];
    rect(1,x,-hh,hw+.5,hh,cv0);
    if(hi%3===0)poly(1,[x,-hh,x+hw/2,-hh-hw*.45,x+hw,-hh],cv0);
    else if(hi%3===1)poly(1,[x,-hh,x+hw*.2,-hh,x+hw*.2,-hh-hw*.22,x+hw*.4,-hh-hw*.22,x+hw*.4,-hh-hw*.42,x+hw*.6,-hh-hw*.42,x+hw*.6,-hh-hw*.22,x+hw*.8,-hh-hw*.22,x+hw*.8,-hh,x+hw,-hh],cv0);
    else{var cu=[];for(var q2=0;q2<=10;q2++){var a3=Math.PI+q2/10*Math.PI;cu.push(x+hw/2+Math.cos(a3)*hw/2,-hh+Math.sin(a3)*hw*.42);}poly(1,cu,cv0);}
    var cw=Math.max(2,Math.floor(hw/17)),rows=Math.max(4,Math.floor(hh/30));
    grid(1,x+5,-hh+12,hw-10,hh-30,cw,rows,8,12,.6,.62,.96,null,[236,228,210]);
    rect(1,x+hw-2,-hh,2,hh,[0,0,0]).a=.2;x+=hw;}
  streetLamp(3100);
  // Borgergade: Pluto og Jazzhus Montmartre
  var bg=[[3150,120,250,[214,204,182]],[3270,160,236,[150,88,70]],[3430,140,258,[196,186,166]],[3570,130,244,[170,150,128]]];
  bg.forEach(function(b){rect(1,b[0],-b[2],b[1]+.5,b[2],b[3]);rect(1,b[0]-2,-b[2]-8,b[1]+4,8,C.roof);
    grid(1,b[0]+8,-b[2]+12,b[1]-16,b[2]-92,Math.round(b[1]/30),5,11,17,.6,.62,.97,null,[230,222,204]);});
  rect(1,3160,-74,96,54,[60,40,32]);light(1,3164,-70,88,46,[255,170,110],.58,'pluto',.06,.7);
  rect(1,3290,-80,120,60,[40,26,24]);light(1,3296,-74,108,48,[255,120,90],.6,'club',.08,.6);
  rect(1,3420,-200,16,120,[30,30,40]);
  sp(1,3150,3460,function(t){neonText(t,'Pluto',3208,-92,15,[255,120,160],'pluto');neonV(t,'JAZZ',3428,-188,26,[140,205,255],'mont');
    neonText(t,'MONTMARTRE',3350,-96,9,[150,210,255],'mont',true);});
  for(var bx2=3700;bx2<4100;){var w2=70+r()*70,h2=170+r()*80;house(bx2,w2,h2,pick([[196,180,160],[150,96,76],[178,170,150],[120,110,104]]),r()<.5?1:2);bx2+=w2;}
  // Glyptoteket med Vinterhaven
  var gdome=[];for(var q3=0;q3<=28;q3++){var a4=Math.PI+q3/28*Math.PI;gdome.push(4360+Math.cos(a4)*112,-150+Math.sin(a4)*112);}
  poly(1,gdome,[118,148,138]);
  light(1,4290,-232,140,70,[180,240,190],.6,'dome',.04,.35);
  sp(1,4240,4480,function(t){var gk=gf2('dome',t),X=PX(1,4360),Y=PY(1,-150),rr=112*s;
    ctx.save();ctx.strokeStyle=col([40,56,52],.85);ctx.lineWidth=Math.max(1,1.2*s);
    for(var k=-5;k<=5;k++){ctx.beginPath();ctx.moveTo(X,Y-rr);ctx.quadraticCurveTo(X+k*rr*.16,Y-rr*.8,X+k*rr*.19,Y);ctx.stroke();}
    for(var k2=1;k2<4;k2++){ctx.beginPath();ctx.ellipse(X,Y,rr*Math.sin(k2/4*Math.PI/2+.4),rr*.12,0,Math.PI,TAU);ctx.stroke();}
    ctx.restore();if(gk>0)glowB(X,Y-rr*.5,rr*2.1,[150,230,170],.26*gk);},1);
  rect(1,4120,-150,480,150,C.brick);rect(1,4120,-42,480,42,C.stone);rect(1,4112,-158,496,10,C.stone);
  rect(1,4290,-176,140,26,C.stone);poly(1,[4280,-176,4360,-214,4440,-176],C.stone);
  for(var co=0;co<6;co++)rect(1,4300+co*24,-148,9,108,[226,214,192]);
  grid(1,4134,-140,140,80,4,2,14,26,.5,.65,.95,null,[226,214,192]);grid(1,4448,-140,140,80,4,2,14,26,.5,.65,.95,null,[226,214,192]);
  rect(1,4340,-90,40,90,[40,30,26]);light(1,4344,-86,32,80,[255,196,130],.6,null,.04,.7);
  lamp(1,4320,-100,2,[255,214,160],.6);lamp(1,4400,-100,2,[255,214,160],.6);
  for(var tr=4630;tr<5040;tr+=55+r()*30){var th=80+r()*50,tw=40+r()*26,tp=[];for(var q4=0;q4<=14;q4++){var a5=q4/14*TAU;tp.push(tr+Math.cos(a5)*tw*(.8+.25*r()),-th+Math.sin(a5)*th*.42*(.85+.2*r()));}
    rect(1,tr-2,-th*.6,4,th*.6,[52,44,40]);poly(1,tp,C.tree);}
  streetLamp(4700);streetLamp(4860);streetLamp(5020);
  // Parken
  rect(1,5100,-132,620,132,[72,76,84]);poly(1,[5078,-136,5742,-136,5730,-152,5090,-152],[196,202,208]);
  poly(1,[5126,-46,5694,-46,5694,-124,5126,-124],[46,48,56]);
  for(var cy2=-50;cy2>-122;cy2-=6.5)for(var cx2=5132;cx2<5690;cx2+=6.5){var hv=hash(cx2*.37+cy2*1.7);
    CROWD.push({x:cx2+(hash(cx2+cy2)-.5)*3,y:cy2+(hash(cy2*3+cx2)-.5)*2,k:hv<.18?1:hv<.32?2:hv<.36?3:0,ph:hash(cx2*.11+cy2)*TAU,j:hash(cx2*.7-cy2)});}
  sp(1,5100,5720,function(t){crowd(t);},1);
  poly(1,[5100,0,5720,0,5720,-40,5560,-46,5260,-46,5100,-40],[64,68,76],1);
  for(var cw2=5112;cw2<5710;cw2+=18)light(1,cw2,-30,10,5,[220,232,255],.62,'pwin',.05);
  light(1,5126,-50,568,6,[120,230,140],.0,'pitch',0);
  for(var fb=0;fb<4;fb++){for(var fk=0;fk<6;fk++)light(1,5150+fb*170+fk*7,-158,5,5,[235,244,255],.0,'fl'+fb,0);}
  sp(1,5060,5760,function(t){parkenFx(t);});
  sp(1,5078,5742,function(t){ctx.strokeStyle=col([178,184,194],.9);ctx.lineWidth=Math.max(.7,.9*s);ctx.beginPath();
    for(var tx=5090;tx<=5730;tx+=32){ctx.moveTo(PX(1,tx),PY(1,-152));ctx.lineTo(PX(1,tx+16),PY(1,-166));ctx.lineTo(PX(1,tx+32),PY(1,-152));}
    ctx.moveTo(PX(1,5090),PY(1,-166));ctx.lineTo(PX(1,5730),PY(1,-166));ctx.stroke();});
  for(var tr2=5760;tr2<6140;tr2+=50+r()*30){var th2=60+r()*40;var tp2=[];for(var q5=0;q5<=12;q5++){var a6=q5/12*TAU;tp2.push(tr2+Math.cos(a6)*30,-th2+Math.sin(a6)*th2*.4);}
    rect(1,tr2-2,-th2*.6,4,th2*.6,[52,44,40]);poly(1,tp2,C.tree);}
  for(var ml=5760;ml<6160;ml+=40)lamp(1,ml,-26,1.5,[255,190,120],.6);
  // Kastrup
  rect(1,6180,-50,440,50,[150,156,166]);rect(1,6180,-56,440,6,[110,116,126]);for(var tw2=6192;tw2<6606;tw2+=23)light(1,tw2,-40,19,17,[255,224,176],.6+r()*.3,null,.06,.7);
  rect(1,6420,-176,16,126,[176,176,182]);poly(1,[6404,-176,6452,-176,6458,-200,6398,-200],[90,96,104]);rect(1,6396,-206,64,6,[150,150,156]);
  light(1,6404,-198,48,18,[176,232,206],.6,null,.05,.42);lamp(1,6428,-210,2,[255,70,60],.55,null,2);
  rect(1,6650,-40,260,40,[130,134,140]);poly(1,[6650,-40,6780,-62,6910,-40],[110,114,120]);
  for(var rw=6640;rw<7300;rw+=15)lamp(1,rw,-2,1.2,(rw/15|0)%2?[150,190,255]:[255,246,220],.62);
  sp(1,6950,7450,function(t){if(nf<.05)return;var n=16,idx=Math.floor(t*14)%n;for(var k=0;k<n;k++){var X=PX(1,7000+k*28),Y=PY(1,-2);
    var a=(k===idx?1:.12)*nf;ctx.fillStyle=rgba([255,255,250],a);ctx.fillRect(X-1.5,Y-1.5,3,3);if(k===idx)glowB(X,Y,16*s,[220,235,255],.8*nf);}});
  sp(1,6500,7600,function(t){planeFri(t);});

  /* ── forgrunn: dukdalber og båter i vannet ── */
  [375,1625,3380,3460,3560,4870,6300,7300,8200].forEach(function(u,i){
    if(i>=2&&i<=4){var bw3=70+i*8;poly(2,[u-bw3/2,6,u+bw3/2,6,u+bw3/2-10,20,u-bw3/2+10,20],[30,34,42]);
      rect(2,u-1,-150-i*6,2,156+i*6,[30,34,42]);lamp(2,u,-152-i*6,1.6,[255,240,210],.6);
      sp(2,u-60,u+60,(function(u2,h2){return function(t){ctx.strokeStyle=col([40,44,54],.7);ctx.lineWidth=Math.max(.7,.8*s);ctx.beginPath();
        ctx.moveTo(PX(2,u2),PY(2,-h2));ctx.lineTo(PX(2,u2-34),PY(2,6));ctx.moveTo(PX(2,u2),PY(2,-h2));ctx.lineTo(PX(2,u2+30),PY(2,6));ctx.stroke();};})(u,150+i*6));}
    else{rect(2,u-5,-14,10,60,[38,34,32]);rect(2,u-6,-16,12,4,[60,56,52]);}});
}

/* ───────────── projeksjon og farger ───────────── */
function PX(l,u){var L=LAY[l];return W/2+(u-cam*L.p)*s*L.sc+mxs*L.m;}
function PY(l,y){var L=LAY[l];return hz+y*s*L.sc+mys*L.m*.3;}
function col(c,a){return rgba(mix(c,NIGHT,dk),a==null?1:a);}
function shCol(o){var q=Math.round(dk*48);var v=o.cs[q];if(!v){v=o.cs[q]=rgba(mix(o.c,NIGHT,q/48),o.a==null?1:o.a);}return v;}
var GS={};
function gsprite(c){var k=(c[0]|0)+','+(c[1]|0)+','+(c[2]|0);var g=GS[k];if(g)return g;g=mkCanvas();g.width=g.height=64;var x=g.getContext('2d');
  var rg=x.createRadialGradient(32,32,0,32,32,32);rg.addColorStop(0,'rgba('+k+',1)');rg.addColorStop(.2,'rgba('+k+',.5)');rg.addColorStop(.55,'rgba('+k+',.13)');rg.addColorStop(1,'rgba('+k+',0)');
  x.fillStyle=rg;x.fillRect(0,0,64,64);GS[k]=g;return g;}
function glowOn(cx,x,y,r,c,a){if(a<=.004||r<=.5)return;var p=cx.globalAlpha;cx.globalAlpha=Math.min(1,a);cx.drawImage(gsprite(c),x-r,y-r,2*r,2*r);cx.globalAlpha=p;}
function glowB(x,y,r,c,a){var p=ctx.globalCompositeOperation;ctx.globalCompositeOperation='lighter';glowOn(ctx,x,y,r,c,a);ctx.globalCompositeOperation=p;if(Q.bloom)glowOn(bctx,x,y,r*1.2,c,a*.8);}
function bl(x,y,w,h,c,a){if(!Q.bloom||a<=.01)return;var ar=w*h,k=ar>500?Math.sqrt(500/ar):1;bctx.fillStyle=rgba(c,a*.55*k);bctx.fillRect(x-1,y-1,w+2,h+2);}

/* gruppelys styrt av manuset */
function flick(t,on,seed){if(t<on)return 0;var d=t-on;if(d>.45)return 1;return hash(Math.floor(t*28)+seed)>.42?1:.12;}
function gf2(g,t){switch(g){
  case 'foyer':return 1-.82*win(t,12.9,18.7,.7,.8);
  case 'barr':return 1;
  case 'dome':return .55+.6*win(t,28.4,32.8,.7,1);
  case 'pluto':return flick(t,20.9,3)*1;
  case 'mont':return flick(t,21.55,9);
  case 'club':return .6+.5*win(t,21.6,26.8,.5,.8);
  case 'pwin':return 1;
  case 'pitch':return flick(t,34.4,1)*.9*OFF(t);
  case 'fl0':return flick(t,34.4,11)*OFF(t);case 'fl1':return flick(t,34.7,21)*OFF(t);case 'fl2':return flick(t,35.0,31)*OFF(t);case 'fl3':return flick(t,35.3,41)*OFF(t);
  }return 1;}
function OFF(t){return 1-sstep(39.5,40.7,t);}
function flood(t){return(flick(t,34.4,11)+flick(t,34.7,21)+flick(t,35.0,31)+flick(t,35.3,41))/4*OFF(t);}

/* ───────────── himmel ───────────── */
function skyCols(){for(var i=1;i<SKY.length;i++)if(tod<=SKY[i][0]){var a=SKY[i-1],b=SKY[i],k=(tod-a[0])/(b[0]-a[0]);
  return[mix(a[1][0],b[1][0],k),mix(a[1][1],b[1][1],k),mix(a[1][2],b[1][2],k)];}return SKY[SKY.length-1][1];}
function drawSky(t){var sc=skyCols(),g=ctx.createLinearGradient(0,0,0,hz);
  g.addColorStop(0,rgba(sc[0]));g.addColorStop(.62,rgba(sc[1]));g.addColorStop(1,rgba(sc[2]));ctx.fillStyle=g;ctx.fillRect(0,0,W,hz+1);
  // sol
  var sx=kf(tod,[[0,.22],[.12,.28],[.46,.8],[.62,.9]],lin)*W,sy=hz-kf(tod,[[0,.46],[.12,.42],[.46,.045],[.62,-.08]],lin)*H;
  var sa=1-sstep(.5,.62,tod);
  if(sa>0){var scl=mix([255,250,236],[255,166,86],sstep(.15,.46,tod));
    ctx.save();ctx.globalCompositeOperation='lighter';glowOn(ctx,sx,sy,Math.min(W,H)*.75,scl,.42*sa);glowOn(ctx,sx,sy,90*s,scl,.6*sa);
    ctx.fillStyle=rgba(mix(scl,[255,255,255],.4),sa);ctx.beginPath();ctx.arc(sx,sy,17*s,0,TAU);ctx.fill();ctx.restore();
    if(Q.bloom)glowOn(bctx,sx,sy,120*s,scl,.5*sa);}
  // måne
  var ma=sstep(.72,.95,tod);
  if(ma>0){var mxp=W*.84-mxs*4,myp=Math.max(H*.12,hz-H*.47);ctx.globalAlpha=ma;ctx.drawImage(moonC,mxp-moonC._r,myp-moonC._r,moonC._r*2,moonC._r*2);ctx.globalAlpha=1;
    if(Q.bloom)glowOn(bctx,mxp,myp,70*s,[255,240,210],.35*ma);}
}
function drawClouds(t){var drift=9*t+170*eio((t-4)/3)+150*eio((t-39.4)/2.6)+90*eio((t-47)/3);
  var wd=1-sstep(.12,.46,tod),ws=sstep(.12,.46,tod)*(1-sstep(.46,.8,tod)),wn=sstep(.46,.8,tod);
  for(var i=0;i<clouds.length;i++){var c=clouds[i],span=W+c.w*2,x=((c.x*span-drift*s*c.v)%span+span)%span-c.w,y=c.y*hz;
    if(wd>.01){ctx.globalAlpha=wd*c.a;ctx.drawImage(c.d,x,y,c.w,c.h);}
    if(ws>.01){ctx.globalAlpha=ws*c.a;ctx.drawImage(c.s,x,y,c.w,c.h);}
    if(wn>.01){ctx.globalAlpha=wn*c.a*.75;ctx.drawImage(c.n,x,y,c.w,c.h);}}
  ctx.globalAlpha=1;}
function drawStars(t){var fin=sstep(GATHER-.2,GATHER+1.2,t);if(nf<=.01)return;
  for(var i=0;i<stars.length;i++){var st=stars[i];if(st.y>hz-4)continue;var a=nf*(.5+.5*Math.sin(t*st.f+st.p))*st.b*(1-fin*.85);if(a<.02)continue;
    ctx.fillStyle=rgba([255,248,236],a);ctx.fillRect(st.x-mxs*3,st.y,st.r,st.r);}
  // stjerneskudd før ønsket
  var k=(t-49.0)/.9;if(k>0&&k<1){var x0=W*.18,y0=H*.12,x1=W*.42,y1=H*.24,e=eout(k),xx=lerp(x0,x1,e),yy=lerp(y0,y1,e);
    var g=ctx.createLinearGradient(lerp(x0,x1,Math.max(0,e-.25)),lerp(y0,y1,Math.max(0,e-.25)),xx,yy);g.addColorStop(0,'rgba(255,240,210,0)');g.addColorStop(1,rgba([255,246,226],1-k));
    ctx.strokeStyle=g;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(lerp(x0,x1,Math.max(0,e-.25)),lerp(y0,y1,Math.max(0,e-.25)));ctx.lineTo(xx,yy);ctx.stroke();glowB(xx,yy,14,[255,240,210],.8*(1-k));}
}

function haze(){var sc=skyCols(),h=170*s,g=ctx.createLinearGradient(0,hz-h,0,hz);g.addColorStop(0,rgba(sc[2],0));g.addColorStop(1,rgba(sc[2],.42));ctx.fillStyle=g;ctx.fillRect(0,hz-h,W,h);}
function groundShade(){var h=70*s,g=ctx.createLinearGradient(0,hz-h,0,hz);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+(.16+.1*nf).toFixed(3)+')');ctx.fillStyle=g;ctx.fillRect(0,hz-h,W,h);}
/* ───────────── lagene ───────────── */
function drawLayer(l,t){var L=LAY[l],vis0=cam*L.p-(W/2+40)/(s*L.sc),vis1=cam*L.p+(W/2+40)/(s*L.sc),i,o,X,Y,k;
  for(var pass=0;pass<2;pass++){
    for(i=0;i<SH.length;i++){o=SH[i];if(o.l!==l||o.o!==pass||o.x1<vis0||o.x0>vis1)continue;ctx.fillStyle=shCol(o);
      if(o.k===0){var d=o.d;ctx.fillRect(PX(l,d[0]),PY(l,d[1]),d[2]*s*L.sc+.5,d[3]*s*L.sc+.5);}
      else{var p=o.d;ctx.beginPath();ctx.moveTo(PX(l,p[0]),PY(l,p[1]));for(k=2;k<p.length;k+=2)ctx.lineTo(PX(l,p[k]),PY(l,p[k+1]));ctx.closePath();ctx.fill();}}
    for(i=0;i<SP.length;i++){o=SP[i];if(o.l!==l||o.o!==pass||o.x1<vis0||o.x0>vis1)continue;o.fn(t);}
    if(pass===0){ // vinduslys
      for(i=0;i<LI.length;i++){o=LI[i];if(o.l!==l||o.x+o.w<vis0||o.x>vis1)continue;
        var lit=sstep(o.on-.07,o.on,tod)*(o.g?gf2(o.g,t):1);if(o.on<.05)lit=o.g?gf2(o.g,t):0;
        if(lit<=.01)continue;lit*=(1-o.amp+o.amp*Math.sin(t*.9+o.ph))*o.it;
        X=PX(l,o.x);Y=PY(l,o.y);var w=o.w*s*L.sc,h=o.h*s*L.sc;ctx.fillStyle=rgba(o.c,lit);ctx.fillRect(X,Y,w+.4,h+.4);bl(X,Y,w,h,o.c,lit*.85);}}}
  // lamper
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(i=0;i<LA.length;i++){o=LA[i];if(o.l!==l||o.x<vis0-20||o.x>vis1+20)continue;
    var la=sstep(o.on-.07,o.on,tod)*(o.g?gf2(o.g,t):1);if(o.bl===1)la*=.55+.45*Math.sin(t*2.2+o.ph);if(o.bl===2)la*=((t*.8+o.ph)%1)<.5?1:.08;
    if(la<=.01)continue;X=PX(l,o.x);Y=PY(l,o.y);var rr=o.r*s*L.sc;
    glowOn(ctx,X,Y,rr*9,o.c,.5*la);ctx.fillStyle=rgba(mix(o.c,[255,255,255],.5),la);ctx.beginPath();ctx.arc(X,Y,Math.max(.8,rr),0,TAU);ctx.fill();
    if(Q.bloom)glowOn(bctx,X,Y,rr*16,o.c,.7*la);}
  ctx.restore();}

/* ───────────── spesialeffekter i byen ───────────── */
function cyclist(x,y,sz,hue,t){ctx.save();ctx.translate(x,y);ctx.strokeStyle=col([10,14,24]);ctx.fillStyle=col([10,14,24]);ctx.lineWidth=1.3*sz;
  var wr=4*sz,sp=(t*7)%TAU;[[-6*sz,0],[6*sz,0]].forEach(function(p){ctx.beginPath();ctx.arc(p[0],-wr,wr,0,TAU);ctx.stroke();
    ctx.beginPath();ctx.moveTo(p[0],-wr);ctx.lineTo(p[0]+Math.cos(sp)*wr,-wr+Math.sin(sp)*wr);ctx.stroke();});
  ctx.beginPath();ctx.moveTo(-6*sz,-wr);ctx.lineTo(0,-wr);ctx.lineTo(4*sz,-wr-6*sz);ctx.lineTo(6*sz,-wr);ctx.moveTo(0,-wr);ctx.lineTo(-1*sz,-wr-7*sz);ctx.stroke();
  ctx.beginPath();ctx.moveTo(-1*sz,-wr-7*sz);ctx.lineTo(2*sz,-wr-15*sz);ctx.lineTo(5*sz,-wr-8*sz);ctx.stroke();
  ctx.fillStyle=col(hue);ctx.beginPath();ctx.arc(2.5*sz,-wr-18*sz,3*sz,0,TAU);ctx.fill();ctx.restore();
  glowB(x+8*sz,y-wr-3*sz,5*sz,[255,240,200],.9*nf);
  ctx.save();ctx.globalCompositeOperation='lighter';var g=ctx.createLinearGradient(x+8*sz,0,x+40*sz,0);g.addColorStop(0,rgba([255,240,200],.3*nf));g.addColorStop(1,'rgba(255,240,200,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x+8*sz,y-wr-3*sz);ctx.lineTo(x+40*sz,y-wr-12*sz);ctx.lineTo(x+40*sz,y-wr+6*sz);ctx.closePath();ctx.fill();ctx.restore();}
function cyclists(t){var k=(t-10.2)/3.6;if(k<=0||k>=1)return;var u=lerp(1060,1610,eio(k));
  for(var j=0;j<2;j++){var uu=u-j*30,by=-4-22*Math.sin(Math.PI*(uu-1040)/600);cyclist(PX(1,uu),PY(1,by)-1,s*(j?1.18:1.08),j?[96,64,42]:[178,62,34],t);}}
function neonText(t,txt,u,y,size,c,g,caps){var a=gf2(g,t);var X=PX(1,u),Y=PY(1,y);var fs=size*s;
  ctx.save();ctx.font=(caps?'600 ':'italic 600 ')+fs+'px '+(caps?SANS:DISPLAY);ctx.textAlign='center';ctx.textBaseline='middle';
  if(caps&&('letterSpacing' in ctx))ctx.letterSpacing=(fs*.18)+'px';
  ctx.fillStyle=rgba(mix([40,30,34],c,.25*nf),1);ctx.fillText(txt,X,Y);
  if(a>.02){var wd=ctx.measureText(txt).width;ctx.globalCompositeOperation='lighter';
    for(var k=0;k<3;k++)glowOn(ctx,X-wd/2+wd*(k+.5)/3,Y,fs*1.25+wd*.12,c,.3*a);
    ctx.fillStyle=rgba(mix(c,[255,255,255],.5),a);ctx.fillText(txt,X,Y);if(Q.bloom){bctx.save();bctx.font=ctx.font;bctx.textAlign='center';bctx.textBaseline='middle';bctx.fillStyle=rgba(c,.9*a);bctx.fillText(txt,X,Y);bctx.restore();}}
  ctx.restore();}
function neonV(t,txt,u,y,step,c,g){for(var i=0;i<txt.length;i++)neonText(t,txt[i],u,y+i*step,16,c,g,true);}
function crowd(t){var fl=flood(t);ctx.strokeStyle=col([120,124,136],.25+.35*fl);ctx.lineWidth=Math.max(.6,.7*s);ctx.beginPath();
  for(var ty=-56;ty>-124;ty-=13){ctx.moveTo(PX(1,5126),PY(1,ty));ctx.lineTo(PX(1,5694),PY(1,ty));}ctx.stroke();var X0=PX(1,0),sc=s,lightK=.18+.82*fl;var chant=t>35.5&&t<38.1,goal=t>38.2&&t<40;
  var beat=chant?Math.max(0,1-((t-35.6)%.5)/.2):0;
  for(var i=0;i<CROWD.length;i++){var c=CROWD[i],dy=0;
    if(chant&&c.j<.4)dy=-3*beat;if(goal)dy=-Math.abs(Math.sin((t-38.2)*9+c.ph))*4*(1-sstep(38.6,40,t));
    var X=X0+c.x*sc,Y=PY(1,c.y+dy);if(X<-4||X>W+4)continue;
    var cc=c.k===1?[38,104,214]:c.k===2?[236,238,244]:c.k===3?[255,255,255]:[34,36,46];
    var a=c.k===3?(.4+.6*Math.sin(t*6+c.ph))*fl:lightK;
    ctx.fillStyle=rgba(mix(mix(cc,NIGHT,dk*(1-fl)),cc,fl*.6),Math.max(.15,a));ctx.fillRect(X,Y,2.4*sc,2.4*sc);
    if(c.k===3&&fl>0)bl(X,Y,2,2,[255,255,255],a*.6);}}
function parkenFx(t){var fl=flood(t);if(fl<=0)return;var X=PX(1,5410),Y=PY(1,-152);
  ctx.save();ctx.globalCompositeOperation='lighter';
  glowOn(ctx,X,Y-40*s,420*s,[200,220,255],.22*fl);if(Q.bloom)glowOn(bctx,X,Y-30*s,380*s,[210,225,255],.35*fl);
  for(var b=0;b<4;b++){var f=gf2('fl'+b,t);if(f<=0)continue;var bx=PX(1,5167+b*170),by=PY(1,-158);
    for(var side=-1;side<=1;side+=2){var g=ctx.createLinearGradient(bx,by,bx,by-260*s);g.addColorStop(0,rgba([230,240,255],.16*f));g.addColorStop(1,'rgba(230,240,255,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(bx-6*s,by);ctx.lineTo(bx+6*s,by);ctx.lineTo(bx+side*70*s+30*s,by-260*s);ctx.lineTo(bx+side*70*s-30*s,by-260*s);ctx.closePath();ctx.fill();}
    glowOn(ctx,bx+18*s,by,40*s,[240,246,255],.6*f);}
  // ballen
  var k=(t-37.55)/.75;if(k>0&&k<1){var bx2=PX(1,5400+60*k),by2=PY(1,-70-250*Math.sin(Math.PI*k*.92));ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx2,by2,2.6*s,0,TAU);ctx.fill();glowOn(ctx,bx2,by2,16*s,[255,255,255],.5);}
  var gk=1-(t-38.2)/.5;if(t>38.2&&gk>0){glowOn(ctx,X,Y,500*s,[255,255,255],.35*gk);}
  ctx.restore();}
function planeShape(x,y,ang,sz,litWin,t,flip){flip=flip||1;function tp(lx,ly){return[x+flip*lx*Math.cos(ang)-ly*Math.sin(ang),y+flip*lx*Math.sin(ang)+ly*Math.cos(ang)];}
  ctx.save();ctx.translate(x,y);ctx.rotate(ang);ctx.scale(flip,1);var c1=col([232,234,240]),c2=col([150,156,168]);
  ctx.fillStyle=c1;ctx.beginPath();ctx.moveTo(-60*sz,-4*sz);ctx.quadraticCurveTo(-64*sz,0,-58*sz,5*sz);ctx.lineTo(52*sz,6*sz);ctx.quadraticCurveTo(66*sz,4*sz,64*sz,0);
  ctx.quadraticCurveTo(60*sz,-6*sz,48*sz,-7*sz);ctx.lineTo(-50*sz,-7*sz);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(-48*sz,-7*sz);ctx.lineTo(-62*sz,-30*sz);ctx.lineTo(-52*sz,-30*sz);ctx.lineTo(-30*sz,-7*sz);ctx.closePath();ctx.fill();
  ctx.fillStyle=c2;ctx.beginPath();ctx.moveTo(-6*sz,3*sz);ctx.lineTo(-26*sz,12*sz);ctx.lineTo(-16*sz,12*sz);ctx.lineTo(14*sz,3*sz);ctx.closePath();ctx.fill();
  ctx.fillRect(-8*sz,6*sz,16*sz,5*sz);
  if(litWin>0){for(var w=-40;w<44;w+=5){ctx.fillStyle=rgba([255,214,150],litWin);ctx.fillRect(w*sz,-3.5*sz,2.2*sz,2.2*sz);}bl(-40*sz+x,y-3*sz,84*sz,3*sz,[255,214,150],.0);}
  ctx.restore();
  var blink=((t*1.2)%1)<.12,tl=tp(-60,-6),wl=tp(-20,12),nl=tp(64,2);if(blink)glowB(tl[0],tl[1],12*sz,[255,255,255],.9);
  glowB(wl[0],wl[1],5*sz,[255,70,60],.8);return nl;}
function planeProlog(t){var k=(t-.3)/4.0;if(k<0||k>1.05)return;var e=eout(Math.min(k,1)),x=lerp(W*1.06,W*.66,e),y=lerp(H*.08,hz-12*s,e*e*.96+e*.04);
  var sz=s*.68,nose=planeShape(x,y,-.13*(1-e*.7),sz,0,t,-1);glowB(nose[0],nose[1],26*s,[255,252,235],.9);}
function planeFri(t){var tau=t-42;if(tau<-3||tau>10)return;tau=Math.max(0,tau);var SZ=s*1.45;
  function pos(q){var x=6330+(q<2.2?72*q*q:348+200*(q-2.2)+10*(q-2.2)*(q-2.2)),y=-4-(q>2.1?92*Math.pow(q-2.1,1.7):0);return[x,y];}
  var p=pos(tau),p2=pos(tau+.05),ang=Math.atan2(PY(1,p2[1])-PY(1,p[1]),PX(1,p2[0])-PX(1,p[0])),X=PX(1,p[0]),Y=PY(1,p[1]);
  if(X>W+400*s||Y<-300)return;
  // stripe etter flyet
  if(tau>2.2){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';var sun=mix([255,226,180],[255,190,140],1-nf);
    for(var q=1;q<36;q++){var q0=tau-q*.07,q1=tau-(q+1)*.07;if(q1<2.2)break;var a=pos(q0),b=pos(q1),fa=(1-q/36)*.5*(1-sstep(47,50,t));
      ctx.strokeStyle=rgba(sun,fa);ctx.lineWidth=(2.5+q*.3)*s;ctx.beginPath();ctx.moveTo(PX(1,a[0])-58*SZ*Math.cos(ang),PY(1,a[1])-8*s-58*SZ*Math.sin(ang));
      ctx.lineTo(PX(1,b[0])-58*SZ*Math.cos(ang),PY(1,b[1])-8*s-58*SZ*Math.sin(ang));ctx.stroke();}ctx.restore();}
  var nose=planeShape(X,Y-8*s,ang,SZ,.6+.4*nf,t,1);
  if(tau<2.6)glowB(nose[0],nose[1],30*s,[255,250,230],.85);}

/* ───────────── vann ───────────── */
function drawWater(t){var wc=kfc(tod,WATER),hh=H-hz;if(hh<=2)return;
  var srcH=Math.round(hz*DPR);if(srcH<2)return;
  rctx.drawImage(cv,0,0,cv.width,srcH,0,0,cv.width,srcH);
  ctx.fillStyle=rgba(wc);ctx.fillRect(0,hz,W,hh);
  var st=Q.strip;
  for(var y=hz;y<H;y+=st){var dd=(y-hz)/hh,src=hz-(y-hz)*.94-st;if(src<0)break;
    var off=(Math.sin(y*.13/s+t*1.7)*(.7+dd*6)+Math.sin(y*.033/s-t*.9)*(1.4+dd*5))*s;
    ctx.globalAlpha=.92-dd*.35;ctx.drawImage(rc,0,Math.round(src*DPR),rc.width,Math.max(1,Math.round(st*DPR)),off,y,W,st+.6);}
  ctx.globalAlpha=1;
  var g=ctx.createLinearGradient(0,hz,0,H);g.addColorStop(0,rgba(wc,.28));g.addColorStop(.5,rgba(wc,.62));g.addColorStop(1,rgba(wc,.9));
  ctx.fillStyle=g;ctx.fillRect(0,hz,W,hh);
  // glimt på vannet
  ctx.save();ctx.globalCompositeOperation='lighter';var gl=mix([255,255,255],[255,214,160],sstep(.3,.6,tod)),ga=.28-.18*nf;
  for(var i=0;i<90;i++){var yy=hz+hh*Math.pow(hash(i+5),1.5),span=W*1.4,xx=((hash(i)*span-t*(8+20*hash(i+3))*s)%span+span)%span-W*.2;
    var ln=(6+26*hash(i+9))*s*(.4+(yy-hz)/hh),a=ga*(.5+.5*Math.sin(t*2+i));if(a<.01)continue;ctx.fillStyle=rgba(gl,a);ctx.fillRect(xx,yy,ln,Math.max(1,s*.9));}
  ctx.restore();
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,hz,W,Math.max(1,s*1.2));}

/* ───────────── vignetter (irisvinduer) ───────────── */
var IRIS=[
  {a:7.3, b:11.0,u:650, y:-44, fn:vBarr},
  {a:13.3,b:18.6,u:2000,y:-44, fn:vCircus},
  {a:22.0,b:26.6,u:3350,y:-50, fn:vJazz},
  {a:28.9,b:32.6,u:4360,y:-200,fn:vDome},
  {a:43.6,b:47.0,u:null,y:0,   fn:vCabin}];
function irisState(t,I){if(t<I.a||t>I.b)return null;var op=eback((t-I.a)/.7),cl=1-ein((t-(I.b-.6))/.6),k=Math.min(op,cl);if(k<=0)return null;
  var ax,ay;if(I.u===null){ax=W*(W>H*1.1?.33:.5);ay=H*.42;}else{ax=PX(1,I.u);ay=PY(1,I.y);}
  var rx=clamp(ax,R+18,W-R-18),ry=clamp(Math.min(ay,H*.44),R+50,H-R-110);var m=eout(Math.min((t-I.a)/.8,1-(t-(I.b-.7))/.7));
  return{x:lerp(ax,rx,m),y:lerp(ay,ry,m),r:R*k,k:Math.min(1,k),lt:t-I.a};}
function irises(t){for(var i=0;i<IRIS.length;i++){var I=IRIS[i],st=irisState(t,I);if(!st)continue;
  ctx.save();ctx.fillStyle=rgba([3,5,12],.38*st.k);ctx.fillRect(0,0,W,H);
  ctx.globalCompositeOperation='lighter';glowOn(ctx,st.x,st.y,st.r*1.6,[255,196,120],.16*st.k);ctx.globalCompositeOperation='source-over';
  ctx.beginPath();ctx.arc(st.x,st.y,Math.max(1,st.r),0,TAU);ctx.clip();
  ctx.translate(st.x,st.y);ctx.scale(R/100,R/100);ctx.fillStyle='#0b0706';ctx.fillRect(-110,-110,220,220);
  I.fn(ctx,st.lt,t);
  var vgn=ctx.createRadialGradient(0,0,st.r/(R/100)*.62,0,0,st.r/(R/100));vgn.addColorStop(0,'rgba(0,0,0,0)');vgn.addColorStop(1,'rgba(0,0,0,.55)');
  ctx.fillStyle=vgn;ctx.fillRect(-110,-110,220,220);ctx.restore();
  ctx.save();ctx.strokeStyle=rgba([238,198,126],.85*st.k);ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(st.x,st.y,st.r,0,TAU);ctx.stroke();
  ctx.strokeStyle=rgba([238,198,126],.22*st.k);ctx.beginPath();ctx.arc(st.x,st.y,st.r+6,0,TAU);ctx.stroke();ctx.restore();
  if(Q.bloom)glowOn(bctx,st.x,st.y,st.r*1.2,[255,190,120],.25*st.k);}}
function L(c,x,y,r,cc,a){var p=c.globalCompositeOperation;c.globalCompositeOperation='lighter';glowOn(c,x,y,r,cc,a);c.globalCompositeOperation=p;}
function sil(c,x,hy,hr,hair,shade){ // silhuett: hode og skuldre
  c.fillStyle=shade;c.beginPath();c.moveTo(x-hr*2.3,120);c.lineTo(x-hr*2.1,hy+hr*3.2);c.quadraticCurveTo(x-hr*1.9,hy+hr*1.7,x-hr*.55,hy+hr*1.25);
  c.lineTo(x+hr*.55,hy+hr*1.25);c.quadraticCurveTo(x+hr*1.9,hy+hr*1.7,x+hr*2.1,hy+hr*3.2);c.lineTo(x+hr*2.3,120);c.closePath();c.fill();
  c.beginPath();c.ellipse(x,hy,hr*.86,hr,0,0,TAU);c.fill();
  if(hair===1){c.fillStyle=HAIR_I;c.beginPath();c.moveTo(x-hr*.98,hy-hr*.1);c.quadraticCurveTo(x,hy-hr*1.62,x+hr*.98,hy-hr*.1);c.lineTo(x+hr*1.1,hy+hr*3.1);
    c.lineTo(x+hr*.6,hy+hr*3.35);c.lineTo(x+hr*.62,hy+hr*.5);c.quadraticCurveTo(x,hy-hr*.6,x-hr*.62,hy+hr*.5);c.lineTo(x-hr*.6,hy+hr*3.35);c.lineTo(x-hr*1.1,hy+hr*3.1);c.closePath();c.fill();}
  if(hair===2){c.fillStyle=HAIR_V;for(var k=0;k<7;k++){var an=Math.PI*(1.05+k/6*.9);c.beginPath();c.arc(x+Math.cos(an)*hr*.82,hy+Math.sin(an)*hr*.92,hr*.36,0,TAU);c.fill();}}}
var HAIR_I='#4a140a',HAIR_V='#2a1a10',RIM_I=[255,118,64],RIM_V=[230,170,120];
function rim(c,x,y,r,a0,a1,cc,a,w){c.strokeStyle=rgba(cc,a);c.lineWidth=w||1.6;c.beginPath();c.arc(x,y,r,a0,a1);c.stroke();}
function sparkle(c,x,y,sz,cc,a){if(a<=.01)return;c.strokeStyle=rgba(cc,a);c.lineWidth=Math.max(.5,sz*.25);c.beginPath();c.moveTo(x-sz,y);c.lineTo(x+sz,y);c.moveTo(x,y-sz);c.lineTo(x,y+sz);c.stroke();L(c,x,y,sz*2.6,cc,a*.6);}

function vBarr(c,lt){
  var g=c.createRadialGradient(0,-10,6,0,-10,150);g.addColorStop(0,'#74401e');g.addColorStop(.6,'#3a1d0e');g.addColorStop(1,'#140905');c.fillStyle=g;c.fillRect(-110,-110,220,220);
  c.fillStyle='#0d1830';c.fillRect(-72,-96,144,74);
  for(var i=0;i<16;i++){c.fillStyle=rgba(WARMS[i%5],.45+.35*Math.sin(lt*1.7+i*1.3));c.fillRect(-68+i*9,-42+(i%3)*2.5,1.8,1.8);}
  for(i=0;i<5;i++)L(c,-60+i*28,-40,10,[255,196,120],.18);
  c.strokeStyle='#cdbb98';c.lineWidth=3;c.strokeRect(-72,-96,144,74);c.lineWidth=1.4;
  for(var k=1;k<4;k++){c.beginPath();c.moveTo(-72+k*36,-96);c.lineTo(-72+k*36,-22);c.stroke();}c.beginPath();c.moveTo(-72,-59);c.lineTo(72,-59);c.stroke();
  [[-92,-80,20],[86,-70,26],[-30,-104,14],[50,-100,16],[96,-20,18],[-100,-10,22]].forEach(function(b,j){L(c,b[0],b[1],b[2]*2,[255,186,110],.22+.08*Math.sin(lt+j));});
  var fl=1+.07*Math.sin(lt*23)+.05*Math.sin(lt*37.3);
  L(c,0,4,95*fl,[255,160,70],.5);
  c.fillStyle='#2a150a';c.fillRect(-110,42,220,70);c.fillStyle='rgba(255,190,120,.28)';c.fillRect(-110,42,220,1.6);
  c.fillStyle='rgba(240,232,214,.92)';c.beginPath();c.ellipse(-40,46,20,4.5,0,0,TAU);c.ellipse(40,46,20,4.5,0,0,TAU);c.fill();
  c.fillStyle='#8a5a2a';c.beginPath();c.ellipse(-40,44,9,2.6,0,0,TAU);c.ellipse(40,44,9,2.6,0,0,TAU);c.fill();
  for(var p=0;p<2;p++)for(var q=0;q<3;q++){c.strokeStyle=rgba([255,240,220],.13);c.lineWidth=1.2;c.beginPath();var px=p?40:-40;
    for(var yy=40;yy>4;yy-=3){var xx=px-6+q*6+3*Math.sin(yy*.18+lt*2.1+q);if(yy===40)c.moveTo(xx,yy);else c.lineTo(xx,yy);}c.stroke();}
  c.fillStyle='#efe2c6';c.fillRect(-3.6,16,7.2,26);
  c.save();c.translate(0,13);c.scale(1,fl);c.fillStyle='#ffcf70';c.beginPath();c.moveTo(0,-15);c.quadraticCurveTo(6,-4,0,3);c.quadraticCurveTo(-6,-4,0,-15);c.fill();
  c.fillStyle='#fff7df';c.beginPath();c.ellipse(0,-2,1.8,4.4,0,0,TAU);c.fill();c.restore();
  var shd='#160b06';sil(c,-66,-22,15.5,2,shd);sil(c,66,-14,14,1,shd);
  rim(c,-66,-22,16,-1.1,.9,RIM_V,.8);rim(c,66,-14,15.5,2.2,4.3,RIM_I,.85);c.strokeStyle=rgba(RIM_I,.55);c.lineWidth=1.4;c.beginPath();c.moveTo(51,-12);c.lineTo(50.6,30);c.stroke();
  var k1=sstep(1.05,1.65,lt)-sstep(2.35,2.95,lt);
  [[-1,-44,34],[1,44,34]].forEach(function(a){var sx=a[0]*44,sy=18,hx=lerp(a[1],a[0]*8,k1),hy=lerp(a[2],-6,k1),ex=(sx+hx)/2+a[0]*8,ey=(sy+hy)/2+12;
    c.strokeStyle=shd;c.lineWidth=9;c.lineCap='round';c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(ex,ey,hx,hy);c.stroke();
    c.save();c.translate(hx,hy-8);c.rotate(-a[0]*.18*k1);
    var gg=c.createLinearGradient(-5,0,5,0);gg.addColorStop(0,'rgba(214,140,40,.9)');gg.addColorStop(.5,'rgba(250,196,90,.95)');gg.addColorStop(1,'rgba(190,120,30,.9)');
    c.fillStyle=gg;c.beginPath();c.moveTo(-5.2,-11);c.lineTo(5.2,-11);c.lineTo(4.4,10);c.lineTo(-4.4,10);c.closePath();c.fill();
    c.fillStyle='#fbf1dc';c.beginPath();c.ellipse(0,-11,5.4,2.2,0,0,TAU);c.fill();
    c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;c.beginPath();c.moveTo(-3,-8);c.lineTo(-2.6,7);c.stroke();c.restore();});
  var ct=lt-1.68;if(ct>0&&ct<1.1){L(c,0,-14,40,[255,230,170],.6*(1-ct/1.1));
    for(var sp=0;sp<18;sp++){var an=hash(sp)*TAU,v=30+50*hash(sp+2),x=Math.cos(an)*v*ct,y=-14+Math.sin(an)*v*ct+50*ct*ct;sparkle(c,x,y,2.6,[255,226,150],1-ct/1.1);}}
}
function fig(c,x,y,ang,pose,sc,cc){ // akrobat: hofte i (x,y)
  var P={hang:[[0,-20],[0,-27],[-2,-40],[2,-40],[-2,24],[2,24],[-1,12],[1,12]],
    tuck:[[3,-17],[6,-23],[10,-8],[11,-6],[9,-1],[11,1],[11,-12],[12,-11]],
    stand:[[0,-20],[0,-27],[-7,-2],[7,-2],[-5,24],[5,24],[-3,12],[3,12]],
    v:[[0,-20],[0,-27],[-15,-42],[15,-42],[-6,24],[6,24],[-3,12],[3,12]]};
  var A=P[pose[0]],B=P[pose[1]],k=pose[2],J=[];for(var i=0;i<A.length;i++)J.push([lerp(A[i][0],B[i][0],k),lerp(A[i][1],B[i][1],k)]);
  c.save();c.translate(x,y);c.rotate(ang);c.scale(sc,sc);c.strokeStyle=cc;c.fillStyle=cc;c.lineCap='round';c.lineJoin='round';c.lineWidth=5.2;
  var sh=J[0];c.beginPath();c.moveTo(0,0);c.lineTo(sh[0],sh[1]);c.stroke();
  c.lineWidth=3.4;c.beginPath();c.moveTo(sh[0],sh[1]);c.lineTo(J[2][0],J[2][1]);c.moveTo(sh[0],sh[1]);c.lineTo(J[3][0],J[3][1]);c.stroke();
  c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(J[6][0],J[6][1]);c.lineTo(J[4][0],J[4][1]);c.moveTo(0,0);c.lineTo(J[7][0],J[7][1]);c.lineTo(J[5][0],J[5][1]);c.stroke();
  c.beginPath();c.arc(J[1][0],J[1][1],5.6,0,TAU);c.fill();c.restore();}
function vCircus(c,lt){
  var g=c.createLinearGradient(0,-110,0,110);g.addColorStop(0,'#2b0910');g.addColorStop(1,'#090205');c.fillStyle=g;c.fillRect(-110,-110,220,220);
  for(var side=-1;side<=1;side+=2){var cg=c.createLinearGradient(side*110,0,side*70,0);for(var f=0;f<=6;f++)cg.addColorStop(f/6,f%2?'#5c0a16':'#9c1a2a');
    c.fillStyle=cg;c.beginPath();c.moveTo(side*112,-112);c.lineTo(side*74,-112);c.quadraticCurveTo(side*66,-20,side*94,112);c.lineTo(side*112,112);c.closePath();c.fill();}
  for(var sc2=-6;sc2<=6;sc2++){c.fillStyle=sc2%2?'#7a1222':'#a01e2e';c.beginPath();c.arc(sc2*19,-104,11,0,Math.PI);c.fill();}
  c.save();c.globalCompositeOperation='lighter';var cone=c.createLinearGradient(0,-110,0,80);cone.addColorStop(0,'rgba(255,238,205,.32)');cone.addColorStop(1,'rgba(255,238,205,.05)');
  c.fillStyle=cone;c.beginPath();c.moveTo(-9,-110);c.lineTo(9,-110);c.lineTo(52,80);c.lineTo(-52,80);c.closePath();c.fill();c.restore();
  L(c,0,70,60,[255,226,180],.35);
  for(var d=0;d<40;d++){var yy=-100+((hash(d+1)*180+lt*(5+6*hash(d+2)))%180),xx=(hash(d)-.5)*(18+(yy+110)*.4);c.fillStyle=rgba([255,236,200],.25+.3*Math.sin(lt*2+d));c.fillRect(xx,yy,1.1,1.1);}
  var LR=2.7,LAND=3.55,TADA=4.0,Lr=72,P0y=-106;
  var A=.66*Math.min(1,lt/.9),om=TAU/1.8,th=A*Math.sin(om*(lt-.05));if(lt>LR)th=A*Math.sin(om*(lt-.05))*Math.exp(-(lt-LR)*.7);
  var bxx=Math.sin(th)*Lr,byy=P0y+Math.cos(th)*Lr,ex=Math.cos(th)*10,ey=-Math.sin(th)*10;
  c.strokeStyle='rgba(214,194,160,.85)';c.lineWidth=.9;c.beginPath();c.moveTo(-10,P0y);c.lineTo(bxx-ex,byy-ey);c.moveTo(10,P0y);c.lineTo(bxx+ex,byy+ey);c.stroke();
  c.strokeStyle='#e9d2a2';c.lineWidth=2.4;c.beginPath();c.moveTo(bxx-ex,byy-ey);c.lineTo(bxx+ex,byy+ey);c.stroke();
  var dip=0,ldx=20;if(lt>LAND)dip=11*Math.exp(-(lt-LAND)*4.2)*Math.cos((lt-LAND)*15);
  c.strokeStyle='rgba(230,214,190,.5)';c.lineWidth=.7;
  function ny(x){return 64+dip*Math.exp(-Math.pow((x-ldx)/34,2));}
  for(var nx=-80;nx<=80;nx+=8){c.beginPath();c.moveTo(nx,ny(nx));c.lineTo(nx+8,78);c.moveTo(nx,ny(nx));c.lineTo(nx-8,78);c.stroke();}
  c.strokeStyle='#e6d6b8';c.lineWidth=1.6;c.beginPath();for(nx=-82;nx<=82;nx+=4){if(nx===-82)c.moveTo(nx,ny(nx));else c.lineTo(nx,ny(nx));}c.stroke();
  var costume='#fff1dc';
  if(lt<LR){var ba=th*1.12;fig(c,bxx+Math.sin(ba)*40,byy+Math.cos(ba)*40,-ba,['hang','hang',0],1,costume);L(c,bxx,byy+30,50,[255,230,190],.25);}
  else if(lt<LAND){var k=(lt-LR)/(LAND-LR),ba2=A*Math.sin(om*(LR-.05))*1.12,h0x=bxx+Math.sin(ba2)*40,h0y=byy+Math.cos(ba2)*40;
    var sx=Math.sin(ba2)*Lr+Math.sin(ba2)*40,sy=P0y+Math.cos(ba2)*Lr+Math.cos(ba2)*40,cxp=sx+34,cyp=sy-74,ke=Math.pow(k,1.25);
    var px=(1-ke)*(1-ke)*sx+2*(1-ke)*ke*cxp+ke*ke*ldx,py=(1-ke)*(1-ke)*sy+2*(1-ke)*ke*cyp+ke*ke*40;
    var tk=k<.15?k/.15:k>.8?1-(k-.8)/.2:1;fig(c,px,py,-ba2+k*TAU*1.5,['hang','tuck',tk],1,costume);L(c,px,py,46,[255,230,190],.3);}
  else{var py2=40+dip*.9,pose=lt<TADA?['tuck','stand',sstep(LAND,LAND+.3,lt)]:['stand','v',sstep(TADA,TADA+.25,lt)];
    fig(c,ldx,py2,0,pose,1,costume);L(c,ldx,py2-10,60,[255,236,200],.35);
    var tt=lt-TADA;if(tt>0&&tt<1.6){L(c,ldx,py2-20,90,[255,240,210],.5*(1-tt/1.6));
      for(var sp=0;sp<26;sp++){var an=-Math.PI/2+(hash(sp+40)-.5)*2.6,v=40+60*hash(sp+41),x=ldx+Math.cos(an)*v*tt,y=py2-30+Math.sin(an)*v*tt+46*tt*tt;
        sparkle(c,x,y,2.4,sp%3?[255,226,150]:[255,255,255],1-tt/1.6);}}}
}
function vJazz(c,lt,t){
  var bt=.4545,ph=((t-21)/bt),sw=Math.sin(ph*Math.PI);
  var g=c.createRadialGradient(-30,-60,10,0,0,160);g.addColorStop(0,'#5a2a16');g.addColorStop(.55,'#24100a');g.addColorStop(1,'#0c0504');c.fillStyle=g;c.fillRect(-110,-110,220,220);
  c.fillStyle='rgba(255,180,120,.05)';for(var by=-100;by<40;by+=9)for(var bx=-110+(by/9%2)*9;bx<110;bx+=18)c.fillRect(bx,by,16,7);
  [[-70,-92],[-10,-96],[50,-92]].forEach(function(p,i){L(c,p[0],p[1],22,[255,200,140],.35+.1*Math.sin(t*2+i));});
  c.fillStyle='#1e0e08';c.fillRect(-110,46,220,70);c.fillStyle='rgba(255,180,110,.35)';c.fillRect(-110,46,220,1.4);
  c.save();c.globalCompositeOperation='lighter';var cg=c.createLinearGradient(90,-110,60,50);cg.addColorStop(0,'rgba(255,214,160,.30)');cg.addColorStop(1,'rgba(255,214,160,.03)');
  c.fillStyle=cg;c.beginPath();c.moveTo(80,-112);c.lineTo(100,-112);c.lineTo(100,50);c.lineTo(28,50);c.closePath();c.fill();c.restore();
  // piano
  c.fillStyle='#0a0504';c.beginPath();c.moveTo(-104,24);c.lineTo(-40,24);c.quadraticCurveTo(-34,20,-38,12);c.lineTo(-104,12);c.closePath();c.fill();
  c.beginPath();c.moveTo(-100,12);c.lineTo(-56,-24);c.lineTo(-52,-21);c.lineTo(-92,12);c.closePath();c.fill();
  c.fillRect(-98,24,3,22);c.fillRect(-46,24,3,22);
  c.strokeStyle='rgba(255,210,150,.35)';c.lineWidth=1;c.beginPath();c.moveTo(-104,12.5);c.lineTo(-40,12.5);c.stroke();
  var pb=Math.abs(Math.sin(ph*Math.PI))*1.6;sil(c,-26,-14+pb,9,false,'#0a0504');
  sil(c,26,-30,9,false,'#0a0504');
  // kontrabass
  c.save();c.translate(6,2);c.scale(1.12,1.12);var bg=c.createLinearGradient(-14,0,14,0);bg.addColorStop(0,'#3a1608');bg.addColorStop(.45,'#9a4a1c');bg.addColorStop(1,'#2a0e05');
  c.fillStyle=bg;c.beginPath();c.ellipse(0,32,15,17,0,0,TAU);c.fill();c.beginPath();c.ellipse(0,8,12,13,0,0,TAU);c.fill();
  c.fillStyle='#1a0804';c.fillRect(-1.6,-58,3.2,62);c.beginPath();c.arc(0,-60,3.6,0,TAU);c.fill();
  c.strokeStyle='rgba(255,220,170,.45)';c.lineWidth=.5;for(var sN=-1;sN<=1;sN+=.66){c.beginPath();c.moveTo(sN,-56);c.lineTo(sN*1.6,40);c.stroke();}c.restore();
  L(c,6,26,30,[255,170,100],.18);
  c.strokeStyle='#0a0504';c.lineWidth=5;c.lineCap='round';c.beginPath();c.moveTo(18,-8);c.quadraticCurveTo(10,8,8+2*Math.sin(ph*TAU),18);c.stroke();
  // saksofonist
  c.save();c.translate(64,46);c.rotate(.07*sw);c.translate(-64,-46);
  sil(c,64,-34,9.5,false,'#0a0504');
  var sg=c.createLinearGradient(50,-20,72,30);sg.addColorStop(0,'#8a5a14');sg.addColorStop(.4,'#f4cf6a');sg.addColorStop(.6,'#c48a26');sg.addColorStop(1,'#6a4210');
  c.strokeStyle=sg;c.lineWidth=5.5;c.lineCap='round';c.beginPath();c.moveTo(58,-26);c.quadraticCurveTo(52,-4,54,18);c.quadraticCurveTo(57,28,66,22);c.stroke();
  c.fillStyle='#f0c860';c.beginPath();c.ellipse(68,18,6,3.6,-.6,0,TAU);c.fill();
  var gx=54+Math.sin(t*1.3)*2,gy=-4+((t*30)%30);L(c,gx,gy,8,[255,240,190],.5);c.restore();
  // publikum: to hoder, hun lener seg inntil
  L(c,0,58,80,[255,160,90],.32);var lk=sstep(1.3,2.4,lt);c.save();sil(c,-16,79,15.5,2,'#050202');rim(c,-16,79,16,-2.7,-.4,RIM_V,.9,2.2);
  c.translate(lerp(16,8,lk),lerp(86,83,lk));c.rotate(-.22*lk);sil(c,0,0,14,1,'#050202');rim(c,0,0,15,-2.8,-.4,RIM_I,.95,2.2);c.restore();
}
function jazzNotes(t){var st=irisState(t,IRIS[2]),C0=st?[st.x,st.y]:null;if(!C0){var I=IRIS[2];C0=[clamp(PX(1,I.u),R+18,W-R-18),clamp(Math.min(PY(1,I.y),H*.44),R+50,H-R-110)];}
  var k=R/100;for(var i=0;i<22;i++){var ts=22.5+i*.17,tau=t-ts;if(tau<0||tau>4.6)continue;
    var src=i%4===0?[-50,-6]:[68,14],x0=C0[0]+src[0]*k,y0=C0[1]+src[1]*k,vx=(hash(i)-.35)*70*s,vy=-(58+40*hash(i+1))*s;
    var x=x0+vx*tau+14*s*Math.sin(tau*2.2+i),y=y0+vy*tau*(1+.18*tau);var a=Math.min(1,tau/.25)*(1-sstep(3.4,4.6,tau));
    if(tau<2.6)note(x,y,s*(.9+.3*hash(i+5)),a*(1-sstep(2.1,2.6,tau)*.8));
    var sa=sstep(2.0,2.8,tau)*a;if(sa>0){ctx.fillStyle=rgba([255,246,226],sa);ctx.fillRect(x-1,y-1,2,2);glowB(x,y,8*s,[255,236,200],.6*sa);}}}
function note(x,y,sz,a){if(a<=.01)return;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#f6dca0';ctx.strokeStyle='#f6dca0';ctx.lineWidth=1.4*sz;
  ctx.beginPath();ctx.ellipse(x,y,4.2*sz,3*sz,-.4,0,TAU);ctx.fill();
  ctx.beginPath();ctx.moveTo(x+3.7*sz,y-1*sz);ctx.lineTo(x+3.7*sz,y-15*sz);ctx.quadraticCurveTo(x+9*sz,y-11*sz,x+8*sz,y-6*sz);ctx.stroke();ctx.restore();
  if(Q.bloom)glowOn(bctx,x,y,10*sz,[255,220,150],.5*a);}
function palm(c,x,y,h,lean,t,ph){c.strokeStyle='#0f2a1a';c.lineWidth=4;c.lineCap='round';var tx=x+lean,ty=y-h;
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+lean*.2,y-h*.6,tx,ty);c.stroke();
  for(var f=0;f<9;f++){var an=f/9*TAU+Math.sin(t*1.2+ph+f)*.08,ln=26+6*Math.sin(f*2.3),ex=tx+Math.cos(an)*ln,ey=ty+Math.abs(Math.sin(an))*ln*.35-6+Math.cos(an)*2;
    c.fillStyle=f%2?'#16452a':'#1f5a36';c.beginPath();c.moveTo(tx,ty);c.quadraticCurveTo((tx+ex)/2+Math.sin(an)*4,(ty+ey)/2-12,ex,ey+6);c.quadraticCurveTo((tx+ex)/2,(ty+ey)/2-3,tx,ty);c.fill();}}
function vDome(c,lt,t){
  var g=c.createRadialGradient(0,-90,10,0,-20,170);g.addColorStop(0,'#c9dfb8');g.addColorStop(.3,'#6a9a7c');g.addColorStop(.7,'#1d3a2b');g.addColorStop(1,'#0a1610');c.fillStyle=g;c.fillRect(-110,-110,220,220);
  c.strokeStyle='rgba(20,44,30,.5)';c.lineWidth=1.3;for(var k=-7;k<=7;k++){c.beginPath();c.moveTo(0,-150);c.quadraticCurveTo(k*26,-92,k*34,110);c.stroke();}
  for(var r2=1;r2<5;r2++){c.beginPath();c.ellipse(0,-150+r2*52,r2*30,10+r2*4,0,0,Math.PI);c.stroke();}
  c.save();c.globalCompositeOperation='lighter';for(var sh=0;sh<3;sh++){c.fillStyle='rgba(255,246,210,.06)';c.beginPath();c.moveTo(-60+sh*30,-110);c.lineTo(-40+sh*30,-110);c.lineTo(20+sh*40,110);c.lineTo(-10+sh*40,110);c.closePath();c.fill();}c.restore();
  palm(c,-74,110,110,10,t,0);palm(c,82,110,128,-12,t,1.7);palm(c,-104,110,70,6,t,3.1);
  for(var fn=0;fn<14;fn++){var fx=-100+fn*15,fy=104;c.fillStyle=fn%2?'#1c4a2c':'#255e38';c.beginPath();c.ellipse(fx,fy,10,5,(fn%3-1)*.5,0,TAU);c.fill();}
  // sokkel og byste
  var mg=c.createLinearGradient(-26,0,26,0);mg.addColorStop(0,'#f8f3e8');mg.addColorStop(.55,'#ddd5c6');mg.addColorStop(1,'#8f9a88');
  c.fillStyle=mg;c.fillRect(-16,52,32,60);c.fillRect(-21,47,42,6);c.fillRect(-19,104,38,8);c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-21,53,42,2);
  var rays=sstep(2.45,2.9,lt);if(rays>0){c.save();c.globalCompositeOperation='lighter';c.translate(0,-14);c.rotate(t*.15);
    for(var ry=0;ry<14;ry++){c.rotate(TAU/14);c.fillStyle=rgba([255,226,150],.065*rays);c.beginPath();c.moveTo(0,0);c.lineTo(-4,-90);c.lineTo(4,-90);c.closePath();c.fill();}c.restore();}
  c.fillStyle=mg;c.beginPath();c.moveTo(-30,47);c.quadraticCurveTo(-31,28,-13,20);c.quadraticCurveTo(-6,17,-5,8);c.lineTo(5,8);c.quadraticCurveTo(6,17,13,20);c.quadraticCurveTo(31,28,30,47);c.closePath();c.fill();
  c.strokeStyle='rgba(110,104,92,.35)';c.lineWidth=1.1;c.beginPath();c.moveTo(-22,30);c.quadraticCurveTo(-8,40,6,46);c.moveTo(-14,24);c.quadraticCurveTo(0,34,16,40);c.moveTo(18,26);c.quadraticCurveTo(22,36,24,46);c.stroke();
  var ng=c.createLinearGradient(-6,0,6,0);ng.addColorStop(0,'#efe8da');ng.addColorStop(1,'#9fa494');c.fillStyle=ng;c.fillRect(-5.5,-2,11,14);
  var hg=c.createRadialGradient(-5,-20,2,0,-13,17);hg.addColorStop(0,'#fffaf0');hg.addColorStop(.6,'#d9d1c1');hg.addColorStop(1,'#8e9888');
  c.fillStyle=hg;c.beginPath();c.ellipse(0,-13,11,14,0,0,TAU);c.fill();
  for(var cu=0;cu<13;cu++){var ca=Math.PI*(1.02+cu/12*.96),cxh=Math.cos(ca)*10.5,cyh=-15+Math.sin(ca)*12.5,cg2=c.createRadialGradient(cxh-1,cyh-1,.3,cxh,cyh,3.4);
    cg2.addColorStop(0,'#fbf6ea');cg2.addColorStop(1,'#a8a696');c.fillStyle=cg2;c.beginPath();c.arc(cxh,cyh,3.3,0,TAU);c.fill();}
  c.fillStyle='rgba(80,84,72,.28)';c.beginPath();c.ellipse(-4.2,-13.5,2.4,1.3,0,0,TAU);c.ellipse(4.2,-13.5,2.4,1.3,0,0,TAU);c.fill();
  c.strokeStyle='rgba(90,92,80,.38)';c.lineWidth=.9;c.beginPath();c.moveTo(.6,-12.5);c.quadraticCurveTo(2.4,-7.5,.2,-6.6);c.stroke();
  c.beginPath();c.moveTo(-2.6,-3.4);c.quadraticCurveTo(0,-2.6,2.6,-3.4);c.stroke();
  c.fillStyle='rgba(70,80,66,.16)';c.beginPath();c.ellipse(6.5,-10,4,8,0,0,TAU);c.fill();
  // laurbærkransen samler seg
  for(var i=0;i<18;i++){var ta=Math.PI*(1.08+i/17*.84),tx=Math.cos(ta)*17,ty=-12+Math.sin(ta)*9-4;
    var s0=.9+i*.035,kk=eio((lt-s0)/1.05);if(lt<s0)continue;var ang=ta+(1-kk)*2.6,rad=lerp(150,1,kk);
    var lx=lerp(Math.cos(ang)*150,tx,kk),ly=lerp(-12+Math.sin(ang)*150*.8,ty,kk);
    c.save();c.translate(lx,ly);c.rotate(ta+Math.PI/2+(i%2?.5:-.5)+(1-kk)*4);var lg=c.createLinearGradient(-5,0,5,0);lg.addColorStop(0,'#b07d1e');lg.addColorStop(.5,'#ffe08a');lg.addColorStop(1,'#a0701a');
    c.fillStyle=lg;c.beginPath();c.ellipse(0,0,5.4,2.1,0,0,TAU);c.fill();c.restore();
    if(kk<1){L(c,lx,ly,8,[255,214,120],.4*(1-kk));}}
  var fl=lt-2.55;if(fl>0&&fl<1.4){L(c,0,-16,70,[255,236,180],.55*(1-fl/1.4));for(var sp=0;sp<20;sp++){var an=sp/20*TAU,v=34+20*hash(sp+70);sparkle(c,Math.cos(an)*v*(.4+fl*.6),-16+Math.sin(an)*v*(.4+fl*.6)*.7,2.2,[255,230,160],1-fl/1.4);}}
  for(var d=0;d<26;d++){var dy=((hash(d)*200-lt*6*(1+hash(d+3)))%200+200)%200-100;c.fillStyle=rgba([255,246,214],.3);c.fillRect((hash(d+9)-.5)*200,dy,1.2,1.2);}
}
function vCabin(c,lt,t){
  var g=c.createLinearGradient(0,-110,0,110);g.addColorStop(0,'#c8c0b6');g.addColorStop(1,'#7c746e');c.fillStyle=g;c.fillRect(-110,-110,220,220);
  L(c,0,-14,120,[255,170,110],.35);
  c.fillStyle='#e8e2d8';c.beginPath();c.ellipse(0,-16,52,68,0,0,TAU);c.fill();
  var rg=c.createLinearGradient(0,-84,0,52);rg.addColorStop(0,'#a8a29a');rg.addColorStop(1,'#d8d2c8');c.fillStyle=rg;c.beginPath();c.ellipse(0,-16,45,61,0,0,TAU);c.fill();
  c.save();c.beginPath();c.ellipse(0,-16,38,54,0,0,TAU);c.clip();
  var sk=c.createLinearGradient(0,-70,0,40);sk.addColorStop(0,'#4a5e9e');sk.addColorStop(.45,'#c6788a');sk.addColorStop(.75,'#ffad6a');sk.addColorStop(1,'#ffd08c');c.fillStyle=sk;c.fillRect(-40,-72,80,112);
  L(c,14,22,40,[255,190,110],.7);c.fillStyle='#fff1cc';c.beginPath();c.arc(14,22,9,0,TAU);c.fill();
  for(var cl=0;cl<12;cl++){var sp=14+cl*3,cx=((hash(cl)*200-lt*sp)%200+200)%200-100,cy=-50+hash(cl+4)*90,cw=18+22*hash(cl+8);
    c.fillStyle=rgba(cl%3?[255,214,190]:[250,236,226],.55);c.beginPath();c.ellipse(cx,cy,cw,4+3*hash(cl+2),0,0,TAU);c.fill();}
  c.fillStyle='#8e9098';c.beginPath();c.moveTo(42,34);c.lineTo(-6,50);c.lineTo(44,60);c.closePath();c.fill();
  if(((t*1.1)%1)<.5)L(c,-4,50,10,[120,255,150],.9);
  var hk=clamp((lt-1.3)/1.3,0,1);if(hk>0){c.strokeStyle='rgba(255,255,255,.6)';c.lineWidth=1.5;c.lineCap='round';c.beginPath();
    for(var q=0;q<=hk*TAU+.001;q+=.08){var hx=-14+.62*16*Math.pow(Math.sin(q),3),hy=-34-.62*(13*Math.cos(q)-5*Math.cos(2*q)-2*Math.cos(3*q)-Math.cos(4*q));if(q===0)c.moveTo(hx,hy);else c.lineTo(hx,hy);}c.stroke();}
  c.restore();
  var ig=c.createRadialGradient(0,-16,40,0,-16,64);ig.addColorStop(0,'rgba(0,0,0,0)');ig.addColorStop(1,'rgba(40,30,30,.35)');c.fillStyle=ig;c.beginPath();c.ellipse(0,-16,46,62,0,0,TAU);c.fill();
  var lk=sstep(.5,1.7,lt),sh='#2c2328';
  c.save();c.translate(-34,lerp(78,77,lk));c.rotate(.12*lk);sil(c,0,0,23,2,sh);rim(c,0,0,24,-2.2,-.8,RIM_V,.75,2);c.restore();
  c.save();c.translate(lerp(30,14,lk),lerp(86,80,lk));c.rotate(-.3*lk);sil(c,0,0,21,1,sh);rim(c,0,0,22,-2.4,-1.0,RIM_I,.85,2);c.restore();
}

/* ───────────── konfetti i Parken ───────────── */
function confetti(t){var tau=t-38.2;if(tau<0||tau>3.4)return;var ox=PX(1,5410),oy=PY(1,-160),CC=[[40,110,230],[245,246,250],[120,180,255]];
  for(var i=0;i<170;i++){var an=-Math.PI/2+(hash(i+300)-.5)*2.3,sp=(200+420*hash(i+301))*s,kd=1.7,f=(1-Math.exp(-kd*tau))/kd;
    var x=ox+Math.cos(an)*sp*f+7*s*Math.sin(tau*7+i),y=oy+Math.sin(an)*sp*f+80*s*tau*tau;var a=1-sstep(2.2,3.4,tau);
    var r=tau*(4+6*hash(i+302))+i,cs=Math.cos(r),sn=Math.sin(r);ctx.setTransform(DPR*cs,DPR*sn*.6,-DPR*sn,DPR*cs,x*DPR,y*DPR);
    ctx.fillStyle=rgba(CC[i%3],a);ctx.fillRect(-2.2*s,-1.2*s,4.4*s,2.4*s);}
  ctx.setTransform(DPR,0,0,DPR,0,0);}

/* ───────────── finalen: lysene blir til navnet ───────────── */
function buildText(){var o=mkCanvas(),ow=Math.ceil(W),oh=Math.ceil(H);o.width=ow;o.height=oh;var g=o.getContext('2d');
  var fs=Math.min(W*.24,H*.3,300);g.fillStyle='#fff';g.textAlign='center';g.textBaseline='alphabetic';
  g.font='italic 600 '+fs+'px '+DISPLAY;var ty=Math.max(fs*.95,H*.42);g.fillText('Ingrid',ow/2,ty);
  var d=g.getImageData(0,0,ow,oh).data,area=0,gap;
  for(var y0=0;y0<oh;y0+=3)for(var x0=0;x0<ow;x0+=3)if(d[(y0*ow+x0)*4+3]>128)area++;
  gap=Math.max(2,Math.sqrt(area*9/Q.parts));
  targets=[];for(var y=0;y<oh;y+=gap)for(var x=(Math.floor(y/gap)%2)*gap/2;x<ow;x+=gap){var xi=x|0,yi=y|0;if(d[(yi*ow+xi)*4+3]>128)targets.push([x,y]);}
  var R2=rng(6);for(var i=targets.length-1;i>0;i--){var j=Math.floor(R2()*(i+1)),tmp=targets[i];targets[i]=targets[j];targets[j]=tmp;}
  pOff=new Float32Array(targets.length*4);}
function finale(t){if(t<GATHER-.1)return;var n=targets.length;
  var camG=kf(GATHER,CAM),hzG=HZ+kf(GATHER,CAMY)*H;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(var i=0;i<n;i++){var tg=targets[i],d=hash(i+900)*1.5,k=eio((t-GATHER-d)/1.8);if(t-GATHER-d<0)continue;
    var sx,sy,hh=hash(i+901);
    if(hh<.55){var st=stars[i%stars.length];sx=st.x;sy=st.y;}else{sx=W*hash(i+902);sy=hzG-(hh-.55)*H*.5+(hash(i+903)-.5)*20;}
    var cx=lerp(sx,tg[0],.5)+(hash(i+904)-.5)*W*.35,cy=Math.min(sy,tg[1])-H*.18*hash(i+905);
    var x=(1-k)*(1-k)*sx+2*(1-k)*k*cx+k*k*tg[0],y=(1-k)*(1-k)*sy+2*(1-k)*k*cy+k*k*tg[1];
    if(k>=1&&pOff){var o=i*4,dx=x+pOff[o]-mx,dy=y+pOff[o+1]-my,d2=dx*dx+dy*dy;
      if(d2<9000&&!MANUAL){var f=(9000-d2)/9000*2.4,inv=1/Math.sqrt(d2+1);pOff[o+2]+=dx*inv*f;pOff[o+3]+=dy*inv*f;}
      pOff[o+2]+=-pOff[o]*.07;pOff[o+3]+=-pOff[o+1]*.07;pOff[o+2]*=.84;pOff[o+3]*=.84;pOff[o]+=pOff[o+2];pOff[o+1]+=pOff[o+3];x+=pOff[o];y+=pOff[o+1];
      x+=Math.sin(t*1.7+i)*.35;y+=Math.cos(t*1.3+i*1.7)*.35;}
    var tw=.72+.28*Math.sin(t*3.1+i*.7),c=mix([255,240,214],[255,196,120],tg[0]/W),a=(k<1?.55+.45*k:.95)*tw,sz=k<1?1.4:1.7;
    ctx.fillStyle=rgba(c,a);ctx.fillRect(x-sz/2,y-sz/2,sz,sz);
    if(Q.bloom&&(i&1))bl(x,y,1,1,c,a*.9);}
  ctx.restore();
  var gk=sstep(GATHER+1.6,GATHER+3.4,t);if(gk>0&&targets.length){glowB(W/2,targets.reduce?H*.33:H*.33,Math.min(W,H)*.5,[255,206,140],.1*gk);}}

/* ───────────── etterarbeid ───────────── */
function buildStatic(){
  // vignett
  vg.width=Math.max(64,W>>2);vg.height=Math.max(64,H>>2);var v=vg.getContext('2d'),gr=v.createRadialGradient(vg.width/2,vg.height*.46,Math.min(vg.width,vg.height)*.32,vg.width/2,vg.height/2,Math.max(vg.width,vg.height)*.72);
  gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,.6)');v.fillStyle=gr;v.fillRect(0,0,vg.width,vg.height);
  // korn
  noise=[];for(var n=0;n<3;n++){var nc=mkCanvas();nc.width=nc.height=128;var nx=nc.getContext('2d'),id=nx.createImageData(128,128);
    for(var p=0;p<id.data.length;p+=4){var g=Math.random()*255|0;id.data[p]=id.data[p+1]=id.data[p+2]=g;id.data[p+3]=255;}nx.putImageData(id,0,0);noise.push(ctx.createPattern(nc,'repeat'));}
  // måne
  var mr=Math.round(24*s),pad=mr*4;moonC.width=moonC.height=pad*2;moonC._r=pad;var m=moonC.getContext('2d');
  var mg=m.createRadialGradient(pad,pad,0,pad,pad,pad);mg.addColorStop(0,'rgba(255,244,220,.35)');mg.addColorStop(.25,'rgba(255,244,220,.1)');mg.addColorStop(1,'rgba(255,244,220,0)');m.fillStyle=mg;m.fillRect(0,0,pad*2,pad*2);
  var mc=mkCanvas();mc.width=mc.height=pad*2;var mm=mc.getContext('2d');mm.fillStyle='#f7eedb';mm.beginPath();mm.arc(pad,pad,mr,0,TAU);mm.fill();
  mm.globalCompositeOperation='destination-out';mm.beginPath();mm.arc(pad+mr*.46,pad-mr*.22,mr*.9,0,TAU);mm.fill();m.drawImage(mc,0,0);
  // skyer
  clouds=[];var cr=rng(42);for(var i=0;i<7;i++){var cw=W*(.24+.22*cr()),ch=cw*.22,c={x:cr(),y:.06+.42*cr(),w:cw,h:ch,v:.6+.8*cr(),a:.5+.3*cr()};
    var blobs=[];for(var b=0;b<22;b++){var bx=.1+.8*cr();blobs.push([cw*bx,ch*(.5+.22*cr()-Math.abs(bx-.5)*.2),ch*(.24+.3*cr())*(1-Math.abs(bx-.5)*.8)]);}
    c.d=cloudSprite(cw,ch,blobs,[255,255,255],[206,214,226]);c.s=cloudSprite(cw,ch,blobs,[255,206,176],[150,112,150]);c.n=cloudSprite(cw,ch,blobs,[74,84,116],[34,40,66]);clouds.push(c);}
  // stjerner
  stars=[];var srn=rng(7),N=Math.round(W*H*.6/2400);for(var j=0;j<N;j++)stars.push({x:srn()*W,y:Math.pow(srn(),1.4)*H*.58,r:.6+srn()*1.3,p:srn()*TAU,f:.6+srn()*2,b:.45+.55*srn()});}
function cloudSprite(w,h,blobs,top,bot){var c=mkCanvas();c.width=Math.ceil(w);c.height=Math.ceil(h);var x=c.getContext('2d');
  blobs.forEach(function(b){var g=x.createRadialGradient(b[0],b[1],0,b[0],b[1],b[2]);g.addColorStop(0,rgba(mix(top,bot,b[1]/h*.7),.9));g.addColorStop(1,rgba(top,0));x.fillStyle=g;x.fillRect(0,0,w,h);});return c;}
function bloom(a1,a2){if(!Q.bloom)return;ctx.save();ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalCompositeOperation='lighter';ctx.imageSmoothingEnabled=true;ctx.globalAlpha=a1;ctx.drawImage(bc,0,0,W,H);
  b2ctx.clearRect(0,0,bc2.width,bc2.height);b2ctx.drawImage(bc,0,0,bc2.width,bc2.height);ctx.globalAlpha=a2;ctx.drawImage(bc2,0,0,W,H);ctx.restore();
  bctx.setTransform(1,0,0,1,0,0);bctx.clearRect(0,0,bw,bh);bctx.setTransform(bs,0,0,bs,0,0);}
function post(t){
  ctx.drawImage(vg,0,0,W,H);
  if(Q.grain&&noise.length){ctx.save();ctx.globalCompositeOperation='overlay';ctx.globalAlpha=.075;ctx.fillStyle=noise[frameN%3];var ox=(hash(frameN)*128)|0,oy=(hash(frameN+1)*128)|0;
    ctx.translate(-ox,-oy);ctx.fillRect(ox,oy,W,H);ctx.restore();}
  var lb=Math.min(H*.065,60)*eout(t/1.4);ctx.fillStyle='#000';ctx.fillRect(0,0,W,lb);ctx.fillRect(0,H-lb,W,lb);
  var fi=1-eout(t/1.1);if(fi>0){ctx.fillStyle='rgba(0,0,0,'+fi+')';ctx.fillRect(0,0,W,H);}}

/* ───────────── tekst i DOM ───────────── */
var capIdx=-2;
function dom(t){var ta=win(t,.6,4.5,1.2,.9);title.style.opacity=ta.toFixed(3);
  if(ta>0){var e=eout((t-.6)/1.8);tBig.style.letterSpacing=lerp(.22,.01,e).toFixed(3)+'em';title.style.filter='blur('+lerp(6,0,e).toFixed(2)+'px)';title.style.transform='translateY('+lerp(10,0,e).toFixed(1)+'px)';}
  var idx=-1,a=0;for(var i=0;i<CAPS.length;i++){var ca=CAPS[i],w=win(t,ca.a,ca.b,.8,.6);if(w>0){idx=i;a=w;break;}}
  if(idx!==capIdx){capIdx=idx;if(idx>=0){cLab.textContent=CAPS[idx].l;cTit.textContent=CAPS[idx].t;}}
  cap.style.opacity=a.toFixed(3);if(idx>=0){var e2=eout((t-CAPS[idx].a)/1.2);cap.style.transform='translateY('+lerp(8,0,e2).toFixed(1)+'px)';cap.style.filter='blur('+lerp(4,0,e2).toFixed(2)+'px)';}
  var ra=sstep(54.3,55.3,t);rBtn.style.opacity=ra.toFixed(3);rBtn.style.pointerEvents=ra>.5?'auto':'none';}

/* ───────────── bildet ───────────── */
function render(t){
  tod=kf(t,TOD);dk=kf(tod,DARK,lin);nf=sstep(.55,.95,tod);cam=kf(t,CAM);camY=kf(t,CAMY)*H;hz=HZ+camY;
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  if(Q.bloom){bctx.setTransform(1,0,0,1,0,0);bctx.clearRect(0,0,bw,bh);bctx.setTransform(bs,0,0,bs,0,0);bctx.globalCompositeOperation='lighter';}
  drawSky(t);drawClouds(t);drawStars(t);planeProlog(t);
  drawLayer(0,t);haze();drawLayer(1,t);groundShade();
  drawWater(t);
  drawLayer(2,t);
  bloom(.62,.5);
  confetti(t);irises(t);jazzNotes(t);finale(t);
  bloom(.8,.55);
  post(t);dom(t);}

/* ───────────── oppsett ───────────── */
function layout(){W=Math.max(320,window.innerWidth);H=Math.max(320,window.innerHeight);DPR=Math.min(window.devicePixelRatio||1,Q.hi?1.75:1);
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);s=Math.min(H/1000,W/620);HZ=Math.round(H*.6);R=Math.min(W*.42,H*.3,330);
  bw=Math.max(80,Math.round(W/6));bs=bw/W;bh=Math.max(20,Math.round(H*bs));bc.width=bw;bc.height=bh;bc2.width=Math.max(40,bw>>1);bc2.height=Math.max(30,bh>>1);
  rc.width=cv.width;rc.height=cv.height;buildStatic();buildText();}

/* ───────────── lyd: et lite orkester i WebAudio ───────────── */
var A=null,soundOn=true;try{soundOn=localStorage.getItem('ingrid-lyd')!=='av';}catch(e){}
function mtof(m){return 440*Math.pow(2,(m-69)/12);}
function makeOut(ac,dest){var o={ac:ac};
  o.comp=ac.createDynamicsCompressor();o.comp.threshold.value=-16;o.comp.ratio.value=3;o.comp.attack.value=.01;o.comp.release.value=.25;
  o.master=ac.createGain();o.master.gain.value=.62;o.master.connect(o.comp);o.comp.connect(dest);
  var len=Math.round(ac.sampleRate*2.8),ir=ac.createBuffer(2,len,ac.sampleRate);for(var ch=0;ch<2;ch++){var d=ir.getChannelData(ch);for(var i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.4);}
  o.rev=ac.createConvolver();o.rev.buffer=ir;var rg=ac.createGain();rg.gain.value=.55;o.rev.connect(rg);rg.connect(o.master);
  var nb=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate),nd=nb.getChannelData(0);for(var j=0;j<nd.length;j++)nd[j]=Math.random()*2-1;o.nb=nb;
  o.send=function(node,pan,wet){var p=node;if(ac.createStereoPanner&&pan){p=ac.createStereoPanner();p.pan.value=pan;node.connect(p);}
    p.connect(o.master);if(wet){var w=ac.createGain();w.gain.value=wet;p.connect(w);w.connect(o.rev);}};
  o.noise=function(w,d){var n=ac.createBufferSource();n.buffer=nb;n.loop=true;n.start(w,Math.random()*1.5);n.stop(w+d+.05);return n;};
  return o;}
var INS={
  bell:function(o,w,m,d,v,p){var ac=o.ac,f=mtof(m),c=ac.createOscillator(),md=ac.createOscillator(),mg=ac.createGain(),g=ac.createGain(),L2=Math.max(1.5,d);
    c.frequency.value=f;md.frequency.value=f*3.5;mg.gain.setValueAtTime(f*2,w);mg.gain.exponentialRampToValueAtTime(f*.04,w+1.1);md.connect(mg);mg.connect(c.frequency);c.connect(g);
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.16*v,w+.004);g.gain.exponentialRampToValueAtTime(.0005,w+L2);o.send(g,p,.5);c.start(w);md.start(w);c.stop(w+L2+.05);md.stop(w+L2+.05);},
  rhodes:function(o,w,m,d,v,p){var ac=o.ac,f=mtof(m),c=ac.createOscillator(),md=ac.createOscillator(),mg=ac.createGain(),g=ac.createGain(),t2=ac.createOscillator(),tg=ac.createGain();
    c.frequency.value=f;md.frequency.value=f;mg.gain.setValueAtTime(f*1.4,w);mg.gain.setTargetAtTime(f*.15,w,.25);md.connect(mg);mg.connect(c.frequency);c.connect(g);
    t2.frequency.value=f*7.02;tg.gain.setValueAtTime(.02*v,w);tg.gain.exponentialRampToValueAtTime(.0003,w+.25);t2.connect(tg);tg.connect(g);
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.085*v,w+.006);g.gain.setTargetAtTime(.03*v,w+.006,.5);g.gain.setTargetAtTime(0,w+d,.18);
    o.send(g,p,.3);[c,md,t2].forEach(function(x){x.start(w);x.stop(w+d+1.2);});},
  pad:function(o,w,m,d,v,p){var ac=o.ac,f=mtof(m),fl=ac.createBiquadFilter(),g=ac.createGain();fl.type='lowpass';fl.frequency.value=1100;fl.Q.value=.4;
    [-9,0,9].forEach(function(dt){var x=ac.createOscillator();x.type='sawtooth';x.frequency.value=f;x.detune.value=dt;x.connect(fl);x.start(w);x.stop(w+d+2.6);});
    fl.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.034*v,w+1.0);g.gain.setValueAtTime(.034*v,w+Math.max(1.0,d));g.gain.setTargetAtTime(0,w+Math.max(1.0,d),.6);o.send(g,p,.55);},
  bass:function(o,w,m,d,v,p){var ac=o.ac,f=mtof(m),x=ac.createOscillator(),y=ac.createOscillator(),fl=ac.createBiquadFilter(),g=ac.createGain();x.type='triangle';x.frequency.value=f;y.frequency.value=f;
    fl.type='lowpass';fl.frequency.value=650;x.connect(fl);y.connect(fl);fl.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.24*v,w+.008);g.gain.setTargetAtTime(.08*v,w+.01,.25);g.gain.setTargetAtTime(0,w+d,.08);
    o.send(g,0,.08);x.start(w);y.start(w);x.stop(w+d+.6);y.stop(w+d+.6);},
  pizz:function(o,w,m,d,v,p){var ac=o.ac,x=ac.createOscillator(),g=ac.createGain();x.type='triangle';x.frequency.value=mtof(m);x.connect(g);
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.14*v,w+.003);g.gain.exponentialRampToValueAtTime(.0005,w+Math.max(.3,d));o.send(g,p,.35);x.start(w);x.stop(w+Math.max(.3,d)+.05);},
  harp:function(o,w,m,d,v,p){INS.pizz(o,w,m,1.2,v*.9,p);INS.bell(o,w,m+12,1,v*.25,p);},
  harpsi:function(o,w,m,d,v,p){var ac=o.ac,f=mtof(m),x=ac.createOscillator(),y=ac.createOscillator(),hp=ac.createBiquadFilter(),lp=ac.createBiquadFilter(),g=ac.createGain();
    x.type='sawtooth';y.type='square';x.frequency.value=f;y.frequency.value=f*2;y.detune.value=4;hp.type='highpass';hp.frequency.value=320;lp.type='lowpass';lp.frequency.setValueAtTime(5200,w);lp.frequency.exponentialRampToValueAtTime(1400,w+.3);
    x.connect(hp);y.connect(hp);hp.connect(lp);lp.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.1*v,w+.002);g.gain.exponentialRampToValueAtTime(.0005,w+.5);
    o.send(g,p,.3);x.start(w);y.start(w);x.stop(w+.55);y.stop(w+.55);},
  sax:function(o,w,m,d,v,p){var ac=o.ac,f=mtof(m),x=ac.createOscillator(),lfo=ac.createOscillator(),lg=ac.createGain(),fl=ac.createBiquadFilter(),g=ac.createGain();
    x.type='sawtooth';x.frequency.value=f;lfo.frequency.value=5.3;lg.gain.setValueAtTime(0,w);lg.gain.linearRampToValueAtTime(f*.007,w+Math.min(.35,d));lfo.connect(lg);lg.connect(x.frequency);
    fl.type='lowpass';fl.Q.value=1.6;fl.frequency.setValueAtTime(700,w);fl.frequency.linearRampToValueAtTime(2300,w+.06);fl.frequency.setTargetAtTime(1500,w+.08,.2);
    x.connect(fl);fl.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.075*v,w+.045);g.gain.setValueAtTime(.065*v,w+d);g.gain.setTargetAtTime(0,w+d,.05);
    o.send(g,p,.32);x.start(w);lfo.start(w);x.stop(w+d+.4);lfo.stop(w+d+.4);},
  brass:function(o,w,m,d,v,p){var ac=o.ac,fl=ac.createBiquadFilter(),g=ac.createGain();fl.type='lowpass';fl.Q.value=.8;fl.frequency.setValueAtTime(300,w);fl.frequency.linearRampToValueAtTime(3200,w+.06);fl.frequency.setTargetAtTime(1200,w+.07,.2);
    [-11,0,11].forEach(function(dt){var x=ac.createOscillator();x.type='sawtooth';x.frequency.value=mtof(m);x.detune.value=dt;x.connect(fl);x.start(w);x.stop(w+d+.6);});
    fl.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.04*v,w+.02);g.gain.setValueAtTime(.032*v,w+d);g.gain.setTargetAtTime(0,w+d,.12);o.send(g,p,.35);},
  kick:function(o,w,m,d,v){var ac=o.ac,x=ac.createOscillator(),g=ac.createGain();x.frequency.setValueAtTime(140,w);x.frequency.exponentialRampToValueAtTime(42,w+.13);x.connect(g);
    g.gain.setValueAtTime(.85*v,w);g.gain.exponentialRampToValueAtTime(.001,w+.42);o.send(g,0,.05);x.start(w);x.stop(w+.45);},
  tom:function(o,w,m,d,v,p){var ac=o.ac,x=ac.createOscillator(),g=ac.createGain();x.frequency.setValueAtTime(210,w);x.frequency.exponentialRampToValueAtTime(96,w+.18);x.connect(g);
    g.gain.setValueAtTime(.5*v,w);g.gain.exponentialRampToValueAtTime(.001,w+.4);o.send(g,p,.2);x.start(w);x.stop(w+.42);},
  snare:function(o,w,m,d,v,p){var ac=o.ac,n=o.noise(w,.2),f=ac.createBiquadFilter(),g=ac.createGain();f.type='bandpass';f.frequency.value=1900;f.Q.value=.7;n.connect(f);f.connect(g);
    g.gain.setValueAtTime(.32*v,w);g.gain.exponentialRampToValueAtTime(.001,w+.13);o.send(g,p,.2);},
  clap:function(o,w,m,d,v,p,x){var ac=o.ac,n=o.noise(w,.3),f=ac.createBiquadFilter(),g=ac.createGain();f.type='bandpass';f.frequency.value=(x&&x.f)||1400;f.Q.value=1.1;n.connect(f);f.connect(g);
    g.gain.setValueAtTime(0,w);[0,.011,.022].forEach(function(o2){g.gain.setValueAtTime(.4*v,w+o2);g.gain.exponentialRampToValueAtTime(.05*v,w+o2+.009);});g.gain.exponentialRampToValueAtTime(.001,w+.18);o.send(g,p,.25);},
  ride:function(o,w,m,d,v,p){var ac=o.ac,n=o.noise(w,.4),f=ac.createBiquadFilter(),g=ac.createGain();f.type='highpass';f.frequency.value=6500;n.connect(f);f.connect(g);
    g.gain.setValueAtTime(.065*v,w);g.gain.exponentialRampToValueAtTime(.001,w+.35);o.send(g,p||.35,.2);},
  brush:function(o,w,m,d,v,p){var ac=o.ac,n=o.noise(w,.3),f=ac.createBiquadFilter(),g=ac.createGain();f.type='bandpass';f.frequency.value=2800;f.Q.value=.8;n.connect(f);f.connect(g);
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.05*v,w+.06);g.gain.exponentialRampToValueAtTime(.001,w+.22);o.send(g,p||-.3,.2);},
  crash:function(o,w,m,d,v){var ac=o.ac,n=o.noise(w,2.2),f=ac.createBiquadFilter(),g=ac.createGain();f.type='highpass';f.frequency.value=3800;n.connect(f);f.connect(g);
    g.gain.setValueAtTime(.24*v,w);g.gain.exponentialRampToValueAtTime(.001,w+2);o.send(g,.2,.4);},
  clink:function(o,w,m,d,v){[2637,2650,3729,4440].forEach(function(f,i){var ac=o.ac,x=ac.createOscillator(),g=ac.createGain();x.frequency.value=f;x.connect(g);
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime((i===1?.025:.045)*v,w+.002);g.gain.exponentialRampToValueAtTime(.0004,w+.9-i*.12);o.send(g,0,.5);x.start(w);x.stop(w+1);});},
  sweep:function(o,w,m,d,v,p,x){var ac=o.ac,n=o.noise(w,d),f=ac.createBiquadFilter(),g=ac.createGain();f.type=x.t||'bandpass';f.Q.value=x.q||1.2;f.frequency.setValueAtTime(x.f0,w);f.frequency.exponentialRampToValueAtTime(x.f1,w+d);
    n.connect(f);f.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.16*v,w+d*(x.pk||.75));g.gain.linearRampToValueAtTime(0,w+d);o.send(g,p,.35);},
  crowd:function(o,w,m,d,v,p,x){var ac=o.ac;[[480,.6],[1150,.9],[2300,1.4]].forEach(function(b,i){var n=o.noise(w,d+1),f=ac.createBiquadFilter(),g=ac.createGain(),lf=ac.createOscillator(),lg=ac.createGain();
    f.type='bandpass';f.frequency.value=b[0];f.Q.value=b[1];n.connect(f);f.connect(g);lf.frequency.value=.7+i*.37;lg.gain.value=.025*v;lf.connect(lg);lg.connect(g.gain);
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime((i===2?.04:.07)*v,w+d*((x&&x.a)||.3));g.gain.setValueAtTime((i===2?.04:.07)*v,w+d);g.gain.linearRampToValueAtTime(0,w+d+.9);
    o.send(g,(i-1)*.3,.3);lf.start(w);lf.stop(w+d+1);});},
  hey:function(o,w,m,d,v){var ac=o.ac,f1=ac.createBiquadFilter(),f2=ac.createBiquadFilter(),g=ac.createGain();f1.type='bandpass';f1.frequency.value=650;f1.Q.value=3;f2.type='bandpass';f2.frequency.value=1150;f2.Q.value=4;
    for(var i=0;i<8;i++){var x=ac.createOscillator();x.type='sawtooth';x.frequency.setValueAtTime(150+i*21+Math.random()*12,w);x.frequency.linearRampToValueAtTime(130+i*19,w+.28);x.connect(f1);x.connect(f2);x.start(w+Math.random()*.03);x.stop(w+.4);}
    f1.connect(g);f2.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.06*v,w+.03);g.gain.exponentialRampToValueAtTime(.001,w+.34);o.send(g,0,.4);},
  applause:function(o,w,m,d,v){for(var i=0;i<70;i++){var tt=w+d*Math.pow(Math.random(),1.6);INS.clap(o,tt,0,0,v*(.25+.35*Math.random())*(1-(tt-w)/d*.7),Math.random()*1.6-.8,{f:900+Math.random()*1900});}},
  thump:function(o,w,m,d,v){var ac=o.ac,x=ac.createOscillator(),g=ac.createGain();x.frequency.setValueAtTime(78,w);x.frequency.exponentialRampToValueAtTime(38,w+.2);x.connect(g);
    g.gain.setValueAtTime(.7*v,w);g.gain.exponentialRampToValueAtTime(.001,w+.5);o.send(g,0,.3);
    var n=o.noise(w,.15),f=ac.createBiquadFilter(),g2=ac.createGain();f.type='lowpass';f.frequency.value=500;n.connect(f);f.connect(g2);g2.gain.setValueAtTime(.25*v,w);g2.gain.exponentialRampToValueAtTime(.001,w+.12);o.send(g2,0,.3);x.start(w);x.stop(w+.55);},
  hum:function(o,w,m,d,v){var ac=o.ac,g=ac.createGain();[100,200,300].forEach(function(f,i){var x=ac.createOscillator();x.frequency.value=f;var gg=ac.createGain();gg.gain.value=[1,.5,.25][i];x.connect(gg);gg.connect(g);x.start(w);x.stop(w+d+1);});
    g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.012*v,w+.4);g.gain.setValueAtTime(.012*v,w+d);g.gain.linearRampToValueAtTime(0,w+d+.8);o.send(g,0,.1);},
  buzz:function(o,w,m,d,v){var ac=o.ac,x=ac.createOscillator(),f=ac.createBiquadFilter(),g=ac.createGain();x.type='sawtooth';x.frequency.value=120;f.type='bandpass';f.frequency.value=2400;f.Q.value=3;x.connect(f);f.connect(g);
    g.gain.setValueAtTime(0,w);for(var i=0;i<7;i++){var on=w+i*.06;g.gain.setValueAtTime(i%2?0:.03*v,on);}g.gain.setValueAtTime(.012*v,w+.45);g.gain.linearRampToValueAtTime(0,w+d);o.send(g,.4,.2);x.start(w);x.stop(w+d+.1);},
  jet:function(o,w,m,d,v,p,x){INS.sweep(o,w,0,d,v,p,{t:'lowpass',q:.7,f0:x.f0,f1:x.f1,pk:x.pk||.6});var ac=o.ac,y=ac.createOscillator(),g=ac.createGain();y.frequency.setValueAtTime(x.f0*2,w);y.frequency.exponentialRampToValueAtTime(x.f1*1.8,w+d*.7);
    y.connect(g);g.gain.setValueAtTime(0,w);g.gain.linearRampToValueAtTime(.006*v,w+d*.5);g.gain.linearRampToValueAtTime(0,w+d);o.send(g,p,.3);y.start(w);y.stop(w+d+.1);}
};
function score(){var E=[];function e(t,f,n,d,v,p,x){E.push({t:t,f:f,n:n,d:d,v:v==null?1:v,p:p||0,x:x});}
  function ch(t,f,ns,d,v,p,str){ns.forEach(function(n,i){e(t+(str||0)*i,f,n,d,v,p);});}
  // prolog: Dmaj9 og spilledåsemotivet
  ch(.2,'pad',[50,57,61,64,66],4.6,.9);e(.2,'bass',38,4.4,.45);
  [[.9,81],[1.35,78],[1.8,86],[2.5,85],[3.0,83],[3.3,81],[3.6,78]].forEach(function(q){e(q[0],'bell',q[1],1.4,.75,.3);});
  e(.6,'jet',0,3.8,.55,.5,{f0:260,f1:700,pk:.7});
  // tidsforløp
  e(4,'sweep',0,3,.8,0,{f0:220,f1:5200});ch(5.3,'pad',[47,54,57,61,62],1.3,.85);ch(6.3,'pad',[43,50,54,57,59,64],1.2,.85);
  var arp=[74,78,81,86,90,93,98];for(var i=0;i<14;i++)e(4.2+2.6*Math.pow(i/14,.7),'bell',arp[i%7],.9,.4+i*.025,i%2?.4:-.4);
  // tirsdag: Barr, 92 bpm
  var b=60/92;[[7.0,[50,54,57,61,64],38],[8.3,[47,54,57,61,62],35],[9.6,[52,55,59,62,66],40],[10.4,[45,55,59,61,66],33]].forEach(function(c){ch(c[0],'rhodes',c[1],1.25,.85,-.2,.012);e(c[0],'bass',c[2],1.1,.8);});
  for(var k=0;k<6;k++)e(7.0+k*b,'brush',0,.2,.6);
  e(9.0,'clink',0,1,1);[98,93,90,86].forEach(function(n,j){e(9.05+j*.07,'bell',n,.9,.45,.35);});
  ch(11.0,'rhodes',[50,54,57,61,64,69],1.6,.7,-.2,.03);[38,40,42,43,45].forEach(function(n,j){e(11.0+j*.4,'bass',n,.38,.7);});
  ch(11.2,'pad',[45,52,57,61,64],1.8,.6);
  // tirsdag: sirkusvals, 132 bpm 3/4
  var q=60/132,bar=q*3,t0=13.2;
  [[50,[57,62,65]],[45,[55,61,64]],[50,[57,62,65]]].forEach(function(c,j){var tb=t0+j*bar;e(tb,'bass',c[0]-12,q*.9,.75);e(tb+q,'pizz',c[1][0],.3,.7,-.2);e(tb+q,'pizz',c[1][1],.3,.6,-.1);e(tb+q,'pizz',c[1][2],.3,.6,0);
    if(tb+2*q<16)c[1].forEach(function(n,u){e(tb+2*q,'pizz',n,.3,.55,-.2+u*.1);});});
  [[13.2,81,.4],[13.65,86,.4],[14.1,89,.4],[14.56,88,.85],[15.47,85,.4],[15.93,86,.2]].forEach(function(m){e(m[0],'bell',m[1],m[2],.8,.25);});
  for(var r=0;r<26;r++){var rt=16.02+.85*(1-Math.pow(1-r/26,1.6));e(rt,'snare',0,.1,.25+.7*r/26,.1);}
  e(16.0,'sweep',0,.9,.5,0,{t:'bandpass',q:6,f0:600,f1:2400,pk:.95});
  e(16.88,'crash',0,2,1);e(16.88,'kick',0,.4,1);ch(16.88,'brass',[62,66,69,74],.9,1,0);e(16.95,'applause',0,1.7,1);
  [[17.3,86],[17.45,93],[17.6,98]].forEach(function(m){e(m[0],'bell',m[1],1.2,.7,.3);});
  ch(18.0,'pad',[43,50,54,59],2.6,.8);ch(19.5,'pad',[42,49,52,57],1.5,.7);
  [[19.64,47],[20.09,45],[20.55,42]].forEach(function(m){e(m[0],'bass',m[1],.42,.8);});
  // onsdag: jazz, 132 bpm swing
  e(20.9,'buzz',0,.6,1);e(21.55,'buzz',0,.6,1);
  var bt=60/132,walk=[40,42,43,44,45,49,52,43,38,42,45,47];
  walk.forEach(function(n,j){e(21.0+j*bt,'bass',n,bt*.92,.85);});e(21.0+12*bt,'bass',38,1.8,.8);
  for(var bb=0;bb<14;bb++){var tb2=21.0+bb*bt;e(tb2,'ride',0,.3,bb%2?.7:.9,.35);if(bb%2)e(tb2+bt*2/3,'ride',0,.2,.5,.35);if(bb%2)e(tb2,'brush',0,.2,.7,-.3);}
  [[21.0,[55,59,62,66]],[22.82,[55,61,66,71]],[24.64,[54,57,61,64]]].forEach(function(c){ch(c[0]+bt*(1+2/3),'rhodes',c[1],.35,.75,-.25);ch(c[0]+bt*3,'rhodes',c[1],.5,.7,-.25);});
  ch(26.46,'rhodes',[54,57,61,64,69],2.2,.75,-.2,.04);
  [[22.62,71,.28],[22.9,74,.2],[23.13,76,.3],[23.43,78,.45],[23.95,81,.75],[24.75,79,.22],[24.98,78,.22],[25.2,76,.22],[25.43,73,.3],[25.75,74,.9]].forEach(function(m){e(m[0],'sax',m[1],m[2],.9,.25);});
  ch(27.0,'pad',[50,57,61,64],1.6,.6);e(28.0,'harpsi',57,.1,.7);e(28.13,'harpsi',59,.1,.7);e(28.27,'harpsi',61,.1,.7);
  // torsdag: Glyptoteket, barokk
  var sx=60/112/4;[[28.6,[47,54,59,62,66,62,59,54],[47,54,59,62]],[29.67,[43,50,55,59,62,59,55,50],[43,55,59,62]],[30.74,[50,57,62,66,69,66,62,57],[50,57,62,66]],[31.81,[45,52,57,61,64,61,57,52],[45,57,61,64]]].forEach(function(c){
    c[1].forEach(function(n,j){e(c[0]+j*sx,'harpsi',n,.12,.8,(j%2?.3:-.3));});ch(c[0],'pad',c[2],1.1,.7);});
  var sc=[62,64,66,67,69,71,73,74,76,78,79,81,83,85,86,88,90,91,93,95,97,98];sc.forEach(function(n,j){e(29.8+j*.05,'harp',n,1,.55+j*.015,(j/sc.length-.5));});
  e(31.25,'bell',98,2,.8,.3);e(31.3,'bell',93,2,.6,-.3);ch(32.88,'pad',[50,57,62,66],1.4,.7);
  // torsdag: Parken
  [33.0,33.4,33.7,33.95,34.12].forEach(function(tt,j){e(tt,'tom',0,.3,.6+j*.08,j%2?.3:-.3);});
  e(33.2,'crowd',0,6.4,.5,0,{a:.4});
  [34.4,34.7,35.0,35.3].forEach(function(tt){e(tt,'thump',0,.3,.9);});e(34.4,'hum',0,5.2,1);
  for(var g2=0;g2<4;g2++){var tg=35.6+g2*.5;e(tg,'kick',0,.3,.9);if(g2%2){e(tg,'clap',0,.2,.9);e(tg,'hey',0,.3,1);}}
  ch(35.6,'brass',[62,66,69],.3,.9);ch(36.1,'brass',[62,67,71],.3,.8);ch(36.6,'brass',[61,64,69],.3,.9);ch(37.1,'brass',[62,66,69],.35,.9);
  e(37.55,'thump',0,.2,.5);e(37.6,'sweep',0,.6,.6,0,{f0:400,f1:3600,pk:.9});
  e(38.2,'crash',0,2,1);e(38.2,'kick',0,.4,1);ch(38.2,'brass',[50,57,62,66,69,74],1.5,1);e(38.2,'crowd',0,1.6,1.2,0,{a:.05});
  [[38.3,98],[38.45,102],[38.6,105]].forEach(function(m){e(m[0],'bell',m[1],1,.5,.3);});
  // overgang til fredag
  ch(39.6,'pad',[43,50,54,57,59],2.4,.8);[93,90,86,83,81].forEach(function(n,j){e(40.0+j*.28,'bell',n,1.2,.55,-.3+j*.15);});
  e(39.6,'sweep',0,2.3,.4,0,{t:'lowpass',q:.5,f0:3000,f1:300,pk:.3});
  // fredag
  e(42.0,'jet',0,4.4,.9,.3,{f0:180,f1:1500,pk:.55});
  ch(42.0,'pad',[50,57,61,64,66],1.4,.8);ch(43.4,'pad',[47,54,57,61,62],1.4,.8);ch(44.8,'pad',[43,50,54,57,59,64],1.3,.8);ch(46.0,'pad',[45,52,55,59,62,64],1.2,.8);
  [[44.4,81],[44.85,78],[45.3,86],[45.95,85],[46.5,83],[46.8,81],[47.1,78]].forEach(function(m){e(m[0],'bell',m[1],1.6,.7,.25);});
  // finale
  ch(47.3,'pad',[43,50,54,57,59,64],1.9,.9);ch(49.2,'pad',[45,52,55,59,62,64],1.8,.9);
  e(49.0,'bell',98,.6,.4,-.4);e(49.08,'bell',102,.6,.35,-.2);
  var pen=[86,88,90,93,95,98];for(var p2=0;p2<26;p2++)e(50.0+p2*.11,'bell',pen[Math.floor(hash(p2+77)*6)],1.4,.25+p2*.02,(hash(p2+78)-.5)*1.2);
  [62,66,69,73,76,78,81].forEach(function(n,j){e(51.2+j*.12,'rhodes',n,1.2,.6,-.2);});
  ch(53.0,'pad',[38,50,57,61,64,66,69],5.5,1);e(53.0,'bass',38,4,.7);ch(53.0,'rhodes',[62,66,69,73,76],3.6,.75,-.2,.02);
  [86,90,93,97,100].forEach(function(n,j){e(53.0+j*.15,'bell',n,2.6,.6,.3);});
  return E.sort(function(a,b2){return a.t-b2.t;});}
var EV=score();
function audioStart(){if(A||RED||opts.noAudio)return;var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  try{var ac=new AC({latencyHint:'playback'});A={ac:ac,o:makeOut(ac,ac.destination),idx:0,anchor:0,live:false,timer:0};}catch(e){A=null;return;}
  A.o.master.gain.value=soundOn?.62:0;
  if(ac.state==='running')sync();else{try{ac.resume().then(function(){if(!closed)sync();});}catch(e){}}
  A.timer=setInterval(schedule,50);
  setTimeout(function(){if(A&&!closed&&A.ac.state!=='running'){soundOn=false;sBtn.textContent='♪ Slå på lyd';sBtn.setAttribute('aria-label','Slå på lyden');sBtn.setAttribute('aria-pressed','true');}},400);}
function sync(){if(!A)return;A.anchor=A.ac.currentTime-tVis+.05;A.idx=0;while(A.idx<EV.length&&EV[A.idx].t<tVis-.02)A.idx++;A.live=true;}
function schedule(){if(!A||!A.live||paused)return;var now=A.ac.currentTime-A.anchor;
  while(A.idx<EV.length&&EV[A.idx].t<now+.3){var e=EV[A.idx++];if(e.t<now-.06)continue;try{INS[e.f](A.o,A.anchor+e.t,e.n,e.d,e.v,e.p,e.x);}catch(er){}}}
function setSound(on){soundOn=on;try{localStorage.setItem('ingrid-lyd',on?'på':'av');}catch(e){}
  sBtn.textContent=on?'♪ Lyd av':'♪ Lyd på';sBtn.setAttribute('aria-label',on?'Slå av lyden':'Slå på lyden');sBtn.setAttribute('aria-pressed',on?'false':'true');
  if(on&&!A)audioStart();
  if(A){if(on&&A.ac.state!=='running'){A.ac.resume().then(function(){if(!A.live)sync();});}
    A.o.master.gain.setTargetAtTime(on?.62:0,A.ac.currentTime,.08);}}

/* ───────────── løkke og livssyklus ───────────── */
function clock(now){if(A&&A.live&&A.ac.state==='running')return A.ac.currentTime-A.anchor;
  if(lastNow===null)lastNow=now;var dt=Math.min(.05,(now-lastNow)/1000);lastNow=now;if(!paused)tVis+=dt;return tVis;}
function frame(now){if(closed)return;var t0=performance.now();var t=clock(now);tVis=t;lastNow=now;
  mxs+=((mx>-1e3?(mx/W-.5):0)-mxs)*.05;mys+=((my>-1e3?(my/H-.5):0)-mys)*.05;
  render(t);frameN++;
  if(frameN>20&&frameN<140){ft.push(performance.now()-t0);if(ft.length===100&&Q.hi){ft.sort(function(a,b){return a-b;});if(ft[60]>11){Q.hi=false;Q.strip=3;Q.grain=false;Q.parts=1300;layout();}}}
  raf=requestAnimationFrame(frame);}
function close(){if(closed)return;closed=true;cancelAnimationFrame(raf);wrap.style.opacity=0;
  document.removeEventListener('keydown',onKey,true);window.removeEventListener('resize',onRes);document.removeEventListener('visibilitychange',onVis);
  if(A){clearInterval(A.timer);try{A.o.master.gain.setTargetAtTime(0,A.ac.currentTime,.15);}catch(e){}var ac=A.ac;setTimeout(function(){try{ac.close();}catch(e){}},900);}
  document.documentElement.style.overflow=prevOverflow;
  setTimeout(function(){wrap.remove();if(prevFocus&&prevFocus.focus)try{prevFocus.focus({preventScroll:true});}catch(e){}},850);}
function replay(){tVis=0;lastNow=null;capIdx=-2;if(pOff)pOff.fill(0);
  if(A){clearInterval(A.timer);var old=A.o.master;try{old.gain.setTargetAtTime(0,A.ac.currentTime,.1);}catch(e){}
    var ac=A.ac;A.o=makeOut(ac,ac.destination);A.o.master.gain.value=soundOn?.62:0;sync();A.timer=setInterval(schedule,50);}
  xBtn.focus({preventScroll:true});}
function onKey(e){if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close();return;}
  if(e.key==='m'||e.key==='M'){e.stopPropagation();setSound(!soundOn);return;}
  if(e.key==='Tab'){var f=[xBtn,sBtn].concat(+rBtn.style.opacity>.5?[rBtn]:[]),i=f.indexOf(document.activeElement);e.preventDefault();f[(i+(e.shiftKey?f.length-1:1))%f.length].focus();return;}
  e.stopPropagation();}
var rt=0;function onRes(){clearTimeout(rt);rt=setTimeout(layout,140);}
function onVis(){paused=document.hidden;if(A){try{paused?A.ac.suspend():A.ac.resume().then(function(){if(A.live)A.anchor=A.ac.currentTime-tVis;});}catch(e){}}if(!paused)lastNow=null;}
wrap.addEventListener('pointermove',function(e){mx=e.clientX;my=e.clientY;});
wrap.addEventListener('pointerleave',function(){mx=my=-1e4;});
xBtn.addEventListener('click',close);sBtn.addEventListener('click',function(){setSound(!soundOn);});rBtn.addEventListener('click',replay);

var prevOverflow=document.documentElement.style.overflow;
buildWorld();
var api={close:close,render:function(t){tVis=t;render(t);},score:EV,
  renderAudio:function(sr){sr=sr||44100;var OAC=window.OfflineAudioContext||window.webkitOfflineAudioContext;var oac=new OAC(2,Math.ceil((END+5)*sr),sr),o=makeOut(oac,oac.destination);
    EV.forEach(function(e){try{INS[e.f](o,e.t+.05,e.n,e.d,e.v,e.p,e.x);}catch(er){}});return oac.startRendering();}};
function start(){layout();
  if(MANUAL){wrap.style.opacity=1;wrap.style.transition='none';sBtn.style.display='none';xBtn.style.display='none';return;}
  document.documentElement.style.overflow='hidden';
  document.addEventListener('keydown',onKey,true);window.addEventListener('resize',onRes);document.addEventListener('visibilitychange',onVis);
  setSound(soundOn&&!RED);if(RED){sBtn.style.display='none';}
  if(RED){tVis=END;render(END);title.style.opacity=0;}else{audioStart();raf=requestAnimationFrame(frame);}
  requestAnimationFrame(function(){wrap.style.opacity=1;});xBtn.focus({preventScroll:true});}
// fonter: sidens egne filer hvis de finnes, ellers det som allerede er lastet
var fl=[];
if(opts.fontsBase&&window.FontFace&&document.fonts){try{[['600','cormorant-garamond-latin-600-italic.woff2'],['500','cormorant-garamond-latin-400-italic.woff2']].forEach(function(f){
  var ff=new FontFace('IngridDisplay','url('+opts.fontsBase+f[1]+')',{style:'italic',weight:f[0]});document.fonts.add(ff);fl.push(ff.load().catch(function(){}));});}catch(e){}}
if(document.fonts&&document.fonts.load){fl.push(document.fonts.load('italic 600 80px '+DISPLAY).catch(function(){}),document.fonts.load('600 12px '+SANS).catch(function(){}));}
api.ready=Promise.race([Promise.all(fl),new Promise(function(r){setTimeout(r,1500);})]).then(start);
return api;};
})();
