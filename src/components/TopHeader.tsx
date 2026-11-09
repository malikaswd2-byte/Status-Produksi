import React from 'react';
import { usePPIC } from '../context/PPICContext';
import { generateSampleExcelWorkbook } from '../services/excelParser';
import { UploadCloud, Download, Database, Layers } from 'lucide-react';

export const TopHeader: React.FC = () => {
  const { activeTab, setActiveTab, activeBatch, batches, switchActiveBatch, showToast } = usePPIC();

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Dashboard & Ringkasan Produksi';
      case 'monitoring':
        return 'Monitoring Produksi & QA';
      case 'gantt':
        return 'Gantt Calendar & Jadwal Pengiriman';
      case 'upload':
        return 'Upload Excel & Manajemen Batch';
      default:
        return 'PPIC Monitoring';
    }
  };

  const handleDownloadTemplate = () => {
    try {
      const buffer = generateSampleExcelWorkbook();
      const blob = new Blob([buffer as any], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Template_PPIC_Production_Orders.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Template Excel PPIC berhasil diunduh', 'success');
    } catch {
      showToast('Gagal membuat file template Excel', 'error');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-6 shrink-0 z-10">
      {/* Breadcrumb Area */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-400">PPIC System</span>
        <span className="text-slate-300">/</span>
        <h2 className="text-sm font-semibold text-slate-800">{getBreadcrumbTitle()}</h2>
      </div>

      {/* Action Zone */}
      <div className="flex items-center gap-3">
        {/* Batch Selector if multiple batches exist */}
        {batches.length > 1 && (
          <div className="hidden sm:flex items-center gap-2 border border-slate-200 rounded-md px-2.5 py-1 text-xs bg-slate-50">
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={activeBatch?.id || ''}
              onChange={(e) => switchActiveBatch(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-700 font-medium focus:outline-hidden cursor-pointer"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNumber}: {b.fileName}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Download Sample Template */}
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
          title="Unduh contoh format file Excel PPIC (.xlsx)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Download Template</span>
        </button>

        {/* Upload Excel Button */}
        <button
          onClick={() => setActiveTab('upload')}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Excel</span>
        </button>
      </div>
    </header>
  );
};
