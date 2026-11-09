import test from 'node:test';
import assert from 'node:assert/strict';
import { detectColumnMappings, normalizeExcelDate } from './excelParser';

test('detectColumnMappings identifies Indonesian and English headers accurately', () => {
  const headers = [
    'No MO',
    'Style Name',
    'Line Produksi',
    'Tahap Proses',
    'Target Produksi',
    'Qty Aktual',
    'Status QC',
    'Tgl Mulai',
    'Tgl Selesai',
    'Tgl Kirim',
    'Buyer / Brand',
    'Catatan PPIC',
  ];

  const mapping = detectColumnMappings(headers);
  assert.equal(mapping.moNumber, 'No MO');
  assert.equal(mapping.style, 'Style Name');
  assert.equal(mapping.workCenter, 'Line Produksi');
  assert.equal(mapping.productionStage, 'Tahap Proses');
  assert.equal(mapping.targetQty, 'Target Produksi');
  assert.equal(mapping.actualQty, 'Qty Aktual');
  assert.equal(mapping.qaStatus, 'Status QC');
  assert.equal(mapping.startDate, 'Tgl Mulai');
  assert.equal(mapping.endDate, 'Tgl Selesai');
  assert.equal(mapping.deliveryDate, 'Tgl Kirim');
  assert.equal(mapping.buyer, 'Buyer / Brand');
  assert.equal(mapping.notes, 'Catatan PPIC');
});

test('normalizeExcelDate handles varied date formats correctly', () => {
  assert.equal(normalizeExcelDate('2026-11-15'), '2026-11-15');
  assert.equal(normalizeExcelDate('15/11/2026'), '2026-11-15');
  assert.equal(normalizeExcelDate('2026/11/15'), '2026-11-15');
  assert.equal(normalizeExcelDate(new Date('2026-11-15T00:00:00Z')), '2026-11-15');
});
