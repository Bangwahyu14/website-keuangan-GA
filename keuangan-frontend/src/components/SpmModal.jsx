import { useState, useEffect, useRef } from 'react'
import { X, Calendar, User, FileText, CheckCircle2, CheckCircle, Clock, AlertCircle, ChevronDown, Check, Building2, Tag, ArrowRight, Info, BookOpen, CreditCard, RotateCcw } from 'lucide-react'
import { API_BASE_URL } from '../services/api'

// Custom Dropdown Component (Multi-line word wrapping & native tooltip fallback)
function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Pilih...',
  disabled = false,
  getOptionValue = (item, idx) => typeof item === 'object' ? (item.id !== undefined ? String(item.id) : `${item.kode || 'opt'}___${idx}`) : String(item),
  getOptionLabel = (item) => typeof item === 'object' ? (item.kode ? `${item.kode} (${item.uraian || ''})` : (item.uraian || item.nama || '')) : String(item),
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

  const selectedItem = options.find((item, idx) => getOptionValue(item, idx) === value)
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
        className={`w-full flex items-center justify-between bg-slate-50 border text-xs rounded-xl px-4 py-2.5 outline-none transition-all duration-200 text-left ${
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
        <div className="absolute left-0 right-0 mt-1.5 z-[100] max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl py-1 text-xs transition-all duration-150 ease-out animate-in fade-in zoom-in-95">
          {options.length === 0 ? (
            <div className="px-4 py-3 text-slate-400 text-center italic">Tidak ada pilihan</div>
          ) : (
            options.map((item, idx) => {
              const itemVal = getOptionValue(item, idx)
              const itemLabel = getOptionLabel(item)
              const isSelected = itemVal === value
              return (
                <div
                  key={itemVal}
                  title={itemLabel}
                  onClick={() => handleSelect(item, idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 cursor-pointer transition-colors duration-150 border-b last:border-b-0 border-slate-100/60 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-700 font-bold' 
                      : 'hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="whitespace-normal text-left break-words leading-tight pr-2">{itemLabel}</span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function SpmModal({ isOpen, onClose, onSave, editId, allDataSpm }) {
  const [formData, setFormData] = useState({
    rekanan: '',
    tipe: 'LS',
    keterangan: '',
    verifikasi_tanggal: '',
    verifikasi_nomor: '',
    verifikasi_nilai: 0,
    proses: 'Proses',
    kontrak: '',
    kro: '',
    ro: '',
    nomor_akun: '',
    kegiatan: '',
    spm_tanggal: '',
    spm_nomor: '',
    spm_nilai: 0,
    sp2d_tanggal: '',
    sp2d_nomor: '',
    sp2d_nilai: 0
  })

  // Dynamic dropdown states
  const [kroList, setKroList] = useState([])
  const [roList, setRoList] = useState([])
  const [akunList, setAkunList] = useState([])
  const [kegiatanList, setKegiatanList] = useState([])

  // Selected dropdown Primary Key ID states
  const [selectedKroId, setSelectedKroId] = useState('')
  const [selectedRoId, setSelectedRoId] = useState('')
  const [selectedAkunId, setSelectedAkunId] = useState('')
  const [selectedKegiatanId, setSelectedKegiatanId] = useState('')

  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Unique Option Value Generator: Uses Primary Key ID or fallback composite key
  const getOptionValue = (item, index) => {
    if (!item) return `opt-${index}`
    if (typeof item === 'string') return item
    if (item.id !== undefined && item.id !== null && item.id !== '') {
      return String(item.id)
    }
    const codeStr = item.kode || item.kode_kro || item.uraian || 'item'
    return `${codeStr}___${index}`
  }

  // String Code Sanitizer: Strips leading/trailing quotes, apostrophes, and spaces
  const cleanCode = (str) => {
    if (!str) return ''
    return str.toString().replace(/['"‘`\s]/g, '').trim().toLowerCase()
  }

  // ISO Date Formatter helper for HTML <input type="date"> (Strict YYYY-MM-DD)
  const formatDateForInput = (dateVal) => {
    if (!dateVal || dateVal === '0000-00-00' || dateVal === '0000-00-00T00:00:00.000Z') return ''
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateVal)) return dateVal
    const d = new Date(dateVal)
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 1. Initial Load & Edit Prefill effect with Auto-Fetch Options
  const initModal = async () => {
    setError('')
    setIsLoadingDropdown(true)

    try {
      const token = localStorage.getItem('token')

      // Fetch top-level KRO list
      const resKro = await fetch(`${API_BASE_URL}/api/anggaran/kro`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const resultKro = await resKro.json()
      let fetchedKroList = []
      if (resultKro.status === 'success' && resultKro.data) {
        fetchedKroList = resultKro.data.filter(item => !(item.uraian || '').toLowerCase().includes('mas dajks djka'))
        setKroList(fetchedKroList)
      }

      // If Mode ADD: Reset form & selection states
      if (!editId) {
        setFormData({
          rekanan: '',
          tipe: 'LS',
          keterangan: '',
          verifikasi_tanggal: formatDateForInput(new Date()),
          verifikasi_nomor: '',
          verifikasi_nilai: 0,
          proses: 'Proses',
          kontrak: '',
          kro: '',
          ro: '',
          nomor_akun: '',
          kegiatan: '',
          spm_tanggal: '',
          spm_nomor: '',
          spm_nilai: 0,
          sp2d_tanggal: '',
          sp2d_nomor: '',
          sp2d_nilai: 0
        })
        setSelectedKroId('')
        setSelectedRoId('')
        setSelectedAkunId('')
        setSelectedKegiatanId('')
        setRoList([])
        setAkunList([])
        setKegiatanList([])
        setIsLoadingDropdown(false)
        return
      }

      // If Mode EDIT: Prefill form data & auto-fetch hierarchy options
      const item = allDataSpm.find(x => x.id === editId)
      if (item) {
        const verifTgl = item.verifikasi_tanggal || item.verifikasiTanggal || ''
        const spmTgl = item.spm_tanggal || item.spmTanggal || ''
        const sp2dTgl = item.sp2d_tanggal || item.sp2dTanggal || ''

        const cleanVal = (v) => {
          if (v === null || v === undefined || v === '') return ''
          let val = String(v).replace(/Rp/gi, '').trim().split(',')[0]
          if (/^\d+\.\d{1,2}$/.test(val)) val = val.split('.')[0]
          let str = val.replace(/\D/g, '')
          if (str.length > 1 && str.startsWith('0')) str = str.replace(/^0+/, '')
          return str
        }

        setFormData({
          rekanan: item.rekanan || '',
          tipe: item.tipe || 'LS',
          keterangan: item.kegiatan || item.namaKegiatan || item.keterangan || '',
          verifikasi_tanggal: formatDateForInput(verifTgl),
          verifikasi_nomor: item.verifikasi_nomor || item.verifikasiNomor || '',
          verifikasi_nilai: cleanVal(item.verifikasi_nilai || item.verifikasiNilai),
          proses: item.proses || 'Proses',
          kontrak: item.kontrak || '',
          kro: item.kro || item.kro_kode || item.kroKode || '',
          ro: item.ro || item.ro_kode || item.roKode || '',
          nomor_akun: item.nomor_akun || item.nomorAkun || item.akun || '',
          kegiatan: item.kegiatan || item.namaKegiatan || item.kegiatan_uraian || item.keterangan || '',
          spm_tanggal: formatDateForInput(spmTgl),
          spm_nomor: item.spm_nomor || item.spmNomor || '',
          spm_nilai: cleanVal(item.spm_nilai || item.spmNilai),
          sp2d_tanggal: formatDateForInput(sp2dTgl),
          sp2d_nomor: item.sp2d_nomor || item.sp2dNomor || '',
          sp2d_nilai: cleanVal(item.sp2d_nilai || item.sp2dNilai)
        })

        // Disambiguated KRO Matcher
        const findKro = async (list, targetKroCode, targetRoCode) => {
          if (!targetKroCode || !list || list.length === 0) return null
          const cKro = cleanCode(targetKroCode)
          const matches = list.filter(k => cleanCode(k.kode) === cKro)
          if (matches.length === 1) return matches[0]
          if (matches.length > 1 && targetRoCode) {
            const cRo = cleanCode(targetRoCode)
            for (const cand of matches) {
              try {
                const resRoCheck = await fetch(`${API_BASE_URL}/api/anggaran/ro?parentId=${cand.id}`, {
                  headers: { Authorization: `Bearer ${token}` }
                })
                const resultRoCheck = await resRoCheck.json()
                if (resultRoCheck.status === 'success' && resultRoCheck.data) {
                  const hasRoMatch = resultRoCheck.data.some(r => {
                    const cR = cleanCode(r.kode)
                    return cR === cRo || cR.endsWith(cRo) || cRo.endsWith(cR)
                  })
                  if (hasRoMatch) return cand
                }
              } catch (e) {
                // ignore error
              }
            }
            return matches[0]
          }
          let m = list.find(k => cleanCode(k.kode).includes(cKro) || cKro.includes(cleanCode(k.kode)))
          if (m) return m
          return list.find(k => cleanCode(k.uraian).includes(cKro) || cKro.includes(cleanCode(k.uraian))) || null
        }

        const findRo = (list, val) => {
          if (!val || !list || list.length === 0) return null
          const cVal = cleanCode(val)
          let m = list.find(r => cleanCode(r.kode) === cVal)
          if (m) return m
          m = list.find(r => {
            const cKode = cleanCode(r.kode)
            return cKode.endsWith(cVal) || cVal.endsWith(cKode)
          })
          if (m) return m
          m = list.find(r => cleanCode(r.kode).includes(cVal) || cVal.includes(cleanCode(r.kode)))
          if (m) return m
          return list.find(r => cleanCode(r.uraian).includes(cVal) || cVal.includes(cleanCode(r.uraian))) || null
        }

        const findAkun = (list, val) => {
          if (!val || !list || list.length === 0) return null
          const cVal = cleanCode(val)
          let m = list.find(a => cleanCode(a.kode) === cVal)
          if (m) return m
          m = list.find(a => cleanCode(a.kode).includes(cVal) || cVal.includes(cleanCode(a.kode)))
          if (m) return m
          return list.find(a => cleanCode(a.uraian).includes(cVal) || cVal.includes(cleanCode(a.uraian))) || null
        }

        const findKeg = (list, val) => {
          if (!val || !list || list.length === 0) return null
          const cVal = cleanCode(val)
          let m = list.find(k => cleanCode(k.uraian) === cVal)
          if (m) return m
          m = list.find(k => cleanCode(k.uraian).includes(cVal) || cVal.includes(cleanCode(k.uraian)))
          if (m) return m
          return list.find(k => cleanCode(k.kode) === cVal) || null
        }

        // 1. Resolve KRO
        const targetKro = item.kro || item.kro_kode || item.kroKode || ''
        const targetRo = item.ro || item.ro_kode || item.roKode || ''
        const matchedKro = await findKro(fetchedKroList, targetKro, targetRo)

        if (matchedKro) {
          const kroIdx = fetchedKroList.findIndex(k => k === matchedKro)
          const kroVal = getOptionValue(matchedKro, kroIdx >= 0 ? kroIdx : 0)
          setSelectedKroId(kroVal)

          // 2. Fetch & Resolve RO
          const parentKroId = matchedKro.id !== undefined ? matchedKro.id : kroVal
          const resRo = await fetch(`${API_BASE_URL}/api/anggaran/ro?parentId=${parentKroId}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
          const resultRo = await resRo.json()
          if (resultRo.status === 'success' && resultRo.data) {
            const fetchedRoList = resultRo.data
            setRoList(fetchedRoList)

            const matchedRo = findRo(fetchedRoList, targetRo)
            if (matchedRo) {
              const roIdx = fetchedRoList.findIndex(r => r === matchedRo)
              const roVal = getOptionValue(matchedRo, roIdx >= 0 ? roIdx : 0)
              setSelectedRoId(roVal)

              // 3. Fetch & Resolve Akun
              const parentRoId = matchedRo.id !== undefined ? matchedRo.id : roVal
              const resAkun = await fetch(`${API_BASE_URL}/api/anggaran/akun?parentId=${parentRoId}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
              const resultAkun = await resAkun.json()
              if (resultAkun.status === 'success' && resultAkun.data) {
                const fetchedAkunList = resultAkun.data
                setAkunList(fetchedAkunList)

                const targetAkun = item.nomor_akun || item.nomorAkun || item.akun || ''
                const matchedAkun = findAkun(fetchedAkunList, targetAkun)
                if (matchedAkun) {
                  const akunIdx = fetchedAkunList.findIndex(a => a === matchedAkun)
                  const akunVal = getOptionValue(matchedAkun, akunIdx >= 0 ? akunIdx : 0)
                  setSelectedAkunId(akunVal)

                  // 4. Fetch & Resolve Kegiatan
                  const parentAkunId = matchedAkun.id !== undefined ? matchedAkun.id : akunVal
                  const resKeg = await fetch(`${API_BASE_URL}/api/anggaran/kegiatan?parentId=${parentAkunId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                  })
                  const resultKeg = await resKeg.json()
                  if (resultKeg.status === 'success' && resultKeg.data) {
                    const fetchedKegList = resultKeg.data
                    setKegiatanList(fetchedKegList)

                    const targetKeg = item.kegiatan || item.kegiatan_uraian || ''
                    const matchedKeg = findKeg(fetchedKegList, targetKeg)
                    if (matchedKeg) {
                      const kegIdx = fetchedKegList.findIndex(k => k === matchedKeg)
                      const kegVal = getOptionValue(matchedKeg, kegIdx >= 0 ? kegIdx : 0)
                      setSelectedKegiatanId(kegVal)
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error prefilling edit modal', err)
      setError('Gagal memuat rincian klasifikasi anggaran.')
    } finally {
      setIsLoadingDropdown(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return
    initModal()
  }, [editId, isOpen])

  const handleRefresh = () => {
    setFormData(prev => {
      const verifVal = prev.verifikasi_nilai !== undefined && prev.verifikasi_nilai !== null ? prev.verifikasi_nilai : 0
      return {
        ...prev,
        spm_nilai: verifVal,
        sp2d_nilai: verifVal
      }
    })
  }

  // Manual Cascading dropdown handlers
  const handleKroChange = async (selectedVal) => {
    const sId = String(selectedVal)
    setSelectedKroId(sId)
    setSelectedRoId('')
    setSelectedAkunId('')
    setSelectedKegiatanId('')
    setRoList([])
    setAkunList([])
    setKegiatanList([])

    const selectedKro = kroList.find((k, idx) => getOptionValue(k, idx) === sId || String(k.id) === sId)
    setFormData(prev => ({
      ...prev,
      kro: selectedKro ? selectedKro.kode : '',
      ro: '',
      nomor_akun: '',
      kegiatan: ''
    }))

    if (!selectedVal || !selectedKro) return

    try {
      const token = localStorage.getItem('token')
      const parentId = selectedKro.id !== undefined ? selectedKro.id : sId
      const res = await fetch(`${API_BASE_URL}/api/anggaran/ro?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      if (result.status === 'success' && result.data) {
        setRoList(result.data)
      }
    } catch (err) {
      console.error('Error fetching RO list', err)
    }
  }

  const handleRoChange = async (selectedVal) => {
    const sId = String(selectedVal)
    setSelectedRoId(sId)
    setSelectedAkunId('')
    setSelectedKegiatanId('')
    setAkunList([])
    setKegiatanList([])

    const selectedRo = roList.find((r, idx) => getOptionValue(r, idx) === sId || String(r.id) === sId)
    setFormData(prev => ({
      ...prev,
      ro: selectedRo ? selectedRo.kode : '',
      nomor_akun: '',
      kegiatan: ''
    }))

    if (!selectedVal || !selectedRo) return

    try {
      const token = localStorage.getItem('token')
      const parentId = selectedRo.id !== undefined ? selectedRo.id : sId
      const res = await fetch(`${API_BASE_URL}/api/anggaran/akun?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      if (result.status === 'success' && result.data) {
        setAkunList(result.data)
      }
    } catch (err) {
      console.error('Error fetching Akun list', err)
    }
  }

  const handleAkunChange = async (selectedVal) => {
    const sId = String(selectedVal)
    setSelectedAkunId(sId)
    setSelectedKegiatanId('')
    setKegiatanList([])

    const selectedAkun = akunList.find((a, idx) => getOptionValue(a, idx) === sId || String(a.id) === sId)
    setFormData(prev => ({
      ...prev,
      nomor_akun: selectedAkun ? selectedAkun.kode : '',
      kegiatan: ''
    }))

    if (!selectedVal || !selectedAkun) return

    try {
      const token = localStorage.getItem('token')
      const parentId = selectedAkun.id !== undefined ? selectedAkun.id : sId
      const res = await fetch(`${API_BASE_URL}/api/anggaran/kegiatan?parentId=${parentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const result = await res.json()
      if (result.status === 'success' && result.data) {
        setKegiatanList(result.data)
      }
    } catch (err) {
      console.error('Error fetching Kegiatan list', err)
    }
  }

  const handleKegiatanChange = (selectedVal) => {
    const sId = String(selectedVal)
    setSelectedKegiatanId(sId)
    const selectedKeg = kegiatanList.find((k, idx) => getOptionValue(k, idx) === sId || String(k.id) === sId)
    setFormData(prev => ({
      ...prev,
      kegiatan: selectedKeg ? selectedKeg.uraian : ''
    }))
  }

  // Handle Status Change logic (Auto sync SPM & SP2D nominals with Verifikasi)
  const handleStatusChange = (statusVal) => {
    setFormData(prev => {
      const isSelesai = statusVal === 'Selesai'
      const syncedNilai = isSelesai ? (prev.verifikasi_nilai || 0) : 0
      return {
        ...prev,
        proses: statusVal,
        spm_nilai: syncedNilai,
        sp2d_nilai: syncedNilai,
        spm_tanggal: isSelesai ? (prev.spm_tanggal || prev.verifikasi_tanggal) : '',
        sp2d_tanggal: isSelesai ? (prev.sp2d_tanggal || prev.verifikasi_tanggal) : ''
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const isTerkunci = formData.proses !== 'Selesai'

    // Resolve exact codes from selected Primary Key IDs or unique option values
    const selectedKroObj = kroList.find((k, idx) => getOptionValue(k, idx) === selectedKroId || String(k.id) === String(selectedKroId))
    const selectedRoObj = roList.find((r, idx) => getOptionValue(r, idx) === selectedRoId || String(r.id) === String(selectedRoId))
    const selectedAkunObj = akunList.find((a, idx) => getOptionValue(a, idx) === selectedAkunId || String(a.id) === String(selectedAkunId))
    const selectedKegObj = kegiatanList.find((k, idx) => getOptionValue(k, idx) === selectedKegiatanId || String(k.id) === String(selectedKegiatanId))

    const finalKro = selectedKroObj ? selectedKroObj.kode : formData.kro
    const finalRo = selectedRoObj ? selectedRoObj.kode : formData.ro
    const finalAkun = selectedAkunObj ? selectedAkunObj.kode : formData.nomor_akun
    const finalKeg = selectedKegObj ? selectedKegObj.uraian : formData.kegiatan

    const payload = {
      rekanan: formData.rekanan,
      tipe: formData.tipe,
      keterangan: formData.keterangan,
      verifikasi_tanggal: formData.verifikasi_tanggal || null,
      verifikasi_nomor: formData.verifikasi_nomor,
      verifikasi_nilai: parseFloat(formData.verifikasi_nilai) || 0,
      proses: formData.proses,
      kontrak: formData.kontrak,
      kro: finalKro,
      ro: finalRo,
      nomor_akun: finalAkun,
      kegiatan: finalKeg,
      // If Proses, clear SPM & SP2D
      spm_tanggal: isTerkunci ? null : (formData.spm_tanggal || null),
      spm_nomor: isTerkunci ? '' : formData.spm_nomor,
      spm_nilai: isTerkunci ? 0 : (parseFloat(formData.spm_nilai) || 0),
      sp2d_tanggal: isTerkunci ? null : (formData.sp2d_tanggal || null),
      sp2d_nomor: isTerkunci ? '' : formData.sp2d_nomor,
      sp2d_nilai: isTerkunci ? 0 : (parseFloat(formData.sp2d_nilai) || 0)
    }

    // Always sync with localStorage dataTransaksi if editing local entry
    const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
    const itemIndex = localData.findIndex(x => String(x.id) === String(editId))
    if (itemIndex >= 0) {
      localData[itemIndex] = {
        ...localData[itemIndex],
        rekanan: formData.rekanan,
        kegiatan: formData.kegiatan || formData.keterangan,
        keterangan: formData.keterangan || formData.kegiatan,
        tanggalVerifikasi: formData.verifikasi_tanggal,
        nomorVerifikasi: formData.verifikasi_nomor,
        nilaiVerifikasi: formData.verifikasi_nilai,
        status: formData.proses,
        kontrak: formData.kontrak,
        kro: finalKro,
        ro: finalRo,
        akun: finalAkun,
        spmTanggal: isTerkunci ? '' : formData.spm_tanggal,
        spmNomor: isTerkunci ? '' : formData.spm_nomor,
        spmNilai: isTerkunci ? 0 : formData.spm_nilai,
        sp2dTanggal: isTerkunci ? '' : formData.sp2d_tanggal,
        sp2dNomor: isTerkunci ? '' : formData.sp2d_nomor,
        sp2dNilai: isTerkunci ? 0 : formData.sp2d_nilai
      }
      localStorage.setItem('dataTransaksi', JSON.stringify(localData))
    }

    const targetUrl = editId ? `${API_BASE_URL}/api/spm/${editId}` : `${API_BASE_URL}/api/spm`
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
        onSave()
        onClose()
      } else {
        if (itemIndex >= 0) {
          onSave()
          onClose()
        } else {
          setError(result.message || 'Gagal menyimpan data SPM.')
        }
      }
    } catch (err) {
      console.error(err)
      if (itemIndex >= 0) {
        onSave()
        onClose()
      } else {
        setError('Terjadi kesalahan jaringan saat menyimpan.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  if (!isOpen) return null

  const isTerkunci = formData.proses !== 'Selesai'

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

  return (
    <div className="fixed inset-0 z-[60] flex justify-center items-start pt-16 pb-10 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-y-auto text-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            {editId ? 'Edit Rincian SPM' : 'Input Rincian SPM Baru'}
          </h3>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Informasi Umum */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-700 tracking-wider uppercase flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>1. Informasi Umum</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Rekanan</label>
                <input 
                  type="text" 
                  value={formData.rekanan}
                  onChange={(e) => setFormData({ ...formData, rekanan: e.target.value })}
                  placeholder="Masukkan nama rekanan"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all"
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Tipe Pembayaran</label>
                <CustomSelect 
                  value={formData.tipe}
                  onChange={(val) => setFormData({ ...formData, tipe: val })}
                  options={['LS', 'GU', 'KKP']}
                  placeholder="Pilih Tipe..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Keterangan</label>
                <input 
                  type="text" 
                  value={formData.kegiatan || formData.namaKegiatan || formData.keterangan || ''}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value, kegiatan: e.target.value })}
                  placeholder="Contoh: Pengadaan ATK Kantor"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Section 2: Proses Verifikasi */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-700 tracking-wider uppercase flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>2. Proses Verifikasi</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Tanggal Verif</label>
                <input 
                  type="date" 
                  value={formData.verifikasi_tanggal}
                  onChange={(e) => setFormData({ ...formData, verifikasi_tanggal: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Nomor Verif</label>
                <input 
                  type="text" 
                  value={formData.verifikasi_nomor}
                  onChange={(e) => setFormData({ ...formData, verifikasi_nomor: e.target.value })}
                  placeholder="No. Surat Verif"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Nilai Verifikasi (Rp)</label>
                <input 
                  type="text" 
                  value={formatRupiah(formData.verifikasi_nilai)}
                  onChange={(e) => handleNominalChange(e, 'verifikasi_nilai')}
                  placeholder="0"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Status Proses</label>
                <CustomSelect 
                  value={formData.proses}
                  onChange={handleStatusChange}
                  options={['Proses', 'Selesai']}
                  placeholder="Pilih Status..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-600 uppercase">Kontrak/SPO</label>
                <input 
                  type="text" 
                  value={formData.kontrak}
                  onChange={(e) => setFormData({ ...formData, kontrak: e.target.value })}
                  placeholder="No. Kontrak"
                  className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-4 py-2.5 outline-none focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Section 3: Klasifikasi Akun & Kegiatan */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-blue-700 tracking-wider uppercase flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>3. Klasifikasi Akun & Kegiatan</span>
            </h4>
            {isLoadingDropdown ? (
              <div className="flex items-center gap-3 py-4 text-slate-500 text-xs">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Memproses klasifikasi anggaran...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* KRO Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">KRO</label>
                  <CustomSelect 
                    value={selectedKroId}
                    onChange={handleKroChange}
                    options={kroList}
                    placeholder="Pilih KRO..."
                    getOptionValue={getOptionValue}
                    getOptionLabel={(item) => (item.kode ? `${item.kode} (${item.uraian || ''})` : (item.uraian || ''))}
                  />
                </div>

                {/* RO Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">RO</label>
                  <CustomSelect 
                    value={selectedRoId}
                    onChange={handleRoChange}
                    options={roList}
                    placeholder={(selectedKroId || roList.length > 0) ? 'Pilih RO...' : 'Pilih KRO dahulu'}
                    disabled={!selectedKroId && roList.length === 0}
                    getOptionValue={getOptionValue}
                    getOptionLabel={(item) => (item.kode ? `${item.kode} (${item.uraian || ''})` : (item.uraian || ''))}
                  />
                </div>

                {/* Nomor Akun Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Nomor Akun</label>
                  <CustomSelect 
                    value={selectedAkunId}
                    onChange={handleAkunChange}
                    options={akunList}
                    placeholder={(selectedRoId || akunList.length > 0) ? 'Pilih Akun...' : 'Pilih RO dahulu'}
                    disabled={!selectedRoId && akunList.length === 0}
                    getOptionValue={getOptionValue}
                    getOptionLabel={(item) => (item.kode ? `${item.kode} (${item.uraian || ''})` : (item.uraian || ''))}
                  />
                </div>

                {/* Kegiatan / Detil Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase">Kegiatan / Detil</label>
                  <CustomSelect 
                    value={selectedKegiatanId}
                    onChange={handleKegiatanChange}
                    options={kegiatanList}
                    placeholder={(selectedAkunId || kegiatanList.length > 0) ? 'Pilih Detail Kegiatan...' : 'Pilih Akun dahulu'}
                    disabled={!selectedAkunId && kegiatanList.length === 0}
                    getOptionValue={getOptionValue}
                    getOptionLabel={(item) => (item.uraian || item.kode || '')}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200"></div>

          {/* Section 4: Data SPM & SP2D */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Sub-section: Data SPM */}
            <div className={`space-y-4 transition-opacity duration-300 ${isTerkunci ? 'opacity-40' : 'opacity-100'}`}>
              <h4 className="text-xs font-bold text-blue-700 tracking-wider uppercase flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>4A. Data SPM (Terkunci saat "Proses")</span>
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tanggal</label>
                  <input 
                    type="date" 
                    value={isTerkunci ? '' : formData.spm_tanggal}
                    onChange={(e) => setFormData({ ...formData, spm_tanggal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2 py-2.5 outline-none focus:border-blue-500 transition-all disabled:cursor-not-allowed"
                    disabled={isTerkunci}
                    required={!isTerkunci}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nomor SPM</label>
                  <input 
                    type="text" 
                    value={isTerkunci ? '' : formData.spm_nomor}
                    onChange={(e) => setFormData({ ...formData, spm_nomor: e.target.value })}
                    placeholder="No. SPM"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-all disabled:cursor-not-allowed"
                    disabled={isTerkunci}
                    required={!isTerkunci}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nilai SPM (Rp)</label>
                  <input 
                    type="text" 
                    value={formatRupiah(isTerkunci ? 0 : formData.spm_nilai)}
                    onChange={(e) => handleNominalChange(e, 'spm_nilai')}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-all disabled:cursor-not-allowed font-mono font-semibold"
                    disabled={isTerkunci}
                  />
                </div>
              </div>
            </div>

            {/* Sub-section: Data SP2D */}
            <div className={`space-y-4 transition-opacity duration-300 ${isTerkunci ? 'opacity-40' : 'opacity-100'}`}>
              <h4 className="text-xs font-bold text-blue-700 tracking-wider uppercase flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>4B. Data SP2D (Terkunci saat "Proses")</span>
              </h4>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Tanggal</label>
                  <input 
                    type="date" 
                    value={isTerkunci ? '' : formData.sp2d_tanggal}
                    onChange={(e) => setFormData({ ...formData, sp2d_tanggal: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs rounded-xl px-2 py-2.5 outline-none focus:border-blue-500 transition-all disabled:cursor-not-allowed"
                    disabled={isTerkunci}
                    required={!isTerkunci}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nomor SP2D</label>
                  <input 
                    type="text" 
                    value={isTerkunci ? '' : formData.sp2d_nomor}
                    onChange={(e) => setFormData({ ...formData, sp2d_nomor: e.target.value })}
                    placeholder="No. SP2D"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-all disabled:cursor-not-allowed"
                    disabled={isTerkunci}
                    required={!isTerkunci}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Nilai SP2D (Rp)</label>
                  <input 
                    type="text" 
                    value={formatRupiah(isTerkunci ? 0 : formData.sp2d_nilai)}
                    onChange={(e) => handleNominalChange(e, 'sp2d_nilai')}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 placeholder-slate-400 text-xs rounded-xl px-3 py-2.5 outline-none focus:border-blue-500 transition-all disabled:cursor-not-allowed font-mono font-semibold"
                    disabled={isTerkunci}
                  />
                </div>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl py-2.5 px-4 transition-all duration-200 mr-auto disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
            title="Samakan Nilai SPM & SP2D dengan Nilai Verifikasi"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
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
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl py-2.5 px-6 shadow-md transition-all duration-200"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Simpan Data SPM'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default SpmModal
