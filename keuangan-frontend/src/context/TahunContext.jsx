import React, { createContext, useState, useEffect, useContext } from 'react'

const TahunContext = createContext()

export function TahunProvider({ children }) {
  // 1. Inisialisasi state langsung dari localStorage dengan fallback default '2026'
  const [selectedTahun, setSelectedTahun] = useState(() => {
    const savedTahun = localStorage.getItem('tahunAnggaran')
    return savedTahun || '2026'
  })

  // 2. Simpan nilai terbaru ke localStorage setiap kali state selectedTahun mengalami perubahan
  useEffect(() => {
    if (selectedTahun) {
      localStorage.setItem('tahunAnggaran', selectedTahun)
    }
  }, [selectedTahun])

  return (
    <TahunContext.Provider value={{ selectedTahun, setSelectedTahun }}>
      {children}
    </TahunContext.Provider>
  )
}

export function useTahun() {
  const context = useContext(TahunContext)
  if (!context) {
    throw new Error('useTahun harus digunakan di dalam <TahunProvider>')
  }
  return context
}
