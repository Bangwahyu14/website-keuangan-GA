import { useState, useEffect } from 'react'
import {
  FileText,
  Building2,
  Coins,
  Calendar,
  Hash,
  Save,
  RefreshCw,
  Download,
  Printer,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Tag,
  Receipt,
  FileCheck,
  CreditCard
} from 'lucide-react'
import Swal from 'sweetalert2'
import * as XLSX from 'xlsx'

function RincianSpmSp2d({ dataVerifikasi }) {
  // Bagian 1 & 2: Terisi otomatis dari Verifikasi tapi tetap bisa diedit
  const [dataDasar, setDataDasar] = useState({
    rekanan: dataVerifikasi?.rekanan || dataVerifikasi?.nama_rekanan || dataVerifikasi?.nama_pelaksana || '',
    kegiatan: dataVerifikasi?.kegiatan || dataVerifikasi?.nama_kegiatan || dataVerifikasi?.keterangan || '',
    nilai: dataVerifikasi?.nilai || dataVerifikasi?.nilai_kwitansi || ''
  })

  // Bagian 3 & 4: Kosong untuk diisi Admin
  const [dataAkun, setDataAkun] = useState({
    kro: '',
    ro: '',
    nomorAkun: '',
    kegiatanDetil: ''
  })

  const [dataSpm, setDataSpm] = useState({
    tanggal: '',
    nomor: '',
    nilai: ''
  })

  const [dataSp2d, setDataSp2d] = useState({
    tanggal: '',
    nomor: '',
    nilai: ''
  })

  // Sync dataDasar if props change
  useEffect(() => {
    if (dataVerifikasi) {
      setDataDasar({
        rekanan: dataVerifikasi.rekanan || dataVerifikasi.nama_rekanan || dataVerifikasi.nama_pelaksana || '',
        kegiatan: dataVerifikasi.kegiatan || dataVerifikasi.nama_kegiatan || dataVerifikasi.keterangan || '',
        nilai: dataVerifikasi.nilai || dataVerifikasi.nilai_kwitansi || ''
      })
    }
  }, [dataVerifikasi])

  // 4-Step strict monetary value sanitizer
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

  // Formatting helpers
  const formatRupiah = (value) => {
    const numberString = cleanNilaiString(value)
    if (!numberString) return ''
    return new Intl.NumberFormat('id-ID').format(numberString)
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

  // Handle caret-preserving monetary changes
  const handleNominalChange = (e, updater, currentObj, fieldName) => {
    const input = e.target
    const cursorPosition = input.selectionStart
    const originalLength = input.value.length

    const numberString = cleanNilaiString(input.value)
    updater({ ...currentObj, [fieldName]: numberString })

    setTimeout(() => {
      const formattedValue = formatRupiah(numberString)
      const newLength = formattedValue.length
      const lengthDiff = newLength - originalLength
      let newCursorPos = cursorPosition + lengthDiff
      if (newCursorPos < 0) newCursorPos = 0
      input.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Handle Reset Form
  const handleReset = () => {
    setDataDasar({
      rekanan: dataVerifikasi?.rekanan || dataVerifikasi?.nama_rekanan || dataVerifikasi?.nama_pelaksana || '',
      kegiatan: dataVerifikasi?.kegiatan || dataVerifikasi?.nama_kegiatan || dataVerifikasi?.keterangan || '',
      nilai: dataVerifikasi?.nilai || dataVerifikasi?.nilai_kwitansi || ''
    })
    setDataAkun({ kro: '', ro: '', nomorAkun: '', kegiatanDetil: '' })
    setDataSpm({ tanggal: '', nomor: '', nilai: '' })
    setDataSp2d({ tanggal: '', nomor: '', nilai: '' })
  }

  // Handle Save Form Data
  const handleSave = (e) => {
    if (e) e.preventDefault()
    Swal.fire({
      title: 'Berhasil Disimpan!',
      text: 'Data Rincian SPM dan SP2D berhasil diperbarui.',
      icon: 'success',
      confirmButtonColor: '#2563eb'
    })
  }

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const dataRows = [
        ['RINCIAN DOKUMEN SPM DAN SP2D'],
        [],
        ['BAGIAN 1 & 2: INFORMASI DASAR VERIFIKASI'],
        ['Nama Rekanan / Pelaksana', ':', dataDasar.rekanan || ''],
        ['Nama Kegiatan / Uraian', ':', dataDasar.kegiatan || ''],
        ['Nilai Kwitansi / Verifikasi', ':', dataDasar.nilai ? formatUang(dataDasar.nilai) : ''],
        [],
        ['BAGIAN 3: KLASIFIKASI KODE AKUN & KEGIATAN'],
        ['Kode KRO', ':', dataAkun.kro || ''],
        ['Kode RO', ':', dataAkun.ro || ''],
        ['Nomor Akun (6 Digit)', ':', dataAkun.nomorAkun || ''],
        ['Uraian Kegiatan Detil', ':', dataAkun.kegiatanDetil || ''],
        [],
        ['BAGIAN 4: DATA SPM & SP2D'],
        ['Tanggal SPM', ':', dataSpm.tanggal || ''],
        ['Nomor SPM', ':', dataSpm.nomor || ''],
        ['Nilai SPM', ':', dataSpm.nilai ? formatUang(dataSpm.nilai) : ''],
        ['Tanggal SP2D', ':', dataSp2d.tanggal || ''],
        ['Nomor SP2D', ':', dataSp2d.nomor || ''],
        ['Nilai SP2D', ':', dataSp2d.nilai ? formatUang(dataSp2d.nilai) : '']
      ]

      const ws = XLSX.utils.aoa_to_sheet(dataRows)
      ws['!cols'] = [{ wch: 30 }, { wch: 5 }, { wch: 45 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Rincian SPM SP2D')
      XLSX.writeFile(wb, 'Rincian_SPM_SP2D.xlsx')

      Swal.fire({
        title: 'Berhasil Unduh!',
        text: 'File Excel Rincian_SPM_SP2D.xlsx telah diunduh.',
        icon: 'success',
        confirmButtonColor: '#16a34a',
        timer: 2000,
        showConfirmButton: false
      })
    } catch (err) {
      console.error(err)
      Swal.fire({
        title: 'Gagal Unduh',
        text: 'Terjadi kesalahan saat memproses file Excel.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      })
    }
  }

  return (
    <div className="space-y-6 pb-12 print:w-full print:p-0 print:m-0">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 shadow-xs">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Modul Pencatatan Realisasi SPM</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Rincian SPM dan SP2D
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Integrasi otomatis data verifikasi (Bagian 1 & 2) serta pengisian akun & penerbitan dokumen SPM/SP2D (Bagian 3 & 4).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all flex items-center gap-2 border border-slate-300"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Form</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 shadow-md"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak PDF</span>
          </button>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* ========================================================================= */}
        {/* BAGIAN 1 & 2: DATA DASAR INFORMASI VERIFIKASI (AUTOMATICALLY PRE-FILLED)  */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                1
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Bagian 1 & 2: Informasi Dasar & Nilai Verifikasi</span>
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    Terisi Otomatis
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Data otomatis ditarik dari hasil Form Verifikasi, namun tetap dapat disesuaikan jika diperlukan.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
            {/* Field: Nama Rekanan / Pelaksana */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Nama Rekanan / Pelaksana</span>
              </label>
              <input
                type="text"
                value={dataDasar.rekanan}
                onChange={e => setDataDasar({ ...dataDasar, rekanan: e.target.value })}
                placeholder="Ketik nama rekanan atau pelaksana..."
                className="w-full bg-slate-50 border border-slate-300 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            {/* Field: Nilai Kwitansi / Verifikasi */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-blue-600" />
                <span>Nilai Kwitansi / Verifikasi</span>
              </label>
              <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2.5 bg-slate-50 focus-within:border-blue-600 focus-within:bg-white transition-all">
                <span className="text-xs font-bold text-slate-500 mr-2">Rp</span>
                <input
                  type="text"
                  value={formatRupiah(dataDasar.nilai)}
                  onChange={e => handleNominalChange(e, setDataDasar, dataDasar, 'nilai')}
                  placeholder="0"
                  className="w-full bg-transparent text-xs font-black font-mono text-blue-900 outline-none"
                />
              </div>
            </div>

            {/* Field: Nama Kegiatan / Uraian (Full Width) */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Nama Kegiatan / Uraian Acara</span>
              </label>
              <textarea
                value={dataDasar.kegiatan}
                onChange={e => setDataDasar({ ...dataDasar, kegiatan: e.target.value })}
                placeholder="Ketik nama kegiatan atau uraian belanja..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-blue-600 focus:bg-white transition-all resize-y"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN 3: KLASIFIKASI KODE AKUN & KEGIATAN (DIISI ADMIN)                 */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white font-black text-sm flex items-center justify-center shadow-xs">
                3
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Bagian 3: Rincian Klasifikasi Kode Akun & Kegiatan</span>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    Input Admin
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Lengkapi rincian kode KRO, RO, nomor akun 6 digit, dan uraian detil kegiatan.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1">
            {/* Field: Kode KRO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                <span>Kode KRO</span>
              </label>
              <input
                type="text"
                value={dataAkun.kro}
                onChange={e => setDataAkun({ ...dataAkun, kro: e.target.value })}
                placeholder="Misal: 001"
                className="w-full bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Field: Kode RO */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>Kode RO</span>
              </label>
              <input
                type="text"
                value={dataAkun.ro}
                onChange={e => setDataAkun({ ...dataAkun, ro: e.target.value })}
                placeholder="Misal: 001.A"
                className="w-full bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Field: Nomor Akun (6 Digit) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-600" />
                <span>Nomor Akun (6 Digit)</span>
              </label>
              <input
                type="text"
                value={dataAkun.nomorAkun}
                onChange={e => setDataAkun({ ...dataAkun, nomorAkun: e.target.value })}
                placeholder="Misal: 521211"
                className="w-full bg-slate-50 border border-slate-300 text-xs font-mono font-bold text-amber-800 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>

            {/* Field: Uraian Kegiatan Detil (Full Width) */}
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-amber-600" />
                <span>Uraian Kegiatan Detil</span>
              </label>
              <input
                type="text"
                value={dataAkun.kegiatanDetil}
                onChange={e => setDataAkun({ ...dataAkun, kegiatanDetil: e.target.value })}
                placeholder="Ketik rincian uraian kegiatan detil..."
                className="w-full bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-900 rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAGIAN 4: DATA SURAT PERINTAH MEMBAYAR (SPM) & SP2D (DIISI ADMIN)         */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shadow-xs">
                4
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                  <span>Bagian 4: Data Dokumen Surat Perintah Membayar (SPM) & SP2D</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    Input Admin
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Isikan tanggal penerbitan, nomor dokumen resmi, dan nominal realisasi SPM dan SP2D.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-1">
            {/* SUB-BLOCK: DATA SPM */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <FileText className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Surat Perintah Membayar (SPM)
                </h4>
              </div>

              {/* Tanggal SPM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tanggal SPM</span>
                </label>
                <input
                  type="date"
                  value={dataSpm.tanggal}
                  onChange={e => setDataSpm({ ...dataSpm, tanggal: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-2 outline-none focus:border-emerald-600 transition-all"
                />
              </div>

              {/* Nomor SPM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nomor SPM</span>
                </label>
                <input
                  type="text"
                  value={dataSpm.nomor}
                  onChange={e => setDataSpm({ ...dataSpm, nomor: e.target.value })}
                  placeholder="Misal: 00123/SPM/2026"
                  className="w-full bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 rounded-xl px-3.5 py-2 outline-none focus:border-emerald-600 transition-all"
                />
              </div>

              {/* Nilai SPM */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nilai SPM</span>
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2 bg-white focus-within:border-emerald-600 transition-all">
                  <span className="text-xs font-bold text-slate-500 mr-2">Rp</span>
                  <input
                    type="text"
                    value={formatRupiah(dataSpm.nilai)}
                    onChange={e => handleNominalChange(e, setDataSpm, dataSpm, 'nilai')}
                    placeholder="0"
                    className="w-full bg-transparent text-xs font-black font-mono text-emerald-900 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* SUB-BLOCK: DATA SP2D */}
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                  Surat Perintah Pencairan Dana (SP2D)
                </h4>
              </div>

              {/* Tanggal SP2D */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Tanggal SP2D</span>
                </label>
                <input
                  type="date"
                  value={dataSp2d.tanggal}
                  onChange={e => setDataSp2d({ ...dataSp2d, tanggal: e.target.value })}
                  className="w-full bg-white border border-slate-300 text-xs font-bold text-slate-900 rounded-xl px-3.5 py-2 outline-none focus:border-blue-600 transition-all"
                />
              </div>

              {/* Nomor SP2D */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nomor SP2D</span>
                </label>
                <input
                  type="text"
                  value={dataSp2d.nomor}
                  onChange={e => setDataSp2d({ ...dataSp2d, nomor: e.target.value })}
                  placeholder="Misal: 26019827391823"
                  className="w-full bg-white border border-slate-300 text-xs font-mono font-bold text-slate-900 rounded-xl px-3.5 py-2 outline-none focus:border-blue-600 transition-all"
                />
              </div>

              {/* Nilai SP2D */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-slate-500" />
                  <span>Nilai SP2D</span>
                </label>
                <div className="flex items-center border border-slate-300 rounded-xl px-3.5 py-2 bg-white focus-within:border-blue-600 transition-all">
                  <span className="text-xs font-bold text-slate-500 mr-2">Rp</span>
                  <input
                    type="text"
                    value={formatRupiah(dataSp2d.nilai)}
                    onChange={e => handleNominalChange(e, setDataSp2d, dataSp2d, 'nilai')}
                    placeholder="0"
                    className="w-full bg-transparent text-xs font-black font-mono text-blue-900 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Action Buttons */}
        <div className="p-6 bg-slate-100 rounded-3xl flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2.5 bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition-all flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset Data</span>
          </button>

          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md text-xs hover:scale-[1.01] active:scale-[0.99]"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Data Rincian SPM & SP2D</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default RincianSpmSp2d
