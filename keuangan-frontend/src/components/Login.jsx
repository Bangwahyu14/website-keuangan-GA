import { useState, useEffect } from 'react'
import { Lock, User, AlertCircle, ArrowRight, ShieldCheck, ArrowLeft, KeyRound, Key } from 'lucide-react'
import { API_BASE_URL } from '../services/api'
import finflowLogo from '../FinFlow_Logo.png'

function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState('login') // 'login' | 'otp' | 'force-setup' | 'force-password-change'
  const [otp, setOtp] = useState('')
  const [tempUserId, setTempUserId] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupSecret, setSetupSecret] = useState('')
  const [setupQrCode, setSetupQrCode] = useState('')
  const [isInitLoading, setIsInitLoading] = useState(false)
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState({ username: '', password: '', otp: '', newPassword: '', confirmPassword: '' })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (step === 'force-setup' && tempUserId) {
      const fetchInitSetup = async () => {
        setIsInitLoading(true)
        setError('')
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/init-setup-2fa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: tempUserId })
          })
          const data = await res.json()
          if (res.ok && data.status === 'success') {
            setSetupSecret(data.secret)
            setSetupQrCode(data.qrCode)
          } else {
            setError(data.message || 'Gagal memuat QR Code Setup 2FA.')
          }
        } catch (err) {
          console.error('Error fetching init-setup-2fa:', err)
          setError('Gagal terhubung ke server untuk setup 2FA.')
        } finally {
          setIsInitLoading(false)
        }
      }
      fetchInitSetup()
    }
  }, [step, tempUserId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Reset errors
    setError('')
    setValidationErrors({ username: '', password: '', otp: '', newPassword: '', confirmPassword: '' })

    let isValid = true
    const newValidationErrors = { username: '', password: '', otp: '', newPassword: '', confirmPassword: '' }

    if (!username.trim()) {
      newValidationErrors.username = 'Username wajib diisi!'
      isValid = false
    }
    if (!password.trim()) {
      newValidationErrors.password = 'Password wajib diisi!'
      isValid = false
    }

    if (!isValid) {
      setValidationErrors(newValidationErrors)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      const result = await response.json()

      // 1. Force Password Change Required
      if (result.status === 'PASSWORD_CHANGE_REQUIRED') {
        setTempUserId(result.userId || result.id)
        setStep('force-password-change')
        return
      }

      // 2. First-Time 2FA Setup Required
      if (result.status === '2FA_SETUP_REQUIRED') {
        setTempUserId(result.userId || result.id)
        setStep('force-setup')
        return
      }

      // 3. Existing 2FA Required
      if (result.status === '2FA_REQUIRED' || result.require2FA) {
        setTempUserId(result.userId || result.id)
        setStep('otp')
        return
      }

      if (response.ok && result.token) {
        onLogin(result.token, result.role, username, result.nama)
        return
      }

      setError(result.message || 'Username atau Password salah!')
    } catch (err) {
      console.error(err)
      setError('Gagal terhubung ke server. Pastikan backend aktif.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForcePasswordChangeSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setValidationErrors({ username: '', password: '', otp: '', newPassword: '', confirmPassword: '' })

    let isValid = true
    const newValidationErrors = { username: '', password: '', otp: '', newPassword: '', confirmPassword: '' }

    if (!newPassword || newPassword.length < 6) {
      newValidationErrors.newPassword = 'Password baru minimal 6 karakter!'
      isValid = false
    }
    if (newPassword !== confirmPassword) {
      newValidationErrors.confirmPassword = 'Konfirmasi password tidak cocok!'
      isValid = false
    }

    if (!isValid) {
      setValidationErrors(newValidationErrors)
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/init-change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: tempUserId,
          newPassword
        }),
      })

      const result = await response.json()

      if (response.ok || result.status === '2FA_SETUP_REQUIRED' || result.status === '2FA_REQUIRED') {
        if (result.status === '2FA_SETUP_REQUIRED') {
          setStep('force-setup')
          return
        }
        if (result.status === '2FA_REQUIRED') {
          setStep('otp')
          return
        }
        if (result.token) {
          onLogin(result.token, result.role, result.username || username, result.nama)
          return
        }
      } else {
        setError(result.message || 'Gagal mengubah password.')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal mengubah password. Terjadi kesalahan pada server.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setValidationErrors({ username: '', password: '', otp: '', newPassword: '', confirmPassword: '' })

    if (!otp.trim()) {
      setValidationErrors(prev => ({ ...prev, otp: 'Kode OTP 6-digit wajib diisi!' }))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: tempUserId,
          otp: otp.trim()
        }),
      })

      const result = await response.json()

      if (response.ok && result.token) {
        onLogin(result.token, result.role, result.username || username, result.nama)
      } else {
        setError(result.message || 'Kode OTP 2FA tidak valid!')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal memverifikasi OTP. Terjadi kesalahan pada server.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleForceSetupSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setValidationErrors({ username: '', password: '', otp: '', newPassword: '', confirmPassword: '' })

    if (!otp.trim()) {
      setValidationErrors(prev => ({ ...prev, otp: 'Kode OTP 6-digit wajib diisi!' }))
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/init-confirm-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: tempUserId,
          secret: setupSecret,
          otp: otp.trim()
        }),
      })

      const result = await response.json()

      if (response.ok && result.token) {
        onLogin(result.token, result.role, result.username || username, result.nama)
      } else {
        setError(result.message || 'Kode OTP 2FA tidak valid!')
      }
    } catch (err) {
      console.error(err)
      setError('Gagal mengonfirmasi setup 2FA. Terjadi kesalahan pada server.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToLogin = () => {
    setStep('login')
    setOtp('')
    setNewPassword('')
    setConfirmPassword('')
    setSetupSecret('')
    setSetupQrCode('')
    setError('')
    setValidationErrors({ username: '', password: '', otp: '', newPassword: '', confirmPassword: '' })
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#FAF9F6] overflow-hidden p-4">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none bg-glow-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[120px] pointer-events-none bg-glow-pulse" style={{ animationDelay: '-3s' }}></div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo and Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex justify-center mb-4">
            <img src={finflowLogo} alt="FinFlow Logo" className="w-16 h-auto drop-shadow-md" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            FinFlow Portal
          </h2>
          <p className="text-sm text-slate-600 mt-2 font-medium">
            Sistem Informasi Keuangan & Monitoring Realisasi
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl shadow-slate-200/50">
          <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {step === 'login' 
              ? 'Sign In Ke Akun Anda' 
              : step === 'force-password-change'
                ? 'Ubah Password Pertama Kali'
                : step === 'otp' 
                  ? 'Verifikasi 2-Faktor (2FA)' 
                  : 'Registrasi 2FA Pertama Kali'}
          </h3>

          {/* STEP 1: Standard Login Form */}
          {step === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Global server error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Masukkan username"
                    className={`w-full bg-slate-50 border text-slate-800 placeholder-slate-400 text-sm rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 ${
                      validationErrors.username
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.username && (
                  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.username}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password"
                    className={`w-full bg-slate-50 border text-slate-800 placeholder-slate-400 text-sm rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 ${
                      validationErrors.password
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.password && (
                  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.password}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Force Password Change Form */}
          {step === 'force-password-change' && (
            <form onSubmit={handleForcePasswordChangeSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 text-center font-medium">
                Demi keamanan, Anda diwajibkan mengganti password bawaan saat pertama kali masuk.
              </p>

              {/* Global server error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* New Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                  Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Masukkan password baru (min 6 karakter)"
                    className={`w-full bg-slate-50 border text-slate-800 placeholder-slate-400 text-sm rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 ${
                      validationErrors.newPassword
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {validationErrors.newPassword && (
                  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.newPassword}
                  </p>
                )}
              </div>

              {/* Confirm Password Input */}
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                  Konfirmasi Password Baru
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ketik ulang password baru"
                    className={`w-full bg-slate-50 border text-slate-800 placeholder-slate-400 text-sm rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 ${
                      validationErrors.confirmPassword
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    disabled={isLoading}
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan & Lanjutkan</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>

              {/* Back to Login Button */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold py-1.5 transition-colors mt-1"
                disabled={isLoading}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal / Kembali ke Login</span>
              </button>
            </form>
          )}

          {/* STEP 3: Existing 2FA Verification Form */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <p className="text-xs text-slate-600 text-center font-medium">
                Masukkan 6-digit kode verifikasi dari aplikasi Authenticator Anda.
              </p>

              {/* Global server error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* OTP Input */}
              <div className="space-y-1.5">
                <label htmlFor="otp" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                  Kode OTP Authenticator
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={`w-full bg-slate-50 border text-slate-800 placeholder-slate-400 text-lg font-mono tracking-widest text-center rounded-xl pl-11 pr-4 py-3 outline-none transition-all duration-200 ${
                      validationErrors.otp
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {validationErrors.otp && (
                  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.otp}
                  </p>
                )}
              </div>

              {/* Verify OTP Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 mt-6"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Verifikasi</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Back to Login Button */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold py-2 transition-colors mt-2"
                disabled={isLoading}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali ke Login</span>
              </button>
            </form>
          )}

          {/* STEP 4: First-Time 2FA Setup Form */}
          {step === 'force-setup' && (
            <form onSubmit={handleForceSetupSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 text-center font-medium">
                Akun Anda belum mengaktifkan 2FA. Pindai QR Code di bawah dengan aplikasi Google Authenticator untuk melanjutkan.
              </p>

              {/* Global server error */}
              {error && (
                <div className="flex items-center gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* QR Code Section */}
              {isInitLoading ? (
                <div className="w-36 h-36 bg-slate-100 animate-pulse rounded-2xl mx-auto my-2 border border-slate-200"></div>
              ) : (
                setupQrCode && (
                  <div className="text-center my-2">
                    <img src={setupQrCode} alt="2FA QR Code" className="w-36 h-36 mx-auto rounded-2xl border border-slate-200 p-2 bg-white shadow-sm" />
                    <p className="text-[10px] text-slate-500 font-mono mt-1 font-bold tracking-wider select-all">
                      Kunci: {setupSecret}
                    </p>
                  </div>
                )
              )}

              {/* OTP Input */}
              <div className="space-y-1">
                <label htmlFor="setupOtp" className="text-xs font-semibold text-slate-600 tracking-wide uppercase">
                  Masukkan 6-Digit OTP untuk Konfirmasi
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4 text-blue-600" />
                  </div>
                  <input
                    id="setupOtp"
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className={`w-full bg-slate-50 border text-slate-800 placeholder-slate-400 text-lg font-mono tracking-widest text-center rounded-xl pl-11 pr-4 py-2.5 outline-none transition-all duration-200 ${
                      validationErrors.otp
                        ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                        : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    disabled={isLoading || isInitLoading}
                    autoFocus
                  />
                </div>
                {validationErrors.otp && (
                  <p className="text-[11px] font-medium text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.otp}
                  </p>
                )}
              </div>

              {/* Confirm & Login Button */}
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-[#1D4ED8] hover:bg-blue-700 text-white font-semibold text-sm rounded-xl py-3 px-4 shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 mt-4"
                disabled={isLoading || isInitLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mengonfirmasi...</span>
                  </>
                ) : (
                  <>
                    <span>Konfirmasi & Masuk</span>
                    <ShieldCheck className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Back to Login Button */}
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold py-1.5 transition-colors mt-1"
                disabled={isLoading || isInitLoading}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Batal / Kembali ke Login</span>
              </button>
            </form>
          )}
        </div>

      </div>
    </div>
  )
}

export default Login
