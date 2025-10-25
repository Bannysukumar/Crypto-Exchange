import { apiService } from './api'
import type { User, Transaction } from './api'

export type { User, Transaction }

export class FirebaseService {
  constructor() {
    // Initialize API service
    this.initializeApiService()
  }

  private async initializeApiService() {
    try {
      await apiService.healthCheck()
      console.log('✅ Firebase API service connected successfully')
    } catch (error) {
      console.error('❌ Firebase API service connection failed:', error)
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
  async getUserTransactions(
    userId: string,
    type?: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    console.log(`🔍 FirebaseService.getUserTransactions called with:`, { userId, type, limit })
    try {
      const result = await apiService.getUserTransactions(userId, type, limit)
      console.log(`✅ FirebaseService.getUserTransactions result:`, result)
      return result
    } catch (error) {
      console.error(`❌ FirebaseService.getUserTransactions error:`, error)
      throw error
    }
  }

  async createTransaction(transactionData: Omit<Transaction, '_id' | 'timestamp'>): Promise<Transaction> {
    return await apiService.createTransaction(transactionData)
  }

  async getTransactionByHash(txHash: string): Promise<Transaction | null> {
    // This would need to be implemented in the API
    // For now, return null
    return null
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return await apiService.healthCheck()
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService()
