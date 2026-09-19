import {Simulation,SIZE} from './engine.js';
const $=id=>document.getElementById(id), fmt=n=>Math.round(n).toLocaleString('en-US'), money=n=>fmt(n)+' CR';
let sim=new Simulation(),selected='s2',cursor={x:4,y:3},hover=null,mode='inspect',sponsor='s2',zoom=1,shake=0,sound=false,audio=null,heights=new Map(),lastTime=0,toastTimer,renderVersion=-1,endShown=false;
const canvas=$('board'),ctx=canvas.getContext('2d'),wrap=$('boardWrap');let width=800,height=450,ratio=1,geometry={};
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
let floaters=[],growth=new Map();
function animateChanges(before){const now=performance.now();for(const e of sim.tiles){const old=before.get(e.id)||{A:0,L:0,height:0},next=sim.balance(e);for(const kind of ['A','L']){const value=next[kind]-old[kind];if(!value)continue;const lane=floaters.filter(v=>v.id===e.id&&v.kind===kind&&now-v.start<1600).length;floaters.push({id:e.id,kind,value,lane,start:now+(kind==='L'?100:0),color:kind==='L'?'#ffe600':value>0?'#ff6900':next.E<0?'#ff1738':'#c1cbd9'});if(kind==='A'&&value>0)growth.set(e.id,{from:old.height,start:now});}}floaters=floaters.slice(-192);}
function tone(type){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type==='rise'?'sawtooth':'triangle';o.frequency.setValueAtTime(type==='rise'?58:type==='fracture'?38:170,audio.currentTime);o.frequency.exponentialRampToValueAtTime(type==='rise'?24:60,audio.currentTime+.22);g.gain.setValueAtTime(.035,audio.currentTime);g.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.3);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+.32);}catch{}}
function toast(text,error=false){$('toast').textContent=text;$('toast').className='toast visible'+(error?' error':'');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4300);}
function perform(fn){const before=new Map(sim.tiles.map(e=>[e.id,{...sim.balance(e),height:(heights.get(e.id)||0)/zoom}]));try{const result=fn();sim.auditReciprocal();animateChanges(before);processEvents();update();if(sim.status==='liquidity')toast('■ LIQUIDITY '+fmt(sim.reserves)+' / '+fmt(sim.pending),true);return{ok:true,...sim.snapshot()};}catch(e){toast(e.message,true);update();return{ok:false,error:e.message};}}
function processEvents(){for(const event of sim.events.splice(0)){if(['rise','fracture','collapse','build'].includes(event.type)){shake=reduced?0:event.type==='rise'?8:event.type==='collapse'?13:3;tone(event.type);}if(event.type==='win')showEnd(true);if(event.type==='meltdown')showEnd(false);}}
function showEnd(win){if(endShown)return;endShown=true;setTimeout(()=>{$('endEyebrow').textContent=win?'MANDATE FULFILLED / DAY '+sim.day:'SYSTEMIC FAILURE / DAY '+sim.day;$('endTitle').textContent=win?'An empire in equilibrium.':'Nothing left to support it.';$('endCopy').textContent=win?'You developed '+sim.footprint+' plots, built '+money(sim.totals.E)+' of combined equity, and survived '+sim.settledDays+' settlements. The bank remains solvent. You can continue expanding.':'Parent capital reached zero. Credit losses have exhausted its equity and the leveraged towers have collapsed. The archived ledgers still balance. Restart with more infrastructure and less concentrated demand.';$('continueButton').textContent=win?'Continue building':'Inspect the aftermath';$('endDialog').showModal();},reduced?0:900);}
function reset(){sim=new Simulation();selected='s2';sponsor='s2';cursor={x:4,y:3};mode='inspect';heights.clear();floaters=[];growth.clear();endShown=false;for(const d of document.querySelectorAll('dialog'))d.close();update();}
function setMode(next){mode=next;if(next==='subsidiary'){const e=sim.entities[selected];if(e?.kind==='subsidiary'&&!e.closed)sponsor=e.id;}update();}
function metric(icon,value,title,extra=''){return `<div class="metric ${extra}" title="${title}" aria-label="${title}: ${value}"><span aria-hidden="true">${icon}</span><strong>${value}</strong></div>`;}
function update(){
 const t=sim.totals,b=sim.balance('bank'),net=sim.reserves+sim.income-sim.settlement;
 $('day').textContent=String(sim.day).padStart(2,'0');
 $('reserves').innerHTML=fmt(sim.reserves)+'<span> CR</span>';
 $('income').textContent='↑ '+sim.income+' /d';$('income').title=fmt(sim.amount('treasury','reserves'))+' remaining in outside treasury';
 $('broad').innerHTML=fmt(sim.broad)+'<span> CR</span>';
 $('car').innerHTML=(Number.isFinite(sim.car)?sim.car.toFixed(1):'∞')+'<span>% / 8%</span>';
 $('car').classList.toggle('danger-text',sim.car<8);$('capitalHint').textContent=sim.car<8?'■ FROZEN':fmt(b.E)+' / '+fmt(sim.risk);$('capitalHint').title='Bank capital / risk-weighted assets';
 $('totalA').textContent=fmt(t.A);$('totalL').textContent=fmt(t.L);$('totalE').textContent=fmt(t.E);
 $('liabilityBar').style.width=Math.max(0,Math.min(100,t.L/t.A*100))+'%';
 $('auditCount').textContent=Object.keys(sim.entities).length+' ◇';$('auditCount').title='Audited entities';$('delta').textContent='Δ 0.00';$('auditBadge').textContent=sim.audit()?'✓':'!';$('auditBadge').title='All entity ledgers balance';
 $('clearing').textContent=(net>=0?'+':'−')+fmt(Math.abs(net));$('clearing').classList.toggle('danger-text',net<0);
 const frozen=sim.status==='liquidity',funded=net>=0;
 $('clearingStatus').textContent=frozen?'■ FROZEN':funded?'✓':'!';$('clearingStatus').title=funded?'Funded after daily income':'Reserve shortfall';$('clearingStatus').classList.toggle('danger-text',!funded||frozen);
 $('clearingBar').style.width=Math.min(100,sim.reserves/Math.max(1,sim.settlement)*100)+'%';$('clearingBar').style.background=funded?'#ff6900':'#ff1738';
 $('clearingHint').innerHTML=`<span title="Queued outgoing transfers">↗ <b>${fmt(sim.clearingPlan.outgoing)}</b></span><span title="Incoming service payments">↙ <b>${fmt(sim.clearingPlan.incoming)}</b></span><span title="Net reserve settlement">⇄ <b>${fmt(sim.settlement)}</b></span>`;
 $('districtRows').innerHTML=sim.districts().map(d=>`<div class="district-row ${d.stress?'warning-text':''}" title="${sim.districtName(d.d)}: demand ${d.demand}, capacity ${d.capacity}"><span>${['NW','NE','SW','SE'][d.d]}</span><span class="track"><i style="width:${Math.min(100,d.demand/d.capacity*100)}%;background:${d.stress?'#ffe600':'#929aa5'}"></i></span><span>${d.stress?'! ':''}${d.demand} / ${d.capacity}</span></div>`).join('');
 $('missionGoals').innerHTML=[['▦','Developed plots',sim.footprint,12],['◇','Combined equity',t.E,6000],['◷','Settlements survived',sim.settledDays,12]].map(([icon,label,v,target])=>`<div class="goal ${v>=target?'done':''}" title="${label}" aria-label="${label}: ${v} of ${target}"><span aria-hidden="true">${icon}</span><strong>${fmt(v)} <small>/ ${fmt(target)}</small></strong></div>`).join('');
 const shortLabel=j=>/revaluation/i.test(j.label)?'↑ A':/Loan created/.test(j.label)?'↗ L':/clearing/i.test(j.label)?'⇄':/failure|loss/i.test(j.label)?'↓ A':/Infrastructure commissioned|Utility expansion/.test(j.label)?'▤':/receipts|dividend/i.test(j.label)?'＋':'◇';
 $('journalRows').innerHTML=sim.journal.slice(0,3).map(j=>`<div class="journal-entry" title="${j.label}"><span>${String(j.day).padStart(2,'0')}</span><b class="${/Loan created/.test(j.label)?'debt-text':'asset-text'}">${shortLabel(j)}</b><span class="journal-math">DR ${fmt(j.entries[0].dr||j.entries[0].cr)} <i>=</i> CR ${fmt(j.entries[0].dr||j.entries[0].cr)}</span><span class="journal-check">✓</span></div>`).join('');
 $('statusLabel').textContent=sim.status==='meltdown'?'■ COLLAPSED':frozen?'■ LIQUIDITY FREEZE':sim.car<8?'■ CREDIT FROZEN':sim.live('subsidiary').some(e=>sim.balance(e).E<0)?'■ INSOLVENT':sim.won?'✓ COMPLETE':'● ONLINE';
 $('statusLabel').classList.toggle('danger-text',sim.status!=='active'||sim.car<8||sim.live('subsidiary').some(e=>sim.balance(e).E<0));$('endTurn').innerHTML=frozen?'⇄ RECOVER':'⇄ SETTLE';$('endTurn').disabled=sim.status==='meltdown';
 document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));
 $('actionHint').innerHTML=mode==='utility'?'<span class="asset-text">▤ −40</span><span>⚡ +4</span><span>↑ +12 /d</span>':mode==='subsidiary'?`<span class="debt-text">↗ +100</span><span>◇ ${fmt(sim.available(sim.entities[sponsor]))}</span><span>⌖ ${sim.entities[sponsor]?.name.replace('Subsidiary ','S')??'—'}</span>`:'<span>⌖ SELECT</span><span>↑ REVALUE</span><span class="debt-text">↗ EXTEND</span>';
 updateSelection();if($('books').open)updateBooks();renderVersion=sim.version;
}
function updateSelection(){
 const e=sim.entities[selected],el=$('selection');
 if(!e){el.innerHTML=`<div class="section-label"><span>⌖ ${String(cursor.x+1).padStart(2,'0')}.${String(cursor.y+1).padStart(2,'0')}</span><span>${['NW','NE','SW','SE'][sim.district(cursor)]}</span></div><div class="selection-name"><h3>EMPTY PLOT</h3><span class="type-pill">□</span></div><div class="entity-metrics">${metric('▤','40','Infrastructure reserve cost')}${metric('↗','100','Debt link credit cost','debt-text')}</div>`;return;}
 const b=sim.balance(e),insolvent=b.E<0,stress=e.kind==='subsidiary'&&sim.districts()[sim.district(e)].stress;
 let data='',actions='';
 if(e.closed){data=metric('■','CLOSED','Archived entity');}
 else if(e.kind==='parent'){data=metric('↗',fmt(sim.amount(e,'loans')),'Loans','debt-text')+metric('▼',fmt(-sim.amount(e,'allowance')),'Credit-loss allowance')+metric('↑','+'+sim.income,'Daily infrastructure income');}
 else if(e.kind==='utility'){
  data=metric('⚡','+'+(4+e.upgrades*4),'District utility capacity')+metric('↑','+'+(12+e.upgrades*6)+'/d','Daily reserve income','asset-text')+metric('▤',e.upgrades+'/3','Upgrade level');
  actions=`<button data-act="upgrade" class="primary" ${e.upgrades>=3||sim.reserves<30||sim.status!=='active'?'disabled':''} title="Upgrade infrastructure for 30 reserves">↑ UPGRADE <b>30</b></button><button data-act="sell" title="Sell infrastructure">↓ SELL <b>${fmt(Math.floor(sim.amount(e,'equipment')*.75))}</b></button>`;
 }else{
  data=metric('↑',e.level+'/3','Appraisal level','asset-text')+metric('⚡',1+e.level*2,'Utility demand',stress?'warning-text':'')+metric('◇',fmt(sim.available(e)),'Unpledged equity');
  if(stress)data+=metric('▼','35%','Asset impairment at next settlement','warning-text');
  actions=insolvent?'<button data-act="absorb" class="danger" title="Parent absorbs toxic debt">⇥ ABSORB</button><button data-act="isolate" class="danger" title="Foreclose and isolate this plot">⊠ ISOLATE</button>':`<button data-act="revalue" class="primary" ${e.level>=3||sim.status!=='active'?'disabled':''} title="Revalue the asset (R)">↑ REVALUE</button><button data-act="link" class="debt-action" ${sim.available(e)<100||sim.creditFrozen?'disabled':''} title="Extend a 100 CR debt link">↗ LINK</button>`;
 }
 const name=e.kind==='parent'?'PARENT':e.kind==='utility'?'INFRA / '+e.id.slice(1).padStart(2,'0'):'SUB / '+e.id.slice(1).padStart(2,'0');
 el.innerHTML=`<div class="section-label"><span>⌖ ${String(e.x+1).padStart(2,'0')}.${String(e.y+1).padStart(2,'0')}</span><span>${['NW','NE','SW','SE'][sim.district(e)]}</span></div><div class="selection-name"><h3>${name}</h3><span class="type-pill ${insolvent?'danger-text':stress?'warning-text':''}" title="${e.closed?'Isolated':insolvent?'Insolvent':stress?'Over capacity':'Active'}">${e.closed?'■':insolvent?'! E < 0':stress?'! ⚡':'●'}</span></div><div class="entity-ledger"><div><span title="Assets">A</span><strong class="asset-text">${fmt(b.A)}</strong></div><div><span title="Liabilities">L</span><strong class="debt-text">${fmt(b.L)}</strong></div><div><span title="Equity">E</span><strong class="${insolvent?'danger-text':''}">${fmt(b.E)}</strong></div></div><div class="entity-metrics">${data}</div><div class="selection-actions">${actions}</div>`;
 el.querySelectorAll('[data-act]').forEach(button=>button.onclick=()=>{const action=button.dataset.act;if(action==='link'){sponsor=e.id;setMode('subsidiary');return;}perform(()=>sim[action](e.id));});
}

function updateBooks(){const rows=Object.values(sim.entities).map(e=>{const b=sim.balance(e);return`<tr><td>${e.name}${e.closed?' · archived':''}</td><td>${fmt(b.A)}</td><td>${fmt(b.L)}</td><td>${fmt(b.E)}</td><td>0</td></tr>`;}).join('');const c=sim.consolidated;$('bookContent').innerHTML=`<p class="book-note">Group consolidated: A ${fmt(c.A)} = L ${fmt(c.L)} + E ${fmt(c.E)}. Intercompany loans, ownership investments and internal credit-loss allowances eliminated.</p><p class="book-note">Base reserves conserved: ${fmt(sim.baseTotal)} total = bank ${fmt(sim.reserves)} + treasury ${fmt(sim.amount('treasury','reserves'))} + supplier ${fmt(sim.amount('market','reserves'))} + district bank ${fmt(sim.amount('outside','reserves'))}. Broad money: ${fmt(sim.broad)} across both banks.</p><div class="book-scroll"><table class="books-table"><thead><tr><th>ENTITY</th><th>ASSETS</th><th>LIABILITIES</th><th>EQUITY</th><th>Δ</th></tr></thead><tbody>${rows}</tbody></table></div><h3 style="font-weight:300;margin-top:30px">Posted journal · latest 40 events</h3>${sim.journal.slice(0,40).map(j=>`<div class="posting"><strong>Day ${j.day} / ${j.label}</strong>${j.entries.map(e=>`<div>${e.entity} · ${e.dr?'DR':'CR'} ${e.account} ${fmt(e.dr||e.cr)}</div>`).join('')}</div>`).join('')}`;}
function resize(){ratio=Math.min(devicePixelRatio||1,2);width=wrap.clientWidth;height=wrap.clientHeight;canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);}
new ResizeObserver(resize).observe(wrap);
function project(x,y,z=0){const{w,h,ox,oy}=geometry;return{x:ox+(x-y)*w/2,y:oy+(x+y)*h/2-z};}
function polygon(points,fill,stroke,width=1){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function corners(p,w,h){return[{x:p.x,y:p.y-h/2},{x:p.x+w/2,y:p.y},{x:p.x,y:p.y+h/2},{x:p.x-w/2,y:p.y}];}
function prism(p,w,h,z,colors,outline=null,strokeWidth=1){const base=corners(p,w,h),top=base.map(v=>({x:v.x,y:v.y-z}));polygon([top[3],top[2],base[2],base[3]],colors[1],outline,strokeWidth);polygon([top[2],top[1],base[1],base[2]],colors[2],outline,strokeWidth);polygon(top,colors[0],outline,strokeWidth);return{base,top};}
function targetHeight(e){if(e.closed||(sim.status==='meltdown'&&e.kind==='subsidiary'))return 0;if(e.kind==='parent')return 106*zoom;if(e.kind==='utility')return(17+e.upgrades*12)*zoom;return(23+Math.log2(1+sim.amount(e,'property')/100)*29)*zoom;}
function draw(time){
 requestAnimationFrame(draw);const dt=Math.min(.05,(time-lastTime)/1000||.016);lastTime=time;sim.audit();
 const baseWidth=Math.min(84,width/(SIZE+2.2));geometry={w:baseWidth*zoom,h:baseWidth*.48*zoom,ox:width*.5,oy:height*.53-SIZE*baseWidth*.48*zoom/2+48*zoom};
 ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.save();
 if(shake>.1){ctx.translate(Math.sin(time*.082)*shake,Math.cos(time*.096)*shake*.55);shake*=Math.pow(.012,dt);}
 const{w,h}=geometry;ctx.save();ctx.strokeStyle='#343c48';ctx.lineWidth=.6;ctx.setLineDash([2,7]);
 for(let n=0;n<=SIZE;n++){let a=project(n-.5,-1.1),b=project(n-.5,SIZE+.1);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();a=project(-1.1,n-.5);b=project(SIZE+.1,n-.5);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}ctx.restore();
 const coords=[];for(let x=0;x<SIZE;x++)for(let y=0;y<SIZE;y++)coords.push({x,y});coords.sort((a,b)=>a.x+a.y-b.x-b.y||a.x-b.x);
 for(const c of coords){
  const p=project(c.x,c.y),tile=sim.tile(c.x,c.y),chosen=tile?.id===selected||(!selected&&cursor.x===c.x&&cursor.y===c.y),hov=hover?.x===c.x&&hover?.y===c.y;
  const legal=mode==='utility'?sim.canPlot(c.x,c.y):mode==='subsidiary'&&sim.entities[sponsor]?sim.canPlot(c.x,c.y)&&Math.abs(sim.entities[sponsor].x-c.x)+Math.abs(sim.entities[sponsor].y-c.y)===1:false;
  const targetColor=mode==='subsidiary'?'#ffe600':'#ff6900';
  prism(p,w-4*zoom,h-2*zoom,5*zoom,[hov?'#858e9d':chosen?'#626c7b':legal?'#424b58':((c.x+c.y)%2?'#4d5561':'#535c68'),'#242a33','#15191f'],chosen?'#ff6900':legal?targetColor:null,chosen?2:1);
  if(tile?.closed||(sim.status==='meltdown'&&tile?.kind==='subsidiary')){polygon(corners({...p,y:p.y-5*zoom},w*.68,h*.68),'#030406',chosen?'#ff6900':'#536071',chosen?2:1);polygon([{x:p.x-w*.24,y:p.y-4},{x:p.x-w*.12,y:p.y-9},{x:p.x-w*.03,y:p.y-6},{x:p.x-w*.16,y:p.y+1}],'#737d8b');}
  else if(!tile&&legal){ctx.fillStyle=targetColor;ctx.font=`600 ${15*zoom}px Helvetica`;ctx.textAlign='center';ctx.fillText('+',p.x,p.y);}
 }
 // Opaque charcoal shadows sit underneath the debt conduits.
 for(const e of sim.tiles){
  const target=targetHeight(e),old=heights.get(e.id)??0;heights.set(e.id,reduced?target:old+(target-old)*Math.min(1,dt*(target>old?5:9)));const z=heights.get(e.id);if(z<1)continue;
  const p=project(e.x,e.y,5*zoom),bw=w*(e.kind==='parent'?.77:e.kind==='utility'?.72:.61),bh=h*(e.kind==='parent'?.77:e.kind==='utility'?.72:.61),footprint=corners(p,bw,bh),shadow=footprint.map(v=>({x:v.x+z*.82,y:v.y+z*.28}));
  polygon([footprint[0],footprint[1],shadow[1],shadow[2],shadow[3],footprint[3]],'#030406e8');
 }
 ctx.save();ctx.lineJoin='miter';ctx.lineCap='square';
 for(const e of sim.live('subsidiary')){
  const parent=sim.entities[e.sponsor];if(!parent)continue;const a=project(parent.x,parent.y,7*zoom),b=project(e.x,e.y,7*zoom);
  const points=[a,{x:a.x,y:a.y+h*.40},{x:b.x,y:b.y+h*.40},b];
  const conduit=()=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();};
  ctx.shadowBlur=0;ctx.strokeStyle='#07090c';ctx.lineWidth=7;conduit();ctx.strokeStyle='#ffe600';ctx.lineWidth=e.id===selected||e.sponsor===selected?3.5:2.5;ctx.shadowColor='#ffe600';ctx.shadowBlur=5;conduit();ctx.shadowBlur=0;
  for(const p of [points[1],points[2]]){ctx.fillStyle='#ffe600';ctx.fillRect(p.x-2,p.y-2,4,4);}
 }ctx.restore();
 let selectedShape=null;
 for(const c of coords){
  const e=sim.tile(c.x,c.y);if(!e)continue;const z=heights.get(e.id)||0;if(z<1)continue;
  const p=project(e.x,e.y,5*zoom),chosen=e.id===selected,hovered=hover?.x===e.x&&hover?.y===e.y,bw=w*(e.kind==='parent'?.77:e.kind==='utility'?.72:.61),bh=h*(e.kind==='parent'?.77:e.kind==='utility'?.72:.61);
  const b=sim.balance(e),fractured=b.E<0||(e.kind==='subsidiary'&&sim.districts()[sim.district(e)].stress);
  let colors=e.kind==='parent'?['#c7cfd9','#8d98a8','#566273']:e.kind==='utility'?['#a7b2c3','#727f93','#414c5e']:['#b6c0d0','#828fa3','#4b596d'];
  if(b.E<0)colors=['#747985','#4b515d','#2a303b'];if(hovered&&b.E>=0)colors[0]='#ff6900';
  const f=prism(p,bw,bh,z,colors);
  const rise=growth.get(e.id),isRising=rise&&time-rise.start<2100;
  if(rise&&!isRising)growth.delete(e.id);
  if(b.E>=0&&!e.closed&&(isRising||e.kind==='subsidiary'&&e.level>0)){
   const band=isRising?Math.max(3*zoom,z-rise.from*zoom):Math.min(18*zoom,z*.18);
   prism({x:p.x,y:p.y-z+band},bw,bh,band,['#ff8527','#ff6900','#b43e00']);
  }
  if(e.kind==='utility'){for(let j=0;j<3;j++){const q=project(e.x+(j-1)*.17,e.y,5*zoom+z);prism(q,bw*.17,bh*.88,3*zoom,[e.upgrades?'#ff6900':'#c4ccd8','#8b97a9','#4b596d']);}}
  if(e.kind==='parent'){const q={x:p.x,y:p.y-z};const crown=prism(q,bw*.64,bh*.64,9*zoom,['#e2e6ed','#a7b2c1','#6e7c92']);ctx.fillStyle='#13171e';ctx.font=`600 ${10*zoom}px Helvetica`;ctx.textAlign='center';ctx.fillText('P',q.x,q.y-8*zoom);if(chosen){polygon(crown.top,null,'#ff6900',2);}}
  if(e.kind==='subsidiary'&&e.level>0){ctx.strokeStyle='#e5edfa55';ctx.lineWidth=.6;for(let j=1;j<=e.level;j++){const yy=z*(j/(e.level+1));ctx.beginPath();ctx.moveTo(f.base[3].x,f.base[3].y-yy);ctx.lineTo(f.base[2].x,f.base[2].y-yy);ctx.lineTo(f.base[1].x,f.base[1].y-yy);ctx.stroke();}}
  if(fractured&&sim.status!=='meltdown'){
   ctx.save();ctx.strokeStyle='#ff1738';ctx.lineWidth=b.E<0?2.3:1.8;ctx.shadowColor='#ff002b';ctx.shadowBlur=b.E<0?17:10;
   const a=f.top[3],v=f.top[2],cracks=[[{x:a.x+bw*.23,y:a.y+bh*.11},{x:a.x+bw*.17,y:a.y+z*.25},{x:a.x+bw*.29,y:a.y+z*.42},{x:a.x+bw*.18,y:a.y+z*.65},{x:a.x+bw*.23,y:a.y+z*.84}],[{x:a.x+bw*.29,y:a.y+z*.42},{x:a.x+bw*.43,y:a.y+z*.37},{x:v.x,y:v.y+z*.51}],[{x:v.x+bw*.13,y:v.y+z*.17},{x:v.x+bw*.26,y:v.y+z*.26},{x:v.x+bw*.15,y:v.y+z*.49},{x:v.x+bw*.2,y:v.y+z*.72}]];
   for(const points of cracks){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();}ctx.restore();
  }
  if(chosen){selectedShape={f,p,z,bh,b};}
 }
 // Draw selection last so a neighbouring monolith cannot hide its 2 CSS-pixel outline.
 if(selectedShape){const {f,p,z,bh,b}=selectedShape;polygon([f.top[0],f.top[1],f.base[1],f.base[2],f.base[3],f.top[3]],null,'#ff6900',2);polygon(f.top,null,'#ff6900',2);
  if(!floaters.some(v=>v.id===selected&&time-v.start<2200)){ctx.font='600 12px Consolas';ctx.textAlign='center';const label=fmt(b.A),tw=ctx.measureText(label).width;ctx.fillStyle='#07090d';ctx.fillRect(p.x-tw/2-7,p.y-z-bh/2-30,tw+14,20);ctx.fillStyle='#ff6900';ctx.fillText(label,p.x,p.y-z-bh/2-16);}
 }
 floaters=floaters.filter(v=>time-v.start<2200);const placedFloats=[];
 for(const v of floaters){
  const age=time-v.start;if(age<0)continue;const progress=Math.min(1,age/2200),e=sim.entities[v.id];if(!e)continue;
  const p=project(e.x,e.y,(heights.get(e.id)||0)+geometry.h*.48+18),side=v.kind==='L'?43:-43;
  let x=Math.max(48,Math.min(width-48,p.x+side)),y=Math.max(24,p.y-(reduced?0:progress*58)-v.lane*28);
  ctx.save();ctx.globalAlpha=progress<.68?1:(1-progress)/.32;ctx.font='600 16px Consolas';ctx.textAlign='center';const label=(v.kind==='L'?'↗ ':'▲ ')+(v.value>0?'+':'−')+fmt(Math.abs(v.value)),tw=ctx.measureText(label).width;
  x=Math.max(tw/2+9,Math.min(width-tw/2-9,x));
  for(let tries=0;tries<10&&placedFloats.some(r=>Math.abs(r.x-x)<(r.width+tw+14)/2+4&&Math.abs(r.y-y)<29);tries++){if(y>55)y-=30;else{x=Math.min(width-tw/2-9,x+tw+22);y+=30;}}
  placedFloats.push({x,y,width:tw+14});
  ctx.fillStyle='#030507ee';ctx.fillRect(x-tw/2-7,y-17,tw+14,25);ctx.fillStyle=v.color;ctx.fillRect(x-tw/2-7,y-17,2,25);ctx.fillText(label,x,y+1);ctx.restore();
 }
 ctx.save();ctx.font=`${9*zoom}px Consolas`;ctx.fillStyle='#8998ae';ctx.textAlign='center';for(let i=0;i<SIZE;i++){let p=project(i,SIZE+.15);ctx.fillText(String(i+1).padStart(2,'0'),p.x,p.y);p=project(SIZE+.15,i);ctx.fillText(String(i+1).padStart(2,'0'),p.x,p.y);}ctx.restore();ctx.restore();
}

function inPolygon(p,poly){let inside=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside;}
function hit(ev){const rect=canvas.getBoundingClientRect(),p={x:ev.clientX-rect.left,y:ev.clientY-rect.top};const reverse=[...sim.tiles].sort((a,b)=>b.x+b.y-a.x-a.y||b.x-a.x);if(mode==='inspect')for(const e of reverse){const z=heights.get(e.id)||0;if(z<1)continue;const b=project(e.x,e.y,5*zoom),w=geometry.w*.77,h=geometry.h*.77,base=corners(b,w,h),top=base.map(v=>({...v,y:v.y-z}));if(inPolygon(p,[top[0],top[1],base[1],base[2],base[3],top[3]]))return{x:e.x,y:e.y};}const px=(p.x-geometry.ox)/(geometry.w/2),py=(p.y-geometry.oy+5*zoom)/(geometry.h/2),x=Math.round((px+py)/2),y=Math.round((py-px)/2);return x>=0&&x<SIZE&&y>=0&&y<SIZE?{x,y}:null;}
function choose(c){if(!c)return;cursor=c;const e=sim.tile(c.x,c.y);if(e){selected=e.id;if(mode==='subsidiary'&&e.kind==='subsidiary'&&!e.closed){sponsor=e.id;toast('⌖ '+e.name.replace('Subsidiary ','S')+' · ◇ '+fmt(sim.available(e)));}update();return;}if(mode==='inspect'){selected=null;update();return;}perform(()=>{const built=mode==='utility'?sim.buildUtility(c.x,c.y):sim.originate(c.x,c.y,sponsor);selected=built.id;return built.kind==='utility'?'Infrastructure commissioned. +4 capacity and +12 daily reserves.':'New subsidiary financed. 100 CR credit created; no reserves spent.';});}
canvas.addEventListener('pointermove',ev=>{hover=hit(ev);const label=$('hoverLabel');if(!hover){label.style.display='none';return;}const e=sim.tile(hover.x,hover.y);label.textContent=e?e.name+' / '+money(sim.balance(e).A):'PLOT '+(hover.x+1)+'.'+(hover.y+1);const rect=canvas.getBoundingClientRect();label.style.left=Math.min(width-170,Math.max(10,ev.clientX-rect.left+15))+'px';label.style.top=Math.max(5,ev.clientY-rect.top-35)+'px';label.style.display='block';});canvas.addEventListener('pointerleave',()=>{hover=null;$('hoverLabel').style.display='none';});canvas.addEventListener('click',ev=>choose(hit(ev)));canvas.addEventListener('wheel',ev=>{ev.preventDefault();changeZoom(ev.deltaY<0?.1:-.1);},{passive:false});
function changeZoom(amount){zoom=Math.min(1.5,Math.max(.65,zoom+amount));$('zoomLabel').textContent=Math.round(zoom*100)+'%';}
$('zoomIn').onclick=()=>changeZoom(.1);$('zoomOut').onclick=()=>changeZoom(-.1);$('resetView').onclick=()=>{zoom=1;$('zoomLabel').textContent='100%';};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));$('endTurn').onclick=()=>perform(()=>sim.endDay());$('guideButton').onclick=()=>$('guide').showModal();$('beginButton').onclick=()=>$('guide').close();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.closest('dialog').close());$('ledgerButton').onclick=()=>{updateBooks();$('books').showModal();};$('restartButton').onclick=reset;$('newGameButton').onclick=reset;$('continueButton').onclick=()=>$('endDialog').close();$('soundButton').onclick=()=>{sound=!sound;$('soundButton').textContent=sound?'♫':'♪';$('soundButton').setAttribute('aria-label',sound?'Disable sound':'Enable sound');$('soundButton').title=sound?'Disable sound':'Enable sound';if(sound)tone('settle');};
document.addEventListener('keydown',ev=>{if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName))return;const k=ev.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))ev.preventDefault();if(k==='1')setMode('inspect');if(k==='2')setMode('utility');if(k==='3')setMode('subsidiary');if(k==='r')perform(()=>sim.revalue(selected));if(k===' '&&ev.target.tagName!=='BUTTON')perform(()=>sim.endDay());if(k==='escape')setMode('inspect');if(k==='?')$('guide').showModal();const moves={arrowup:[0,-1],arrowdown:[0,1],arrowleft:[-1,0],arrowright:[1,0]};if(moves[k]){cursor={x:Math.max(0,Math.min(7,cursor.x+moves[k][0])),y:Math.max(0,Math.min(7,cursor.y+moves[k][1]))};selected=sim.tile(cursor.x,cursor.y)?.id??null;canvas.focus();update();}if(k==='enter'&&ev.target===canvas)choose(cursor);});
// A feature-detected agent interface shares exactly the visible game's actions.
const context=document.modelContext;
if(context?.registerTool){const life=new AbortController();window.addEventListener('pagehide',()=>life.abort(),{once:true});const tool={name:'play_monolith',title:'Play Monolith',description:'Read the accounting simulation or take one visible game action. Currency and turn changes are immediate.',inputSchema:{type:'object',properties:{action:{type:'string',enum:['read','select','build_infrastructure','create_debt_link','revalue','upgrade','sell','absorb','isolate','settle']},x:{type:'integer',minimum:0,maximum:7},y:{type:'integer',minimum:0,maximum:7},entityId:{type:'string'},sponsorId:{type:'string'}},required:['action'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){if(!input||!tool.inputSchema.properties.action.enum.includes(input.action))throw Error('Unknown action');const a=input.action;if(a==='read')return sim.snapshot();if(['build_infrastructure','create_debt_link','select'].includes(a)&&(!Number.isInteger(input.x)||!Number.isInteger(input.y)||input.x<0||input.x>7||input.y<0||input.y>7))throw Error('A valid x and y are required.');if(a==='select'){cursor={x:input.x,y:input.y};selected=sim.tile(input.x,input.y)?.id??null;setMode('inspect');return sim.snapshot();}return perform(()=>{if(a==='settle')return sim.endDay();if(a==='build_infrastructure'){selected=sim.buildUtility(input.x,input.y).id;return;}if(a==='create_debt_link'){selected=sim.originate(input.x,input.y,input.sponsorId).id;return;}if(!sim.entities[input.entityId])throw Error('Unknown entity');sim[a](input.entityId);selected=input.entityId;});}};try{Promise.resolve(context.registerTool(tool,{signal:life.signal})).catch(()=>{});}catch{}}
resize();update();requestAnimationFrame(draw);
