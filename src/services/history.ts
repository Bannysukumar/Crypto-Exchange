import { apiService } from './api'
import type { Transaction } from './api'

export interface HistoryEntry {
  _id?: string;
  userId: string;
  type: 'deposit' | 'withdraw' | 'send' | 'receive';
  amount: number;
  currency: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  orderId?: string;
  paymentId?: string;
  txHash?: string;
  timestamp: Date;
}

export type { Transaction }

export class HistoryService {
  static async logHistoryEntry(historyData: Omit<HistoryEntry, '_id' | 'timestamp'>): Promise<string> {
    try {
      console.log('🔧 HistoryService.logHistoryEntry called with:', historyData)
      
      const result = await apiService.createHistoryEntry(historyData)
      console.log('🔧 HistoryService.logHistoryEntry result:', result)
      
      const historyId = result._id?.toString() || ''
      console.log('🔧 Returning history ID:', historyId)
      return historyId
    } catch (error) {
      console.error('❌ Error logging history entry:', error)
      throw error
    }
  }

  static async getUserHistory(
    userId: string,
    historyType?: string,
    limitCount: number = 50
  ): Promise<HistoryEntry[]> {
    try {
      console.log(`🔍 HistoryService.getUserHistory called with:`, { userId, historyType, limitCount })
      console.log(`🔍 Calling apiService.getUserHistory...`)
      
      const result = await apiService.getUserHistory(userId, historyType, limitCount)
      console.log(`✅ HistoryService.getUserHistory result:`, result)
      console.log(`✅ Result type:`, typeof result)
      console.log(`✅ Result length:`, Array.isArray(result) ? result.length : 'Not an array')
      
      return result
    } catch (error) {
      console.error(`❌ HistoryService.getUserHistory error:`, error)
      console.error(`❌ Error details:`, error.message)
      console.error(`❌ Error stack:`, error.stack)
      throw error
    }
  }

  static async getHistoryByHash(txHash: string): Promise<HistoryEntry | null> {
    // This would need to be implemented in the API
    // For now, return null
    return null
  }
}
