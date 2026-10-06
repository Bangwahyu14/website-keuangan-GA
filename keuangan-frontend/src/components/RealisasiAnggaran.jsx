import React, { useState, useEffect } from 'react'
import { Layers, Target, Eye, EyeOff, Plus, Download, Edit2, Trash2, Calendar, AlertCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import BudgetModal from './BudgetModal'
import DipaModal from './DipaModal'
import { API_BASE_URL } from '../services/api'
import { useTahun } from '../context/TahunContext'

function RealisasiAnggaran({ onAlertsUpdate }) {
  const userRole = localStorage.getItem('role') || 'admin'
  const isReadOnly = userRole === 'user'
  
  const { selectedTahun } = useTahun()

  const [activeSubTab, setActiveSubTab] = useState('realisasi') // 'realisasi' | 'dipa'
  const [showVolumeHarga, setShowVolumeHarga] = useState(() => {
    const saved = localStorage.getItem('showVolumeHarga')
    return saved !== null ? JSON.parse(saved) : true
  })

  // Persist Volume & Harga visibility preference
  useEffect(() => {
    localStorage.setItem('showVolumeHarga', JSON.stringify(showVolumeHarga))
  }, [showVolumeHarga])

  // Sub-Tab 1: Realisasi Pagu 2026 data states
  const [budgetList, setBudgetList] = useState([])
  const [budgetRawData, setBudgetRawData] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Sub-Tab 2: Target Hal III DIPA data states
  const [dipaData, setDipaData] = useState([])
  const [dipaTotalRow, setDipaTotalRow] = useState(null)

  // Reconciliation memories
  const [myIntress, setMyIntress] = useState(() => {
    const saved = localStorage.getItem(`rekon_myintress_${selectedTahun}`)
    return saved ? JSON.parse(saved) : Array(12).fill(0)
  })

  const [rekon, setRekon] = useState(() => {
    const saved = localStorage.getItem(`rekon_penyesuaian_${selectedTahun}`)
    return saved ? JSON.parse(saved) : Array(12).fill(0)
  })

  useEffect(() => {
    const savedMyIntress = localStorage.getItem(`rekon_myintress_${selectedTahun}`)
    setMyIntress(savedMyIntress ? JSON.parse(savedMyIntress) : Array(12).fill(0))
    const savedRekon = localStorage.getItem(`rekon_penyesuaian_${selectedTahun}`)
    setRekon(savedRekon ? JSON.parse(savedRekon) : Array(12).fill(0))
  }, [selectedTahun])

  // Modal Control States
  const [isBudgetOpen, setIsBudgetOpen] = useState(false)
  const [selectedBudgetEditId, setSelectedBudgetEditId] = useState(null)
  const [newlyAddedId, setNewlyAddedId] = useState(null)

  const [isDipaOpen, setIsDipaOpen] = useState(false)
  const [selectedDipaItem, setSelectedDipaItem] = useState(null)

  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  // Early Warning Status Calculation & String Sanitization logic
  const getEarlyWarningStatus = (item) => {
    if (item.level !== 'Detail') return 'normal'

    const volumeRaw = item.volume || ''
    // Sanitize volume string: collapse multiple spaces and trim to uppercase
    const sanitizedVolume = volumeRaw.replace(/\s+/g, ' ').trim().toUpperCase()

    // Valid target volume list: "1 THN", "12 BULAN", "9 BULAN"
    const isTargetVolume = ["1 THN", "12 BULAN", "9 BULAN"].includes(sanitizedVolume)
    if (!isTargetVolume) return 'normal'

    const pagu = parseFloat(item.pagu) || 0
    const sp2d = item.total_sp2d || 0
    const totalProses = (item.proses_verifikasi || 0) + (item.proses_ppk || 0)
    const totalRealisasi = sp2d + totalProses
    const sisaAkhir = pagu - totalRealisasi

    const rawPersenSisa = pagu > 0 ? (sisaAkhir / pagu) * 100 : 0

    // Robust parsing float from string/number safely
    const sisaPersen = typeof rawPersenSisa === 'number'
      ? rawPersenSisa
      : parseFloat(rawPersenSisa.toString().replace('%', '').replace(',', '.'))

    if (isNaN(sisaPersen)) return 'normal'

    if (sisaPersen < 10) return 'critical'
    if (sisaPersen >= 10 && sisaPersen < 50) return 'warning'
    return 'normal'
  }

  // Fetch Budget Master Data & SP2D aggregates
  const fetchBudgetAndSpmData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      const [resBudget, resSpm] = await Promise.all([
        fetch(`${API_BASE_URL}/api/anggaran`, { headers }),
        fetch(`${API_BASE_URL}/api/spm?tahun=${selectedTahun}`, { headers })
      ])

      const resultBudget = await resBudget.json()
      const resultSpm = await resSpm.json()

      if (resultBudget.status === 'success' && resultBudget.data) {
        setBudgetRawData(resultBudget.data)
        const spmItems = (resultSpm.status === 'success' && resultSpm.data) ? resultSpm.data : []
        const aggregatedList = calculateBudgetAggregates(resultBudget.data, spmItems)
        setBudgetList(aggregatedList)
      } else {
        setError('Gagal memproses data anggaran dari server.')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal menghubungkan ke backend server.')
    } finally {
      setIsLoading(false)
    }
  }

  // Sync early warning counts to parent Topbar notification indicator without state lag
  useEffect(() => {
    if (budgetList.length > 0 && onAlertsUpdate) {
      let warningCount = 0
      let criticalCount = 0
      const alertItems = []

      budgetList.forEach(item => {
        const status = getEarlyWarningStatus(item)
        if (status === 'critical' || status === 'warning') {
          const pagu = parseFloat(item.pagu) || 0
          const sp2d = item.total_sp2d || 0
          const totalProses = (item.proses_verifikasi || 0) + (item.proses_ppk || 0)
          const sisaAkhir = pagu - (sp2d + totalProses)
          const sisaPersen = pagu > 0 ? (sisaAkhir / pagu) * 100 : 0

          if (status === 'critical') criticalCount++
          else warningCount++

          alertItems.push({
            id: item.id,
            uraian: item.uraian,
            volume: item.volume,
            sisaPersen,
            type: status
          })
        }
      })

      onAlertsUpdate({ warningCount, criticalCount, alertItems })
    }
  }, [budgetList, onAlertsUpdate])

  // Fetch Target Hal III DIPA data
  const fetchDipaData = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/realisasi/hal3-dipa?tahun=${selectedTahun}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await response.json()
      if (result.status === 'success' && result.data) {
        const list = Array.isArray(result.data) 
          ? result.data 
          : (result.data.rincian || [])
        const totalRow = result.total || result.data.total || null

        setDipaData(list)
        setDipaTotalRow(totalRow)
      }
    } catch (err) {
      console.error('Error fetching Hal III DIPA data', err)
    }
  }

  useEffect(() => {
    fetchBudgetAndSpmData()
    fetchDipaData()
  }, [selectedTahun])

  // Hierarchical aggregation engine
  const calculateBudgetAggregates = (masterData, spmList) => {
    const detailMap = {}

    // Step 1: Map SPM items to Detail Anggaran
    spmList.forEach(spm => {
      if (!spm.kegiatan) return
      if (!detailMap[spm.kegiatan]) {
        detailMap[spm.kegiatan] = {
          bulan: Array(12).fill(0),
          sp2dTotal: 0,
          verifikasi: 0,
          ppk: 0
        }
      }

      const prosesStatus = spm.proses ? spm.proses.toLowerCase() : ''
      const isSelesai = prosesStatus.includes('sp2d') || prosesStatus.includes('selesai') || prosesStatus.includes('cair')

      if (isSelesai) {
        const val = parseFloat(spm.sp2d_nilai) || parseFloat(spm.spm_nilai) || 0
        detailMap[spm.kegiatan].sp2dTotal += val

        if (spm.sp2d_tanggal) {
          const d = new Date(spm.sp2d_tanggal)
          if (!isNaN(d.getTime())) {
            const mIdx = d.getMonth()
            if (mIdx >= 0 && mIdx < 12) {
              detailMap[spm.kegiatan].bulan[mIdx] += val
            }
          }
        }
      } else {
        const valVerif = parseFloat(spm.verifikasi_nilai) || 0
        if (spm.kontrak) {
          detailMap[spm.kegiatan].ppk += valVerif
        } else {
          detailMap[spm.kegiatan].verifikasi += valVerif
        }
      }
    })

    // Step 2: Build tree structure and aggregate values bottom-up
    const listCopy = JSON.parse(JSON.stringify(masterData))
    const itemMap = {}
    listCopy.forEach(item => {
      item.total_sp2d = 0
      item.bulan = Array(12).fill(0)
      item.proses_verifikasi = 0
      item.proses_ppk = 0
      item.children = []
      itemMap[item.id] = item
    })

    const roots = []
    listCopy.forEach(item => {
      if (item.parent_id && itemMap[item.parent_id]) {
        itemMap[item.parent_id].children.push(item)
      } else {
        roots.push(item)
      }
    })

    // Recursive calculation function
    const computeNode = (node) => {
      if (node.level === 'Detail') {
        const matched = detailMap[node.uraian]
        if (matched) {
          node.total_sp2d = matched.sp2dTotal
          node.bulan = [...matched.bulan]
          node.proses_verifikasi = matched.verifikasi
          node.proses_ppk = matched.ppk
        }
        return {
          pagu: parseFloat(node.pagu) || 0,
          sp2d: node.total_sp2d,
          bulan: node.bulan,
          verif: node.proses_verifikasi,
          ppk: node.proses_ppk
        }
      }

      let sumPagu = 0
      let sumSp2d = 0
      let sumBulan = Array(12).fill(0)
      let sumVerif = 0
      let sumPpk = 0

      node.children.forEach(child => {
        const res = computeNode(child)
        sumPagu += res.pagu
        sumSp2d += res.sp2d
        sumVerif += res.verif
        sumPpk += res.ppk
        for (let i = 0; i < 12; i++) {
          sumBulan[i] += res.bulan[i]
        }
      })

      node.pagu = sumPagu
      node.total_sp2d = sumSp2d
      node.bulan = sumBulan
      node.proses_verifikasi = sumVerif
      node.proses_ppk = sumPpk

      return {
        pagu: sumPagu,
        sp2d: sumSp2d,
        bulan: sumBulan,
        verif: sumVerif,
        ppk: sumPpk
      }
    }

    roots.forEach(root => computeNode(root))

    // Flatten tree back to ordered display list
    const resultList = []
    const flatten = (node) => {
      resultList.push(node)
      if (node.children && node.children.length > 0) {
        node.children.forEach(c => flatten(c))
      }
    }

    roots.forEach(r => flatten(r))
    return resultList
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

  const handleMyIntressChange = (index, value) => {
    const updated = [...myIntress]
    updated[index] = value
    setMyIntress(updated)
    localStorage.setItem(`rekon_myintress_${selectedTahun}`, JSON.stringify(updated))
  }

  const handleRekonChange = (index, value) => {
    const updated = [...rekon]
    updated[index] = value
    setRekon(updated)
    localStorage.setItem(`rekon_penyesuaian_${selectedTahun}`, JSON.stringify(updated))
  }

  // Modal Handlers
  const handleAddBudgetClick = () => {
    setSelectedBudgetEditId(null)
    setIsBudgetOpen(true)
  }

  const handleSaveBudget = (newId) => {
    if (newId) {
      setNewlyAddedId(newId)
    }
    fetchBudgetAndSpmData()
  }

  // Auto-scroll to newly added budget row
  useEffect(() => {
    if (newlyAddedId && budgetList.length > 0) {
      const timer = setTimeout(() => {
        const rowElement = document.getElementById(`row-${newlyAddedId}`)
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }, 150)

      const clearTimer = setTimeout(() => {
        setNewlyAddedId(null)
      }, 3500)

      return () => {
        clearTimeout(timer)
        clearTimeout(clearTimer)
      }
    }
  }, [newlyAddedId, budgetList])

  const handleEditBudgetClick = (id) => {
    setSelectedBudgetEditId(id)
    setIsBudgetOpen(true)
  }

  const handleDeleteBudget = (id) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: 'Kode/program anggaran yang dihapus tidak dapat dikembalikan!',
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
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${API_BASE_URL}/api/anggaran/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })

          if (response.ok) {
            fetchBudgetAndSpmData()
            Swal.fire({
              title: 'Terhapus!',
              text: 'Kode/program anggaran berhasil dihapus.',
              icon: 'success',
              confirmButtonColor: '#2563eb'
            })
          } else {
            Swal.fire({
              title: 'Gagal!',
              text: 'Gagal menghapus data anggaran dari server.',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            })
          }
        } catch (err) {
          console.error(err)
          Swal.fire({
            title: 'Error!',
            text: 'Terjadi kesalahan jaringan saat menghapus data.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          })
        }
      }
    })
  }

  const handleEditDipaClick = (item) => {
    setSelectedDipaItem(item)
    setIsDipaOpen(true)
  }

  const formatJenisBelanja = (nama) => {
    if (!nama) return ''
    const namaLower = nama.toLowerCase()
    if (namaLower.includes('pegawai')) return 'Belanja Pegawai (51)'
    if (namaLower.includes('barang')) return 'Belanja Barang (52)'
    if (namaLower.includes('modal')) return 'Belanja Modal (53)'
    return nama
  }

  // Excel Export Handler
  const handleExportExcel = () => {
    if (activeSubTab === 'realisasi') {
      const rows = budgetList.map(item => {
        const pagu = parseFloat(item.pagu) || 0
        const sp2d = item.total_sp2d || 0
        const persenSp2d = pagu > 0 ? (sp2d / pagu) * 100 : 0
        const sisaSp2d = pagu - sp2d
        const persenSisaSp2d = pagu > 0 ? (sisaSp2d / pagu) * 100 : 0
        const totalProses = item.proses_verifikasi + item.proses_ppk
        const totalRealisasi = sp2d + totalProses
        const persenTotalRealisasi = pagu > 0 ? (totalRealisasi / pagu) * 100 : 0
        const sisaAkhir = pagu - totalRealisasi
        const persenSisaAkhir = pagu > 0 ? (sisaAkhir / pagu) * 100 : 0

        const rowObj = {
          'Level': item.level,
          'Kode': item.kode || '',
          'Uraian': item.uraian || ''
        }

        if (showVolumeHarga) {
          rowObj['Volume'] = item.volume || ''
          rowObj['Harga Satuan'] = parseFloat(item.harga_satuan) || 0
        }

        rowObj['Pagu'] = pagu
        months.forEach((m, idx) => {
          rowObj[m] = item.bulan[idx] || 0
        })

        rowObj['Total Realisasi SP2D'] = sp2d
        rowObj['% Realisasi SP2D'] = persenSp2d
        rowObj['Sisa SP2D'] = sisaSp2d
        rowObj['% Sisa SP2D'] = persenSisaSp2d
        rowObj['Proses Verifikasi'] = item.proses_verifikasi
        rowObj['Proses PPK'] = item.proses_ppk
        rowObj['Total Proses'] = totalProses
        rowObj['Total Realisasi + Proses'] = totalRealisasi
        rowObj['% Total Realisasi'] = persenTotalRealisasi
        rowObj['Sisa Akhir'] = sisaAkhir
        rowObj['% Sisa Akhir'] = persenSisaAkhir

        return rowObj
      })

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, `Realisasi Pagu ${selectedTahun}`)
      XLSX.writeFile(workbook, `Laporan_Realisasi_Pagu_${selectedTahun}.xlsx`)
    } else {
      const rows = dipaData.map(item => ({
        'Jenis Belanja': formatJenisBelanja(item.jenis_belanja),
        'Pagu': parseFloat(item.pagu) || 0,
        'Nilai SP2D': parseFloat(item.sp2d_nilai) || 0,
        '% SP2D': parseFloat(item.sp2d_persen) || 0,
        'Nilai Proses': parseFloat(item.proses_nilai) || 0,
        '% Proses': parseFloat(item.proses_persen) || 0,
        'Target Nilai': parseFloat(item.target_nilai) || 0,
        'Target %': parseFloat(item.target_percent || item.target_persen) || 0,
        'Lebih/Kurang Nilai': parseFloat(item.lebih_kurang_nilai) || 0,
        'Lebih/Kurang %': parseFloat(item.lebih_kurang_persen) || 0
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Target Hal III DIPA')
      XLSX.writeFile(workbook, 'Laporan_Target_Hal_III_DIPA.xlsx')
    }
  }

  // Calculate Grand Totals for Program Level rows
  const programRows = budgetList.filter(x => x.level === 'Program')
  const grandTotals = {
    pagu: programRows.reduce((a, b) => a + (parseFloat(b.pagu) || 0), 0),
    sp2d: programRows.reduce((a, b) => a + (b.total_sp2d || 0), 0),
    bulanan: Array(12).fill(0),
    verif: programRows.reduce((a, b) => a + (b.proses_verifikasi || 0), 0),
    ppk: programRows.reduce((a, b) => a + (b.proses_ppk || 0), 0)
  }

  for (let i = 0; i < 12; i++) {
    grandTotals.bulanan[i] = programRows.reduce((a, b) => a + (b.bulan[i] || 0), 0)
  }

  grandTotals.sisaSp2d = grandTotals.pagu - grandTotals.sp2d
  grandTotals.totalProses = grandTotals.verif + grandTotals.ppk
  grandTotals.totalRealisasi = grandTotals.sp2d + grandTotals.totalProses
  grandTotals.sisaAkhir = grandTotals.pagu - grandTotals.totalRealisasi

  const getReconciliationMath = (monthIndex) => {
    const realisasiBulan = grandTotals.bulanan[monthIndex] || 0
    const intressBulan = myIntress[monthIndex] || 0
    const selisih = realisasiBulan - intressBulan
    const penyesuaian = rekon[monthIndex] || 0
    const selisihAkhir = selisih + penyesuaian
    return { realisasiBulan, intressBulan, selisih, penyesuaian, selisihAkhir }
  }

  // Style classes helper based on Level & Early Warning state
  const getLevelStyle = (level, earlyWarningStatus) => {
    if (earlyWarningStatus === 'critical') {
      return 'bg-red-50 font-medium text-red-950 [&_td]:!text-red-950 hover:bg-red-100/90 transition-colors'
    }
    if (earlyWarningStatus === 'warning') {
      return 'bg-amber-50 font-medium text-amber-950 [&_td]:!text-amber-950 hover:bg-amber-100/90 transition-colors'
    }

    switch (level) {
      case 'Program': return 'bg-rose-50/90 font-bold border-l-2 border-rose-400 [&_td]:!text-rose-950 hover:bg-rose-100 transition-colors'
      case 'Kegiatan': return 'bg-purple-50/90 font-bold border-l-2 border-purple-400 [&_td]:!text-purple-950 hover:bg-purple-100 transition-colors'
      case 'KRO': return 'bg-emerald-50/90 font-bold border-l-2 border-emerald-400 [&_td]:!text-emerald-950 hover:bg-emerald-100 transition-colors'
      case 'RO': return 'text-blue-950 font-extrabold bg-blue-50/90 [&_td]:!text-blue-950 hover:bg-blue-100 transition-colors'
      case 'Komponen': return 'text-slate-800 font-bold'
      case 'Subkomponen': return 'text-slate-700 font-medium italic'
      case 'Akun': return 'text-slate-800 underline font-semibold'
      case 'Detail': return 'text-slate-800 font-normal pl-6'
      default: return 'text-slate-800'
    }
  }

  const getStickyBgClass = (level, earlyWarningStatus) => {
    if (earlyWarningStatus === 'critical') return 'bg-[#fee2e2]'
    if (earlyWarningStatus === 'warning') return 'bg-[#fef3c7]'

    switch (level) {
      case 'Program': return 'bg-[#ffe4e6]'
      case 'Kegiatan': return 'bg-[#f3e8ff]'
      case 'KRO': return 'bg-[#d1fae5]'
      case 'RO': return 'bg-[#dbeafe]'
      default: return 'bg-white'
    }
  }

  const formatRupiah = (value) => {
    if (value === null || value === undefined || value === '') return '';
    let val = value.toString().replace(/Rp/gi, '').trim().split(',')[0];
    if (/^\d+\.\d{1,2}$/.test(val)) val = val.split('.')[0];
    let numberString = val.replace(/\D/g, '');
    if (numberString.length > 1 && numberString.startsWith('0')) numberString = numberString.replace(/^0+/, '');
    if (!numberString) return '';
    return new Intl.NumberFormat('id-ID').format(numberString);
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* Sub Tabs Selection Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 bg-white border border-slate-300 p-1.5 rounded-2xl self-start shadow-sm">
          <button
            onClick={() => setActiveSubTab('realisasi')}
            className={`flex items-center gap-2.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'realisasi'
                ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Realisasi Pagu {selectedTahun}</span>
          </button>
          <button
            onClick={() => {
              setActiveSubTab('dipa')
              fetchDipaData()
            }}
            className={`flex items-center gap-2.5 px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeSubTab === 'dipa'
                ? 'bg-blue-600 text-white shadow shadow-blue-500/10'
                : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Target Hal III DIPA</span>
          </button>
        </div>

        {/* Global info or Action Button */}
        {activeSubTab === 'realisasi' ? (
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={() => setShowVolumeHarga(!showVolumeHarga)}
              className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl py-2.5 px-4 transition-all duration-200 active:scale-[0.98] shadow-sm"
            >
              {showVolumeHarga ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{showVolumeHarga ? 'Sembunyikan Volume & Harga' : 'Tampilkan Volume & Harga'}</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
            >
              <Download className="w-4.5 h-4.5" />
              <span>Download Excel</span>
            </button>
            {!isReadOnly && (
              <button
                onClick={handleAddBudgetClick}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Tambah Kode/Program</span>
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Evaluasi Target T.A. {selectedTahun}</span>
          </div>
        )}
      </div>

      {/* Main Section */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="bg-white border border-slate-200 rounded-3xl py-20 flex flex-col items-center justify-center text-slate-500 gap-3 shadow-sm">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span className="text-xs font-semibold">Memuat lembar anggaran...</span>
        </div>
      ) : (
        <>
          {activeSubTab === 'realisasi' ? (
            /* ===============================================================
               SUB-TAB 1: SPREADSHEET MATRIX TABLE FOR REALISASI PAGU 
               =============================================================== */
            <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
              <div className="table-scroll-container overflow-auto flex-1 min-h-0">
                <table className="excel-table text-left border-collapse w-[1800px]">
                  <thead>
                    <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-200 z-20">
                      <th className="py-4 px-4 text-center border-r border-b border-slate-300 w-[110px] min-w-[110px] max-w-[110px] sticky top-0 left-0 z-30 bg-slate-200 text-slate-900" rowSpan="2">Kode</th>
                      <th className="py-4 px-4 border-r border-b border-slate-300 w-[320px] min-w-[320px] max-w-[320px] sticky top-0 left-[110px] z-30 bg-slate-200 text-slate-900" rowSpan="2">Program / Kegiatan / KRO / RO / Komponen / Detail</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 left-[430px] z-30 bg-slate-200 text-slate-900" colSpan={showVolumeHarga ? 3 : 1} style={{ left: '430px', width: showVolumeHarga ? '310px' : '120px', minWidth: showVolumeHarga ? '310px' : '120px', maxWidth: showVolumeHarga ? '310px' : '120px' }}>Pagu Anggaran Tahun {selectedTahun}</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 z-20 bg-slate-100 text-slate-800" colSpan="12">Pencairan Bulanan (SP2D Selesai)</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 z-20 bg-slate-100 text-slate-800" colSpan="2">Realisasi (SP2D)</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 z-20 bg-slate-100 text-slate-800" colSpan="2">Sisa Anggaran</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 z-20 bg-slate-100 text-slate-800" colSpan="3">Proses Transaksi</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 z-20 bg-slate-100 text-slate-800" colSpan="2">Total Realisasi + Proses</th>
                      <th className="py-2.5 px-4 text-center border-b border-slate-300 border-r sticky top-0 z-20 bg-slate-100 text-slate-800" colSpan="2">Sisa Anggaran Akhir</th>
                      {!isReadOnly && <th className="py-4 px-4 text-center sticky top-0 z-20 bg-slate-100 text-slate-800 border-b border-slate-300" rowSpan="2">Aksi</th>}
                    </tr>
                    <tr className="border-b border-slate-300 text-[9px] font-bold text-slate-700 uppercase bg-slate-100 z-20">
                      {showVolumeHarga && (
                        <>
                          <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center w-[80px] min-w-[80px] max-w-[80px] sticky top-[38px] left-[430px] z-30 bg-slate-200 text-slate-900">Volume</th>
                          <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center w-[110px] min-w-[110px] max-w-[110px] sticky top-[38px] left-[510px] z-30 bg-slate-200 text-slate-900">Harga Satuan</th>
                        </>
                      )}
                      <th className="py-2.5 px-4 border-r-2 border-b border-slate-400 text-center w-[120px] min-w-[120px] max-w-[120px] sticky top-[38px] z-30 bg-slate-200 text-slate-900" style={{ left: showVolumeHarga ? '620px' : '430px' }}>Pagu</th>
                      {months.map(m => (
                        <th key={m} className="py-2.5 px-3 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">{m}</th>
                      ))}
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">Rupiah</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">%</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">Rupiah</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">%</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">Verifikasi</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">PPK (Kontrak)</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">Total Proses</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">Rupiah</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">%</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">Rupiah</th>
                      <th className="py-2.5 px-4 border-r border-b border-slate-300 text-center bg-slate-100 text-slate-800 sticky top-[38px] z-20">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-[11px] font-mono">
                    {budgetList.map((item) => {
                      const pagu = parseFloat(item.pagu) || 0
                      const sp2d = item.total_sp2d || 0
                      const persenSp2d = pagu > 0 ? (sp2d / pagu) * 100 : 0
                      
                      const sisaSp2d = pagu - sp2d
                      const persenSisaSp2d = pagu > 0 ? (sisaSp2d / pagu) * 100 : 0
                      
                      const totalProses = item.proses_verifikasi + item.proses_ppk
                      const totalRealisasi = sp2d + totalProses
                      const persenTotalRealisasi = pagu > 0 ? (totalRealisasi / pagu) * 100 : 0
                      
                      const sisaAkhir = pagu - totalRealisasi
                      const persenSisaAkhir = pagu > 0 ? (sisaAkhir / pagu) * 100 : 0

                      const isDetail = item.level === 'Detail'
                      const earlyWarningStatus = getEarlyWarningStatus(item)
                      const isNewlyAdded = newlyAddedId && String(item.id) === String(newlyAddedId)

                      return (
                        <tr 
                          key={item.id} 
                          id={`row-${item.id}`} 
                          className={`transition-all duration-700 ${
                            isNewlyAdded 
                              ? 'bg-blue-100/90 text-blue-900 font-bold ring-2 ring-blue-500 z-20 shadow-md animate-pulse' 
                              : getLevelStyle(item.level, earlyWarningStatus)
                          }`}
                        >
                          {/* Kode */}
                          <td className={`py-2.5 px-4 font-bold tracking-tight text-center border-r border-b border-slate-300 sticky left-0 z-10 w-[110px] min-w-[110px] max-w-[110px] ${
                            isNewlyAdded ? 'bg-blue-200 text-blue-900 font-black' : getStickyBgClass(item.level, earlyWarningStatus)
                          }`}>
                            {isDetail ? '' : item.kode}
                          </td>
                          {/* Uraian */}
                          <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-slate-800 select-all whitespace-normal truncate font-sans text-xs sticky left-[110px] z-10 w-[320px] min-w-[320px] max-w-[320px] ${
                            isNewlyAdded ? 'bg-blue-200 text-blue-900 font-black' : getStickyBgClass(item.level, earlyWarningStatus)
                          }`}>
                            {isDetail ? `- ${item.uraian}` : item.uraian}
                          </td>
                          {/* Volume & Harga */}
                          {showVolumeHarga && (
                            <>
                              <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-center text-slate-800 font-semibold sticky left-[430px] z-10 w-[80px] min-w-[80px] max-w-[80px] ${
                                isNewlyAdded ? 'bg-blue-200 text-blue-900 font-black' : getStickyBgClass(item.level, earlyWarningStatus)
                              }`}>
                                {item.volume || '-'}
                              </td>
                              <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-end text-slate-800 sticky left-[510px] z-10 w-[110px] min-w-[110px] max-w-[110px] ${
                                isNewlyAdded ? 'bg-blue-200 text-blue-900 font-black' : getStickyBgClass(item.level, earlyWarningStatus)
                              }`}>
                                {formatUang(item.harga_satuan)}
                              </td>
                            </>
                          )}
                          {/* Total Pagu */}
                          <td className={`py-2.5 px-4 border-r-2 border-b border-slate-400 text-end font-bold text-slate-900 sticky z-10 w-[120px] min-w-[120px] max-w-[120px] ${
                            isNewlyAdded ? 'bg-blue-200 text-blue-900 font-black' : getStickyBgClass(item.level, earlyWarningStatus)
                          }`} style={{ left: showVolumeHarga ? '620px' : '430px' }}>
                            {formatUang(pagu)}
                          </td>
                          
                          {/* Bulanan Jan - Des */}
                          {item.bulan.map((val, idx) => (
                            <td key={idx} className="py-2.5 px-3 border-r border-b border-slate-300 text-end text-slate-800">
                              {formatUang(val)}
                            </td>
                          ))}

                          {/* SP2D Realisasi */}
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end font-bold text-slate-800">
                            {formatUang(sp2d)}
                          </td>
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-center font-bold text-slate-800">
                            {formatPersen(persenSp2d)}
                          </td>

                          {/* Sisa SP2D */}
                          <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-end font-bold ${sisaSp2d < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                            {formatUang(sisaSp2d)}
                          </td>
                          <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-center font-bold ${sisaSp2d < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                            {formatPersen(persenSisaSp2d)}
                          </td>

                          {/* Processes */}
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end text-slate-800">
                            {formatUang(item.proses_verifikasi)}
                          </td>
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end text-slate-800">
                            {formatUang(item.proses_ppk)}
                          </td>
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end text-slate-800 font-bold">
                            {formatUang(totalProses)}
                          </td>

                          {/* Total Realisasi + Proses */}
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-end font-bold text-emerald-800">
                            {formatUang(totalRealisasi)}
                          </td>
                          <td className="py-2.5 px-4 border-r border-b border-slate-300 text-center font-bold text-emerald-800">
                            {formatPersen(persenTotalRealisasi)}
                          </td>

                          {/* Sisa Akhir */}
                          <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-end font-bold ${sisaAkhir < 0 ? 'text-red-600' : (earlyWarningStatus === 'critical' ? 'text-red-700 font-black' : (earlyWarningStatus === 'warning' ? 'text-amber-800 font-black' : 'text-blue-700'))}`}>
                            {formatUang(sisaAkhir)}
                          </td>
                          <td className={`py-2.5 px-4 border-r border-b border-slate-300 text-center font-bold ${sisaAkhir < 0 ? 'text-red-600' : (earlyWarningStatus === 'critical' ? 'text-red-700 font-black' : (earlyWarningStatus === 'warning' ? 'text-amber-800 font-black' : 'text-blue-700'))}`}>
                            {formatPersen(persenSisaAkhir)}
                          </td>

                          {/* Actions */}
                          {!isReadOnly && (
                            <td className="py-2.5 px-4 text-center border-b border-slate-300">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleEditBudgetClick(item.id)}
                                  className="p-1 bg-white hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg border border-slate-300 transition-colors shadow-xs"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteBudget(item.id)}
                                  className="p-1 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 rounded-lg border border-slate-300 transition-colors shadow-xs"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}

                    {budgetList.length === 0 && (
                      <tr>
                        <td colSpan={isReadOnly ? 31 : 32} className="py-12 text-center text-slate-600 font-semibold font-sans">
                          Belum ada data anggaran terpasang.
                        </td>
                      </tr>
                    )}
                  </tbody>

                  {/* Dynamic Calculation Footer */}
                  {budgetList.length > 0 && (
                    <tfoot className="border-t-2 border-slate-400 font-mono text-[11px]">
                      {/* Grand Total Row */}
                      <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-300">
                        <td colSpan={showVolumeHarga ? 4 : 2} className="py-3 px-4 text-end uppercase tracking-wider font-sans sticky left-0 z-10 bg-slate-200 border-r border-slate-300" style={{ width: showVolumeHarga ? '620px' : '430px', minWidth: showVolumeHarga ? '620px' : '430px', maxWidth: showVolumeHarga ? '620px' : '430px' }}>TOTAL KESELURUHAN</td>
                        <td className="py-3 px-4 border-r-2 border-slate-400 text-end sticky z-10 bg-slate-200 text-slate-900 w-[120px] min-w-[120px] max-w-[120px]" style={{ left: showVolumeHarga ? '620px' : '430px' }}>{formatUang(grandTotals.pagu)}</td>
                        
                        {/* Monthly grand totals */}
                        {grandTotals.bulanan.map((val, idx) => (
                          <td key={idx} className="py-3 px-3 border-r border-slate-300 text-end text-blue-900 font-bold bg-slate-100">{formatUang(val)}</td>
                        ))}

                        <td className="py-3 px-4 border-r border-slate-300 text-end text-slate-900 bg-slate-100">{formatUang(grandTotals.sp2d)}</td>
                        <td className="py-3 px-4 border-r border-slate-300 text-center text-slate-800 bg-slate-100">{formatPersen(grandTotals.pagu > 0 ? (grandTotals.sp2d / grandTotals.pagu) * 100 : 0)}</td>
                        
                        <td className={`py-3 px-4 border-r border-slate-300 text-end bg-slate-100 ${grandTotals.sisaSp2d < 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatUang(grandTotals.sisaSp2d)}</td>
                        <td className={`py-3 px-4 border-r border-slate-300 text-center bg-slate-100 ${grandTotals.sisaSp2d < 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatPersen(grandTotals.pagu > 0 ? (grandTotals.sisaSp2d / grandTotals.pagu) * 100 : 0)}</td>
                        
                        <td className="py-3 px-4 border-r border-slate-300 text-end text-slate-800 bg-slate-100">{formatUang(grandTotals.verif)}</td>
                        <td className="py-3 px-4 border-r border-slate-300 text-end text-slate-800 bg-slate-100">{formatUang(grandTotals.ppk)}</td>
                        <td className="py-3 px-4 border-r border-slate-300 text-end text-slate-900 bg-slate-100 font-bold">{formatUang(grandTotals.totalProses)}</td>
                        
                        <td className="py-3 px-4 border-r border-slate-300 text-end text-emerald-800 font-bold bg-slate-100">{formatUang(grandTotals.totalRealisasi)}</td>
                        <td className="py-3 px-4 border-r border-slate-300 text-center text-emerald-800 font-bold bg-slate-100">{formatPersen(grandTotals.pagu > 0 ? (grandTotals.totalRealisasi / grandTotals.pagu) * 100 : 0)}</td>
                        
                        <td className={`py-3 px-4 border-r border-slate-300 text-end bg-slate-100 font-bold ${grandTotals.sisaAkhir < 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatUang(grandTotals.sisaAkhir)}</td>
                        <td className={`py-3 px-4 border-r border-slate-300 text-center bg-slate-100 font-bold ${grandTotals.sisaAkhir < 0 ? 'text-red-600' : 'text-blue-700'}`}>{formatPersen(grandTotals.pagu > 0 ? (grandTotals.sisaAkhir / grandTotals.pagu) * 100 : 0)}</td>
                        <td className="bg-slate-100"></td>
                      </tr>

                      {/* 1. Total Realisasi (SP2D) Row */}
                      <tr className="bg-slate-50 text-slate-800">
                        <td colSpan={showVolumeHarga ? 5 : 3} className="py-3 px-4 text-end font-sans sticky left-0 z-10 bg-slate-200 border-r-2 border-slate-300 text-slate-900 font-bold" style={{ width: showVolumeHarga ? '740px' : '550px', minWidth: showVolumeHarga ? '740px' : '550px', maxWidth: showVolumeHarga ? '740px' : '550px' }}>Total Realisasi</td>
                        {grandTotals.bulanan.map((val, idx) => (
                          <td key={idx} className="py-3 px-3 border-r border-slate-300 text-end font-bold text-slate-900 bg-slate-100">{formatUang(val)}</td>
                        ))}
                        <td colSpan={showVolumeHarga ? 13 : 15} rowSpan="5" className="align-middle text-center text-slate-600 font-bold italic font-sans text-xs border-l border-slate-300 bg-slate-50">
                          Panel Kalkulasi Bulanan & Rekonsiliasi
                        </td>
                      </tr>

                      {/* 2. MyIntress Row */}
                      <tr className="bg-slate-50">
                        <td colSpan={showVolumeHarga ? 5 : 3} className="py-2 px-4 text-end font-sans sticky left-0 z-10 bg-slate-200 border-r-2 border-slate-300 text-slate-900 font-bold" style={{ width: showVolumeHarga ? '740px' : '550px', minWidth: showVolumeHarga ? '740px' : '550px', maxWidth: showVolumeHarga ? '740px' : '550px' }}>MyIntress</td>
                        {grandTotals.bulanan.map((val, idx) => (
                          <td key={idx} className="p-1 border-r border-slate-300 text-end bg-slate-50">
                            <input
                              type="text"
                              value={formatRupiah(myIntress[idx])}
                              onChange={(e) => {
                                const input = e.target;
                                const cursorPosition = input.selectionStart;
                                const originalLength = input.value.length;
                                const rawVal = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                                handleMyIntressChange(idx, rawVal);
                                setTimeout(() => {
                                  const formattedValue = formatRupiah(rawVal);
                                  const newLength = formattedValue.length;
                                  const lengthDiff = newLength - originalLength;
                                  let newCursorPos = cursorPosition + lengthDiff;
                                  if (newCursorPos < 0) newCursorPos = 0;
                                  input.setSelectionRange(newCursorPos, newCursorPos);
                                }, 0);
                              }}
                              placeholder="0"
                              disabled={isReadOnly}
                              className={`w-full border border-slate-300 text-slate-800 text-right px-2 py-1.5 rounded-lg text-[10px] focus:border-blue-500 outline-none w-24 mx-auto font-mono ${
                                isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                              }`}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* 3. Selisih Row */}
                      <tr className="bg-slate-50 text-slate-800">
                        <td colSpan={showVolumeHarga ? 5 : 3} className="py-3 px-4 text-end font-sans sticky left-0 z-10 bg-slate-200 border-r-2 border-slate-300 text-slate-900 font-bold" style={{ width: showVolumeHarga ? '740px' : '550px', minWidth: showVolumeHarga ? '740px' : '550px', maxWidth: showVolumeHarga ? '740px' : '550px' }}>Selisih (Realisasi - Intress)</td>
                        {grandTotals.bulanan.map((val, idx) => {
                          const { selisih } = getReconciliationMath(idx)
                          return (
                            <td 
                              key={idx} 
                              className={`py-3 px-3 border-r border-slate-300 text-end font-bold bg-slate-50 ${selisih < 0 ? 'text-red-600' : 'text-slate-800'}`}
                            >
                              {formatUang(selisih)}
                            </td>
                          )
                        })}
                      </tr>

                      {/* 4. Rekonsiliasi Row */}
                      <tr className="bg-slate-50">
                        <td colSpan={showVolumeHarga ? 5 : 3} className="py-2 px-4 text-end font-sans sticky left-0 z-10 bg-slate-200 border-r-2 border-slate-300 text-slate-900 font-bold" style={{ width: showVolumeHarga ? '740px' : '550px', minWidth: showVolumeHarga ? '740px' : '550px', maxWidth: showVolumeHarga ? '740px' : '550px' }}>Rekonsiliasi</td>
                        {grandTotals.bulanan.map((val, idx) => (
                          <td key={idx} className="p-1 border-r border-slate-300 text-end bg-slate-50">
                            <input
                              type="text"
                              value={formatRupiah(rekon[idx])}
                              onChange={(e) => {
                                const input = e.target;
                                const cursorPosition = input.selectionStart;
                                const originalLength = input.value.length;
                                const rawVal = parseInt(e.target.value.replace(/[^0-9]/g, ''), 10) || 0;
                                handleRekonChange(idx, rawVal);
                                setTimeout(() => {
                                  const formattedValue = formatRupiah(rawVal);
                                  const newLength = formattedValue.length;
                                  const lengthDiff = newLength - originalLength;
                                  let newCursorPos = cursorPosition + lengthDiff;
                                  if (newCursorPos < 0) newCursorPos = 0;
                                  input.setSelectionRange(newCursorPos, newCursorPos);
                                }, 0);
                              }}
                              placeholder="0"
                              disabled={isReadOnly}
                              className={`w-full border border-slate-300 text-slate-800 text-right px-2 py-1.5 rounded-lg text-[10px] focus:border-blue-500 outline-none w-24 mx-auto font-mono ${
                                isReadOnly ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'
                              }`}
                            />
                          </td>
                        ))}
                      </tr>

                      {/* 5. Selisih Akhir Row */}
                      <tr className="bg-slate-100 text-slate-800 font-bold">
                        <td colSpan={showVolumeHarga ? 5 : 3} className="py-3 px-4 text-end font-sans sticky left-0 z-10 bg-slate-200 border-r-2 border-slate-300 text-slate-900 font-bold" style={{ width: showVolumeHarga ? '740px' : '550px', minWidth: showVolumeHarga ? '740px' : '550px', maxWidth: showVolumeHarga ? '740px' : '550px' }}>Selisih Akhir</td>
                        {grandTotals.bulanan.map((val, idx) => {
                          const { selisihAkhir } = getReconciliationMath(idx)
                          return (
                            <td 
                              key={idx} 
                              className={`py-3 px-3 border-r border-slate-300 text-end bg-slate-100 ${selisihAkhir < 0 ? 'text-red-600' : 'text-emerald-700'}`}
                            >
                              {formatUang(selisihAkhir)}
                            </td>
                          )
                        })}
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {/* Master Data Modal container */}
              <BudgetModal
                isOpen={isBudgetOpen}
                onClose={() => setIsBudgetOpen(false)}
                onSave={handleSaveBudget}
                editId={selectedBudgetEditId}
                allMasterData={budgetRawData}
              />
            </div>
          ) : (
            /* ===============================================================
               SUB-TAB 2: SUMMARY SHEET FOR TARGET HAL III DIPA 
               =============================================================== */
            <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm flex flex-col flex-1 min-h-0">
              <div className="overflow-x-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider">
                      <th rowSpan="2" className="bg-blue-600 text-white font-bold border border-white text-center align-middle px-4 py-3 w-1/4">JENIS BELANJA</th>
                      <th rowSpan="2" className="bg-blue-600 text-white font-bold border border-white text-center align-middle px-4 py-3 text-right w-1/6">PAGU</th>
                      <th colSpan="4" className="bg-blue-600 text-white font-bold border border-white text-center px-4 py-2">REALISASI</th>
                      <th colSpan="2" className="bg-red-600 text-white font-bold border border-white text-center px-4 py-2">TARGET PENYERAPAN {selectedTahun}</th>
                      <th colSpan="2" className="bg-red-600 text-white font-bold border border-white text-center px-4 py-2">LEBIH / (KURANG)</th>
                      {!isReadOnly && <th rowSpan="2" className="bg-slate-100 text-slate-700 font-bold border border-white text-center align-middle px-4 py-3 w-24">AKSI</th>}
                    </tr>
                    <tr className="text-[9px] font-bold uppercase tracking-wider">
                      {/* Sub-kolom Realisasi (Biru) */}
                      <th className="bg-blue-600 text-white font-bold border border-white text-center px-3 py-2 text-right">SP2D</th>
                      <th className="bg-blue-600 text-white font-bold border border-white text-center px-3 py-2">%</th>
                      <th className="bg-blue-600 text-white font-bold border border-white text-center px-3 py-2 text-right">PROSES</th>
                      <th className="bg-blue-600 text-white font-bold border border-white text-center px-3 py-2">%</th>
                      
                      {/* Sub-kolom Target & Kurang (Merah) */}
                      <th className="bg-red-600 text-white font-bold border border-white text-center px-3 py-2 text-right">NILAI</th>
                      <th className="bg-red-600 text-white font-bold border border-white text-center px-3 py-2">%</th>
                      <th className="bg-red-600 text-white font-bold border border-white text-center px-3 py-2 text-right">NILAI</th>
                      <th className="bg-red-600 text-white font-bold border border-white text-center px-3 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300 text-xs font-semibold text-slate-800 font-sans">
                    {dipaData.map((item) => {
                      const warnaSelisih = item.lebih_kurang_nilai < 0 ? 'text-red-600' : 'text-emerald-700'
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-slate-800 font-bold">{formatJenisBelanja(item.jenis_belanja)}</td>
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-bold text-slate-800">{formatUang(item.pagu)}</td>
                          
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono text-slate-700">{formatUang(item.sp2d_nilai)}</td>
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono text-slate-700">{formatPersen(item.sp2d_persen)}</td>
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono text-slate-700">{formatUang(item.proses_nilai)}</td>
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono text-slate-700">{formatPersen(item.proses_persen)}</td>
                          
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-bold text-slate-800">{formatUang(item.target_nilai)}</td>
                          <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono font-bold text-slate-800">{formatPersen(item.target_percent || item.target_persen)}</td>
                          
                          <td className={`py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold ${warnaSelisih}`}>{formatUang(item.lebih_kurang_nilai)}</td>
                          <td className={`py-4 px-6 border-r border-b border-slate-300 text-center font-mono font-extrabold ${warnaSelisih}`}>{formatPersen(item.lebih_kurang_persen)}</td>
                          
                          {!isReadOnly && (
                            <td className="py-4 px-6 text-center border-b border-slate-300">
                              <button
                                onClick={() => handleEditDipaClick(item)}
                                className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-300 hover:border-red-300 rounded-xl transition-all shadow-xs"
                                title="Sesuaikan Target"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}

                    {/* Total Row */}
                    {dipaTotalRow && (
                      <tr className="bg-slate-100 text-slate-900 font-bold border-t-2 border-slate-300 text-xs font-sans">
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-center uppercase tracking-wider">TOTAL</td>
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold text-slate-900">{formatUang(dipaTotalRow.pagu)}</td>
                        
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono text-slate-800">{formatUang(dipaTotalRow.sp2d_nilai)}</td>
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono text-slate-800">{formatPersen(dipaTotalRow.sp2d_persen)}</td>
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono text-slate-800">{formatUang(dipaTotalRow.proses_nilai)}</td>
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono text-slate-800">{formatPersen(dipaTotalRow.proses_persen)}</td>
                        
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-bold text-slate-900">{formatUang(dipaTotalRow.target_nilai)}</td>
                        <td className="py-4 px-6 border-r border-b border-slate-300 text-center font-mono font-bold text-slate-900">{formatPersen(dipaTotalRow.target_percent || dipaTotalRow.target_persen)}</td>
                        
                        <td className={`py-4 px-6 border-r border-b border-slate-300 text-right font-mono font-extrabold ${dipaTotalRow.lebih_kurang_nilai < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatUang(dipaTotalRow.lebih_kurang_nilai)}</td>
                        <td className={`py-4 px-6 border-r border-b border-slate-300 text-center font-mono font-extrabold ${dipaTotalRow.lebih_kurang_nilai < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{formatPersen(dipaTotalRow.lebih_kurang_persen)}</td>
                        {!isReadOnly && <td className="border-b border-slate-300"></td>}
                      </tr>
                    )}

                    {dipaData.length === 0 && (
                      <tr>
                        <td colSpan={isReadOnly ? 10 : 11} className="py-12 text-center text-slate-600 font-semibold font-sans">
                          Gagal memuat atau data kosong.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* DIPA Modal Container */}
              <DipaModal
                isOpen={isDipaOpen}
                onClose={() => setIsDipaOpen(false)}
                onSave={fetchDipaData}
                dipaItem={selectedDipaItem}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default RealisasiAnggaran
