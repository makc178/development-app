'use strict';
/* Development App — код без данных. Данные: закрытый репозиторий DATA_REPO, ключ GitHub хранится на устройстве, зашифрован PIN-кодом. */
const DATA_REPO = 'makc178/development-app-data', DATA_FILE = 'bundle.json', ITER = 600000, LS = 'devapp_lock_v1';
const $ = s => document.querySelector(s), A = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const nf = (n, d = 0) => (n == null || !isFinite(n)) ? '—' : n.toLocaleString('ru-RU', {maximumFractionDigits: d, minimumFractionDigits: 0});
const ICON = 'icon.svg';
let B = null, C = null, TAB = 'grk', F = {group: '', organ: '', year: '', tag: '', q: ''}, TEPI = {region: 'СПб', scen: 'po_pravu', cls: 'комфорт', zone: 'обычная', lo: 'А', urv: false}, LAW = {view: 'rules', region: ''};

/* ---------- крипто ---------- */
const te = new TextEncoder(), td = new TextDecoder();
const b64 = u => btoa(String.fromCharCode(...new Uint8Array(u))), ub64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function kdf(pin, salt) {
  const k = await crypto.subtle.importKey('raw', te.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256'}, k, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
}
async function seal(pin, text) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await kdf(pin, salt), te.encode(text));
  return {salt: b64(salt), iv: b64(iv), ct: b64(ct)};
}
async function unseal(pin, o) {
  const pt = await crypto.subtle.decrypt({name: 'AES-GCM', iv: ub64(o.iv)}, await kdf(pin, ub64(o.salt)), ub64(o.ct));
  return td.decode(pt);
}
const ghH = t => ({Authorization: 'Bearer ' + t, Accept: 'application/vnd.github.raw+json', 'X-GitHub-Api-Version': '2022-11-28'});

/* ---------- вход ---------- */
function lockScreen(msg = '') {
  const has = !!localStorage.getItem(LS);
  A.innerHTML = `<div class="lock"><img src="${ICON}" alt=""><h1>Development</h1><div class="sub">${has ? 'Введите PIN' : 'Первый вход на этом устройстве'}</div>
  ${has ? '' : `<input class="inp" id="tok" type="password" autocomplete="off" placeholder="Ключ GitHub (только чтение)">
  <div class="sm mu" style="margin:6px 4px 0">Fine-grained ключ: только репозиторий development-app-data, Contents: Read-only. Хранится на устройстве, зашифрован PIN-кодом.</div>`}
  <input class="inp" id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" placeholder="PIN, 4–8 цифр" autocomplete="off">
  ${has ? '' : '<input class="inp" id="pin2" type="password" inputmode="numeric" maxlength="8" placeholder="PIN ещё раз" autocomplete="off">'}
  <div class="err" id="err">${esc(msg)}</div><button class="btn" id="go">${has ? 'Открыть' : 'Сохранить и открыть'}</button>
  ${has ? '<button class="btn o" id="rst">Сменить ключ</button>' : ''}</div>`;
  const go = async () => {
    const pin = $('#pin').value.trim(), err = $('#err'); err.textContent = '';
    if (!/^\d{4,8}$/.test(pin)) return err.textContent = 'PIN — от 4 до 8 цифр';
    $('#go').disabled = true; $('#go').textContent = 'Проверяю…';
    try {
      let tok;
      if (!has) {
        tok = $('#tok').value.trim(); if (!tok) throw new Error('Вставьте ключ GitHub');
        if (pin !== $('#pin2').value.trim()) throw new Error('PIN не совпадает');
        const r = await fetch('https://api.github.com/repos/' + DATA_REPO, {headers: ghH(tok)});
        if (!r.ok) throw new Error(r.status === 404 || r.status === 401 ? 'Ключ не даёт доступа к репозиторию данных' : 'GitHub ' + r.status);
        localStorage.setItem(LS, JSON.stringify(await seal(pin, tok)));
      } else {
        try { tok = await unseal(pin, JSON.parse(localStorage.getItem(LS))); } catch { throw new Error('Неверный PIN'); }
      }
      await load(tok);
    } catch (e) { err.textContent = e.message; $('#go').disabled = false; $('#go').textContent = has ? 'Открыть' : 'Сохранить и открыть'; }
  };
  $('#go').onclick = go; $('#pin').onkeydown = e => e.key === 'Enter' && go();
  if ($('#rst')) $('#rst').onclick = () => { if (confirm('Удалить сохранённый ключ с этого устройства?')) { localStorage.removeItem(LS); lockScreen(); } };
}
async function load(tok) {
  const r = await fetch(`https://api.github.com/repos/${DATA_REPO}/contents/${DATA_FILE}?ref=main`, {headers: ghH(tok), cache: 'no-store'});
  if (!r.ok) throw new Error(r.status === 404 ? 'Данные не найдены в репозитории' : 'GitHub ' + r.status);
  B = await r.json(); C = B.config; render();
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
const approvedLater = d => (d.rres || '').toLowerCase().startsWith(C.reconsidered_approved_prefix);

/* ---------- экраны ---------- */
const TABS = [['grk', 'Решения', '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h8M8 8h4"/>'],
  ['tep', 'ТЭП', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/>'],
  ['law', 'Право', '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7h6zM18 7l-3 7h6z"/>']];
function render() {
  const title = {grk: 'Решения ГРК', tep: 'Расчёт ТЭП', law: 'Правовые заметки'}[TAB];
  A.innerHTML = `<div class="nav"><img src="${ICON}" alt=""><span class="t">${title}</span><span class="ex">тест</span></div><main id="m"></main>
  <nav class="tabs">${TABS.map(([k, l, p]) => `<button data-t="${k}" class="${TAB === k ? 'on' : ''}"><svg viewBox="0 0 24 24">${p}</svg>${l}</button>`).join('')}</nav><div id="sh"></div>`;
  A.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { TAB = b.dataset.t; render(); scrollTo(0, 0); });
  ({grk: viewGrk, tep: viewTep, law: viewLaw})[TAB]();
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
  $('#ls').innerHTML = L.length ? L.map(d => { const g = groupOf(d);
    return `<div class="card dc" data-id="${d.id}"><div class="top">${chipG(g)}<span class="chip">${esc(d.organ)}</span><span class="sm mu">${esc(d.date.replace(/ \(.*/, ''))}</span>${approvedLater(d) ? '<span class="chip" style="background:#EAF3FF;color:#0060C7">позже одобрено</span>' : ''}</div>
    <h3>${d.address ? esc(d.address) : '<span class="na">Адрес не указан</span>'}</h3><div class="dev">${esc(d.dev) || '<span class="na">Застройщик не указан</span>'}</div>
    ${d.tags.length ? `<div class="chips" style="margin-top:8px">${d.tags.map(t => `<span class="chip">${t} · ${esc(tagName(t))}</span>`).join('')}</div>` : ''}
    ${d.quote ? `<q>${esc(d.quote.length > 180 ? d.quote.slice(0, 177) + '…' : d.quote)}</q>` : ''}</div>`; }).join('') : '<div class="empty">Ничего не найдено</div>';
  $('#ls').querySelectorAll('.dc').forEach(c => c.onclick = () => detail(B.decisions[c.dataset.id]));
}
function detail(d) {
  const g = groupOf(d), row = (k, v) => v ? `<div class="li"><span>${k}</span><span>${v}</span></div>` : '';
  $('#sh').innerHTML = `<div class="sheet"><div><div class="grab"></div><button class="close" aria-label="Закрыть">✕</button>
  <div class="top" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${chipG(g)}<span class="chip">${esc(d.organ)}</span></div>
  <h1 style="font-size:22px;line-height:28px">${d.address ? esc(d.address) : 'Адрес не указан'}</h1>
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

/* ---------- ТЭП ---------- */
function viewTep() {
  const T = C.tep, M = $('#m'), I = TEPI;
  const segs = (id, opts, cur) => `<div class="seg" id="${id}">${opts.map(([v, l]) => `<button data-v="${esc(v)}" class="${v === cur ? 'on' : ''}">${esc(l)}</button>`).join('')}</div>`;
  const num = (id, l, u) => `<div class="li"><span>${l}</span><span><input id="${id}" inputmode="decimal" placeholder="${u}" value="${esc(I[id] ?? '')}"></span></div>`;
  M.innerHTML = `<h1>Расчёт ТЭП</h1><div class="sub">По алгоритму Девелопера v0.1. Данных участка нет: введите свои. Коэффициенты в справочнике.</div>
  ${segs('region', [['СПб', 'СПб'], ['ЛО', 'ЛО']], I.region)}
  ${segs('scen', [['po_pravu', 'По праву'], ['maksimum', 'Максимум (ДПТ)'], ['aparty', 'Апарты']], I.scen)}
  ${segs('cls', Object.keys(T.k_pol).map(k => [k, k[0].toUpperCase() + k.slice(1)]), I.cls)}
  <div class="cap">Участок, м²</div><div class="list">${num('S', 'Площадь участка S', 'из ЕГРН')}${num('zouit', 'ЗОУИТ, где строить нельзя', '0')}${num('red', 'В красных линиях', '0')}${num('other', 'Нежилые объекты с их территорией', '0')}
  <div class="li"><span class="chk"><input type="checkbox" id="urv" ${I.urv ? 'checked' : ''}>ВРИ условно разрешённый</span><span class="mu sm">S<sub>р</sub> = ${T.conditional_vri_share * 100}% S</span></div></div>
  <div class="cap">Параметры</div><div class="list">${num('kcom', `Доля коммерции (${T.k_com.min}–${T.k_com.max})`, String(T.k_com.default))}${num('avg', 'Средняя квартира, м²', 'по квартирографии')}
  ${I.region === 'СПб' ? `<div class="li"><span>Зона для парковок</span><span><select id="zone">${Object.keys(T.parking_m2_per_space_by_zone).map(z => `<option ${z === I.zone ? 'selected' : ''}>${z}</option>`).join('')}</select></span></div>`
    : `<div class="li"><span>Зона РНГП ЛО</span><span><select id="lo">${Object.keys(T.lo_density_m2_per_ha).map(z => `<option ${z === I.lo ? 'selected' : ''}>${z}</option>`).join('')}</select></span></div>`}</div>
  <div class="cap">Результат</div><div id="res"></div>
  <div class="disc">Не считаются в этой сборке: этажность (нужны ПЗЗ, зоны ОКН, Пулково), баланс территории (шаг 8), автоматический контур с НСПД. ${esc(T._src)}</div>`;
  M.querySelectorAll('.seg').forEach(s => s.onclick = e => { const b = e.target.closest('button'); if (b) { I[s.id] = b.dataset.v; viewTep(); } });
  M.querySelectorAll('input:not([type=checkbox])').forEach(x => x.oninput = () => { I[x.id] = x.value; calc(); });
  $('#urv').onchange = e => { I.urv = e.target.checked; calc(); };
  M.querySelectorAll('select').forEach(x => x.onchange = () => { I[x.id] = x.value; calc(); });
  calc();
}
function calc() {
  const T = C.tep, I = TEPI, n = k => { const v = parseFloat(String(I[k] ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(v) ? v : null; };
  const S = n('S'); if (!S) return $('#res').innerHTML = '<div class="card empty">Введите площадь участка</div>';
  const warn = [];
  let Sr = S - (n('zouit') || 0) - (n('red') || 0) - (n('other') || 0);
  if (I.urv) Sr = S * T.conditional_vri_share;
  if (Sr <= 0) return $('#res').innerHTML = '<div class="card empty">Расчётная площадь ≤ 0</div>';
  let Akv, base;
  if (I.region === 'СПб') { const kit = I.scen === 'maksimum' ? T.kit.dpt : T.kit.po_pravu; Akv = kit * Sr; base = `КИТ ${nf(kit, 1)}`; }
  else { const dn = T.lo_density_m2_per_ha[I.lo]; Akv = dn * Sr / 10000; base = `плотность ${nf(dn)} м²/га (зона ${I.lo})`; warn.push('ЛО: парковки по ПЗЗ поселения — норма не найдена'); }
  let kc = n('kcom') ?? T.k_com.default; if (kc < T.k_com.min || kc > T.k_com.max) warn.push(`Доля коммерции вне диапазона ${T.k_com.min}–${T.k_com.max}`);
  const Acom = Akv * kc, kp = T.k_pol[I.cls], SPP = (Akv + Acom) / kp, res = Akv / T.m2_per_resident;
  const avg = n('avg'); let N = null;
  if (avg) { if (avg < T.min_apartment_m2) warn.push(`Средняя квартира меньше ${T.min_apartment_m2} м²`); else N = Akv / avg; }
  let park = null; if (I.region === 'СПб' && I.scen !== 'aparty') park = Akv / T.parking_m2_per_space_by_zone[I.zone];
  if (I.scen === 'aparty') warn.push('Апарты: парковки по числу номеров — норма не задана');
  const green = Akv * T.greening.per_100m2 / 100, kg = res * T.social_per_1000.kindergarten / 1000, sc = res * T.social_per_1000.school / 1000;
  if (I.scen === 'maksimum') warn.push(`Сценарий «Максимум»: нужен ДПТ, срок +${T.dpt_extra_months} мес., флаг риска`);
  const r = (k, v) => `<div class="li"><span>${k}</span><span>${v}</span></div>`;
  $('#res').innerHTML = `<div class="card"><div class="sm mu">${I.scen === 'aparty' ? 'Площадь номеров' : 'Площадь квартир'} A<sub>кв</sub></div><div style="font-size:32px;font-weight:700;letter-spacing:-.02em">${nf(Akv)} м²</div><div class="sm mu">${base} × S<sub>р</sub> ${nf(Sr)} м²</div></div>
  <div class="list out" style="margin-top:10px">${r('Коммерция A<sub>ком</sub>', nf(Acom) + ' м²')}${r(`Наземная СПП (K<sub>пол</sub> ${kp})`, nf(SPP) + ' м²')}${r('Квартир N', N ? nf(N) : '<span class="na">задайте среднюю квартиру</span>')}
  ${r('Жителей', nf(res))}${r('Машино-мест (жильё)', park ? nf(Math.ceil(park)) : '<span class="na">норма не задана</span>')}${park ? r('Площадь парковок', nf(Math.ceil(park) * T.parking_place_m2) + ' м²') : ''}
  ${r('Озеленение', nf(green) + ' м²')}${r('Мест в детсадах', nf(Math.ceil(kg)))}${r('Мест в школах', nf(Math.ceil(sc)))}</div>
  ${warn.map(w => `<div class="warn">▲ ${esc(w)}</div>`).join('')}<div class="sm mu" style="margin-top:6px">Соцнормы: ${esc(T.social_per_1000._check)}</div>`;
}

/* ---------- право ---------- */
function viewLaw() {
  const M = $('#m');
  M.innerHTML = `<h1>Право</h1><div class="sub">СПб и ЛО. Справочник Юридического консультанта, ред. 14.10.2026</div>
  <div class="seg" id="lv"><button data-v="rules" class="${LAW.view === 'rules' ? 'on' : ''}">Проверки</button><button data-v="notes" class="${LAW.view === 'notes' ? 'on' : ''}">Справочник</button></div>
  <div class="disc">${esc(C.legal_disclaimer)}</div><div id="lb"></div>`;
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
