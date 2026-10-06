import { useState } from 'react'
import { LogOut, User, Shield, Bell, AlertCircle, X, ShieldAlert, ChevronDown } from 'lucide-react'
import { useTahun } from '../context/TahunContext'

const getRoleLabel = (role) => {
  if (!role) return 'MEMUAT...'
  const r = String(role).toLowerCase().trim()
  switch (r) {
    case 'admin':
      return 'ADMIN KEUANGAN'
    case 'verifikator':
      return 'VERIFIKATOR KEUANGAN'
    case 'user':
      return 'USER KEUANGAN'
    case 'superadmin':
    case 'super_admin':
      return 'SUPER ADMIN'
    case 'ppk':
      return 'PPK KEUANGAN'
    case 'bendahara':
      return 'BENDAHARA KEUANGAN'
    default:
      return `${r.toUpperCase()} KEUANGAN`
  }
}

const getRoleBadgeColor = (role) => {
  if (!role) return 'bg-slate-700 text-slate-200 border-slate-500 font-medium'
  const r = String(role).toLowerCase().trim()
  switch (r) {
    case 'superadmin':
    case 'super_admin':
      return 'bg-purple-900/60 text-purple-200 border-purple-400/60 font-black'
    case 'admin':
      return 'bg-blue-900/50 text-blue-100 border-blue-400/40 font-bold'
    case 'verifikator':
      return 'bg-amber-900/60 text-amber-100 border-amber-400/50 font-bold'
    case 'user':
      return 'bg-emerald-900/60 text-emerald-200 border-emerald-400/60 font-bold'
    default:
      return 'bg-blue-900/50 text-blue-100 border-blue-400/40 font-bold'
  }
}

function Topbar({ user, onLogout, earlyWarningAlerts }) {
  const { selectedTahun } = useTahun()
  const [showAlertPopover, setShowAlertPopover] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  const currentUser = user || {
    username: localStorage.getItem('username') || '',
    role: localStorage.getItem('role') || '',
    nama: localStorage.getItem('nama') || ''
  }

  const role = currentUser.role || ''
  const isSuperAdmin = role === 'superadmin' || role === 'super_admin'
  const roleLabel = getRoleLabel(role)
  const roleBadgeColor = getRoleBadgeColor(role)

  const alerts = earlyWarningAlerts || { warningCount: 0, criticalCount: 0, alertItems: [] }
  const totalAlerts = (alerts.warningCount || 0) + (alerts.criticalCount || 0)

  return (
    <header className="h-20 bg-[#1D4ED8] border-b border-blue-800 flex items-center justify-between px-8 relative z-50 flex-shrink-0 text-white shadow-md print:hidden">
      {/* Welcome Message */}
      <div>
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span>Selamat Datang, {currentUser.nama || currentUser.username || 'User'}</span>
          <span className="text-xs font-normal text-blue-200 hidden md:inline">
            | {isSuperAdmin ? 'Portal Manajemen Pengguna Sistem' : `Monitoring Realisasi Anggaran ${selectedTahun}`}
          </span>
        </h2>
      </div>

      {/* Profile & Notifications Actions */}
      <div className="flex items-center gap-6">
        {/* Notification Bell (Admin Only) */}
        {!isSuperAdmin && (
          <div className="relative">
            <button 
              onClick={() => setShowAlertPopover(!showAlertPopover)}
              className="p-2 text-blue-100 hover:text-white hover:bg-blue-600/60 rounded-xl transition-colors relative"
              title="Pemberitahuan Peringatan Anggaran"
            >
              <Bell className="w-5 h-5" />
              {totalAlerts > 0 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border border-white animate-pulse"></span>
              )}
            </button>

            {/* Interactive Alert Popover Card */}
            {showAlertPopover && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl p-4 z-[99] animate-fadeIn">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span>Early Warning Anggaran ({totalAlerts})</span>
                  </h4>
                  <button onClick={() => setShowAlertPopover(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {alerts.alertItems.map((alert, idx) => (
                    <div key={idx} className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${
                      alert.type === 'critical'
                        ? 'bg-red-50 border-red-200 text-red-950'
                        : 'bg-amber-50 border-amber-200 text-amber-950'
                    }`}>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold truncate text-[11px]" title={alert.uraian}>{alert.uraian}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5 font-mono">Vol: {alert.volume}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-extrabold whitespace-nowrap ${
                        alert.type === 'critical' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {alert.sisaPersen.toFixed(1)}% Sisa
                      </span>
                    </div>
                  ))}
                  {totalAlerts === 0 && (
                    <p className="text-xs text-slate-500 text-center py-4 italic font-medium">Seluruh sisa anggaran dalam kondisi aman.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* User Card with Profile Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-3 bg-blue-900/40 hover:bg-blue-900/60 border border-blue-600/50 rounded-2xl px-4 py-2 transition-all cursor-pointer outline-none"
          >
            {/* Avatar Icon */}
            <div className={`p-1.5 rounded-xl ${isSuperAdmin ? 'bg-purple-500/30 text-purple-200' : 'bg-white/20 text-white'}`}>
              {isSuperAdmin ? <ShieldAlert className="w-4 h-4 text-purple-300" /> : <Shield className="w-4 h-4 text-blue-200" />}
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-white flex items-center gap-1">
                <span>{currentUser.username || 'User'}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </p>
              <p className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 border rounded mt-0.5 ${roleBadgeColor}`}>
                {roleLabel}
              </p>
            </div>
          </button>

          {/* Profile Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 text-slate-800 rounded-2xl shadow-2xl p-2 z-[99] animate-fadeIn">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser.nama || currentUser.username}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{currentUser.username}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false)
                    onLogout()
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Keluar / Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Direct Logout Button */}
        <button
          onClick={onLogout}
          className="flex items-center gap-2 bg-white/10 hover:bg-rose-600 border border-white/20 hover:border-rose-500 text-white font-semibold text-xs rounded-xl py-2.5 px-4 transition-all duration-200 shadow-md"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  )
}

export default Topbar
