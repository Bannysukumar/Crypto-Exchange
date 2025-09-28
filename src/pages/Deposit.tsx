import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { TransactionService, Transaction } from '../services/transactions'
import { cashfreeManager } from '../services/cashfree'
import { CONTRACT_CONFIG } from '../config/contracts'
import toast from 'react-hot-toast'

const Deposit: React.FC = () => {
  const [inrAmount, setInrAmount] = useState('')
  const [recentDeposits, setRecentDeposits] = useState<Transaction[]>([])
  const [recentCryptoDeposits, setRecentCryptoDeposits] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [depositsLoading, setDepositsLoading] = useState(true)
  const [depositAddresses, setDepositAddresses] = useState({
    btc: 'BTC deposits not supported on Sepolia',
    usdt: '',
    bxc: ''
  })

  const { currentUser, userProfile } = useAuth()
  const { refreshAllBalances, checkDirectDepositsToContract, detectTransactionByHash } = useWeb3()

  const navigate = useNavigate()

  // Set deposit addresses from contract configuration
  useEffect(() => {
    const contractAddr = CONTRACT_CONFIG?.contracts?.cryptoWallet || ''
    if (contractAddr) {
      setDepositAddresses({
        btc: 'BTC deposits not supported on Sepolia',
        usdt: contractAddr,
        bxc: contractAddr
      })
    }
  }, [])

  // Copy address to clipboard
  const copyAddress = async (address: string, currency: string) => {
    try {
      await navigator.clipboard.writeText(address)
      toast.success(`${currency} address copied to clipboard!`)
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = address
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      toast.success(`${currency} address copied to clipboard!`)
    }
  }

  // Refresh crypto balances
  const refreshCryptoBalances = async () => {
    try {
      toast.loading('Refreshing balances...', { id: 'refresh-balances' })
      await refreshAllBalances()
      await checkDirectDepositsToContract()
      await loadRecentDeposits()
      await loadRecentCryptoDeposits()
      toast.dismiss('refresh-balances')
      toast.success('Balances refreshed!')
    } catch (error) {
      console.error('Error refreshing balances:', error)
      toast.dismiss('refresh-balances')
      toast.error('Failed to refresh balances')
    }
  }

  const loadRecentDeposits = useCallback(async () => {
    if (!currentUser) return

    try {
      setDepositsLoading(true)
      const deposits = await TransactionService.getUserTransactions(currentUser.uid, 'deposit', 5)
      const inrDeposits = deposits.filter(d => d.currency === 'INR')
      const cryptoDeposits = deposits.filter(d => d.currency !== 'INR')
      
      setRecentDeposits(inrDeposits)
      setRecentCryptoDeposits(cryptoDeposits)
    } catch (error) {
      console.error('Error loading recent deposits:', error)
      toast.error('Error loading recent deposits')
    } finally {
      setDepositsLoading(false)
    }
  }, [currentUser])

  const loadRecentCryptoDeposits = useCallback(async () => {
    // This function is called in loadRecentDeposits
  }, [])

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }
    loadRecentDeposits()
    loadRecentCryptoDeposits()

    const handleBalanceUpdate = () => {
      loadRecentDeposits()
      loadRecentCryptoDeposits()
    }

    window.addEventListener('balanceUpdated', handleBalanceUpdate)

    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate)
    }
  }, [currentUser, navigate, loadRecentDeposits, loadRecentCryptoDeposits])

  // Manual check for direct deposits
  const checkForDirectDeposits = async () => {
    try {
      toast.loading('Checking for direct deposits...', { id: 'check-deposits' })
      await checkDirectDepositsToContract()
      await loadRecentDeposits()
      await loadRecentCryptoDeposits()
      toast.dismiss('check-deposits')
      toast.success('Direct deposit check completed!')
    } catch (error) {
      console.error('Error checking direct deposits:', error)
      toast.dismiss('check-deposits')
      toast.error('Failed to check for direct deposits')
    }
  }

  // Force check for specific transaction (for debugging)
  const forceCheckTransaction = async () => {
    try {
      console.log('🔍 Force checking for BXC transaction...')
      toast.loading('Force checking transaction...', { id: 'force-check' })
      
      // This will trigger the check with more detailed logging
      await checkDirectDepositsToContract()
      
      // Also refresh balances
      await refreshAllBalances()
      
      toast.dismiss('force-check')
      toast.success('Force check completed! Check console for details.')
    } catch (error) {
      console.error('Error in force check:', error)
      toast.dismiss('force-check')
      toast.error('Force check failed')
    }
  }

  // Manual transaction hash detection
  const [txHash, setTxHash] = useState('')
  const detectSpecificTransaction = async () => {
    if (!txHash.trim()) {
      toast.error('Please enter a transaction hash')
      return
    }

    try {
      toast.loading('Detecting specific transaction...', { id: 'detect-tx' })
      await detectTransactionByHash(txHash.trim())
      await loadRecentDeposits()
      await loadRecentCryptoDeposits()
      toast.dismiss('detect-tx')
      toast.success('Transaction detection completed! Check console for details.')
    } catch (error) {
      console.error('Error detecting transaction:', error)
      toast.dismiss('detect-tx')
      toast.error('Transaction detection failed')
    }
  }

  const handleInrDeposit = async () => {
    const amount = parseFloat(inrAmount)
    
    if (!amount || amount < 100) {
      toast.error('Please enter a valid amount (minimum ₹100)')
      return
    }

    if (!currentUser || !userProfile) {
      toast.error('Please log in to make a deposit')
      return
    }

    try {
      setLoading(true)
      console.log('Starting INR deposit process...', { amount, user: currentUser.uid })
      
      // Wait for Cashfree manager to be initialized
      let attempts = 0
      const maxAttempts = 50 // Increased attempts
      
      while (!cashfreeManager.isInitialized && attempts < maxAttempts) {
        console.log(`Waiting for Cashfree manager initialization... Attempt ${attempts + 1}/${maxAttempts}`)
        await new Promise(resolve => setTimeout(resolve, 200))
        attempts++
      }
      
      console.log('Cashfree manager initialized:', cashfreeManager.isInitialized)
      
      if (cashfreeManager.isInitialized) {
        console.log('Calling Cashfree initiatePayment...')
        
        // Get user profile details for payment
        const customerEmail = currentUser.email || userProfile.email || ''
        const customerName = userProfile.name || currentUser.displayName || userProfile.email.split('@')[0] || 'User'
        const customerPhone = userProfile.phone || '9999999999' // Default phone if not provided
        
        console.log('Using profile details for payment:', {
          email: customerEmail,
          name: customerName,
          phone: customerPhone,
          amount: amount
        })
        
        // Call the payment initiation with profile details
        await cashfreeManager.initiatePayment(
          amount,
          customerEmail,
          customerName,
          currentUser.uid,
          customerPhone
        )
        
        // Clear the input after successful initiation
        setInrAmount('')
        
        // Refresh the recent deposits list
        await loadRecentDeposits()
        
      } else {
        throw new Error('Payment service initialization failed. Please refresh the page and try again.')
      }
    } catch (error: any) {
      console.error('Deposit error:', error)
      toast.error('Deposit failed. Please try again.', {
        duration: 5000
      })
    } finally {
      setLoading(false)
    }
  }

  // Remove the old crypto deposit function - deposits now happen by sending to addresses

  const renderTransactionHistory = (transactions: Transaction[], showExplorer = false) => {
    if (depositsLoading) {
      return <p>Loading transactions...</p>
    }

    if (transactions.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📥</div>
          <h3>No deposits yet</h3>
          <p>Your deposit history will appear here once you make your first deposit.</p>
        </div>
      )
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {transactions.map((transaction) => {
          const getCurrencyIcon = (currency: string) => {
            switch (currency) {
              case 'INR': return '₹'
              case 'BTC': return '₿'
              case 'USDT': return '💵'
              case 'BXC': return '🪙'
              default: return '💰'
            }
          }

          const formatAmount = (amount: number, currency: string) => {
            if (currency === 'INR') {
              return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            } else if (currency === 'BTC') {
              return `${amount.toFixed(8)} BTC`
            } else if (currency === 'USDT') {
              return `${amount.toFixed(2)} USDT`
            } else if (currency === 'BXC') {
              return `${amount.toFixed(2)} BXC`
            }
            return `${amount} ${currency}`
          }

          const formatDate = (timestamp: Date | string) => {
            const date = timestamp instanceof Date ? timestamp : new Date(timestamp)
            const now = new Date()
            const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
            
            if (diffInHours < 1) {
              return 'Just now'
            } else if (diffInHours < 24) {
              const hours = Math.floor(diffInHours)
              return `${hours} hour${hours > 1 ? 's' : ''} ago`
            } else if (diffInHours < 48) {
              return 'Yesterday, ' + date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
            } else {
              return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })
            }
          }

          const explorerUrl = CONTRACT_CONFIG?.networks?.sepolia?.explorer || 'https://sepolia.etherscan.io'
          const txHashDisplay = transaction.txHash && showExplorer ? (
            <a 
              href={`${explorerUrl}/tx/${transaction.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#007bff', textDecoration: 'none', fontSize: '0.8rem' }}
            >
              View on Explorer
            </a>
          ) : null

          return (
            <div key={transaction.id} style={{
              padding: '1rem',
              border: '1px solid #eee',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: transaction.currency === 'INR' ? '#10b981' : 
                             transaction.currency === 'BTC' ? '#f7931a' :
                             transaction.currency === 'USDT' ? '#26a17b' : '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '1.2rem'
                }}>
                  {getCurrencyIcon(transaction.currency)}
                </div>
                <div>
                  <p style={{ fontWeight: '600', margin: 0 }}>
                    {transaction.currency} Deposit
                  </p>
                  <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#374151', margin: 0 }}>
                    {formatAmount(transaction.amount, transaction.currency)}
                  </p>
                  <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>
                    {formatDate(transaction.timestamp)}
                    {txHashDisplay && <span> • {txHashDisplay}</span>}
                  </p>
                </div>
              </div>
              <div style={{
                padding: '0.5rem 1rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: '500',
                background: transaction.status === 'completed' ? '#d1fae5' : 
                            transaction.status === 'pending' ? '#fef3c7' : '#fee2e2',
                color: transaction.status === 'completed' ? '#065f46' : 
                       transaction.status === 'pending' ? '#92400e' : '#991b1b'
              }}>
                {transaction.status}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (!userProfile) {
    return (
      <div style={{ padding: '4rem 0', textAlign: 'center' }}>
        <p>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="animate-fadeInUp" style={{ padding: '2rem 0' }}>
      <div className="container">
        <div className="animate-fadeInUp" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            fontWeight: '800', 
            marginBottom: '1rem',
            background: 'linear-gradient(135deg, #ffd700 0%, #ffed4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            💰 Deposit Funds
          </h1>
          <p style={{ 
            color: 'rgba(255, 255, 255, 0.8)', 
            fontSize: '1.2rem',
            fontWeight: '500'
          }}>
            Add INR or cryptocurrency to your wallet
          </p>
        </div>

        {/* Current Balances */}
        <div className="animate-fadeInUp" style={{ marginBottom: '2rem' }}>
          <h3 style={{ 
            marginBottom: '1.5rem', 
            fontSize: '1.5rem',
            fontWeight: '700',
            color: 'rgba(255, 255, 255, 0.9)',
            textAlign: 'center'
          }}>
            💎 Available Balances
          </h3>
          <div className="grid grid-cols-4" style={{ gap: '1.5rem' }}>
            <div className="card hover-lift text-center" style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>₹</div>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', fontWeight: '600' }}>INR</span>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', margin: '0.5rem 0', color: '#ffd700' }}>
                ₹{userProfile.inrBalance.toFixed(2)}
              </span>
            </div>
            <div className="card hover-lift text-center" style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>₿</div>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', fontWeight: '600' }}>BTC</span>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', margin: '0.5rem 0', color: '#ffd700' }}>
                {userProfile.cryptoBalances.BTC.toFixed(8)}
              </span>
            </div>
            <div className="card hover-lift text-center" style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💵</div>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', fontWeight: '600' }}>USDT</span>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', margin: '0.5rem 0', color: '#ffd700' }}>
                {userProfile.cryptoBalances.USDT.toFixed(2)}
              </span>
            </div>
            <div className="card hover-lift text-center" style={{
              background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 215, 0, 0.05) 100%)',
              border: '1px solid rgba(255, 215, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🪙</div>
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', fontWeight: '600' }}>BXC</span>
              <span style={{ display: 'block', fontSize: '1.8rem', fontWeight: '800', margin: '0.5rem 0', color: '#ffd700' }}>
                {userProfile.cryptoBalances.BXC.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {/* INR Deposit */}
          <div className="animate-fadeInLeft">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                💰 Deposit INR
              </h2>
            </div>
            <div className="card hover-lift" style={{
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              {!cashfreeManager.isReady() && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #f59e0b',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ color: '#92400e', fontSize: '0.9rem' }}>
                    <strong>Demo Mode:</strong> Cashfree SDK not loaded. Payments will be simulated for testing purposes.
                  </span>
                </div>
              )}
              <p style={{ color: '#666', marginBottom: '1rem' }}>Add INR to your wallet using Cashfree payment gateway</p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Amount (INR)
                </label>
                <input
                  type="number"
                  placeholder="Enter amount (min ₹100)"
                  min="100"
                  step="100"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={handleInrDeposit}
                disabled={loading}
                className="hover-lift"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'linear-gradient(135deg, #000000 0%, #ffd700 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                {loading ? 'Processing...' : '💰 Deposit INR via Cashfree'}
              </button>
            </div>
          </div>

          {/* Crypto Deposit */}
          <div className="animate-fadeInRight">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '800',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}>
                🪙 Deposit Cryptocurrency
              </h2>
              <button
                onClick={refreshCryptoBalances}
                disabled={loading}
                className="hover-lift"
                style={{
                  padding: '0.75rem 1.25rem',
                  background: 'linear-gradient(135deg, #000000 0%, #ffd700 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  boxShadow: '0 8px 32px rgba(255, 215, 0, 0.3)'
                }}
              >
                🔄 Refresh Balances
              </button>
            </div>
            
            {/* BTC Deposit */}
            <div className="card hover-lift" style={{ 
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, rgba(247, 147, 26, 0.05) 0%, rgba(245, 101, 101, 0.05) 100%)',
              border: '1px solid rgba(247, 147, 26, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>₿</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#f7931a' }}>Bitcoin (BTC)</h3>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Deposit Address:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={depositAddresses.btc}
                    readOnly
                    style={{ flex: 1, background: 'black' }}
                  />
                  <button
                    onClick={() => copyAddress(depositAddresses.btc, 'BTC')}
                    disabled={depositAddresses.btc.includes('not supported')}
                    style={{
                      padding: '0.5rem',
                      background: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: depositAddresses.btc.includes('not supported') ? 'not-allowed' : 'pointer',
                      opacity: depositAddresses.btc.includes('not supported') ? 0.5 : 1
                    }}
                  >
                    📋
                  </button>
                </div>
                <small style={{ color: '#666' }}>Send BTC to this address. Minimum: 0.0001 BTC</small>
              </div>
            </div>

            {/* USDT Deposit */}
            <div className="card hover-lift" style={{ 
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, rgba(38, 161, 123, 0.05) 0%, rgba(34, 197, 94, 0.05) 100%)',
              border: '1px solid rgba(38, 161, 123, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>💵</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#26a17b' }}>USDT (Sepolia)</h3>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Deposit Address:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={depositAddresses.usdt}
                    readOnly
                    placeholder="Loading USDT deposit address..."
                    style={{ flex: 1, background: 'black' }}
                  />
                  <button
                    onClick={() => copyAddress(depositAddresses.usdt, 'USDT')}
                    disabled={!depositAddresses.usdt}
                    style={{
                      padding: '0.5rem',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: !depositAddresses.usdt ? 'not-allowed' : 'pointer',
                      opacity: !depositAddresses.usdt ? 0.5 : 1
                    }}
                  >
                    📋
                  </button>
                </div>
                <small style={{ color: '#666' }}>Send USDT to this address. Minimum: 1 USDT</small>
              </div>
            </div>

            {/* BXC Deposit */}
            <div className="card hover-lift" style={{ 
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem', marginRight: '0.75rem' }}>🪙</span>
                <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '700', color: '#6366f1' }}>BXC Token</h3>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Deposit Address:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={depositAddresses.bxc}
                    readOnly
                    placeholder="Loading BXC deposit address..."
                    style={{ flex: 1, background: 'black' }}
                  />
                  <button
                    onClick={() => copyAddress(depositAddresses.bxc, 'BXC')}
                    disabled={!depositAddresses.bxc}
                    style={{
                      padding: '0.5rem',
                      background: '#6366f1',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: !depositAddresses.bxc ? 'not-allowed' : 'pointer',
                      opacity: !depositAddresses.bxc ? 0.5 : 1
                    }}
                  >
                    📋
                  </button>
                </div>
                <small style={{ color: '#666' }}>Send BXC to this address. Minimum: 10 BXC</small>
              </div>
            </div>
          </div>

          {/* Direct Deposit Detection */}
          <div className="animate-fadeInUp" style={{ marginTop: '2rem' }}>
            <div className="card hover-lift" style={{
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                fontSize: '1.4rem', 
                fontWeight: '700', 
                marginBottom: '1rem',
                color: 'rgba(255, 255, 255, 0.9)'
              }}>
                🔍 Direct Deposit Detection
              </h3>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>
                If you sent BXC or USDT directly to the contract address, click below to detect and update your balance.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  onClick={checkForDirectDeposits}
                  disabled={loading}
                  className="hover-lift"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #22c55e 0%, #10b981 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 8px 32px rgba(34, 197, 94, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  🔍 Check for Direct Deposits
                </button>
                <button
                  onClick={forceCheckTransaction}
                  disabled={loading}
                  className="hover-lift"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    fontSize: '1rem',
                    fontWeight: '600',
                    boxShadow: '0 8px 32px rgba(245, 158, 11, 0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                >
                  🔧 Force Check (Debug)
                </button>
              </div>
            </div>
          </div>

          {/* Manual Transaction Hash Detection */}
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '2px solid #f59e0b',
            borderRadius: '1rem',
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 8px 32px rgba(245, 158, 11, 0.2)'
          }}>
            <h3 style={{
              fontSize: '1.25rem',
              fontWeight: '700',
              color: '#92400e',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              🔍 Manual Transaction Detection
            </h3>
            <p style={{
              color: '#92400e',
              marginBottom: '1rem',
              fontSize: '0.95rem',
              lineHeight: '1.5'
            }}>
              If your transaction isn't detected automatically, enter the transaction hash below:
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter transaction hash (0x...)"
                style={{
                  flex: 1,
                  padding: '0.75rem 1rem',
                  border: '2px solid #f59e0b',
                  borderRadius: '0.75rem',
                  fontSize: '0.95rem',
                  outline: 'none',
                  backgroundColor: '#fff',
                  color: '#374151',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#d97706'
                  e.target.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.1)'
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#f59e0b'
                  e.target.style.boxShadow = 'none'
                }}
              />
              <button
                onClick={detectSpecificTransaction}
                disabled={!txHash.trim()}
                style={{
                  padding: '0.75rem 1.5rem',
                  backgroundColor: txHash.trim() ? '#f59e0b' : '#d1d5db',
                  color: txHash.trim() ? '#fff' : '#9ca3af',
                  borderRadius: '0.75rem',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: txHash.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.3s ease',
                  boxShadow: txHash.trim() ? '0 4px 16px rgba(245, 158, 11, 0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (txHash.trim()) {
                    e.currentTarget.style.backgroundColor = '#d97706'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (txHash.trim()) {
                    e.currentTarget.style.backgroundColor = '#f59e0b'
                    e.currentTarget.style.transform = 'translateY(0)'
                  }
                }}
              >
                Detect Transaction
              </button>
            </div>
          </div>
        </div>

        {/* Recent Deposits */}
        <div className="animate-fadeInUp" style={{ marginTop: '3rem' }}>
          <h2 style={{ 
            fontSize: '2rem', 
            fontWeight: '800', 
            marginBottom: '2rem',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📊 Recent Deposits
          </h2>
          
          <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
            <div className="animate-fadeInLeft">
              <h3 style={{ 
                fontSize: '1.4rem', 
                fontWeight: '700', 
                marginBottom: '1.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center'
              }}>
                💰 INR Deposits
              </h3>
              <div className="card hover-lift" style={{
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
                border: '1px solid rgba(16, 185, 129, 0.2)'
              }}>
                {renderTransactionHistory(recentDeposits, false)}
              </div>
            </div>
            
            <div className="animate-fadeInRight">
              <h3 style={{ 
                fontSize: '1.4rem', 
                fontWeight: '700', 
                marginBottom: '1.5rem',
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center'
              }}>
                🪙 Crypto Deposits
              </h3>
              <div className="card hover-lift" style={{
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)',
                border: '1px solid rgba(99, 102, 241, 0.2)'
              }}>
                {renderTransactionHistory(recentCryptoDeposits, true)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Deposit