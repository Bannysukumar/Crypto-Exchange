import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

interface AuthModalProps {
  type: 'login' | 'signup'
  onClose: () => void
  onSwitchType: (type: 'login' | 'signup') => void
}

const AuthModal: React.FC<AuthModalProps> = ({ type, onClose, onSwitchType }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, signup } = useAuth()

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email || !password) {
      toast.error('Please fill in all fields')
      return
    }

    if (type === 'signup') {
      if (password !== confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      if (password.length < 6) {
        toast.error('Password must be at least 6 characters')
        return
      }
    }

    try {
      setLoading(true)
      
      if (type === 'login') {
        await login(email, password)
        toast.success('Welcome back!')
      } else {
        await signup(email, password)
        toast.success('Account created successfully!')
      }
      
      onClose()
    } catch (error: any) {
      console.error('Auth error:', error)
      toast.error(error.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #eee' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '0.5rem' }}>
            {type === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ textAlign: 'center', color: '#666' }}>
            {type === 'login' 
              ? 'Sign in to access your crypto wallet' 
              : 'Join thousands of users trading crypto'
            }
          </p>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'none',
              border: 'none',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ width: '100%' }}
              />
            </div>

            {type === 'signup' && (
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  style={{ width: '100%' }}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: '600',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? 'Processing...' : (type === 'login' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <p style={{ color: '#666' }}>
              {type === 'login' ? "Don't have an account?" : 'Already have an account?'}
              <button
                onClick={() => onSwitchType(type === 'login' ? 'signup' : 'login')}
                style={{
                  marginLeft: '0.5rem',
                  color: '#007bff',
                  background: 'none',
                  border: 'none',
                  textDecoration: 'underline',
                  cursor: 'pointer'
                }}
              >
                {type === 'login' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthModal