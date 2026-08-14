import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { GraphArrowheadPreview } from './dev/GraphArrowheadPreview.tsx';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const showGraphArrowheadPreview =
  import.meta.env.DEV && new URLSearchParams(window.location.search).has('graph-arrowhead-preview');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    {showGraphArrowheadPreview ? (
      <GraphArrowheadPreview />
    ) : (
      <BrowserRouter>
        <App />
      </BrowserRouter>
    )}
  </React.StrictMode>,
);
