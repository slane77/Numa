// ============================================================================
//  Day Webster — Managed Services (MSP)
//  One-page app, hash routed:  #/            services pipeline
//                              #/s/<id>/<tab> service workspace
//  Backed by the public.msp_* tables (supabase/msp_schema.sql + _v2.sql).
// ============================================================================
const sb = window.supabase.createClient(window.CONFIG.MSP_SUPABASE_URL, window.CONFIG.MSP_SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const esc = (s) => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gbp = (n, d = 0) => (Number(n) < 0 ? '−' : '') + '£' + Math.abs(Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (n, d = 1) => (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (n, d = 1) => num(n, d) + '%';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (iso) => { const d = new Date(iso + 'T00:00:00'); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const fmtDT = (ts) => ts ? new Date(ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';
const hhmm = (t) => (t || '').slice(0, 5);
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STAGES = ['enquiry', 'scoping', 'proposal', 'awarded', 'mobilising', 'live', 'closed', 'lost'];
const STAGE_PILL = { enquiry: 'mut', scoping: 'info', proposal: 'info', awarded: '', mobilising: 'flag', live: '', closed: 'mut', lost: 'red' };
const COMP_PILL = { pending: 'mut', in_progress: 'flag', cleared: '', expired: 'red', failed: 'red' };
const TABS = [['overview', 'Overview'], ['scoping', 'Scoping'], ['design', 'Service design'], ['pricing', 'Pricing'], ['mobilisation', 'Mobilisation'], ['pool', 'Pool'], ['rota', 'Rota'], ['timesheets', 'Timesheets'], ['invoices', 'Invoices'], ['reports', 'Reports'], ['incidents', 'Incidents'], ['documents', 'Documents'], ['settings', 'Settings']];
const BASE = location.origin + location.pathname.replace(/[^/]*$/, '');

function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('toasts').appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 2800); }
function fail(error) { console.error(error); toast(error.message || String(error), true); }
function hours(start, end, breakMins = 0) { const [sh, sm] = start.split(':').map(Number), [eh, em] = end.split(':').map(Number); let h = (eh + em / 60) - (sh + sm / 60); if (h <= 0) h += 24; return Math.max(0, h - (breakMins || 0) / 60); }
function dayType(iso) { if (state.bankHols.has(iso)) return 'sun'; const d = new Date(iso + 'T00:00:00').getDay(); return d === 6 ? 'sat' : d === 0 ? 'sun' : 'std'; }
function dowType(dow) { return dow === 6 ? 'sat' : dow === 0 ? 'sun' : 'std'; }
async function log(service_id, action, detail) { await sb.from('msp_activity').insert({ service_id, actor: state.user?.email, action, detail }).then(() => { }); }
function copy(text, msg) { navigator.clipboard?.writeText(text).then(() => toast(msg || 'Copied')); }
function modal(html) { const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="card">${html}</div>`; m.addEventListener('click', e => { if (e.target === m) m.remove(); }); document.body.appendChild(m); return m; }

// ---------- STATE / AUTH ----------
const state = { user: null, services: [], svc: null, roles: [], patterns: [], pool: [], tasks: [], scoping: [], shifts: [], incidents: [], activity: [], checks: [], pubs: [], bankHols: new Set(), weekStart: mondayOf(today()), tsFrom: addDays(mondayOf(today()), -28), tsTo: addDays(mondayOf(today()), 6), tsFilter: 'all' };
function refreshAuth(session) {
  state.user = session?.user || null;
  if (session) { $('login').classList.add('hidden'); $('app').classList.remove('hidden'); $('signout').classList.remove('hidden'); route(); }
  else { $('login').classList.remove('hidden'); $('app').classList.add('hidden'); $('signout').classList.add('hidden'); }
}
sb.auth.onAuthStateChange((_e, session) => refreshAuth(session));
$('loginBtn').onclick = async () => { const e = $('email').value.trim(), p = $('password').value; if (!e || !p) return; $('loginMsg').textContent = 'Signing in…'; const { error } = await sb.auth.signInWithPassword({ email: e, password: p }); $('loginMsg').textContent = error ? error.message : ''; };
$('password').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('loginBtn').click(); });
$('signout').onclick = (e) => { e.preventDefault(); sb.auth.signOut(); };
sb.from('msp_bank_holidays').select('day').then(({ data }) => { state.bankHols = new Set((data || []).map(x => x.day)); });

// ---------- ROUTING ----------
window.addEventListener('hashchange', () => state.user && route());
async function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const m = h.match(/^s\/([0-9a-f-]+)(?:\/(\w+))?/);
  if (m) await renderService(m[1], m[2] || 'overview'); else await renderHome();
}

// ---------- HOME ----------
async function renderHome() {
  $('app').innerHTML = '<p class="muted">Loading…</p>';
  const [{ data: services, error }, { data: openShifts }, { data: tasks }, { count: tsCount }, { data: inv }] = await Promise.all([
    sb.from('msp_services').select('*').order('updated_at', { ascending: false }),
    sb.from('msp_shifts').select('id,service_id,status,shift_date').gte('shift_date', today()).lte('shift_date', addDays(today(), 14)).neq('status', 'cancelled'),
    sb.from('msp_tasks').select('id,service_id,due_date,status').neq('status', 'done').lt('due_date', today()),
    sb.from('msp_shifts').select('id', { count: 'exact', head: true }).eq('ts_status', 'submitted'),
    sb.from('msp_invoices').select('total,status').in('status', ['sent']),
  ]);
  if (error) return $('app').innerHTML = `<div class="err">${esc(error.message)}</div>`;
  state.services = services || [];
  const open = (openShifts || []).filter(s => s.status === 'open').length, tot = (openShifts || []).length;
  const live = state.services.filter(s => ['live', 'mobilising'].includes(s.status)).length;
  const pipeline = state.services.filter(s => ['enquiry', 'scoping', 'proposal', 'awarded'].includes(s.status)).length;
  const overdue = (tasks || []).length, outstanding = (inv || []).reduce((a, x) => a + Number(x.total), 0);
  const byStage = Object.fromEntries(STAGES.map(s => [s, state.services.filter(x => x.status === s).length]));
  $('app').innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="n">${pipeline}</div><div class="l">In pipeline</div></div>
      <div class="kpi good"><div class="n">${live}</div><div class="l">Live / mobilising</div></div>
      <div class="kpi ${open ? 'warn' : 'good'}"><div class="n">${open}<span style="font-size:14px;color:var(--ink-soft)"> / ${tot}</span></div><div class="l">Open shifts next 14 days</div></div>
      <div class="kpi ${tsCount ? 'flag' : ''}"><div class="n">${tsCount || 0}</div><div class="l">Timesheets awaiting approval</div></div>
      <div class="kpi"><div class="n">${gbp(outstanding)}</div><div class="l">Invoices outstanding</div></div>
      <div class="kpi ${overdue ? 'flag' : ''}"><div class="n">${overdue}</div><div class="l">Overdue tasks</div></div>
    </div>
    <div class="pipeline">${STAGES.map(s => `<div class="stage"><div class="h">${s}</div><div class="n">${byStage[s]}</div></div>`).join('')}</div>
    <div class="card">
      <div class="section-title"><h3>Services</h3><span class="sp"></span><button class="btn sm" id="newSvc">+ New service</button></div>
      <table><thead><tr><th>Service</th><th>Client</th><th>Model</th><th>Framework</th><th>Stage</th><th>Start</th><th>Owner</th></tr></thead>
      <tbody>${state.services.map(s => `<tr class="click" data-id="${s.id}"><td><strong>${esc(s.name)}</strong><br><span class="muted">${esc(s.site || '')}</span></td><td>${esc(s.client)}</td><td>${s.model === 'insourcing' ? 'Insourcing' : 'Managed service'}</td><td>${esc(s.framework || '')}</td><td><span class="pill ${STAGE_PILL[s.status]}">${s.status}</span></td><td>${fmtDate(s.start_date)}</td><td>${esc(s.owner_name || '')}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No services yet.</td></tr>'}</tbody></table>
    </div>`;
  $('app').querySelectorAll('tr.click').forEach(tr => tr.onclick = () => location.hash = '#/s/' + tr.dataset.id);
  $('newSvc').onclick = () => editServiceModal(null);
}

// ---------- SERVICE WORKSPACE ----------
async function loadService(id) {
  const [svc, roles, patterns, pool, tasks, scoping, incidents, activity, checks, pubs] = await Promise.all([
    sb.from('msp_services').select('*').eq('id', id).single(),
    sb.from('msp_roles').select('*').eq('service_id', id).order('sort'),
    sb.from('msp_shift_patterns').select('*').eq('service_id', id).order('dow').order('start_time'),
    sb.from('msp_pool').select('*').eq('service_id', id).order('full_name'),
    sb.from('msp_tasks').select('*').eq('service_id', id).order('sort').order('due_date'),
    sb.from('msp_scoping').select('*').eq('service_id', id).order('sort'),
    sb.from('msp_incidents').select('*').eq('service_id', id).order('occurred_on', { ascending: false }),
    sb.from('msp_activity').select('*').eq('service_id', id).order('created_at', { ascending: false }).limit(20),
    sb.from('msp_pool_checks').select('*, msp_pool!inner(service_id)').eq('msp_pool.service_id', id),
    sb.from('msp_rota_publications').select('*').eq('service_id', id),
  ]);
  if (svc.error) throw svc.error;
  Object.assign(state, { svc: svc.data, roles: roles.data || [], patterns: patterns.data || [], pool: pool.data || [], tasks: tasks.data || [], scoping: scoping.data || [], incidents: incidents.data || [], activity: activity.data || [], checks: checks.data || [], pubs: pubs.data || [] });
}
const TAB_FN = {};
async function renderService(id, tab) {
  $('app').innerHTML = '<p class="muted">Loading…</p>';
  try { await loadService(id); } catch (e) { return $('app').innerHTML = `<div class="err">${esc(e.message)}</div><a href="#/">← Back</a>`; }
  const s = state.svc;
  $('app').innerHTML = `
    <p><a href="#/">← All services</a></p>
    <div class="svchead">
      <div><h1>${esc(s.name)}</h1><div class="meta">${esc(s.client)} · ${esc(s.site || '')} · ${esc(s.framework || '')} · ${s.model === 'insourcing' ? 'Insourcing' : 'Managed service'}</div></div>
      <div class="right">
        <select id="stage">${STAGES.map(x => `<option ${x === s.status ? 'selected' : ''}>${x}</option>`).join('')}</select>
        <button class="btn sm secondary" id="editSvc">Edit</button>
      </div>
    </div>
    <div class="subtabs">${TABS.map(([k, l]) => `<a class="subtab ${k === tab ? 'active' : ''}" href="#/s/${s.id}/${k}">${l}</a>`).join('')}</div>
    <div id="tab"></div>`;
  $('stage').onchange = async (e) => { const { error } = await sb.from('msp_services').update({ status: e.target.value }).eq('id', s.id); if (error) return fail(error); log(s.id, 'stage', e.target.value); toast('Stage → ' + e.target.value); };
  $('editSvc').onclick = () => editServiceModal(s);
  (TAB_FN[tab] || TAB_FN.overview)();
}
async function tabReload(tab) { await loadService(state.svc.id); TAB_FN[tab](); }

// ---------- CALCS ----------
function weeklyModel() {
  const p = state.svc.pricing || {};
  const rows = state.roles.map(r => {
    const h = { std: 0, sat: 0, sun: 0 };
    state.patterns.filter(x => x.role_id === r.id).forEach(x => { h[dowType(x.dow)] += hours(x.start_time, x.end_time, x.unpaid_break_mins) * x.headcount; });
    const onc = 1 + (Number(r.oncost_pct) || 0) / 100;
    const cost = (h.std * r.pay_std + h.sat * r.pay_sat + h.sun * r.pay_sun) * onc;
    const rev = h.std * r.charge_std + h.sat * r.charge_sat + h.sun * r.charge_sun;
    const heads = Math.max(0, ...state.patterns.filter(x => x.role_id === r.id).map(x => x.headcount));
    return { r, h, hoursTotal: h.std + h.sat + h.sun, cost, rev, heads };
  });
  const staffCost = rows.reduce((a, x) => a + x.cost, 0), hoursTotal = rows.reduce((a, x) => a + x.hoursTotal, 0);
  const contingency = staffCost * (Number(p.contingency_pct) || 0) / 100;
  const other = Number(p.other_costs_weekly) || 0;
  const mob = (Number(p.mobilisation_oneoff) || 0) / Math.max(1, Number(p.contract_weeks) || 1);
  const totalCost = staffCost + contingency + other + mob;
  let revenue, detail;
  if (state.svc.model === 'insourcing') {
    const appts = Number(p.appts_per_weekend) || 0, dna = (Number(p.dna_pct) || 0) / 100, tariff = Number(p.tariff) || 0, disc = (Number(p.discount_pct) || 0) / 100, tm = (Number(p.target_margin_pct) || 0) / 100;
    const billable = appts * (1 - dna), costPerAppt = billable ? totalCost / billable : 0;
    const priceAtMargin = tm < 1 ? costPerAppt / (1 - tm) : 0, discAtMargin = tariff ? 100 * (1 - priceAtMargin / tariff) : 0;
    const price = tariff * (1 - disc); revenue = billable * price;
    detail = { appts, billable, costPerAppt, priceAtMargin, discAtMargin, price, tariff };
  } else {
    const fee = (Number(p.mgmt_fee_monthly) || 0) * 12 / 52 + (Number(p.mgmt_fee_hourly) || 0) * hoursTotal;
    revenue = rows.reduce((a, x) => a + x.rev, 0) + fee; detail = { fee };
  }
  const margin = revenue - totalCost, marginPct = revenue ? 100 * margin / revenue : 0;
  return { rows, staffCost, hoursTotal, contingency, other, mob, totalCost, revenue, margin, marginPct, detail, p };
}
function shiftHours(x) { return x.hours_worked ?? x.worker_hours ?? hours(x.start_time, x.end_time, x.unpaid_break_mins); }
function rateFor(r, iso, kind) { return Number(r?.[`${kind}_${dayType(iso)}`]) || 0; }
function isLocked(iso) { return state.svc && iso <= addDays(today(), state.svc.rota_lock_days || 14); }
function poolChecks(pid) { return state.checks.filter(c => c.pool_id === pid); }

// ---------- OVERVIEW ----------
TAB_FN.overview = async function () {
  const s = state.svc, m = weeklyModel();
  const { data: shifts } = await sb.from('msp_shifts').select('status,shift_date,ts_status').eq('service_id', s.id).gte('shift_date', addDays(today(), -28)).lte('shift_date', addDays(today(), 14)).neq('status', 'cancelled');
  const up = (shifts || []).filter(x => x.shift_date >= today()), past = (shifts || []).filter(x => x.shift_date < today());
  const fill = (arr) => arr.length ? 100 * arr.filter(x => x.status !== 'open' && x.status !== 'sick').length / arr.length : 0;
  const openTasks = state.tasks.filter(t => t.status !== 'done'), overdue = openTasks.filter(t => t.due_date && t.due_date < today());
  const unanswered = state.scoping.filter(q => q.status === 'open').length, awaiting = (shifts || []).filter(x => x.ts_status === 'submitted').length;
  const cleared = state.pool.filter(x => x.active && x.compliance === 'cleared').length;
  $('tab').innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="n">${gbp(m.revenue)}</div><div class="l">Revenue / week (modelled)</div></div>
      <div class="kpi ${m.marginPct < 15 ? 'warn' : m.marginPct < 20 ? 'flag' : 'good'}"><div class="n">${pct(m.marginPct, 0)}</div><div class="l">Margin ${gbp(m.margin)} / week</div></div>
      <div class="kpi ${up.length && fill(up) < 90 ? 'warn' : ''}"><div class="n">${up.length ? pct(fill(up), 0) : '—'}</div><div class="l">Fill next 14 days (${up.length} shifts)</div></div>
      <div class="kpi"><div class="n">${past.length ? pct(fill(past), 0) : '—'}</div><div class="l">Fill last 4 weeks</div></div>
      <div class="kpi ${cleared < state.pool.filter(x => x.active).length ? 'flag' : 'good'}"><div class="n">${cleared}<span style="font-size:14px;color:var(--ink-soft)"> / ${state.pool.filter(x => x.active).length}</span></div><div class="l">Pool compliance cleared</div></div>
      <div class="kpi ${awaiting ? 'flag' : ''}"><div class="n">${awaiting}</div><div class="l">Timesheets to approve</div></div>
      <div class="kpi ${overdue.length ? 'flag' : ''}"><div class="n">${openTasks.length}</div><div class="l">Open tasks (${overdue.length} overdue)</div></div>
      <div class="kpi ${unanswered ? 'flag' : 'good'}"><div class="n">${unanswered}</div><div class="l">Scoping questions open</div></div>
    </div>
    <div class="two">
      <div class="card"><h3>Summary</h3><p style="font-size:13.5px;line-height:1.5;white-space:pre-wrap">${esc(s.summary || '—')}</p>
        <h4>Contacts</h4><p class="muted">${esc(s.contact_name || '—')}<br>${esc(s.contact_email || '')} ${esc(s.contact_phone || '')}</p>
        <h4>Dates</h4><p class="muted">Start ${fmtDate(s.start_date) || '—'} · End ${fmtDate(s.end_date) || '—'} · DW owner ${esc(s.owner_name || '—')}</p>
        <h4>Client portal</h4><p class="muted">Read-only rota, fill rate, timesheet approval and invoices for the Trust.<br><button class="btn sm secondary" id="copyClient">Copy client link</button></p></div>
      <div class="card"><h3>Staffing model</h3><table><thead><tr><th>Role</th><th class="r">Heads/shift</th><th class="r">Hrs/wk</th><th class="r">Cost/wk</th>${s.model === 'insourcing' ? '' : '<th class="r">Charge/wk</th>'}</tr></thead><tbody>
        ${m.rows.map(x => `<tr><td>${esc(x.r.title)} <span class="muted">${esc(x.r.grade || '')}</span></td><td class="r">${x.heads}</td><td class="r">${num(x.hoursTotal, 0)}</td><td class="r">${gbp(x.cost)}</td>${s.model === 'insourcing' ? '' : `<td class="r">${gbp(x.rev)}</td>`}</tr>`).join('') || '<tr><td colspan="5" class="empty">No roles yet — set them up under Service design.</td></tr>'}
        </tbody></table></div>
    </div>
    <div class="two">
      <div class="card"><h3>Next actions</h3>${openTasks.slice(0, 8).map(t => `<div class="task ${t.status}"><span class="pill ${t.due_date && t.due_date < today() ? 'red' : t.status === 'doing' ? 'flag' : 'mut'}">${t.due_date ? fmtDate(t.due_date) : t.status}</span><span class="t">${esc(t.title)}</span><span class="muted">${esc(t.owner || '')}</span></div>`).join('') || '<p class="empty">Nothing open.</p>'}</div>
      <div class="card"><h3>Activity</h3><div class="feed">${state.activity.map(a => `<div><div class="t">${fmtDT(a.created_at)} · ${esc(a.actor || '')}</div>${esc(a.action)} ${esc(a.detail || '')}</div>`).join('') || '<p class="empty">No activity yet.</p>'}</div></div>
    </div>`;
  $('copyClient').onclick = () => copy(`${BASE}client.html?t=${s.client_token}`, 'Client portal link copied');
};

// ---------- SCOPING ----------
TAB_FN.scoping = function () {
  const sections = [...new Set(state.scoping.map(q => q.section))];
  $('tab').innerHTML = `
    <div class="card"><div class="section-title"><h3>Discovery questions</h3><span class="muted">${state.scoping.filter(q => q.status !== 'open').length} / ${state.scoping.length} answered</span><span class="sp"></span><button class="btn sm secondary" id="addQ">+ Question</button></div>
    ${sections.map(sec => `<h4>${esc(sec)}</h4>` + state.scoping.filter(q => q.section === sec).map(q => `
      <div class="qitem" data-id="${q.id}"><div class="q"><span class="pill ${q.status === 'answered' ? '' : q.status === 'n/a' ? 'mut' : 'flag'}">${q.status}</span> ${esc(q.question)}</div>
        <textarea data-f="answer" placeholder="Answer / what they told us…">${esc(q.answer || '')}</textarea>
        <div class="inline" style="margin-top:6px"><select data-f="status" class="cell" style="width:auto"><option ${q.status === 'open' ? 'selected' : ''}>open</option><option ${q.status === 'answered' ? 'selected' : ''}>answered</option><option ${q.status === 'n/a' ? 'selected' : ''}>n/a</option></select><button class="btn sm" data-act="save">Save</button><button class="btn sm secondary" data-act="del">Remove</button></div></div>`).join('')).join('') || '<p class="empty">No questions yet.</p>'}
    </div>`;
  $('tab').querySelectorAll('.qitem').forEach(el => {
    el.querySelector('[data-act=save]').onclick = async () => {
      const answer = el.querySelector('[data-f=answer]').value.trim(); let status = el.querySelector('[data-f=status]').value; if (answer && status === 'open') status = 'answered';
      const { error } = await sb.from('msp_scoping').update({ answer, status }).eq('id', el.dataset.id); if (error) return fail(error); toast('Saved'); tabReload('scoping');
    };
    el.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Remove this question?')) return; await sb.from('msp_scoping').delete().eq('id', el.dataset.id); tabReload('scoping'); };
  });
  $('addQ').onclick = async () => {
    const section = prompt('Section', sections[0] || 'Service'); if (!section) return;
    const question = prompt('Question'); if (!question) return;
    const { error } = await sb.from('msp_scoping').insert({ service_id: state.svc.id, section, question, sort: state.scoping.length + 1 }); if (error) return fail(error); tabReload('scoping');
  };
};

// ---------- SERVICE DESIGN ----------
TAB_FN.design = function () {
  const s = state.svc, ins = s.model === 'insourcing';
  const roleRow = (r) => `<tr data-id="${r.id}">
    <td class="tight"><input class="cell" data-f="title" value="${esc(r.title)}"></td><td class="tight"><input class="cell" data-f="grade" value="${esc(r.grade || '')}" style="width:90px"></td>
    <td class="tight"><select class="cell" data-f="rate_basis" style="width:auto"><option ${r.rate_basis === 'umbrella' ? 'selected' : ''}>umbrella</option><option ${r.rate_basis === 'paye' ? 'selected' : ''}>paye</option><option ${r.rate_basis === 'ltd' ? 'selected' : ''}>ltd</option></select></td>
    <td class="tight"><input class="cell num" data-f="pay_std" value="${r.pay_std}"></td><td class="tight"><input class="cell num" data-f="pay_sat" value="${r.pay_sat}"></td><td class="tight"><input class="cell num" data-f="pay_sun" value="${r.pay_sun}"></td>
    <td class="tight"><input class="cell num" data-f="oncost_pct" value="${r.oncost_pct}" style="width:64px"></td>
    ${ins ? '' : `<td class="tight"><input class="cell num" data-f="charge_std" value="${r.charge_std}"></td><td class="tight"><input class="cell num" data-f="charge_sat" value="${r.charge_sat}"></td><td class="tight"><input class="cell num" data-f="charge_sun" value="${r.charge_sun}"></td>`}
    <td class="tight"><input class="cell num" data-f="price_cap" value="${r.price_cap ?? ''}" placeholder="cap" style="width:70px">${r.price_cap && Math.max(r.pay_std, r.pay_sat, r.pay_sun) > Number(r.price_cap) ? '<div class="muted" style="color:var(--red);font-size:11px">over cap</div>' : ''}</td>
    <td class="tight"><button class="btn sm" data-act="save">Save</button> <button class="btn sm secondary" data-act="del">✕</button></td></tr>`;
  const patRow = (p) => `<tr data-id="${p.id}">
    <td class="tight"><select class="cell" data-f="role_id">${state.roles.map(x => `<option value="${x.id}" ${x.id === p.role_id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></td>
    <td class="tight"><select class="cell" data-f="dow" style="width:auto">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${d === p.dow ? 'selected' : ''}>${DOW[d]}</option>`).join('')}</select></td>
    <td class="tight"><input class="cell" type="time" data-f="start_time" value="${hhmm(p.start_time)}" style="width:110px"></td><td class="tight"><input class="cell" type="time" data-f="end_time" value="${hhmm(p.end_time)}" style="width:110px"></td>
    <td class="tight"><input class="cell num" data-f="unpaid_break_mins" value="${p.unpaid_break_mins}" style="width:64px"></td><td class="tight"><input class="cell num" data-f="headcount" value="${p.headcount}" style="width:64px"></td>
    <td class="r">${num(hours(p.start_time, p.end_time, p.unpaid_break_mins) * p.headcount)}</td>
    <td class="tight"><button class="btn sm" data-act="save">Save</button> <button class="btn sm secondary" data-act="del">✕</button></td></tr>`;
  $('tab').innerHTML = `
    <div class="card"><div class="section-title"><h3>Roles &amp; rates (£/hr)</h3><span class="muted">Pay = what we pay the worker (umbrella rates are all-in, on-cost 0). ${ins ? 'Insourcing: revenue comes from tariff, not charge rates.' : 'Charge = hourly rate to the client.'} Sun/BH rate applies on bank holidays. Rate changes are audited.</span><span class="sp"></span><button class="btn sm secondary" id="addRole">+ Role</button></div>
      <div style="overflow-x:auto"><table><thead><tr><th>Role</th><th>Grade</th><th>Basis</th><th>Pay M–F</th><th>Pay Sat</th><th>Pay Sun/BH</th><th>On-cost %</th>${ins ? '' : '<th>Charge M–F</th><th>Charge Sat</th><th>Charge Sun/BH</th>'}<th>NHSE cap</th><th></th></tr></thead><tbody id="roles">${state.roles.map(roleRow).join('')}</tbody></table></div></div>
    <div class="card"><div class="section-title"><h3>Shift pattern (weekly)</h3><span class="muted">One row per role per day. Headcount = people on at once. The rota is generated from this.</span><span class="sp"></span><button class="btn sm secondary" id="copyWeek">Copy Mon → all days</button><button class="btn sm secondary" id="addPat">+ Shift</button></div>
      <div style="overflow-x:auto"><table><thead><tr><th>Role</th><th>Day</th><th>Start</th><th>End</th><th>Unpaid break (min)</th><th>Headcount</th><th class="r">Paid hrs</th><th></th></tr></thead><tbody id="pats">${state.patterns.map(patRow).join('') || '<tr><td colspan="8" class="empty">No shifts yet.</td></tr>'}</tbody></table></div>
      <p class="muted" style="margin-top:10px">Weekly paid hours: <strong>${num(weeklyModel().hoursTotal, 0)}</strong></p></div>`;
  const wire = (tbody, table, fields, tab) => tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.querySelector('[data-act=save]').onclick = async () => {
      const upd = {}; fields.forEach(f => { const el = tr.querySelector(`[data-f=${f}]`); let v = el.value; if (el.classList.contains('num') || f === 'dow') v = v === '' ? null : Number(v); upd[f] = v; });
      const { error } = await sb.from(table).update(upd).eq('id', tr.dataset.id); if (error) return fail(error); toast('Saved'); tabReload(tab);
    };
    tr.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Delete?')) return; const { error } = await sb.from(table).delete().eq('id', tr.dataset.id); if (error) return fail(error); tabReload(tab); };
  });
  wire($('roles'), 'msp_roles', ['title', 'grade', 'rate_basis', 'pay_std', 'pay_sat', 'pay_sun', 'oncost_pct', ...(ins ? [] : ['charge_std', 'charge_sat', 'charge_sun']), 'price_cap'], 'design');
  wire($('pats'), 'msp_shift_patterns', ['role_id', 'dow', 'start_time', 'end_time', 'unpaid_break_mins', 'headcount'], 'design');
  $('addRole').onclick = async () => { const title = prompt('Role title (e.g. GP, Band 5 RN, HCA)'); if (!title) return; const { error } = await sb.from('msp_roles').insert({ service_id: s.id, title, sort: state.roles.length + 1 }); if (error) return fail(error); tabReload('design'); };
  $('addPat').onclick = async () => { if (!state.roles.length) return toast('Add a role first', true); const { error } = await sb.from('msp_shift_patterns').insert({ service_id: s.id, role_id: state.roles[0].id, dow: 1, start_time: '08:00', end_time: '20:00', headcount: 1 }); if (error) return fail(error); tabReload('design'); };
  $('copyWeek').onclick = async () => {
    const mon = state.patterns.filter(p => p.dow === 1); if (!mon.length) return toast('No Monday shifts to copy', true);
    if (!confirm('Replace Tue–Sun with a copy of Monday\'s shifts?')) return;
    await sb.from('msp_shift_patterns').delete().eq('service_id', s.id).neq('dow', 1);
    const rows = []; [2, 3, 4, 5, 6, 0].forEach(d => mon.forEach(p => rows.push({ service_id: s.id, role_id: p.role_id, dow: d, start_time: p.start_time, end_time: p.end_time, headcount: p.headcount, unpaid_break_mins: p.unpaid_break_mins })));
    const { error } = await sb.from('msp_shift_patterns').insert(rows); if (error) return fail(error); tabReload('design');
  };
};

// ---------- PRICING ----------
TAB_FN.pricing = function () {
  const s = state.svc, ins = s.model === 'insourcing', m = weeklyModel(), p = m.p;
  const f = (k, label, step = '1', hint = '') => `<div><label>${label}</label><input class="cell" data-k="${k}" type="number" step="${step}" value="${p[k] ?? ''}">${hint ? `<div class="muted" style="font-size:11.5px;margin-top:4px">${hint}</div>` : ''}</div>`;
  const inputs = ins
    ? [f('tariff', 'Tariff £ / assessment', '0.01', 'TFC 190 follow-up — confirm consultant-led vs non-consultant-led'), f('discount_pct', 'Discount % offered', '0.5'), f('appts_per_weekend', 'Appointments / week', '1'), f('dna_pct', 'DNA / unbillable %', '0.5'), f('target_margin_pct', 'Target margin % of revenue', '0.5'), f('contingency_pct', 'Absence contingency % of staff cost', '0.5'), f('other_costs_weekly', 'Other costs £ / week', '1', 'Travel, off-site lead time, indemnity, admin'), f('mobilisation_oneoff', 'Mobilisation one-off £', '1'), f('contract_weeks', 'Contract weeks (amortise over)', '1')]
    : [f('mgmt_fee_monthly', 'Management fee £ / month', '1', 'Rostering, admin, lead clinician sessions, MI'), f('mgmt_fee_hourly', 'Management fee £ / hour (alternative)', '0.5'), f('target_margin_pct', 'Target margin % of revenue', '0.5'), f('contingency_pct', 'Absence contingency % of staff cost', '0.5'), f('other_costs_weekly', 'Other costs £ / week', '1', 'Travel, admin, insurance'), f('mobilisation_oneoff', 'Mobilisation one-off £', '1'), f('contract_weeks', 'Contract weeks (amortise over)', '1')];
  const d = m.detail, weeks = Number(p.contract_weeks) || 0;
  const result = ins ? `
      <div class="calc">
        <div class="box"><div class="k">Billable / week</div><div class="v">${num(d.billable, 0)}</div><div class="s">${d.appts} booked, ${p.dna_pct || 0}% unbillable</div></div>
        <div class="box"><div class="k">Cost / assessment</div><div class="v">${gbp(d.costPerAppt, 2)}</div><div class="s">Total weekly cost ${gbp(m.totalCost)}</div></div>
        <div class="box"><div class="k">Price at ${p.target_margin_pct || 0}% margin</div><div class="v">${gbp(d.priceAtMargin, 2)}</div><div class="s">= ${pct(d.discAtMargin)} discount vs ${gbp(d.tariff)}</div></div>
        <div class="box ${d.price < d.costPerAppt ? 'bad' : ''}"><div class="k">Price at ${p.discount_pct || 0}% discount</div><div class="v">${gbp(d.price, 2)}</div><div class="s">Revenue ${gbp(m.revenue)} / week</div></div>
        <div class="box ${m.marginPct < 15 ? 'bad' : m.marginPct < 20 ? 'warn' : 'good'}"><div class="k">Margin at ${p.discount_pct || 0}%</div><div class="v">${gbp(m.margin)}</div><div class="s">${pct(m.marginPct)} of revenue · ${gbp(m.margin * weeks)} over ${weeks} wks</div></div>
        ${d.priceAtMargin > d.tariff ? '<div class="box bad"><div class="k">Warning</div><div class="v">No discount</div><div class="s">Required price exceeds tariff — model cannot support a positive discount</div></div>' : ''}
      </div>` : `
      <div class="calc">
        <div class="box"><div class="k">Paid hours / week</div><div class="v">${num(m.hoursTotal, 0)}</div><div class="s">${m.rows.map(x => `${esc(x.r.title)} ${num(x.hoursTotal, 0)}`).join(' · ')}</div></div>
        <div class="box"><div class="k">Revenue / week</div><div class="v">${gbp(m.revenue)}</div><div class="s">Hourly charges ${gbp(m.revenue - d.fee)} + fee ${gbp(d.fee)}</div></div>
        <div class="box"><div class="k">Total cost / week</div><div class="v">${gbp(m.totalCost)}</div><div class="s">Staff ${gbp(m.staffCost)} + contingency ${gbp(m.contingency)} + other ${gbp(m.other)} + mobilisation ${gbp(m.mob)}</div></div>
        <div class="box ${m.marginPct < 15 ? 'bad' : m.marginPct < 20 ? 'warn' : 'good'}"><div class="k">Margin / week</div><div class="v">${gbp(m.margin)}</div><div class="s">${pct(m.marginPct)} of revenue · target ${p.target_margin_pct || 0}%</div></div>
        <div class="box"><div class="k">Annualised</div><div class="v">${gbp(m.revenue * 52)}</div><div class="s">Revenue · margin ${gbp(m.margin * 52)} · ${weeks ? `${weeks}-wk contract ${gbp(m.margin * weeks)}` : ''}</div></div>
      </div>`;
  $('tab').innerHTML = `
    <div class="card"><div class="section-title"><h3>Model</h3><span class="muted">Driven by the roles and shift pattern under Service design.</span></div>${result}
      ${p.tariff_note ? `<div class="note" style="margin-top:14px">${esc(p.tariff_note)}</div>` : ''}${p.notes ? `<p class="muted" style="margin-top:10px">${esc(p.notes)}</p>` : ''}</div>
    <div class="card"><div class="section-title"><h3>Inputs</h3><span class="sp"></span><button class="btn sm" id="savePricing">Save &amp; recalculate</button></div>
      <div class="row">${inputs.join('')}</div>
      <label>Notes</label><textarea data-k="notes" style="width:100%;min-height:60px">${esc(p.notes || '')}</textarea>
      ${ins ? `<label>Tariff note</label><input class="cell" data-k="tariff_note" value="${esc(p.tariff_note || '')}">` : ''}</div>
    <div class="card"><h3>Weekly cost by role</h3><table><thead><tr><th>Role</th><th class="r">Std hrs</th><th class="r">Sat hrs</th><th class="r">Sun hrs</th><th class="r">Cost / wk</th>${ins ? '' : '<th class="r">Charge / wk</th><th class="r">GP margin</th>'}</tr></thead><tbody>
      ${m.rows.map(x => `<tr><td>${esc(x.r.title)}</td><td class="r">${num(x.h.std, 0)}</td><td class="r">${num(x.h.sat, 0)}</td><td class="r">${num(x.h.sun, 0)}</td><td class="r">${gbp(x.cost)}</td>${ins ? '' : `<td class="r">${gbp(x.rev)}</td><td class="r">${gbp(x.rev - x.cost)}</td>`}</tr>`).join('')}
      <tr><td><strong>Total</strong></td><td class="r">${num(m.rows.reduce((a, x) => a + x.h.std, 0), 0)}</td><td class="r">${num(m.rows.reduce((a, x) => a + x.h.sat, 0), 0)}</td><td class="r">${num(m.rows.reduce((a, x) => a + x.h.sun, 0), 0)}</td><td class="r"><strong>${gbp(m.staffCost)}</strong></td>${ins ? '' : `<td class="r"><strong>${gbp(m.rows.reduce((a, x) => a + x.rev, 0))}</strong></td><td class="r"><strong>${gbp(m.rows.reduce((a, x) => a + x.rev - x.cost, 0))}</strong></td>`}</tr></tbody></table></div>`;
  $('savePricing').onclick = async () => {
    const np = { ...p }; $('tab').querySelectorAll('[data-k]').forEach(el => { const v = el.value; np[el.dataset.k] = el.type === 'number' ? (v === '' ? null : Number(v)) : v; });
    const { error } = await sb.from('msp_services').update({ pricing: np }).eq('id', s.id); if (error) return fail(error); log(s.id, 'pricing', 'updated'); toast('Saved'); tabReload('pricing');
  };
};

// ---------- MOBILISATION ----------
TAB_FN.mobilisation = function () {
  const s = state.svc;
  $('tab').innerHTML = `<div class="card"><div class="section-title"><h3>Mobilisation plan</h3><span class="muted">${state.tasks.filter(t => t.status === 'done').length} / ${state.tasks.length} done</span><span class="sp"></span><button class="btn sm secondary" id="addTask">+ Task</button></div>
    ${state.tasks.map(t => `<div class="task ${t.status}" data-id="${t.id}"><input type="checkbox" data-f="done" ${t.status === 'done' ? 'checked' : ''}><span class="t"><input class="cell" data-f="title" value="${esc(t.title)}" style="width:100%"></span><input class="cell" data-f="owner" value="${esc(t.owner || '')}" placeholder="Owner" style="width:150px"><input type="date" class="cell" data-f="due_date" value="${t.due_date || ''}" style="width:150px"><select class="cell" data-f="status" style="width:auto"><option ${t.status === 'todo' ? 'selected' : ''}>todo</option><option ${t.status === 'doing' ? 'selected' : ''}>doing</option><option ${t.status === 'blocked' ? 'selected' : ''}>blocked</option><option ${t.status === 'done' ? 'selected' : ''}>done</option></select><button class="btn sm" data-act="save">Save</button><button class="btn sm secondary" data-act="del">✕</button></div>`).join('') || '<p class="empty">No tasks yet.</p>'}</div>`;
  $('tab').querySelectorAll('.task[data-id]').forEach(el => {
    const save = async () => { const status = el.querySelector('[data-f=done]').checked ? 'done' : el.querySelector('[data-f=status]').value === 'done' ? 'todo' : el.querySelector('[data-f=status]').value; const { error } = await sb.from('msp_tasks').update({ title: el.querySelector('[data-f=title]').value, owner: el.querySelector('[data-f=owner]').value, due_date: el.querySelector('[data-f=due_date]').value || null, status }).eq('id', el.dataset.id); if (error) return fail(error); toast('Saved'); tabReload('mobilisation'); };
    el.querySelector('[data-act=save]').onclick = save; el.querySelector('[data-f=done]').onchange = save;
    el.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Delete task?')) return; await sb.from('msp_tasks').delete().eq('id', el.dataset.id); tabReload('mobilisation'); };
  });
  $('addTask').onclick = async () => { const title = prompt('Task'); if (!title) return; const { error } = await sb.from('msp_tasks').insert({ service_id: s.id, title, sort: state.tasks.length + 1 }); if (error) return fail(error); tabReload('mobilisation'); };
};

// ---------- POOL (candidates + compliance) ----------
const STAGES_POOL = ['sourced', 'interviewed', 'offered', 'compliance', 'cleared', 'inducted', 'left'];
TAB_FN.pool = function () {
  const s = state.svc;
  const roleName = (id) => state.roles.find(r => r.id === id)?.title || '—';
  const target = state.roles.map(r => ({ r, need: Math.max(0, ...state.patterns.filter(p => p.role_id === r.id).map(p => p.headcount)), have: state.pool.filter(x => x.active && x.role_id === r.id && !x.reserve).length, cleared: state.pool.filter(x => x.active && x.role_id === r.id && x.compliance === 'cleared').length }));
  const byStage = Object.fromEntries(STAGES_POOL.map(k => [k, state.pool.filter(x => x.active && x.stage === k).length]));
  const expSoon = state.checks.filter(c => c.status === 'cleared' && c.expiry_date && c.expiry_date <= addDays(today(), 60));
  $('tab').innerHTML = `
    <div class="kpis">${target.map(t => `<div class="kpi ${t.cleared >= t.need ? 'good' : t.have >= t.need ? 'flag' : 'warn'}"><div class="n">${t.cleared}<span style="font-size:14px;color:var(--ink-soft)"> / ${t.need} per shift</span></div><div class="l">${esc(t.r.title)} cleared · ${t.have} in pool</div></div>`).join('')}
      <div class="kpi ${expSoon.length ? 'flag' : ''}"><div class="n">${expSoon.length}</div><div class="l">Checks expiring ≤60d</div></div></div>
    <div class="pipeline">${STAGES_POOL.map(k => `<div class="stage"><div class="h">${k}</div><div class="n">${byStage[k]}</div></div>`).join('')}</div>
    <div class="card"><div class="section-title"><h3>Staffing pool</h3><span class="muted">Click a name for compliance checks and the worker link. Assignment is blocked until compliance is cleared.</span><span class="sp"></span><button class="btn sm" id="addPool">+ Add person</button></div>
    <div style="overflow-x:auto"><table><thead><tr><th>Name</th><th>Role</th><th>Stage</th><th>Compliance</th><th>Checks</th><th>Registration</th><th>Contact</th><th>Engagement</th><th>Induction</th><th>Reserve</th><th>Active</th><th></th></tr></thead><tbody>
    ${state.pool.map(x => { const cs = poolChecks(x.id), done = cs.filter(c => c.status === 'cleared' || c.status === 'n/a').length; return `<tr data-id="${x.id}">
      <td><a href="#" data-open="${x.id}"><strong>${esc(x.full_name)}</strong></a>${x.notes ? `<br><span class="muted">${esc(x.notes)}</span>` : ''}</td>
      <td class="tight"><select class="cell" data-f="role_id"><option value="">—</option>${state.roles.map(r => `<option value="${r.id}" ${r.id === x.role_id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></td>
      <td class="tight"><select class="cell" data-f="stage" style="width:auto">${STAGES_POOL.map(k => `<option ${k === x.stage ? 'selected' : ''}>${k}</option>`).join('')}</select></td>
      <td><span class="pill ${COMP_PILL[x.compliance]}">${x.compliance.replace('_', ' ')}</span></td>
      <td>${cs.length ? `${done}/${cs.length}` : '<span class="muted">none</span>'}</td>
      <td class="tight"><input class="cell" data-f="reg_body" value="${esc(x.reg_body || '')}" placeholder="GMC/NMC" style="width:70px"> <input class="cell" data-f="reg_number" value="${esc(x.reg_number || '')}" placeholder="number" style="width:100px"></td>
      <td class="tight"><input class="cell" data-f="email" value="${esc(x.email || '')}" placeholder="email" style="min-width:150px"><input class="cell" data-f="phone" value="${esc(x.phone || '')}" placeholder="phone" style="margin-top:4px"></td>
      <td class="tight"><select class="cell" data-f="employment_type" style="width:auto"><option ${x.employment_type === 'umbrella' ? 'selected' : ''}>umbrella</option><option ${x.employment_type === 'paye' ? 'selected' : ''}>paye</option><option ${x.employment_type === 'ltd' ? 'selected' : ''}>ltd</option></select></td>
      <td class="tight" style="text-align:center"><input type="checkbox" data-f="induction_done" ${x.induction_done ? 'checked' : ''}></td>
      <td class="tight" style="text-align:center"><input type="checkbox" data-f="reserve" ${x.reserve ? 'checked' : ''}></td>
      <td class="tight" style="text-align:center"><input type="checkbox" data-f="active" ${x.active ? 'checked' : ''}></td>
      <td class="tight"><button class="btn sm" data-act="save">Save</button></td></tr>`; }).join('') || '<tr><td colspan="12" class="empty">Nobody in the pool yet.</td></tr>'}
    </tbody></table></div></div>`;
  $('tab').querySelectorAll('tr[data-id]').forEach(tr => {
    tr.querySelector('[data-act=save]').onclick = async () => {
      const upd = {}; tr.querySelectorAll('[data-f]').forEach(el => { upd[el.dataset.f] = el.type === 'checkbox' ? el.checked : (el.value || null); });
      const { error } = await sb.from('msp_pool').update(upd).eq('id', tr.dataset.id); if (error) return fail(error); toast('Saved'); tabReload('pool');
    };
  });
  $('tab').querySelectorAll('[data-open]').forEach(a => a.onclick = (e) => { e.preventDefault(); workerModal(state.pool.find(p => p.id === a.dataset.open)); });
  $('addPool').onclick = async () => {
    const full_name = prompt('Full name'); if (!full_name) return;
    const { data, error } = await sb.from('msp_pool').insert({ service_id: s.id, full_name, role_id: state.roles[0]?.id || null }).select().single(); if (error) return fail(error);
    await sb.rpc('msp_default_checks', { p_pool: data.id }); tabReload('pool');
  };
};
function workerModal(w) {
  const cs = poolChecks(w.id).sort((a, b) => a.check_name.localeCompare(b.check_name));
  const link = `${BASE}worker.html?t=${w.worker_token}`;
  const m = modal(`<h3 style="margin-top:0">${esc(w.full_name)} <span class="pill ${COMP_PILL[w.compliance]}">${w.compliance.replace('_', ' ')}</span></h3>
    <p class="muted">${esc(state.roles.find(r => r.id === w.role_id)?.title || '')} · ${esc(w.email || '')} ${esc(w.phone || '')}</p>
    <div class="inline" style="margin-bottom:12px"><button class="btn sm secondary" id="w_link">Copy worker link</button><button class="btn sm secondary" id="w_mail">Email worker link</button><button class="btn sm secondary" id="w_seed">Add default checks</button><button class="btn sm secondary" id="w_addcheck">+ Check</button><span class="sp"></span><button class="btn sm secondary" id="w_del" style="color:var(--red)">Remove from pool</button></div>
    <table><thead><tr><th>Check</th><th>Status</th><th>Expiry</th><th>Evidence ref</th><th></th></tr></thead><tbody>
    ${cs.map(c => `<tr data-id="${c.id}"><td style="font-size:13px">${esc(c.check_name)}</td>
      <td class="tight"><select class="cell" data-f="status" style="width:auto">${['pending', 'cleared', 'expired', 'failed', 'n/a'].map(v => `<option ${v === c.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td>
      <td class="tight"><input type="date" class="cell" data-f="expiry_date" value="${c.expiry_date || ''}" style="width:140px">${c.expiry_date && c.expiry_date < addDays(today(), 60) ? '<div class="muted" style="color:var(--amber);font-size:11px">expiring</div>' : ''}</td>
      <td class="tight"><input class="cell" data-f="evidence_ref" value="${esc(c.evidence_ref || '')}" placeholder="portal ref / doc" style="width:130px"></td>
      <td class="tight"><button class="btn sm" data-act="save">Save</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No checks yet — add the defaults.</td></tr>'}
    </tbody></table>
    <label>Notes</label><textarea id="w_notes" style="width:100%">${esc(w.notes || '')}</textarea>
    <div class="row"><div><label>Max weekly hours (WTR)</label><input id="w_max" type="number" value="${w.max_weekly_hours}"></div><div><label>Home postcode</label><input id="w_pc" value="${esc(w.home_postcode || '')}"></div><div><label>Compliance Portal candidate id</label><input id="w_cid" value="${esc(w.candidate_id || '')}" placeholder="uuid"></div></div>
    <div class="inline" style="margin-top:14px"><button class="btn" id="w_save">Save</button><button class="btn secondary" id="w_close">Close</button></div>`);
  m.querySelector('#w_close').onclick = () => m.remove();
  m.querySelector('#w_link').onclick = () => copy(link, 'Worker link copied');
  m.querySelector('#w_mail').onclick = () => { location.href = `mailto:${w.email || ''}?subject=${encodeURIComponent('Your Day Webster shifts – ' + state.svc.name)}&body=${encodeURIComponent(`Hi ${w.full_name.split(' ')[0]},\n\nThis is your personal link for ${state.svc.name} at ${state.svc.client}. Use it to see your shifts, confirm them, tell us your availability and submit your hours after each shift:\n\n${link}\n\nPlease don't share it — it's unique to you.\n\nThanks,\nDay Webster`)}`; };
  m.querySelector('#w_seed').onclick = async () => { await sb.rpc('msp_default_checks', { p_pool: w.id }); await loadService(state.svc.id); m.remove(); workerModal(state.pool.find(p => p.id === w.id)); };
  m.querySelector('#w_addcheck').onclick = async () => { const n = prompt('Check name'); if (!n) return; const { error } = await sb.from('msp_pool_checks').insert({ pool_id: w.id, check_name: n }); if (error) return fail(error); await loadService(state.svc.id); m.remove(); workerModal(state.pool.find(p => p.id === w.id)); };
  m.querySelector('#w_del').onclick = async () => { if (!confirm(`Remove ${w.full_name} from the pool?`)) return; await sb.from('msp_pool').delete().eq('id', w.id); m.remove(); tabReload('pool'); };
  m.querySelectorAll('tr[data-id]').forEach(tr => tr.querySelector('[data-act=save]').onclick = async () => {
    const upd = { status: tr.querySelector('[data-f=status]').value, expiry_date: tr.querySelector('[data-f=expiry_date]').value || null, evidence_ref: tr.querySelector('[data-f=evidence_ref]').value || null, updated_at: new Date().toISOString() };
    const { error } = await sb.from('msp_pool_checks').update(upd).eq('id', tr.dataset.id); if (error) return fail(error); toast('Saved'); await loadService(state.svc.id); m.remove(); workerModal(state.pool.find(p => p.id === w.id));
  });
  m.querySelector('#w_save').onclick = async () => {
    const { error } = await sb.from('msp_pool').update({ notes: m.querySelector('#w_notes').value, max_weekly_hours: Number(m.querySelector('#w_max').value) || 48, home_postcode: m.querySelector('#w_pc').value || null, candidate_id: m.querySelector('#w_cid').value || null }).eq('id', w.id);
    if (error) return fail(error); m.remove(); toast('Saved'); tabReload('pool');
  };
}

// ---------- ROTA ----------
TAB_FN.rota = async function () {
  const s = state.svc, ws = state.weekStart, days = [...Array(7)].map((_, i) => addDays(ws, i));
  const { data: shifts, error } = await sb.from('msp_shifts').select('*').eq('service_id', s.id).gte('shift_date', ws).lte('shift_date', days[6]).order('start_time');
  if (error) return fail(error);
  state.shifts = shifts || [];
  const pname = (id) => state.pool.find(p => p.id === id)?.full_name || '';
  const live = state.shifts.filter(x => x.status !== 'cancelled'), open = live.filter(x => x.status === 'open').length, unpub = live.filter(x => !x.published).length;
  const pub = state.pubs.find(p => p.week_start === ws);
  const lockEdge = addDays(today(), s.rota_lock_days || 14);
  const wkHours = (pid) => state.shifts.filter(x => x.pool_id === pid && ['filled', 'confirmed', 'worked'].includes(x.status)).reduce((a, x) => a + shiftHours(x), 0);
  const over = state.pool.filter(p => wkHours(p.id) > Number(p.max_weekly_hours || 48));
  $('tab').innerHTML = `
    <div class="toolbar"><button class="btn sm secondary" id="prevW">‹</button><strong>Week of ${fmtDate(ws)}</strong><button class="btn sm secondary" id="nextW">›</button><button class="btn sm secondary" id="thisW">This week</button>
      <span class="pill ${open ? 'red' : ''}">${live.length - open} / ${live.length} filled</span>
      ${pub ? `<span class="pill">published ${fmtDT(pub.published_at)}</span>` : unpub ? '<span class="pill flag">unpublished</span>' : ''}
      ${ws <= lockEdge ? '<span class="pill mut" title="Inside the rota lock window — changes are logged">🔒 locked window</span>' : ''}
      <span style="flex:1"></span>
      <button class="btn sm secondary" id="publish">Publish week</button><button class="btn sm secondary" id="notify">Worker messages</button>
      <span class="inline">Generate: <input type="date" id="genFrom" value="${ws}" class="cell" style="width:150px"> → <input type="date" id="genTo" value="${addDays(ws, 27)}" class="cell" style="width:150px"><button class="btn sm" id="gen">Generate</button></span></div>
    ${over.length ? `<div class="note">Over weekly hours limit: ${over.map(p => `${esc(p.full_name)} (${num(wkHours(p.id), 0)}h / ${p.max_weekly_hours})`).join(', ')}</div>` : ''}
    <div class="card rota"><table><thead><tr><th>Role</th>${days.map(d => `<th class="day">${fmtDate(d)}${state.bankHols.has(d) ? '<br><span class="pill flag">BH</span>' : ''}</th>`).join('')}</tr></thead><tbody>
      ${state.roles.map(r => `<tr><td><strong>${esc(r.title)}</strong><br><span class="muted">${esc(r.grade || '')}</span></td>${days.map(d => `<td class="tight">${state.shifts.filter(x => x.role_id === r.id && x.shift_date === d).map(x => `<span class="shiftchip ${x.status}" data-id="${x.id}" title="${x.is_cover_for ? 'Cover shift' : ''}">${hhmm(x.start_time)}–${hhmm(x.end_time)}${x.is_cover_for ? ' ⟳' : ''}${!x.published && x.status !== 'cancelled' ? ' •' : ''}<small>${x.pool_id ? esc(pname(x.pool_id)) : x.status === 'open' ? 'OPEN' : x.status}${x.status === 'confirmed' && x.worker_accepted_at ? ' ✓' : ''}</small></span>`).join('')}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="8" class="empty">Set up roles and a shift pattern first.</td></tr>'}
    </tbody></table><p class="muted" style="margin-top:10px">Red = open · amber = filled, awaiting worker confirmation · green = confirmed (✓ by worker) / worked · ⟳ cover shift · • not yet published. Rota lock window: ${s.rota_lock_days} days.</p></div>`;
  $('prevW').onclick = () => { state.weekStart = addDays(ws, -7); TAB_FN.rota(); }; $('nextW').onclick = () => { state.weekStart = addDays(ws, 7); TAB_FN.rota(); }; $('thisW').onclick = () => { state.weekStart = mondayOf(today()); TAB_FN.rota(); };
  $('gen').onclick = async () => { const { data, error } = await sb.rpc('msp_generate_rota', { p_service: s.id, p_from: $('genFrom').value, p_to: $('genTo').value }); if (error) return fail(error); log(s.id, 'rota', `generated ${data} shifts ${$('genFrom').value}→${$('genTo').value}`); toast(`${data} shifts created`); TAB_FN.rota(); };
  $('publish').onclick = async () => { if (open && !confirm(`${open} shifts are still open. Publish anyway? Open shifts become claimable by cleared workers.`)) return; const { data, error } = await sb.rpc('msp_publish_week', { p_service: s.id, p_week: ws }); if (error) return fail(error); toast(`Published ${data} shifts`); tabReload('rota'); };
  $('notify').onclick = () => notifyModal(days);
  $('tab').querySelectorAll('.shiftchip').forEach(ch => ch.onclick = () => shiftModal(state.shifts.find(x => x.id === ch.dataset.id)));
};
function notifyModal(days) {
  const byWorker = {};
  state.shifts.filter(x => x.pool_id && ['filled', 'confirmed'].includes(x.status)).forEach(x => (byWorker[x.pool_id] = byWorker[x.pool_id] || []).push(x));
  const items = Object.entries(byWorker).map(([pid, list]) => { const w = state.pool.find(p => p.id === pid); if (!w) return ''; const link = `${BASE}worker.html?t=${w.worker_token}`;
    const body = `Hi ${w.full_name.split(' ')[0]},\n\nYour ${state.svc.name} shifts for the week of ${fmtDate(days[0])}:\n${list.sort((a, b) => a.shift_date.localeCompare(b.shift_date)).map(x => `• ${fmtDate(x.shift_date)} ${hhmm(x.start_time)}–${hhmm(x.end_time)} (${state.roles.find(r => r.id === x.role_id)?.title || ''})`).join('\n')}\n\nPlease confirm them here (and submit your hours after each shift): ${link}\n\nThanks,\nDay Webster`;
    return `<div class="task"><span class="t"><strong>${esc(w.full_name)}</strong> <span class="muted">${list.length} shifts · ${esc(w.email || 'no email')} ${esc(w.phone || '')}</span></span><a class="btn sm secondary" href="mailto:${esc(w.email || '')}?subject=${encodeURIComponent('Your shifts – week of ' + fmtDate(days[0]))}&body=${encodeURIComponent(body)}">Email</a><button class="btn sm secondary" data-copy="${esc(body)}">Copy text</button></div>`; }).join('');
  const openList = state.shifts.filter(x => x.status === 'open' && x.published);
  const broadcast = openList.length ? `Open shifts at ${state.svc.client} (${state.svc.name}):\n${openList.map(x => `• ${fmtDate(x.shift_date)} ${hhmm(x.start_time)}–${hhmm(x.end_time)} ${state.roles.find(r => r.id === x.role_id)?.title || ''}`).join('\n')}\n\nFirst to accept via your worker link gets it.` : '';
  const m = modal(`<h3 style="margin-top:0">Worker messages — week of ${fmtDate(days[0])}</h3><p class="muted">One message per worker with their shifts and personal link. Send from Outlook or copy into SMS/WhatsApp.</p>${items || '<p class="empty">No assigned shifts this week.</p>'}
    ${broadcast ? `<h4>Broadcast to reserves (${openList.length} open published shifts)</h4><pre style="font-size:12px">${esc(broadcast)}</pre><button class="btn sm secondary" data-copy="${esc(broadcast)}">Copy broadcast</button> <span class="muted">Reserves: ${state.pool.filter(p => p.active && p.reserve).map(p => `${esc(p.full_name)} ${esc(p.phone || p.email || '')}`).join(' · ') || 'none flagged'}</span>` : ''}
    <div class="inline" style="margin-top:14px"><button class="btn secondary" id="n_close">Close</button></div>`);
  m.querySelector('#n_close').onclick = () => m.remove();
  m.querySelectorAll('[data-copy]').forEach(b => b.onclick = () => copy(b.dataset.copy));
}
async function shiftModal(x) {
  const r = state.roles.find(z => z.id === x.role_id);
  const planned = hours(x.start_time, x.end_time, x.unpaid_break_mins), locked = isLocked(x.shift_date);
  const { data: elig } = await sb.rpc('msp_eligible', { p_shift: x.id });
  const E = elig || [];
  const label = (e) => `${e.full_name}${e.compliance !== 'cleared' ? ' ⚠ ' + e.compliance.replace('_', ' ') : ''}${e.availability === 'unavailable' ? ' ✗ unavailable' : e.availability === 'preferred' ? ' ★' : e.availability === 'available' ? ' ✓' : ''}${e.already_on ? ' (already on today)' : ''}${Number(e.week_hours) + planned > Number(e.max_weekly_hours) ? ' ⏱ over hours' : ''}${e.reserve ? ' (reserve)' : ''} · ${num(e.week_hours, 0)}h wk`;
  const m = modal(`<h3 style="margin-top:0">${esc(r?.title || '')} · ${fmtDate(x.shift_date)} ${hhmm(x.start_time)}–${hhmm(x.end_time)} <span class="muted">(${num(planned)}h paid${state.bankHols.has(x.shift_date) ? ' · bank holiday rate' : ''})</span></h3>
    ${locked && x.published ? '<div class="note">Inside the rota lock window and already published — a reason is required and the change is logged.</div>' : ''}
    ${x.is_cover_for ? '<p class="muted">Cover shift for sickness.</p>' : ''}${x.query_note ? `<div class="note">Client query: ${esc(x.query_note)}</div>` : ''}
    <label>Assign (best match first)</label><select id="m_pool"><option value="">— open —</option>${E.map(e => `<option value="${e.pool_id}" ${e.pool_id === x.pool_id ? 'selected' : ''} ${e.compliance !== 'cleared' && e.pool_id !== x.pool_id ? 'data-block="1"' : ''}>${esc(label(e))}</option>`).join('')}</select>
    <label>Status</label><select id="m_status">${['open', 'filled', 'confirmed', 'worked', 'sick', 'cancelled'].map(v => `<option ${v === x.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <div class="row"><div><label>Hours worked</label><input id="m_hours" type="number" step="0.25" value="${x.hours_worked ?? ''}" placeholder="${x.worker_hours ? 'worker says ' + num(x.worker_hours, 2) : num(planned, 2)}"></div><div><label>Timesheet</label><select id="m_ts">${['pending', 'submitted', 'approved', 'queried', 'invoiced'].map(v => `<option ${v === x.ts_status ? 'selected' : ''} ${v === 'invoiced' && x.ts_status !== 'invoiced' ? 'disabled' : ''}>${v}</option>`).join('')}</select></div></div>
    <label>Notes</label><textarea id="m_notes" style="width:100%">${esc(x.notes || '')}</textarea>
    ${x.worker_notes ? `<p class="muted">Worker notes: ${esc(x.worker_notes)}</p>` : ''}
    <p class="muted" style="font-size:12px">${x.worker_accepted_at ? 'Worker confirmed ' + fmtDT(x.worker_accepted_at) + ' · ' : ''}${x.worker_submitted_at ? 'Hours submitted ' + fmtDT(x.worker_submitted_at) + ' · ' : ''}${x.client_approved_at ? 'Client approved ' + fmtDT(x.client_approved_at) + ' (' + esc(x.client_approved_by || '') + ') · ' : ''}${x.dw_approved_at ? 'DW approved ' + fmtDT(x.dw_approved_at) : ''}</p>
    <div class="inline" style="margin-top:14px"><button class="btn" id="m_save">Save</button>${x.pool_id && x.status !== 'sick' ? '<button class="btn secondary" id="m_sick">Mark sick + open cover</button>' : ''}<button class="btn secondary" id="m_dup">Add extra shift</button><button class="btn secondary" id="m_close">Close</button></div>`);
  m.querySelector('#m_close').onclick = () => m.remove();
  m.querySelector('#m_save').onclick = async () => {
    const sel = m.querySelector('#m_pool'); const pool_id = sel.value || null; let status = m.querySelector('#m_status').value;
    if (sel.selectedOptions[0]?.dataset.block && !confirm('This person is NOT compliance-cleared. Assign anyway? (This will be logged.)')) return;
    if (pool_id && status === 'open') status = 'filled'; if (!pool_id && ['filled', 'confirmed', 'worked'].includes(status)) status = 'open';
    let reason = null; if (locked && x.published && (pool_id !== x.pool_id || status !== x.status)) { reason = prompt('Reason for change inside the lock window:'); if (!reason) return; }
    const hw = m.querySelector('#m_hours').value, ts = m.querySelector('#m_ts').value;
    const upd = { pool_id, status, hours_worked: hw === '' ? (status === 'worked' ? (x.worker_hours ?? planned) : null) : Number(hw), ts_status: ts, notes: m.querySelector('#m_notes').value };
    if (ts === 'approved' && x.ts_status !== 'approved') { upd.dw_approved_at = new Date().toISOString(); upd.dw_approved_by = state.user.email; }
    const { error } = await sb.from('msp_shifts').update(upd).eq('id', x.id); if (error) return fail(error);
    const who = state.pool.find(p => p.id === pool_id)?.full_name; log(state.svc.id, 'shift', `${fmtDate(x.shift_date)} ${r?.title} → ${status}${who ? ' ' + who : ''}${reason ? ' [locked window: ' + reason + ']' : ''}${sel.selectedOptions[0]?.dataset.block ? ' [NOT CLEARED]' : ''}`); m.remove(); toast('Saved'); TAB_FN.rota();
  };
  const sick = m.querySelector('#m_sick'); if (sick) sick.onclick = async () => { const { data, error } = await sb.rpc('msp_mark_sick', { p_shift: x.id }); if (error) return fail(error); m.remove(); toast('Marked sick — cover shift opened (published, claimable by reserves)'); await TAB_FN.rota(); const c = state.shifts.find(z => z.id === data); if (c) shiftModal(c); };
  m.querySelector('#m_dup').onclick = async () => { const { error } = await sb.from('msp_shifts').insert({ service_id: x.service_id, role_id: x.role_id, shift_date: x.shift_date, start_time: x.start_time, end_time: x.end_time, unpaid_break_mins: x.unpaid_break_mins, notes: 'Extra shift' }); if (error) return fail(error); m.remove(); toast('Shift added'); TAB_FN.rota(); };
}

// ---------- TIMESHEETS ----------
TAB_FN.timesheets = async function () {
  const s = state.svc, ins = s.model === 'insourcing';
  const { data: shifts, error } = await sb.from('msp_shifts').select('*').eq('service_id', s.id).gte('shift_date', state.tsFrom).lte('shift_date', state.tsTo).in('status', ['confirmed', 'worked', 'sick']).order('shift_date');
  if (error) return fail(error);
  let rows = (shifts || []).filter(x => x.status !== 'sick');
  if (state.tsFilter !== 'all') rows = rows.filter(x => x.ts_status === state.tsFilter);
  const enriched = rows.map(x => { const r = state.roles.find(z => z.id === x.role_id) || {}; const h = shiftHours(x); const planned = hours(x.start_time, x.end_time, x.unpaid_break_mins); return { x, r, h, planned, variance: h - planned, pay: h * rateFor(r, x.shift_date, 'pay') * (1 + (Number(r.oncost_pct) || 0) / 100), charge: ins ? 0 : h * rateFor(r, x.shift_date, 'charge'), who: state.pool.find(p => p.id === x.pool_id)?.full_name || '' }; });
  const tot = (k) => enriched.reduce((a, e) => a + e[k], 0);
  const counts = {}; (shifts || []).filter(x => x.status !== 'sick').forEach(x => counts[x.ts_status] = (counts[x.ts_status] || 0) + 1);
  const TS = ['pending', 'submitted', 'approved', 'queried', 'invoiced'], TSP = { pending: 'mut', submitted: 'flag', approved: '', queried: 'red', invoiced: 'info' };
  $('tab').innerHTML = `
    <div class="toolbar"><label style="margin:0">From</label><input type="date" id="tsFrom" value="${state.tsFrom}" class="cell" style="width:150px"><label style="margin:0">To</label><input type="date" id="tsTo" value="${state.tsTo}" class="cell" style="width:150px"><button class="btn sm secondary" id="tsGo">Apply</button>
      <span class="subtabs" style="margin:0">${['all', ...TS].map(k => `<span class="subtab ${state.tsFilter === k ? 'active' : ''}" data-filter="${k}">${k}${k !== 'all' ? `<span class="n">${counts[k] || 0}</span>` : ''}</span>`).join('')}</span>
      <span style="flex:1"></span><button class="btn sm secondary" id="approveAll">Approve all submitted</button><button class="btn sm secondary" id="payrun">Pay run CSV</button><button class="btn sm" id="exportCsv">Export CSV</button></div>
    <p class="muted" style="margin:-4px 0 12px">Flow: worker submits hours → client authoriser approves (portal) → we approve → invoiced. Variance = submitted vs rostered hours.</p>
    <div class="calc" style="margin-bottom:16px"><div class="box"><div class="k">Shifts</div><div class="v">${enriched.length}</div><div class="s">${(shifts || []).filter(x => x.status === 'sick').length} sick in range</div></div><div class="box"><div class="k">Hours</div><div class="v">${num(tot('h'))}</div><div class="s">variance ${num(tot('variance'))}h vs rota</div></div><div class="box"><div class="k">Worker cost</div><div class="v">${gbp(tot('pay'))}</div></div>${ins ? '' : `<div class="box"><div class="k">Chargeable (hourly)</div><div class="v">${gbp(tot('charge'))}</div><div class="s">+ management fee</div></div><div class="box ${tot('charge') - tot('pay') > 0 ? 'good' : 'bad'}"><div class="k">Gross margin</div><div class="v">${gbp(tot('charge') - tot('pay'))}</div></div>`}</div>
    <div class="card"><div style="overflow-x:auto"><table><thead><tr><th><input type="checkbox" id="selAll"></th><th>Date</th><th>Role</th><th>Worker</th><th>Time</th><th class="r">Rota</th><th class="r">Hours</th><th class="r">Var</th><th class="r">Cost</th>${ins ? '' : '<th class="r">Charge</th>'}<th>Worker</th><th>Client</th><th>Timesheet</th></tr></thead><tbody>
      ${enriched.map(e => `<tr data-id="${e.x.id}"><td><input type="checkbox" class="sel" ${['approved', 'invoiced'].includes(e.x.ts_status) ? 'disabled' : ''}></td><td>${fmtDate(e.x.shift_date)}${state.bankHols.has(e.x.shift_date) ? ' <span class="pill flag">BH</span>' : ''}</td><td>${esc(e.r.title || '')}</td><td>${esc(e.who)}</td><td>${hhmm(e.x.start_time)}–${hhmm(e.x.end_time)}</td><td class="r">${num(e.planned, 2)}</td><td class="r">${num(e.h, 2)}</td><td class="r" style="${Math.abs(e.variance) > 0.01 ? 'color:var(--amber)' : ''}">${e.variance ? num(e.variance, 2) : ''}</td><td class="r">${gbp(e.pay, 2)}</td>${ins ? '' : `<td class="r">${gbp(e.charge, 2)}</td>`}
        <td>${e.x.worker_submitted_at ? '<span class="pill">submitted</span>' : '<span class="pill mut">—</span>'}</td><td>${e.x.client_approved_at ? `<span class="pill" title="${esc(e.x.client_approved_by || '')}">approved</span>` : e.x.ts_status === 'queried' ? `<span class="pill red" title="${esc(e.x.query_note || '')}">queried</span>` : '<span class="pill mut">—</span>'}</td>
        <td class="tight"><span class="pill ${TSP[e.x.ts_status]}">${e.x.ts_status}</span></td></tr>`).join('') || `<tr><td colspan="13" class="empty">No shifts in range${state.tsFilter !== 'all' ? ' with status ' + state.tsFilter : ''}.</td></tr>`}
    </tbody></table></div>
    <div class="inline" style="margin-top:12px"><button class="btn sm" id="bulkApprove">Approve selected</button><button class="btn sm secondary" id="bulkQuery">Query selected</button><button class="btn sm secondary" id="bulkReset">Back to pending</button><span class="muted">Click a row to edit the shift.</span></div></div>`;
  $('tsGo').onclick = () => { state.tsFrom = $('tsFrom').value; state.tsTo = $('tsTo').value; TAB_FN.timesheets(); };
  $('tab').querySelectorAll('[data-filter]').forEach(el => el.onclick = () => { state.tsFilter = el.dataset.filter; TAB_FN.timesheets(); });
  $('selAll').onchange = (e) => $('tab').querySelectorAll('.sel:not(:disabled)').forEach(c => c.checked = e.target.checked);
  $('tab').querySelectorAll('tbody tr[data-id]').forEach(tr => tr.querySelectorAll('td').forEach((td, i) => { if (i > 0) td.onclick = () => shiftModal(enriched.find(e => e.x.id === tr.dataset.id).x); }));
  const selected = () => [...$('tab').querySelectorAll('.sel:checked')].map(c => c.closest('tr').dataset.id);
  const setTs = async (ids, ts_status, extra = {}) => { if (!ids.length) return toast('Nothing selected'); const { error } = await sb.from('msp_shifts').update({ ts_status, ...extra }).in('id', ids); if (error) return fail(error); toast(`${ids.length} → ${ts_status}`); log(s.id, 'timesheets', `${ids.length} → ${ts_status}`); TAB_FN.timesheets(); };
  $('bulkApprove').onclick = () => setTs(selected(), 'approved', { dw_approved_at: new Date().toISOString(), dw_approved_by: state.user.email, status: 'worked' });
  $('approveAll').onclick = () => setTs(enriched.filter(e => e.x.ts_status === 'submitted').map(e => e.x.id), 'approved', { dw_approved_at: new Date().toISOString(), dw_approved_by: state.user.email, status: 'worked' });
  $('bulkQuery').onclick = () => { const q = prompt('Query note (the worker sees this):'); if (q) setTs(selected(), 'queried', { query_note: q }); };
  $('bulkReset').onclick = () => setTs(selected(), 'pending', { query_note: null, client_approved_at: null, dw_approved_at: null });
  $('exportCsv').onclick = () => dl(`${s.name.replace(/[^\w]+/g, '_')}_timesheets_${state.tsFrom}_${state.tsTo}.csv`, [['Service', 'Date', 'Role', 'Worker', 'Start', 'End', 'Rota hrs', 'Hours', 'Status', 'Timesheet', 'Client approved by', 'Worker cost', ins ? '' : 'Charge']].concat(enriched.map(e => [s.name, e.x.shift_date, e.r.title, e.who, hhmm(e.x.start_time), hhmm(e.x.end_time), e.planned.toFixed(2), e.h.toFixed(2), e.x.status, e.x.ts_status, e.x.client_approved_by || '', e.pay.toFixed(2), ins ? '' : e.charge.toFixed(2)])));
  $('payrun').onclick = () => {
    const ok = enriched.filter(e => ['approved', 'invoiced'].includes(e.x.ts_status)); const by = {};
    ok.forEach(e => { const k = e.who || 'Unassigned'; const w = state.pool.find(p => p.id === e.x.pool_id); by[k] = by[k] || { w, hours: 0, pay: 0, shifts: 0 }; by[k].hours += e.h; by[k].pay += e.pay; by[k].shifts++; });
    dl(`${s.name.replace(/[^\w]+/g, '_')}_payrun_${state.tsFrom}_${state.tsTo}.csv`, [['Worker', 'Engagement', 'Email', 'Reg body', 'Reg no', 'Shifts', 'Hours', 'Gross pay / assignment value', 'Period from', 'Period to', 'Service']].concat(Object.entries(by).map(([k, v]) => [k, v.w?.employment_type || '', v.w?.email || '', v.w?.reg_body || '', v.w?.reg_number || '', v.shifts, v.hours.toFixed(2), v.pay.toFixed(2), state.tsFrom, state.tsTo, s.name])));
    toast(`Pay run: ${Object.keys(by).length} workers, approved/invoiced shifts only`);
  };
};
function dl(name, rows) { const csv = rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = name; a.click(); }

// ---------- INVOICES ----------
TAB_FN.invoices = async function () {
  const s = state.svc;
  const [{ data: invs }, { data: ready }] = await Promise.all([
    sb.from('msp_invoices').select('*').eq('service_id', s.id).order('created_at', { ascending: false }),
    sb.from('msp_shifts').select('id,shift_date,role_id,start_time,end_time,unpaid_break_mins,hours_worked,worker_hours').eq('service_id', s.id).eq('status', 'worked').eq('ts_status', 'approved').is('invoice_id', null).order('shift_date'),
  ]);
  const R = ready || [], readyCharge = R.reduce((a, x) => a + shiftHours(x) * rateFor(state.roles.find(r => r.id === x.role_id), x.shift_date, 'charge'), 0);
  const outstanding = (invs || []).filter(i => i.status === 'sent').reduce((a, i) => a + Number(i.total), 0);
  const from = R[0]?.shift_date || mondayOf(today()), to = R[R.length - 1]?.shift_date || addDays(mondayOf(today()), 6);
  const SP = { draft: 'mut', sent: 'flag', paid: '', void: 'red' };
  $('tab').innerHTML = `
    <div class="calc" style="margin-bottom:16px"><div class="box"><div class="k">Approved, not yet invoiced</div><div class="v">${R.length}</div><div class="s">shifts · ${gbp(readyCharge)} chargeable${R.length ? ` · ${fmtDate(from)} – ${fmtDate(to)}` : ''}</div></div><div class="box ${outstanding ? 'warn' : ''}"><div class="k">Outstanding</div><div class="v">${gbp(outstanding)}</div><div class="s">${(invs || []).filter(i => i.status === 'sent' && i.due_date < today()).length} overdue</div></div><div class="box"><div class="k">Invoiced to date</div><div class="v">${gbp((invs || []).filter(i => i.status !== 'void').reduce((a, i) => a + Number(i.total), 0))}</div></div></div>
    <div class="card"><div class="section-title"><h3>Build consolidated invoice</h3><span class="muted">One invoice per period: all approved shifts at the contracted charge rates${s.fee_period !== 'none' ? ` + ${s.fee_period} management fee` : ''} + any extras. Shifts are locked to the invoice once built. Billing settings are under Settings.</span></div>
      <div class="row"><div><label>Period from</label><input type="date" id="i_from" value="${from}"></div><div><label>Period to</label><input type="date" id="i_to" value="${to}"></div><div><label>Include management fee</label><select id="i_fee"><option value="1" ${s.fee_period !== 'none' ? '' : 'disabled'}>Yes</option><option value="0" ${s.fee_period === 'none' ? 'selected' : ''}>No</option></select></div></div>
      <label>Extras (one per line: description | qty | unit | rate) — e.g. <code>Cancellation &lt;48h · Sat 6 Dec | 1 | each | 380</code></label><textarea id="i_extras" style="width:100%;min-height:50px" placeholder="Mileage | 120 | miles | 0.45"></textarea>
      <div class="inline" style="margin-top:12px"><button class="btn" id="build">Build draft invoice</button>${!s.po_ref ? '<span class="muted">No PO reference set — add one under Settings before sending.</span>' : ''}</div></div>
    <div class="card"><h3>Invoices &amp; credit notes</h3><table><thead><tr><th>Number</th><th>Period</th><th>PO</th><th class="r">Net</th><th class="r">VAT</th><th class="r">Total</th><th>Status</th><th>Due</th><th></th></tr></thead><tbody>
      ${(invs || []).map(i => `<tr data-id="${i.id}"><td><strong>${esc(i.number)}</strong>${i.kind === 'credit_note' ? ' <span class="pill red">credit</span>' : ''}</td><td>${fmtDate(i.period_from)} – ${fmtDate(i.period_to)}</td><td>${esc(i.po_ref || '')}</td><td class="r">${gbp(i.subtotal, 2)}</td><td class="r">${gbp(i.vat, 2)}</td><td class="r"><strong>${gbp(i.total, 2)}</strong></td><td><span class="pill ${SP[i.status]}">${i.status}</span>${i.status === 'sent' && i.due_date < today() ? ' <span class="pill red">overdue</span>' : ''}</td><td>${fmtDate(i.due_date)}</td>
        <td class="tight"><a class="btn sm secondary" href="invoice.html?id=${i.id}" target="_blank">View / PDF</a> ${i.status === 'draft' ? `<button class="btn sm" data-act="send">Mark sent</button> <button class="btn sm secondary" data-act="void">Void</button>` : ''}${i.status === 'sent' ? `<button class="btn sm" data-act="paid">Mark paid</button> <button class="btn sm secondary" data-act="credit">Credit note</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="9" class="empty">No invoices yet.</td></tr>'}
    </tbody></table></div>`;
  $('build').onclick = async () => {
    const extras = $('i_extras').value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [description, qty, unit, rate] = l.split('|').map(x => x.trim()); return { description, qty: Number(qty) || 1, unit: unit || 'each', rate: Number(rate) || 0 }; });
    const { data, error } = await sb.rpc('msp_build_invoice', { p_service: s.id, p_from: $('i_from').value, p_to: $('i_to').value, p_include_fee: $('i_fee').value === '1', p_extras: extras }); if (error) return fail(error);
    toast('Draft invoice built'); window.open(`invoice.html?id=${data}`, '_blank'); TAB_FN.invoices();
  };
  $('tab').querySelectorAll('tr[data-id]').forEach(tr => {
    const id = tr.dataset.id;
    tr.querySelector('[data-act=send]')?.addEventListener('click', async () => { const { error } = await sb.from('msp_invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id); if (error) return fail(error); log(s.id, 'invoice', 'sent ' + id); TAB_FN.invoices(); });
    tr.querySelector('[data-act=paid]')?.addEventListener('click', async () => { const { error } = await sb.from('msp_invoices').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id); if (error) return fail(error); TAB_FN.invoices(); });
    tr.querySelector('[data-act=void]')?.addEventListener('click', async () => { if (!confirm('Void this draft? Shifts go back to approved.')) return; const { error } = await sb.rpc('msp_void_invoice', { p_invoice: id }); if (error) return fail(error); TAB_FN.invoices(); });
    tr.querySelector('[data-act=credit]')?.addEventListener('click', async () => { const amt = Number(prompt('Credit amount (net £):')); if (!amt) return; const reason = prompt('Reason:'); if (!reason) return; const { error } = await sb.rpc('msp_credit_invoice', { p_invoice: id, p_amount: amt, p_reason: reason }); if (error) return fail(error); toast('Credit note raised'); TAB_FN.invoices(); });
  });
};

// ---------- REPORTS (actuals vs plan) ----------
TAB_FN.reports = async function () {
  const s = state.svc, m = weeklyModel(), from = addDays(mondayOf(today()), -56), to = addDays(mondayOf(today()), 13);
  const [{ data: act, error }, { data: hist }] = await Promise.all([sb.rpc('msp_weekly_actuals', { p_service: s.id, p_from: from, p_to: to }), sb.from('msp_rate_history').select('*, msp_roles!inner(title, service_id)').eq('msp_roles.service_id', s.id).order('changed_at', { ascending: false }).limit(20)]);
  if (error) return fail(error);
  const feeWk = (Number(s.pricing?.mgmt_fee_monthly) || 0) * 12 / 52;
  const rows = (act || []).map(a => { const rev = s.model === 'insourcing' ? null : Number(a.charge) + (a.week_start < mondayOf(today()) ? feeWk : 0); const cost = Number(a.cost); return { ...a, rev, cost, margin: rev == null ? null : rev - cost, fill: a.shifts ? 100 * a.filled / a.shifts : 0 }; });
  const past = rows.filter(r => r.week_start < mondayOf(today()));
  const sum = (k) => past.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  $('tab').innerHTML = `
    <div class="calc" style="margin-bottom:16px">
      <div class="box"><div class="k">Plan / week</div><div class="v">${gbp(m.revenue)}</div><div class="s">revenue · cost ${gbp(m.totalCost)} · margin ${gbp(m.margin)} (${pct(m.marginPct, 0)})</div></div>
      <div class="box"><div class="k">Actual avg / week (last ${past.length})</div><div class="v">${past.length ? gbp(sum('rev') / past.length) : '—'}</div><div class="s">${past.length ? `cost ${gbp(sum('cost') / past.length)} · margin ${gbp((sum('rev') - sum('cost')) / past.length)}` : 'no worked weeks yet'}</div></div>
      <div class="box ${past.length && sum('shifts') && 100 * sum('filled') / sum('shifts') < 90 ? 'warn' : 'good'}"><div class="k">Fill rate</div><div class="v">${sum('shifts') ? pct(100 * sum('filled') / sum('shifts'), 0) : '—'}</div><div class="s">${sum('sick')} sick · ${num(sum('hours'), 0)} hours worked</div></div>
      <div class="box"><div class="k">Hours vs plan</div><div class="v">${past.length ? pct(100 * (sum('hours') / past.length) / Math.max(1, m.hoursTotal), 0) : '—'}</div><div class="s">plan ${num(m.hoursTotal, 0)}h / week</div></div>
    </div>
    <div class="card"><div class="section-title"><h3>Weekly actuals vs plan</h3><span class="muted">Worked shifts at contracted rates; fee added to past weeks for managed services.</span><span class="sp"></span><button class="btn sm secondary" id="repCsv">CSV</button></div>
      <table><thead><tr><th>Week</th><th class="r">Shifts</th><th class="r">Filled</th><th class="r">Fill %</th><th class="r">Sick</th><th class="r">Hours</th><th class="r">Plan hrs</th><th class="r">Cost</th>${s.model === 'insourcing' ? '' : '<th class="r">Revenue</th><th class="r">Margin</th><th class="r">Plan margin</th>'}</tr></thead><tbody>
      ${rows.map(r => `<tr><td>${fmtDate(r.week_start)}${r.week_start >= mondayOf(today()) ? ' <span class="pill mut">current/future</span>' : ''}</td><td class="r">${r.shifts}</td><td class="r">${r.filled}</td><td class="r" style="${r.fill < 90 ? 'color:var(--red)' : ''}">${pct(r.fill, 0)}</td><td class="r">${r.sick}</td><td class="r">${num(r.hours, 0)}</td><td class="r muted">${num(m.hoursTotal, 0)}</td><td class="r">${gbp(r.cost)}</td>${s.model === 'insourcing' ? '' : `<td class="r">${gbp(r.rev)}</td><td class="r" style="${r.margin < 0 ? 'color:var(--red)' : ''}">${gbp(r.margin)}</td><td class="r muted">${gbp(m.margin)}</td>`}</tr>`).join('') || '<tr><td colspan="11" class="empty">No shifts in the last 8 weeks.</td></tr>'}
      </tbody></table></div>
    <div class="card"><h3>Rate change history</h3><table><thead><tr><th>When</th><th>Role</th><th>By</th><th>Change</th></tr></thead><tbody>${(hist || []).map(h => `<tr><td>${fmtDT(h.changed_at)}</td><td>${esc(h.msp_roles?.title)}</td><td>${esc(h.changed_by || '')}</td><td style="font-size:12px">${Object.keys(h.new_rates || {}).filter(k => String(h.old_rates?.[k]) !== String(h.new_rates?.[k])).map(k => `${k}: ${h.old_rates?.[k] ?? '—'} → <strong>${h.new_rates?.[k] ?? '—'}</strong>`).join(' · ')}</td></tr>`).join('') || '<tr><td colspan="4" class="empty">No rate changes recorded.</td></tr>'}</tbody></table></div>`;
  $('repCsv').onclick = () => dl(`${s.name.replace(/[^\w]+/g, '_')}_weekly_actuals.csv`, [['Week', 'Shifts', 'Filled', 'Fill %', 'Sick', 'Hours', 'Plan hours', 'Cost', 'Revenue', 'Margin', 'Plan margin']].concat(rows.map(r => [r.week_start, r.shifts, r.filled, r.fill.toFixed(0), r.sick, Number(r.hours).toFixed(2), m.hoursTotal.toFixed(1), r.cost.toFixed(2), r.rev?.toFixed(2) ?? '', r.margin?.toFixed(2) ?? '', m.margin.toFixed(2)])));
};

// ---------- INCIDENTS ----------
TAB_FN.incidents = function () {
  const s = state.svc;
  $('tab').innerHTML = `<div class="card"><div class="section-title"><h3>Incidents, complaints &amp; escalations</h3><span class="muted">${state.incidents.filter(i => i.status !== 'closed').length} open</span><span class="sp"></span><button class="btn sm" id="addInc">+ Log</button></div>
    <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reported by</th><th>Status</th></tr></thead><tbody>${state.incidents.map(i => `<tr data-id="${i.id}"><td>${fmtDate(i.occurred_on)}</td><td><span class="pill ${i.kind === 'safeguarding' ? 'red' : i.kind === 'absence' ? 'mut' : 'flag'}">${i.kind}</span></td><td style="white-space:pre-wrap">${esc(i.description)}</td><td>${esc(i.reported_by || '')}</td><td class="tight"><select class="cell" data-st style="width:auto">${['open', 'investigating', 'closed'].map(v => `<option ${v === i.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nothing logged.</td></tr>'}</tbody></table></div>`;
  $('tab').querySelectorAll('[data-st]').forEach(sel => sel.onchange = async () => { const { error } = await sb.from('msp_incidents').update({ status: sel.value }).eq('id', sel.closest('tr').dataset.id); if (error) return fail(error); toast('Updated'); });
  $('addInc').onclick = () => {
    const m = modal(`<h3 style="margin-top:0">Log an incident</h3><div class="row"><div><label>Date</label><input type="date" id="i_date" value="${today()}"></div><div><label>Type</label><select id="i_kind">${['incident', 'complaint', 'safeguarding', 'absence', 'escalation', 'other'].map(v => `<option>${v}</option>`).join('')}</select></div></div><label>Description</label><textarea id="i_desc" style="width:100%;min-height:90px"></textarea><label>Reported by</label><input id="i_by" value="${esc(state.user?.email || '')}"><div class="inline" style="margin-top:14px"><button class="btn" id="i_save">Save</button><button class="btn secondary" id="i_close">Cancel</button></div>`);
    m.querySelector('#i_close').onclick = () => m.remove();
    m.querySelector('#i_save').onclick = async () => { const description = m.querySelector('#i_desc').value.trim(); if (!description) return; const { error } = await sb.from('msp_incidents').insert({ service_id: s.id, occurred_on: m.querySelector('#i_date').value, kind: m.querySelector('#i_kind').value, description, reported_by: m.querySelector('#i_by').value }); if (error) return fail(error); log(s.id, 'incident', m.querySelector('#i_kind').value); m.remove(); tabReload('incidents'); };
  };
};

// ---------- DOCUMENTS ----------
TAB_FN.documents = async function () {
  const s = state.svc, KINDS = ['contract', 'call_off', 'sds_ir35', 'indemnity', 'rate_card', 'induction', 'timesheet', 'invoice', 'compliance', 'other'];
  const { data: docs } = await sb.from('msp_documents').select('*').eq('service_id', s.id).order('created_at', { ascending: false });
  $('tab').innerHTML = `<div class="card"><div class="section-title"><h3>Documents</h3><span class="muted">Call-off, SDS / IR35 determinations, indemnity, rate card, induction records, signed timesheets. Private bucket, staff only.</span></div>
    <div class="row"><div><label>Type</label><select id="d_kind">${KINDS.map(k => `<option>${k}</option>`).join('')}</select></div><div><label>Worker (optional, for compliance evidence)</label><select id="d_pool"><option value="">—</option>${state.pool.map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')}</select></div><div><label>File</label><input type="file" id="d_file"></div></div>
    <div class="inline" style="margin-top:12px"><button class="btn sm" id="d_up">Upload</button></div></div>
    <div class="card"><table><thead><tr><th>Name</th><th>Type</th><th>Worker</th><th>Uploaded</th><th></th></tr></thead><tbody>${(docs || []).map(d => `<tr data-id="${d.id}" data-path="${esc(d.storage_path)}"><td>${esc(d.name)}</td><td><span class="pill info">${d.kind}</span></td><td>${esc(state.pool.find(p => p.id === d.pool_id)?.full_name || '')}</td><td>${fmtDT(d.created_at)} · ${esc(d.uploaded_by || '')}</td><td class="tight"><button class="btn sm secondary" data-act="open">Open</button> <button class="btn sm secondary" data-act="del">✕</button></td></tr>`).join('') || '<tr><td colspan="5" class="empty">No documents yet.</td></tr>'}</tbody></table></div>`;
  $('d_up').onclick = async () => {
    const f = $('d_file').files[0]; if (!f) return toast('Choose a file', true);
    const path = `${s.id}/${Date.now()}_${f.name.replace(/[^\w.\-]+/g, '_')}`;
    const { error } = await sb.storage.from('msp-docs').upload(path, f); if (error) return fail(error);
    const { error: e2 } = await sb.from('msp_documents').insert({ service_id: s.id, pool_id: $('d_pool').value || null, name: f.name, kind: $('d_kind').value, storage_path: path, uploaded_by: state.user.email }); if (e2) return fail(e2);
    toast('Uploaded'); TAB_FN.documents();
  };
  $('tab').querySelectorAll('tr[data-id]').forEach(tr => {
    tr.querySelector('[data-act=open]').onclick = async () => { const { data, error } = await sb.storage.from('msp-docs').createSignedUrl(tr.dataset.path, 300); if (error) return fail(error); window.open(data.signedUrl, '_blank'); };
    tr.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Delete document?')) return; await sb.storage.from('msp-docs').remove([tr.dataset.path]); await sb.from('msp_documents').delete().eq('id', tr.dataset.id); TAB_FN.documents(); };
  });
};

// ---------- SETTINGS (billing, lock, tokens) ----------
TAB_FN.settings = function () {
  const s = state.svc;
  $('tab').innerHTML = `<div class="card"><div class="section-title"><h3>Billing &amp; contract settings</h3><span class="sp"></span><button class="btn sm" id="st_save">Save</button></div>
    <div class="row"><div><label>Invoice prefix</label><input id="st_prefix" value="${esc(s.invoice_prefix || '')}" placeholder="DW"></div><div><label>PO reference</label><input id="st_po" value="${esc(s.po_ref || '')}"></div><div><label>Payment terms (days)</label><input id="st_terms" type="number" value="${s.invoice_terms_days}"></div><div><label>VAT %</label><input id="st_vat" type="number" step="0.5" value="${s.vat_rate}"></div></div>
    <div class="row"><div><label>Management fee billed</label><select id="st_fee"><option value="monthly" ${s.fee_period === 'monthly' ? 'selected' : ''}>Monthly (full fee per invoice)</option><option value="weekly" ${s.fee_period === 'weekly' ? 'selected' : ''}>Weekly (fee ÷ 52×12 per invoice)</option><option value="none" ${s.fee_period === 'none' ? 'selected' : ''}>Not billed</option></select></div><div><label>Rota lock window (days)</label><input id="st_lock" type="number" value="${s.rota_lock_days}"></div></div>
    <label>Billing contact</label><input id="st_bc" value="${esc(s.billing_contact || '')}" placeholder="Accounts payable name / email">
    <label>Billing address</label><textarea id="st_ba" style="width:100%">${esc(s.billing_address || '')}</textarea></div>
    <div class="card"><h3>Links</h3><p class="muted">Client portal (Trust authoriser): read-only rota, fill rate, approve timesheets, see invoices.</p><div class="inline"><input class="cell" readonly value="${BASE}client.html?t=${s.client_token}" style="min-width:420px"><button class="btn sm secondary" id="st_copy">Copy</button><button class="btn sm secondary" id="st_rotate" style="color:var(--red)">Rotate token</button></div></div>`;
  $('st_save').onclick = async () => { const { error } = await sb.from('msp_services').update({ invoice_prefix: $('st_prefix').value || null, po_ref: $('st_po').value || null, invoice_terms_days: Number($('st_terms').value) || 30, vat_rate: Number($('st_vat').value) || 0, fee_period: $('st_fee').value, rota_lock_days: Number($('st_lock').value) || 14, billing_contact: $('st_bc').value || null, billing_address: $('st_ba').value || null }).eq('id', s.id); if (error) return fail(error); toast('Saved'); tabReload('settings'); };
  $('st_copy').onclick = () => copy(`${BASE}client.html?t=${s.client_token}`, 'Client link copied');
  $('st_rotate').onclick = async () => { if (!confirm('Rotate the client token? The old link stops working.')) return; const { error } = await sb.from('msp_services').update({ client_token: crypto.randomUUID() }).eq('id', s.id); if (error) return fail(error); tabReload('settings'); };
};

// ---------- SERVICE CREATE / EDIT ----------
function editServiceModal(s) {
  const v = (k) => esc(s?.[k] || '');
  const m = modal(`<h3 style="margin-top:0">${s ? 'Edit service' : 'New service'}</h3>
    <label>Service name</label><input id="f_name" value="${v('name')}" placeholder="e.g. Salisbury UTC — GP managed service">
    <div class="row"><div><label>Client</label><input id="f_client" value="${v('client')}"></div><div><label>Site</label><input id="f_site" value="${v('site')}"></div></div>
    <div class="row"><div><label>Framework / route</label><input id="f_framework" value="${v('framework')}" placeholder="RM6281 Lot 2 / RM6276"></div><div><label>Model</label><select id="f_model"><option value="managed_service" ${s?.model !== 'insourcing' ? 'selected' : ''}>Managed service (hourly + fee)</option><option value="insourcing" ${s?.model === 'insourcing' ? 'selected' : ''}>Insourcing (tariff discount)</option></select></div></div>
    <div class="row"><div><label>Start</label><input id="f_start" type="date" value="${v('start_date')}"></div><div><label>End</label><input id="f_end" type="date" value="${v('end_date')}"></div><div><label>DW owner</label><input id="f_owner" value="${v('owner_name')}"></div></div>
    <label>Client contact(s)</label><input id="f_cname" value="${v('contact_name')}"><div class="row"><div><label>Email</label><input id="f_cemail" value="${v('contact_email')}"></div><div><label>Phone</label><input id="f_cphone" value="${v('contact_phone')}"></div></div>
    <label>Summary</label><textarea id="f_summary" style="width:100%;min-height:90px">${v('summary')}</textarea>
    <div class="inline" style="margin-top:14px"><button class="btn" id="f_save">Save</button><button class="btn secondary" id="f_close">Cancel</button>${s ? '<span style="flex:1"></span><button class="btn secondary" id="f_del">Delete service</button>' : ''}</div>`);
  m.querySelector('#f_close').onclick = () => m.remove();
  m.querySelector('#f_save').onclick = async () => {
    const g = (id) => m.querySelector('#' + id).value.trim() || null;
    const row = { name: g('f_name'), client: g('f_client'), site: g('f_site'), framework: g('f_framework'), model: g('f_model'), start_date: g('f_start'), end_date: g('f_end'), owner_name: g('f_owner'), contact_name: g('f_cname'), contact_email: g('f_cemail'), contact_phone: g('f_cphone'), summary: g('f_summary') };
    if (!row.name || !row.client) return toast('Name and client are required', true);
    if (s) { const { error } = await sb.from('msp_services').update(row).eq('id', s.id); if (error) return fail(error); m.remove(); toast('Saved'); route(); }
    else { const { data, error } = await sb.from('msp_services').insert({ ...row, pricing: row.model === 'insourcing' ? { tariff: 0, discount_pct: 0, appts_per_weekend: 0, dna_pct: 10, target_margin_pct: 20, contingency_pct: 7.5, other_costs_weekly: 0, mobilisation_oneoff: 0, contract_weeks: 20 } : { mgmt_fee_monthly: 0, mgmt_fee_hourly: 0, target_margin_pct: 20, contingency_pct: 5, other_costs_weekly: 0, mobilisation_oneoff: 0, contract_weeks: 26 } }).select().single(); if (error) return fail(error); await seedDefaults(data.id); m.remove(); location.hash = '#/s/' + data.id + '/scoping'; }
  };
  if (s) m.querySelector('#f_del').onclick = async () => { if (!confirm(`Delete "${s.name}" and everything under it? This cannot be undone.`)) return; const { error } = await sb.from('msp_services').delete().eq('id', s.id); if (error) return fail(error); m.remove(); location.hash = '#/'; };
}
async function seedDefaults(service_id) {
  const qs = [['Service', 'Opening hours and days (weekdays, weekends, bank holidays)'], ['Service', 'Site(s) covered'], ['Service', 'Expected activity per day and the clinical model'], ['Service', 'Minimum staffing per shift and who is the senior clinician in charge'], ['Service', 'Existing substantive / bank staff, or are we the whole workforce?'], ['Rostering & admin', 'Who owns the rota template and shift pattern?'], ['Rostering & admin', 'Rostering system — theirs or ours?'], ['Rostering & admin', 'Short-notice gap expectations and escalation route'], ['Rostering & admin', 'Timesheet authorisation on site'], ['Rostering & admin', 'MI / reporting required and frequency'], ['Clinical governance', 'Who is the clinical lead — Trust or us?'], ['Clinical governance', 'Governance, policies, incident reporting and indemnity — confirm where they sit'], ['Clinical governance', 'Induction and system training — who delivers, duration, paid?'], ['Commercial', 'IR35 status determinations'], ['Commercial', 'Budget envelope / hours modelled'], ['Commercial', 'Contract term, extension option, route to longer-term award'], ['Commercial', 'Payment terms, PO reference and invoicing'], ['Commercial', 'Decision timeline'], ['Mobilisation', 'Go/no-go date needed to recruit in time'], ['Mobilisation', 'Named Trust contacts: operational, clinical, finance'], ['Mobilisation', 'System access / smartcards lead time']];
  const tasks = ['Discovery call with client', 'Confirm framework route and IR35', 'Indicative cost and mobilisation plan to client', 'Go/no-go from client', 'Pool recruited and compliance cleared', 'Client induction and system access complete', 'Rota published 2 weeks ahead', 'Go live'];
  await sb.from('msp_scoping').insert(qs.map(([section, question], i) => ({ service_id, section, question, sort: i + 1 })));
  await sb.from('msp_tasks').insert(tasks.map((title, i) => ({ service_id, title, sort: i + 1 })));
}
