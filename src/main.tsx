import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import DevPreview from './DevPreview.tsx';
import {setApiBase} from './lib/apiBase';
import {watchViewportWidth} from './vendor/zy-ui';
// 智员 token 与组件样式（平台 DESIGN.md「员工应用规范」），须先于页面样式。
import './vendor/zy-ui/zy-1.0.0.css';
import './vendor/zy-ui/ui.css';
import './index.css';

setApiBase(import.meta.env.BASE_URL);
watchViewportWidth();

const isDevPreview = new URLSearchParams(window.location.search).has('p');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isDevPreview ? <DevPreview /> : <App />}
  </StrictMode>,
);
