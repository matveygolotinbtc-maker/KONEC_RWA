import React from 'react';
import ReactDOM from 'react-dom/client';
import AppInvestorLive from './AppInvestorLive';
import AppPaymentLive from './AppPaymentLive';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const App = mode === 'admin' ? AppPaymentLive : AppInvestorLive;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
