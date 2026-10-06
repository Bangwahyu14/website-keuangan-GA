import { useState, useEffect, useRef } from 'react'
import {
  ClipboardCheck,
  Search,
  Plus,
  Save,
  Printer,
  Trash2,
  Edit2,
  CheckCircle2,
  XCircle,
  FileText,
  Building2,
  Calendar,
  UserCheck,
  Coins,
  RefreshCw,
  AlertCircle,
  ArrowLeft,
  Eye,
  FileCheck,
  Download,
  ChevronDown
} from 'lucide-react'
import Swal from 'sweetalert2'
import axiosInstance from '../services/axiosInstance'
import { useTahun } from '../context/TahunContext'

// --- CONSTANTS & DEFAULT DATA ---

const daftarDokumenBaru = [
  "Surat Permintaan dari Unit Kerja",
  "Rencana Anggaran Biaya (RAB)",
  "Harga Perkiraan Sendiri (HPS)",
  "Disposisi/ Izin Prinsip Pimpinan/ Rutin/ Insidentil",
  "Usulan/ Memo dari PPBJ kepada PPK",
  "Disposisi PPK ke PPBJ",
  "Fakta Integritas Rekanan",
  "Fakta Integritas Internal",
  "Surat Pesanan:",
  "Berita Acara Klarifikasi Teknis dan Negosiasi Harga",
  "Berita Acara Hasil Pengadaan Langsung",
  "SPMK (Surat Perintah Mulai Kerja) No:",
  "Laporan Hasil Pekerjaan/ Foto",
  "Berita Acara Pemeriksaan Hasil Pekerjaan",
  "Berita Acara Serah Terima (BAST)",
  "Berita Acara Pembayaran (BAP)",
  "Permohonan Pembayaran dari Rekanan",
  "Faktur Pajak",
  "Surat Keterangan Bebas Pajak (SKB)",
  "Fotocopy NPWP",
  "Surat Pernyataan Non PKP",
  "Fotokopy Rekening",
  "Rincian Kwitansi",
  "Kwitansi",
  "Bukti-bukti Pengeluaran",
  "Pajak Penghasilan:"
];

const DEFAULT_DOCUMENTS = daftarDokumenBaru.map((dokumen, idx) => ({
  no: idx + 1,
  dokumen,
  ada: '',
  ket: ''
}))

const DEFAULT_PAJAK = {
  pph21: { checked: false, nominal: 0, persen: '' },
  pph22: { checked: false, nominal: 0, persen: '' },
  pph23: { checked: false, nominal: 0, persen: '' },
  pph28: { checked: false, nominal: 0, persen: '' },
  ppn:   { checked: false, nominal: 0, persen: '' }
}

const daftarDokumenKontrak = [
  "Surat Permintaan dari Unit Kerja",
  "Rencana Anggaran Biaya (RAB)",
  "Harga Perkiraan Sendiri (HPS)",
  "Disposisi/Izin prinsip pimpinan/Rutin/Insidentil",
  "Usulan/Memo dari PPBJ kepada PPK",
  "Disposisi PPK ke PPBJ",
  "Pakta Integritas rekanan",
  "Pakta Integritas internal",
  "Surat Pesanan : SP-05/I-Yog/PPK/07/2026",
  "Berita Acara Klarifikasi Teknis dan Negosiasi Harga",
  "Berita Acara Hasil Pengadaan Langsung",
  "SPMK(Surat Perintah Mulai Kerja)No:",
  "Ringkasan Kontrak",
  "Laporan Hasil Pekerjaan/Foto",
  "Berita Acara Pemeriksaan Hasil Pekerjaan",
  "Berita Acara Serah Terima (BAST)",
  "Berita Acara Pembayaran (BAP)",
  "Permohonan Pembayaran dari rekanan",
  "Faktur Pajak",
  "Surat Keterangan Bebas Pajak (SKB)",
  "Fotokopi NPWP",
  "Surat Pernyataan Non PKP",
  "Fotokopi Rekening",
  "Rincian Kwitansi",
  "Kwitansi",
  "Bukti-bukti pengeluaran"
];

const DEFAULT_DOCUMENTS_KONTRAK = daftarDokumenKontrak.map((dokumen, idx) => ({
  no: idx + 1,
  dokumen,
  ada: '',
  ket: ''
}))

const INITIAL_HEADER_KONTRAK = {
  id: null,
  spm_id: null,
  kw_no: '',
  akun: '',
  no_verifikasi: 'K-',
  nama_unit_kerja: '',
  nama_rekanan: '',
  nama_kegiatan: '',
  nilai_kwitansi: ''
}

const daftarDokumenPerjalanan = [
  "Surat Tugas/Surat Perintah No.01/SP/I-Yog/07/2026",
  "Undangan/Memo",
  "Laporan Hasil Perjalanan/Foto",
  "SPD, SPD Rampung, Daftar Penerima Transport (Lampiran)",
  "Bukti-bukti pengeluaran",
  "Kwitansi"
];

const DEFAULT_DOCUMENTS_PERJALANAN = daftarDokumenPerjalanan.map((dokumen, idx) => ({
  no: idx + 1,
  dokumen,
  ada: '',
  ket: ''
}))

const INITIAL_HEADER_PERJALANAN = {
  id: null,
  spm_id: null,
  kw_no: '',
  akun: '',
  no_verifikasi: 'PD-',
  nama_unit_kerja: 'Perjalanan Dinas',
  nama_pelaksana: '',
  keterangan: '',
  lama_perjalanan: '',
  nilai_kwitansi: ''
}

// --- GLOBAL UTILITY FUNCTIONS ---

const cleanNilaiString = (inputVal) => {
  if (inputVal === null || inputVal === undefined || inputVal === '') return ''
  let val = String(inputVal).replace(/Rp/gi, '').trim()
  val = val.split(',')[0]
  if (/^\d+\.\d{1,2}$/.test(val)) {
    val = val.split('.')[0]
  }
  let str = val.replace(/\D/g, '')
  if (str.length > 1 && str.startsWith('0')) {
    str = str.replace(/^0+/, '')
    if (str === '') str = '0'
  }
  return str
}

const formatUang = (val) => {
  const numStr = cleanNilaiString(val)
  if (!numStr) return ''
  const num = parseInt(numStr, 10)
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(num)
}

const formatRupiah = (value) => {
  const numberString = cleanNilaiString(value)
  if (!numberString) return ''
  return new Intl.NumberFormat('id-ID').format(numberString)
}

const handleNominalInput = (e, updateValueCallback) => {
  const input = e.target
  const cursorPosition = input.selectionStart
  const originalLength = input.value.length

  const numberString = cleanNilaiString(input.value)
  updateValueCallback(numberString)

  setTimeout(() => {
    const formattedValue = formatRupiah(numberString)
    const newLength = formattedValue.length
    const lengthDiff = newLength - originalLength
    let newCursorPos = cursorPosition + lengthDiff
    if (newCursorPos < 0) newCursorPos = 0
    input.setSelectionRange(newCursorPos, newCursorPos)
  }, 0)
}

const isDocumentComplete = (dokList) => {
  if (!Array.isArray(dokList) || dokList.length === 0) return false
  return dokList.every(d => d.ada === 'Ada')
}

const cleanPajakData = (pajakObj) => {
  if (!pajakObj || typeof pajakObj !== 'object') return DEFAULT_PAJAK
  const cleaned = {}
  Object.keys(DEFAULT_PAJAK).forEach(k => {
    const p = pajakObj[k] || {}
    cleaned[k] = {
      checked: Boolean(p.checked),
      nominal: cleanNilaiString(p.nominal),
      persen: p.persen || ''
    }
  })
  return cleaned
}

// =========================================================================
// SUB-COMPONENT 1: FORM TANPA SPK (ISOLATED COMPONENT - PRECISE A4 PRINT)
// =========================================================================
function FormTanpaSPK({ editingItem, onBack, onSaveSuccess, userRole, savedForms }) {
  const isReadOnly = userRole === 'user'
  const isSaving = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const getNextNumber = () => {
    const typeForms = (savedForms || []).filter(f => (f.jenisDokumen || f.jenis_dokumen) === 'TANPA_SPK')
    const numbers = typeForms.map(f => {
      const match = (f.nomorVerifikasi || f.no_verifikasi || '').match(/^B-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
    return `B-${String(maxNum + 1).padStart(3, '0')}`
  }

  const [headerData, setHeaderData] = useState({
    id: null,
    spm_id: null,
    kw_no: '',
    akun: '',
    no_verifikasi: '',
    nama_unit_kerja: 'Non-Kontrak',
    nama_rekanan: '',
    nama_kegiatan: '',
    nilai_kwitansi: ''
  })
  const [dokumenList, setDokumenList] = useState(DEFAULT_DOCUMENTS)
  const [pajakData, setPajakData] = useState(DEFAULT_PAJAK)
  const [tanggalVerifikasi, setTanggalVerifikasi] = useState(new Date().toISOString().split('T')[0])
  const [jabatanPimpinan, setJabatanPimpinan] = useState('Kepala Subbagian Tata Usaha')
  const [namaVerifikator, setNamaVerifikator] = useState('Rina Kurniawati')
  const [namaKasubbag, setNamaKasubbag] = useState('Sapto Adi Sayogo')

  useEffect(() => {
    if (editingItem) {
      setHeaderData({
        id: editingItem.id,
        spm_id: editingItem.spm_id || null,
        kw_no: editingItem.kw_no || '',
        akun: editingItem.akun || '',
        no_verifikasi: editingItem.no_verifikasi || '',
        nama_unit_kerja: editingItem.nama_unit_kerja || 'Non-Kontrak',
        nama_rekanan: editingItem.nama_rekanan || '',
        nama_kegiatan: editingItem.nama_kegiatan || '',
        nilai_kwitansi: cleanNilaiString(editingItem.nilai_kwitansi || editingItem.nilaiVerifikasi || editingItem.nilai)
      })
      if (Array.isArray(editingItem.kelengkapan_dokumen) && editingItem.kelengkapan_dokumen.length > 0) {
        setDokumenList(daftarDokumenBaru.map((dokName, idx) => {
          const saved = editingItem.kelengkapan_dokumen[idx] || {}
          return {
            no: idx + 1,
            dokumen: dokName,
            ada: saved.ada || '',
            ket: saved.ket || ''
          }
        }))
      } else {
        setDokumenList(DEFAULT_DOCUMENTS)
      }
      setPajakData(cleanPajakData(editingItem.rincian_pajak))
      if (editingItem.tanggal_verifikasi || editingItem.tanggalVerifikasi) {
        setTanggalVerifikasi(new Date(editingItem.tanggal_verifikasi || editingItem.tanggalVerifikasi).toISOString().split('T')[0])
      }
      setJabatanPimpinan(editingItem.jabatan_pimpinan || 'Kepala Subbagian Tata Usaha')
      setNamaVerifikator('Rina Kurniawati')
      setNamaKasubbag('Sapto Adi Sayogo')
    } else {
      handleResetForm()
    }
  }, [editingItem, savedForms])

  const handleResetForm = () => {
    setHeaderData({
      id: null,
      spm_id: null,
      kw_no: '',
      akun: '',
      no_verifikasi: getNextNumber(),
      nama_unit_kerja: 'Non-Kontrak',
      nama_rekanan: '',
      nama_kegiatan: '',
      nilai_kwitansi: ''
    })
    setDokumenList(DEFAULT_DOCUMENTS)
    setPajakData(DEFAULT_PAJAK)
    setTanggalVerifikasi(new Date().toISOString().split('T')[0])
    setJabatanPimpinan('Kepala Subbagian Tata Usaha')
    setNamaVerifikator('Rina Kurniawati')
    setNamaKasubbag('Sapto Adi Sayogo')
  }

  const handleDokumenChange = (index, field, value) => {
    setDokumenList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSetAllDokumen = (status) => {
    setDokumenList(prev => prev.map(item => ({ ...item, ada: status })))
  }

  const handlePajakChange = (taxKey, field, value) => {
    setPajakData(prev => ({
      ...prev,
      [taxKey]: {
        ...(prev[taxKey] || { checked: false, nominal: '', persen: '' }),
        [field]: field === 'nominal' ? cleanNilaiString(value) : value
      }
    }))
  }

  const calculateTotalPajak = () => {
    let total = 0
    Object.keys(pajakData).forEach(key => {
      const item = pajakData[key]
      if (item && item.checked) {
        const rawNum = String(item.nominal || '').replace(/[^0-9]/g, '')
        total += (parseFloat(rawNum) || 0)
      }
    })
    return total
  }

  const handleSimpanData = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault()
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
    }
    if (isSaving.current || isSubmitting) return
    isSaving.current = true
    setIsSubmitting(true)

    if (!headerData.no_verifikasi.trim() || !headerData.nama_rekanan.trim()) {
      Swal.fire({
        title: 'Form Belum Lengkap',
        text: 'Nomor Verifikasi dan Nama Rekanan wajib diisi!',
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      })
      isSaving.current = false
      setIsSubmitting(false)
      return
    }

    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Simpan',
      text: 'Apakah data yang telah diisi sudah sesuai? Jika ragu, silakan periksa kembali.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Simpan',
      cancelButtonText: 'Batal'
    })

    if (!confirmResult.isConfirmed) {
      isSaving.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const existingData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      const isEditMode = Boolean(headerData.id)

      let updatedData
      if (isEditMode) {
        updatedData = existingData.map((item) => {
          if (String(item.id) === String(headerData.id)) {
            return {
              ...item,
              id: item.id,
              jenisDokumen: 'TANPA_SPK',
              jenis_dokumen: 'TANPA_SPK',
              rekanan: headerData.nama_rekanan || item.rekanan || '',
              tanggalVerifikasi: tanggalVerifikasi || item.tanggalVerifikasi || new Date().toISOString().split('T')[0],
              nomorVerifikasi: headerData.no_verifikasi || item.nomorVerifikasi || '',
              nilaiVerifikasi: cleanNilaiString(headerData.nilai_kwitansi),
              akun: headerData.akun || item.akun || '',
              kegiatan: headerData.nama_kegiatan || item.kegiatan || ''
            }
          }
          return item
        })
      } else {
        const newId = Date.now()
        const newData = {
          id: newId,
          jenisDokumen: 'TANPA_SPK',
          jenis_dokumen: 'TANPA_SPK',
          rekanan: headerData.nama_rekanan || '',
          tanggalVerifikasi: tanggalVerifikasi || new Date().toISOString().split('T')[0],
          nomorVerifikasi: headerData.no_verifikasi || '',
          nilaiVerifikasi: cleanNilaiString(headerData.nilai_kwitansi),
          status: 'Menunggu',
          kontrak: '-',
          kro: '',
          ro: '',
          akun: headerData.akun || '',
          kegiatan: headerData.nama_kegiatan || '',
          spmTanggal: '',
          spmNomor: '',
          spmNilai: ''
        }
        updatedData = [...existingData, newData]
      }
      localStorage.setItem('dataTransaksi', JSON.stringify(updatedData))

      const payload = {
        ...headerData,
        nilai_kwitansi: cleanNilaiString(headerData.nilai_kwitansi),
        jenis_dokumen: 'TANPA_SPK',
        jenisDokumen: 'TANPA_SPK',
        kelengkapan_dokumen: dokumenList,
        rincian_pajak: pajakData,
        tanggal_verifikasi: tanggalVerifikasi,
        jabatan_pimpinan: jabatanPimpinan,
        nama_verifikator: namaVerifikator,
        nama_kasubbag: namaKasubbag
      }

      const isEdit = Boolean(headerData.id)
      const res = isEdit
        ? await axiosInstance.put(`/api/form-verifikasi/${headerData.id}`, payload)
        : await axiosInstance.post('/api/form-verifikasi', payload)
      const result = res.data

      if (result.status === 'success') {
        // [START REVISI ANTIGRAVITY]: Hapus cache lokal agar tidak duplikat dengan data dari DB
        try {
          const currentLocalData = JSON.parse(localStorage.getItem('dataTransaksi')) || [];
          const filteredLocalData = currentLocalData.filter(d => 
             !(d.nomorVerifikasi === payload.no_verifikasi && d.rekanan === payload.nama_rekanan) &&
             String(d.id) !== String(headerData.id)
          );
          localStorage.setItem('dataTransaksi', JSON.stringify(filteredLocalData));
        } catch (e) {
          console.error('Gagal membersihkan local storage', e);
        }
        // [END REVISI ANTIGRAVITY]

        await Swal.fire({
          title: 'Berhasil!',
          text: isEdit ? 'Formulir verifikasi Tanpa SPK berhasil diperbarui.' : 'Formulir verifikasi Tanpa SPK berhasil disimpan.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 1500
        })
        onSaveSuccess()
      } else {
        Swal.fire({
          title: 'Gagal',
          text: result.message || 'Gagal menyimpan formulir verifikasi.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan formulir verifikasi.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => {
        isSaving.current = false
      }, 1000)
    }
  }

  const handleExportPdf = () => {
    setShowExportMenu(false)
    window.print()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:min-h-0 print:h-auto print:block print:w-full print:max-w-none">
      {/* SECTION 1: HEADER BANNER & IDENTITAS DOKUMEN */}
      <div className="p-8 border-b border-slate-200 bg-white relative overflow-hidden print:p-0 print:border-none print:mb-2">
        {/* KOTAK KRO & AKUN (POJOK KANAN ATAS) */}
        <div className="flex justify-between items-start mb-4 print:mb-2 text-xs print:text-[10px]">
          <div className="space-y-1 print:space-y-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 print:hidden">
              FORMULIR LEMBAR VERIFIKASI
            </span>
          </div>

          <table className="border-collapse border-2 border-slate-900 print:border-black font-bold w-48 print:w-44 text-xs print:text-[10px]">
            <tbody>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-0.5 w-16 text-slate-900 print:text-black">KRO</td>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-center">
                  <input
                    type="text"
                    value={headerData.kw_no}
                    onChange={e => setHeaderData({ ...headerData, kw_no: e.target.value })}
                    placeholder="No. KRO..."
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs font-bold text-center outline-none focus:border-blue-600 print:border-none print:text-black print:p-0 print:text-[10px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-slate-900 print:text-black">AKUN</td>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-center">
                  <input
                    type="text"
                    value={headerData.akun}
                    onChange={e => setHeaderData({ ...headerData, akun: e.target.value })}
                    placeholder="Kode Akun..."
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs font-bold text-center outline-none focus:border-blue-600 print:border-none print:text-black print:p-0 print:text-[10px]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* JUDUL TENGAH & GARIS BAWAH RESMI */}
        <div className="text-center font-bold mb-4 print:mb-2 border-b-2 border-slate-900 print:border-black pb-2">
          <h1 className="text-lg md:text-xl print:text-[13px] font-black uppercase tracking-wide text-slate-900 print:text-black text-center">
            HASIL PENELITIAN DAN VERIFIKASI TANPA SPK
          </h1>
          
        </div>

        {/* GRID INFORMASI UTAMA (TITIK DUA SEJAJAR) */}
        <div className="grid grid-cols-[200px_10px_1fr] print:grid-cols-[160px_10px_1fr] gap-y-1 print:gap-y-0 text-sm print:text-[10px] font-bold mb-6 print:mb-2 text-slate-800 print:text-black">
          <div>No. Verifikasi</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerData.no_verifikasi}
              onChange={e => setHeaderData({ ...headerData, no_verifikasi: e.target.value })}
              placeholder="Contoh: 001/VERIF/2026"
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Jenis Tagihan</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerData.nama_unit_kerja || 'Non-Kontrak'}
              onChange={e => setHeaderData({ ...headerData, nama_unit_kerja: e.target.value })}
              placeholder="Unit kerja pengusul..."
              disabled={true}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nama Rekanan / User</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerData.nama_rekanan}
              onChange={e => setHeaderData({ ...headerData, nama_rekanan: e.target.value })}
              placeholder="Nama penyedia / vendor..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nama Kegiatan / Acara</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerData.nama_kegiatan}
              onChange={e => setHeaderData({ ...headerData, nama_kegiatan: e.target.value })}
              placeholder="Deskripsi kegiatan..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nilai Kwitansi</div><div>:</div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 print:text-black">Rp</span>
              <input
                type="text"
                value={formatRupiah(headerData.nilai_kwitansi)}
                onChange={e => handleNominalInput(e, val => setHeaderData(prev => ({ ...prev, nilai_kwitansi: val })))}
                placeholder="0"
                disabled={isReadOnly}
                className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHECKLIST DOKUMEN & IN-TABLE PAJAK */}
      <div className="p-8 border-b border-slate-200 print:p-0 print:border-none print:mb-2">
        <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              KELENGKAPAN DOKUMEN PENELITIAN ({dokumenList.length} ITEM CHECKLIST)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Pilih opsi kelengkapan berkas dan isi nominal pajak langsung pada baris nomor 26.
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSetAllDokumen('Ada')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-200 transition-all"
              >
                Set Semua ADA
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDokumen('Tidak')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl border border-rose-200 transition-all"
              >
                Set Semua TIDAK
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl print:border-2 print:border-black print:rounded-none print:break-inside-avoid">
          <table className="w-full border-collapse border-2 border-black text-sm print:text-xs print:leading-tight print:break-inside-auto">
            <thead>
              <tr className="border-b-2 border-slate-900 print:border-black bg-slate-100 print:bg-transparent font-bold text-left uppercase text-slate-800 print:text-black">
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center w-8 print:w-8">NO</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center">DOKUMEN</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center w-28 print:w-20">ADA</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center w-48 print:w-32">KET.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-semibold text-slate-800 print:divide-black print:text-[10px] print:leading-normal">
              {dokumenList.map((item, idx) => {
                const isTaxRow = idx === 25; // Baris ke-26 khusus Pajak Penghasilan

                if (isTaxRow) {
                  return (
                    <tr key="row-26-group" className="contents">
                      {/* BARIS 26: HEADER PAJAK PENGHASILAN */}
                      <tr className="bg-slate-50/80 hover:bg-slate-50 transition-colors print:border-b print:border-black">
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold text-slate-900 print:text-black">
                          26
                        </td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold text-slate-900 print:text-black" colSpan={3}>
                          Pajak Penghasilan:
                        </td>
                      </tr>

                      {/* SUB-BARIS 26a: PPh 21 */}
                      <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakData.pph21.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakChange('pph21', 'checked', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 21</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakData.pph21.persen || ''}
                                onChange={e => handlePajakChange('pph21', 'persen', e.target.value)}
                                placeholder="5-15"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-blue-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                        </td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                            <input
                              type="text"
                              value={formatRupiah(pajakData.pph21.nominal)}
                              onChange={e => handleNominalInput(e, val => handlePajakChange('pph21', 'nominal', val))}
                              placeholder="0"
                              disabled={isReadOnly || !pajakData.pph21.checked}
                              className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-blue-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                            />
                          </div>
                        </td>
                      </tr>

                      {/* SUB-BARIS 26b: PPh 22 */}
                      <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakData.pph22.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakChange('pph22', 'checked', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 22</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakData.pph22.persen || ''}
                                onChange={e => handlePajakChange('pph22', 'persen', e.target.value)}
                                placeholder="1,50"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-blue-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                        </td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                            <input
                              type="text"
                              value={formatRupiah(pajakData.pph22.nominal)}
                              onChange={e => handleNominalInput(e, val => handlePajakChange('pph22', 'nominal', val))}
                              placeholder="0"
                              disabled={isReadOnly || !pajakData.pph22.checked}
                              className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-blue-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                            />
                          </div>
                        </td>
                      </tr>

                      {/* SUB-BARIS 26c: PPh 23 */}
                      <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakData.pph23.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakChange('pph23', 'checked', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 23</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakData.pph23.persen || ''}
                                onChange={e => handlePajakChange('pph23', 'persen', e.target.value)}
                                placeholder="2"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-blue-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                        </td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                            <input
                              type="text"
                              value={formatRupiah(pajakData.pph23.nominal)}
                              onChange={e => handleNominalInput(e, val => handlePajakChange('pph23', 'nominal', val))}
                              placeholder="0"
                              disabled={isReadOnly || !pajakData.pph23.checked}
                              className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-blue-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                            />
                          </div>
                        </td>
                      </tr>

                      {/* SUB-BARIS 26d: PPh Pasal 4 (2) */}
                      <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakData.pph28.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakChange('pph28', 'checked', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 4 (2)</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakData.pph28.persen || ''}
                                onChange={e => handlePajakChange('pph28', 'persen', e.target.value)}
                                placeholder="1,75"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-blue-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                        </td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                            <input
                              type="text"
                              value={formatRupiah(pajakData.pph28.nominal)}
                              onChange={e => handleNominalInput(e, val => handlePajakChange('pph28', 'nominal', val))}
                              placeholder="0"
                              disabled={isReadOnly || !pajakData.pph28.checked}
                              className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-blue-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                            />
                          </div>
                        </td>
                      </tr>

                      {/* SUB-BARIS 26e: PPN (11%) */}
                      <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                          <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakData.ppn.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakChange('ppn', 'checked', e.target.checked)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPN</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakData.ppn.persen || ''}
                                onChange={e => handlePajakChange('ppn', 'persen', e.target.value)}
                                placeholder="11"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-blue-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                        </td>
                        <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                          <div className="flex items-center gap-2 text-xs font-mono font-bold">
                            <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                            <input
                              type="text"
                              value={formatRupiah(pajakData.ppn.nominal)}
                              onChange={e => handleNominalInput(e, val => handlePajakChange('ppn', 'nominal', val))}
                              placeholder="0"
                              disabled={isReadOnly || !pajakData.ppn.checked}
                              className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-blue-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                            />
                          </div>
                        </td>
                      </tr>
                    </tr>
                  )
                }

                return (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                    <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold text-slate-500 print:text-black print:text-[10px]">
                      {item.no || idx + 1}
                    </td>
                    <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold text-slate-800 print:text-black print:text-[10px]">
                      <div>{daftarDokumenBaru[idx] || item.dokumen}</div>
                    </td>
                    <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center">
                      <div className="hidden print:block text-center font-bold text-base print:text-[10px] print:text-black">
                        {item.ada === 'Ada' ? '✓' : ''}
                      </div>
                      <div className="flex items-center justify-center gap-4 print:hidden">
                        <label className={`flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded-lg transition-colors ${
                          item.ada === 'Ada' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-emerald-700'
                        }`}>
                          <input
                            type="radio"
                            name={`dok_ada_${idx}`}
                            value="Ada"
                            checked={item.ada === 'Ada'}
                            disabled={isReadOnly}
                            onChange={() => handleDokumenChange(idx, 'ada', 'Ada')}
                            className="accent-emerald-600"
                          />
                          <span>ADA</span>
                        </label>
                        <label className={`flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded-lg transition-colors ${
                          item.ada === 'Tidak' ? 'bg-rose-100 text-rose-800' : 'text-slate-500 hover:text-rose-700'
                        }`}>
                          <input
                            type="radio"
                            name={`dok_ada_${idx}`}
                            value="Tidak"
                            checked={item.ada === 'Tidak'}
                            disabled={isReadOnly}
                            onChange={() => handleDokumenChange(idx, 'ada', 'Tidak')}
                            className="accent-rose-600"
                          />
                          <span>TIDAK</span>
                        </label>
                      </div>
                    </td>
                    <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5">
                      <input
                        type="text"
                        value={item.ket || ''}
                        onChange={e => handleDokumenChange(idx, 'ket', e.target.value)}
                        placeholder="Catatan..."
                        disabled={isReadOnly}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1 outline-none focus:border-blue-500 focus:bg-white transition-all disabled:bg-slate-100 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: TANDA TANGAN & TANGGAL */}
      <div className="p-8 border-b border-slate-200 bg-white print:p-0 print:border-none print:mt-2 print:break-inside-avoid print:page-break-inside-avoid">
        <div className="flex justify-between items-start w-full mt-4 px-4 print:px-1 print:mt-2 text-sm print:text-[10px] text-center font-bold text-slate-900 print:text-black print:break-inside-avoid">
          <div className="flex flex-col items-center text-center">
            <p className="font-bold text-slate-900 print:text-black">Mengetahui,</p>
            <input
              type="text"
              value={jabatanPimpinan}
              onChange={e => setJabatanPimpinan(e.target.value)}
              placeholder="Ketik jabatan..."
              disabled={isReadOnly}
              className="bg-transparent border-b border-gray-300 text-center focus:outline-none w-64 text-xs font-bold text-slate-800 pb-0.5 mt-0.5 placeholder:font-normal placeholder:italic disabled:border-none print:border-none print:shadow-none print:placeholder-transparent print:text-[10px] print:font-bold"
            />
            <div className="h-16 print:h-8"></div>
            <input
              type="text"
              value="Sapto Adi Sayogo"
              readOnly
              className="border-b-2 border-black w-64 text-center font-bold text-xs bg-transparent outline-none pb-1 text-slate-900 print:border-b-2 print:border-black print:text-[10px] print:font-bold cursor-default"
            />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 justify-center font-bold text-slate-900 text-xs print:text-[10px]">
              <span>Yogyakarta,</span>
              <input
                type="date"
                value={tanggalVerifikasi}
                onChange={e => setTanggalVerifikasi(e.target.value)}
                disabled={isReadOnly}
                className="bg-transparent border-b border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 pb-0.5 print:border-none print:shadow-none print:[&::-webkit-calendar-picker-indicator]:hidden print:text-[10px] print:font-bold"
              />
            </div>
            <p className="font-bold text-slate-800 text-xs mt-0.5 print:text-[10px] print:text-black">Verifikator,</p>
            <div className="h-16 print:h-8"></div>
            <input
              type="text"
              value="Rina Kurniawati"
              readOnly
              className="border-b-2 border-black w-64 text-center font-bold text-xs bg-transparent outline-none pb-1 text-slate-900 print:border-b-2 print:border-black print:text-[10px] print:font-bold cursor-default"
            />
          </div>
        </div>

        <div className="pt-8 text-right print:hidden">
          <p className="text-[10px] text-slate-400 italic">
            * Dokumen verifikasi ini sah dan menjadi bagian tak terpisahkan dari berkas SPM.
          </p>
        </div>
      </div>

      {/* SECTION 5: FOOTER ACTION BUTTONS */}
      <div className="p-6 bg-slate-100 flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Batal & Kembali</span>
        </button>

        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs"
              >
                Reset Form
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSimpanData(e)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all disabled:opacity-50 shadow-md text-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</span>
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(prev => !prev)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Dokumen</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors text-left"
                >
                  <Printer className="w-4 h-4 text-rose-500" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// SUB-COMPONENT 2: FORM KONTRAK (ISOLATED COMPONENT - PRECISE A4 PRINT)
// =========================================================================
function FormKontrak({ editingItem, onBack, onSaveSuccess, userRole, savedForms }) {
  const isReadOnly = userRole === 'user'
  const isSaving = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const getNextNumber = () => {
    const typeForms = (savedForms || []).filter(f => (f.jenisDokumen || f.jenis_dokumen) === 'KONTRAK')
    const numbers = typeForms.map(f => {
      const match = (f.nomorVerifikasi || f.no_verifikasi || '').match(/^K-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
    return `K-${String(maxNum + 1).padStart(3, '0')}`
  }

  const [headerKontrak, setHeaderKontrak] = useState(INITIAL_HEADER_KONTRAK)
  const [dokumenKontrakList, setDokumenKontrakList] = useState(DEFAULT_DOCUMENTS_KONTRAK)
  const [pajakKontrakData, setPajakKontrakData] = useState(DEFAULT_PAJAK)
  const [dendaKontrak, setDendaKontrak] = useState('')
  const [tanggalVerifikasiKontrak, setTanggalVerifikasiKontrak] = useState('2026-09-02')
  const [jabatanPimpinanKontrak, setJabatanPimpinanKontrak] = useState('Kepala Subbagian Tata Usaha')
  const [namaVerifikatorKontrak, setNamaVerifikatorKontrak] = useState('Rina Kurniawati')
  const [namaKasubbagKontrak, setNamaKasubbagKontrak] = useState('Sapto Adi Sayogo')

  useEffect(() => {
    if (editingItem) {
      setHeaderKontrak({
        id: editingItem.id,
        spm_id: editingItem.spm_id || null,
        kw_no: editingItem.kw_no || '',
        akun: editingItem.akun || '',
        no_verifikasi: editingItem.no_verifikasi || '',
        nama_unit_kerja: editingItem.nama_unit_kerja || 'Kontrak',
        nama_rekanan: editingItem.nama_rekanan || '',
        nama_kegiatan: editingItem.nama_kegiatan || '',
        nilai_kwitansi: cleanNilaiString(editingItem.nilai_kwitansi || editingItem.nilaiVerifikasi || editingItem.nilai)
      })
      if (Array.isArray(editingItem.kelengkapan_dokumen) && editingItem.kelengkapan_dokumen.length > 0) {
        setDokumenKontrakList(daftarDokumenKontrak.map((dokName, idx) => {
          const saved = editingItem.kelengkapan_dokumen[idx] || {}
          return {
            no: idx + 1,
            dokumen: dokName,
            ada: saved.ada || '',
            ket: saved.ket || ''
          }
        }))
      } else {
        setDokumenKontrakList(DEFAULT_DOCUMENTS_KONTRAK)
      }
      setPajakKontrakData(cleanPajakData(editingItem.rincian_pajak))
      setDendaKontrak(editingItem.denda_keterlambatan || '')
      if (editingItem.tanggal_verifikasi || editingItem.tanggalVerifikasi) {
        setTanggalVerifikasiKontrak(new Date(editingItem.tanggal_verifikasi || editingItem.tanggalVerifikasi).toISOString().split('T')[0])
      }
      setJabatanPimpinanKontrak(editingItem.jabatan_pimpinan || 'Kepala Subbagian Tata Usaha')
      setNamaVerifikatorKontrak('Rina Kurniawati')
      setNamaKasubbagKontrak('Sapto Adi Sayogo')
    } else {
      handleResetForm()
    }
  }, [editingItem, savedForms])

  const handleResetForm = () => {
    setHeaderKontrak({
      ...INITIAL_HEADER_KONTRAK,
      no_verifikasi: getNextNumber(),
      nama_unit_kerja: 'Kontrak'
    })
    setDokumenKontrakList(DEFAULT_DOCUMENTS_KONTRAK)
    setPajakKontrakData(DEFAULT_PAJAK)
    setDendaKontrak('')
    setTanggalVerifikasiKontrak('2026-09-02')
    setJabatanPimpinanKontrak('Kepala Subbagian Tata Usaha')
    setNamaVerifikatorKontrak('Rina Kurniawati')
    setNamaKasubbagKontrak('Sapto Adi Sayogo')
  }

  const handleDokumenKontrakChange = (index, field, value) => {
    setDokumenKontrakList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSetAllDokumenKontrak = (status) => {
    setDokumenKontrakList(prev => prev.map(item => ({ ...item, ada: status })))
  }

  const handlePajakKontrakChange = (taxKey, field, value) => {
    setPajakKontrakData(prev => ({
      ...prev,
      [taxKey]: {
        ...(prev[taxKey] || { checked: false, nominal: '', persen: '' }),
        [field]: field === 'nominal' ? cleanNilaiString(value) : value
      }
    }))
  }

  const calculateTotalPajakKontrak = () => {
    let total = 0
    Object.keys(pajakKontrakData).forEach(key => {
      const item = pajakKontrakData[key]
      if (item && item.checked) {
        const rawNum = String(item.nominal || '').replace(/[^0-9]/g, '')
        total += (parseFloat(rawNum) || 0)
      }
    })
    return total
  }

  const handleSimpanData = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault()
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
    }
    if (isSaving.current || isSubmitting) return
    isSaving.current = true
    setIsSubmitting(true)

    if (!headerKontrak.no_verifikasi.trim() || !(headerKontrak.nama_rekanan || '').trim()) {
      Swal.fire({
        title: 'Form Belum Lengkap',
        text: 'Nomor Verifikasi dan Nama Rekanan wajib diisi!',
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      })
      isSaving.current = false
      setIsSubmitting(false)
      return
    }

    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Simpan',
      text: 'Apakah data yang telah diisi sudah sesuai? Jika ragu, silakan periksa kembali.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Simpan',
      cancelButtonText: 'Batal'
    })

    if (!confirmResult.isConfirmed) {
      isSaving.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const existingData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      const isEditMode = Boolean(headerKontrak.id)

      let updatedData
      if (isEditMode) {
        updatedData = existingData.map((item) => {
          if (String(item.id) === String(headerKontrak.id)) {
            return {
              ...item,
              id: item.id,
              jenisDokumen: 'KONTRAK',
              jenis_dokumen: 'KONTRAK',
              rekanan: headerKontrak.nama_rekanan || item.rekanan || '',
              tanggalVerifikasi: tanggalVerifikasiKontrak || item.tanggalVerifikasi || new Date().toISOString().split('T')[0],
              nomorVerifikasi: headerKontrak.no_verifikasi || item.nomorVerifikasi || '',
              nilaiVerifikasi: cleanNilaiString(headerKontrak.nilai_kwitansi),
              akun: headerKontrak.akun || item.akun || '',
              kegiatan: headerKontrak.nama_kegiatan || item.kegiatan || ''
            }
          }
          return item
        })
      } else {
        const newId = Date.now()
        const newData = {
          id: newId,
          jenisDokumen: 'KONTRAK',
          jenis_dokumen: 'KONTRAK',
          rekanan: headerKontrak.nama_rekanan || '',
          tanggalVerifikasi: tanggalVerifikasiKontrak || new Date().toISOString().split('T')[0],
          nomorVerifikasi: headerKontrak.no_verifikasi || '',
          nilaiVerifikasi: cleanNilaiString(headerKontrak.nilai_kwitansi),
          status: 'Menunggu',
          kontrak: '-',
          kro: '',
          ro: '',
          akun: headerKontrak.akun || '',
          kegiatan: headerKontrak.nama_kegiatan || '',
          spmTanggal: '',
          spmNomor: '',
          spmNilai: ''
        }
        updatedData = [...existingData, newData]
      }
      localStorage.setItem('dataTransaksi', JSON.stringify(updatedData))

      const payload = {
        ...headerKontrak,
        nilai_kwitansi: cleanNilaiString(headerKontrak.nilai_kwitansi),
        jenis_dokumen: 'KONTRAK',
        jenisDokumen: 'KONTRAK',
        denda_keterlambatan: dendaKontrak,
        kelengkapan_dokumen: dokumenKontrakList,
        rincian_pajak: pajakKontrakData,
        tanggal_verifikasi: tanggalVerifikasiKontrak,
        jabatan_pimpinan: jabatanPimpinanKontrak,
        nama_verifikator: namaVerifikatorKontrak,
        nama_kasubbag: namaKasubbagKontrak
      }

      const isEdit = Boolean(headerKontrak.id)
      const res = isEdit
        ? await axiosInstance.put(`/api/form-verifikasi/${headerKontrak.id}`, payload)
        : await axiosInstance.post('/api/form-verifikasi', payload)
      const result = res.data

      if (result.status === 'success') {
        // [START REVISI ANTIGRAVITY]: Hapus cache lokal agar tidak duplikat dengan data dari DB
        try {
          const currentLocalData = JSON.parse(localStorage.getItem('dataTransaksi')) || [];
          const filteredLocalData = currentLocalData.filter(d => 
             !(d.nomorVerifikasi === payload.no_verifikasi && d.rekanan === payload.nama_rekanan) &&
             String(d.id) !== String(headerKontrak.id)
          );
          localStorage.setItem('dataTransaksi', JSON.stringify(filteredLocalData));
        } catch (e) {
          console.error('Gagal membersihkan local storage', e);
        }
        // [END REVISI ANTIGRAVITY]

        await Swal.fire({
          title: 'Berhasil!',
          text: isEdit ? 'Formulir verifikasi Kontrak berhasil diperbarui.' : 'Formulir verifikasi Kontrak berhasil disimpan.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 1500
        })
        onSaveSuccess()
      } else {
        Swal.fire({
          title: 'Gagal',
          text: result.message || 'Gagal menyimpan formulir verifikasi.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan formulir verifikasi.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => {
        isSaving.current = false
      }, 1000)
    }
  }

  const handleExportPdf = () => {
    setShowExportMenu(false)
    window.print()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:min-h-0 print:h-auto print:block print:w-full print:max-w-none">
      {/* SECTION 1: HEADER BANNER KONTRAK */}
      <div className="p-8 border-b border-slate-200 bg-white relative overflow-hidden print:p-0 print:border-none print:mb-2">
        {/* KOTAK KRO & AKUN (POJOK KANAN ATAS) */}
        <div className="flex justify-between items-start mb-4 print:mb-2 text-xs print:text-[10px]">
          <div className="space-y-1 print:space-y-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-purple-600 print:hidden">
              FORMULIR LEMBAR VERIFIKASI KONTRAK
            </span>
          </div>

          <table className="border-collapse border-2 border-slate-900 print:border-black font-bold w-48 print:w-44 text-xs print:text-[10px]">
            <tbody>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-0.5 w-16 text-slate-900 print:text-black">KRO</td>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-center">
                  <input
                    type="text"
                    value={headerKontrak.kw_no}
                    onChange={e => setHeaderKontrak({ ...headerKontrak, kw_no: e.target.value })}
                    placeholder="No. KRO..."
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs font-bold text-center outline-none focus:border-purple-600 print:border-none print:text-black print:p-0 print:text-[10px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-slate-900 print:text-black">AKUN</td>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-center">
                  <input
                    type="text"
                    value={headerKontrak.akun}
                    onChange={e => setHeaderKontrak({ ...headerKontrak, akun: e.target.value })}
                    placeholder="Kode Akun..."
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs font-bold text-center outline-none focus:border-purple-600 print:border-none print:text-black print:p-0 print:text-[10px]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* JUDUL TENGAH & GARIS BAWAH RESMI */}
        <div className="text-center font-bold mb-4 print:mb-2 border-b-2 border-slate-900 print:border-black pb-2">
          <h1 className="text-lg md:text-xl print:text-[13px] font-black uppercase tracking-wide text-slate-900 print:text-black text-center">
            HASIL PENELITIAN DAN VERIFIKASI KONTRAK/ SPK
          </h1>
          
        </div>

        {/* GRID INFORMASI UTAMA (TITIK DUA SEJAJAR) */}
        <div className="grid grid-cols-[200px_10px_1fr] print:grid-cols-[160px_10px_1fr] gap-y-1 print:gap-y-0 text-sm print:text-[10px] font-bold mb-6 print:mb-2 text-slate-800 print:text-black">
          <div>No. Verifikasi</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerKontrak.no_verifikasi}
              onChange={e => setHeaderKontrak({ ...headerKontrak, no_verifikasi: e.target.value })}
              placeholder="Contoh: 001/VERIF-SPK/2026"
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Jenis Tagihan</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerKontrak.nama_unit_kerja || 'Kontrak'}
              onChange={e => setHeaderKontrak({ ...headerKontrak, nama_unit_kerja: e.target.value })}
              placeholder="Unit kerja pengusul..."
              disabled={true}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nama Rekanan / User</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerKontrak.nama_rekanan}
              onChange={e => setHeaderKontrak({ ...headerKontrak, nama_rekanan: e.target.value })}
              placeholder="Nama penyedia / vendor..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nama Kegiatan / Acara</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerKontrak.nama_kegiatan}
              onChange={e => setHeaderKontrak({ ...headerKontrak, nama_kegiatan: e.target.value })}
              placeholder="Deskripsi kegiatan..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nilai Kwitansi</div><div>:</div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 print:text-black">Rp</span>
              <input
                type="text"
                value={formatRupiah(headerKontrak.nilai_kwitansi)}
                onChange={e => handleNominalInput(e, val => setHeaderKontrak(prev => ({ ...prev, nilai_kwitansi: val })))}
                placeholder="0"
                disabled={isReadOnly}
                className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHECKLIST DOKUMEN KONTRAK & IN-TABLE PAJAK */}
      <div className="p-8 border-b border-slate-200 print:p-0 print:border-none print:mb-2">
        <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              KELENGKAPAN DOKUMEN PENELITIAN KONTRAK ({dokumenKontrakList.length} ITEM CHECKLIST)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Pilih opsi kelengkapan berkas dan isi nominal pajak langsung pada tabel.
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSetAllDokumenKontrak('Ada')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-200 transition-all"
              >
                Set Semua ADA
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDokumenKontrak('Tidak')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl border border-rose-200 transition-all"
              >
                Set Semua TIDAK
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl print:border-2 print:border-black print:rounded-none print:break-inside-avoid">
          <table className="w-full border-collapse border-2 border-black text-sm print:text-xs print:leading-tight print:break-inside-auto">
            <thead>
              <tr className="border-b-2 border-slate-900 print:border-black bg-slate-100 print:bg-transparent font-bold text-left uppercase text-slate-800 print:text-black">
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center w-8 print:w-8">NO</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center">DOKUMEN</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center w-28 print:w-20">ADA</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center w-48 print:w-32">KET.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-semibold text-slate-800 print:divide-black print:text-[10px] print:leading-normal">
              {dokumenKontrakList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold text-slate-500 print:text-black print:text-[10px]">
                    {item.no || idx + 1}
                  </td>
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold text-slate-800 print:text-black print:text-[10px]">
                    {daftarDokumenKontrak[idx] || item.dokumen}
                  </td>
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center">
                    <div className="hidden print:block text-center font-bold text-base print:text-[10px] print:text-black">
                      {item.ada === 'Ada' ? '✓' : ''}
                    </div>
                    <div className="flex items-center justify-center gap-4 print:hidden">
                      <label className={`flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded-lg transition-colors ${
                        item.ada === 'Ada' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-emerald-700'
                      }`}>
                        <input
                          type="radio"
                          name={`dok_kontrak_ada_${idx}`}
                          value="Ada"
                          checked={item.ada === 'Ada'}
                          disabled={isReadOnly}
                          onChange={() => handleDokumenKontrakChange(idx, 'ada', 'Ada')}
                          className="accent-emerald-600"
                        />
                        <span>ADA</span>
                      </label>
                      <label className={`flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded-lg transition-colors ${
                        item.ada === 'Tidak' ? 'bg-rose-100 text-rose-800' : 'text-slate-500 hover:text-rose-700'
                      }`}>
                        <input
                          type="radio"
                          name={`dok_kontrak_ada_${idx}`}
                          value="Tidak"
                          checked={item.ada === 'Tidak'}
                          disabled={isReadOnly}
                          onChange={() => handleDokumenKontrakChange(idx, 'ada', 'Tidak')}
                          className="accent-rose-600"
                        />
                        <span>TIDAK</span>
                      </label>
                    </div>
                  </td>
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5">
                    <input
                      type="text"
                      value={item.ket || ''}
                      onChange={e => handleDokumenKontrakChange(idx, 'ket', e.target.value)}
                      placeholder="Catatan..."
                      disabled={isReadOnly}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1 outline-none focus:border-purple-500 focus:bg-white transition-all disabled:bg-slate-100 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </td>
                </tr>
              ))}

              {/* BARIS 27: HEADER PAJAK PENGHASILAN KONTRAK */}
              <tr className="bg-slate-50/80 hover:bg-slate-50 transition-colors print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold text-slate-900 print:text-black">
                  27
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold text-slate-900 print:text-black" colSpan={3}>
                  Pajak Penghasilan:
                </td>
              </tr>

              {/* SUB-BARIS 27a: PPh 21 */}
              <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakKontrakData.pph21.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakKontrakChange('pph21', 'checked', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 21</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakKontrakData.pph21.persen || ''}
                                onChange={e => handlePajakKontrakChange('pph21', 'persen', e.target.value)}
                                placeholder="5-15"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-purple-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                    <input
                      type="text"
                      value={formatRupiah(pajakKontrakData.pph21.nominal)}
                      onChange={e => handleNominalInput(e, val => handlePajakKontrakChange('pph21', 'nominal', val))}
                      placeholder="0"
                      disabled={isReadOnly || !pajakKontrakData.pph21.checked}
                      className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-purple-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </div>
                </td>
              </tr>

              {/* SUB-BARIS 27b: PPh 22 */}
              <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakKontrakData.pph22.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakKontrakChange('pph22', 'checked', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 22</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakKontrakData.pph22.persen || ''}
                                onChange={e => handlePajakKontrakChange('pph22', 'persen', e.target.value)}
                                placeholder="1,50"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-purple-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                    <input
                      type="text"
                      value={formatRupiah(pajakKontrakData.pph22.nominal)}
                      onChange={e => handleNominalInput(e, val => handlePajakKontrakChange('pph22', 'nominal', val))}
                      placeholder="0"
                      disabled={isReadOnly || !pajakKontrakData.pph22.checked}
                      className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-purple-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </div>
                </td>
              </tr>

              {/* SUB-BARIS 27c: PPh 23 */}
              <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakKontrakData.pph23.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakKontrakChange('pph23', 'checked', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 23</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakKontrakData.pph23.persen || ''}
                                onChange={e => handlePajakKontrakChange('pph23', 'persen', e.target.value)}
                                placeholder="2"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-purple-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                    <input
                      type="text"
                      value={formatRupiah(pajakKontrakData.pph23.nominal)}
                      onChange={e => handleNominalInput(e, val => handlePajakKontrakChange('pph23', 'nominal', val))}
                      placeholder="0"
                      disabled={isReadOnly || !pajakKontrakData.pph23.checked}
                      className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-purple-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </div>
                </td>
              </tr>

              {/* SUB-BARIS 27d: PPh Pasal 4 (2) */}
              <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakKontrakData.pph28.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakKontrakChange('pph28', 'checked', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPh 4 (2)</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakKontrakData.pph28.persen || ''}
                                onChange={e => handlePajakKontrakChange('pph28', 'persen', e.target.value)}
                                placeholder="1,75"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-purple-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                    <input
                      type="text"
                      value={formatRupiah(pajakKontrakData.pph28.nominal)}
                      onChange={e => handleNominalInput(e, val => handlePajakKontrakChange('pph28', 'nominal', val))}
                      placeholder="0"
                      disabled={isReadOnly || !pajakKontrakData.pph28.checked}
                      className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-purple-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </div>
                </td>
              </tr>

              {/* SUB-BARIS 27e: PPN (11%) */}
              <tr className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold"></td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold pl-8">
                  <label className="flex items-center gap-1 cursor-pointer font-bold text-xs print:text-[10px]">
                            <input
                              type="checkbox"
                              checked={pajakKontrakData.ppn.checked}
                              disabled={isReadOnly}
                              onChange={e => handlePajakKontrakChange('ppn', 'checked', e.target.checked)}
                              className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 print:hidden"
                            />
                            <span className="font-bold text-gray-900 ml-1">PPN</span>
                            <span className="text-gray-600 font-normal flex items-center justify-center gap-0 print:text-xs">
                              (
                              <input
                                type="text"
                                value={pajakKontrakData.ppn.persen || ''}
                                onChange={e => handlePajakKontrakChange('ppn', 'persen', e.target.value)}
                                placeholder="11"
                                disabled={isReadOnly}
                                className="w-10 bg-transparent outline-none text-center px-0.5 border-b border-dashed border-gray-400 focus:border-solid focus:border-purple-500 print:border-none print:p-0 text-gray-600 font-normal text-xs print:text-black print:w-8 print:text-xs print:px-0 mx-0"
                              />
                              %)
                            </span>
                            <span className="font-bold ml-1">:</span>
                          </label>
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold" colSpan={2}>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-slate-500 print:text-black print:text-[10px]">Rp</span>
                    <input
                      type="text"
                      value={formatRupiah(pajakKontrakData.ppn.nominal)}
                      onChange={e => handleNominalInput(e, val => handlePajakKontrakChange('ppn', 'nominal', val))}
                      placeholder="0"
                      disabled={isReadOnly || !pajakKontrakData.ppn.checked}
                      className="w-48 bg-transparent border-b border-slate-300 text-slate-900 font-mono font-bold text-xs px-2 py-0.5 outline-none focus:border-purple-600 disabled:opacity-50 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </div>
                </td>
              </tr>

              {/* BARIS 28: DENDA KETERLAMBATAN */}
              <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-200 print:border-b print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold text-slate-500 print:text-black print:text-[10px]">
                  28
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold text-slate-800 print:text-black print:text-[10px]">
                  Denda Keterlambatan:
                </td>
                <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5" colSpan={2}>
                  <input
                    type="text"
                    value={dendaKontrak}
                    onChange={e => setDendaKontrak(e.target.value)}
                    placeholder="Contoh: 1/1000 x Nilai Kontrak..."
                    disabled={isReadOnly}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1 outline-none focus:border-purple-500 focus:bg-white transition-all disabled:bg-slate-100 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: TANDA TANGAN & TANGGAL KONTRAK */}
      <div className="p-8 border-b border-slate-200 bg-white print:p-0 print:border-none print:mt-2 print:break-inside-avoid print:page-break-inside-avoid">
        <div className="flex justify-between items-start w-full mt-4 px-4 print:px-1 print:mt-2 text-sm print:text-[10px] text-center font-bold text-slate-900 print:text-black print:break-inside-avoid">
          <div className="flex flex-col items-center text-center">
            <p className="font-bold text-slate-900 print:text-black">Mengetahui,</p>
            <input
              type="text"
              value={jabatanPimpinanKontrak}
              onChange={e => setJabatanPimpinanKontrak(e.target.value)}
              placeholder="Ketik jabatan..."
              disabled={isReadOnly}
              className="bg-transparent border-b border-gray-300 text-center focus:outline-none w-64 text-xs font-bold text-slate-800 pb-0.5 mt-0.5 placeholder:font-normal placeholder:italic disabled:border-none print:border-none print:shadow-none print:placeholder-transparent print:text-[10px] print:font-bold"
            />
            <div className="h-16 print:h-8"></div>
            <input
              type="text"
              value="Sapto Adi Sayogo"
              readOnly
              className="border-b-2 border-black w-64 text-center font-bold text-xs bg-transparent outline-none pb-1 text-slate-900 print:border-b-2 print:border-black print:text-[10px] print:font-bold cursor-default"
            />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 justify-center font-bold text-slate-900 text-xs print:text-[10px]">
              <span>Yogyakarta,</span>
              <input
                type="date"
                value={tanggalVerifikasiKontrak}
                onChange={e => setTanggalVerifikasiKontrak(e.target.value)}
                disabled={isReadOnly}
                className="bg-transparent border-b border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-purple-600 pb-0.5 print:border-none print:shadow-none print:[&::-webkit-calendar-picker-indicator]:hidden print:text-[10px] print:font-bold"
              />
            </div>
            <p className="font-bold text-slate-800 text-xs mt-0.5 print:text-[10px] print:text-black">Verifikator,</p>
            <div className="h-16 print:h-8"></div>
            <input
              type="text"
              value="Rina Kurniawati"
              readOnly
              className="border-b-2 border-black w-64 text-center font-bold text-xs bg-transparent outline-none pb-1 text-slate-900 print:border-b-2 print:border-black print:text-[10px] print:font-bold cursor-default"
            />
          </div>
        </div>

        <div className="pt-8 text-right print:hidden">
          <p className="text-[10px] text-slate-400 italic">
            * Dokumen verifikasi ini sah dan menjadi bagian tak terpisahkan dari berkas SPM.
          </p>
        </div>
      </div>

      {/* SECTION 5: FOOTER ACTION BUTTONS */}
      <div className="p-6 bg-slate-100 flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Batal & Kembali</span>
        </button>

        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs"
              >
                Reset Form
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSimpanData(e)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all disabled:opacity-50 shadow-md text-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</span>
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(prev => !prev)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Dokumen</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors text-left"
                >
                  <Printer className="w-4 h-4 text-rose-500" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// SUB-COMPONENT 3: FORM PERJALANAN DINAS (ISOLATED COMPONENT - PRECISE A4 PRINT)
// =========================================================================
function FormPerjalananDinas({ editingItem, onBack, onSaveSuccess, userRole, savedForms }) {
  const isReadOnly = userRole === 'user'
  const isSaving = useRef(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  const getNextNumber = () => {
    const typeForms = (savedForms || []).filter(f => (f.jenisDokumen || f.jenis_dokumen) === 'PERJALANAN_DINAS')
    const numbers = typeForms.map(f => {
      const match = (f.nomorVerifikasi || f.no_verifikasi || '').match(/^PD-(\d+)/)
      return match ? parseInt(match[1], 10) : 0
    })
    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0
    return `PD-${String(maxNum + 1).padStart(3, '0')}`
  }

  const [headerPerjalanan, setHeaderPerjalanan] = useState(INITIAL_HEADER_PERJALANAN)
  const [dokumenPerjalananList, setDokumenPerjalananList] = useState(DEFAULT_DOCUMENTS_PERJALANAN)
  const [tanggalVerifikasiPerjalanan, setTanggalVerifikasiPerjalanan] = useState('2026-09-02')
  const [jabatanPimpinanPerjalanan, setJabatanPimpinanPerjalanan] = useState('Kepala Subbagian Tata Usaha')
  const [namaVerifikatorPerjalanan, setNamaVerifikatorPerjalanan] = useState('Rina Kurniawati')
  const [namaKasubbagPerjalanan, setNamaKasubbagPerjalanan] = useState('Sapto Adi Sayogo')

  useEffect(() => {
    if (editingItem) {
      setHeaderPerjalanan({
        id: editingItem.id,
        spm_id: editingItem.spm_id || null,
        kw_no: editingItem.kw_no || '',
        akun: editingItem.akun || '',
        no_verifikasi: editingItem.no_verifikasi || '',
        nama_unit_kerja: editingItem.nama_unit_kerja || 'Perjalanan Dinas',
        nama_pelaksana: editingItem.nama_pelaksana || editingItem.nama_rekanan || '',
        keterangan: editingItem.keterangan || editingItem.nama_kegiatan || '',
        lama_perjalanan: editingItem.lama_perjalanan || '',
        nilai_kwitansi: cleanNilaiString(editingItem.nilai_kwitansi || editingItem.nilaiVerifikasi || editingItem.nilai)
      })
      if (Array.isArray(editingItem.kelengkapan_dokumen) && editingItem.kelengkapan_dokumen.length > 0) {
        setDokumenPerjalananList(daftarDokumenPerjalanan.map((dokName, idx) => {
          const saved = editingItem.kelengkapan_dokumen[idx] || {}
          return {
            no: idx + 1,
            dokumen: dokName,
            ada: saved.ada || '',
            ket: saved.ket || ''
          }
        }))
      } else {
        setDokumenPerjalananList(DEFAULT_DOCUMENTS_PERJALANAN)
      }
      if (editingItem.tanggal_verifikasi || editingItem.tanggalVerifikasi) {
        setTanggalVerifikasiPerjalanan(new Date(editingItem.tanggal_verifikasi || editingItem.tanggalVerifikasi).toISOString().split('T')[0])
      }
      setJabatanPimpinanPerjalanan(editingItem.jabatan_pimpinan || 'Kepala Subbagian Tata Usaha')
      setNamaVerifikatorPerjalanan('Rina Kurniawati')
      setNamaKasubbagPerjalanan('Sapto Adi Sayogo')
    } else {
      handleResetForm()
    }
  }, [editingItem, savedForms])

  const handleResetForm = () => {
    setHeaderPerjalanan({
      ...INITIAL_HEADER_PERJALANAN,
      no_verifikasi: getNextNumber(),
      nama_unit_kerja: 'Perjalanan Dinas'
    })
    setDokumenPerjalananList(DEFAULT_DOCUMENTS_PERJALANAN)
    setTanggalVerifikasiPerjalanan('2026-09-02')
    setJabatanPimpinanPerjalanan('Kepala Subbagian Tata Usaha')
    setNamaVerifikatorPerjalanan('Rina Kurniawati')
    setNamaKasubbagPerjalanan('Sapto Adi Sayogo')
  }

  const handleDokumenPerjalananChange = (index, field, value) => {
    setDokumenPerjalananList(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleSetAllDokumenPerjalanan = (status) => {
    setDokumenPerjalananList(prev => prev.map(item => ({ ...item, ada: status })))
  }

  const handleSimpanData = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault()
      if (typeof e.stopPropagation === 'function') e.stopPropagation()
    }
    if (isSaving.current || isSubmitting) return
    isSaving.current = true
    setIsSubmitting(true)

    if (!headerPerjalanan.no_verifikasi.trim() || !(headerPerjalanan.nama_pelaksana || '').trim()) {
      Swal.fire({
        title: 'Form Belum Lengkap',
        text: 'Nomor Verifikasi dan Nama Pelaksana wajib diisi!',
        icon: 'warning',
        confirmButtonColor: '#2563eb'
      })
      isSaving.current = false
      setIsSubmitting(false)
      return
    }

    const confirmResult = await Swal.fire({
      title: 'Konfirmasi Simpan',
      text: 'Apakah data yang telah diisi sudah sesuai? Jika ragu, silakan periksa kembali.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Simpan',
      cancelButtonText: 'Batal'
    })

    if (!confirmResult.isConfirmed) {
      isSaving.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const existingData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      const isEditMode = Boolean(headerPerjalanan.id)

      let updatedData
      if (isEditMode) {
        updatedData = existingData.map((item) => {
          if (String(item.id) === String(headerPerjalanan.id)) {
            return {
              ...item,
              id: item.id,
              jenisDokumen: 'PERJALANAN_DINAS',
              jenis_dokumen: 'PERJALANAN_DINAS',
              rekanan: headerPerjalanan.nama_pelaksana || item.rekanan || '',
              tanggalVerifikasi: tanggalVerifikasiPerjalanan || item.tanggalVerifikasi || new Date().toISOString().split('T')[0],
              nomorVerifikasi: headerPerjalanan.no_verifikasi || item.nomorVerifikasi || '',
              nilaiVerifikasi: cleanNilaiString(headerPerjalanan.nilai_kwitansi),
              akun: headerPerjalanan.akun || item.akun || '',
              kegiatan: headerPerjalanan.keterangan || item.kegiatan || ''
            }
          }
          return item
        })
      } else {
        const newId = Date.now()
        const newData = {
          id: newId,
          jenisDokumen: 'PERJALANAN_DINAS',
          jenis_dokumen: 'PERJALANAN_DINAS',
          rekanan: headerPerjalanan.nama_pelaksana || '',
          tanggalVerifikasi: tanggalVerifikasiPerjalanan || new Date().toISOString().split('T')[0],
          nomorVerifikasi: headerPerjalanan.no_verifikasi || '',
          nilaiVerifikasi: cleanNilaiString(headerPerjalanan.nilai_kwitansi),
          status: 'Menunggu',
          kontrak: '-',
          kro: '',
          ro: '',
          akun: headerPerjalanan.akun || '',
          kegiatan: headerPerjalanan.keterangan || '',
          spmTanggal: '',
          spmNomor: '',
          spmNilai: ''
        }
        updatedData = [...existingData, newData]
      }
      localStorage.setItem('dataTransaksi', JSON.stringify(updatedData))

      const payload = {
        ...headerPerjalanan,
        nilai_kwitansi: cleanNilaiString(headerPerjalanan.nilai_kwitansi),
        nama_rekanan: headerPerjalanan.nama_pelaksana,
        nama_kegiatan: headerPerjalanan.keterangan,
        jenis_dokumen: 'PERJALANAN_DINAS',
        jenisDokumen: 'PERJALANAN_DINAS',
        kelengkapan_dokumen: dokumenPerjalananList,
        tanggal_verifikasi: tanggalVerifikasiPerjalanan,
        jabatan_pimpinan: jabatanPimpinanPerjalanan,
        nama_verifikator: namaVerifikatorPerjalanan,
        nama_kasubbag: namaKasubbagPerjalanan
      }

      const isEdit = Boolean(headerPerjalanan.id)
      const res = isEdit
        ? await axiosInstance.put(`/api/form-verifikasi/${headerPerjalanan.id}`, payload)
        : await axiosInstance.post('/api/form-verifikasi', payload)
      const result = res.data

      if (result.status === 'success') {
        // [START REVISI ANTIGRAVITY]: Hapus cache lokal agar tidak duplikat dengan data dari DB
        try {
          const currentLocalData = JSON.parse(localStorage.getItem('dataTransaksi')) || [];
          const filteredLocalData = currentLocalData.filter(d => 
             !(d.nomorVerifikasi === payload.no_verifikasi && d.rekanan === payload.nama_rekanan) &&
             String(d.id) !== String(headerPerjalanan.id)
          );
          localStorage.setItem('dataTransaksi', JSON.stringify(filteredLocalData));
        } catch (e) {
          console.error('Gagal membersihkan local storage', e);
        }
        // [END REVISI ANTIGRAVITY]

        await Swal.fire({
          title: 'Berhasil!',
          text: isEdit ? 'Formulir verifikasi Perjalanan Dinas berhasil diperbarui.' : 'Formulir verifikasi Perjalanan Dinas berhasil disimpan.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 1500
        })
        onSaveSuccess()
      } else {
        Swal.fire({
          title: 'Gagal',
          text: result.message || 'Gagal menyimpan formulir verifikasi.',
          icon: 'error',
          confirmButtonColor: '#ef4444'
        })
      }
    } catch (err) {
      console.error(err)
      Swal.fire({
        title: 'Gagal Menyimpan',
        text: err.response?.data?.message || 'Terjadi kesalahan saat menyimpan formulir verifikasi.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      })
    } finally {
      setIsSubmitting(false)
      setTimeout(() => {
        isSaving.current = false
      }, 1000)
    }
  }

  const handleExportPdf = () => {
    setShowExportMenu(false)
    window.print()
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden print:bg-white print:shadow-none print:border-none print:rounded-none print:m-0 print:p-0 print:min-h-0 print:h-auto print:block print:w-full print:max-w-none">
      {/* SECTION 1: HEADER BANNER PERJALANAN DINAS */}
      <div className="p-8 border-b border-slate-200 bg-white relative overflow-hidden print:p-0 print:border-none print:mb-2">
        {/* KOTAK KRO & AKUN (POJOK KANAN ATAS) */}
        <div className="flex justify-between items-start mb-4 print:mb-2 text-xs print:text-[10px]">
          <div className="space-y-1 print:space-y-0">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-600 print:hidden">
              FORMULIR LEMBAR VERIFIKASI PERJALANAN DINAS
            </span>
          </div>

          <table className="border-collapse border-2 border-slate-900 print:border-black font-bold w-48 print:w-44 text-xs print:text-[10px]">
            <tbody>
              <tr className="border-b border-slate-300 print:border-black">
                <td className="border border-slate-300 print:border-black px-2 py-0.5 w-16 text-slate-900 print:text-black">KRO</td>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-center">
                  <input
                    type="text"
                    value={headerPerjalanan.kw_no}
                    onChange={e => setHeaderPerjalanan({ ...headerPerjalanan, kw_no: e.target.value })}
                    placeholder="No. KRO..."
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs font-bold text-center outline-none focus:border-cyan-600 print:border-none print:text-black print:p-0 print:text-[10px]"
                  />
                </td>
              </tr>
              <tr>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-slate-900 print:text-black">AKUN</td>
                <td className="border border-slate-300 print:border-black px-2 py-0.5 text-center">
                  <input
                    type="text"
                    value={headerPerjalanan.akun}
                    onChange={e => setHeaderPerjalanan({ ...headerPerjalanan, akun: e.target.value })}
                    placeholder="Kode Akun..."
                    disabled={isReadOnly}
                    className="w-full bg-transparent text-slate-900 font-mono text-xs font-bold text-center outline-none focus:border-cyan-600 print:border-none print:text-black print:p-0 print:text-[10px]"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* JUDUL TENGAH & GARIS BAWAH RESMI */}
        <div className="text-center font-bold mb-4 print:mb-2 border-b-2 border-slate-900 print:border-black pb-2">
          <h1 className="text-lg md:text-xl print:text-[13px] font-black uppercase tracking-wide text-slate-900 print:text-black text-center">
            HASIL PENELITIAN DAN VERIFIKASI PERJALANAN DINAS/PENGGANTI TRANSPOR
          </h1>
          
        </div>

        {/* GRID INFORMASI UTAMA (TITIK DUA SEJAJAR) */}
        <div className="grid grid-cols-[200px_10px_1fr] print:grid-cols-[160px_10px_1fr] gap-y-1 print:gap-y-0 text-sm print:text-[10px] font-bold mb-6 print:mb-2 text-slate-800 print:text-black">
          <div>No. Verifikasi</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerPerjalanan.no_verifikasi}
              onChange={e => setHeaderPerjalanan({ ...headerPerjalanan, no_verifikasi: e.target.value })}
              placeholder="Contoh: 001/VERIF-PD/2026"
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Jenis Tagihan</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerPerjalanan.nama_unit_kerja || 'Perjalanan Dinas'}
              disabled={true}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nama Pelaksana</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerPerjalanan.nama_pelaksana}
              onChange={e => setHeaderPerjalanan({ ...headerPerjalanan, nama_pelaksana: e.target.value })}
              placeholder="Nama pegawai / pelaksana..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Keterangan</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerPerjalanan.keterangan}
              onChange={e => setHeaderPerjalanan({ ...headerPerjalanan, keterangan: e.target.value })}
              placeholder="Maksud perjalanan dinas..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Lama Perjalanan</div><div>:</div>
          <div>
            <input
              type="text"
              value={headerPerjalanan.lama_perjalanan}
              onChange={e => setHeaderPerjalanan({ ...headerPerjalanan, lama_perjalanan: e.target.value })}
              placeholder="Contoh: 3 (Tiga) Hari..."
              disabled={isReadOnly}
              className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
            />
          </div>

          <div>Nilai Kwitansi</div><div>:</div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-slate-400 print:text-black">Rp</span>
              <input
                type="text"
                value={formatRupiah(headerPerjalanan.nilai_kwitansi)}
                onChange={e => handleNominalInput(e, val => setHeaderPerjalanan(prev => ({ ...prev, nilai_kwitansi: val })))}
                placeholder="0"
                disabled={isReadOnly}
                className="w-full bg-transparent text-slate-900 font-bold outline-none print:border-none print:p-0 print:text-black print:text-[10px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: CHECKLIST DOKUMEN PERJALANAN DINAS (6 ITEM) */}
      <div className="p-8 border-b border-slate-200 print:p-0 print:border-none print:mb-2">
        <div className="flex items-center justify-between gap-4 mb-4 print:hidden">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wide">
              KELENGKAPAN DOKUMEN PENELITIAN PERJALANAN DINAS ({dokumenPerjalananList.length} ITEM CHECKLIST)
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Pilih opsi kelengkapan berkas untuk setiap baris dokumen verifikasi perjalanan dinas.
            </p>
          </div>

          {!isReadOnly && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleSetAllDokumenPerjalanan('Ada')}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-extrabold rounded-xl border border-emerald-200 transition-all"
              >
                Set Semua ADA
              </button>
              <button
                type="button"
                onClick={() => handleSetAllDokumenPerjalanan('Tidak')}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-extrabold rounded-xl border border-rose-200 transition-all"
              >
                Set Semua TIDAK
              </button>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-slate-200 rounded-2xl print:border-2 print:border-black print:rounded-none print:break-inside-avoid">
          <table className="w-full border-collapse border-2 border-black text-sm print:text-xs print:leading-tight print:break-inside-auto">
            <thead>
              <tr className="border-b-2 border-slate-900 print:border-black bg-slate-100 print:bg-transparent font-bold text-left uppercase text-slate-800 print:text-black">
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center w-8 print:w-8">NO</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center">DOKUMEN</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center w-28 print:w-20">ADA</th>
                <th className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 print:px-1 text-center w-48 print:w-32">KET.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs font-semibold text-slate-800 print:divide-black print:text-[10px] print:leading-normal">
              {dokumenPerjalananList.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors print:border-b print:border-black">
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center font-bold text-slate-500 print:text-black print:text-[10px]">
                    {item.no || idx + 1}
                  </td>
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 font-bold text-slate-800 print:text-black print:text-[10px]">
                    {daftarDokumenPerjalanan[idx] || item.dokumen}
                  </td>
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5 text-center">
                    <div className="hidden print:block text-center font-bold text-base print:text-[10px] print:text-black">
                      {item.ada === 'Ada' ? '✓' : ''}
                    </div>
                    <div className="flex items-center justify-center gap-4 print:hidden">
                      <label className={`flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded-lg transition-colors ${
                        item.ada === 'Ada' ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-emerald-700'
                      }`}>
                        <input
                          type="radio"
                          name={`dok_perjalanan_ada_${idx}`}
                          value="Ada"
                          checked={item.ada === 'Ada'}
                          disabled={isReadOnly}
                          onChange={() => handleDokumenPerjalananChange(idx, 'ada', 'Ada')}
                          className="accent-emerald-600"
                        />
                        <span>ADA</span>
                      </label>
                      <label className={`flex items-center gap-1.5 cursor-pointer font-bold px-2 py-1 rounded-lg transition-colors ${
                        item.ada === 'Tidak' ? 'bg-rose-100 text-rose-800' : 'text-slate-500 hover:text-rose-700'
                      }`}>
                        <input
                          type="radio"
                          name={`dok_perjalanan_ada_${idx}`}
                          value="Tidak"
                          checked={item.ada === 'Tidak'}
                          disabled={isReadOnly}
                          onChange={() => handleDokumenPerjalananChange(idx, 'ada', 'Tidak')}
                          className="accent-rose-600"
                        />
                        <span>TIDAK</span>
                      </label>
                    </div>
                  </td>
                  <td className="border border-slate-300 print:border-black px-2 py-1 print:py-0.5">
                    <input
                      type="text"
                      value={item.ket || ''}
                      onChange={e => handleDokumenPerjalananChange(idx, 'ket', e.target.value)}
                      placeholder="Catatan..."
                      disabled={isReadOnly}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-1 outline-none focus:border-cyan-500 focus:bg-white transition-all disabled:bg-slate-100 print:border-none print:bg-transparent print:p-0 print:text-black print:shadow-none print:placeholder-transparent print:text-[10px] print:leading-normal"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: TANDA TANGAN & TANGGAL PERJALANAN DINAS */}
      <div className="p-8 border-b border-slate-200 bg-white print:p-0 print:border-none print:mt-2 print:break-inside-avoid print:page-break-inside-avoid">
        <div className="flex justify-between items-start w-full mt-4 px-4 print:px-1 print:mt-2 text-sm print:text-[10px] text-center font-bold text-slate-900 print:text-black print:break-inside-avoid">
          <div className="flex flex-col items-center text-center">
            <p className="font-bold text-slate-900 print:text-black">Mengetahui,</p>
            <input
              type="text"
              value={jabatanPimpinanPerjalanan}
              onChange={e => setJabatanPimpinanPerjalanan(e.target.value)}
              placeholder="Ketik jabatan..."
              disabled={isReadOnly}
              className="bg-transparent border-b border-gray-300 text-center focus:outline-none w-64 text-xs font-bold text-slate-800 pb-0.5 mt-0.5 placeholder:font-normal placeholder:italic disabled:border-none print:border-none print:shadow-none print:placeholder-transparent print:text-[10px] print:font-bold"
            />
            <div className="h-16 print:h-8"></div>
            <input
              type="text"
              value="Sapto Adi Sayogo"
              readOnly
              className="border-b-2 border-black w-64 text-center font-bold text-xs bg-transparent outline-none pb-1 text-slate-900 print:border-b-2 print:border-black print:text-[10px] print:font-bold cursor-default"
            />
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-2 justify-center font-bold text-slate-900 text-xs print:text-[10px]">
              <span>Yogyakarta,</span>
              <input
                type="date"
                value={tanggalVerifikasiPerjalanan}
                onChange={e => setTanggalVerifikasiPerjalanan(e.target.value)}
                disabled={isReadOnly}
                className="bg-transparent border-b border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-cyan-600 pb-0.5 print:border-none print:shadow-none print:[&::-webkit-calendar-picker-indicator]:hidden print:text-[10px] print:font-bold"
              />
            </div>
            <p className="font-bold text-slate-800 text-xs mt-0.5 print:text-[10px] print:text-black">Verifikator,</p>
            <div className="h-16 print:h-8"></div>
            <input
              type="text"
              value="Rina Kurniawati"
              readOnly
              className="border-b-2 border-black w-64 text-center font-bold text-xs bg-transparent outline-none pb-1 text-slate-900 print:border-b-2 print:border-black print:text-[10px] print:font-bold cursor-default"
            />
          </div>
        </div>

        <div className="pt-8 text-right print:hidden">
          <p className="text-[10px] text-slate-400 italic">
            * Dokumen verifikasi ini sah dan menjadi bagian tak terpisahkan dari berkas SPM.
          </p>
        </div>
      </div>

      {/* SECTION 5: FOOTER ACTION BUTTONS */}
      <div className="p-6 bg-slate-100 flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={onBack}
          className="px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Batal & Kembali</span>
        </button>

        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all shadow-xs"
              >
                Reset Form
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={(e) => handleSimpanData(e)}
                className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all disabled:opacity-50 shadow-md text-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Data'}</span>
              </button>
            </>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExportMenu(prev => !prev)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-md text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Export Dokumen</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} />
            </button>

            {showExportMenu && (
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-white border border-slate-200 shadow-xl rounded-2xl p-1.5 z-50 animate-in fade-in slide-in-from-bottom-2">
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors text-left"
                >
                  <Printer className="w-4 h-4 text-rose-500" />
                  <span>Cetak PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// PARENT CONTAINER COMPONENT: FormVerifikasi (EXCLUSIVELY ROUTER/CONTAINER)
// =========================================================================
export default function FormVerifikasi({ initialJenis = 'TANPA_SPK', initialItem = null, userRole = 'admin' }) {
  const [viewMode, setViewMode] = useState('list')
  const [jenisDokumen, setJenisDokumen] = useState(initialJenis)
  const [editingItem, setEditingItem] = useState(initialItem)
  const [savedForms, setSavedForms] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeTabFilter, setActiveTabFilter] = useState('ALL')
  const { selectedTahun } = useTahun()

  useEffect(() => {
    if (initialItem) {
      setEditingItem(initialItem)
      const docType = initialItem.jenisDokumen || initialItem.jenis_dokumen || initialJenis || 'TANPA_SPK'
      setJenisDokumen(docType)
      setViewMode('form')
    } else if (initialJenis) {
      setJenisDokumen(initialJenis)
    }
  }, [initialJenis, initialItem])

  const fetchSavedForms = async () => {
    try {
      const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      const res = await axiosInstance.get(`/api/form-verifikasi?tahun=${selectedTahun}`)
      const result = res.data

      if (result.status === 'success' && Array.isArray(result.data)) {
        const mergedMap = new Map()
        localData.forEach(item => {
          if (item && item.id) mergedMap.set(String(item.id), item)
        })
        result.data.forEach(item => {
          if (item && item.id) {
            const existing = mergedMap.get(String(item.id)) || {}
            mergedMap.set(String(item.id), { ...existing, ...item })
          }
        })
        setSavedForms(Array.from(mergedMap.values()))
      } else {
        setSavedForms(localData)
      }
    } catch (err) {
      console.warn('Fetch Form Verifikasi Error, fallback to LocalStorage:', err)
      const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
      setSavedForms(localData)
    }
  }

  useEffect(() => {
    fetchSavedForms()
  }, [selectedTahun])

  const handleBuatBaru = (jenis) => {
    setEditingItem(null)
    setJenisDokumen(jenis)
    setViewMode('form')
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    const docType = item.jenisDokumen || item.jenis_dokumen || 'TANPA_SPK'
    setJenisDokumen(docType)
    setViewMode('form')
  }

  const handleEditItem = (item) => handleEdit(item)

  const handleDeleteItem = async (item) => {
    const confirm = await Swal.fire({
      title: 'Hapus Berkas Verifikasi?',
      text: `Apakah Anda yakin ingin menghapus berkas verifikasi "${item.nomorVerifikasi || item.no_verifikasi || item.id}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    })

    if (confirm.isConfirmed) {
      try {
        const localData = JSON.parse(localStorage.getItem('dataTransaksi')) || []
        const updatedLocal = localData.filter(d => String(d.id) !== String(item.id))
        localStorage.setItem('dataTransaksi', JSON.stringify(updatedLocal))

        await axiosInstance.delete(`/api/form-verifikasi/${item.id}`)

        Swal.fire({
          title: 'Berhasil Dihapus!',
          text: 'Berkas verifikasi telah dihapus.',
          icon: 'success',
          confirmButtonColor: '#2563eb',
          timer: 1500
        })
        fetchSavedForms()
      } catch (err) {
        console.error('Delete Error:', err)
        fetchSavedForms()
      }
    }
  }

  const handleBackToList = () => {
    setEditingItem(null)
    setViewMode('list')
    fetchSavedForms()
  }

  const handleSaveSuccess = () => {
    fetchSavedForms()
    setViewMode('list')
  }

  const filteredForms = savedForms.filter(item => {
    const docType = item.jenisDokumen || item.jenis_dokumen || 'TANPA_SPK'
    const matchesTab = activeTabFilter === 'ALL' || docType === activeTabFilter
    const matchesSearch = (
      (item.nomorVerifikasi || item.no_verifikasi || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.rekanan || item.nama_rekanan || item.nama_pelaksana || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.akun || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    return matchesTab && matchesSearch
  })

  const sortedForms = [...filteredForms].sort((a, b) => {
    const noA = a.no_verifikasi || a.nomorVerifikasi || ''
    const noB = b.no_verifikasi || b.nomorVerifikasi || ''
    return noB.localeCompare(noA, undefined, { numeric: true, sensitivity: 'base' })
  })

  if (viewMode === 'list') {
    return (
      <div className="space-y-6">
        {/* DASHBOARD DAFTAR VERIFIKASI HEADER BANNER */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
              <FileCheck className="w-4 h-4" />
              <span>SISTEM DOKUMEN VERIFIKASI KEUANGAN</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Daftar Verifikasi Dokumen
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Pilih salah satu dari 3 tombol pembuatan di kanan untuk membuat berkas verifikasi baru.
            </p>
          </div>

          {/* 3 TOMBOL PILIHAN LANGSUNG */}
          {userRole !== 'user' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleBuatBaru('TANPA_SPK')}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Tanpa SPK</span>
              </button>

              <button
                type="button"
                onClick={() => handleBuatBaru('KONTRAK')}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Kontrak</span>
              </button>

              <button
                type="button"
                onClick={() => handleBuatBaru('PERJALANAN_DINAS')}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-xs rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Buat Perjalanan Dinas</span>
              </button>
            </div>
          )}
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200 w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari no. verifikasi, rekanan, akun..."
              className="bg-transparent text-xs text-slate-800 outline-none w-full font-medium"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTabFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTabFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Berkas ({savedForms.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('TANPA_SPK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTabFilter === 'TANPA_SPK'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
              }`}
            >
              Tanpa SPK
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('KONTRAK')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTabFilter === 'KONTRAK'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
            >
              Kontrak / SPK
            </button>
            <button
              type="button"
              onClick={() => setActiveTabFilter('PERJALANAN_DINAS')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all whitespace-nowrap ${
                activeTabFilter === 'PERJALANAN_DINAS'
                  ? 'bg-cyan-600 text-white shadow-xs'
                  : 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100'
              }`}
            >
              Perjalanan Dinas
            </button>
          </div>
        </div>

        {/* TABEL RIWAYAT BERKAS VERIFIKASI */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3.5 px-4 text-center w-12">NO</th>
                  <th className="py-3.5 px-4">JENIS DOKUMEN</th>
                  <th className="py-3.5 px-4">NO. VERIFIKASI</th>
                  <th className="py-3.5 px-4">REKANAN / PELAKSANA</th>
                  <th className="py-3.5 px-4 text-right">NILAI KWITANSI</th>
                  <th className="py-3.5 px-4 text-center">TANGGAL</th>
                  <th className="py-3.5 px-4 text-center w-28">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-semibold">
                {sortedForms.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                      Belum ada berkas verifikasi tersimpan.
                    </td>
                  </tr>
                ) : (
                  sortedForms.map((item, idx) => {
                    const docType = item.jenisDokumen || item.jenis_dokumen || 'TANPA_SPK'
                    const rawNilai = item.nilai_kwitansi || item.nilaiVerifikasi || item.nilai || ''
                    const displayNilai = rawNilai ? formatUang(rawNilai) : 'Rp 0'

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 text-center font-mono text-slate-500 font-bold">{idx + 1}</td>
                        <td className="py-3 px-4">
                          {docType === 'KONTRAK' ? (
                            <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-lg text-[10px] font-extrabold uppercase">
                              Kontrak / SPK
                            </span>
                          ) : docType === 'PERJALANAN_DINAS' ? (
                            <span className="px-2.5 py-1 bg-cyan-100 text-cyan-800 rounded-lg text-[10px] font-extrabold uppercase">
                              Perjalanan Dinas
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg text-[10px] font-extrabold uppercase">
                              Tanpa SPK
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {item.nomorVerifikasi || item.no_verifikasi || '-'}
                        </td>
                        <td className="py-3 px-4">
                          {item.rekanan || item.nama_rekanan || item.nama_pelaksana || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          {displayNilai}
                        </td>
                        <td className="py-3 px-4 text-center text-slate-500">
                          {item.tanggalVerifikasi || item.tanggal_verifikasi || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {userRole !== 'user' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleEdit(item)}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                                  title="Edit Berkas"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                                  title="Hapus Form"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="form-container">
      {jenisDokumen === 'TANPA_SPK' ? (
        <FormTanpaSPK
          editingItem={editingItem}
          onBack={handleBackToList}
          onSaveSuccess={handleSaveSuccess}
          userRole={userRole}
          savedForms={savedForms}
        />
      ) : jenisDokumen === 'KONTRAK' ? (
        <FormKontrak
          editingItem={editingItem}
          onBack={handleBackToList}
          onSaveSuccess={handleSaveSuccess}
          userRole={userRole}
          savedForms={savedForms}
        />
      ) : jenisDokumen === 'PERJALANAN_DINAS' ? (
        <FormPerjalananDinas
          editingItem={editingItem}
          onBack={handleBackToList}
          onSaveSuccess={handleSaveSuccess}
          userRole={userRole}
          savedForms={savedForms}
        />
      ) : null}
    </div>
  )
}
