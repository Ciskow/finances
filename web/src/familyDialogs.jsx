// Dialogs for the family ledger: a new loan, repayment or shared expense, and settling up.
import { useState } from 'react';
import { useApp } from './store.jsx';
import * as F from './lib/finance.js';
import { Field, Modal, Segmented } from './ui.jsx';

/** Words for a balance with one person. Positive: they owe me. */
export function netText(person, net, money) {
  if (net > 0.005) return { text: `${person} te deve ${money(net)}`, tone: 'pos' };
  if (net < -0.005) return { text: `Você deve ${money(-net)} a ${person}`, tone: 'neg' };
  return { text: 'Vocês estão quites', tone: 'muted' };
}

export function LedgerDialog() {
  const { db, view, dialog, closeDialog, update, toast, money } = useApp();
  const people = F.familyPeople(db);
  const existing = dialog.id ? db.ledger.find((t) => t.id === dialog.id) : null;
  const [f, setF] = useState(() => (existing
    ? { person: existing.person, kind: existing.kind, desc: existing.desc || '', amount: String(existing.amount), currency: existing.currency || 'BRL',
        date: existing.date, month: F.txMonth(existing), paidBy: existing.paidBy || 'me', myShare: String(existing.myShare == null ? 50 : existing.myShare) }
    : { person: dialog.person || people[0] || '', kind: 'loan', desc: '', amount: '', currency: 'BRL', date: F.todayISO(), month: view, paidBy: 'me', myShare: '50' }));
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const shared = f.kind === 'shared';
  const draft = { person: f.person, kind: f.kind, desc: f.desc.trim(), amount: F.num(f.amount), currency: f.currency, date: f.date, month: f.month,
    ...(shared ? { paidBy: f.paidBy, myShare: Math.min(100, Math.max(0, F.num(f.myShare))) } : {}) };
  const effect = F.ledgerEffect(db, draft);
  const who = f.person || 'a pessoa';
  // cash this entry moves in my own totals when it is logged (a loan leaves, borrowed cash or a payment arrives)
  const cash = { loan: -1, payback: -1, borrowCash: 1, repay: 1 }[f.kind] ? { loan: -1, payback: -1, borrowCash: 1, repay: 1 }[f.kind] * F.toBRL(db, draft.amount, draft.currency) : 0;

  function submit() {
    const errs = {};
    if (!f.person) errs.person = 'Escolha a pessoa';
    if (draft.amount <= 0) errs.amount = 'Informe um valor maior que zero';
    if (!/^\d{4}-\d{2}$/.test(f.month)) errs.month = 'Informe o mês';
    if (shared && (String(f.myShare).trim() === '' || F.num(f.myShare) < 0 || F.num(f.myShare) > 100)) errs.myShare = 'Informe de 0 a 100';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    update((d) => F.saveTx(d, existing && existing.id, { ...draft, desc: draft.desc || F.ledgerKindLabel(f.kind) }));
    toast(existing ? 'Alterações salvas' : 'Lançamento registrado');
    closeDialog();
  }
  function remove() {
    update((d) => F.deleteTx(d, existing.id));
    toast('Lançamento excluído');
    closeDialog();
  }

  if (!people.length) {
    return (
      <Modal title="Lançamento com a família" onClose={closeDialog} onSubmit={closeDialog}
        footer={<button type="submit" className="fin-btn fin-btn-primary">Entendi</button>}>
        <p className="confirm-text">Cadastre primeiro as pessoas da família em Configurações.</p>
      </Modal>
    );
  }

  const footer = (
    <>
      {existing && (confirmDelete
        ? <button type="button" className="fin-btn fin-btn-danger foot-left" onClick={remove}>Confirmar exclusão</button>
        : <button type="button" className="fin-btn fin-btn-ghost foot-left danger-text" onClick={() => setConfirmDelete(true)}>Excluir</button>)}
      <button type="button" className="fin-btn fin-btn-ghost" onClick={closeDialog}>Cancelar</button>
      <button type="submit" className="fin-btn fin-btn-primary">Salvar</button>
    </>
  );
  return (
    <Modal title={existing ? 'Editar lançamento com a família' : 'Novo lançamento com a família'} onClose={closeDialog} footer={footer} onSubmit={submit}>
      <div className="form-grid">
        <Field label="Pessoa" htmlFor="lg-person" error={errors.person}>
          <select id="lg-person" className="fin-input" value={f.person} onChange={set('person')}>
            {people.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="O que aconteceu" htmlFor="lg-kind">
          <select id="lg-kind" className="fin-input" value={f.kind} onChange={set('kind')}>
            {F.LEDGER_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            {f.kind === 'offset' && <option value="offset">{F.ledgerKindLabel('offset')}</option>}
          </select>
        </Field>
        {shared && (
          <div className="fin-field field-full">
            <span className="fin-label">Quem pagou a despesa</span>
            <Segmented label="Quem pagou a despesa" value={f.paidBy} onChange={(v) => setF((p) => ({ ...p, paidBy: v }))}
              options={[{ value: 'me', label: 'Eu paguei' }, { value: 'them', label: `${who} pagou` }]} />
          </div>
        )}
        <Field label={shared ? 'Valor total da despesa' : 'Valor'} htmlFor="lg-val" error={errors.amount}>
          <input id="lg-val" className="fin-input fin-input-money" inputMode="decimal" value={f.amount} onChange={set('amount')} placeholder="0,00" autoFocus />
        </Field>
        {shared ? (
          <Field label="Minha parte (%)" htmlFor="lg-share" hint="50 divide meio a meio" error={errors.myShare}>
            <input id="lg-share" className="fin-input fin-input-money" inputMode="decimal" value={f.myShare} onChange={set('myShare')} />
          </Field>
        ) : (
          <Field label="Moeda" htmlFor="lg-cur">
            <select id="lg-cur" className="fin-input" value={f.currency} onChange={set('currency')}>
              <option value="BRL">Real (R$)</option>
              <option value="USD">Dólar (US$)</option>
            </select>
          </Field>
        )}
        <Field label="Descrição" htmlFor="lg-desc" hint="Opcional">
          <input id="lg-desc" className="fin-input" value={f.desc} onChange={set('desc')} placeholder={shared ? 'Ex.: Mercado do mês' : 'Ex.: Conserto do carro'} />
        </Field>
        <Field label="Conta no mês" htmlFor="lg-month" hint="O mês em que o dinheiro entra ou sai do seu saldo" error={errors.month}>
          <input id="lg-month" className="fin-input" type="month" value={f.month} onChange={set('month')} />
        </Field>
      </div>
      {draft.amount > 0 && (
        <p className="note" role="status">
          {Math.abs(effect) < 0.005 ? 'Este lançamento não muda o saldo.'
            : effect > 0 ? `Com ${who}: ${money(effect)} a seu favor.`
            : `Com ${who}: ${money(-effect)} a favor de ${who}.`}
          {cash !== 0 && ` No seu saldo de ${/^\d{4}-\d{2}$/.test(f.month) ? F.mLabel(f.month) : 'mês'}: ${cash > 0 ? 'entram' : 'saem'} ${money(Math.abs(cash))}.`}
          {F.isDebt(draft) && ' Fica em aberto até você marcar como pago.'}
        </p>
      )}
    </Modal>
  );
}

/** Settle everything with one person as of the viewed month. */
export function SettleDialog() {
  const { db, view, dialog, closeDialog, update, toast, money } = useApp();
  const p = dialog.person;
  const b = F.personBalance(db, p, view);
  // What will count in my totals: received bills and a positive ledger come in; a negative ledger goes out.
  const cashIn = b.covered + Math.max(0, b.ledger), cashOut = Math.max(0, -b.ledger);
  const run = () => {
    update((d) => F.settlePerson(d, p, view));
    toast(`Contas com ${p} quitadas`);
    closeDialog();
  };
  const footer = (
    <>
      <button type="button" className="fin-btn fin-btn-ghost" onClick={closeDialog}>Cancelar</button>
      <button type="submit" className="fin-btn fin-btn-primary">
        {b.net > 0.005 ? `Registrar que recebi ${money(b.net)}` : b.net < -0.005 ? `Registrar que paguei ${money(-b.net)}` : 'Zerar as contas'}
      </button>
    </>
  );
  return (
    <Modal title={`Quitar contas com ${p}`} onClose={closeDialog} footer={footer} onSubmit={run}>
      <p className="confirm-text"><strong>{netText(p, b.net, money).text}</strong>, somando tudo até {F.mLabel(view)}.</p>
      <ul className="settle-list">
        <li><span>Contas que você cobriu, ainda em aberto ({b.open.length})</span><strong className="fin-num">{money(b.covered)}</strong></li>
        <li><span>Empréstimos, pagamentos e despesas divididas</span><strong className="fin-num">{money(b.ledger)}</strong></li>
        {b.offsets.length > 0 && <li><span>Suas despesas pagas a {p} ({b.offsets.length})</span><strong className="fin-num">{money(-b.offset)}</strong></li>}
      </ul>
      <p className="fin-hint">Ao confirmar, as contas em aberto são marcadas como recebidas e os empréstimos e dívidas em aberto, como pagos. O saldo com {p} volta a zero. {cashIn > 0.005 && ` Entram na sua renda de ${F.mLabel(view)}: ${money(cashIn)}.`}{cashOut > 0.005 && ` Saem do seu saldo de ${F.mLabel(view)}: ${money(cashOut)}.`}{b.offset > 0.005 && ` Suas despesas pagas a ${p} (${money(b.offset)}) já contam nas suas despesas e só são abatidas.`}</p>
    </Modal>
  );
}
