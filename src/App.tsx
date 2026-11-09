import React from 'react';
import { PPICProvider, usePPIC } from './context/PPICContext';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { ToastContainer } from './components/ToastContainer';
import { MODetailModal } from './components/MODetailModal';
import { DashboardView } from './views/DashboardView';
import { ProductionMonitoringView } from './views/ProductionMonitoringView';
import { GanttCalendarView } from './views/GanttCalendarView';
import { UploadView } from './views/UploadView';

const MainLayout: React.FC = () => {
  const { activeTab } = usePPIC();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header with Breadcrumb and Actions */}
        <TopHeader />

        {/* Viewport for Active Tab */}
        <main className="flex-1 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'monitoring' && <ProductionMonitoringView />}
          {activeTab === 'gantt' && <GanttCalendarView />}
          {activeTab === 'upload' && <UploadView />}
        </main>
      </div>

      {/* Slide-over / Modal for MO Inspection */}
      <MODetailModal />

      {/* Floating System Toasts */}
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <PPICProvider>
      <MainLayout />
    </PPICProvider>
  );
}
