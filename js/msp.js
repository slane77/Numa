// ============================================================================
//  Day Webster — Managed Services (MSP)
//  One-page app, hash routed:  #/            services pipeline
//                              #/s/<id>/<tab> service workspace
//  Backed by the msp_* tables (see supabase/msp_schema.sql).
// ============================================================================
const sb = window.supabase.createClient(window.CONFIG.MSP_SUPABASE_URL, window.CONFIG.MSP_SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);
const esc = (s) => (s ?? '').toString().replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const gbp = (n, d = 0) => '£' + (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = (n, d = 1) => (Number(n) || 0).toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const pct = (n, d = 1) => num(n, d) + '%';
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso, n) => { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const mondayOf = (iso) => { const d = new Date(iso + 'T00:00:00'); const k = (d.getDay() + 6) % 7; d.setDate(d.getDate() - k); return d.toISOString().slice(0, 10); };
const fmtDate = (iso) => iso ? new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
const hhmm = (t) => (t || '').slice(0, 5);
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STAGES = ['enquiry', 'scoping', 'proposal', 'awarded', 'mobilising', 'live', 'closed', 'lost'];
const STAGE_PILL = { enquiry: 'mut', scoping: 'info', proposal: 'info', awarded: '', mobilising: 'flag', live: '', closed: 'mut', lost: 'red' };
const TABS = [['overview', 'Overview'], ['scoping', 'Scoping'], ['design', 'Service design'], ['pricing', 'Pricing'], ['mobilisation', 'Mobilisation'], ['pool', 'Pool'], ['rota', 'Rota'], ['timesheets', 'Timesheets'], ['incidents', 'Incidents']];

function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('toasts').appendChild(t); setTimeout(() => t.remove(), err ? 6000 : 2800); }
function fail(error) { console.error(error); toast(error.message || String(error), true); }
function hours(start, end, breakMins = 0) { const [sh, sm] = start.split(':').map(Number), [eh, em] = end.split(':').map(Number); let h = (eh + em / 60) - (sh + sm / 60); if (h <= 0) h += 24; return Math.max(0, h - (breakMins || 0) / 60); }
function dayType(dow) { return dow === 6 ? 'sat' : dow === 0 ? 'sun' : 'std'; }
async function log(service_id, action, detail) { await sb.from('msp_activity').insert({ service_id, actor: state.user?.email, action, detail }).then(() => { }); }

// ---------- AUTH ----------
const state = { user: null, services: [], svc: null, roles: [], patterns: [], pool: [], tasks: [], scoping: [], shifts: [], incidents: [], activity: [], weekStart: mondayOf(today()), tsFrom: addDays(mondayOf(today()), -28), tsTo: addDays(mondayOf(today()), 6) };
function refreshAuth(session) {
  state.user = session?.user || null;
  if (session) { $('login').classList.add('hidden'); $('app').classList.remove('hidden'); $('signout').classList.remove('hidden'); route(); }
  else { $('login').classList.remove('hidden'); $('app').classList.add('hidden'); $('signout').classList.add('hidden'); }
}
sb.auth.onAuthStateChange((_e, session) => refreshAuth(session));
$('loginBtn').onclick = async () => { const e = $('email').value.trim(), p = $('password').value; if (!e || !p) return; $('loginMsg').textContent = 'Signing in…'; const { error } = await sb.auth.signInWithPassword({ email: e, password: p }); $('loginMsg').textContent = error ? error.message : ''; };
$('password').addEventListener('keydown', ev => { if (ev.key === 'Enter') $('loginBtn').click(); });
$('signout').onclick = (e) => { e.preventDefault(); sb.auth.signOut(); };

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
  const [{ data: services, error }, { data: openShifts }, { data: tasks }] = await Promise.all([
    sb.from('msp_services').select('*').order('updated_at', { ascending: false }),
    sb.from('msp_shifts').select('id,service_id,status,shift_date').gte('shift_date', today()).lte('shift_date', addDays(today(), 14)).neq('status', 'cancelled'),
    sb.from('msp_tasks').select('id,service_id,due_date,status').neq('status', 'done').lt('due_date', today()),
  ]);
  if (error) return $('app').innerHTML = `<div class="err">${esc(error.message)}</div>`;
  state.services = services || [];
  const open = (openShifts || []).filter(s => s.status === 'open').length, tot = (openShifts || []).length;
  const live = state.services.filter(s => ['live', 'mobilising'].includes(s.status)).length;
  const pipeline = state.services.filter(s => ['enquiry', 'scoping', 'proposal', 'awarded'].includes(s.status)).length;
  const overdue = (tasks || []).length;
  const byStage = Object.fromEntries(STAGES.map(s => [s, state.services.filter(x => x.status === s).length]));
  $('app').innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="n">${state.services.length}</div><div class="l">Services</div></div>
      <div class="kpi"><div class="n">${pipeline}</div><div class="l">In pipeline</div></div>
      <div class="kpi good"><div class="n">${live}</div><div class="l">Live / mobilising</div></div>
      <div class="kpi ${open ? 'warn' : 'good'}"><div class="n">${open}<span style="font-size:14px;color:var(--ink-soft)"> / ${tot}</span></div><div class="l">Open shifts next 14 days</div></div>
      <div class="kpi ${overdue ? 'flag' : ''}"><div class="n">${overdue}</div><div class="l">Overdue mobilisation tasks</div></div>
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
  const [svc, roles, patterns, pool, tasks, scoping, incidents, activity] = await Promise.all([
    sb.from('msp_services').select('*').eq('id', id).single(),
    sb.from('msp_roles').select('*').eq('service_id', id).order('sort'),
    sb.from('msp_shift_patterns').select('*').eq('service_id', id).order('dow').order('start_time'),
    sb.from('msp_pool').select('*').eq('service_id', id).order('full_name'),
    sb.from('msp_tasks').select('*').eq('service_id', id).order('sort').order('due_date'),
    sb.from('msp_scoping').select('*').eq('service_id', id).order('sort'),
    sb.from('msp_incidents').select('*').eq('service_id', id).order('occurred_on', { ascending: false }),
    sb.from('msp_activity').select('*').eq('service_id', id).order('created_at', { ascending: false }).limit(15),
  ]);
  if (svc.error) throw svc.error;
  Object.assign(state, { svc: svc.data, roles: roles.data || [], patterns: patterns.data || [], pool: pool.data || [], tasks: tasks.data || [], scoping: scoping.data || [], incidents: incidents.data || [], activity: activity.data || [] });
}
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
  ({ overview: tabOverview, scoping: tabScoping, design: tabDesign, pricing: tabPricing, mobilisation: tabMobilisation, pool: tabPool, rota: tabRota, timesheets: tabTimesheets, incidents: tabIncidents }[tab] || tabOverview)();
}

// ---------- CALCS (shared by overview & pricing) ----------
function weeklyModel() {
  const p = state.svc.pricing || {};
  const rows = state.roles.map(r => {
    const h = { std: 0, sat: 0, sun: 0 };
    state.patterns.filter(x => x.role_id === r.id).forEach(x => { h[dayType(x.dow)] += hours(x.start_time, x.end_time, x.unpaid_break_mins) * x.headcount; });
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

// ---------- OVERVIEW ----------
async function tabOverview() {
  const s = state.svc, m = weeklyModel();
  const { data: shifts } = await sb.from('msp_shifts').select('status,shift_date,hours_worked').eq('service_id', s.id).gte('shift_date', addDays(today(), -28)).lte('shift_date', addDays(today(), 14)).neq('status', 'cancelled');
  const up = (shifts || []).filter(x => x.shift_date >= today()), past = (shifts || []).filter(x => x.shift_date < today());
  const fill = (arr) => arr.length ? 100 * arr.filter(x => x.status !== 'open' && x.status !== 'sick').length / arr.length : 0;
  const openTasks = state.tasks.filter(t => t.status !== 'done'), overdue = openTasks.filter(t => t.due_date && t.due_date < today());
  const unanswered = state.scoping.filter(q => q.status === 'open').length;
  $('tab').innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="n">${gbp(m.revenue)}</div><div class="l">Revenue / week (modelled)</div></div>
      <div class="kpi ${m.marginPct < 15 ? 'warn' : m.marginPct < 20 ? 'flag' : 'good'}"><div class="n">${pct(m.marginPct, 0)}</div><div class="l">Margin ${gbp(m.margin)} / week</div></div>
      <div class="kpi"><div class="n">${num(m.hoursTotal, 0)}</div><div class="l">Paid hours / week</div></div>
      <div class="kpi ${up.length && fill(up) < 90 ? 'warn' : ''}"><div class="n">${up.length ? pct(fill(up), 0) : '—'}</div><div class="l">Fill rate next 14 days (${up.length} shifts)</div></div>
      <div class="kpi"><div class="n">${past.length ? pct(fill(past), 0) : '—'}</div><div class="l">Fill rate last 4 weeks</div></div>
      <div class="kpi ${overdue.length ? 'flag' : ''}"><div class="n">${openTasks.length}</div><div class="l">Open tasks (${overdue.length} overdue)</div></div>
      <div class="kpi ${unanswered ? 'flag' : 'good'}"><div class="n">${unanswered}</div><div class="l">Scoping questions open</div></div>
    </div>
    <div class="two">
      <div class="card"><h3>Summary</h3><p style="font-size:13.5px;line-height:1.5;white-space:pre-wrap">${esc(s.summary || '—')}</p>
        <h4>Contacts</h4><p class="muted">${esc(s.contact_name || '—')}<br>${esc(s.contact_email || '')} ${esc(s.contact_phone || '')}</p>
        <h4>Dates</h4><p class="muted">Start ${fmtDate(s.start_date) || '—'} · End ${fmtDate(s.end_date) || '—'} · DW owner ${esc(s.owner_name || '—')}</p></div>
      <div class="card"><h3>Staffing model</h3><table><thead><tr><th>Role</th><th class="r">Heads/shift</th><th class="r">Hrs/wk</th><th class="r">Cost/wk</th>${s.model === 'insourcing' ? '' : '<th class="r">Charge/wk</th>'}</tr></thead><tbody>
        ${m.rows.map(x => `<tr><td>${esc(x.r.title)} <span class="muted">${esc(x.r.grade || '')}</span></td><td class="r">${x.heads}</td><td class="r">${num(x.hoursTotal, 0)}</td><td class="r">${gbp(x.cost)}</td>${s.model === 'insourcing' ? '' : `<td class="r">${gbp(x.rev)}</td>`}</tr>`).join('') || '<tr><td colspan="5" class="empty">No roles yet — set them up under Service design.</td></tr>'}
        </tbody></table>
        <h4>Pool</h4><p class="muted">${state.pool.filter(x => x.active).length} active · ${state.pool.filter(x => x.compliance === 'cleared').length} compliance cleared · ${state.pool.filter(x => x.reserve).length} reserves</p></div>
    </div>
    <div class="two">
      <div class="card"><h3>Next actions</h3>${openTasks.slice(0, 8).map(t => `<div class="task ${t.status}"><span class="pill ${t.due_date && t.due_date < today() ? 'red' : t.status === 'doing' ? 'flag' : 'mut'}">${t.due_date ? fmtDate(t.due_date) : t.status}</span><span class="t">${esc(t.title)}</span><span class="muted">${esc(t.owner || '')}</span></div>`).join('') || '<p class="empty">Nothing open.</p>'}</div>
      <div class="card"><h3>Activity</h3><div class="feed">${state.activity.map(a => `<div><div class="t">${new Date(a.created_at).toLocaleString('en-GB')} · ${esc(a.actor || '')}</div>${esc(a.action)} ${esc(a.detail || '')}</div>`).join('') || '<p class="empty">No activity yet.</p>'}</div></div>
    </div>`;
}

// ---------- SCOPING ----------
function tabScoping() {
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
    const section = prompt('Section (e.g. Service, Rostering & admin, Clinical governance, Commercial, Mobilisation)', sections[0] || 'Service'); if (!section) return;
    const question = prompt('Question'); if (!question) return;
    const { error } = await sb.from('msp_scoping').insert({ service_id: state.svc.id, section, question, sort: state.scoping.length + 1 }); if (error) return fail(error); tabReload('scoping');
  };
}
async function tabReload(tab) { await loadService(state.svc.id); ({ scoping: tabScoping, design: tabDesign, pricing: tabPricing, mobilisation: tabMobilisation, pool: tabPool, rota: tabRota, timesheets: tabTimesheets, incidents: tabIncidents, overview: tabOverview })[tab](); }

// ---------- SERVICE DESIGN (roles + shift pattern) ----------
function tabDesign() {
  const s = state.svc, ins = s.model === 'insourcing';
  const roleRow = (r) => `<tr data-id="${r.id}">
    <td class="tight"><input class="cell" data-f="title" value="${esc(r.title)}"></td><td class="tight"><input class="cell" data-f="grade" value="${esc(r.grade || '')}" style="width:90px"></td>
    <td class="tight"><select class="cell" data-f="rate_basis" style="width:auto"><option ${r.rate_basis === 'umbrella' ? 'selected' : ''}>umbrella</option><option ${r.rate_basis === 'paye' ? 'selected' : ''}>paye</option><option ${r.rate_basis === 'ltd' ? 'selected' : ''}>ltd</option></select></td>
    <td class="tight"><input class="cell num" data-f="pay_std" value="${r.pay_std}"></td><td class="tight"><input class="cell num" data-f="pay_sat" value="${r.pay_sat}"></td><td class="tight"><input class="cell num" data-f="pay_sun" value="${r.pay_sun}"></td>
    <td class="tight"><input class="cell num" data-f="oncost_pct" value="${r.oncost_pct}" style="width:64px"></td>
    ${ins ? '' : `<td class="tight"><input class="cell num" data-f="charge_std" value="${r.charge_std}"></td><td class="tight"><input class="cell num" data-f="charge_sat" value="${r.charge_sat}"></td><td class="tight"><input class="cell num" data-f="charge_sun" value="${r.charge_sun}"></td>`}
    <td class="tight"><input class="cell num" data-f="price_cap" value="${r.price_cap ?? ''}" placeholder="cap" style="width:70px"></td>
    <td class="tight"><button class="btn sm" data-act="save">Save</button> <button class="btn sm secondary" data-act="del">✕</button></td></tr>`;
  const patRow = (p) => { const r = state.roles.find(x => x.id === p.role_id); return `<tr data-id="${p.id}">
    <td class="tight"><select class="cell" data-f="role_id">${state.roles.map(x => `<option value="${x.id}" ${x.id === p.role_id ? 'selected' : ''}>${esc(x.title)}</option>`).join('')}</select></td>
    <td class="tight"><select class="cell" data-f="dow" style="width:auto">${[1, 2, 3, 4, 5, 6, 0].map(d => `<option value="${d}" ${d === p.dow ? 'selected' : ''}>${DOW[d]}</option>`).join('')}</select></td>
    <td class="tight"><input class="cell" type="time" data-f="start_time" value="${hhmm(p.start_time)}" style="width:110px"></td><td class="tight"><input class="cell" type="time" data-f="end_time" value="${hhmm(p.end_time)}" style="width:110px"></td>
    <td class="tight"><input class="cell num" data-f="unpaid_break_mins" value="${p.unpaid_break_mins}" style="width:64px"></td><td class="tight"><input class="cell num" data-f="headcount" value="${p.headcount}" style="width:64px"></td>
    <td class="r">${num(hours(p.start_time, p.end_time, p.unpaid_break_mins) * p.headcount)}</td>
    <td class="tight"><button class="btn sm" data-act="save">Save</button> <button class="btn sm secondary" data-act="del">✕</button></td></tr>`; };
  $('tab').innerHTML = `
    <div class="card"><div class="section-title"><h3>Roles &amp; rates (£/hr)</h3><span class="muted">Pay = what we pay the worker (umbrella rates are all-in, on-cost 0). ${ins ? 'Insourcing: revenue comes from tariff, not charge rates.' : 'Charge = hourly rate to the client.'}</span><span class="sp"></span><button class="btn sm secondary" id="addRole">+ Role</button></div>
      <div style="overflow-x:auto"><table><thead><tr><th>Role</th><th>Grade</th><th>Basis</th><th>Pay M–F</th><th>Pay Sat</th><th>Pay Sun/BH</th><th>On-cost %</th>${ins ? '' : '<th>Charge M–F</th><th>Charge Sat</th><th>Charge Sun/BH</th>'}<th>NHSE cap</th><th></th></tr></thead><tbody id="roles">${state.roles.map(roleRow).join('')}</tbody></table></div></div>
    <div class="card"><div class="section-title"><h3>Shift pattern (weekly)</h3><span class="muted">One row per role per day. Headcount = people on at once. The rota is generated from this.</span><span class="sp"></span><button class="btn sm secondary" id="copyWeek">Copy Mon → all days</button><button class="btn sm secondary" id="addPat">+ Shift</button></div>
      <div style="overflow-x:auto"><table><thead><tr><th>Role</th><th>Day</th><th>Start</th><th>End</th><th>Unpaid break (min)</th><th>Headcount</th><th class="r">Paid hrs</th><th></th></tr></thead><tbody id="pats">${state.patterns.map(patRow).join('') || '<tr><td colspan="8" class="empty">No shifts yet.</td></tr>'}</tbody></table></div>
      <p class="muted" style="margin-top:10px">Weekly paid hours: <strong>${num(weeklyModel().hoursTotal, 0)}</strong></p></div>`;
  const wire = (tbody, table, fields) => tbody.querySelectorAll('tr[data-id]').forEach(tr => {
    tr.querySelector('[data-act=save]').onclick = async () => {
      const upd = {}; fields.forEach(f => { const el = tr.querySelector(`[data-f=${f}]`); let v = el.value; if (el.classList.contains('num') || f === 'dow') v = v === '' ? null : Number(v); upd[f] = v; });
      const { error } = await sb.from(table).update(upd).eq('id', tr.dataset.id); if (error) return fail(error); toast('Saved'); tabReload('design');
    };
    tr.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Delete?')) return; const { error } = await sb.from(table).delete().eq('id', tr.dataset.id); if (error) return fail(error); tabReload('design'); };
  });
  wire($('roles'), 'msp_roles', ['title', 'grade', 'rate_basis', 'pay_std', 'pay_sat', 'pay_sun', 'oncost_pct', ...(ins ? [] : ['charge_std', 'charge_sat', 'charge_sun']), 'price_cap']);
  wire($('pats'), 'msp_shift_patterns', ['role_id', 'dow', 'start_time', 'end_time', 'unpaid_break_mins', 'headcount']);
  $('addRole').onclick = async () => { const title = prompt('Role title (e.g. GP, Band 5 RN, HCA)'); if (!title) return; const { error } = await sb.from('msp_roles').insert({ service_id: s.id, title, sort: state.roles.length + 1 }); if (error) return fail(error); tabReload('design'); };
  $('addPat').onclick = async () => { if (!state.roles.length) return toast('Add a role first', true); const { error } = await sb.from('msp_shift_patterns').insert({ service_id: s.id, role_id: state.roles[0].id, dow: 1, start_time: '08:00', end_time: '20:00', headcount: 1 }); if (error) return fail(error); tabReload('design'); };
  $('copyWeek').onclick = async () => {
    const mon = state.patterns.filter(p => p.dow === 1); if (!mon.length) return toast('No Monday shifts to copy', true);
    if (!confirm('Replace Tue–Sun with a copy of Monday\'s shifts?')) return;
    await sb.from('msp_shift_patterns').delete().eq('service_id', s.id).neq('dow', 1);
    const rows = []; [2, 3, 4, 5, 6, 0].forEach(d => mon.forEach(p => rows.push({ service_id: s.id, role_id: p.role_id, dow: d, start_time: p.start_time, end_time: p.end_time, headcount: p.headcount, unpaid_break_mins: p.unpaid_break_mins })));
    const { error } = await sb.from('msp_shift_patterns').insert(rows); if (error) return fail(error); tabReload('design');
  };
}

// ---------- PRICING ----------
function tabPricing() {
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
}

// ---------- MOBILISATION ----------
function tabMobilisation() {
  const s = state.svc;
  $('tab').innerHTML = `<div class="card"><div class="section-title"><h3>Mobilisation plan</h3><span class="muted">${state.tasks.filter(t => t.status === 'done').length} / ${state.tasks.length} done</span><span class="sp"></span><button class="btn sm secondary" id="addTask">+ Task</button></div>
    ${state.tasks.map(t => `<div class="task ${t.status}" data-id="${t.id}"><input type="checkbox" data-f="done" ${t.status === 'done' ? 'checked' : ''}><span class="t"><input class="cell" data-f="title" value="${esc(t.title)}" style="width:100%"></span><input class="cell" data-f="owner" value="${esc(t.owner || '')}" placeholder="Owner" style="width:150px"><input type="date" class="cell" data-f="due_date" value="${t.due_date || ''}" style="width:150px"><select class="cell" data-f="status" style="width:auto"><option ${t.status === 'todo' ? 'selected' : ''}>todo</option><option ${t.status === 'doing' ? 'selected' : ''}>doing</option><option ${t.status === 'blocked' ? 'selected' : ''}>blocked</option><option ${t.status === 'done' ? 'selected' : ''}>done</option></select><button class="btn sm" data-act="save">Save</button><button class="btn sm secondary" data-act="del">✕</button></div>`).join('') || '<p class="empty">No tasks yet.</p>'}</div>`;
  $('tab').querySelectorAll('.task[data-id]').forEach(el => {
    const save = async () => { const status = el.querySelector('[data-f=done]').checked ? 'done' : el.querySelector('[data-f=status]').value === 'done' ? 'todo' : el.querySelector('[data-f=status]').value; const { error } = await sb.from('msp_tasks').update({ title: el.querySelector('[data-f=title]').value, owner: el.querySelector('[data-f=owner]').value, due_date: el.querySelector('[data-f=due_date]').value || null, status }).eq('id', el.dataset.id); if (error) return fail(error); toast('Saved'); tabReload('mobilisation'); };
    el.querySelector('[data-act=save]').onclick = save; el.querySelector('[data-f=done]').onchange = save;
    el.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Delete task?')) return; await sb.from('msp_tasks').delete().eq('id', el.dataset.id); tabReload('mobilisation'); };
  });
  $('addTask').onclick = async () => { const title = prompt('Task'); if (!title) return; const { error } = await sb.from('msp_tasks').insert({ service_id: s.id, title, sort: state.tasks.length + 1 }); if (error) return fail(error); tabReload('mobilisation'); };
}

// ---------- POOL ----------
function tabPool() {
  const s = state.svc, COMP = ['pending', 'in_progress', 'cleared', 'expired', 'failed'], CP = { pending: 'mut', in_progress: 'flag', cleared: '', expired: 'red', failed: 'red' };
  const roleName = (id) => state.roles.find(r => r.id === id)?.title || '—';
  const target = state.roles.map(r => ({ r, need: Math.max(0, ...state.patterns.filter(p => p.role_id === r.id).map(p => p.headcount)), have: state.pool.filter(x => x.active && x.role_id === r.id && !x.reserve).length, cleared: state.pool.filter(x => x.active && x.role_id === r.id && x.compliance === 'cleared').length }));
  $('tab').innerHTML = `
    <div class="kpis">${target.map(t => `<div class="kpi ${t.cleared >= t.need ? 'good' : t.have >= t.need ? 'flag' : 'warn'}"><div class="n">${t.cleared}<span style="font-size:14px;color:var(--ink-soft)"> / ${t.need} per shift</span></div><div class="l">${esc(t.r.title)} cleared · ${t.have} in pool</div></div>`).join('')}</div>
    <div class="card"><div class="section-title"><h3>Staffing pool</h3><span class="muted">Dedicated people for this service. Compliance is tracked in the Compliance Portal — put the reference here.</span><span class="sp"></span><button class="btn sm" id="addPool">+ Add person</button></div>
    <div style="overflow-x:auto"><table><thead><tr><th>Name</th><th>Role</th><th>Contact</th><th>Engagement</th><th>Compliance</th><th>Induction</th><th>Reserve</th><th>Active</th><th>Notes</th><th></th></tr></thead><tbody>
    ${state.pool.map(x => `<tr data-id="${x.id}"><td class="tight"><input class="cell" data-f="full_name" value="${esc(x.full_name)}" style="min-width:160px"></td>
      <td class="tight"><select class="cell" data-f="role_id"><option value="">—</option>${state.roles.map(r => `<option value="${r.id}" ${r.id === x.role_id ? 'selected' : ''}>${esc(r.title)}</option>`).join('')}</select></td>
      <td class="tight"><input class="cell" data-f="email" value="${esc(x.email || '')}" placeholder="email" style="min-width:150px"><input class="cell" data-f="phone" value="${esc(x.phone || '')}" placeholder="phone" style="margin-top:4px"></td>
      <td class="tight"><select class="cell" data-f="employment_type" style="width:auto"><option ${x.employment_type === 'umbrella' ? 'selected' : ''}>umbrella</option><option ${x.employment_type === 'paye' ? 'selected' : ''}>paye</option><option ${x.employment_type === 'ltd' ? 'selected' : ''}>ltd</option></select></td>
      <td class="tight"><select class="cell" data-f="compliance" style="width:auto">${COMP.map(c => `<option ${c === x.compliance ? 'selected' : ''}>${c}</option>`).join('')}</select><input class="cell" data-f="compliance_ref" value="${esc(x.compliance_ref || '')}" placeholder="portal ref" style="margin-top:4px;width:120px"></td>
      <td class="tight" style="text-align:center"><input type="checkbox" data-f="induction_done" ${x.induction_done ? 'checked' : ''}></td>
      <td class="tight" style="text-align:center"><input type="checkbox" data-f="reserve" ${x.reserve ? 'checked' : ''}></td>
      <td class="tight" style="text-align:center"><input type="checkbox" data-f="active" ${x.active ? 'checked' : ''}></td>
      <td class="tight"><input class="cell" data-f="notes" value="${esc(x.notes || '')}" style="min-width:200px"></td>
      <td class="tight"><button class="btn sm" data-act="save">Save</button> <button class="btn sm secondary" data-act="del">✕</button></td></tr>`).join('') || '<tr><td colspan="10" class="empty">Nobody in the pool yet.</td></tr>'}
    </tbody></table></div></div>`;
  $('tab').querySelectorAll('tr[data-id]').forEach(tr => {
    tr.querySelector('[data-act=save]').onclick = async () => {
      const upd = {}; tr.querySelectorAll('[data-f]').forEach(el => { upd[el.dataset.f] = el.type === 'checkbox' ? el.checked : (el.value || null); });
      const { error } = await sb.from('msp_pool').update(upd).eq('id', tr.dataset.id); if (error) return fail(error); toast('Saved'); tabReload('pool');
    };
    tr.querySelector('[data-act=del]').onclick = async () => { if (!confirm('Remove from pool?')) return; await sb.from('msp_pool').delete().eq('id', tr.dataset.id); tabReload('pool'); };
  });
  $('addPool').onclick = async () => { const full_name = prompt('Full name'); if (!full_name) return; const { error } = await sb.from('msp_pool').insert({ service_id: s.id, full_name, role_id: state.roles[0]?.id || null }); if (error) return fail(error); tabReload('pool'); };
}

// ---------- ROTA ----------
async function tabRota() {
  const s = state.svc, ws = state.weekStart, days = [...Array(7)].map((_, i) => addDays(ws, i));
  const { data: shifts, error } = await sb.from('msp_shifts').select('*').eq('service_id', s.id).gte('shift_date', ws).lte('shift_date', days[6]).order('start_time');
  if (error) return fail(error);
  state.shifts = shifts || [];
  const pname = (id) => state.pool.find(p => p.id === id)?.full_name || '';
  const live = state.shifts.filter(x => x.status !== 'cancelled'), open = live.filter(x => x.status === 'open').length;
  $('tab').innerHTML = `
    <div class="toolbar"><button class="btn sm secondary" id="prevW">‹</button><strong>Week of ${fmtDate(ws)}</strong><button class="btn sm secondary" id="nextW">›</button><button class="btn sm secondary" id="thisW">This week</button>
      <span class="sp" style="flex:1"></span>
      <span class="pill ${open ? 'red' : ''}">${live.length - open} / ${live.length} filled</span>
      <span class="inline">Generate from pattern: <input type="date" id="genFrom" value="${ws}" class="cell" style="width:150px"> → <input type="date" id="genTo" value="${addDays(ws, 27)}" class="cell" style="width:150px"><button class="btn sm" id="gen">Generate</button></span></div>
    <div class="card rota"><table><thead><tr><th>Role</th>${days.map(d => `<th class="day">${fmtDate(d)}</th>`).join('')}</tr></thead><tbody>
      ${state.roles.map(r => `<tr><td><strong>${esc(r.title)}</strong><br><span class="muted">${esc(r.grade || '')}</span></td>${days.map(d => `<td class="tight">${state.shifts.filter(x => x.role_id === r.id && x.shift_date === d).map(x => `<span class="shiftchip ${x.status}" data-id="${x.id}">${hhmm(x.start_time)}–${hhmm(x.end_time)}<small>${x.pool_id ? esc(pname(x.pool_id)) : x.status === 'open' ? 'OPEN' : x.status}</small></span>`).join('')}</td>`).join('')}</tr>`).join('') || '<tr><td colspan="8" class="empty">Set up roles and a shift pattern first.</td></tr>'}
    </tbody></table><p class="muted" style="margin-top:10px">Click a shift to assign, confirm, mark sick or record hours. Red = open, amber = filled (unconfirmed), green = confirmed/worked.</p></div>`;
  $('prevW').onclick = () => { state.weekStart = addDays(ws, -7); tabRota(); }; $('nextW').onclick = () => { state.weekStart = addDays(ws, 7); tabRota(); }; $('thisW').onclick = () => { state.weekStart = mondayOf(today()); tabRota(); };
  $('gen').onclick = async () => { const { data, error } = await sb.rpc('msp_generate_rota', { p_service: s.id, p_from: $('genFrom').value, p_to: $('genTo').value }); if (error) return fail(error); log(s.id, 'rota', `generated ${data} shifts ${$('genFrom').value}→${$('genTo').value}`); toast(`${data} shifts created`); tabRota(); };
  $('tab').querySelectorAll('.shiftchip').forEach(ch => ch.onclick = () => shiftModal(state.shifts.find(x => x.id === ch.dataset.id)));
}
function shiftModal(x) {
  const r = state.roles.find(z => z.id === x.role_id), eligible = state.pool.filter(p => p.active && (!p.role_id || p.role_id === x.role_id));
  const planned = hours(x.start_time, x.end_time, x.unpaid_break_mins);
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="card"><h3 style="margin-top:0">${esc(r?.title || '')} · ${fmtDate(x.shift_date)} ${hhmm(x.start_time)}–${hhmm(x.end_time)} <span class="muted">(${num(planned)}h paid)</span></h3>
    <label>Assign</label><select id="m_pool"><option value="">— open —</option>${eligible.map(p => `<option value="${p.id}" ${p.id === x.pool_id ? 'selected' : ''}>${esc(p.full_name)}${p.compliance !== 'cleared' ? ' ⚠ ' + p.compliance : ''}${p.reserve ? ' (reserve)' : ''}</option>`).join('')}</select>
    <label>Status</label><select id="m_status">${['open', 'filled', 'confirmed', 'worked', 'sick', 'cancelled'].map(v => `<option ${v === x.status ? 'selected' : ''}>${v}</option>`).join('')}</select>
    <div class="row"><div><label>Hours worked</label><input id="m_hours" type="number" step="0.25" value="${x.hours_worked ?? ''}" placeholder="${num(planned, 2)}"></div><div><label>Timesheet</label><select id="m_ts">${['pending', 'submitted', 'approved', 'queried', 'invoiced'].map(v => `<option ${v === x.ts_status ? 'selected' : ''}>${v}</option>`).join('')}</select></div></div>
    <label>Notes</label><textarea id="m_notes" style="width:100%">${esc(x.notes || '')}</textarea>
    <div class="inline" style="margin-top:14px"><button class="btn" id="m_save">Save</button><button class="btn secondary" id="m_dup">Add cover shift</button><button class="btn secondary" id="m_close">Close</button></div></div>`;
  document.body.appendChild(m);
  m.querySelector('#m_close').onclick = () => m.remove();
  m.querySelector('#m_save').onclick = async () => {
    const pool_id = m.querySelector('#m_pool').value || null; let status = m.querySelector('#m_status').value;
    if (pool_id && status === 'open') status = 'filled'; if (!pool_id && ['filled', 'confirmed', 'worked'].includes(status)) status = 'open';
    const hw = m.querySelector('#m_hours').value; const upd = { pool_id, status, hours_worked: hw === '' ? (status === 'worked' ? planned : null) : Number(hw), ts_status: m.querySelector('#m_ts').value, notes: m.querySelector('#m_notes').value };
    const { error } = await sb.from('msp_shifts').update(upd).eq('id', x.id); if (error) return fail(error);
    const who = state.pool.find(p => p.id === pool_id)?.full_name; log(state.svc.id, 'shift', `${fmtDate(x.shift_date)} ${r?.title} → ${status}${who ? ' ' + who : ''}`); m.remove(); toast('Saved'); tabRota();
  };
  m.querySelector('#m_dup').onclick = async () => { const { error } = await sb.from('msp_shifts').insert({ service_id: x.service_id, role_id: x.role_id, shift_date: x.shift_date, start_time: x.start_time, end_time: x.end_time, unpaid_break_mins: x.unpaid_break_mins, notes: 'Cover for ' + (state.pool.find(p => p.id === x.pool_id)?.full_name || 'open shift') }); if (error) return fail(error); m.remove(); toast('Cover shift added'); tabRota(); };
}

// ---------- TIMESHEETS ----------
async function tabTimesheets() {
  const s = state.svc, ins = s.model === 'insourcing';
  const { data: shifts, error } = await sb.from('msp_shifts').select('*').eq('service_id', s.id).gte('shift_date', state.tsFrom).lte('shift_date', state.tsTo).in('status', ['confirmed', 'worked', 'sick']).order('shift_date');
  if (error) return fail(error);
  const rows = (shifts || []).filter(x => x.status !== 'sick');
  const rate = (r, d, k) => { const t = dayType(new Date(d + 'T00:00:00').getDay()); return Number(r[`${k}_${t}`]) || 0; };
  const enriched = rows.map(x => { const r = state.roles.find(z => z.id === x.role_id) || {}; const h = x.hours_worked ?? hours(x.start_time, x.end_time, x.unpaid_break_mins); return { x, r, h, pay: h * rate(r, x.shift_date, 'pay') * (1 + (Number(r.oncost_pct) || 0) / 100), charge: ins ? 0 : h * rate(r, x.shift_date, 'charge'), who: state.pool.find(p => p.id === x.pool_id)?.full_name || '' }; });
  const tot = (k) => enriched.reduce((a, e) => a + e[k], 0);
  const byRole = state.roles.map(r => ({ r, e: enriched.filter(e => e.r.id === r.id) })).filter(g => g.e.length);
  $('tab').innerHTML = `
    <div class="toolbar"><label style="margin:0">From</label><input type="date" id="tsFrom" value="${state.tsFrom}" class="cell" style="width:150px"><label style="margin:0">To</label><input type="date" id="tsTo" value="${state.tsTo}" class="cell" style="width:150px"><button class="btn sm secondary" id="tsGo">Apply</button><span style="flex:1"></span><button class="btn sm secondary" id="approveAll">Approve all submitted</button><button class="btn sm" id="exportCsv">Export invoice CSV</button></div>
    <div class="calc" style="margin-bottom:16px"><div class="box"><div class="k">Shifts</div><div class="v">${enriched.length}</div><div class="s">${(shifts || []).filter(x => x.status === 'sick').length} sick</div></div><div class="box"><div class="k">Hours</div><div class="v">${num(tot('h'))}</div></div><div class="box"><div class="k">Worker cost</div><div class="v">${gbp(tot('pay'))}</div></div>${ins ? '' : `<div class="box"><div class="k">Invoice value (hourly)</div><div class="v">${gbp(tot('charge'))}</div><div class="s">+ management fee</div></div><div class="box ${tot('charge') - tot('pay') > 0 ? 'good' : 'bad'}"><div class="k">Gross margin</div><div class="v">${gbp(tot('charge') - tot('pay'))}</div></div>`}</div>
    <div class="card"><h3>By role</h3><table><thead><tr><th>Role</th><th class="r">Shifts</th><th class="r">Hours</th><th class="r">Cost</th>${ins ? '' : '<th class="r">Charge</th>'}</tr></thead><tbody>${byRole.map(g => `<tr><td>${esc(g.r.title)}</td><td class="r">${g.e.length}</td><td class="r">${num(g.e.reduce((a, e) => a + e.h, 0))}</td><td class="r">${gbp(g.e.reduce((a, e) => a + e.pay, 0))}</td>${ins ? '' : `<td class="r">${gbp(g.e.reduce((a, e) => a + e.charge, 0))}</td>`}</tr>`).join('') || '<tr><td colspan="5" class="empty">No confirmed or worked shifts in range.</td></tr>'}</tbody></table></div>
    <div class="card"><h3>Shifts</h3><div style="overflow-x:auto"><table><thead><tr><th>Date</th><th>Role</th><th>Worker</th><th>Time</th><th class="r">Hours</th><th class="r">Cost</th>${ins ? '' : '<th class="r">Charge</th>'}<th>Status</th><th>Timesheet</th></tr></thead><tbody>
      ${enriched.map(e => `<tr data-id="${e.x.id}"><td>${fmtDate(e.x.shift_date)}</td><td>${esc(e.r.title || '')}</td><td>${esc(e.who)}</td><td>${hhmm(e.x.start_time)}–${hhmm(e.x.end_time)}</td><td class="r">${num(e.h, 2)}</td><td class="r">${gbp(e.pay, 2)}</td>${ins ? '' : `<td class="r">${gbp(e.charge, 2)}</td>`}<td><span class="pill ${e.x.status === 'worked' ? '' : 'flag'}">${e.x.status}</span></td><td class="tight"><select class="cell" data-ts style="width:auto">${['pending', 'submitted', 'approved', 'queried', 'invoiced'].map(v => `<option ${v === e.x.ts_status ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}
    </tbody></table></div></div>`;
  $('tsGo').onclick = () => { state.tsFrom = $('tsFrom').value; state.tsTo = $('tsTo').value; tabTimesheets(); };
  $('tab').querySelectorAll('[data-ts]').forEach(sel => sel.onchange = async () => { const id = sel.closest('tr').dataset.id; const { error } = await sb.from('msp_shifts').update({ ts_status: sel.value }).eq('id', id); if (error) return fail(error); toast('Updated'); });
  $('approveAll').onclick = async () => { const ids = enriched.filter(e => e.x.ts_status === 'submitted').map(e => e.x.id); if (!ids.length) return toast('Nothing submitted'); const { error } = await sb.from('msp_shifts').update({ ts_status: 'approved' }).in('id', ids); if (error) return fail(error); toast(`${ids.length} approved`); tabTimesheets(); };
  $('exportCsv').onclick = () => {
    const lines = [['Service', 'Date', 'Role', 'Worker', 'Start', 'End', 'Hours', 'Status', 'Timesheet', 'Worker cost', ins ? '' : 'Charge'].join(',')];
    enriched.forEach(e => lines.push([s.name, e.x.shift_date, e.r.title, e.who, hhmm(e.x.start_time), hhmm(e.x.end_time), e.h.toFixed(2), e.x.status, e.x.ts_status, e.pay.toFixed(2), ins ? '' : e.charge.toFixed(2)].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')));
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${s.name.replace(/[^\w]+/g, '_')}_${state.tsFrom}_${state.tsTo}.csv`; a.click();
  };
}

// ---------- INCIDENTS ----------
function tabIncidents() {
  const s = state.svc;
  $('tab').innerHTML = `<div class="card"><div class="section-title"><h3>Incidents, complaints &amp; escalations</h3><span class="muted">${state.incidents.filter(i => i.status !== 'closed').length} open</span><span class="sp"></span><button class="btn sm" id="addInc">+ Log</button></div>
    <table><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reported by</th><th>Status</th></tr></thead><tbody>${state.incidents.map(i => `<tr data-id="${i.id}"><td>${fmtDate(i.occurred_on)}</td><td><span class="pill ${i.kind === 'safeguarding' ? 'red' : i.kind === 'absence' ? 'mut' : 'flag'}">${i.kind}</span></td><td style="white-space:pre-wrap">${esc(i.description)}</td><td>${esc(i.reported_by || '')}</td><td class="tight"><select class="cell" data-st style="width:auto">${['open', 'investigating', 'closed'].map(v => `<option ${v === i.status ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('') || '<tr><td colspan="5" class="empty">Nothing logged.</td></tr>'}</tbody></table></div>`;
  $('tab').querySelectorAll('[data-st]').forEach(sel => sel.onchange = async () => { const { error } = await sb.from('msp_incidents').update({ status: sel.value }).eq('id', sel.closest('tr').dataset.id); if (error) return fail(error); toast('Updated'); });
  $('addInc').onclick = () => {
    const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="card"><h3 style="margin-top:0">Log an incident</h3><div class="row"><div><label>Date</label><input type="date" id="i_date" value="${today()}"></div><div><label>Type</label><select id="i_kind">${['incident', 'complaint', 'safeguarding', 'absence', 'escalation', 'other'].map(v => `<option>${v}</option>`).join('')}</select></div></div><label>Description</label><textarea id="i_desc" style="width:100%;min-height:90px"></textarea><label>Reported by</label><input id="i_by" value="${esc(state.user?.email || '')}"><div class="inline" style="margin-top:14px"><button class="btn" id="i_save">Save</button><button class="btn secondary" id="i_close">Cancel</button></div></div>`;
    document.body.appendChild(m); m.querySelector('#i_close').onclick = () => m.remove();
    m.querySelector('#i_save').onclick = async () => { const description = m.querySelector('#i_desc').value.trim(); if (!description) return; const { error } = await sb.from('msp_incidents').insert({ service_id: s.id, occurred_on: m.querySelector('#i_date').value, kind: m.querySelector('#i_kind').value, description, reported_by: m.querySelector('#i_by').value }); if (error) return fail(error); log(s.id, 'incident', m.querySelector('#i_kind').value); m.remove(); tabReload('incidents'); };
  };
}

// ---------- SERVICE CREATE / EDIT ----------
function editServiceModal(s) {
  const v = (k) => esc(s?.[k] || '');
  const m = document.createElement('div'); m.className = 'modal'; m.innerHTML = `<div class="card"><h3 style="margin-top:0">${s ? 'Edit service' : 'New service'}</h3>
    <label>Service name</label><input id="f_name" value="${v('name')}" placeholder="e.g. Salisbury UTC — GP managed service">
    <div class="row"><div><label>Client</label><input id="f_client" value="${v('client')}"></div><div><label>Site</label><input id="f_site" value="${v('site')}"></div></div>
    <div class="row"><div><label>Framework / route</label><input id="f_framework" value="${v('framework')}" placeholder="RM6281 Lot 2 / RM6276"></div><div><label>Model</label><select id="f_model"><option value="managed_service" ${s?.model !== 'insourcing' ? 'selected' : ''}>Managed service (hourly + fee)</option><option value="insourcing" ${s?.model === 'insourcing' ? 'selected' : ''}>Insourcing (tariff discount)</option></select></div></div>
    <div class="row"><div><label>Start</label><input id="f_start" type="date" value="${v('start_date')}"></div><div><label>End</label><input id="f_end" type="date" value="${v('end_date')}"></div><div><label>DW owner</label><input id="f_owner" value="${v('owner_name')}"></div></div>
    <label>Client contact(s)</label><input id="f_cname" value="${v('contact_name')}"><div class="row"><div><label>Email</label><input id="f_cemail" value="${v('contact_email')}"></div><div><label>Phone</label><input id="f_cphone" value="${v('contact_phone')}"></div></div>
    <label>Summary</label><textarea id="f_summary" style="width:100%;min-height:90px">${v('summary')}</textarea>
    <div class="inline" style="margin-top:14px"><button class="btn" id="f_save">Save</button><button class="btn secondary" id="f_close">Cancel</button>${s ? '<span style="flex:1"></span><button class="btn secondary" id="f_del">Delete service</button>' : ''}</div></div>`;
  document.body.appendChild(m); m.querySelector('#f_close').onclick = () => m.remove();
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
  const qs = [['Service', 'Opening hours and days (weekdays, weekends, bank holidays)'], ['Service', 'Site(s) covered'], ['Service', 'Expected activity per day and the clinical model'], ['Service', 'Minimum staffing per shift and who is the senior clinician in charge'], ['Service', 'Existing substantive / bank staff, or are we the whole workforce?'], ['Rostering & admin', 'Who owns the rota template and shift pattern?'], ['Rostering & admin', 'Rostering system — theirs or ours?'], ['Rostering & admin', 'Short-notice gap expectations and escalation route'], ['Rostering & admin', 'Timesheet authorisation on site'], ['Rostering & admin', 'MI / reporting required and frequency'], ['Clinical governance', 'Who is the clinical lead — Trust or us?'], ['Clinical governance', 'Governance, policies, incident reporting and indemnity — confirm where they sit'], ['Clinical governance', 'Induction and system training — who delivers, duration, paid?'], ['Commercial', 'IR35 status determinations'], ['Commercial', 'Budget envelope / hours modelled'], ['Commercial', 'Contract term, extension option, route to longer-term award'], ['Commercial', 'Payment terms and invoicing'], ['Commercial', 'Decision timeline'], ['Mobilisation', 'Go/no-go date needed to recruit in time'], ['Mobilisation', 'Named Trust contacts: operational, clinical, finance'], ['Mobilisation', 'System access / smartcards lead time']];
  const tasks = ['Discovery call with client', 'Confirm framework route and IR35', 'Indicative cost and mobilisation plan to client', 'Go/no-go from client', 'Pool recruited and compliance cleared', 'Client induction and system access complete', 'Rota published 2 weeks ahead', 'Go live'];
  await sb.from('msp_scoping').insert(qs.map(([section, question], i) => ({ service_id, section, question, sort: i + 1 })));
  await sb.from('msp_tasks').insert(tasks.map((title, i) => ({ service_id, title, sort: i + 1 })));
}
