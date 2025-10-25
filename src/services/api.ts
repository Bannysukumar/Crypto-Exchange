const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

// Debug logging
console.log('🔍 API Configuration:');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('PROD:', import.meta.env.PROD);
console.log('Final API_BASE_URL:', API_BASE_URL);

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

    console.log(`🔍 Making API request to: ${url}`);
    console.log(`🔍 Request options:`, config);
    
    try {
      const response = await fetch(url, config);
      
      console.log(`🔍 Response status: ${response.status}`);
      console.log(`🔍 Response headers:`, Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API request failed for ${url}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`✅ API request successful for ${url}:`, data);
      return data;
    } catch (error) {
      console.error(`❌ API request error for ${url}:`, error);
      throw error;
    }
  }

  // User operations
  async getUser(uid: string): Promise<User | null> {
    try {
      return await this.request<User | null>(`/users?uid=${uid}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log('User not found, API will create user automatically');
        // Wait a moment for the API to create the user
        await new Promise(resolve => setTimeout(resolve, 2000));
        // Try again
        return await this.request<User | null>(`/users?uid=${uid}`);
      }
      throw error;
    }
  }

  async createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    return this.request<User>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(uid: string, updates: Partial<User>): Promise<void> {
    return this.request<void>(`/users?uid=${uid}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async updateUserBalance(uid: string, currency: string, amount: number): Promise<void> {
    return this.request<void>(`/users?uid=${uid}`, {
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
    params.append('userId', userId);
    if (type) params.append('type', type);
    params.append('limit', limit.toString());
    
    return this.request<Transaction[]>(`/transactions?${params}`);
  }

  async createTransaction(transactionData: Omit<Transaction, '_id' | 'timestamp'>): Promise<Transaction> {
    return this.request<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transactionData),
    });
  }

  // Find user by email
  async findUserByEmail(email: string): Promise<User | null> {
    return this.request<User | null>(`/users?email=${encodeURIComponent(email)}`);
  }

  // History operations
  async getUserHistory(
    userId: string,
    type?: string,
    limit: number = 50
  ): Promise<Transaction[]> {
    console.log('🔍 ApiService.getUserHistory called with:', { userId, type, limit });
    
    const params = new URLSearchParams();
    params.append('userId', userId);
    if (type) params.append('type', type);
    params.append('limit', limit.toString());
    
    const url = `/history?${params}`;
    console.log('🔍 Making request to:', url);
    
    return this.request<Transaction[]>(url);
  }

  async createHistoryEntry(historyData: Omit<Transaction, '_id' | 'timestamp'>): Promise<Transaction> {
    return this.request<Transaction>('/history', {
      method: 'POST',
      body: JSON.stringify(historyData),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>('/health');
  }
}

export const apiService = new ApiService();
