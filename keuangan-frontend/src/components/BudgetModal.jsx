import { useState, useEffect, useRef } from 'react'
import { X, Info, AlertCircle, ChevronDown, Check } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

// Custom Dropdown Component (Multi-line word wrapping, native tooltip fallback & dynamic color styling)
function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  disabled = false,
  getOptionValue = (item, idx) => typeof item === 'object' ? (item.id !== undefined ? String(item.id) : `${item.kode || 'opt'}___${idx}`) : String(item),
  getOptionLabel = (item) => typeof item === 'object' ? (item.kode ? `${item.kode} (${item.uraian || ''})` : (item.uraian || item.nama || item.nama_judul || '')) : String(item),
  getItemClassName = null,
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedItem = options.find((item, idx) => getOptionValue(item, idx) === String(value || ''))
  const currentLabel = selectedItem ? getOptionLabel(selectedItem) : placeholder

  const handleSelect = (item, idx) => {
    const val = getOptionValue(item, idx)
    onChange(val)
    setIsOpen(false)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        title={currentLabel}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full flex items-center justify-between bg-slate-50 border text-xs md:text-sm rounded-xl px-4 py-3 outline-none transition-all duration-200 text-left ${
          disabled 
            ? 'opacity-40 cursor-not-allowed border-slate-200' 
            : isOpen 
              ? 'border-blue-500 ring-2 ring-blue-500/20 bg-white shadow-sm' 
              : 'border-slate-300 hover:border-slate-400 hover:bg-white'
        } ${className}`}
      >
        <span className={`whitespace-normal text-left break-words leading-tight font-semibold ${selectedItem ? 'text-slate-800' : 'text-slate-400'}`}>
          {currentLabel}
        </span>
        <ChevronDown 
          className={`w-4 h-4 text-slate-400 ml-2 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-600' : ''
          }`} 
        />
      </button>

      {/* Popover Options Card */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 mt-1.5 z-[100] max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-1 text-xs md:text-sm transition-all duration-150 ease-out animate-in fade-in zoom-in-95">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 text-center italic">Tidak ada pilihan</div>
          ) : (
            options.map((item, idx) => {
              const itemVal = getOptionValue(item, idx)
              const itemLabel = getOptionLabel(item)
              const isSelected = itemVal === String(value || '')
              
              const defaultStyle = isSelected 
                ? 'bg-blue-50 text-blue-700 font-bold' 
                : 'hover:bg-slate-100 text-slate-700'
              
              const computedStyle = getItemClassName ? getItemClassName(item, isSelected) : defaultStyle

              return (
                <div
                  key={itemVal}
                  title={itemLabel}
                  onClick={() => handleSelect(item, idx)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors duration-150 border-b last:border-b-0 border-slate-100/60 ${computedStyle}`}
                >
                  <span className="whitespace-normal text-left break-words leading-snug pr-2">{itemLabel}</span>
                  {isSelected && <Check className="w-4.5 h-4.5 text-blue-600 flex-shrink-0" />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function BudgetModal({ isOpen, onClose, onSave, editId, allMasterData }) {
  const [formData, setFormData] = useState({
    parent_id: '',
    level: '',
    kode: '',
    uraian: '',
    volume: '',
    harga_satuan: 0,
    pagu: 0,
    judul_subbagian_id: ''
  })

  const [subbagianList, setSubbagianList] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Level options configuration
  const levelOptions = [
    { value: 'Program', label: '1. Program' },
    { value: 'Kegiatan', label: '2. Kegiatan' },
    { value: 'KRO', label: '3. KRO' },
    { value: 'RO', label: '4. RO' },
    { value: 'Komponen', label: '5. Komponen' },
    { value: 'Subkomponen', label: '6. Subkomponen' },
    { value: 'Akun', label: '7. Akun' },
    { value: 'Detail', label: '8. Detail Anggaran' }
  ]

  // Dynamic Background Color Mapping for Parent Induk items (Sync with Table Rows)
  const getItemBgByLevel = (item, isSelected) => {
    if (!item || item.id === '') {
      return isSelected 
        ? 'bg-blue-100 text-blue-900 font-bold border-l-4 border-blue-600' 
        : 'bg-white hover:bg-slate-100 text-slate-700 border-l-4 border-slate-200'
    }

    const level = item.level || item.value || ''
    let colorClass = ''

    switch (level) {
      case 'Program':
        colorClass = isSelected
          ? 'bg-rose-200 text-rose-950 font-black border-l-4 border-rose-600 shadow-xs'
          : 'bg-rose-100/90 hover:bg-rose-200 text-rose-950 font-bold border-l-4 border-rose-500'
        break
      case 'Kegiatan':
        colorClass = isSelected
          ? 'bg-purple-200 text-purple-950 font-black border-l-4 border-purple-600 shadow-xs'
          : 'bg-purple-100/90 hover:bg-purple-200 text-purple-950 font-bold border-l-4 border-purple-500'
        break
      case 'KRO':
        colorClass = isSelected
          ? 'bg-emerald-200 text-emerald-950 font-black border-l-4 border-emerald-600 shadow-xs'
          : 'bg-emerald-100/90 hover:bg-emerald-200 text-emerald-950 font-bold border-l-4 border-emerald-500'
        break
      case 'RO':
        colorClass = isSelected
          ? 'bg-sky-200 text-sky-950 font-black border-l-4 border-sky-600 shadow-xs'
          : 'bg-sky-100/90 hover:bg-sky-200 text-sky-950 font-bold border-l-4 border-sky-500'
        break
      case 'Komponen':
      case 'Subkomponen':
      case 'Akun':
      case 'Detail':
      default:
        colorClass = isSelected
          ? 'bg-slate-200 text-slate-900 font-bold border-l-4 border-slate-600'
          : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-l-4 border-slate-300'
        break
    }

    return colorClass
  }

  // Load Subbagian dropdown list
  useEffect(() => {
    const fetchSubbagian = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await fetch(`${API_BASE_URL}/api/realisasi/subbagian-judul`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const result = await res.json()
        if (result.status === 'success' && result.data) {
          setSubbagianList(result.data)
        }
      } catch (err) {
        console.error('Error fetching subbagian', err)
      }
    }
    fetchSubbagian()
  }, [])

  // Setup form on Edit vs Add
  useEffect(() => {
    if (!isOpen) return
    setError('')

    if (!editId) {
      setFormData({
        parent_id: '',
        level: '',
        kode: '',
        uraian: '',
        volume: '',
        harga_satuan: 0,
        pagu: 0,
        judul_subbagian_id: ''
      })
      return
    }

    const item = allMasterData.find(x => x.id === editId)
    if (item) {
      setFormData({
        parent_id: item.parent_id || '',
        level: item.level || '',
        kode: item.kode || '',
        uraian: item.uraian || '',
        volume: item.volume || '',
        harga_satuan: item.harga_satuan || 0,
        pagu: item.pagu || 0,
        judul_subbagian_id: item.judul_subbagian_id || ''
      })
    }
  }, [editId, isOpen, allMasterData])

  // Sort and build hierarchy list for parent selection
  const buildParentTree = (nodes, parentId = null, depth = 0) => {
    let result = []
    const children = nodes.filter(d => d.parent_id === parentId || (parentId === null && !d.parent_id))
    children.forEach(child => {
      result.push({ ...child, depth })
      result = result.concat(buildParentTree(nodes, child.id, depth + 1))
    })
    return result
  }

  // Filter out editId and its descendants to prevent circular reference
  const getPossibleParents = () => {
    if (!editId) return buildParentTree(allMasterData, null, 0)
    
    const getDescendantIds = (parentId) => {
      let ids = [parentId]
      const children = allMasterData.filter(d => d.parent_id === parentId)
      children.forEach(c => {
        ids = ids.concat(getDescendantIds(c.id))
      })
      return ids
    }
    
    const excludedIds = getDescendantIds(editId)
    const allowedNodes = allMasterData.filter(d => !excludedIds.includes(d.id))
    return buildParentTree(allowedNodes, null, 0)
  }

  const parentOptions = [
    { id: '', label: '-- Paling Atas (Tidak Punya Induk) --' },
    ...getPossibleParents()
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    // Validate Subbagian linkage
    if (formData.level === 'Detail' && !formData.judul_subbagian_id) {
      setError('Tingkat Detail wajib ditautkan ke unit Subbagian!')
      setIsSubmitting(false)
      return
    }

    const payload = {
      parent_id: formData.parent_id || null,
      level: formData.level,
      kode: formData.kode,
      uraian: formData.uraian,
      volume: formData.volume || null,
      harga_satuan: parseFloat(formData.harga_satuan) || 0,
      pagu: parseFloat(formData.pagu) || 0,
      judul_subbagian_id: formData.level === 'Detail' ? (formData.judul_subbagian_id || null) : null
    }

    const targetUrl = editId ? `${API_BASE_URL}/api/anggaran/${editId}` : `${API_BASE_URL}/api/anggaran`
    const targetMethod = editId ? 'PUT' : 'POST'

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
        const newId = result.dataId || result.id || null
        onSave(newId)
        onClose()
      } else {
        setError(result.message || 'Gagal menyimpan data anggaran.')
      }
    } catch (err) {
      console.error(err)
      setError('Terjadi kesalahan jaringan saat menyimpan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLevelChange = (selectedLevel) => {
    setFormData(prev => {
      const updated = { ...prev, level: selectedLevel }
      if (selectedLevel !== 'Detail') {
        updated.volume = ''
        updated.harga_satuan = 0
        updated.pagu = 0
      }
      return updated
    })
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

  const handleNominalChange = (e, fieldName) => {
    const input = e.target;
    const cursorPosition = input.selectionStart;
    const originalLength = input.value.length;

    let val = String(input.value).replace(/Rp/gi, '').trim().split(',')[0];
    if (/^\d+\.\d{1,2}$/.test(val)) val = val.split('.')[0];
    let numberString = val.replace(/\D/g, '');
    if (numberString.length > 1 && numberString.startsWith('0')) {
      numberString = numberString.replace(/^0+/, '');
    }

    setFormData(prev => ({
      ...prev,
      [fieldName]: numberString
    }));

    setTimeout(() => {
      const formattedValue = formatRupiah(numberString);
      const newLength = formattedValue.length;
      const lengthDiff = newLength - originalLength;
      let newCursorPos = cursorPosition + lengthDiff;
      if (newCursorPos < 0) newCursorPos = 0;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  useEffect(() => {
    const volStr = formData.volume || ''
    const match = volStr.match(/[\d.]+/)
    const volVal = match ? parseFloat(match[0]) : 0
    const hargaVal = parseFloat(formData.harga_satuan) || 0
    
    setFormData(prev => ({
      ...prev,
      pagu: volVal * hargaVal
    }))
  }, [formData.volume, formData.harga_satuan])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200">
          <h3 className="text-lg font-extrabold text-slate-800 flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-blue-600"></span>
            {editId ? 'Edit Data Anggaran' : 'Tambah Kode/Program Baru'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Parent selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Induk / Masuk Ke Dalam Grup:
            </label>
            <CustomSelect
              value={formData.parent_id}
              onChange={(val) => setFormData({ ...formData, parent_id: val })}
              options={parentOptions}
              placeholder="-- Paling Atas (Tidak Punya Induk) --"
              getOptionValue={(opt) => String(opt.id || '')}
              getOptionLabel={(opt) => {
                if (opt.id === '') return opt.label
                const indent = '\u00A0\u00A0\u00A0\u00A0'.repeat(opt.depth || 0)
                const kodeStr = opt.kode ? `[${opt.kode}] ` : ''
                return `${indent}${kodeStr}${opt.uraian || ''}`
              }}
              getItemClassName={getItemBgByLevel}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Level select */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Tingkat / Level</label>
              <CustomSelect
                value={formData.level}
                onChange={handleLevelChange}
                options={levelOptions}
                placeholder="Pilih Level..."
                getOptionValue={(opt) => opt.value}
                getOptionLabel={(opt) => opt.label}
                getItemClassName={getItemBgByLevel}
              />
            </div>

            {/* Kode */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Kode</label>
              <input
                type="text"
                value={formData.kode}
                onChange={(e) => setFormData({ ...formData, kode: e.target.value })}
                placeholder="Contoh: 054.01.WA atau 521111"
                className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs md:text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all font-mono"
              />
            </div>
          </div>

          {/* Subbagian Linkage (Detail level only) */}
          {formData.level === 'Detail' && (
            <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-2xl p-5 animate-fadeIn">
              <label className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4" />
                <span>Tautkan ke Judul Subbagian</span>
              </label>
              <div className="mt-2">
                <CustomSelect
                  value={formData.judul_subbagian_id}
                  onChange={(val) => setFormData(prev => ({ ...prev, judul_subbagian_id: val }))}
                  options={subbagianList}
                  placeholder="-- Pilih Subbagian --"
                  getOptionValue={(item) => String(item.id)}
                  getOptionLabel={(item) => item.nama_judul || item.label || ''}
                />
              </div>
            </div>
          )}

          {/* Uraian */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Uraian / Nama Mata Anggaran</label>
            <input
              type="text"
              value={formData.uraian}
              onChange={(e) => setFormData({ ...formData, uraian: e.target.value })}
              placeholder="Contoh: Belanja Gaji dan Tunjangan"
              className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs md:text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
              required
            />
          </div>

          {/* Conditional Detail fields */}
          {formData.level === 'Detail' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                {/* Volume */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Volume / Lama Layanan</label>
                  <input
                    type="text"
                    value={formData.volume}
                    onChange={(e) => setFormData({ ...formData, volume: e.target.value })}
                    placeholder="Contoh: 1.00 LAYANAN atau 15 UNIT"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs md:text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Harga Satuan */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Harga Satuan (Rp)</label>
                  <input
                    type="text"
                    value={formatRupiah(formData.harga_satuan)}
                    onChange={(e) => handleNominalChange(e, 'harga_satuan')}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs md:text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Total Pagu */}
              <div className="space-y-2 animate-fadeIn">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Total Pagu Anggaran (Otomatis)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(formData.pagu)}
                    className="w-full border border-slate-200 text-slate-800 text-xs md:text-sm rounded-xl px-4 py-3 outline-none bg-slate-100 font-bold font-mono cursor-not-allowed"
                    disabled
                  />
                </div>
              </div>
            </>
          )}
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs md:text-sm rounded-xl py-3 px-6 transition-all duration-200"
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-xl py-3 px-7 shadow-md transition-all duration-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Data'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default BudgetModal
