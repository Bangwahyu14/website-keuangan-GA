import { useState, useEffect } from 'react'

/**
 * Custom hook to retrieve current authentication state and user details.
 * Reads token, role, username, and nama from localStorage.
 */
export function useAuth() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '')
  const [role, setRole] = useState(() => localStorage.getItem('role') || '')
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '')
  const [nama, setNama] = useState(() => localStorage.getItem('nama') || '')

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem('token') || '')
      setRole(localStorage.getItem('role') || '')
      setUsername(localStorage.getItem('username') || '')
      setNama(localStorage.getItem('nama') || '')
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const isAuthenticated = Boolean(token)

  return {
    isAuthenticated,
    user: {
      username,
      role,
      nama
    }
  }
}

export default useAuth
