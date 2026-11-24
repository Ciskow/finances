// The dedicated screens: Despesas, Renda, Família, Período, Configurações.
import { useState } from 'react';
import { Moon, Search, Sun } from 'lucide-react';
import { useApp } from '../store.jsx';
import * as F from '../lib/finance.js';
import { Amount, Badge, Card, cx, Field, Segmented } from '../ui.jsx';
import { BonusForm, ExpenseList, FamilyFlowRow, FamilyPeople, IncomeList, RecurringList, SalaryBox } from '../parts.jsx';

function Stat({ label, value, tone, size = 'md', partEstimate }) {
  return (
    <div className="fin-card stat">
      <span className="fin-card-sub">{label}</span>
      <Amount value={value} size={size} tone={tone} partEstimate={partEstimate} />
    </div>
  );
}

export function Expenses() {
  const { db, view } = useApp();
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
        <Stat label="Despesas do mês" value={t.desp} partEstimate={t.est > 0.005} />
        <Stat label="Pagas" value={t.paid} />
        <Stat label="Pendentes" value={t.pend} partEstimate={t.est > 0.005} />
      </div>
      <Card title="Despesas" sub={F.mLabel(view)}>
        <div className="toolbar">
          <Segmented label="Filtrar despesas" value={filter} onChange={setFilter} className="filter"
            options={[{ value: 'all', label: 'Todas' }, { value: 'pending', label: 'Pendentes' }, { value: 'paid', label: 'Pagas' }]} />
          <label className="search">
            <Search aria-hidden="true" />
            <input className="fin-input" type="search" placeholder="Buscar por descrição ou categoria" aria-label="Buscar despesas" aria-keyshortcuts="/" data-search="" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        <div className="list"><ExpenseList rows={rows} empty={t.count ? 'Nenhuma despesa com esse filtro.' : undefined} />{filter !== 'pending' && !needle && <FamilyFlowRow dir="out" />}</div>
        <p className="fin-hint foot-note">{rows.length} {rows.length === 1 ? 'lançamento' : 'lançamentos'}{t.count !== rows.length ? ` de ${t.count}` : ''}. Clique em uma linha para editar. Valores com ≈ são estimados pela fatura anterior.</p>
      </Card>
      <Card title="Cartões recorrentes" sub="aparecem todo mês">
        <div className="list"><RecurringList showEnded /></div>
        <p className="fin-hint foot-note">Cada mês novo copia a fatura anterior, marcada com ≈, até você informar o valor real. Encerrar remove só os meses futuros.</p>
      </Card>
    </div>
  );
}

export function Income() {
  const { db, view } = useApp();
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
      <Card title="Renda" sub={F.mLabel(view)}>
        <div className="list"><IncomeList /></div>
        <SalaryBox />
        <BonusForm />
      </Card>
    </div>
  );
}

export function Family() {
  const { db, view } = useApp();
  const balances = F.familyBalances(db, view);
  const owedToMe = balances.reduce((s, b) => s + Math.max(0, b.net), 0);
  const iOwe = balances.reduce((s, b) => s + Math.max(0, -b.net), 0);
  const net = owedToMe - iOwe;
  return (
    <div className="page">
      <div className="stats">
        {owedToMe > 0.005 && iOwe > 0.005 && <Stat label="Te devem" value={owedToMe} tone="positive" />}
        {owedToMe > 0.005 && iOwe > 0.005 && <Stat label="Você deve" value={iOwe} tone="negative" />}
        <Stat label={net < -0.005 ? 'Saldo com a família: você deve' : net > 0.005 ? 'Saldo com a família: a seu favor' : 'Saldo com a família: quites'} value={Math.abs(net)} tone={net < -0.005 ? 'negative' : net > 0.005 ? 'positive' : undefined} />
      </div>
      <Card title="Família" sub={`saldo acumulado até ${F.mLabel(view)}, fora dos seus totais`}>
        <FamilyPeople />
        <p className="fin-hint foot-note">
          O saldo de cada pessoa soma as contas que você cobriu e ainda não recebeu, os empréstimos e as despesas divididas, menos o que você deve a ela.
        </p>
        <p className="fin-hint foot-note">
          Se a pessoa pagou uma conta específica, marque “Recebi” nela. Se pagou um valor solto, registre “Recebi um pagamento avulso”. Use só um dos dois para o mesmo dinheiro.
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
                <tr key={x.month} onClick={() => { goMonth(x.month); setPage('overview'); }}>
                  <td className="cap"><button type="button" className="link-btn" onClick={(e) => { e.stopPropagation(); goMonth(x.month); setPage('overview'); }}>{F.mLabel(x.month)}</button></td>
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
  const { db, commit, theme, setTheme, update } = useApp();
  const s = db.settings;
  const fromDb = () => ({
    usdRate: F.toInputNum(s.usdRate), hourlyRate: F.toInputNum(s.hourlyRate), hoursPerDay: F.toInputNum(s.hoursPerDay),
    people: s.people.join(', '), catExp: s.catExp.join('\n'), catInc: s.catInc.join('\n'),
  });
  const [f, setF] = useState(fromDb);
  const [saved, setSaved] = useState(() => JSON.stringify(fromDb()));
  const dirty = JSON.stringify(f) !== saved;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const lines = (t) => t.split('\n').map((x) => x.trim()).filter(Boolean);
  const save = (ev) => {
    ev.preventDefault();
    commit((d) => {
      Object.assign(d.settings, {
        usdRate: F.num(f.usdRate) || 1, hourlyRate: F.num(f.hourlyRate), hoursPerDay: F.num(f.hoursPerDay),
        people: f.people.split(',').map((x) => x.trim()).filter(Boolean), catExp: lines(f.catExp), catInc: lines(f.catInc),
      });
    }, 'Configurações salvas');
    setSaved(JSON.stringify(f));
  };
  return (
    <form className="page" onSubmit={save}>
      <Card title="Exibição" sub="vale na hora, sem salvar">
        <div className="form-grid">
          <div className="fin-field">
            <span className="fin-label" id="cf-cur-l">Moeda dos valores</span>
            <Segmented label="Moeda dos valores" value={s.display} onChange={(v) => update((d) => { d.settings.display = v; })}
              options={[{ value: 'BRL', label: 'Real (R$)' }, { value: 'USD', label: 'Dólar (US$)' }]} />
          </div>
          <div className="fin-field">
            <span className="fin-label">Tema</span>
            <Segmented label="Tema" value={theme} onChange={setTheme}
              options={[{ value: 'light', label: <><Sun aria-hidden="true" />Claro</> }, { value: 'dark', label: <><Moon aria-hidden="true" />Escuro</> }]} />
          </div>
        </div>
      </Card>
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
      <div className="page-actions">
        {dirty && <span className="fin-hint">Há alterações não salvas</span>}
        {dirty && <button type="button" className="fin-btn fin-btn-ghost" onClick={() => setF(JSON.parse(saved))}>Descartar</button>}
        <button type="submit" className="fin-btn fin-btn-primary" disabled={!dirty}>Salvar configurações</button>
      </div>
    </form>
  );
}
