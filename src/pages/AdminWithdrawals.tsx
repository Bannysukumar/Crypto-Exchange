import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { collection, getDocs, doc, updateDoc, query, limit, where, addDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
// import { CONTRACT_CONFIG } from '../config/contracts'
import toast from 'react-hot-toast'

// Admin credentials
const ADMIN_CREDENTIALS = {
  uid: "zgtQXvwBhMbHR4FcdduoNF7sbhl1",
  email: "vaibhav.admin@gmail.com",
  displayName: "Vaibhav Admin",
  password: "Vaibhav1234"
}

interface PendingWithdrawal {
  id: string
  userId: string
  userAddress: string
  crypto: string
  cryptoAmount: number
  inrAmount: number
  tokenAddress: string
  status: string
  createdAt: any
  type: string
  bankDetails?: {
    accountNumber: string
    ifscCode: string
  }
}

const AdminWithdrawals: React.FC = () => {
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([])
  const [loading, setLoading] = useState(true)
  
  // Admin authentication state
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false)
  const [adminLoginForm, setAdminLoginForm] = useState({
    email: '',
    password: ''
  })
  const [adminLoading, setAdminLoading] = useState(false)

  // Contract state
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null)
  const [isPaused, setIsPaused] = useState(false)
  const [supportsPausedCheck, setSupportsPausedCheck] = useState(false)

  const { currentUser, login, logout } = useAuth()
  const { account, isConnected, connectWallet, web3, getNetworkStatus } = useWeb3()

  useEffect(() => {
    // Check if current user is admin
    if (currentUser && currentUser.uid === ADMIN_CREDENTIALS.uid) {
      setIsAdminAuthenticated(true)
      loadPendingWithdrawals()
      loadContractOwner()
      loadPausedStatus()
    } else {
      setIsAdminAuthenticated(false)
    }
  }, [currentUser])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (isAdminAuthenticated) {
      const interval = setInterval(() => {
        loadPendingWithdrawals()
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [isAdminAuthenticated])

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    
    try {
      await login(adminLoginForm.email, adminLoginForm.password)
      toast.success('Login successful! Checking admin access...')
    } catch (error: any) {
      console.error('Admin login error:', error)
      toast.error('Login failed: ' + (error.message || 'Invalid credentials'))
    } finally {
      setAdminLoading(false)
    }
  }

  const handleAdminLogout = async () => {
    try {
      await logout()
      setIsAdminAuthenticated(false)
      setAdminLoginForm({ email: '', password: '' })
      toast.success('Admin logged out successfully')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Error logging out')
    }
  }

  const loadContractOwner = async () => {
    try {
      if (web3 && isConnected) {
        setOwnerAddress('0x76b16F59Cfab5DdaE5D149BE98E5d755F939572A')
      }
    } catch (e) {
      console.error('Failed to load contract owner:', e)
    }
  }

  const loadPausedStatus = async () => {
    try {
      if (!supportsPausedCheck) {
      return
    }
      setIsPaused(false)
    } catch (e) {
      setSupportsPausedCheck(false)
    }
  }

  const loadPendingWithdrawals = async () => {
    try {
      setLoading(true)
      const withdrawalsRef = collection(db, 'pending_withdrawals')
      // Simplified query to avoid index requirement - just get all pending withdrawals
      const q = query(
        withdrawalsRef, 
        where('status', '==', 'pending_admin_execution'),
        limit(50)
      )
      const querySnapshot = await getDocs(q)
      
      const withdrawals: PendingWithdrawal[] = []
      querySnapshot.forEach((doc) => {
        withdrawals.push({ id: doc.id, ...doc.data() } as PendingWithdrawal)
      })
      
      // Sort by createdAt in JavaScript instead of Firestore
      withdrawals.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt)
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt)
        return dateB.getTime() - dateA.getTime()
      })
      
      setPendingWithdrawals(withdrawals)
    } catch (error) {
      console.error('Error loading pending withdrawals:', error)
      toast.error('Error loading pending withdrawals')
    } finally {
      setLoading(false)
    }
  }

  const getRevertMessage = (error: any): string => {
    try {
      if (!error) return 'Unknown error'
      if (typeof error === 'string') return error
      if (error.message) return error.message
      if (error.reason) return error.reason
      if (error.data) {
        if (typeof error.data === 'string') return error.data
        if (error.data.message) return error.data.message
        if (error.data.reason) return error.data.reason
        if (error.data.originalError?.message) return error.data.originalError.message
      }
      if (error.originalError?.message) return error.originalError.message
    } catch (e) {}
    return 'execution reverted'
  }

  const executeWithdrawal = async (withdrawal: PendingWithdrawal) => {
    try {
      if (withdrawal.type === 'crypto_to_inr') {
        // Handle crypto-to-INR withdrawal (bank transfer)
        await executeCryptoToInrWithdrawal(withdrawal)
      } else if (withdrawal.type === 'inr_to_crypto') {
        // Handle INR-to-crypto withdrawal (smart contract)
        await executeInrToCryptoWithdrawal(withdrawal)
      } else {
        toast.error('Unknown withdrawal type')
      }
    } catch (error: any) {
      console.error('Withdrawal execution error:', error)
      toast.error(`Failed to execute withdrawal: ${error.message}`)
    }
  }

  const executeCryptoToInrWithdrawal = async (withdrawal: PendingWithdrawal) => {
    try {
      if (!web3 || !account) {
        toast.error('Please connect admin wallet first')
        return
      }

      if (ownerAddress && account.toLowerCase() !== ownerAddress.toLowerCase()) {
        toast.error('Connect the contract owner wallet to execute withdrawals')
        return
      }

      toast.loading('Processing crypto-to-INR withdrawal via smart contract...', { id: 'execute-withdrawal' })

      // Import contract ABI and config
      const { CONTRACT_CONFIG, CRYPTO_WALLET_ABI } = await import('../config/contracts')
      
      // Create contract instance
      const contract = new web3.eth.Contract(CRYPTO_WALLET_ABI, CONTRACT_CONFIG.contracts.cryptoWallet)
      
      // Convert amount to Wei
      const amountInWei = web3.utils.toWei(withdrawal.cryptoAmount.toString(), 'ether')
      
      // Admin wallet address (where crypto will be transferred)
      const adminWalletAddress = account // Admin's connected wallet receives the crypto
      
      console.log('Executing crypto-to-INR withdrawal:', {
        fromUserId: withdrawal.userId,
        toAdminWallet: adminWalletAddress,
        tokenAddress: withdrawal.tokenAddress,
        amount: withdrawal.cryptoAmount,
        amountInWei: amountInWei,
        crypto: withdrawal.crypto,
        bankAccount: withdrawal.bankDetails?.accountNumber
      })

      // Pre-check: ensure contract has enough token balance
      const erc20ABI = [
        {
          "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view" as const,
          "type": "function" as const
        }
      ]
      
      const tokenContract = new web3.eth.Contract(erc20ABI, withdrawal.tokenAddress)
      const contractTokenBal = await tokenContract.methods.balanceOf(CONTRACT_CONFIG.contracts.cryptoWallet).call()
      const hasEnough = web3.utils.toBN(contractTokenBal).gte(web3.utils.toBN(amountInWei))
      
      if (!hasEnough) {
        const humanBal = web3.utils.fromWei(contractTokenBal, 'ether')
        toast.dismiss('execute-withdrawal')
        toast.error(`Insufficient contract token balance. Available: ${humanBal} ${withdrawal.crypto}`)
        return
      }

      // Execute the crypto transfer to admin wallet via smart contract
      const tx = await contract.methods.executeWithdrawalTo(
        adminWalletAddress, // Admin wallet receives the crypto
        withdrawal.tokenAddress,
        amountInWei
      ).send({ from: account })

      console.log('Crypto-to-INR withdrawal transaction successful:', tx)

      // Import MongoDB service to update user balance
      const { firebaseService } = await import('../services/firebase')
      
      // Deduct crypto balance from user (after successful smart contract execution)
      await firebaseService.updateUserBalance(
        withdrawal.userId, 
        withdrawal.crypto, 
        -withdrawal.cryptoAmount
      )

      // Update withdrawal status in Firestore
      await updateDoc(doc(db, 'pending_withdrawals', withdrawal.id), {
        status: 'executed',
        executedAt: new Date(),
        executedBy: account,
        txHash: tx.transactionHash,
        bankTransferDetails: {
          accountNumber: withdrawal.bankDetails?.accountNumber,
          ifscCode: withdrawal.bankDetails?.ifscCode,
          amount: withdrawal.inrAmount
        },
        cryptoTransferDetails: {
          fromUserId: withdrawal.userId,
          toAdminWallet: adminWalletAddress,
          cryptoAmount: withdrawal.cryptoAmount,
          crypto: withdrawal.crypto,
          txHash: tx.transactionHash
        }
      })

      // Log transaction in user's history
      await addDoc(collection(db, 'transactions'), {
        userId: withdrawal.userId,
        type: 'withdrawal',
        currency: withdrawal.crypto,
        amount: withdrawal.cryptoAmount,
        inrAmount: withdrawal.inrAmount,
        status: 'completed',
        timestamp: new Date(),
        txHash: tx.transactionHash,
        toAddress: adminWalletAddress,
        description: `Crypto to INR withdrawal - ${withdrawal.cryptoAmount} ${withdrawal.crypto} transferred to admin wallet for bank transfer to ${withdrawal.bankDetails?.accountNumber}`,
        bankDetails: withdrawal.bankDetails,
        blockNumber: tx.blockNumber
      })

      toast.dismiss('execute-withdrawal')
      toast.success(`Crypto-to-INR withdrawal executed! ${withdrawal.cryptoAmount} ${withdrawal.crypto} transferred to admin wallet. Transaction: ${tx.transactionHash.slice(0, 10)}...`)
      
      // Reload withdrawals
      await loadPendingWithdrawals()

    } catch (error: any) {
      const msg = getRevertMessage(error)
      console.error('Crypto-to-INR withdrawal error:', { error, message: msg })
      toast.dismiss('execute-withdrawal')
      
      if (msg.includes('caller is not the owner')) {
        toast.error('Only contract owner can execute withdrawals')
      } else if (msg.includes('paused')) {
        toast.error('Contract is paused. Unpause before executing.')
      } else if (msg.includes('insufficient')) {
        toast.error('Insufficient contract token balance')
      } else {
        toast.error(`Failed to execute crypto-to-INR withdrawal: ${msg}`)
      }
    }
  }

  const executeInrToCryptoWithdrawal = async (withdrawal: PendingWithdrawal) => {
    try {
      if (!web3 || !account) {
        toast.error('Please connect admin wallet first')
        return
      }

      if (ownerAddress && account.toLowerCase() !== ownerAddress.toLowerCase()) {
        toast.error('Connect the contract owner wallet to execute withdrawals')
        return
      }

      toast.loading('Executing crypto withdrawal on blockchain...', { id: 'execute-withdrawal' })

      // Import contract ABI and config
      const { CONTRACT_CONFIG, CRYPTO_WALLET_ABI } = await import('../config/contracts')
      
      // Create contract instance
      const contract = new web3.eth.Contract(CRYPTO_WALLET_ABI, CONTRACT_CONFIG.contracts.cryptoWallet)
      
      // Convert amount to Wei
      const amountInWei = web3.utils.toWei(withdrawal.cryptoAmount.toString(), 'ether')
      
      console.log('Executing crypto withdrawal:', {
        userAddress: withdrawal.userAddress,
        tokenAddress: withdrawal.tokenAddress,
        amount: withdrawal.cryptoAmount,
        amountInWei: amountInWei,
        crypto: withdrawal.crypto
      })

      // Pre-check: ensure contract has enough token balance
      const erc20ABI = [
        {
          "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view" as const,
          "type": "function" as const
        }
      ]
      
      const tokenContract = new web3.eth.Contract(erc20ABI, withdrawal.tokenAddress)
      const contractTokenBal = await tokenContract.methods.balanceOf(CONTRACT_CONFIG.contracts.cryptoWallet).call()
      const hasEnough = web3.utils.toBN(contractTokenBal).gte(web3.utils.toBN(amountInWei))
      
      if (!hasEnough) {
        const humanBal = web3.utils.fromWei(contractTokenBal, 'ether')
        toast.dismiss('execute-withdrawal')
        toast.error(`Insufficient contract token balance. Available: ${humanBal} ${withdrawal.crypto}`)
        return
      }

      // Execute the withdrawal on smart contract
      const tx = await contract.methods.executeWithdrawalTo(
        withdrawal.userAddress,
        withdrawal.tokenAddress,
        amountInWei
      ).send({ from: account })

      console.log('Crypto withdrawal transaction successful:', tx)

      // Update withdrawal status in Firestore
      await updateDoc(doc(db, 'pending_withdrawals', withdrawal.id), {
        status: 'executed',
        executedAt: new Date(),
        txHash: tx.transactionHash,
        executedBy: account
      })

      // Log transaction in user's history
      await addDoc(collection(db, 'transactions'), {
        userId: withdrawal.userId,
        type: 'withdrawal',
        currency: withdrawal.crypto,
        amount: withdrawal.cryptoAmount,
        inrAmount: withdrawal.inrAmount,
        status: 'completed',
        timestamp: new Date(),
        txHash: tx.transactionHash,
        toAddress: withdrawal.userAddress,
        description: `INR to ${withdrawal.crypto} withdrawal`,
        blockNumber: tx.blockNumber
      })

      // IMPORTANT: Do NOT deduct INR balance here
      // INR will only be deducted when BXC is actually received by user's wallet
      console.log('🔄 Crypto withdrawal executed - INR will be deducted only when crypto is received by user wallet')

      toast.dismiss('execute-withdrawal')
      toast.success(`Crypto withdrawal executed! Transaction: ${tx.transactionHash.slice(0, 10)}...`)
      
      // Reload withdrawals
      await loadPendingWithdrawals()

    } catch (error: any) {
      const msg = getRevertMessage(error)
      console.error('Crypto withdrawal execution error:', { error, message: msg })
      toast.dismiss('execute-withdrawal')
      
      if (msg.includes('caller is not the owner')) {
        toast.error('Only contract owner can execute withdrawals')
      } else if (msg.includes('paused')) {
        toast.error('Contract is paused. Unpause before executing.')
      } else if (msg.includes('insufficient')) {
        toast.error('Insufficient contract token balance')
      } else {
        toast.error(`Failed to execute crypto withdrawal: ${msg}`)
      }
    }
  }

  const rejectWithdrawal = async (withdrawal: PendingWithdrawal) => {
    if (!window.confirm('Are you sure you want to reject this withdrawal? This will refund the user.')) {
      return
    }

    try {
      toast.loading('Rejecting withdrawal...', { id: 'reject-withdrawal' })

      await updateDoc(doc(db, 'pending_withdrawals', withdrawal.id), {
        status: 'rejected',
        rejectedAt: new Date(),
        rejectedBy: account || 'admin'
      })

      // IMPORTANT: Do NOT refund INR when rejecting BXC withdrawals
      // INR should only be deducted when BXC is actually received
      console.log('🔄 BXC withdrawal rejected - INR will NOT be deducted')

      toast.dismiss('reject-withdrawal')
      toast.success('Withdrawal rejected successfully')
      await loadPendingWithdrawals()
      
    } catch (error: any) {
      console.error('Withdrawal rejection error:', error)
      toast.dismiss('reject-withdrawal')
      toast.error('Failed to reject withdrawal: ' + error.message)
    }
  }

  // Show admin login form if not authenticated
  if (!isAdminAuthenticated) {
  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="container">
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div className="card">
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  🔐 Admin Login
                </h1>
                <p style={{ color: '#666', fontSize: '1rem' }}>
                  Access the withdrawal management panel
                </p>
        </div>

              <form onSubmit={handleAdminLogin}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={adminLoginForm.email}
                    onChange={(e) => setAdminLoginForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter admin email"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                  />
          </div>

                <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    Password
                </label>
                <input
                    type="password"
                    value={adminLoginForm.password}
                    onChange={(e) => setAdminLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter admin password"
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '1rem'
                    }}
                />
              </div>
                
              <button
                  type="submit"
                  disabled={adminLoading}
                style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: adminLoading ? 'not-allowed' : 'pointer',
                    opacity: adminLoading ? 0.6 : 1
                  }}
                >
                  {adminLoading ? 'Logging in...' : 'Login as Admin'}
              </button>
              </form>
              
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: '#666' }}>
                  Admin Credentials:
                </h4>
                <p style={{ margin: '0', fontSize: '0.8rem', color: '#666' }}>
                  Email: {ADMIN_CREDENTIALS.email}<br/>
                  Password: {ADMIN_CREDENTIALS.password}
                </p>
              </div>
            </div>
            </div>
          </div>
        </div>
    )
  }

  // EXACT HTML DASHBOARD STRUCTURE
  return (
    <div style={{
      maxWidth: '1200px',
      margin: '2rem auto',
      padding: '0 1rem'
    }}>
      {/* Admin Header - Exact match to HTML */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', fontWeight: 'bold' }}>
          <i className="fas fa-cog"></i> Admin Dashboard
        </h1>
        <p style={{ margin: '0 0 1rem 0', fontSize: '1.1rem' }}>
          Process pending withdrawals via smart contract (Crypto → INR & INR → Crypto)
          {ownerAddress && (
            <><br/>Contract Owner: <code>{ownerAddress}</code></>
          )}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{
              padding: '0.25rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.875rem',
              fontWeight: '500',
              background: supportsPausedCheck ? (isPaused ? '#fecaca' : '#bbf7d0') : '#e5e7eb',
              color: supportsPausedCheck ? (isPaused ? '#7f1d1d' : '#14532d') : '#374151',
              marginLeft: '10px'
            }}>
              {supportsPausedCheck ? (isPaused ? 'PAUSED' : 'ACTIVE') : 'UNKNOWN'}
            </span>
          </div>
            <button
            onClick={handleAdminLogout}
              style={{
                padding: '0.5rem 1rem',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Wallet Connection - Exact match to HTML */}
      <div style={{
        background: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        <div>
          <span style={{
            display: 'inline-block',
            marginRight: '1rem',
            fontWeight: '600',
            color: isConnected ? '#10b981' : '#ef4444'
          }}>
            {isConnected ? `Connected: ${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Not Connected'}
          </span>
          <span style={{ color: '#6b7280', marginRight: '1rem' }}>
            {getNetworkStatus()}
          </span>
          {!isConnected && (
            <button 
              onClick={connectWallet}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Connect Admin Wallet
            </button>
          )}
        </div>
        {ownerAddress && account && account.toLowerCase() !== ownerAddress.toLowerCase() && (
          <div style={{ marginTop: '0.5rem', color: '#dc3545', fontSize: '0.9rem' }}>
            ⚠️ Connected wallet is NOT the contract owner. Execution will fail.
          </div>
        )}
          </div>

      {/* Pending Withdrawals - Exact match to HTML */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        padding: '2rem'
      }}>
        <h2 style={{ margin: '0 0 2rem 0', fontSize: '1.5rem', fontWeight: 'bold' }}>
          <i className="fas fa-list"></i> Pending Withdrawals
        </h2>

          {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
              <p>Loading pending withdrawals...</p>
            </div>
          ) : pendingWithdrawals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <i className="fas fa-check-circle" style={{ fontSize: '3rem', color: '#10b981', marginBottom: '1rem' }}></i>
            <h3>No pending withdrawals</h3>
            <p>All withdrawal requests have been processed.</p>
            </div>
          ) : (
          <div>
            {pendingWithdrawals.map((withdrawal) => {
              const createdAt = withdrawal.createdAt?.toDate?.() || new Date()
              const formattedDate = createdAt.toLocaleString()
              const isOwner = ownerAddress && account && (ownerAddress.toLowerCase() === account.toLowerCase())
              const shouldDisable = (supportsPausedCheck && isPaused) || !isOwner
              
              return (
                <div key={withdrawal.id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '1.5rem',
                  marginBottom: '1rem',
                  background: '#f9fafb'
                }}>
                  {/* Withdrawal Header */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem'
                  }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem' }}>
                      {withdrawal.type === 'crypto_to_inr' 
                        ? `${withdrawal.crypto} → INR Withdrawal` 
                        : `INR → ${withdrawal.crypto} Withdrawal`
                      }
                    </h3>
                          <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      background: withdrawal.status === 'pending_admin_execution' ? '#fef3c7' : '#fee2e2',
                      color: withdrawal.status === 'pending_admin_execution' ? '#92400e' : '#991b1b'
                    }}>
                      {withdrawal.status.replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </div>

                  {/* Withdrawal Info Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem',
                    marginBottom: '1rem'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>User ID</span>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>{withdrawal.userId}</span>
                    </div>
                    
                    {withdrawal.type === 'crypto_to_inr' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Bank Account</span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{withdrawal.bankDetails?.accountNumber || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>IFSC Code</span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>{withdrawal.bankDetails?.ifscCode || 'N/A'}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Crypto Destination</span>
                          <span style={{ fontWeight: '600', color: '#10b981' }}>Admin Wallet ({account?.slice(0, 6)}...{account?.slice(-4)})</span>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>User Address</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{withdrawal.userAddress}</span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>INR Amount</span>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>₹{withdrawal.inrAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Crypto Amount</span>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>{withdrawal.cryptoAmount.toFixed(8)} {withdrawal.crypto}</span>
                    </div>
                    
                    {withdrawal.type === 'inr_to_crypto' && (
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Token Address</span>
                        <span style={{ fontWeight: '600', color: '#1f2937' }}>{withdrawal.tokenAddress}</span>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>Created At</span>
                      <span style={{ fontWeight: '600', color: '#1f2937' }}>{formattedDate}</span>
                      </div>
                    </div>
                    
                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button
                      onClick={() => executeWithdrawal(withdrawal)}
                      disabled={shouldDisable}
                          style={{
                        background: '#10b981',
                            color: 'white',
                            border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        cursor: shouldDisable ? 'not-allowed' : 'pointer',
                        transition: 'background 0.2s',
                        opacity: shouldDisable ? 0.6 : 1
                      }}
                      title={!isOwner ? 'Connect the contract owner wallet' : 'Contract is paused'}
                    >
                      <i className="fas fa-check"></i> 
                      {withdrawal.type === 'crypto_to_inr' ? 'Execute Crypto Transfer' : 'Execute Withdrawal'}
                        </button>
                        <button
                          onClick={() => rejectWithdrawal(withdrawal)}
                          style={{
                        background: '#ef4444',
                            color: 'white',
                            border: 'none',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      <i className="fas fa-times"></i> Reject
                        </button>
                        </div>
                      </div>
              )
            })}
            </div>
          )}
      </div>
    </div>
  )
}

export default AdminWithdrawals

