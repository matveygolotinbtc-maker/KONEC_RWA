import React from 'react';
import ReactDOM from 'react-dom/client';
import AppInvestorLiveV6 from './AppInvestorLiveV6';
import AppAdminMintLive from './AppAdminMintLive';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const App = mode === 'admin' ? AppAdminMintLive : AppInvestorLiveV6;

function Root() {
  return (
    <>
      <App />
      <div className="build-marker">build: buy-order-v6</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
