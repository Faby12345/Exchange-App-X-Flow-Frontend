import React from 'react';

import CurrencyGridPage from "./CurrencyGridPage";

import SelingPage from './SelingPage';
import LoginPage from './LoginPage';

function App() {
  return (
    <div className="App">
      <LoginPage/>
      <CurrencyGridPage/>
      <SelingPage/>
    </div>
  );
}

export default App;
