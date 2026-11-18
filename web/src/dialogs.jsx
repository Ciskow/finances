import { useState } from 'react';
import { useApp } from './store.jsx';
import * as F from './lib/finance.js';
import { Field, Modal, Segmented } from './ui.jsx';

const NEW_PERSON = '__new__';

function initialForm(db, view, dialog) {
  if (dialog.mode === 'rec') {
    const t = db.recurring.find((x) => x.id === dialog.tplId);
    return t && { type: 'exp', desc: t.desc, amount: String(F.recAmount(t, view)), currency: t.currency || 'BRL', category: t.category || '', dueDay: t.dueDay || '', person: t.person || '', payTo: t.payTo || '' };
  }
  if (dialog.mode === 'edit') {
    const e = db.entries.find((x) => x.id === dialog.id);
    return e && { type: e.type, desc: e.desc, amount: String(e.amount), currency: e.currency || 'BRL', category: e.category || '', dueDay: e.dueDay || '', person: e.person || '', payTo: e.payTo || '', series: e.seriesId ? `${e.seriesIdx}/${e.seriesN}` : null };
  }
  return { type: dialog.type, desc: '', amount: '', currency: 'BRL', category: '', dueDay: '', person: '', payTo: '' };
}

export function EntryDialog() {
  const { db, view, dialog, closeDialog, update, toast, askDelete } = useApp();
  const [f, setF] = useState(() => initialForm(db, view, dialog));
  const [extra, setExtra] = useState({ parcelas: '1', recurring: false, newPerson: '' });
  const [errors, setErrors] = useState({});
  const [originalAmount] = useState(() => F.num(f ? f.amount : 0));
  if (!f) return null;

  const isNew = dialog.mode === 'new', isRec = dialog.mode === 'rec', isExp = f.type === 'exp';
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const cats = isExp ? db.settings.catExp : db.settings.catInc;
  const defaultCat = cats.includes(isExp ? 'Cartão' : 'Pagamento') ? (isExp ? 'Cartão' : 'Pagamento') : cats[0] || '';
  const category = cats.includes(f.category) || (!isNew && f.category) ? f.category : defaultCat;
  const catOptions = cats.includes(category) || !category ? cats : [category, ...cats];

  // Editing a recurring card's value: ask whether it holds for the coming months too.
  const recValueChanged = isRec && String(f.amount).trim() !== '' && F.num(f.amount) !== originalAmount;

  const title = isRec ? `Editar cartão recorrente (${F.mLabel(view)})`
    : isNew ? (isExp ? 'Nova despesa' : 'Nova renda')
    : (isExp ? 'Editar despesa' : 'Editar renda');

  function submit(scope) {
    const errs = {};
    const day = String(f.dueDay).trim() === '' ? null : Math.round(F.num(f.dueDay));
    if (day != null && (day < 1 || day > 31)) errs.dueDay = 'Informe um dia entre 1 e 31';
    if (String(f.amount).trim() === '' || F.num(f.amount) < 0) errs.amount = 'Informe um valor';
    let person = isExp ? f.person : '';
    if (person === NEW_PERSON) {
      person = extra.newPerson.trim();
      if (!person) errs.person = 'Informe o nome da pessoa';
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const form = { desc: f.desc.trim() || '(sem descrição)', amount: F.num(f.amount), currency: f.currency, category, dueDay: day, person: person || null, payTo: isExp && !person ? f.payTo || null : null };
    update((d) => {
      if (person && !d.settings.people.includes(person)) d.settings.people.push(person);
      if (isRec) F.editRecurring(d, dialog.tplId, view, form, scope);
      else if (isNew) F.addEntry(d, view, f.type, form, { recurring: extra.recurring, parcelas: F.num(extra.parcelas) });
      else F.editEntry(d, dialog.id, form, scope);
    });
    toast(isNew ? (isExp ? 'Despesa adicionada' : 'Renda adicionada') : 'Alterações salvas');
    closeDialog();
  }

  const footer = (
    <>
      {!isNew && (
        <button type="button" className="fin-btn fin-btn-ghost foot-left danger-text" onClick={() => askDelete(isRec ? 'v:' + dialog.tplId : dialog.id)}>
          {isRec ? 'Encerrar recorrência' : 'Excluir'}
        </button>
      )}
      <button type="button" className="fin-btn fin-btn-ghost" onClick={closeDialog}>Cancelar</button>
      {f.series ? (
        <>
          <button type="button" className="fin-btn" onClick={() => submit('one')}>Salvar só esta</button>
          <button type="submit" className="fin-btn fin-btn-primary">Salvar esta e as futuras</button>
        </>
      ) : recValueChanged ? (
        <>
          <button type="button" className="fin-btn" onClick={() => submit('one')}>Só neste mês</button>
          <button type="submit" className="fin-btn fin-btn-primary">Neste e nos próximos</button>
        </>
      ) : (
        <button type="submit" className="fin-btn fin-btn-primary">Salvar</button>
      )}
    </>
  );

  return (
    <Modal title={title} onClose={closeDialog} footer={footer} onSubmit={() => submit(f.series || isRec ? 'future' : 'one')}>
      {isNew && (
        <Segmented label="Tipo de lançamento" className="type-switch" value={f.type}
          options={[{ value: 'exp', label: 'Despesa' }, { value: 'inc', label: 'Renda' }]}
          onChange={(type) => setF((p) => ({ ...p, type, category: '' }))} />
      )}
      {f.series && <p className="note">Parcela {f.series} de uma compra parcelada. Escolha abaixo se a alteração vale só para esta ou também para as próximas.</p>}
      {recValueChanged && <p className="note" role="status">Você mudou o valor. Escolha abaixo se o novo valor vale só para {F.mLabel(view)} ou também para os próximos meses.</p>}
      <div className="form-grid">
        <Field label="Descrição" htmlFor="fe-desc" full>
          <input id="fe-desc" className="fin-input" value={f.desc} onChange={set('desc')} autoFocus placeholder={isExp ? 'Ex.: Condomínio' : 'Ex.: Freela'} />
        </Field>
        <Field label="Valor" htmlFor="fe-val" error={errors.amount}>
          <input id="fe-val" className="fin-input fin-input-money" inputMode="decimal" value={f.amount} onChange={set('amount')} placeholder="0,00" />
        </Field>
        <Field label="Moeda" htmlFor="fe-cur">
          <select id="fe-cur" className="fin-input" value={f.currency} onChange={set('currency')}>
            <option value="BRL">Real (R$)</option>
            <option value="USD">Dólar (US$)</option>
          </select>
        </Field>
        <Field label="Categoria" htmlFor="fe-cat">
          <select id="fe-cat" className="fin-input" value={category} onChange={set('category')}>
            {catOptions.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Dia de vencimento" htmlFor="fe-day" hint="Opcional" error={errors.dueDay}>
          <input id="fe-day" className="fin-input" inputMode="numeric" value={f.dueDay} onChange={set('dueDay')} placeholder="1 a 31" />
        </Field>
        {isExp && (
          <Field label="De quem é a conta" htmlFor="fe-person" hint="Contas da família geram um reembolso a receber" error={errors.person}>
            <select id="fe-person" className="fin-input" value={f.person} onChange={set('person')}>
              <option value="">Minha</option>
              {db.settings.people.map((p) => <option key={p}>{p}</option>)}
              {f.person && f.person !== NEW_PERSON && !db.settings.people.includes(f.person) && <option>{f.person}</option>}
              <option value={NEW_PERSON}>+ Nova pessoa…</option>
            </select>
            {f.person === NEW_PERSON && (
              <input className="fin-input" aria-label="Nome da nova pessoa" placeholder="Nome da pessoa" value={extra.newPerson}
                onChange={(e) => setExtra((p) => ({ ...p, newPerson: e.target.value }))} />
            )}
          </Field>
        )}
        {isExp && !f.person && (
          <Field label="Pago a alguém da família" htmlFor="fe-payto" hint="Continua sendo despesa sua; o valor abate do que a pessoa te deve">
            <select id="fe-payto" className="fin-input" value={f.payTo} onChange={set('payTo')}>
              <option value="">Não</option>
              {F.familyPeople(db).map((p) => <option key={p}>{p}</option>)}
            </select>
          </Field>
        )}
        {isExp && isNew && (
          <Field label="Parcelas" htmlFor="fe-parc" hint="Uma por mês, a partir deste">
            <input id="fe-parc" className="fin-input" type="number" min="1" value={extra.parcelas} disabled={extra.recurring}
              onChange={(e) => setExtra((p) => ({ ...p, parcelas: e.target.value }))} />
          </Field>
        )}
        {isExp && isNew && (
          <label className="check-line field-full">
            <input type="checkbox" className="fin-check" checked={extra.recurring} onChange={(e) => setExtra((p) => ({ ...p, recurring: e.target.checked }))} />
            <span>
              <strong>Cartão recorrente</strong>
              <small>Repete todo mês; cada mês novo copia o valor da fatura anterior até você editar.</small>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

export function DeleteDialog() {
  const { db, view, dialog, closeDialog, update, toast } = useApp();
  const isRec = dialog.id.startsWith('v:');
  const item = isRec ? db.recurring.find((t) => t.id === dialog.id.slice(2)) : db.entries.find((e) => e.id === dialog.id);
  if (!item) return null;
  const series = !isRec && item.seriesId;
  const run = (scope) => {
    update((d) => (isRec ? F.endRecurring(d, item.id, view) : F.deleteEntry(d, item.id, scope)));
    toast(isRec ? 'Cartão recorrente encerrado' : 'Lançamento excluído');
    closeDialog();
  };
  const footer = (
    <>
      <button type="button" className="fin-btn fin-btn-ghost" onClick={closeDialog}>Cancelar</button>
      {series && <button type="button" className="fin-btn" onClick={() => run('one')}>Só esta parcela</button>}
      <button type="submit" className="fin-btn fin-btn-danger">{isRec ? 'Encerrar' : series ? 'Esta e as futuras' : 'Excluir'}</button>
    </>
  );
  return (
    <Modal title={isRec ? 'Encerrar cartão recorrente' : 'Excluir lançamento'} onClose={closeDialog} footer={footer} onSubmit={() => run(series ? 'future' : 'one')}>
      <p className="confirm-text">
        {isRec
          ? <>Encerrar <strong>{item.desc}</strong> a partir de {F.mLabel(view)}? Os meses anteriores ficam no histórico.</>
          : series
            ? <>Excluir <strong>{item.desc}</strong>, parcela {item.seriesIdx} de {item.seriesN}. Quer excluir só esta ou também as próximas?</>
            : <>Excluir <strong>{item.desc}</strong>? Essa ação não pode ser desfeita.</>}
      </p>
    </Modal>
  );
}
