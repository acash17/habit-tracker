import React from 'react';
import ReactDOM from 'react-dom/client';
import FinanceApp from './finance-app.jsx';
import { ErrorBoundary } from '../error-boundary.jsx';
import './finance.css';

ReactDOM.createRoot(document.getElementById('finance-mount')).render(
  <ErrorBoundary>
    <FinanceApp />
  </ErrorBoundary>,
);
