(function(){
/* ======= CONFIGURAÇÃO: URL /exec do Apps Script ======= */
(function(){
 var el=document.querySelector("link[rel='icon'][type='image/svg+xml']");if(!el)return;
 var href=el.href;
 document.querySelectorAll("link[rel~='icon'],link[rel='apple-touch-icon']").forEach(function(l){if(l!==el)l.remove()});
 var img=new Image();
 img.onload=function(){
  var c=document.createElement('canvas');c.width=c.height=180;c.getContext('2d').drawImage(img,0,0,180,180);
  var u=c.toDataURL('image/png'),p=document.createElement('link');p.rel='icon';p.type='image/png';p.href=u;document.head.appendChild(p);
  var a=document.createElement('link');a.rel='apple-touch-icon';a.href=u;document.head.appendChild(a)};
 img.src=href;
})();
var API=(window.PM_CONFIG&&window.PM_CONFIG.API)||'';
/* ================================================================== */

var $=function(i){return document.getElementById(i)};
var esc=function(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var TOKEN=localStorage.getItem('pm_tok'),EMAIL=localStorage.getItem('pm_mail'),SAVE='',SLOTS=[null,null,null],SLOT=0,S=null,SEL=null,RODADAS=14;
var LIGAS=[],TODOS_CLUBES=[],CLUBES=[],LIGA_SEL=null;

/* Catálogo de eventos carregado de js/eventos.js. */

/* Etiquetas (tags) de contexto: o evento só pode aparecer se TODAS forem verdadeiras.
   "!x" = só aparece se x for falso. Sem etiqueta = evento neutro (sempre possível).
   lid=líder | top=dentro da meta | meio=meio de tabela | z=zona de rebaixamento | baixo=parte de baixo
   seqV=3 vitórias seguidas | seqD=3 jogos sem vencer | rico/pobre=caixa alto/baixo
   torcA/torcB=torcida alta/baixa | moralA/moralB | cans=elenco cansado | fim=reta final
   Formato: [tags, título, texto, [opçãoA, efeito], [opçãoB, efeito]]
   Efeitos: c=caixa (escala com o tamanho do clube) m=moral t=torcida r=reputação f=físico do elenco */
var EVENTOS=window.PM_EVENTOS;

/* eventos que aparecem ANTES de um jogo em casa (na tela de ingressos). pm = multiplicador do público */
var EV_ING=window.PM_EV_ING;

/* ---------- lógica ---------- */
function sg(n){return (n>0?'+':'')+n}
function escalaEv(){return Math.max(1,Math.round(clube(S.cid).c/3000))} /* clubes ricos: valores em € mi maiores */
function descEf(e){var p=[],k=escalaEv();
 if(e.c)p.push('Caixa '+(e.c>0?'+':'')+mil(e.c*k));
 if(e.m)p.push('Moral '+sg(e.m));
 if(e.t)p.push('Torcida '+sg(e.t));
 if(e.r)p.push('Reputação '+sg(e.r));
 if(e.f)p.push('Físico do elenco '+sg(e.f));
 if(e.pm&&e.pm!==1)p.push('Público '+sg(Math.round((e.pm-1)*100))+'%');
 return p.join(' · ')||'Sem efeito imediato'}

function ctx(){
 var o=ordem(),pos=o.indexOf(S.cid)+1,n=S.cl.length,c=clube(S.cid),T={},f=(S.forma&&S.forma[S.cid])||[],jog=S.rod>=4;
 T.lid=jog&&pos===1; T.top=jog&&pos<=c.m; T.z=jog&&pos>n-3; T.baixo=jog&&pos>Math.ceil(n*.65);
 T.meio=jog&&!T.top&&!T.z;
 T.seqV=f.length>=3&&f.slice(-3).every(function(x){return x==='V'});
 T.seqD=f.length>=3&&f.slice(-3).indexOf('V')<0;
 T.rico=S.caixa>=c.c*1.5; T.pobre=S.caixa<c.c*.3;
 T.torcA=S.torc>=70; T.torcB=S.torc<=40; T.moralA=S.moral>=75; T.moralB=S.moral<=40;
 T.cans=fisMedia()<60; T.fim=S.rod>=S.cal.length-6;
 return T}
function okTags(w,T){if(!w)return true;return w.split(' ').every(function(k){return k.charAt(0)==='!'?!T[k.slice(1)]:!!T[k]})}
function sortearEvento(){
 var T=ctx(),rec=S.evRec||[],pool=[],tot=0;
 EVENTOS.forEach(function(e,i){if(rec.indexOf(i)>=0||!okTags(e.w,T))return;var w=e.w?3:1;pool.push([i,w]);tot+=w});
 if(!pool.length){S.evRec=[];return null}
 var r=Math.random()*tot,k;
 for(k=0;k<pool.length;k++){r-=pool[k][1];if(r<=0)break}
 k=Math.min(k,pool.length-1);
 S.evRec=rec.concat([pool[k][0]]).slice(-25);
 return pool[k][0]}

/* ---------- popups obrigatórios (substitui pendencias e aplicar) ---------- */
function pendencias(){
 if(ANIM||M)return;
 if(S.fim)return fimTemp();
 if(S.ev!==null){var e=EVENTOS[S.ev];if(!e){S.ev=null;return}
  modal('⚠ '+e.t,e.x+' Você precisa decidir agora.',e.o.map(function(o){return {l:o.l,d:descEf(o.e),f:function(){aplicar(o.e,o.l)}}}));return}
 if(S.evIng!==null&&S.evIng!==undefined){var g=EV_ING[S.evIng];if(!g){S.evIng=null;return}
  modal('🎟 '+g.t,g.x,g.o.map(function(o){return {l:o.l,d:descEf(o.e),f:function(){aplicarIng(o.e,o.l)}}}))}
}
function efeitos(e){
 S.caixa+=Math.round((e.c||0)*escalaEv());S.moral=lim(S.moral+(e.m||0));S.torc=lim(S.torc+(e.t||0));S.rep=lim(S.rep+(e.r||0));
 if(e.f&&S.elenco)S.elenco.forEach(function(j){j.f=Math.max(0,Math.min(100,j.f+e.f))})}
function aplicar(e,l){efeitos(e);S.ev=null;render();salvar();toast('Decisão tomada: '+l)}
function aplicarIng(e,l){efeitos(e);if(e.pm)S.mod=(S.mod||1)*e.pm;S.evIng=null;render();salvar();toast('Decisão tomada: '+l)}


/* ---------- utilidades ---------- */
function tela(n){
 ['auth','inicio','menu','esc','jogo'].forEach(function(k){$('t-'+k).className='tela'+(k===n?' on':'')});
 document.body.classList.toggle('em-jogo',n==='jogo');
 $('b-inicio').style.display=(n==='menu'||n==='esc'||n==='jogo')?'inline-block':'none'}
function msg(id,t,ok){var e=$(id);e.textContent=t||'';e.className='msg'+(ok?' ok':'')}
function toast(t){var e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(function(){e.style.display='none'},5000)}
function api(b){
 return fetch(API,{
   method:'POST',
   redirect:'follow',
   headers:{'Content-Type':'text/plain;charset=utf-8'},
   body:JSON.stringify(b)
 }).then(function(r){
   if(!r.ok) throw new Error('O servidor respondeu HTTP '+r.status+'. Confira a implantação do Apps Script.');
   return r.json();
 }).then(function(r){
   if(r.erro) throw new Error(r.erro);
   return r;
 }).catch(function(e){
   if(e instanceof TypeError){
     throw new Error('O navegador não conseguiu ler a resposta do Apps Script. Pode ser bloqueio CORS/redirecionamento; confira a implantação e tente novamente.');
   }
   throw e;
 });
}
function sair(){localStorage.removeItem('pm_tok');location.reload()}
function lim(v){return Math.max(0,Math.min(100,Math.round(v*10)/10))}
function tier(r){return r<20?'Desconhecido':r<40?'Promissor':r<60?'Respeitado':r<80?'Prestigiado':'Lendário'}
function fmtK(v){
 v=Number(v)||0;var a=Math.abs(v),s=v<0?'-':'';
 if(a<1000)return s+'€ '+Math.round(a).toLocaleString('pt-BR')+' mil';
 var d=a>=100000?0:a>=10000?1:2;
 return s+'€ '+(a/1000).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+' mi'}
function mil(v){return fmtK(v)}
function clube(id){return S.cl[id]}
function modal(tit,txt,ops){
 var h='<h2>'+esc(tit)+'</h2><p>'+esc(txt)+'</p>';
 ops.forEach(function(o,i){h+='<button data-i="'+i+'">'+esc(o.l)+(o.d?'<small>'+chipsEf(o.d)+'</small>':'')+'</button>'});
 $('mbox').innerHTML=mono(h);$('modal').className='on';
 var bs=$('mbox').getElementsByTagName('button');
 for(var i=0;i<bs.length;i++)bs[i].onclick=(function(o){return function(){$('modal').className='';o.f()}})(ops[i]);
}
/* ---------- helpers visuais ---------- */
function grupoPos(p){return p==='GOL'?'g':(p==='ZAG'||p==='LAT')?'d':(p==='VOL'||p==='MEI')?'m':'a'}
function ovCls(o){return o>=80?'ov-s':o>=70?'ov-a':o>=60?'ov-b':'ov-c'}
function corFis(v){return v>=70?'#3dbb6a':v>=45?'#facc15':'#ef4444'}
function corClube(n){var h=0,s=String(n||'');for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))%360;return 'hsl('+h+',42%,26%)'}
function crest(c,sz){sz=sz||42;return '<div class="esc" style="width:'+sz+'px;height:'+sz+'px;background:'+corClube(c.n)+';font-size:'+Math.round(sz*.29)+'px;position:relative">'+esc(sigla(c.n))+(c.escudo?'<img src="'+esc(c.escudo)+'" alt="" referrerpolicy="no-referrer" loading="lazy" style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;border-radius:50%;background:#f4f7f5;padding:2px" onerror="this.remove()">':'')+'</div>'}
function chipsEf(d){return String(d).split(' · ').map(function(p){var c=p.indexOf('+')>=0?'up':p.indexOf('-')>=0?'dn':'';return '<i class="ef '+c+'">'+esc(p)+'</i>'}).join('')}
function linhaJog(j,o){o=o||{};var p=o.pos||j.p;return '<div class="pl'+(o.cls||'')+'"'+(o.attr||'')+'><div class="pp g-'+grupoPos(p)+'">'+p+'</div><div class="pn"><b>'+(o.star?'★ ':'')+esc(j.n)+(o.ic||'')+'</b><small>'+(o.sub||(j.i+' anos'))+'</small></div><div class="ov '+ovCls(j.o)+'" title="Overall">'+j.o+'</div><div title="Preparo físico"><div class="fbar"><i class="'+classeFis(j.f)+'" style="width:'+j.f+'%"></i></div><div class="fl">'+Math.round(j.f)+'%</div></div></div>'}

/* ---------- ícones SVG de traço único ---------- */
var ICO={
 home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v12h14V9"/><path d="M10 21v-6h4v6"/>',
 pitch:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M12 5v14"/><circle cx="12" cy="12" r="2.8"/><path d="M3 9.5h2.5v5H3M21 9.5h-2.5v5H21"/>',
 trophy:'<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
 calendar:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
 clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M15 9.2a3.6 3.6 0 1 0 0 5.6"/><path d="M7.5 11h6M7.5 13h6"/>',
 bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
 target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
 stadium:'<ellipse cx="12" cy="8" rx="9" ry="4"/><path d="M3 8v8c0 2.2 4 4 9 4s9-1.8 9-4V8"/>',
 plane:'<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
 clock:'<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2h5"/>',
 play:'<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>',
 pause:'<rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"/>',
 ball:'<circle cx="12" cy="12" r="9"/><path d="m12 8.2 3.6 2.6-1.4 4.2H9.8l-1.4-4.2z"/><path d="M12 3v5.2M15.6 10.8 20.6 9M14.2 15l3 4.2M9.8 15l-3 4.2M8.4 10.8 3.4 9"/>',
 alert:'<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
 ticket:'<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2M13 17v2M13 11v2"/>',
 swap:'<path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
 flag:'<path d="M4 22V4"/><path d="M4 4h13l-2 4 2 4H4"/>',
 'chev-l':'<path d="m15 18-6-6 6-6"/>',
 'chev-r':'<path d="m9 18 6-6-6-6"/>'
};
function ico(n){return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+ICO[n]+'</svg>'}
/* emoji -> ícone. Para trocar um ícone no futuro, mexa só aqui. */
var EMO={'🏠':'home','⚙':'pitch','🏆':'trophy','👥':'users','📅':'calendar','📋':'clipboard',
 '💰':'coin','🪙':'coin','💪':'bolt','🎯':'target','🏟':'stadium','✈':'plane','⏱':'clock',
 '▶':'play','⏸':'pause','⚽':'ball','⚠':'alert','🎟':'ticket','🔁':'swap','🏁':'flag'};
var EMO_RE=new RegExp('('+Object.keys(EMO).join('|')+')\uFE0F?','g');
function mono(h){
 return String(h).replace(EMO_RE,function(m,k){return ico(EMO[k])}).replace(/🟨\uFE0F?/g,'<i class="ycard"></i>')}

/* ---------- transições ---------- */
/* Executa fn (que redesenha a tela) com animação suave. entrada=true faz os
   cards entrarem em sequência (usado ao trocar de aba). */
function transicao(fn,entrada){
 var run=function(){ENTRADA=!!entrada;fn()};
 var red=window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
 if(!red&&document.startViewTransition){document.startViewTransition(run);return}
 run()}
/* estilo das transições do navegador (injetado por aqui para o Blogger não reclamar) */
(function(){
 var s=document.createElement('style');
 s.textContent='::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation-duration:.45s;animation-timing-function:cubic-bezier(.3,.7,.2,1)}'+
  '::view-transition-group(root),::view-transition-old(root),::view-transition-new(root){animation-duration:.2s;animation-timing-function:ease-out}';
 document.head.appendChild(s)})();

/* ---------- login ---------- */
function busy(b,v){b.disabled=v}
$('b-env').onclick=function(){
 var em=$('email').value.trim().toLowerCase();msg('m-auth','');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)){msg('m-auth','Digite um e-mail completo, ex.: nome@gmail.com');return}
 busy(this,true);var b=this;
 api({acao:'enviar',email:em}).then(function(){EMAIL=em;$('emx').textContent=em;$('p1').style.display='none';$('p2').style.display='block';msg('m-auth','Código enviado! Veja também o spam.',true)})
 .catch(function(e){msg('m-auth',e.message==='Ação desconhecida.'?'O Apps Script publicado está desatualizado. Cole o código novo e crie uma NOVA VERSÃO da implantação.':e.message)}).then(function(){busy(b,false)})};
$('b-val').onclick=function(){
 msg('m-auth','');busy(this,true);var b=this;
 api({acao:'validar',email:EMAIL,codigo:$('cod').value.trim()}).then(function(r){TOKEN=r.token;localStorage.setItem('pm_tok',TOKEN);localStorage.setItem('pm_mail',EMAIL);SLOTS=normSlots(r.slots);entrar(true)})
 .catch(function(e){msg('m-auth',e.message)}).then(function(){busy(b,false)})};
$('b-volta').onclick=function(){$('p2').style.display='none';$('p1').style.display='block';msg('m-auth','')};
$('sair').onclick=sair;

function entrar(comSave){
 $('quem').textContent=EMAIL||'';$('sair').style.display='inline-block';
 $('p1').style.display='none';$('p2').style.display='none';msg('m-auth','Entrando na sua conta…',true);
 var tentar=function(n){
  var p=comSave?Promise.resolve():api({acao:'slots',token:TOKEN}).then(function(r){SLOTS=normSlots(r.slots)});
  p.then(function(){return PMUI.carregar()}).then(function(){msg('m-auth','');inicio()}).catch(function(e){
   if(e.message==='sessao'){sair();return}
   if(n<3){msg('m-auth','Conexão lenta, tentando de novo…',true);setTimeout(function(){tentar(n+1)},1500*(n+1));return}
   msg('m-auth','Não foi possível entrar agora: '+e.message);
   var b=document.createElement('button');b.textContent='Tentar de novo';b.className='full';b.onclick=function(){b.remove();entrar()};$('m-auth').parentNode.appendChild(b)})};
 tentar(0)}

/* ---------- menu / nova carreira: slots ---------- */
function normSlots(a){var s=[null,null,null];(a||[]).forEach(function(x){var k=Number(x&&x.slot);if(k>=1&&k<=3)s[k-1]=x.meta||{}});return s}
function estrelas(rep){var n=Math.max(1,Math.min(5,Math.round((Number(rep)||50)/20))),h='';for(var i=0;i<5;i++)h+='<i'+(i<n?' class="on"':'')+'>★</i>';return h}
function escudoGrande(m,sz){
 return '<div class="sl-esc'+(m.escudo?'':' sem')+'" style="width:'+sz+'px;height:'+sz+'px">'+
  (m.escudo?'<img src="'+esc(m.escudo)+'" alt="" referrerpolicy="no-referrer" loading="lazy" onerror="this.parentNode.className=\'sl-esc sem\';this.remove()">':'')+
  '<span style="background:'+corClube(m.clube)+'">'+esc(sigla(m.clube))+'</span></div>'}
function cartaoSlot(i){
 var m=SLOTS[i],n=i+1;
 if(!m)return '<div class="slotw"><div class="slot vazio"><div class="slot-top"><span class="slot-n">SLOT '+n+'</span>Vazio</div><div class="slot-mais">+</div><div class="slot-nome">Slot livre</div><p class="hint">Comece uma nova carreira aqui.</p></div>'+
  '<div class="stack"><button class="full" data-nova="'+i+'">Nova carreira</button></div></div>';
 var rod=(m.rod!=null?m.rod:'–')+'/'+(m.total||'–'),pos=m.pos?m.pos+'º':'–';
 return '<div class="slotw"><div class="slot">'+
  '<div class="slot-top"><span class="slot-n">SLOT '+n+'</span>'+esc(m.pais||'Carreira')+'</div>'+
  '<div class="slot-nome">'+esc(m.clube||'Clube')+'</div>'+
  escudoGrande(m,116)+
  '<div class="slot-stars">'+estrelas(m.rep)+'</div>'+
  '<div class="slot-stats"><div><small>TEMPORADA</small><b>'+(m.temp||1)+'</b></div><div><small>RODADA</small><b>'+rod+'</b></div><div><small>POSIÇÃO</small><b>'+pos+'</b></div></div>'+
  '<div class="slot-info"><span>Técnico <b>'+esc(m.tec||'—')+'</b></span><span>Caixa <b>'+fmtK(m.caixa||0)+'</b></span></div>'+
  '<div class="slot-liga">'+(m.ligaLogo?'<img src="'+esc(m.ligaLogo)+'" alt="" referrerpolicy="no-referrer" onerror="this.remove()">':'')+'<span>'+esc(m.liga||'')+'</span></div>'+
  '</div><div class="stack"><button class="full" data-cont="'+i+'">Continuar carreira</button>'+
  '<button class="sec full danger" data-apagar="'+i+'">Apagar carreira</button></div></div>'}
function inicio(){tela('inicio')}
$('i-novo').onclick=function(){
 var livre=-1,k;for(k=0;k<3;k++)if(!SLOTS[k]){livre=k;break}
 if(livre<0){menu();msg('m-menu','Todos os slots estão ocupados. Apague uma carreira para começar um novo jogo.');return}
 SLOT=livre+1;novaTela()};
$('i-carregar').onclick=function(){menu()};
$('i-sair').onclick=sair;
$('b-menu-inicio').onclick=inicio;
$('b-inicio').onclick=function(){
 if(S&&$('t-jogo').className.indexOf('on')>=0){pausar();clearTimeout(SALVT);salvarJa()}
 inicio()};

function menu(){
 tela('menu');msg('m-menu','');
 var el=$('slots');el.innerHTML=[0,1,2].map(cartaoSlot).join('');
 var q,i;
 q=el.querySelectorAll('[data-cont]');for(i=0;i<q.length;i++)q[i].onclick=function(){continuarSlot(+this.getAttribute('data-cont'))};
 q=el.querySelectorAll('[data-apagar]');for(i=0;i<q.length;i++)q[i].onclick=function(){apagarSlot(+this.getAttribute('data-apagar'))};
 q=el.querySelectorAll('[data-nova]');for(i=0;i<q.length;i++)q[i].onclick=function(){SLOT=+this.getAttribute('data-nova')+1;novaTela()};
}
function continuarSlot(i){
 msg('m-menu','Carregando carreira…',true);
 api({acao:'carregar',token:TOKEN,slot:i+1}).then(function(r){
  if(!r.json)throw new Error('Esse slot está vazio.');
  SLOT=i+1;msg('m-menu','');abrirSave(r.json);
 }).catch(function(e){if(e.message==='sessao'){sair();return}msg('m-menu',e.message)})}
function apagarSlot(i){
 var m=SLOTS[i];
 if(!confirm('Apagar a carreira '+(m&&m.clube?'do '+m.clube:'deste slot')+'? Isso não pode ser desfeito.'))return;
 msg('m-menu','Apagando…',true);
 api({acao:'apagar',token:TOKEN,slot:i+1}).then(function(){SLOTS[i]=null;menu();msg('m-menu','Carreira apagada.',true)})
 .catch(function(e){if(e.message==='sessao'){sair();return}msg('m-menu',e.message)})}
function abrirSave(json){
 S=JSON.parse(json);
 if(!S.cl||!S.cl.length)throw new Error('Save inválido.');
 RODADAS=S.cal&&S.cal.length?S.cal.length:2*(S.cl.length-1);
 if(!S.ligaNome)S.ligaNome='Carreira antiga';
 S.cl.forEach(function(c){if(c.salario===undefined)c.salario=0;if(c.elenco===undefined)c.elenco=0;if(c.divida===undefined)c.divida=0;if(!c.metaTxt)c.metaTxt='Top '+(c.m||Math.ceil(S.cl.length/2));if(!c.liga)c.liga=S.ligaNome});
 migrar();tela('jogo');render()}
function metaSave(){
 var c=clube(S.cid),o=ordem();
 return {tec:S.tec,clube:c.n,escudo:c.escudo||'',pais:S.pais||c.pais||'',liga:S.ligaNome||c.liga||'',ligaLogo:S.ligaLogo||'',
  temp:S.temp,rod:S.rod,total:S.cal?S.cal.length:RODADAS,pos:o.indexOf(S.cid)+1,n:S.cl.length,caixa:Math.round(S.caixa),rep:c.f}}
$('b-voltamenu').onclick=function(){inicio()};
$('b-voltaligas').onclick=function(){
 LIGA_SEL=null;SEL=null;$('box-clubes').style.display='none';$('box-ligas').style.display='block';$('det').style.display='none';msg('m-esc','');window.scrollTo(0,0);
};

function num(v){var n=Number(v);return isFinite(n)?n:0}
function formatMi(v){return fmtK(num(v)*1000)}
function alvoMeta(meta,total,rep){
 var s=String(meta||'').toLowerCase();
 if(s.indexOf('título')>=0||s.indexOf('disputar títulos')>=0)return Math.max(2,Math.ceil(total*.2));
 if(s.indexOf('continental')>=0)return Math.max(4,Math.ceil(total*.25));
 if(s.indexOf('metade superior')>=0)return Math.ceil(total/2);
 if(s.indexOf('permanência')>=0||s.indexOf('permanencia')>=0)return Math.max(1,total-3);
 return rep>=85?Math.max(3,Math.ceil(total*.25)):Math.ceil(total/2);
}
function adaptarClube(raw,index,total){
 var rep=Math.max(35,Math.min(99,num(raw.reputacao)||50));
 return {
  id:index,dbid:String(raw.id||''),ligaId:String(raw.ligaId||''),liga:String(raw.liga||''),pais:String(raw.pais||''),
  temporada:String(raw.temporada||''),n:String(raw.nome||'Clube'),s:sigla(raw.nome),
  cor:'#214f35',f:rep,c:Math.max(0,num(raw.orcamentoTransferencias))*1000*2.5,
  salario:Math.max(0,num(raw.orcamentoSalarial)),elenco:Math.max(0,num(raw.valorElenco)),
  divida:Math.max(0,num(raw.divida)),rep:rep,t:Math.max(25,Math.min(100,Math.round(rep*.88+8))),
  metaTxt:String(raw.meta||'Meta da diretoria a definir'),
  perfil:String(raw.perfilFinanceiro||''),
  m:alvoMeta(raw.meta,total,rep),
  escudoBusca:'',logoLigaBusca:'',escudo:String(raw.escudo||'')
 };
}
function carregarCatalogo(){
 msg('m-esc','Carregando ligas e clubes da planilha…',true);
 return api({acao:'catalogo'}).then(function(r){
  LIGAS=Array.isArray(r.ligas)?r.ligas:[];
  TODOS_CLUBES=Array.isArray(r.clubes)?r.clubes:[];
  if(!LIGAS.length||!TODOS_CLUBES.length)throw new Error('Não encontrei ligas ou clubes nas guias "Liga" e "CLUBES". Confira os cabeçalhos e os dados da planilha.');
  desenharLigas();msg('m-esc','',true);
 }).catch(function(e){msg('m-esc','Não foi possível carregar os dados da planilha: '+e.message);throw e});
}
function novaTela(){
 tela('esc');SEL=null;LIGA_SEL=null;CLUBES=[];$('det').style.display='none';
 $('box-clubes').style.display='none';$('box-ligas').style.display='block';msg('m-esc','');
 carregarCatalogo().catch(function(){});
}
function desenharLigas(){
 var el=$('ligas');
 el.innerHTML=LIGAS.map(function(l){
  var marca=sigla(l.nome);
  return '<button type="button" class="league-card" data-liga="'+esc(l.id)+'">'+
   '<span class="league-mark" style="position:relative">'+esc(marca)+(l.logo?'<img src="'+esc(l.logo)+'" alt="" referrerpolicy="no-referrer" style="position:absolute;inset:0;margin:auto;width:46px;height:46px;object-fit:contain;background:#143c25" onerror="this.remove()">':'')+'</span><span><b>'+esc(l.nome)+'</b>'+
   '<small>'+esc(l.pais)+' · '+esc(l.temporada)+'<br>'+Number(l.quantidade||0)+' clubes cadastrados</small></span></button>';
 }).join('');
 var bs=el.querySelectorAll('[data-liga]');
 for(var i=0;i<bs.length;i++)bs[i].onclick=function(){selecionarLiga(this.getAttribute('data-liga'))};
}
function selecionarLiga(id){
 LIGA_SEL=LIGAS.filter(function(l){return String(l.id)===String(id)})[0];
 if(!LIGA_SEL){msg('m-esc','Não foi possível encontrar essa liga.');return}
 var raw=TODOS_CLUBES.filter(function(c){return String(c.ligaId)===String(LIGA_SEL.id)});
 if(!raw.length){msg('m-esc','Não há clubes cadastrados para esta liga.');return}
 CLUBES=raw.map(function(c,i){return adaptarClube(c,i,raw.length)});
 SEL=null;$('det').style.display='none';$('box-ligas').style.display='none';$('box-clubes').style.display='block';
 $('titulo-clubes').textContent='2. Escolha seu clube';
 $('subtitulo-liga').textContent=LIGA_SEL.nome+' · '+LIGA_SEL.pais+' · Temporada '+LIGA_SEL.temporada+' · '+CLUBES.length+' clubes';
 $('link-logo-liga').innerHTML=LIGA_SEL.logoBusca?'<a class="extlink" href="'+esc(LIGA_SEL.logoBusca)+'" target="_blank" rel="noopener">Consultar logos da liga ↗</a>':'';
 $('clubes').innerHTML=CLUBES.map(function(c){
  var link=c.escudoBusca?'<a class="extlink" href="'+esc(c.escudoBusca)+'" target="_blank" rel="noopener">Ver opções de escudo ↗</a>':'';
  return '<div class="club" data-id="'+c.id+'">'+crest(c,42)+
   '<div class="clubmeta"><b>'+esc(c.n)+'</b><span>Reputação '+c.f+'/100</span>'+link+'</div></div>';
 }).join('');
 var cs=$('clubes').children;
 for(var i=0;i<cs.length;i++)cs[i].onclick=function(){escolher(+this.getAttribute('data-id'))};
 msg('m-esc','');window.scrollTo(0,0);
}
function escolher(id){
 SEL=id;var c=CLUBES[id],cs=$('clubes').children;
 for(var i=0;i<cs.length;i++)cs[i].className='club'+(i===id?' sel':'');
 var d=$('det');d.style.display='block';
 d.innerHTML='<h2>'+esc(c.n)+'</h2>'+
 '<p style="color:var(--mut);margin-top:-4px">'+esc(c.liga)+' · '+esc(c.pais)+' · '+esc(c.temporada)+'</p>'+
 '<div class="detail-grid">'+
 '<div><small>Orçamento de transferências</small><b>'+formatMi(c.c/1000)+'</b></div>'+
 '<div><small>Orçamento salarial anual</small><b>'+formatMi(c.salario)+'</b></div>'+
 '<div><small>Valor estimado do elenco</small><b>'+formatMi(c.elenco)+'</b></div>'+
 '<div><small>Dívida estimada</small><b>'+formatMi(c.divida)+'</b></div>'+
 '<div><small>Reputação</small><b>'+c.f+'/100</b></div>'+
 '<div><small>Meta da diretoria</small><b>'+esc(c.metaTxt)+'</b></div>'+
 '</div><p style="font-size:12px;color:var(--mut)">Os valores financeiros são estimativas de gameplay conforme a guia Parâmetros da planilha, não dados contábeis auditados.</p>'+
 (c.escudoBusca?'<p><a class="extlink" href="'+esc(c.escudoBusca)+'" target="_blank" rel="noopener">Consultar escudo do clube ↗</a></p>':'')+
 '<button class="full" id="b-ini">Assumir o clube</button>';
 $('b-ini').onclick=iniciar;d.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function cal(ids){var n=ids.length,a=ids.slice(),r=[],i,j,m,h,v;
 for(i=0;i<n-1;i++){m=[];for(j=0;j<n/2;j++){h=a[j];v=a[n-1-j];m.push(i%2?[v,h]:[h,v])}r.push(m);a.splice(1,0,a.pop())}
 return r.concat(r.map(function(x){return x.map(function(p){return [p[1],p[0]]})}))}
/* Motor principal mantido neste arquivo porque compartilha estado e funções internas. */

/* =====================================================================
   PM MOTOR - PARTE 1  (mundo, janelas, valor, forma/moral, entrosamento, simulação)
   Cole DENTRO do <script> do HTML, logo depois da função cal().
   Usa só: S, FORM, WA, WD, REFW (já existem no seu código).
   ===================================================================== */
var PM={cfg:{},B:null,vc:{},by:[],last:{}};
var JI={ID:0,CL:1,NOME:2,NAC:3,IDADE:4,POS:5,POS2:6,PE:7,PF:8,ALT:9,O:10,POT:11,RIT:12,FIN:13,PAS:14,DRI:15,DEF:16,FIS:17,VAL:18,SAL:19,FIM:20,CLAU:21,FID:22,AMB:23,PROF:24,EMO:25,LID:26,LES:27,DEC:28,PERFIL:29,ANOS:30,FORM:31,REAL:32,POSJ:33,PAPEL:34,FAMA:35,PISO:36,ORIG:37,IDOLO:38,VINC:39,AG:40};
var CI={ID:0,LIGA:1,NOME:2,REP:3,TRANSF:4,SAL:5,PERFIL:6,META:7,PREST:8,POSTURA:9,DEP:10,PRES:11,REGRAS:12,RIV:13,GRUPO:14,FORM:15,EST:16,RAZAO:17,REC:18,FBIL:19,FIXA:20,OPEX:21,REPMER:22,TORC:23,ESC:24,LIGANOME:25,PAIS:26};
/* registro dinâmico de cada jogador (vai no save): array para ficar pequeno */
var DD={C:0,O:1,P:2,I:3,S:4,F:5,V:6,FI:7,MO:8,J:9,MN:10,G:11,A:12,AM:13,VM:14,N:15,NS:16,L:17,ST:18,PC:19,EMP:20,CJ:21,CG:22,CA:23,AD:24,H:25,TJ:26,FG:27};
var PMCFG={fama_base_ovr:40,fama_peso_ovr:1.25,fama_peso_gap:.3,fama_peso_rep:.28,piso_fator:.85,piso_idade_inicio:31,piso_idade_passo:3,piso_craque_fama:90,piso_craque_min:84,aceita_alto:85,aceita_baixo:60,ruido_pct:10,paciencia_inicial:100,paciencia_ofensa:35,oferta_ofensiva_limiar:.7,congelar_dias:14,prem_fora_janela_min:1.8,prem_fora_janela_max:3,chance_fora_janela:.08,comissao_agente_padrao:8,rep_mercado_fechar:2,rep_mercado_abandono:-4,rep_mercado_ofensa:-1,rep_mercado_desistir_medico:-6,efeito_overall_min:-15,efeito_overall_max:7,entrosamento_min:-8,entrosamento_max:5,entrosamento_neutro:50,bilheteria_share:.15,custos_op_pct:.38,ffp_folha_receita:.8,progressao_teto_ano:4,aposentadoria_idade:36,clima_aquecido:1.15,clima_frio:.88,tamanho_elenco_alvo:25,mult_mercado:20,mult_lista:1,ofertas_max_abertas:40,pausa_ofertas:1,mult_interesse:1};
function pmC(a,b,c){return Math.max(b,Math.min(c,a))}
function pmR(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function pmG(){var u=0,v=0;while(u===0)u=Math.random();while(v===0)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function pmPois(l){var L=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random()}while(p>L);return k-1}
function pmSeed(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)|0;var t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
function pmPick(arr){return arr[Math.floor(Math.random()*arr.length)]}
PM.nivel=['Péssimo','Muito ruim','Ruim','Contente','Boa','Ótima','Excelente'];
PM.lvl=function(v){return v<20?0:v<35?1:v<50?2:v<65?3:v<78?4:v<90?5:6};
PM.lvlNota=function(n){return pmC(Math.round((n/10-5)/.5),0,6)};

/* ---------- carga dos dados-base (action 'mundo') ---------- */
PM.init=function(raw){
 var B={cl:[],j:[],vet:{},ag:{},jn:raw.jn||[],liga:{},cIdx:{}};
 PM.cfg={};for(var k in PMCFG)PM.cfg[k]=PMCFG[k];for(k in (raw.cfg||{}))PM.cfg[k]=raw.cfg[k];
 raw.cl.forEach(function(a,i){B.cl.push(a);B.cIdx[a[CI.ID]]=i;(B.liga[a[CI.LIGA]]=B.liga[a[CI.LIGA]]||[]).push(i)});
 raw.jg.forEach(function(a){B.j[a[JI.ID]]=a});
 (raw.vt||[]).forEach(function(v){B.vet[v[0]+'|'+v[1]]=v[2]});
 (raw.ag||[]).forEach(function(a){B.ag[a[0]]=a});
 PM.B=B;return B};
PM.nClubes=function(){return PM.B.cl.length};
PM.clube=function(i){return PM.B.cl[i]};
PM.ligaDe=function(i){return PM.B.cl[i][CI.LIGA]};
PM.W=function(){return S.W};

PM.novoMundo=function(){
 var B=PM.B,W={p:[],c:[],livres:[],L:{},ag:[],cl:[],emp:[],nb:[],news:[],clima:'normal',nid:100001,jan:{aberta:false,ab:0,fe:0}};
 B.j.forEach(function(b,id){if(!b)return;
  W.p[id]=[b[JI.CL],b[JI.O],b[JI.POT],b[JI.IDADE],Math.round(b[JI.SAL]*1000),b[JI.FIM],Math.round(b[JI.VAL]*1000),100,pmC(Math.round(58+(b[JI.PROF]-50)/6+pmG()*4),30,85),0,0,0,0,0,0,65,0,0,0,-1,-1,0,0,0,400,[]]});
 B.cl.forEach(function(c,i){W.c[i]={pr:c[CI.PREST],rm:c[CI.REPMER],cx:Math.round(c[CI.TRANSF]*1000),ct:35,ff:20,xi:[],fo:c[CI.FORM],es:c[CI.EST],t:0}});
 S.W=W;PM.hidratar();return W};
PM.hidratar=function(){
 var W=S.W,B=PM.B;PM.vc={};PM.by=[];
 (W.nb||[]).forEach(function(b){B.j[b[JI.ID]]=b});
 for(var i=0;i<B.cl.length;i++)PM.by[i]=[];
 W.p.forEach(function(d,id){if(d&&d[DD.C]>=0)PM.by[d[DD.C]].push(id)});
 PM.xiCache={}};
PM.base=function(id){return PM.B.j[id]};
PM.d=function(id){return S.W.p[id]};
PM.elencoIds=function(ci){return PM.by[ci]};
PM.moverJog=function(id,para){
 var d=S.W.p[id],de=d[DD.C];
 if(de>=0){var a=PM.by[de],k=a.indexOf(id);if(k>=0)a.splice(k,1)}
 d[DD.C]=para;if(para>=0)PM.by[para].push(id);d[DD.AD]=0;PM.xiCache={};delete PM.vc[id];
 if(S.W.lt)delete S.W.lt[id];
 if(de===S.wi&&S.lista)PM.deslistar(id)};
/* trava: quem se transferiu nesta janela não é negociado de novo até a próxima */
PM.chaveJanela=function(){var j=S.W.jan;return j&&j.aberta?j.ab:0};
PM.marcar=function(id){var k=PM.chaveJanela();if(k)S.W.p[id][DD.TJ]=k};
PM.recente=function(id){var k=PM.chaveJanela(),d=S.W.p[id];return !!k&&!!d&&d[DD.TJ]===k};
PM.view=function(id){
 if(PM.vc[id])return PM.vc[id];
 var b=PM.B.j[id],d=S.W.p[id],v={};
 var def=function(k,g,s){Object.defineProperty(v,k,{get:g,set:s||function(){},enumerable:false,configurable:true})};
 def('id',function(){return id});def('n',function(){return b[JI.NOME]});def('p',function(){return b[JI.POSJ]});
 def('i',function(){return d[DD.I]});
 def('o',function(){return d[DD.O]},function(x){d[DD.O]=x});
 def('f',function(){return d[DD.FI]},function(x){d[DD.FI]=x});
 def('min',function(){return d[DD.MN]},function(x){d[DD.MN]=x});
 return PM.vc[id]=v};
PM.elencoView=function(ci){return PM.by[ci].map(PM.view)};

/* ---------- datas e janelas ---------- */
PM.ano=function(){return new Date(S.d0).getUTCFullYear()};
PM.msHoje=function(){return S.d0+S.hoje*864e5};
PM.dataStr=function(ms){var d=new Date(ms);return ('0'+d.getUTCDate()).slice(-2)+'/'+('0'+(d.getUTCMonth()+1)).slice(-2)+'/'+d.getUTCFullYear()};
PM.janela=function(){
 var ms=PM.msHoje(),js=PM.B.jn,i,a;
 for(i=0;i<js.length;i++){a=js[i];if(ms>=a[2]&&ms<=a[3]+864e5-1){var rest=Math.round((a[3]-ms)/864e5);return {aberta:true,tipo:a[1],temp:a[0],ab:a[2],fe:a[3],rest:rest,ultimo:rest<=0,inicio:ms-a[2]<864e5}}}
 var prox=null;for(i=0;i<js.length;i++)if(js[i][2]>ms){prox=js[i];break}
 return {aberta:false,prox:prox?prox[2]:0,proxTipo:prox?prox[1]:'',diasProx:prox?Math.round((prox[2]-ms)/864e5):0}};
PM.inicioTemporada=function(){ /* dia (hoje) em que a temporada começa: abertura da janela de verão */
 var y=PM.ano(),js=PM.B.jn,i;for(i=0;i<js.length;i++)if(js[i][1]==='Verão'&&new Date(js[i][2]).getUTCFullYear()===y)return Math.round((js[i][2]-S.d0)/864e5);
 return -38};
/* fim do contrato: 30/06 do ano gravado */
PM.mesesRest=function(id){var d=S.W.p[id],fim=Date.UTC(d[DD.F],5,30);return Math.max(0,Math.round((fim-PM.msHoje())/864e5/30.4))};
PM.anosContr=function(id){return pmC(S.W.p[id][DD.F]-PM.ano(),0,6)};

/* ---------- fama, piso, valor, salário ---------- */
PM.fama=function(id){var b=PM.B.j[id],d=S.W.p[id];return pmC(Math.round(b[JI.FAMA]+(d[DD.O]-b[JI.O])*1.2+(d[DD.N]/10-6.4)*1.5),1,99)};
PM.piso=function(id){var c=PM.cfg,d=S.W.p[id],f=PM.fama(id);return Math.max(0,Math.max(f>=c.piso_craque_fama?c.piso_craque_min:0,Math.round(f*c.piso_fator-Math.max(0,d[DD.I]-c.piso_idade_inicio)*c.piso_idade_passo)))};
PM.valor=function(id){ /* € mil */
 var b=PM.B.j[id],d=S.W.p[id],o=d[DD.O],a=d[DD.I];
 var ln=-8.0368+.1427*o-.1165*Math.max(0,a-27)-.09*Math.max(0,a-33)+.0152*Math.max(0,25-a)+.0122*(d[DD.P]-o)+(b[JI.POSJ]==='GOL'?.0014:0)+.0156*PM.anosContr(id);
 var f=pmC(1+(d[DD.N]/10-6.4)*.04,.9,1.12);
 return Math.max(50,Math.round(Math.exp(ln)*1000*f))};
PM.salJusto=function(id){var d=S.W.p[id],b=PM.B.j[id],ag=PM.B.ag[b[JI.AG]],g=ag?ag[3]:50;
 return Math.max(60,Math.round(PM.valor(id)*.254*(1+(PM.fama(id)-50)/250)*(1+(50-d[DD.MO])/300)*(1+g/600)))};
PM.pos6=function(id){return PM.B.j[id][JI.POSJ]};
PM.prestClube=function(ci){return S.W.c[ci].pr};
PM.foreign=function(id,ci){var b=PM.B.j[id],pais=PM.B.cl[ci][CI.PAIS];return b[JI.NAC]!==pais};
PM.papel=function(id){return PM.B.j[id][JI.PAPEL]};

/* ---------- forma, fase, moral ---------- */
PM.faseNivel=function(id){return PM.lvlNota(S.W.p[id][DD.N])};
PM.formaNivel=function(id){return PM.lvl(S.W.p[id][DD.FI])};
PM.moralNivel=function(id){return PM.lvl(S.W.p[id][DD.MO])};
PM.efOv=function(id){
 var c=PM.cfg,d=S.W.p[id],fa=[-5,-3,-1.5,0,1.5,2.5,3],fo=[-6,-4,-2,0,.5,1,1.5],mo=[-4,-3,-1.5,0,1,1.5,2];
 var e=fa[PM.faseNivel(id)]+fo[PM.formaNivel(id)]+mo[PM.moralNivel(id)];
 return d[DD.O]+pmC(e,c.efeito_overall_min,c.efeito_overall_max)};

/* ---------- escalação da IA ---------- */
PM.escalar=function(ci){
 var W=S.W,fo=W.c[ci].fo,need=FORM[fo]||FORM['4-3-3'],ids=PM.by[ci].filter(function(id){return S.W.p[id][DD.L]<=0}),used={},slots=[];
 function topo(p,n){var l=ids.filter(function(id){return !used[id]&&PM.pos6(id)===p}).sort(function(a,b){return PM.efOv(b)*(.55+.45*S.W.p[b][DD.FI]/100)-PM.efOv(a)*(.55+.45*S.W.p[a][DD.FI]/100)}).slice(0,n);l.forEach(function(id){used[id]=1;slots.push({p:p,id:id})});return l.length}
 var out=[];
 topo('GOL',1);
 var lat=ids.filter(function(id){return PM.pos6(id)==='LAT'}).sort(function(a,b){return PM.efOv(b)-PM.efOv(a)}).slice(0,need.LAT);
 var zag=ids.filter(function(id){return PM.pos6(id)==='ZAG'}).sort(function(a,b){return PM.efOv(b)-PM.efOv(a)}).slice(0,need.ZAG);
 var ordem=[];ordem.push(slots[0]);
 if(lat[0])ordem.push({p:'LAT',id:lat[0]});zag.forEach(function(id){ordem.push({p:'ZAG',id:id})});if(lat[1])ordem.push({p:'LAT',id:lat[1]});
 ordem.forEach(function(s){if(s)used[s.id]=1});
 slots=ordem.filter(Boolean);
 ['VOL','MEI','ATA'].forEach(function(p){topo(p,need[p])});
 /* se faltar gente de alguma posição, completa com os melhores restantes */
 var want=11;
 if(slots.length<want){var rest=ids.filter(function(id){return !used[id]&&PM.pos6(id)!=='GOL'}).sort(function(a,b){return PM.efOv(b)-PM.efOv(a)});
  var grp=['ZAG','LAT','VOL','MEI','ATA'],gi=0;
  while(slots.length<want&&rest.length){var id=rest.shift();slots.push({p:PM.pos6(id),id:id});used[id]=1}}
 return slots.slice(0,11)};
PM.xi=function(ci){return PM.xiCache[ci]||(PM.xiCache[ci]=PM.escalar(ci))};

/* ---------- entrosamento ---------- */
PM.LANG={Espanha:'es',Argentina:'es',Uruguai:'es',México:'es',Colômbia:'es',Chile:'es',Venezuela:'es',Equador:'es',Paraguai:'es',Peru:'es',Portugal:'pt',Brasil:'pt',Inglaterra:'en','Estados Unidos':'en',Escócia:'en',Irlanda:'en',Canadá:'en',Alemanha:'de',Áustria:'de',Suíça:'de',França:'fr',Bélgica:'fr',Senegal:'fr','Costa do Marfim':'fr',Marrocos:'ar','Arábia Saudita':'ar',Egito:'ar',Argélia:'ar',Itália:'it','Países Baixos':'nl'};
PM.entro=function(ci,slots,form,estilo){
 var W=S.W,c=W.c[ci],al=[],i,ids=slots.map(function(s){return s.id});
 var ad=0,adS={d:0,m:0,a:0},nS={d:0,m:0,a:0};
 slots.forEach(function(s){var b=PM.B.j[s.id],pj=b[JI.POSJ],p2=b[JI.POS2],g2=p2?({LE:'LAT',LD:'LAT',MC:'MEI',PE:'ATA',PD:'ATA'}[p2]||p2):'',v;
  if(pj===s.p)v=1;else if(g2===s.p)v=.85;else if(s.p==='GOL'||pj==='GOL')v=.1;else if((pj==='ZAG'&&s.p==='LAT')||(pj==='LAT'&&s.p==='ZAG')||(pj==='VOL'&&s.p==='MEI')||(pj==='MEI'&&(s.p==='VOL'||s.p==='ATA'))||(pj==='ATA'&&s.p==='MEI'))v=.6;else v=.35;
  if(v<1)al.push(b[JI.NOME]+' fora de posição');
  ad+=v;var k=(s.p==='GOL'||s.p==='ZAG'||s.p==='LAT')?'d':s.p==='ATA'?'a':'m';adS[k]+=v;nS[k]++});
 ad/=Math.max(1,slots.length);
 var roles={};slots.forEach(function(s){var r=PM.papel(s.id);roles[r]=(roles[r]||0)+1});
 function cnt(l){return l.reduce(function(a,r){return a+(roles[r]||0)},0)}
 var latOf=cnt(['Lateral ofensivo']),cob=cnt(['Volante destruidor','Volante equilibrado','Zagueiro de marcação','Lateral defensivo']),cri=cnt(['Armador','Meia armador','Meia atacante','Volante construtor','Meia equilibrado','Meia box-to-box']);
 var fin=slots.filter(function(s){return s.p==='ATA'}).length?cnt(['Ponta finalizador','Atacante finalizador','Centroavante de referência','Atacante móvel','Meia atacante']):1;
 var eq=1;
 if(latOf>=2&&cob<3){eq-=.3;al.push('Dois laterais ofensivos sem cobertura: defesa exposta')}
 if(cri<1){eq-=.25;al.push('Sem criador de jogo no meio')}
 if(fin<1){eq-=.2;al.push('Sem finalizador no ataque')}
 if(cob<2){eq-=.15;al.push('Pouca proteção à defesa')}
 if((roles['Centroavante de referência']||0)>=2){eq-=.1;al.push('Dois centroavantes de referência disputam o mesmo papel')}
 eq=pmC(eq,0,1);
 var prev=c.xi||[],inter=0;ids.forEach(function(id){if(prev.indexOf(id)>=0)inter++});
 var ctt=c.ct,ff=(c.fo===form)?c.ff:15;
 var lg={},maxl=0,lid=0,stars=0,starsA=0,novos=0,mo=0,fi=0;
 slots.forEach(function(s){var b=PM.B.j[s.id],d=S.W.p[s.id],l=PM.LANG[b[JI.NAC]]||b[JI.NAC];lg[l]=(lg[l]||0)+1;maxl=Math.max(maxl,lg[l]);lid=Math.max(lid,b[JI.LID]);
  if(PM.fama(s.id)>=85){stars++;if(s.p==='ATA')starsA++}
  if(d[DD.AD]<45)novos++;mo+=d[DD.MO];fi+=d[DD.FI]});
 var afin=.5*pmC((maxl-2)/6,0,1)+.5*lid/100;
 var ego=(stars>=6?(stars-5)*3:0)+(starsA>=4?(starsA-3)*4:0);if(ego)al.push('Estrelas demais disputando protagonismo');
 var nov=Math.min(15,novos*2.5);if(novos>=3)al.push(novos+' reforços ainda em adaptação');
 var cond=pmC(.9+.2*(mo/11/100)+.1*(fi/11/100),.8,1.1);
 var tot=pmC((100*(.28*ad+.24*eq+.24*ctt/100+.10*ff/100+.14*afin)-ego-nov)*cond,0,100);
 var cf=PM.cfg,n=cf.entrosamento_neutro,mod=tot>=n?cf.entrosamento_max*(tot-n)/(100-n):cf.entrosamento_min*(n-tot)/n;
 function sec(k){return pmC(Math.round(tot+((adS[k]/Math.max(1,nS[k]))-ad)*40),0,100)}
 return {t:Math.round(tot),mod:mod,d:sec('d'),m:sec('m'),a:sec('a'),al:al,ad:ad,eq:eq,ct:ctt,ff:ff}};
PM.atualizaEntro=function(ci,slots,form){
 var c=S.W.c[ci],ids=slots.map(function(s){return s.id}),prev=c.xi||[],it=0;
 ids.forEach(function(id){if(prev.indexOf(id)>=0)it++});var ov=prev.length?it/11:1;
 c.ct=pmC(ov>=.82?c.ct+6*(1-c.ct/130):c.ct-(1-ov)*28,0,100);
 c.ff=(c.fo===form)?Math.min(100,c.ff+5):15;c.fo=form;c.xi=ids};

/* ---------- força do time (igual à sua potencia(), com overall efetivo) ---------- */
PM.forcaIA=function(ci){
 var slots=PM.xi(ci),c=S.W.c[ci],A=0,D=0,en=PM.entro(ci,slots,c.fo,c.es),st={def:{a:.93,d:1.07},eq:{a:1,d:1},ofe:{a:1.07,d:.94}}[c.es]||{a:1,d:1};
 slots.forEach(function(s){var d=S.W.p[s.id],e=PM.efOv(s.id)*(.55+.45*d[DD.FI]/100)*(PM.pos6(s.id)===s.p?1:.82);A+=e*WA[s.p];D+=e*WD[s.p]});
 return {atk:A/REFW*st.a+en.mod,def:D/REFW*st.d+en.mod,en:en}};

/* ---------- simulação estatística de uma partida (IA x IA) ---------- */
PM.pesoGol={ATA:5,MEI:3,VOL:1,LAT:1.2,ZAG:.8,GOL:0};
function pmEsc(arr,fn){var tot=0,w=arr.map(function(x){var v=Math.max(.01,fn(x));tot+=v;return v}),r=Math.random()*tot,k;for(k=0;k<arr.length;k++){r-=w[k];if(r<=0)break}return arr[Math.min(k,arr.length-1)]}
PM.simPartida=function(hi,ai,opt){
 opt=opt||{};
 var fh=PM.forcaIA(hi),fa=PM.forcaIA(ai);
 var gh=pmPois(1.35*1.1*Math.pow(fh.atk/fa.def,1.6)),ga=pmPois(1.35/1.1*Math.pow(fa.atk/fh.def,1.6));
 PM.regPartida(hi,gh,ga);PM.regPartida(ai,ga,gh);
 var ca=S.W.c;
 PM.atualizaEntro(hi,PM.xi(hi),ca[hi].fo);PM.atualizaEntro(ai,PM.xi(ai),ca[ai].fo);
 return [gh,ga]};
/* distribui gols, assistências, cartões, minutos, notas e lesões dentro de um clube */
PM.regPartida=function(ci,gf,gs,ext){
 var W=S.W,sl=PM.xi(ci),starters=sl.map(function(s){return s.id}),bench=PM.by[ci].filter(function(id){return starters.indexOf(id)<0&&W.p[id][DD.L]<=0}).sort(function(a,b){return PM.efOv(b)-PM.efOv(a)});
 var nsub=Math.min(bench.length,pmR(2,4)),mins={},i,out;
 starters.forEach(function(id){mins[id]=90});
 var cand=starters.filter(function(id){return PM.pos6(id)!=='GOL'}).sort(function(a,b){return W.p[a][DD.FI]-W.p[b][DD.FI]}).slice(0,nsub);
 cand.forEach(function(id,k){var m=pmR(55,85);mins[id]=m;var sub=bench[k];if(sub!==undefined)mins[sub]=90-m});
 var onP=Object.keys(mins).map(Number);
 var gols={},ass={},am={},vm={};
 for(i=0;i<gf;i++){var e=pmEsc(onP,function(id){return (PM.pesoGol[PM.pos6(id)]||0)*(PM.efOv(id)/70)*(mins[id]/90)});gols[e]=(gols[e]||0)+1;
  if(Math.random()<.7){var a=pmEsc(onP.filter(function(x){return x!==e}),function(id){return ((PM.pesoGol[PM.pos6(id)]||0)+.5)*(PM.efOv(id)/70)});ass[a]=(ass[a]||0)+1}}
 var ncards=pmPois(1.5);for(i=0;i<ncards;i++){var c=pmEsc(onP,function(id){return 130-PM.B.j[id][JI.EMO]});am[c]=1}
 if(Math.random()<.05){var r=pmEsc(onP,function(id){return 130-PM.B.j[id][JI.EMO]});vm[r]=1}
 var res=gf>gs?.35:gf<gs?-.3:0,avg=0;onP.forEach(function(id){avg+=W.p[id][DD.O]});avg/=onP.length;
 onP.forEach(function(id){
  var d=W.p[id],g=gols[id]||0,a=ass[id]||0,p=PM.pos6(id),mn=mins[id];
  var nota=6+.9*g+.5*a+res+((gs===0&&(p==='GOL'||p==='ZAG'||p==='LAT'))?.4:0)+(p==='GOL'?-.12*gs:0)-(vm[id]?1.2:0)+(d[DD.O]-avg)/40+pmG()*.55;
  nota=pmC(nota,3.5,10);
  d[DD.J]++;d[DD.MN]+=mn;d[DD.G]+=g;d[DD.A]+=a;d[DD.AM]+=am[id]?1:0;d[DD.VM]+=vm[id]?1:0;d[DD.CJ]++;d[DD.CG]+=g;d[DD.CA]+=a;
  d[DD.NS]+=Math.round(nota*10);d[DD.N]=Math.round(d[DD.N]*.7+nota*10*.3);
  d[DD.FI]=Math.max(5,d[DD.FI]-12*mn/90*(1+(PM.B.j[id][JI.LES]>70?.1:0)));
  var pi=.0009*(1+PM.B.j[id][JI.LES]/80)*(d[DD.FI]<50?1.8:1)*(mn/90);
  if(Math.random()<pi)d[DD.L]=pmPick([7,10,14,21,30,45,70,110]);
  if(ext)ext(id,nota,g,a)});
 /* moral do grupo */
 var dm=gf>gs?1.2:gf<gs?-1.5:0;
 PM.by[ci].forEach(function(id){var d=W.p[id],x=mins[id]?dm:dm-(PM.efOv(id)>=avg+2?.8:0);d[DD.MO]=pmC(d[DD.MO]+x,5,100)});
 return {gols:gols,ass:ass,mins:mins}};

/* ---------- ligas do mundo (todas as ligas, menos a do usuário que usa o seu calendário) ---------- */
PM.gerarDias=function(n,fim){var g=[7,7,7,7,4,4,3,5,6,3],d=[0];for(var i=1;i<n;i++)d.push(d[i-1]+g[pmR(0,g.length-1)]);var f=fim/d[n-1];return d.map(function(x){return Math.round(x*f)})};
PM.circulo=function(ids){var n=ids.length,a=ids.slice(),r=[],i,j,m,h,v;for(i=0;i<n-1;i++){m=[];for(j=0;j<n/2;j++){h=a[j];v=a[n-1-j];m.push(i%2?[v,h]:[h,v])}r.push(m);a.splice(1,0,a.pop())}return r.concat(r.map(function(x){return x.map(function(p){return [p[1],p[0]]})}))};
PM.novaTemporadaMundo=function(ligaUser,fimDias){
 var W=S.W,B=PM.B;W.L={};
 Object.keys(B.liga).forEach(function(lid){if(lid===ligaUser)return;
  var ids=B.liga[lid].slice(),n=ids.length%2?ids.concat([-1]):ids,cal=PM.circulo(n).map(function(r){return r.filter(function(p){return p[0]>=0&&p[1]>=0})}),tab={};
  ids.forEach(function(i){tab[i]=[0,0,0,0,0,0,0]});
  W.L[lid]={cal:cal,dias:PM.gerarDias(cal.length,fimDias),rod:0,tab:tab}})};
PM.tabAdd=function(tab,h,a,gh,ga){var th=tab[h],ta=tab[a];th[1]++;ta[1]++;th[5]+=gh;th[6]+=ga;ta[5]+=ga;ta[6]+=gh;
 if(gh>ga){th[0]+=3;th[2]++;ta[4]++}else if(gh<ga){ta[0]+=3;ta[2]++;th[4]++}else{th[0]++;ta[0]++;th[3]++;ta[3]++}};
/* chamado todo dia: joga as rodadas das outras ligas marcadas para o dia (dia relativo ao início do calendário do usuário) */
PM.jogarMundoDia=function(diaRel){
 var W=S.W;PM.xiCache={};Object.keys(W.L).forEach(function(lid){var L=W.L[lid];
  while(L.rod<L.cal.length&&L.dias[L.rod]<=diaRel){L.cal[L.rod].forEach(function(p){var r=PM.simPartida(p[0],p[1]);PM.tabAdd(L.tab,p[0],p[1],r[0],r[1])});L.rod++}})};
PM.ordemLiga=function(lid){var L=S.W.L[lid];return Object.keys(L.tab).map(Number).sort(function(a,b){var x=L.tab[a],y=L.tab[b];return y[0]-x[0]||(y[5]-y[6])-(x[5]-x[6])||y[5]-x[5]})};

/* arredonda números antes de salvar (deixa o save bem menor) */
PM.compactar=function(){S.W.p.forEach(function(d){if(!d)return;d[DD.FI]=Math.round(d[DD.FI]*10)/10;d[DD.MO]=Math.round(d[DD.MO]*10)/10;d[DD.V]=Math.round(d[DD.V]);d[DD.S]=Math.round(d[DD.S])});
 S.W.c.forEach(function(c){c.pr=Math.round(c.pr*10)/10;c.ct=Math.round(c.ct*10)/10;c.cx=Math.round(c.cx)});S.fin.conf=Math.round(S.fin.conf*10)/10;S.repMer=Math.round(S.repMer*10)/10};
/* =====================================================================
   PM MOTOR - PARTE 2  (finanças, contratos, negociação, IA de mercado, fim de temporada)
   Cole logo DEPOIS da parte 1. Usa também fmtK() do seu código.
   ===================================================================== */
PM.me=function(){return S.wi};
PM.meuNome=function(){return PM.B.cl[S.wi][CI.NOME]};
PM.log=function(t){var w=S.W;w.news.unshift({d:PM.msHoje(),t:t});if(w.news.length>40)w.news.pop()};
PM.iniciarSave=function(){
 S.fin={div:0,mes:0,conf:100,hist:[]};S.repMer=PM.B.cl[S.wi][CI.REPMER];S.neg=[];S.ofe=[];S.parc=[];S.bon=[];S.prom={};S.pendOp=[];S.bal=null;S.nid=1;S.cnt={ab:0,fe:0};
 S.W.cx=S.W.cx||0};

/* ---------- finanças (caixa em € mil) ---------- */
PM.folhaMes=function(){return PM.by[S.wi].reduce(function(a,id){return a+S.W.p[id][DD.S]},0)/12};
PM.folhaAno=function(){return PM.by[S.wi].reduce(function(a,id){return a+S.W.p[id][DD.S]},0)};
PM.receitaAno=function(){return PM.B.cl[S.wi][CI.REC]*1000};
PM.receber=function(v,t){ /* receita: abate primeiro a dívida salarial */
 var f=S.fin;if(f.div>0&&v>0){var p=Math.min(f.div,v);f.div-=p;v-=p;if(p>0)PM.log('Receita de '+fmtK(p)+' usada para quitar salários atrasados');if(f.div<=0){f.div=0;f.mes=0}}
 S.caixa+=v};
PM.moralCap=function(){return S.fin.conf>=100?100:Math.round(40+.6*S.fin.conf)};
PM.mensal=function(){
 var c=PM.B.cl[S.wi],f=S.fin,ev=[],fix=c[CI.FIXA],opx=c[CI.OPEX],fol=Math.round(PM.folhaMes());
 var cxAntes=S.caixa,divAnt=f.div;S.caixa+=fix-opx;
 /* parcelas e bônus vencidos */
 var h=PM.msHoje();S.parc=S.parc.filter(function(p){if(p.dia<=h){if(p.v>0)PM.receber(p.v);else S.caixa+=p.v;ev.push({k:'parc',t:(p.v>0?'Recebido ':'Pago ')+fmtK(Math.abs(p.v))+': '+p.t});return false}return true});
 var devido=fol+f.div,pago=Math.min(Math.max(0,S.caixa),devido);
 var novoAtraso=devido-pago;
 S.caixa-=pago;
 if(novoAtraso>0){
  f.mes++;var sev=Math.min(3,novoAtraso/Math.max(1,fol)),mediana=PM.by[S.wi].map(function(id){return S.W.p[id][DD.S]}).sort(function(a,b){return a-b})[Math.floor(PM.by[S.wi].length/2)];
  PM.by[S.wi].forEach(function(id){var d=S.W.p[id],b=PM.B.j[id],k=1;if(d[DD.S]<=mediana)k*=1.3;if(b[JI.FID]>=80||b[JI.PROF]>=80)k*=.6;
   d[DD.MO]=pmC(d[DD.MO]-Math.min(22,6*sev*k)*(1+.5*(f.mes-1)),5,100)});
  f.conf=pmC(f.conf-(12*Math.min(1,sev)+8*f.mes),0,100);S.torc=pmC(S.torc-1,0,100);
  f.div=novoAtraso;
  ev.push({k:'atraso',t:'Salários atrasados: '+fmtK(novoAtraso)+' em aberto ('+f.mes+(f.mes>1?' meses seguidos':' mês')+'). Moral e confiança da diretoria caíram.'});
 }else{
  f.div=0;f.mes=0;f.conf=Math.min(100,f.conf+2);
  ev.push({k:'folha',t:'Folha de '+fmtK(fol)+' paga. Receita fixa '+fmtK(fix)+', custos '+fmtK(opx)+'.'});
 }
 f.hist.push([h,fol,pago,f.div]);if(f.hist.length>24)f.hist.shift();
 PM.by[S.wi].forEach(function(id){var d=S.W.p[id];d[DD.MO]=Math.min(d[DD.MO],PM.moralCap())});
 ev.push({k:'folhaAnim',d:{antes:cxAntes,fix:fix,opx:opx,fol:fol,divAnt:divAnt,pago:pago,atraso:novoAtraso,depois:S.caixa,mes:f.mes,conf:Math.round(f.conf)}});
 return ev};
PM.pagarAgora=function(v,t){S.caixa-=v;S.fin.hist};
PM.ffpOk=function(extraSal){return (PM.folhaAno()+extraSal)<=PM.cfg.ffp_folha_receita*PM.receitaAno()};

/* ---------- elegibilidade (regras, vetos, prestígio) ---------- */
PM.regrasClube=function(ci){var r=PM.B.cl[ci][CI.REGRAS];return r?String(r).split(';'):[]};
PM.elegivel=function(id,ci){
 var b=PM.B.j[id],d=S.W.p[id],B=PM.B,rg=PM.regrasClube(ci),i,r;
 if(B.vet[id+'|'+ci]===0)return {ok:false,m:'O jogador jamais jogaria neste clube (rivalidade/identidade)'};
 for(i=0;i<rg.length;i++){r=rg[i].split(':');
  if(r[0]==='BASCO_ESTRITO'&&b[JI.ORIG]!=='País Basco')return {ok:false,m:'Política do clube: só contrata jogadores do País Basco'};
  if(r[0]==='BASCO_PREF'&&b[JI.ORIG]!=='País Basco'&&b[JI.NAC]!=='Espanha')return {ok:false,m:'Política do clube: prefere jogadores bascos ou espanhóis'};
  if((r[0]==='LIM_ESTRANGEIROS'||r[0]==='LIM_INTERNACIONAIS')&&PM.foreign(id,ci)){var n=PM.by[ci].filter(function(x){return PM.foreign(x,ci)}).length;if(n>=Number(r[1]))return {ok:false,m:'Limite de '+r[1]+' '+(r[0]==='LIM_ESTRANGEIROS'?'estrangeiros':'jogadores internacionais')+' atingido'}}}
 var piso=PM.piso(id),pr=S.W.c[ci].pr,fm=PM.fama(id);
 if(fm>=PM.cfg.piso_craque_fama&&pr<PM.cfg.piso_craque_min)return {ok:false,m:'Craque de topo não aceita um clube deste patamar'};
 if(piso-pr>12)return {ok:false,m:'O jogador não aceitaria um clube de prestígio tão menor'};
 return {ok:true,m:''}};
PM.interesse=function(id,ci){ /* qualitativo, para a ficha */
 var e=PM.elegivel(id,ci);if(!e.ok)return 'Nenhum';var df=S.W.c[ci].pr-PM.piso(id);return df>=8?'Alto':df>=0?'Médio':'Baixo'};

/* ---------- preço pedido pelo clube vendedor ---------- */
PM.precoPedido=function(id,de,para,o){
 o=o||{};var c=PM.B.cl[de],b=PM.B.j[id],d=S.W.p[id],W=S.W,cfg=PM.cfg,m=1,rs=pmSeed((o.seed||0)+id*7);
 m*={Vendedor:.92,Neutro:1.08,Intransigente:1.28}[c[CI.POSTURA]]||1;
 var ltp=S.W.lt&&S.W.lt[id];if(ltp===1)m*=.85;else if(ltp===2)m*=.9;
 var mr=PM.mesesRest(id);if(mr<=6)m*=.35+.65*mr/6*0.5;else if(mr<=12)m*=.6+.4*(mr-6)/6;
 if(d[DD.I]>=34)m*=.7;else if(d[DD.I]>=32)m*=.88;
 if(b[JI.FORM]==='Sim'&&b[JI.FID]>=85&&b[JI.CL]===de)m*=1.3;
 if(PM.B.cl[de][CI.RIV].split(';').indexOf(PM.B.cl[para][CI.ID])>=0)m*=1.5;
 if(c[CI.PRES]==='Pão-duro')m*=1.05;else if(c[CI.PRES]==='Emotivo'&&b[JI.FORM]==='Sim')m*=1.15;
 m*=({aquecido:cfg.clima_aquecido,frio:cfg.clima_frio}[W.clima])||1;
 var rm=para===S.wi?S.repMer:W.c[para].rm;if(rm<50)m*=1+(50-rm)/200;else m*=1-(rm-50)/600;
 var dep=c[CI.DEP];m*=1-.15*pmC(dep,0,100)/100;
 var top=PM.by[de].slice().sort(function(a,b2){return S.W.p[b2][DD.O]-S.W.p[a][DD.O]}).slice(0,3);if(top.indexOf(id)>=0)m*=1.15;
 m=Math.min(m,2.0);var jj=PM.janela();if(!jj.aberta)m*=(o.fj||2.2);else if(jj.ultimo&&dep>=40)m*=.93;
 m*=1+(rs()*2-1)*cfg.ruido_pct/100;
 return Math.round(PM.valor(id)*m)};
PM.intocavel=function(id,de){
 if(S.W.lt&&S.W.lt[id])return false; /* listado nunca é intocável */
 var c=PM.B.cl[de],b=PM.B.j[id],d=S.W.p[id],top=PM.by[de].slice().sort(function(a,b2){return S.W.p[b2][DD.O]-S.W.p[a][DD.O]})[0];
 if(c[CI.POSTURA]==='Intransigente'&&top===id&&S.W.c[de].pr>=85)return true;
 if(b[JI.FORM]==='Sim'&&b[JI.FID]>=92&&b[JI.CL]===de&&c[CI.POSTURA]!=='Vendedor')return true;
 return false};

/* ---------- valor de uma oferta em € mil, comparável ao preço pedido ---------- */
PM.valorOferta=function(of,ask){
 var v=of.valor||0,pa=of.parc||1,i;
 v*=1-.025*(pa-1);
 (of.bonus||[]).forEach(function(b){v+=.5*b.valor});
 v+=(of.rev||0)/100*.3*ask;
 if(of.rec)v+=.04*ask;
 var tr=0;(of.troca||[]).forEach(function(id){var d=S.W.p[id],u=PM.valor(id)*(d[DD.I]<=30?1:.7)*(PM.mesesRest(id)<=6?.6:1);tr+=u});
 v+=Math.min(tr,.7*ask+ (of.valor||0)*0);
 if(of.emp){var e=of.emp;v=(e.taxa||0)+(e.t==='obrig'?.85*(e.valorOpc||0):e.t==='opcao'?.12*(e.valorOpc||0):0)+tr*0;v+=Math.min(tr,.5*ask)}
 return Math.round(v)};
PM.nota=function(vo,ask,rod,seed){
 var cfg=PM.cfg,ratio=vo/Math.max(1,ask),hu=(pmSeed(seed+rod*13)()*2-1)*3;
 return pmC(Math.round(60+(ratio-.85)*(25/.15)+hu),0,100)};
PM.tensao=function(p){return p>=70?['Calma',0]:p>=45?['Atenção',1]:p>=20?['Tensa',2]:['Quase rompendo',3]};

/* ---------- negociações do usuário ---------- */
PM.neg={};
PM.negPorJog=function(jid){return S.neg.filter(function(n){return n.j===jid&&['aberta','jogador','medico','espera','congelada'].indexOf(n.est)>=0})[0]};
PM.neg.abrir=function(jid){
 var d=S.W.p[jid],me=S.wi;if(PM.negPorJog(jid))return {ok:false,m:'Você já está negociando por este jogador.'};
 if(d[DD.C]===me)return {ok:false,m:'O jogador já é do seu clube.'};
 var el=PM.elegivel(jid,me);if(!el.ok)return {ok:false,m:el.m};
 if(PM.recente(jid))return {ok:false,m:'Este jogador já se transferiu nesta janela e não pode ser negociado de novo agora.'};
 var n={id:S.nid++,j:jid,de:d[DD.C],est:'aberta',fase:'clube',pac:PM.cfg.paciencia_inicial,rod:0,seed:pmR(1,1e9),ask:0,fj:1,msgs:[],pend:null,of:null,ct:null,jog:null,dia:S.hoje,livre:d[DD.C]===-1,ate:0};
 var jn=PM.janela();S.cnt.ab++;
 if(n.livre){n.fase='jogador';n.msgs.push({q:'c',t:'Jogador sem clube: pode ser contratado a qualquer momento. Faça a proposta de contrato.'});S.neg.push(n);return {ok:true,n:n}}
 if(PM.intocavel(jid,n.de)){n.est='recusada';n.msgs.push({q:'c',t:PM.B.j[jid][JI.NOME]+' não está à venda.'});S.neg.push(n);return {ok:true,n:n}}
 if(!jn.aberta){
  var c=PM.B.cl[n.de],ch=PM.cfg.chance_fora_janela*(S.W.lt&&S.W.lt[jid]?4:1)*({Vendedor:2,Neutro:1,Intransigente:.3}[c[CI.POSTURA]]||1)*(.5+c[CI.DEP]/50);
  if(Math.random()>ch){n.est='recusada';n.msgs.push({q:'c',t:'Estamos fora da janela de transferências. Não negociamos agora.'});S.neg.push(n);return {ok:true,n:n}}
  n.fj=PM.cfg.prem_fora_janela_min+Math.random()*(PM.cfg.prem_fora_janela_max-PM.cfg.prem_fora_janela_min);
  n.msgs.push({q:'c',t:'Fora da janela não costumamos negociar, mas ouvimos. Vai custar caro.'})}
 else n.msgs.push({q:'c',t:'Estamos dispostos a conversar. Envie sua proposta.'});
 n.ask=PM.precoPedido(jid,n.de,me,{seed:n.seed,fj:n.fj});
 S.neg.push(n);return {ok:true,n:n}};
PM.neg.upfront=function(of){var up=(of.valor||0)/(of.parc||1);if(of.emp)up=of.emp.taxa||0;return Math.round(up)};
PM.neg.oferta=function(n,of){
 if(n.est!=='aberta'||n.fase!=='clube'||n.pend)return {ok:false,m:'Não é possível enviar proposta agora.'};
 if(!of.valor&&!of.emp&&!(of.troca&&of.troca.length))return {ok:false,m:'Informe um valor, uma troca ou um empréstimo.'};
 if(S.caixa<PM.neg.upfront(of))return {ok:false,m:'Caixa insuficiente para o pagamento inicial.'};
 for(var i=0;i<(of.troca||[]).length;i++)if(PM.by[S.wi].indexOf(of.troca[i])<0)return {ok:false,m:'Jogador de troca inválido.'};
 if((of.troca||[]).length>3)return {ok:false,m:'No máximo 3 jogadores na troca.'};
 n.of=of;n.rod++;n.pend={dia:S.hoje+pmR(1,3),t:'clube'};
 n.msgs.push({q:'u',t:PM.neg.resumo(of)});return {ok:true}};
PM.neg.resumo=function(of){
 var p=[];if(of.emp){p.push('Empréstimo ('+({simples:'simples',opcao:'com opção de compra',obrig:'com obrigação de compra'}[of.emp.t])+') taxa '+fmtK(of.emp.taxa||0)+(of.emp.valorOpc?', compra por '+fmtK(of.emp.valorOpc):''))}
 else if(of.valor)p.push(fmtK(of.valor)+(of.parc>1?' em '+of.parc+' parcelas':''));
 if(of.troca&&of.troca.length)p.push('troca: '+of.troca.map(function(id){return PM.B.j[id][JI.NOME]}).join(', '));
 if(of.bonus&&of.bonus.length)p.push('bônus: '+of.bonus.map(function(b){return fmtK(b.valor)+' por '+b.alvo+' '+({jogos:'jogos',gols:'gols',titulo:'título'}[b.t])}).join('; '));
 if(of.rev)p.push(of.rev+'% de revenda');if(of.rec)p.push('opção de recompra '+fmtK(of.rec.valor)+' até '+of.rec.ate);
 return 'Proposta: '+p.join(' · ')};
PM.neg.resolver=function(n,ev){
  var of=n.of,cfg=PM.cfg,ask=n.ask,vo=PM.valorOferta(of,ask),jn=PM.janela();
 /* empréstimo é comparado com o preço de um empréstimo, não com o preço da compra (antes quase nunca era aceito) */
 if(of.emp){var ee=of.emp,ltn=S.W.lt&&S.W.lt[n.j];ask=Math.max(1,Math.round(n.ask*(.10+(ee.t==='obrig'?.85:ee.t==='opcao'?.12:0))*(ltn===2?.8:1)))}
 var ratio=vo/Math.max(1,ask),sc=PM.nota(vo,ask,n.rod,n.seed);
 n.pend=null;
 if(!PM.negValida(n)){return}
 if(sc>=cfg.aceita_alto){n.fase='jogador';n.pac=Math.min(100,n.pac+5);n.msgs.push({q:'c',t:pmPick(['Fechado. Temos acordo pelo clube. Agora falta convencer o jogador.','Aceitamos os termos. Podem seguir para a conversa com o atleta.'])});ev.push({k:'neg',t:PM.B.cl[n.de][CI.NOME]+' aceitou sua proposta por '+PM.B.j[n.j][JI.NOME]});return}
 if(sc>=cfg.aceita_baixo){var alvo=Math.round(ask*(1+(pmSeed(n.seed+n.rod)()*.06-.03)));n.pac-=8;n.ct=alvo;
  n.msgs.push({q:'c',t:pmPick(['Estamos perto, mas só fechamos em torno de ','Falta pouco. Precisamos de algo perto de ','Podemos conversar se chegar a '])+fmtK(alvo)+'.'});ev.push({k:'neg',t:PM.B.cl[n.de][CI.NOME]+' fez uma contraproposta'});}
 else{var of_=ratio<cfg.oferta_ofensiva_limiar;n.pac-=of_?cfg.paciencia_ofensa:15;n.ct=Math.round(ask);
  if(of_){S.repMer=pmC(S.repMer+cfg.rep_mercado_ofensa,0,100);n.msgs.push({q:'c',t:pmPick(['Isso é um desrespeito. Não vamos perder tempo com propostas assim.','Esse valor ofende o clube e o jogador.'])})}
  else n.msgs.push({q:'c',t:pmPick(['Muito abaixo do que esperamos.','Não é suficiente. Precisa melhorar bastante.'])});
  ev.push({k:'neg',t:PM.B.cl[n.de][CI.NOME]+' recusou sua proposta'})}
 if(n.pac<=0){n.est='congelada';n.ate=S.hoje+cfg.congelar_dias;n.msgs.push({q:'c',t:'Encerramos a conversa por ora. Voltem mais tarde.'});S.repMer=pmC(S.repMer+cfg.rep_mercado_abandono/2,0,100)}};
PM.negValida=function(n){
 var d=S.W.p[n.j];
 if(n.pre){if(d[DD.C]<0&&n.est!=='concluida'){n.est='encerrada';n.msgs.push({q:'c',t:'O jogador já deixou o clube.'});return false}return true}
 if(!n.livre&&d[DD.C]!==n.de){n.est='encerrada';n.msgs.push({q:'c',t:(d[DD.C]>=0?'O jogador foi negociado com '+PM.B.cl[d[DD.C]][CI.NOME]+'.':'O jogador deixou o clube.')});return false}
 if(n.livre&&d[DD.C]!==-1){n.est='encerrada';n.msgs.push({q:'c',t:'O jogador assinou com '+(d[DD.C]>=0?PM.B.cl[d[DD.C]][CI.NOME]:'outro clube')+'.'});return false}
 return true};
PM.neg.encerrar=function(n){
 if(n.fase!=='clube'&&n.fase!=='livre'&&n.est!=='concluida'){S.repMer=pmC(S.repMer+PM.cfg.rep_mercado_abandono,0,100)}
 n.est='encerrada';n.pend=null};
/* ---- fase do jogador ---- */
PM.neg.demanda=function(jid){
 var d=S.W.p[jid],sj=PM.salJusto(jid),b=PM.B.j[jid],ag=PM.B.ag[b[JI.AG]];
 var com=ag?ag[2]:PM.cfg.comissao_agente_padrao;
 return {sal:Math.round(sj*(d[DD.C]===-1?.9:1.1)),anos:d[DD.I]>=32?2:d[DD.I]<=22?5:3,luvas:Math.round(sj*(.2+(ag?ag[3]:50)/200)),com:com}};
PM.neg.propJogador=function(n,pr){
 if(n.fase!=='jogador'||n.est==='congelada'||n.pend)return {ok:false,m:'Não é possível propor agora.'};
 var me=S.wi,tot=pr.luvas+(n.of&&!n.livre?PM.neg.upfront(n.of):0);
 if(S.caixa<tot)return {ok:false,m:'Caixa insuficiente para luvas e pagamento inicial.'};
 if(!PM.ffpOk(pr.sal))return {ok:false,m:'Fair play financeiro: a folha passaria de '+Math.round(PM.cfg.ffp_folha_receita*100)+'% da receita.'};
 n.jog=pr;n.pend={dia:S.hoje+pmR(1,2),t:'jogador'};n.msgs.push({q:'u',t:'Contrato: '+fmtK(pr.sal)+'/ano por '+pr.anos+' anos, luvas '+fmtK(pr.luvas)+', papel: '+pr.papel});return {ok:true}};
PM.neg.avaliaJogador=function(n,pr){
 var jid=n.j,b=PM.B.j[jid],d=S.W.p[jid],me=S.wi,B=PM.B,dem=PM.neg.demanda(jid),pr_=S.W.c[me].pr;
 if(B.vet[jid+'|'+me]===0)return {s:0,m:'Jamais vestiria essa camisa.'};
 var piso=PM.piso(jid),comp=0,sj=PM.salJusto(jid);
 if(B.cl[me][CI.PAIS]==='Arábia Saudita'||B.cl[me][CI.GRUPO]==='PIF (Arábia)')comp=Math.min(20,Math.max(0,(pr.sal/sj-1)*40));else comp=Math.min(10,Math.max(0,(pr.sal/sj-1)*20));
 var s=55+(pr.sal/dem.sal-1)*110+((pr_-(piso-comp))*1.1)+(b[JI.FID]<50?6:0)+(d[DD.MO]-50)*.1;
 s+=({titular:0,rotacao:-4,reserva:-14}[pr.papel]||0)*-1*0; /* papel prometido */
 var rank=PM.by[me].filter(function(x){return S.W.p[x][DD.O]>d[DD.O]&&PM.pos6(x)===PM.pos6(jid)}).length;
 if(pr.papel==='titular'&&rank>=2)s-=10;if(pr.papel==='reserva')s+=6;
 if(B.vet[jid+'|'+me]===1)s-=25;
 if(d[DD.C]>=0&&B.cl[d[DD.C]][CI.RIV].split(';').indexOf(B.cl[me][CI.ID])>=0&&b[JI.FORM]==='Sim')s-=20;
 s+=(b[JI.AMB]-50)*.12*((pr_-S.W.c[d[DD.C]>=0?d[DD.C]:me].pr)/10);
 s-=Math.max(0,(pr.anos-dem.anos))*2;
 s+=(pmSeed(n.seed+77)()*2-1)*5;
 var m=s>=60?'Aceito. Quero jogar aqui.':s>=45?'Estou perto, mas quero mais salário ou um papel melhor.':'Não vejo um projeto que me interesse.';
 return {s:Math.round(s),m:m}};
PM.neg.resolverJogador=function(n,ev){
 n.pend=null;if(!PM.negValida(n))return;var r=PM.neg.avaliaJogador(n,n.jog);
 if(r.s>=60){n.msgs.push({q:'j',t:r.m});n.fase='medico';n.pend={dia:S.hoje+pmR(1,2),t:'medico'};ev.push({k:'neg',t:PM.B.j[n.j][JI.NOME]+' aceitou os termos. Exame médico marcado.'})}
 else{n.pac-=10;n.msgs.push({q:'j',t:r.m});ev.push({k:'neg',t:PM.B.j[n.j][JI.NOME]+' recusou o contrato'});if(n.pac<=0){n.est='congelada';n.ate=S.hoje+PM.cfg.congelar_dias}}};
PM.neg.medico=function(n,ev){
 n.pend=null;if(!PM.negValida(n))return;var b=PM.B.j[n.j],d=S.W.p[n.j];
 var p=.015+b[JI.LES]/1500+Math.max(0,d[DD.I]-30)*.004+(d[DD.L]>0?.4:0);
 if(Math.random()<p){n.est='encerrada';n.msgs.push({q:'c',t:'O exame médico reprovou o jogador. Negócio cancelado.'});ev.push({k:'neg',t:'Exame médico reprovou '+b[JI.NOME]});return}
 var jn=PM.janela();
 if(n.livre||jn.aberta)PM.neg.efetivar(n,ev);
 else{n.est='espera';n.msgs.push({q:'c',t:'Acordo fechado. O jogador se apresenta na abertura da próxima janela.'});ev.push({k:'neg',t:'Acordo com '+b[JI.NOME]+' fechado. Ele chega na próxima janela.'})}};
PM.neg.efetivar=function(n,ev){
 var jid=n.j,me=S.wi,of=n.of||{},pr=n.jog,d=S.W.p[jid],b=PM.B.j[jid],de=d[DD.C],h=PM.msHoje(),W=S.W,jn=PM.janela();
 if(!PM.negValida(n)&&n.est!=='espera')return;
 var up=n.livre?0:PM.neg.upfront(of);
 if(S.caixa<up+pr.luvas){n.est='encerrada';n.msgs.push({q:'c',t:'Faltou caixa na hora de pagar: negócio cancelado.'});return}
 var cx0=S.caixa;S.caixa-=up+pr.luvas;
 if(n.pre){S.pre=S.pre||{};S.pre[jid]={ci:me,sal:pr.sal,anos:pr.anos};d[DD.PC]=me;d[DD.ST]=2;n.est='concluida';n.msgs.push({q:'c',t:b[JI.NOME]+' assinou o pré-contrato e se apresenta quando o contrato dele terminar.'});ev.push({k:'chegou',t:'Pré-contrato assinado com '+b[JI.NOME]});PM.log(PM.meuNome()+' acerta pré-contrato com '+b[JI.NOME]);return}
 var tipo=of.emp?'emp':'compra';
 if(!n.livre){
  var total=PM.valorOferta(of,n.ask);
  W.c[de].cx+=up;
  if(!of.emp){
   (of.troca||[]).forEach(function(id){PM.moverJog(id,de);PM.marcar(id);S.W.p[id][DD.AD]=0});
   if(of.parc>1){var pa=Math.round(of.valor/of.parc);for(var i=1;i<of.parc;i++)S.parc.push({dia:h+i*365*864e5,v:-pa,t:'parcela '+(i+1)+'/'+of.parc+' por '+b[JI.NOME]})}
   (of.bonus||[]).forEach(function(bn){S.bon.push({jid:jid,t:bn.t,alvo:bn.alvo,valor:bn.valor,ate:PM.ano()+1,dir:-1,com:de})});
   if(of.rev||of.rec){var cl=W.cl[jid]=W.cl[jid]||{rev:[],rec:null};if(of.rev)cl.rev.push([de,of.rev]);if(of.rec)cl.rec=[de,of.rec.valor,of.rec.ate]}
   PM.pagaRevenda(jid,total,me);
  }else{
   W.emp.push({jid:jid,orig:de,dest:me,fim:PM.ano()+1,t:of.emp.t,taxa:of.emp.taxa,valor:of.emp.valorOpc||0,cond:of.emp.cond||0});d[DD.EMP]=de}
 }
 PM.moverJog(jid,me);PM.marcar(jid);d[DD.C]=me;
 if(of.emp){d[DD.EMP]=de}else{d[DD.S]=pr.sal;d[DD.F]=PM.ano()+pr.anos;d[DD.EMP]=-1}
 d[DD.ST]=0;d[DD.MO]=pmC(d[DD.MO]+8,5,100);
 if(pr.papel&&pr.papel!=='rotacao')S.prom[jid]={p:pr.papel,j:S.cnt.fe,f:0};
 S.repMer=pmC(S.repMer+PM.cfg.rep_mercado_fechar,0,100);S.cnt.fe++;
 if(!S.W.jan.comp)S.W.jan.comp=[];S.W.jan.comp.push({id:jid,v:up+pr.luvas,o:d[DD.O]});S.W.jan.gasto=(S.W.jan.gasto||0)+up+pr.luvas;
 /* reação da torcida */
 var f=PM.fama(jid);if(f>=85)S.torc=pmC(S.torc+3,0,100);
 if(de>=0&&PM.B.cl[de][CI.RIV].indexOf(PM.B.cl[me][CI.ID])>=0)S.torc=pmC(S.torc-4,0,100);
 n.est='concluida';n.msgs.push({q:'c',t:b[JI.NOME]+' é o novo reforço do seu clube!'});
 ev.push({k:'chegou',id:jid,t:b[JI.NOME]+' foi apresentado como reforço!',d:{ok:true,compra:true,jid:jid,de:de,valor:up+pr.luvas,antes:cx0,depois:S.caixa}});
 PM.log(PM.meuNome()+' contrata '+b[JI.NOME]+(de>=0?' ('+PM.B.cl[de][CI.NOME]+')':' (livre)'));
 PM.xiCache={};PM.sync()};
PM.pagaRevenda=function(jid,preco,pagador){
 var cl=S.W.cl[jid];if(!cl)return;
 cl.rev.forEach(function(r){var v=Math.round(preco*r[1]/100);if(r[0]===S.wi)PM.receber(v);else if(pagador===S.wi)S.caixa-=v;else S.W.c[r[0]].cx+=v})};
/* ---------- ticks diários das negociações ---------- */
PM.tickNeg=function(ev){
 S.neg.forEach(function(n){
  if(n.est==='congelada'&&S.hoje>=n.ate){n.est=n.livre?'jogador':'aberta';n.pac=40;n.msgs.push({q:'c',t:'Podemos voltar a conversar.'});if(!n.livre&&n.est==='aberta'&&n.fase!=='clube')n.est='aberta'}
  if(n.pend&&S.hoje>=n.pend.dia){
   var l0=ev.length;
   if(n.pend.t==='clube')PM.neg.resolver(n,ev);else if(n.pend.t==='jogador')PM.neg.resolverJogador(n,ev);else if(n.pend.t==='medico')PM.neg.medico(n,ev);
   for(var q=l0;q<ev.length;q++)if(ev[q].k==='neg')ev[q].nid=n.id}
  if(n.est==='aberta'||n.est==='jogador'||n.est==='medico'){if(!n.livre&&S.W.p[n.j][DD.C]!==n.de&&n.est!=='concluida')PM.negValida(n)}});
 S.neg=S.neg.filter(function(n){return n.est!=='concluida'||S.hoje-n.dia<60})};
PM.efetivarEspera=function(ev){S.neg.forEach(function(n){if(n.est==='espera')PM.neg.efetivar(n,ev)});S.ofe.forEach(function(o){if(o.est==='espera')PM.ofertas.efetivar(o,ev)})};

/* ---------- ofertas recebidas (a IA quer seus jogadores) ---------- */
PM.ofertas={};
/* ---------- listas do usuário ---------- */
PM.lista=function(){return S.lista||(S.lista={t:[],e:[]})};
PM.listaUser=function(id){var L=PM.lista();return L.t.indexOf(id)>=0?1:L.e.indexOf(id)>=0?2:0};
PM.deslistar=function(id){var L=PM.lista();L.t=L.t.filter(function(x){return x!==id});L.e=L.e.filter(function(x){return x!==id})};
PM.listar=function(id,tipo){
 var d=S.W.p[id];
 if(!d||d[DD.C]!==S.wi)return {ok:false,m:'O jogador não é do seu clube.'};
 if(d[DD.EMP]>=0)return {ok:false,m:'Jogador emprestado ao seu clube não pode ser listado.'};
 if(PM.recente(id))return {ok:false,m:'Jogador contratado nesta janela: não pode ser negociado agora.'};
 var L=PM.lista();PM.deslistar(id);(tipo==='e'?L.e:L.t).push(id);
 return {ok:true,m:PM.B.j[id][JI.NOME]+' entrou na lista de '+(tipo==='e'?'empréstimo':'transferências')+'. Deve atrair mais propostas.'}};

/* ---------- propostas recebidas ---------- */
PM.ofertas.normal=function(o){ /* converte propostas de saves antigos */
 if(o.of)return o;
 o.t='compra';o.of={valor:o.v,parc:1,troca:[],rev:0};o.max=Math.round(o.v*1.15);o.pac=100;o.rod=0;o.seed=o.id||1;o.msgs=[];o.pend=null;o.lst=0;return o};
PM.compradorPara=function(jid,loan){ /* clube que procura o jogador: precisa ter relevância, caixa, vaga e passar nas regras */
 var W=S.W,val=PM.valor(jid),n=PM.B.cl.length,piso=PM.piso(jid),k,ci;
 for(k=0;k<14;k++){ci=pmR(0,n-1);
  if(ci===S.wi||PM.by[ci].length>=29)continue;
  if(W.c[ci].pr<piso-6)continue;
  if(W.c[ci].cx<val*(loan?.15:.7))continue;
  if(!PM.elegivel(jid,ci).ok)continue;
  return ci}
 return -1};
PM.ofertas.gerar=function(buyer,jid,opt,ev){
 opt=opt||{};var W=S.W,d=W.p[jid],cfg=PM.cfg;
 if(!d||d[DD.C]!==S.wi||d[DD.EMP]>=0||PM.recente(jid))return false;
 var abertas=0,dup=false;
 S.ofe.forEach(function(x){if(x.est==='aberta'){abertas++;if(x.j===jid)dup=true}if(x.est==='fechando'&&x.j===jid)dup=true});
 if(dup||abertas>=(cfg.ofertas_max_abertas||40))return false;
 var lt=PM.listaUser(jid),loan=opt.t==='emp'||(lt===2&&Math.random()<.9),val=PM.valor(jid),cx=W.c[buyer].cx,bn=lt?1.1:1;
 var o={id:S.nid++,j:jid,de:buyer,t:loan?'emp':'compra',est:'aberta',dia:S.hoje,exp:S.hoje+10,pac:100,rod:0,seed:pmR(1,1e9),msgs:[],pend:null,cp:null,lst:lt,of:null,max:0,v:0};
 if(loan){
  var tp=pmPick(['simples','simples','opcao','obrig']),taxa=Math.round(val*(.05+Math.random()*.05)),opc=tp==='simples'?0:Math.round(val*(1+Math.random()*.2));
  if(cx<taxa)return false;
  o.of={emp:{t:tp,taxa:taxa,valorOpc:opc,cond:20}};o.v=taxa;
  o.max=Math.round(PM.valorOferta(o.of,val)*(1.2+Math.random()*.3)*bn);
 }else{
  var v=Math.round(val*(.8+Math.random()*.45)*bn);
  if(v>cx)return false;
  o.of={valor:v,parc:1,troca:[],rev:0};o.v=v;
  o.max=Math.min(Math.round(cx*.98),Math.max(Math.round(v*1.03),Math.round(val*(1.05+Math.random()*.3)*bn)));
  o.max=Math.max(o.max,v);
 }
 o.msgs.push({q:'c',t:'Temos interesse no jogador. '+PM.neg.resumo(o.of)});
 S.ofe.push(o);
 if(ev&&cfg.pausa_ofertas!==0)ev.push({k:'ofenova',id:o.id,t:PM.B.cl[buyer][CI.NOME]+(loan?' quer o empréstimo de ':' fez proposta por ')+PM.B.j[jid][JI.NOME]});
 return true};
/* chamada todo dia da janela: jogadores listados pelo usuário atraem propostas extras */
PM.mercadoUser=function(jn,ev){
 var L=PM.lista(),tot=Math.max(1,Math.round((jn.fe-jn.ab)/864e5)+1),dia=Math.round((PM.msHoje()-jn.ab)/864e5),pg=pmC(dia/tot,0,1);
 var p=Math.min(.6,(.12+.2*pg)*(PM.cfg.mult_lista||1));
 L.t.concat(L.e).forEach(function(id){
  if(Math.random()>p)return;
  var loan=L.e.indexOf(id)>=0,ci=PM.compradorPara(id,loan);
  if(ci>=0)PM.ofertas.gerar(ci,id,{t:loan?'emp':'compra'},ev)})};
/* interesse espontâneo: jogadores NÃO listados também recebem propostas */
PM.mercadoInteresse=function(jn,ev){
 var L=PM.lista(),tot=Math.max(1,Math.round((jn.fe-jn.ab)/864e5)+1),
  dia=Math.round((PM.msHoje()-jn.ab)/864e5),pg=pmC(dia/tot,0,1),peso=.5+1.5*pg*pg;
 PM.by[S.wi].slice().forEach(function(id){
  if(L.t.indexOf(id)>=0||L.e.indexOf(id)>=0)return;   /* listados já são tratados em mercadoUser */
  var d=S.W.p[id];
  if(d[DD.EMP]>=0||PM.recente(id))return;
  var f=PM.fama(id),m=PM.mesesRest(id);
  var p=.012*peso*pmC((f-35)/40,.15,2.2)
   *(m<=12?1.5:1)                                         /* contrato acabando atrai mais */
   *(d[DD.I]<=23&&d[DD.P]-d[DD.O]>=8?1.4:1)               /* promessa atrai mais */
   *(PM.cfg.mult_interesse||1);
  if(Math.random()>p)return;
  var ci=PM.compradorPara(id,false);
  if(ci>=0)PM.ofertas.gerar(ci,id,{t:Math.random()<.12?'emp':'compra'},ev)})};
PM.ofertas.responder=function(o,acao){
 var ev=[];PM.ofertas.normal(o);
 if(o.est!=='aberta')return ev;
 if(acao==='recusar'){o.est='recusada';o.pend=null;return ev}
 if(acao==='aceitar')return PM.ofertas.fechar(o,ev);
 return ev};
PM.ofertas.valida=function(o){
 var d=S.W.p[o.j];
 if(d[DD.C]!==S.wi||d[DD.EMP]>=0){o.est='encerrada';o.pend=null;o.msgs.push({q:'c',t:'O jogador não está mais disponível.'});return false}
 return true};
PM.ofertas.fechar=function(o,ev){
 if(!PM.ofertas.valida(o))return ev;
 o.est='fechando';o.pend={dia:S.hoje+pmR(2,5),t:'venda'};
 o.msgs.push({q:'c',t:'Combinado! Estamos finalizando a papelada e o exame médico do jogador.'});
 S.ofe.forEach(function(x){if(x!==o&&x.j===o.j&&x.est==='aberta'){x.est='encerrada';x.pend=null}});
 ev.push({k:'ofe',t:'Proposta aceita. A confirmação chega em alguns dias: avance o calendário.'});
 return ev};
PM.ofertas.concluirVenda=function(o,ev){
 PM.ofertas.normal(o);o.pend=null;
 var W=S.W,jid=o.j,d=W.p[jid],b=PM.B.j[jid],nm=PM.B.cl[o.de][CI.NOME],cx0=S.caixa,motivo='',
  vl=o.of.emp?(o.of.emp.taxa||0):(o.of.valor||0),
  rj=.04+(b[JI.FID]-50)/700+(PM.B.vet[jid+'|'+o.de]===1?.25:0),
  pmed=.01+b[JI.LES]/2000+Math.max(0,d[DD.I]-30)*.004+(d[DD.L]>0?.3:0);
 if(d[DD.C]!==S.wi||d[DD.EMP]>=0)motivo='O jogador não está mais disponível.';
 else if(W.c[o.de].cx<PM.neg.upfront(o.of))motivo=nm+' não conseguiu levantar o dinheiro do pagamento inicial.';
 else if(!PM.elegivel(jid,o.de).ok)motivo='O jogador não aceitou se mudar para o '+nm+'.';
 else if(Math.random()<Math.max(0,rj))motivo=b[JI.NOME]+' recusou as condições pessoais oferecidas pelo '+nm+'.';
 else if(Math.random()<pmed)motivo='O exame médico reprovou o jogador e o '+nm+' desistiu do negócio.';
 if(motivo){
  o.est='falhou';o.msgs.push({q:'c',t:motivo});
  ev.push({k:'vendaFim',t:'Negociação por '+b[JI.NOME]+' fracassou',d:{ok:false,jid:jid,para:o.de,motivo:motivo,valor:vl,antes:cx0,depois:cx0}});return}
 if(!PM.janela().aberta){o.est='espera';ev.push({k:'ofe',t:'Acordo por '+b[JI.NOME]+' fechado. Ele se transfere na próxima janela.'});return}
 PM.ofertas.efetivar(o,ev)};
PM.ofertas.contra=function(o,of){
 PM.ofertas.normal(o);
 if(o.est!=='aberta'||o.pend)return {ok:false,m:'Não é possível enviar uma contraproposta agora.'};
 if(o.t==='emp'){if(!of.emp)return {ok:false,m:'Informe os termos do empréstimo.'}}
 else{
  if(!(of.valor>0)&&!(of.troca&&of.troca.length))return {ok:false,m:'Informe um valor.'};
  if((of.troca||[]).length>2)return {ok:false,m:'No máximo 2 jogadores na troca.'}}
 for(var i=0;i<(of.troca||[]).length;i++)if(PM.by[o.de].indexOf(of.troca[i])<0)return {ok:false,m:'Jogador de troca inválido.'};
 o.cp=of;o.rod++;o.pend={dia:S.hoje+pmR(1,2)};o.exp=Math.max(o.exp,S.hoje+8);
 o.msgs.push({q:'u',t:PM.neg.resumo(of).replace('Proposta:','Sua contraproposta:')});
 return {ok:true}};
PM.ofertas.resolver=function(o,ev){
 var W=S.W,cfg=PM.cfg,cp=o.cp,val=PM.valor(o.j),nm=PM.B.cl[o.de][CI.NOME],jn=PM.B.j[o.j][JI.NOME];
 o.pend=null;
 if(!cp||!PM.ofertas.valida(o))return;
 if(W.c[o.de].cx<PM.neg.upfront(cp)){
  o.pac-=10;o.msgs.push({q:'c',t:'Não temos caixa para esse pagamento à vista. Reduza o valor inicial.'});
 }else{
  var vo=PM.valorOferta(cp,val),r=vo/Math.max(1,o.max),hu=(pmSeed(o.seed+o.rod*13)()*2-1)*.03;
  if(r<=1+hu){
   o.of=cp;o.cp=null;o.msgs.push({q:'c',t:pmPick(['Fechado! Aceitamos os seus termos.','Temos acordo. Vamos fechar.'])});
   ev.push({k:'ofe',t:nm+' aceitou sua contraproposta por '+jn});
   PM.ofertas.fechar(o,ev);return}
  if(r<=1.15){
   var alvo=Math.round(o.max*.97),nova;
   if(o.t==='emp'){var e=cp.emp,extra=(e.t==='obrig'?.85:e.t==='opcao'?.12:0)*(e.valorOpc||0);nova={emp:{t:e.t,taxa:Math.max(0,Math.round(alvo-extra)),valorOpc:e.valorOpc||0,cond:e.cond||20}}}
   else nova={valor:alvo,parc:1,troca:[],rev:0};
   o.of=nova;o.v=o.t==='emp'?nova.emp.taxa:nova.valor;o.pac-=8;
   o.msgs.push({q:'c',t:'Chegamos perto. Podemos fechar nestes termos: '+PM.neg.resumo(nova).replace('Proposta: ','')+'.'});
   ev.push({k:'ofe',t:nm+' fez uma nova proposta por '+jn});
  }else{
   var ofensiva=r>1.5;o.pac-=ofensiva?cfg.paciencia_ofensa:15;
   o.msgs.push({q:'c',t:ofensiva?'Esse pedido está fora da realidade.':'Está acima do que podemos pagar.'});
   ev.push({k:'ofe',t:nm+' recusou sua contraproposta por '+jn});
  }
 }
 if(o.pac<=0){o.est='recusada';o.msgs.push({q:'c',t:'Encerramos a conversa. Desistimos do jogador.'})}};
PM.ofertas.efetivar=function(o,ev){
 PM.ofertas.normal(o);
 var W=S.W,jid=o.j,d=W.p[jid],b=PM.B.j[jid],of=o.of,h=PM.msHoje(),nm=PM.B.cl[o.de][CI.NOME],jnm=b[JI.NOME],rec;
 if(d[DD.C]!==S.wi||d[DD.EMP]>=0){o.est='encerrada';return}
 var up=PM.neg.upfront(of),cx0=S.caixa;
 if(W.c[o.de].cx<up){o.est='encerrada';ev.push({k:'ofe',t:nm+' desistiu: faltou caixa para pagar por '+jnm});return}
 var val=PM.valor(jid),total=PM.valorOferta(of,val);
 PM.receber(up);W.c[o.de].cx-=up;
 if(of.emp){
  W.emp.push({jid:jid,orig:S.wi,dest:o.de,fim:PM.ano()+1,t:of.emp.t,taxa:of.emp.taxa||0,valor:of.emp.valorOpc||0,cond:of.emp.cond||0});
  PM.moverJog(jid,o.de);d[DD.EMP]=S.wi;rec=up;
 }else{
  PM.pagaRevenda(jid,of.valor||total,o.de);
  if(of.parc>1){var pa=Math.round(of.valor/of.parc);for(var i=1;i<of.parc;i++)S.parc.push({dia:h+i*365*864e5,v:pa,t:'parcela '+(i+1)+'/'+of.parc+' pela venda de '+jnm})}
  (of.bonus||[]).forEach(function(bn){S.bon.push({jid:jid,t:bn.t,alvo:bn.alvo,valor:bn.valor,ate:PM.ano()+1,dir:1,com:o.de})});
  (of.troca||[]).forEach(function(id){if(W.p[id][DD.C]===o.de){PM.moverJog(id,S.wi);PM.marcar(id)}});
  if(b[JI.FORM]==='Sim'&&b[JI.FID]>=85){S.torc=pmC(S.torc-5,0,100);PM.by[S.wi].forEach(function(x){W.p[x][DD.MO]=pmC(W.p[x][DD.MO]-3,5,100)})}
  PM.moverJog(jid,o.de);d[DD.S]=PM.salJusto(jid);d[DD.F]=PM.ano()+pmR(2,4);
  if(of.rev){var cl=W.cl[jid]=W.cl[jid]||{rev:[],rec:null};cl.rev.push([S.wi,of.rev])}
  rec=of.valor||total;
 }
 PM.marcar(jid);
 W.jan.receita=(W.jan.receita||0)+rec;(W.jan.vend=W.jan.vend||[]).push({id:jid,v:rec});
 o.est='concluida';o.pend=null;
 S.ofe.forEach(function(x){if(x!==o&&x.j===jid&&x.est==='aberta')x.est='encerrada'});
 ev.push({k:'vendeu',t:jnm+(of.emp?' emprestado ao ':' vendido para ')+nm+' por '+fmtK(rec),
  d:{ok:true,jid:jid,para:o.de,valor:rec,emp:!!of.emp,antes:cx0,depois:S.caixa,parc:(of.parc>1?of.parc:0),troca:(of.troca||[]).length}});
 PM.log(PM.meuNome()+(of.emp?' empresta ':' vende ')+jnm+' ao '+nm);
 PM.xiCache={};PM.sync()};
PM.alvosClube=function(ci,qtd){
 var W=S.W,need={GOL:3,ZAG:4,LAT:4,VOL:3,MEI:4,ATA:6},cnt=PM.contagemPos(ci),cx=W.c[ci].cx,pos=Object.keys(need),media={},por={},res=[],seen={},i;
 pos.forEach(function(p){
  var a=PM.by[ci].filter(function(id){return PM.pos6(id)===p}).map(function(id){return S.W.p[id][DD.O]});
  media[p]=a.length?a.reduce(function(x,y){return x+y},0)/a.length:55;por[p]=[]});
 /* a lista de candidatos é montada uma vez por clube (filtros baratos primeiro) */
 PM.B.cl.forEach(function(c,cj){if(cj===ci)return;PM.by[cj].forEach(function(id){
  var d=S.W.p[id],p=PM.pos6(id),o=d[DD.O];
  if(o<=media[p]+1||o>=media[p]+9||d[DD.EMP]>=0)return;
  var v=PM.valor(id);if(v>cx*.9||v<cx*.02)return;
  if(!PM.elegivel(id,ci).ok)return;
  por[p].push(id);if(W.lt&&W.lt[id])por[p].push(id)})});
 var pesos=pos.map(function(p){return 1+Math.max(0,need[p]-cnt[p])*2}),tot=pesos.reduce(function(a,b){return a+b},0);
 for(i=0;i<qtd*3&&res.length<qtd;i++){
  var r=Math.random()*tot,k=0;for(;k<pos.length-1;k++){r-=pesos[k];if(r<=0)break}
  var l=por[pos[k]];if(!l.length)continue;
  var t=l[Math.floor(Math.random()*l.length)];if(seen[t])continue;seen[t]=1;res.push(t)}
 return res};
/* ---------- listas de transferência/empréstimo dos clubes da IA (W.lt[id]: 1=venda, 2=empréstimo) ---------- */
PM.listarIA=function(){
 var W=S.W;W.lt={};
 PM.B.cl.forEach(function(c,ci){
  if(ci===S.wi)return;var ids=PM.by[ci];if(ids.length<=22)return;
  var ord=ids.slice().sort(function(a,b){return W.p[b][DD.O]-W.p[a][DD.O]});
  var cand=ord.filter(function(id,k){var d=W.p[id];
   if(d[DD.EMP]>=0||d[DD.L]>45||PM.intocavel(id,ci))return false;
   return k>=16||(d[DD.I]>=32&&PM.mesesRest(id)<=12)});
  var n=Math.min(pmR(2,5),cand.length),i;
  for(i=0;i<n;i++){
   var k=pmR(0,cand.length-1),id=cand.splice(k,1)[0],d=W.p[id];
   var emp=(d[DD.I]<=24&&Math.random()<.7)||Math.random()<.12;
   W.lt[id]=emp?2:1}})};
PM.emprestarIA=function(jid,de,para,ev){
 var W=S.W,d=W.p[jid],val=PM.valor(jid),taxa=Math.round(val*(.05+Math.random()*.05)),tp=Math.random()<.3?'opcao':'simples',
  opc=tp==='opcao'?Math.round(val*(1+Math.random()*.25)):0;
 if(W.c[para].cx<taxa)return false;
 W.c[para].cx-=taxa;W.c[de].cx+=taxa;
 W.emp.push({jid:jid,orig:de,dest:para,fim:PM.ano()+1,t:tp,taxa:taxa,valor:opc,cond:0});
 PM.moverJog(jid,para);d[DD.EMP]=de;PM.marcar(jid);return true};
/* jogadores listados se mexem mais, mas as regras (prestígio, vetos, caixa, elenco) continuam valendo */
PM.mercadoLista=function(jn,ev){
 var W=S.W;if(!W.lt)return;
 var tot=Math.max(1,Math.round((jn.fe-jn.ab)/864e5)+1),dia=Math.round((PM.msHoje()-jn.ab)/864e5),pg=pmC(dia/tot,0,1),p=.04*(.4+1.2*pg);
 Object.keys(W.lt).forEach(function(k){
  var jid=+k,tp=W.lt[k],d=W.p[jid];if(!d||Math.random()>p)return;
  var de=d[DD.C];if(de<0||de===S.wi||PM.recente(jid)||d[DD.EMP]>=0||PM.by[de].length<=20)return;
  var piso=PM.piso(jid),n=PM.B.cl.length,t,ci;
  for(t=0;t<10;t++){ci=pmR(0,n-1);
   if(ci===de||ci===S.wi||PM.by[ci].length>=29)continue;
   if(W.c[ci].pr<piso-4)continue;
   if(!PM.elegivel(jid,ci).ok)continue;
   if(tp===2){if(PM.emprestarIA(jid,de,ci,ev))break;continue}
   var ask=PM.precoPedido(jid,de,ci,{seed:0}),vo=ask*(.9+Math.random()*.2);
   if(W.c[ci].cx<vo||PM.nota(vo,ask,0,jid)<PM.cfg.aceita_baixo)continue;
   PM.transferirIA(jid,de,ci,Math.round(vo),ev);break}})};
PM.abrirJanela=function(jn,ev){
 var W=S.W,qtd=Math.max(4,Math.round(4*(PM.cfg.mult_mercado||1)));
 W.jan={aberta:true,ab:jn.ab,fe:jn.fe,tipo:jn.tipo,ult:false,gasto:0,receita:0,comp:[],vend:[],dias:0};
 if(jn.tipo==='Verão'){var r=Math.random();W.clima=r<.25?'aquecido':r<.5?'frio':'normal'}
 PM.listarIA();
 W.ag=[];PM.B.cl.forEach(function(c,ci){if(ci===S.wi)W.ag[ci]=[];else W.ag[ci]=PM.alvosClube(ci,qtd)});
 W.jan.alvoDia=0;PM.efetivarEspera(ev);
 ev.push({k:'abre',t:'A janela de '+jn.tipo.toLowerCase()+' está aberta! Você pode contratar até '+PM.dataStr(jn.fe)+'.'});
 PM.log('Abre a janela de transferências de '+jn.tipo.toLowerCase())};
PM.mercadoIA=function(jn,ev){
 var W=S.W,cfg=PM.cfg,mult=cfg.mult_mercado||1,
  tot=Math.max(1,Math.round((jn.fe-jn.ab)/864e5)+1),dia=Math.round((PM.msHoje()-jn.ab)/864e5),pg=pmC(dia/tot,0,1);
 var peso=.4+2.6*Math.pow(pg,3),n=Math.round(PM.B.cl.length*.045*peso*mult*(W.clima==='aquecido'?1.2:W.clima==='frio'?.8:1)),k;
 for(k=0;k<n;k++){
  var ci=pmR(0,PM.B.cl.length-1);if(ci===S.wi)continue;var al=W.ag[ci];if(!al||!al.length)continue;
  var jid=al.shift(),d=S.W.p[jid],de=d[DD.C];if(de<0||de===ci)continue;
  if(PM.recente(jid)||d[DD.EMP]>=0)continue; /* quem acabou de se transferir ou está emprestado não se mexe */
  if(de===S.wi){if(PM.valor(jid)<=W.c[ci].cx)PM.ofertas.gerar(ci,jid,null,ev);continue}
  var ask=PM.precoPedido(jid,de,ci,{seed:0}),vo=ask*(.85+Math.random()*.3);
  if(PM.intocavel(jid,de))continue;
  if(W.c[ci].cx<vo||PM.by[de].length<=20||PM.by[ci].length>=29)continue;
  if(PM.nota(vo,ask,0,jid)<PM.cfg.aceita_baixo+10)continue;
  PM.transferirIA(jid,de,ci,Math.round(vo),ev)}
 PM.mercadoLista(jn,ev);PM.mercadoUser(jn,ev);PM.mercadoInteresse(jn,ev)};
PM.transferirIA=function(jid,de,para,preco,ev){
 var d=S.W.p[jid],W=S.W;W.c[para].cx-=preco;W.c[de].cx+=preco;PM.pagaRevenda(jid,preco,para);
 PM.moverJog(jid,para);PM.marcar(jid);d[DD.S]=PM.salJusto(jid);d[DD.F]=PM.ano()+pmR(2,4);d[DD.EMP]=-1;d[DD.ST]=0;
 if(preco>=PM.cfg.aceita_alto*1000){ev.push({k:'news',t:PM.B.cl[para][CI.NOME]+' contrata '+PM.B.j[jid][JI.NOME]+' ('+PM.B.cl[de][CI.NOME]+') por '+fmtK(preco)});PM.log(PM.B.cl[para][CI.NOME]+' contrata '+PM.B.j[jid][JI.NOME]+' por '+fmtK(preco))}
 S.neg.forEach(function(n){if(n.j===jid)PM.negValida(n)})};
PM.fecharJanela=function(ev){
 var W=S.W,j=W.jan;W.jan.aberta=false;W.lt={};W.ag=[];
 S.neg.forEach(function(n){if(['aberta','jogador','medico','congelada'].indexOf(n.est)>=0&&n.est!=='espera'&&!n.livre){n.est='encerrada';n.msgs.push({q:'c',t:'A janela fechou. Negociação encerrada.'})}});
 var ab=S.cnt.ab,fe=S.cnt.fe,cfg=PM.cfg;
 if(ab>=8&&fe===0)S.repMer=pmC(S.repMer-5,0,100);else if(ab>fe*3+6)S.repMer=pmC(S.repMer-2,0,100);
 S.cnt={ab:0,fe:0};
 /* IA equilibra elencos: >27 manda os piores para clubes com <22 (sem custo); <22 assina agentes livres ou promessas */
 var i;for(i=0;i<PM.B.cl.length;i++){if(PM.by[i].length>27){var ex=PM.by[i].slice().sort(function(a,b){return W.p[a][DD.O]-W.p[b][DD.O]}).slice(0,PM.by[i].length-27);ex.forEach(function(id){var t=PM.B.cl.map(function(c,x){return x}).filter(function(x){return PM.by[x].length<24&&x!==S.wi}).sort(function(a,b){return Math.abs(W.c[a].pr-W.c[i].pr)-Math.abs(W.c[b].pr-W.c[i].pr)})[0];if(t!==undefined&&i!==S.wi)PM.moverJog(id,t);else if(i!==S.wi)W.p[id][DD.C]=-1,PM.by[i].splice(PM.by[i].indexOf(id),1),W.livres.push(id)})}}
 PM.completarElencos();
 /* balanço da janela */
 var ent=(j.comp||[]),sai=(j.vend||[]),idade=PM.by[S.wi].reduce(function(a,id){return a+W.p[id][DD.I]},0)/Math.max(1,PM.by[S.wi].length);
 var sc=ent.reduce(function(a,x){return a+x.o},0)/Math.max(1,ent.length),liq=(j.receita||0)-(j.gasto||0);
 var nota=ent.length||sai.length?(sc>=78?'A':sc>=72?'B':sc>=66?'C':'D'):'—';
 S.bal={tipo:j.tipo,gasto:j.gasto||0,receita:j.receita||0,liq:liq,comp:ent.map(function(x){return x.id}),vend:sai.map(function(x){return x.id}),idade:Math.round(idade*10)/10,nota:nota};
 ev.push({k:'fecha',t:'A janela de '+j.tipo.toLowerCase()+' fechou.'})};
PM.completarElencos=function(){
 var W=S.W,B=PM.B;
 B.cl.forEach(function(c,ci){if(ci===S.wi)return;
  var n=PM.by[ci].length;while(n<25){
   var need=PM.contagemPos(ci),want={GOL:3,ZAG:4,LAT:4,VOL:3,MEI:4,ATA:6},p=Object.keys(want).sort(function(a,b){return (want[b]-need[b])-(want[a]-need[a])})[0];
   var l=W.livres.filter(function(id){return PM.pos6(id)===p&&W.p[id][DD.C]===-1&&W.p[id][DD.O]<=W.c[ci].pr+5}).sort(function(a,b){return W.p[b][DD.O]-W.p[a][DD.O]});
   if(l.length){var id=l[0];W.livres.splice(W.livres.indexOf(id),1);PM.moverJog(id,ci);W.p[id][DD.S]=Math.round(PM.salJusto(id)*.9);W.p[id][DD.F]=PM.ano()+pmR(1,3)}
   else PM.regen(ci,p);
   n=PM.by[ci].length}})};

/* ---------- agentes livres ---------- */
PM.livresLista=function(){return S.W.livres.filter(function(id){return S.W.p[id][DD.C]===-1})};
PM.livresDia=function(ev){
 var W=S.W,jn=PM.janela(),pr=jn.aberta?.12:.02;
 PM.livresLista().forEach(function(id){
  var d=W.p[id];d[DD.S]=Math.max(40,Math.round(d[DD.S]*.998));
  if(Math.random()>pr*(d[DD.O]>=75?3:d[DD.O]>=65?1.5:.5))return;
  var cand=PM.B.cl.map(function(c,x){return x}).filter(function(x){return x!==S.wi&&PM.by[x].length<27&&PM.elegivel(id,x).ok&&W.c[x].pr>=PM.piso(id)-4&&W.c[x].pr<=PM.piso(id)+26});
  if(!cand.length)return;var ci=pmPick(cand);W.livres.splice(W.livres.indexOf(id),1);PM.moverJog(id,ci);PM.marcar(id);d[DD.F]=PM.ano()+pmR(1,3);d[DD.S]=Math.round(PM.salJusto(id)*.95);
  if(PM.fama(id)>=75)ev.push({k:'news',t:PM.B.cl[ci][CI.NOME]+' contrata o agente livre '+PM.B.j[id][JI.NOME]});});
};

/* ---------- renovações e pré-contrato ---------- */
PM.renov={};
PM.renov.pedido=function(id){var dem=PM.neg.demanda(id),d=S.W.p[id];return {sal:Math.max(Math.round(dem.sal*.98),Math.round(d[DD.S]*.95)),anos:dem.anos,luvas:Math.round(dem.luvas*.5)}};
PM.renov.tentar=function(id,pr){
 var d=S.W.p[id],b=PM.B.j[id],dem=PM.renov.pedido(id);if(d[DD.ST]===1&&d[DD.AD]<30)return {ok:false,m:'O jogador não quer conversar sobre renovação agora.'};
 if(S.caixa<pr.luvas)return {ok:false,m:'Caixa insuficiente para as luvas.'};
 if(!PM.ffpOk(pr.sal-d[DD.S]))return {ok:false,m:'Fair play financeiro: folha acima do limite.'};
 var s=55+(pr.sal/dem.sal-1)*110+b[JI.FID]*.25-12.5+(d[DD.MO]-50)*.3+(b[JI.FORM]==='Sim'?6:0);
 var tr=S.W.c[S.wi].pr-PM.piso(id);s+=Math.min(8,tr*.3)+(b[JI.AMB]>75&&tr<0?tr:0);
 s+=(pmSeed(id+S.nid)()*2-1)*6;s-=Math.max(0,pr.anos-dem.anos)*2;
 if(s>=60){S.caixa-=pr.luvas;d[DD.S]=pr.sal;d[DD.F]=PM.ano()+Math.max(1,pr.anos)+(PM.msHoje()>Date.UTC(PM.ano()+1,5,30)?0:0);d[DD.ST]=0;d[DD.MO]=pmC(d[DD.MO]+6,5,100);PM.sync();return {ok:true,m:b[JI.NOME]+' renovou até '+d[DD.F]+'.'}}
 d[DD.ST]=1;d[DD.AD]=0;return {ok:false,m:s>=45?'Quase lá: o jogador quer mais salário.':'O jogador recusou. Ele pode esperar o contrato acabar e sair de graça.'}};
PM.preContrato=function(id,ci,sal){var d=S.W.p[id];d[DD.PC]=ci;d[DD.ST]=2;d[DD.S]=sal};
PM.preAbertos=function(){ /* jogadores de outros clubes que o usuário pode assinar de graça (<=6 meses) */
 var out=[];S.W.p.forEach(function(d,id){if(!d||d[DD.C]<0||d[DD.C]===S.wi||d[DD.PC]>=0&&d[DD.PC]!==undefined&&d[DD.ST]===2)return;if(PM.mesesRest(id)<=6&&d[DD.EMP]<0)out.push(id)});return out};
PM.preAssinar=function(id){
 var me=S.wi,d=S.W.p[id],b=PM.B.j[id],el=PM.elegivel(id,me);if(!el.ok)return {ok:false,m:el.m};
 var pr=PM.neg.demanda(id);if(!PM.ffpOk(pr.sal))return {ok:false,m:'Fair play financeiro: folha acima do limite.'};
 var n={id:S.nid++,j:id,de:d[DD.C],est:'jogador',fase:'jogador',pac:100,rod:0,seed:pmR(1,1e9),ask:0,fj:1,msgs:[{q:'c',t:'Pré-contrato: o jogador pode assinar de graça e se apresenta quando o contrato dele acabar.'}],pend:null,of:null,ct:null,jog:null,dia:S.hoje,livre:true,pre:true};
 S.neg.push(n);return {ok:true,n:n}};

/* ---------- geração de jovens (reposição do mundo) ---------- */
PM.NOMES={ENG1:[['Jack','Oliver','Harry','Leo','Noah','Tom'],['Smith','Walker','Evans','Clarke','Hughes','Moore']],ESP1:[['Pablo','Hugo','Iker','Marc','Álvaro','Adrián'],['García','Ruiz','Ortega','Molina','Navarro','Vidal']],ITA1:[['Luca','Matteo','Andrea','Marco','Lorenzo','Davide'],['Rossi','Ferrari','Greco','Conti','Bruno','Gallo']],GER1:[['Lukas','Jonas','Felix','Leon','Finn','Max'],['Müller','Schneider','Fischer','Weber','Hoffmann','Keller']],FRA1:[['Lucas','Hugo','Théo','Nathan','Enzo','Tom'],['Martin','Bernard','Dubois','Moreau','Girard','Roux']],BRA1:[['Gabriel','Matheus','João','Pedro','Davi','Enzo'],['Silva','Santos','Oliveira','Souza','Lima','Pereira']],POR1:[['João','Tiago','Rúben','Diogo','Rafael','André'],['Ferreira','Pereira','Costa','Rodrigues','Martins','Sousa']],NED1:[['Daan','Sem','Lars','Thijs','Bram','Jesse'],['de Jong','Bakker','Visser','Smit','Mulder','Bos']],USA1:[['Ethan','Mason','Logan','Tyler','Caleb','Ryan'],['Johnson','Miller','Davis','Wilson','Taylor','Brown']],KSA1:[['Abdullah','Faisal','Salem','Nawaf','Turki','Saud'],['Al-Qahtani','Al-Harbi','Al-Otaibi','Al-Ghamdi','Al-Zahrani','Al-Shehri']]};
PM.MED={ATA:[64,68,56,63,33,66],GOL:[25,18,40,22,64,53],LD:[66,40,58,59,63,65],LE:[67,40,59,59,63,65],MC:[60,57,69,64,57,67],MEI:[64,64,71,70,40,54],PD:[73,64,62,72,36,59],PE:[72,64,62,72,36,58],VOL:[55,46,63,58,67,69],ZAG:[55,30,55,47,71,69]};
PM.papelDe=function(p,a){var N=a[0],O=a[1],P=a[2],Q=a[3],R=a[4],Sx=a[5];
 if(p==='GOL')return 'Goleiro';if(p==='ZAG')return P>=58?'Zagueiro construtor':'Zagueiro de marcação';
 if(p==='LE'||p==='LD')return Q>=R?'Lateral ofensivo':R>=Q+8?'Lateral defensivo':'Lateral equilibrado';
 if(p==='VOL')return P>=R?'Volante construtor':R>=P+6?'Volante destruidor':'Volante equilibrado';
 if(p==='MC')return P-R>=14?'Meia armador':P-R<=6?'Meia box-to-box':'Meia equilibrado';
 if(p==='MEI')return O>=P-4?'Meia atacante':'Armador';
 if(p==='PE'||p==='PD')return O>=Q-4?'Ponta finalizador':'Ponta driblador';
 return Sx>=Q+4?'Centroavante de referência':N>=Sx?'Atacante móvel':'Atacante finalizador'};
PM.regen=function(ci,pos6){
 var W=S.W,c=PM.B.cl[ci],lid=c[CI.LIGA],nm=PM.NOMES[lid]||PM.NOMES.ENG1,id=W.nid++,
  p10=({GOL:['GOL'],ZAG:['ZAG'],LAT:['LE','LD'],VOL:['VOL'],MEI:['MC','MEI'],ATA:['PE','PD','ATA']}[pos6||pmPick(['ZAG','LAT','VOL','MEI','ATA'])]),pos=pmPick(p10),
  o=pmC(Math.round(44+W.c[ci].pr*.2+pmG()*4),38,70),pot=pmC(o+pmR(3,22),o,92),med=PM.MED[pos];
 var att=med.map(function(m){return pmC(Math.round(m+(o-65)+pmG()*3),18,97)}),pj={GOL:'GOL',ZAG:'ZAG',LE:'LAT',LD:'LAT',VOL:'VOL',MC:'MEI',MEI:'MEI',PE:'ATA',PD:'ATA',ATA:'ATA'}[pos];
 var idade=pmR(16,19),fama=pmC(Math.round((o-40)*1.25+(pot-o)*.3+W.c[ci].pr*.28),1,99);
 var sal=Math.max(60,Math.round(Math.exp(-8.0368+.1427*o)*254*1.0)),
  b=[id,ci,pmPick(nm[0])+' '+pmPick(nm[1]),c[CI.PAIS],idade,pos,'',pmPick(['Direito','Direito','Esquerdo']),pmR(2,4),pmR(168,194),o,pot,att[0],att[1],att[2],att[3],att[4],att[5],sal/254*1000/1000,sal/1000,PM.ano()+pmR(2,4),sal/1000*8,pmR(40,90),pmR(40,90),pmR(40,90),pmR(40,90),pmR(25,60),pmR(15,50),pmR(40,90),'Promessa',0,'Sim','Não',pj,PM.papelDe(pos,att),fama,0,'','','',  'AG'+('0'+pmR(1,30)).slice(-2)];
 W.nb.push(b);PM.B.j[id]=b;
 W.p[id]=[ci,o,pot,idade,sal,PM.ano()+pmR(2,4),0,100,62,0,0,0,0,0,0,65,0,0,0,-1,-1,0,0,0,0,[]];
 W.p[id][DD.V]=PM.valor(id);PM.by[ci].push(id);return id};

/* ---------- rotina diária (chamada a cada dia do calendário) ---------- */
PM.sync=function(){ /* recria S.elenco como visão viva do elenco do usuário */
 S.elenco=PM.elencoView(S.wi);
 if(S.esq&&S.esq.slots){S.esq.slots=S.esq.slots.filter(function(s){return PM.by[S.wi].indexOf(s.id)>=0});}
};
PM.transicoes=function(ev){
 var jn=PM.janela(),W=S.W,was=W.jan&&W.jan.aberta;
 if(jn.aberta&&!was)PM.abrirJanela(jn,ev);
 else if(jn.aberta&&jn.ultimo&&!W.jan.ult){W.jan.ult=true;ev.push({k:'ultimo',t:'Hoje é o último dia da janela de transferências!'})}
 else if(!jn.aberta&&was)PM.fecharJanela(ev)};
PM.dia=function(){
 var ev=[],W=S.W,i,user=S.wi,cap=PM.moralCap();
 W.p.forEach(function(d,id){if(!d||d[DD.C]<-1)return;
  d[DD.FI]=Math.min(100,d[DD.FI]+(d[DD.L]>0?1.5:3.5));if(d[DD.L]>0)d[DD.L]--;d[DD.AD]++;
  d[DD.MO]=d[DD.MO]+(62-d[DD.MO])*.012;if(d[DD.C]===user&&d[DD.MO]>cap)d[DD.MO]=cap});
 PM.transicoes(ev);
 var dt=new Date(PM.msHoje());if(dt.getUTCDate()===1&&S.hoje>PM.inicioTemporada()+1){PM.mensal().forEach(function(e){ev.push(e)})}
 var jn=PM.janela();if(jn.aberta)PM.mercadoIA(jn,ev);
 if(jn.aberta&&Math.random()<.3){var tp=PM.by[pmR(0,PM.B.cl.length-1)];var rid=tp&&tp.length?pmPick(tp):0;if(rid&&PM.fama(rid)>=70){var rc=pmR(0,PM.B.cl.length-1);if(rc!==S.W.p[rid][DD.C])PM.log('Rumor: '+PM.B.j[rid][JI.NOME]+' ('+PM.B.cl[S.W.p[rid][DD.C]][CI.NOME]+') interessa ao '+PM.B.cl[rc][CI.NOME]+(Math.random()<.5?'' :' (sem confirmação)'))}}
 PM.livresDia(ev);PM.tickNeg(ev);
 S.ofe.forEach(function(o){PM.ofertas.normal(o);
if(o.est==='fechando'){if(!o.pend||S.hoje>=o.pend.dia)PM.ofertas.concluirVenda(o,ev);return}
  if(o.est!=='aberta')return;
  if(S.W.p[o.j][DD.C]!==S.wi){o.est='encerrada';o.pend=null;return}
  if(o.pend&&S.hoje>=o.pend.dia){var l1=ev.length;PM.ofertas.resolver(o,ev);for(var q2=l1;q2<ev.length;q2++)if(ev[q2].k==='ofe')ev[q2].oid=o.id}
  if(o.est==='aberta'&&!o.pend&&S.hoje>=o.exp)o.est='expirada'});S.ofe=S.ofe.filter(function(o){return o.est==='aberta'||o.est==='espera'||o.est==='fechando'||S.hoje-o.dia<30});
 if(S.fin.conf<100&&dt.getUTCDay()===1&&S.fin.mes===0)S.fin.conf=Math.min(100,S.fin.conf+1);
 PM.jogarMundoDia(S.hoje);
 return ev};

/* ---------- depois de uma partida do usuário ---------- */
PM.ritmo=function(jogou){
 var W=S.W,ban=(S.esq&&S.esq.banco)||[];
 PM.by[S.wi].forEach(function(id){
  var d=W.p[id],fg=d[DD.FG]||0,b=PM.B.j[id];
  if(jogou[id]){d[DD.FG]=Math.max(0,fg-3);return}
  if(ban.indexOf(id)>=0){d[DD.FG]=Math.max(0,fg-1);return}
  fg++;d[DD.FG]=fg;
  if(fg>=3)d[DD.MO]=pmC(d[DD.MO]-Math.min(4,1+.4*(fg-3))*(b[JI.AMB]>70?1.25:1),5,100);
  if(fg>=2)d[DD.N]=Math.max(40,d[DD.N]-Math.min(5,fg-1));
  if(fg===5)PM.log(b[JI.NOME]+' reclama de estar fora dos planos do treinador');
  if(fg%8===0&&d[DD.O]>40)d[DD.O]--})};
 PM.aposPartida=function(M){
 var W=S.W,casa=M.casa,gf=casa?M.gh:M.ga,gs=casa?M.ga:M.gh,me=S.wi;
 [['meu',M.meu,me,gf,gs],['opp',M.opp,M.oppWi,gs,gf]].forEach(function(x){
  var t=x[1],ci=x[2],a=x[3],b=x[4];if(ci===undefined||ci===null)return;
  var gols=t.gols||{},ass={},ids=t.slots.map(function(s){return s.id}).concat(Object.keys(t.saiu||{}).map(Number)),mins={};
  ids.forEach(function(id){mins[id]=(t.saiu&&t.saiu[id])?60:90});
  PM.by[ci].forEach(function(id){if(ids.indexOf(id)<0)delete mins[id]});
  /* os que entraram valem 30 min */
  var starters=(t.titIni||[]);t.slots.forEach(function(s){if(starters.length&&starters.indexOf(s.id)<0)mins[s.id]=30});
  Object.keys(gols).forEach(function(id){for(var k=0;k<gols[id];k++)if(Math.random()<.7){var cand=Object.keys(mins).map(Number).filter(function(z){return z!==+id});if(cand.length){var a2=pmEsc(cand,function(z){return ((PM.pesoGol[PM.pos6(z)]||0)+.5)*(PM.efOv(z)/70)});ass[a2]=(ass[a2]||0)+1}}});
  var res=a>b?.35:a<b?-.3:0,avg=0,n=0;Object.keys(mins).forEach(function(id){avg+=W.p[id][DD.O];n++});avg/=Math.max(1,n);
  Object.keys(mins).forEach(function(id){id=+id;var d=W.p[id],g=gols[id]||0,as=ass[id]||0,p=PM.pos6(id),mn=mins[id];
   var nota=pmC(6+.9*g+.5*as+res+((b===0&&(p==='GOL'||p==='ZAG'||p==='LAT'))?.4:0)+(p==='GOL'?-.12*b:0)+(d[DD.O]-avg)/40+pmG()*.55-(t.am&&t.am[id]?.1:0),3.5,10);
   d[DD.J]++;if(x[0]==='opp')d[DD.MN]+=mn;d[DD.G]+=g;d[DD.A]+=as;d[DD.AM]+=(t.am&&t.am[id])?1:0;d[DD.CJ]++;d[DD.CG]+=g;d[DD.CA]+=as;d[DD.NS]+=Math.round(nota*10);d[DD.N]=Math.round(d[DD.N]*.7+nota*10*.3);
   if(Math.random()<.0009*(1+PM.B.j[id][JI.LES]/80)*(d[DD.FI]<50?1.8:1)*(mn/90))d[DD.L]=pmPick([7,10,14,21,30,45,70,110])});
  var dm=a>b?1.2:a<b?-1.5:0;PM.by[ci].forEach(function(id){var d=W.p[id],u=mins[id]!==undefined;d[DD.MO]=pmC(d[DD.MO]+(u?dm:dm-(PM.efOv(id)>=avg+2?.8:0)),5,100)})});
 var jogou={};(M.meu.titIni||[]).concat(M.meu.slots.map(function(s){return s.id}),Object.keys(M.meu.saiu||{}).map(Number)).forEach(function(id){jogou[id]=1});PM.ritmo(jogou);
  /* promessas de papel */
 Object.keys(S.prom).forEach(function(k){var pr=S.prom[k],jid=+k;if(PM.by[me].indexOf(jid)<0){delete S.prom[k];return}
  var tit=S.esq.slots.some(function(s){return s.id===jid});
  if(pr.p==='titular'){pr.f=tit?0:pr.f+1;if(pr.f>=3&&!pr.q){pr.q=1;W.p[jid][DD.MO]=pmC(W.p[jid][DD.MO]-12,5,100);PM.log(PM.B.j[jid][JI.NOME]+' reclama: prometeram que ele seria titular')}else if(tit)pr.q=0}});
 /* entrosamento do usuário e moral média do grupo */
 PM.atualizaEntro(me,S.esq.slots,S.esq.form);
 S.moral=Math.round(PM.by[me].reduce(function(a,id){return a+W.p[id][DD.MO]},0)/Math.max(1,PM.by[me].length));
 PM.xiCache={}};

/* ---------- fim de temporada: contratos, evolução, aposentadoria, bônus, empréstimos, prestígio ---------- */
PM.fimTemporada=function(posUser,ligaUser,tabLigas){
 var W=S.W,B=PM.B,ano=PM.ano(),out={saem:[],chegam:[],aposent:[],prog:[],bon:[],emp:[],evol:[],mens:[]},i,me=S.wi;
 /* meses que o calendário pula (mar a jun): folha e receitas */
 for(i=0;i<4;i++)PM.mensal().forEach(function(e){if(e.k==='atraso')out.mens.push(e.t)});
 /* 1) bônus por metas */
 S.bon=S.bon.filter(function(b){
  var d=S.W.p[b.jid],ok=b.t==='jogos'?d[DD.J]>=b.alvo:b.t==='gols'?d[DD.G]>=b.alvo:false;
  if(ok){if(b.dir<0){S.caixa-=b.valor;out.bon.push('Bônus pago: '+fmtK(b.valor)+' por '+PM.B.j[b.jid][JI.NOME])}else{PM.receber(b.valor);out.bon.push('Bônus recebido: '+fmtK(b.valor))}return false}
  return b.ate>ano});
 /* 2) empréstimos */
 W.emp=W.emp.filter(function(e){
  var d=S.W.p[e.jid],nm=PM.B.j[e.jid][JI.NOME];
  if(e.fim>ano+1)return true;
  var compra=false;
  if(e.t==='obrig')compra=(d[DD.J]>=e.cond);else if(e.t==='opcao'){if(e.dest===me){S.pendOp.push({jid:e.jid,orig:e.orig,valor:e.valor});d[DD.EMP]=-1;return false}compra=Math.random()<.6&&d[DD.N]>=66}
  if(compra){var v=e.valor;if(e.dest===me){S.caixa-=v;out.emp.push(nm+': compra obrigatória de '+fmtK(v)+' ativada')}else if(e.orig===me){PM.receber(v);out.emp.push(nm+' comprado por '+fmtK(v))}else{W.c[e.dest].cx-=v;W.c[e.orig].cx+=v}d[DD.EMP]=-1;d[DD.F]=ano+pmR(2,4)}
  else{PM.moverJog(e.jid,e.orig);d[DD.EMP]=-1;if(e.dest===me)out.emp.push(nm+' volta ao '+PM.B.cl[e.orig][CI.NOME])}
  return false});
 /* 3) recompra */
 Object.keys(W.cl).forEach(function(k){var c=W.cl[k],jid=+k;if(!c.rec)return;var d=S.W.p[jid];
  if(c.rec[2]<ano){c.rec=null;return}
  if(d[DD.C]!==c.rec[0]&&PM.valor(jid)>c.rec[1]*1.4&&c.rec[0]!==me&&Math.random()<.5){var v=c.rec[1];if(d[DD.C]===me){PM.receber(v);out.emp.push(PM.B.j[jid][JI.NOME]+': recompra exercida por '+PM.B.cl[c.rec[0]][CI.NOME]+' ('+fmtK(v)+')')}PM.moverJog(jid,c.rec[0]);c.rec=null}});
 /* 4) idade, evolução e valor */
 W.p.forEach(function(d,id){if(!d||d[DD.C]<-1)return;var b=PM.B.j[id];
  d[DD.I]++;var a=d[DD.I],o=d[DD.O],pot=d[DD.P],min=d[DD.MN],nm=d[DD.J]?d[DD.NS]/10/d[DD.J]:6.2;
  var dl;if(a<=23)dl=(pot-o)*.2+(min>1200?.6:min>400?0:-.8)+(nm-6.4)*1.1;else if(a<=29)dl=(pot-o)*.05+(nm-6.5)*.6;else dl=-(.4+(a-29)*.35)+(nm-6.5)*.3;
  dl+=pmG()*1.1;if(d[DD.L]>60)dl-=1;var cap=PM.cfg.progressao_teto_ano+(a<=21&&Math.random()<.03?2:0);
  dl=pmC(Math.round(dl),-6,cap);var no=pmC(o+dl,35,Math.max(pot,o)+(a<=21?1:0));if(a>=33)no=Math.min(no,o);
  d[DD.O]=no;if(a<=24&&pot<no)d[DD.P]=no;d[DD.P]=Math.max(no,pmC(Math.round(pot+(a<=23?pmG()*1.2:-1)),no,95));
  if(d[DD.C]===me&&dl!==0)out.evol.push([id,dl]);
  d[DD.H].push([ano,no,Math.round(d[DD.V]/1000*10)/10]);if(d[DD.H].length>4)d[DD.H].shift();
  d[DD.J]=0;d[DD.MN]=0;d[DD.FG]=0;d[DD.G]=0;d[DD.A]=0;d[DD.AM]=0;d[DD.VM]=0;d[DD.NS]=0;d[DD.N]=65;d[DD.FI]=100;d[DD.L]=0});
 /* 5) aposentadorias */
 W.p.forEach(function(d,id){if(!d||d[DD.C]<-1)return;var a=d[DD.I];
  if(a>=PM.cfg.aposentadoria_idade&&Math.random()<(a-PM.cfg.aposentadoria_idade+1)*.22+(d[DD.O]<65?.2:0)){
   if(d[DD.C]===me)out.aposent.push(id);PM.moverJog(id,-1);d[DD.C]=-2;var k=W.livres.indexOf(id);if(k>=0)W.livres.splice(k,1)}});
 /* 6) contratos que acabam em 30/06 do próximo ano de calendário */
 var fimAno=ano+1;
 W.p.forEach(function(d,id){if(!d||d[DD.C]<0||d[DD.F]>fimAno)return;if(d[DD.EMP]>=0)return;var ci=d[DD.C];
  if(d[DD.PC]>=0&&d[DD.ST]===2){var pc=d[DD.PC],pp=S.pre&&S.pre[id];PM.moverJog(id,pc);d[DD.F]=fimAno+(pp?pp.anos:pmR(2,4));if(pp)d[DD.S]=pp.sal;if(S.pre)delete S.pre[id];d[DD.ST]=0;d[DD.PC]=-1;if(pc===me)out.chegam.push(id);if(ci===me)out.saem.push(id);return}
  if(ci===me){W.p[id][DD.ST]=W.p[id][DD.ST];out.saem.push(id);PM.moverJog(id,-1);W.livres.push(id);d[DD.F]=fimAno+1;return}
  var top=PM.by[ci].slice().sort(function(a,b){return W.p[b][DD.O]-W.p[a][DD.O]}).indexOf(id)<16,b=PM.B.j[id];
  var renova=Math.random()<(top?.78:.3)&&Math.random()<(.45+b[JI.FID]/200+(W.c[ci].pr>=PM.piso(id)?.15:-.1));
  if(renova){d[DD.F]=fimAno+pmR(2,4);d[DD.S]=Math.round(PM.salJusto(id)*1.0)}
  else{var dest=-1;if(d[DD.O]>=72&&Math.random()<.6){var cs=PM.B.cl.map(function(c,x){return x}).filter(function(x){return x!==ci&&x!==me&&PM.by[x].length<27&&PM.elegivel(id,x).ok&&W.c[x].pr>=PM.piso(id)-4});if(cs.length)dest=pmPick(cs)}
   if(dest>=0){PM.moverJog(id,dest);d[DD.F]=fimAno+pmR(2,4);d[DD.S]=Math.round(PM.salJusto(id)*1.05);if(PM.fama(id)>=80)PM.log(b[JI.NOME]+' deixa o '+PM.B.cl[ci][CI.NOME]+' de graça e assina com o '+PM.B.cl[dest][CI.NOME])}
   else{PM.moverJog(id,-1);W.livres.push(id);d[DD.F]=fimAno+1;if(PM.fama(id)>=80)PM.log(b[JI.NOME]+' deixa o '+PM.B.cl[ci][CI.NOME]+' de graça')}}});
 W.livres=W.livres.filter(function(id){return W.p[id][DD.C]===-1});
 /* pré-contratos ficam sem efeito ao virar a temporada */
 /* 7) prestígio dos clubes pela posição final */
 Object.keys(B.liga).forEach(function(lid){
  var ord=lid===ligaUser?tabLigas.user:PM.ordemLiga(lid),n=ord.length;
  ord.forEach(function(ci,k){var c=W.c[ci],base=Math.round(c.pr);var delta=k===0?2.5:k<3?1.2:k<n*.4?.4:k<n*.7?-.2:k<n-3?-.7:-1.4;
   var alvo=PM.B.cl[ci][CI.REP]+(k===0?3:0);c.pr=pmC(c.pr+delta+(alvo-c.pr)*.04,25,99);if(k===0)c.t++;c.cx+=Math.round(PM.B.cl[ci][CI.REC]*1000*.05*(.5+(n-k)/n))})});
 /* 8) categorias de base e livres sem clube */
 W.livres.forEach(function(id){var d=W.p[id];if(d[DD.C]!==-1)return;if((d[DD.I]>=32&&Math.random()<.4)||(d[DD.O]<52&&Math.random()<.35)){d[DD.C]=-2}});
 W.livres=W.livres.filter(function(id){return W.p[id][DD.C]===-1});
 B.cl.forEach(function(c,ci){var l=PM.by[ci];
  if(ci===me){out.base=PM.regen(ci);return}
  PM.regen(ci);l=PM.by[ci];
  while(l.length>26){var w=l.slice().sort(function(a,b){return (W.p[a][DD.O]+(W.p[a][DD.I]>=31?-3:0))-(W.p[b][DD.O]+(W.p[b][DD.I]>=31?-3:0))})[0];PM.moverJog(w,-1);W.p[w][DD.F]=fimAno+1;W.livres.push(w)}});
 PM.completarElencos();
 W.p.forEach(function(d,id){if(d&&d[DD.C]>=-1)d[DD.V]=PM.valor(id)});
 PM.by.forEach(function(l,ci){var a=l.length;});
 PM.xiCache={};return out};
/* =====================================================================
   PM TELAS  (Mercado, Ficha do jogador, Negociação, Contratos, avisos de janela)
   Cole logo DEPOIS do motor (partes 1 e 2). Usa os helpers do seu código:
   $, esc, S, fmtK, modal, toast, render, salvar, crest, mono, bar, tile, ico, POS, grupoPos, ovCls, corFis
   ===================================================================== */
var PMUI={sub:'buscar',ord:'o',dir:-1,f:{nome:'',pos:'',nac:'',imin:'',imax:'',omin:'',omax:'',vmax:'',liga:'',tipo:'',cont:''},nf:null,nid:0,fid:0};
PMUI.carregar=function(){return PM.B?Promise.resolve():api({acao:'mundo'}).then(function(r){PM.init(r)})};
PMUI.css=function(){
 if(document.getElementById('pm-css'))return;var s=document.createElement('style');s.id='pm-css';
 s.textContent=
 '.pmov{position:fixed;inset:0;background:var(--bg);z-index:95;overflow:auto;display:none;padding:14px}.pmov.on{display:block}.pmw{max-width:1000px;margin:0 auto}'+
 '.mkf{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px}.mkf label{font-size:12px;color:var(--mut);display:block}.mkf input,.mkf select,.pmw input,.pmw select{width:100%;padding:10px;border-radius:10px;border:1px solid var(--bd);background:var(--bg2);color:var(--tx);font:inherit}'+
 '.mk{display:grid;grid-template-columns:40px 36px minmax(0,1fr) 42px 36px 74px 92px;gap:8px;align-items:center;padding:9px 4px;border-bottom:1px solid var(--bd);cursor:pointer}.mk:hover{background:#ffffff08}.mk .pn b{display:block;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.mk .pn small{color:var(--mut);font-size:11px}'+
 '.mkh{color:var(--mut);font-size:11px;cursor:default}.mkh span{cursor:pointer}.mk .esc{width:30px;height:30px;font-size:9px}.mk img.esc{background:#fff2;padding:2px}'+
 '.st{font-size:11px;font-weight:700;padding:4px 8px;border-radius:99px;text-align:center;white-space:nowrap}.st.verde{background:#3dbb6a33;color:#7ee2a0}.st.amar{background:#facc1526;color:#facc15}.st.verm{background:#ef444426;color:#fca5a5}.st.azul{background:#3b82f633;color:#93c5fd}.st.cinza{background:#ffffff14;color:var(--mut)}'+
 '.seg{display:flex;gap:3px;margin:4px 0}.seg i{flex:1;height:8px;border-radius:4px;background:#0b120e;border:1px solid var(--bd)}.seg i.on{background:var(--c1);border-color:var(--c1)}.seg.r i.on{background:#ef4444;border-color:#ef4444}.seg.y i.on{background:#facc15;border-color:#facc15}'+
 '.fh{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.fh .big{font:400 40px Michroma,sans-serif;line-height:1}.fgrid{display:grid;gap:14px;grid-template-columns:1fr}@media(min-width:800px){.fgrid{grid-template-columns:1fr 1fr}}'+
 '.att{display:grid;grid-template-columns:78px 1fr 30px;gap:8px;align-items:center;font-size:13px;margin:5px 0}.att .bar{height:10px}'+
 '.steps{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap}.steps span{flex:1;min-width:80px;text-align:center;font-size:11px;padding:7px 4px;border-radius:99px;background:var(--bg2);border:1px solid var(--bd);color:var(--mut)}.steps span.on{background:var(--c1);color:#03150a;border-color:var(--c1);font-weight:700}.steps span.ok{border-color:var(--c1);color:var(--c1)}'+
 '.negg{display:grid;gap:14px;grid-template-columns:1fr}@media(min-width:800px){.negg{grid-template-columns:1.1fr .9fr}}.row2{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;margin:8px 0}.row2 label{font-size:13px}'+
 '.tns{display:inline-block;padding:5px 12px;border-radius:99px;font-weight:700;font-size:12px}.tns.t0{background:#3dbb6a33;color:#7ee2a0}.tns.t1{background:#facc1526;color:#facc15}.tns.t2{background:#f9731626;color:#fdba74}.tns.t3{background:#ef444433;color:#fca5a5}'+
 '.bub{padding:9px 12px;border-radius:12px;margin:6px 0;font-size:13px;max-width:92%}.bub.c{background:var(--bg2);border:1px solid var(--bd)}.bub.u{background:#1fa35a33;margin-left:auto}.bub.j{background:#3b82f622}'+
 '.stk{position:sticky;bottom:0;background:var(--bg);padding:10px 0;display:flex;gap:8px}.stk button{flex:1}.jan{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px;border-radius:14px;border:1px solid var(--c1);background:linear-gradient(90deg,#1fa35a33,#0e3f2533)}.jan.warn{border-color:var(--warn);background:#facc1518}.jan.off{border-color:var(--bd);background:var(--bg2)}.jan b{font-size:14px}'+
 '.cv{display:grid;grid-template-columns:42px minmax(0,1fr) 62px 64px 86px;gap:8px;align-items:center;padding:9px 2px;border-bottom:1px solid var(--bd)}'+
 '@keyframes pj{0%{box-shadow:0 0 0 0 #3dbb6a88}100%{box-shadow:0 0 0 18px #3dbb6a00}}.jan:not(.off){animation:pj 1.6s ease-out 2}'+
 '@media(max-width:560px){.mk{grid-template-columns:36px 30px minmax(0,1fr) 38px 70px;}.mk .xi,.mk .xa{display:none}.cv{grid-template-columns:38px minmax(0,1fr) 54px 80px}.cv .xc{display:none}}';
 document.head.appendChild(s)};
PMUI.ov=function(n){var id='pm-'+n,e=document.getElementById(id);if(!e){e=document.createElement('div');e.id=id;e.className='pmov';document.body.appendChild(e)}return e};
PMUI.abre=function(n,h){var e=PMUI.ov(n);e.innerHTML=mono('<div class="pmw">'+h+'</div>');e.className='pmov on';return e};
PMUI.fecha=function(n){var e=document.getElementById('pm-'+n);if(e){e.className='pmov';e.innerHTML=''}};
PMUI.fechaTudo=function(){['ficha','neg','ren','bal','ofe'].forEach(PMUI.fecha)};
function pmEscH(s){return esc(s)}
PMUI.clubeObj=function(ci){var c=PM.B.cl[ci];return {n:c[CI.NOME],escudo:c[CI.ESC],f:c[CI.REP],dbid:c[CI.ID]}};
PMUI.crest=function(ci,sz){if(ci<0)return '<div class="esc" style="width:'+(sz||30)+'px;height:'+(sz||30)+'px;background:#243;font-size:9px">LIV</div>';var c=PMUI.clubeObj(ci);return crest(c,sz)};
PMUI.atts=function(id){var b=PM.B.j[id],d=S.W.p[id],df=d[DD.O]-b[JI.O],a=d[DD.I],pen=[Math.max(0,a-29)*.9,0,0,0,0,Math.max(0,a-30)*.8];return [JI.RIT,JI.FIN,JI.PAS,JI.DRI,JI.DEF,JI.FIS].map(function(k,i){return pmC(Math.round(b[k]+df-pen[i]),18,97)})};
PMUI.chip=function(c,t,title){return '<span class="st '+c+'"'+(title?' title="'+esc(title)+'"':'')+'>'+esc(t)+'</span>'};
PMUI.seg=function(l,cor){var h='<div class="seg '+(cor||'')+'">';for(var i=0;i<7;i++)h+='<i'+(i<=l?' class="on"':'')+'></i>';return h+'</div>'};
PMUI.mini=function(id){var l=['F','Fm','M'],v=[PM.faseNivel(id),PM.formaNivel(id),PM.moralNivel(id)];return 'Fase '+PM.nivel[v[0]]+' · Forma '+PM.nivel[v[1]]+' · Moral '+PM.nivel[v[2]]};
PMUI.fav=function(id){S.fav=S.fav||[];var k=S.fav.indexOf(id);if(k>=0)S.fav.splice(k,1);else S.fav.push(id);salvar()};

/* ---------- janela: faixa e avisos ---------- */
PMUI.banner=function(){
 var j=PM.janela();
 if(j.aberta)return '<div class="jan'+(j.rest<=3?' warn':'')+'"><div><b>🏁 Janela de '+esc(j.tipo.toLowerCase())+' ABERTA</b><div class="hint">'+(j.ultimo?'Hoje é o último dia!':j.rest+' dia'+(j.rest!==1?'s':'')+' restantes · fecha em '+PM.dataStr(j.fe))+'</div></div><button class="sec" data-pm="irmercado">Ver o mercado</button></div>';
 return '<div class="jan off"><div><b>Janela fechada</b><div class="hint">Próxima ('+esc((j.proxTipo||'').toLowerCase())+') abre em '+j.diasProx+' dias · '+PM.dataStr(j.prox)+'. Fora da janela, os clubes quase não vendem.</div></div></div>'};
PMUI.eventos=function(ev){
 var imp=false,mod=false,ofs=[],fa=null,fila=null,resp=[],trs=[];
 ev.forEach(function(e){if(e.k==='ofenova')ofs.push(e);else if(e.k==='folhaAnim')fa=e;else if((e.k==='vendeu'||e.k==='vendaFim'||e.k==='chegou')&&e.d)trs.push(e.d)});
 ev.forEach(function(e){
  if(e.k==='abre'){imp=true;mod=true;modal('🏁 Janela de transferências aberta',e.t,[{l:'Ver o mercado',f:function(){ABA='mercado';render()}},{l:'Depois',f:function(){}}])}
  else if(e.k==='ultimo'){imp=true;mod=true;modal('🏁 Último dia da janela!','Hoje é o último dia para contratar. Depois, só na próxima janela.',[{l:'Ir ao mercado',f:function(){ABA='mercado';render()}},{l:'Fechar',f:function(){}}])}
  else if(e.k==='fecha'){imp=true;mod=true;PMUI.balanco()}
  else if(e.k==='atraso'){if(!fa){imp=true;mod=true;modal('⚠ Salários atrasados',e.t,[{l:'Entendi',f:function(){}}])}}
  else if((e.k==='neg'&&e.nid)||(e.k==='ofe'&&e.oid)){imp=true;resp.push(e)}
  else if(e.k==='vendaFim'||((e.k==='vendeu'||e.k==='chegou')&&e.d)){imp=true}
  else if(e.k==='neg'||e.k==='chegou'||e.k==='vendeu'||e.k==='ofe'){imp=true;toast(e.t)}
 });
 if(ofs.length){imp=true;
  if(mod)toast(ofs.length+(ofs.length>1?' propostas novas':' proposta nova')+' no Mercado');
  else if(fa||trs.length)fila=ofs;
  else PMUI.avisoOfertas(ofs)}
 if(resp.length){imp=true;if(mod||fa||trs.length||ofs.length)toast(resp.map(function(x){return x.t}).join(' · '));else PMUI.avisoResp(resp)}
 if(trs.length){imp=true;PMUI.animTransf(trs,fa?function(){PMUI.animFolha(fa.d,fila)}:fila?function(){PMUI.avisoOfertas(fila)}:null)}
 else if(fa){imp=true;PMUI.animFolha(fa.d,fila)}
 return imp};
PMUI.tk=0;
PMUI.animTransf=function(lista,depois){
 ANIM=true;var a=$('anim'),i=0;
 var nomeC=function(ci){return ci>=0?esc(PM.B.cl[ci][CI.NOME]):'Sem clube'};
 function mostra(){
  var d=lista[i],b=PM.B.j[d.jid],p=S.W.p[d.jid],ok=d.ok,compra=!!d.compra,de=compra?d.de:S.wi,para=compra?S.wi:d.para,k,coins='',delta=d.depois-d.antes,tk=++PMUI.tk;
  if(ok&&!compra)for(k=0;k<18;k++)coins+='<span class="coin" style="left:'+ri(4,92)+'%;animation-delay:'+(2+Math.random()*1.4).toFixed(2)+'s">🪙</span>';
  var tag=!ok?'Negociação fracassou':compra?'Reforço contratado':d.emp?'Empréstimo concluído':'Venda concluída';
  var msg=!ok?esc(d.motivo):compra?'É o novo reforço do seu clube.':(d.emp?'Foi emprestado ao ':'Agora joga no ')+nomeC(para)+'.'+(d.parc?' Pagamento em '+d.parc+' parcelas.':'')+(d.troca?' O clube também envia '+d.troca+' jogador'+(d.troca>1?'es':'')+' na troca.':'');
  var h=coins+'<div class="tr-box '+(ok?'ok':'fail')+'"><span class="tr-tag">'+tag+'</span><div class="tr-nome">'+esc(b[JI.NOME])+'</div>'+
   '<div class="tr-sub"><span class="pp g-'+grupoPos(b[JI.POSJ])+'">'+b[JI.POSJ]+'</span>'+p[DD.I]+' anos · OVR '+p[DD.O]+'</div>'+
   '<div class="tr-rota"><div class="tr-club">'+PMUI.crest(de,56)+'<b>'+nomeC(de)+'</b></div><div class="tr-trilho"><i class="tr-bola"></i></div><div class="tr-club tr-dest">'+PMUI.crest(para,56)+'<b>'+nomeC(para)+'</b></div></div>'+
   '<div class="tr-msg">'+msg+'</div>'+
   (ok?'<div class="tr-grid"><div><small>'+(compra?'Investimento':d.emp?'Taxa recebida':'Valor da venda')+'</small><b id="tr-v">'+fmtK(0)+'</b></div><div><small>Caixa do clube</small><b id="tr-n">'+fmtK(d.antes)+'</b><em class="'+(delta>=0?'up':'dn')+'">'+(delta>=0?'+ ':'− ')+fmtK(Math.abs(delta))+'</em></div></div>'
    :'<div class="tr-grid one"><div><small>Caixa do clube</small><b>'+fmtK(d.antes)+'</b><em>Sem alteração</em></div></div>')+
   '<button class="full" id="tr-ok">'+(i<lista.length-1?'Próxima':'Continuar')+'</button></div>';
  a.innerHTML=mono(h);a.className='on';
  if(ok){var t0=null,dl=2100,dur=1500;
   var passo=function(ts){if(tk!==PMUI.tk)return;if(!t0)t0=ts;var q=Math.max(0,Math.min(1,(ts-t0-dl)/dur)),e=1-Math.pow(1-q,3),x=$('tr-v'),y=$('tr-n');if(!x||!y)return;x.textContent=fmtK((d.valor||0)*e);y.textContent=fmtK(d.antes+delta*e);if(q<1)requestAnimationFrame(passo)};
   requestAnimationFrame(passo)}
  $('tr-ok').onclick=function(){i++;if(i<lista.length)mostra();else{PMUI.tk++;a.className='';a.innerHTML='';ANIM=false;PM.sync();render();if(depois)depois()}}}
 mostra()};
 PMUI.balanco=function(){
 var b=S.bal;if(!b)return;
 var nm=function(l){return l.map(function(id){return PM.B.j[id][JI.NOME]}).join(', ')||'ninguém'};
 modal('Balanço da janela de '+b.tipo.toLowerCase(),'Nota '+b.nota+' · Gastos '+fmtK(b.gasto)+' · Vendas '+fmtK(b.receita)+' · Saldo '+fmtK(b.liq)+' · Idade média do elenco '+b.idade+'. Chegaram: '+nm(b.comp)+'. Saíram: '+nm(b.vend)+'.',[{l:'Fechar',f:function(){}}])};

/* ---------- painel e tática (cards extras) ---------- */
PMUI.painelExtra=function(){
 var f=S.fin,fol=Math.round(PM.folhaMes());
 return PMUI.banner()+'<div class="tiles">'+
  tile('💰','Folha mensal',fmtK(fol),'Receita fixa '+fmtK(PM.B.cl[S.wi][CI.FIXA]),'')+
  tile('⚠','Salários em atraso',fmtK(f.div),f.div>0?f.mes+' mês(es) seguidos':'Em dia',f.div>0?'bad':'ok')+
  tile('🎯','Confiança da diretoria',Math.round(f.conf)+'/100','Teto de moral '+PM.moralCap(),f.conf<60?'bad':'')+
  tile('🔁','Reputação no mercado',Math.round(S.repMer)+'/100','Clima: '+S.W.clima,S.repMer<40?'bad':'')+'</div>'};
PMUI.cardEntro=function(){
 var E=S.esq,en=PM.entro(S.wi,E.slots,E.form,E.estilo);
 return '<div class="card"><h2>Entrosamento</h2>'+bar('Time',en.t,'rep',en.t+'/100')+bar('Defesa',en.d,'mini',en.d)+bar('Meio',en.m,'mini',en.m)+bar('Ataque',en.a,'mini',en.a)+
  '<p class="hint">Efeito na força do time: '+(en.mod>=0?'+':'')+en.mod.toFixed(1)+' pontos. Sobe jogando junto, com jogadores nas funções certas, moral e físico bons.</p>'+
  (en.al.length?'<div class="chips">'+en.al.slice(0,5).map(function(a){return '<span class="chip warn">'+esc(a)+'</span>'}).join('')+'</div>':'<div class="chips"><span class="chip good">Time bem encaixado</span></div>')+'</div>'};

/* ---------- aba MERCADO ---------- */
PMUI.buscar=function(){
 var f=PMUI.f,B=PM.B,me=S.wi,out=[],nome=f.nome.toLowerCase(),nac=f.nac.toLowerCase();
 B.j.forEach(function(b,id){if(!b)return;var d=S.W.p[id],c=d[DD.C];if(c===-2||c===me)return;
  if(f.tipo==='lt'&&!(S.W.lt&&S.W.lt[id]===1))return;if(f.tipo==='le'&&!(S.W.lt&&S.W.lt[id]===2))return;if(f.tipo==='livres'&&c!==-1)return;if(f.tipo==='comprar'&&c<0)return;if(f.tipo==='pre'&&!(c>=0&&PM.mesesRest(id)<=6))return;
  if(nome&&b[JI.NOME].toLowerCase().indexOf(nome)<0)return;if(f.pos&&b[JI.POSJ]!==f.pos)return;if(nac&&b[JI.NAC].toLowerCase().indexOf(nac)<0)return;
  var o=d[DD.O],a=d[DD.I];if(f.omin&&o<+f.omin)return;if(f.omax&&o>+f.omax)return;if(f.imin&&a<+f.imin)return;if(f.imax&&a>+f.imax)return;
  if(f.liga&&(c<0||B.cl[c][CI.LIGA]!==f.liga))return;if(f.cont&&PM.mesesRest(id)>+f.cont)return;
  if(f.vmax&&PM.valor(id)/1000>+f.vmax)return;out.push(id)});
 var key={o:function(i){return S.W.p[i][DD.O]},i:function(i){return S.W.p[i][DD.I]},v:function(i){return PM.valor(i)},n:function(i){return PM.B.j[i][JI.NOME]}}[PMUI.ord];
 out.sort(function(x,y){var a=key(x),b=key(y);return (a>b?1:a<b?-1:0)*PMUI.dir});return out};
PMUI.status=function(id){var d=S.W.p[id],me=S.wi,c=d[DD.C];
 if(c===-1)return ['azul','Livre'];if(PM.negPorJog(id))return ['cinza','Em negociação'];
 if(PM.recente(id))return ['cinza','Contratado agora'];
 var el=PM.elegivel(id,me);if(!el.ok)return ['verm','Indisponível',el.m];if(PM.intocavel(id,c))return ['verm','Intocável'];
 if(!PM.janela().aberta)return ['amar','Fora da janela'];
 var lt=S.W.lt&&S.W.lt[id];if(lt===1)return ['verde','Lista de transf.'];if(lt===2)return ['azul','Lista de empr.'];
 if(PM.mesesRest(id)<=6)return ['azul','Pré-contrato'];return ['verde','Disponível']};
PMUI.linha=function(id,extra){
 var b=PM.B.j[id],d=S.W.p[id],st=PMUI.status(id),j=PM.view(id);
 return '<div class="mk" data-ficha="'+id+'"><div class="pp g-'+grupoPos(b[JI.POSJ])+'" style="border-radius:8px;text-align:center;font-size:11px;font-weight:700;padding:5px 0">'+b[JI.POSJ]+'</div>'+PMUI.crest(d[DD.C],30)+
  '<div class="pn"><b>'+esc(b[JI.NOME])+'</b><small>'+(d[DD.C]>=0?esc(PM.B.cl[d[DD.C]][CI.NOME]):'Sem clube')+' · '+esc(b[JI.NAC])+(extra?' · '+extra:'')+'</small></div>'+
  '<div class="ov '+ovCls(d[DD.O])+'" style="text-align:center;font-weight:800;border-radius:8px;padding:5px 0">'+d[DD.O]+'</div><div class="xi" style="text-align:center">'+d[DD.I]+'</div><div class="xa" style="text-align:right;font-size:13px">'+fmtK(PM.valor(id))+'</div>'+
  PMUI.chip(st[0],st[1],st[2])+'</div>'};
PMUI.pMercado=function(){
var subs=[['buscar','Buscar'],['neg','Negociações ('+S.neg.filter(function(n){return ['aberta','jogador','medico','espera','congelada'].indexOf(n.est)>=0}).length+')'],['ofe','Ofertas ('+S.ofe.filter(function(o){return o.est==='aberta'}).length+')'],['lt','Transferências ('+PM.lista().t.length+')'],['le','Empréstimos ('+PM.lista().e.length+')'],['fav','★ Desejos'],['news','Notícias']];
 var h=PMUI.banner()+'<div class="opts">'+subs.map(function(s){return '<button class="opt'+(PMUI.sub===s[0]?' on':'')+'" data-pm="sub" data-v="'+s[0]+'">'+s[1]+'</button>'}).join('')+'</div>';
 if(PMUI.sub==='buscar'){
  var f=PMUI.f,ligas=Object.keys(PM.B.liga).map(function(l){return [l,PM.B.cl[PM.B.liga[l][0]][CI.LIGANOME]]});
  var inp=function(k,l,t,ph){return '<div><label>'+l+'</label><input data-f="'+k+'" type="'+(t||'text')+'" value="'+esc(f[k])+'" placeholder="'+(ph||'')+'"></div>'};
  h+='<div class="card"><h2>Buscar jogadores</h2><div class="mkf">'+inp('nome','Nome')+
   '<div><label>Posição</label><select data-f="pos"><option value="">Qualquer</option>'+POS.map(function(p){return '<option value="'+p[0]+'"'+(f.pos===p[0]?' selected':'')+'>'+POSNOME[p[0]]+'</option>'}).join('')+'</select></div>'+inp('nac','Nacionalidade')+
   '<div><label>Liga</label><select data-f="liga"><option value="">Todas</option>'+ligas.map(function(l){return '<option value="'+l[0]+'"'+(f.liga===l[0]?' selected':'')+'>'+esc(l[1])+'</option>'}).join('')+'</select></div>'+
   '<div><label>Tipo</label><select data-f="tipo">'+[['','Todos'],['comprar','Comprar'],['lt','Lista de transferências'],['le','Lista de empréstimo'],['livres','Agentes livres'],['pre','Pré-contrato (≤6 meses)']].map(function(t){return '<option value="'+t[0]+'"'+(f.tipo===t[0]?' selected':'')+'>'+t[1]+'</option>'}).join('')+'</select></div>'+
   inp('imin','Idade mín.','number')+inp('imax','Idade máx.','number')+inp('omin','Overall mín.','number')+inp('omax','Overall máx.','number')+inp('vmax','Valor máx. (€ mi)','number')+inp('cont','Contrato até (meses)','number')+'</div>'+
   '<div class="mctl" style="margin-top:10px"><button data-pm="busca">Buscar</button><button class="sec" data-pm="limpa">Limpar</button></div></div>';
  var r=PMUI.res||[];
  h+='<div class="card"><h2>Resultados ('+r.length+')</h2><div class="mk mkh"><span></span><span></span><span data-pm="ord" data-v="n">Nome</span><span data-pm="ord" data-v="o">OVR</span><span class="xi" data-pm="ord" data-v="i">Idade</span><span class="xa" data-pm="ord" data-v="v">Valor</span><span>Status</span></div>'+
   r.slice(0,60).map(function(id){return PMUI.linha(id)}).join('')+(r.length>60?'<p class="hint">Mostrando 60 de '+r.length+'. Refine os filtros.</p>':'')+(r.length?'':'<p class="hint">Use os filtros e toque em Buscar.</p>')+'</div>';
 }else if(PMUI.sub==='neg'){
  var ns=S.neg.slice().reverse();h+='<div class="card"><h2>Negociações</h2>'+(ns.length?ns.map(function(n){var b=PM.B.j[n.j],t=PM.tensao(n.pac);
   return '<div class="mk" style="grid-template-columns:minmax(0,1fr) auto auto" data-neg="'+n.id+'"><div class="pn"><b>'+esc(b[JI.NOME])+'</b><small>'+(n.livre?'Agente livre':esc(PM.B.cl[n.de][CI.NOME]))+' · '+({clube:'Proposta ao clube',jogador:'Acordo com o jogador',medico:'Exame médico'}[n.fase]||'')+(n.pend?' · aguardando resposta':'')+'</small></div>'+(n.est==='aberta'||n.est==='jogador'?'<span class="tns t'+t[1]+'">'+t[0]+'</span>':'<span></span>')+PMUI.chip(({aberta:'verde',jogador:'verde',medico:'azul',espera:'amar',congelada:'cinza',concluida:'verde',recusada:'verm',encerrada:'cinza'})[n.est]||'cinza',({aberta:'Em andamento',jogador:'Em andamento',medico:'Em andamento',espera:'Aguarda janela',congelada:'Congelada',concluida:'Concluída',recusada:'Recusada',encerrada:'Encerrada'})[n.est]||n.est)+'</div>'}).join(''):'<p class="hint">Nenhuma negociação. Busque um jogador e toque em Negociar.</p>')+'</div>';
 }else if(PMUI.sub==='ofe'){h+=PMUI.pOfertas();
 }else if(PMUI.sub==='lt'||PMUI.sub==='le'){h+=PMUI.pLista(PMUI.sub);
 }else if(PMUI.sub==='ofe-antigo'){
  var os=S.ofe.filter(function(o){return o.est==='aberta'||o.est==='espera'});
  h+='<div class="card"><h2>Ofertas recebidas</h2>'+(os.length?os.map(function(o){var b=PM.B.j[o.j];return '<div class="prox"><div><b>'+esc(PM.B.cl[o.de][CI.NOME])+' quer '+esc(b[JI.NOME])+'</b><small>Oferta '+fmtK(o.v)+' · valor de mercado '+fmtK(PM.valor(o.j))+(o.est==='espera'?' · aceita, sai na próxima janela':' · expira em '+Math.max(0,o.exp-S.hoje)+' dias')+'</small></div>'+(o.est==='aberta'?'<div class="mctl"><button data-pm="ofe" data-v="aceitar" data-id="'+o.id+'">Aceitar</button><button class="sec" data-pm="ofe" data-v="contra" data-id="'+o.id+'">+10%</button><button class="sec" data-pm="ofe" data-v="recusar" data-id="'+o.id+'">Recusar</button></div>':'')+'</div>'}).join(''):'<p class="hint">Nenhuma oferta no momento. Elas aparecem durante as janelas.</p>')+'</div>';
 }else if(PMUI.sub==='fav'){
  var fv=(S.fav||[]).filter(function(id){return S.W.p[id]&&S.W.p[id][DD.C]!==-2});h+='<div class="card"><h2>Lista de desejos</h2>'+(fv.length?fv.map(function(id){return PMUI.linha(id)}).join(''):'<p class="hint">Toque na estrela na ficha do jogador para acompanhar.</p>')+'</div>';
 }else{
  h+='<div class="card"><h2>Notícias do mercado</h2>'+(S.W.news.length?S.W.news.slice(0,25).map(function(n){return '<div class="res">'+PM.dataStr(n.d)+' · '+esc(n.t)+'</div>'}).join(''):'<p class="hint">Sem notícias ainda.</p>')+'</div>';
 }
 return h};

/* ---------- ficha do jogador ---------- */
PMUI.ficha=function(id){
 PMUI.fid=id;var b=PM.B.j[id],d=S.W.p[id],me=S.wi,c=d[DD.C],own=c===me,at=PMUI.atts(id),nm=['Ritmo','Finalização','Passe','Drible','Defesa','Físico'];
 var nota=d[DD.J]?(d[DD.NS]/10/d[DD.J]).toFixed(1):'—',g90=d[DD.MN]?(d[DD.G]/(d[DD.MN]/90)).toFixed(2):'0.00',st=PMUI.status(id);
 var potTxt=own?d[DD.P]:'~'+pmC(d[DD.P]+Math.round(pmSeed(id+S.temp)()*6-3),d[DD.O],99);
 var hist=(d[DD.H]||[]).map(function(x){return x[0]+': '+x[1]+' / '+fmtK(x[2]*1000)}).join(' · ')||'sem histórico ainda';
 var h='<div class="picker-head"><h2>Ficha do jogador</h2><button class="sec" data-pm="fechar">✕ Fechar</button></div>'+
 '<div class="card"><div class="fh">'+PMUI.crest(c,52)+'<div style="flex:1;min-width:150px"><h2 style="margin:0;border:0">'+esc(b[JI.NOME])+'</h2><div class="hint">'+(c>=0?esc(PM.B.cl[c][CI.NOME]):'Sem clube')+' · '+esc(b[JI.NAC])+' · '+d[DD.I]+' anos · '+b[JI.ALT]+' cm · pé '+esc(String(b[JI.PE]).toLowerCase())+'</div><div class="chips"><span class="chip">'+b[JI.POS]+(b[JI.POS2]?' / '+b[JI.POS2]:'')+'</span><span class="chip">'+esc(b[JI.PAPEL])+'</span>'+PMUI.chip(st[0],st[1],st[2])+'</div></div><div style="text-align:center"><div class="big '+ovCls(d[DD.O])+'" style="padding:8px 14px;border-radius:12px">'+d[DD.O]+'</div><div class="hint">POT '+potTxt+'</div></div></div></div>'+
 '<div class="fgrid"><div class="card"><h2>Atributos</h2>'+at.map(function(v,i){return '<div class="att"><span>'+nm[i]+'</span><div class="bar mini"><i style="width:'+v+'%;background:'+corFis(v)+'"></i></div><b>'+v+'</b></div>'}).join('')+'</div>'+
 '<div class="card"><h2>Fase, forma e moral</h2><div class="lab"><span>Fase</span><b>'+PM.nivel[PM.faseNivel(id)]+'</b></div>'+PMUI.seg(PM.faseNivel(id))+'<div class="lab"><span>Forma física</span><b>'+PM.nivel[PM.formaNivel(id)]+' ('+Math.round(d[DD.FI])+'%)</b></div>'+PMUI.seg(PM.formaNivel(id),PM.formaNivel(id)<3?'r':'')+'<div class="lab"><span>Moral</span><b>'+PM.nivel[PM.moralNivel(id)]+'</b></div>'+PMUI.seg(PM.moralNivel(id),PM.moralNivel(id)<3?'r':'')+
  (d[DD.L]>0?'<div class="chips"><span class="chip bad">Lesionado: '+d[DD.L]+' dias</span></div>':'')+'<p class="hint">Overall efetivo hoje: <b>'+Math.round(PM.efOv(id)*10)/10+'</b></p></div></div>'+
 '<div class="fgrid"><div class="card"><h2>Estatísticas</h2><div class="sum"><div><small>Jogos</small><b>'+d[DD.J]+'</b></div><div><small>Minutos</small><b>'+d[DD.MN]+'</b></div><div><small>Gols</small><b>'+d[DD.G]+'</b></div><div><small>Assist.</small><b>'+d[DD.A]+'</b></div><div><small>Amarelos</small><b>'+d[DD.AM]+'</b></div><div><small>Vermelhos</small><b>'+d[DD.VM]+'</b></div><div><small>Nota média</small><b>'+nota+'</b></div><div><small>Gols/90</small><b>'+g90+'</b></div></div><p class="hint">No jogo: '+d[DD.CJ]+' jogos · '+d[DD.CG]+' gols · '+d[DD.CA]+' assistências.</p></div>'+
 '<div class="card"><h2>Contrato e valor</h2><div class="kv"><div><small>Valor de mercado</small><b>'+fmtK(PM.valor(id))+'</b></div><div><small>Salário/ano</small><b>'+fmtK(d[DD.S])+'</b></div><div><small>Contrato até</small><b>'+d[DD.F]+'</b></div><div><small>Restam</small><b>'+PM.mesesRest(id)+' meses</b></div></div>'+
  (own?'':'<div class="chips"><span class="chip">Interesse no seu clube: '+PM.interesse(id,me)+'</span></div>')+'<p class="hint">Histórico: '+esc(hist)+'</p></div></div>'+
 '<div class="stk">'+(own?'<button data-pm="renovar" data-id="'+id+'">Renovar contrato</button><button class="sec" data-pm="listar" data-v="t" data-id="'+id+'">'+(PM.listaUser(id)===1?'✓ Na lista de transf.':'Lista de transferências')+'</button><button class="sec" data-pm="listar" data-v="e" data-id="'+id+'">'+(PM.listaUser(id)===2?'✓ Na lista de empr.':'Lista de empréstimo')+'</button>':(c===-1?'<button data-pm="negociar" data-id="'+id+'">Negociar contrato</button>':'<button data-pm="negociar" data-id="'+id+'">Negociar</button>'+(PM.mesesRest(id)<=6?'<button class="sec" data-pm="pre" data-id="'+id+'">Pré-contrato</button>':'')))+(own?'':'<button class="sec" data-pm="favorito" data-id="'+id+'">'+((S.fav||[]).indexOf(id)>=0?'★ Na lista':'☆ Lista')+'</button>')+'</div>';
 PMUI.abre('ficha',h)};

/* ---------- tela de negociação ---------- */
PMUI.nfDef=function(n){
 var ask=n.ask||PM.valor(n.j);return {tipo:(S.W.lt&&S.W.lt[n.j]===2)?'emp':'compra',valor:Math.round((n.ct||ask*.95)/10)*10,parc:1,troca:[],bT:'',bA:10,bV:0,rev:0,rec:false,recV:Math.round(ask*1.3),recA:PM.ano()+3,empT:'simples',taxa:Math.round(ask*.1),opc:Math.round(ask*.9),cond:20,sal:0,anos:3,luvas:0,papel:'titular'}};
PMUI.ofDeForm=function(){
 var f=PMUI.nf,of={};
 if(f.tipo==='emp')of.emp={t:f.empT,taxa:+f.taxa||0,valorOpc:f.empT==='simples'?0:+f.opc||0,cond:+f.cond||0};
 else{of.valor=+f.valor||0;of.parc=+f.parc||1;of.troca=f.troca.slice();of.rev=+f.rev||0;if(f.bT&&+f.bV>0)of.bonus=[{t:f.bT,alvo:+f.bA||1,valor:+f.bV}];if(f.rec)of.rec={valor:+f.recV||0,ate:+f.recA||PM.ano()+3}}
 return of};

/* ===== componentes das telas de negociação ===== */
PMUI.rf=null;
PMUI.ctx=function(){return {nf:PMUI.nf,of:PMUI.of?PMUI.of.f:null,rn:PMUI.rf}};
PMUI.rw=function(l,v,c){return '<div class="rs-r'+(c?' '+c:'')+'"><span>'+l+'</span><b>'+v+'</b></div>'};
PMUI.mny=function(c,k,lab,sub,step,ref){
 var v=+PMUI.ctx()[c][k]||0,x=String(+(v/1000).toFixed(3));
 return '<div class="mny"><div class="mny-l">'+lab+(sub?'<small>'+sub+'</small>':'')+'</div><div class="mny-c">'+
  '<button type="button" class="mny-b" data-mb="'+c+':'+k+':-1:'+step+'" aria-label="Diminuir">−</button>'+
  '<div class="mny-v"><span>€</span><input type="number" min="0" step="0.01" inputmode="decimal" data-mi="'+c+':'+k+'" value="'+x+'"><em>mi</em></div>'+
  '<button type="button" class="mny-b" data-mb="'+c+':'+k+':1:'+step+'" aria-label="Aumentar">+</button></div>'+
  (ref?'<div class="mny-h">'+ref+'</div>':'')+'</div>'};
PMUI.cnt=function(c,k,lab,sub,step){
 var v=+PMUI.ctx()[c][k]||0;
 return '<div class="mny"><div class="mny-l">'+lab+(sub?'<small>'+sub+'</small>':'')+'</div><div class="mny-c"><button type="button" class="mny-b" data-nb="'+c+':'+k+':-1:'+step+'">−</button><div class="mny-v"><b class="mny-n">'+v+'</b></div><button type="button" class="mny-b" data-nb="'+c+':'+k+':1:'+step+'">+</button></div></div>'};
PMUI.sgm=function(c,k,opts){
 var cur=PMUI.ctx()[c][k];
 return '<div class="sgm">'+opts.map(function(o){return '<button type="button" class="'+(String(cur)===String(o[0])?'on':'')+'" data-sg="'+c+':'+k+':'+o[0]+'">'+o[1]+'</button>'}).join('')+'</div>'};
PMUI.tgl=function(c,k,lab,sub){
 var on=PMUI.ctx()[c][k];
 return '<button type="button" class="tgl'+(on?' on':'')+'" data-tg="'+c+':'+k+'"><span>'+lab+(sub?'<small>'+sub+'</small>':'')+'</span><i></i></button>'};
PMUI.quick=function(c,k,arr){
 return '<div class="mny-q">'+arr.map(function(a){return '<button type="button" class="sec" data-mq="'+c+':'+k+':'+Math.round(a[1])+'">'+a[0]+'</button>'}).join('')+'</div>'};
PMUI.troca=function(c,k,ids,max){
 var sel=PMUI.ctx()[c][k],tot=sel.reduce(function(a,id){return a+PM.valor(id)},0);
 return '<div class="tpk-hd"><span>'+sel.length+' de '+max+' selecionados</span><b>'+(sel.length?fmtK(tot):'—')+'</b></div><div class="tpk-grid">'+ids.map(function(id){
  var b=PM.B.j[id],d=S.W.p[id],on=sel.indexOf(id)>=0,off=!on&&sel.length>=max;
  return '<button type="button" class="tpk'+(on?' on':'')+(off?' off':'')+'" data-tp="'+c+':'+k+':'+max+':'+id+'"><span class="pp g-'+grupoPos(b[JI.POSJ])+'">'+b[JI.POSJ]+'</span><span class="tpk-n"><b>'+esc(b[JI.NOME])+'</b><small>OVR '+d[DD.O]+' · '+d[DD.I]+' anos · '+fmtK(PM.valor(id))+'</small></span><span class="tpk-c"></span></button>'}).join('')+'</div>'};
PMUI.bindForm=function(e,redo){
 var F=PMUI.ctx(),q,i,pp=function(s){var p=s.split(':');return [F[p[0]],p[1],p]};
 q=e.querySelectorAll('[data-mb]');for(i=0;i<q.length;i++)q[i].onclick=function(){var g=pp(this.getAttribute('data-mb'));g[0][g[1]]=Math.max(0,Math.round((+g[0][g[1]]||0)+(+g[2][2])*(+g[2][3])));redo()};
 q=e.querySelectorAll('[data-nb]');for(i=0;i<q.length;i++)q[i].onclick=function(){var g=pp(this.getAttribute('data-nb'));g[0][g[1]]=Math.max(1,(+g[0][g[1]]||0)+(+g[2][2])*(+g[2][3]));redo()};
 q=e.querySelectorAll('[data-mi]');for(i=0;i<q.length;i++)q[i].onchange=function(){var g=pp(this.getAttribute('data-mi'));g[0][g[1]]=Math.max(0,Math.round((+this.value||0)*1000));redo()};
 q=e.querySelectorAll('[data-mq]');for(i=0;i<q.length;i++)q[i].onclick=function(){var g=pp(this.getAttribute('data-mq'));g[0][g[1]]=+g[2][2];redo()};
 q=e.querySelectorAll('[data-sg]');for(i=0;i<q.length;i++)q[i].onclick=function(){var g=pp(this.getAttribute('data-sg')),v=g[2][2];g[0][g[1]]=(v===''||isNaN(v))?v:+v;redo()};
 q=e.querySelectorAll('[data-tg]');for(i=0;i<q.length;i++)q[i].onclick=function(){var g=pp(this.getAttribute('data-tg'));g[0][g[1]]=!g[0][g[1]];redo()};
 q=e.querySelectorAll('[data-tp]');for(i=0;i<q.length;i++)q[i].onclick=function(){
  var p=this.getAttribute('data-tp').split(':'),f=F[p[0]],id=+p[3],k=f[p[1]].indexOf(id);
  if(k>=0)f[p[1]].splice(k,1);else{if(f[p[1]].length>=+p[2]){toast('No máximo '+p[2]+' jogadores na troca');return}f[p[1]].push(id)}
  redo()}};

PMUI.jogHdr=function(id){
 var b=PM.B.j[id],d=S.W.p[id],c=d[DD.C];
 return '<div class="card ph">'+PMUI.crest(c,46)+'<div style="flex:1;min-width:150px"><b style="font-size:17px">'+esc(b[JI.NOME])+'</b><div class="hint" style="margin:2px 0 0">'+(c>=0?esc(PM.B.cl[c][CI.NOME]):'Sem clube')+' · '+d[DD.I]+' anos · contrato até '+d[DD.F]+'</div></div>'+
  '<span class="pp g-'+grupoPos(b[JI.POSJ])+'">'+b[JI.POSJ]+'</span><div class="ov '+ovCls(d[DD.O])+'" style="text-align:center;font-weight:800;border-radius:8px;padding:6px 10px">'+d[DD.O]+'</div>'+
  '<div style="text-align:right"><small style="color:var(--mut);display:block;font-size:11px">Valor de mercado</small><b>'+fmtK(PM.valor(id))+'</b></div></div>'};
PMUI.totais=function(of){
 var cash=of.emp?(of.emp.taxa||0):(of.valor||0),trade=(of.troca||[]).reduce(function(a,id){return a+PM.valor(id)},0),up=PM.neg.upfront(of);
 return {cash:cash,trade:trade,total:cash+trade,up:up,fut:of.emp?0:Math.max(0,cash-up),
  bonus:(of.bonus||[]).reduce(function(a,x){return a+x.valor},0),opc:(of.emp&&of.emp.t!=='simples')?(of.emp.valorOpc||0):0}};
PMUI.resumoOferta=function(of,dir,titulo){
 var t=PMUI.totais(of),pay=dir<0,ntr=(of.troca||[]).length,sub=[],r='';
 if(t.cash)sub.push(fmtK(t.cash)+(of.emp?' de taxa':' em dinheiro'));
 if(ntr)sub.push(ntr+(ntr>1?' jogadores':' jogador')+' ('+fmtK(t.trade)+')');
 r+='<div class="card rs"><h2>'+titulo+'</h2><div class="rs-big"><small>'+(pay?'Você está oferecendo':'Você vai receber')+'</small><b>'+fmtK(t.total)+'</b><em>'+(sub.join(' + ')||'Defina um valor')+'</em></div>';
 r+=PMUI.rw(of.emp?'Taxa de empréstimo':'Dinheiro',fmtK(t.cash));
 if(ntr){r+=PMUI.rw(pay?'Saem do seu clube':'Chegam ao seu clube',fmtK(t.trade));
  r+='<div class="rs-n">'+of.troca.map(function(id){var b=PM.B.j[id];return '<div><span class="pp g-'+grupoPos(b[JI.POSJ])+'">'+b[JI.POSJ]+'</span>'+esc(b[JI.NOME])+'</div>'}).join('')+'</div>'}
 if(of.emp&&t.opc)r+=PMUI.rw(of.emp.t==='obrig'?'Compra obrigatória depois':'Opção de compra',fmtK(t.opc));
 if(!of.emp&&of.parc>1)r+=PMUI.rw('Parcelamento',of.parc+'x de '+fmtK(Math.round(of.valor/of.parc)));
 if(t.bonus)r+=PMUI.rw('Bônus por metas (se atingidos)',fmtK(t.bonus));
 if(of.rev)r+=PMUI.rw('Revenda para o vendedor',of.rev+'%');
 if(of.rec)r+=PMUI.rw('Recompra do vendedor',fmtK(of.rec.valor)+' até '+of.rec.ate);
 r+='<div class="rs-sep"></div>'+PMUI.rw(pay?'Pago agora':'Recebido agora',fmtK(t.up),pay?'neg':'pos');
 if(t.fut)r+=PMUI.rw(pay?'Pagamentos futuros':'Recebimentos futuros',fmtK(t.fut));
 var cx=S.caixa+(pay?-t.up:t.up);
 r+=PMUI.rw('Seu caixa depois',fmtK(cx),'tot'+(cx<0?' neg':''));
 if(pay&&cx<0)r+='<div class="rs-w">Caixa insuficiente para o pagamento inicial.</div>';
 return r+'</div>'};
PMUI.resumoContrato=function(f,id,up,atual){
 var sal=+f.sal||0,anos=+f.anos||1,lu=+f.luvas||0,tot=sal*anos+lu,fol=Math.round(PM.folhaMes()),ren=atual!==undefined,
  nova=fol+Math.round((sal-(ren?atual:0))/12),pc=Math.round((PM.folhaAno()+sal-(ren?atual:0))/PM.receitaAno()*100),lim=Math.round(PM.cfg.ffp_folha_receita*100),cx=S.caixa-lu-(up||0);
 var r='<div class="card rs"><h2>Resumo do contrato</h2><div class="rs-big"><small>Custo total do contrato</small><b>'+fmtK(tot)+'</b><em>'+fmtK(sal)+' por ano × '+anos+(anos>1?' anos':' ano')+' + '+fmtK(lu)+' de luvas</em></div>';
 r+=PMUI.rw('Salário anual',fmtK(sal));
 if(ren&&atual)r+=PMUI.rw('Variação sobre o atual',(sal>=atual?'+':'')+Math.round((sal/atual-1)*100)+'%',sal>atual?'neg':'');
 r+=PMUI.rw('Duração',anos+(anos>1?' anos':' ano'))+PMUI.rw('Luvas (pagas agora)',fmtK(lu),lu?'neg':'');
 if(up)r+=PMUI.rw('Transferência ao clube (paga agora)',fmtK(up),'neg');
 r+='<div class="rs-sep"></div>'+PMUI.rw('Folha mensal',fmtK(fol)+' → '+fmtK(nova))+PMUI.rw('Folha / receita',pc+'% (limite '+lim+'%)',pc>lim?'neg':'')+PMUI.rw('Caixa depois dos pagamentos',fmtK(cx),'tot'+(cx<0?' neg':''));
 if(pc>lim)r+='<div class="rs-w">Fair play financeiro: a folha passaria do limite.</div>';
 if(cx<0)r+='<div class="rs-w">Caixa insuficiente.</div>';
 return r+'</div>'};
PMUI.chat=function(n,t){
 var ativo=n.est==='aberta'||n.est==='jogador';
 return '<div class="card"><h2>'+(n.livre?'Agente livre':'Conversa com o clube')+'</h2><div class="fh">'+PMUI.crest(n.livre?-1:n.de,40)+'<div style="flex:1"><b>'+(n.livre?'Sem clube':esc(PM.B.cl[n.de][CI.NOME]))+'</b><div class="hint" style="margin:0">'+(ativo?'Clima da conversa':'Estado: '+n.est)+'</div></div>'+(ativo?'<span class="tns t'+t[1]+'">'+t[0]+'</span>':'')+'</div>'+
  (n.pend?'<p class="hint">Proposta enviada. A resposta chega em ~'+Math.max(0,n.pend.dia-S.hoje)+' dia(s): avance o calendário.</p>':'')+
  '<div style="max-height:240px;overflow:auto">'+n.msgs.slice(-8).map(function(m){return '<div class="bub '+m.q+'">'+esc(m.t)+'</div>'}).join('')+'</div></div>'+
  ((ativo||n.est==='congelada')?'<button class="sec full danger" data-pm="encerrar">Encerrar negociação</button>':'')};

/* ===== negociação do usuário (clube + jogador) ===== */
PMUI.neg=function(nid){
 var n=S.neg.filter(function(x){return x.id===nid})[0];if(!n)return;PMUI.nid=nid;
 if(!PMUI.nf||PMUI.nf.nid!==nid){PMUI.nf=PMUI.nfDef(n);PMUI.nf.nid=nid}
 var f=PMUI.nf,t=PM.tensao(n.pac),mv=PM.valor(n.j);
 if(n.fase!=='clube'&&!f.jInit){var d0=PM.neg.demanda(n.j);f.sal=d0.sal;f.anos=d0.anos;f.luvas=d0.luvas;f.jInit=1}
 var etapas=[['clube','Proposta ao clube'],['jogador','Acordo com o jogador'],['medico','Exame médico'],['fim','Registro']];if(n.livre)etapas.shift();
 var ordem={clube:0,jogador:1,medico:2},cur=(n.est==='concluida'||n.est==='espera')?3:(ordem[n.fase]||0),off=n.livre?1:0,ativo=(n.est==='aberta'||n.est==='jogador')&&!n.pend;
 var h='<div class="picker-head"><h2>Negociação</h2><button class="sec" data-pm="fechar">← Voltar</button></div><div class="steps">'+etapas.map(function(e,i){var k=i+off;return '<span class="'+(k===cur?'on':k<cur?'ok':'')+'">'+e[1]+'</span>'}).join('')+'</div>'+PMUI.jogHdr(n.j)+'<div class="negg"><div>',right='';
 if(n.fase==='clube'){
  var of=PMUI.ofDeForm(),tt=PMUI.totais(of),stp=Math.max(10,Math.round((n.ask||mv)*.04/10)*10),cl=esc(PM.B.cl[n.de][CI.NOME]);
  h+='<div class="card"><h2>Tipo de negócio</h2>'+PMUI.sgm('nf','tipo',[['compra','Compra definitiva'],['emp','Empréstimo']])+'</div>';
  if(f.tipo==='compra'){
   h+='<div class="card"><h2>Dinheiro</h2>'+PMUI.mny('nf','valor','Quanto você paga em dinheiro','Pago ao '+cl,stp,'Valor de mercado: '+fmtK(mv))+PMUI.quick('nf','valor',[['80% do valor',mv*.8],['Valor de mercado',mv],['120% do valor',mv*1.2]])+
    '<div class="grp">Como pagar</div>'+PMUI.sgm('nf','parc',[[1,'À vista'],[2,'2 anos'],[3,'3 anos'],[4,'4 anos'],[5,'5 anos']])+
    '<p class="hint">'+(f.parc>1?'Primeira parcela agora: '+fmtK(tt.up)+'. Depois, '+(f.parc-1)+' parcela(s) anuais de '+fmtK(Math.round(f.valor/f.parc))+'.':'Pagamento único na assinatura.')+'</p></div>'+
    '<div class="card"><h2>Jogadores na troca <small class="opc">opcional</small></h2><p class="hint" style="margin-top:-6px">Os jogadores escolhidos saem do seu clube e entram no valor da proposta.</p>'+
    PMUI.troca('nf','troca',PM.by[S.wi].slice().sort(function(a,c){return S.W.p[c][DD.O]-S.W.p[a][DD.O]}),3)+'</div>'+
    '<div class="card">'+PMUI.tgl('nf','ex','Cláusulas extras','Bônus por metas, revenda e recompra');
   if(f.ex){
    h+='<div class="grp">Bônus por metas</div>'+PMUI.sgm('nf','bT',[['','Nenhum'],['jogos','Por jogos'],['gols','Por gols']]);
    if(f.bT)h+=PMUI.mny('nf','bV','Valor do bônus','Pago ao clube se o jogador atingir a meta no 1º ano',25)+PMUI.cnt('nf','bA','Meta de '+(f.bT==='jogos'?'jogos':'gols'),'Quantidade para liberar o bônus',f.bT==='jogos'?5:1);
    h+='<div class="grp">Revenda para o clube vendedor</div>'+PMUI.sgm('nf','rev',[[0,'Nenhuma'],[5,'5%'],[10,'10%'],[15,'15%'],[20,'20%']])+
     '<div class="grp">Recompra</div>'+PMUI.tgl('nf','rec','Dar opção de recompra ao vendedor');
    if(f.rec)h+=PMUI.mny('nf','recV','Valor da recompra','',stp)+PMUI.cnt('nf','recA','Válida até o ano','',1)}
   h+='</div>';
  }else{
   h+='<div class="card"><h2>Termos do empréstimo</h2>'+PMUI.sgm('nf','empT',[['simples','Simples'],['opcao','Com opção de compra'],['obrig','Com obrigação']])+
    PMUI.mny('nf','taxa','Taxa de empréstimo','Paga agora ao '+cl,stp)+
    (f.empT!=='simples'?PMUI.mny('nf','opc','Valor da compra definitiva','Pago depois, se a compra acontecer',stp):'')+
    (f.empT==='obrig'?PMUI.cnt('nf','cond','Compra obrigatória após','Número de jogos do atleta',5):'')+'</div>'}
  if(ativo)h+='<div class="stk stk2"><div class="stk-t"><small>'+(f.tipo==='emp'?'Taxa de empréstimo':'Você oferece')+'</small><b>'+fmtK(tt.total)+'</b></div><button data-pm="oferta">Enviar proposta</button></div>';
  right=PMUI.resumoOferta(of,-1,'Resumo da oferta');
 }else if(n.fase==='jogador'){
  var dm=PM.neg.demanda(n.j),stp2=Math.max(10,Math.round(dm.sal*.03/10)*10),up=(n.of&&!n.livre)?PM.neg.upfront(n.of):0;
  h+='<div class="card"><h2>Salário</h2>'+PMUI.mny('nf','sal','Salário por ano','Pago ao jogador',stp2,'Referência do agente: '+fmtK(dm.sal)+'/ano · comissão de '+dm.com+'%')+PMUI.quick('nf','sal',[['Referência do agente',dm.sal]])+'</div>'+
   '<div class="card"><h2>Duração</h2>'+PMUI.sgm('nf','anos',[[1,'1 ano'],[2,'2 anos'],[3,'3 anos'],[4,'4 anos'],[5,'5 anos']])+'</div>'+
   '<div class="card"><h2>Luvas</h2>'+PMUI.mny('nf','luvas','Luvas (bônus de assinatura)','Pagas uma única vez, na assinatura',25,'Referência: '+fmtK(dm.luvas))+'</div>'+
   '<div class="card"><h2>Papel prometido</h2>'+PMUI.sgm('nf','papel',[['titular','Titular'],['rotacao','Rotação'],['reserva','Reserva']])+'<p class="hint">Prometer titularidade ajuda a convencer, mas se ele não jogar a moral cai.</p></div>';
  if(ativo)h+='<div class="stk stk2"><div class="stk-t"><small>Custo total do contrato</small><b>'+fmtK((+f.sal||0)*(+f.anos||1)+(+f.luvas||0))+'</b></div><button data-pm="contrato">Enviar contrato</button></div>';
  right=PMUI.resumoContrato(f,n.j,up);
 }else{
  h+='<div class="card"><h2>'+(n.est==='concluida'?'Negócio concluído':n.est==='espera'?'Aguardando a próxima janela':n.fase==='medico'?'Exame médico':'Situação')+'</h2><p class="hint">'+(n.est==='espera'?'O acordo está fechado. O jogador se apresenta na abertura da próxima janela.':n.pend?'Aguarde: a resposta chega com o passar dos dias.':'')+'</p></div>'}
 h+='</div><div class="rs-st">'+right+PMUI.chat(n,t)+'</div></div>';
 PMUI.bindForm(PMUI.abre('neg',h),function(){PMUI.neg(PMUI.nid)})};

/* ===== contraproposta a uma oferta recebida ===== */
PMUI.ofDetalhe=function(oid){
 var o=S.ofe.filter(function(x){return x.id===oid})[0];if(!o)return;
 PM.ofertas.normal(o);PMUI.oid=oid;
 if(!PMUI.of||PMUI.of.id!==oid)PMUI.of={id:oid,f:PMUI.ofDef(o)};
 var f=PMUI.of.f,val=PM.valor(o.j),t=PM.tensao(o.pac),ativo=o.est==='aberta'&&!o.pend,nome=esc(PM.B.cl[o.de][CI.NOME]),emp=o.t==='emp',cp=PMUI.mkOf(f,o),tt=PMUI.totais(cp),stp=Math.max(10,Math.round(val*.04/10)*10);
 var h='<div class="picker-head"><h2>Proposta recebida</h2><button class="sec" data-pm="fechar">← Voltar</button></div>'+PMUI.jogHdr(o.j)+'<div class="negg"><div>';
 h+='<div class="card"><h2>Sua contraproposta</h2><p class="hint" style="margin-top:-6px">Defina o que você quer receber do '+nome+'.</p>';
 if(emp){
  h+=PMUI.sgm('of','empT',[['simples','Simples'],['opcao','Com opção de compra'],['obrig','Com obrigação']])+PMUI.mny('of','taxa','Taxa de empréstimo','Paga a você pelo '+nome,stp)+
   (f.empT!=='simples'?PMUI.mny('of','opc','Valor da compra definitiva','',stp):'')+(f.empT==='obrig'?PMUI.cnt('of','cond','Compra obrigatória após','Número de jogos do atleta',5):'');
 }else{
  h+=PMUI.mny('of','valor','Valor que você pede','Em dinheiro, pago pelo '+nome,stp,'Valor de mercado: '+fmtK(val)+' · proposta atual: '+fmtK(o.of.valor||0))+
   PMUI.quick('of','valor',[['Proposta atual',o.of.valor||0],['Valor de mercado',val],['120% do valor',val*1.2]])+
   '<div class="grp">Como receber</div>'+PMUI.sgm('of','parc',[[1,'À vista'],[2,'2 anos'],[3,'3 anos'],[4,'4 anos'],[5,'5 anos']]);
 }
 h+='</div>';
 if(!emp){
  h+='<div class="card"><h2>Jogadores que você quer receber <small class="opc">opcional</small></h2>'+PMUI.troca('of','troca',PM.by[o.de].slice().sort(function(a,c){return S.W.p[c][DD.O]-S.W.p[a][DD.O]}).slice(0,16),2)+'</div>'+
   '<div class="card">'+PMUI.tgl('of','ex','Cláusulas extras','Bônus por metas e % de revenda');
  if(f.ex){
   h+='<div class="grp">Bônus por metas</div>'+PMUI.sgm('of','bT',[['','Nenhum'],['jogos','Por jogos'],['gols','Por gols']]);
   if(f.bT)h+=PMUI.mny('of','bV','Valor do bônus','Pago a você se a meta for atingida',25)+PMUI.cnt('of','bA','Meta de '+(f.bT==='jogos'?'jogos':'gols'),'',f.bT==='jogos'?5:1);
   h+='<div class="grp">Revenda para o seu clube</div>'+PMUI.sgm('of','rev',[[0,'Nenhuma'],[5,'5%'],[10,'10%'],[15,'15%'],[20,'20%']])}
  h+='</div>'}
 if(ativo)h+='<div class="stk stk2"><div class="stk-t"><small>Você pede</small><b>'+fmtK(tt.total)+'</b></div><button data-pm="ofcontra">Enviar contraproposta</button></div>';
 h+='</div><div class="rs-st">'+PMUI.resumoOferta(o.of,1,'Proposta atual do '+nome)+
  (ativo?'<div class="mctl" style="margin-bottom:14px"><button data-pm="ofaceitar">Aceitar a proposta atual</button><button class="sec danger" data-pm="ofrecusar">Recusar</button></div>':'')+
  PMUI.resumoOferta(cp,1,'Sua contraproposta')+
  '<div class="card"><h2>Conversa</h2><div class="fh">'+PMUI.crest(o.de,40)+'<div style="flex:1"><b>'+nome+'</b><div class="hint" style="margin:0">'+(o.est==='aberta'?'Clima da conversa':'Estado: '+o.est)+'</div></div>'+(o.est==='aberta'?'<span class="tns t'+t[1]+'">'+t[0]+'</span>':'')+'</div>'+
  (o.pend?'<p class="hint">Aguardando resposta: chega em '+Math.max(0,o.pend.dia-S.hoje)+' dia(s).</p>':'')+
  '<div style="max-height:220px;overflow:auto">'+(o.msgs.length?o.msgs.slice(-8).map(function(m){return '<div class="bub '+m.q+'">'+esc(m.t)+'</div>'}).join(''):'<p class="hint">Sem mensagens ainda.</p>')+'</div></div></div></div>';
 PMUI.bindForm(PMUI.abre('ofe',h),function(){PMUI.ofDetalhe(PMUI.oid)})};

/* ===== renovação ===== */
PMUI.renovar=function(id){
 var d=S.W.p[id],p=PM.renov.pedido(id);
 if(!PMUI.rf||PMUI.rf.id!==id)PMUI.rf={id:id,sal:p.sal,anos:p.anos,luvas:p.luvas};
 var f=PMUI.rf,stp=Math.max(10,Math.round(p.sal*.03/10)*10);
 var h='<div class="picker-head"><h2>Renovar contrato</h2><button class="sec" data-pm="fechar">← Voltar</button></div>'+PMUI.jogHdr(id)+'<div class="negg"><div>'+
  '<div class="card"><h2>Salário</h2><div class="chips"><span class="chip">Atual: '+fmtK(d[DD.S])+'/ano</span><span class="chip">Termina em '+d[DD.F]+' ('+PM.mesesRest(id)+' meses)</span></div>'+
  PMUI.mny('rn','sal','Novo salário por ano','Pago ao jogador',stp,'Pedido do jogador: '+fmtK(p.sal))+PMUI.quick('rn','sal',[['Manter o atual',d[DD.S]],['Pedido do jogador',p.sal]])+'</div>'+
  '<div class="card"><h2>Duração</h2>'+PMUI.sgm('rn','anos',[[1,'1 ano'],[2,'2 anos'],[3,'3 anos'],[4,'4 anos'],[5,'5 anos']])+'</div>'+
  '<div class="card"><h2>Luvas</h2>'+PMUI.mny('rn','luvas','Luvas de renovação','Pagas uma única vez',25,'Referência: '+fmtK(p.luvas))+'</div>'+
  '<div class="stk stk2"><div class="stk-t"><small>Custo total do contrato</small><b>'+fmtK((+f.sal||0)*(+f.anos||1)+(+f.luvas||0))+'</b></div><button data-pm="renTentar" data-id="'+id+'">Propor renovação</button></div></div>'+
  '<div class="rs-st">'+PMUI.resumoContrato(f,id,0,d[DD.S])+'<div class="card"><p class="hint" style="margin:0">Se o jogador recusar, ele pode esperar o contrato acabar e sair de graça.</p></div></div></div>';
 PMUI.bindForm(PMUI.abre('ren',h),function(){PMUI.renovar(id)})};
PMUI.click=function(ev){
 var t=ev.target.closest?ev.target.closest('[data-pm],[data-ficha],[data-neg]'):null;if(!t)return;
 var a=t.getAttribute('data-pm'),v=t.getAttribute('data-v'),id=+t.getAttribute('data-id');
 if(a&&PMUI.click2(a,v,id,t))return;
 if(t.hasAttribute('data-ficha')&&!a){PMUI.ficha(+t.getAttribute('data-ficha'));return}
 if(t.hasAttribute('data-neg')&&!a){PMUI.neg(+t.getAttribute('data-neg'));return}
 var f=PMUI.nf,n=S.neg.filter(function(x){return x.id===PMUI.nid})[0],r;
 if(a==='irmercado'){ABA='mercado';render()}
 else if(a==='sub'){PMUI.sub=v;render()}
 else if(a==='busca'){PMUI.res=PMUI.buscar();render()}
 else if(a==='limpa'){for(var k in PMUI.f)PMUI.f[k]='';PMUI.res=[];render()}
 else if(a==='ord'){if(PMUI.ord===v)PMUI.dir*=-1;else{PMUI.ord=v;PMUI.dir=v==='n'?1:-1}PMUI.res=PMUI.buscar();render()}
 else if(a==='fechar'){PMUI.fechaTudo();render()}
 else if(a==='favorito'){PMUI.fav(id);PMUI.ficha(id)}
 else if(a==='negociar'){r=PM.neg.abrir(id);if(!r.ok){toast(r.m);return}salvar();PMUI.nf=null;PMUI.neg(r.n.id)}
 else if(a==='pre'){r=PM.preAssinar(id);if(!r.ok){toast(r.m);return}PMUI.nf=null;PMUI.neg(r.n.id)}
 else if(a==='nf'){f[t.getAttribute('data-k')]=v;PMUI.neg(PMUI.nid)}
 else if(a==='valor'){f.valor=Math.max(0,Math.round(f.valor+(+v)*n.ask*.05));PMUI.neg(PMUI.nid)}
 else if(a==='oferta'){r=PM.neg.oferta(n,PMUI.ofDeForm());if(!r.ok){toast(r.m);PMUI.neg(PMUI.nid)}else{salvar();PMUI.fechaTudo();render();toast('Proposta enviada. Avance o calendário no Painel para receber a resposta do clube.')}}
 else if(a==='contrato'){r=PM.neg.propJogador(n,{sal:+f.sal,anos:+f.anos,luvas:+f.luvas,papel:f.papel});if(!r.ok){toast(r.m);PMUI.neg(PMUI.nid)}else{salvar();PMUI.fechaTudo();render();toast('Proposta de contrato enviada. Avance o calendário para receber a resposta.')}}
 else if(a==='encerrar'){if(confirm('Encerrar esta negociação? Abandonar uma negociação adiantada prejudica sua reputação no mercado.')){PM.neg.encerrar(n);salvar();PMUI.fechaTudo();render()}}
 else if(a==='passar'){PMUI.fechaTudo();ABA='painel';render();avancar()}
 else if(a==='ofe'){var o=S.ofe.filter(function(x){return x.id===id})[0];var ev2=PM.ofertas.responder(o,v);ev2.forEach(function(e){toast(e.t)});salvar();render()}
 else if(a==='renovar'){PMUI.renovar(id)}
 else if(a==='renTentar'){var pr={sal:+PMUI.rf.sal,anos:+PMUI.rf.anos,luvas:+PMUI.rf.luvas};r=PM.renov.tentar(id,pr);toast(r.m);if(r.ok){PMUI.rf=null;salvar();PMUI.fecha('ren');PMUI.fecha('ficha');render()}else PMUI.renovar(id)}
 else if(a==='exOp'){var op=S.pendOp.filter(function(x){return x.jid===id})[0];if(S.caixa>=op.valor){S.caixa-=op.valor;PM.moverJog(id,S.wi);S.W.p[id][DD.F]=PM.ano()+3;S.pendOp=S.pendOp.filter(function(x){return x!==op});PM.sync();salvar();toast('Opção exercida')}else toast('Caixa insuficiente');render()}
 else if(a==='liberaOp'){var op2=S.pendOp.filter(function(x){return x.jid===id})[0];PM.moverJog(id,op2.orig);S.pendOp=S.pendOp.filter(function(x){return x!==op2});salvar();render()}
 else if(a==='preAss'){r=PM.preAssinar(id);if(!r.ok){toast(r.m);return}PMUI.nf=null;PMUI.neg(r.n.id)}
};

/* ---------- aba CONTRATOS ---------- */
PMUI.pContratos=function(){
 var ids=PM.by[S.wi].slice().sort(function(a,b){return PM.mesesRest(a)-PM.mesesRest(b)});
 var f=S.fin,fol=PM.folhaAno(),rec=PM.receitaAno();
 var h=PMUI.banner()+'<div class="tiles">'+tile('💰','Folha anual',fmtK(fol),Math.round(fol/rec*100)+'% da receita (limite '+Math.round(PM.cfg.ffp_folha_receita*100)+'%)',fol/rec>PM.cfg.ffp_folha_receita?'bad':'')+tile('⚠','Dívida salarial',fmtK(f.div),f.div?f.mes+' mês(es)':'Em dia',f.div?'bad':'ok')+tile('🎯','Confiança',Math.round(f.conf)+'/100','Teto de moral '+PM.moralCap(),'')+'</div>';
 if(S.pendOp.length)h+='<div class="card"><h2>Opções de compra pendentes</h2>'+S.pendOp.map(function(o){return '<div class="prox"><div><b>'+esc(PM.B.j[o.jid][JI.NOME])+'</b><small>Comprar por '+fmtK(o.valor)+'</small></div><div class="mctl"><button data-pm="exOp" data-id="'+o.jid+'">Exercer</button><button class="sec" data-pm="liberaOp" data-id="'+o.jid+'">Devolver</button></div></div>'}).join('')+'</div>';
 h+='<div class="card"><h2>Contratos do elenco</h2>'+ids.map(function(id){var b=PM.B.j[id],d=S.W.p[id],m=PM.mesesRest(id),c=m<=6?'bad':m<=12?'warn':m<=18?'':'good',alt=d[DD.ST]===1?' · recusou renovar':d[DD.ST]===2?' · pré-contrato':d[DD.EMP]>=0?' · emprestado':'';
  return '<div class="cv" data-ficha="'+id+'" style="cursor:pointer"><div class="pp g-'+grupoPos(b[JI.POSJ])+'" style="border-radius:8px;text-align:center;font-size:11px;font-weight:700;padding:5px 0">'+b[JI.POSJ]+'</div><div class="pn"><b style="display:block;font-size:14px">'+esc(b[JI.NOME])+'</b><small style="color:var(--mut)">'+d[DD.I]+' anos · OVR '+d[DD.O]+alt+'</small></div><div class="xc" style="text-align:right;font-size:13px">'+fmtK(d[DD.S])+'</div><div style="text-align:center;font-size:13px">até '+d[DD.F]+'</div><span class="chip '+c+'" style="text-align:center">'+m+' meses</span></div>'}).join('')+'</div>';
 var pre=PM.preAbertos().sort(function(a,b){return S.W.p[b][DD.O]-S.W.p[a][DD.O]}).slice(0,15);
 h+='<div class="card"><h2>Pré-contratos disponíveis (≤ 6 meses)</h2><p class="hint">Jogadores de outros clubes que podem assinar de graça e chegam ao fim do contrato deles.</p>'+pre.map(function(id){return PMUI.linha(id,PM.mesesRest(id)+' meses')}).join('')+'</div>';
 return h};
PMUI.bind=function(){var d=$('dash');if(d&&!d.pmb){d.pmb=1;d.addEventListener('click',PMUI.click);d.addEventListener('change',function(e){var k=e.target.getAttribute&&e.target.getAttribute('data-f');if(k){PMUI.f[k]=e.target.value}})}
 ['ficha','neg','ren','ofe'].forEach(function(n){var o=PMUI.ov(n);if(!o.pmb){o.pmb=1;o.addEventListener('click',PMUI.click)}});
 if(document.getElementById('pm-ficha').className.indexOf('on')>=0&&PMUI.fid){}};
PMUI.resumoTemp=function(o){
 var nm=function(l){return l.map(function(id){return PM.B.j[id][JI.NOME]}).join(', ')};var p=[];
 if(o.saem.length)p.push('Saíram (fim de contrato): '+nm(o.saem)+'.');if(o.chegam.length)p.push('Chegaram por pré-contrato: '+nm(o.chegam)+'.');
 if(o.aposent.length)p.push('Aposentados: '+nm(o.aposent)+'.');if(o.base)p.push('Subiu da base: '+PM.B.j[o.base][JI.NOME]+' ('+PM.d(o.base)[DD.I]+' anos, OVR '+PM.d(o.base)[DD.O]+').');
 var up=o.evol.filter(function(x){return x[1]>0}).sort(function(a,b){return b[1]-a[1]}).slice(0,3).map(function(x){return PM.B.j[x[0]][JI.NOME]+' +'+x[1]}),dn=o.evol.filter(function(x){return x[1]<0}).sort(function(a,b){return a[1]-b[1]}).slice(0,3).map(function(x){return PM.B.j[x[0]][JI.NOME]+' '+x[1]});
 if(up.length)p.push('Evoluíram: '+up.join(', ')+'.');if(dn.length)p.push('Perderam overall: '+dn.join(', ')+'.');
 o.bon.concat(o.emp).concat(o.mens).forEach(function(x){p.push(x)});
 modal('Virada de temporada',p.join(' ')||'Sem mudanças no elenco.',[{l:'Continuar',f:function(){}}])};
/* ---------- aba Mercado: propostas recebidas ---------- */
PMUI.pOfertas=function(){
 var os=S.ofe.filter(function(o){return o.est==='aberta'||o.est==='espera'||o.est==='fechando'});
 os.forEach(PM.ofertas.normal);
 var h='<div class="card"><h2>Ofertas recebidas</h2>';
 if(!os.length)return h+'<p class="hint">Nenhuma oferta no momento. Elas chegam durante as janelas; coloque jogadores nas listas para atrair mais propostas.</p></div>';
 os.slice().reverse().forEach(function(o){
  var b=PM.B.j[o.j];
  h+='<div class="prox"><div><b>'+esc(PM.B.cl[o.de][CI.NOME])+(o.t==='emp'?' quer o empréstimo de ':' quer ')+esc(b[JI.NOME])+(o.lst?' <span class="chip good">Na sua lista</span>':'')+'</b><small>'+esc(PM.neg.resumo(o.of).replace('Proposta: ',''))+' · valor de mercado '+fmtK(PM.valor(o.j))+
   (o.est==='fechando'?' · acordo aceito, resposta em '+Math.max(0,o.pend.dia-S.hoje)+' dia(s)':o.est==='espera'?' · acordo fechado, sai na próxima janela':o.pend?' · aguardando resposta ('+Math.max(0,o.pend.dia-S.hoje)+' dia(s))':' · expira em '+Math.max(0,o.exp-S.hoje)+' dias')+'</small></div>'+
   (o.est==='aberta'?'<div class="mctl"><button data-pm="ofver" data-id="'+o.id+'">Negociar</button>'+(o.pend?'':'<button class="sec" data-pm="ofe" data-v="aceitar" data-id="'+o.id+'">Aceitar</button><button class="sec" data-pm="ofe" data-v="recusar" data-id="'+o.id+'">Recusar</button>')+'</div>':'')+'</div>'});
 return h+'</div>'};

/* ---------- aba Mercado: minhas listas (transferência e empréstimo) ---------- */
PMUI.linhaMeu=function(id,btn){
 var b=PM.B.j[id],d=S.W.p[id],n=S.ofe.filter(function(o){return o.j===id&&o.est==='aberta'}).length;
 return '<div class="mk" style="grid-template-columns:40px minmax(0,1fr) 42px 80px auto" data-ficha="'+id+'"><div class="pp g-'+grupoPos(b[JI.POSJ])+'" style="border-radius:8px;text-align:center;font-size:11px;font-weight:700;padding:5px 0">'+b[JI.POSJ]+'</div><div class="pn"><b>'+esc(b[JI.NOME])+'</b><small>'+d[DD.I]+' anos · contrato até '+d[DD.F]+(n?' · '+n+' proposta(s)':'')+'</small></div><div class="ov '+ovCls(d[DD.O])+'" style="text-align:center;font-weight:800;border-radius:8px;padding:5px 0">'+d[DD.O]+'</div><div style="text-align:right;font-size:13px">'+fmtK(PM.valor(id))+'</div>'+btn+'</div>'};
PMUI.pLista=function(sub){
 var k=(sub==='lt'||sub==='t')?'t':'e';
 var L=PM.lista(),meu=PM.by[S.wi],lst=(k==='t'?L.t:L.e).filter(function(id){return meu.indexOf(id)>=0}),tit=k==='t'?'Lista de transferências':'Lista de empréstimo';
 var h='<div class="card"><h2>'+tit+' ('+lst.length+')</h2><p class="hint">'+(k==='t'?'Jogadores listados atraem mais propostas de compra e o clube comprador aceita pagar mais.':'Jogadores listados atraem propostas de empréstimo (bom para reservas e jovens que precisam de minutos).')+' As propostas chegam durante as janelas, na aba Ofertas.</p>';
 h+=lst.length?lst.map(function(id){return PMUI.linhaMeu(id,'<button class="sec" data-pm="deslistar" data-id="'+id+'">Remover</button>')}).join(''):'<p class="hint">Nenhum jogador nesta lista.</p>';
 h+='</div>';
 var outros=meu.filter(function(id){var d=S.W.p[id];return lst.indexOf(id)<0&&d[DD.EMP]<0&&!PM.recente(id)}).sort(function(a,b){return S.W.p[b][DD.O]-S.W.p[a][DD.O]});
 h+='<div class="card"><h2>Adicionar jogador à lista</h2>'+(outros.length?outros.map(function(id){return PMUI.linhaMeu(id,'<button data-pm="listar" data-v="'+k+'" data-id="'+id+'">Listar</button>')}).join(''):'<p class="hint">Nenhum jogador disponível.</p>')+'</div>';
 return h};

/* ---------- tela de negociação de uma proposta recebida ---------- */
PMUI.oid=0;PMUI.of=null;
PMUI.ofDef=function(o){
 var of=o.of,val=PM.valor(o.j);
 if(o.t==='emp'){var e=of.emp;return {valor:0,parc:1,troca:[],bT:'',bA:10,bV:0,rev:0,empT:e.t,taxa:Math.round(e.taxa*1.15),opc:e.valorOpc||Math.round(val),cond:e.cond||20}}
 return {valor:Math.round((of.valor||val)*1.12/10)*10,parc:1,troca:[],bT:'',bA:10,bV:0,rev:0,empT:'simples',taxa:0,opc:0,cond:20}};
PMUI.mkOf=function(f,o){
 if(o.t==='emp')return {emp:{t:f.empT,taxa:+f.taxa||0,valorOpc:f.empT==='simples'?0:+f.opc||0,cond:+f.cond||0}};
 var of={valor:+f.valor||0,parc:+f.parc||1,troca:f.troca.slice(),rev:+f.rev||0};
 if(f.bT&&+f.bV>0)of.bonus=[{t:f.bT,alvo:+f.bA||1,valor:+f.bV}];
 return of};
PMUI.getOf=function(){return S.ofe.filter(function(x){return x.id===PMUI.oid})[0]};

PMUI.refresca=function(id){render();var f=document.getElementById('pm-ficha');if(f&&f.className.indexOf('on')>=0&&PMUI.fid===id)PMUI.ficha(id)};

/* ações novas dos botões (chamado de dentro de PMUI.click; devolve true se tratou) */
PMUI.click2=function(a,v,id,t){
 var r,o,ev2;
 if(a==='listar'){
  var atual=PM.listaUser(id);
  if((v==='t'&&atual===1)||(v==='e'&&atual===2)){PM.deslistar(id);toast('Jogador removido da lista.')}
  else{r=PM.listar(id,v);toast(r.m);if(!r.ok)return true}
  salvar();PMUI.refresca(id);return true}
 if(a==='deslistar'){PM.deslistar(id);salvar();toast('Jogador removido da lista.');render();return true}
 if(a==='ofver'){PMUI.ofDetalhe(id);return true}
 if(a==='ofvalor'){o=PMUI.getOf();if(!o)return true;PMUI.of.f.valor=Math.max(0,Math.round(PMUI.of.f.valor+(+v)*PM.valor(o.j)*.05));PMUI.ofDetalhe(PMUI.oid);return true}
 if(a==='ofcontra'){o=PMUI.getOf();if(!o)return true;r=PM.ofertas.contra(o,PMUI.mkOf(PMUI.of.f,o));if(!r.ok){toast(r.m);PMUI.ofDetalhe(PMUI.oid)}else{salvar();PMUI.fecha('ofe');render();toast('Contraproposta enviada. Avance o calendário para receber a resposta.')}return true}
 if(a==='ofaceitar'||a==='ofrecusar'){o=PMUI.getOf();if(!o)return true;ev2=PM.ofertas.responder(o,a==='ofaceitar'?'aceitar':'recusar');ev2.forEach(function(e){toast(e.t)});salvar();PMUI.fecha('ofe');render();return true}
 if(a==='ofpassar'){PMUI.fechaTudo();ABA='painel';render();avancar();return true}
 return false};

/* ---------- avisos de proposta nova (pausam o calendário) ---------- */
PMUI.avisoOfertas=function(ofs){
 var go=function(id){ABA='mercado';PMUI.sub='ofe';render();if(id)PMUI.ofDetalhe(id)};
 if(ofs.length===1){modal('🔁 Nova proposta',ofs[0].t+'.',[{l:'Ver proposta',f:function(){go(ofs[0].id)}},{l:'Fechar',f:function(){}}]);return}
 var lista=ofs.slice(0,3).map(function(x){return x.t}).join(' · ')+(ofs.length>3?' · e mais '+(ofs.length-3)+'.':'.');
 modal('🔁 Novas propostas','Você recebeu '+ofs.length+' propostas novas: '+lista,[{l:'Ver propostas',f:function(){go(0)}},{l:'Fechar',f:function(){}}])};

/* resposta de clube/jogador a uma proposta enviada por você (pausa o calendário) */
PMUI.avisoResp=function(l){
 var go=function(x){ABA='mercado';PMUI.sub=x.nid?'neg':'ofe';render();if(x.nid)PMUI.neg(x.nid);else PMUI.ofDetalhe(x.oid)};
 if(l.length===1)modal('🔁 Resposta recebida',l[0].t+'.',[{l:l[0].nid?'Abrir negociação':'Ver proposta',f:function(){go(l[0])}},{l:'Depois',f:function(){}}]);
 else modal('🔁 Respostas recebidas',l.slice(0,3).map(function(x){return x.t}).join(' · ')+(l.length>3?' · e mais '+(l.length-3)+'.':'.'),[{l:'Ver negociações',f:function(){go(l[0])}},{l:'Depois',f:function(){}}])};

/* ---------- animação da folha salarial (dia 1 de cada mês) ---------- */
PMUI.animFolha=function(d,fila){
 ANIM=true;
 var a=$('anim'),dev=d.atraso>0,k=0,i,coins='',
  mes=new Date(PM.msHoje()).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}),
  outros=Math.round(d.depois-(d.antes+d.fix-d.opx-d.pago));
 mes=mes.charAt(0).toUpperCase()+mes.slice(1);
 for(i=0;i<14;i++)coins+='<span class="coin" style="left:'+ri(4,92)+'%;animation-delay:'+(Math.random()*1.6+.8).toFixed(2)+'s">🪙</span>';
 var row=function(l,v,c){k++;return '<div class="fol-row '+(c||'')+'" style="animation-delay:'+(k*.45).toFixed(2)+'s"><span>'+l+'</span><b>'+v+'</b></div>'};
 var rows=row('Caixa anterior',fmtK(d.antes))+row('Receita fixa (TV + comercial)','+ '+fmtK(d.fix),'up')+row('Custos operacionais','− '+fmtK(d.opx),'dn');
 if(outros)rows+=row('Parcelas e outros',(outros>0?'+ ':'− ')+fmtK(Math.abs(outros)),outros>0?'up':'dn');
 rows+=row('Folha salarial'+(d.divAnt>0?' (com atrasados)':''),'− '+fmtK(d.pago),'dn');
 if(dev)rows+=row('Salários em atraso',fmtK(d.atraso),'dn');
 var st=dev?
  '<div class="fol-st bad" style="animation-delay:'+((k+2)*.45+1.2).toFixed(2)+'s">⚠ Salários atrasados: '+fmtK(d.atraso)+' em aberto ('+d.mes+(d.mes>1?' meses seguidos':' mês')+')<div class="fol-warn">Isso afeta o desempenho do time: a moral do elenco cai, a confiança da diretoria diminui e os jogadores rendem menos em campo. Gere receita (vendas, bilheteria) para quitar a dívida.</div></div>':
  '<div class="fol-st ok" style="animation-delay:'+((k+2)*.45+1.2).toFixed(2)+'s">✔ Salários em dia</div>';
 a.innerHTML=mono(coins+'<div class="fol-box'+(dev?' dev':'')+'"><small>Folha de pagamento · '+esc(mes)+'</small><div style="margin-top:10px">'+rows+'</div><div class="fol-tot"><small>Caixa atual</small><div class="anim-num" id="fol-n" style="'+(dev||d.depois<0?'color:var(--bad)':'')+'">'+fmtK(d.antes)+'</div></div>'+st+'<button class="full" id="fol-ok" style="margin-top:14px">Continuar</button></div>');
 a.className='on';
 var t0=null,delay=(k+1)*450,dur=1600;
 function passo(ts){if(!t0)t0=ts;var p=Math.max(0,Math.min(1,(ts-t0-delay)/dur)),e=1-Math.pow(1-p,3),el=$('fol-n');if(!el)return;el.textContent=fmtK(d.antes+(d.depois-d.antes)*e);if(p<1)requestAnimationFrame(passo)}
 requestAnimationFrame(passo);
 $('fol-ok').onclick=function(){a.className='';a.innerHTML='';ANIM=false;render();if(fila)PMUI.avisoOfertas(fila)}};
PMUI.css2=function(){
 if(document.getElementById('pm-css2'))return;var s=document.createElement('style');s.id='pm-css2';
 s.textContent=
 '.fol-box{position:relative;background:var(--card);border:2px solid var(--c1);border-radius:18px;padding:22px 20px;max-width:440px;width:100%;box-shadow:0 20px 60px #000;animation:pop .25s;z-index:2}'+
 '.fol-box.dev{border-color:var(--bad)}.fol-box>small{color:var(--mut);text-transform:uppercase;font-size:11px}'+
 '.fol-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--bd);font-size:14px;animation:fadeIn .4s ease-out both}'+
 '.fol-row.up b{color:var(--c1)}.fol-row.dn b{color:var(--bad)}'+
 '.fol-tot{text-align:center;margin-top:14px}.fol-tot small{color:var(--mut);font-size:11px;text-transform:uppercase}'+
 '.fol-st{padding:10px 12px;border-radius:12px;margin-top:12px;font-weight:700;font-size:13px;animation:fadeIn .5s ease-out both}'+
 '.fol-st.ok{background:#3dbb6a26;color:#7ee2a0}.fol-st.bad{background:#ef444426;color:#fca5a5}'+
 '.fol-warn{font-weight:400;font-size:12px;color:var(--tx);margin-top:6px}';
 document.head.appendChild(s)};

PMUI.css3=function(){
 if(document.getElementById('pm-css3'))return;var s=document.createElement('style');s.id='pm-css3';
 s.textContent=[
 /* valores */
 ".mny{display:grid;gap:8px;margin:4px 0 14px}.mny-l{font-weight:600;font-size:14px}.mny-l small{display:block;color:var(--mut);font-weight:400;font-size:12px;margin-top:2px}",
 ".mny-c{display:grid;grid-template-columns:52px 1fr 52px;gap:8px}.mny-b{padding:0;font-size:24px;min-height:54px;background:var(--bg2);color:var(--tx);border:1px solid var(--bd)}",
 ".mny-v{display:flex;align-items:center;justify-content:center;gap:6px;background:var(--bg2);border:1px solid var(--bd);border-radius:12px;padding:0 10px;min-width:0}.mny-v:focus-within{border-color:var(--c1)}",
 ".pmw .mny-v input{border:0;background:transparent;padding:12px 0;margin:0;width:100%;min-width:0;text-align:center;font:800 24px Inter,Arial,sans-serif;color:var(--c1);-moz-appearance:textfield}.pmw .mny-v input:focus{outline:none}",
 ".mny-v input::-webkit-inner-spin-button,.mny-v input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}.mny-v span,.mny-v em{color:var(--mut);font-style:normal;font-weight:700}.mny-n{font:800 24px Inter,Arial,sans-serif;color:var(--c1)}",
 ".mny-h{font-size:12px;color:var(--mut)}.mny-q{display:flex;gap:6px;flex-wrap:wrap;margin:-4px 0 10px}.mny-q button{min-height:34px;padding:6px 12px;font-size:12px}",
 ".opc{font:400 11px Inter,Arial,sans-serif;color:var(--mut);margin-left:8px}",
 /* botões de escolha e toggle */
 ".sgm{display:flex;gap:6px;flex-wrap:wrap}.sgm button{flex:1;min-width:64px;min-height:44px;background:var(--bg2);color:var(--tx);border:1px solid var(--bd);text-transform:none;font-weight:600;font-size:13px}",
 ".sgm button.on{background:linear-gradient(180deg,#52c277,#1fa35a);color:#03150a;border-color:transparent}",
 ".tgl{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;text-align:left;background:var(--bg2);color:var(--tx);border:1px solid var(--bd);text-transform:none;font-weight:600}",
 ".tgl small{display:block;color:var(--mut);font-weight:400;font-size:12px}.tgl i{width:44px;height:26px;border-radius:99px;background:#0b120e;border:1px solid var(--bd);position:relative;flex:none;transition:background .2s,border-color .2s}",
 ".tgl i::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--mut);transition:transform .2s,background .2s}.tgl.on i{background:#1fa35a55;border-color:var(--c1)}.tgl.on i::after{transform:translateX(18px);background:var(--c1)}",
 /* troca de jogadores */
 ".tpk-hd{display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--mut);margin:0 0 8px}.tpk-hd b{color:var(--c1)}",
 ".tpk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;max-height:360px;overflow:auto;padding:2px}",
 ".tpk{display:flex;align-items:center;gap:10px;text-align:left;text-transform:none;background:var(--bg2);color:var(--tx);border:2px solid var(--bd);border-radius:12px;padding:8px 10px;min-height:58px;font-weight:400;transition:border-color .15s,background .15s}",
 ".tpk.on{border-color:var(--c1);background:#3dbb6a1f}.tpk.off{opacity:.4}.tpk-n{flex:1;min-width:0}.tpk-n b{display:block;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tpk-n small{color:var(--mut);font-size:11px}",
 ".tpk-c{width:22px;height:22px;border-radius:50%;border:2px solid var(--bd);flex:none;position:relative}.tpk.on .tpk-c{background:var(--c1);border-color:var(--c1)}",
 ".tpk.on .tpk-c::after{content:'';position:absolute;left:6px;top:2px;width:5px;height:10px;border:solid #03150a;border-width:0 2px 2px 0;transform:rotate(45deg)}",
 ".ph{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.ph .pp,.tpk .pp,.rs-n .pp,.tr-sub .pp{border-radius:7px;text-align:center;font-size:11px;font-weight:700;padding:5px 8px;min-width:42px;display:inline-block}",
 /* resumo */
 ".rs{border-color:var(--c1);background:linear-gradient(160deg,#10301f,#101512 65%)}.rs-big{text-align:center;padding:4px 0 14px;border-bottom:1px dashed #74d99a44;margin-bottom:8px}",
 ".rs-big small{display:block;color:var(--mut);font-size:12px}.rs-big b{display:block;font:800 32px/1.15 Inter,Arial,sans-serif;color:var(--c1);margin:4px 0}.rs-big em{font-style:normal;font-size:12px;color:var(--mut)}",
 ".rs-r{display:flex;justify-content:space-between;gap:10px;padding:8px 0;font-size:14px;border-bottom:1px solid #ffffff0d}.rs-r span{color:var(--mut)}.rs-r b{text-align:right}",
 ".rs-r.tot{border-bottom:0;font-weight:700;margin-top:4px;font-size:15px}.rs-r.tot span{color:var(--tx)}.rs-r.neg b{color:var(--bad)}.rs-r.pos b{color:var(--c1)}",
 ".rs-sep{height:1px;background:#74d99a33;margin:6px 0}.rs-n{font-size:12px;color:var(--mut);padding:2px 0 8px;display:grid;gap:4px}.rs-n .pp{padding:2px 6px;min-width:0;margin-right:6px}",
 ".rs-w{margin-top:8px;padding:8px 10px;border-radius:10px;background:#ef444422;color:#fca5a5;font-size:12px}",
 ".rs-st{display:grid;gap:14px;align-content:start}.rs-st>.card{margin:0}@media(min-width:800px){.rs-st{position:sticky;top:8px}}",
 ".stk2{align-items:center;gap:12px;border-top:1px solid var(--bd)}.stk2 .stk-t{flex:1}.stk2 .stk-t small{display:block;color:var(--mut);font-size:11px}.stk2 .stk-t b{font:800 20px Inter,Arial,sans-serif;color:var(--c1)}.stk2 button{flex:1.2}",
 /* animação de transferência */
 ".tr-box{position:relative;overflow:hidden;background:var(--card);border:2px solid var(--c1);border-radius:22px;padding:24px 20px 20px;max-width:440px;width:100%;text-align:center;box-shadow:0 24px 70px #000;animation:pop .3s;z-index:2}",
 ".tr-box.fail{border-color:var(--bad)}.tr-box::before{content:'';position:absolute;inset:0;background:radial-gradient(120% 55% at 50% 0%,#3dbb6a40,transparent 70%)}.tr-box.fail::before{background:radial-gradient(120% 55% at 50% 0%,#ef444440,transparent 70%)}.tr-box>*{position:relative}",
 ".tr-tag{display:inline-block;font:700 11px Inter,Arial,sans-serif;letter-spacing:.6px;text-transform:uppercase;padding:5px 14px;border-radius:99px;background:#3dbb6a26;color:#7ee2a0;animation:fadeIn .4s both}.fail .tr-tag{background:#ef444426;color:#fca5a5}",
 ".tr-nome{font:800 24px/1.2 Inter,Arial,sans-serif;margin:14px 0 6px;animation:trUp .5s .1s both}.tr-sub{color:var(--mut);font-size:13px;display:flex;gap:8px;justify-content:center;align-items:center;animation:trUp .5s .2s both}",
 ".tr-rota{display:grid;grid-template-columns:1fr 84px 1fr;align-items:center;gap:6px;margin:22px 0 12px}.tr-club{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;min-width:0;animation:trUp .5s .3s both}.tr-club b{font-weight:600;overflow-wrap:anywhere}",
 ".tr-trilho{position:relative;height:4px;border-radius:99px;background:#ffffff1f}.tr-trilho::after{content:'';position:absolute;left:0;top:0;bottom:0;width:0;border-radius:99px;background:var(--c1);animation:trFill 1.3s .8s ease-in-out forwards}",
 ".fail .tr-trilho::after{background:var(--bad);animation:trFail 1.6s .8s ease-in-out forwards}",
 ".tr-bola{position:absolute;top:50%;left:0;width:20px;height:20px;margin:-10px 0 0 -10px;border-radius:50%;background:var(--c1);box-shadow:0 0 0 5px #3dbb6a44;z-index:1;animation:trMove 1.3s .8s ease-in-out forwards}",
 ".fail .tr-bola{background:var(--bad);box-shadow:0 0 0 5px #ef444444;animation:trBack 1.6s .8s ease-in-out forwards}",
 ".ok .tr-dest .esc{animation:trPop .6s 2.05s both}.fail .tr-dest{animation:trUp .5s .3s both,trShake .5s 1.7s}",
 ".tr-msg{font-size:13px;margin:6px 0 14px;animation:fadeIn .5s 1.2s both}.tr-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;animation:fadeIn .5s 1.9s both}.tr-grid.one{grid-template-columns:1fr}",
 ".tr-grid>div{background:var(--bg2);border-radius:12px;padding:10px}.tr-grid small{display:block;color:var(--mut);font-size:11px}.tr-grid b{display:block;font:800 18px Inter,Arial,sans-serif}.tr-grid em{display:block;font-style:normal;font-size:12px;font-weight:700;color:var(--mut)}.tr-grid em.up{color:var(--c1)}.tr-grid em.dn{color:var(--bad)}",
 "@keyframes trUp{from{opacity:0;transform:translateY(12px)}}@keyframes trFill{to{width:100%}}@keyframes trFail{0%{width:0}55%{width:55%}100%{width:0}}",
 "@keyframes trMove{to{left:100%}}@keyframes trBack{0%{left:0}55%{left:55%}100%{left:0}}@keyframes trPop{40%{transform:scale(1.25);box-shadow:0 0 0 10px #3dbb6a55}}@keyframes trShake{0%,100%{transform:none}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}",
 /* calendário do painel (verde, fluido) */
 ".calcard{background:linear-gradient(135deg,#143c25,#0e1a13 70%);border:1px solid #74d99a33;gap:18px}",
 ".calpg{width:92px;border-radius:16px;background:linear-gradient(180deg,#52c277,#1fa35a);color:#03150a;box-shadow:0 8px 22px #0007,inset 0 1px 0 #ffffff55;animation:none;overflow:hidden}",
 ".calpg small{background:#0b140f66;color:#eafff0;padding:5px 0;font-weight:700;letter-spacing:.5px}.calpg b{font:800 40px/1 Inter,Arial,sans-serif;padding:10px 0 2px}.calpg b.tick{animation:calTick .45s cubic-bezier(.2,.8,.2,1)}",
 ".calpg em{color:#04301a;padding-bottom:8px;font-weight:600}.calpg.dj{outline:0;box-shadow:0 0 0 3px #eafff0,0 0 24px #3dbb6a88;animation:calPulse 1.6s ease-in-out infinite}",
 "@keyframes calTick{0%{transform:translateY(-55%);opacity:0;filter:blur(3px)}100%{transform:none;opacity:1;filter:none}}@keyframes calPulse{50%{box-shadow:0 0 0 3px #eafff0,0 0 34px #3dbb6acc}}",
 ".calinfo{flex:1;min-width:0}.calinfo>b{font-size:17px}.calbar{height:8px;border-radius:99px;background:#0b120e;margin-top:10px;overflow:hidden;border:1px solid var(--bd)}",
 ".calbar i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#1fa35a,#7ee2a0);transition:width .38s linear}"
 ].join('\n');
 document.head.appendChild(s)};
 PMUI.css();PMUI.css2();PMUI.css3();


var ABA='painel',ANIM=false,ENTRADA=true,CALM=null,CALDIR='';
var ELSORT='o',ELGRP=true;

var M=null,MT=null,ADV=false,ADVT=null,SELT=null;
var MOVE=false,MSEL=null;
var MAXSUB=5,VEL=300; /* máx. de substituições | ms por minuto de jogo */

/* ---------- formações e estilos ---------- */
var FORM={
 '4-3-3':{ZAG:2,LAT:2,VOL:1,MEI:2,ATA:3},
 '4-4-2':{ZAG:2,LAT:2,VOL:2,MEI:2,ATA:2},
 '4-2-3-1':{ZAG:2,LAT:2,VOL:2,MEI:3,ATA:1},
 '4-2-4':{ZAG:2,LAT:2,VOL:2,MEI:0,ATA:4},
 '3-5-2':{ZAG:3,LAT:2,VOL:1,MEI:2,ATA:2},
 '5-3-2':{ZAG:3,LAT:2,VOL:2,MEI:1,ATA:2},
 '4-5-1':{ZAG:2,LAT:2,VOL:1,MEI:4,ATA:1},
 '3-4-3':{ZAG:3,LAT:2,VOL:0,MEI:2,ATA:3}
};
var FORM_ORD=['4-3-3','4-4-2','4-2-3-1','4-2-4','3-5-2','5-3-2','4-5-1','3-4-3'];
var ESTILO={def:{a:.93,d:1.07,n:'Defensivo'},eq:{a:1,d:1,n:'Equilibrado'},ofe:{a:1.07,d:.94,n:'Ofensivo'}};
/* peso de cada posição no ataque e na defesa (4-3-3 soma 7.9 nos dois) */
var WA={GOL:0,ZAG:.2,LAT:.5,VOL:.6,MEI:1,ATA:1.3};
var WD={GOL:1.5,ZAG:1.3,LAT:.9,VOL:.9,MEI:.4,ATA:.1};
var REFW=7.9;

function porId(arr,id){for(var i=0;i<arr.length;i++)if(arr[i].id===id)return arr[i];return null}
function valorJog(j){return j.o*(.6+.4*j.f/100)}
function topo(el,u,p,n){
 return el.filter(function(j){return j.p===p&&!u[j.id]})
  .sort(function(a,b){return valorJog(b)-valorJog(a)}).slice(0,n)
  .map(function(j){u[j.id]=1;return {p:p,id:j.id}})}
/* monta os 11: GOL, LAT, ZAGs, LAT, VOLs, MEIs, ATAs (essa ordem é usada no campinho) */
function autoEscalar(el,form){
 var c=FORM[form],u={},s=[];
 s=s.concat(topo(el,u,'GOL',1));
 var lat=topo(el,u,'LAT',c.LAT),zag=topo(el,u,'ZAG',c.ZAG);
 if(lat[0])s.push(lat[0]);s=s.concat(zag);if(lat[1])s.push(lat[1]);
 s=s.concat(topo(el,u,'VOL',c.VOL),topo(el,u,'MEI',c.MEI),topo(el,u,'ATA',c.ATA));
 return s}
function novaEsq(el,form){return {form:form,estilo:'eq',slots:autoEscalar(el,form)}}

/* ---------- aba TÁTICA ---------- */
function pTat(c){
 var E=S.esq,on={};E.slots.forEach(function(s){on[s.id]=1});
 var pw=potencia({slots:E.slots,elenco:S.elenco,estilo:E.estilo,meu:true,wi:S.wi}),fm=fisMedia(),selNome='';
 if(SELT){var js=SELT.k==='s'?porId(S.elenco,E.slots[SELT.v].id):porId(S.elenco,SELT.v);if(js)selNome=js.n}
 var cfg='<div class="card"><h2>Formação e estilo</h2><div class="grp" style="margin-top:0">Formação</div><div class="opts">'+FORM_ORD.map(function(f){return '<button class="opt'+(E.form===f?' on':'')+'" data-form="'+f+'">'+f+'</button>'}).join('')+'</div><div class="grp">Estilo de jogo</div><div class="opts">'+Object.keys(ESTILO).map(function(k){return '<button class="opt'+(E.estilo===k?' on':'')+'" data-estilo="'+k+'">'+ESTILO[k].n+'</button>'}).join('')+'</div><p class="hint">Ofensivo: mais ataque e defesa mais frágil. Defensivo: o contrário. Trocar a formação remonta o time automaticamente.</p></div>';
 var campo='<div class="card"><h2>Escalação</h2><div class="selbar'+(selNome?' on':'')+'">'+(selNome?'<b>'+esc(selNome)+'</b> selecionado. Toque em outro jogador para trocar, ou nele de novo para cancelar.':'Toque em qualquer jogador (campo, banco ou fora do jogo) e depois em outro para trocar os dois de lugar.')+'</div>'+campoHTML(E.slots,S.elenco)+'<div class="legend" style="justify-content:center;margin:12px 0 0"><span><i style="background:#3dbb6a"></i>Físico bom</span><span><i style="background:#facc15"></i>Médio</span><span><i style="background:#ef4444"></i>Baixo</span><span><i style="background:#f97316"></i>Fora de posição</span></div></div>';
 var forca='<div class="card"><h2>Força do time</h2>'+bar('Ataque',Math.min(100,pw.atk),'mini',Math.round(pw.atk))+bar('Defesa',Math.min(100,pw.def),'mini',Math.round(pw.def))+bar('Físico dos titulares',fm,'mini',Math.round(fm)+'%')+'<p class="hint">No campo, o número é o overall e o anel mostra o preparo físico de cada jogador.</p></div>';
 var pi=POS.map(function(p){return p[0]}),ordP=function(a,b){return pi.indexOf(a.p)-pi.indexOf(b.p)||b.o-a.o},onB={};
 E.banco.forEach(function(id){onB[id]=1});
 var ban=E.banco.map(function(id){return porId(S.elenco,id)}).filter(Boolean).sort(ordP),
  fora=S.elenco.filter(function(j){return !on[j.id]&&!onB[j.id]}).sort(ordP);
 function linhas(arr,fo){return arr.map(function(j){
  var sel=SELT&&SELT.k==='r'&&SELT.v===j.id,fg=PM.d(j.id)[DD.FG]||0;
  return linhaJog(j,{cls:' clk'+(sel?' sel':''),attr:' data-res="'+j.id+'"',sub:(fo&&fg>=2?'Sem jogar há '+fg+' jogos · ':'')+j.i+' anos · '+(j.min||0)+' min'})}).join('')||'<p class="hint">Ninguém aqui.</p>'}
 var rs='<div class="card"><h2>Banco de reservas <span class="chip" style="margin-left:8px">'+ban.length+'/12</span></h2><div class="scroll">'+linhas(ban,0)+'</div></div>'+ 
  '<div class="card"><h2>Fora do jogo <span class="chip" style="margin-left:8px">'+fora.length+'</span></h2><p class="hint" style="margin-top:-4px">Não entram em campo nem no banco. Ficar muito tempo aqui derruba moral, fase e até overall.</p><div class="scroll">'+linhas(fora,1)+'</div></div>';
 return '<div class="tat-grid"><div>'+cfg+campo+'</div><div>'+forca+PMUI.cardEntro()+rs+'</div></div>'}
function campoHTML(slots,elenco){
 var L={GOL:[],DEF:[],VOL:[],MEI:[],ATA:[]},Y={GOL:90,DEF:72,VOL:55,MEI:38,ATA:15};
 slots.forEach(function(s,i){L[(s.p==='ZAG'||s.p==='LAT')?'DEF':s.p].push(i)});
 var h='<div class="campo"><div class="cl-mid"></div><div class="cl-circ"></div><div class="cl-ga"></div><div class="cl-gb"></div>';
 Object.keys(L).forEach(function(k){L[k].forEach(function(i,n){
  var s=slots[i],j=porId(elenco,s.id),x=(n+1)/(L[k].length+1)*100;
  var sel=SELT&&SELT.k==='s'&&SELT.v===i,fp=j.p!==s.p;
  h+='<div class="pj g-'+grupoPos(s.p)+(sel?' sel':'')+(fp?' fp':'')+'" style="left:'+x+'%;top:'+Y[k]+'%;view-transition-name:jg'+j.id+'" data-slot="'+i+'"><div class="pc" style="--p:'+Math.round(j.f)+';--fc:'+corFis(j.f)+'"><b>'+j.o+'</b></div><small>'+esc(j.n.split(' ').slice(-1)[0])+'</small><em>'+s.p+(fp?' · '+j.p:'')+'</em></div>'})});
 return h+'</div>'}
function clicarTat(k,v){
 var a=SELT,E=S.esq,sl=E.slots;
 if(!a){SELT={k:k,v:v};transicao(render);return}
 if(a.k===k&&a.v===v){SELT=null;transicao(render);return}
 var ida=a.k==='s'?sl[a.v].id:a.v,idb=k==='s'?sl[v].id:v,A=grpJog(ida),B=grpJog(idb);
 if(A[0]!=='s'&&B[0]===A[0]){SELT={k:k,v:v};transicao(render);return} /* mesmo grupo (banco/fora): só muda a seleção */
 if(A[0]==='s'&&B[0]==='s'){var t=sl[A[1]].id;sl[A[1]].id=sl[B[1]].id;sl[B[1]].id=t}
 else if(A[0]==='s'){sl[A[1]].id=idb;if(B[0]==='b')E.banco[B[1]]=ida}   /* titular <-> banco/fora */
 else if(B[0]==='s'){sl[B[1]].id=ida;if(A[0]==='b')E.banco[A[1]]=idb}
 else{if(A[0]==='b')E.banco[A[1]]=idb;else E.banco[B[1]]=ida}          /* banco <-> fora */
 SELT=null;salvar();transicao(render)}
function bindTat(){
 var q=$('dash').querySelectorAll('[data-form],[data-estilo],[data-slot],[data-res]');
 for(var i=0;i<q.length;i++)q[i].onclick=function(){
  var f=this.getAttribute('data-form'),e=this.getAttribute('data-estilo'),s=this.getAttribute('data-slot'),r=this.getAttribute('data-res');
  if(f){S.esq.form=f;S.esq.slots=autoEscalar(S.elenco,f);SELT=null;salvar();transicao(render)}
  else if(e){S.esq.estilo=e;salvar();transicao(render)}
  else if(s!==null)clicarTat('s',+s);
  else if(r!==null)clicarTat('r',+r)}}

/* ---------- mini classificação do painel ---------- */
function miniTab(o,pos,n){
 var i0=Math.max(0,Math.min(pos-3,n-5));
 var h='<div class="card"><h2>Classificação</h2><table class="cls"><tr><th>#</th><th>Clube</th><th>Pts</th><th>J</th><th>SG</th></tr>';
 o.slice(i0,i0+5).forEach(function(id,k){
  var t=S.tab[id],x=clube(id);
  h+='<tr class="'+(id===S.cid?'eu':'')+'"><td><span class="pos">'+(i0+k+1)+'</span></td><td class="nm">'+esc(x.n)+'</td><td class="pts">'+t.p+'</td><td>'+t.j+'</td><td>'+sg(t.gp-t.gc)+'</td></tr>'});
 return h+'</table><button class="sec full" id="b-tabcompleta" style="margin-top:10px">Ver tabela completa</button></div>'}

/* ---------- calendário: Avançar / Pausar ---------- */
function calDados(){
 var d=new Date(S.d0+S.hoje*864e5),f=S.dias[S.rod]-S.hoje,ini=S.rod>0?S.dias[S.rod-1]:PM.inicioTemporada(),tot=Math.max(1,S.dias[S.rod]-ini);
 return {m:d.toLocaleDateString('pt-BR',{month:'short',timeZone:'UTC'}).replace('.','')+' '+d.getUTCFullYear(),d:d.getUTCDate(),
  w:d.toLocaleDateString('pt-BR',{weekday:'long',timeZone:'UTC'}),f:f,
  t:f>0?f+' dia'+(f>1?'s':'')+' para o jogo':'Dia de jogo!',
  h:ADV?'Os dias estão passando… clique em Pausar para gerenciar o time.':f>0?'Avance o calendário até a próxima partida.':'Ajuste escalação e tática e vá para a partida.',
  p:Math.max(0,Math.min(100,Math.round((S.hoje-ini)/tot*100)))}}
function calHTML(){
 var c=calDados();
 return '<div class="calpg'+(c.f<=0?' dj':'')+'" id="cal-pg"><small id="cal-m">'+c.m+'</small><b id="cal-d">'+c.d+'</b><em id="cal-w">'+c.w+'</em></div>'+
  '<div class="calinfo"><b id="cal-t">'+c.t+'</b><div class="hint" id="cal-h">'+c.h+'</div><div class="calbar"><i id="cal-b" style="width:'+c.p+'%"></i></div></div>'}
function atualizaCal(){
 var b=$('cal-d');if(!b){var e=$('calbox');if(e)e.innerHTML=calHTML();return}
 var c=calDados();
 $('cal-m').textContent=c.m;$('cal-w').textContent=c.w;$('cal-t').textContent=c.t;$('cal-h').textContent=c.h;$('cal-b').style.width=c.p+'%';
 $('cal-pg').className='calpg'+(c.f<=0?' dj':'');
 b.textContent=c.d;b.classList.remove('tick');void b.offsetWidth;b.classList.add('tick')}
function avancar(){
 if(ADV||M||S.ev!==null||S.fim||ANIM||(S.evIng!==null&&S.evIng!==undefined))return;
 if(S.hoje>=S.dias[S.rod])return;
 ADV=true;render();ADVT=setInterval(passoDia,380)}
function passoDia(){
 S.hoje++;
 var ev=PM.dia();
 atualizaCal();
 var pausa=PMUI.eventos(ev);
 if(S.hoje>=S.dias[S.rod]){pararAv();render();toast('Dia de jogo! Confira a escalação.');salvar();return}
 if(pausa){pararAv();render();salvar()}}
function pararAv(){clearInterval(ADVT);ADV=false}
function pausar(){if(!ADV)return;pararAv();render();salvar()}

/* ---------- partida ao vivo ---------- */
function potencia(t){
 var A=0,D=0;
 t.slots.forEach(function(s){var j=porId(t.elenco,s.id);if(!j)return;
  var e=PM.efOv(j.id)*(.55+.45*j.f/100)*(j.p===s.p?1:.82);A+=e*WA[s.p];D+=e*WD[s.p]});
 var st=ESTILO[t.estilo],en=PM.entro(t.wi,t.slots,t.meu?S.esq.form:PM.W().c[t.wi].fo,t.estilo);
 return {atk:A/REFW*st.a+en.mod,def:D/REFW*st.d+en.mod,en:en}}
function criarTime(id,nome,elenco,slots,estilo,meu){
 return {id:id,nome:nome,elenco:elenco,estilo:estilo,meu:meu,subs:0,gols:{},am:{},saiu:{},
  slots:slots.map(function(s){return {p:s.p,id:s.id}})}}
function noCampo(t){return t.slots.map(function(s){return porId(t.elenco,s.id)})}
function banco(t){
 var on={};t.slots.forEach(function(s){on[s.id]=1});
 return t.elenco.filter(function(j){return !on[j.id]&&!t.saiu[j.id]&&(!t.ban||t.ban.indexOf(j.id)>=0)})}
function lg(txt){M.log.unshift(M.min+'’ '+txt)}
function escolhe(t,pesos){
 var l=noCampo(t),tot=0,w=l.map(function(j){var x=(pesos[j.p]||0)*(j.o/70);tot+=x;return x});
 var r=Math.random()*tot,k;for(k=0;k<l.length;k++){r-=w[k];if(r<=0)break}
 return l[Math.min(k,l.length-1)]}
function trocar(t,outId,inId){
 var i,o=porId(t.elenco,outId),n=porId(t.elenco,inId);
 for(i=0;i<t.slots.length;i++)if(t.slots[i].id===outId)break;
 if(i>=t.slots.length||!n)return;
 t.slots[i].id=inId;t.saiu[outId]=1;t.subs++;
 lg('🔁 '+t.nome+': sai '+o.n+', entra '+n.n)}
function iaSubs(t){
 if(t.subs>=MAXSUB||[55,60,65,70,75,80,85].indexOf(M.min)<0||Math.random()<.3)return;
 var c=noCampo(t).filter(function(j){return j.p!=='GOL'}).sort(function(a,b){return a.f-b.f})[0];
 if(!c)return;
 var b=banco(t).filter(function(j){return j.p===c.p}).sort(function(a,b){return valorJog(b)-valorJog(a)})[0]||
  banco(t).filter(function(j){return j.p!=='GOL'}).sort(function(a,b){return valorJog(b)-valorJog(a)})[0];
 if(b)trocar(t,c.id,b.id)}

function iniciarPartida(){
 var m=jogoMeu(),casa=m[0]===S.cid,adv=clube(casa?m[1]:m[0]),imp=0,e=null,preco=0;
 if(casa){imp=importancia(m);preco=S.preco||sugerido(imp);e=estimar(preco,imp,S.mod)}
 var oe=PM.elencoView(adv.wi);
 var meu=criarTime(S.cid,clube(S.cid).n,S.elenco,S.esq.slots,S.esq.estilo,true);meu.wi=S.wi;
 var opp=criarTime(adv.id,adv.n,oe,PM.escalar(adv.wi),PM.W().c[adv.wi].es||'eq',false);opp.wi=adv.wi;
 meu.titIni=meu.slots.map(function(s){return s.id});opp.titIni=opp.slots.map(function(s){return s.id});
ajustaBanco();meu.ban=S.esq.banco.slice();
 M={H:casa?meu:opp,A:casa?opp:meu,meu:meu,opp:opp,casa:casa,min:0,gh:0,ga:0,fimMin:90+ri(1,4),
  pausado:false,fim:false,ht:false,skip:false,log:[],selOut:null,selIn:null,est:e,preco:preco,adv:adv.n,oppWi:adv.wi};
 lg('▶ Bola rolando!');
 $('partida').className='on';
 rodar()}
function rodar(){M.pausado=false;M.selOut=null;M.selIn=null;clearInterval(MT);MT=setInterval(minuto,VEL);renderPartida()}
function pausarP(){if(!M||M.fim)return;clearInterval(MT);M.pausado=true;renderPartida()}
function pularP(){
 if(M.fim)return;clearInterval(MT);M.skip=true;M.pausado=false;
 while(!M.fim)minuto();
 M.skip=false;renderPartida()}

function minuto(){
 M.min++;
 var H=M.H,A=M.A;
 [H,A].forEach(function(t){noCampo(t).forEach(function(j){
  j.f=Math.max(5,j.f-(j.p==='GOL'?.1:.24)); /* cansaço por minuto em campo */
  if(t.meu)j.min=(j.min||0)+1})});
 var ph=potencia(H),pa=potencia(A);
 var lh=1.35*1.1*Math.pow(ph.atk/pa.def,1.6)/90,la=1.35/1.1*Math.pow(pa.atk/ph.def,1.6)/90;
 if(Math.random()<lh)golo(H);
 if(Math.random()<la)golo(A);
 lance(H,A);
 iaSubs(M.opp);if(M.skip)iaSubs(M.meu);
 if(M.min===45&&!M.ht&&!M.skip){M.ht=true;lg('⏸ Intervalo');pausarP();return}
 if(M.min>=M.fimMin){clearInterval(MT);M.fim=true;M.pausado=false;lg('🏁 Fim de jogo!')}
 if(!M.skip)renderPartida()}
function golo(t){
 var j=escolhe(t,{ATA:5,MEI:3,VOL:1,LAT:1.2,ZAG:.8,GOL:0});
 t.gols[j.id]=(t.gols[j.id]||0)+1;
 if(t===M.H)M.gh++;else M.ga++;
 lg('⚽ GOL! '+j.n+' ('+t.nome+')  '+M.gh+' x '+M.ga)}
function lance(H,A){
 var r=Math.random(),t=Math.random()<.5?H:A;
 if(r<.06){
  var j=escolhe(t,{ATA:5,MEI:3,VOL:1,LAT:1,ZAG:.5,GOL:0}),f=[' finaliza e o goleiro defende',' chuta de longe e a bola passa perto',' cabeceia para fora',' bate na trave!'];
  lg(j.n+f[ri(0,f.length-1)]+' ('+t.nome+')')}
 else if(r<.085){
  var c=noCampo(t).filter(function(j){return !t.am[j.id]});
  if(c.length){var p=c[ri(0,c.length-1)];t.am[p.id]=1;lg('🟨 '+p.n+' ('+t.nome+') leva cartão amarelo')}}}

function colTime(t){
 var clk=t.meu&&M.pausado&&!M.fim;
 var h='<div class="card"><h2>'+esc(t.nome)+'</h2><div class="chips"><span class="chip">'+ESTILO[t.estilo].n+'</span><span class="chip">Subs '+t.subs+'/'+MAXSUB+'</span></div>';
 t.slots.forEach(function(s){var j=porId(t.elenco,s.id),ic='',g;for(g=0;g<(t.gols[j.id]||0);g++)ic+=' ⚽';if(t.am[j.id])ic+=' 🟨';h+=linhaJog(j,{pos:s.p,ic:ic,cls:(clk?' clk':'')+(t.meu&&M.selOut===j.id?' sel':''),attr:clk?' data-out="'+j.id+'"':'',sub:j.i+' anos'+(j.p!==s.p?' · fora de posição':'')})});
 if(t.meu){h+='<div class="grp">Reservas</div>';banco(t).sort(function(a,b){return b.o-a.o}).forEach(function(j){h+=linhaJog(j,{cls:(clk?' clk':'')+(M.selIn===j.id?' sel':''),attr:clk?' data-in="'+j.id+'"':''})})}
 return h+'</div>'}
function renderPartida(){
 var H=M.H,A=M.A,h='<div class="mwrap">';
 h+='<div class="chips"><span class="chip">'+esc(clube(S.cid).n)+'</span><span class="chip">Rodada '+(S.rod+1)+'/'+RODADAS+'</span><span class="chip">Caixa '+mil(S.caixa)+'</span></div>';
 h+='<div class="placar"><b>'+esc(H.nome)+'</b><div><div class="big">'+M.gh+' x '+M.ga+'</div><small>'+(M.fim?'Encerrado':M.min+'’')+'</small></div><b>'+esc(A.nome)+'</b><span class="mprog" style="width:'+(M.fim?100:Math.min(100,Math.round(M.min/M.fimMin*100)))+'%"></span></div>';
 h+='<div class="card"><div class="mctl">';
 if(M.fim)h+='<button class="full" id="m-fim">Concluir partida</button>';
 else{
  h+='<button id="m-pause">'+(M.pausado?'▶ Continuar':'⏸ Pausar / Substituir')+'</button><button class="sec" id="m-skip">Pular</button>'+
   '<span class="hint">Substituições: '+M.meu.subs+'/'+MAXSUB+'</span>'}
 h+='</div>';
 if(M.pausado&&!M.fim){
  h+='<div class="grp">Estilo de jogo</div><div class="opts">'+Object.keys(ESTILO).map(function(k){return '<button class="opt'+(M.meu.estilo===k?' on':'')+'" data-mest="'+k+'">'+ESTILO[k].n+'</button>'}).join('')+'</div>'+
   '<p class="hint">Toque em um titular seu e depois em um reserva para substituir.</p>'}
 h+='</div><div class="mteams">'+colTime(H)+colTime(A)+'</div>';
 h+='<div class="card mlog"><h2>Lances</h2>'+M.log.map(function(x){var c=x.indexOf('⚽')>=0?'ev-gol':x.indexOf('🟨')>=0?'ev-card':x.indexOf('🔁')>=0?'ev-sub':'';return '<div class="'+c+'">'+esc(x)+'</div>'}).join('')+'</div></div>';
 var p=$('partida');p.innerHTML=mono(h);
 var b;
 if(b=$('m-pause'))b.onclick=function(){M.pausado?rodar():pausarP()};
 if(b=$('m-skip'))b.onclick=pularP;
 if(b=$('m-fim'))b.onclick=fecharPartida;
 var q,i;
 q=p.querySelectorAll('[data-mest]');for(i=0;i<q.length;i++)q[i].onclick=function(){M.meu.estilo=this.getAttribute('data-mest');renderPartida()};
 q=p.querySelectorAll('[data-out]');for(i=0;i<q.length;i++)q[i].onclick=function(){M.selOut=+this.getAttribute('data-out');subTentar()};
 q=p.querySelectorAll('[data-in]');for(i=0;i<q.length;i++)q[i].onclick=function(){M.selIn=+this.getAttribute('data-in');subTentar()}}
function subTentar(){
 if(M.selOut!==null&&M.selIn!==null){
  if(M.meu.subs>=MAXSUB)toast('Limite de substituições atingido.');
  else trocar(M.meu,M.selOut,M.selIn);
  M.selOut=null;M.selIn=null}
 renderPartida()}
function fecharPartida(){
 var mg=M.casa?M.gh:M.ga,tg=M.casa?M.ga:M.gh;
 var r={casa:M.casa,h:M.H.nome,a:M.A.nome,gh:M.gh,ga:M.ga,adv:M.adv,res:mg>tg?'V':mg<tg?'D':'E'};
 $('partida').className='';$('partida').innerHTML='';
 PM.aposPartida(M);concluirRodada(r);M=null}

/* ---------- utilidades ---------- */
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1))}
function sigla(nome){
 var p=String(nome||'CLUBE').split(/[\s&-]+/).filter(Boolean);
 if(p.length===1)return p[0].slice(0,3).toUpperCase();
 return p.slice(0,3).map(function(w){return w.charAt(0)}).join('').toUpperCase()}
function eurFull(v){return fmtK(v)}
function dataR(r){return new Date(S.d0+S.dias[r]*864e5)}
function fmtData(d){return d.toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short',timeZone:'UTC'})}
function jogoMeu(){return (S.cal[S.rod]||[]).filter(function(p){return p[0]===S.cid||p[1]===S.cid})[0]}
function jogoDaRodada(r){return (S.cal[r]||[]).filter(function(p){return p[0]===S.cid||p[1]===S.cid})[0]}

/* ---------- elenco e preparo físico ---------- */
var NOMES=['Lucas','Mateus','Rafael','Bruno','Diego','Thiago','Gabriel','Felipe','André','Caio','Vitor','Enzo','Pedro','Hugo','Marcos','Leandro','Rodrigo','Daniel','Samuel','Igor','Murilo','Otávio','Kevin','Nathan'];
var SOBRENOMES=['Silva','Santos','Costa','Almeida','Rocha','Ferreira','Lima','Moreira','Barros','Teixeira','Duarte','Nunes','Ribeiro','Campos','Pires','Araújo','Mendes','Cardoso','Souza','Freitas','Martins','Lopes','Vieira','Dias'];
var POS=[['GOL',3],['ZAG',4],['LAT',4],['VOL',3],['MEI',4],['ATA',5]];
var TIT={GOL:1,ZAG:2,LAT:2,VOL:1,MEI:2,ATA:3}; /* 4-3-3 */
var POSNOME={GOL:'Goleiros',ZAG:'Zagueiros',LAT:'Laterais',VOL:'Volantes',MEI:'Meias',ATA:'Atacantes'};
function gerarElenco(f){
 var e=[],usados={};
 POS.forEach(function(p){for(var i=0;i<p[1];i++){
  var n;do{n=NOMES[ri(0,NOMES.length-1)]+' '+SOBRENOMES[ri(0,SOBRENOMES.length-1)]}while(usados[n]);usados[n]=1;
  var tit=i<TIT[p[0]];
  e.push({n:n,p:p[0],i:ri(18,36),o:Math.max(40,Math.min(95,Math.round(f+(tit?ri(-6,8):ri(-16,0))))),f:100})}});
 e.forEach(function(j,i){j.id=i;j.min=0});
 return e}
function titulares(){
 return S.esq.slots.map(function(s){return porId(S.elenco,s.id)}).filter(Boolean)}
function fisMedia(){
 if(!S.elenco||!S.elenco.length)return 80;
 var t=titulares();return t.reduce(function(s,j){return s+j.f},0)/t.length}
function classeFis(v){return v>=70?'f-ok':v>=45?'f-mid':'f-low'}
function forca(c){return c.id===S.cid?c.f+(S.moral-50)/8+(fisMedia()-80)/6:c.f}

/* ---------- calendário ---------- */
function gerarDias(n){var g=[7,7,7,7,4,4,3,5,6,3],d=[0];for(var i=1;i<n;i++)d.push(d[i-1]+g[ri(0,g.length-1)]);return d}
function iniciarDatas(){
 S.dias=gerarDias(S.cal.length);
 var ano=(parseInt(S.temporadaBase,10)||2026)+(S.temp||1)-1;
 S.d0=Date.UTC(ano,7,8)}
function descanso(gap){return gap<=3?['Descanso curto','bad']:gap<=5?['Descanso moderado','warn']:['Descanso tranquilo','good']}

function zerar(){
 var t={},f={};
 S.cl.forEach(function(c){t[c.id]={p:0,j:0,v:0,e:0,d:0,gp:0,gc:0};f[c.id]=[]});
 S.tab=t;S.forma=f;S.cal=cal(S.cl.map(function(c){return c.id}));S.rod=0;RODADAS=S.cal.length;
 S.jogos=[];S.preco=0;S.mod=1;S.evIng=null;S.ingOk=false;
 iniciarDatas();
 S.hoje=PM.inicioTemporada();
 if(S.W)PM.novaTemporadaMundo(S.ligaId,S.dias[S.dias.length-1])}

/* compatibilidade com saves antigos (chame antes de abrir o jogo) */
function migrar(){
 S.cl.forEach(function(x){if(x.dbid)x.wi=PM.B.cIdx[x.dbid]});
 if(S.wi===undefined)S.wi=S.cl[S.cid].wi;
 if(!S.W){PM.novoMundo();PM.iniciarSave();S.esq=null}else PM.hidratar();
 if(!Object.keys(S.W.L).length)PM.novaTemporadaMundo(S.ligaId,S.dias[S.dias.length-1]);
 PM.sync();
 if(!S.dias||S.dias.length!==S.cal.length)iniciarDatas();
 if(!S.forma){S.forma={};S.cl.forEach(function(c){S.forma[c.id]=[]})}
 if(!S.jogos)S.jogos=[];
 if(S.evIng===undefined){S.evIng=null;S.ingOk=false;S.mod=1;S.preco=0}
 if(!S.evRec)S.evRec=[];
 S.elenco.forEach(function(j,i){if(j.id===undefined)j.id=i;if(j.min===undefined)j.min=0});
 if(!S.esq||!S.esq.slots||S.esq.slots.length!==11||S.esq.slots.some(function(s){return !porId(S.elenco,s.id)}))S.esq=novaEsq(S.elenco,'4-3-3');
 if(S.hoje===undefined)S.hoje=(S.rod>0&&S.dias[S.rod-1]!==undefined)?S.dias[S.rod-1]:-6}

/* ---------- ingressos ---------- */
function capacidade(c){return Math.round(8000+(c.rep||c.f)*500)}
function precoRef(c){return Math.round(15+(c.rep||c.f)*.6)}
function importancia(m){
 var adv=clube(m[0]===S.cid?m[1]:m[0]),o=ordem(),n=S.cl.length,pa=o.indexOf(adv.id)+1,pm=o.indexOf(S.cid)+1;
 var i=.25+.35*(adv.f/100)+.2*(S.rod/S.cal.length);
 if(S.rod>=Math.floor(S.cal.length/2)&&pa<=3&&pm<=3)i+=.25;
 if(S.rod>=S.cal.length-5&&(pm<=2||pm>n-4))i+=.15;
 return Math.max(.2,Math.min(1,i))}
function rotuloImp(i){return i<.45?'Jogo comum':i<.7?'Jogo importante':'Jogo decisivo'}
function sugerido(imp){return Math.round(precoRef(clube(S.cid))*(.8+.6*imp))}
function estimar(preco,imp,mult){
 var c=clube(S.cid),cap=capacidade(c),ref=precoRef(c)*(.8+.6*imp);
 var base=cap*(.45+.55*imp)*(.6+S.torc/250);
 var el=(1.6-1.1*imp)+Math.max(0,preco/ref-1)*.5; /* preço muito acima do justo derruba o público */
 var pub=Math.min(cap,Math.round(base*Math.pow(ref/preco,el)*(mult||1)));
 return {pub:pub,cap:cap,renda:Math.round(pub*preco/1000)}}
function prepararIngresso(){
 if(S.fim||S.ev!==null||S.ingOk||(S.evIng!==null&&S.evIng!==undefined))return;
 var m=jogoMeu();if(!m)return;
 S.ingOk=true;
 if(m[0]===S.cid&&Math.random()<.3)S.evIng=Math.floor(Math.random()*EV_ING.length)}
function atualizaIng(){
 var m=jogoMeu();if(!m||!$('tk'))return;
 var imp=importancia(m),e=estimar(S.preco,imp,S.mod);
 $('tk-p').textContent='€ '+S.preco;
 $('tk-pub').textContent=e.pub.toLocaleString('pt-BR');
 $('tk-oc').textContent=Math.round(e.pub/e.cap*100)+'%';
 $('tk-r').textContent=eurFull(e.renda)}

/* ---------- simulação ---------- */
function pushForma(id,r){var a=S.forma[id];a.push(r);if(a.length>5)a.shift()}
function simular(){
 if(S.esq.slots.length<11)S.esq=novaEsq(S.elenco,S.esq.form);
 if(S.esq.slots.length<11){toast('Você precisa de 11 jogadores. Contrate reforços no Mercado.');return}
 if(S.ev!==null||(S.evIng!==null&&S.evIng!==undefined)||S.fim||ANIM||M||ADV)return;
 if(S.hoje<S.dias[S.rod]){toast('Use "Avançar" até o dia do jogo.');return}
 iniciarPartida()}

function concluirRodada(r){
 var jogos=S.cal[S.rod],meu=jogoMeu(),est=M.est,preco=M.preco,renda=est?est.renda:0;
 PM.xiCache={};
 jogos.forEach(function(j){
  var h=clube(j[0]),a=clube(j[1]),gh,ga;
  if(j===meu){gh=r.gh;ga=r.ga}
  else{var rs=PM.simPartida(h.wi,a.wi);gh=rs[0];ga=rs[1]}
  var th=S.tab[h.id],ta=S.tab[a.id];
  th.j++;ta.j++;th.gp+=gh;th.gc+=ga;ta.gp+=ga;ta.gc+=gh;
  var rh,ra;
  if(gh>ga){th.v++;th.p+=3;ta.d++;rh='V';ra='D'}else if(gh<ga){ta.v++;ta.p+=3;th.d++;rh='D';ra='V'}else{th.e++;ta.e++;th.p++;ta.p++;rh='E';ra='E'}
  pushForma(h.id,rh);pushForma(a.id,ra)});
 var c=clube(S.cid);
 renda=Math.round(renda*PM.B.cl[S.wi][CI.FBIL]);if(est)est.renda=renda;PM.receber(renda);
 if(est){var ref=precoRef(c);if(preco>ref*1.8)S.torc=lim(S.torc-1.5);else if(preco<ref*.7)S.torc=lim(S.torc+1)}
 if(r.res==='V'){S.rep=lim(S.rep+1.5);S.moral=lim(S.moral+4);S.torc=lim(S.torc+1)}
 else if(r.res==='D'){S.rep=lim(S.rep-1.5);S.moral=lim(S.moral-4);S.torc=lim(S.torc-1.5)}
 S.jogos.unshift({r:S.rod+1,d:S.dias[S.rod],h:r.h,a:r.a,gh:r.gh,ga:r.ga,casa:r.casa,res:r.res,
  pub:est?est.pub:0,preco:est?preco:0,renda:renda});
 /* o cansaço agora é aplicado minuto a minuto na partida e a recuperação é diária no calendário */
 S.rod++;S.preco=0;S.mod=1;S.ingOk=false;
 if(S.rod>=S.cal.length)S.fim=true;
 else if(Math.random()<0.45)S.ev=sortearEvento();
 render();salvar();
 if(est)animar(est,preco,r.adv)}

/* ---------- animação da bilheteria ---------- */
function animar(est,preco,adv){
 ANIM=true;
 var a=$('anim'),coins='';
 for(var i=0;i<16;i++)coins+='<span class="coin" style="left:'+ri(4,92)+'%;animation-delay:'+(Math.random()*1.2).toFixed(2)+'s">🪙</span>';
 a.innerHTML=coins+'<div class="anim-box"><small>Bilheteria · contra '+esc(adv)+'</small><div class="anim-num" id="an-n">€ 0</div>'+
  '<div class="anim-sub">'+est.pub.toLocaleString('pt-BR')+' torcedores · ingresso a € '+preco+' · '+Math.round(est.pub/est.cap*100)+'% de ocupação</div>'+
  '<button class="full" id="an-ok">Guardar no caixa</button></div>';
 a.innerHTML=mono(a.innerHTML);a.className='on';
 var t0=null,dur=1800,alvo=est.renda;
 function passo(ts){if(!t0)t0=ts;var p=Math.min(1,(ts-t0)/dur);$('an-n')&&($('an-n').textContent='+ '+eurFull(alvo*(1-Math.pow(1-p,3))));if(p<1)requestAnimationFrame(passo)}
 requestAnimationFrame(passo);
 $('an-ok').onclick=function(){a.className='';a.innerHTML='';ANIM=false;render()}}

/* ---------- telas ---------- */
function tile(ico,lab,val,sub,cls){return '<div class="tile '+(cls||'')+'"><small>'+ico+' '+lab+'</small><b>'+val+'</b>'+(sub?'<em>'+sub+'</em>':'')+'</div>'}
function dots(arr){return '<span class="dots">'+(arr||[]).map(function(x){return '<span class="dot '+x+'">'+x+'</span>'}).join('')+'</span>'}

function pPainel(c,o,pos){
 var meu=jogoMeu(),n=S.cl.length,ok=pos<=c.m,fm=Math.round(fisMedia());
 var h=PMUI.painelExtra()+'<div class="tiles">'+
  tile('💰','Caixa',mil(S.caixa),'',S.caixa<0?'bad':'')+
  tile('🏆','Posição',pos+'º de '+n,ok?'✔ Dentro da meta (Top '+c.m+')':'✖ Meta: Top '+c.m,ok?'ok':'bad')+
  tile('💪','Preparo físico',fm+'%','Média dos titulares',fm<50?'bad':fm>=75?'ok':'')+
  tile('🎯','Meta da diretoria',esc(c.metaTxt||('Top '+c.m)),'')+
  '</div>';
 h+='<div class="card"><h2>Moral e torcida</h2>'+bar('Reputação · '+tier(S.rep),S.rep,'rep',Math.round(S.rep)+'/100')+bar('Moral do elenco',S.moral,'mini',Math.round(S.moral)+'/100')+bar('Torcida',S.torc,'mini',Math.round(S.torc)+'/100')+
  '<div class="chips"><span class="chip">Forma recente: '+(S.forma[S.cid].length?dots(S.forma[S.cid]):'sem jogos')+'</span></div></div>';
  h+=miniTab(o,pos,n);
 if(meu){
  var casa=meu[0]===S.cid,adv=clube(casa?meu[1]:meu[0]),pa=o.indexOf(adv.id)+1;
  var gap=S.rod>0?S.dias[S.rod]-S.dias[S.rod-1]:null,ds=gap!==null?descanso(gap):null;
  h+='<div class="card wide"><h2>Próximo jogo · Rodada '+(S.rod+1)+'/'+RODADAS+'</h2>'+
   '<div class="vs"><div class="vt">'+crest(clube(meu[0]),48)+'<b>'+esc(clube(meu[0]).n)+'</b></div><span>x</span><div class="vt">'+crest(clube(meu[1]),48)+'<b>'+esc(clube(meu[1]).n)+'</b></div></div>'+
   '<div class="chips"><span class="chip">📅 '+fmtData(dataR(S.rod))+'</span>'+
   '<span class="chip">'+(casa?'🏟 Em casa':'✈ Fora de casa')+'</span>'+
   '<span class="chip">Adversário: '+pa+'º lugar · força '+adv.f+'</span>'+
   (ds?'<span class="chip '+ds[1]+'">⏱ '+gap+' dias desde o último jogo · '+ds[0]+'</span>':'')+'</div>';
  if(casa){
   var imp=importancia(meu);if(!S.preco)S.preco=sugerido(imp);
   var e=estimar(S.preco,imp,S.mod);
   h+='<div class="sub">Ingressos</div><div class="chips"><span class="chip '+(imp>=.7?'warn':'')+'">'+rotuloImp(imp)+'</span>'+
    (S.mod&&S.mod!==1?'<span class="chip">Evento: público '+sg(Math.round((S.mod-1)*100))+'%</span>':'')+'</div>'+
    '<div class="price" id="tk-p">€ '+S.preco+'</div><input type="range" id="tk" min="5" max="250" step="1" value="'+S.preco+'">'+
    '<div class="kv"><div><small>Público estimado</small><b id="tk-pub">'+e.pub.toLocaleString('pt-BR')+'</b></div>'+
    '<div><small>Ocupação</small><b id="tk-oc">'+Math.round(e.pub/e.cap*100)+'%</b></div>'+
    '<div><small>Renda estimada</small><b id="tk-r">'+eurFull(e.renda)+'</b></div></div>'+
    '<p class="hint">Dica: em jogos comuns, ingresso caro esvazia o estádio. Em jogos decisivos, a torcida paga mais. Preço exagerado irrita a torcida.</p>';
  }else h+='<p class="hint">Jogo fora de casa: sem renda de bilheteria.</p>';
  h+='<div class="calcard" id="calbox">'+calHTML()+'</div>';
   var pronto=S.hoje>=S.dias[S.rod],bl=(S.ev!==null||S.fim||ANIM)?' disabled':'';
   if(pronto)h+='<button class="full" id="b-sim"'+bl+'>⚽ Ir para a partida</button></div>';
   else h+='<div class="mctl"><button id="b-adv"'+(bl||(ADV?' disabled':''))+'>▶ Avançar</button><button class="sec" id="b-pause"'+(ADV?'':' disabled')+'>⏸ Pausar</button></div></div>';
 }
 var u=S.jogos[0];
 if(u)h+='<div class="card wide"><h2>Último resultado</h2>'+cartaoJogo(u)+'</div>';
 return h}

function cartaoJogo(j){
 var nome={V:'Vitória',E:'Empate',D:'Derrota'}[j.res];
 return '<div class="mt '+j.res+'"><div class="mtd">'+fmtData(new Date(S.d0+j.d*864e5))+'<br>Rodada '+j.r+'</div>'+
  '<div class="mtc"><b>'+esc(j.h)+'</b><span class="sc">'+j.gh+' x '+j.ga+'</span><b>'+esc(j.a)+'</b>'+
  '<small>'+(j.casa?'🏟 Em casa':'✈ Fora')+(j.pub?' · Público '+j.pub.toLocaleString('pt-BR')+' · Ingresso € '+j.preco+' · Renda '+eurFull(j.renda):'')+'</small></div>'+
  '<span class="badge '+j.res+'">'+nome+'</span></div>'}

function pClass(c,o,pos){
 var n=S.cl.length,ok=pos<=c.m;
 var h='<div class="card"><h2>Classificação</h2>'+
  '<div class="chips"><span class="chip '+(ok?'good':'bad')+'">Você está em '+pos+'º · '+(ok?'dentro da meta':'fora da meta (Top '+c.m+')')+'</span></div>'+
  '<div class="legend"><span><i style="background:#1fa35a"></i>Zona da meta (Top '+c.m+')</span><span><i style="background:#b91c1c"></i>Zona de risco (3 últimos)</span><span><i style="background:#3dbb6a55"></i>Seu clube</span></div>'+
  '<div class="cls-wrap"><table class="cls"><tr><th>#</th><th>Clube</th><th>Pts</th><th>J</th><th class="hm">V</th><th class="hm">E</th><th class="hm">D</th><th>SG</th><th class="hm">Forma</th></tr>'+
  o.map(function(id,i){
   var t=S.tab[id],x=clube(id),z=(i+1<=c.m)?'z-top':(n>=10&&i+1>n-3)?'z-down':'',sgl=t.gp-t.gc;
   return '<tr class="'+z+(id===S.cid?' eu':'')+'"><td><span class="pos">'+(i+1)+'</span></td><td class="nm">'+esc(x.n)+'</td><td class="pts">'+t.p+'</td><td>'+t.j+'</td><td class="hm">'+t.v+'</td><td class="hm">'+t.e+'</td><td class="hm">'+t.d+'</td><td>'+sg(sgl)+'</td><td class="hm">'+dots(S.forma[id])+'</td></tr>'}).join('')+
  '</table></div></div>';
 return h}

function ajustaBanco(){
 var E=S.esq,on={},ids={},b=[];
 E.slots.forEach(function(s){on[s.id]=1});S.elenco.forEach(function(j){ids[j.id]=1});
 (E.banco||[]).forEach(function(id){if(ids[id]&&!on[id]&&b.indexOf(id)<0)b.push(id)});
 b=b.slice(0,12);
 if(b.length<12){
  var rest=S.elenco.filter(function(j){return !on[j.id]&&b.indexOf(j.id)<0}).sort(function(x,y){return valorJog(y)-valorJog(x)});
  if(!b.some(function(id){var j=porId(S.elenco,id);return j&&j.p==='GOL'})){var g=rest.filter(function(j){return j.p==='GOL'})[0];if(g){b.push(g.id);rest.splice(rest.indexOf(g),1)}}
  while(b.length<12&&rest.length)b.push(rest.shift().id)}
 E.banco=b}
function grpJog(id){var E=S.esq,i;for(i=0;i<E.slots.length;i++)if(E.slots[i].id===id)return ['s',i];i=E.banco.indexOf(id);return i>=0?['b',i]:['f',-1]}
function bindElenco(){
 var q=$('dash').querySelectorAll('[data-esort],[data-egrp]');
 for(var i=0;i<q.length;i++)q[i].onclick=function(){
  var s=this.getAttribute('data-esort');if(s)ELSORT=s;else ELGRP=!ELGRP;
  transicao(render)}}
function pElenco(c){
 var E=S.esq,fm=Math.round(fisMedia()),onS={},onB={},tit=titulares();
 E.slots.forEach(function(s){onS[s.id]=1});E.banco.forEach(function(id){onB[id]=1});
 var pi=POS.map(function(p){return p[0]});
 var crit={
  o:function(a,b){return b.o-a.o},
  i:function(a,b){return a.i-b.i},
  f:function(a,b){return b.f-a.f},
  m:function(a,b){return (b.min||0)-(a.min||0)},
  mo:function(a,b){return PM.d(b.id)[DD.MO]-PM.d(a.id)[DD.MO]},
  n:function(a,b){return a.n.localeCompare(b.n)}};
 var cmp=crit[ELSORT]||crit.o;
 function lin(j){
  var st=onS[j.id]?'Titular':onB[j.id]?'Banco':'Fora do jogo';
  return linhaJog(j,{star:!!onS[j.id],cls:' clk',attr:' data-ficha="'+j.id+'"',sub:st+' · '+j.i+' anos · '+(j.min||0)+' min · '+PMUI.mini(j.id)})}
 var ops=[['o','Overall'],['i','Idade'],['f','Físico'],['mo','Moral'],['m','Minutos'],['n','Nome']];
 var h='<div class="card"><h2>Elenco</h2><div class="chips"><span class="chip '+(fm<50?'bad':fm<70?'warn':'good')+'">Preparo físico dos titulares: '+fm+'%</span><span class="chip">'+S.elenco.length+' jogadores</span><span class="chip">★ titular ('+E.form+')</span></div>'+ 
  (fm<60?'<p class="hint" style="color:var(--warn)">Elenco cansado: o time rende menos.</p>':'')+
  '<div class="grp" style="margin-top:6px">Ordenar por</div><div class="opts">'+ops.map(function(o){return '<button class="opt'+(ELSORT===o[0]?' on':'')+'" data-esort="'+o[0]+'">'+o[1]+'</button>'}).join('')+'</div>'+ 
  '<div class="opts"><button class="opt'+(ELGRP?' on':'')+'" data-egrp="1">Agrupar por posição</button></div>'+ 
  '<p class="hint">Para mudar titulares, banco e fora do jogo, use a aba Tática.</p></div>';
 if(ELGRP){
  h+='<div class="card">';
  POS.forEach(function(p){
   var l=S.elenco.filter(function(j){return j.p===p[0]}).sort(cmp);
   h+='<div class="grp">'+POSNOME[p[0]]+' ('+l.length+')</div>'+l.map(lin).join('')});
  h+='</div>'}
 else h+='<div class="card">'+S.elenco.slice().sort(cmp).map(lin).join('')+'</div>';
 return h}
function pCal(c){
 var n=S.cal.length,h='<div class="card"><h2>Próximos jogos</h2>';
 for(var r=S.rod;r<Math.min(n,S.rod+5);r++){
  var m=jogoDaRodada(r),casa=m[0]===S.cid,adv=clube(casa?m[1]:m[0]),gap=r>0?S.dias[r]-S.dias[r-1]:null,ds=gap!==null?descanso(gap):null;
  h+='<div class="prox"><div><b>'+(casa?'🏟 ':'✈ ')+esc(adv.n)+'</b><small>Rodada '+(r+1)+' · '+fmtData(dataR(r))+'</small></div>'+
   (ds?'<span class="chip '+ds[1]+'">'+gap+' dias · '+ds[0]+'</span>':'<span class="chip">Estreia</span>')+'</div>'}
 h+='<p class="hint">Quanto menor o intervalo entre jogos, menos o elenco se recupera e mais cansados os titulares ficam.</p></div>';

 /* ---- calendário: um mês por vez ---- */
 var res={};S.jogos.forEach(function(j){res[j.r-1]=j.res});
 var mapa={};for(var q=0;q<n;q++){var d=dataR(q);mapa[d.getUTCFullYear()+'-'+d.getUTCMonth()+'-'+d.getUTCDate()]=q}
 var ini=dataR(0),fim=dataR(n-1);
 var minM=ini.getUTCFullYear()*12+ini.getUTCMonth(),maxM=fim.getUTCFullYear()*12+fim.getUTCMonth();
 var hj=new Date(S.d0+S.hoje*864e5),atualM=Math.max(minM,Math.min(maxM,hj.getUTCFullYear()*12+hj.getUTCMonth()));
 if(CALM===null)CALM=atualM;
 CALM=Math.max(minM,Math.min(maxM,CALM));
 var y=Math.floor(CALM/12),mo=CALM%12,dow=new Date(Date.UTC(y,mo,1)).getUTCDay(),dias=new Date(Date.UTC(y,mo+1,0)).getUTCDate();
 var cel='',jm=0,b,dd;
 for(b=0;b<dow;b++)cel+='<div></div>';
 for(dd=1;dd<=dias;dd++){
  var k=mapa[y+'-'+mo+'-'+dd];
  if(k===undefined){cel+='<div class="cd">'+dd+'</div>';continue}
  jm++;
  var mm=jogoDaRodada(k),ca=mm[0]===S.cid,ad=clube(ca?mm[1]:mm[0]);
  cel+='<div class="cd j '+(res[k]||'')+(k===S.rod?' next':'')+'">'+dd+'<i>'+(ca?'🏟 ':'✈ ')+esc(sigla(ad.n))+'</i></div>'}
 var nm=new Date(Date.UTC(y,mo,1)).toLocaleDateString('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'});
 nm=nm.charAt(0).toUpperCase()+nm.slice(1);
 h+='<div class="card"><h2>Calendário da temporada</h2><div id="calwrap">'+
  '<div class="calnav"><button class="sec calarr" id="cal-prev" aria-label="Mês anterior"'+(CALM<=minM?' disabled':'')+'>'+ico('chev-l')+'</button>'+
  '<div class="calttl"><b>'+nm+'</b><small>'+jm+(jm===1?' jogo':' jogos')+' neste mês</small></div>'+
  '<button class="sec calarr" id="cal-next" aria-label="Próximo mês"'+(CALM>=maxM?' disabled':'')+'>'+ico('chev-r')+'</button></div>'+
  '<div class="mes'+(CALDIR?' mes-'+CALDIR:'')+'"><div class="cg">'+['D','S','T','Q','Q','S','S'].map(function(x){return '<b>'+x+'</b>'}).join('')+cel+'</div></div>'+
  '<div class="legend" style="justify-content:center;margin:10px 0 0"><span><i style="background:#3dbb6a"></i>Vitória</span><span><i style="background:#facc15"></i>Empate</span><span><i style="background:#ef4444"></i>Derrota</span><span><i style="background:#fff"></i>Próximo jogo</span></div>'+
  (CALM!==atualM?'<div style="text-align:center;margin-top:8px"><button class="lnk" id="cal-hoje">Voltar ao mês atual</button></div>':'')+
  '</div></div>';
 CALDIR='';
 return h}

function bindCal(){
 var p=$('cal-prev'),nx=$('cal-next'),t=$('cal-hoje'),w=$('calwrap');
 if(!p)return;
 function ir(d){CALM+=d;CALDIR=d>0?'n':'p';render()}
 p.onclick=function(){ir(-1)};
 nx.onclick=function(){ir(1)};
 if(t)t.onclick=function(){CALM=null;CALDIR='';render()};
 if(w){var x0=null;
  w.ontouchstart=function(e){x0=e.touches[0].clientX};
  w.ontouchend=function(e){
   if(x0===null)return;
   var dx=e.changedTouches[0].clientX-x0;x0=null;
   if(Math.abs(dx)>50){var bt=dx<0?nx:p;if(!bt.disabled)bt.click()}}}}


function pHist(c){
 var J=S.jogos,v=0,e=0,d=0,gp=0,gc=0,bil=0;
 J.forEach(function(j){if(j.res==='V')v++;else if(j.res==='E')e++;else d++;gp+=j.casa?j.gh:j.ga;gc+=j.casa?j.ga:j.gh;bil+=j.renda||0});
 var apr=J.length?Math.round((v*3+e)/(J.length*3)*100):0;
 var h='<div class="card"><h2>Resultados da temporada '+S.temp+'</h2>'+
  '<div class="sum"><div><small>Jogos</small><b>'+J.length+'</b></div><div><small>V-E-D</small><b>'+v+'-'+e+'-'+d+'</b></div><div><small>Gols (pró x contra)</small><b>'+gp+' x '+gc+'</b></div><div><small>Aproveitamento</small><b>'+apr+'%</b></div><div><small>Bilheteria total</small><b>'+eurFull(bil)+'</b></div></div>';
 h+=J.length?J.map(cartaoJogo).join(''):'<p class="hint">Nenhuma partida disputada ainda.</p>';
 h+='</div>';
 if(S.hist&&S.hist.length)h+='<div class="card"><h2>Temporadas anteriores</h2>'+S.hist.map(function(x){return '<div class="res">Temporada '+x.t+': '+x.pos+'º lugar</div>'}).join('')+'</div>';
 return h}

function bar(l,v,cls,ex){return '<div class="lab"><span>'+l+'</span><b>'+(ex||Math.round(v))+'</b></div><div class="bar '+cls+'"><i style="width:'+v+'%"></i></div>'}
function pois(l){var L=Math.exp(-l),k=0,p=1;do{k++;p*=Math.random()}while(p>L);return k-1}
function ordem(){return S.cl.map(function(c){return c.id}).sort(function(a,b){var x=S.tab[a],y=S.tab[b];return y.p-x.p||(y.gp-y.gc)-(x.gp-x.gc)||y.gp-x.gp})}

var LOGO_HTML=document.querySelector('.top .logo').outerHTML;

function render(){
 prepararIngresso();if(S.esq&&S.esq.slots&&S.elenco)ajustaBanco();
 var c=clube(S.cid),o=ordem(),pos=o.indexOf(S.cid)+1;
 var tabs=[['painel','🏠 Painel'],['tat','⚙ Tática'],['class','🏆 Classificação'],['elenco','👥 Elenco'],['mercado','🔁 Mercado'],['contratos','💰 Contratos'],['cal','📅 Calendário'],['hist','📋 Resultados']];
 var fn={painel:pPainel,tat:pTat,class:pClass,elenco:pElenco,mercado:PMUI.pMercado,contratos:PMUI.pContratos,cal:pCal,hist:pHist};
 var h='<div class="card"><div class="hdrclub">'+crest(c,46)+'<div><h2>'+esc(c.n)+'</h2>'+
  '<span>'+esc(S.ligaNome||c.liga||'Liga nacional')+' · Técnico '+esc(S.tec)+' · Temporada '+S.temp+' · Rodada '+Math.min(S.rod+1,RODADAS)+'/'+RODADAS+'</span></div></div></div>'+
  '<aside class="side"><div class="side-logo">'+LOGO_HTML+'</div><div class="tabs">'+tabs.map(function(t){return '<button class="tab'+(ABA===t[0]?' on':'')+'" data-aba="'+t[0]+'">'+t[1]+'</button>'}).join('')+'</div></aside>'+
  '<div class="pane pane-'+ABA+(ENTRADA?' pane-in':'')+'">'+fn[ABA](c,o,pos)+'</div>';
 $('dash').innerHTML=mono(h);ENTRADA=false;
 var ts=$('dash').querySelectorAll('[data-aba]');
 for(var i=0;i<ts.length;i++)ts[i].onclick=function(){
  var a=this.getAttribute('data-aba');if(a===ABA)return;
  pausar();ABA=a;SELT=null;CALM=null;MSEL=null;MOVE=false;
  transicao(function(){render();window.scrollTo(0,0)},true)};
 if($('b-sim'))$('b-sim').onclick=simular;
 if($('b-adv'))$('b-adv').onclick=avancar;
 if($('b-pause'))$('b-pause').onclick=pausar;
 if($('b-tabcompleta'))$('b-tabcompleta').onclick=function(){
  ABA='class';CALM=null;transicao(function(){render();window.scrollTo(0,0)},true)};
 bindTat();bindCal();bindElenco();PMUI.bind();
 if($('tk'))$('tk').oninput=function(){S.preco=+this.value;atualizaIng()};
 pendencias()}

/* =====================================================================
   EDIÇÕES MANUAIS (pequenas) no resto do código
   =====================================================================
   A) mil() -> mostrar 2 casas decimais quando o valor for pequeno. Troque a função por:
      function mil(v){var d=Math.abs(v)<10000?2:1;return (v<0?'-':'')+'€ '+(Math.abs(Number(v)||0)/1000).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})+' mi'}

   B) No botão "Continuar" ($('b-cont').onclick=...), troque o final  tela('jogo');render();
      por  migrar();tela('jogo');render();

   C) Em iniciar(): logo DEPOIS do bloco  S={tec:tec, ... fim:false};  e ANTES de  zerar();
      acrescente:   S.elenco=gerarElenco(c.f);S.evRec=[];

   D) No HTML (corpo da página), troque a linha:
        <section class='tela' id='t-jogo'><div id='dash'/></section>
      por:
        <section class='tela' id='t-jogo'><div id='dash'/></section>
      e logo abaixo de  <div id='toast'/>  acrescente:  <div id='anim'/>
*/


function iniciar(){
 var tec=$('tec').value.trim();
 if(tec.length<2){msg('m-esc','Digite o nome do treinador.');window.scrollTo(0,0);return}
 if(SEL===null||!CLUBES[SEL]){msg('m-esc','Escolha um clube antes de continuar.');return}
 var c=CLUBES[SEL];
 S={tec:tec,cid:SEL,ligaId:c.ligaId,ligaNome:c.liga,ligaLogo:(LIGA_SEL&&LIGA_SEL.logo)||'',pais:c.pais,temporadaBase:c.temporada,
  temp:1,caixa:c.c,rep:lim(30+(c.f-50)/2),moral:70,torc:c.t,
  cl:JSON.parse(JSON.stringify(CLUBES)),ult:[],hist:[],ev:null,fim:false};
 S.evRec=[];S.cl.forEach(function(x){x.wi=PM.B.cIdx[x.dbid]});S.wi=S.cl[S.cid].wi;
 PM.novoMundo();PM.iniciarSave();PM.sync();S.esq=novaEsq(S.elenco,'4-3-3');
 zerar();tela('jogo');render();salvar();
 var ev0=[];PM.transicoes(ev0);PMUI.eventos(ev0);
}

function fimTemp(){
 var o=ordem(),pos=o.indexOf(S.cid)+1,c=clube(S.cid),ok=pos<=c.m,dr=ok?8:-6;
 var bonus=pos===1?500:pos<=3?200:0;
 modal('Fim da temporada '+S.temp,'Você terminou em '+pos+'º lugar. Meta cadastrada: '+(c.metaTxt||('Top '+c.m))+'. Para o cálculo do jogo, a meta equivale a Top '+c.m+'. '+(ok?'Meta cumprida!':'Meta não cumprida.')+' Reputação '+(dr>0?'+':'')+dr+(bonus?' · Premiação '+mil(bonus):'')+'.',
  [{l:'Iniciar próxima temporada',f:function(){
   var ordW=ordem().map(function(i){return S.cl[i].wi}),out=PM.fimTemporada(pos,S.ligaId,{user:ordW});
   S.hist.push({t:S.temp,pos:pos});S.rep=lim(S.rep+dr);PM.receber(bonus);S.temp++;S.fim=false;S.ult=[];
   S.cl.forEach(function(x){x.f=Math.max(40,Math.min(90,x.f+Math.round(Math.random()*4-2)))});
   zerar();PM.sync();if(S.esq.slots.length<11)S.esq=novaEsq(S.elenco,S.esq.form);render();salvar();PMUI.resumoTemp(out)}}]);
}


var SALVT=null;
function salvarJa(){
 if(!S||!SLOT)return;if(S.W)PM.compactar();var e=S.elenco;S.elenco=undefined;var j=JSON.stringify(S);S.elenco=e;
 var meta=metaSave();SLOTS[SLOT-1]=meta;
 var corpo={acao:'salvar',token:TOKEN,slot:SLOT,json:j,meta:meta};
 var tentar=function(n){
  api(corpo).catch(function(err){
   if(err.message==='sessao'){sair();return}
   if(n<2){setTimeout(function(){tentar(n+1)},2000*(n+1));return}
   toast('Não foi possível salvar: '+err.message)})};
 tentar(0)}
function salvar(){clearTimeout(SALVT);SALVT=setTimeout(salvarJa,1500)}

/* ---------- início ---------- */
if(API.indexOf('COLE_AQUI')===0){msg('m-auth','Configure a URL do proxy do Projeto Manager na variável API.')}
var HL=(location.hash||'').match(/#entrar=(l[a-f0-9]{20,})/);
if(HL){history.replaceState(null,'',location.pathname+location.search);msg('m-auth','Entrando…',true);
 api({acao:'link',link:HL[1]}).then(function(r){TOKEN=r.token;EMAIL=r.email;localStorage.setItem('pm_tok',TOKEN);localStorage.setItem('pm_mail',EMAIL);SLOTS=normSlots(r.slots);entrar(true)}).catch(function(e){msg('m-auth',e.message)})}
else if(TOKEN){entrar()}
})();
