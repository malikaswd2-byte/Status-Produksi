import React, { useState, useRef } from 'react';
import { usePPIC } from '../context/PPICContext';
import {
  parseExcelWorkbook,
  detectColumnMappings,
  generateSampleExcelWorkbook,
} from '../services/excelParser';
import {
  ColumnMappingConfig,
  ExcelParsingResult,
  UploadBatch,
} from '../types/ppic';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowRight,
  Download,
  Trash2,
  Check,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const UploadView: React.FC = () => {
  const {
    activeBatch,
    batches,
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

  // Handle file selection
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

      const parsed = parseExcelWorkbook(buffer, name);
      setParseResult(parsed);
      setSelectedSheet(parsed.selectedSheet);
      setManualMapping(parsed.detectedMapping);
      showToast(`File ${name} berhasil dibaca (${parsed.summary.totalRows} baris data)`, 'success');
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
      const parsed = parseExcelWorkbook(fileBuffer, fileName, sheet, manualMapping);
      setParseResult(parsed);
      setManualMapping(parsed.detectedMapping);
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
        const reParsed = parseExcelWorkbook(fileBuffer, fileName, selectedSheet, updated);
        setParseResult(reParsed);
      } catch {
        // ignore
      }
    }
  };

  // User confirmation to activate dataset (Section 3.A step 8)
  const handleConfirmActivation = () => {
    if (!parseResult) return;

    if (!manualMapping.moNumber || !manualMapping.style) {
      showToast('Pemetaan kolom MO dan Style wajib ditentukan sebelum konfirmasi!', 'error');
      return;
    }

    const newBatchId = `BATCH-${Date.now()}`;
    const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;

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
    };

    // Update batchId on parsed orders
    const ordersWithBatchId = parseResult.normalizedOrders.map((o) => ({
      ...o,
      batchId: newBatchId,
    }));

    confirmUploadBatch(newBatch, ordersWithBatchId);
    setParseResult(null);
    setFileBuffer(null);
    setFileName('');
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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Excel Ingestion & Data Batches
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Unggah file Excel operasional (.xlsx / .xls), lakukan pemetaan kolom, dan aktifkan batch data
          </p>
        </div>

        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-md transition-colors shadow-2xs"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Download Format Template Excel (.xlsx)</span>
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
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-slate-400 bg-white'
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
          Mendukung lembar kerja tunggal maupun multi-sheet. Sistem akan memindai header dan struktur kolom secara otomatis.
        </p>

        {isProcessing && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-blue-600 font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Membaca dan memproses workbook Excel...</span>
          </div>
        )}
      </div>

      {/* Parse Preview & Column Mapping Stage (Visible when file is parsed) */}
      {parseResult && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">{parseResult.fileName}</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Pratinjau data berhasil dibuat. Periksa pemetaan kolom sebelum mengonfirmasi aktivasi.
              </p>
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

          {/* Parsing Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium uppercase block">Total Baris</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {parseResult.summary.totalRows}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium uppercase block">Unique MO</span>
              <span className="text-xl font-bold font-mono text-blue-600">
                {parseResult.summary.moCount}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium uppercase block">Unique Style</span>
              <span className="text-xl font-bold font-mono text-indigo-600">
                {parseResult.summary.styleCount}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium uppercase block">Work Center</span>
              <span className="text-xl font-bold font-mono text-amber-600">
                {parseResult.summary.workCenterCount}
              </span>
            </div>
          </div>

          {/* Warnings List */}
          {parseResult.warnings.length > 0 && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                Catatan Integritas Data Excel:
              </div>
              <ul className="list-disc list-inside text-amber-800 space-y-1 pl-1">
                {parseResult.warnings.map((warn, i) => (
                  <li key={i}>{warn}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Flexible Column Mapping Matrix (Section 3.B) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Konfigurasi Pemetaan Kolom (Flexible Column Mapping)
              </h4>
              <span className="text-[11px] text-slate-500">
                Sesuaikan jika ada kolom yang perlu dikoreksi secara manual
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { key: 'moNumber' as const, label: 'Nomor MO *', required: true },
                { key: 'style' as const, label: 'Nama Style *', required: true },
                { key: 'workCenter' as const, label: 'Work Center *', required: true },
                { key: 'productionStage' as const, label: 'Tahap Produksi', required: false },
                { key: 'targetQty' as const, label: 'Target Produksi (Qty)', required: false },
                { key: 'actualQty' as const, label: 'Output Aktual', required: false },
                { key: 'sewingCondition' as const, label: 'Kondisi Sewing (Normal/Repair/Rework)', required: false },
                { key: 'repairQty' as const, label: 'Qty Repair (Sewing)', required: false },
                { key: 'reworkQty' as const, label: 'Qty Rework (Sewing)', required: false },
                { key: 'qaStatus' as const, label: 'Status / Hasil QA (Aktual Excel)', required: false },
                { key: 'startDate' as const, label: 'Tanggal Mulai', required: false },
                { key: 'endDate' as const, label: 'Tanggal Selesai', required: false },
                { key: 'deliveryDate' as const, label: 'Tanggal Pengiriman', required: false },
                { key: 'buyer' as const, label: 'Buyer / Pemesan', required: false },
                { key: 'notes' as const, label: 'Catatan / Remark', required: false },
              ].map(({ key, label, required }) => (
                <div key={key} className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
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

          {/* Preview Table of Normalized Rows */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Pratinjau Hasil Normalisasi (10 Baris Pertama)
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[11px]">
                  <tr>
                    <th className="py-2 px-3 font-semibold">Nomor MO</th>
                    <th className="py-2 px-3 font-semibold">Style</th>
                    <th className="py-2 px-3 font-semibold">Work Center</th>
                    <th className="py-2 px-3 font-semibold">Tahap</th>
                    <th className="py-2 px-3 font-semibold text-right">Target</th>
                    <th className="py-2 px-3 font-semibold text-right">Aktual</th>
                    <th className="py-2 px-3 font-semibold">Status QA</th>
                    <th className="py-2 px-3 font-semibold">Tgl Kirim</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {parseResult.normalizedOrders.slice(0, 10).map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-semibold text-blue-600">{row.moNumber}</td>
                      <td className="py-2 px-3 font-sans text-slate-800">{row.style}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">{row.workCenter}</td>
                      <td className="py-2 px-3 font-sans text-slate-700">
                        {row.productionStage}
                        {row.productionStage === 'Sewing' && row.sewingCondition && row.sewingCondition !== 'Normal' && (
                          <span className={`ml-1 text-[10px] font-semibold px-1 rounded ${
                            row.sewingCondition === 'Rework'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {row.sewingCondition}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700">{row.targetQty.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-emerald-700 font-semibold">{row.actualQty.toLocaleString()}</td>
                      <td className="py-2 px-3 font-sans">{row.qaStatus || '-'}</td>
                      <td className="py-2 px-3 text-slate-600">{row.deliveryDate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Confirmation Action Bar (Section 3.A Step 8) */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 -mx-6 -mb-6 p-6">
            <p className="text-xs text-slate-600">
              Data belum diaktifkan. Klik tombol konfirmasi untuk menerapkan batch ini sebagai dataset operasional aktif.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setParseResult(null);
                  setFileBuffer(null);
                  setFileName('');
                }}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-md"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmActivation}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                Konfirmasi & Jadikan Data Aktif
              </button>
            </div>
          </div>
        </div>
      )}

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
                <th className="py-3 px-4 font-semibold text-center">MO</th>
                <th className="py-3 px-4 font-semibold text-center">Style</th>
                <th className="py-3 px-4 font-semibold text-center">Work Center</th>
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
                    <td className="py-3 px-4 font-mono text-center text-blue-600 font-semibold">
                      {b.moCount}
                    </td>
                    <td className="py-3 px-4 font-mono text-center text-slate-700">{b.styleCount}</td>
                    <td className="py-3 px-4 font-mono text-center text-slate-700">
                      {b.workCenterCount}
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
                        {batches.length > 1 && (
                          <>
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
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
