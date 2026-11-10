import React, { useState, useEffect } from 'react';
import { NavPage } from './types/index.js';
import { ThemeProvider } from './context/ThemeContext.js';
import { TransferProvider } from './context/TransferContext.js';
import { Sidebar } from './components/Sidebar.js';
import { Header } from './components/Header.js';
import { MobileNav } from './components/MobileNav.js';
import { MobileHeader } from './components/MobileHeader.js';

import { OverviewPage } from './pages/OverviewPage.js';
import { SendPage } from './pages/SendPage.js';
import { ReceivePage } from './pages/ReceivePage.js';
import { ActiveTransfersPage } from './pages/ActiveTransfersPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

export const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<NavPage>('overview');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('pair')) {
      setCurrentPage('receive');
    }
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'overview':
        return <OverviewPage onNavigate={setCurrentPage} />;
      case 'send':
        return <SendPage />;
      case 'receive':
        return <ReceivePage />;
      case 'transfers':
        return <ActiveTransfersPage />;
      case 'history':
        return <HistoryPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-screen overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors">
      {/* Mobile Top Header (Phone only) */}
      <MobileHeader currentPage={currentPage} />

      {/* Desktop & Tablet Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Desktop & Tablet Top Header */}
        <Header currentPage={currentPage} />

        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {renderPage()}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Phone only) */}
      <MobileNav currentPage={currentPage} onNavigate={setCurrentPage} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <TransferProvider>
        <AppContent />
      </TransferProvider>
    </ThemeProvider>
  );
};

export default App;
