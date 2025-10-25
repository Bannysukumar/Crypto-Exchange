import { apiService } from './api'
import type { User, Transaction } from './api'

export type { User, Transaction }

export class MongoDBService {
  constructor() {
    // Initialize API service
    this.initializeApiService()
  }

  private async initializeApiService() {
    try {
      await apiService.healthCheck()
      console.log('✅ API service connected successfully')
    } catch (error) {
      console.error('❌ API service connection failed:', error)
    }
  }

  // User operations
  async createUser(userData: Partial<User>): Promise<User> {
    const userDataToSend = {
      uid: userData.uid!,
      email: userData.email!,
      displayName: userData.displayName || '',
      name: userData.name || '',
      phone: userData.phone || '',
      inrBalance: userData.inrBalance || 0,
      cryptoBalances: userData.cryptoBalances || {
        BTC: 0,
        USDT: 0,
        BXC: 0
      }
    }

    return await apiService.createUser(userDataToSend)
  }

  async getUserByUid(uid: string): Promise<User | null> {
    try {
      return await apiService.getUser(uid)
    } catch (error) {
      console.error('Error fetching user:', error)
      // If user doesn't exist, the API will create them automatically
      // Try again after a short delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      return await apiService.getUser(uid)
    }
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    await apiService.updateUser(uid, updates)
  }

  async updateUserBalance(uid: string, currency: string, amount: number): Promise<void> {
    await apiService.updateUserBalance(uid, currency, amount)
  }

  // Transaction operations
  async createTransaction(transactionData: Omit<Transaction, '_id'>): Promise<Transaction> {
    return await apiService.createTransaction(transactionData)
  }

  async getUserTransactions(
    userId: string, 
    type?: string, 
    limit: number = 10
  ): Promise<Transaction[]> {
    return await apiService.getUserTransactions(userId, type, limit)
  }

  async getTransactionById(_transactionId: string): Promise<Transaction | null> {
    // This would need to be implemented in the API if needed
    console.warn('getTransactionById not implemented in API service')
    return null
  }

  async updateTransactionStatus(
    _transactionId: string, 
    _status: Transaction['status']
  ): Promise<void> {
    // This would need to be implemented in the API if needed
    console.warn('updateTransactionStatus not implemented in API service')
  }

  // Balance operations
  async getUserBalances(uid: string): Promise<{
    inrBalance: number
    cryptoBalances: { BTC: number; USDT: number; BXC: number }
  } | null> {
    const user = await this.getUserByUid(uid)
    if (!user) return null

    return {
      inrBalance: user.inrBalance,
      cryptoBalances: user.cryptoBalances
    }
  }

  // Utility methods
  async userExists(uid: string): Promise<boolean> {
    const user = await this.getUserByUid(uid)
    return user !== null
  }

  async getTransactionCount(userId: string, type?: string): Promise<number> {
    const transactions = await this.getUserTransactions(userId, type, 1000)
    return transactions.length
  }

  // Initialize user if not exists
  async initializeUserIfNotExists(uid: string, email: string, displayName?: string): Promise<User> {
    let user = await this.getUserByUid(uid)
    
    if (!user) {
      user = await this.createUser({
        uid,
        email,
        displayName: displayName || email.split('@')[0]
      })
      console.log(`✅ Created new user: ${email}`)
    }
    
    return user
  }
}

// Export singleton instance
export const mongoDBService = new MongoDBService()
