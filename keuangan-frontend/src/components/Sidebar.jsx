import { useNavigate, useLocation, Link } from 'react-router-dom'
import { LayoutDashboard, ClipboardCheck, FileText, Target, Layers, BarChart3, Users, History } from 'lucide-react'
import finflowLogo from '../FinFlow_Logo.png'
import useAuth from '../hooks/useAuth'

function Sidebar({ activeTab, userRole }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  // Definisi seluruh item menu beserta daftar role yang memiliki hak akses
  const allMenuItems = [
    {
      id: '/dashboard',
      label: 'Dashboard Utama',
      icon: LayoutDashboard,
      allowedRoles: ['super_admin', 'superadmin', 'admin', 'verifikator', 'user']
    },
    {
      id: '/verifikasi',
      label: 'Form Verifikasi',
      icon: ClipboardCheck,
      allowedRoles: ['verifikator']
    },
    {
      id: '/spm',
      label: 'Rincian SPM & SP2D',
      icon: FileText,
      allowedRoles: ['admin', 'user']
    },
    {
      id: '/anggaran',
      label: 'Realisasi & Target DIPA',
      icon: Target,
      allowedRoles: ['admin', 'user']
    },
    {
      id: '/realisasi',
      label: 'Realisasi Per Subbagian',
      icon: Layers,
      allowedRoles: ['admin', 'user']
    },
    {
      id: '/analisa',
      label: 'Analisa Realisasi',
      icon: BarChart3,
      allowedRoles: ['admin', 'user']
    },
    {
      id: '/manajemen-user',
      label: 'Manajemen Pengguna',
      icon: Users,
      allowedRoles: ['super_admin', 'superadmin']
    },
    {
      id: '/log-aktivitas',
      label: 'Log Aktivitas',
      icon: History,
      allowedRoles: ['super_admin', 'superadmin']
    }
  ]

  // Filter menu secara kondisional berdasarkan role user saat ini
  const currentRole = (user?.role || userRole || localStorage.getItem('role') || '')
    .toLowerCase()
    .replace(/['"]/g, '') // Hapus tanda kutip tunggal maupun ganda
    .trim()

  const menuItems = allMenuItems.filter((item) => {
    return item.allowedRoles.some((role) => {
      const r = role.toLowerCase()
      return (
        r === currentRole ||
        (r === 'super_admin' && currentRole === 'superadmin') ||
        (r === 'superadmin' && currentRole === 'super_admin')
      )
    })
  })

  const currentPath = location?.pathname || activeTab || '/dashboard'

  const handleNavigation = (path) => {
    navigate(path)
  }

  const isSuperAdmin = currentRole === 'super_admin' || currentRole === 'superadmin'

  return (
    <aside className="w-72 bg-[#1D4ED8] border-r border-blue-800 flex flex-col h-full flex-shrink-0 z-20 shadow-xl print:hidden">
      {/* Brand Logo Header */}
      <div className="h-20 flex items-center px-6 border-b border-blue-600/50 bg-blue-900/30">
        <div className="flex items-center gap-3">
          <img src={finflowLogo} alt="FinFlow Logo" className="w-9 h-auto drop-shadow-sm" />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-extrabold text-white tracking-wide leading-none">FinFlow</span>
              <span className="text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded text-blue-50 leading-none">v2.0</span>
            </div>
            <span className="text-[9px] font-semibold tracking-wider text-blue-200 mt-0.5 uppercase">Sistem Keuangan</span>
          </div>
        </div>
      </div>

      {/* Navigation Menus */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        <div className="px-3 mb-2 text-[10px] font-bold text-blue-200 tracking-wider uppercase">
          {isSuperAdmin ? 'Menu Administrator' : 'Menu Navigasi'}
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPath === item.id || currentPath.startsWith(item.id)

          return (
            <Link
              key={item.id}
              to={item.id}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 relative group overflow-hidden ${
                isActive
                  ? 'text-blue-900 bg-white shadow-lg shadow-blue-950/20 font-bold'
                  : 'text-blue-100 hover:text-white hover:bg-blue-600/60'
              }`}
            >
              {/* Icon */}
              <Icon className={`w-5 h-5 transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-blue-700' : 'text-blue-200 group-hover:text-white'
              }`} />
              
              {/* Text */}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Sidebar Footer Details */}
      <div className="p-4 border-t border-blue-600/50 bg-blue-900/30 text-center">
        <p className="text-[10px] text-blue-100 font-medium">© 2026 Kementerian Keuangan</p>
        <p className="text-[9px] text-blue-200 font-mono mt-0.5">Sistem Realisasi Anggaran</p>
      </div>
    </aside>
  )
}

export default Sidebar
