import React from 'react';
import ReactDOM from 'react-dom/client';
import AppInvestorLiveV3 from './AppInvestorLiveV3';
import AppAdminMintLive from './AppAdminMintLive';
import './styles.css';

const params = new URLSearchParams(window.location.search);
const mode = params.get('mode');
const App = mode === 'admin' ? AppAdminMintLive : AppInvestorLiveV3;

function Root() {
  return (
    <>
      <App />
      <div className="build-marker">build: buy-order-v3</div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
