'use strict';
/* Development App — код без данных. Данные: закрытый репозиторий DATA_REPO, ключ GitHub хранится на устройстве, зашифрован PIN-кодом. */
const DATA_REPO = 'makc178/development-app-data', DATA_FILE = 'bundle.json', ITER = 600000, LS = 'devapp_lock_v1';
const $ = s => document.querySelector(s), A = $('#app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const nf = (n, d = 0) => (n == null || !isFinite(n)) ? '—' : n.toLocaleString('ru-RU', {maximumFractionDigits: d, minimumFractionDigits: 0});
const ICON = 'icon.svg';
let B = null, C = null, TAB = 'parcel', F = {group: '', organ: '', year: '', tag: '', q: ''}, TEPI = {region: 'СПб', scen: 'po_pravu', cls: 'комфорт', zone: 'обычная', lo: 'А', urv: false}, LAW = {view: 'rules', region: ''};

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
const TABS = [['parcel', 'Участок', '<path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>'], ['grk', 'Решения', '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h8M8 8h4"/>'],
  ['tep', 'ТЭП', '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M8 18h2M12 18h2M16 15v3"/>'],
  ['law', 'Право', '<path d="M12 3v18M5 21h14M6 7h12M6 7l-3 7h6zM18 7l-3 7h6z"/>']];
function render() {
  const title = {parcel: 'Участок', grk: 'Решения ГРК', tep: 'Расчёт ТЭП', law: 'Правовые заметки'}[TAB];
  A.innerHTML = `<div class="nav"><img src="${ICON}" alt=""><span class="t">${title}</span><span class="ex">тест</span></div><main id="m"></main>
  <nav class="tabs">${TABS.map(([k, l, p]) => `<button data-t="${k}" class="${TAB === k ? 'on' : ''}"><svg viewBox="0 0 24 24">${p}</svg>${l}</button>`).join('')}</nav><div id="sh"></div>`;
  A.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { TAB = b.dataset.t; render(); scrollTo(0, 0); });
  ({parcel: viewParcel, grk: viewGrk, tep: viewTep, law: viewLaw})[TAB]();
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

/* ---------- ТЭП: ядро (все нормы из C.tep) ---------- */
const num = v => { const x = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(x) ? x : null; };
function tepCore(I, sid) {
  const T = C.tep, sc = T.scenarios.find(s => s.id === sid), warn = [], S = num(I.S);
  if (!S) return null;
  let Sr = S - (num(I.zouit) || 0) - (num(I.red) || 0) - (num(I.other) || 0);
  if (I.urv) Sr = S * T.conditional_vri_share;
  let Akv0, base;
  const kc = num(I.kcom) ?? T.k_com.default, kp = T.k_pol[I.cls || 'комфорт'];
  const dens = () => I.region === 'ЛО' ? T.lo_density_m2_per_ha[I.lo || 'А'] / 10000 : (sc.kit === 'dpt' ? T.kit.dpt : T.kit.po_pravu);
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
  if (sid === 'maksimum') warn.push(`Нужен ДПТ, срок +${T.dpt_extra_months} мес., флаг риска`);
  if (o.soc) warn.push(`Срок проекта +${o.soc.shift} мес.`);
  return Object.assign(o, {Akv, Acom, kp, SPP, res, N, park, parkArea: park ? park * T.parking_place_m2 : null,
    green: Akv * T.greening.per_100m2 / 100, kg: Math.ceil(res * T.social_per_1000.kindergarten / 1000), sch: Math.ceil(res * T.social_per_1000.school / 1000)});
}
const NA = '<span class="na">нет данных</span>';
const TEP_ROWS = [['Расчётная площадь S<sub>р</sub>', r => nf(r.Sr) + ' м²'], ['Площадь квартир A<sub>кв</sub>', r => nf(r.Akv) + ' м²'], ['Коммерция A<sub>ком</sub>', r => nf(r.Acom) + ' м²'],
  ['Наземная СПП', r => nf(r.SPP) + ' м²'], ['Квартир', r => r.N ? nf(r.N) : NA], ['Жителей', r => nf(r.res)], ['Машино-мест', r => r.park ? nf(r.park) : NA], ['Озеленение', r => nf(r.green) + ' м²'],
  ['Мест в детсадах (потребность)', r => nf(r.kg)], ['Мест в школах (потребность)', r => nf(r.sch)],
  ['Соцобъект: мест ДОУ / СОШ', r => r.soc ? `${nf(r.soc.places.kindergarten)} / ${nf(r.soc.places.school)}` : '—'],
  ['Соцобъект: отдано квартир', r => r.soc ? (r.soc.unknown ? `≥ ${nf(r.aptLost)} м²` : nf(r.aptLost) + ' м²') : '—'],
  ['Цена участка (Оценщик)', r => r.soc ? `<span class="na">${esc(C.tep.soc.price_status)}</span>` : NA]];
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
  <div class="disc">Не считаются: этажность (нужны ПЗЗ, зоны ОКН, Пулково), баланс территории (шаг 8), контур с НСПД. ${esc(T._src)}</div>`;
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
  return `<table class="tt ${cls}"><thead><tr><th rowspan="${soc.length ? 2 : 1}"></th>${R.filter(([s]) => !s.group).map(([s]) => `<th rowspan="2">${esc(s.label)}</th>`).join('')}${soc.length ? `<th colspan="${soc.length}">${esc(soc[0][0].group)}<br>${socChips(soc[0][0])}</th>` : ''}</tr>
  ${soc.length ? `<tr>${soc.map(([s]) => `<th>${esc(s.label)}</th>`).join('')}</tr>` : ''}</thead>
  <tbody>${TEP_ROWS.map(([k, f]) => `<tr><td>${k}</td>${R.map(([, r]) => `<td>${r && !r.err ? f(r) : NA}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
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
function trafficOf(p, dec) {
  const P = C.traffic_policy, rank = {'зелёный': 0, 'жёлтый': 1, 'красный': 2}, flags = [];
  const has = Object.values(p.data || {}).some(v => v !== '' && v != null);
  dec.forEach(d => { const g = groupOf(d); if (g.id === 'refusal') flags.push([P.flags.grk_refusal, `${d.organ} ${d.date.replace(/ \(.*/, '')}: ${g.label.toLowerCase()}`]); if (g.id === 'rework') flags.push([P.flags.grk_rework, `${d.organ}: на доработку`]); });
  if (!P.official_sources_connected) flags.push([P.flags.no_official_data, 'Официальные источники не подключены']);
  if (!has && !dec.length) return {label: P.no_data.label, color: P.no_data.color, flags};
  let w = flags.reduce((a, [c]) => rank[c] > rank[a] ? c : a, 'зелёный');
  if (!P.official_sources_connected && rank[w] < rank[P.cap_without_official]) w = P.cap_without_official;
  return {label: w + (P.official_sources_connected ? '' : ' · ' + P.cap_label), color: C.traffic[w], flags};
}
const parcelDec = p => B.decisions.filter(d => (p.cad && d.cad === p.cad) || (p.dev_match && d.dev === p.dev_match));
function viewParcel() {
  const M = $('#m');
  M.innerHTML = `<h1>Участок</h1><div class="sub">${esc(C.missing_sources)}</div>
  <div class="fl"><input class="srch" style="margin:0" id="cad" inputmode="numeric" placeholder="Кадастровый номер 78:…" value="${esc(PARCEL?.cad || '')}"><button class="btn" style="width:auto;margin:0;height:38px;padding:0 14px;font-size:15px" id="find">Открыть</button></div>
  <div class="err" id="cerr"></div><div class="cap">Участки в работе</div><div id="pl"></div><div id="pv"></div>`;
  $('#pl').innerHTML = C.projects.length ? C.projects.map(p => `<div class="card dc" data-c="${esc(p.cad)}"><div class="top"><span class="chip">${esc(p.region)}</span><span class="chip" style="background:#FFF4E5;color:#B25E00">${esc(p.status)}</span></div>
    <h3>${esc(p.cad)}</h3><div class="dev">${esc(p.title)}${p.district ? ' · ' + esc(p.district) + ' район' : ''}</div></div>`).join('') : '<div class="card empty">Участков пока нет</div>';
  $('#pl').querySelectorAll('.dc').forEach(c => c.onclick = () => { $('#cad').value = c.dataset.c; openCad(); });
  $('#find').onclick = openCad; $('#cad').onkeydown = e => e.key === 'Enter' && openCad();
  PARCEL ? drawParcel() : $('#pv').innerHTML = '<div class="card empty">Участок не выбран.<br>Введите кадастровый номер или выберите из списка.</div>';
}
function openCad() {
  const v = $('#cad').value.trim(); $('#cerr').textContent = '';
  if (!new RegExp(C.cad_pattern).test(v)) return $('#cerr').textContent = 'Формат: 78:00:0000000:0000';
  PARCEL = C.projects.find(p => p.cad === v) || {cad: v, title: 'Новый участок', region: v.startsWith('47:') ? 'ЛО' : 'СПб', district: '', status: 'нет данных', data: {}};
  drawParcel();
}
function drawParcel() {
  const p = PARCEL, d = pdata(p), m = manGet(p.cad), dec = parcelDec(p), tr = trafficOf({...p, data: d}, dec), ph = perHa(d);
  const miss = C.parcel_fields.filter(([k]) => d[k] == null || d[k] === '');
  $('#pv').innerHTML = `<div class="cap">Участок ${esc(p.cad)}</div><div class="card"><div style="display:flex;align-items:center;gap:8px"><i style="width:14px;height:14px;border-radius:7px;background:${tr.color};display:inline-block"></i><b>${esc(tr.label)}</b></div>
   <div class="sm mu" style="margin-top:4px">${tr.flags.map(f => esc(f[1])).join(' · ')}</div></div>
  <div class="list kv" style="margin-top:10px"><div class="li"><span>Регион / район</span><span>${esc(p.region)}${p.district ? ', ' + esc(p.district) : ''}</span></div>
  ${C.parcel_fields.map(([k, l]) => `<div class="li"><span>${l}</span><span>${d[k] ? esc(d[k]) + (d._manual && ['S', 'pzz', 'vri'].includes(k) && !(p.data || {})[k] ? ' <span class="chip" style="background:#FFF4E5;color:#B25E00">вручную</span>' : '') : NA}</span></div>`).join('')}</div>
  <div class="cap">Ввести вручную (до выписки ЕГРН)</div><div class="list">
  <div class="li"><span>Площадь</span><span style="display:flex;gap:6px"><input id="m_area" inputmode="decimal" placeholder="—" value="${esc(m.area || '')}" style="width:96px"><select id="m_unit" style="width:64px">${['га', 'м²'].map(u => `<option ${u === (m.unit || 'га') ? 'selected' : ''}>${u}</option>`).join('')}</select></span></div>
  <div class="li"><span>Зона ПЗЗ</span><span><input id="m_zone" placeholder="напр. ТЖ2" value="${esc(m.zone || '')}"></span></div>
  <div class="li"><span>ВРИ</span><span><input id="m_vri" placeholder="код ВРИ" value="${esc(m.vri || '')}"></span></div></div>
  <div class="sm mu" style="margin:6px 4px 0">Хранится только на этом устройстве, помечается «введено вручную».</div>
  <div class="cap">ТЭП «по праву» · ${esc(ph.label)}</div><div class="list out">${ph.rows.map(([k, v, u]) => `<div class="li"><span>${k}</span><span>${nf(v)}${u ? ' ' + u : ''}</span></div>`).join('')}</div>
  <div class="cap">Решения ГРК и АГП по участку</div>${dec.length ? dec.map(x => `<div class="card sm">${chipG(groupOf(x))} ${esc(x.organ)} · ${esc(x.date)}<br>${esc(x.quote || '')}</div>`).join('') : '<div class="card sm mu">Не найдено (поиск по кадастровому номеру в базе решений)</div>'}
  <div class="cap">Чего не хватает · ${miss.length} из ${C.parcel_fields.length}</div><div class="card sm">${miss.map(([, l]) => esc(l)).join(', ') || 'всё есть'}</div>
  <button class="btn" id="pdf">Справка PDF</button>`;
  $('#pdf').onclick = () => report(p);
  const sv = () => { manSet(p.cad, {area: $('#m_area').value.trim(), unit: $('#m_unit').value, zone: $('#m_zone').value.trim(), vri: $('#m_vri').value.trim()}); drawParcel(); };
  ['m_area', 'm_zone', 'm_vri'].forEach(id => $('#' + id).onchange = sv); $('#m_unit').onchange = sv;
}
function report(p, opt = {}) {
  const R = C.report, d = pdata(p), dec = parcelDec(p), tr = trafficOf({...p, data: d}, dec), ph = perHa(d), now = new Date().toLocaleDateString('ru-RU');
  const I = {region: p.region, cls: d.cls || 'комфорт', S: d.S, zouit: d.zouit_area, red: d.red, kcom: d.kcom, avg: d.avg, zone: d.parking_zone, urv: d.urv};
  const na = '<span class="na">нет данных</span>', v = k => d[k] ? esc(d[k]) : na;
  const miss = C.parcel_fields.filter(([k]) => d[k] == null || d[k] === '').map(([, l]) => l);
  const socIds = SCN().filter(s => s.group).map(s => s.id), prices = d.prices || {};
  const better = socIds.every(id => num(prices[id]) != null) ? socIds.reduce((a, b) => num(prices[a]) >= num(prices[b]) ? a : b) : null;
  const priceRow = `<table class="tt"><thead><tr>${SCN().map(s => `<th>${esc(s.group ? s.group + ': ' + s.label : s.label)}${s.id === better ? `<br><span class="chip" style="background:#EAF3FF;color:#0060C7">${esc(C.tep.soc.better_chip)}</span>` : ''}</th>`).join('')}</tr></thead>
    <tbody><tr>${SCN().map(s => `<td>${prices[s.id] ? esc(prices[s.id]) + ' ₽' : `<span class="na">${s.group ? esc(C.tep.soc.price_status) : 'нет данных'}</span>`}</td>`).join('')}</tr></tbody></table>`;
  const pages = [
   `<div class="cov"><div class="sm mu">${esc(R.title)}</div><div class="pc">${esc(p.cad)}</div><div class="pa">${d.address ? esc(d.address) : 'Адрес: нет данных'}</div>
    <div class="mu">${esc(p.region)}${p.district ? ', ' + esc(p.district) + ' район' : ''} · ${now}</div></div>`,
   `<h2>Сводка</h2><div class="tl2"><i style="background:${tr.color}"></i><b>${esc(tr.label)}</b></div><div class="sm mu">${tr.flags.map(f => esc(f[1])).join(' · ')}</div>
    <h3>Итоговая цена участка по финмодели</h3>${priceRow}
    <h3>Чего не хватает по участку</h3><p class="sm">${miss.map(esc).join(', ') || '—'}. ${esc(C.missing_sources)}</p>
    <h2>ТЭП по сценариям</h2>${num(d.S) ? tepTable(I, 'pdf') + (d._manual ? '<p class="sm mu">Площадь введена вручную, справочно.</p>' : '') : `<p class="sm mu">Площадь участка не передана. «По праву», ${esc(ph.label)}:</p><table class="tt kv2"><tbody>${ph.rows.map(([k, v, u]) => `<tr><td>${k}</td><td>${nf(v)}${u ? ' ' + u : ''}</td></tr>`).join('')}</tbody></table>`}`,
   `<h2>Градостроительная документация</h2><table class="tt kv2"><tbody>
    <tr><td>Зона ПЗЗ</td><td>${v('pzz')}</td></tr><tr><td>Функциональная зона Генплана</td><td>${v('genplan')}</td></tr><tr><td>ВРИ по ЕГРН</td><td>${v('vri')}</td></tr>
    <tr><td>ЗОУИТ</td><td>${v('zouit')}</td></tr><tr><td>Зоны охраны ОКН</td><td>${v('okn')}</td></tr><tr><td>ГПЗУ</td><td>${v('gpzu')}</td></tr></tbody></table>
    <h3>Решения ГРК и АГП</h3>${dec.length ? `<table class="tt kv2"><tbody>${dec.map(x => `<tr><td>${esc(x.organ)} · ${esc(x.date)}</td><td>${esc(groupOf(x).label)}${x.quote ? ': «' + esc(x.quote) + '»' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="na">Решений по участку в базе нет</p>'}
    <h2>Нормативы и источники</h2><table class="tt kv2"><tbody>${R.norms.map(([a, b, c]) => `<tr><td>${esc(a)}</td><td>${esc(b)}<div class="mu">${esc(c)}</div></td></tr>`).join('')}</tbody></table>
    <h2>Финмодель</h2><table class="tt"><thead><tr><th>Выручка</th><th>Затраты</th><th>Прибыль</th></tr></thead><tbody><tr>${['revenue', 'costs', 'profit'].map(k => `<td>${(d.fin || {})[k] ? esc(d.fin[k]) + ' ₽' : na}</td>`).join('')}</tr></tbody></table>`];
  const ft = (i) => `<div class="pf" style="font-size:${R.footer_px}px;color:${R.footer_color}"><span class="logo-slot">${esc(R.logo_slot)}</span><span>${i + 1} / ${pages.length}</span></div>`;
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
