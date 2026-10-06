import React, { useState } from 'react'
import { ShieldCheck, QrCode, Lock, CheckCircle2, AlertCircle, Copy, Check, KeyRound } from 'lucide-react'
import axiosInstance from '../services/axiosInstance'

function Setup2FA({ onSuccess }) {
  const [step, setStep] = useState('idle') // 'idle' | 'qr' | 'active'
  const [secret, setSecret] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [otp, setOtp] = useState('')
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleGenerate2FA = async () => {
    setIsLoading(true)
    setError('')
    setSuccessMsg('')
    try {
      const response = await axiosInstance.post('/api/auth/setup-2fa')
      if (response.data && response.data.status === 'success') {
        setSecret(response.data.secret)
        setQrCode(response.data.qrCode)
        setStep('qr')
      } else {
        setError(response.data.message || 'Gagal membuat QR Code 2FA.')
      }
    } catch (err) {
      console.error('Error generating 2FA QR code:', err)
      setError(err.response?.data?.message || 'Gagal terhubung ke server untuk setup 2FA.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm2FA = async (e) => {
    e.preventDefault()
    if (!otp.trim()) {
      setError('Masukkan 6-digit kode OTP terlebih dahulu!')
      return
    }

    setIsLoading(true)
    setError('')
    try {
      const response = await axiosInstance.post('/api/auth/confirm-2fa', {
        otp: otp.trim(),
        secret
      })

      if (response.data && response.data.status === 'success') {
        setStep('active')
        setSuccessMsg('Autentikasi 2-Faktor (2FA) berhasil diaktifkan untuk akun Anda!')
        if (typeof onSuccess === 'function') {
          onSuccess()
        }
      } else {
        setError(response.data.message || 'Kode OTP tidak valid!')
      }
    } catch (err) {
      console.error('Error confirming 2FA:', err)
      setError(err.response?.data?.message || 'Kode OTP tidak valid atau terjadi kesalahan server.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm">
      <div className="flex items-center gap-3 pb-5 border-b border-slate-100">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-blue-600">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">Autentikasi 2-Faktor (Google Authenticator)</h3>
          <p className="text-xs text-slate-500 font-medium">
            Tingkatkan keamanan akun Anda dengan menambahkan verifikasi kode 2-Langkah.
          </p>
        </div>
      </div>

      <div className="mt-6">
        {/* Error Alert */}
        {error && (
          <div className="mb-5 flex items-center gap-2.5 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-5 flex items-center gap-2.5 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Step 1: IDLE / Initial State */}
        {step === 'idle' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold rounded-full">
                <Lock className="w-3 h-3 text-amber-700" />
                <span>2FA Belum Aktif</span>
              </div>
              <h4 className="text-sm font-bold text-slate-800 mt-2">Aktifkan Pengaman 2-Langkah</h4>
              <p className="text-xs text-slate-600">
                Pindai QR Code dengan aplikasi Google Authenticator untuk mendapatkan kode OTP setiap kali masuk.
              </p>
            </div>
            <button
              onClick={handleGenerate2FA}
              disabled={isLoading}
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap"
            >
              {isLoading ? (
                <span>Memuat...</span>
              ) : (
                <>
                  <QrCode className="w-4 h-4" />
                  <span>Aktifkan 2FA Sekarang</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: QR Code & Verification Form */}
        {step === 'qr' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* QR Code Display */}
              <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  1. Pindai QR Code Ini
                </p>
                {qrCode ? (
                  <img src={qrCode} alt="2FA QR Code" className="w-44 h-44 rounded-xl border border-slate-200 p-2 bg-white shadow-sm" />
                ) : (
                  <div className="w-44 h-44 bg-slate-200 animate-pulse rounded-xl"></div>
                )}
                <p className="text-[11px] text-slate-500 mt-3 max-w-xs font-medium">
                  Buka Google Authenticator di ponsel Anda, pilih <strong>+</strong> lalu <strong>Pindai kode QR</strong>.
                </p>
              </div>

              {/* Manual Key & Verification Form */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Atau Masukkan Kunci Manual:
                  </p>
                  <div className="flex items-center gap-2 bg-slate-100 border border-slate-300 p-2.5 rounded-xl font-mono text-xs text-slate-800 font-bold justify-between">
                    <span className="truncate tracking-wider">{secret}</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600 flex items-center gap-1 text-[11px]"
                      title="Salin Kunci"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleConfirm2FA} className="space-y-4 pt-2 border-t border-slate-200">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      2. Masukkan 6-Digit Kode OTP:
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <KeyRound className="w-4 h-4 text-blue-600" />
                      </div>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full bg-slate-50 border border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-800 text-lg font-mono tracking-widest text-center rounded-xl pl-11 pr-4 py-2.5 outline-none transition-all"
                        disabled={isLoading}
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white text-xs font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isLoading ? <span>Memverifikasi...</span> : <span>Konfirmasi & Aktifkan 2FA</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep('idle')}
                      disabled={isLoading}
                      className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: ACTIVE State */}
        {step === 'active' && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-emerald-50/60 border border-emerald-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl text-emerald-700 mt-0.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold rounded-full">
                  <span>Status: 2FA Aktif</span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 mt-2">Akun Anda Dilindungi Google Authenticator</h4>
                <p className="text-xs text-slate-600 mt-0.5">
                  Setiap kali melakukan login, Anda akan dimintai kode verifikasi 6-digit dari perangkat Anda.
                </p>
              </div>
            </div>

            <button
              onClick={handleGenerate2FA}
              disabled={isLoading}
              className="w-full md:w-auto px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all shadow-xs whitespace-nowrap"
            >
              Reset / Generasi Ulang 2FA
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Setup2FA
