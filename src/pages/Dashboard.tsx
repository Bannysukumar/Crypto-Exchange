import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { useCryptoPrices } from '../contexts/CryptoPriceContext'

const Dashboard: React.FC = () => {
  const [inrToCrypto, setInrToCrypto] = useState({ amount: '', currency: 'BTC' })
  const [cryptoToInr, setCryptoToInr] = useState({ amount: '', currency: 'BTC' })
  
  const { userProfile, refreshUserProfile } = useAuth()
  const { account, isConnected, connectWallet, checkDirectDepositsToContract } = useWeb3()
  const { prices, convertToINR, convertFromINR } = useCryptoPrices()
  const navigate = useNavigate()

  useEffect(() => {
    const handleBalanceUpdate = () => {
      refreshUserProfile()
    }

    window.addEventListener('balanceUpdated', handleBalanceUpdate)
    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate)
    }
  }, [refreshUserProfile])

  // Check for direct deposits and withdrawals when dashboard loads
  useEffect(() => {
    if (isConnected && account) {
      // Check for direct deposits and withdrawals after a short delay
      const timer = setTimeout(() => {
        checkDirectDepositsToContract()
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, account, checkDirectDepositsToContract])

  // Auto-refresh balances every 30 seconds when connected
  useEffect(() => {
    if (isConnected && account) {
      const interval = setInterval(() => {
        checkDirectDepositsToContract()
        refreshUserProfile()
      }, 30000) // Check every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [isConnected, account, checkDirectDepositsToContract, refreshUserProfile])

  const getConversionResult = (type: 'inr-to-crypto' | 'crypto-to-inr') => {
    if (type === 'inr-to-crypto') {
      const amount = parseFloat(inrToCrypto.amount) || 0
      if (amount > 0) {
        const cryptoAmount = convertFromINR(amount, inrToCrypto.currency as keyof typeof prices)
        return `≈ ${cryptoAmount.toFixed(8)} ${inrToCrypto.currency}`
      }
    } else {
      const amount = parseFloat(cryptoToInr.amount) || 0
      if (amount > 0) {
        const inrAmount = convertToINR(amount, cryptoToInr.currency as keyof typeof prices)
        return `≈ ₹${inrAmount.toFixed(2)}`
      }
    }
    return '₹0.00'
  }

  const quickActions = [
    { title: 'Deposit Money', description: 'Add INR or crypto to your wallet', path: '/deposit' },
    { title: 'Withdraw Funds', description: 'Convert and withdraw to bank or wallet', path: '/withdraw' },
    { title: 'Send Money', description: 'Transfer to other users instantly', path: '/send' },
    { title: 'View History', description: 'Track all your transactions', path: '/history' }
  ]

  if (!userProfile) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p>Loading your dashboard...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Welcome back! 👋
            </h1>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '1.1rem' }}>
              Here's your crypto portfolio overview
            </p>
            </div>
            
            {/* Wallet Connection Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.9rem',
                fontWeight: '500',
                background: isConnected ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)',
                color: isConnected ? '#ffd700' : '#ff6b6b',
                border: `1px solid ${isConnected ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'}`
              }}>
                {isConnected ? `Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Wallet Disconnected'}
              </div>
              
              {!isConnected && (
                <button 
                  onClick={connectWallet} 
                  className="hover-lift"
                  style={{ 
                    background: 'linear-gradient(135deg, #000000 0%, #ffd700 100%)', 
                    color: 'white', 
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                    fontWeight: '600',
                    boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
                  }}
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Real-time Activity Banner */}
        {isConnected && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.05) 100%)',
            border: '1px solid rgba(0, 123, 255, 0.3)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#28a745',
              animation: 'pulse 2s infinite'
            }}></div>
            <div>
              <p style={{ margin: 0, fontWeight: '600', color: '#007bff' }}>
                🔄 Real-time Monitoring Active
              </p>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                Automatically detecting deposits and withdrawals every 30 seconds
              </p>
            </div>
          </div>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-4" style={{ gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="card hover-lift" style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>INR Balance</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffd700' }}>
              ₹{userProfile.inrBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>Available for trading</p>
          </div>

          <div className="card hover-lift" style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Bitcoin</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffd700' }}>
              {userProfile.cryptoBalances.BTC.toFixed(8)}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
              ≈ ₹{convertToINR(userProfile.cryptoBalances.BTC, 'BTC').toLocaleString('en-IN')}
            </p>
          </div>

          <div className="card hover-lift" style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>USDT</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffd700' }}>
              {userProfile.cryptoBalances.USDT.toFixed(2)}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
              ≈ ₹{convertToINR(userProfile.cryptoBalances.USDT, 'USDT').toLocaleString('en-IN')}
            </p>
          </div>

          <div className="card hover-lift" style={{
            background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
            border: '1px solid rgba(255, 215, 0, 0.3)'
          }}>
            <h3 style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>BXC Token</h3>
            <p style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#ffd700' }}>
              {userProfile.cryptoBalances.BXC.toFixed(2)}
            </p>
            <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.8rem' }}>
              ≈ ₹{convertToINR(userProfile.cryptoBalances.BXC, 'BXC').toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3" style={{ gap: '2rem' }}>
          {/* Conversion Tools */}
          <div style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* INR to Crypto Converter */}
            <div className="card">
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>INR to Crypto Converter</h3>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Amount (INR)</label>
                  <input
                    type="number"
                    value={inrToCrypto.amount}
                    onChange={(e) => setInrToCrypto(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter INR amount"
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Convert to</label>
                  <select
                    value={inrToCrypto.currency}
                    onChange={(e) => setInrToCrypto(prev => ({ ...prev, currency: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="USDT">USDT</option>
                    <option value="BXC">BXC Token</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>You will receive</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#007bff' }}>{getConversionResult('inr-to-crypto')}</p>
                </div>
              </div>
            </div>

            {/* Crypto to INR Converter */}
            <div className="card">
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Crypto to INR Converter</h3>
              </div>
              <div className="grid grid-cols-2" style={{ gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Cryptocurrency</label>
                  <select
                    value={cryptoToInr.currency}
                    onChange={(e) => setCryptoToInr(prev => ({ ...prev, currency: e.target.value }))}
                    style={{ width: '100%' }}
                  >
                    <option value="BTC">Bitcoin (BTC)</option>
                    <option value="USDT">USDT</option>
                    <option value="BXC">BXC Token</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Amount</label>
                  <input
                    type="number"
                    value={cryptoToInr.amount}
                    onChange={(e) => setCryptoToInr(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="Enter crypto amount"
                    step="0.00000001"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>You will receive</p>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#28a745' }}>{getConversionResult('crypto-to-inr')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="card">
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Quick Actions</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => navigate(action.path)}
                    style={{
                      width: '100%',
                      padding: '1rem',
                      textAlign: 'left',
                      background: 'none',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'none'
                    }}
                  >
                    <h4 style={{ fontWeight: '600', color: '#333', margin: 0 }}>
                      {action.title}
                    </h4>
                    <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>{action.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Prices */}
            <div className="card">
              <div style={{ borderBottom: '1px solid #eee', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>Live Prices</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {Object.entries(prices).map(([crypto, price]) => (
                  <div key={crypto} style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontWeight: '600', margin: 0 }}>{crypto}</p>
                      <p style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}>
                        {crypto === 'BTC' ? 'Bitcoin' : crypto === 'USDT' ? 'Tether USD' : 'BXC Token'}
                      </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontWeight: 'bold', margin: 0 }}>
                        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: '#28a745', margin: 0 }}>+0.5%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard