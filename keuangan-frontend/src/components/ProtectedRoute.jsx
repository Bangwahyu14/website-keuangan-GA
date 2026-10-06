import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * ProtectedRoute Component
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Komponen/rute anak
 * @param {string[]} props.allowedRoles - Array role yang diizinkan (misal: ['super_admin'], ['admin', 'user'], ['verifikator'])
 * @param {string} [props.redirectToIfUnauthenticated='/login']
 * @param {string} [props.redirectToIfUnauthorized='/dashboard']
 */
function ProtectedRoute({
  children,
  allowedRoles = [],
  redirectToIfUnauthenticated = '/login',
  redirectToIfUnauthorized = '/dashboard'
}) {
  // 1. Ambil state user & isAuthenticated dari hook
  const { user, isAuthenticated } = useAuth();

  // 2. Jika belum login, arahkan ke halaman /login
  if (!isAuthenticated) {
    return <Navigate to={redirectToIfUnauthenticated} replace />;
  }

  // 3. Jika sudah login tapi role tidak sesuai
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const userRole = (user?.role || '').toLowerCase();
    const isAllowed = allowedRoles.some((role) => {
      const r = role.toLowerCase();
      return (
        r === userRole ||
        (r === 'super_admin' && userRole === 'superadmin') ||
        (r === 'superadmin' && userRole === 'super_admin')
      );
    });

    if (!isAllowed) {
      return <Navigate to={redirectToIfUnauthorized} replace />;
    }
  }

  // 4. Jika lolos semua pengecekan, render children
  return children;
}

export default ProtectedRoute;
