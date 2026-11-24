// Small presentational pieces built on the design system's `fin-` classes.
import { Children, cloneElement, isValidElement, useEffect, useId, useRef } from 'react';
import { Repeat, X } from 'lucide-react';
import { useApp } from './store.jsx';
import { fmt, splitAmount } from './lib/finance.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

/**
 * A money value with the whole part emphasised. `value` is in BRL.
 * Screen readers get the whole amount as one phrase; the split spans are visual only.
 * `estimate` prefixes ≈ and sets it in warning-ink, per the design system.
 */
export function Amount({ value, size = 'lg', tone, prefix, estimate, partEstimate }) {
  const { db } = useApp();
  const p = splitAmount(db, value);
  // `partEstimate`: a total that only includes some estimated values. The ≈ carries the warning colour,
  // the number keeps its own, and the caller explains the estimated part beside it.
  const approx = estimate || partEstimate;
  const spoken = (approx ? 'aproximadamente ' : '') + (prefix || '') + fmt(db, value);
  return (
    <span className={cx('fin-amount', `fin-amount-${size}`, estimate ? 'fin-amount-estimate' : tone && `fin-amount-${tone}`)}>
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true" className="amount-visual">
        {approx && <span className="amount-approx">≈</span>}
        {prefix && <span>{prefix}</span>}
        {p.neg && <span>−</span>}
        <span className="fin-amount-cur">{p.cur}</span>
        <span>{p.int}</span>
        <span className="fin-amount-dec">{p.dec}</span>
      </span>
    </span>
  );
}

/** A row amount: ≈ and warning-ink when it is an estimate. */
export function RowAmount({ value, estimate, className }) {
  const { money } = useApp();
  return (
    <span className={cx('fin-row-amount', estimate && 'est', className)}
      title={estimate ? 'Valor estimado: cópia da fatura anterior. Abra para informar o valor real.' : undefined}>
      {estimate && <><span aria-hidden="true">≈ </span><span className="sr-only">estimado, </span></>}
      {money(value)}
    </span>
  );
}

export function Card({ title, sub, action, className, children, ...rest }) {
  return (
    <section className={cx('fin-card', 'card', className)} {...rest}>
      {(title || action) && (
        <div className="card-head">
          <div className="fin-card-head">
            <h2 className="fin-card-title">{title}</h2>
            {sub && <span className="fin-card-sub">{sub}</span>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export const Badge = ({ tone, children }) => <span className={cx('fin-badge', tone && `fin-badge-${tone}`)}>{children}</span>;

/** Marks a recurring card with an icon instead of a word on every row. */
export const RecurringMark = () => (
  <span className="rec-mark" title="Cartão recorrente"><Repeat aria-hidden="true" /><span className="sr-only">recorrente</span></span>
);

export function EntryTags({ e }) {
  return (
    <>
      {e.virt && <RecurringMark />}
      {e.currency === 'USD' && <Badge>US$</Badge>}
      {e.seriesId && <Badge tone="info">Parcela {e.seriesIdx}/{e.seriesN}</Badge>}
      {e.salary && <Badge>salário</Badge>}
      {e.payTo && <Badge>pago a {e.payTo}</Badge>}
    </>
  );
}

export const Avatar = ({ name, size }) => (
  <i className={cx('fin-avatar', size === 'lg' && 'avatar-lg')} aria-hidden="true">{(name || '?')[0].toUpperCase()}</i>
);

export function IconButton({ label, danger, className, children, ...rest }) {
  return (
    <button type="button" className={cx('icon-btn', danger && 'icon-btn-danger', className)} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Segmented({ label, options, value, onChange, className }) {
  return (
    <div className={cx('fin-seg', className)} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className="fin-seg-item" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * A labelled field. The hint or error is linked to the first control inside, so a screen reader
 * reads it with the field, and an error marks the control as invalid.
 */
export function Field({ label, hint, error, full, children, htmlFor }) {
  const hintId = useId();
  const note = error || hint;
  let linked = false;
  const kids = Children.map(children, (c) => {
    if (linked || !isValidElement(c) || !['input', 'select', 'textarea'].includes(c.type)) return c;
    linked = true;
    return cloneElement(c, { 'aria-describedby': note ? hintId : undefined, 'aria-invalid': error ? true : undefined });
  });
  return (
    <div className={cx('fin-field', error && 'fin-field-error', full && 'field-full')}>
      <label className="fin-label" htmlFor={htmlFor}>{label}</label>
      {kids}
      {note && <span className="fin-hint" id={hintId} role={error ? 'alert' : undefined}>{note}</span>}
    </div>
  );
}

/** A round check with a 44px hit area around the 20px mark. */
export function Check({ checked, onChange, label }) {
  return (
    <label className="check-hit" title={label}>
      <input type="checkbox" className="fin-check" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} />
    </label>
  );
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>;
}

/** Segmented bar: `segments` = [{value, tone}], drawn in proportion. */
export function Bar({ segments, label }) {
  const shown = segments.filter((s) => s.value > 0);
  return (
    <div className="fin-bar" role="img" aria-label={label}>
      {shown.map((s, i) => <span key={i} className={`fin-bar-seg fin-tone-${s.tone}`} style={{ flex: s.value }} />)}
    </div>
  );
}

/**
 * A modal dialog. Focus goes to the control marked `data-autofocus` (else the first field),
 * and returns to where it was when the dialog closes. With `dirty`, a click on the backdrop
 * does nothing, so typed data is never lost by a stray click; Esc and Cancelar still close.
 */
export function Modal({ title, onClose, children, footer, onSubmit, dirty }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    const opener = document.activeElement;
    if (d && !d.open) d.showModal();
    const target = d.querySelector('[data-autofocus]') || d.querySelector('.modal-body input:not([type=checkbox]), .modal-body select, .modal-body textarea');
    if (target) target.focus();
    return () => { if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus(); };
  }, []);
  return (
    <dialog
      ref={ref} className="modal" aria-labelledby="modal-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current && !dirty) onClose(); }}
    >
      <form className="modal-inner" onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(e); }}>
        <header className="modal-head">
          <h2 id="modal-title">{title}</h2>
          <IconButton label="Fechar" onClick={onClose}><X /></IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </form>
    </dialog>
  );
}
