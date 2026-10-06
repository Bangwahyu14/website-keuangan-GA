import React, { useState, useEffect } from 'react'
import {
  Wallet,
  TrendingUp,
  CreditCard,
  Building2,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  Activity,
  CheckCircle2,
  Clock,
  PieChart,
  AlertTriangle,
  BarChart2
} from 'lucide-react'
import axiosInstance from '../services/axiosInstance'
import { useTahun } from '../context/TahunContext'

const cleanValue = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const strVal = String(val).trim();
  
  // 1. Cek apakah ini sudah berupa angka standar (misal "5100000" atau "5100000.00")
  if (!isNaN(strVal)) {
    return parseFloat(strVal);
  }

  // 2. Jika berformat Rupiah/Lokal (misal "Rp 9.000.000" atau "5.100.000,00")
  let cleanStr = strVal.replace(/Rp/gi, '').trim();
  
  // Hapus titik (pemisah ribuan format Indonesia)
  cleanStr = cleanStr.replace(/\./g, '');
  
  // Ubah koma (desimal Indonesia) menjadi titik (desimal Javascript)
  cleanStr = cleanStr.replace(/,/g, '.');
  
  // Bersihkan karakter non-numerik yang tersisa
  cleanStr = cleanStr.replace(/[^0-9.-]+/g, '');
  
  return parseFloat(cleanStr) || 0;
}

function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalPagu: 0,
    sp2dRealisasi: 0,
    persenSp2d: 0,
    sisaSp2d: 0,
    totalProses: 0,
    prosesVerif: 0,
    prosesPpk: 0,
    totalAkumulasi: 0,
    persenTotal: 0,
    sisaAkhir: 0
  })

  const [monthlyTrend, setMonthlyTrend] = useState(Array(12).fill(0))
  const [recentSpm, setRecentSpm] = useState([])
  const [subbagianChartData, setSubbagianChartData] = useState([])
  const { selectedTahun: tahunAktif, setSelectedTahun: setTahunAktif } = useTahun()
  const [isLoading, setIsLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ]

  const monthFullNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const timestamp = Date.now()

      // Fetch data menggunakan axiosInstance dengan cache-busting timestamp dan Promise.allSettled
      const results = await Promise.allSettled([
        axiosInstance.get(`/api/realisasi/analisa?tahun=${tahunAktif}&_t=${timestamp}`),
        axiosInstance.get(`/api/spm?tahun=${tahunAktif}&_t=${timestamp}`),
        axiosInstance.get(`/api/realisasi/subbagian-judul?tahun=${tahunAktif}&_t=${timestamp}`)
      ])

      const dataAnalisa = results[0].status === 'fulfilled' ? results[0].value.data : { status: 'error', data: {} }
      const dataSpm = results[1].status === 'fulfilled' ? results[1].value.data : { status: 'error', data: [] }
      const dataSubbagian = results[2].status === 'fulfilled' ? results[2].value.data : { status: 'error', data: [] }

      // 1. Process Analisa Data for Top Metrics & Monthly Chart
      if (dataAnalisa.status === 'success' && dataAnalisa.data) {
        const d = dataAnalisa.data
        const pagu = parseFloat(d.total_pagu) || 0
        const bulananArr = d.total_per_bulan ? d.total_per_bulan.map(v => cleanValue(v)) : Array(12).fill(0)
        setMonthlyTrend(bulananArr)

        const sp2dVal = bulananArr.reduce((a, b) => a + b, 0)
        const persenSp2dVal = pagu > 0 ? (sp2dVal / pagu) * 100 : 0
        const sisaSp2dVal = pagu - sp2dVal

        // Agregasi proses transaksi dari daftar SPM backend menggunakan cleanValue yang aman
        let verifVal = 0
        let ppkVal = 0
        const spmList = (dataSpm.status === 'success' && Array.isArray(dataSpm.data)) ? dataSpm.data : []
        
        spmList.forEach(spm => {
          // Tambahkan fallback key untuk status
          const rawStatus = spm.proses || spm.status_verifikasi || spm.status || '';
          const status = rawStatus.toLowerCase();
          const isFinished = status.includes('sp2d') || status.includes('selesai') || status.includes('cair');
          
          if (!isFinished) {
            // Tambahkan fallback key untuk nilai nominal
            const v = cleanValue(spm.verifikasi_nilai) || cleanValue(spm.spm_nilai) || cleanValue(spm.nilai_kwitansi) || cleanValue(spm.nilai) || 0;
            
            if (spm.kontrak && String(spm.kontrak).trim() !== '-' && String(spm.kontrak).trim() !== '') {
              ppkVal += v;
            } else {
              verifVal += v;
            }
          }
        })

        const totalProsesVal = verifVal + ppkVal
        const totalAkumulasiVal = sp2dVal + totalProsesVal
        const persenTotalVal = pagu > 0 ? (totalAkumulasiVal / pagu) * 100 : 0
        const sisaAkhirVal = pagu - totalAkumulasiVal

        setMetrics({
          totalPagu: pagu,
          sp2dRealisasi: sp2dVal,
          persenSp2d: persenSp2dVal,
          sisaSp2d: sisaSp2dVal,
          totalProses: totalProsesVal,
          prosesVerif: verifVal,
          prosesPpk: ppkVal,
          totalAkumulasi: totalAkumulasiVal,
          persenTotal: persenTotalVal,
          sisaAkhir: sisaAkhirVal
        })
      }

      // 2. Process Recent 5 Transactions from server
      if (dataSpm.status === 'success' && Array.isArray(dataSpm.data)) {
        // Sortir descending berdasarkan tanggal sebelum diambil 5 teratas
        const sortedSpm = [...dataSpm.data].sort((a, b) => {
          const dateA = new Date(a.created_at || a.verifikasi_tanggal || a.spm_tanggal || 0);
          const dateB = new Date(b.created_at || b.verifikasi_tanggal || b.spm_tanggal || 0);
          return dateB - dateA; 
        });
        
        setRecentSpm(sortedSpm.slice(0, 5));
      }

      // 3. Process Subbagian Breakdown Data
      if (dataSubbagian.status === 'success' && Array.isArray(dataSubbagian.data)) {
        const subCharts = dataSubbagian.data.map(sub => {
          const pagu = cleanValue(sub.subtotal_pagu)
          const realisasi = cleanValue(sub.subtotal_realisasi)
          const percent = pagu > 0 ? (realisasi / pagu) * 100 : 0
          return {
            title: sub.nama_judul,
            pagu,
            realisasi,
            percent: Math.min(percent, 100)
          }
        })
        setSubbagianChartData(subCharts)
      }

    } catch (err) {
      console.error('Error loading dashboard metrics via axiosInstance:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    setIsMounted(true)

    // Setup 30s Polling untuk Realtime Sync dengan cleanup clearInterval
    const intervalId = setInterval(() => {
      fetchDashboardData()
    }, 30000)

    return () => clearInterval(intervalId)
  }, [tahunAktif])

  const formatIDR = (val) => {
    if (!val || isNaN(val)) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const formatTanggalIndo = (tglStr) => {
    if (!tglStr || tglStr === '0000-00-00' || tglStr === '-') return '-'
    try {
      const d = new Date(tglStr)
      if (isNaN(d.getTime())) return String(tglStr)
      const monthNamesShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des']
      const day = String(d.getDate()).padStart(2, '0')
      const month = monthNamesShort[d.getMonth()]
      const year = d.getFullYear()
      return `${day} ${month} ${year}`
    } catch (e) {
      return String(tglStr)
    }
  }

  const formatShortIDR = (val) => {
    if (!val || isNaN(val)) return '0'
    if (val >= 1_000_000_000_000) return `${(val / 1_000_000_000_000).toFixed(2)} T`
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)} M`
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)} Jt`
    return new Intl.NumberFormat('id-ID').format(val)
  }

  const maxMonthlyVal = Math.max(...monthlyTrend, 1)

  const getStatusBadge = (status) => {
    const s = status ? status.toLowerCase() : ''
    if (s.includes('sp2d') || s.includes('selesai') || s.includes('cair')) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-700" />
          <span>SP2D Selesai</span>
        </span>
      )
    }
    if (s.includes('verifikasi') || s.includes('proses') || s.includes('menunggu')) {
      const labelText = s.includes('menunggu') ? 'Menunggu' : 'Verifikasi'
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 border border-amber-300 text-amber-800">
          <Clock className="w-3 h-3 text-amber-700" />
          <span>{labelText}</span>
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 border border-slate-300 text-slate-700">
        <span>{status || 'Draft'}</span>
      </span>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header Banner Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <span>Dashboard Keuangan</span>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700">
              Realtime Sync
            </span>
          </h1>
          <p className="text-xs md:text-sm font-medium text-slate-600 mt-1">
            Ringkasan eksekutif pagu anggaran, realisasi SP2D, dan proyeksi sisa dana T.A. {tahunAktif}
          </p>
        </div>

        {/* Year Filter Select Dropdown */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="relative">
            <select
              value={tahunAktif}
              onChange={(e) => setTahunAktif(e.target.value)}
              className="appearance-none bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-extrabold text-xs rounded-xl pl-4 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm transition-all cursor-pointer"
            >
              <option value="2027">T.A. 2027</option>
              <option value="2026">T.A. 2026</option>
              <option value="2025">T.A. 2025</option>
              <option value="2024">T.A. 2024</option>
            </select>
            <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Primary 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Pagu */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Total Pagu DIPA</span>
            <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {isLoading ? '...' : formatShortIDR(metrics.totalPagu)}
            </div>
            <p className="text-[11px] font-semibold text-slate-600 mt-1 font-mono">
              {formatIDR(metrics.totalPagu)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Alokasi Anggaran</span>
            <span className="font-bold text-amber-700">100% Total</span>
          </div>
        </div>

        {/* Card 2: Realisasi SP2D */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Realisasi (SP2D)</span>
            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-700 rounded-2xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-blue-700 tracking-tight flex items-baseline gap-2">
              <span>{isLoading ? '...' : formatShortIDR(metrics.sp2dRealisasi)}</span>
              <span className="text-xs font-extrabold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                {metrics.persenSp2d.toFixed(2)}%
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600 mt-1 font-mono">
              {formatIDR(metrics.sp2dRealisasi)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Sisa SP2D</span>
            <span className="font-bold text-slate-800">{formatShortIDR(metrics.sisaSp2d)}</span>
          </div>
        </div>

        {/* Card 3: Proses Transaksi */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Proses Transaksi</span>
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-rose-700 tracking-tight">
              {isLoading ? '...' : formatShortIDR(metrics.totalProses)}
            </div>
            <p className="text-[11px] font-semibold text-slate-600 mt-1 font-mono">
              Verif: {formatShortIDR(metrics.prosesVerif)} | PPK: {formatShortIDR(metrics.prosesPpk)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Pending Release</span>
            <span className="font-bold text-rose-700 font-mono">{formatIDR(metrics.totalProses)}</span>
          </div>
        </div>

        {/* Card 4: Total Realisasi + Proses & Sisa Akhir */}
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Akumulasi + Proses</span>
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-emerald-800 tracking-tight flex items-baseline gap-2">
              <span>{isLoading ? '...' : formatShortIDR(metrics.totalAkumulasi)}</span>
              <span className="text-xs font-extrabold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full">
                {metrics.persenTotal.toFixed(2)}%
              </span>
            </div>
            <p className="text-[11px] font-semibold text-slate-600 mt-1 font-mono">
              Sisa Akhir: {formatShortIDR(metrics.sisaAkhir)}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs">
            <span className="text-slate-600 font-medium">Sisa Pagu Akhir</span>
            <span className={`font-bold ${metrics.sisaAkhir < 0 ? 'text-red-600' : 'text-emerald-800'}`}>
              {formatIDR(metrics.sisaAkhir)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Monthly Trend Chart & Subbagian Progress Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend SVG Interactive Line Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Tren Realisasi Bulanan (T.A. {tahunAktif})</span>
              </h3>
              <p className="text-xs text-slate-600 font-medium mt-0.5">Grafik pencairan dana SP2D per bulan</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
              <span>Realisasi SP2D</span>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-64 w-full mt-4">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 1000 300">
              {/* Background Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                <line
                  key={idx}
                  x1="0"
                  y1={300 - ratio * 240 - 20}
                  x2="1000"
                  y2={300 - ratio * 240 - 20}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
              ))}

              {/* Area Gradient Fill */}
              <defs>
                <linearGradient id="areaGradientLight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Compute SVG Path Points */}
              {(() => {
                const points = monthlyTrend.map((val, i) => {
                  const x = (i / 11) * 940 + 30
                  const y = 280 - (val / maxMonthlyVal) * 220
                  return { x, y, val, month: monthFullNames[i] }
                })

                const dPath = points.reduce((acc, pt, i) => {
                  return i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`
                }, '')

                const areaPath = `${dPath} L ${points[11].x} 280 L ${points[0].x} 280 Z`

                return (
                  <g>
                    {/* Area path */}
                    <path d={areaPath} fill="url(#areaGradientLight)" />
                    {/* Line path */}
                    <path d={dPath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />

                    {/* Interactive Circles */}
                    {points.map((pt, i) => (
                      <g key={i} className="cursor-pointer group" onMouseEnter={() => setHoveredPoint(pt)} onMouseLeave={() => setHoveredPoint(null)}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r="6"
                          className="fill-white stroke-blue-600 stroke-[3] transition-all duration-200 hover:r-9"
                        />
                      </g>
                    ))}
                  </g>
                )
              })()}
            </svg>

            {/* Hover Tooltip Overlay */}
            {hoveredPoint && (
              <div
                className="absolute z-20 bg-white border border-slate-200 text-slate-800 text-xs rounded-xl p-3 shadow-xl pointer-events-none -translate-x-1/2 -translate-y-full mb-3"
                style={{
                  left: `${(hoveredPoint.x / 1000) * 100}%`,
                  top: `${(hoveredPoint.y / 300) * 100}%`
                }}
              >
                <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1">{hoveredPoint.month}</div>
                <div className="font-mono text-blue-700 font-extrabold">{formatIDR(hoveredPoint.val)}</div>
              </div>
            )}
          </div>

          {/* Month Axis Labels */}
          <div className="flex justify-between items-center pt-4 px-2 text-xs font-bold text-slate-600 font-mono">
            {monthNames.map((m, idx) => (
              <span key={idx}>{m}</span>
            ))}
          </div>
        </div>

        {/* Subbagian Progress Bar Cards (1 Col) */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
                <PieChart className="w-5 h-5 text-amber-600" />
                <span>Serapan Per Subbagian</span>
              </h3>
              <span className="text-xs text-slate-600 font-bold">Progress %</span>
            </div>

            <div className="space-y-4">
              {subbagianChartData.map((item, idx) => {
                const colorThemes = [
                  { bar: 'from-amber-500 to-amber-600', text: 'text-amber-700' },
                  { bar: 'from-blue-500 to-blue-600', text: 'text-blue-700' },
                  { bar: 'from-emerald-500 to-emerald-600', text: 'text-emerald-700' },
                  { bar: 'from-rose-500 to-rose-600', text: 'text-rose-700' },
                ]
                const styleTheme = colorThemes[idx % colorThemes.length]

                return (
                  <div key={idx} className="space-y-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                      <span className="truncate max-w-[180px]" title={item.title}>{item.title}</span>
                      <span className={`font-mono font-extrabold ${styleTheme.text}`}>
                        {item.percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-slate-200 rounded-full overflow-hidden border border-slate-300">
                      <div
                        className={`absolute top-0 left-0 h-full bg-gradient-to-r ${styleTheme.bar} rounded-full transition-all duration-1000 ease-out`}
                        style={{ width: isMounted ? `${item.percent}%` : '0%' }}
                      ></div>
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-slate-700 font-mono font-semibold">
                      <span>Real: {formatIDR(item.realisasi)}</span>
                      <span>Pagu: {formatIDR(item.pagu)}</span>
                    </div>
                  </div>
                )
              })}
              {subbagianChartData.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-600 font-medium italic">
                  Tidak ada data subbagian untuk ditampilkan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recent SPM Table Section */}
      <div className="bg-white border border-slate-300 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-800">Rincian Transaksi SPM Terbaru</h4>
              <p className="text-[11px] text-slate-600 mt-0.5">Menampilkan 5 data transaksi pengajuan dana terakhir</p>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="excel-table w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-[11px] font-bold text-slate-800 uppercase tracking-wider bg-slate-100">
                <th className="py-3.5 px-4 border-r border-b border-slate-300">No. SPM / Verifikasi</th>
                <th className="py-3.5 px-4 border-r border-b border-slate-300">Tanggal</th>
                <th className="py-3.5 px-4 border-r border-b border-slate-300">Nilai</th>
                <th className="py-3.5 px-4 border-r border-b border-slate-300">Rekanan</th>
                <th className="py-3.5 px-4 border-r border-b border-slate-300">Keterangan</th>
                <th className="py-3.5 px-4 border-b border-slate-300">Status Proses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-xs font-semibold text-slate-800">
              {recentSpm.map((spm) => (
                <tr key={spm.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-4 font-mono font-bold text-slate-800 border-r border-b border-slate-300">
                    {spm.spm_nomor || spm.verifikasi_nomor || '-'}
                  </td>
                  <td className="py-4 px-4 text-slate-800 font-mono border-r border-b border-slate-300">
                    {formatTanggalIndo(spm.spm_tanggal || spm.verifikasi_tanggal || spm.created_at)}
                  </td>
                  <td className="py-4 px-4 font-mono font-extrabold text-slate-900 border-r border-b border-slate-300">
                    {formatIDR(cleanValue(spm.spm_nilai || spm.verifikasi_nilai))}
                  </td>
                  <td className="py-4 px-4 text-slate-800 font-bold border-r border-b border-slate-300">
                    {spm.rekanan || '-'}
                  </td>
                  <td className="py-4 px-4 text-slate-800 max-w-xs truncate border-r border-b border-slate-300">
                    {spm.keterangan || spm.kegiatan || '-'}
                  </td>
                  <td className="py-4 px-4 border-b border-slate-300">
                    {getStatusBadge(spm.proses)}
                  </td>
                </tr>
              ))}
              {recentSpm.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-600 font-medium border-b border-slate-300">
                    Tidak ada data transaksi SPM ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
