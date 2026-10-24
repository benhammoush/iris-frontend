/**
 * Application entry point and runtime integration boundaries.
 * @packageDocumentation
 */

import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { applyThemeMode } from './design-system';

applyThemeMode(
  localStorage.getItem('color-theme') === 'dark' ? 'dark' : 'light',
);

const container = document.getElementById('root');
if (!container) throw new Error('Iris root element is missing.');
const root = ReactDOM.createRoot(container);
root.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
