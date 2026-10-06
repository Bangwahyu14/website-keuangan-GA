import { useState, useEffect } from 'react'
import { History, Search, RefreshCw, AlertCircle, ShieldAlert, Activity, UserCheck, FileText } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

function LogAktivitas() {
  const [logs, setLogs] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  const fetchLogs = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const result = await response.json()

      if (response.ok && result.status === 'success') {
        setLogs(result.data || [])
      } else {
        setError(result.message || 'Gagal mengambil data log aktivitas.')
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
      setError('Gagal terhubung ke server backend.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const formatWaktu = (isoString) => {
    if (!isoString) return '-'
    try {
      const date = new Date(isoString)
      const tgl = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
      const jam = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
      })
      return `${tgl}, ${jam}`
    } catch (e) {
      return isoString
    }
  }

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase()
    switch (act) {
      case 'TAMBAH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-950 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
            TAMBAH
          </span>
        )
      case 'EDIT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
            EDIT
          </span>
        )
      case 'HAPUS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-950 border border-rose-300">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
            HAPUS
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-300">
            {act}
          </span>
        )
    }
  }

  const getPageBadge = (page) => {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <FileText className="w-3 h-3 text-slate-500" />
        {page || 'Umum'}
      </span>
    )
  }

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase()
    return (
      (log.username && log.username.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.page && log.page.toLowerCase().includes(term)) ||
      (log.details && log.details.toLowerCase().includes(term))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2.5">
            <History className="w-7 h-7 text-purple-600" />
            <span>Log Aktivitas & Audit Trail</span>
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Rekam histori mutasi data (CRUD) yang dilakukan oleh pengguna secara real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl py-2.5 px-4 border border-slate-300 shadow-sm transition-all duration-200 active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 text-purple-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan Log</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-slate-300 rounded-3xl overflow-hidden shadow-sm">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari pengguna, aksi, halaman, atau keterangan..."
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-purple-500 transition-all font-medium shadow-xs"
            />
          </div>
          <div className="text-xs font-bold text-slate-700 bg-white border border-slate-300 px-3.5 py-2 rounded-xl shadow-xs self-start sm:self-auto">
            Total Log: <span className="text-purple-600 font-black">{filteredLogs.length}</span>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 m-6 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3">
            <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-semibold">Memuat data log aktivitas...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="excel-table w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-center w-14">NO</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 w-44">WAKTU & TANGGAL</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 w-40">PENGGUNA</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 w-36">USERNAME</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 w-44">HALAMAN</th>
                  <th className="py-4 px-6 border-r border-b border-slate-300 text-center w-28">AKSI</th>
                  <th className="py-4 px-6 border-b border-slate-300">KETERANGAN DETAIL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-xs font-semibold text-slate-800">
                {filteredLogs.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-6 text-center border-r border-b border-slate-300 text-slate-500 font-mono font-bold">{index + 1}</td>
                    <td className="py-3.5 px-6 border-r border-b border-slate-300 font-mono text-[11px] text-slate-700 whitespace-nowrap">
                      {formatWaktu(item.created_at)}
                    </td>
                    <td className="py-3.5 px-6 border-r border-b border-slate-300 font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-purple-100 border border-purple-300 text-purple-700 font-bold flex items-center justify-center text-[10px]">
                          {(item.nama || item.username || 'U')[0].toUpperCase()}
                        </div>
                        <span>{item.nama || item.username || '-'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-6 border-r border-b border-slate-300 font-mono text-slate-700 text-xs font-bold whitespace-nowrap">
                      {item.username || '-'}
                    </td>
                    <td className="py-3.5 px-6 border-r border-b border-slate-300 whitespace-nowrap">
                      {getPageBadge(item.page)}
                    </td>
                    <td className="py-3.5 px-6 border-r border-b border-slate-300 text-center whitespace-nowrap">
                      {getActionBadge(item.action)}
                    </td>
                    <td className="py-3.5 px-6 border-b border-slate-300 text-slate-700 font-normal leading-relaxed">
                      {item.details || '-'}
                    </td>
                  </tr>
                ))}

                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-500 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Activity className="w-8 h-8 text-slate-300" />
                        <span>Belum ada log aktivitas yang tercatat.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default LogAktivitas
