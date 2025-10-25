const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://crypto-exchange-api-server.vercel.app/api' : 'http://localhost:5000/api');

export interface User {
  _id?: string;
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  phone?: string;
  inrBalance: number;
  cryptoBalances: {
    BTC: number;
    USDT: number;
    BXC: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
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

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // User operations
  async getUser(uid: string): Promise<User | null> {
    return this.request<User | null>(`/users/${uid}`);
  }

  async createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    return this.request<void>(`/users/${uid}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateUserBalance(uid: string, currency: string, amount: number): Promise<void> {
    return this.request<void>(`/users/${uid}/balance`, {
      method: 'PUT',
      body: JSON.stringify({ currency, amount }),
    });
  }

  // Transaction operations
  async getUserTransactions(
    userId: string,
    type?: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('limit', limit.toString());
    
    return this.request<Transaction[]>(`/transactions/${userId}?${params}`);
  }

  async createTransaction(transactionData: Omit<Transaction, '_id' | 'timestamp'>): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  // Find user by email
  async findUserByEmail(email: string): Promise<User | null> {
    return this.request<User | null>(`/users/email/${encodeURIComponent(email)}`);
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }
}

export const apiService = new ApiService();
