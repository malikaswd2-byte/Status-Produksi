import React, { useState, useRef, useMemo } from 'react';
import { usePPIC } from '../context/PPICContext';
import {
  parseExcelWorkbook,
  generateSampleExcelWorkbook,
} from '../services/excelParser';
import {
  ColumnMappingConfig,
  ExcelParsingResult,
  UploadBatch,
  TemplateProfile,
  MOAnalysisItem,
  StageDiff,
} from '../types/ppic';
import { analyzeAndExecuteUpsert } from '../utils/upsertEngine';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Database,
  Download,
  Trash2,
  Check,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronUp,
  BookmarkPlus,
  Search,
  Layers,
  Wrench,
  RotateCcw,
  Sparkles,
  Info,
  GitMerge,
  FilePlus,
  AlertOctagon,
  ArrowRight,
  Filter,
} from 'lucide-react';

export const UploadView: React.FC = () => {
  const {
    activeBatch,
    batches,
    orders,
    templateProfiles,
    saveTemplateProfile,
    deleteTemplateProfile,
    confirmUploadBatch,
    switchActiveBatch,
    deleteBatch,
    showToast,
  } = usePPIC();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [parseResult, setParseResult] = useState<ExcelParsingResult | null>(null);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [manualMapping, setManualMapping] = useState<Partial<ColumnMappingConfig>>({});
  const [dragOver, setDragOver] = useState(false);
  const [showAdvancedMapping, setShowAdvancedMapping] = useState(false);
  const [previewSearch, setPreviewSearch] = useState('');
  const [previewPage, setPreviewPage] = useState(1);
  const previewItemsPerPage = 10;

  // UPSERT Analysis UI state
  const [moFilterAction, setMoFilterAction] = useState<string>('all');
  const [expandedMOs, setExpandedMOs] = useState<Record<string, boolean>>({});

  // New Template Profile modal/input
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');
  const [newProfileDesc, setNewProfileDesc] = useState('');

  // Handle file selection & parsing
  const handleFile = async (file: File) => {
    if (!file) return;
    const name = file.name;
    const isXLS = name.endsWith('.xls');
    const isXLSX = name.endsWith('.xlsx');

    if (!isXLS && !isXLSX) {
      showToast('Hanya mendukung format file Excel (.xlsx atau .xls)', 'error');
      return;
    }

    setIsProcessing(true);
    setFileName(name);

    try {
      const buffer = await file.arrayBuffer();
      setFileBuffer(buffer);

      const parsed = parseExcelWorkbook(buffer, name, undefined, undefined, templateProfiles);
      setParseResult(parsed);
      setSelectedSheet(parsed.selectedSheet);
      setManualMapping(parsed.detectedMapping);

      // If recognized, keep advanced mapping collapsed; if not recognized, expand it
      setShowAdvancedMapping(!parsed.isTemplateRecognized);
      setPreviewPage(1);

      if (parsed.isTemplateRecognized) {
        showToast(
          `Template "${parsed.matchedTemplateName}" dikenali otomatis! (${parsed.summary.totalRows} baris data)`,
          'success'
        );
      } else {
        showToast(
          `File ${name} dibaca (${parsed.summary.totalRows} baris). Silakan periksa pemetaan kolom.`,
          'info'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal membaca file Excel', 'error');
      setParseResult(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Re-parse when sheet is changed
  const handleSheetChange = (sheet: string) => {
    if (!fileBuffer || !fileName) return;
    setSelectedSheet(sheet);
    try {
      const parsed = parseExcelWorkbook(fileBuffer, fileName, sheet, manualMapping, templateProfiles);
      setParseResult(parsed);
      setManualMapping(parsed.detectedMapping);
      setPreviewPage(1);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengganti lembar kerja', 'error');
    }
  };

  // Update manual column mapping and re-apply
  const handleMappingChange = (targetKey: keyof ColumnMappingConfig, headerCol: string) => {
    const updated = { ...manualMapping, [targetKey]: headerCol };
    setManualMapping(updated);

    if (fileBuffer && fileName && selectedSheet) {
      try {
        const reParsed = parseExcelWorkbook(
          fileBuffer,
          fileName,
          selectedSheet,
          updated,
          templateProfiles
        );
        setParseResult(reParsed);
      } catch {
        // ignore
      }
    }
  };

  // Save current mapping configuration as a reusable Template Profile (Requirement 7)
  const handleSaveProfile = () => {
    if (!newProfileName.trim()) {
      showToast('Nama konfigurasi template harus diisi!', 'error');
      return;
    }
    if (!parseResult) return;

    // Collect non-empty mapped headers as signature
    const signatures = Object.values(manualMapping).filter(Boolean) as string[];

    const newProfile: TemplateProfile = {
      id: `tpl-${Date.now()}`,
      name: newProfileName.trim(),
      description: newProfileDesc.trim() || 'Konfigurasi template kustom PPIC',
      headerSignatures: Array.from(new Set(signatures)),
      mapping: manualMapping,
      createdAt: new Date().toISOString(),
    };

    saveTemplateProfile(newProfile);
    setIsSavingProfile(false);
    setNewProfileName('');
    setNewProfileDesc('');
  };

  // UPSERT Analysis Computation for Preview (identifies MO by WH/MO Display Name)
  const upsertAnalysis = useMemo(() => {
    if (!parseResult || !parseResult.normalizedOrders.length) return null;
    return analyzeAndExecuteUpsert(orders, parseResult.normalizedOrders, 'temp-preview');
  }, [orders, parseResult]);

  // Toggle MO card expansion
  const toggleMOExpand = (moNumber: string) => {
    setExpandedMOs((prev) => ({
      ...prev,
      [moNumber]: !prev[moNumber],
    }));
  };

  const toggleAllMOs = (expand: boolean) => {
    if (!upsertAnalysis) return;
    const next: Record<string, boolean> = {};
    if (expand) {
      upsertAnalysis.items.forEach((m) => {
        next[m.moNumber] = true;
      });
    }
    setExpandedMOs(next);
  };

  // Filtered MO list for UPSERT inspection
  const filteredMOAnalysis = useMemo(() => {
    if (!upsertAnalysis) return [];
    if (moFilterAction === 'all') return upsertAnalysis.items;
    return upsertAnalysis.items.filter((m) => m.action === moFilterAction);
  }, [upsertAnalysis, moFilterAction]);

  // Confirm Import & Activate Dataset with UPSERT logic (Rules A, B, C)
  const handleConfirmActivation = () => {
    if (!parseResult) return;

    if (parseResult.normalizedOrders.length === 0) {
      showToast('Tidak ada data produksi yang dapat diimpor!', 'error');
      return;
    }

    const newBatchId = `BATCH-${Date.now()}`;
    const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

    // Run final upsert using active orders and newBatchId
    const finalUpsert = analyzeAndExecuteUpsert(orders, parseResult.normalizedOrders, newBatchId);

    const newBatch: UploadBatch = {
      id: newBatchId,
      batchNumber,
      fileName,
      uploadDate: new Date().toISOString(),
      totalRows: parseResult.summary.totalRows,
      moCount: parseResult.summary.moCount,
      styleCount: parseResult.summary.styleCount,
      workCenterCount: parseResult.summary.workCenterCount,
      status: 'active',
      columnMappings: manualMapping as Record<string, string>,
      warnings: parseResult.warnings,
      rawRowsSample: parseResult.rows.slice(0, 5),
      newMOCount: finalUpsert.newMOCount,
      updatedMOCount: finalUpsert.updatedMOCount,
      newStyleCount: finalUpsert.newStyleCount,
      updatedStagesCount: finalUpsert.updatedStagesCount,
      unchangedRowsCount: finalUpsert.unchangedRowsCount,
      conflictCount: finalUpsert.conflictCount,
    };

    confirmUploadBatch(newBatch, finalUpsert.resultingOrders);

    if (finalUpsert.updatedMOCount > 0 || finalUpsert.newMOCount > 0) {
      showToast(
        `Sukses! ${finalUpsert.updatedMOCount} MO diperbarui (${finalUpsert.updatedStagesCount} tahapan), ${finalUpsert.newMOCount} MO baru ditambahkan.`,
        'success'
      );
    }

    setParseResult(null);
    setFileBuffer(null);
    setFileName('');
  };

  // Download official sample Excel file
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
      showToast('Template resmi Excel PPIC berhasil diunduh', 'success');
    } catch {
      showToast('Gagal membuat file template Excel', 'error');
    }
  };

  // Filtered preview rows
  const filteredPreviewRows = useMemo(() => {
    if (!parseResult) return [];
    if (!previewSearch.trim()) return parseResult.normalizedOrders;
    const q = previewSearch.toLowerCase().trim();

    return parseResult.normalizedOrders.filter((row) => {
      return (
        row.moNumber?.toLowerCase().includes(q) ||
        row.style?.toLowerCase().includes(q) ||
        row.workCenter?.toLowerCase().includes(q) ||
        row.productionStage?.toLowerCase().includes(q) ||
        row.buyer?.toLowerCase().includes(q) ||
        row.routing?.toLowerCase().includes(q) ||
        row.line?.toLowerCase().includes(q)
      );
    });
  }, [parseResult, previewSearch]);

  const previewTotalPages = Math.ceil(filteredPreviewRows.length / previewItemsPerPage) || 1;
  const paginatedPreviewRows = filteredPreviewRows.slice(
    (previewPage - 1) * previewItemsPerPage,
    previewPage * previewItemsPerPage
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Excel Ingestion & Automatic Template Recognition
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah file Excel operasional produksi (.xlsx / .xls). Sistem secara otomatis mengenali template, memetakan kolom, dan mengekstrak data tahapan.
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download Template Standar PPIC (.xlsx)</span>
        </button>
      </div>

      {/* Upload Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-blue-400 bg-white'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
          className="hidden"
        />

        <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3">
          <UploadCloud className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-semibold text-slate-800">
          Pilih atau Tarik File Excel (.xlsx / .xls) ke Sini
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
          Mendukung format template PPIC standar. Sistem akan langsung memetakan Customer, Routing, Style/MO, Work Center/Line, Qty Original, Qty, Qty Sisa, dan Repair.
        </p>

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Membaca dan memproses workbook Excel...</span>
          </div>
        )}
      </div>

      {/* Parse Preview & Automatic Mapping Interface (Section 6, 7, 9) */}
      {parseResult && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-6 p-6">
          {/* Top File & Sheet Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-6 h-6 text-emerald-600 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">{parseResult.fileName}</h3>
                <p className="text-xs text-slate-500">
                  Pratinjau data siap diimpor. Periksa ringkasan dan tabel pratinjau sebelum konfirmasi.
                </p>
              </div>
            </div>

            {/* Sheet Selector */}
            {parseResult.sheets.length > 1 && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-600 font-medium">Pilih Sheet:</span>
                <select
                  value={selectedSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800"
                >
                  {parseResult.sheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 
            Requirement 6: Automatic Recognition Banner & Summary
            When recognized: No manual mapping shown by default; shows clean summary metrics
          */}
          {parseResult.isTemplateRecognized ? (
            <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-emerald-950">
                      Template Berhasil Dikenali Otomatis: {parseResult.matchedTemplateName}
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-200/80 text-emerald-900 rounded-full">
                      Auto-Mapped
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    Struktur kolom produksi terdeteksi sesuai template. Seluruh 8 field operasional (Customer, Routing, Style/MO, Work Center/Line, Original Qty, Quantity, Qty Sisa, dan Repair) dipetakan secara otomatis tanpa perlu konfigurasi manual.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-600 flex items-center justify-center text-white shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-bold text-amber-950">
                      Struktur Template Belum Dikenali Otomatis
                    </h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                      Smart Fallback
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                    Sistem menggunakan deteksi pintar. Silakan periksa atau sesuaikan pemetaan kolom di bagian <strong>Advanced Mapping</strong> di bawah. Anda juga dapat menyimpannya sebagai template baru untuk pemakaian berikutnya.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 
            Requirement 6: Parsing Summary Metrics
            - Template berhasil dikenali
            - Jumlah worksheet diproses
            - Jumlah baris data
            - Jumlah MO
            - Jumlah Style
            - Jumlah Production Stage
            - Jumlah Work Center atau Line
            - Jumlah data yang perlu diperiksa
          */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                Worksheet
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {parseResult.summary.sheetsProcessed}
              </span>
              <span className="text-[10px] text-slate-400 block truncate" title={selectedSheet}>
                {selectedSheet}
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                Baris Data
              </span>
              <span className="text-lg font-bold font-mono text-slate-900">
                {parseResult.summary.totalRows}
              </span>
              <span className="text-[10px] text-slate-400 block">terbaca penuh</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                Jumlah MO
              </span>
              <span className="text-lg font-bold font-mono text-blue-600">
                {parseResult.summary.moCount}
              </span>
              <span className="text-[10px] text-slate-400 block">entitas unik</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                Jumlah Style
              </span>
              <span className="text-lg font-bold font-mono text-indigo-600">
                {parseResult.summary.styleCount}
              </span>
              <span className="text-[10px] text-slate-400 block">model produk</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                Tahap Produksi
              </span>
              <span className="text-lg font-bold font-mono text-emerald-600">
                {parseResult.summary.stageCount}
              </span>
              <span className="text-[10px] text-slate-400 block">tahapan alur</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider block">
                Work Center / Line
              </span>
              <span className="text-lg font-bold font-mono text-amber-600">
                {parseResult.summary.workCenterCount}
              </span>
              <span className="text-[10px] text-slate-400 block">stasiun & line</span>
            </div>

            <div
              className={`p-3 rounded-lg border ${
                parseResult.summary.needsVerificationCount > 0
                  ? 'bg-amber-50 border-amber-300'
                  : 'bg-emerald-50/50 border-emerald-200'
              }`}
            >
              <span className="text-[10px] text-slate-600 font-medium uppercase tracking-wider block">
                Perlu Diperiksa
              </span>
              <span
                className={`text-lg font-bold font-mono ${
                  parseResult.summary.needsVerificationCount > 0 ? 'text-amber-700' : 'text-emerald-700'
                }`}
              >
                {parseResult.summary.needsVerificationCount}
              </span>
              <span className="text-[10px] text-slate-500 block">
                {parseResult.summary.needsVerificationCount > 0 ? 'perlu verifikasi' : 'semua valid'}
              </span>
            </div>
          </div>

          {/* Warnings List */}
          {parseResult.warnings.length > 0 && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                Catatan Sistem & Integritas Data:
              </div>
              <ul className="list-disc list-inside text-amber-800 space-y-0.5 pl-1">
                {parseResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 
            CRITICAL REVISION: Analisis Mekanisme UPSERT & Deteksi Perubahan Data
            Identitas Utama: WH/MO (Display Name)
            Rule A: WH/MO Sama + Style Sama -> Update Existing (nilai ditimpa, tidak dijumlahkan)
            Rule B: WH/MO Beda + Style Sama -> Insert New Order (MO mandiri)
            Rule C: WH/MO Sama + Style Beda -> Conflict Flag (data lama aman, tidak ditimpa)
          */}
          {upsertAnalysis && (
            <div className="border border-blue-200 bg-linear-to-b from-blue-50/40 to-white rounded-xl p-5 space-y-5 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
                    <GitMerge className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      Analisis Update & Validasi UPSERT (Import Preview)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sistem membandingkan data Excel dengan dataset aktif menggunakan <strong>WH/MO (Display Name)</strong> sebagai kunci identitas utama.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-blue-100 text-blue-800 rounded-md border border-blue-200">
                    Primary Key: WH/MO Display Name
                  </span>
                </div>
              </div>

              {/* 5 KPI Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* 1. MO Diperbarui */}
                <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                      MO Diperbarui
                    </span>
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold font-mono text-blue-700">
                    {upsertAnalysis.updatedMOCount}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    MO & tahapan disinkronkan
                  </span>
                </div>

                {/* 2. Pesanan MO Baru */}
                <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider">
                      Pesanan MO Baru
                    </span>
                    <FilePlus className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-700">
                    {upsertAnalysis.newMOCount}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    entitas MO mandiri baru
                  </span>
                </div>

                {/* 3. Tahapan Diperbarui */}
                <div className="p-3 bg-white rounded-lg border border-indigo-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wider">
                      Tahapan Diperbarui
                    </span>
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-xl font-bold font-mono text-indigo-700">
                    {upsertAnalysis.updatedStagesCount}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    tahap produksi diperbarui
                  </span>
                </div>

                {/* 4. Data Tidak Berubah */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                      Data Tidak Berubah
                    </span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="text-xl font-bold font-mono text-slate-700">
                    {upsertAnalysis.unchangedRowsCount}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    baris data identik / terkini
                  </span>
                </div>

                {/* 5. Konflik Identitas */}
                <div
                  className={`p-3 rounded-lg border shadow-2xs ${
                    upsertAnalysis.conflictCount > 0
                      ? 'bg-rose-50 border-rose-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        upsertAnalysis.conflictCount > 0 ? 'text-rose-700' : 'text-slate-600'
                      }`}
                    >
                      Konflik Identitas
                    </span>
                    <AlertOctagon
                      className={`w-3.5 h-3.5 ${
                        upsertAnalysis.conflictCount > 0 ? 'text-rose-600' : 'text-slate-400'
                      }`}
                    />
                  </div>
                  <div
                    className={`text-xl font-bold font-mono ${
                      upsertAnalysis.conflictCount > 0 ? 'text-rose-700' : 'text-slate-700'
                    }`}
                  >
                    {upsertAnalysis.conflictCount}
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {upsertAnalysis.conflictCount > 0
                      ? 'Style beda, data lama aman'
                      : 'tidak ada konflik'}
                  </span>
                </div>
              </div>

              {/* Conflict Warning Banner (Rule C) */}
              {upsertAnalysis.conflicts.length > 0 && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                        Peringatan Konflik Identitas Data (Rule C): WH/MO Sama namun Style Berbeda
                      </h4>
                      <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                        Ditemukan {upsertAnalysis.conflicts.length} nomor MO di file Excel yang sama dengan MO di sistem, namun memiliki nama Style yang berbeda.
                        Sesuai standar operasional PPIC, <strong>data lama TIDAK ditimpa secara otomatis</strong> untuk menjaga keutuhan data riwayat produksi.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/80 rounded-lg border border-rose-200 overflow-hidden divide-y divide-rose-100 text-xs">
                    {upsertAnalysis.conflicts.map((conf: MOAnalysisItem, idx: number) => (
                      <div key={idx} className="p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-rose-900 bg-rose-100 px-2 py-0.5 rounded text-[11px]">
                            {conf.moNumber}
                          </span>
                          <span className="text-slate-600">Style di Sistem:</span>
                          <span className="font-semibold text-slate-800">{conf.existingStyle}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-600">Style Baru di Excel:</span>
                          <span className="font-bold text-rose-700">{conf.style}</span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          Data MO Lama Tetap Dipertahankan
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanatory Rulebook Callout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <div className="space-y-1">
                  <div className="font-bold text-blue-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    Rule A: WH/MO Sama + Style Sama
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Update data produksi yang sudah ada. Nilai kuantitas aktual <strong>ditimpa dengan data terbaru</strong> (bukan dijumlahkan).
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Rule B: WH/MO Beda + Style Sama
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Dibuat sebagai <strong>pesanan MO baru mandiri</strong>. Tidak menimpa MO terdahulu dan tahapan tidak digabung.
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-rose-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    Rule C: WH/MO Sama + Style Beda
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Konflik identitas dicegah. Data MO lama <strong>tetap dipertahankan</strong> agar tidak merusak relasi model produk.
                  </p>
                </div>
              </div>

              {/* Interactive MO Analysis Breakdown */}
              <div className="space-y-3 pt-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-slate-700 mr-1 flex items-center gap-1">
                      <Filter className="w-3.5 h-3.5 text-slate-500" />
                      Filter MO:
                    </span>
                    {[
                      { key: 'all', label: `Semua (${upsertAnalysis.items.length})` },
                      { key: 'update', label: `Diperbarui (${upsertAnalysis.updatedMOCount})` },
                      { key: 'insert', label: `Baru (${upsertAnalysis.newMOCount})` },
                      ...(upsertAnalysis.conflictCount > 0
                        ? [{ key: 'conflict', label: `Konflik (${upsertAnalysis.conflictCount})` }]
                        : []),
                      { key: 'unchanged', label: `Tidak Berubah (${upsertAnalysis.items.filter((m: MOAnalysisItem) => m.action === 'unchanged').length})` },
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => setMoFilterAction(btn.key)}
                        className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${
                          moFilterAction === btn.key
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAllMOs(true)}
                      className="text-[11px] font-medium text-blue-600 hover:text-blue-800"
                    >
                      Buka Semua Tahap
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => toggleAllMOs(false)}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
                    >
                      Tutup Semua
                    </button>
                  </div>
                </div>

                {/* List of Analyzed MOs */}
                <div className="space-y-2.5">
                  {filteredMOAnalysis.map((item: MOAnalysisItem) => {
                    const isExpanded = !!expandedMOs[item.moNumber];

                    let badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                    let badgeLabel = 'UPDATE EXIST';
                    let reasonText = 'Data produksi diperbarui dengan nilai aktual terbaru dari Excel (tanpa akumulasi).';

                    if (item.action === 'insert') {
                      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      badgeLabel = 'INSERT NEW';
                      reasonText = 'Nomor WH/MO baru terdaftar sebagai pesanan MO mandiri terpisah.';
                    } else if (item.action === 'conflict') {
                      badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                      badgeLabel = 'KONFLIK IDENTITAS';
                      reasonText = item.conflictReason || 'Nomor WH/MO sama namun nama Style berbeda. Data lama tetap dipertahankan.';
                    } else if (item.action === 'unchanged') {
                      badgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
                      badgeLabel = 'UNCHANGED';
                      reasonText = 'Nilai kuantitas dan alur tahapan produksi sudah sama dengan data aktif.';
                    }

                    return (
                      <div
                        key={item.moNumber}
                        className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs transition-all"
                      >
                        {/* MO Header Bar */}
                        <div
                          onClick={() => toggleMOExpand(item.moNumber)}
                          className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 cursor-pointer hover:bg-slate-50/70 transition-colors"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                            <span className="font-mono font-bold text-xs text-blue-700">
                              {item.moNumber}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-xs font-semibold text-slate-900">
                              {item.style}
                            </span>
                            {item.customer && (
                              <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={item.customer}>
                                • {item.customer}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              {item.incomingOrderCount} tahapan Excel
                            </span>
                            <div className="text-slate-400">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-slate-600" />
                              ) : (
                                <ChevronDown className="w-4 h-4 text-slate-600" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reason Note */}
                        <div className="px-3 pb-2 text-[11px] text-slate-600 flex items-center justify-between">
                          <span>{reasonText}</span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {isExpanded ? 'Klik untuk menciutkan' : 'Klik untuk melihat perubahan kuantitas per tahap'}
                          </span>
                        </div>

                        {/* Expanded Stage Diffs Table */}
                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-slate-50/50 p-3">
                            <div className="overflow-x-auto bg-white rounded-md border border-slate-200">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px]">
                                  <tr>
                                    <th className="py-2 px-3 font-semibold">Tahap Produksi</th>
                                    <th className="py-2 px-3 font-semibold">Work Center / Line</th>
                                    <th className="py-2 px-3 font-semibold text-right">Target Qty</th>
                                    <th className="py-2 px-3 font-semibold text-right">Qty Sebelum</th>
                                    <th className="py-2 px-1 text-center w-6"></th>
                                    <th className="py-2 px-3 font-semibold text-right">Qty Excel (Baru)</th>
                                    <th className="py-2 px-3 font-semibold text-center">Status Perubahan</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-[11px]">
                                  {item.stageDiffs.map((diff: StageDiff) => {
                                    return (
                                      <tr key={diff.stageName} className="hover:bg-slate-50/80">
                                        <td className="py-2 px-3 font-semibold text-slate-800">
                                          {diff.stageName}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600 font-mono text-[10px]">
                                          {diff.workCenter || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-right text-slate-600 tabular-nums">
                                          {(diff.newTargetQty ?? diff.oldTargetQty)?.toLocaleString() || '-'}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-right text-slate-500 tabular-nums">
                                          {diff.oldActualQty !== undefined ? diff.oldActualQty.toLocaleString() : '-'}
                                        </td>
                                        <td className="py-2 px-1 text-center text-slate-400 font-mono">
                                          {diff.isUpdated || diff.isNew ? '→' : '='}
                                        </td>
                                        <td className="py-2 px-3 font-mono text-right tabular-nums">
                                          {diff.newActualQty !== undefined ? (
                                            <span
                                              className={`font-bold px-1.5 py-0.5 rounded ${
                                                diff.isUpdated
                                                  ? 'bg-blue-100 text-blue-800'
                                                  : diff.isNew
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : 'text-slate-700'
                                              }`}
                                            >
                                              {diff.newActualQty.toLocaleString()}
                                            </span>
                                          ) : (
                                            <span className="text-slate-400 italic">Disimpan</span>
                                          )}
                                        </td>
                                        <td className="py-2 px-3 text-center">
                                          {diff.isUpdated ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded">
                                              <RefreshCw className="w-2.5 h-2.5" />
                                              Diperbarui (Nilai Terbaru)
                                            </span>
                                          ) : diff.isNew ? (
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                              <FilePlus className="w-2.5 h-2.5" />
                                              Tahap Baru Ditambahkan
                                            </span>
                                          ) : (
                                            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                              Sama / Terkini
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-2 italic">
                              * Catatan: Data kuantitas digantikan langsung oleh nilai aktual Excel terbaru. Sistem tidak menjumlahkan kuantitas lama dengan kuantitas baru.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 
            Requirement 6 & 7: Advanced Mapping Toggle
            Hidden by default when template is recognized, can be opened for manual fine-tuning
          */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
            <button
              onClick={() => setShowAdvancedMapping(!showAdvancedMapping)}
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-slate-600" />
                <div>
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Advanced Mapping & Template Customization
                  </span>
                  <span className="text-[11px] text-slate-500 ml-2">
                    {parseResult.isTemplateRecognized
                      ? '(Opsional — pemetaan otomatis sudah aktif)'
                      : '(Diperlukan — sesuaikan kolom yang belum pas)'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                <span>{showAdvancedMapping ? 'Tutup Pengaturan' : 'Buka Pengaturan'}</span>
                {showAdvancedMapping ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {showAdvancedMapping && (
              <div className="p-4 border-t border-slate-200 bg-white space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">
                    Pilih kolom Excel yang bersesuaian dengan atribut sistem PPIC.
                  </p>

                  <button
                    onClick={() => setIsSavingProfile(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Simpan Sebagai Profil Template
                  </button>
                </div>

                {/* Save Profile Form Modal/Inline */}
                {isSavingProfile && (
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg space-y-2 text-xs">
                    <span className="font-bold text-blue-900 block">
                      Simpan Konfigurasi Pemetaan Ini Sebagai Template Profile:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Nama Template (misal: Template Garment Odoo V1)"
                        value={newProfileName}
                        onChange={(e) => setNewProfileName(e.target.value)}
                        className="py-1 px-2.5 bg-white border border-blue-200 rounded text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="Deskripsi singkat (opsional)"
                        value={newProfileDesc}
                        onChange={(e) => setNewProfileDesc(e.target.value)}
                        className="py-1 px-2.5 bg-white border border-blue-200 rounded text-slate-800 text-xs focus:outline-hidden focus:border-blue-500"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => setIsSavingProfile(false)}
                        className="px-2.5 py-1 text-slate-600 hover:text-slate-800 font-medium"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="px-3 py-1 bg-blue-600 text-white font-medium rounded hover:bg-blue-700"
                      >
                        Simpan Template
                      </button>
                    </div>
                  </div>
                )}

                {/* Grid of Mapping Selects */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { key: 'moNumber' as const, label: 'Nomor MO / Display Name *', required: true },
                    { key: 'style' as const, label: 'Style / Model (Kolom E) *', required: true },
                    { key: 'buyer' as const, label: 'Customer / Buyer (Kolom C)', required: false },
                    { key: 'routing' as const, label: 'Routing / Alur (Kolom D)', required: false },
                    { key: 'workCenter' as const, label: 'Work Center & Line (Kolom F) *', required: true },
                    { key: 'productionStage' as const, label: 'Tahap Produksi (7 Standar)', required: false },
                    { key: 'originalQty' as const, label: 'Original Production Qty (Kolom G)', required: false },
                    { key: 'quantity' as const, label: 'Quantity (Kolom H)', required: false },
                    { key: 'remainingQty' as const, label: 'Remaining Qty / Qty Sisa (Kolom I)', required: false },
                    { key: 'repairQty' as const, label: 'Repair Qty (Kolom J - Sewing)', required: false },
                    { key: 'qaStatus' as const, label: 'Status QA (Aktual Excel saja)', required: false },
                    { key: 'deliveryDate' as const, label: 'Tanggal Pengiriman', required: false },
                  ].map(({ key, label, required }) => (
                    <div key={key} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1 truncate" title={label}>
                        {label}
                      </label>
                      <select
                        value={manualMapping[key] || ''}
                        onChange={(e) => handleMappingChange(key, e.target.value)}
                        className="w-full py-1 px-2 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:outline-hidden focus:border-blue-500"
                      >
                        <option value="">-- Tidak Dipetakan --</option>
                        {parseResult.rawHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 
            Requirement 9: Preview Hasil Import
            Table Columns:
            - Customer
            - MO
            - Style
            - Routing
            - Production Stage
            - Work Center / Line
            - Original Production Quantity
            - Quantity
            - Remaining Quantity
            - Repair Quantity
          */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pratinjau Hasil Ekstraksi Data Produksi
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Menampilkan hasil normalisasi 10 kolom operasional sesuai data aktual Excel
                </p>
              </div>

              {/* Search Bar for preview */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari MO, Style, Line, Buyer..."
                  value={previewSearch}
                  onChange={(e) => {
                    setPreviewSearch(e.target.value);
                    setPreviewPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-800"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Customer</th>
                    <th className="py-2.5 px-3 font-semibold">MO</th>
                    <th className="py-2.5 px-3 font-semibold">Style</th>
                    <th className="py-2.5 px-3 font-semibold">Routing</th>
                    <th className="py-2.5 px-3 font-semibold">Tahap Produksi</th>
                    <th className="py-2.5 px-3 font-semibold">Work Center / Line</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Original Qty</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Quantity</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qty Sisa</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Qty Repair</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {paginatedPreviewRows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="py-2 px-3 text-slate-800 font-medium truncate max-w-[130px]" title={row.buyer}>
                        {row.buyer || '-'}
                      </td>
                      <td className="py-2 px-3 font-mono font-semibold text-blue-600">
                        {row.moNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-800 truncate max-w-[160px]" title={row.style}>
                        {row.style}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-600 truncate max-w-[120px]" title={row.routing}>
                        {row.routing || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        <span className="font-semibold text-slate-800">{row.productionStage}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        <span>{row.workCenter}</span>
                        {row.line && row.line !== row.workCenter && (
                          <span className="ml-1 text-[10px] text-slate-400 font-mono">({row.line})</span>
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-slate-700 tabular-nums">
                        {row.originalQty !== undefined ? row.originalQty.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3 font-mono text-right text-slate-700 tabular-nums">
                        {row.quantity !== undefined ? row.quantity.toLocaleString() : '-'}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums">
                        {row.remainingQty !== undefined ? (
                          <span className={row.remainingQty > 0 ? 'text-amber-700 font-bold' : 'text-slate-500'}>
                            {row.remainingQty.toLocaleString()}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-2 px-3 font-mono text-right tabular-nums">
                        {row.repairQty !== undefined && row.repairQty > 0 ? (
                          <span className="text-amber-700 font-bold">{row.repairQty.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-center">
                        {row.needsVerification ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded cursor-help"
                            title={row.verificationIssues?.join(', ')}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Cek
                          </span>
                        ) : row.productionStage === 'Sewing' && row.repairQty && row.repairQty > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                            <Wrench className="w-3 h-3 text-amber-600" />
                            Repair
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Valid
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination for Preview */}
            <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
              <span className="font-mono">
                Menampilkan {paginatedPreviewRows.length} dari {filteredPreviewRows.length} baris data
                {previewSearch ? ` (difilter dari ${parseResult.normalizedOrders.length})` : ''}
              </span>

              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px]">
                  Hal {previewPage} / {previewTotalPages}
                </span>
                <button
                  disabled={previewPage <= 1}
                  onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={previewPage >= previewTotalPages}
                  onClick={() => setPreviewPage((p) => Math.min(previewTotalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>

          {/* Action Bar: Confirm Import & Activate Dataset */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 -mx-6 -mb-6 p-6">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Data pada pratinjau belum tersimpan ke dataset aktif sampai Anda menekan tombol konfirmasi.
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setParseResult(null);
                  setFileBuffer(null);
                  setFileName('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md shadow-2xs"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmActivation}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                Confirm Import & Aktifkan Dataset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template Profiles Section (Requirement 7) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <BookmarkPlus className="w-4 h-4 text-indigo-600" />
              Daftar Profil Template Excel (Template Profiles)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Konfigurasi template yang tersimpan untuk mengenali file Excel otomatis saat di-upload
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">
            {templateProfiles.length} template terdaftar
          </span>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {templateProfiles.map((tpl) => (
            <div
              key={tpl.id}
              className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{tpl.name}</h4>
                    {tpl.isDefault && (
                      <span className="text-[10px] font-semibold px-2 py-0.2 bg-blue-100 text-blue-800 rounded">
                        Bawaan
                      </span>
                    )}
                  </div>
                  {!tpl.isDefault && (
                    <button
                      onClick={() => {
                        if (window.confirm(`Hapus template profile "${tpl.name}"?`)) {
                          deleteTemplateProfile(tpl.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-600"
                      title="Hapus profil template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-600 mb-2.5">{tpl.description}</p>

                <div className="space-y-1 text-[11px] text-slate-500 font-mono">
                  <span className="font-sans font-semibold text-slate-700 block text-[10px] uppercase">
                    Signature Headers:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {tpl.headerSignatures.map((sig: string, i: number) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-700 text-[10px]"
                      >
                        {sig}
                      </span>
                    ))}

                  </div>
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>Dibuat: {new Date(tpl.createdAt).toLocaleDateString('id-ID')}</span>
                <span className="text-emerald-700 font-medium">Siap Digunakan</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Batch History Section (Section 3.D) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-600" />
              Riwayat Batch Upload (Batch Management)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap upload tersimpan dalam batch historis terpisah tanpa menghapus histori sebelumnya
            </p>
          </div>
          <span className="text-xs font-mono text-slate-500">{batches.length} batch tersimpan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Batch Number</th>
                <th className="py-3 px-4 font-semibold">Nama File</th>
                <th className="py-3 px-4 font-semibold">Waktu Upload</th>
                <th className="py-3 px-4 font-semibold text-center">Total Baris</th>
                <th className="py-3 px-4 font-semibold text-center text-emerald-700" title="Jumlah MO Baru ditambahkan">MO Baru</th>
                <th className="py-3 px-4 font-semibold text-center text-blue-700" title="Jumlah MO yang diperbarui">MO Update</th>
                <th className="py-3 px-4 font-semibold text-center text-indigo-700" title="Jumlah tahapan produksi diperbarui">Tahap Update</th>
                <th className="py-3 px-4 font-semibold text-center text-rose-700" title="Jumlah konflik identitas (Style beda)">Konflik</th>
                <th className="py-3 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => {
                const isActive = b.id === activeBatch?.id;

                return (
                  <tr
                    key={b.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      isActive ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-medium">Arsip</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {b.batchNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 truncate max-w-[220px]">
                      {b.fileName}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(b.uploadDate).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-slate-700">{b.totalRows}</td>
                    <td className="py-3 px-4 font-mono text-center text-emerald-700 font-bold">
                      {b.newMOCount !== undefined ? b.newMOCount : b.moCount}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-blue-700 font-bold">
                      {b.updatedMOCount !== undefined ? b.updatedMOCount : 0}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-indigo-700 font-medium">
                      {b.updatedStagesCount !== undefined ? b.updatedStagesCount : '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-center">
                      {b.conflictCount !== undefined && b.conflictCount > 0 ? (
                        <span className="text-rose-700 font-bold bg-rose-100 px-1.5 py-0.5 rounded text-[10px]">
                          {b.conflictCount}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!isActive ? (
                          <button
                            onClick={() => switchActiveBatch(b.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Jadikan Aktif
                          </button>
                        ) : (
                          <span className="text-xs text-emerald-600 font-medium">Sedang Digunakan</span>
                        )}
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus batch "${b.fileName}" beserta datanya?`)) {
                              deleteBatch(b.id);
                            }
                          }}
                          className="text-xs text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 px-4 text-center text-xs text-slate-500">
                    Belum ada riwayat batch upload Excel. Upload file Excel di atas untuk memulai.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
