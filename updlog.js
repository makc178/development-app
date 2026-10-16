window.UPDLOG_DATA={"app":"Development App","enabled":true,"retention_days":7,"ui":{},"generated_at":"2026-10-16T13:51+03:00","entries":[{"at":"2026-10-16T13:51+03:00","items":["Появилась кнопка «Обновления»: журнал изменений приложения за последние 7 дней, более старые записи удаляются автоматически."]},{"at":"2026-10-15T17:41+03:00","app":"Development App","items":["За день — 26 публикаций новой версии приложения. Подробного описания изменений в истории публикаций нет."]}]};
/* Реестр обновлений: маленькая кнопка «Обновления» и окно с журналом изменений за последние N дней.
   Общий модуль всех приложений (/workspace/shared/changelog/updlog.js). Данные: changelog.json рядом с index.html
   (кладёт changelog_tool.py publish при каждом деплое). Срок хранения — changelog.retention_days из config.json,
   приходит в changelog.json; на клиенте записи старше срока тоже отбрасываются. Персональных данных в записях нет. */
(function(){
'use strict';
if(window.__updlog)return;window.__updlog=1;
var S=document.currentScript,SRC=(S&&S.src)||'',BASE=SRC?SRC.replace(/[^\/?#]*([?#].*)?$/,''):'',VER=(SRC.match(/[?&]v=([^&]+)/)||[])[1]||'';
var DATA=null,BTN=null,DLG=null;
var MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function msk(t){var d=new Date(t+3*3600e3);return {key:d.getUTCFullYear()+'-'+d.getUTCMonth()+'-'+d.getUTCDate(),day:d.getUTCDate()+' '+MON[d.getUTCMonth()]+' '+d.getUTCFullYear(),hm:('0'+d.getUTCHours()).slice(-2)+':'+('0'+d.getUTCMinutes()).slice(-2)}}
function days(){var n=DATA&&+DATA.retention_days;return n>0?n:7}
function fresh(){if(!DATA)return [];var lim=Date.now()-days()*864e5;
 return (DATA.entries||[]).map(function(e){return {e:e,t:Date.parse(e&&e.at)}}).filter(function(x){return x.e&&!isNaN(x.t)&&x.t>=lim&&x.e.items&&x.e.items.length})
  .sort(function(a,b){return b.t-a.t})}
function css(){if(document.getElementById('updlog-css'))return;var st=document.createElement('style');st.id='updlog-css';st.textContent=
 '.updlog-btn{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border-radius:13px;font:500 12px/1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:inherit;opacity:.72;cursor:pointer;border:1px solid color-mix(in srgb,currentColor 22%,transparent);background:color-mix(in srgb,currentColor 6%,transparent);-webkit-tap-highlight-color:transparent;white-space:nowrap}'
+'.updlog-btn:hover,.updlog-btn:focus-visible{opacity:1}.updlog-btn:focus-visible{outline:2px solid color-mix(in srgb,currentColor 55%,transparent);outline-offset:2px}'
+'.updlog-btn svg{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}'
+'.updlog-btn.updlog-fixed{position:fixed;z-index:2147483000;width:30px;height:30px;padding:0;justify-content:center;border-radius:50%;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}'
+'.updlog-btn.updlog-fixed .updlog-lbl{display:none}'
+'.updlog-ov{position:fixed;inset:0;z-index:2147483001;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.45);padding:16px}'
+'.updlog-dlg{box-sizing:border-box;width:min(560px,100%);max-height:min(80vh,720px);display:flex;flex-direction:column;border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.35);font:14px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;overflow:hidden}'
+'.updlog-hd{display:flex;align-items:center;gap:8px;padding:14px 16px 10px;border-bottom:1px solid color-mix(in srgb,currentColor 14%,transparent)}'
+'.updlog-hd h2{margin:0;font-size:17px;font-weight:600;flex:1}.updlog-x{all:unset;cursor:pointer;width:30px;height:30px;border-radius:50%;text-align:center;line-height:30px;font-size:20px;opacity:.7}.updlog-x:hover,.updlog-x:focus-visible{opacity:1;background:color-mix(in srgb,currentColor 10%,transparent)}'
+'.updlog-sub{margin:0;padding:8px 16px 0;font-size:12px;opacity:.65}.updlog-body{overflow:auto;padding:4px 16px 16px;-webkit-overflow-scrolling:touch}'
+'.updlog-day{font-size:13px;font-weight:600;margin:14px 0 4px;opacity:.85}.updlog-e{padding:7px 0;border-top:1px solid color-mix(in srgb,currentColor 10%,transparent)}.updlog-day+.updlog-e{border-top:0}'
+'.updlog-meta{font-size:12px;opacity:.6}.updlog-e ul{margin:3px 0 0;padding-left:18px}.updlog-e li{margin:2px 0}.updlog-empty{opacity:.65;padding:16px 0}'
+'@media (prefers-reduced-motion:no-preference){.updlog-dlg{animation:updlog-in .16s ease-out}@keyframes updlog-in{from{transform:translateY(8px);opacity:0}to{transform:none;opacity:1}}}';
 document.head.appendChild(st)}
function bg(){var els=[document.body,document.documentElement];for(var i=0;i<els.length;i++){var c=els[i]&&getComputedStyle(els[i]).backgroundColor;if(c&&!/rgba\(0, 0, 0, 0\)|transparent/.test(c))return c}
 return matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'#1c1c1e':'#ffffff'}
function fg(){var c=document.body&&getComputedStyle(document.body).color;return c||'#111'}
function list(){var L=fresh(),h='',day='';L.forEach(function(x){var m=msk(x.t),e=x.e;if(m.key!==day){day=m.key;h+='<div class="updlog-day">'+esc(m.day)+'</div>'}
 h+='<div class="updlog-e"><div class="updlog-meta">'+m.hm+' МСК · '+esc(e.app||DATA.app||'')+(e.section?' · '+esc(e.section):'')+'</div><ul>'+e.items.map(function(s){return '<li>'+esc(s)+'</li>'}).join('')+'</ul></div>'});
 return h||'<div class="updlog-empty">За последние '+days()+' дн. обновлений не было.</div>'}
function close(){if(!DLG)return;DLG.remove();DLG=null;document.removeEventListener('keydown',key,true);if(BTN)try{BTN.focus()}catch(e){}}
function key(ev){if(ev.key==='Escape'){ev.stopPropagation();close()}}
function open(){if(DLG)return;if(!DATA){load(function(){if(DATA)open()});return}
 DLG=document.createElement('div');DLG.className='updlog-ov';DLG.id='updlog';
 DLG.innerHTML='<div class="updlog-dlg" role="dialog" aria-modal="true" aria-labelledby="updlog-h" style="background:'+bg()+';color:'+fg()+'"><div class="updlog-hd"><h2 id="updlog-h">Обновления</h2><button type="button" class="updlog-x" aria-label="Закрыть" title="Закрыть">×</button></div>'
 +'<p class="updlog-sub">Что изменилось за последние '+days()+' дн. · время московское · более старые записи удаляются автоматически</p><div class="updlog-body">'+list()+'</div></div>';
 DLG.addEventListener('click',function(ev){if(ev.target===DLG||ev.target.closest('.updlog-x'))close()});
 document.body.appendChild(DLG);document.addEventListener('keydown',key,true);DLG.querySelector('.updlog-x').focus()}
var ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4v4h4"/><path d="M12 7.5V12l3 2"/></svg>';
function button(){var u=DATA&&DATA.ui||{};css();
 var b=document.createElement('button');b.type='button';b.className='updlog-btn';b.id='updlog-btn';b.title='Обновления — что изменилось за последние '+days()+' дн.';b.setAttribute('aria-label','Обновления');
 b.innerHTML=ICON+'<span class="updlog-lbl">'+esc(u.label||'Обновления')+'</span>';b.addEventListener('click',function(ev){ev.preventDefault();ev.stopPropagation();open()});
 BTN=b;var tries=0;
 (function place(){var m=u.mount&&document.querySelector(u.mount);
  if(m){if(u.inline_style)b.setAttribute('style',u.inline_style);if(u.where==='prepend')m.insertBefore(b,m.firstChild);else m.appendChild(b);watch(m);return}
  if(u.mount&&++tries<40){setTimeout(place,250);return}
  b.classList.add('updlog-fixed');var p=u.pos||'bl',off=(u.offset!=null?u.offset:12)+'px',side=(u.side_offset!=null?u.side_offset:12)+'px';
  b.style[p.charAt(0)==='t'?'top':'bottom']='calc('+off+' + env(safe-area-inset-'+(p.charAt(0)==='t'?'top':'bottom')+',0px))';b.style[p.charAt(1)==='r'?'right':'left']=side;
  b.style.color=fg();b.style.background='color-mix(in srgb,'+bg()+' 80%,transparent)';document.body.appendChild(b);dodge(p,off);
  var tm=0;function later(){clearTimeout(tm);tm=setTimeout(function(){dodge(p,off)},400)}addEventListener('resize',later);
  if(window.MutationObserver)new MutationObserver(function(rs){for(var i=0;i<rs.length;i++){var t=rs[i].target;if(t!==BTN&&!(BTN&&BTN.contains(t))&&!(DLG&&DLG.contains(t))){later();return}}}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden']})})()}
/* плавающая кнопка не должна закрывать кнопки и меню приложения: если под ней что-то нажимаемое — поднимаем/опускаем её шагами */
var HIT='button,a,input,select,textarea,label,[role=button],[role=tab],[onclick],nav,.bottom,.tabbar';
function blocked(r){var pts=[[r.left+r.width/2,r.top+r.height/2],[r.left+2,r.top+2],[r.right-2,r.top+2],[r.left+2,r.bottom-2],[r.right-2,r.bottom-2]];
 for(var i=0;i<pts.length;i++){var e=document.elementFromPoint(pts[i][0],pts[i][1]);if(e&&e!==document.body&&e!==document.documentElement&&e.closest(HIT)&&!e.closest('#updlog-btn'))return true}return false}
function dodge(p,off){var b=BTN;if(!b||!b.classList.contains('updlog-fixed'))return;var k=p.charAt(0)==='t'?'top':'bottom',base='calc('+off+' + env(safe-area-inset-'+k+',0px))';
 b.style.pointerEvents='none';b.style[k]=base;for(var i=0;i<14;i++){if(!blocked(b.getBoundingClientRect()))break;b.style[k]='calc('+off+' + '+((i+1)*36)+'px + env(safe-area-inset-'+k+',0px))'}b.style.pointerEvents=''}
/* приложения перерисовывают шапку — возвращаем кнопку, если её убрали */
function watch(m){if(!window.MutationObserver)return;var mo=new MutationObserver(function(){if(BTN&&!document.contains(BTN)){var u=DATA.ui||{},n=document.querySelector(u.mount);if(n){if(u.where==='prepend')n.insertBefore(BTN,n.firstChild);else n.appendChild(BTN)}}});mo.observe(document.body,{childList:true,subtree:true})}
function load(cb){var x=new XMLHttpRequest();x.open('GET',BASE+'changelog.json'+(VER?'?v='+VER:'')+(VER?'&':'?')+'t='+Math.floor(Date.now()/6e4));
 x.onload=function(){try{if(x.status>=200&&x.status<300)DATA=JSON.parse(x.responseText)}catch(e){}cb&&cb()};x.onerror=function(){cb&&cb()};x.send()}
function init(){if(window.UPDLOG_DATA){DATA=window.UPDLOG_DATA;button();return}load(function(){if(DATA&&DATA.enabled!==false)button()})}
window.UpdLog={open:open,close:close,entries:function(){return fresh().map(function(x){return x.e})}};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
