import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useCryptoPrices } from '../contexts/CryptoPriceContext'
import { UnifiedHistoryService, UnifiedTransaction } from '../services/unifiedHistory'
import { apiService } from '../services/api'
import toast from 'react-hot-toast'

const Send: React.FC = () => {
  const [sendType, setSendType] = useState<'inr' | 'crypto'>('inr')
  const [inrSend, setInrSend] = useState({
    amount: '',
    recipientEmail: '',
    description: ''
  })
  const [cryptoSend, setCryptoSend] = useState({
    crypto: 'BTC',
    amount: '',
    recipientEmail: '',
    description: ''
  })
  const [recentTransfers, setRecentTransfers] = useState<UnifiedTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [transfersLoading, setTransfersLoading] = useState(true)

  const { currentUser, userProfile, updateUserProfile, refreshUserProfile } = useAuth()
  const { prices, convertToINR } = useCryptoPrices()
  const navigate = useNavigate()

  const loadRecentTransfers = useCallback(async () => {
    if (!currentUser) return

    try {
      setTransfersLoading(true)
      console.log('🔍 Loading recent transfers for user:', currentUser.uid)
      
      // Get recent transfers using unified history service
      const transfers = await UnifiedHistoryService.getRecentTransactions(currentUser.uid, 10)
      
      console.log('🔍 Found transfers:', transfers.length, transfers)
      setRecentTransfers(transfers)
    } catch (error) {
      console.error('Error loading recent transfers:', error)
      toast.error('Error loading recent transfers')
    } finally {
      setTransfersLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }
    loadRecentTransfers()

    const handleBalanceUpdate = () => {
      refreshUserProfile()
      loadRecentTransfers()
    }
    window.addEventListener('balanceUpdated', handleBalanceUpdate)

    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate)
    }
  }, [currentUser, navigate, loadRecentTransfers, refreshUserProfile])

  const findUserByEmail = async (email: string) => {
    try {
      const user = await apiService.findUserByEmail(email)
      return user
    } catch (error) {
      console.error('Error finding user:', error)
      return null
    }
  }

  const handleInrSend = async () => {
    const amount = parseFloat(inrSend.amount)
    const recipientEmail = inrSend.recipientEmail.trim().toLowerCase()
    const description = inrSend.description.trim()

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!recipientEmail) {
      toast.error('Please enter recipient email')
      return
    }

    if (recipientEmail === currentUser?.email?.toLowerCase()) {
      toast.error('Cannot send money to yourself')
      return
    }

    if (!userProfile) {
      toast.error('User profile not loaded')
      return
    }

    if (amount > userProfile.inrBalance) {
      toast.error('Insufficient INR balance')
      return
    }

    try {
      setLoading(true)
      toast.loading('Processing INR transfer...', { id: 'inr-send-toast' })

      const recipient = await findUserByEmail(recipientEmail)
      if (!recipient) {
        toast.dismiss('inr-send-toast')
        toast.error('Recipient not found. Please check the email address.')
        return
      }

      // Deduct from sender
      const newSenderBalance = userProfile.inrBalance - amount
      await updateUserProfile({ inrBalance: newSenderBalance })

      // Add to recipient
      if (recipient.uid) {
        await apiService.updateUserBalance(recipient.uid, 'INR', amount)
      }

      // Log transactions for both users
      console.log('🔧 Logging sender transaction...')
      await UnifiedHistoryService.logTransaction({
        userId: currentUser!.uid,
        type: 'send',
        amount: -amount, // Negative for sender
        currency: 'INR',
        description: `Sent ₹${amount} to ${recipientEmail}${description ? ': ' + description : ''}`,
        status: 'completed',
        category: 'fiat',
        subType: 'send'
      })

      console.log('🔧 Logging recipient transaction...')
      await UnifiedHistoryService.logTransaction({
        userId: recipient.uid,
        type: 'receive',
        amount: amount, // Positive for recipient
        currency: 'INR',
        description: `Received ₹${amount} from ${currentUser!.email}${description ? ': ' + description : ''}`,
        status: 'completed',
        category: 'fiat',
        subType: 'receive'
      })

      console.log('🔧 Transactions logged successfully')

      toast.dismiss('inr-send-toast')
      toast.success(`Successfully sent ₹${amount} to ${recipientEmail}`)

      setInrSend({ amount: '', recipientEmail: '', description: '' })
      refreshUserProfile()
      loadRecentTransfers()
    } catch (error: any) {
      console.error('INR Send error:', error)
      toast.dismiss('inr-send-toast')
      toast.error('Error processing INR transfer: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCryptoSend = async () => {
    const amount = parseFloat(cryptoSend.amount)
    const selectedCrypto = cryptoSend.crypto
    const recipientEmail = cryptoSend.recipientEmail.trim().toLowerCase()
    const description = cryptoSend.description.trim()

    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (!recipientEmail) {
      toast.error('Please enter recipient email')
      return
    }

    if (recipientEmail === currentUser?.email?.toLowerCase()) {
      toast.error('Cannot send money to yourself')
      return
    }

    if (!userProfile) {
      toast.error('User profile not loaded')
      return
    }

    if (amount > userProfile.cryptoBalances[selectedCrypto as keyof typeof userProfile.cryptoBalances]) {
      toast.error(`Insufficient ${selectedCrypto} balance`)
      return
    }

    try {
      setLoading(true)
      toast.loading('Processing crypto transfer...', { id: 'crypto-send-toast' })

      const recipient = await findUserByEmail(recipientEmail)
      if (!recipient) {
        toast.dismiss('crypto-send-toast')
        toast.error('Recipient not found. Please check the email address.')
        return
      }

      // Deduct from sender
      const newSenderCryptoBalance = userProfile.cryptoBalances[selectedCrypto as keyof typeof userProfile.cryptoBalances] - amount
      await updateUserProfile({
        cryptoBalances: {
          ...userProfile.cryptoBalances,
          [selectedCrypto]: newSenderCryptoBalance
        }
      })

      // Add to recipient
      if (recipient.uid) {
        await apiService.updateUserBalance(recipient.uid, selectedCrypto, amount)
      }

      // Log transactions for both users
      await UnifiedHistoryService.logTransaction({
        userId: currentUser!.uid,
        type: 'send',
        amount: -amount, // Negative for sender
        currency: selectedCrypto,
        description: `Sent ${amount} ${selectedCrypto} to ${recipientEmail}${description ? ': ' + description : ''}`,
        status: 'completed',
        category: 'crypto',
        subType: 'send'
      })

      await UnifiedHistoryService.logTransaction({
        userId: recipient.uid,
        type: 'receive',
        amount: amount, // Positive for recipient
        currency: selectedCrypto,
        description: `Received ${amount} ${selectedCrypto} from ${currentUser!.email}${description ? ': ' + description : ''}`,
        status: 'completed',
        category: 'crypto',
        subType: 'receive'
      })

      toast.dismiss('crypto-send-toast')
      toast.success(`Successfully sent ${amount} ${selectedCrypto} to ${recipientEmail}`)

      setCryptoSend({ crypto: 'BTC', amount: '', recipientEmail: '', description: '' })
      refreshUserProfile()
      loadRecentTransfers()
    } catch (error: any) {
      console.error('Crypto Send error:', error)
      toast.dismiss('crypto-send-toast')
      toast.error('Error processing crypto transfer: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const renderTransactionHistory = (transactions: Transaction[]) => {
    if (transfersLoading) {
      return <p>Loading transactions...</p>
    }

    if (transactions.length === 0) {
      return <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No recent transfers found.</p>
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {transactions.map((transaction) => (
          <div key={transaction.id} style={{
            padding: '1rem',
            border: '1px solid #eee',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <p style={{ fontWeight: '600', margin: 0, color: transaction.amount < 0 ? '#dc3545' : '#28a745' }}>
                {transaction.amount > 0 ? '+' : ''}{transaction.amount} {transaction.currency}
              </p>
              <p style={{ fontSize: '0.9rem', color: '#666', margin: 0 }}>
                {transaction.description}
              </p>
              <p style={{ fontSize: '0.8rem', color: '#999', margin: 0 }}>
                {new Date(transaction.timestamp).toLocaleDateString()} {new Date(transaction.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: '500',
              background: transaction.status === 'completed' ? '#d4edda' : 
                          transaction.status === 'pending' ? '#fff3cd' : '#f8d7da',
              color: transaction.status === 'completed' ? '#155724' : 
                     transaction.status === 'pending' ? '#856404' : '#721c24'
            }}>
              {transaction.status}
            </div>
          </div>
        ))}
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
    <div style={{ padding: '2rem 0' }}>
      <div className="container">
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Send Money</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Transfer INR or cryptocurrency to other users</p>
        </div>

        {/* Current Balances */}
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Available Balances</h3>
          <div className="grid grid-cols-4" style={{ gap: '1rem' }}>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>INR</span>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                ₹{userProfile.inrBalance.toFixed(2)}
              </span>
            </div>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>BTC</span>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                {userProfile.cryptoBalances.BTC.toFixed(8)}
              </span>
            </div>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>USDT</span>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                {userProfile.cryptoBalances.USDT.toFixed(2)}
              </span>
            </div>
            <div className="card text-center">
              <span style={{ color: '#666', fontSize: '0.9rem' }}>BXC</span>
              <span style={{ display: 'block', fontSize: '1.5rem', fontWeight: 'bold', margin: '0.5rem 0' }}>
                {userProfile.cryptoBalances.BXC.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Send Type Toggle */}
        <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => setSendType('inr')}
            style={{
              padding: '0.75rem 1.5rem',
              background: sendType === 'inr' ? '#007bff' : '#f8f9fa',
              color: sendType === 'inr' ? 'white' : '#666',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            💰 Send INR
          </button>
          <button
            onClick={() => setSendType('crypto')}
            style={{
              padding: '0.75rem 1.5rem',
              background: sendType === 'crypto' ? '#007bff' : '#f8f9fa',
              color: sendType === 'crypto' ? 'white' : '#666',
              border: '1px solid #dee2e6',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            🪙 Send Crypto
          </button>
        </div>

        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {/* Send Form */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              {sendType === 'inr' ? 'Send INR' : 'Send Cryptocurrency'}
            </h2>
            <div className="card">
              {sendType === 'inr' ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Amount (INR)
                    </label>
                    <input
                      type="number"
                      placeholder="Enter INR amount"
                      min="1"
                      step="1"
                      value={inrSend.amount}
                      onChange={(e) => setInrSend(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter recipient's email"
                      value={inrSend.recipientEmail}
                      onChange={(e) => setInrSend(prev => ({ ...prev, recipientEmail: e.target.value }))}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter description"
                      value={inrSend.description}
                      onChange={(e) => setInrSend(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button
                    onClick={handleInrSend}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Processing...' : 'Send INR'}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Select Cryptocurrency
                    </label>
                    <select
                      value={cryptoSend.crypto}
                      onChange={(e) => setCryptoSend(prev => ({ ...prev, crypto: e.target.value }))}
                      required
                      style={{ width: '100%' }}
                    >
                      <option value="BTC">Bitcoin (BTC)</option>
                      <option value="USDT">USDT (BEP-20)</option>
                      <option value="BXC">BXC Token</option>
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Amount
                    </label>
                    <input
                      type="number"
                      placeholder="Enter amount"
                      min="0"
                      step="0.00000001"
                      value={cryptoSend.amount}
                      onChange={(e) => setCryptoSend(prev => ({ ...prev, amount: e.target.value }))}
                      required
                      style={{ width: '100%' }}
                    />
                    {cryptoSend.amount && prices[cryptoSend.crypto as keyof typeof prices] && (
                      <small style={{ color: '#666' }}>
                        ≈ ₹{convertToINR(parseFloat(cryptoSend.amount), cryptoSend.crypto as keyof typeof prices).toFixed(2)}
                      </small>
                    )}
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter recipient's email"
                      value={cryptoSend.recipientEmail}
                      onChange={(e) => setCryptoSend(prev => ({ ...prev, recipientEmail: e.target.value }))}
                      required
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Enter description"
                      value={cryptoSend.description}
                      onChange={(e) => setCryptoSend(prev => ({ ...prev, description: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <button
                    onClick={handleCryptoSend}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Processing...' : 'Send Crypto'}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Transfer History */}
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>📊 Recent Transfers</h2>
            <div className="card">
              {renderTransactionHistory(recentTransfers)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Send