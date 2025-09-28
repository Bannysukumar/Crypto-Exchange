import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import AuthModal from '../components/AuthModal'

const Landing: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authType, setAuthType] = useState<'login' | 'signup'>('login')
  const { currentUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (currentUser) {
      navigate('/dashboard')
    }
  }, [currentUser, navigate])

  const handleGetStarted = () => {
    setAuthType('signup')
    setShowAuthModal(true)
  }

  const handleLogin = () => {
    setAuthType('login')
    setShowAuthModal(true)
  }

  return (
    <>
      {/* Hero Section */}
      <section className="animate-fadeInUp" style={{ 
        padding: '6rem 0', 
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div className="container">
          <h1 style={{ 
            fontSize: '4rem', 
            fontWeight: '800', 
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: '1.2'
          }}>
            🚀 INR ↔ Crypto Platform
          </h1>
          <p style={{ 
            fontSize: '1.4rem', 
            color: 'rgba(255, 255, 255, 0.9)', 
            marginBottom: '3rem', 
            maxWidth: '700px', 
            margin: '0 auto 3rem',
            fontWeight: '500',
            lineHeight: '1.6'
          }}>
            Seamlessly deposit, withdraw, and transfer between INR and cryptocurrencies. 
            Join the future of digital finance with enterprise-grade security.
          </p>
          <div className="animate-fadeInUp" style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '2rem' }}>
            <button 
              onClick={handleGetStarted}
              className="hover-lift"
              style={{
                padding: '1.25rem 2.5rem',
                fontSize: '1.2rem',
                fontWeight: '700',
                background: 'linear-gradient(135deg, #000000 0%, #ffd700 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                boxShadow: '0 15px 35px rgba(255, 215, 0, 0.4)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              🚀 Get Started Free
            </button>
            <button 
              onClick={handleLogin}
              className="hover-lift"
              style={{
                padding: '1.25rem 2.5rem',
                fontSize: '1.2rem',
                fontWeight: '700',
                background: 'rgba(255, 215, 0, 0.1)',
                color: '#ffd700',
                border: '2px solid rgba(255, 215, 0, 0.3)',
                borderRadius: '20px',
                cursor: 'pointer',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              🔑 Login
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="animate-fadeInUp" style={{ padding: '6rem 0' }}>
        <div className="container">
          <h2 style={{ 
            fontSize: '3rem', 
            fontWeight: '800', 
            textAlign: 'center', 
            marginBottom: '4rem',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            ✨ Platform Features
          </h2>
          <div className="grid grid-cols-4" style={{ gap: '2rem' }}>
            <div className="card hover-lift animate-fadeInLeft" style={{ 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🔐</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#ffd700' }}>Secure Wallet</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.1rem', lineHeight: '1.6' }}>Multi-cryptocurrency wallet with BEP-20 support and enterprise-grade security</p>
            </div>
            <div className="card hover-lift animate-fadeInUp" style={{ 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>⚡</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#ffd700' }}>Instant Exchange</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.1rem', lineHeight: '1.6' }}>Real-time INR to crypto conversion with competitive rates</p>
            </div>
            <div className="card hover-lift animate-fadeInUp" style={{ 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>🛡️</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#ffd700' }}>Smart Contracts</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.1rem', lineHeight: '1.6' }}>Sepolia testnet powered secure transactions with full transparency</p>
            </div>
            <div className="card hover-lift animate-fadeInRight" style={{ 
              textAlign: 'center',
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.05) 0%, rgba(255, 215, 0, 0.02) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.2)',
              padding: '2rem'
            }}>
              <div style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>📈</div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1.5rem', color: '#ffd700' }}>Live Prices</h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.1rem', lineHeight: '1.6' }}>Real-time cryptocurrency pricing from multiple exchanges</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section style={{ padding: '4rem 0', background: 'transparent' }}>
        <div className="container">
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem' }}>
            About Our Platform
          </h2>
          <div className="grid grid-cols-2" style={{ gap: '4rem', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Secure & Reliable</h3>
              <p style={{ marginBottom: '2rem', color: '#666', lineHeight: '1.6' }}>
                Built with enterprise-grade security using Firebase Authentication and Firestore database. 
                All transactions are secured and encrypted.
              </p>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Multi-Crypto Support</h3>
              <p style={{ marginBottom: '2rem', color: '#666', lineHeight: '1.6' }}>
                Support for Bitcoin (BTC), USDT (BEP-20), and custom BXC token. 
                Easy conversion between INR and cryptocurrencies.
              </p>
              
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Real-Time Updates</h3>
              <p style={{ color: '#666', lineHeight: '1.6' }}>
                Live price feeds from CoinGecko/Binance APIs. 
                Auto-refresh balances and prices every 60 seconds.
              </p>
            </div>
            <div>
              <div className="grid" style={{ gap: '1rem' }}>
                <div className="card text-center">
                  <h4 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>500+</h4>
                  <p style={{ color: '#666' }}>Active Users</p>
                </div>
                <div className="card text-center">
                  <h4 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>₹10M+</h4>
                  <p style={{ color: '#666' }}>Total Volume</p>
                </div>
                <div className="card text-center">
                  <h4 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#007bff' }}>99.9%</h4>
                  <p style={{ color: '#666' }}>Uptime</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ padding: '4rem 0', background: 'transparent', color: 'white', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            Ready to Start Trading?
          </h2>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
            Join thousands of users who trust our platform for their crypto needs. 
            Start your journey today with zero fees for the first month.
          </p>
          <button 
            onClick={handleGetStarted}
            style={{
              padding: '1rem 2rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: 'white',
              color: '#007bff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Get Started Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: '#333', color: 'white', padding: '3rem 0' }}>
        <div className="container">
          <div className="grid grid-cols-4" style={{ gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ marginBottom: '1rem' }}>CryptoPay</h3>
              <p style={{ color: '#ccc' }}>Your trusted partner in cryptocurrency trading and management.</p>
            </div>
            <div>
              <h4 style={{ marginBottom: '1rem' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#home" style={{ color: '#ccc', textDecoration: 'none' }}>Home</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#features" style={{ color: '#ccc', textDecoration: 'none' }}>Features</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#about" style={{ color: '#ccc', textDecoration: 'none' }}>About</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '1rem' }}>Support</h4>
              <ul style={{ listStyle: 'none' }}>
                <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ color: '#ccc', textDecoration: 'none' }}>Help Center</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ color: '#ccc', textDecoration: 'none' }}>Contact Us</a></li>
                <li style={{ marginBottom: '0.5rem' }}><a href="#" style={{ color: '#ccc', textDecoration: 'none' }}>Privacy Policy</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ marginBottom: '1rem' }}>Connect</h4>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <a href="#" style={{ color: '#ccc', fontSize: '1.5rem', textDecoration: 'none' }}>📱</a>
                <a href="#" style={{ color: '#ccc', fontSize: '1.5rem', textDecoration: 'none' }}>💬</a>
                <a href="#" style={{ color: '#ccc', fontSize: '1.5rem', textDecoration: 'none' }}>🎮</a>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'center', paddingTop: '2rem', borderTop: '1px solid #555' }}>
            <p style={{ color: '#ccc' }}>&copy; 2024 CryptoPay. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          type={authType}
          onClose={() => setShowAuthModal(false)}
          onSwitchType={(type) => setAuthType(type)}
        />
      )}
    </>
  )
}

export default Landing