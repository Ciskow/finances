// All money rules of the app, as plain functions over the `db` object.
// Selectors read; actions mutate the db they are given (the store hands them a fresh copy).

export const DEF_DB = {
  settings: {
    usdRate: 5.4, display: 'BRL', hourlyRate: 0, hoursPerDay: 8,
    catExp: ['Cartão', 'Moradia', 'Saúde', 'Empréstimos', 'Empresa', 'Utilidades', 'Alimentação', 'Transporte', 'Pessoal', 'Presentes', 'Animais de estimação', 'Viagens', 'Débito', 'Outros'],
    catInc: ['Pagamento', 'Bônus', 'Poupança', 'Juros', 'Empréstimos', 'Reembolso', 'Outros'],
    people: ['Carol', 'Pai'],
  },
  months: {}, entries: [], recurring: [], ledger: [],
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
export const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : 0; };

// ---------- months ----------
export const curMonth = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
export function addM(m, n) {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + n, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
const monthDate = (m) => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1); };
export const monthName = (m) => monthDate(m).toLocaleDateString('pt-BR', { month: 'long' });
export const monthShort = (m) => monthDate(m).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
export const monthYear = (m) => m.slice(0, 4);
export const mLabel = (m) => monthDate(m).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
export function bizDaysAuto(m) {
  const [y, mo] = m.split('-').map(Number);
  let c = 0; const d = new Date(y, mo - 1, 1);
  while (d.getMonth() === mo - 1) { const w = d.getDay(); if (w > 0 && w < 6) c++; d.setDate(d.getDate() + 1); }
  return c;
}
export function bizDays(db, m) { const o = db.months[m]; return o && o.bizDays != null ? o.bizDays : bizDaysAuto(m); }
function monthMeta(db, m) { if (!db.months[m]) db.months[m] = { saldoInicial: null, bizDays: null }; return db.months[m]; }

// ---------- money ----------
export const toBRL = (db, a, cur) => (cur === 'USD' ? a * db.settings.usdRate : a);
export const valBRL = (db, e) => toBRL(db, e.amount, e.currency);
export function fmt(db, vBRL) {
  if (db.settings.display === 'USD') {
    const v = vBRL / (db.settings.usdRate || 1);
    return (v < 0 ? '− ' : '') + 'US$ ' + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return (vBRL < 0 ? '− ' : '') + 'R$ ' + Math.abs(vBRL).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
/** Splits a formatted amount so the whole part can be emphasised. */
export function splitAmount(db, vBRL) {
  const s = fmt(db, vBRL);
  const m = s.match(/^(− )?(R\$|US\$)\s([\d.,]+)([.,]\d{2})$/);
  return m ? { neg: !!m[1], cur: m[2], int: m[3], dec: m[4] } : { neg: false, cur: '', int: s, dec: '' };
}

// ---------- selectors ----------
export const ownInc = (db, m) => db.entries.filter((e) => e.month === m && e.type === 'inc' && !e.mirror);
const storedFamExp = (db, m) => db.entries.filter((e) => e.month === m && e.type === 'exp' && e.person);
const storedOwnExp = (db, m) => db.entries.filter((e) => e.month === m && e.type === 'exp' && !e.person);
export const mirrorOf = (db, expId) => db.entries.find((e) => e.mirror && e.linkId === expId);

export function recAmount(tpl, m) {
  if (tpl.amounts[m] != null) return tpl.amounts[m];
  let k = m;
  for (let i = 0; i < 60; i++) { k = addM(k, -1); if (k < tpl.startMonth) break; if (tpl.amounts[k] != null) return tpl.amounts[k]; }
  return tpl.base || 0;
}
export const recActive = (t, m) => t.startMonth <= m && (t.endMonth == null || m < t.endMonth);
/** This month's occurrence of each recurring expense: mine (family = false) or a family member's (family = true). */
function recRows(db, m, family) {
  return db.recurring.filter((t) => recActive(t, m) && !!t.person === family).map((t) => ({
    virt: true, tplId: t.id, id: 'v:' + t.id, desc: t.desc, category: t.category, currency: t.currency || 'BRL',
    dueDay: t.dueDay, amount: recAmount(t, m), paid: !!(t.paid && t.paid[m]),
    person: t.person || null, payTo: t.payTo || null, received: !!(t.received && t.received[m]),
  }));
}
const byDue = (a, b) => (a.dueDay || 99) - (b.dueDay || 99);
/** My own expenses of the month: stored entries plus this month's occurrence of each recurring card. */
export const ownExp = (db, m) => [...storedOwnExp(db, m), ...recRows(db, m, false)].sort(byDue);
/** Family expenses of the month (outside my totals): stored entries plus recurring ones assigned to a person. */
export const famExp = (db, m) => [...storedFamExp(db, m), ...recRows(db, m, true)].sort(byDue);

/**
 * Cash that came in from the family in month `m`: covered bills marked as received in that month,
 * plus the ledger's inflows (see txFlows). Bills marked as received before this rule existed carry
 * no month and are left out, so past months keep their numbers.
 */
export function famIn(db, m) {
  let v = 0;
  db.entries.forEach((e) => { if (e.mirror && e.paid && e.receivedMonth === m) v += valBRL(db, e); });
  db.recurring.forEach((t) => {
    if (!t.person || !t.received) return;
    Object.keys(t.received).forEach((k) => { if (t.received[k] === m) v += toBRL(db, recAmount(t, k), t.currency || 'BRL'); });
  });
  (db.ledger || []).forEach((t) => txFlows(db, t).forEach((f) => { if (f.month === m && f.value > 0) v += f.value; }));
  return v;
}
/** Cash I handed to the family in month `m`: the ledger's outflows (loans made, debts paid). */
export function famOut(db, m) {
  let v = 0;
  (db.ledger || []).forEach((t) => txFlows(db, t).forEach((f) => { if (f.month === m && f.value < 0) v -= f.value; }));
  return v;
}
export function totals(db, m) {
  const exp = ownExp(db, m);
  const fin = famIn(db, m), fout = famOut(db, m);
  const renda = ownInc(db, m).reduce((s, e) => s + valBRL(db, e), 0) + fin;
  const desp = exp.reduce((s, e) => s + valBRL(db, e), 0) + fout;
  const pend = exp.filter((e) => !e.paid).reduce((s, e) => s + valBRL(db, e), 0);
  return { renda, desp, econ: renda - desp, pend, paid: desp - pend, count: exp.length, paidCount: exp.filter((e) => e.paid).length, famIn: fin, famOut: fout };
}
export function famReceivable(db, m) {
  return db.entries.filter((e) => e.mirror && !e.paid && e.month === m).reduce((s, e) => s + valBRL(db, e), 0)
    + recRows(db, m, true).filter((e) => !e.received).reduce((s, e) => s + valBRL(db, e), 0);
}
function allDataMonths(db) {
  const s = new Set(db.entries.map((e) => e.month));
  db.recurring.forEach((t) => { s.add(t.startMonth); Object.keys(t.amounts || {}).forEach((k) => s.add(k)); });
  Object.keys(db.months).forEach((k) => { const o = db.months[k]; if (o && (o.saldoInicial != null || o.bizDays != null)) s.add(k); });
  return [...s].sort();
}
/** Opening balance: the value typed for the month, else the previous month's closing balance. */
export function saldoIni(db, m, first, depth = 0) {
  const o = db.months[m];
  if (o && o.saldoInicial != null) return o.saldoInicial;
  if (first === undefined) first = allDataMonths(db)[0] || null;
  if (!first || m <= first || depth > 72) return 0;
  const p = addM(m, -1), t = totals(db, p);
  return saldoIni(db, p, first, depth + 1) + t.renda - t.desp;
}
export const saldoIsManual = (db, m) => !!(db.months[m] && db.months[m].saldoInicial != null);
export const bizDaysIsManual = (db, m) => !!(db.months[m] && db.months[m].bizDays != null);

export function earliestUnpaid(db) {
  const cands = [];
  db.entries.forEach((e) => { if (e.type === 'exp' && !e.paid) cands.push(e.month); });
  const cap = curMonth();
  db.recurring.forEach((t) => {
    let m = t.startMonth;
    for (let i = 0; i < 120 && m <= cap; i++) { if (recActive(t, m) && !(t.paid && t.paid[m])) cands.push(m); m = addM(m, 1); }
  });
  return cands.length ? cands.sort()[0] : curMonth();
}
export function isMonthSettled(db, m) {
  const own = ownExp(db, m), fam = famExp(db, m);
  return own.length + fam.length > 0 && own.every((e) => e.paid) && fam.every((e) => e.paid);
}
/** Expenses grouped by category, largest first. */
export function byCategory(db, m) {
  const map = new Map();
  ownExp(db, m).forEach((e) => { const k = e.category || 'Outros'; map.set(k, (map.get(k) || 0) + valBRL(db, e)); });
  const fout = famOut(db, m);
  if (fout > 0) map.set('Família: empréstimos e pagamentos', fout);
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}
/** Family expenses of the month grouped by person, with what each owes, still owes and has paid back. */
export function familyGroups(db, m) {
  const map = new Map();
  famExp(db, m).sort(byDue).forEach((e) => { if (!map.has(e.person)) map.set(e.person, []); map.get(e.person).push(e); });
  return [...map.entries()].map(([person, list]) => {
    let deve = 0, arec = 0, rec = 0;
    const rows = list.map((e) => {
      deve += valBRL(db, e);
      if (e.virt) { // recurring: "received" is kept per month on the template, no mirrored entry
        if (e.received) rec += valBRL(db, e); else arec += valBRL(db, e);
        return e;
      }
      const mir = mirrorOf(db, e.id);
      if (mir) { if (mir.paid) rec += valBRL(db, mir); else arec += valBRL(db, mir); }
      return { ...e, received: !!(mir && mir.paid) };
    });
    return { person, rows, deve, arec, rec };
  });
}
export function salaryInfo(db, m) {
  const rate = db.settings.hourlyRate, hours = db.settings.hoursPerDay, days = bizDays(db, m);
  return { rate, hours, days, auto: bizDaysAuto(m), manual: bizDaysIsManual(db, m), value: rate * hours * days, exists: ownInc(db, m).some((e) => e.salary) };
}
export function rangeMonths(db, a, b) {
  const from = a <= b ? a : b, to = a <= b ? b : a;
  const rows = []; let m = from;
  for (let i = 0; i < 121 && m <= to; i++) { rows.push({ month: m, ...totals(db, m) }); m = addM(m, 1); }
  return { from, to, rows, renda: rows.reduce((s, r) => s + r.renda, 0), desp: rows.reduce((s, r) => s + r.desp, 0) };
}

// ---------- mirror (reimbursement) ----------
// An expense assigned to a family member gets a mirrored "Reembolso" income:
// kept in sync while not received, frozen once the person has paid back.
function syncMirror(db, exp) {
  const mir = mirrorOf(db, exp.id);
  if (exp.person) {
    if (!mir) {
      db.entries.push({ id: uid(), month: exp.month, type: 'inc', mirror: true, linkId: exp.id, person: exp.person,
        desc: 'Reembolso — ' + exp.desc, amount: exp.amount, currency: exp.currency, category: 'Reembolso', paid: false });
    } else if (!mir.paid) {
      Object.assign(mir, { amount: exp.amount, currency: exp.currency, month: exp.month, person: exp.person, desc: 'Reembolso — ' + exp.desc });
    }
  } else if (mir && !mir.paid) {
    db.entries = db.entries.filter((e) => e.id !== mir.id);
  }
}
function removeMirrorIfUnpaid(db, expId) {
  const mir = mirrorOf(db, expId);
  if (mir && !mir.paid) db.entries = db.entries.filter((e) => e.id !== mir.id);
}

// ---------- actions ----------
export function togglePaid(db, view, id, val) {
  if (id.startsWith('v:')) {
    const t = db.recurring.find((x) => x.id === id.slice(2));
    if (t) { t.paid = t.paid || {}; t.paid[view] = val; if (t.amounts[view] == null) t.amounts[view] = recAmount(t, view); }
  } else {
    const e = db.entries.find((x) => x.id === id);
    if (e) e.paid = val;
  }
}
/** Marks that the person paid me back. For a recurring expense this is kept per month and freezes that month's amount. */
export function toggleReceived(db, billMonth, expId, val, receivedIn = billMonth) {
  // The month the money came in is stored with the mark, so it counts in that month's totals.
  if (expId.startsWith('v:')) {
    const t = db.recurring.find((x) => x.id === expId.slice(2));
    if (t) { t.received = t.received || {}; t.received[billMonth] = val ? receivedIn : false; if (t.amounts[billMonth] == null) t.amounts[billMonth] = recAmount(t, billMonth); }
    return;
  }
  const e = db.entries.find((x) => x.id === expId);
  if (!e) return;
  let mir = mirrorOf(db, expId);
  if (!mir) { syncMirror(db, e); mir = mirrorOf(db, expId); }
  if (mir) { mir.paid = val; if (val) mir.receivedMonth = receivedIn; else delete mir.receivedMonth; }
}
export const setSaldo = (db, m, v) => { monthMeta(db, m).saldoInicial = v; };
export const setBizDays = (db, m, v) => { monthMeta(db, m).bizDays = v == null ? null : Math.max(0, Math.round(v)); };
export function genSalary(db, m) {
  const { rate, hours, days } = salaryInfo(db, m);
  if (rate <= 0) return false;
  const old = db.entries.find((e) => e.salary && e.month === m);
  db.entries = db.entries.filter((e) => !(e.salary && e.month === m));
  db.entries.push({ id: uid(), month: m, type: 'inc', salary: true, desc: `Salário (${days}d × ${hours}h)`,
    amount: +(rate * hours * days).toFixed(2), currency: 'BRL', category: 'Pagamento', paid: old ? !!old.paid : false });
  return true;
}
export function addBonus(db, m, desc, amount) {
  db.entries.push({ id: uid(), month: m, type: 'inc', desc, amount, currency: 'BRL', category: 'Bônus', paid: false });
}
/** form: {desc, amount, currency, category, dueDay, person}; opts: {recurring, parcelas} */
export function addEntry(db, view, type, form, opts = {}) {
  if (type === 'exp' && opts.recurring) {
    db.recurring.push({ id: uid(), desc: form.desc, category: form.category, currency: form.currency, dueDay: form.dueDay,
      person: form.person || null, payTo: form.person ? null : form.payTo || null, base: form.amount, startMonth: view, endMonth: null, amounts: { [view]: form.amount }, paid: {}, received: {} });
    return;
  }
  const n = type === 'exp' ? Math.max(1, Math.round(opts.parcelas || 1)) : 1;
  const sid = n > 1 ? uid() : null;
  for (let k = 0; k < n; k++) {
    const e = { id: uid(), month: addM(view, k), type, desc: form.desc, amount: form.amount, currency: form.currency,
      category: form.category, dueDay: form.dueDay, person: type === 'exp' ? form.person : null, payTo: type === 'exp' && !form.person ? form.payTo || null : null, paid: false,
      seriesId: sid, seriesIdx: sid ? k + 1 : undefined, seriesN: sid ? n : undefined };
    db.entries.push(e);
    if (e.person) syncMirror(db, e);
  }
}
const seriesFrom = (db, e) => db.entries.filter((x) => x.seriesId === e.seriesId && x.seriesIdx >= e.seriesIdx);
export function editEntry(db, id, form, scope) {
  const e = db.entries.find((x) => x.id === id);
  if (!e) return;
  const targets = scope === 'future' && e.seriesId ? seriesFrom(db, e) : [e];
  targets.forEach((x) => {
    Object.assign(x, { desc: form.desc, amount: form.amount, currency: form.currency, category: form.category, dueDay: form.dueDay });
    if (x.type === 'exp') { x.person = form.person; x.payTo = form.person ? null : form.payTo || null; syncMirror(db, x); }
  });
}
/**
 * Edits a recurring card as seen from `view`. Name, category, currency and due day apply to every month.
 * The amount applies to `view` and, by scope:
 *  - 'future' (default): also to the following months, dropping amounts typed for unpaid later months;
 *  - 'one': to this month only, so the next month keeps the value it had before the edit.
 */
export function editRecurring(db, tplId, view, form, scope = 'future') {
  const t = db.recurring.find((x) => x.id === tplId);
  if (!t) return;
  const next = addM(view, 1);
  const nextBefore = recAmount(t, next);
  const changed = form.amount !== recAmount(t, view);
  Object.assign(t, { desc: form.desc, category: form.category, currency: form.currency, dueDay: form.dueDay, person: form.person || null, payTo: form.person ? null : form.payTo || null });
  if (!changed) return; // same value: leave every month's amount as it is
  t.amounts[view] = form.amount;
  if (scope === 'one') {
    if (t.amounts[next] == null) t.amounts[next] = nextBefore;
  } else {
    Object.keys(t.amounts).forEach((k) => { if (k > view && !(t.paid && t.paid[k]) && !(t.received && t.received[k])) delete t.amounts[k]; });
  }
}
export function deleteEntry(db, id, scope) {
  const e = db.entries.find((x) => x.id === id);
  if (!e) return;
  const gone = scope === 'future' && e.seriesId ? seriesFrom(db, e) : [e];
  gone.forEach((x) => removeMirrorIfUnpaid(db, x.id));
  const ids = new Set(gone.map((x) => x.id));
  db.entries = db.entries.filter((x) => !ids.has(x.id));
}
/** Ends a recurring card from `view` on; earlier months stay in the history. */
export function endRecurring(db, tplId, view) {
  const t = db.recurring.find((x) => x.id === tplId);
  if (t) t.endMonth = view;
}
export function normalize(db) {
  if (!db || !db.settings) return structuredClone(DEF_DB);
  db.settings = { ...structuredClone(DEF_DB.settings), ...db.settings };
  db.months = db.months || {}; db.entries = db.entries || []; db.recurring = db.recurring || []; db.ledger = db.ledger || [];
  db.recurring.forEach((t) => { t.amounts = t.amounts || {}; t.paid = t.paid || {}; t.received = t.received || {}; });
  return db;
}

// ---------- family ledger: loans, repayments, shared expenses and the running balance per person ----------
// A positive balance means the person owes me; a negative one means I owe them.
//
// A ledger entry: { id, person, kind, desc, amount, currency, date, month, settledIn?, closedIn?, paidBy?, myShare? }
//  - month: the month whose totals it counts in (older entries have none and use the date's month);
//  - settledIn: the month a debt was marked as paid, one entry at a time;
//  - closedIn: the month "Quitar" closed a loose payment so it stops counting in the balance.
export const LEDGER_KINDS = [
  { value: 'loan', label: 'Emprestei dinheiro' },
  { value: 'borrowCash', label: 'Peguei dinheiro emprestado' },
  { value: 'borrow', label: 'Pagou algo por mim' },
  { value: 'shared', label: 'Despesa dividida' },
  { value: 'repay', label: 'Recebi um pagamento avulso' },
  { value: 'payback', label: 'Fiz um pagamento avulso' },
];
/** Debts: entries that stay open until marked as paid. The other kinds are loose payments. */
const DEBT_KINDS = ['loan', 'borrowCash', 'borrow', 'shared'];
export const isDebt = (t) => DEBT_KINDS.includes(t.kind);
export const ledgerKindLabel = (k) => (k === 'offset' ? 'Abatimento no acerto' : (LEDGER_KINDS.find((x) => x.value === k) || {}).label || k);
const round2 = (v) => Math.round(v * 100) / 100;
export const todayISO = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const txMonth = (t) => t.month || t.date.slice(0, 7);

/** How a ledger entry moves the balance while it is open, in BRL: positive = the person owes me more. */
export function ledgerEffect(db, tx) {
  const a = toBRL(db, tx.amount, tx.currency);
  const share = Math.min(100, Math.max(0, tx.myShare == null ? 50 : tx.myShare)) / 100;
  switch (tx.kind) {
    case 'loan': case 'payback': return a;
    case 'repay': case 'borrow': case 'borrowCash': return -a;
    case 'offset': return a; // written by settlePerson; cancels expenses of mine that were paid to the person
    case 'shared': return tx.paidBy === 'them' ? -a * share : a * (1 - share);
    default: return 0;
  }
}
/**
 * The cash a ledger entry moves in my own totals: [{ month, value }], positive = money in.
 *  - loan: out when made, back in when marked as paid;
 *  - borrowCash: in when taken, out when marked as paid;
 *  - borrow / shared: nothing when logged (no cash moved), the owed part in or out when marked as paid;
 *  - repay / payback: in / out in their month;
 *  - offset: none.
 */
export function txFlows(db, t) {
  const a = toBRL(db, t.amount, t.currency), m = txMonth(t), flows = [];
  if (t.kind === 'loan') flows.push({ month: m, value: -a });
  if (t.kind === 'borrowCash' || t.kind === 'repay') flows.push({ month: m, value: a });
  if (t.kind === 'payback') flows.push({ month: m, value: -a });
  if (isDebt(t) && t.settledIn) flows.push({ month: t.settledIn, value: ledgerEffect(db, t) });
  return flows.filter((f) => Math.abs(f.value) >= 0.005);
}
/** Still counts in the balance at the end of month `upTo`? */
const txOpen = (t, upTo) => !(t.settledIn && t.settledIn <= upTo) && !(t.closedIn && t.closedIn <= upTo);
/** Everyone the ledger knows: the people in settings plus anyone who appears in the data. */
export function familyPeople(db) {
  const s = new Set(db.settings.people);
  db.entries.forEach((e) => { if (e.type === 'exp') { if (e.person) s.add(e.person); if (e.payTo) s.add(e.payTo); } });
  db.recurring.forEach((t) => { if (t.person) s.add(t.person); if (t.payTo) s.add(t.payTo); });
  db.ledger.forEach((t) => s.add(t.person));
  return [...s];
}
/** Bills I covered for the person that they have not paid back, in every month up to `upTo`. */
export function openCovered(db, person, upTo) {
  const open = [];
  db.entries.forEach((e) => {
    if (e.type !== 'exp' || e.person !== person || e.month > upTo) return;
    const mir = mirrorOf(db, e.id);
    if (!(mir && mir.paid)) open.push({ id: e.id, month: e.month, desc: e.desc, value: valBRL(db, e), seriesIdx: e.seriesIdx, seriesN: e.seriesN });
  });
  db.recurring.forEach((t) => {
    if (t.person !== person) return;
    let m = t.startMonth;
    for (let i = 0; i < 240 && m <= upTo; i++) {
      if (recActive(t, m) && !(t.received && t.received[m])) open.push({ id: 'v:' + t.id, month: m, desc: t.desc, value: toBRL(db, recAmount(t, m), t.currency || 'BRL'), virt: true });
      m = addM(m, 1);
    }
  });
  return open.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
}
/** My own expenses that are paid to the person, in every month up to `upTo`. Each one is subtracted from what they owe me. */
export function paidToPerson(db, person, upTo) {
  const list = [];
  db.entries.forEach((e) => {
    if (e.type === 'exp' && !e.person && e.payTo === person && e.month <= upTo) list.push({ id: e.id, month: e.month, desc: e.desc, value: valBRL(db, e), seriesIdx: e.seriesIdx, seriesN: e.seriesN });
  });
  db.recurring.forEach((t) => {
    if (t.person || t.payTo !== person) return;
    let m = t.startMonth;
    for (let i = 0; i < 240 && m <= upTo; i++) {
      if (recActive(t, m)) list.push({ id: 'v:' + t.id, month: m, desc: t.desc, value: toBRL(db, recAmount(t, m), t.currency || 'BRL'), virt: true });
      m = addM(m, 1);
    }
  });
  return list.sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0));
}
/**
 * Running balance with one person at the end of month `upTo`:
 *   covered bills still open + open ledger entries − my expenses paid to them that were not yet settled.
 * `txs` lists every ledger entry up to that month (newest first), each with `effect` and `open`.
 */
export function personBalance(db, person, upTo) {
  const open = openCovered(db, person, upTo);
  const all = db.ledger.filter((t) => t.person === person && txMonth(t) <= upTo)
    .map((t) => ({ ...t, effect: ledgerEffect(db, t), open: txOpen(t, upTo) }))
    .sort((a, b) => (txMonth(a) < txMonth(b) ? 1 : txMonth(a) > txMonth(b) ? -1 : a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const offsets = paidToPerson(db, person, upTo);
  const covered = round2(open.reduce((s, e) => s + e.value, 0));
  const ledger = round2(all.filter((t) => t.open && t.kind !== 'offset').reduce((s, t) => s + t.effect, 0));
  // expenses of mine paid to the person, minus what earlier settlements already cleared
  const offset = round2(offsets.reduce((s, e) => s + e.value, 0) - all.filter((t) => t.kind === 'offset').reduce((s, t) => s + t.effect, 0));
  const rest = round2(ledger - offset);
  return { open, txs: all.filter((t) => t.kind !== 'offset'), offsets, covered, ledger, offset, rest, net: round2(covered + rest) };
}
export function familyBalances(db, upTo) {
  return familyPeople(db).map((person) => ({ person, ...personBalance(db, person, upTo) }));
}
export function saveTx(db, id, tx) {
  if (id) { const t = db.ledger.find((x) => x.id === id); if (t) Object.assign(t, tx); } else db.ledger.push({ id: uid(), ...tx });
}
/** Deleting an entry removes everything it did: the balance effect and its cash in my totals, paid or not. */
export function deleteTx(db, id) { db.ledger = db.ledger.filter((t) => t.id !== id); }
/** Marks one debt as paid in month `inMonth` (or open again). The cash returns to, or leaves, that month's totals. */
export function toggleTxSettled(db, id, val, inMonth) {
  const t = db.ledger.find((x) => x.id === id);
  if (!t || !isDebt(t)) return;
  if (val) t.settledIn = inMonth; else delete t.settledIn;
}
/**
 * Settles everything with a person as of month `upTo`, so the balance returns to zero:
 *  - open covered bills are marked as received;
 *  - every open debt in the ledger is marked as paid, one by one, so deleting one later stays clean;
 *  - loose payments made before are closed, with one balancing entry so their cash is not counted twice;
 *  - my expenses paid to the person are cleared by a non-cash "offset" entry.
 * Returns the amount that changes hands (positive: they pay me; negative: I pay them).
 */
export function settlePerson(db, person, upTo) {
  const b = personBalance(db, person, upTo);
  const today = todayISO();
  const date = today.slice(0, 7) === upTo ? today : upTo + '-01';
  b.open.forEach((o) => toggleReceived(db, o.month, o.id, true, upTo));
  let loose = 0;
  b.txs.filter((x) => x.open).forEach((x) => {
    const t = db.ledger.find((y) => y.id === x.id);
    if (isDebt(t)) t.settledIn = upTo; else { t.closedIn = upTo; loose += x.effect; }
  });
  loose = round2(loose);
  if (Math.abs(loose) >= 0.005) {
    // e.g. lent 1000, got 400 loose before: the loan now returns 1000, so 400 goes back out to keep the total at 1000.
    db.ledger.push({ id: uid(), person, kind: loose > 0 ? 'repay' : 'payback', desc: 'Acerto: pagamentos avulsos já contados', amount: Math.abs(loose),
      currency: 'BRL', date, month: upTo, closedIn: upTo });
  }
  if (Math.abs(b.offset) >= 0.005) {
    db.ledger.push({ id: uid(), person, kind: 'offset', desc: 'Abatimento das suas despesas', amount: b.offset, currency: 'BRL', date, month: upTo });
  }
  return b.net;
}
