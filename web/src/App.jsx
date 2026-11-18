import { useRef } from 'react';
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

function TopBar() {
  const { db, view, goMonth, update, openNew, saveState, page, setPage } = useApp();
  const pick = useRef(null);
  const openPicker = () => { const el = pick.current; if (el.showPicker) el.showPicker(); else el.focus(); };
  const openMonth = F.earliestUnpaid(db); // first month that still has bills to pay
  return (
    <header className="fin-card topbar">
      <div className="mobile-brand"><Brand /><span className="mobile-tools"><ThemeSwitch /><IconButton label="Configurações" onClick={() => setPage('settings')}><SettingsIcon /></IconButton></span></div>
      <div className="fin-month">
        <button type="button" className="fin-btn fin-btn-ghost fin-btn-icon" aria-label="Mês anterior" onClick={() => goMonth(F.addM(view, -1))}><ChevronLeft /></button>
        <button type="button" className="fin-btn fin-btn-ghost fin-btn-icon" aria-label="Próximo mês" onClick={() => goMonth(F.addM(view, 1))}><ChevronRight /></button>
        <span className="month-wrap">
          <button type="button" className="fin-month-title" onClick={openPicker} aria-label={`${F.mLabel(view)}, escolher outro mês`}>
            {F.monthName(view)} <span className="fin-month-year">{F.monthYear(view)}</span><ChevronDown />
          </button>
          <input ref={pick} className="month-pick" type="month" value={view} tabIndex={-1} aria-hidden="true" onChange={(e) => e.target.value && goMonth(e.target.value)} />
        </span>
        {view !== openMonth && <button type="button" className="fin-btn fin-btn-ghost today" title="Ir para o primeiro mês com contas a pagar" onClick={() => goMonth(openMonth)}>Mês em aberto</button>}
      </div>
      <div className="topbar-right">
        <span className={cx('save-state', saveState)} role="status"><i aria-hidden="true" />{SAVE_TEXT[saveState]}</span>
        <Segmented label="Moeda de exibição" className="currency" value={db.settings.display}
          options={[{ value: 'BRL', label: 'R$' }, { value: 'USD', label: 'US$' }]}
          onChange={(v) => update((d) => { d.settings.display = v; })} />
        <button type="button" className="fin-btn fin-btn-primary add-desktop" onClick={() => openNew(page === 'income' ? 'inc' : 'exp')}><Plus />Adicionar</button>
      </div>
    </header>
  );
}

function TabBar() {
  const { page, setPage, openNew } = useApp();
  return (
    <div className="fin-tabbar-wrap tabbar-fixed">
      <nav className="fin-tabbar" aria-label="Seções">
        {NAV.map(({ id, short, icon: Icon }) => (
          <button type="button" key={id} className="fin-tab" aria-current={page === id ? 'page' : undefined} onClick={() => setPage(id)}><Icon />{short}</button>
        ))}
      </nav>
      <button type="button" className="fin-btn fin-btn-fab" aria-label="Adicionar" onClick={() => openNew(page === 'income' ? 'inc' : 'exp')}><Plus /></button>
    </div>
  );
}

export default function App() {
  const { db, view, page, dialog, toastMsg, loadError, load } = useApp();
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
        <main><View key={page === 'range' || page === 'settings' ? page : page + view} /></main>
      </div>
      <TabBar />
      {dialog?.kind === 'entry' && <EntryDialog key={JSON.stringify(dialog)} />}
      {dialog?.kind === 'delete' && <DeleteDialog key={dialog.id} />}
      {dialog?.kind === 'ledger' && <LedgerDialog key={JSON.stringify(dialog)} />}
      {dialog?.kind === 'settle' && <SettleDialog key={dialog.person} />}
      <div className={cx('toast', toastMsg && 'show')} role="status" aria-live="polite">{toastMsg}</div>
    </div>
  );
}
