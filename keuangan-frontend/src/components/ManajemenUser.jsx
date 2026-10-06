import { useState, useEffect } from 'react'
import { Users, Plus, Search, Edit2, Trash2, Shield, UserCheck, AlertCircle, Calendar } from 'lucide-react'
import Swal from 'sweetalert2'
import UserModal from './UserModal'
import { API_BASE_URL } from '../services/api'

function ManajemenUser() {
  const [users, setUsers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal Control States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedEditUser, setSelectedEditUser] = useState(null)

  const fetchUsers = async () => {
    setIsLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await response.json()
      if (response.ok && result.data) {
        setUsers(result.data)
      } else {
        setError(result.message || 'Gagal memuat daftar pengguna dari server.')
      }
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan jaringan saat memuat pengguna.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleAddUser = () => {
    setSelectedEditUser(null)
    setIsModalOpen(true)
  }

  const handleEditUser = (userItem) => {
    setSelectedEditUser(userItem)
    setIsModalOpen(true)
  }

  const handleDeleteUser = (userItem) => {
    Swal.fire({
      title: 'Apakah Anda yakin?',
      text: `Akun "${userItem.nama}" (${userItem.username}) akan dihapus secara permanen!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus Pengguna!',
      cancelButtonText: 'Batal',
      background: '#ffffff',
      color: '#0f172a'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`${API_BASE_URL}/api/users/${userItem.id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
          })
          const resJson = await response.json()

          if (response.ok) {
            fetchUsers()
            Swal.fire({
              title: 'Terhapus!',
              text: 'Pengguna berhasil dihapus.',
              icon: 'success',
              confirmButtonColor: '#2563eb'
            })
          } else {
            Swal.fire({
              title: 'Gagal!',
              text: resJson.message || 'Gagal menghapus pengguna.',
              icon: 'error',
              confirmButtonColor: '#ef4444'
            })
          }
        } catch (err) {
          console.error(err)
          Swal.fire({
            title: 'Error!',
            text: 'Terjadi kesalahan jaringan saat menghapus pengguna.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
          })
        }
      }
    })
  }

  const formatTanggal = (tglStr) => {
    if (!tglStr) return '-'
    const d = new Date(tglStr)
    if (isNaN(d.getTime())) return '-'
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    return (
      (u.nama || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <Users className="w-7 h-7 text-purple-600" />
            <span>Manajemen Pengguna</span>
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-1">
            Kelola data akun pengguna, peran wewenang (Role-Based Access Control), dan hak akses sistem
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs rounded-xl py-2.5 px-4 shadow-md transition-all duration-200 active:scale-[0.98] self-start sm:self-auto"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Tambah Pengguna</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-sm">
        <div className="relative w-full max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari berdasarkan Nama, Username, atau Role..."
            className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl pl-10 pr-4 py-2.5 outline-none focus:border-purple-500 transition-all font-semibold"
          />
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
            <svg className="animate-spin h-8 w-8 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-medium">Memuat data pengguna...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-[10px] font-bold text-slate-800 uppercase bg-slate-100">
                  <th className="py-4 px-6 text-center w-16">No</th>
                  <th className="py-4 px-6">Nama Lengkap</th>
                  <th className="py-4 px-6">Username</th>
                  <th className="py-4 px-6 text-center">Role / Wewenang</th>
                  <th className="py-4 px-6 text-center">Tanggal Dibuat</th>
                  <th className="py-4 px-6 text-center w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300 text-xs font-semibold text-slate-800">
                {filteredUsers.map((userItem, idx) => {
                  const roleStr = (userItem.role || '').toLowerCase()
                  const isSuperAdmin = roleStr === 'superadmin' || roleStr === 'super_admin'
                  return (
                    <tr key={userItem.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-500">{idx + 1}</td>
                      <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl ${isSuperAdmin ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          {isSuperAdmin ? <Shield className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </div>
                        <span>{userItem.nama}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-700 font-bold">{userItem.username}</td>
                      <td className="py-4 px-6 text-center">
                        {isSuperAdmin && (
                          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-purple-100 border border-purple-300 text-purple-800 inline-flex items-center gap-1.5 shadow-2xs">
                            <Shield className="w-3.5 h-3.5" />
                            <span>SUPER ADMIN</span>
                          </span>
                        )}
                        {roleStr === 'admin' && (
                          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-blue-100 border border-blue-300 text-blue-800 inline-flex items-center gap-1.5 shadow-2xs">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>ADMIN KEUANGAN</span>
                          </span>
                        )}
                        {roleStr === 'verifikator' && (
                          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-amber-100 border border-amber-300 text-amber-800 inline-flex items-center gap-1.5 shadow-2xs">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>VERIFIKATOR</span>
                          </span>
                        )}
                        {roleStr === 'user' && (
                          <span className="px-3 py-1 text-xs font-extrabold rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 inline-flex items-center gap-1.5 shadow-2xs">
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>USER (READ-ONLY)</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center font-mono text-slate-600">{formatTanggal(userItem.created_at)}</td>
                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditUser(userItem)}
                            className="p-2 bg-white hover:bg-purple-50 text-slate-600 hover:text-purple-600 border border-slate-300 hover:border-purple-300 rounded-xl transition-all shadow-xs"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userItem)}
                            className="p-2 bg-white hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-300 hover:border-red-300 rounded-xl transition-all shadow-xs"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-600 font-medium border-b border-slate-300">
                      Tidak ada data pengguna yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={fetchUsers}
        editUser={selectedEditUser}
      />
    </div>
  )
}

export default ManajemenUser
