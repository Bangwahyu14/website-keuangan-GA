import React, { useState, useEffect } from 'react'
import { BarChart3, Plus, Trash2, Calendar, AlertCircle, X, Layers, TrendingUp, DollarSign, Download, PlusCircle, CheckCircle2, ChevronRight, Edit2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import { API_BASE_URL } from '../services/api'
import useAuth from '../hooks/useAuth'
import { useTahun } from '../context/TahunContext'

function AnalisaRealisasi() {
  const { user } = useAuth()
  const isReadOnly = user?.role === 'user'
  
  const { selectedTahun } = useTahun()
  const currentYear = parseInt(selectedTahun, 10) || 2026
  const prevYear = currentYear - 1

  const [apiData, setApiData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Added dynamic years tracking
  const [addedYears, setAddedYears] = useState(() => {
    const saved = localStorage.getItem('analisa_added_years')
    return saved ? JSON.parse(saved) : [2025]
  })

  // Manual inputs memory by year
  const [manualYearsData, setManualYearsData] = useState(() => {
    const memory = {}
    const years = [2025]
    years.forEach(y => {
      const saved = localStorage.getItem('memori_manual_' + y)
      if (saved) {
        memory[y] = JSON.parse(saved)
      } else {
        memory[y] = {
          realisasi: Array(12).fill(0),
          pagu: 0
        }
      }
    })
    return memory
  })

  // Multi-year API responses map
  const [apiYearsData, setApiYearsData] = useState({})

  // Custom YoY comparison dropdown states
  const [compareYear1, setCompareYear1] = useState(null)
  const [compareYear2, setCompareYear2] = useState(null)

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEditId, setSelectedEditId] = useState(null)
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')

  const fetchData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Build year list to query (including selected, added, highest on screen, and custom compare years)
      const currentYearNum = parseInt(selectedTahun, 10) || 2026
      const allRenderedYearsNum = [...new Set([currentYearNum, ...addedYears.map(Number)])]
      const currentYoYYearNum = allRenderedYearsNum.length > 0 ? Math.max(...allRenderedYearsNum) : currentYearNum
      const prevYoYYearNum = currentYoYYearNum - 1

      const reqYear1 = (compareYear1 && !isNaN(compareYear1)) ? Number(compareYear1) : currentYoYYearNum
      const reqYear2 = (compareYear2 && !isNaN(compareYear2)) ? Number(compareYear2) : prevYoYYearNum

      const yearsToFetch = [...new Set([
        currentYearNum,
        currentYearNum - 1,
        currentYoYYearNum,
        prevYoYYearNum,
        reqYear1,
        reqYear2,
        ...addedYears.map(Number)
      ])]

      // Fetch parallel year endpoint queries
      const requests = yearsToFetch.map(y => 
        fetch(`${API_BASE_URL}/api/realisasi/analisa?tahun=${y}`, { headers }).then(r => r.json())
      )

      const results = await Promise.all(requests)
      const yearsMap = {}

      yearsToFetch.forEach((y, idx) => {
        const res = results[idx]
        if (res && res.status === 'success' && res.data) {
          yearsMap[y] = res.data
        }
      })

      setApiYearsData(yearsMap)

      // Active year data primary binding
      if (yearsMap[currentYearNum]) {
        setApiData(yearsMap[currentYearNum])
      } else if (yearsMap[2026]) {
        setApiData(yearsMap[2026])
      } else {
        setError('Gagal memproses data analisa realisasi dari server.')
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
  }, [addedYears, selectedTahun, compareYear1, compareYear2])

  const handleOpenAddModal = () => {
    if (isReadOnly) return
    setSelectedEditId(null)
    setKode('')
    setNama('')
    setModalError('')
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (id, currentKode, currentNama) => {
    if (isReadOnly) return
    setSelectedEditId(id)
    setKode(currentKode)
    setNama(currentNama)
    setModalError('')
    setIsModalOpen(true)
  }

  const handleKodeChange = (selectedKode) => {
    setKode(selectedKode)
    if (selectedKode === '51') setNama('Belanja Pegawai')
    else if (selectedKode === '52') setNama('Belanja Barang')
    else if (selectedKode === '53') setNama('Belanja Modal')
  }

  const handleDeleteJenis = async (id) => {
    if (isReadOnly) return
    if (!window.confirm('Apakah Anda yakin ingin menghapus kategori jenis belanja ini?')) return

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/realisasi/jenis-belanja/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        fetchData()
      } else {
        alert('Gagal menghapus jenis belanja.')
      }
    } catch (err) {
      console.error(err)
      alert('Terjadi kesalahan jaringan.')
    }
  }

  const handleModalSubmit = async (e) => {
    e.preventDefault()
    if (isReadOnly) return
    setModalError('')
    setIsSubmitting(true)

    if (!kode || !nama.trim()) {
      setModalError('Kode dan nama jenis belanja wajib diisi!')
      setIsSubmitting(false)
      return
    }

    const payload = {
      kode: kode.trim(),
      nama: nama.trim()
    }

    const targetUrl = selectedEditId 
      ? `${API_BASE_URL}/api/realisasi/jenis-belanja/${selectedEditId}` 
      : `${API_BASE_URL}/api/realisasi/jenis-belanja`
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
        setModalError(result.message || 'Gagal menyimpan jenis belanja.')
      }
    } catch (err) {
      console.error(err)
      setModalError('Terjadi kesalahan jaringan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  // Handle adding new year matrix
  const handleAddYear = () => {
    if (isReadOnly) return

    Swal.fire({
      title: 'Tambah Tahun Anggaran',
      input: 'number',
      inputPlaceholder: 'Masukkan Tahun Anggaran Baru (contoh: 2027)',
      showCancelButton: true,
      confirmButtonText: 'Tambah',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      inputValidator: (value) => {
        if (!value) {
          return 'Tahun tidak boleh kosong!'
        }
        const yearNum = parseInt(value.trim(), 10)
        if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2099) {
          return 'Masukkan tahun yang valid (2000 - 2099)!'
        }
        if (addedYears.includes(yearNum) || yearNum === currentYear) {
          return 'Tabel tahun tersebut sudah ada!'
        }
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        const yearNum = parseInt(result.value.trim(), 10)
        const updatedYears = [...addedYears, yearNum].sort((a, b) => b - a)
        setAddedYears(updatedYears)
        localStorage.setItem('analisa_added_years', JSON.stringify(updatedYears))
      }
    })
  }

  // Handle removing custom year matrix
  const handleDeleteYear = (year) => {
    if (isReadOnly) return
    if (!window.confirm(`Apakah Anda yakin ingin menghapus tabel perbandingan tahun ${year}?`)) return
    const updatedYears = addedYears.filter(y => y !== year)
    setAddedYears(updatedYears)
    localStorage.setItem('analisa_added_years', JSON.stringify(updatedYears))
  }

  // Handle undo adding last year matrix
  const handleUndoYear = () => {
    if (isReadOnly || addedYears.length === 0) return
    const updatedYears = addedYears.slice(0, -1)
    setAddedYears(updatedYears)
    localStorage.setItem('analisa_added_years', JSON.stringify(updatedYears))
  }

  // Formatting helpers
  const formatUang = (angka) => {
    return (!angka || parseFloat(angka) === 0 || isNaN(angka)) 
      ? '-' 
      : new Intl.NumberFormat('id-ID').format(angka)
  }

  const formatPersen = (angka) => {
    if (!angka || parseFloat(angka) === 0 || isNaN(angka) || !isFinite(angka)) return '0,00%'
    const prefix = angka < 0 ? '(' : ''
    const suffix = angka < 0 ? '%)' : '%'
    return `${prefix}${Math.abs(angka).toFixed(2).replace('.', ',')}${suffix}`
  }

  // Resolve calculations for dynamic years
  const getYearDataCalculations = (year) => {
    const yearData = apiYearsData[year]
    const realisasiArray = yearData?.total_per_bulan
      ? yearData.total_per_bulan.map(v => parseFloat(v) || 0)
      : Array(12).fill(0)
    const paguVal = parseFloat(yearData?.total_pagu) || 0

    const totalRealisasi = realisasiArray.reduce((a, b) => a + b, 0)

    // Calculate accumulation
    const accumulationArray = Array(12).fill(0)
    let currentSum = 0
    for (let i = 0; i < 12; i++) {
      currentSum += realisasiArray[i]
      accumulationArray[i] = currentSum
    }

    // Calculate absorption rates
    const absorptionRates = Array(12).fill(0)
    for (let i = 0; i < 12; i++) {
      absorptionRates[i] = paguVal > 0 ? (accumulationArray[i] / paguVal) * 100 : 0
    }

    const totalPercent = paguVal > 0 ? (totalRealisasi / paguVal) * 100 : 0

    return {
      realisasi: realisasiArray,
      pagu: paguVal,
      totalRealisasi,
      akumulasi: accumulationArray,
      persentase: absorptionRates,
      totalPercent
    }
  }

  // Year list sorting & YoY Year resolution (Tahun Tertinggi di Layar / Custom Dropdown Selection vs Tahun Sebelumnya)
  const allRenderedYears = [...new Set([currentYear, ...addedYears.map(Number)])]
  const currentYoYYear = allRenderedYears.length > 0 ? Math.max(...allRenderedYears) : currentYear
  const prevYoYYear = currentYoYYear - 1

  const allAvailableYears = [...new Set([currentYear, currentYear - 1, currentYoYYear, prevYoYYear, ...addedYears.map(Number)])].sort((a, b) => b - a)

  const activeYoYYear1 = (compareYear1 && allAvailableYears.includes(Number(compareYear1))) ? Number(compareYear1) : currentYoYYear
  const activeYoYYear2 = (compareYear2 && allAvailableYears.includes(Number(compareYear2))) ? Number(compareYear2) : prevYoYYear

  const allYears = [...new Set([currentYear, prevYear, activeYoYYear1, activeYoYYear2, ...addedYears.map(Number)])].sort((a, b) => b - a)
  const maxYear = allYears[0]
  const secondYear = allYears[1]

  const activeYear = currentYear
  const yoyYear1 = activeYoYYear1
  const yoyYear2 = activeYoYYear2

  // Resolve aggregates for comparison tables
  const maxYearCalc = getYearDataCalculations(maxYear)
  const secondYearCalc = getYearDataCalculations(secondYear)

  const yoyYear1Calc = getYearDataCalculations(yoyYear1)
  const yoyYear2Calc = getYearDataCalculations(yoyYear2)

  // Export to Excel trigger
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    // 1. Export Jenis Belanja
    const tbl1 = document.getElementById('tabel1')
    if (tbl1) {
      const clone = tbl1.cloneNode(true)
      const rows = clone.rows
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].cells.length > 0 && !isReadOnly) {
          rows[i].deleteCell(-1)
        }
      }
      const ws = XLSX.utils.table_to_sheet(clone)
      XLSX.utils.book_append_sheet(wb, ws, 'Jenis Belanja')
    }

    // 2. Export Realisasi vs Pagu Years
    allYears.forEach(y => {
      const tblYear = document.getElementById(`tabel_${y}`)
      if (tblYear) {
        const clone = tblYear.cloneNode(true)
        const inputs = clone.querySelectorAll('input')
        inputs.forEach(input => {
          const textSpan = document.createElement('span')
          textSpan.innerText = input.value ? new Intl.NumberFormat('id-ID').format(input.value) : '-'
          input.parentNode.replaceChild(textSpan, input)
        })
        const ws = XLSX.utils.table_to_sheet(clone)
        XLSX.utils.book_append_sheet(wb, ws, `Pagu ${y}`)
      }
    })

    // 3. Export YoY
    const tbl4 = document.getElementById('tabel4')
    if (tbl4) {
      const clone = tbl4.cloneNode(true)
      const inputs = clone.querySelectorAll('input')
      inputs.forEach(input => {
        const textSpan = document.createElement('span')
        textSpan.innerText = input.value ? new Intl.NumberFormat('id-ID').format(input.value) : '-'
        input.parentNode.replaceChild(textSpan, input)
      })
      const ws = XLSX.utils.table_to_sheet(clone)
      XLSX.utils.book_append_sheet(wb, ws, 'Perbandingan YoY')
    }

    XLSX.writeFile(wb, 'Laporan_Analisa_Realisasi.xlsx')
  }

  return (
    <div className="space-y-8">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-slate-300 rounded-3xl p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            <span>Analisa Realisasi Anggaran</span>
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">Evaluasi pencairan, perbandingan Multi-Tahun, dan analisis pertumbuhan (YoY)</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {/* Sembunyikan Tombol Tambah / Undo Tabel Tahun untuk role user */}
          {!isReadOnly && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddYear}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl py-2.5 px-4 transition-all duration-200 shadow-sm"
              >
                + Tambah Tabel Tahun
              </button>
              <button
                onClick={handleUndoYear}
                disabled={addedYears.length === 0}
                title={addedYears.length === 0 ? 'Tidak ada tabel tahun tambahan' : 'Hapus tabel tahun terakhir yang ditambah'}
                className={`border font-semibold text-xs rounded-xl py-2.5 px-4 transition-all duration-200 shadow-sm ${
                  addedYears.length === 0
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white hover:bg-amber-50 text-amber-700 border-amber-300'
                }`}
              >
                Undo / Batal Tambah
              </button>
            </div>
          )}
          {/* Tombol Download Excel tetap tampil untuk semua role */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200"
          >
            <Download className="w-4.5 h-4.5" />
            <span>Download Excel</span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white border border-slate-300 rounded-3xl py-20 flex flex-col items-center justify-center text-slate-500 gap-3 shadow-sm">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-semibold">Menganalisa data realisasi...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* =================================================================
             TABLE 1: BERDASARKAN JENIS BELANJA
             ================================================================= */}
          <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">1. Realisasi Anggaran Berdasarkan Jenis Belanja</h3>
              {/* Sembunyikan Tombol Tambah Jenis Belanja untuk role user */}
              {!isReadOnly && (
                <button
                  onClick={handleOpenAddModal}
                  className="flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Jenis Belanja</span>
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-left border-collapse w-[1250px]" id="tabel1">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                    <th className="py-3 px-4 border-r border-b border-slate-300 w-52">Jenis Belanja</th>
                    {months.map(m => <th key={m} className="py-3 px-3 text-center border-r border-b border-slate-300">{m.slice(0, 3)}</th>)}
                    <th className="py-3 px-4 border-r border-b border-slate-300 text-right w-28">Total</th>
                    {!isReadOnly && <th className="py-3 px-4 text-center border-b border-slate-300 w-20">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-[11px] font-mono text-slate-800">
                  {/* Detailed actual spent rows */}
                  {apiData?.bulanan.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans">{item.kode} - {item.nama}</td>
                      {item.bulanan.map((val, idx) => <td key={idx} className="py-2.5 px-3 border-r border-b border-slate-300 text-right text-slate-800 font-bold">{formatUang(val)}</td>)}
                      <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-900">{formatUang(item.total)}</td>
                      {!isReadOnly && (
                        <td className="py-2.5 px-4 text-center border-b border-slate-300">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item.id, item.kode, item.nama)}
                              className="p-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg border border-slate-300 transition-colors shadow-xs"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteJenis(item.id)}
                              className="p-1 bg-white hover:bg-red-50 text-slate-700 hover:text-red-600 rounded-lg border border-slate-300 transition-colors shadow-xs"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Group total monthly summation row */}
                  {apiData && (
                    <tr className="bg-amber-50 text-amber-950 font-bold border-b border-slate-300">
                      <td className="py-3 px-4 font-sans text-xs border-r border-b border-slate-300">Total Realisasi</td>
                      {apiData.total_per_bulan.map((val, idx) => (
                        <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-end">{formatUang(val)}</td>
                      ))}
                      <td className="py-3 px-4 border-r border-b border-slate-300 text-end">{formatUang(apiData.grand_total)}</td>
                      {!isReadOnly && <td className="border-b border-slate-300"></td>}
                    </tr>
                  )}

                  {/* Empty Spacer Row */}
                  <tr><td colSpan={isReadOnly ? 14 : 15} className="h-6 border-none select-none"></td></tr>

                  {/* Detailed Accumulation monthly rows */}
                  {apiData?.akumulasi.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors italic">
                      <td className="py-2.5 px-4 font-sans text-xs text-slate-800 font-medium border-r border-b border-slate-300">{item.nama}</td>
                      {item.akumulasi.map((val, i) => <td key={i} className="py-2.5 px-3 border-r border-b border-slate-300 text-right text-slate-800 font-bold">{formatUang(val)}</td>)}
                      <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-900">{formatUang(item.total)}</td>
                      {!isReadOnly && <td className="border-b border-slate-300"></td>}
                    </tr>
                  ))}

                  {(!apiData || apiData.bulanan.length === 0) && (
                    <tr>
                      <td colSpan={isReadOnly ? 14 : 15} className="py-8 text-center text-slate-600 font-sans font-semibold border-b border-slate-300">
                        Belum ada jenis belanja terpasang.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* =================================================================
             TABLE 2: REALISASI VS PAGU COMPARISONS (MULTI-YEAR DISPLAY CARDS)
             ================================================================= */}
          {allYears.slice(0, 2).map((year, yearIdx) => {
            const is2026 = (year === 2026)
            const calc = getYearDataCalculations(year)
            
            // Perbedaan realisasi calculations (only for the second-ranked year)
            const isSecondRanked = (year === secondYear)
            
            return (
              <div key={year} className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-300 pb-3">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                    {yearIdx + 2}. Realisasi vs Pagu Anggaran {year}
                  </h3>
                  {!isReadOnly && !is2026 && year !== yoyYear1 && year !== yoyYear2 && (
                    <button
                      onClick={() => handleDeleteYear(year)}
                      className="flex items-center gap-1 text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors bg-red-50 px-2 py-1 rounded-lg border border-red-200"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Hapus {year}</span>
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="excel-table text-left border-collapse w-[1250px]" id={`tabel_${year}`}>
                    <thead>
                      <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                        <th className="py-3 px-4 border-r border-b border-slate-300 w-52">Realisasi/Pagu</th>
                        {months.map(m => <th key={m} className="py-3 px-3 text-center border-r border-b border-slate-300">{m.slice(0, 3)}</th>)}
                        <th className="py-3 px-4 text-right w-36 border-b border-slate-300">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300 text-[11px] font-mono text-slate-800">
                      {/* Realisasi Row */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">Realisasi</td>
                        {calc.realisasi.map((val, idx) => (
                          <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right font-bold text-slate-800">
                            <span>{formatUang(val)}</span>
                          </td>
                        ))}
                        <td className="py-3 px-4 text-end font-bold text-slate-900 border-b border-slate-300">{formatUang(calc.totalRealisasi)}</td>
                      </tr>
 
                      {/* Pagu Row */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">Pagu</td>
                        {months.map((_, idx) => (
                          <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right text-slate-800 font-semibold">{formatUang(calc.pagu)}</td>
                        ))}
                        <td className="py-3 px-4 text-end font-bold text-slate-900 pr-4 border-b border-slate-300">
                          <span>{formatUang(calc.pagu)}</span>
                        </td>
                      </tr>

                      {/* Accumulation Row */}
                      <tr className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">Akumulasi</td>
                        {calc.akumulasi.map((val, idx) => (
                          <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right text-slate-800 font-bold">{formatUang(val)}</td>
                        ))}
                        <td className="py-3 px-4 text-end font-bold text-slate-900 border-b border-slate-300">{formatUang(calc.totalRealisasi)}</td>
                      </tr>

                      {/* Absorption percentage rate row */}
                      <tr className="bg-amber-50 text-amber-950 font-bold border-b border-slate-300">
                        <td className="py-3 px-4 font-sans text-center border-r border-b border-slate-300">Persentase</td>
                        {calc.persentase.map((val, idx) => (
                          <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-center font-bold">{formatPersen(val)}</td>
                        ))}
                        <td className="py-3 px-4 text-center font-extrabold border-b border-slate-300">{formatPersen(calc.totalPercent)}</td>
                      </tr>

                      {/* Perbedaan Realisasi Row (only on second ranked year matrix sheet) */}
                      {isSecondRanked && (
                        <tr className="bg-emerald-50 text-emerald-950 font-bold border-b border-slate-300">
                          <td className="py-3 px-4 font-sans text-center border-r border-b border-slate-300">Perbedaan Realisasi</td>
                          {calc.persentase.map((val, idx) => {
                            const maxYearRate = maxYearCalc.persentase[idx] || 0
                            const diff = maxYearRate - val
                            return (
                              <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-center font-bold">
                                {formatPersen(diff)}
                              </td>
                            )
                          })}
                          <td className="py-3 px-4 text-center font-extrabold border-b border-slate-300">
                            {formatPersen(maxYearCalc.totalPercent - calc.totalPercent)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
          {/* =================================================================
             TABLE 4: YoY COMPARISON MATRIX
             ================================================================= */}
          <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-300 pb-3 gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider" id="judul4">
                  4. Realisasi Anggaran YoY
                </h3>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700">
                  <select
                    value={activeYoYYear1}
                    onChange={(e) => setCompareYear1(Number(e.target.value))}
                    className="bg-white border border-slate-300 text-slate-800 font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs shadow-xs"
                  >
                    {allAvailableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="font-extrabold text-slate-500 text-xs">VS</span>
                  <select
                    value={activeYoYYear2}
                    onChange={(e) => setCompareYear2(Number(e.target.value))}
                    className="bg-white border border-slate-300 text-slate-800 font-bold rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs shadow-xs"
                  >
                    {allAvailableYears.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="excel-table text-left border-collapse w-[1250px]" id="tabel4">
                <thead>
                  <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                    <th className="py-3 px-4 border-r border-b border-slate-300 w-52">Tahun Anggaran</th>
                    {months.map(m => <th key={m} className="py-3 px-3 text-center border-r border-b border-slate-300">{m.slice(0, 3)}</th>)}
                    <th className="py-3 px-4 border-r border-b border-slate-300 text-right w-36">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-[11px] font-mono text-slate-800">
                  {/* Year 1 Realisasi */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">{yoyYear1}</td>
                    {yoyYear1Calc.realisasi.map((val, idx) => (
                      <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right font-bold text-slate-800">
                        <span>{formatUang(val)}</span>
                      </td>
                    ))}
                    <td className="py-3 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-900">{formatUang(yoyYear1Calc.totalRealisasi)}</td>
                  </tr>

                  {/* Year 2 Realisasi */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">{yoyYear2}</td>
                    {yoyYear2Calc.realisasi.map((val, idx) => (
                      <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right font-bold text-slate-800">
                        <span>{formatUang(val)}</span>
                      </td>
                    ))}
                    <td className="py-3 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-900">{formatUang(yoyYear2Calc.totalRealisasi)}</td>
                  </tr>

                  {/* Empty Spacer Row */}
                  <tr><td colSpan="14" className="h-4 border-none select-none"></td></tr>

                  {/* Year 1 Accumulation */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">{yoyYear1} (Akumulasi)</td>
                    {yoyYear1Calc.akumulasi.map((val, idx) => (
                      <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right font-bold">{formatUang(val)}</td>
                    ))}
                    <td className="py-3 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-900">{formatUang(yoyYear1Calc.totalRealisasi)}</td>
                  </tr>

                  {/* Year 2 Accumulation */}
                  <tr className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-800 border-r border-b border-slate-300 font-sans text-center">{yoyYear2} (Akumulasi)</td>
                    {yoyYear2Calc.akumulasi.map((val, idx) => (
                      <td key={idx} className="py-3 px-3 border-r border-b border-slate-300 text-right font-bold">{formatUang(val)}</td>
                    ))}
                    <td className="py-3 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-900">{formatUang(yoyYear2Calc.totalRealisasi)}</td>
                  </tr>

                  {/* Kenaikan / Penurunan Row */}
                  <tr className="bg-amber-50 text-amber-950 font-bold border-b border-slate-300">
                    <td className="py-3 px-4 font-sans text-center border-r border-b border-slate-300">Kenaikan/(Penurunan)</td>
                    {yoyYear1Calc.akumulasi.map((val, idx) => {
                      const y2Val = yoyYear2Calc.akumulasi[idx] || 0
                      const diff = val - y2Val
                      return (
                        <td key={idx} className={`py-3 px-3 border-r border-b border-slate-300 text-right font-mono font-bold ${diff < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {formatUang(diff)}
                        </td>
                      )
                    })}
                    <td className={`py-3 px-4 border-r border-b border-slate-300 text-end font-extrabold ${yoyYear1Calc.totalRealisasi - yoyYear2Calc.totalRealisasi < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatUang(yoyYear1Calc.totalRealisasi - yoyYear2Calc.totalRealisasi)}
                    </td>
                  </tr>

                  {/* Percentage Row */}
                  <tr className="bg-amber-50 text-amber-950 font-bold border-b border-slate-300">
                    <td className="py-3 px-4 font-sans text-center border-r border-b border-slate-300">Persentase</td>
                    {yoyYear1Calc.akumulasi.map((val, idx) => {
                      const y2Val = yoyYear2Calc.akumulasi[idx] || 0
                      const diff = val - y2Val
                      const rate = y2Val > 0 ? (diff / y2Val) * 100 : 0
                      return (
                        <td key={idx} className={`py-3 px-3 border-r border-b border-slate-300 text-center font-mono font-bold ${rate < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {formatPersen(rate)}
                        </td>
                      )
                    })}
                    <td className={`py-3 px-4 text-center border-b border-slate-300 font-extrabold ${((yoyYear1Calc.totalRealisasi - yoyYear2Calc.totalRealisasi) / yoyYear2Calc.totalRealisasi) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatPersen(yoyYear2Calc.totalRealisasi > 0 ? ((yoyYear1Calc.totalRealisasi - yoyYear2Calc.totalRealisasi) / yoyYear2Calc.totalRealisasi) * 100 : 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Jenis Belanja Modal */}
      {isModalOpen && !isReadOnly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                <span>{selectedEditId ? 'Edit Jenis Belanja' : 'Tambah Jenis Belanja'}</span>
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
                  Kode Akun (2 Digit)
                </label>
                <select
                  value={kode}
                  onChange={(e) => handleKodeChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all font-bold"
                  required
                  disabled={isSubmitting}
                >
                  <option value="" disabled>-- Pilih Kode Belanja --</option>
                  <option value="51">51 - Belanja Pegawai</option>
                  <option value="52">52 - Belanja Barang</option>
                  <option value="53">53 - Belanja Modal</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  Nama Jenis Belanja
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Belanja Barang"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all"
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
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl py-2.5 px-6 shadow-md transition-all duration-200"
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

export default AnalisaRealisasi
