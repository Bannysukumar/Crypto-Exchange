import React, { createContext, useContext, useEffect, useState } from 'react'
import Web3 from 'web3'
import { CONTRACT_CONFIG, CRYPTO_WALLET_ABI, BXC_TOKEN_ABI, ERC20_ABI } from '../config/contracts'
import { useAuth } from './AuthContext'
import { TransactionService } from '../services/transactions'
import { firebaseService } from '../services/firebase'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    ethereum?: any
    web3?: any
  }
}

interface Web3ContextType {
  web3: Web3 | null
  account: string | null
  isConnected: boolean
  chainId: string | null
  contract: any
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  switchToSepolia: () => Promise<void>
  getNetworkStatus: () => string
  validateUserBalances: () => Promise<void>
  refreshAllBalances: () => Promise<void>
  updateUserCryptoBalance: (currency: string, newBalance: number) => Promise<void>
  logTransaction: (type: string, amount: number, currency: string, description: string, txHash?: string) => Promise<void>
  // Contract interaction functions
  depositCrypto: (tokenAddress: string, amount: string) => Promise<string>
  withdrawCrypto: (tokenAddress: string, amount: string) => Promise<string>
  transferCrypto: (recipient: string, tokenAddress: string, amount: string) => Promise<string>
  executeWithdrawalTo: (recipient: string, tokenAddress: string, amount: string) => Promise<string>
  getContractInfo: () => Promise<any>
  isContractPaused: () => Promise<boolean>
  // Direct deposit detection functions
  checkDirectDepositsToContract: () => Promise<void>
  startTransactionMonitoring: () => void
  stopTransactionMonitoring: () => void
  detectTransactionByHash: (txHash: string) => Promise<void>
  // Admin functions
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined)

export const useWeb3 = () => {
  const context = useContext(Web3Context)
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider')
  }
  return context
}

export const Web3Provider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [web3, setWeb3] = useState<Web3 | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [chainId, setChainId] = useState<string | null>(null)
  const [contract, setContract] = useState<any>(null)
  const [isScanning, setIsScanning] = useState(false) // Add scanning state to prevent multiple simultaneous scans
  const [processedTransactions, setProcessedTransactions] = useState<Set<string>>(new Set()) // Track processed transactions
  
  // Global processed transactions set (persistent across re-renders)
  const globalProcessedTransactions = (window as any).globalProcessedTransactions || new Set<string>()
  if (!(window as any).globalProcessedTransactions) {
    (window as any).globalProcessedTransactions = globalProcessedTransactions
  }
  
  const { currentUser, updateUserProfile } = useAuth()

  const initWeb3 = async () => {
    if (window.ethereum) {
      try {
        const web3Instance = new Web3(window.ethereum)
        setWeb3(web3Instance)

        // Create contract instance
        const contractInstance = new web3Instance.eth.Contract(
          CRYPTO_WALLET_ABI,
          CONTRACT_CONFIG.contracts.cryptoWallet
        )
        setContract(contractInstance)

        // Check if already connected
        const accounts = await web3Instance.eth.getAccounts()
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          const currentChainId = await web3Instance.eth.getChainId()
          setChainId(`0x${currentChainId.toString(16)}`)
        }
      } catch (error) {
        console.error('Error initializing Web3:', error)
      }
    }
  }

  const connectWallet = async () => {
    if (!window.ethereum) {
      toast.error('Please install MetaMask!')
      return
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      })
      
      if (accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)
        const currentChainId = await web3!.eth.getChainId()
        setChainId(`0x${currentChainId.toString(16)}`)
        toast.success('Wallet connected successfully!')
        
        // Switch to Sepolia if not already on it
        await switchToSepolia()
      }
    } catch (error: any) {
      console.error('Error connecting wallet:', error)
      toast.error('Failed to connect wallet')
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setIsConnected(false)
    setChainId(null)
    setContract(null)
    toast.success('Wallet disconnected')
  }

  const switchToSepolia = async () => {
    if (!window.ethereum) return

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: CONTRACT_CONFIG.networks.sepolia.chainId }]
      })
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: CONTRACT_CONFIG.networks.sepolia.chainId,
                chainName: CONTRACT_CONFIG.networks.sepolia.chainName,
                nativeCurrency: CONTRACT_CONFIG.networks.sepolia.nativeCurrency,
                rpcUrls: CONTRACT_CONFIG.networks.sepolia.rpcUrls,
                blockExplorerUrls: CONTRACT_CONFIG.networks.sepolia.blockExplorerUrls
              }
            ]
          })
        } catch (addError) {
          console.error('Error adding Sepolia network:', addError)
          toast.error('Failed to add Sepolia network')
        }
      } else {
        console.error('Error switching to Sepolia:', switchError)
        toast.error('Failed to switch to Sepolia network')
      }
    }
  }

  const getNetworkStatus = (): string => {
    if (!isConnected) return 'Not Connected'
    if (chainId === CONTRACT_CONFIG.networks.sepolia.chainId) {
      return 'Connected to Sepolia'
    }
    return 'Wrong Network'
  }

  const validateUserBalances = async () => {
    if (!web3 || !account || !currentUser) return

    try {
      // Get balances from smart contract
      const cryptoWalletContract = new web3.eth.Contract(CRYPTO_WALLET_ABI, CONTRACT_CONFIG.contracts.cryptoWallet)
      
      // Get user balances from contract
      const contractBalances = await cryptoWalletContract.methods.getUserBalances(account).call()
      const usdtBalanceFormatted = parseFloat(web3.utils.fromWei(contractBalances.usdtBalance, 'ether'))
      const bxcBalanceFormatted = parseFloat(web3.utils.fromWei(contractBalances.bxcBalance, 'ether'))
      const inrBalanceFormatted = parseFloat(web3.utils.fromWei(contractBalances.inrBalance, 'ether'))

      // Also check direct token balances (for external tokens)
      const usdtContract = new web3.eth.Contract(ERC20_ABI, CONTRACT_CONFIG.contracts.usdt)
      const bxcContract = new web3.eth.Contract(BXC_TOKEN_ABI, CONTRACT_CONFIG.contracts.bxc)
      
      const directUsdtBalance = await usdtContract.methods.balanceOf(account).call()
      const directBxcBalance = await bxcContract.methods.balanceOf(account).call()
      
      const directUsdtFormatted = parseFloat(web3.utils.fromWei(directUsdtBalance, 'ether'))
      const directBxcFormatted = parseFloat(web3.utils.fromWei(directBxcBalance, 'ether'))

      // Update user profile with contract balances + external balances
      await updateUserProfile({
        cryptoBalances: {
          BTC: 0, // BTC not supported on Sepolia
          USDT: usdtBalanceFormatted + directUsdtFormatted,
          BXC: bxcBalanceFormatted + directBxcFormatted
        },
        inrBalance: inrBalanceFormatted
      })

      // Check for direct deposits to contract address
      await checkDirectDepositsToContract()
    } catch (error) {
      console.error('Error validating balances:', error)
      // Fallback to direct token balance check
      try {
        const usdtContract = new web3.eth.Contract(ERC20_ABI, CONTRACT_CONFIG.contracts.usdt)
      const bxcContract = new web3.eth.Contract(BXC_TOKEN_ABI, CONTRACT_CONFIG.contracts.bxc)
        
        const usdtBalance = await usdtContract.methods.balanceOf(account).call()
      const bxcBalance = await bxcContract.methods.balanceOf(account).call()
        
        const usdtBalanceFormatted = parseFloat(web3.utils.fromWei(usdtBalance, 'ether'))
      const bxcBalanceFormatted = parseFloat(web3.utils.fromWei(bxcBalance, 'ether'))

      await updateUserProfile({
        cryptoBalances: {
            BTC: 0,
          USDT: usdtBalanceFormatted,
          BXC: bxcBalanceFormatted
        }
      })

        // Still check for direct deposits even in fallback mode
        await checkDirectDepositsToContract()
      } catch (fallbackError) {
        console.error('Fallback balance check failed:', fallbackError)
      }
    }
  }

  const refreshAllBalances = async () => {
    await validateUserBalances()
    toast.success('Balances refreshed!')
  }

  // Check for direct deposits to contract address
  const checkDirectDepositsToContract = async () => {
    if (!web3 || !account || !currentUser) {
      console.log('❌ Cannot check deposits: missing web3, account, or currentUser')
      return
    }

    // Prevent multiple simultaneous scans
    if (isScanning) {
      console.log('⏳ Scan already in progress, skipping...')
      return
    }

    setIsScanning(true)

    try {
      console.log('🔍 Checking for direct deposits to contract...')
      console.log('Current account:', account)
      console.log('Current user:', currentUser.uid)
      
      const contractAddress = CONTRACT_CONFIG.contracts.cryptoWallet
      const usdtAddress = CONTRACT_CONFIG.contracts.usdt
      const bxcAddress = CONTRACT_CONFIG.contracts.bxc

      console.log('Contract addresses:', { contractAddress, usdtAddress, bxcAddress })

      // Get recent blocks to check for transfers - scan fewer blocks to prevent duplicates
      const latestBlock = await web3.eth.getBlockNumber()
      const fromBlock = Math.max(0, latestBlock - 50) // Check last 50 blocks only to prevent duplicates

      console.log(`Scanning blocks ${fromBlock} to ${latestBlock} (${latestBlock - fromBlock} blocks)`)

      // Check USDT transfers to contract
      let usdtTransfers: any[] = []
      try {
        const usdtContract = new web3.eth.Contract(ERC20_ABI, usdtAddress)
        usdtTransfers = await usdtContract.getPastEvents('Transfer', {
          fromBlock: fromBlock,
          toBlock: 'latest',
          filter: { to: contractAddress }
        })
        console.log(`Found ${usdtTransfers.length} USDT transfers to contract`)
      } catch (error) {
        console.log('Error fetching USDT transfers:', error)
      }

      // Check BXC transfers to contract
      let bxcTransfers: any[] = []
      try {
        const bxcContract = new web3.eth.Contract(ERC20_ABI, bxcAddress)
        bxcTransfers = await bxcContract.getPastEvents('Transfer', {
          fromBlock: fromBlock,
          toBlock: 'latest',
          filter: { to: contractAddress }
        })
        console.log(`Found ${bxcTransfers.length} BXC transfers to contract`)
      } catch (error) {
        console.log('Error fetching BXC transfers:', error)
      }

      // Check for withdrawals TO the user (from contract)
      let usdtWithdrawals: any[] = []
      let bxcWithdrawals: any[] = []
      
      try {
        const usdtContract = new web3.eth.Contract(ERC20_ABI, usdtAddress)
        usdtWithdrawals = await usdtContract.getPastEvents('Transfer', {
          fromBlock: fromBlock,
          toBlock: 'latest',
          filter: { 
            from: contractAddress,
            to: account.toLowerCase()
          }
        })
        console.log(`Found ${usdtWithdrawals.length} USDT withdrawals to user`)
      } catch (error) {
        console.log('Error fetching USDT withdrawals:', error)
      }

      try {
        const bxcContract = new web3.eth.Contract(ERC20_ABI, bxcAddress)
        bxcWithdrawals = await bxcContract.getPastEvents('Transfer', {
          fromBlock: fromBlock,
          toBlock: 'latest',
          filter: { 
            from: contractAddress,
            to: account.toLowerCase()
          }
        })
        console.log(`Found ${bxcWithdrawals.length} BXC withdrawals to user`)
      } catch (error) {
        console.log('Error fetching BXC withdrawals:', error)
      }

      // Log all transfers for debugging
      console.log('USDT transfers to contract:', usdtTransfers.map(t => ({ from: t.returnValues.from, to: t.returnValues.to, value: t.returnValues.value, txHash: t.transactionHash })))
      console.log('BXC transfers to contract:', bxcTransfers.map(t => ({ from: t.returnValues.from, to: t.returnValues.to, value: t.returnValues.value, txHash: t.transactionHash })))
      console.log('USDT withdrawals to user:', usdtWithdrawals.map(t => ({ from: t.returnValues.from, to: t.returnValues.to, value: t.returnValues.value, txHash: t.transactionHash })))
      console.log('BXC withdrawals to user:', bxcWithdrawals.map(t => ({ from: t.returnValues.from, to: t.returnValues.to, value: t.returnValues.value, txHash: t.transactionHash })))

      // Process USDT deposits to contract
      for (const transfer of usdtTransfers) {
        await processDirectDeposit(transfer, 'USDT', usdtAddress)
      }

      // Process BXC deposits to contract
      for (const transfer of bxcTransfers) {
        await processDirectDeposit(transfer, 'BXC', bxcAddress)
      }

      // Process USDT withdrawals to user
      for (const transfer of usdtWithdrawals) {
        await processWithdrawalReceived(transfer, 'USDT', usdtAddress)
      }

      // Process BXC withdrawals to user
      for (const transfer of bxcWithdrawals) {
        await processWithdrawalReceived(transfer, 'BXC', bxcAddress)
      }

    } catch (error) {
      console.error('Error checking direct deposits:', error)
    } finally {
      setIsScanning(false) // Always reset scanning state
    }
  }

  // Process a direct deposit transfer
  const processDirectDeposit = async (transfer: any, tokenType: string, _tokenAddress: string) => {
    if (!web3 || !account || !currentUser) {
      console.log('❌ Cannot process deposit: missing web3, account, or currentUser')
      return
    }

    try {
      const { from, to, value } = transfer.returnValues
      
      console.log(`🔍 Processing ${tokenType} transfer:`, {
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        account: account.toLowerCase(),
        contract: CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase(),
        value: value,
        txHash: transfer.transactionHash
      })
      
      // Check if this transfer is from the current user to the contract
      if (from.toLowerCase() === account.toLowerCase() && to.toLowerCase() === CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase()) {
        const amount = parseFloat(web3.utils.fromWei(value, 'ether'))
        
        console.log(`💰 Detected direct ${tokenType} deposit: ${amount} from ${from}`)
        
        // Check if this transaction was already processed (global cache + database)
        const txHash = transfer.transactionHash
        
        // First check global cache for immediate duplicate prevention
        if (globalProcessedTransactions.has(txHash)) {
          console.log(`⏭️ Skipping duplicate ${tokenType} transaction (global cache): ${txHash}`)
          return
        }
        
        // Then check database for persistent duplicate prevention
        const existingTx = await TransactionService.getTransactionByHash(currentUser.uid, txHash)
        
        if (!existingTx) {
          console.log(`📝 Logging new ${tokenType} transaction: ${amount}`)
          
          // Add to global cache immediately to prevent race conditions
          globalProcessedTransactions.add(txHash)
          setProcessedTransactions(prev => new Set(prev).add(txHash))
          
          // Log the transaction
          console.log(`🔧 About to log transaction:`, { type: 'deposit', amount, tokenType, txHash })
          await logTransaction('deposit', amount, tokenType, `Direct ${tokenType} deposit to contract`, txHash)
          console.log(`✅ Transaction logging completed for ${tokenType} deposit`)
          
          // Update user balance
          console.log(`💳 Updating ${tokenType} balance: +${amount}`)
          await updateUserCryptoBalance(tokenType, amount)
          
          // Show notification
          toast.success(`${tokenType} deposit detected: ${amount} ${tokenType}`)
          
          // Trigger balance update event
          window.dispatchEvent(new CustomEvent('balanceUpdated'))
          
          console.log(`✅ Successfully processed ${tokenType} deposit`)
        } else {
          console.log(`⏭️ Skipping duplicate ${tokenType} transaction (database): ${txHash}`)
          // Add to global cache even if it's a duplicate to prevent future processing
          globalProcessedTransactions.add(txHash)
          setProcessedTransactions(prev => new Set(prev).add(txHash))
        }
      } else {
        console.log(`❌ Transfer not from current user or not to contract`)
      }
    } catch (error) {
      console.error(`Error processing ${tokenType} deposit:`, error)
    }
  }

  // Process a withdrawal received transfer (from contract to user)
  const processWithdrawalReceived = async (transfer: any, tokenType: string, _tokenAddress: string) => {
    if (!web3 || !account || !currentUser) {
      console.log('❌ Cannot process withdrawal: missing web3, account, or currentUser')
      return
    }

    try {
      const { from, to, value } = transfer.returnValues
      
      console.log(`🔍 Processing ${tokenType} withdrawal received:`, {
        from: from.toLowerCase(),
        to: to.toLowerCase(),
        account: account.toLowerCase(),
        contract: CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase(),
        value: value,
        txHash: transfer.transactionHash
      })
      
      // Check if this transfer is from the contract to the current user
      if (from.toLowerCase() === CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase() && to.toLowerCase() === account.toLowerCase()) {
        const amount = parseFloat(web3.utils.fromWei(value, 'ether'))
        
        console.log(`💰 Detected ${tokenType} withdrawal received: ${amount} to ${to}`)
        
        // Check if this transaction was already processed
        const txHash = transfer.transactionHash
        const existingTx = await TransactionService.getTransactionByHash(currentUser.uid, txHash)
        
        if (!existingTx) {
          console.log(`📝 Logging new ${tokenType} withdrawal received: ${amount}`)
          
          // Log the transaction
          await logTransaction('receive', amount, tokenType, `Withdrawal received: ${tokenType} from admin`, txHash)
          
          // IMPORTANT: For BXC withdrawals, deduct INR balance when BXC is received
          if (tokenType === 'BXC') {
            console.log(`💳 BXC received - deducting INR balance`)
            await deductInrForBxcWithdrawal(amount, txHash)
            
            // IMPORTANT: Update BXC balance in dashboard when BXC is received
            console.log(`💳 Updating BXC balance: +${amount}`)
            await updateUserCryptoBalance(tokenType, amount)
          }
          
          // Show notification
          toast.success(`🎉 ${tokenType} withdrawal received: ${amount} ${tokenType}`)
          
          // Trigger balance update event
          window.dispatchEvent(new CustomEvent('balanceUpdated'))
          
          console.log(`✅ Successfully processed ${tokenType} withdrawal received`)
        } else {
          console.log(`⏭️ Skipping duplicate ${tokenType} withdrawal transaction: ${txHash}`)
        }
      } else {
        console.log(`❌ Transfer not from contract or not to current user`)
      }
    } catch (error) {
      console.error(`Error processing ${tokenType} withdrawal received:`, error)
    }
  }

  // Deduct INR balance when BXC withdrawal is received
  const deductInrForBxcWithdrawal = async (bxcAmount: number, txHash: string) => {
    if (!currentUser) return

    try {
      // Get current user profile
      const currentProfile = await firebaseService.getUserByUid(currentUser.uid)
      if (!currentProfile) {
        console.error('User profile not found')
        return
      }

      // Calculate INR amount to deduct (you may need to adjust this calculation)
      // For now, we'll use a simple 1:1 ratio, but you might want to use current BXC price
      const inrToDeduct = bxcAmount * 100 // Assuming 1 BXC = 100 INR (adjust as needed)
      
      const newInrBalance = Math.max(0, (currentProfile.inrBalance || 0) - inrToDeduct)
      
      await updateUserProfile({
        inrBalance: newInrBalance
      })

      console.log(`✅ Deducted INR ${inrToDeduct} for BXC withdrawal ${bxcAmount}. New INR balance: ${newInrBalance}`)
      
      // Log the INR deduction transaction
      await logTransaction('withdrawal', inrToDeduct, 'INR', `INR deducted for BXC withdrawal received`, txHash)
      
    } catch (error) {
      console.error('Error deducting INR for BXC withdrawal:', error)
    }
  }

  // Start transaction monitoring
  const startTransactionMonitoring = () => {
    if (!web3 || !account || !currentUser) return

    console.log('🚀 Starting transaction monitoring...')
    
    // Check for deposits every 10 minutes (reduced frequency to prevent duplicates)
    const monitoringInterval = setInterval(async () => {
      try {
        await checkDirectDepositsToContract()
      } catch (error) {
        console.error('Transaction monitoring error:', error)
      }
    }, 600000) // 10 minutes to prevent duplicate processing

    // Store interval ID for cleanup
    ;(window as any).transactionMonitoringInterval = monitoringInterval
  }

  // Stop transaction monitoring
  const stopTransactionMonitoring = () => {
    if ((window as any).transactionMonitoringInterval) {
      clearInterval((window as any).transactionMonitoringInterval)
      ;(window as any).transactionMonitoringInterval = null
      console.log('🛑 Stopped transaction monitoring')
    }
  }

  // Clear processed transactions when user changes
  useEffect(() => {
    if (currentUser) {
      console.log('🔄 User changed, clearing processed transactions cache')
      globalProcessedTransactions.clear()
      setProcessedTransactions(new Set())
    }
  }, [currentUser])

  // Manual transaction detection by transaction hash (for debugging)
  const detectTransactionByHash = async (txHash: string) => {
    if (!web3 || !account || !currentUser) {
      console.log('❌ Cannot detect transaction: missing web3, account, or currentUser')
      return
    }

    try {
      console.log(`🔍 Manually detecting transaction: ${txHash}`)
      
      // Get transaction details
      const tx = await web3.eth.getTransaction(txHash)
      const txReceipt = await web3.eth.getTransactionReceipt(txHash)
      
      console.log('Transaction details:', {
        from: tx.from,
        to: tx.to,
        value: tx.value,
        blockNumber: tx.blockNumber,
        status: txReceipt.status
      })

      // Check if this is a token transfer
      if (tx.to && tx.to.toLowerCase() === CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase()) {
        console.log('✅ Transaction is to contract address')
        
        // Get transaction logs to find Transfer events
        const logs = txReceipt.logs
        console.log('Transaction logs:', logs)
        
        for (const log of logs) {
          // Check if this is a Transfer event
          if (log.topics[0] === web3.utils.keccak256('Transfer(address,address,uint256)')) {
            const from = '0x' + log.topics[1].slice(26)
            const to = '0x' + log.topics[2].slice(26)
            const value = web3.utils.hexToNumberString(log.data)
            
            console.log('Transfer event found:', {
              from: from.toLowerCase(),
              to: to.toLowerCase(),
              value: value,
              account: account.toLowerCase(),
              contract: CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase()
            })
            
            // Check if this transfer is from the current user to the contract
            if (from.toLowerCase() === account.toLowerCase() && 
                to.toLowerCase() === CONTRACT_CONFIG.contracts.cryptoWallet.toLowerCase()) {
              
              const amount = parseFloat(web3.utils.fromWei(value, 'ether'))
              console.log(`💰 Found direct deposit: ${amount} tokens`)
              
              // Check if already processed
              const existingTx = await TransactionService.getTransactionByHash(currentUser.uid, txHash)
              if (!existingTx) {
                console.log('📝 Processing new transaction...')
                
                // Determine token type by contract address
                let tokenType = 'UNKNOWN'
                if (log.address.toLowerCase() === CONTRACT_CONFIG.contracts.usdt.toLowerCase()) {
                  tokenType = 'USDT'
                } else if (log.address.toLowerCase() === CONTRACT_CONFIG.contracts.bxc.toLowerCase()) {
                  tokenType = 'BXC'
                }
                
                if (tokenType !== 'UNKNOWN') {
                  // Log the transaction
                  await logTransaction('deposit', amount, tokenType, `Direct ${tokenType} deposit to contract`, txHash)
                  
                  // Update user balance
                  await updateUserCryptoBalance(tokenType, amount)
                  
                  // Show notification
                  toast.success(`${tokenType} deposit detected: ${amount} ${tokenType}`)
                  
                  // Trigger balance update event
                  window.dispatchEvent(new CustomEvent('balanceUpdated'))
                  
                  console.log(`✅ Successfully processed ${tokenType} deposit`)
                } else {
                  console.log('❌ Unknown token type')
                }
              } else {
                console.log('⏭️ Transaction already processed')
              }
            }
          }
        }
      } else {
        console.log('❌ Transaction is not to contract address')
      }
    } catch (error) {
      console.error('Error detecting transaction by hash:', error)
    }
  }

  const updateUserCryptoBalance = async (currency: string, amountToAdd: number) => {
    if (!currentUser) return

    try {
      console.log(`💳 Updating ${currency} balance: +${amountToAdd}`)
      
      // Use the API service to update balance directly
      await firebaseService.updateUserBalance(currentUser.uid, currency, amountToAdd)
      
      console.log(`✅ Successfully updated ${currency} balance by ${amountToAdd}`)
    } catch (error) {
      console.error('Error updating crypto balance:', error)
      // Try to create the user if they don't exist
      try {
        console.log('🔧 User might not exist, attempting to create user profile...')
        const newUserData = {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          name: currentUser.displayName || '',
          phone: '',
          inrBalance: 0,
          cryptoBalances: {
            BTC: 0,
            USDT: 0,
            BXC: 0
          }
        }
        await firebaseService.createUser(newUserData)
        console.log('✅ User created successfully')
        
        // Try balance update again
        await firebaseService.updateUserBalance(currentUser.uid, currency, amountToAdd)
        console.log(`✅ Successfully updated ${currency} balance after creating user`)
      } catch (createError) {
        console.error('Error creating user and updating balance:', createError)
      }
    }
  }

  const logTransaction = async (
    type: string,
    amount: number,
    currency: string,
    description: string,
    txHash?: string
  ) => {
    if (!currentUser) return

    try {
      console.log('📝 Logging new transaction:', { type, amount, currency, description, txHash })
      const transactionId = await TransactionService.logTransaction({
        userId: currentUser.uid,
        type: type as 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer',
        amount,
        currency,
        description,
        status: 'completed',
        txHash
      })
      console.log('✅ Transaction logged successfully with ID:', transactionId)
    } catch (error) {
      console.error('❌ Error logging transaction:', error)
    }
  }

  // Contract interaction functions
  const depositCrypto = async (tokenAddress: string, amount: string): Promise<string> => {
    if (!web3 || !account || !contract) {
      throw new Error('Web3 not connected')
    }

    try {
      // First approve the contract to spend tokens
      const tokenContract = new web3.eth.Contract(ERC20_ABI, tokenAddress)
      const amountWei = web3.utils.toWei(amount, 'ether')
      
      // Check current allowance
      const currentAllowance = await tokenContract.methods.allowance(account, CONTRACT_CONFIG.contracts.cryptoWallet).call()
      
      if (parseInt(currentAllowance) < parseInt(amountWei)) {
        // Approve the contract to spend tokens
        const approveTx = await tokenContract.methods.approve(CONTRACT_CONFIG.contracts.cryptoWallet, amountWei).send({ from: account })
        console.log('Approval transaction:', approveTx.transactionHash)
      }

      // Deposit tokens to contract
      const depositTx = await contract.methods.depositCrypto(tokenAddress, amountWei).send({ from: account })
      return depositTx.transactionHash
    } catch (error: any) {
      console.error('Deposit error:', error)
      throw new Error(`Deposit failed: ${error.message}`)
    }
  }

  const withdrawCrypto = async (tokenAddress: string, amount: string): Promise<string> => {
    if (!web3 || !account || !contract) {
      throw new Error('Web3 not connected')
    }

    try {
      const amountWei = web3.utils.toWei(amount, 'ether')
      const withdrawTx = await contract.methods.withdrawCrypto(tokenAddress, amountWei).send({ from: account })
      return withdrawTx.transactionHash
    } catch (error: any) {
      console.error('Withdraw error:', error)
      throw new Error(`Withdraw failed: ${error.message}`)
    }
  }

  const transferCrypto = async (recipient: string, tokenAddress: string, amount: string): Promise<string> => {
    if (!web3 || !account || !contract) {
      throw new Error('Web3 not connected')
    }

    try {
      const amountWei = web3.utils.toWei(amount, 'ether')
      const transferTx = await contract.methods.transferCrypto(recipient, tokenAddress, amountWei).send({ from: account })
      return transferTx.transactionHash
    } catch (error: any) {
      console.error('Transfer error:', error)
      throw new Error(`Transfer failed: ${error.message}`)
    }
  }

  const executeWithdrawalTo = async (recipient: string, tokenAddress: string, amount: string): Promise<string> => {
    if (!web3 || !account || !contract) {
      throw new Error('Web3 not connected')
    }

    try {
      const amountWei = web3.utils.toWei(amount, 'ether')
      const withdrawalTx = await contract.methods.executeWithdrawalTo(recipient, tokenAddress, amountWei).send({ from: account })
      return withdrawalTx.transactionHash
    } catch (error: any) {
      console.error('Withdrawal execution error:', error)
      throw new Error(`Withdrawal execution failed: ${error.message}`)
    }
  }

  const getContractInfo = async () => {
    if (!contract) {
      throw new Error('Contract not initialized')
    }

    try {
      const info = await contract.methods.getContractInfo().call()
      return {
        version: info.version,
        isPaused: info.isPaused,
        contractOwner: info.contractOwner,
        usdtAddress: info.usdtAddress,
        bxcAddress: info.bxcAddress
      }
    } catch (error: any) {
      console.error('Get contract info error:', error)
      throw new Error(`Failed to get contract info: ${error.message}`)
    }
  }

  const isContractPaused = async (): Promise<boolean> => {
    if (!contract) {
      return false
    }

    try {
      const paused = await contract.methods.paused().call()
      return paused
    } catch (error: any) {
      console.error('Check paused status error:', error)
      return false
    }
  }

  useEffect(() => {
    initWeb3()

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          // Start monitoring when account changes
          setTimeout(() => startTransactionMonitoring(), 2000)
        } else {
          setAccount(null)
          setIsConnected(false)
          // Stop monitoring when account disconnects
          stopTransactionMonitoring()
        }
      })

      window.ethereum.on('chainChanged', (newChainId: string) => {
        setChainId(newChainId)
      })
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged')
        window.ethereum.removeAllListeners('chainChanged')
      }
      // Clean up monitoring on unmount
      stopTransactionMonitoring()
    }
  }, [])

  // Expose functions to window for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).detectTransactionByHash = detectTransactionByHash
      ;(window as any).checkDirectDepositsToContract = checkDirectDepositsToContract
      console.log('🔧 Debug functions available:')
      console.log('- window.detectTransactionByHash(txHash)')
      console.log('- window.checkDirectDepositsToContract()')
    }
  }, [])

  // Start monitoring when user connects and has account
  useEffect(() => {
    if (isConnected && account && currentUser) {
      console.log('🚀 User connected, starting transaction monitoring...')
      // Start monitoring after a short delay to ensure everything is initialized
      const timer = setTimeout(() => {
        startTransactionMonitoring()
        // Also do an immediate check
        checkDirectDepositsToContract()
      }, 3000)
      
      return () => clearTimeout(timer)
    }
  }, [isConnected, account, currentUser])

  // Also check when wallet connects
  useEffect(() => {
    if (isConnected && account && currentUser) {
      console.log('🔍 Wallet connected, checking for deposits immediately...')
      // Immediate check when wallet connects
      const immediateTimer = setTimeout(() => {
        checkDirectDepositsToContract()
      }, 1000)
      
      return () => clearTimeout(immediateTimer)
    }
  }, [isConnected, account])

  const value: Web3ContextType = {
    web3,
    account,
    isConnected,
    chainId,
    contract,
    connectWallet,
    disconnectWallet,
    switchToSepolia,
    getNetworkStatus,
    validateUserBalances,
    refreshAllBalances,
    updateUserCryptoBalance,
    logTransaction,
    depositCrypto,
    withdrawCrypto,
    transferCrypto,
    executeWithdrawalTo,
    getContractInfo,
    isContractPaused,
    checkDirectDepositsToContract,
    startTransactionMonitoring,
    stopTransactionMonitoring,
    detectTransactionByHash
  }

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  )
}
