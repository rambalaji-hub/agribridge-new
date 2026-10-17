import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { RightDetailDrawer } from './components/common/RightDetailDrawer';
import { LogoutDialog } from './components/common/LogoutDialog';
import { PrintDocumentModal } from './components/common/PrintDocumentModal';
import { LoginView } from './components/auth/LoginView';
import { LandingPage } from './components/landing/LandingPage';
import { AiAssistantSidebar } from './components/assistant/AiAssistantSidebar';

// Farmer Views
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { CropEntryWizard } from './components/farmer/CropEntryWizard';
import { LiveQueueView } from './components/farmer/LiveQueueView';
import { WeighSlipView } from './components/farmer/WeighSlipView';
import { SurplusMarketplaceView } from './components/farmer/SurplusMarketplaceView';
import { FarmerProfileView } from './components/farmer/FarmerProfileView';
import { FarmerPaymentsView } from './components/farmer/FarmerPaymentsView';
import { FarmerHelpSupportView } from './components/farmer/FarmerHelpSupportView';
import { FarmerCentresView } from './components/farmer/FarmerCentresView';
import { FarmerProcurementStatusView } from './components/farmer/FarmerProcurementStatusView';

// Role Dashboards
import { OfficerDashboard } from './components/officer/OfficerDashboard';
import { BuyerDashboard } from './components/buyer/BuyerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AssistedStaffDashboard } from './components/assisted/AssistedStaffDashboard';
import { UserRole } from './types';

const MainLayout: React.FC = () => {
  const { isAuthenticated, currentUser, activeTab, theme, loginAsRole, setActiveTab, t, tD, backendError, isBackendLoading, clearBackendError } = useApp();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [guestView, setGuestView] = useState<'landing' | 'login'>('landing');
  const [selectedLoginRole, setSelectedLoginRole] = useState<UserRole>('farmer');

  // Sync dark theme to HTML element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (!isAuthenticated || !currentUser) {
    if (guestView === 'landing') {
      return (
        <>
          <LandingPage
            onSelectRolePortal={(role) => {
              setSelectedLoginRole(role);
              setGuestView('login');
            }}
            onOpenLogin={() => setGuestView('login')}
          />
          <AiAssistantSidebar />
        </>
      );
    }

    return (
      <>
        <LoginView
          initialRole={selectedLoginRole}
          onBackToLanding={() => setGuestView('landing')}
        />
        <AiAssistantSidebar />
      </>
    );
  }

  // Render role-specific content
  const renderContent = () => {
    if (activeTab === 'landing') {
      return (
        <LandingPage
          onSelectRolePortal={(role) => loginAsRole(role)}
          onOpenLogin={() => {}}
        />
      );
    }

    switch (currentUser.role) {
      case 'farmer':
        switch (activeTab) {
          case 'dashboard':
            return <FarmerDashboard />;
          case 'book-slot':
          case 'crop-details':
            return <CropEntryWizard />;
          case 'procurement-centres':
            return <FarmerCentresView />;
          case 'procurement-status':
            return <FarmerProcurementStatusView />;
          case 'live-queue':
          case 'my-tokens':
            return <LiveQueueView />;
          case 'weigh-slip':
            return <WeighSlipView />;
          case 'payments':
          case 'digital-receipts':
            return <FarmerPaymentsView />;
          case 'direct-marketplace':
            return <SurplusMarketplaceView />;
          case 'profile':
            return <FarmerProfileView />;
          case 'help-support':
            return <FarmerHelpSupportView />;
          default:
            return <FarmerDashboard />;
        }

      case 'officer':
        return <OfficerDashboard />;

      case 'buyer':
        return <BuyerDashboard />;

      case 'admin':
        return <AdminDashboard />;

      case 'assisted':
        return <AssistedStaffDashboard />;

      default:
        return <FarmerDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-100">
      {/* Fixed Left Sidebar for Desktop */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Container - Left margin aligns with fixed sidebar (250px) on desktop */}
      <div className="lg:pl-[250px] flex-1 flex flex-col transition-all duration-200">
        <Header onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />
        {backendError && (
          <div role="alert" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-200">
            <span>{backendError}</span>
            <button type="button" onClick={clearBackendError} className="shrink-0 font-semibold underline">Dismiss</button>
          </div>
        )}
        {isBackendLoading && <div role="status" className="sr-only">Loading procurement data…</div>}

        <div className="flex justify-end px-4 pt-3">
          <div className="hidden lg:flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/60 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <span className="font-semibold text-emerald-800 dark:text-emerald-300">{tD('apmcTelemetryTitle')}</span>
            <span className="text-emerald-700 dark:text-emerald-400">{tD('apmcTelemetrySubtitle')}</span>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {renderContent()}
        </main>

        {/* Government Footer */}
        <footer className="mt-auto border-t border-slate-200 dark:border-white/10 bg-white dark:bg-black py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {tD('govFooterRights')}
            </p>
            <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="hover:underline cursor-pointer">{tD('citizenCharter')}</span>
              <span className="hover:underline cursor-pointer">{tD('mspGazetteRates')}</span>
              <span className="hover:underline cursor-pointer">{tD('securityPolicy')}</span>
              <span className="hover:underline cursor-pointer">{tD('apmcTelemetryTitle')}</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Global Overlays */}
      <RightDetailDrawer />
      <PrintDocumentModal />
      <LogoutDialog />
      <AiAssistantSidebar />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
