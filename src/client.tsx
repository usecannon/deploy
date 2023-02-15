import React from 'react';
import { hydrate } from 'react-dom';

import App from './App';

hydrate(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept();
}
