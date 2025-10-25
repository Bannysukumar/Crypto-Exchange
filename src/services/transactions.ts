import { firebaseService } from './firebase'
import type { Transaction as FirebaseTransaction } from './api'

export interface Transaction {
  id?: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer'
  amount: number
  currency: string
  description: string
  message?: string
  status: 'pending' | 'completed' | 'failed' | 'processing'
  timestamp: Date
  txHash?: string
  toAddress?: string
  fromAddress?: string
  orderId?: string
  paymentId?: string
}

export class TransactionService {
  static async logTransaction(transaction: Omit<Transaction, 'id' | 'timestamp'>): Promise<string> {
    try {
      const firebaseTransaction: Omit<FirebaseTransaction, '_id'> = {
        userId: transaction.userId,
        type: transaction.type as 'deposit' | 'withdraw' | 'send' | 'receive',
        amount: transaction.amount,
        currency: transaction.currency,
        description: transaction.description,
        status: transaction.status as 'pending' | 'completed' | 'failed',
        orderId: transaction.orderId,
        paymentId: transaction.paymentId,
        txHash: transaction.txHash,
        timestamp: new Date()
      }

      const result = await firebaseService.createTransaction(firebaseTransaction)
      return result._id?.toString() || ''
    } catch (error) {
      console.error('Error logging transaction:', error)
      throw error
    }
  }

  static async getUserTransactions(
    userId: string,
    transactionType?: string,
    limitCount: number = 50
  ): Promise<Transaction[]> {
    try {
      const firebaseTransactions = await firebaseService.getUserTransactions(
        userId,
        transactionType,
        limitCount
      )

      return mongoTransactions.map(mongoTx => ({
        id: mongoTx._id?.toString(),
        userId: mongoTx.userId,
        type: mongoTx.type as 'deposit' | 'withdrawal' | 'send' | 'receive' | 'transfer',
        amount: mongoTx.amount,
        currency: mongoTx.currency,
        description: mongoTx.description,
        status: mongoTx.status as 'pending' | 'completed' | 'failed' | 'processing',
        timestamp: mongoTx.timestamp,
        txHash: mongoTx.txHash,
        orderId: mongoTx.orderId,
        paymentId: mongoTx.paymentId
      }))
    } catch (error) {
      console.error('Error fetching transactions:', error)
      // Return empty array instead of throwing to prevent app crash
      return []
    }
  }

  static async getRecentDeposits(userId: string, limitCount: number = 10): Promise<Transaction[]> {
    return this.getUserTransactions(userId, 'deposit', limitCount)
  }

  static async getRecentWithdrawals(userId: string, limitCount: number = 10): Promise<Transaction[]> {
    return this.getUserTransactions(userId, 'withdrawal', limitCount)
  }

  static async getRecentTransfers(userId: string, limitCount: number = 10): Promise<Transaction[]> {
    const sends = await this.getUserTransactions(userId, 'send', limitCount)
    const receives = await this.getUserTransactions(userId, 'receive', limitCount)
    
    // Combine and sort by timestamp
    const allTransfers = [...sends, ...receives]
    allTransfers.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    return allTransfers.slice(0, limitCount)
  }

  static async getTransactionByHash(userId: string, txHash: string): Promise<Transaction | null> {
    try {
      const transactions = await this.getUserTransactions(userId)
      return transactions.find(tx => tx.txHash === txHash) || null
    } catch (error) {
      console.error('Error fetching transaction by hash:', error)
      return null
    }
  }

  static formatAmount(amount: number, currency: string): string {
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

  static formatDate(timestamp: Date | string): string {
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

  static getCurrencyIcon(currency: string): string {
    const iconMap: Record<string, string> = {
      'INR': 'fas fa-rupee-sign',
      'BTC': 'fab fa-bitcoin',
      'USDT': 'fas fa-dollar-sign',
      'BXC': 'fas fa-coins'
    }
    return iconMap[currency] || 'fas fa-rupee-sign'
  }

  static getCurrencyIconClass(currency: string): string {
    const iconMap: Record<string, string> = {
      'INR': 'inr',
      'BTC': 'btc',
      'USDT': 'usdt',
      'BXC': 'bxc'
    }
    return iconMap[currency] || 'inr'
  }

  static getStatusClass(status: string): string {
    const statusMap: Record<string, string> = {
      'completed': 'success',
      'pending': 'pending',
      'failed': 'failed',
      'processing': 'pending'
    }
    return statusMap[status] || 'pending'
  }

  static getStatusIcon(status: string): string {
    const iconMap: Record<string, string> = {
      'completed': 'fas fa-check',
      'pending': 'fas fa-clock',
      'failed': 'fas fa-times',
      'processing': 'fas fa-spinner fa-spin'
    }
    return iconMap[status] || 'fas fa-clock'
  }

  static getStatusText(status: string): string {
    const textMap: Record<string, string> = {
      'completed': 'Completed',
      'pending': 'Pending',
      'failed': 'Failed',
      'processing': 'Processing'
    }
    return textMap[status] || 'Pending'
  }
}
