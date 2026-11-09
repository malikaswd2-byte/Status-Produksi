import React from 'react';
import { usePPIC, NavigationTab } from '../context/PPICContext';
import {
  LayoutDashboard,
  Activity,
  CalendarDays,
  FileSpreadsheet,
  Database,
  Layers,
  RotateCcw,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, activeBatch, resetToSampleData } = usePPIC();

  const navItems: { id: NavigationTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'monitoring', label: 'Production Monitoring', icon: Activity },
    { id: 'gantt', label: 'Gantt Calendar', icon: CalendarDays },
    { id: 'upload', label: 'Upload & Batch Excel', icon: FileSpreadsheet },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
          <Layers className="w-4 h-4" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-white tracking-tight leading-tight">
            PPIC Monitoring
          </h1>
          <p className="text-[11px] text-slate-400">Production Control System</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 pt-2 pb-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Main Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Dataset Batch Status Card */}
      <div className="p-3 border-t border-slate-800/80">
        <div className="p-3 bg-slate-800/60 rounded-lg border border-slate-800 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Database className="w-3 h-3 text-emerald-400" />
              Batch Aktif
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-medium">LIVE</span>
          </div>

          <p className="text-slate-200 font-medium truncate text-xs" title={activeBatch?.fileName}>
            {activeBatch?.fileName || 'Belum ada data'}
          </p>

          <div className="mt-2 pt-2 border-t border-slate-700/50 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span>{activeBatch?.moCount || 0} MO</span>
            <span>·</span>
            <span>{activeBatch?.styleCount || 0} Style</span>
            <span>·</span>
            <span>{activeBatch?.workCenterCount || 0} WC</span>
          </div>
        </div>

        {/* Quick Reset to Sample Data */}
        <div className="mt-3 px-1">
          <button
            onClick={() => {
              if (window.confirm('Muat ulang data contoh resmi PPIC?')) {
                resetToSampleData();
              }
            }}
            className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-200 py-1.5 hover:bg-slate-800 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Reset ke Data Sampel PPIC
          </button>
        </div>
      </div>
    </aside>
  );
};
