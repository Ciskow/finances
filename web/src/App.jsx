import { useEffect, useRef } from 'react';
import { CalendarRange, ChevronDown, ChevronLeft, ChevronRight, CreditCard, LayoutDashboard, Moon, Plus, Settings as SettingsIcon, Sun, Users, Wallet } from 'lucide-react';
import { useApp } from './store.jsx';
import * as F from './lib/finance.js';
import { cx, IconButton, Segmented } from './ui.jsx';
import { DeleteDialog, EntryDialog } from './dialogs.jsx';
import { LedgerDialog, SettleDialog } from './familyDialogs.jsx';
import Overview from './views/Overview.jsx';
import { Expenses, Family, Income, Range, Settings } from './views/Pages.jsx';

const NAV = [
  { id: 'overview', label: 'Visão geral', short: 'Início', icon: LayoutDashboard },
  { id: 'expenses', label: 'Despesas', short: 'Despesas', icon: CreditCard },
  { id: 'income', label: 'Renda', short: 'Renda', icon: Wallet },
  { id: 'family', label: 'Família', short: 'Família', icon: Users },
  { id: 'range', label: 'Período', short: 'Período', icon: CalendarRange },
];
const VIEWS = { overview: Overview, expenses: Expenses, income: Income, family: Family, range: Range, settings: Settings };

function Brand() {
  return (
    <div className="brand">
      <span className="brand-mark" aria-hidden="true">F</span>
      <span><strong>Finanças</strong><small>Ciskow</small></span>
    </div>
  );
}

function ThemeSwitch() {
  const { theme, setTheme } = useApp();
  return (
    <div className="fin-seg theme-switch" role="group" aria-label="Tema">
      <button type="button" className="fin-seg-item" aria-pressed={theme === 'light'} aria-label="Tema claro" title="Tema claro" onClick={() => setTheme('light')}><Sun /></button>
      <button type="button" className="fin-seg-item" aria-pressed={theme === 'dark'} aria-label="Tema escuro" title="Tema escuro" onClick={() => setTheme('dark')}><Moon /></button>
    </div>
  );
}

function Sidebar() {
  const { page, setPage } = useApp();
  const Item = ({ id, label, icon: Icon }) => (
    <button type="button" className="nav-item" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon />{label}</button>
  );
  return (
    <aside className="fin-card sidebar">
      <Brand />
      <nav aria-label="Seções">
        <p className="nav-label">Menu</p>
        {NAV.map((n) => <Item key={n.id} {...n} />)}
        <p className="nav-label">Ajustes</p>
        <Item id="settings" label="Configurações" icon={SettingsIcon} />
      </nav>
      <div className="sidebar-foot"><span className="muted">Tema</span><ThemeSwitch /></div>
    </aside>
  );
}

const SAVE_TEXT = { saved: 'Salvo', dirty: 'Salvando…', error: 'Não salvo' };
const PAGE_TITLE = { overview: 'Visão geral', expenses: 'Despesas', income: 'Renda', family: 'Família', range: 'Período', settings: 'Configurações' };

/** Save status. Quiet while it works; on failure it becomes a button that tries again. */
function SaveState() {
  const { saveState, persist } = useApp();
  if (saveState === 'error') {
    return <button type="button" className="save-state error" onClick={persist}><i aria-hidden="true" />Não salvo, tentar de novo</button>;
  }
  return <span className={cx('save-state', saveState)}><i aria-hidden="true" />{SAVE_TEXT[saveState]}</span>;
}

/** The add action follows the page: an expense, an income, or a family entry. */
function useAddAction() {
  const { page, openNew, openLedger } = useApp();
  if (page === 'settings' || page === 'range') return null;
  if (page === 'family') return { label: 'Lançamento', run: () => openLedger() };
  if (page === 'income') return { label: 'Renda', run: () => openNew('inc') };
  return { label: 'Adicionar', run: () => openNew('exp') };
}

function TopBar() {
  const { db, view, goMonth, update, page, setPage } = useApp();
  const add = useAddAction();
  const pick = useRef(null);
  const openPicker = () => { const el = pick.current; if (el.showPicker) el.showPicker(); else el.focus(); };
  // First month that still has bills to pay. On it, a status says so; elsewhere, a button goes there.
  const openMonth = F.earliestUnpaid(db);
  const hasUnpaid = [...F.ownExp(db, view), ...F.famExp(db, view)].some((e) => !e.paid);
  return (
    <header className="fin-card topbar">
      <div className="mobile-brand"><Brand /><span className="mobile-tools"><SaveState /><IconButton label="Configurações" className="icon-btn-touch" onClick={() => setPage('settings')} aria-current={page === 'settings' ? 'page' : undefined}><SettingsIcon /></IconButton></span></div>
      <div className="fin-month">
        <button type="button" className="fin-btn fin-btn-ghost fin-btn-icon" aria-label="Mês anterior" title="Mês anterior (←)" onClick={() => goMonth(F.addM(view, -1))}><ChevronLeft /></button>
        <button type="button" className="fin-btn fin-btn-ghost fin-btn-icon" aria-label="Próximo mês" title="Próximo mês (→)" onClick={() => goMonth(F.addM(view, 1))}><ChevronRight /></button>
        <span className="month-wrap">
          <button type="button" className="fin-month-title" onClick={openPicker} aria-label={`${F.mLabel(view)}, escolher outro mês`}>
            {F.monthName(view)} <span className="fin-month-year">{F.monthYear(view)}</span><ChevronDown />
          </button>
          <input ref={pick} className="month-pick" type="month" value={view} tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.value && goMonth(e.target.value)} />
        </span>
        {view === openMonth
          ? hasUnpaid && <span className="fin-badge fin-badge-info month-status">Mês em aberto</span>
          : <button type="button" className="fin-btn fin-btn-ghost today" title="Ir para o primeiro mês com contas a pagar" onClick={() => goMonth(openMonth)}>
              Ir para {F.monthName(openMonth)}{F.monthYear(openMonth) !== F.monthYear(view) ? ` de ${F.monthYear(openMonth)}` : ''}
            </button>}
      </div>
      <div className="topbar-right">
        <SaveState />
        <Segmented label="Moeda de exibição" className="currency" value={db.settings.display}
          options={[{ value: 'BRL', label: 'R$' }, { value: 'USD', label: 'US$' }]}
          onChange={(v) => update((d) => { d.settings.display = v; })} />
        {add && <button type="button" className="fin-btn fin-btn-primary add-desktop" onClick={add.run} aria-keyshortcuts="n" title={`${add.label} (N)`}><Plus />{add.label}</button>}
      </div>
    </header>
  );
}

function TabBar() {
  const { page, setPage } = useApp();
  const add = useAddAction();
  return (
    <div className="fin-tabbar-wrap tabbar-fixed">
      <nav className="fin-tabbar" aria-label="Seções">
        {NAV.map(({ id, short, icon: Icon }) => (
          <button type="button" key={id} className="fin-tab" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon />{short}</button>
        ))}
      </nav>
      {add && <button type="button" className="fin-btn fin-btn-fab" aria-label={add.label === 'Adicionar' ? 'Adicionar despesa' : `Adicionar ${add.label.toLowerCase()}`} onClick={add.run}><Plus /></button>}
    </div>
  );
}

/** Keys: N adds, ← → change month, / searches (Despesas). Ignored while typing or in a dialog. */
function useShortcuts(add) {
  const { view, goMonth, dialog, page } = useApp();
  useEffect(() => {
    const onKey = (e) => {
      if (dialog || e.ctrlKey || e.metaKey || e.altKey || !view) return;
      const t = e.target;
      if (t.closest && t.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (e.key === 'n' || e.key === 'N') { if (add) { e.preventDefault(); add.run(); } }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); goMonth(F.addM(view, -1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); goMonth(F.addM(view, 1)); }
      else if (e.key === '/' && page === 'expenses') { const el = document.querySelector('[data-search]'); if (el) { e.preventDefault(); el.focus(); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [add, view, goMonth, dialog, page]);
}

function Toast() {
  const { toastState, undo } = useApp();
  return (
    <div className={cx('toast', toastState && 'show', toastState && toastState.undo && 'has-action')} role="status" aria-live="polite">
      {toastState && <span>{toastState.msg}</span>}
      {toastState && toastState.undo && <button type="button" className="toast-action" onClick={undo}>Desfazer</button>}
    </div>
  );
}

export default function App() {
  const { db, view, page, dialog, loadError, load } = useApp();
  const add = useAddAction();
  useShortcuts(add);
  useEffect(() => {
    if (view) document.title = `${PAGE_TITLE[page] || 'Finanças'}, ${F.mLabel(view)} · Finanças`;
  }, [page, view]);
  if (loadError) {
    return (
      <div className="splash">
        <div className="fin-card splash-card">
          <h1>Não foi possível carregar seus dados</h1>
          <p className="muted">O servidor não respondeu. Nada foi alterado. Verifique se o app está no ar e tente de novo.</p>
          <button type="button" className="fin-btn fin-btn-primary" onClick={load}>Tentar de novo</button>
        </div>
      </div>
    );
  }
  if (!db || !view) return <div className="splash"><p className="muted">Carregando…</p></div>;
  const View = VIEWS[page] || Overview;
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <TopBar />
        <main>
          <h1 className="sr-only">{PAGE_TITLE[page]}{page !== 'settings' && `, ${F.mLabel(view)}`}</h1>
          <View key={page === 'range' || page === 'settings' ? page : page + view} />
        </main>
      </div>
      <TabBar />
      {dialog?.kind === 'entry' && <EntryDialog key={JSON.stringify(dialog)} />}
      {dialog?.kind === 'delete' && <DeleteDialog key={dialog.id} />}
      {dialog?.kind === 'ledger' && <LedgerDialog key={JSON.stringify(dialog)} />}
      {dialog?.kind === 'settle' && <SettleDialog key={dialog.person} />}
      <Toast />
    </div>
  );
}
