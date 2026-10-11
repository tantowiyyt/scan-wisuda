/**
 * FamilyFormModal - Tambah / edit satu wisudawan beserta undangan orang tuanya.
 * Mode tambah: kode QR diisi (jadi <kode>-A/-B/-C). Mode edit: kode QR terkunci
 * karena undangan sudah dicetak.
 */

import { useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_SERVER_URL || ''
const OTHER = '__other'
const JENJANG_DEFAULT = ['D3', 'D4']

/**
 * Pilihan prodi diambil dari data wisudawan yang sudah ada di event (hasil import),
 * agar penulisannya seragam. Tiap prodi dipetakan ke jenjang yang paling sering dipakai.
 */
function buildOptions(families) {
  const prodi = new Map()
  const jenjang = new Set(JENJANG_DEFAULT)
  for (const f of families) {
    const m = f.mahasiswa
    if (!m) continue
    if (m.jenjang) jenjang.add(m.jenjang)
    if (!m.prodi) continue
    const counts = prodi.get(m.prodi) || {}
    if (m.jenjang) counts[m.jenjang] = (counts[m.jenjang] || 0) + 1
    prodi.set(m.prodi, counts)
  }
  const prodiList = [...prodi.entries()]
    .map(([name, counts]) => ({
      name,
      jenjang: Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '',
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'id'))
  return { prodiList, jenjangList: [...jenjang].sort() }
}

const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900/50 outline-none transition disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-500'

function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  )
}

export default function FamilyFormModal({ eventId, family, families = [], onClose, onSaved }) {
  const isEdit = !!family
  const mhs = family?.mahasiswa || {}
  const [form, setForm] = useState({
    qr_code: family?.family_group || '',
    name: mhs.name || '',
    nim: mhs.nim || '',
    kelas: mhs.kelas || '',
    prodi: mhs.prodi || '',
    jenjang: mhs.jenjang || '',
    nama_ayah: family?.ayah?.name || '',
    nama_ibu: family?.ibu?.name || '',
  })
  const { prodiList, jenjangList } = useMemo(() => buildOptions(families), [families])
  // Mode ketik manual: prodi belum ada di daftar, atau daftar masih kosong
  const [customProdi, setCustomProdi] = useState(
    () => !!mhs.prodi && !prodiList.some(p => p.name === mhs.prodi)
  )
  const showProdiInput = customProdi || prodiList.length === 0
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  function handleProdiSelect(e) {
    const value = e.target.value
    if (value === OTHER) {
      setCustomProdi(true)
      setForm(f => ({ ...f, prodi: '' }))
      return
    }
    setCustomProdi(false)
    const opt = prodiList.find(p => p.name === value)
    // Jenjang ikut terisi sesuai prodi yang dipilih
    setForm(f => ({ ...f, prodi: value, jenjang: opt?.jenjang || f.jenjang }))
  }

  // Jenjang saat ini tetap muncul walau tidak ada di daftar standar
  const jenjangOptions = form.jenjang && !jenjangList.includes(form.jenjang)
    ? [...jenjangList, form.jenjang]
    : jenjangList

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const url = isEdit
        ? `${API_URL}/api/events/${eventId}/families/${encodeURIComponent(family.family_group)}`
        : `${API_URL}/api/events/${eventId}/families`
      // Saat tambah, nama orang tua kosong = dibuat otomatis dari nama mahasiswa
      const body = isEdit ? form : { ...form, nama_ayah: undefined, nama_ibu: undefined }
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json.status !== 'success') throw new Error(json.message || `HTTP ${res.status}`)
      onSaved(isEdit ? `Data ${form.name} diperbarui` : `${form.name} ditambahkan (${form.qr_code}-A/B/C)`)
    } catch (err) {
      setError(err.message || 'Gagal menyimpan')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {isEdit ? 'Edit Wisudawan' : 'Tambah Wisudawan'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-5">
          {isEdit
            ? 'Kode QR tidak bisa diubah karena undangan sudah dicetak.'
            : 'Otomatis dibuat 3 undangan: mahasiswa (-A), ayah (-B), dan ibu (-C).'}
        </p>

        <div className="grid grid-cols-2 gap-4">
          <Field
            label="Kode QR"
            hint={isEdit ? null : `Undangan: ${form.qr_code || 'WSD-001'}-A, -B, -C`}
            className="col-span-2 sm:col-span-1"
          >
            <input
              required
              disabled={isEdit}
              maxLength={40}
              pattern="[A-Za-z0-9._\-]+"
              title="Huruf, angka, tanda - _ ."
              value={form.qr_code}
              onChange={set('qr_code')}
              placeholder="WSD-101"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="NIM" className="col-span-2 sm:col-span-1">
            <input value={form.nim} onChange={set('nim')} maxLength={30} placeholder="2201001" className={inputClass} />
          </Field>
          <Field label="Nama mahasiswa" className="col-span-2">
            <input required autoFocus={!isEdit} value={form.name} onChange={set('name')} maxLength={100} placeholder="Nama lengkap" className={inputClass} />
          </Field>
          <div className="col-span-2">
            <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">Prodi</span>
            {prodiList.length > 0 && (
              <select
                value={showProdiInput ? OTHER : form.prodi}
                onChange={handleProdiSelect}
                className={inputClass}
              >
                <option value="">— Pilih prodi —</option>
                {prodiList.map(p => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
                <option value={OTHER}>＋ Prodi lain…</option>
              </select>
            )}
            {showProdiInput && (
              <input
                value={form.prodi}
                onChange={set('prodi')}
                maxLength={100}
                autoFocus={prodiList.length > 0}
                placeholder="Tulis nama prodi, mis. D3 Teknik Informatika"
                className={`${inputClass} ${prodiList.length > 0 ? 'mt-2' : ''}`}
              />
            )}
            <span className="block text-[11px] text-slate-400 mt-1">
              {prodiList.length > 0
                ? 'Pilihan diambil dari data wisudawan di event ini.'
                : 'Belum ada data prodi di event ini — tulis manual.'}
            </span>
          </div>
          <Field label="Jenjang">
            <select value={form.jenjang} onChange={set('jenjang')} className={inputClass}>
              <option value="">— Pilih —</option>
              {jenjangOptions.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </Field>
          <Field label="Kelas">
            <input value={form.kelas} onChange={set('kelas')} maxLength={30} placeholder="TI-3A" className={inputClass} />
          </Field>

          {isEdit && (
            <>
              <Field label="Nama ayah (undangan -B)" className="col-span-2">
                <input required value={form.nama_ayah} onChange={set('nama_ayah')} maxLength={100} className={inputClass} />
              </Field>
              <Field label="Nama ibu (undangan -C)" className="col-span-2">
                <input required value={form.nama_ibu} onChange={set('nama_ibu')} maxLength={100} className={inputClass} />
              </Field>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 text-sm rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium transition"
          >
            {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah'}
          </button>
        </div>
      </form>
    </div>
  )
}
