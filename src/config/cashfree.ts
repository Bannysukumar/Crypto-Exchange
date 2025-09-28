// Cashfree Configuration
export const CASHFREE_CONFIG = {
  // Demo Server Environment (for development/testing)
  demo: {
    appId: 'DEMO_APP_ID',
    secretKey: 'DEMO_SECRET_KEY',
    baseUrl: 'http://localhost:5001/api', // Demo server endpoint
    apiVersion: '2023-08-01',
    sdkUrl: 'https://sdk.cashfree.com/js/v3/cashfree.js',
    mode: 'sandbox'
  },
  
  // Sandbox Environment
  sandbox: {
    appId: import.meta.env.VITE_CASHFREE_APP_ID || 'YOUR_SANDBOX_APP_ID_HERE',
    secretKey: import.meta.env.VITE_CASHFREE_SECRET_KEY || 'YOUR_SANDBOX_SECRET_KEY_HERE',
    baseUrl: 'https://sandbox.cashfree.com/pg',
    apiVersion: '2023-08-01',
    sdkUrl: 'https://sdk.cashfree.com/js/v3/cashfree.js',
    mode: 'sandbox'
  },
  
  // Production Environment (when ready to go live)
  production: {
    appId: import.meta.env.VITE_CASHFREE_PROD_APP_ID || 'PROD_APP_ID',
    secretKey: import.meta.env.VITE_CASHFREE_PROD_SECRET_KEY || 'PROD_SECRET_KEY',
    baseUrl: 'https://api.cashfree.com/pg',
    apiVersion: '2023-08-01',
    sdkUrl: 'https://sdk.cashfree.com/js/v3/cashfree.js',
    mode: 'production'
  },
  
  // Current environment (change to 'production' when going live)
  currentEnvironment: 'sandbox' as 'demo' | 'sandbox' | 'production',
  
  // Get current config based on environment
  getCurrentConfig() {
    return this[this.currentEnvironment];
  },
  
  // Get base URL for current environment
  getBaseUrl() {
    return this.getCurrentConfig().baseUrl;
  },
  
  // Get API version
  getApiVersion() {
    return this.getCurrentConfig().apiVersion;
  },
  
  // Get App ID for current environment
  getAppId() {
    return this.getCurrentConfig().appId;
  },
  
  // Get Secret Key for current environment
  getSecretKey() {
    return this.getCurrentConfig().secretKey;
  },
  
  // Get SDK URL for current environment
  getSdkUrl() {
    return this.getCurrentConfig().sdkUrl;
  },
  
  // Get mode for current environment
  getMode() {
    return this.getCurrentConfig().mode;
  },
  
  // Check if using demo environment
  isDemo() {
    return this.currentEnvironment === 'demo';
  },
  
  // Get API endpoints (use combined server)
  getEndpoints() {
    // Use the combined server for both local and production
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://mongodb-2-mr18.onrender.com/api'
      : 'http://localhost:5000/api';
    
    return {
      createOrder: `${baseUrl}/create-order`,
      orderStatus: `${baseUrl}/order-status`,
      webhook: `${baseUrl}/webhook/cashfree`
    };
  }
}

export interface CashfreePayment {
  orderId: string
  orderAmount: number
  orderCurrency: string
  customerDetails: {
    customerId: string
    customerEmail: string
    customerPhone?: string
    customerName?: string
  }
  orderMeta?: {
    returnUrl?: string
    notifyUrl?: string
    paymentMethods?: string
  }
}

export interface CashfreeResponse {
  cftoken: string
  orderId: string
  orderAmount: number
  orderCurrency: string
  orderStatus: string
  paymentLink?: string
}
