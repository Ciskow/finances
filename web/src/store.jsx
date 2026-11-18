import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as F from './lib/finance.js';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const PAGES = ['overview', 'expenses', 'income', 'family', 'range', 'settings'];
const pageFromHash = () => { const h = location.hash.slice(1); return PAGES.includes(h) ? h : 'overview'; };

export function AppProvider({ children }) {
  const [db, setDb] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [view, setView] = useState(null); // 'YYYY-MM'
  const [page, setPageState] = useState(pageFromHash);
  const [saveState, setSaveState] = useState('saved'); // saved | dirty | error
  const [toastMsg, setToastMsg] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [theme, setThemeState] = useState(() => document.documentElement.dataset.theme || 'light');
  const dbRef = useRef(null);
  const saveTimer = useRef(null);
  const toastTimer = useRef(null);
  const advanceTimer = useRef(null);

  const toast = useCallback((msg) => {
    setToastMsg(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2600);
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
      setView(F.earliestUnpaid(data));
    } catch (e) {
      setLoadError(true);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onHash = () => setPageState(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
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
        toast('Falha ao salvar. Verifique a conexão com o servidor.');
      }
    }, 400);
  }, [toast]);

  /** Applies `fn` to a copy of the data, stores it and schedules a save. Returns the new data. */
  const update = useCallback((fn) => {
    const next = structuredClone(dbRef.current);
    fn(next);
    dbRef.current = next;
    setDb(next);
    persist();
    return next;
  }, [persist]);

  const goMonth = useCallback((m) => { clearTimeout(advanceTimer.current); setView(m); }, []);

  const togglePaid = useCallback((id, val) => {
    const m = view;
    const next = update((d) => F.togglePaid(d, m, id, val));
    if (val && F.isMonthSettled(next, m)) {
      toast('Mês quitado! Avançando…');
      clearTimeout(advanceTimer.current);
      advanceTimer.current = setTimeout(() => {
        const nxt = F.earliestUnpaid(dbRef.current);
        setView((cur) => (cur !== m ? cur : nxt > m ? nxt : F.addM(m, 1)));
      }, 1400);
    }
  }, [update, view, toast]);

  const setTheme = useCallback((t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('fin-theme', t); } catch (e) { /* private mode */ }
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({
    db, view, page, saveState, toastMsg, dialog, theme, loadError,
    load, update, toast, setPage, goMonth, togglePaid, setTheme,
    money: (v) => F.fmt(db, v),
    openNew: (type = 'exp') => setDialog({ kind: 'entry', mode: 'new', type }),
    openEdit: (id) => setDialog(id.startsWith('v:') ? { kind: 'entry', mode: 'rec', tplId: id.slice(2) } : { kind: 'entry', mode: 'edit', id }),
    askDelete: (id) => setDialog({ kind: 'delete', id }),
    openLedger: (person, id) => setDialog({ kind: 'ledger', person: person || null, id: id || null }),
    askSettle: (person) => setDialog({ kind: 'settle', person }),
    closeDialog: () => setDialog(null),
  }), [db, view, page, saveState, toastMsg, dialog, theme, loadError, load, update, toast, setPage, goMonth, togglePaid, setTheme]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
