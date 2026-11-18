// Building blocks shared by the overview and the dedicated screens.
import { useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2, Zap } from 'lucide-react';
import { useApp } from './store.jsx';
import * as F from './lib/finance.js';
import { Avatar, Check, cx, Empty, EntryTags, IconButton } from './ui.jsx';
import { netText } from './familyDialogs.jsx';

const dueLabel = (e) => (e.dueDay ? 'dia ' + String(e.dueDay).padStart(2, '0') : null);

/** One entry line: check, label (opens the editor), amount, actions. */
export function EntryRow({ e, checked, onCheck, checkLabel, second, done = checked, meta, tone, actions = true }) {
  const { db, money, openEdit, askDelete } = useApp();
  const metaParts = meta ?? [e.category, dueLabel(e)].filter(Boolean);
  const first = <Check checked={checked} onChange={onCheck} label={checkLabel} />;
  return (
    <div className="fin-row row" data-done={done ? 'true' : 'false'}>
      {second ? <><span className="check-col">{first}</span><span className="check-col">{second}</span></> : first}
      <button type="button" className="fin-row-main row-main" onClick={() => openEdit(e.id)} title="Editar">
        <span className="fin-row-label">{e.desc} <EntryTags e={e} /></span>
        {metaParts.length > 0 && <span className="fin-row-meta">{e.person && <Avatar name={e.person} />}{[e.person, ...metaParts].filter(Boolean).join(' · ')}</span>}
      </button>
      <span className={cx('fin-row-amount', tone)}>{money(F.valBRL(db, e))}</span>
      {actions && (
        <span className="row-actions">
          <IconButton label="Editar" onClick={() => openEdit(e.id)}><Pencil /></IconButton>
          <IconButton label={e.virt ? 'Encerrar recorrência' : 'Excluir'} danger onClick={() => askDelete(e.id)}><Trash2 /></IconButton>
        </span>
      )}
    </div>
  );
}

export function ExpenseList({ rows, actions }) {
  const { togglePaid } = useApp();
  if (!rows.length) return <Empty>Nenhuma despesa aqui. Use “Adicionar” para lançar a primeira.</Empty>;
  return rows.map((e) => (
    <EntryRow key={e.id} e={e} checked={!!e.paid} onCheck={(v) => togglePaid(e.id, v)} checkLabel={e.paid ? 'Marcar como pendente' : 'Marcar como paga'} actions={actions} />
  ));
}

export function IncomeList({ actions }) {
  const { db, view, update } = useApp();
  const rows = F.ownInc(db, view);
  const fam = F.famIn(db, view);
  if (!rows.length && fam <= 0) return <Empty>Nenhuma renda neste mês. Gere o salário abaixo ou adicione uma renda.</Empty>;
  return (
    <>
      {rows.map((e) => (
        <EntryRow key={e.id} e={e} checked={!!e.paid} onCheck={(v) => update((d) => F.togglePaid(d, view, e.id, v))}
          checkLabel={e.paid ? 'Marcar como não recebida' : 'Marcar como recebida'} meta={[e.category].filter(Boolean)} tone="pos" actions={actions} />
      ))}
      <FamilyFlowRow dir="in" />
    </>
  );
}

/** Summary line for money received from (dir="in") or handed to (dir="out") the family this month. Opens Família. */
export function FamilyFlowRow({ dir }) {
  const { db, view, money, setPage } = useApp();
  const v = dir === 'in' ? F.famIn(db, view) : F.famOut(db, view);
  if (v <= 0) return null;
  return (
    <div className="fin-row row" data-done="false">
      <button type="button" className="fin-row-main row-main" onClick={() => setPage('family')} title="Abrir Família">
        <span className="fin-row-label">{dir === 'in' ? 'Recebido da família' : 'Emprestado ou pago à família'}</span>
        <span className="fin-row-meta">{dir === 'in' ? 'contas e pagamentos marcados como recebidos neste mês' : 'empréstimos e pagamentos feitos neste mês'}</span>
      </button>
      <span className={cx('fin-row-amount', dir === 'in' && 'pos')}>{money(v)}</span>
    </div>
  );
}

/** Salary = hourly rate × hours per day × business days of the month. */
export function SalaryBox() {
  const { db, view, update, toast, money, setPage } = useApp();
  const s = F.salaryInfo(db, view);
  if (s.rate <= 0) {
    return (
      <div className="fin-well salary">
        <span className="muted">Defina o valor da sua hora para gerar o salário do mês.</span>
        <button type="button" className="fin-btn" onClick={() => setPage('settings')}>Abrir configurações</button>
      </div>
    );
  }
  return (
    <div className="fin-well salary">
      <span className="salary-formula">
        <span className="muted">Salário</span>
        <span className="fin-num">R$ {s.rate.toLocaleString('pt-BR')}/h × {s.hours}h ×</span>
        <input className="fin-input days" type="number" min="0" value={s.days} aria-label="Dias úteis do mês"
          title={`Dias úteis (automático: ${s.auto})`} onChange={(e) => update((d) => F.setBizDays(d, view, F.num(e.target.value)))} />
        <span className="muted">dias úteis</span>
        {s.manual && <IconButton label={`Voltar ao automático (${s.auto} dias)`} onClick={() => update((d) => F.setBizDays(d, view, null))}><RotateCcw /></IconButton>}
        <strong className="fin-num">= {money(s.value)}</strong>
      </span>
      <button type="button" className="fin-btn" onClick={() => { update((d) => F.genSalary(d, view)); toast(s.exists ? 'Salário atualizado' : 'Salário gerado'); }}>
        <Zap />{s.exists ? 'Atualizar salário' : 'Gerar salário'}
      </button>
    </div>
  );
}

export function BonusForm() {
  const { view, update, toast } = useApp();
  const [desc, setDesc] = useState('');
  const [val, setVal] = useState('');
  const submit = (ev) => {
    ev.preventDefault();
    if (!desc.trim() || F.num(val) <= 0) { toast('Preencha a descrição e o valor do bônus'); return; }
    update((d) => F.addBonus(d, view, desc.trim(), F.num(val)));
    setDesc(''); setVal('');
    toast('Bônus adicionado');
  };
  return (
    <form className="bonus" onSubmit={submit}>
      <input className="fin-input" placeholder="Bônus: descrição" aria-label="Descrição do bônus" value={desc} onChange={(e) => setDesc(e.target.value)} />
      <input className="fin-input fin-input-money" placeholder="0,00" inputMode="decimal" aria-label="Valor do bônus" value={val} onChange={(e) => setVal(e.target.value)} />
      <button type="submit" className="fin-btn"><Plus />Bônus</button>
    </form>
  );
}

const shortDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' }).replace('.', '');

/**
 * One block per family member: the running balance (who owes whom, everything up to the viewed month),
 * this month's bills with two checks (I paid the bill / the person paid me back) and, in the full version,
 * older open bills and the ledger of loans, repayments and shared expenses.
 */
export function FamilyPeople({ compact }) {
  const { db, view, money, togglePaid, update, openLedger, askSettle, openEdit } = useApp();
  const groups = F.familyGroups(db, view);
  let people = F.familyBalances(db, view).map((b) => ({ ...b, group: groups.find((g) => g.person === b.person) }));
  if (compact) people = people.filter((p) => p.group || Math.abs(p.net) >= 0.005);
  if (!people.length) {
    return <Empty>{compact ? 'Nada em aberto com a família até este mês.' : 'Cadastre as pessoas da família em Configurações para acompanhar as contas com elas.'}</Empty>;
  }
  return people.map((p) => {
    const net = netText(p.person, p.net, money);
    const older = p.open.filter((o) => o.month < view);
    const mine = p.offsets.filter((o) => o.month === view);
    return (
      <div className="person" key={p.person}>
        <div className="person-head">
          <span className="person-name"><Avatar name={p.person} size="lg" />{p.person}</span>
          <strong className={cx('person-net', net.tone)}>{net.text}</strong>
        </div>
        {compact && Math.abs(p.net) >= 0.005 && (
          <div className="person-sub">
            <span className="muted">{p.net > 0 ? 'Ao receber, o valor entra no seu saldo do mês.' : 'Ao pagar, o valor sai do seu saldo do mês.'}</span>
            <button type="button" className="fin-btn" onClick={() => askSettle(p.person)}>{p.net > 0 ? 'Marcar como recebido' : 'Marcar como pago'}</button>
          </div>
        )}
        {!compact && (
          <div className="person-sub">
            <span className="muted">Contas que você cobriu em aberto: <strong className="fin-num">{money(p.covered)}</strong> · Empréstimos, abatimentos e acertos: <strong className="fin-num">{money(p.rest)}</strong></span>
            <span className="person-actions">
              <button type="button" className="fin-btn" onClick={() => openLedger(p.person)}><Plus />Lançamento</button>
              {Math.abs(p.net) >= 0.005 && <button type="button" className="fin-btn" onClick={() => askSettle(p.person)}>Quitar</button>}
            </span>
          </div>
        )}
        {p.group && (
          <>
            <p className="fin-overline">Contas de {F.mLabel(view)}</p>
            <div className="two-checks-head" aria-hidden="true"><span>Paguei</span><span>Recebi</span></div>
            {p.group.rows.map((e) => (
              <EntryRow key={e.id} e={{ ...e, person: null }} checked={!!e.paid} onCheck={(v) => togglePaid(e.id, v)} checkLabel="Paguei a conta"
                done={e.received} actions={!compact} meta={[dueLabel(e)].filter(Boolean)}
                second={<Check checked={e.received} onChange={(v) => update((d) => F.toggleReceived(d, view, e.id, v))} label={`${p.person} me pagou`} />} />
            ))}
          </>
        )}
        {!compact && mine.length > 0 && (
          <>
            <p className="fin-overline">Suas despesas de {F.mLabel(view)} pagas a {p.person}</p>
            {mine.map((o) => (
              <div className="fin-row row" data-done="false" key={o.id}>
                <button type="button" className="fin-row-main row-main" onClick={() => openEdit(o.id)} title="Editar">
                  <span className="fin-row-label">{o.desc} {o.seriesN && <span className="fin-badge fin-badge-info">Parcela {o.seriesIdx}/{o.seriesN}</span>}{o.virt && <span className="fin-badge">recorrente</span>}</span>
                  <span className="fin-row-meta">abate do que {p.person} te deve</span>
                </button>
                <span className="fin-row-amount neg">{money(-o.value)}</span>
              </div>
            ))}
          </>
        )}
        {!compact && older.length > 0 && (
          <>
            <p className="fin-overline">Contas de meses anteriores ainda não recebidas</p>
            {older.map((o) => (
              <div className="fin-row row" data-done="false" key={o.id + o.month}>
                <Check checked={false} onChange={() => update((d) => F.toggleReceived(d, o.month, o.id, true, view))} label={`${p.person} me pagou`} />
                <span className="fin-row-main">
                  <span className="fin-row-label">{o.desc} {o.seriesN && <span className="fin-badge fin-badge-info">Parcela {o.seriesIdx}/{o.seriesN}</span>}{o.virt && <span className="fin-badge">recorrente</span>}</span>
                  <span className="fin-row-meta">{F.mLabel(o.month)}</span>
                </span>
                <span className="fin-row-amount">{money(o.value)}</span>
              </div>
            ))}
          </>
        )}
        {!compact && p.txs.length > 0 && (
          <>
            <p className="fin-overline">Empréstimos, dívidas e pagamentos · marque quando for pago</p>
            {p.txs.map((t) => (
              <div className="fin-row row" data-done={t.open ? 'false' : 'true'} key={t.id}>
                {F.isDebt(t)
                  ? <Check checked={!t.open} onChange={(v) => update((d) => F.toggleTxSettled(d, t.id, v, view))} label={t.effect > 0 ? `${p.person} me pagou de volta` : `Paguei a ${p.person}`} />
                  : <span className="check-spacer" aria-hidden="true" />}
                <button type="button" className="fin-row-main row-main" onClick={() => openLedger(p.person, t.id)} title="Editar">
                  <span className="fin-row-label">{t.desc || F.ledgerKindLabel(t.kind)}</span>
                  <span className="fin-row-meta">
                    {[t.desc && t.desc !== F.ledgerKindLabel(t.kind) && F.ledgerKindLabel(t.kind), t.kind === 'shared' && `${t.paidBy === 'them' ? p.person + ' pagou' : 'eu paguei'} ${money(F.toBRL(db, t.amount, t.currency))}, minha parte ${t.myShare == null ? 50 : t.myShare}%`, F.mLabel(F.txMonth(t)), t.settledIn && t.settledIn <= view && `pago em ${F.mLabel(t.settledIn)}`, t.closedIn && t.closedIn <= view && 'quitado'].filter(Boolean).join(' · ')}
                  </span>
                </button>
                <span className={cx('fin-row-amount', t.effect < 0 ? 'neg' : 'pos')}>{t.effect < 0 ? '' : '+ '}{money(t.effect)}</span>
              </div>
            ))}
          </>
        )}
      </div>
    );
  });
}

export function RecurringList({ showEnded }) {
  const { db, view, money, openEdit, askDelete } = useApp();
  const list = db.recurring.filter((t) => showEnded || F.recActive(t, view));
  if (!list.length) return <Empty>Nenhum cartão recorrente. Marque “Cartão recorrente” ao adicionar uma despesa.</Empty>;
  return list.map((t) => {
    const active = F.recActive(t, view);
    return (
      <div className="fin-row row" key={t.id} data-done="false">
        <button type="button" className="fin-row-main row-main" disabled={!active} onClick={() => openEdit('v:' + t.id)}>
          <span className="fin-row-label">{t.desc} {t.endMonth != null && <span className="fin-badge">encerrado em {F.mLabel(t.endMonth)}</span>}</span>
          <span className="fin-row-meta">{[t.person && 'conta de ' + t.person, t.payTo && 'pago a ' + t.payTo, t.category, 'desde ' + F.mLabel(t.startMonth), t.dueDay && 'dia ' + String(t.dueDay).padStart(2, '0')].filter(Boolean).join(' · ')}</span>
        </button>
        <span className="fin-row-amount">{money(F.toBRL(db, F.recAmount(t, view), t.currency || 'BRL'))}</span>
        {t.endMonth == null && (
          <span className="row-actions">
            <IconButton label="Encerrar recorrência" danger onClick={() => askDelete('v:' + t.id)}><Trash2 /></IconButton>
          </span>
        )}
      </div>
    );
  });
}
