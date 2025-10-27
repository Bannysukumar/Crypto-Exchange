import { firebaseService } from './firebase'
import { apiService } from './api'

export interface UnifiedTransaction {
  id?: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer'
  amount: number
  currency: string
  description: string
  status: 'pending' | 'completed' | 'failed' | 'processing'
  timestamp: Date
  txHash?: string
  toAddress?: string
  fromAddress?: string
  orderId?: string
  paymentId?: string
  // Additional fields for better tracking
  category?: 'crypto' | 'fiat' | 'internal'
  subType?: 'buy' | 'sell' | 'swap' | 'withdraw' | 'deposit' | 'send' | 'receive'
  fee?: number
  feeCurrency?: string
  exchangeRate?: number
  notes?: string
}

export class UnifiedHistoryService {
  /**
   * Log any transaction to both history and transactions collections
   */
  static async logTransaction(transaction: Omit<UnifiedTransaction, 'id' | 'timestamp'>): Promise<string> {
    try {
      console.log('🔧 UnifiedHistoryService.logTransaction called with:', transaction)
      
      // Normalize transaction data
      const normalizedTransaction = this.normalizeTransaction(transaction)
      console.log('🔧 Normalized transaction:', normalizedTransaction)
      
      // Log to both collections simultaneously
      console.log('🔧 About to log to both collections...')
      const [transactionId, historyId] = await Promise.all([
        this.logToTransactions(normalizedTransaction),
        this.logToHistory(normalizedTransaction)
      ])
      
      console.log('✅ Transaction logged to both collections:', { transactionId, historyId })
      console.log('🔧 Transaction ID type:', typeof transactionId, 'History ID type:', typeof historyId)
      return transactionId
    } catch (error) {
      console.error('❌ Error logging unified transaction:', error)
      throw error
    }
  }

  /**
   * Get all user transactions from both collections and merge them
   */
  static async getUserTransactions(
    userId: string,
    transactionType?: string,
    limitCount: number = 100
  ): Promise<UnifiedTransaction[]> {
    try {
      console.log('🔍 UnifiedHistoryService.getUserTransactions called with:', { userId, transactionType, limitCount })
      
      // Get from both collections
      const [historyTransactions, regularTransactions] = await Promise.all([
        this.getFromHistory(userId, transactionType, limitCount),
        this.getFromTransactions(userId, transactionType, limitCount)
      ])
      
      console.log('🔍 History transactions:', historyTransactions.length)
      console.log('🔍 Regular transactions:', regularTransactions.length)
      
      // Merge and deduplicate
      const allTransactions = this.mergeAndDeduplicate(historyTransactions, regularTransactions)
      
      // Sort by timestamp (newest first)
      allTransactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      
      // Apply limit
      const limitedTransactions = allTransactions.slice(0, limitCount)
      
      console.log('✅ Returning unified transactions:', limitedTransactions.length)
      return limitedTransactions
    } catch (error) {
      console.error('❌ Error fetching unified transactions:', error)
      return []
    }
  }

  /**
   * Get transactions by type
   */
  static async getTransactionsByType(
    userId: string,
    type: 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer',
    limitCount: number = 50
  ): Promise<UnifiedTransaction[]> {
    return this.getUserTransactions(userId, type, limitCount)
  }

  /**
   * Get recent transactions (last 24 hours)
   */
  static async getRecentTransactions(userId: string, limitCount: number = 20): Promise<UnifiedTransaction[]> {
    const allTransactions = await this.getUserTransactions(userId, undefined, limitCount * 2)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    return allTransactions
      .filter(tx => new Date(tx.timestamp) >= oneDayAgo)
      .slice(0, limitCount)
  }

  /**
   * Get transaction statistics
   */
  static async getTransactionStats(userId: string): Promise<{
    totalTransactions: number
    totalDeposits: number
    totalWithdrawals: number
    totalTransfers: number
    totalVolume: number
    recentTransactions: number
  }> {
    const transactions = await this.getUserTransactions(userId, undefined, 1000)
    const recentTransactions = await this.getRecentTransactions(userId, 10)
    
    const deposits = transactions.filter(tx => tx.type === 'deposit')
    const withdrawals = transactions.filter(tx => tx.type === 'withdrawal')
    const transfers = transactions.filter(tx => ['send', 'receive', 'transfer'].includes(tx.type))
    
    return {
      totalTransactions: transactions.length,
      totalDeposits: deposits.length,
      totalWithdrawals: withdrawals.length,
      totalTransfers: transfers.length,
      totalVolume: transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      recentTransactions: recentTransactions.length
    }
  }

  // Private helper methods

  private static normalizeTransaction(transaction: Omit<UnifiedTransaction, 'id' | 'timestamp'>): Omit<UnifiedTransaction, 'id' | 'timestamp'> {
    return {
      ...transaction,
      // Ensure consistent type mapping
      type: this.normalizeTransactionType(transaction.type),
      // Add default values
      category: transaction.category || this.getCategoryFromType(transaction.type),
      subType: transaction.subType || this.getSubTypeFromType(transaction.type),
      status: transaction.status || 'completed',
      // Ensure timestamp is set
      timestamp: new Date()
    }
  }

  private static normalizeTransactionType(type: string): 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer' {
    const typeMap: Record<string, 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer'> = {
      'deposit': 'deposit',
      'withdraw': 'withdrawal',
      'withdrawal': 'withdrawal',
      'send': 'send',
      'receive': 'receive',
      'transfer': 'transfer'
    }
    return typeMap[type] || 'transfer'
  }

  private static getCategoryFromType(type: string): 'crypto' | 'fiat' | 'internal' {
    if (['deposit', 'withdrawal'].includes(type)) {
      return 'fiat'
    } else if (['send', 'receive', 'transfer'].includes(type)) {
      return 'crypto'
    }
    return 'internal'
  }

  private static getSubTypeFromType(type: string): 'buy' | 'sell' | 'swap' | 'withdraw' | 'deposit' | 'send' | 'receive' {
    const subTypeMap: Record<string, 'buy' | 'sell' | 'swap' | 'withdraw' | 'deposit' | 'send' | 'receive'> = {
      'deposit': 'deposit',
      'withdrawal': 'withdraw',
      'withdraw': 'withdraw',
      'send': 'send',
      'receive': 'receive',
      'transfer': 'send'
    }
    return subTypeMap[type] || 'send'
  }

  private static async logToTransactions(transaction: Omit<UnifiedTransaction, 'id' | 'timestamp'>): Promise<string> {
    try {
      const result = await firebaseService.createTransaction({
        userId: transaction.userId,
        type: transaction.type === 'withdrawal' ? 'withdraw' : transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        status: transaction.status as 'pending' | 'completed' | 'failed',
        orderId: transaction.orderId,
        paymentId: transaction.paymentId,
        txHash: transaction.txHash,
        timestamp: new Date()
      })
      // The API returns transactionId, not _id
      return result.transactionId || result._id?.toString() || ''
    } catch (error) {
      console.error('❌ Error logging to transactions:', error)
      throw error
    }
  }

  private static async logToHistory(transaction: Omit<UnifiedTransaction, 'id' | 'timestamp'>): Promise<string> {
    try {
      const result = await apiService.createHistoryEntry({
        userId: transaction.userId,
        type: transaction.type === 'withdrawal' ? 'withdraw' : transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        status: transaction.status as 'pending' | 'completed' | 'failed',
        orderId: transaction.orderId,
        paymentId: transaction.paymentId,
        txHash: transaction.txHash
      })
      // The API returns historyId, not _id
      return result.historyId || result._id?.toString() || ''
    } catch (error) {
      console.error('❌ Error logging to history:', error)
      // Don't throw error for history logging to prevent transaction failure
      return ''
    }
  }

  private static async getFromHistory(
    userId: string,
    transactionType?: string,
    limitCount: number = 100
  ): Promise<UnifiedTransaction[]> {
    try {
      console.log('🔍 getFromHistory called with:', { userId, transactionType, limitCount })
      const historyEntries = await apiService.getUserHistory(userId, transactionType, limitCount)
      console.log('🔍 Raw history entries from API:', historyEntries.length, historyEntries)
      const mappedEntries = historyEntries.map(entry => this.mapHistoryEntryToUnified(entry))
      console.log('🔍 Mapped history entries:', mappedEntries.length, mappedEntries)
      return mappedEntries
    } catch (error) {
      console.error('❌ Error fetching from history:', error)
      return []
    }
  }

  private static async getFromTransactions(
    userId: string,
    transactionType?: string,
    limitCount: number = 100
  ): Promise<UnifiedTransaction[]> {
    try {
      console.log('🔍 getFromTransactions called with:', { userId, transactionType, limitCount })
      const transactions = await firebaseService.getUserTransactions(userId, transactionType, limitCount)
      console.log('🔍 Raw transactions from API:', transactions.length, transactions)
      const mappedTransactions = transactions.map(tx => this.mapTransactionToUnified(tx))
      console.log('🔍 Mapped transactions:', mappedTransactions.length, mappedTransactions)
      return mappedTransactions
    } catch (error) {
      console.error('❌ Error fetching from transactions:', error)
      return []
    }
  }

  private static mapHistoryEntryToUnified(entry: any): UnifiedTransaction {
    return {
      id: entry._id?.toString(),
      userId: entry.userId,
      type: this.normalizeTransactionType(entry.type),
      amount: entry.amount,
      currency: entry.currency,
      description: entry.description,
      status: entry.status as 'pending' | 'completed' | 'failed' | 'processing',
      timestamp: entry.timestamp,
      txHash: entry.txHash,
      orderId: entry.orderId,
      paymentId: entry.paymentId,
      category: this.getCategoryFromType(entry.type),
      subType: this.getSubTypeFromType(entry.type)
    }
  }

  private static mapTransactionToUnified(tx: any): UnifiedTransaction {
    return {
      id: tx._id?.toString(),
      userId: tx.userId,
      type: this.normalizeTransactionType(tx.type),
      amount: tx.amount,
      currency: tx.currency,
      description: tx.description,
      status: tx.status as 'pending' | 'completed' | 'failed' | 'processing',
      timestamp: tx.timestamp,
      txHash: tx.txHash,
      orderId: tx.orderId,
      paymentId: tx.paymentId,
      category: this.getCategoryFromType(tx.type),
      subType: this.getSubTypeFromType(tx.type)
    }
  }

  private static mergeAndDeduplicate(
    historyTransactions: UnifiedTransaction[],
    regularTransactions: UnifiedTransaction[]
  ): UnifiedTransaction[] {
    const allTransactions = [...historyTransactions, ...regularTransactions]
    const uniqueTransactions = new Map<string, UnifiedTransaction>()
    
    // Use transaction hash or description + amount + timestamp as unique key
    allTransactions.forEach(tx => {
      const key = tx.txHash || `${tx.description}_${tx.amount}_${tx.timestamp.getTime()}`
      if (!uniqueTransactions.has(key)) {
        uniqueTransactions.set(key, tx)
      }
    })
    
    return Array.from(uniqueTransactions.values())
  }
}
