import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/ui.css';
import './styles/app.css';
import './styles/template.css';
import { markBundleHealthy } from './lib/ota';
import { hideReferrerInApp } from './lib/native';

hideReferrerInApp();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

// Once the UI is on screen the new bundle has proven itself; if it crashed before this, the updater rolls back.
setTimeout(markBundleHealthy, 3000);
