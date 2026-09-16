/**
 * Konfigurasi ukuran stiker label.
 * SEMUA dalam mm — wajib konsisten supaya presisi 1:1 saat print.
 * A4 = 210 × 297 mm
 */

export const LABELS = {
  // Label 103: 64 × 32 mm | 3 kolom × 8 baris = 24 per A4
  // Total: 3×64 = 192mm (margin 9mm kiri-kanan)
  //        8×32 = 256mm (margin 20.5mm atas-bawah)
  '103': {
    name: 'Label 103',
    width: 64,
    height: 32,
    cols: 3,
    rows: 8,
    marginTop: 20.5,
    marginLeft: 9,
    gapX: 0,
    gapY: 0,
    qrSize: 24,
    fontNama: 9,
    fontProdi: 7,
    fontId: 6,
  },

  // Label 107: 50 × 19 mm | 4 kolom × 14 baris = 56 per A4
  // Total: 4×50 = 200mm (margin 5mm kiri-kanan)
  //        14×19 = 266mm (margin 15.5mm atas-bawah)
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
    fontId: 4.5,
  },

  // Label 121: 76 × 38 mm | 2 kolom × 7 baris = 14 per A4
  // Total: 2×76 = 152mm (margin 29mm kiri-kanan)
  //        7×38 = 266mm (margin 15.5mm atas-bawah)
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
    fontId: 6.5,
  },
}

export const labelsPerPage = (cfg) => cfg.cols * cfg.rows
