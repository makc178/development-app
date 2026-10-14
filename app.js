'use strict';
/* Development App — код без данных. Данные: закрытый репозиторий DATA_REPO, ключ GitHub хранится на устройстве, зашифрован PIN-кодом. */
const DATA_REPO = 'makc178/claims-registry-data', DATA_FILE = 'devapp/bundle.json', PIN_BLOB = {"v": 1, "bv": 1792019557, "kdf": "PBKDF2-SHA256", "iterations": 600000, "salt": "geeU2a+faLK1WUZBzTrvKw==", "iv": "99S+B+B9SUbi9755", "ct": "gnTd4TwXsESLfAZf0nPzQr6aJs7E4EeRN8CgMMRrF4z8Wu8bMB/rlGwFePBNWG1gLJGBjGGGLbL3EwuamS2S501ru/EJamIIXFpCGV/xOqTdCST2J7gfpo9P6qVW6TAMCUzPRny9QoiwJKu1oPMZDvzW3uE="}, LT = {"bg": "#14213D", "digit": "#EFE6D2", "border": "#C9A45C", "dot": "#C9A45C", "glass": "rgba(255,255,255,.06)", "glass_active": "rgba(201,164,92,.18)", "button_px": 72, "logo_text": "MI Development", "error": "#E8A39B", "logo_src": "logo.svg", "logo_w": 96, "logo_gap": 32};
const $ = s => document.querySelector(s), A = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const nf = (n, d = 0) => (n == null || !isFinite(n)) ? '—' : n.toLocaleString('ru-RU', {maximumFractionDigits: d, minimumFractionDigits: 0});
const ICON = 'icon.svg';
let B = null, C = null, TAB = 'price', F = {group: '', organ: '', year: '', tag: '', q: ''}, TEPI = {region: 'СПб', scen: 'po_pravu', cls: 'комфорт', zone: 'обычная', lo: 'А', urv: false}, LAW = {view: 'rules', region: ''};

/* ---------- крипто ---------- */
const te = new TextEncoder(), td = new TextDecoder();
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function kdf(pin, salt) {
  const k = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256'}, k, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
}
const ghH = t => ({Authorization: 'Bearer ' + t, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28'});

/* ---------- вход: только PIN (как в Эвересте) ---------- */
async function unblob(pin) {
  const B0 = PIN_BLOB, k = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({name: 'PBKDF2', salt: ub64(B0.salt), iterations: B0.iterations, hash: 'SHA-256'}, k, {name: 'AES-GCM', length: 256}, false, ['decrypt']);
  const t = td.decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: ub64(B0.iv)}, key, ub64(B0.ct)));
  if (!t.startsWith('devapp:')) throw new Error('bad'); return t.slice(7);
}
let PINV = '', BUSY = false, TOKEN = null;
function lockScreen(msg = '') {
  PINV = '';
  document.body.style.background = LT.bg;
  A.innerHTML = `<style>.lk{min-height:100vh;background:${LT.bg};color:${LT.digit};display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 16px}
  .lk .logo-slot{font-size:15px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:${LT.digit};border:1px dashed ${LT.border}80;border-radius:12px;padding:10px 16px}
  .lk .sub{color:${LT.digit};opacity:.6;margin-top:${LT.logo_gap}px;font-size:14px}.lk .dots i{border-color:${LT.dot}}.lk .dots i.f{background:${LT.dot}}
  .lk .kp{grid-template-columns:repeat(3,${LT.button_px}px)}.lk .kp button{width:${LT.button_px}px;height:${LT.button_px}px;border-radius:50%;background:${LT.glass};border:1px solid ${LT.border};color:${LT.digit};box-shadow:none;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);font-weight:300}
  .lk .kp button:active{background:${LT.glass_active}}.lk .kp button.bk{border:0;background:none;font-size:22px}.lk .err{color:${LT.error};text-align:center}</style>
  <div class="lk">${LT.logo_src ? `<img src="${LT.logo_src}" alt="${esc(LT.logo_text)}" style="width:${LT.logo_w}px;height:auto">` : `<div class="logo-slot">${esc(LT.logo_text)}</div>`}<div class="dots" id="dots" aria-label="Введите PIN" style="margin-top:${LT.logo_gap}px">${'<i></i>'.repeat(4)}</div><div class="err" id="err">${esc(msg || (PIN_BLOB ? '' : 'Вход не настроен'))}</div>
  <div class="kp" id="kp">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('')}<span></span><button data-k="0">0</button><button data-k="b" class="bk" aria-label="Стереть">⌫</button></div></div>`;
  $('#kp').onclick = e => { const b = e.target.closest('button'); if (b) key(b.dataset.k); };
  document.onkeydown = e => { if (!B && /^[0-9]$/.test(e.key)) key(e.key); else if (!B && e.key === 'Backspace') key('b'); };
}
function dots() { $('#dots').querySelectorAll('i').forEach((i, n) => i.classList.toggle('f', n < PINV.length)); }
async function key(k) {
  if (BUSY || !PIN_BLOB) return;
  if (k === 'b') PINV = PINV.slice(0, -1); else if (PINV.length < 4) PINV += k;
  dots(); if (PINV.length < 4) return;
  BUSY = true; $('#err').textContent = 'Проверяю…';
  let tok;
  try { tok = await unblob(PINV); } catch { BUSY = false; PINV = ''; dots(); $('#err').textContent = 'Неверный PIN'; return; }
  try { await load(tok); TOKEN = tok; document.onkeydown = null; } catch (e) { $('#err').textContent = e.message; PINV = ''; dots(); }
  BUSY = false;
}
async function load(tok) {
  const r = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${DATA_FILE}?ref=main`, {headers: ghH(tok), cache: 'no-store'});
  if (!r.ok) throw new Error(r.status === 404 ? 'Данные не найдены' : 'GitHub ' + r.status);
  B = await r.json(); C = B.config; document.body.style.background = ''; render();
}

/* ---------- правила групп (из конфига) ---------- */
function groupOf(d) {
  for (const g of C.decision_groups) {
    const m = g.match || {};
    if (m.tags_any && d.tags.some(t => m.tags_any.includes(t))) return g;
    if (m.kind && m.kind.includes(d.kind || '')) return g;
  }
  return C.decision_groups.find(g => g.id === 'unknown');
}
const G = id => C.decision_groups.find(g => g.id === id);
const chipG = g => `<span class="chip solid" style="background:${g.color}">${esc(g.label)}</span>`;
const tagName = t => (C.reason_tags[t] || {}).name || t;
const dom = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const adrChip = d => { const a = (C.address_sources || {})[d.address_source]; if (!a || !a.chip) return '';
  if (d.address_source === 'media' && d.addr_url) return ` <a class="chip ach med" href="${esc(d.addr_url)}" target="_blank" rel="noopener" title="${esc(a.title.replace('{domain}', dom(d.addr_url)))}" onclick="event.stopPropagation()">${esc(a.chip)}<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5h5.5V7M8.5 1.5 1.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a>`;
  return ` <span class="chip ach" title="${esc(a.title.replace('{domain}', ''))}">${esc(a.chip)}</span>`; };
const TS = '\u2009', nfT = v => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, TS);
const resPlaque = d => { const R = C.res_area, a = d.res_area;
  if (!a) return `<div class="rap no"><div class="rac">${esc(R.captions.none)}</div><div class="ran">${esc(R.empty)}</div></div>`;
  const cap = a.kind === 'total' ? (a.media ? R.captions.total_media : R.captions.total) : a.kind === 'est' ? R.captions.est : a.kind === 'limit' ? R.captions.limit : R.captions.res;
  const isM = a.kind === 'res_media' || a.media; const chip = isM && a.url ? ` <a class="chip ach med" href="${esc(a.url)}" target="_blank" rel="noopener" title="${esc(dom(a.url))}" onclick="event.stopPropagation()">${esc(R.chips.media)}<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.5h5.5V7M8.5 1.5 1.5 8.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></a>`
    : isM ? ` <span class="chip ach med">${esc(R.chips.media)}</span>` : ''; const chip2 = a.kind === 'est' ? ` <span class="rach" title="${esc(a.tip || '')}">${esc(R.chips.est)}</span>` : a.kind === 'limit' ? ` <span class="rach" title="${esc(a.tip || '')}">${esc(R.chips.limit)}</span>` : '';
  return `<div class="rap k-${a.kind}" title="${esc(a.tip || a.raw || '')}"><div class="rac">${esc(cap)}${chip}${chip2}</div><div class="ran">${a.approx ? '≈' + TS : ''}${nfT(a.v)}<small>${TS}${esc(R.unit)}</small></div></div>`; };
const aType = d => { const a = d.res_area; return !a ? 'none' : a.kind === 'res_media' || a.kind === 'res_protocol' ? 'flats' : a.kind; };
const aSrc = d => { const a = d.res_area; return !a ? null : (a.kind === 'res_media' || a.media) ? 'media' : a.kind === 'res_protocol' || a.kind === 'total' || a.total != null ? 'protocol' : null; };
const areaSummary = () => { const T = C.res_area.counter_type, S = C.res_area.counter_source, nt = k => B.decisions.filter(d => aType(d) === k).length, ns = k => B.decisions.filter(d => aSrc(d) === k).length;
  const t = T.items.filter(([k]) => nt(k) || T.always.includes(k)).map(([k, l]) => `${esc(l)} ${nt(k)}`).join(' · ');
  return `<span id="aty">${esc(T.label)} ${t}</span><br><span id="asr" class="ascr">${esc(S.label)} ${S.items.map(([k, l]) => `${esc(l)} ${ns(k)}`).join(' · ')}</span>`; };
const protoTxt = d => d.proto ? '№ ' + esc(d.proto) : esc(C.proto_missing || '№ не указан');
const adrSummary = () => { const A = C.address_sources || {}, n = k => B.decisions.filter(d => d.address_source === k).length;
  return esc(C.address_summary_label || 'Адрес:') + ' ' + ['protocol', 'cadastre', 'media', 'none'].concat(n('analyst') ? ['analyst'] : []).map(k => `${esc(A[k]?.count || k)} ${n(k)}`).join(' · '); };
const adrMiss = () => `<span class="adn">${esc(C.address_missing)}</span>`;
const approvedLater = d => (d.rres || '').toLowerCase().startsWith(C.reconsidered_approved_prefix);

/* ---------- экраны ---------- */
const TABS = [['price', 'Оценка', '<path d="M4 19h16M7 16V9M12 16V5M17 16v-4"/>'], ['parcel', 'Участок', '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>'], ['grk', 'Решения', '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h8M8 8h4"/>'],
  ['tep', 'ТЭП', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/>'],
  ['law', 'Право', '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7h6zM18 7l-3 7h6z"/>'], ['pdf', 'PDF', '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/>', 'desk']];
function render() {
  const title = {price: 'Оценка', parcel: 'Участок', grk: 'Решения ГРК', tep: 'Расчёт ТЭП', law: 'Правовые заметки'}[TAB];
  A.innerHTML = `<div class="nav">${LOGO_H ? `<img src="${LOGO_H}" alt="MI Development" style="height:26px;width:auto">` : `<img src="${ICON}" alt="">`}<span class="t">${title}</span><nav class="dtabs">${TABS.map(([k, l]) => `<button data-t="${k}" class="${TAB === k ? 'on' : ''}">${l}</button>`).join('')}</nav></div><main id="m"></main>
  <nav class="tabs">${TABS.filter(t => !t[3]).map(([k, l, p]) => `<button data-t="${k}" class="${TAB === k ? 'on' : ''}"><svg viewBox="0 0 24 24">${p}</svg>${l}</button>`).join('')}</nav><div id="sh"></div>`;
  A.querySelectorAll('.tabs button,.dtabs button').forEach(b => b.onclick = () => { if (b.dataset.t === 'pdf') { const p = PARCEL || C.projects[0]; if (p) report(p); return; } TAB = b.dataset.t; render(); scrollTo(0, 0); });
  ({price: viewPrice, parcel: viewParcel, grk: viewGrk, tep: viewTep, law: viewLaw})[TAB]();
}

function filtered(skipGroup) {
  const q = F.q.toLowerCase();
  return B.decisions.filter(d => (!F.organ || d.organ === F.organ) && (!F.year || d.year == F.year) && (!F.tag || d.tags.includes(F.tag))
    && (skipGroup || !F.group || groupOf(d).id === F.group)
    && (!q || [d.address, d.dev, d.quote, d.func, d.district].join(' ').toLowerCase().includes(q)));
}
function viewGrk() {
  const M = $('#m'), years = [...new Set(B.decisions.map(d => d.year))].sort();
  M.innerHTML = `<h1>Решения ГРК</h1><div class="sub">ГРК · КЗЗ · АГПТ, СПб, ${years[0]}–${years.at(-1)}. Пресс-релизы и СМИ, не протоколы. Обновлено ${esc(B.built)}</div>
  <div class="seg" id="org"><button data-o="">Все</button>${C.organs.map(o => `<button data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
  <div class="grp" id="grp"></div>
  <div class="fl"><select id="yr"><option value="">Все годы</option>${years.map(y => `<option>${y}</option>`).join('')}</select>
  <select id="tg"><option value="">Все причины</option>${Object.entries(C.reason_tags).map(([k, v]) => `<option value="${k}">${k} · ${esc(v.name)}</option>`).join('')}</select></div>
  <input class="srch" id="q" type="search" placeholder="Адрес, застройщик, цитата">
  <div class="cap" id="rcap">Причины отказов по существу</div><div class="card" id="rs" style="padding:8px 14px"></div>
  <div class="cap" id="lcap"></div><div id="ls"></div>`;
  $('#yr').value = F.year; $('#tg').value = F.tag; $('#q').value = F.q;
  $('#org').onclick = e => { const b = e.target.closest('button'); if (b) { F.organ = b.dataset.o; draw(); } };
  $('#yr').onchange = e => { F.year = e.target.value; draw(); }; $('#tg').onchange = e => { F.tag = e.target.value; draw(); };
  $('#q').oninput = e => { F.q = e.target.value; drawList(); };
  draw();
}
function draw() {
  $('#org').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.o === F.organ));
  const base = filtered(true), cnt = {};
  base.forEach(d => { const g = groupOf(d).id; cnt[g] = (cnt[g] || 0) + 1; });
  $('#grp').innerHTML = C.group_order.filter(id => cnt[id] || ['refusal', 'rework'].includes(id)).map(id => { const g = G(id);
    return `<button data-g="${id}" class="${F.group === id ? 'on' : ''}" title="${esc(g.hint || '')}"><b>${cnt[id] || 0}</b><span><i style="background:${g.color}"></i>${esc(g.label)}</span></button>`; }).join('');
  $('#grp').querySelectorAll('button').forEach(b => b.onclick = () => { F.group = F.group === b.dataset.g ? '' : b.dataset.g; draw(); });
  // причины: только решения из групп is_refusal (X1 «На доработку» не считается отказом)
  const ref = base.filter(d => groupOf(d).is_refusal), tc = {}; let untag = 0;
  ref.forEach(d => { const t = d.tags.filter(t => !(G('rework').match?.tags_any || []).includes(t)); if (!t.length) untag++; t.forEach(x => tc[x] = (tc[x] || 0) + 1); });
  const top = Object.entries(tc).sort((a, b) => b[1] - a[1]), mx = Math.max(1, ...top.map(x => x[1]), untag);
  $('#rs').innerHTML = (top.map(([t, n]) => `<div class="bar"><span>${t} · ${esc(tagName(t))}</span><u style="width:${n / mx * 40}%"></u><em>${n}</em></div>`).join('')
    + (untag ? `<div class="bar"><span class="mu">Причина не указана</span><u style="width:${untag / mx * 40}%;background:#D1D1D6"></u><em>${untag}</em></div>` : '')) || '<div class="empty">Отказов нет</div>';
  $('#rcap').textContent = `Причины отказов по существу · ${ref.length}`;
  drawList();
}
function drawList() {
  const L = filtered(false).sort((a, b) => b.sort.localeCompare(a.sort));
  $('#lcap').textContent = `Решения · ${L.length} из ${B.decisions.length}`;
  if (!$('#adrs')) $('#lcap').insertAdjacentHTML('afterend', '<div id="adrs" class="sm mu" style="margin:-2px 0 8px"></div>'); $('#adrs').innerHTML = adrSummary() + '<br>' + areaSummary();
  $('#ls').innerHTML = L.length ? L.map(d => { const g = groupOf(d);
    return `<div class="card dc" data-id="${d.id}"><div class="top">${chipG(g)}<span class="chip">${esc(d.organ)}</span><span class="sm mu">${esc(d.date.replace(/ \(.*/, ''))}</span>${approvedLater(d) ? '<span class="chip" style="background:#EAF3FF;color:#0060C7">позже одобрено</span>' : ''}</div>
    <div class="pn">Протокол ${protoTxt(d)} · ${esc(d.organ)} · ${esc(d.date.replace(/ \(.*/, ''))}</div>
    <div class="adrw"><div class="adrl"><div class="adr">${d.address ? esc(d.address) + adrChip(d) : adrMiss()}</div>${d.cad ? `<div class="cadn">${esc(d.cad)}</div>` : `<div class="cadn no">${esc(C.cad_missing || 'Кадастровый № не указан')}</div>`}</div>${resPlaque(d)}</div>
    <div class="dev">${esc(d.dev) || '<span class="na">Застройщик не указан</span>'}</div>
    ${d.tags.length ? `<div class="chips" style="margin-top:8px">${d.tags.map(t => `<span class="chip">${t} · ${esc(tagName(t))}</span>`).join('')}</div>` : ''}
    ${d.quote ? `<q>${esc(d.quote.length > 180 ? d.quote.slice(0, 177) + '…' : d.quote)}</q>` : ''}</div>`; }).join('') : '<div class="empty">Ничего не найдено</div>';
  $('#ls').querySelectorAll('.dc').forEach(c => c.onclick = () => detail(B.decisions[c.dataset.id]));
}
function detail(d) {
  const g = groupOf(d), row = (k, v) => v ? `<div class="li"><span>${k}</span><span>${v}</span></div>` : '';
  $('#sh').innerHTML = `<div class="sheet"><div><div class="grab"></div><button class="close" aria-label="Закрыть">✕</button>
  <div class="top" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${chipG(g)}<span class="chip">${esc(d.organ)}</span></div>
  <div class="pn" style="margin-top:10px">Протокол ${protoTxt(d)} · ${esc(d.date)}</div><h1 class="adr" style="font-size:22px;line-height:28px;margin-top:4px">${d.address ? esc(d.address) + adrChip(d) : adrMiss()}</h1>${d.cad ? `<div class="cadn">${esc(d.cad)}</div>` : ''}${resPlaque(d)}${d.address_source && C.address_sources[d.address_source] ? `<div class="sm mu">${esc(C.address_sources[d.address_source].title)}</div>` : ''}
  ${g.hint ? `<div class="sm mu">${esc(g.hint)}</div>` : ''}
  <div class="cap">Заявка</div><div class="list kv">${row('Дата', esc(d.date))}${row('Застройщик', esc(d.dev))}${row('Район', esc(d.district))}${row('Кадастровый №', esc(d.cad))}
  ${row('Площадь участка', d.plot && esc(d.plot) + ' м²')}${row('Площадь объекта', d.area && esc(d.area) + ' м²')}${row('Этажность', esc(d.floors))}${row('КИТ', esc(d.kit))}${row('Функция', esc(d.func))}${row('Зона ПЗЗ', esc(d.pzz))}</div>
  <div class="cap">Причина</div><div class="card">${d.tags.length ? `<div class="chips">${d.tags.map(t => `<span class="chip" title="${esc((C.reason_tags[t] || {}).hint)}">${t} · ${esc(tagName(t))}</span>`).join('')}</div>` : '<div class="sm mu">Код причины не присвоен</div>'}
  ${d.quote ? `<q style="display:block;margin-top:8px;quotes:'«' '»'">${esc(d.quote)}</q>` : '<div class="sm na" style="margin-top:6px">Цитаты в источнике нет</div>'}</div>
  ${d.rdate || d.rres ? `<div class="cap">Повторное рассмотрение</div><div class="list kv">${row('Дата', esc(d.rdate))}${row('Итог', esc(d.rres))}${row('Источник', d.rurl && `<a href="${esc(d.rurl)}" target="_blank" rel="noopener">открыть ↗</a>`)}</div>` : ''}
  ${d.note ? `<div class="cap">Примечание</div><div class="card sm">${esc(d.note)}</div>` : ''}
  <a class="btn o" style="display:flex;align-items:center;justify-content:center" href="${esc(d.url)}" target="_blank" rel="noopener">Источник: ${esc(d.src)} ↗</a></div></div>`;
  const s = $('.sheet'); s.onclick = e => { if (e.target === s || e.target.closest('.close')) $('#sh').innerHTML = ''; };
}

/* ---------- ТЭП: ядро (все нормы из C.tep) ---------- */
const num = v => { const x = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : null; };
function tepCore(I, sid) {
  const T = C.tep, sc = T.scenarios.find(s => s.id === sid), warn = [], S = num(I.S);
  if (!S) return null;
  let Sr = S - (num(I.zouit) || 0) - (num(I.red) || 0) - (num(I.other) || 0);
  if (I.urv) Sr = S * T.conditional_vri_share;
  let Akv0, base;
  const kc = num(I.kcom) ?? T.k_com.default, kp = T.k_pol[I.cls || 'комфорт'];
  const dens = () => I.region === 'ЛО' ? T.lo_density_m2_per_ha[I.lo || 'А'] / 10000 : (T.kit[sc.kit] ?? T.kit.po_pravu);
  base = I.region === 'ЛО' ? `плотность ${nf(T.lo_density_m2_per_ha[I.lo || 'А'])} м²/га` : `КИТ ${nf(dens(), 1)}`;
  const o = {sid, Sr, warn, base, soc: null};
  // соцобъект: места по жителям базового варианта, вычеты по нормам конфига
  if (T.soc.variants[sid]) {
    const V = T.soc.variants[sid], res0 = dens() * Sr / T.m2_per_resident;
    const places = {kindergarten: Math.ceil(res0 * T.soc.places_per_1000.kindergarten / 1000), school: Math.ceil(res0 * T.soc.places_per_1000.school / 1000)};
    const pick = m => m == null ? null : Array.isArray(m) ? (T.soc.pick === 'min' ? m[0] : m[1]) : m;
    const rows = []; let siteCut = 0, aptCut = 0, unknown = false;
    for (const [list, kind] of [[V.from_site, 'site'], [V.from_apartments, 'apt']]) for (const x of list) {
      const m = pick(x.m2), a = m == null ? null : m * places[x.per];
      rows.push({what: x.what, src: x.src, m2: x.m2, area: a, kind}); if (a == null) unknown = true; else if (kind === 'site') siteCut += a; else aptCut += a;
    }
    Sr -= siteCut; o.Sr = Sr; o.soc = {places, rows, unknown, siteCut, aptCut, shift: T.soc.finance.timeline_shift_months};
    if (unknown) warn.push('Часть норм площади соцобъекта не задана — квартиры уменьшены не полностью');
  }
  if (Sr <= 0) return {...o, err: 'Расчётная площадь ≤ 0'};
  let Akv = dens() * Sr; if (o.soc) { o.aptLost = (dens() * (S - (num(I.zouit) || 0) - (num(I.red) || 0) - (num(I.other) || 0)) - Akv) + o.soc.aptCut; Akv -= o.soc.aptCut; }
  if (I.region === 'ЛО') warn.push('ЛО: парковки по ПЗЗ поселения — норма не найдена');
  if (kc < T.k_com.min || kc > T.k_com.max) warn.push(`Доля коммерции вне диапазона ${T.k_com.min}–${T.k_com.max}`);
  const Acom = Akv * kc, SPP = (Akv + Acom) / kp, res = Akv / T.m2_per_resident, avg = num(I.avg);
  let N = null; if (avg) { if (avg < T.min_apartment_m2) warn.push(`Средняя квартира меньше ${T.min_apartment_m2} м²`); else N = Akv / avg; }
  let park = null; if (I.region !== 'ЛО' && sid !== 'aparty') park = Math.ceil(Akv / T.parking_m2_per_space_by_zone[I.zone || 'обычная']);
  if (sid === 'aparty') warn.push('Апарты: парковки по числу номеров — норма не задана');
  if (sid === 'maksimum') warn.push(`${T.kit._max_src}; при ДПТ срок +${T.dpt_extra_months} мес.`);
  if (sid === 'aparty') warn.push(`При получении УРВИ: срок +${T.apart_extra_months} мес.`);
  if (o.soc) warn.push(`Срок проекта +${o.soc.shift} мес.`);
  return Object.assign(o, {Akv, Acom, kp, SPP, res, N, park, parkArea: park ? park * T.parking_place_m2 : null,
    green: Akv * T.greening.per_100m2 / 100, kg: Math.ceil(res * T.social_per_1000.kindergarten / 1000), sch: Math.ceil(res * T.social_per_1000.school / 1000)});
}
const NA = '<span class="na">нет данных</span>';
const TEP_ROWS = [['Расчётная площадь S<sub>р</sub>', r => nf(r.Sr) + ' м²'], ['Площадь квартир A<sub>кв</sub>', r => nf(r.Akv) + ' м²' + bonusChip(gS(PARCEL || C.projects[0], r.sid), 'квартиры')], ['Коммерция A<sub>ком</sub>', r => nf(r.Acom) + ' м²' + bonusChip(gS(PARCEL || C.projects[0], r.sid), 'коммерция')],
  ['Наземная СПП', r => nf(r.SPP) + ' м²'], ['Квартир', r => r.N ? nf(r.N) : NA], ['Жителей', r => nf(r.res)], ['Машино-мест', r => r.park ? nf(r.park) : NA], ['Озеленение', r => nf(r.green) + ' м²'],
  ['Мест в детсадах (потребность)', r => nf(r.kg)], ['Мест в школах (потребность)', r => nf(r.sch)],
  ['Соцобъект: мест ДОУ / СОШ', r => r.soc ? `${nf(r.soc.places.kindergarten)} / ${nf(r.soc.places.school)}` : '—'],
  ['Соцобъект: отдано квартир', r => r.soc ? (r.soc.unknown ? `≥ ${nf(r.aptLost)} м²` : nf(r.aptLost) + ' м²') : '—'],
  ['Цена участка (Оценщик)', r => { const P = PARCEL || C.projects[0]; return P?.valuation && P.valuation.list.some(x => x.tep_id === r.sid) ? vPrice(P, r.sid) : (r.soc ? `<span class="na">${esc(C.tep.soc.price_status)}</span>` : NA); }]];
const SCN = () => C.tep.scenarios;

function viewTep() {
  const T = C.tep, M = $('#m'), I = TEPI; I.scen = I.scen || 'po_pravu';
  const segs = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button data-v="${esc(v)}" class="${v === cur ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const inp = (id, l, u) => `<div class="li"><span>${l}</span><span><input id="${id}" inputmode="decimal" placeholder="${u}" value="${esc(I[id] ?? '')}"></span></div>`;
  const isSoc = !!T.soc.variants[I.scen], main = [...new Map(SCN().map(s => [s.group || s.id, s])).values()];
  M.innerHTML = `<h1>Расчёт ТЭП</h1><div class="sub">Алгоритм Девелопера v0.1. Данных участка нет: введите свои. Коэффициенты — в справочнике.</div>
  ${segs('region', [['СПб', 'СПб'], ['ЛО', 'ЛО']], I.region)}
  ${segs('cls', Object.keys(T.k_pol).map(k => [k, k[0].toUpperCase() + k.slice(1)]), I.cls)}
  <div class="cap">Участок, м²</div><div class="list">${inp('S', 'Площадь участка S', 'из ЕГРН')}${inp('zouit', 'ЗОУИТ, где строить нельзя', '0')}${inp('red', 'В красных линиях', '0')}${inp('other', 'Нежилые объекты с территорией', '0')}
  <div class="li"><span class="chk"><input type="checkbox" id="urv" ${I.urv ? 'checked' : ''}>ВРИ условно разрешённый</span><span class="mu sm">S<sub>р</sub> = ${T.conditional_vri_share * 100}% S</span></div></div>
  <div class="cap">Параметры</div><div class="list">${inp('kcom', `Доля коммерции (${T.k_com.min}–${T.k_com.max})`, String(T.k_com.default))}${inp('avg', 'Средняя квартира, м²', 'квартирография')}
  ${I.region === 'СПб' ? `<div class="li"><span>Зона для парковок</span><span><select id="zone">${Object.keys(T.parking_m2_per_space_by_zone).map(z => `<option ${z === I.zone ? 'selected' : ''}>${z}</option>`).join('')}</select></span></div>`
    : `<div class="li"><span>Зона РНГП ЛО</span><span><select id="lo">${Object.keys(T.lo_density_m2_per_ha).map(z => `<option ${z === I.lo ? 'selected' : ''}>${z}</option>`).join('')}</select></span></div>`}</div>
  <div class="cap">Сценарий</div><div class="mob">${segs('scen', main.map(s => [s.group ? SCN().find(x => x.group === s.group && (isSoc ? x.id === I.scen : true)).id : s.id, s.group || s.short]), isSoc ? I.scen : I.scen)}
  ${isSoc ? segs('scen2', SCN().filter(s => s.group).map(s => [s.id, s.label]), I.scen) : ''}</div><div id="res"></div>
  <div class="sm mu" style="margin-top:12px">Пока не считаются: этажность (нужны ПЗЗ, зоны ОКН, Пулково), баланс территории (шаг 8), контур с НСПД. ${esc(T._src)}</div>`;
  if (isSoc) $('#scen').querySelectorAll('button').forEach(b => { if (T.soc.variants[b.dataset.v]) b.classList.add('on'); });
  M.querySelectorAll('.seg').forEach(s => s.onclick = e => { const b = e.target.closest('button'); if (!b) return; I[s.id === 'scen2' ? 'scen' : s.id] = b.dataset.v; viewTep(); });
  M.querySelectorAll('input:not([type=checkbox])').forEach(x => x.oninput = () => { I[x.id] = x.value; calc(); });
  $('#urv').onchange = e => { I.urv = e.target.checked; calc(); };
  M.querySelectorAll('select').forEach(x => x.onchange = () => { I[x.id] = x.value; calc(); });
  calc();
}
function socChips(sc) { return sc.chip ? `<span class="chip" style="background:#EAF3FF;color:#0060C7">${esc(sc.chip)}</span>` : ''; }
function tepTable(I, cls = 'wide') {
  const R = SCN().map(s => [s, tepCore(I, s.id)]), soc = R.filter(([s]) => s.group);
  return `<div class="tw"><table class="tt ${cls}"><thead><tr><th rowspan="${soc.length ? 2 : 1}"></th>${R.filter(([s]) => !s.group).map(([s]) => `<th rowspan="2">${esc(s.label)}</th>`).join('')}${soc.length ? `<th colspan="${soc.length}">${esc(soc[0][0].group)}<br>${socChips(soc[0][0])}</th>` : ''}</tr>
  ${soc.length ? `<tr>${soc.map(([s]) => `<th>${esc(s.label)}</th>`).join('')}</tr>` : ''}</thead>
  <tbody>${TEP_ROWS.map(([k, f]) => `<tr><td>${k}</td>${R.map(([, r]) => `<td>${r && !r.err ? f(r) : NA}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function calc() {
  const I = TEPI, r = tepCore(I, I.scen), sc = SCN().find(s => s.id === I.scen);
  if (!r) return $('#res').innerHTML = '<div class="card empty">Введите площадь участка</div>';
  if (r.err) return $('#res').innerHTML = `<div class="card empty">${r.err}</div>`;
  const li = (k, v) => `<div class="li"><span>${k}</span><span>${v}</span></div>`;
  const socBox = r.soc ? `<div class="cap">Соцобъект · ${esc(sc.label)}</div><div class="list">${r.soc.rows.map(x => li(`${esc(x.what)}<div class="sm mu">${esc(x.src)}${x.m2 ? ' · ' + (Array.isArray(x.m2) ? x.m2.join('–') : x.m2) + ' м²/место' : ''}</div>`, x.area == null ? NA : nf(x.area) + ' м²')).join('')}</div>
    <div class="card sm">${C.tep.soc.finance.items.concat(C.tep.soc.finance.tax).map(t => '· ' + esc(t)).join('<br>')}<br>· Срок проекта +${r.soc.shift} мес.</div>` : '';
  $('#res').innerHTML = `<div class="mob"><div class="card"><div class="chips">${socChips(sc)}</div><div class="sm mu">${esc(sc.label)} · площадь ${I.scen === 'aparty' ? 'номеров' : 'квартир'}</div>
  <div style="font-size:32px;font-weight:700;letter-spacing:-.02em">${nf(r.Akv)} м²</div><div class="sm mu">${r.base} × S<sub>р</sub> ${nf(r.Sr)} м²</div></div>
  <div class="list out" style="margin-top:10px">${TEP_ROWS.slice(2).filter(([k]) => r.soc || !k.startsWith('Соцобъект')).map(([k, f]) => li(k, f(r))).join('')}</div>${socBox}
  ${r.warn.map(w => `<div class="warn">▲ ${esc(w)}</div>`).join('')}</div>
  <div class="tab"><div class="card" style="overflow-x:auto">${tepTable(I)}</div>${r.soc ? socBox : ''}</div>
  <div class="sm mu" style="margin-top:6px">Соцнормы: ${esc(C.tep.social_per_1000._check)}</div>`;
}

/* ---------- участок и справка PDF ---------- */
let PARCEL = null;
const MAN = 'devapp_manual_v1', manGet = cad => (JSON.parse(localStorage.getItem(MAN) || '{}'))[cad] || {};
function manSet(cad, o) { const all = JSON.parse(localStorage.getItem(MAN) || '{}'); all[cad] = o; localStorage.setItem(MAN, JSON.stringify(all)); }
function pdata(p) { const d = {...(p.data || {})}, m = manGet(p.cad);
  if (!d.S && num(m.area)) d.S = String(m.unit === 'га' ? num(m.area) * 10000 : num(m.area));
  if (!d.pzz && m.zone) d.pzz = m.zone; if (!d.vri && m.vri) d.vri = m.vri; d._manual = !!(m.area || m.zone || m.vri); return d; }
function perHa(d) { const P = C.tep.per_ha, ha = num(d.S) ? num(d.S) / 10000 : null;
  return {ha, label: ha ? `${P._src.split(',')[0]} · ${nf(ha, 4)} га × нормы на 1 га, справочно` : P.label_no_area,
    rows: P.rows.map(([k, v, u]) => [k, Math.round(v * (ha || 1)), u])}; }
function gpzuRow(p, f) {
  const R = C.gpzu_rule, iss = String((p.data || {}).gpzu_issued || ''), y = parseInt(iss.slice(-4).length === 4 && /\d{4}$/.test(iss) ? iss.slice(-4) : iss.slice(0, 4));
  if (!y) return {color: 'жёлтый', title: 'ГПЗУ', action: 'дата выдачи неизвестна', explain: f.explain};
  const m = iss.match(/^(\d{2})\.(\d{2})\.(\d{4})$/), d0 = m ? new Date(+m[3], m[2] - 1, +m[1]) : new Date(y, 11, 31);
  const until = new Date(d0); until.setFullYear(until.getFullYear() + R.valid_years + (R.extension_years || 0));
  const exp = until < new Date(), st = exp ? R.expired : R.valid, u = until.toLocaleDateString('ru-RU');
  return {color: st.color, title: st.title, action: st.action.replace('{until}', u), explain: f.explain,
    pdf: exp ? `ГПЗУ ${iss} истёк (${R.valid_years} года по ${R.src}; даже +${R.extension_years} год по ${R.extension_src} — истёк ${u}), ${st.action}` : `ГПЗУ ${iss} действует до ${u}`};
}
function vPrice(p, id) { const s = p.valuation.list.find(x => x.tep_id === id); return !s ? '—' : s.available ? mln(s.price) + (s.upper && !s.base ? ' (предел)' : '') : esc(C.valuation_no_price); }
function devTep(p, mode) {
  const T = p.tep_dev; if (!T) return '';
  const cell = x => x == null ? NA : (typeof x === 'number' ? nf(x) : esc(x));
  if (mode === 'list') return `<div class="list out">${T.cols.map(([id, l], i) => `<div class="li"><span>${esc(l)}${T.cols_chip[id] ? ` <span class="chip" style="background:#EAF3FF;color:#0060C7;min-height:18px;font-size:10px">${esc(T.cols_chip[id])}</span>` : ''}<div class="sm mu">${esc(T.verdicts[id] || '')}</div></span><span>${T.rows[1][1][i] != null ? nf(T.rows[1][1][i]) + ' м²' + flatsBonus(gS(p, id)) : NA}${p.valuation ? `<div class="sm mu">${vPrice(p, id)}</div>` : ''}</span></div>`).join('')}</div>`;
  return `<div class="tw"><table class="tt"><thead><tr><th></th>${T.cols.map(([id, l]) => `<th>${esc(l)}${T.cols_chip[id] ? `<br><span class="chip" style="background:#EAF3FF;color:#0060C7">${esc(T.cols_chip[id])}</span>` : ''}</th>`).join('')}</tr></thead>
  <tbody>${T.rows.map(([k, v]) => `<tr><td>${esc(k)}</td>${v.map((x, i) => `<td>${cell(x)}${gasnRow(gS(p, T.cols[i]?.[0]), k) || (/м²|мест|шт/.test(k) && !/квартир, шт|квартир шт/i.test(k) ? bonusChip(gS(p, T.cols[i]?.[0]), k) : '')}</td>`).join('')}</tr>`).join('')}<tr><td>Статус</td>${T.cols.map(([id]) => `<td>${T.col_status[id] ? dotL(T.col_status[id]) + ' ' + esc(T.col_status[id]) : ''}</td>`).join('')}</tr>${p.valuation ? `<tr><td>Цена участка (Оценщик)</td>${T.cols.map(([id]) => `<td><b>${vPrice(p, id)}</b></td>`).join('')}</tr>` : ''}<tr><td>Вывод</td>${T.cols.map(([id]) => `<td style="text-align:left">${esc(T.verdicts[id] || '')}</td>`).join('')}</tr></tbody></table></div>`;
}
const mln = x => x == null ? '—' : nf(x / 1e6) + ' млн ₽';
const LOGO_H = 'logo-h.svg';
// «выгоднее» — максимум цены среди базовых сценариев (без справочного верхнего предела и недоступных)
function bestKey(V) { return V.recommended && V.list.some(s => s.key === V.recommended && s.available) ? V.recommended : null; }  // «выгоднее» — только из result.json (recommended)
const capLight = l => { const P = C.traffic_policy; if (!l) return ''; return l === 'зелёный' && !P.green_requires_met ? P.cap_without_official : l; };
const dotL = l => l ? `<i class="dot8" style="background:${C.traffic[capLight(l)]}"></i>` : '';
const bChip = t => `<span class="chip" style="background:#EAF3FF;color:#0060C7;min-height:18px;font-size:10px">${esc(t)}</span>`;
const gS = (p, id) => p?.valuation?.list.find(s => s.tep_id === id || s.key === id);
const gasnTip = a => { const G = C.gasn; return G.title + (a != null ? G.title_area.replace('{area_project}', nf(a)) : ''); };
const gasnPill = a => ` <span class="nrm gasn" title="${esc(gasnTip(a))}">${esc(C.gasn.chip)}</span>`;
// строка ТЭП (по названию) у сценария s: есть ли у неё флаг +10% ГАСН в result.json
const gasnRow = (s, label) => { const G = C.gasn, R = s && s.gasn_rows; if (!R || !G) return '';
  for (const [k, a] of Object.entries(R)) { const id = G.key_alias[k] || k, re = G.row_match[id]; if (re && new RegExp(re, 'i').test(label)) return gasnPill(a); } return ''; };
// «+10% ГАСН»: на всех продаваемых площадях (квартиры, коммерция, машино-места), не на соцобъектах; данные — из result.json
const bonusKind = label => { const G = C.gasn; if (new RegExp(G.exclude, 'i').test(label)) return null; return Object.keys(G.kinds).find(k => new RegExp(G.kinds[k], 'i').test(label)) || null; };
const bonusChip = (s, label, pct) => { const G = C.gasn, kd = bonusKind(label); if (!kd) return ''; const B = s && s.bonus, p = B ? B.pct : pct; if (!p) return '';
  const bf = B && B.before[kd]; const t = G.title_kind.replace('{pct}', p) + (bf != null ? G.title_before.replace('{before}', nf(bf) + (kd === 'parking' ? ' м/м' : ' м²')) : '');
  return ` <span class="nrm gasn" title="${esc(t)}">${esc(G.chip)}</span>`; };
const flatsBonus = (s) => bonusChip(s, 'квартиры');
const markChip = s => s.mark ? ` <span class="chip" style="min-height:18px;font-size:10px;background:${(C.risk_marks || []).some(w => s.mark.toLowerCase().includes(w.toLowerCase())) ? 'rgba(255,59,48,.22);color:#FF8A80' : 'rgba(255,204,0,.2);color:#FFD666'}">${esc(s.mark)}</span>` : '';
const sTags = (s, V) => (s.base ? bChip('база') : '') + markChip(s) + (s.upper && !s.base ? `<span class="chip" style="min-height:18px;font-size:10px">верхний предел · справочно</span>` : '') + (s.reference ? `<span class="chip" style="min-height:18px;font-size:10px">справочно</span>` : '') + (s.key === bestKey(V) ? bChip(C.tep.soc.better_chip) : '');
let VSEL = null, VPR = null;
function sensAt(V, key, pr) {
  const g = V.grid && V.grid[pr] && V.grid[pr][key]; if (g) return g;
  const s = V.list.find(x => x.key === key), bp = Math.round(V.base_price / 1000); if (!s || !s.available) return null;
  if (pr === bp) return {land: s.price, ...s.fin};
  const pts = [[240, V.sens3[240]?.[key]], [bp, s.price], [300, V.sens3[300]?.[key]]].filter(x => x[1] != null).sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < pts.length - 1; i++) if (pr >= pts[i][0] && pr <= pts[i + 1][0]) { const t = (pr - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return {land: pts[i][1] + t * (pts[i + 1][1] - pts[i][1]), interp: true}; }
  return null;
}
function fmTable(V, part) {
  const F = V.finmodel; if (!F) return '';
  const nrm = x => (x.norm ? ' <span class="nrm">норматив</span>' : '') + ((C.gasn.flag_keys || []).some(k => x[k]) ? gasnPill(C.gasn.area_keys.map(k => x[k]).find(v => v != null)) : (x.section === 'Выручка' ? bonusChip(V.list.find(z => z.key === F.scenario), x.name, V.bonus_pct) : ''));
  const sec = n => F.items.filter(x => x.section === n);
  const rows = n => sec(n).map(x => `<tr><td>${esc(x.name)}${nrm(x)}</td><td class="fp">${esc(x.parameter || '')}</td><td>${nf(x.amount_mln_rub, 1)}</td></tr>`).join('');
  const T = F.totals || {};
  const tbl = `<div class="tw"><table class="tt fm"><thead><tr><th>Статья</th><th>Единичный параметр</th><th>Сумма, млн ₽</th></tr></thead><tbody>
   <tr class="fs"><td colspan="3">Выручка</td></tr>${rows('Выручка')}<tr class="ft"><td colspan="2">Выручка, итого</td><td>${nf(T.revenue_mln_rub, 1)}</td></tr>
   <tr class="fs"><td colspan="3">Затраты</td></tr>${rows('Затраты')}<tr class="ft"><td colspan="2">Затраты, итого</td><td>${nf(T.costs_mln_rub, 1)}</td></tr>
   <tr class="ft"><td colspan="2">Прибыль${T.margin != null ? ' (маржа ' + nf(T.margin * 100, 1) + '%)' : ''}</td><td>${nf(T.profit_mln_rub, 1)}</td></tr></tbody></table></div>`;
  const tail = `<div class="cap">Денежный поток по годам, ${esc(F.units || 'млн ₽')}</div>${fmBars(F)}${F.cashflow_note ? `<div class="sm mu">${esc(F.cashflow_note)}</div>` : ''}
  ${(F.assumptions || []).length ? `<div class="cap">Допущения</div><div class="tw"><table class="tt kv2"><tbody>${F.assumptions.map(a => `<tr><td>${esc(a.name)}${a.norm ? ' <span class="nrm">норматив</span>' : ''}</td><td>${esc(a.value)}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
return part === 1 ? tbl : part === 2 ? tail : tbl + tail;
}
function fmBars(F) {
  const Y = F.cashflow_annual || []; if (!Y.length) return '';
  const mx = Math.max(...Y.map(y => Math.max(y.inflow_mln_rub || 0, y.outflow_mln_rub || 0)), 1);
  return `<div class="cf">${Y.map(y => `<div class="cfy"><div class="cfn">${(y.net_mln_rub > 0 ? '+' : '') + nf(y.net_mln_rub)}</div><div class="cfb"><i class="ci" style="height:${(y.inflow_mln_rub || 0) / mx * 100}%"></i><i class="co" style="height:${(y.outflow_mln_rub || 0) / mx * 100}%"></i></div><div class="cfl">${esc(String(y.year).replace(/ \(.*/, ''))}</div></div>`).join('')}</div>
  <div class="sm mu"><i class="lg" style="background:#14213D;border:1px solid #C9A45C"></i>выручка <i class="lg" style="background:#8E8E93"></i>затраты · над столбцом — итог года</div>`;
}
async function dlXlsx(path) {
  const r = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${path}?ref=main`, {headers: ghH(TOKEN), cache: 'no-store'});
  if (!r.ok) return alert('Файл недоступен: GitHub ' + r.status);
  const u = URL.createObjectURL(await r.blob()), a = document.createElement('a'); a.href = u; a.download = 'finmodel.xlsx'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
}
function express(p) {
  const V = p.valuation, E = C.express; if (!V) return '';
  const s = V.list.find(x => x.key === V.base), kit = (p.tep_dev?.rows.find(r => r[0] === 'КИТ') || [])[1]?.[0] || nf(C.tep.kit.po_pravu, 1);
  const tv = {flats_m2: s.tep.flats_m2 != null ? nf(s.tep.flats_m2) : NA, units: s.tep.units != null ? nf(s.tep.units) : NA, parking_total: s.tep.parking_total != null ? nf(s.tep.parking_total) : NA, kit: esc(kit)};
  const bp = Math.round(V.base_price / 1000), s3 = V.sens3, sens = [s3[240]?.[V.base], s.price, s3[300]?.[V.base]], S = C.slider;
  const norm = k => (E.normative[k] ? `<span class="nrm">${esc(E.normative[k])}</span>` : '') + (k === 'flats_m2' ? bonusChip(s, 'квартиры') : k === 'parking_total' ? bonusChip(s, 'машино-места') : '');
  const lbl = (E.label || '{short} · КИТ {kit}').replace('{short}', (C.tep.short || {})[s.tep_id] || s.title.replace(/ \(.*/, '')).replace('{kit}', esc(kit));
  return `<section class="ex" id="xc"><div class="ex-k">${esc(lbl)}</div>
  <div class="ex-p" id="xp"></div>
  <div class="ex-s">${s.per_m2 ? nf(s.per_m2 / 1000, 1) + ' тыс. ₽/м²' : ''}${s.vs_cad ? ' · ' + nf(s.vs_cad, 2) + ' кадастровой' : ''}</div>
  <div class="ex-t" id="xt"></div>
  <div class="ex-g">${E.tep.map(([k, l]) => `<div><span>${l}${norm(k)}</span><b>${tv[k]}</b></div>`).join('')}</div>
  ${pNorms(s)}
  <div class="ex-sl"><div class="sm" style="display:flex;justify-content:space-between"><span>${esc(S.label)}</span><b id="xv"></b></div>
  <input type="range" id="vsl" min="${S.min}" max="${S.max}" step="${S.step}" value="${VPR ?? bp}">
  <div class="sm mu" style="position:relative;height:16px"><span style="position:absolute;left:0">${S.min}</span><span style="position:absolute;left:${(bp - S.min) / (S.max - S.min) * 100}%;transform:translateX(-50%);color:#C9A45C">▲ ${bp}</span><span style="position:absolute;right:0">${S.max}</span></div></div>
  <div class="ex-l">${esc(E.sens_label)}: <b>${sens.map(x => x == null ? '—' : nf(x / 1e6)).join(' / ')} млн ₽</b><div class="sm mu">при цене квартир 240 / ${bp} / 300 тыс. ₽/м²</div></div></section>`;
}
function pNorms(s) { const N = s && s.tep && s.tep.parking_norms, P = C.parking_norms; if (!N || !P) return '';
  const parts = [N.flats_m2_per_place ? P.flats.replace('{flats}', nf(N.flats_m2_per_place)) : '', N.commercial_m2_per_place ? P.commercial.replace('{commercial}', nf(N.commercial_m2_per_place)) : ''].filter(Boolean);
  return parts.length ? `<div class="pnr sm"><span class="mu">${esc(P.label)}:</span> ${parts.map(x => `${esc(x)} <span class="nrm">${esc(P.chip)}</span>`).join(' · ')}</div>` : ''; }
function xDraw(p) {
  const V = p.valuation; if (!V || !$('#xc')) return; const bp = Math.round(V.base_price / 1000), x = sensAt(V, V.base, VPR), s = V.list.find(z => z.key === V.base), F = V.summary;
  const f = VPR === bp ? {rev: F.rev, costs: F.costs, profit: F.profit, land: s.price} : x || {};
  $('#xp').textContent = (x && x.interp && VPR !== bp ? '≈ ' : '') + (f.land != null ? mln(f.land) : '—');
  $('#xv').textContent = VPR + (VPR === bp ? ' · база' : '');
  $('#xt').innerHTML = [['Выручка', f.rev], ['Затраты', f.costs], ['Прибыль', f.profit]].map(([l, v]) => `<div><span>${l}</span><b>${v != null ? nf(v / 1e6) : '—'}</b><em>млн ₽</em></div>`).join('');
}
const valInit = p => { const V = p.valuation; if (V) { VSEL = VSEL || V.base; VPR = VPR ?? Math.round(V.base_price / 1000); } return ''; };
function valBlock(p) {
  const V = p.valuation; if (!V) return `<div class="card sm mu">${esc(p.valuation_status || 'ожидает оценки')}</div>`;
  VSEL = VSEL || V.base; VPR = VPR ?? Math.round(V.base_price / 1000);
  return `<div class="list">${V.list.map(s => `<div class="li vs ${s.key === VSEL ? 'sel' : ''}" data-s="${s.key}"><span class="vn">${dotL(s.light) || '<i class="dot8"></i>'}<span>${esc(s.title)}<br>${sTags(s, V)}</span></span><span class="vp">${s.available ? mln(s.price) : `<span class="na">${esc(C.valuation_no_price)}</span>`}</span></div>`).join('')}</div>
  <div class="card" id="vcard"></div><div class="sm mu" style="margin:6px 4px 0">${esc(V.status)}. Оценщик, ${esc(V.date || '')}.${V.recommended_note ? ' Рекомендация: ' + esc(V.recommended_note) + '.' : ''}</div>`;
}
function valDraw(p) {
  const V = p.valuation, S = C.slider, el = $('#vcard'); if (!V || !el) return;
  const s = V.list.find(x => x.key === VSEL), bp = Math.round(V.base_price / 1000);
  if (!s.available) { el.innerHTML = `<div class="sm mu">${esc(s.title)}</div><div style="font-size:24px;font-weight:700;margin:4px 0">${esc(C.valuation_no_price)}</div><div class="sm">${esc(s.flag)}</div>`; return; }
  const x = sensAt(V, VSEL, VPR);
  el.innerHTML = `<div class="sm mu">${esc(s.title)} · цена участка</div>${pNorms(s) ? '' : ''}<div style="font-size:34px;font-weight:700;letter-spacing:-.02em;line-height:40px">${x ? (x.interp ? '≈ ' : '') + mln(x.land) : NA}</div>
  <div class="sm mu">${x && x.rev != null ? `выручка ${mln(x.rev)} · затраты ${mln(x.costs)} · прибыль ${mln(x.profit)}` : (x && x.interp ? 'интерполяция между точками модели' : '')}</div>
  <div class="sm" style="margin-top:8px">${esc(s.flag)}</div>
  <div class="sm mu" style="margin-top:8px">при цене квартир ${VPR} тыс. ₽/м² (ползунок выше)</div>`;

}
function trafficOf(p, dec) {
  const P = C.traffic_policy, rank = {'зелёный': 0, 'жёлтый': 1, 'красный': 2}, rows = [];
  (p.legal_flags || []).filter(f => f.rule !== 'gpzu' || C.check_doc_terms).forEach(f => rows.push(f.rule === 'gpzu' ? gpzuRow(p, f) : {color: f.color, title: f.title, action: f.action, pdf: f.pdf, explain: f.explain, hint: f.hint}));
  if (!p.grk_note) dec.forEach(d => { const g = groupOf(d); if (g.id === 'refusal' || g.id === 'rework') rows.push({color: P.flags[g.id === 'refusal' ? 'grk_refusal' : 'grk_rework'], title: `${d.organ} ${d.date.replace(/ \(.*/, '')}`, action: g.label.toLowerCase(), pdf: `${d.organ} ${d.date}: ${g.label.toLowerCase()}`}); });
  const has = rows.length || Object.values(p.data || {}).some(v => v !== '' && v != null);
  if (!has) return {label: P.no_data.label, color: P.no_data.color, rows};
  let w = rows.reduce((a, r) => rank[r.color] > rank[a] ? r.color : a, 'зелёный');
  if (!P.official_sources_connected && rank[w] < rank[P.cap_without_official]) w = P.cap_without_official;
  return {label: w + (w !== 'красный' && !P.official_sources_connected ? ' · ' + P.cap_label : ''), color: C.traffic[w], rows};
}
const parcelDec = p => B.decisions.filter(d => (p.cad && d.cad === p.cad) || [].concat(p.dev_match || []).includes(d.dev));
function viewPrice() {
  const p = PARCEL || C.projects[0], M = $('#m'); PARCEL = p;
  if (!p) return M.innerHTML = '<div class="card empty">Участков нет</div>';
  M.innerHTML = `<h1>${esc(p.cad)}</h1><div class="sub">${esc((p.data || {}).address || '')}${p.district ? ' · ' + esc(p.district) + ' район' : ''}</div>${valInit(p)}${express(p)}<div class="cap">Другие сценарии</div>${valBlock(p)}
  ${p.valuation?.finmodel ? `<details class="card fmd"><summary>Базовая финмодель</summary>${fmTable(p.valuation)}${p.valuation.finmodel_xlsx ? '<button class="btn o" id="xl">Скачать finmodel.xlsx</button>' : ''}</details>` : ''}
  <button class="btn" id="pdf2">Справка PDF</button><button class="btn o" id="toP">Участок: статус и параметры</button>`;
  if ($('#xl')) $('#xl').onclick = () => dlXlsx(p.valuation.finmodel_xlsx);
  M.querySelectorAll('.vs').forEach(e => e.onclick = () => { VSEL = e.dataset.s; M.querySelectorAll('.vs').forEach(z => z.classList.toggle('sel', z === e)); valDraw(p); });
  valDraw(p); xDraw(p); if ($('#vsl')) $('#vsl').oninput = e => { VPR = +e.target.value; xDraw(p); valDraw(p); };
  $('#pdf2').onclick = () => report(p); $('#toP').onclick = () => { TAB = 'parcel'; render(); scrollTo(0, 0); };
}
function viewParcel() {
  const M = $('#m');
  M.innerHTML = `<h1>Участок</h1><div class="sub">${esc(C.missing_sources)}</div>
  <div class="fl"><input class="srch" style="margin:0" id="cad" inputmode="numeric" placeholder="Кадастровый номер 78:…" value="${esc(PARCEL?.cad || '')}"><button class="btn" style="width:auto;margin:0;height:38px;padding:0 14px;font-size:15px" id="find">Открыть</button></div>
  <div class="err" id="cerr"></div><div id="pv"></div><div class="cap">Участки в работе</div><div id="pl"></div>`;
  $('#pl').innerHTML = C.projects.length ? C.projects.map(p => `<div class="card dc" data-c="${esc(p.cad)}"><div class="top"><span class="chip">${esc(p.region)}</span><span class="chip" style="background:#FFF4E5;color:#B25E00">${esc(p.status)}</span></div>
    <h3>${esc(p.cad)}</h3><div class="dev">${esc(p.title)}${p.district ? ' · ' + esc(p.district) + ' район' : ''}</div></div>`).join('') : '<div class="card empty">Участков пока нет</div>';
  $('#pl').querySelectorAll('.dc').forEach(c => c.onclick = () => { $('#cad').value = c.dataset.c; openCad(); });
  $('#find').onclick = openCad; $('#cad').onkeydown = e => e.key === 'Enter' && openCad();
  if (!PARCEL && C.projects.length) PARCEL = C.projects[0];
  PARCEL ? drawParcel() : $('#pv').innerHTML = '<div class="card empty">Участок не выбран.<br>Введите кадастровый номер или выберите из списка.</div>';
}
function openCad() {
  const v = $('#cad').value.trim(); $('#cerr').textContent = '';
  if (!new RegExp(C.cad_pattern).test(v)) return $('#cerr').textContent = 'Формат: 78:00:0000000:0000';
  PARCEL = C.projects.find(p => p.cad === v) || {cad: v, title: 'Новый участок', region: v.startsWith('47:') ? 'ЛО' : 'СПб', district: '', status: 'нет данных', data: {}};
  drawParcel();
}
function legalSheet(r) {
  $('#sh').innerHTML = `<div class="sheet"><div><div class="grab"></div><button class="close" aria-label="Закрыть">✕</button>
  <div style="display:flex;align-items:center;gap:8px;margin-top:8px"><i class="dot8" style="background:${C.traffic[r.color]}"></i><b>${esc(r.color)}</b></div>
  <h1 style="font-size:22px;line-height:28px">${esc(r.title)} · ${esc(r.action)}</h1><div class="cap">Юридический консультант</div><div class="card" style="font-size:15px">${esc(r.explain || r.pdf || '')}</div>${r.hint ? `<div class="sm mu" style="margin:8px 4px">${esc(r.hint)}</div>` : ''}</div></div>`;
  const s = $('.sheet'); s.onclick = e => { if (e.target === s || e.target.closest('.close')) $('#sh').innerHTML = ''; };
}
function drawParcel() {
  const p = PARCEL, d = pdata(p), m = manGet(p.cad), dec = parcelDec(p), tr = trafficOf({...p, data: d}, dec), ph = perHa(d);
  const miss = C.parcel_fields.filter(([k]) => d[k] == null || d[k] === '');
  const src = k => (p.data || {})[k + '_src'] ? `<div class="sm mu">${esc(p.data[k + '_src'])}</div>` : (d._manual && ['S', 'pzz', 'vri'].includes(k) && d[k] ? '<div class="sm" style="color:#B25E00">введено вручную</div>' : '');
  const L = p.kga_limits;
  $('#pv').innerHTML = `<div class="card"><div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1"><div class="sm mu">${esc(p.title)}</div><div style="font-size:20px;font-weight:700;letter-spacing:-.01em">${esc(p.cad)}</div>
   <div class="sm mu">${esc(p.region)}${p.district ? ', ' + esc(p.district) + ' район' : ''}</div></div><span class="chip" style="background:${tr.color}22;color:#1C1C1E"><i style="background:${tr.color}"></i>${esc(tr.label)}</span></div></div>
  ${tr.rows.length ? `<div class="cap">Правовой статус</div><div class="list">${tr.rows.map((r, i) => `<div class="li lr" data-i="${i}"><span style="display:flex;align-items:center;gap:10px"><i class="dot8" style="background:${C.traffic[r.color]}"></i><span>${esc(r.title)} · <span class="mu">${esc(r.action)}</span></span></span><span class="mu">›</span></div>`).join('')}</div>` : ''}
  <div class="cap">Параметры участка</div><div class="list kv">${C.parcel_fields.map(([k, l]) => `<div class="li"><span>${l}</span><span>${d[k] ? esc(k === 'S' ? nf(num(d[k])) + ' м²' : d[k]) : NA}${src(k)}</span></div>`).join('')}</div>
  <div class="cap">Ввести вручную (если нет данных)</div><div class="list">
  <div class="li"><span>Площадь</span><span style="display:flex;gap:6px"><input id="m_area" inputmode="decimal" placeholder="—" value="${esc(m.area || '')}" style="width:96px"><select id="m_unit" style="width:64px">${['га', 'м²'].map(u => `<option ${u === (m.unit || 'га') ? 'selected' : ''}>${u}</option>`).join('')}</select></span></div>
  <div class="li"><span>Зона ПЗЗ</span><span><input id="m_zone" placeholder="напр. ТЖ2" value="${esc(m.zone || '')}"></span></div>
  <div class="li"><span>ВРИ</span><span><input id="m_vri" placeholder="код ВРИ" value="${esc(m.vri || '')}"></span></div></div>
  <div class="sm mu" style="margin:6px 4px 0">Хранится только на этом устройстве. Данные из источников важнее ручного ввода.</div>
  ${p.tep_dev ? `<div class="cap">ТЭП по сценариям · ${esc(p.tep_dev.note)}</div>${devTep(p, 'list')}<div class="sm mu" style="margin:6px 4px 0">${esc(p.tep_dev.src)}. Площадь квартир по сценарию.</div>`
   : `<div class="cap">ТЭП «по праву» · ${esc(ph.label)}</div><div class="list out">${ph.rows.map(([k, v, u]) => `<div class="li"><span>${k}</span><span>${nf(v)}${u ? ' ' + u : ''}</span></div>`).join('')}</div>`}
  ${L ? `<div class="cap">Пределы по заключению КГА</div><div class="list out">${L.rows.map(([k, v]) => `<div class="li"><span>${esc(k)}</span><span>${esc(v)}</span></div>`).join('')}
   <div class="li"><span>${esc(L.dpt.label)}<div class="sm" style="color:#B25E00">${esc(L.dpt.flag)}</div></span><span>${esc(L.dpt.value)}</span></div></div><div class="sm mu" style="margin:6px 4px 0">${esc(L.src)}</div>` : ''}

  <div class="cap">Решения ГРК и АГП${p.grk_note ? ' · ' + esc(p.grk_note) : ''}</div>${dec.length ? dec.map(x => `<div class="card sm">${chipG(groupOf(x))} ${esc(x.organ)} · ${esc(x.date)}<br><b>${esc(x.dev)}</b>${x.area ? ' · ' + esc(x.area) + ' м²' : ''}<br>${esc(x.quote || '')}</div>`).join('') : '<div class="card sm mu">Не найдено</div>'}
  <div class="cap">Чего не хватает · ${miss.length} из ${C.parcel_fields.length}</div><div class="card sm">${miss.map(([, l]) => esc(l)).join(', ') || 'всё есть'}</div>
  <button class="btn" id="pdf">Справка PDF</button>`;
  $('#pv').querySelectorAll('.lr').forEach(e => e.onclick = () => legalSheet(tr.rows[e.dataset.i]));

  $('#pdf').onclick = () => report(p);
  const sv = () => { manSet(p.cad, {area: $('#m_area').value.trim(), unit: $('#m_unit').value, zone: $('#m_zone').value.trim(), vri: $('#m_vri').value.trim()}); drawParcel(); };
  ['m_area', 'm_zone', 'm_vri'].forEach(id => $('#' + id).onchange = sv); $('#m_unit').onchange = sv;
}
function report(p, opt = {}) {
  const R = C.report, d = pdata(p), dec = parcelDec(p), tr = trafficOf({...p, data: d}, dec), ph = perHa(d), now = new Date().toLocaleDateString('ru-RU');
  const I = {region: p.region, cls: d.cls || 'комфорт', S: d.S, zouit: d.zouit_area, red: d.red, kcom: d.kcom, avg: d.avg, zone: d.parking_zone, urv: d.urv};
  const na = '<span class="na">нет данных</span>', v = k => d[k] ? esc(d[k]) + ((p.data || {})[k + '_src'] ? `<div class="mu">${esc(p.data[k + '_src'])}</div>` : '') : na;
  const miss = C.parcel_fields.filter(([k]) => d[k] == null || d[k] === '').map(([, l]) => l);
  const V = p.valuation, bk = V && bestKey(V);
  const priceRow = V ? `<div class="tw"><table class="tt"><thead><tr>${V.list.map(s => `<th>${dotL(s.light)} ${esc(s.title)}${s.base ? '<br>база' : ''}${s.upper ? '<br>верхний предел · справочно' : ''}${s.key === bk ? `<br><span class="chip" style="background:#EAF3FF;color:#0060C7">${esc(C.tep.soc.better_chip)}</span>` : ''}</th>`).join('')}</tr></thead>
    <tbody><tr>${V.list.map(s => `<td><b>${s.available ? mln(s.price) : esc(C.valuation_no_price)}</b></td>`).join('')}</tr></tbody></table></div><p class="sm mu">${esc(V.status)}</p>` : `<p class="na">${esc(p.valuation_status || 'ожидает оценки')}</p>`;
  const bp = V && Math.round(V.base_price / 1000), bs = V && V.list.find(s => s.key === V.base);
  const sensLine = V && V.sens3[240] && V.sens3[300] && bs ? `<p>«${esc(bs.title)}» при цене квартир 240 / ${bp} / 300 тыс. ₽/м²: <b>${[V.sens3[240][V.base], bs.price, V.sens3[300][V.base]].map(x => x == null ? '—' : nf(x / 1e6)).join(' / ')} млн ₽</b></p>` : '';
  const pages = [
   `<div class="cov">${LOGO_H ? `<img src="logo-h-dark.svg" alt="MI Development" style="height:40px;margin-bottom:28px">` : ''}<div class="sm mu">${esc(R.title)}</div><div class="pc">${esc(p.cad)}</div><div class="pa">${d.address ? esc(d.address) : 'Адрес: нет данных'}</div>
    <div class="mu">${esc(p.region)}${p.district ? ', ' + esc(p.district) + ' район' : ''} · ${now}</div></div>`,
   `<h2>Сводка</h2><div class="tl2"><i style="background:${tr.color}"></i><b>${esc(tr.label)}</b></div>${tr.rows.length ? `<h3>${esc(R.legal_title)}</h3><table class="tt kv2"><tbody>${tr.rows.map(r => `<tr><td style="width:20px"><i class="dot8" style="background:${C.traffic[r.color]}"></i></td><td>${esc(r.pdf || r.title + ' · ' + r.action)}</td></tr>`).join('')}</tbody></table>` : ''}
    <h3>Итоговая цена участка по финмодели</h3>${priceRow}${sensLine}
    <h3>Чего не хватает по участку</h3><p class="sm">${miss.map(esc).join(', ') || '—'}. ${esc(C.missing_sources)}</p>
`,
   `<h2>ТЭП по сценариям</h2>${p.tep_dev ? `<p class="sm mu">${esc(p.tep_dev.src)} · ${esc(p.tep_dev.note)}</p>` + devTep(p, 'table') + '<div style="display:none">' : ''}${p.kga_limits ? `<p class="sm mu">Пределы КГА (КИТ 1,4): ${p.kga_limits.rows.map(([k, x]) => esc(k.replace(/ \(.*/, '') + ' ' + x)).join(' · ')}. ${esc(p.kga_limits.dpt.label)}: ${esc(p.kga_limits.dpt.value)} — ${esc(p.kga_limits.dpt.flag)}.</p>` : ''}${num(d.S) ? tepTable(I, 'pdf') + (d._manual ? '<p class="sm mu">Площадь введена вручную, справочно.</p>' : '') + (p.tep_dev ? '</div>' : '') : `<p class="sm mu">Площадь участка не передана. «По праву», ${esc(ph.label)}:</p><table class="tt kv2"><tbody>${ph.rows.map(([k, v, u]) => `<tr><td>${k}</td><td>${nf(v)}${u ? ' ' + u : ''}</td></tr>`).join('')}</tbody></table>`}`,
   `<h2>Градостроительная документация</h2><table class="tt kv2"><tbody>
    <tr><td>Зона ПЗЗ</td><td>${v('pzz')}</td></tr><tr><td>Предельная высота</td><td>${v('height')}</td></tr><tr><td>ППТ</td><td>${v('ppt')}</td></tr><tr><td>Кадастровая стоимость</td><td>${v('kad_value')}</td></tr><tr><td>Функциональная зона Генплана</td><td>${v('genplan')}</td></tr><tr><td>ВРИ по ЕГРН</td><td>${v('vri')}</td></tr>
    <tr><td>ЗОУИТ</td><td>${v('zouit')}</td></tr><tr><td>Зоны охраны ОКН</td><td>${v('okn')}</td></tr><tr><td>ГПЗУ</td><td>${v('gpzu')}</td></tr></tbody></table>
    <h3>Решения ГРК и АГП${p.grk_note ? ' · ' + esc(p.grk_note) : ''}</h3>${dec.length ? `<table class="tt kv2"><tbody>${dec.map(x => `<tr><td>${esc(x.organ)} · ${esc(x.date)}</td><td>${esc(groupOf(x).label)} · ${esc(x.dev)}${x.quote ? ': «' + esc(x.quote) + '»' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="na">Решений по участку в базе нет</p>'}
`,
   `<h2>Нормативы и источники</h2><table class="tt kv2"><tbody>${R.norms.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}<div class="mu">${esc(c)}</div></td></tr>`).join('')}</tbody></table>
    <h2>Финмодель${bs ? ' · ' + esc(bs.title) : ''}</h2><table class="tt"><thead><tr><th>Выручка</th><th>Затраты</th><th>Прибыль</th></tr></thead><tbody><tr>${['rev', 'costs', 'profit'].map(k => `<td>${V && V.summary[k] != null ? mln(V.summary[k]) : na}</td>`).join('')}</tr></tbody></table>${V ? `<p class="sm mu">${esc(V.status)}</p>` : ''}`].concat(V && V.finmodel ? [`<h2>Приложение. Базовая финмодель</h2><p class="sm mu">${esc((V.list.find(s => s.key === V.finmodel.scenario) || {}).title || '')} · ${esc(V.status)}</p>${fmTable(V, 1)}`, `<h2>Приложение. Базовая финмодель (окончание)</h2>${fmTable(V, 2)}`] : []);
  const ft = (i) => `<div class="pf" style="font-size:${R.footer_px}px;color:${R.footer_color}">${LOGO_H ? `<img src="logo-h-dark.svg" alt="MI Development" style="height:12px">` : `<span class="logo-slot">${esc(R.logo_slot)}</span>`}<span>${i + 1} / ${pages.length}</span></div>`;
  let el = $('#print'); if (!el) { el = document.createElement('div'); el.id = 'print'; document.body.appendChild(el); }
  el.innerHTML = pages.map((h, i) => `<section class="pg">${opt.sample ? '<div class="wm">ПРИМЕР</div>' : ''}${h}${ft(i)}</section>`).join('');
  document.body.classList.add('printing');
  if (!opt.noPrint) { setTimeout(() => { window.print(); }, 50); window.onafterprint = () => document.body.classList.remove('printing'); }
}

/* ---------- право ---------- */
function viewLaw() {
  const M = $('#m');
  M.innerHTML = `<h1>Право</h1><div class="sub">СПб и ЛО. Справочник Юридического консультанта, ред. 14.10.2026</div>
  <div class="seg" id="lv"><button data-v="rules" class="${LAW.view === 'rules' ? 'on' : ''}">Проверки</button><button data-v="notes" class="${LAW.view === 'notes' ? 'on' : ''}">Справочник</button></div>
  <div id="lb"></div>`;
  $('#lv').onclick = e => { const b = e.target.closest('button'); if (b) { LAW.view = b.dataset.v; viewLaw(); } };
  LAW.view === 'rules' ? lawRules() : lawNotes();
}
function lawRules() {
  const R = B.legal_rules.filter(r => !LAW.region || r['регион'].split(';').includes(LAW.region)), by = {};
  R.forEach(r => (by[r['проверка']] = by[r['проверка']] || []).push(r));
  $('#lb').innerHTML = `<div class="seg" id="rg">${[['', 'Все'], ['СПб', 'СПб'], ['ЛО', 'ЛО']].map(([v, l]) => `<button data-v="${v}" class="${LAW.region === v ? 'on' : ''}">${l}</button>`).join('')}</div>
  <div class="chips" style="margin-top:10px">${Object.entries(C.traffic).map(([k, c]) => `<span class="chip"><i style="background:${c}"></i>${k}</span>`).join('')}<span class="sm mu" style="align-self:center">${R.length} правил</span></div>
  ${Object.entries(by).map(([k, rs]) => `<div class="cap">${esc(k)}</div><div class="list">${rs.map(r => `<div class="rule"><i style="background:${C.traffic[r['светофор']] || '#AEAEB2'}"></i><div><p>${esc(r['условие'])}</p>
  <div class="sm mu">${esc(r['норма'])}${r['источник данных'] ? ' · ' + esc(r['источник данных']) : ''}</div>${r['комментарий'] ? `<div class="sm" style="color:#B25E00">${esc(r['комментарий'])}</div>` : ''}${r['примечание'] ? `<div class="sm mu">${esc(r['примечание'])}</div>` : ''}</div></div>`).join('')}</div>`).join('')}`;
  $('#rg').onclick = e => { const b = e.target.closest('button'); if (b) { LAW.region = b.dataset.v; lawRules(); } };
}
function lawNotes() {
  $('#lb').innerHTML = B.legal_notes.filter(n => n.html.trim()).map(n => `<details class="card note"><summary>${esc(n.title)}</summary><div class="md">${n.html}</div></details>`).join('');
}
lockScreen();
