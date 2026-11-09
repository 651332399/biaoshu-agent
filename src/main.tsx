import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import DevPreview from './DevPreview.tsx';
import {setApiBase} from './lib/apiBase';
import './index.css';

setApiBase(import.meta.env.BASE_URL);

const isDevPreview = new URLSearchParams(window.location.search).has('p');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDevPreview ? <DevPreview /> : <App />}
  </StrictMode>,
);
