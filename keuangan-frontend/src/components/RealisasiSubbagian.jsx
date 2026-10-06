import React, { useState, useEffect } from 'react'
import { Layers, Plus, Edit2, Trash2, Calendar, AlertCircle, X, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import { API_BASE_URL } from '../services/api'
import { useTahun } from '../context/TahunContext'

function RealisasiSubbagian() {
  const userRole = localStorage.getItem('role') || 'admin'
  const isReadOnly = userRole === 'user'

  const { selectedTahun } = useTahun()

  const [subbagianData, setSubbagianData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEditId, setSelectedEditId] = useState(null)
  const [namaJudul, setNamaJudul] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/realisasi/subbagian-judul?tahun=${selectedTahun}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.status === 'success' && result.data) {
        setSubbagianData(result.data)
      } else {
        setError('Gagal memproses data subbagian dari server.')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal menghubungkan ke backend server.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedTahun])

  const handleOpenAddModal = () => {
    setSelectedEditId(null)
    setNamaJudul('')
    setModalError('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (id, currentTitle) => {
    setSelectedEditId(id)
    setNamaJudul(currentTitle)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus judul subbagian ini? Semua detail anggaran terkait akan dilepas dari tautan.')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/realisasi/subbagian-judul/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        fetchData()
      } else {
        alert('Gagal menghapus data subbagian.')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan.')
    }
  }

  const handleModalSubmit = async (e) => {
    e.preventDefault()
    setModalError('')
    setIsSubmitting(true)

    if (!namaJudul.trim()) {
      setModalError('Nama judul subbagian wajib diisi!')
      setIsSubmitting(false)
      return
    }

    const payload = {
      nama_judul: namaJudul.trim().toUpperCase() // Auto uppercase
    }

    const targetUrl = selectedEditId 
      ? `${API_BASE_URL}/api/realisasi/subbagian-judul/${selectedEditId}` 
      : `${API_BASE_URL}/api/realisasi/subbagian-judul`
    const targetMethod = selectedEditId ? 'PUT' : 'POST'

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(targetUrl, {
        method: targetMethod,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (response.ok) {
        setIsModalOpen(false)
        fetchData()
      } else {
        setModalError(result.message || 'Gagal menyimpan judul subbagian.')
      }
    } catch (err) {
      console.error(err)
      setModalError('Terjadi kesalahan jaringan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleExportExcel = () => {
    const rows = []

    subbagianData.forEach(group => {
      // 1. Group Header Row
      rows.push({
        'Uraian Kegiatan': group.nama_judul,
        'Pagu': '',
        'Realisasi': '',
        '%': '',
        'Sisa Anggaran': '',
        '% Sisa': ''
      })

      // 2. Group Detail Rows
      group.details.forEach(det => {
        const pagu = parseFloat(det.pagu) || 0
        const realisasi = parseFloat(det.realisasi) || 0
        const persenRealisasi = pagu > 0 ? (realisasi / pagu) * 100 : 0
        const sisa = pagu - realisasi
        const persenSisa = pagu > 0 ? (sisa / pagu) * 100 : 0

        rows.push({
          'Uraian Kegiatan': `   ${det.uraian}`,
          'Pagu': pagu,
          'Realisasi': realisasi,
          '%': persenRealisasi,
          'Sisa Anggaran': sisa,
          '% Sisa': persenSisa
        })
      })

      // If no details
      if (group.details.length === 0) {
        rows.push({
          'Uraian Kegiatan': '   Belum ada program anggaran yang ditautkan ke subbagian ini.',
          'Pagu': '',
          'Realisasi': '',
          '%': '',
          'Sisa Anggaran': '',
          '% Sisa': ''
        })
      }

      // 3. Group Subtotal Row
      const subPagu = parseFloat(group.subtotal_pagu) || 0
      const subRealisasi = parseFloat(group.subtotal_realisasi) || 0
      const subPersenRealisasi = subPagu > 0 ? (subRealisasi / subPagu) * 100 : 0
      const subSisa = subPagu - subRealisasi
      const subPersenSisa = subPagu > 0 ? (subSisa / subPagu) * 100 : 0

      rows.push({
        'Uraian Kegiatan': `Jumlah ${group.nama_judul}`,
        'Pagu': subPagu,
        'Realisasi': subRealisasi,
        '%': subPersenRealisasi,
        'Sisa Anggaran': subSisa,
        '% Sisa': subPersenSisa
      })
    })

    // 4. Grand Total Row
    if (subbagianData.length > 0) {
      const gPagu = parseFloat(grandTotalPagu) || 0
      const gRealisasi = parseFloat(grandTotalRealisasi) || 0
      const gPersenRealisasi = gPagu > 0 ? (gRealisasi / gPagu) * 100 : 0
      const gSisa = gPagu - gRealisasi
      const gPersenSisa = gPagu > 0 ? (gSisa / gPagu) * 100 : 0

      rows.push({
        'Uraian Kegiatan': 'TOTAL KESELURUHAN',
        'Pagu': gPagu,
        'Realisasi': gRealisasi,
        '%': gPersenRealisasi,
        'Sisa Anggaran': gSisa,
        '% Sisa': gPersenSisa
      })
    }

    const worksheet = XLSX.utils.json_to_sheet(rows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Serapan Subbagian')
    XLSX.writeFile(workbook, 'Laporan_Serapan_Subbagian.xlsx')
  }

  // Formatting utilities
  const formatUang = (angka) => {
    return (!angka || parseFloat(angka) === 0 || angka === '0.00') 
      ? '-' 
      : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const formatPersen = (angka) => {
    return (!angka || parseFloat(angka) === 0 || isNaN(angka)) 
      ? '-' 
      : angka.toFixed(2) + '%'
  }

  // Calculate Grand Totals
  let grandTotalPagu = 0
  let grandTotalRealisasi = 0

  if (subbagianData && subbagianData.length > 0) {
    subbagianData.forEach(item => {
      grandTotalPagu += parseFloat(item.subtotal_pagu) || 0
      grandTotalRealisasi += parseFloat(item.subtotal_realisasi) || 0
    })
  }

  const grandPersenRealisasi = grandTotalPagu > 0 ? (grandTotalRealisasi / grandTotalPagu) * 100 : 0
  const grandSisa = grandTotalPagu - grandTotalRealisasi
  const grandPersenSisa = grandTotalPagu > 0 ? (grandSisa / grandTotalPagu) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Realisasi Per Subbagian</h1>
          <p className="text-xs font-medium text-slate-600 mt-1">Monitoring penyerapan anggaran secara berkala berdasarkan unit kerja / subbagian terkait</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <Download className="w-4.5 h-4.5" />
            <span>Download Excel</span>
          </button>
          {!isReadOnly && (
            <button
              onClick={handleOpenAddModal}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Tambah Judul Subbagian</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm">
        {error && (
          <div className="flex items-center gap-2.5 m-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-semibold">Memuat rincian subbagian...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                  <th className="py-4 px-6 border-r border-b border-slate-300 w-5/12">Uraian Kegiatan</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-right w-1/8">Pagu</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-right w-1/8">Realisasi</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-center w-20">%</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-right w-1/8">Sisa Anggaran</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-center w-20">%</th>
                  {!isReadOnly && <th className="py-4 px-6 text-center border-b border-slate-300 w-28">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-xs font-semibold text-slate-800">
                {subbagianData.map((group, gIndex) => {
                  const subPersenRealisasi = group.subtotal_pagu > 0 ? (group.subtotal_realisasi / group.subtotal_pagu) * 100 : 0
                  const subSisa = group.subtotal_pagu - group.subtotal_realisasi
                  const subPersenSisa = group.subtotal_pagu > 0 ? (subSisa / group.subtotal_pagu) * 100 : 0
                  const warnaSubSisa = subSisa < 0 ? 'text-red-600' : 'text-blue-700'

                  return (
                    <React.Fragment key={group.id || `group-${gIndex}`}>
                      {/* 1. Group Header Row */}
                      <tr className="bg-emerald-50 border-l-4 border-emerald-500 font-bold text-emerald-950 [&_td]:!text-emerald-950 hover:bg-emerald-100 transition-colors">
                        <td className="py-3.5 px-6 border-r border-b border-slate-300 text-xs font-black tracking-wide uppercase" colSpan="6">
                          {group.nama_judul}
                        </td>
                        {!isReadOnly && (
                          <td className="py-3 px-6 text-center border-b border-slate-300">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEditModal(group.id, group.nama_judul)}
                                className="p-1 bg-white hover:bg-emerald-100 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-lg transition-colors shadow-xs"
                                title="Rename Subbagian"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(group.id)}
                                className="p-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 rounded-lg transition-colors shadow-xs"
                                title="Delete Subbagian"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* 2. Group Detail Rows */}
                      {group.details.map((det, dIndex) => {
                        const persenRealisasi = det.pagu > 0 ? (det.realisasi / det.pagu) * 100 : 0
                        const sisa = det.pagu - det.realisasi
                        const persenSisa = det.pagu > 0 ? (sisa / det.pagu) * 100 : 0
                        const warnaSisa = sisa < 0 ? 'text-red-600' : ''

                        return (
                          <tr key={det.id || `det-${group.id || gIndex}-${dIndex}`} className="hover:bg-slate-50 transition-colors font-medium text-slate-800">
                            <td className="py-3 px-6 pl-10 border-r border-b border-slate-300 text-slate-800 select-all font-sans text-xs">{det.uraian}</td>
                            <td className="py-3 px-6 border-r border-b border-slate-300 text-right font-mono font-bold text-slate-800">{formatUang(det.pagu)}</td>
                            <td className="py-3 px-6 border-r border-b border-slate-300 text-right font-mono text-slate-800">{formatUang(det.realisasi)}</td>
                            <td className="py-3 px-6 border-r border-b border-slate-300 text-center font-mono text-slate-800">{formatPersen(persenRealisasi)}</td>
                            <td className={`py-3 px-6 border-r border-b border-slate-300 text-right font-mono font-bold ${warnaSisa}`}>{formatUang(sisa)}</td>
                            <td className={`py-3 px-6 border-r border-b border-slate-300 text-center font-mono font-bold ${warnaSisa}`}>{formatPersen(persenSisa)}</td>
                            {!isReadOnly && <td className="py-3 px-6 border-b border-slate-300"></td>}
                          </tr>
                        )
                      })}

                      {group.details.length === 0 && (
                        <tr className="text-slate-600 font-sans italic text-xs">
                          <td className="py-4 px-10 border-r border-b border-slate-300" colSpan="6">
                            Belum ada program anggaran yang ditautkan ke subbagian ini.
                          </td>
                          {!isReadOnly && <td className="py-4 px-6 border-b border-slate-300"></td>}
                        </tr>
                      )}

                      {/* 3. Group Subtotal Row */}
                      <tr className="bg-amber-50 font-bold text-amber-950 [&_td]:!text-amber-950">
                        <td className="py-3 px-6 border-r border-b border-slate-300 font-sans text-xs">Jumlah {group.nama_judul}</td>
                        <td className="py-3 px-6 border-r border-b border-slate-300 text-right font-mono">{formatUang(group.subtotal_pagu)}</td>
                        <td className="py-3 px-6 border-r border-b border-slate-300 text-right font-mono">{formatUang(group.subtotal_realisasi)}</td>
                        <td className="py-3 px-6 border-r border-b border-slate-300 text-center font-mono">{formatPersen(subPersenRealisasi)}</td>
                        <td className={`py-3 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold ${warnaSubSisa}`}>{formatUang(subSisa)}</td>
                        <td className={`py-3 px-6 border-r border-b border-slate-300 text-center font-mono font-extrabold ${warnaSubSisa}`}>{formatPersen(subPersenSisa)}</td>
                        {!isReadOnly && <td className="py-3 px-6 border-r border-b border-slate-300"></td>}
                      </tr>
                    </React.Fragment>
                  )
                })}

                {/* 4. Grand Total Row */}
                {subbagianData.length > 0 && (
                  <tr className="bg-rose-50 text-rose-950 font-black border-t-2 border-slate-300 text-xs [&_td]:!text-rose-950">
                    <td className="py-4 px-6 border-r border-b border-slate-300 text-center uppercase tracking-wider font-sans">TOTAL KESELURUHAN</td>
                    <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold">{formatUang(grandTotalPagu)}</td>
                    <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold">{formatUang(grandTotalRealisasi)}</td>
                    <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono">{formatPersen(grandPersenRealisasi)}</td>
                    <td className={`py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold ${grandSisa < 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatUang(grandSisa)}</td>
                    <td className={`py-4 px-6 border-r border-b border-slate-300 text-center font-mono font-extrabold ${grandSisa < 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatPersen(grandPersenSisa)}</td>
                    {!isReadOnly && <td className="border-b border-slate-300"></td>}
                  </tr>
                )}

                {subbagianData.length === 0 && (
                  <tr>
                    <td colSpan={isReadOnly ? 6 : 7} className="py-16 text-center text-slate-600 font-semibold">
                      Belum ada judul subbagian. Silakan klik tombol Tambah.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Title Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                <span>{selectedEditId ? 'Edit Judul Subbagian' : 'Tambah Judul Subbagian'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0"></span>
                  <span>{modalError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Nama Judul Subbagian
                </label>
                <input
                  type="text"
                  value={namaJudul}
                  onChange={(e) => setNamaJudul(e.target.value)}
                  placeholder="Contoh: SUBBAGIAN BANGUNAN"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-emerald-500 transition-all font-bold"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </form>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl py-2.5 px-5 transition-all duration-200"
                disabled={isSubmitting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleModalSubmit}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl py-2.5 px-6 shadow-md transition-all duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RealisasiSubbagian
