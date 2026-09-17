/**
 * Konfigurasi ukuran stiker label. Semua dalam mm.
 * A4 = 210 × 297 mm
 */

export const LABELS = {
  // Label 103: 64 × 32 mm | 3 kolom × 4 baris = 12 per A4
  // Pitch: 67 × 34 mm (gap: 3 × 2 mm)
  '103': {
    name: 'Label 103',
    width: 64,
    height: 32,
    cols: 3,
    rows: 4,
    marginTop: 1,
    marginLeft: 6,
    gapX: 3,
    gapY: 2,
    qrSize: 24,
    fontNama: 9,
    fontProdi: 7,
  },

  // Label 107: 50 × 19 mm | 4 kolom × 14 baris = 56 per A4
  '107': {
    name: 'Label 107',
    width: 50,
    height: 19,
    cols: 4,
    rows: 14,
    marginTop: 15.5,
    marginLeft: 5,
    gapX: 0,
    gapY: 0,
    qrSize: 15,
    fontNama: 7,
    fontProdi: 5.5,
  },

  // Label 121: 76 × 38 mm | 2 kolom × 7 baris = 14 per A4
  '121': {
    name: 'Label 121',
    width: 76,
    height: 38,
    cols: 2,
    rows: 7,
    marginTop: 15.5,
    marginLeft: 29,
    gapX: 0,
    gapY: 0,
    qrSize: 28,
    fontNama: 11,
    fontProdi: 8.5,
  },
}

export const labelsPerPage = (cfg) => cfg.cols * cfg.rows
