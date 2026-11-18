import { useState } from 'react';
import { Plus, RotateCcw, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../store.jsx';
import * as F from '../lib/finance.js';
import { Amount, Badge, Bar, Card, cx, Empty, IconButton } from '../ui.jsx';
import { BonusForm, ExpenseList, FamilyPeople, IncomeList, RecurringList, SalaryBox } from '../parts.jsx';

const pct = (v, total) => (total > 0 ? Math.round((v / total) * 100) : 0);

/** Opening balance: typed value, or carried over from the previous month. Commits on blur or Enter. */
function SaldoInput({ value, manual }) {
  const { view, update } = useApp();
  const [text, setText] = useState(value.toFixed(2));
  const commit = () => { if (F.num(text) !== +value.toFixed(2)) update((d) => F.setSaldo(d, view, F.num(text))); };
  return (
    <span className="saldo-edit">
      <input className="fin-input fin-input-money" type="number" step="0.01" value={text} aria-label="Saldo inicial em reais"
        onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }} />
      {manual && <IconButton label="Voltar ao saldo automático" onClick={() => update((d) => F.setSaldo(d, view, null))}><RotateCcw /></IconButton>}
    </span>
  );
}

function Hero() {
  const { db, view, money } = useApp();
  const t = F.totals(db, view);
  const si = F.saldoIni(db, view), sf = si + t.renda - t.desp;
  const manual = F.saldoIsManual(db, view);
  const sobra = Math.max(0, t.econ);
  return (
    <Card title="Saldo previsto" sub={`no fim de ${F.mLabel(view)}`} className="g-hero">
      <div className="hero-top">
        <Amount value={sf} size="xl" tone={sf < 0 ? 'negative' : undefined} />
        <div className="hero-note">
          {t.renda <= 0 ? <span className="muted">Nenhuma renda lançada neste mês</span>
            : t.econ >= 0 ? <span className="pos trend"><TrendingUp />{pct(t.econ, t.renda)}% da renda livre</span>
            : <span className="neg trend"><TrendingDown />Despesas {pct(-t.econ, t.renda)}% acima da renda</span>}
          <span className="fin-card-sub">saldo inicial + renda − despesas, depois de pagar todas as contas</span>
        </div>
      </div>
      <Bar label={`Da renda: ${pct(t.paid, t.renda)}% em despesas pagas, ${pct(t.pend, t.renda)}% em despesas pendentes, ${pct(sobra, t.renda)}% de sobra`}
        segments={[{ value: t.paid, tone: 'deep' }, { value: t.pend, tone: 'primary' }, { value: sobra, tone: 'positive' }]} />
      <ul className="fin-legend hero-legend">
        <li>
          <span className="fin-legend-label">Saldo inicial{manual ? '' : ' · automático'}</span>
          <SaldoInput key={view + ':' + si.toFixed(2)} value={si} manual={manual} />
        </li>
        <li>
          <span className="fin-legend-label">Renda</span>
          <span className="fin-legend-value">{money(t.renda)}</span>
        </li>
        <li>
          <span className="fin-legend-label"><i className="fin-dot fin-tone-deep" />Despesas pagas</span>
          <span className="fin-legend-value">− {money(t.paid)} <small>{pct(t.paid, t.renda)}%</small></span>
        </li>
        <li>
          <span className="fin-legend-label"><i className="fin-dot fin-tone-primary" />Despesas pendentes</span>
          <span className="fin-legend-value">− {money(t.pend)} <small>{pct(t.pend, t.renda)}%</small></span>
        </li>
        <li>
          <span className="fin-legend-label"><i className={cx('fin-dot', t.econ < 0 ? 'fin-tone-neutral' : 'fin-tone-positive')} />{t.econ < 0 ? 'Falta no mês' : 'Sobra do mês'}</span>
          <span className={cx('fin-legend-value', t.econ < 0 ? 'neg' : 'pos')}>{money(t.econ)} <small>{pct(Math.abs(t.econ), t.renda)}%</small></span>
        </li>
      </ul>
    </Card>
  );
}

function Bills() {
  const { db, view, money } = useApp();
  const [day, setDay] = useState(null);
  const all = [...F.ownExp(db, view), ...F.famExp(db, view)].sort((a, b) => (a.dueDay || 99) - (b.dueDay || 99));
  const unpaid = all.filter((e) => !e.paid);
  const pending = unpaid.reduce((s, e) => s + F.valBRL(db, e), 0);
  const famPending = unpaid.filter((e) => e.person).reduce((s, e) => s + F.valBRL(db, e), 0);
  const days = [...new Set(all.map((e) => e.dueDay).filter(Boolean))].sort((a, b) => a - b);
  const rows = day == null ? all : all.filter((e) => e.dueDay === day);
  return (
    <Card title="Contas a pagar" sub={`${all.length - unpaid.length} de ${all.length} pagas`} className="g-bills">
      <Amount value={pending} size="lg" />
      <p className="fin-card-sub under">
        {unpaid.length === 0 && all.length > 0 ? 'Tudo pago neste mês' : `falta pagar${famPending > 0 ? `, incluindo ${money(famPending)} de contas da família` : ''}`}
      </p>
      {days.length > 0 && (
        <div className="day-chips" role="group" aria-label="Filtrar por dia de vencimento">
          <button type="button" className="day-chip" aria-pressed={day == null} onClick={() => setDay(null)}>Todas</button>
          {days.map((d) => {
            const open = unpaid.filter((e) => e.dueDay === d).length;
            return (
              <button type="button" key={d} className="day-chip" aria-pressed={day === d} onClick={() => setDay(day === d ? null : d)}
                aria-label={`Dia ${d}, ${open} ${open === 1 ? 'conta pendente' : 'contas pendentes'}`}>
                <span className="fin-num">{String(d).padStart(2, '0')}</span>
                <span className="day-dots" aria-hidden="true">{Array.from({ length: Math.min(open, 5) }, (_, i) => <i key={i} />)}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="scroll-list"><ExpenseList rows={rows} actions={false} /></div>
    </Card>
  );
}

function Categories() {
  const { db, view, money } = useApp();
  const cats = F.byCategory(db, view);
  const total = cats.reduce((s, c) => s + c.value, 0);
  const top = cats.slice(0, 6);
  const rest = cats.slice(6).reduce((s, c) => s + c.value, 0);
  if (rest > 0) top.push({ name: `Outras ${cats.length - 6} categorias`, value: rest });
  const max = Math.max(...top.map((c) => c.value), 1);
  return (
    <Card title="Para onde vai" sub="despesas por categoria" className="g-third">
      <Amount value={total} size="lg" />
      <p className="fin-card-sub under">total de despesas do mês</p>
      {top.length === 0 ? <Empty>Sem despesas neste mês.</Empty> : (
        <ul className="cat-list">
          {top.map((c) => (
            <li key={c.name}>
              <span className="cat-name">{c.name}</span>
              <span className="cat-value fin-num">{money(c.value)} <small>{pct(c.value, total)}%</small></span>
              <span className="cat-track"><span style={{ width: `${Math.max(2, (c.value / max) * 100)}%` }} /></span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Income() {
  const { db, view } = useApp();
  const inc = F.ownInc(db, view);
  const t = F.totals(db, view);
  return (
    <Card title="Renda" sub={`${inc.filter((e) => e.paid).length} de ${inc.length} recebidas`} className="g-third">
      <Amount value={t.renda} size="lg" tone="positive" />
      <p className="fin-card-sub under">entradas do mês</p>
      <div className="list"><IncomeList actions={false} /></div>
      <SalaryBox />
      <BonusForm />
    </Card>
  );
}

function Family() {
  const { db, view, openLedger } = useApp();
  const net = F.familyBalances(db, view).reduce((s, b) => s + b.net, 0);
  return (
    <Card title="Família" sub="fora dos seus totais" className="g-third"
      action={<button type="button" className="fin-btn fin-btn-ghost" onClick={() => openLedger()}><Plus />Lançamento</button>}>
      <Amount value={Math.abs(net)} size="lg" tone={net < -0.005 ? 'negative' : undefined} />
      <p className="fin-card-sub under">
        {net > 0.005 ? 'a família te deve' : net < -0.005 ? 'você deve à família' : 'tudo quitado com a família'}, somando contas, empréstimos e acertos até {F.mLabel(view)}
      </p>
      <FamilyPeople compact />
    </Card>
  );
}

/** Expenses already known for this month and the next two (instalments and recurring cards). */
function Upcoming() {
  const { db, view, money, goMonth } = useApp();
  const months = [0, 1, 2].map((k) => F.addM(view, k));
  const data = months.map((m) => ({ m, ...F.totals(db, m) }));
  const max = Math.max(...data.map((d) => d.desp), 1);
  const y = (v) => 10 + (1 - v / max) * 44;
  return (
    <Card title="Próximos meses" sub="despesas já previstas" className="g-third">
      <Amount value={data[0].desp} size="lg" />
      <p className="fin-card-sub under">em {F.mLabel(view)}, com parcelas e cartões recorrentes</p>
      <p className="fin-overline">Próximas faturas</p>
      <div className="upcoming">
        <svg className="upcoming-line" viewBox="0 0 300 64" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={data.map((d, i) => `${50 + i * 100},${y(d.desp)}`).join(' ')} fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
        {data.map((d, i) => (
          <button type="button" key={d.m} className="upcoming-tile" aria-pressed={i === 0} onClick={() => goMonth(d.m)}
            title={i === 0 ? undefined : `Ir para ${F.mLabel(d.m)}`}>
            <span className="upcoming-month">{F.monthShort(d.m)} {i > 0 && d.m.slice(2, 4)}</span>
            <i className="upcoming-dot" style={{ top: y(d.desp) + 28 }} aria-hidden="true" />
            <span className="upcoming-value fin-num">{money(d.desp)}</span>
            <span className={cx('upcoming-econ fin-num', d.econ < 0 ? 'neg' : 'pos')}>{d.econ < 0 ? 'falta ' : 'sobra '}{money(Math.abs(d.econ))}</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

function Recurring() {
  const { db, view, setPage } = useApp();
  const n = db.recurring.filter((t) => F.recActive(t, view)).length;
  return (
    <Card title="Cartões recorrentes" sub={`${n} ${n === 1 ? 'ativo' : 'ativos'}`} className="g-third"
      action={<button type="button" className="fin-btn fin-btn-ghost" onClick={() => setPage('expenses')}>Ver todos</button>}>
      <div className="list"><RecurringList /></div>
    </Card>
  );
}

export default function Overview() {
  const { view } = useApp();
  return (
    <div className="grid overview">
      <Hero />
      <Bills key={view} />
      <Categories />
      <Income />
      <Family />
      <Upcoming />
      <Recurring />
    </div>
  );
}
