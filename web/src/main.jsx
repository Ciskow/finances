import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../../design-system/tokens.css';
import '../../design-system/components/bundle.css';
import './app.css';
import { AppProvider } from './store.jsx';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>,
);
