import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useWeb3 } from '../contexts/Web3Context'
import { useCryptoPrices } from '../contexts/CryptoPriceContext'
import { TransactionService, Transaction } from '../services/transactions'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '../config/firebase'
import toast from 'react-hot-toast'
import { CONTRACT_CONFIG } from '../config/contracts'

const Withdraw: React.FC = () => {
  const [inrWithdraw, setInrWithdraw] = useState({
    crypto: 'BTC',
    amount: '',
    bankAccount: '',
    ifscCode: ''
  })
  const [cryptoWithdraw, setCryptoWithdraw] = useState({
    crypto: 'BTC',
    inrAmount: '',
    walletAddress: ''
  })
  const [recentWithdrawals, setRecentWithdrawals] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(true)
  const [contractBXCBalance, setContractBXCBalance] = useState<string | null>(null)

  const { currentUser, userProfile, updateUserProfile, refreshUserProfile } = useAuth()
  const { account, isConnected, connectWallet, web3, getNetworkStatus } = useWeb3()
  const { prices, convertFromINR, refreshPrices } = useCryptoPrices()
  const navigate = useNavigate()

  const loadRecentWithdrawals = useCallback(async () => {
    if (!currentUser) return

    try {
      setWithdrawalsLoading(true)
      const withdrawals = await TransactionService.getUserTransactions(currentUser.uid, 'withdrawal', 5)
      setRecentWithdrawals(withdrawals)
    } catch (error) {
      console.error('Error loading recent withdrawals:', error)
      toast.error('Error loading recent withdrawals')
    } finally {
      setWithdrawalsLoading(false)
    }
  }, [currentUser])

  const checkContractBalances = useCallback(async () => {
    if (!web3 || !isConnected) {
      setContractBXCBalance('Not connected')
      return
    }

    try {
      const bxcAddress = CONTRACT_CONFIG.contracts.bxc
      const cryptoWalletAddress = CONTRACT_CONFIG.contracts.cryptoWallet

      // Check if we have valid contract addresses (not placeholder addresses)
      if (bxcAddress === '0x3456789012345678901234567890123456789012' || 
          cryptoWalletAddress === '0x1234567890123456789012345678901234567890' ||
          !bxcAddress || !cryptoWalletAddress) {
        console.warn('Using placeholder or missing contract addresses - showing demo balance')
        setContractBXCBalance('1000.00 (Demo)')
        return
      }

      const bxcABI: any[] = [
        {
          "constant": true,
          "inputs": [{"name": "_owner", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"name": "balance", "type": "uint256"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "decimals",
          "outputs": [{"name": "", "type": "uint8"}],
          "type": "function"
        },
        {
          "constant": true,
          "inputs": [],
          "name": "symbol",
          "outputs": [{"name": "", "type": "string"}],
          "type": "function"
        }
      ]

      const bxcContract = new web3.eth.Contract(bxcABI, bxcAddress)
      
      // Add timeout for contract calls
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Contract call timeout')), 8000)
      )
      
      const balancePromise = bxcContract.methods.balanceOf(cryptoWalletAddress).call()
      
      const bxcBalance = await Promise.race([balancePromise, timeoutPromise]) as string
      const bxcBalanceFormatted = parseFloat(web3.utils.fromWei(bxcBalance, 'ether')).toFixed(8)
      setContractBXCBalance(bxcBalanceFormatted)
    } catch (error: any) {
      console.warn('Contract balance check failed, using demo mode:', error.message)
      // In demo/development mode, show a placeholder balance
      setContractBXCBalance('1000.00 (Demo)')
    }
  }, [web3, isConnected])

  useEffect(() => {
    if (!currentUser) {
      navigate('/')
      return
    }

    // Call functions once on mount/user change
    const initializeData = async () => {
      await loadRecentWithdrawals()
      await refreshPrices()
      await checkContractBalances()
    }

    initializeData()

    const handleBalanceUpdate = () => {
      refreshUserProfile()
      loadRecentWithdrawals()
      checkContractBalances()
    }
    window.addEventListener('balanceUpdated', handleBalanceUpdate)

    return () => {
      window.removeEventListener('balanceUpdated', handleBalanceUpdate)
    }
  }, [currentUser, navigate, loadRecentWithdrawals, checkContractBalances])

  const handleInrWithdrawal = async () => {
    const amount = parseFloat(inrWithdraw.amount)
    const selectedCrypto = inrWithdraw.crypto

    if (!selectedCrypto || !amount || amount <= 0) {
      toast.error('Please fill in all fields with valid amounts')
      return
    }

    if (!inrWithdraw.bankAccount || !inrWithdraw.ifscCode) {
      toast.error('Please fill in bank account details')
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
      toast.loading('Processing crypto-to-INR withdrawal request...', { id: 'inr-withdraw-toast' })

      // Calculate INR equivalent using current crypto prices
      const inrAmount = amount * (prices[selectedCrypto as keyof typeof prices] || 0)
      
      if (inrAmount <= 0) {
        toast.dismiss('inr-withdraw-toast')
        toast.error('Unable to calculate INR value. Please try again.')
        setLoading(false)
        return
      }

      // IMPORTANT: Do NOT deduct crypto balance here
      // Crypto will only be deducted when admin processes the withdrawal
      console.log('🔄 Crypto-to-INR withdrawal requested - crypto will be deducted only when admin processes the withdrawal')

      // Create pending withdrawal request in Firestore
      await addDoc(collection(db, 'pending_withdrawals'), {
        userId: currentUser!.uid,
        userAddress: '', // Not applicable for bank withdrawals
        crypto: selectedCrypto,
        cryptoAmount: amount,
        inrAmount: inrAmount,
        tokenAddress: CONTRACT_CONFIG.contracts[selectedCrypto.toLowerCase() as keyof typeof CONTRACT_CONFIG.contracts],
        status: 'pending_admin_execution',
        createdAt: new Date(),
        type: 'crypto_to_inr',
        bankDetails: {
          accountNumber: inrWithdraw.bankAccount,
          ifscCode: inrWithdraw.ifscCode
        }
      })

      // Log transaction as pending
      await TransactionService.logTransaction({
        userId: currentUser!.uid,
        type: 'withdrawal',
        amount: amount,
        currency: selectedCrypto,
        description: `Converted ${amount} ${selectedCrypto} to ₹${inrAmount.toFixed(2)} and requested withdrawal to bank account ${inrWithdraw.bankAccount}`,
        status: 'pending'
      })

      toast.dismiss('inr-withdraw-toast')
      toast.success(`Crypto-to-INR withdrawal request submitted. Admin will process the withdrawal shortly.`)

      setInrWithdraw({
        crypto: 'BTC',
        amount: '',
        bankAccount: '',
        ifscCode: ''
      })

      refreshUserProfile()
      loadRecentWithdrawals()
    } catch (error: any) {
      console.error('INR Withdrawal error:', error)
      toast.dismiss('inr-withdraw-toast')
      toast.error('Error processing INR withdrawal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCryptoWithdrawal = async () => {
    const inrAmount = parseFloat(cryptoWithdraw.inrAmount)
    const selectedCrypto = cryptoWithdraw.crypto
    const walletAddress = cryptoWithdraw.walletAddress

    if (!selectedCrypto || !inrAmount || inrAmount < 100) {
      toast.error('Please enter a valid INR amount (minimum ₹100)')
      return
    }

    if (!walletAddress) {
      toast.error('Please enter a valid wallet address')
      return
    }

    if (!isValidWalletAddress(walletAddress)) {
      toast.error('Invalid wallet address format. Please enter a valid Ethereum address (0x...)')
      return
    }

    if (!userProfile) {
      toast.error('User profile not loaded')
      return
    }

    if (inrAmount > userProfile.inrBalance) {
      toast.error('Insufficient INR balance')
      return
    }

    if (!isConnected || !web3) {
      toast.error('Please connect your MetaMask wallet to withdraw cryptocurrency.')
      return
    }

    try {
      setLoading(true)
      toast.loading('Processing crypto withdrawal...', { id: 'crypto-withdraw-toast' })

      const cryptoAmount = convertFromINR(inrAmount, selectedCrypto as keyof typeof prices)
      if (isNaN(cryptoAmount) || cryptoAmount <= 0) {
        throw new Error('Invalid crypto amount calculated.')
      }

      if (selectedCrypto === 'BXC' && contractBXCBalance !== null) {
        if (parseFloat(contractBXCBalance) < cryptoAmount) {
          toast.dismiss('crypto-withdraw-toast')
          toast.error(
            `Insufficient BXC balance in smart contract. Contract has ${contractBXCBalance} BXC, but ${cryptoAmount.toFixed(8)} BXC is required. Please load more BXC tokens into the contract.`
          )
          setLoading(false)
          return
        }
      }

      // IMPORTANT: Do NOT deduct INR balance here
      // INR will only be deducted when BXC is actually received by user's wallet
      console.log('🔄 Crypto withdrawal requested - INR will be deducted only when crypto is received by user wallet')

      await addDoc(collection(db, 'pending_withdrawals'), {
        userId: currentUser!.uid,
        userAddress: walletAddress,
        crypto: selectedCrypto,
        cryptoAmount,
        inrAmount,
        tokenAddress: CONTRACT_CONFIG.contracts[selectedCrypto.toLowerCase() as keyof typeof CONTRACT_CONFIG.contracts],
        status: 'pending_admin_execution',
        createdAt: new Date(),
        type: 'inr_to_crypto'
      })

      await TransactionService.logTransaction({
        userId: currentUser!.uid,
        type: 'withdrawal',
        amount: cryptoAmount,
        currency: selectedCrypto,
        description: `INR to ${selectedCrypto} withdrawal to external wallet ${walletAddress}`,
        status: 'pending'
      })

      toast.dismiss('crypto-withdraw-toast')
      toast.success(`INR to ${selectedCrypto} withdrawal request submitted. Admin will process the crypto transfer shortly.`)

      setCryptoWithdraw({
        crypto: 'BTC',
        inrAmount: '',
        walletAddress: ''
      })

      refreshUserProfile()
      loadRecentWithdrawals()
      checkContractBalances()
    } catch (error: any) {
      console.error('Crypto Withdrawal error:', error)
      toast.dismiss('crypto-withdraw-toast')
      toast.error('Error processing crypto withdrawal: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isValidWalletAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  const getInrConversionInfo = () => {
    const amount = parseFloat(inrWithdraw.amount) || 0
    const selectedCrypto = inrWithdraw.crypto
    const price = prices[selectedCrypto as keyof typeof prices]
    if (amount > 0 && typeof price === 'number') {
      const inrValue = amount * price
      return `≈ ₹${inrValue.toFixed(2)}`
    }
    return 'Select crypto and enter amount'
  }

  const getCryptoConversionInfo = () => {
    const inrAmount = parseFloat(cryptoWithdraw.inrAmount) || 0
    const selectedCrypto = cryptoWithdraw.crypto
    if (inrAmount > 0 && prices[selectedCrypto as keyof typeof prices]) {
      const cryptoAmount = convertFromINR(inrAmount, selectedCrypto as keyof typeof prices)
      return `≈ ${cryptoAmount.toFixed(8)} ${selectedCrypto}`
    }
    return 'Select crypto and enter INR amount'
  }

  const renderTransactionHistory = (transactions: Transaction[]) => {
    if (withdrawalsLoading) {
      return <p>Loading transactions...</p>
    }

    if (transactions.length === 0) {
      return <p style={{ color: '#666', textAlign: 'center', padding: '2rem' }}>No recent withdrawals found.</p>
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
              <p style={{ fontWeight: '600', margin: 0 }}>
                {transaction.amount} {transaction.currency}
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
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Withdraw Funds</h1>
          <p style={{ color: '#666', fontSize: '1.1rem' }}>Withdraw INR or cryptocurrency from your wallet</p>
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

        <div className="grid grid-cols-2" style={{ gap: '2rem' }}>
          {/* INR Withdrawal */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>💰 Withdraw INR</h2>
            </div>
            <div className="card">
              <p style={{ color: '#666', marginBottom: '1rem' }}>Convert crypto to INR and withdraw to your bank account</p>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select Cryptocurrency
                </label>
                <select
                  value={inrWithdraw.crypto}
                  onChange={(e) => setInrWithdraw(prev => ({ ...prev, crypto: e.target.value }))}
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
                  value={inrWithdraw.amount}
                  onChange={(e) => setInrWithdraw(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#666' }}>{getInrConversionInfo()}</small>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Bank Account Number
                </label>
                <input
                  type="text"
                  placeholder="Enter bank account number"
                  value={inrWithdraw.bankAccount}
                  onChange={(e) => setInrWithdraw(prev => ({ ...prev, bankAccount: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="Enter IFSC code"
                  value={inrWithdraw.ifscCode}
                  onChange={(e) => setInrWithdraw(prev => ({ ...prev, ifscCode: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
              </div>
              <button
                onClick={handleInrWithdrawal}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Processing...' : 'Withdraw INR'}
              </button>
            </div>
          </div>

          {/* Crypto Withdrawal */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>🪙 Withdraw Cryptocurrency</h2>
            </div>
            <div className="card">
              <div style={{ marginBottom: '1rem' }}>
                <span style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  background: isConnected ? '#d4edda' : '#f8d7da',
                  color: isConnected ? '#155724' : '#721c24',
                  border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`
                }}>
                  {isConnected && account ? `Connected: ${account.slice(0, 6)}...${account.slice(-4)}` : 'Not Connected'}
                </span>
                <span style={{ marginLeft: '1rem', color: '#666' }}>{getNetworkStatus()}</span>
                {!isConnected && (
                  <button onClick={connectWallet} style={{ marginLeft: '1rem', background: '#007bff', color: 'white', border: 'none' }}>
                    Connect Wallet
                  </button>
                )}
              </div>
              <p style={{ color: '#666', marginBottom: '1rem' }}>Convert INR to crypto and withdraw to external wallet</p>
              
              {contractBXCBalance !== null && (
                <div style={{
                  background: '#f0f9ff',
                  border: '1px solid #0ea5e9',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#0c4a6e' }}>Smart Contract Balance Required</strong>
                  </div>
                  <p style={{ margin: 0, color: '#0c4a6e', fontSize: '0.9rem' }}>
                    {contractBXCBalance === 'Error' ? (
                      <span style={{ color: '#dc2626' }}>⚠️ Error checking contract balance!</span>
                    ) : parseFloat(contractBXCBalance) > 0 ? (
                      <span>Contract has <strong>{contractBXCBalance} BXC tokens</strong> available.</span>
                    ) : (
                      <span style={{ color: '#dc2626' }}>⚠️ No BXC tokens in contract!</span>
                    )}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Select Cryptocurrency
                </label>
                <select
                  value={cryptoWithdraw.crypto}
                  onChange={(e) => setCryptoWithdraw(prev => ({ ...prev, crypto: e.target.value }))}
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
                  INR Amount
                </label>
                <input
                  type="number"
                  placeholder="Enter INR amount"
                  min="100"
                  step="100"
                  value={cryptoWithdraw.inrAmount}
                  onChange={(e) => setCryptoWithdraw(prev => ({ ...prev, inrAmount: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#666' }}>{getCryptoConversionInfo()}</small>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  Wallet Address
                </label>
                <input
                  type="text"
                  placeholder="Enter wallet address"
                  value={cryptoWithdraw.walletAddress}
                  onChange={(e) => setCryptoWithdraw(prev => ({ ...prev, walletAddress: e.target.value }))}
                  required
                  style={{ width: '100%' }}
                />
                <small style={{ color: '#666' }}>Make sure the address is correct for the selected cryptocurrency</small>
              </div>
              <button
                onClick={handleCryptoWithdrawal}
                disabled={loading || !isConnected}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: '600',
                  cursor: (loading || !isConnected) ? 'not-allowed' : 'pointer',
                  opacity: (loading || !isConnected) ? 0.6 : 1
                }}
              >
                {loading ? 'Processing...' : 'Withdraw Crypto'}
              </button>
            </div>
          </div>
        </div>

        {/* Withdrawal History */}
        <div style={{ marginTop: '3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📊 Recent Withdrawals</h2>
          </div>
          <div className="card">
            {renderTransactionHistory(recentWithdrawals)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Withdraw