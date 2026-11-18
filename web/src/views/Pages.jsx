// The dedicated screens: Despesas, Renda, Família, Período, Configurações.
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useApp } from '../store.jsx';
import * as F from '../lib/finance.js';
import { Amount, Badge, Card, cx, Field, Segmented } from '../ui.jsx';
import { BonusForm, ExpenseList, FamilyFlowRow, FamilyPeople, IncomeList, RecurringList, SalaryBox } from '../parts.jsx';

function Stat({ label, value, tone, size = 'md' }) {
  return (
    <div className="fin-card stat">
      <span className="fin-card-sub">{label}</span>
      <Amount value={value} size={size} tone={tone} />
    </div>
  );
}

export function Expenses() {
  const { db, view, openNew } = useApp();
  const [filter, setFilter] = useState('all');
  const [q, setQ] = useState('');
  const t = F.totals(db, view);
  const needle = q.trim().toLowerCase();
  const rows = F.ownExp(db, view)
    .filter((e) => (filter === 'all' ? true : filter === 'paid' ? e.paid : !e.paid))
    .filter((e) => !needle || (e.desc + ' ' + (e.category || '')).toLowerCase().includes(needle));
  return (
    <div className="page">
      <div className="stats">
        <Stat label="Despesas do mês" value={t.desp} />
        <Stat label="Pagas" value={t.paid} />
        <Stat label="Pendentes" value={t.pend} tone={t.pend > 0 ? 'negative' : undefined} />
      </div>
      <Card title="Despesas" sub={F.mLabel(view)}
        action={<button type="button" className="fin-btn fin-btn-primary" onClick={() => openNew('exp')}><Plus />Despesa</button>}>
        <div className="toolbar">
          <Segmented label="Filtrar despesas" value={filter} onChange={setFilter} className="filter"
            options={[{ value: 'all', label: 'Todas' }, { value: 'pending', label: 'Pendentes' }, { value: 'paid', label: 'Pagas' }]} />
          <label className="search">
            <Search aria-hidden="true" />
            <input className="fin-input" type="search" placeholder="Buscar por descrição ou categoria" aria-label="Buscar despesas" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="list"><ExpenseList rows={rows} />{filter !== 'pending' && !needle && <FamilyFlowRow dir="out" />}</div>
        <p className="fin-hint foot-note">{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}{t.count !== rows.length ? ` de ${t.count}` : ''}. Clique em uma linha para editar.</p>
      </Card>
      <Card title="Cartões recorrentes" sub="aparecem todo mês">
        <div className="list"><RecurringList showEnded /></div>
        <p className="fin-hint foot-note">O valor de cada mês novo copia a fatura anterior até você editar. Encerrar remove só os meses futuros.</p>
      </Card>
    </div>
  );
}

export function Income() {
  const { db, view, openNew } = useApp();
  const inc = F.ownInc(db, view);
  const fam = F.famIn(db, view); // money received from the family counts as received income
  const received = inc.filter((e) => e.paid).reduce((s, e) => s + F.valBRL(db, e), 0) + fam;
  const total = inc.reduce((s, e) => s + F.valBRL(db, e), 0) + fam;
  return (
    <div className="page">
      <div className="stats">
        <Stat label="Renda do mês" value={total} tone="positive" />
        <Stat label="Já recebido" value={received} />
        <Stat label="A receber" value={total - received} />
      </div>
      <Card title="Renda" sub={F.mLabel(view)}
        action={<button type="button" className="fin-btn fin-btn-primary" onClick={() => openNew('inc')}><Plus />Renda</button>}>
        <div className="list"><IncomeList /></div>
        <SalaryBox />
        <BonusForm />
      </Card>
    </div>
  );
}

export function Family() {
  const { db, view, openLedger } = useApp();
  const balances = F.familyBalances(db, view);
  const owedToMe = balances.reduce((s, b) => s + Math.max(0, b.net), 0);
  const iOwe = balances.reduce((s, b) => s + Math.max(0, -b.net), 0);
  const net = owedToMe - iOwe;
  return (
    <div className="page">
      <div className="stats">
        <Stat label="Te devem" value={owedToMe} tone={owedToMe > 0 ? 'positive' : undefined} />
        <Stat label="Você deve" value={iOwe} tone={iOwe > 0 ? 'negative' : undefined} />
        <Stat label={net < -0.005 ? 'Saldo final: você deve' : net > 0.005 ? 'Saldo final: a seu favor' : 'Saldo final: quites'} value={Math.abs(net)} tone={net < -0.005 ? 'negative' : net > 0.005 ? 'positive' : undefined} />
      </div>
      <Card title="Família" sub={`saldo acumulado até ${F.mLabel(view)} · fora dos seus totais`}
        action={<button type="button" className="fin-btn fin-btn-primary" onClick={() => openLedger()}><Plus />Lançamento</button>}>
        <FamilyPeople />
        <p className="fin-hint foot-note">
          O saldo de cada pessoa soma as contas que você cobriu e ainda não recebeu, mais os empréstimos, pagamentos e despesas divididas, e desconta o que você deve a ela.
          Quando a pessoa pagar uma conta específica, marque “Recebi” nela; quando pagar um valor avulso, registre “Recebi um pagamento”. Não faça os dois para o mesmo dinheiro.
        </p>
      </Card>
    </div>
  );
}

export function Range() {
  const { db, view, money, goMonth, setPage } = useApp();
  const [from, setFrom] = useState(() => F.addM(view, -2));
  const [to, setTo] = useState(view);
  const r = F.rangeMonths(db, from || view, to || view);
  const econ = r.renda - r.desp, n = r.rows.length;
  const max = Math.max(...r.rows.map((x) => Math.max(x.renda, x.desp)), 1);
  return (
    <div className="page">
      <Card title="Período" sub={`${F.mLabel(r.from)} a ${F.mLabel(r.to)} · ${n} ${n > 1 ? 'meses' : 'mês'}`}>
        <div className="range-pick">
          <Field label="De" htmlFor="rg-from"><input id="rg-from" className="fin-input" type="month" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Até" htmlFor="rg-to"><input id="rg-to" className="fin-input" type="month" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
      </Card>
      <div className="stats">
        <Stat label={econ < 0 ? 'Negativo no período' : 'Economia no período'} value={econ} tone={econ < 0 ? 'negative' : 'positive'} size="lg" />
        <Stat label="Renda total" value={r.renda} />
        <Stat label="Despesas totais" value={r.desp} />
        <Stat label="Média mensal" value={econ / (n || 1)} tone={econ < 0 ? 'negative' : 'positive'} />
      </div>
      <Card title="Mês a mês" sub="clique em um mês para abrir">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr><th>Mês</th><th className="num">Renda</th><th className="num">Despesas</th><th className="num">Resultado</th><th className="bars-col">Renda e despesas</th></tr>
            </thead>
            <tbody>
              {r.rows.map((x) => (
                <tr key={x.month} onClick={() => { goMonth(x.month); setPage('overview'); }} tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') { goMonth(x.month); setPage('overview'); } }}>
                  <td className="cap">{F.mLabel(x.month)}</td>
                  <td className="num pos">{money(x.renda)}</td>
                  <td className="num">{money(x.desp)}</td>
                  <td className={cx('num', x.econ < 0 ? 'neg' : 'pos')}>{money(x.econ)}</td>
                  <td className="bars-col" aria-hidden="true">
                    <span className="mini-bar pos-bar" style={{ width: `${(x.renda / max) * 100}%` }} />
                    <span className="mini-bar" style={{ width: `${(x.desp / max) * 100}%` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

export function Settings() {
  const { db, update, toast } = useApp();
  const s = db.settings;
  const [f, setF] = useState(() => ({
    usdRate: String(s.usdRate), hourlyRate: String(s.hourlyRate), hoursPerDay: String(s.hoursPerDay),
    people: s.people.join(', '), catExp: s.catExp.join('\n'), catInc: s.catInc.join('\n'),
  }));
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  const save = (ev) => {
    ev.preventDefault();
    update((d) => {
      Object.assign(d.settings, {
        usdRate: F.num(f.usdRate) || 1, hourlyRate: F.num(f.hourlyRate), hoursPerDay: F.num(f.hoursPerDay),
        people: f.people.split(',').map((x) => x.trim()).filter(Boolean), catExp: lines(f.catExp), catInc: lines(f.catInc),
      });
    });
    toast('Configurações salvas');
  };
  return (
    <form className="page" onSubmit={save}>
      <Card title="Salário e câmbio">
        <div className="form-grid three">
          <Field label="Valor da hora (R$)" htmlFor="cf-rate" hint="Usado para gerar o salário do mês">
            <input id="cf-rate" className="fin-input fin-input-money" inputMode="decimal" value={f.hourlyRate} onChange={set('hourlyRate')} />
          </Field>
          <Field label="Horas por dia" htmlFor="cf-hours">
            <input id="cf-hours" className="fin-input fin-input-money" inputMode="decimal" value={f.hoursPerDay} onChange={set('hoursPerDay')} />
          </Field>
          <Field label="Cotação do dólar (R$)" htmlFor="cf-usd" hint="Converte lançamentos em US$">
            <input id="cf-usd" className="fin-input fin-input-money" inputMode="decimal" value={f.usdRate} onChange={set('usdRate')} />
          </Field>
        </div>
      </Card>
      <Card title="Família">
        <Field label="Pessoas" htmlFor="cf-people" hint="Separe os nomes por vírgula">
          <input id="cf-people" className="fin-input" value={f.people} onChange={set('people')} />
        </Field>
      </Card>
      <Card title="Categorias">
        <div className="form-grid">
          <Field label="Categorias de despesa" htmlFor="cf-cate" hint="Uma por linha">
            <textarea id="cf-cate" className="fin-input area" value={f.catExp} onChange={set('catExp')} />
          </Field>
          <Field label="Categorias de renda" htmlFor="cf-cati" hint="Uma por linha">
            <textarea id="cf-cati" className="fin-input area" value={f.catInc} onChange={set('catInc')} />
          </Field>
        </div>
      </Card>
      <div className="page-actions"><button type="submit" className="fin-btn fin-btn-primary">Salvar configurações</button></div>
    </form>
  );
}
