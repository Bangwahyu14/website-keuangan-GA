import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import Dashboard from './components/Dashboard'
import SpmList from './components/SpmList'
import RealisasiAnggaran from './components/RealisasiAnggaran'
import RealisasiSubbagian from './components/RealisasiSubbagian'
import AnalisaRealisasi from './components/AnalisaRealisasi'
import ManajemenUser from './components/ManajemenUser'
import LogAktivitas from './components/LogAktivitas'
import FormVerifikasi from './components/FormVerifikasi'
import RincianSpmSp2d from './components/RincianSpmSp2d'
import ProtectedRoute from './components/ProtectedRoute'
import useAuth from './hooks/useAuth'
import { API_BASE_URL } from './services/api'

function App() {
  const { user: authUser, isAuthenticated: authStatus } = useAuth()
  const [isAuthenticated, setIsAuthenticated] = useState(authStatus)
  const [user, setUser] = useState(authUser)
  const navigate = useNavigate()
  const location = useLocation()

  // Early Warning Notification state shared with Topbar
  const [earlyWarningAlerts, setEarlyWarningAlerts] = useState({
    warningCount: 0,
    criticalCount: 0,
    alertItems: []
  })

  // Sync auth state with localStorage / custom hook
  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    const username = localStorage.getItem('username')
    const nama = localStorage.getItem('nama')
    
    if (token) {
      setIsAuthenticated(true)
      setUser({ username, role, nama })
      if (role !== 'super_admin' && role !== 'superadmin') {
        fetchEarlyWarnings()
      }
    } else {
      setIsAuthenticated(false)
    }
  }, [authStatus])

  // Calculate budget tree aggregates for warning detection
  const calculateBudgetAggregates = (masterData, spmList) => {
    const detailMap = {}
    spmList.forEach(spm => {
      if (!spm.kegiatan) return
      if (!detailMap[spm.kegiatan]) {
        detailMap[spm.kegiatan] = { sp2dTotal: 0, verifikasi: 0, ppk: 0 }
      }
      const status = spm.proses ? spm.proses.toLowerCase() : ''
      const isFinished = status.includes('sp2d') || status.includes('selesai') || status.includes('cair')
      if (isFinished) {
        detailMap[spm.kegiatan].sp2dTotal += parseFloat(spm.sp2d_nilai) || parseFloat(spm.spm_nilai) || 0
      } else {
        const valVerif = parseFloat(spm.verifikasi_nilai) || 0
        if (spm.kontrak) detailMap[spm.kegiatan].ppk += valVerif
        else detailMap[spm.kegiatan].verifikasi += valVerif
      }
    })

    const listCopy = JSON.parse(JSON.stringify(masterData))
    const itemMap = {}
    listCopy.forEach(item => {
      item.total_sp2d = 0
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

    const computeNode = (node) => {
      if (node.level === 'Detail') {
        const matched = detailMap[node.uraian]
        if (matched) {
          node.total_sp2d = matched.sp2dTotal
          node.proses_verifikasi = matched.verifikasi
          node.proses_ppk = matched.ppk
        }
        return {
          pagu: parseFloat(node.pagu) || 0,
          sp2d: node.total_sp2d,
          verif: node.proses_verifikasi,
          ppk: node.proses_ppk
        }
      }

      let sumPagu = 0, sumSp2d = 0, sumVerif = 0, sumPpk = 0
      node.children.forEach(child => {
        const res = computeNode(child)
        sumPagu += res.pagu
        sumSp2d += res.sp2d
        sumVerif += res.verif
        sumPpk += res.ppk
      })

      node.pagu = sumPagu
      node.total_sp2d = sumSp2d
      node.proses_verifikasi = sumVerif
      node.proses_ppk = sumPpk

      return { pagu: sumPagu, sp2d: sumSp2d, verif: sumVerif, ppk: sumPpk }
    }

    roots.forEach(r => computeNode(r))

    const resultList = []
    const flatten = (node) => {
      resultList.push(node)
      if (node.children) node.children.forEach(c => flatten(c))
    }
    roots.forEach(r => flatten(r))
    return resultList
  }

  // Initial fetch for Early Warning calculation on load
  const fetchEarlyWarnings = async () => {
    try {
      const token = localStorage.getItem('token')
      const role = localStorage.getItem('role')
      if (!token || role === 'super_admin' || role === 'superadmin') return

      const headers = { Authorization: `Bearer ${token}` }

      const [resBudget, resSpm] = await Promise.all([
        fetch(`${API_BASE_URL}/api/anggaran`, { headers }),
        fetch(`${API_BASE_URL}/api/spm`, { headers })
      ])

      const resultBudget = await resBudget.json()
      const resultSpm = await resSpm.json()

      if (resultBudget.status === 'success' && resultBudget.data) {
        const spmItems = (resultSpm.status === 'success' && resultSpm.data) ? resultSpm.data : []
        const aggregatedList = calculateBudgetAggregates(resultBudget.data, spmItems)

        let warningCount = 0
        let criticalCount = 0
        const alertItems = []

        aggregatedList.forEach(item => {
          if (item.level !== 'Detail') return
          const volRaw = item.volume || ''
          const sanitizedVolume = volRaw.replace(/\s+/g, ' ').trim().toUpperCase()
          const isTarget = ["1 THN", "12 BULAN", "9 BULAN"].includes(sanitizedVolume)
          if (!isTarget) return

          const pagu = parseFloat(item.pagu) || 0
          const sp2d = item.total_sp2d || 0
          const totalProses = (item.proses_verifikasi || 0) + (item.proses_ppk || 0)
          const totalRealisasi = sp2d + totalProses
          const sisaAkhir = pagu - totalRealisasi
          const sisaPersen = pagu > 0 ? (sisaAkhir / pagu) * 100 : 0

          if (sisaPersen < 10) {
            criticalCount++
            alertItems.push({ id: item.id, uraian: item.uraian, volume: item.volume, sisaPersen, type: 'critical' })
          } else if (sisaPersen >= 10 && sisaPersen < 50) {
            warningCount++
            alertItems.push({ id: item.id, uraian: item.uraian, volume: item.volume, sisaPersen, type: 'warning' })
          }
        })

        setEarlyWarningAlerts({ warningCount, criticalCount, alertItems })
      }
    } catch (err) {
      console.error('Error fetching early warning alerts on load', err)
    }
  }

  const handleLogin = (token, role, username, nama) => {
    localStorage.setItem('token', token)
    localStorage.setItem('role', role)
    localStorage.setItem('username', username)
    if (nama) localStorage.setItem('nama', nama)

    setIsAuthenticated(true)
    setUser({ username, role, nama })

    const lowerRole = (role || '').toLowerCase()
    if (lowerRole === 'super_admin' || lowerRole === 'superadmin') {
      navigate('/manajemen-user')
    } else if (lowerRole === 'verifikator') {
      navigate('/verifikasi')
    } else {
      navigate('/dashboard')
      fetchEarlyWarnings()
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('username')
    localStorage.removeItem('nama')
    setIsAuthenticated(false)
    setUser({ username: '', role: '', nama: '' })
    navigate('/login')
  }

  const lowerUserRole = (user.role || '').toLowerCase()
  const defaultRedirect = (lowerUserRole === 'super_admin' || lowerUserRole === 'superadmin')
    ? '/manajemen-user'
    : lowerUserRole === 'verifikator'
    ? '/verifikasi'
    : '/dashboard'

  return (
    <Routes>
      {/* Route Login */}
      <Route
        path="/login"
        element={
          !isAuthenticated ? (
            <Login onLogin={handleLogin} />
          ) : (
            <Navigate to={defaultRedirect} replace />
          )
        }
      />

      {/* Protected Main App Routes */}
      <Route
        path="/*"
        element={
          !isAuthenticated ? (
            <Navigate to="/login" replace />
          ) : (
            <div className="flex h-screen bg-[#FAF9F6] text-slate-800 overflow-hidden font-sans print:bg-white print:h-auto print:block print:overflow-visible print:m-0 print:p-0 print:min-h-0">
              {/* Permanent Left Sidebar */}
              <Sidebar activeTab={location.pathname} userRole={user.role} />

              {/* Main Layout Area */}
              <div className="flex-1 flex flex-col overflow-hidden print:bg-white print:h-auto print:block print:overflow-visible print:m-0 print:p-0 print:min-h-0">
                {/* Topbar */}
                <Topbar user={user} onLogout={handleLogout} earlyWarningAlerts={earlyWarningAlerts} />

                {/* Content Area */}
                <main className="flex-1 overflow-y-auto p-6 bg-[#FAF9F6] relative print:bg-white print:h-auto print:block print:overflow-visible print:m-0 print:p-0 print:min-h-0">
                  <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none bg-glow-pulse"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none bg-glow-pulse" style={{ animationDelay: '-4s' }}></div>

                  <div className="relative z-0 max-w-7xl mx-auto h-full print:bg-white print:max-w-none print:w-full print:h-auto print:block print:overflow-visible print:m-0 print:p-0 print:min-h-0">
                    <Routes>
                      {/* Dashboard (Seluruh User yang Terautentikasi) */}
                      <Route path="/dashboard" element={<Dashboard />} />

                      {/* Rute HANYA untuk super_admin */}
                      <Route
                        path="/manajemen-user"
                        element={
                          <ProtectedRoute allowedRoles={['super_admin', 'superadmin']}>
                            <ManajemenUser />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/log-aktivitas"
                        element={
                          <ProtectedRoute allowedRoles={['super_admin', 'superadmin']}>
                            <LogAktivitas />
                          </ProtectedRoute>
                        }
                      />

                      {/* Rute untuk admin & user (TIDAK ADA super_admin) */}
                      <Route
                        path="/spm"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'user']}>
                            <SpmList />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/anggaran"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'user']}>
                            <RealisasiAnggaran onAlertsUpdate={setEarlyWarningAlerts} />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/realisasi"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'user']}>
                            <RealisasiSubbagian />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/rincian-spm"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'user']}>
                            <RincianSpmSp2d />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/analisa"
                        element={
                          <ProtectedRoute allowedRoles={['admin', 'user']}>
                            <AnalisaRealisasi />
                          </ProtectedRoute>
                        }
                      />

                      {/* Rute HANYA untuk verifikator (TIDAK ADA super_admin) */}
                      <Route
                        path="/verifikasi"
                        element={
                          <ProtectedRoute allowedRoles={['verifikator']}>
                            <FormVerifikasi userRole={user.role} />
                          </ProtectedRoute>
                        }
                      />

                      {/* Default fallback ke dashboard */}
                      <Route path="*" element={<Navigate to={defaultRedirect} replace />} />
                    </Routes>
                  </div>
                </main>
              </div>
            </div>
          )
        }
      />
    </Routes>
  )
}

export default App
