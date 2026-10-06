import { useState, useEffect, useRef } from 'react'
import { FileText, Plus, Search, Filter, Edit2, Trash2, Calendar, AlertCircle, Download, FileSpreadsheet } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import SpmModal from './SpmModal'
import axiosInstance from '../services/axiosInstance'
import useAuth from '../hooks/useAuth'
import { useTahun } from '../context/TahunContext'

function SpmList() {
  const [spmData, setSpmData] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Ambil state user dari hook useAuth agar UI langsung reaktif
  const { user } = useAuth()
  const isReadOnly = user?.role === 'user'
  
  // Ambil state tahun aktif
  const { selectedTahun } = useTahun()

  // Modal control states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEditId, setSelectedEditId] = useState(null)

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      const mappedLocalData = localData.map(item => ({
        id: item.id,
        rekanan: item.rekanan || '-',
        verifikasi_tanggal: item.tanggalVerifikasi || item.verifikasi_tanggal || '',
        verifikasi_nomor: item.nomorVerifikasi || item.verifikasi_nomor || '-',
        verifikasi_nilai: item.nilaiVerifikasi || item.verifikasi_nilai || 0,
        proses: item.status || item.proses || 'Menunggu',
        kontrak: item.kontrak || '-',
        kro: item.kro || '-',
        ro: item.ro || '-',
        nomor_akun: item.akun || item.nomor_akun || '-',
        kegiatan: item.kegiatan || '-',
        spm_tanggal: item.spmTanggal || item.spm_tanggal || '',
        spm_nomor: item.spmNomor || item.spm_nomor || '',
        spm_nilai: item.spmNilai || item.spm_nilai || '',
        sp2d_tanggal: item.tanggalSP2D || item.sp2dTanggal || item.sp2d_tanggal || '',
        sp2d_nomor: item.noSP2D || item.sp2dNomor || item.sp2d_nomor || '',
        sp2d_nilai: item.sp2dNilai || item.sp2d_nilai || '',
        tipe: 'Form Verifikasi',
        keterangan: '-'
      }))

      const response = await axiosInstance.get(`/api/spm?tahun=${selectedTahun}`)
      const result = response.data
      
      let serverData = []
      if (result.status === 'success' && Array.isArray(result.data)) {
        serverData = result.data
      }

      setSpmData([...mappedLocalData, ...serverData])
    } catch (err) {
      console.error(err)
      const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      const mappedLocalData = localData.map(item => ({
        id: item.id,
        rekanan: item.rekanan || '-',
        verifikasi_tanggal: item.tanggalVerifikasi || item.verifikasi_tanggal || '',
        verifikasi_nomor: item.nomorVerifikasi || item.verifikasi_nomor || '-',
        verifikasi_nilai: item.nilaiVerifikasi || item.verifikasi_nilai || 0,
        proses: item.status || item.proses || 'Menunggu',
        kontrak: item.kontrak || '-',
        kro: item.kro || '-',
        ro: item.ro || '-',
        nomor_akun: item.akun || item.nomor_akun || '-',
        kegiatan: item.kegiatan || '-',
        spm_tanggal: item.spmTanggal || item.spm_tanggal || '',
        spm_nomor: item.spmNomor || item.spm_nomor || '',
        spm_nilai: item.spmNilai || item.spm_nilai || '',
        sp2d_tanggal: item.tanggalSP2D || item.sp2dTanggal || item.sp2d_tanggal || '',
        sp2d_nomor: item.noSP2D || item.sp2dNomor || item.sp2d_nomor || '',
        sp2d_nilai: item.sp2dNilai || item.sp2d_nilai || '',
        tipe: 'Form Verifikasi',
        keterangan: '-'
      }))
      setSpmData(mappedLocalData)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [selectedTahun])

  const handleDelete = (id) => {
    if (isReadOnly) return

    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Data SPM yang dihapus tidak dapat dikembalikan!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Data!',
      cancelButtonText: 'Batal',
      background: '#ffffff',
      color: '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
        const updatedLocal = localData.filter(item => item.id !== id)
        localStorage.setItem('dataTransaksi', JSON.stringify(updatedLocal))

        try {
          await axiosInstance.delete(`/api/spm/${id}`)
        } catch (err) {
          console.error(err)
        }

        fetchData()
        Swal.fire({
          title: 'Terhapus!',
          text: 'Data SPM berhasil dihapus.',
          icon: 'success',
          confirmButtonColor: '#2563eb'
        })
      }
    })
  }

  const handleEditClick = (id) => {
    if (isReadOnly) return
    setSelectedEditId(id)
    setIsModalOpen(true)
  }

  const handleAddClick = () => {
    if (isReadOnly) return
    setSelectedEditId(null)
    setIsModalOpen(true)
  }

  const formatTanggalExcel = (dateString) => {
    if (!dateString) return '-'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return String(dateString)
      return date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    } catch (e) {
      return String(dateString)
    }
  }

  const handleExportExcel = () => {
    const excelData = filteredData.map((item, index) => {
      const isSelesai = (item.proses && item.proses.toLowerCase().includes('selesai')) || 
                        (item.status && item.status.toLowerCase().includes('selesai')) || 
                        Boolean(item.sp2d_nomor || item.sp2dNomor || item.noSP2D)
      const sp2dNoDisplay = item.sp2d_nomor || item.sp2dNomor || item.noSP2D || ''
      const sp2dTglDisplay = item.sp2d_tanggal || item.sp2dTanggal || item.tanggalSP2D || ''
      const sp2dNilaiDisplay = item.sp2d_nilai || item.sp2dNilai || ''

      return {
        'NO': index + 1,
        'REKANAN': item.rekanan || '-',
        'VERIFIKASI - TANGGAL': formatTanggalExcel(item.verifikasi_tanggal),
        'VERIFIKASI - NOMOR': item.verifikasi_nomor || '-',
        'VERIFIKASI - NILAI': parseFloat(item.verifikasi_nilai) || 0,
        'STATUS': item.proses || '-',
        'KONTRAK': item.kontrak || '-',
        'TIPE': item.tipe || '-',
        'AKUN & URAIAN - KRO': item.kro || '-',
        'AKUN & URAIAN - RO': item.ro || '-',
        'AKUN & URAIAN - AKUN': item.nomor_akun || '-',
        'AKUN & URAIAN - KEGIATAN': item.kegiatan || item.keterangan || '-',
        'SPM - TANGGAL': isSelesai ? formatTanggalExcel(item.spm_tanggal) : '-',
        'SPM - NOMOR': isSelesai ? (item.spm_nomor || '-') : '-',
        'SPM - NILAI': isSelesai ? (parseFloat(item.spm_nilai) || 0) : 0,
        'SP2D - TANGGAL': sp2dTglDisplay ? formatTanggalExcel(sp2dTglDisplay) : '-',
        'SP2D - NOMOR': sp2dNoDisplay ? sp2dNoDisplay : '-',
        'SP2D - NILAI': sp2dNilaiDisplay ? (parseFloat(sp2dNilaiDisplay) || 0) : 0,
        'KETERANGAN': item.kegiatan || item.keterangan || '-'
      }
    })

    const worksheet = XLSX.utils.json_to_sheet(excelData)
    worksheet['!cols'] = [
      { wch: 6 },   // NO
      { wch: 25 },  // REKANAN
      { wch: 20 },  // VERIFIKASI TANGGAL
      { wch: 22 },  // VERIFIKASI NOMOR
      { wch: 20 },  // VERIFIKASI NILAI
      { wch: 14 },  // STATUS
      { wch: 20 },  // KONTRAK
      { wch: 18 },  // TIPE
      { wch: 14 },  // KRO
      { wch: 14 },  // RO
      { wch: 16 },  // AKUN
      { wch: 32 },  // KEGIATAN
      { wch: 16 },  // SPM TANGGAL
      { wch: 20 },  // SPM NOMOR
      { wch: 20 },  // SPM NILAI
      { wch: 16 },  // SP2D TANGGAL
      { wch: 20 },  // SP2D NOMOR
      { wch: 20 },  // SP2D NILAI
      { wch: 32 }   // KETERANGAN
    ]

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rincian SPM SP2D')
    XLSX.writeFile(workbook, 'Data_Rincian_SPM_SP2D.xlsx')
  }

  const handleFileUpload = async (e) => {
    if (isReadOnly) return
    const file = e.target.files[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    Swal.fire({
      title: 'Memproses Import...',
      text: 'Mohon tunggu, sedang memperbarui data SP2D dari Excel...',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const response = await axiosInstance.post('/api/spm/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      const result = response.data

      if (result.status === 'success') {
        Swal.fire({
          title: 'Import Berhasil!',
          text: result.message || `Berhasil memperbarui ${result.updatedCount || 0} data SP2D.`,
          icon: 'success',
          confirmButtonColor: '#2563eb'
        })
        fetchData()
      } else {
        Swal.fire({
          title: 'Gagal Import',
          text: result.message || 'Terjadi kesalahan saat memproses file Excel.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        })
      }
    } catch (err) {
      console.error('Import Error:', err)
      Swal.fire({
        title: 'Gagal Import',
        text: 'Terjadi kesalahan koneksi server saat mengunggah file.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      e.target.value = ''
    }
  }

  // Formatter utilities
  const formatUang = (angka) => {
    return (!angka || parseFloat(angka) === 0) 
      ? '-' 
      : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka)
  }

  const formatTanggalTabel = (tglStr) => {
    if (!tglStr || tglStr === '0000-00-00') return '-'
    const d = new Date(tglStr)
    if (isNaN(d.getTime())) return '-'
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  const getStatusBadge = (status) => {
    const s = status ? status.toLowerCase() : ''
    if (s.includes('sp2d') || s.includes('selesai') || s.includes('cair')) {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800">Selesai</span>
    }
    if (s.includes('verifikasi') || s.includes('proses')) {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 border border-amber-300 text-amber-800">Proses</span>
    }
    return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 border border-slate-300 text-slate-700">{status}</span>
  }

  // Filter logic
  const filteredData = spmData.filter(item => {
    const matchesSearch = 
      (item.rekanan || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.spm_nomor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sp2d_nomor || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.keterangan || '').toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = 
      statusFilter === 'All' ||
      (item.proses || '').toLowerCase() === statusFilter.toLowerCase()

    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800">Rincian SPM & SP2D</h1>
          <p className="text-xs font-medium text-slate-600 mt-1">Kelola data realisasi Surat Perintah Membayar (SPM) dan Surat Perintah Pencairan Dana (SP2D)</p>
        </div>
        <div className="flex items-center gap-3 self-start">
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls"
            onChange={handleFileUpload}
            className="hidden"
          />
          {/* Sembunyikan Tombol Import jika role 'user' (read-only) */}
          {!isReadOnly && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              <span>Import MyIntress</span>
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
          >
            <Download className="w-4.5 h-4.5" />
            <span>Download Excel</span>
          </button>
          {/* Sembunyikan Tombol Tambah Data jika role 'user' (read-only) */}
          {!isReadOnly && (
            <button
              onClick={handleAddClick}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>Tambah Data</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari Rekanan, No. SPM, No. SP2D, keterangan..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-blue-500 transition-all"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="text-slate-600 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all w-full md:w-44 font-semibold"
          >
            <option value="All">Semua Proses</option>
            <option value="Proses">Proses</option>
            <option value="Selesai">Selesai</option>
          </select>
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
            <span className="text-xs font-medium">Memuat data SPM...</span>
          </div>
        ) : (
          <div className="table-scroll-container overflow-auto max-h-[65vh] flex-1 min-h-0">
            <table className="excel-table w-full min-w-[1600px] text-left border-collapse">
              <thead className="sticky top-0 z-20 bg-slate-100 shadow-xs">
                <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                  <th className="py-4 px-4 text-center border-r border-b border-slate-300" rowSpan="2">No</th>
                  <th className="py-4 px-4 border-r border-b border-slate-300" rowSpan="2">Rekanan</th>
                  <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r" colSpan="5">Verifikasi</th>
                  <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r" colSpan="4">Akun & Uraian</th>
                  <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r" colSpan="3">SPM</th>
                  <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r" colSpan="3">SP2D</th>
                  <th className="py-4 px-4 text-center border-r border-b border-slate-300" rowSpan="2">Type</th>
                  <th className="py-4 px-4 border-r border-b border-slate-300" rowSpan="2">Keterangan</th>
                  {/* Sembunyikan Header Kolom Aksi jika role 'user' (read-only) */}
                  {!isReadOnly && <th className="py-4 px-4 text-center border-b border-slate-300" rowSpan="2">Aksi</th>}
                </tr>
                <tr className="border-b border-slate-300 text-[9px] font-bold text-slate-700 uppercase bg-slate-100">
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Tanggal</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Nomor</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Nilai</th>
                  <th className="py-2.5 px-4 text-center border-r border-b border-slate-300">Status</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Kontrak</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">KRO</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">RO</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Akun</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Kegiatan</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Tanggal</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Nomor</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Nilai</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Tanggal</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Nomor</th>
                  <th className="py-2.5 px-4 border-r border-b border-slate-300">Nilai</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-xs font-semibold text-slate-800">
                {filteredData.map((item, index) => {
                  const isSelesai = (item.proses && item.proses.toLowerCase().includes('selesai')) || (item.status && item.status.toLowerCase().includes('selesai')) || Boolean(item.sp2d_nomor || item.sp2dNomor || item.noSP2D)
                  const sp2dNoDisplay = item.sp2d_nomor || item.sp2dNomor || item.noSP2D || ''
                  const sp2dTglDisplay = item.sp2d_tanggal || item.sp2dTanggal || item.tanggalSP2D || ''
                  const sp2dNilaiDisplay = item.sp2d_nilai || item.sp2dNilai || ''
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center border-r border-b border-slate-300 text-slate-700 font-mono font-bold">{index + 1}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-bold text-slate-800">{item.rekanan || '-'}</td>
                      
                      {/* Verifikasi */}
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono text-[11px] text-slate-800">{formatTanggalTabel(item.verifikasi_tanggal)}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono text-slate-800">{item.verifikasi_nomor || '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono font-bold text-slate-900">{formatUang(item.verifikasi_nilai)}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-center">{getStatusBadge(item.proses)}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-slate-800">{item.kontrak || '-'}</td>
                      
                      {/* Akun */}
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-center text-blue-700 font-bold font-mono">{item.kro || '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-center text-emerald-700 font-bold font-mono">{item.ro || '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-center text-slate-800 font-bold font-mono">{item.nomor_akun || '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-center text-slate-800 font-bold">-</td>
                      
                      {/* SPM */}
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono text-[11px] text-slate-800">{isSelesai ? formatTanggalTabel(item.spm_tanggal) : '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono text-slate-800">{isSelesai ? (item.spm_nomor || '-') : '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono font-bold text-slate-900">{isSelesai ? formatUang(item.spm_nilai) : '-'}</td>
                      
                      {/* SP2D */}
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono text-[11px] text-slate-800">{sp2dTglDisplay ? formatTanggalTabel(sp2dTglDisplay) : (isSelesai ? '-' : '-')}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono text-slate-800">{sp2dNoDisplay ? sp2dNoDisplay : (isSelesai ? '-' : '-')}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 font-mono font-bold text-slate-900">{sp2dNilaiDisplay ? formatUang(sp2dNilaiDisplay) : (isSelesai ? '-' : '-')}</td>
                      
                      {/* Type & Keterangan */}
                      <td className="py-3 px-4 text-center border-r border-b border-slate-300 text-slate-800 font-bold font-mono">{item.tipe || '-'}</td>
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-slate-800 max-w-[200px] truncate" title={item.kegiatan || item.keterangan || '-'}>{item.kegiatan || item.keterangan || '-'}</td>
                      
                      {/* Tombol Edit & Hapus (Sembunyi jika role 'user') */}
                      {!isReadOnly && (
                        <td className="py-3 px-4 text-center whitespace-nowrap border-b border-slate-300">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditClick(item.id)}
                              className="p-1.5 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-300 rounded-xl transition-all shadow-xs"
                              title="Edit Data"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 border border-slate-300 rounded-xl transition-all shadow-xs"
                              title="Hapus Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={isReadOnly ? 20 : 21} className="py-12 text-center text-slate-600 font-medium border-b border-slate-300">
                      Tidak ada data transaksi SPM & SP2D yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SPM Modals container */}
      <SpmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchData}
        editId={selectedEditId}
        allDataSpm={spmData}
      />
    </div>
  )
}

export default SpmList
