import React from 'react';
import ReactDOM from 'react-dom/client';
import AppInvestorLiveV5 from './AppInvestorLiveV5';
import AppAdminMintLive from './AppAdminMintLive';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const App = mode === 'admin' ? AppAdminMintLive : AppInvestorLiveV5;

function Root() {
  return (
    <>
      <App />
      <div className="build-marker">build: buy-order-v5</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
