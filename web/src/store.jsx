import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as F from './lib/finance.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const PAGES = ['overview', 'expenses', 'income', 'family', 'range', 'settings'];
/** The hash holds the page and, optionally, the month: #expenses/2026-12. */
const parseHash = () => {
  const [p, m] = location.hash.slice(1).split('/');
  return { page: PAGES.includes(p) ? p : 'overview', month: /^\d{4}-\d{2}$/.test(m || '') ? m : null };
};

export function AppProvider({ children }) {
  const [db, setDb] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState(null); // 'YYYY-MM'
  const [page, setPageState] = useState(() => parseHash().page);
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | error
  const [toastState, setToastState] = useState(null); // { msg, undo? }
  const [dialog, setDialog] = useState(null);
  const [theme, setThemeState] = useState(() => document.documentElement.dataset.theme || 'light');
  const dbRef = useRef(null);
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);

  /** Shows a short message. With `undo` (a db snapshot), the toast offers "Desfazer" for a few seconds. */
  const toast = useCallback((msg, undo) => {
    setToastState({ msg, undo: undo || null, key: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastState(null), undo ? 6000 : 2600);
  }, []);

  // Load once. A failed request shows an error instead of starting from empty data,
  // so a server hiccup can never lead to the real file being overwritten.
  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const r = await fetch('/api/data');
      if (!r.ok) throw new Error('http ' + r.status);
      const data = F.normalize(await r.json());
      dbRef.current = data;
      setDb(data);
      setView(parseHash().month || F.earliestUnpaid(data));
    } catch (e) {
      setLoadError(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onHash = () => { const h = parseHash(); setPageState(h.page); if (h.month) setView(h.month); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  // Keep the month in the address so a page can be bookmarked or reloaded on the same month.
  useEffect(() => {
    if (!view) return;
    const want = '#' + page + '/' + view;
    if (location.hash !== want) history.replaceState(null, '', want);
  }, [page, view]);
  // A page change adds a history entry (Back works); the effect above then appends the month.
  const setPage = useCallback((p) => { location.hash = p; setPageState(p); window.scrollTo(0, 0); }, []);

  const persist = useCallback(() => {
    setSaveState('dirty');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dbRef.current) });
        if (!r.ok) throw new Error('http ' + r.status);
        setSaveState('saved');
      } catch (e) {
        setSaveState('error');
        toast('Não foi possível salvar. Suas alterações estão na tela; tente salvar de novo.');
      }
    }, 400);
  }, [toast]);

  /** Applies `fn` to a copy of the data, stores it and schedules a save. Returns the new data. */
  const update = useCallback((fn) => {
    const next = structuredClone(dbRef.current);
    fn(next);
    dbRef.current = next;
    setDb(next);
    // A pending "Desfazer" would roll back this change too, so it is withdrawn.
    setToastState((t) => (t && t.undo ? { ...t, undo: null } : t));
    persist();
    return next;
  }, [persist]);

  /** An update the person can take back: applies `fn`, then shows `msg` with "Desfazer". */
  const commit = useCallback((fn, msg) => {
    const before = dbRef.current;
    const next = update(fn);
    toast(msg, before);
    return next;
  }, [update, toast]);

  const undo = useCallback(() => {
    const snap = toastState && toastState.undo;
    if (!snap) return;
    dbRef.current = snap;
    setDb(snap);
    persist();
    toast('Alteração desfeita');
  }, [toastState, persist, toast]);

  const goMonth = useCallback((m) => setView(m), []);

  const togglePaid = useCallback((id, val) => {
    const m = view;
    const next = update((d) => F.togglePaid(d, m, id, val));
    if (val && F.isMonthSettled(next, m)) toast(`${F.mLabel(m)[0].toUpperCase() + F.mLabel(m).slice(1)} quitado`);
  }, [update, view, toast]);

  const setTheme = useCallback((t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('fin-theme', t); } catch (e) { /* private mode */ }
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({
    db, view, page, saveState, toastState, dialog, theme, loadError,
    load, update, commit, undo, toast, persist, setPage, goMonth, togglePaid, setTheme,
    money: (v) => F.fmt(db, v),
    openNew: (type = 'exp') => setDialog({ kind: 'entry', mode: 'new', type }),
    openEdit: (id) => setDialog(id.startsWith('v:') ? { kind: 'entry', mode: 'rec', tplId: id.slice(2) } : { kind: 'entry', mode: 'edit', id }),
    /** `back`: the dialog to return to when the deletion is cancelled. */
    askDelete: (id, back) => setDialog({ kind: 'delete', id, back: back || null }),
    openLedger: (person, id) => setDialog({ kind: 'ledger', person: person || null, id: id || null }),
    askSettle: (person) => setDialog({ kind: 'settle', person }),
    closeDialog: () => setDialog(null),
    reopen: (d) => setDialog(d),
  }), [db, view, page, saveState, toastState, dialog, theme, loadError, load, update, commit, undo, toast, persist, setPage, goMonth, togglePaid, setTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
