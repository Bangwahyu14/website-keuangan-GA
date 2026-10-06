import { useState, useEffect, useRef } from 'react'
import { X, User, Lock, Shield, AlertCircle, ChevronDown, Check, Eye, EyeOff } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

// Custom Dropdown Component for Role Selection
function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih Role...',
  disabled = false,
  getOptionValue = (item) => (typeof item === 'object' ? item.value : String(item)),
  getOptionLabel = (item) => (typeof item === 'object' ? item.label : String(item)),
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedItem = options.find((item) => getOptionValue(item) === String(value || ''))
  const currentLabel = selectedItem ? getOptionLabel(selectedItem) : placeholder

  const handleSelect = (item) => {
    const val = getOptionValue(item)
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between bg-slate-50 border text-xs md:text-sm rounded-xl px-4 py-3 outline-none transition-all duration-200 text-left ${
          disabled
            ? 'opacity-40 cursor-not-allowed border-slate-200'
            : isOpen
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-sm'
              : 'border-slate-300 hover:border-slate-400 hover:bg-white'
        } ${className}`}
      >
        <span className={`whitespace-normal text-left font-semibold ${selectedItem ? 'text-slate-800' : 'text-slate-400'}`}>
          {currentLabel}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 ml-2 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`}
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 z-[100] max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-1 text-xs md:text-sm transition-all duration-150 ease-out animate-in fade-in zoom-in-95">
          {options.map((item) => {
            const itemVal = getOptionValue(item)
            const itemLabel = getOptionLabel(item)
            const isSelected = itemVal === String(value || '')
            return (
              <div
                key={itemVal}
                onClick={() => handleSelect(item)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-150 border-b last:border-b-0 border-slate-100/60 ${
                  isSelected
                    ? 'bg-purple-50 text-purple-700 font-bold'
                    : 'hover:bg-slate-100 text-slate-700'
                }`}
              >
                <span className="truncate pr-2">{itemLabel}</span>
                {isSelected && <Check className="w-4.5 h-4.5 text-purple-600 flex-shrink-0" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function UserModal({ isOpen, onClose, onSave, editUser }) {
  const [formData, setFormData] = useState({
    nama: '',
    username: '',
    password: '',
    role: 'admin'
  })

  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const roleOptions = [
    { value: 'super_admin', label: 'Super Admin (Manajemen User Only)' },
    { value: 'admin', label: 'Admin (Operasional Keuangan Only)' },
    { value: 'verifikator', label: 'Verifikator (Akses Form Verifikasi)' },
    { value: 'user', label: 'User (View/Read-Only Data Keuangan)' }
  ]

  useEffect(() => {
    if (!isOpen) return
    setError('')
    setShowPassword(false)

    if (editUser) {
      setFormData({
        nama: editUser.nama || '',
        username: editUser.username || '',
        password: '',
        role: editUser.role || 'admin'
      })
    } else {
      setFormData({
        nama: '',
        username: '',
        password: '',
        role: 'admin'
      })
    }
  }, [isOpen, editUser])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.nama.trim() || !formData.username.trim()) {
      setError('Nama Lengkap dan Username wajib diisi!')
      return
    }

    if (!editUser && !formData.password.trim()) {
      setError('Password wajib diisi untuk pengguna baru!')
      return
    }

    setIsSubmitting(true)

    const payload = {
      nama: formData.nama.trim(),
      nama_lengkap: formData.nama.trim(),
      username: formData.username.trim(),
      password: formData.password,
      role: formData.role
    }

    const targetUrl = editUser ? `${API_BASE_URL}/api/users/${editUser.id}` : `${API_BASE_URL}/api/users`
    const targetMethod = editUser ? 'PUT' : 'POST'

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
        onSave()
        onClose()
      } else {
        setError(result.message || 'Gagal menyimpan data pengguna.')
      }
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan jaringan saat menyimpan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-600"></span>
            {editUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nama Lengkap */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Nama Lengkap</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={formData.nama}
                onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                placeholder="Contoh: Ahmad Hidayat"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs md:text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 transition-all font-semibold"
                required
              />
            </div>
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Contoh: ahmad_admin"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs md:text-sm rounded-xl pl-10 pr-4 py-3 outline-none focus:border-purple-500 transition-all font-mono"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Password {editUser && <span className="text-slate-400 font-normal lowercase">(kosongkan jika tidak diubah)</span>}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editUser ? '••••••••' : 'Masukkan password'}
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs md:text-sm rounded-xl pl-10 pr-10 py-3 outline-none focus:border-purple-500 transition-all font-mono"
                required={!editUser}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                title={showPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-slate-500 italic">Password akan di-hash secara otomatis menggunakan bcrypt sebelum disimpan ke database.</p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-600" />
              <span>Role / Wewenang Pengguna</span>
            </label>
            <CustomSelect
              value={formData.role}
              onChange={(val) => setFormData({ ...formData, role: val })}
              options={roleOptions}
              placeholder="Pilih Role..."
            />
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs md:text-sm rounded-xl py-2.5 px-5 transition-all duration-200"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs md:text-sm rounded-xl py-2.5 px-6 shadow-md transition-all duration-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Pengguna'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UserModal
