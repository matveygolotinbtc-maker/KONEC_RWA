import React from 'react';
import ReactDOM from 'react-dom/client';
import AppInvestorLive from './AppInvestorLive';
import AppAdminMintLive from './AppAdminMintLive';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const App = mode === 'admin' ? AppAdminMintLive : AppInvestorLive;

function Root() {
  return (
    <>
      <App />
      <div className="build-marker">build: buy-order-v2</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
