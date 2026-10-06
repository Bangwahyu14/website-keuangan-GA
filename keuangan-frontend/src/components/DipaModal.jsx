import { useState, useEffect } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

import { useTahun } from '../context/TahunContext'

function DipaModal({ isOpen, onClose, onSave, dipaItem }) {
  const [targetPersen, setTargetPersen] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const { selectedTahun } = useTahun()

  useEffect(() => {
    if (isOpen && dipaItem) {
      setError('')
      setTargetPersen(dipaItem.target_persen !== undefined && dipaItem.target_persen !== null ? String(dipaItem.target_persen) : '')
    }
  }, [isOpen, dipaItem])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const payload = {
      kode_belanja: dipaItem.kode_belanja,
      nama_belanja: dipaItem.jenis_belanja,
      target_persen: targetPersen === '' ? 0 : parseFloat(targetPersen),
      tahun: selectedTahun
    }

    try {
      const token = localStorage.getItem('token')
      const response = await fetch(`${API_BASE_URL}/api/realisasi/hal3-dipa/${dipaItem.id}`, {
        method: 'PUT',
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
        setError(result.message || 'Gagal menyimpan target DIPA.')
      }
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan jaringan saat menyimpan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !dipaItem) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <span>Sesuaikan Target DIPA</span>
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

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 uppercase">Jenis Belanja</label>
            <input
              type="text"
              value={`${dipaItem.kode_belanja} - ${dipaItem.jenis_belanja}`}
              className="w-full border border-slate-200 text-slate-700 text-xs rounded-xl px-4 py-2.5 outline-none bg-slate-100 font-semibold cursor-not-allowed"
              disabled
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              Target Penyerapan (%)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                value={targetPersen}
                onChange={(e) => setTargetPersen(e.target.value)}
                placeholder="Contoh: 85"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-4 py-2.5 pr-10 outline-none focus:border-red-500 transition-all font-mono font-bold"
                min="0"
                max="100"
                step="0.01"
                required
              />
              <span className="absolute right-4 text-xs font-bold text-slate-500">%</span>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl py-2.5 px-5 transition-all duration-200"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl py-2.5 px-6 shadow-md transition-all duration-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Target'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DipaModal
