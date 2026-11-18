// Small presentational pieces built on the design system's `fin-` classes.
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useApp } from './store.jsx';
import { splitAmount } from './lib/finance.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

/** A money value with the whole part emphasised. `value` is in BRL. */
export function Amount({ value, size = 'lg', tone, prefix }) {
  const { db } = useApp();
  const p = splitAmount(db, value);
  return (
    <span className={cx('fin-amount', `fin-amount-${size}`, tone && `fin-amount-${tone}`)}>
      {prefix && <span>{prefix}</span>}
      {p.neg && <span>−</span>}
      <span className="fin-amount-cur">{p.cur}</span>
      <span>{p.int}</span>
      <span className="fin-amount-dec">{p.dec}</span>
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

export function EntryTags({ e }) {
  return (
    <>
      {e.currency === 'USD' && <Badge>US$</Badge>}
      {e.seriesId && <Badge tone="info">Parcela {e.seriesIdx}/{e.seriesN}</Badge>}
      {e.virt && <Badge>recorrente</Badge>}
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

export function Field({ label, hint, error, full, children, htmlFor }) {
  return (
    <div className={cx('fin-field', error && 'fin-field-error', full && 'field-full')}>
      <label className="fin-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {(error || hint) && <span className="fin-hint">{error || hint}</span>}
    </div>
  );
}

export function Check({ checked, onChange, label }) {
  return <input type="checkbox" className="fin-check" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-label={label} title={label} />;
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

export function Modal({ title, onClose, children, footer, onSubmit }) {
  const ref = useRef(null);
  useEffect(() => { const d = ref.current; if (d && !d.open) d.showModal(); }, []);
  return (
    <dialog
      ref={ref} className="modal" aria-label={title}
      onClose={onClose}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <form className="modal-inner" onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(e); }}>
        <header className="modal-head">
          <h2>{title}</h2>
          <IconButton label="Fechar" onClick={onClose}><X /></IconButton>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </form>
    </dialog>
  );
}
