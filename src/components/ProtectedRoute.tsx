import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        <i className="fas fa-spinner fa-spin" style={{ marginRight: '1rem', fontSize: '2rem' }}></i>
        Loading...
      </div>
    )
  }

  return currentUser ? <>{children}</> : <Navigate to="/" replace />
}

export default ProtectedRoute
