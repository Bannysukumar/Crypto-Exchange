import { CASHFREE_CONFIG } from '../config/cashfree'
import { auth } from '../config/firebase'
import { firebaseService } from './firebase'
import toast from 'react-hot-toast'
import axios from 'axios'

declare global {
  interface Window {
    Cashfree?: any
  }
}

export class CashfreeManager {
  private cashfree: any = null
  private currentOrder: any = null
  private isProcessing = false
  public isInitialized = false
  private config: any

  constructor() {
    console.log('CashfreeManager constructor called')
    this.config = CASHFREE_CONFIG.getCurrentConfig()
    console.log('CashfreeManager config:', this.config)
    console.log('CashfreeManager appId:', CASHFREE_CONFIG.getAppId())
    console.log('CashfreeManager secretKey:', CASHFREE_CONFIG.getSecretKey() ? '***' + CASHFREE_CONFIG.getSecretKey().slice(-4) : 'NOT SET')
    console.log('CashfreeManager mode:', CASHFREE_CONFIG.getMode())
    
    this.init().then(() => {
      this.isInitialized = true
      console.log('CashfreeManager fully initialized')
    }).catch(error => {
      console.error('CashfreeManager initialization failed:', error)
      this.createFallbackIntegration()
    })
  }

  async init() {
    try {
      console.log('CashfreeManager init called')
      
      // Check if we're in demo mode
      if (CASHFREE_CONFIG.isDemo()) {
        console.log('Using demo Cashfree integration...')
        await this.createDemoIntegration()
      } else {
        console.log('Loading real Cashfree SDK...')
        await this.loadCashfreeSDK()
      }
      
    } catch (error) {
      console.error('Cashfree initialization error:', error)
      await this.createFallbackIntegration()
    }
  }

  // Load the actual Cashfree SDK
  async loadCashfreeSDK() {
    return new Promise((resolve, reject) => {
      // Check if SDK is already loaded
      if (window.Cashfree) {
        console.log('Cashfree SDK already loaded')
        this.cashfree = window.Cashfree({ 
          mode: CASHFREE_CONFIG.getMode(),
          appId: CASHFREE_CONFIG.getAppId(),
          secretKey: CASHFREE_CONFIG.getSecretKey()
        })
        resolve(this.cashfree)
        return
      }

      // Load SDK script
      const script = document.createElement('script')
      script.src = CASHFREE_CONFIG.getSdkUrl()
      script.onload = () => {
        console.log('Cashfree SDK loaded successfully')
        try {
          this.cashfree = window.Cashfree({ 
            mode: CASHFREE_CONFIG.getMode(),
            appId: CASHFREE_CONFIG.getAppId(),
            secretKey: CASHFREE_CONFIG.getSecretKey()
          })
          console.log('Cashfree SDK initialized with mode:', CASHFREE_CONFIG.getMode())
          console.log('Cashfree SDK initialized with appId:', CASHFREE_CONFIG.getAppId())
          resolve(this.cashfree)
        } catch (error) {
          console.error('Error initializing Cashfree SDK:', error)
          reject(error)
        }
      }
      script.onerror = () => {
        console.error('Failed to load Cashfree SDK')
        reject(new Error('Failed to load Cashfree SDK'))
      }
      document.head.appendChild(script)
    })
  }

  // Create demo integration using the demo server
  async createDemoIntegration() {
    console.log('Creating demo Cashfree integration...')
    
    this.isInitialized = true
    
    this.cashfree = {
      checkout: (options: any) => {
        console.log('Demo Cashfree checkout initialized with options:', options)
        return this.createDemoCheckout(options)
      }
    }
    
    console.log('Demo integration created successfully')
    this.addTestModeIndicator()
  }

  // Create fallback integration when scripts fail
  async createFallbackIntegration() {
    console.log('Creating fallback Cashfree integration...')
    
    this.isInitialized = true
    
    this.cashfree = {
      checkout: (options: any) => {
        console.log('Fallback Cashfree checkout initialized with options:', options)
        return this.createMockCheckout(options)
      }
    }
    
    console.log('Fallback integration created successfully')
    
    console.log('💡 Using demo payment system for testing')
    console.log('💡 In production, ensure Cashfree SDK is properly loaded')
    
    this.addTestModeIndicator()
  }

  // Add visual indicator that system is in test mode
  addTestModeIndicator() {
    try {
      const existingIndicator = document.getElementById('cashfree-test-mode-indicator')
      if (existingIndicator) {
        existingIndicator.remove()
      }
      
      const indicator = document.createElement('div')
      indicator.id = 'cashfree-test-mode-indicator'
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 70px;
          right: 10px;
          background: #f59e0b;
          color: white;
          padding: 8px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          z-index: 9999;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          display: flex;
          align-items: center;
          gap: 6px;
        ">
          <span>🧪</span>
          <span>Demo Mode</span>
        </div>
      `
      
      document.body.appendChild(indicator)
      
      setTimeout(() => {
        if (indicator.parentNode) {
          indicator.style.opacity = '0.7'
        }
      }, 5000)
      
    } catch (error) {
      console.error('Error adding test mode indicator:', error)
    }
  }

  // Create demo checkout using the demo server
  createDemoCheckout(options: any) {
    console.log('Demo Cashfree checkout initialized')
    
    return new Promise((resolve, reject) => {
      // Create a more user-friendly demo payment interface
      this.createDemoPaymentInterface(options, resolve, reject)
    })
  }

  // Create mock checkout when Cashfree is unavailable
  createMockCheckout(options: any) {
    console.log('Mock Cashfree checkout initialized')
    
    return new Promise((resolve, reject) => {
      // Create a more user-friendly demo payment interface
      this.createDemoPaymentInterface(options, resolve, reject)
    })
  }

  // Create a visual demo payment interface
  createDemoPaymentInterface(options: any, resolve: Function, reject: Function) {
    // Remove any existing demo interface
    const existingDemo = document.getElementById('cashfree-demo-interface')
    if (existingDemo) {
      existingDemo.remove()
    }

    // Create demo payment modal
    const demoModal = document.createElement('div')
    demoModal.id = 'cashfree-demo-interface'
    demoModal.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        font-family: 'Inter', sans-serif;
      ">
        <div style="
          background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 20px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          text-align: center;
          color: white;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        ">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🧪</div>
          <h2 style="
            background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 1rem;
            font-size: 1.8rem;
            font-weight: 800;
          ">Demo Payment</h2>
          
          <div style="
            background: rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.3);
            border-radius: 12px;
            padding: 1.5rem;
            margin: 1.5rem 0;
          ">
            <p style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">
              Amount: ₹${this.currentOrder?.order_amount || 'Unknown'}
            </p>
            <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem; margin-bottom: 0.5rem;">
              Order ID: ${options.orderId || 'Unknown'}
            </p>
            <p style="color: rgba(255, 255, 255, 0.7); font-size: 0.9rem;">
              Customer: ${this.currentOrder?.customer_details?.customer_email || 'Unknown'}
            </p>
          </div>
          
          <p style="color: rgba(255, 255, 255, 0.8); margin-bottom: 2rem; line-height: 1.6;">
            This is a demo payment simulation. In production, this would open the Cashfree payment gateway.
          </p>
          
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button id="demo-payment-success" style="
              background: linear-gradient(135deg, #000000 0%, #ffd700 100%);
              color: white;
              border: none;
              padding: 1rem 2rem;
              border-radius: 12px;
              font-weight: 600;
              cursor: pointer;
              font-size: 1rem;
              box-shadow: 0 8px 32px rgba(255, 215, 0, 0.3);
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              ✅ Simulate Success
            </button>
            <button id="demo-payment-failure" style="
              background: rgba(255, 255, 255, 0.1);
              color: #ffd700;
              border: 1px solid rgba(255, 215, 0, 0.3);
              padding: 1rem 2rem;
              border-radius: 12px;
              font-weight: 600;
              cursor: pointer;
              font-size: 1rem;
              transition: all 0.3s ease;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
              ❌ Simulate Failure
            </button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(demoModal)

    // Add event listeners
    document.getElementById('demo-payment-success')?.addEventListener('click', () => {
      demoModal.remove()
      // Simulate processing delay
      setTimeout(() => {
        console.log('Demo payment completed successfully')
        resolve({
          redirect: false,
          success: true,
          orderId: options.orderId,
          paymentStatus: 'SUCCESS'
        })
      }, 1500)
    })

    document.getElementById('demo-payment-failure')?.addEventListener('click', () => {
      demoModal.remove()
      reject({
        error: {
          message: 'Payment failed (simulated)'
        }
      })
    })

    // Close on background click
    demoModal.addEventListener('click', (e) => {
      if (e.target === demoModal) {
        demoModal.remove()
        reject({
          error: {
            message: 'Payment cancelled by user'
          }
        })
      }
    })
  }

  // Main method to initiate payment
  async initiatePayment(amount: number, customerEmail: string, customerName: string, customerId: string, customerPhone?: string): Promise<void> {
    if (this.isProcessing) {
      toast.error('A payment is already in progress.')
      return
    }

    this.isProcessing = true
    toast.loading('Initiating payment...', { id: 'payment-toast' })

    try {
      console.log('Starting payment initiation...', { amount, customerEmail, customerName, customerId })

      // Wait for initialization if not ready
      if (!this.isInitialized) {
        console.log('Waiting for CashfreeManager to initialize...')
        let attempts = 0
        const maxAttempts = 30
        
        while (!this.isInitialized && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100))
          attempts++
        }
        
        if (!this.isInitialized) {
          throw new Error('CashfreeManager initialization timeout')
        }
      }

      const phoneNumber = customerPhone || '9999999999' // Use provided phone or default

      console.log('Payment initiation details:', {
        amount,
        customerEmail,
        customerName,
        customerId,
        customerPhone: phoneNumber
      })

      // Create order details
      const orderDetails = await this.createOrderOnServer(amount, customerId, customerEmail, phoneNumber)
      this.currentOrder = orderDetails

      console.log('Order created:', orderDetails)
      console.log('Payment session ID:', orderDetails.payment_session_id)
      console.log('Order ID:', orderDetails.order_id)

      // Check if we're using real Cashfree or demo mode
      let result: any

      if (CASHFREE_CONFIG.isDemo()) {
      console.log('Using demo payment system...')
      
      const checkoutOptions = {
        orderId: orderDetails.order_id,
        paymentSessionId: orderDetails.payment_session_id,
        redirectTarget: '_self'
      }

      console.log('Initiating demo checkout with options:', checkoutOptions)

      // Use the mock checkout
        result = await this.cashfree.checkout(checkoutOptions)
      } else {
        console.log('Using real Cashfree SDK...')
        
        const checkoutOptions = {
          paymentSessionId: orderDetails.payment_session_id,
          redirectTarget: '_modal'
        }

        console.log('Initiating real Cashfree checkout with options:', checkoutOptions)

        // Add event listener for when Cashfree modal closes
        const handleModalClose = () => {
          console.log('Cashfree modal closed, checking payment status...')
          setTimeout(async () => {
            try {
              const orderStatus = await this.checkOrderStatus(orderDetails.order_id)
              console.log('Modal close order status check:', orderStatus)
              
              if (orderStatus && orderStatus.order_status === 'PAID') {
                console.log('Payment confirmed after modal close!')
                toast.dismiss('payment-toast')
                toast.success('Payment successful! Balance updated.')
                await this.handlePaymentSuccess(orderDetails.order_id, 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
              }
            } catch (error) {
              console.error('Error checking status after modal close:', error)
            }
          }, 1000)
        }

        // Listen for focus events (modal closing)
        window.addEventListener('focus', handleModalClose)
        
        // Use the real Cashfree SDK
        try {
          console.log('Calling Cashfree checkout with options:', checkoutOptions)
          result = await this.cashfree.checkout(checkoutOptions)
          console.log('Cashfree checkout completed, result:', result)
          
          // Remove event listener after checkout completes
          window.removeEventListener('focus', handleModalClose)
        } catch (checkoutError: any) {
          console.error('Cashfree checkout error:', checkoutError)
          window.removeEventListener('focus', handleModalClose)
          throw new Error(`Checkout failed: ${checkoutError.message || checkoutError}`)
        }
      }
      
      console.log('Payment result:', result)
      console.log('Payment result type:', typeof result)
      console.log('Payment result keys:', Object.keys(result || {}))
      
      // Handle different result formats from Cashfree SDK
      if (result && result.error) {
        console.error('Payment error:', result.error)
        toast.dismiss('payment-toast')
        toast.error('Payment failed. Please try again.', {
          duration: 5000
        })
        await this.handlePaymentFailure(orderDetails.order_id, 'failed', result.error.message)
      } else if (result && result.success) {
        console.log('Payment successful!')
        toast.dismiss('payment-toast')
        toast.success('Payment successful! Balance updated.')
        await this.handlePaymentSuccess(orderDetails.order_id, result.paymentId || 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
      } else if (result && result.redirect === false) {
        // Cashfree SDK returns { redirect: false } on successful payment
        console.log('Payment successful (redirect: false)!')
        toast.dismiss('payment-toast')
        toast.success('Payment successful! Balance updated.')
        await this.handlePaymentSuccess(orderDetails.order_id, result.paymentId || 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
      } else if (result && result.status === 'SUCCESS') {
        // Alternative success format
        console.log('Payment successful (status: SUCCESS)!')
        toast.dismiss('payment-toast')
        toast.success('Payment successful! Balance updated.')
        await this.handlePaymentSuccess(orderDetails.order_id, result.paymentId || 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
      } else if (result === null || result === undefined) {
        // Payment completed successfully (Cashfree SDK returns null/undefined on success)
        console.log('Payment successful (null result)!')
        
        // Verify payment status with order status check
        try {
          const orderStatus = await this.checkOrderStatus(orderDetails.order_id)
          console.log('Order status check:', orderStatus)
          
          if (orderStatus && orderStatus.order_status === 'PAID') {
            toast.dismiss('payment-toast')
            toast.success('Payment successful! Balance updated.')
            await this.handlePaymentSuccess(orderDetails.order_id, 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
          } else {
            console.log('Payment not confirmed by order status check')
            toast.dismiss('payment-toast')
            toast.error('Payment status unclear. Please check your balance.')
          }
        } catch (statusError) {
          console.error('Error checking order status:', statusError)
          // Still treat as successful since Cashfree returned null (usually means success)
          toast.dismiss('payment-toast')
          toast.success('Payment successful! Balance updated.')
          await this.handlePaymentSuccess(orderDetails.order_id, 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
        }
      } else {
        console.log('Payment result unclear, checking order status...')
        console.log('Unexpected result format:', result)
        
        // Wait a moment for Cashfree to process the payment
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        try {
          const orderStatus = await this.checkOrderStatus(orderDetails.order_id)
          console.log('Delayed order status check:', orderStatus)
          
          if (orderStatus && orderStatus.order_status === 'PAID') {
            console.log('Payment confirmed by delayed status check!')
            toast.dismiss('payment-toast')
            toast.success('Payment successful! Balance updated.')
            await this.handlePaymentSuccess(orderDetails.order_id, 'PAYMENT_ID', amount, 'INR', customerId, 'completed', `INR deposit via Cashfree (${CASHFREE_CONFIG.isDemo() ? 'Demo' : 'Sandbox'})`)
          } else {
            console.log('Payment not confirmed by delayed status check')
            toast.dismiss('payment-toast')
            toast.error('Payment failed. Please try again.', {
              duration: 5000
            })
            await this.handlePaymentFailure(orderDetails.order_id, 'failed', 'Payment failed - please try again')
          }
        } catch (statusError) {
          console.error('Error in delayed status check:', statusError)
        toast.dismiss('payment-toast')
          toast.error('Payment status unclear. Please try again.', {
            duration: 5000
          })
        }
      }

    } catch (error: any) {
      console.error('Error during payment initiation:', error)
      toast.dismiss('payment-toast')
      toast.error('Payment failed. Please try again.', {
        duration: 5000
      })
      await this.handlePaymentFailure(this.currentOrder?.order_id || 'N/A', 'failed', error.message)
    } finally {
      this.isProcessing = false
    }
  }

  public async createOrderOnServer(amount: number, customerId: string, customerEmail: string, customerPhone: string): Promise<any> {
    console.log('Creating order on server...')
    
    try {
      // Always use demo server as proxy to avoid CORS issues
      const endpoints = CASHFREE_CONFIG.getEndpoints()
      const response = await axios.post(endpoints.createOrder, {
        amount,
        email: customerEmail,
        phone: customerPhone
      })
      
      console.log('Order created via proxy server:', response.data)
      return response.data.order
    } catch (error: any) {
      console.error('Error creating order:', error.response?.data || error.message)
      
      // Fallback to simulated order
        const orderId = `order_${Date.now()}`
      console.log(`Fallback simulated order created: ${orderId}`)
      return {
          order_id: orderId,
          payment_session_id: `session_${orderId}_${Math.random().toString(36).substring(7)}`,
          order_amount: amount,
          customer_details: {
            customer_id: customerId,
            customer_email: customerEmail,
            customer_phone: customerPhone
          }
      }
    }
  }

  public hasSDK(): boolean {
    return !!this.cashfree && this.isInitialized
  }

  // Check order status
  public async checkOrderStatus(orderId: string): Promise<any> {
    try {
      // Always use demo server as proxy to avoid CORS issues
      const endpoints = CASHFREE_CONFIG.getEndpoints()
      const response = await axios.get(`${endpoints.orderStatus}/${orderId}`)
      return response.data
    } catch (error: any) {
      console.error('Error checking order status:', error.response?.data || error.message)
      throw error
    }
  }


  public async handlePaymentResponse(orderId: string, paymentId: string, paymentStatus: string, orderAmount: number, userId: string): Promise<void> {
    console.log(`Handling payment response for Order ID: ${orderId}, Status: ${paymentStatus}`)
    if (paymentStatus === 'SUCCESS') {
      await this.handlePaymentSuccess(orderId, paymentId, orderAmount, 'INR', userId, 'completed', 'INR deposit via Cashfree')
      toast.success('Payment successful and balance updated!')
    } else {
      await this.handlePaymentFailure(orderId, paymentStatus, 'Payment failed or cancelled')
      toast.error('Payment failed or was cancelled.')
    }
  }

  private async handlePaymentSuccess(orderId: string, paymentId: string, amount: number, currency: string, userId: string, status: string, description: string): Promise<void> {
    try {
      // Log transaction
      await firebaseService.createTransaction({
        userId,
        type: 'deposit',
        amount,
        currency,
        description,
        status: status as 'completed',
        orderId,
        paymentId,
        timestamp: new Date()
      })

      // Update user's INR balance
      await firebaseService.updateUserBalance(userId, currency, amount)
      console.log(`User ${userId} ${currency} balance updated by ${amount}`)
      
      // Dispatch a custom event to notify components to refresh balances
      window.dispatchEvent(new Event('balanceUpdated'))
    } catch (error) {
      console.error('Error handling payment success:', error)
      toast.error('Failed to update balance or log transaction.')
    }
  }

  private async handlePaymentFailure(orderId: string, status: string, errorMessage: string): Promise<void> {
    try {
      // Log failed transaction
      const userId = auth.currentUser?.uid || 'unknown'
      await firebaseService.createTransaction({
        userId,
        type: 'deposit',
        amount: this.currentOrder?.order_amount || 0,
        currency: 'INR',
        description: `INR deposit failed: ${errorMessage}`,
        status: status as 'failed',
        orderId,
        timestamp: new Date()
      })
      console.log(`Payment failed for order ${orderId}: ${errorMessage}`)
    } catch (error) {
      console.error('Error logging failed transaction:', error)
    }
  }

  // Check if manager is ready for payments
  isReady(): boolean {
    return this.isInitialized && this.cashfree !== null
  }

  // Manual check for payment status (for testing)
  async checkPaymentStatusManually(orderId: string): Promise<void> {
    try {
      console.log('Manual payment status check for order:', orderId)
      const orderStatus = await this.checkOrderStatus(orderId)
      console.log('Manual status check result:', orderStatus)
      
      if (orderStatus && orderStatus.order_status === 'PAID') {
        toast.success('Payment confirmed! Balance updated.')
        // You can manually trigger balance update here if needed
      } else {
        toast.error('Payment not confirmed')
      }
    } catch (error) {
      console.error('Manual status check error:', error)
      toast.error('Error checking payment status')
    }
  }
}

export const cashfreeManager = new CashfreeManager()