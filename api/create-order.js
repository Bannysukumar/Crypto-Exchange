export default async function handler(req, res) {
  console.log('Create Order API called:', req.method, req.url, req.body);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Content-Type', 'application/json');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'POST') {
    console.log('Creating order with data:', req.body);
    console.log('Environment variables check:');
    console.log('VITE_CASHFREE_APP_ID:', process.env.VITE_CASHFREE_APP_ID ? 'SET' : 'NOT SET');
    console.log('VITE_CASHFREE_SECRET_KEY:', process.env.VITE_CASHFREE_SECRET_KEY ? 'SET' : 'NOT SET');
    
    // Debug: Show actual values (first few characters only for security)
    if (process.env.VITE_CASHFREE_APP_ID) {
      console.log('APP_ID starts with:', process.env.VITE_CASHFREE_APP_ID.substring(0, 10) + '...');
    }
    if (process.env.VITE_CASHFREE_SECRET_KEY) {
      console.log('SECRET_KEY starts with:', process.env.VITE_CASHFREE_SECRET_KEY.substring(0, 10) + '...');
    }
    
    // Check if environment variables are set
    if (!process.env.VITE_CASHFREE_APP_ID || !process.env.VITE_CASHFREE_SECRET_KEY) {
      console.error('Missing Cashfree credentials');
      return res.status(500).json({
        success: false,
        message: 'Cashfree credentials not configured',
        error: 'Missing VITE_CASHFREE_APP_ID or VITE_CASHFREE_SECRET_KEY environment variables'
      });
    }
    
    try {
      // Create real order with Cashfree API
      const orderData = {
        order_id: 'order_' + Date.now(),
        order_amount: req.body.amount || 100,
        order_currency: 'INR',
        customer_details: {
          customer_id: req.body.customerId || 'customer_' + Date.now(),
          customer_name: req.body.customerName || 'Test User',
          customer_email: req.body.customerEmail || 'test@example.com',
          customer_phone: req.body.customerPhone || '+1234567890'
        },
        order_note: 'Crypto Exchange Deposit',
        order_tags: {
          'category': 'crypto',
          'type': 'deposit'
        }
      };
      
      console.log('Sending order data to Cashfree:', JSON.stringify(orderData, null, 2));
      console.log('Cashfree API URL: https://sandbox.cashfree.com/pg/orders');
      console.log('Request headers:', {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.VITE_CASHFREE_APP_ID,
        'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY ? 'SET' : 'NOT SET'
      });
      
      // Test with a simple API call first
      console.log('Testing Cashfree API connectivity...');
      console.log('Using credentials:', {
        appId: process.env.VITE_CASHFREE_APP_ID,
        secretKey: process.env.VITE_CASHFREE_SECRET_KEY ? 'SET' : 'NOT SET'
      });
      
      const testResponse = await fetch('https://sandbox.cashfree.com/pg/orders', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': process.env.VITE_CASHFREE_APP_ID,
          'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY
        }
      });
      
      console.log('Test API call status:', testResponse.status);
      if (!testResponse.ok) {
        const testError = await testResponse.text();
        console.log('Test API call error:', testError);
        console.log('Test API call headers:', Object.fromEntries(testResponse.headers.entries()));
      } else {
        console.log('Test API call successful!');
      }
      
      // Try the correct Cashfree API endpoint
      const cashfreeResponse = await fetch('https://sandbox.cashfree.com/pg/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': process.env.VITE_CASHFREE_APP_ID,
          'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY
        },
        body: JSON.stringify(orderData)
      });
      
      if (!cashfreeResponse.ok) {
        const errorText = await cashfreeResponse.text();
        console.error('Cashfree API error:', {
          status: cashfreeResponse.status,
          statusText: cashfreeResponse.statusText,
          error: errorText,
          headers: Object.fromEntries(cashfreeResponse.headers.entries())
        });
        throw new Error(`Cashfree API error: ${cashfreeResponse.status} - ${errorText}`);
      }
      
      const cashfreeOrderData = await cashfreeResponse.json();
      console.log('Order created with Cashfree:', cashfreeOrderData);
      
      res.status(200).json({
        success: true,
        message: 'Order created successfully',
        order: cashfreeOrderData
      });
      
    } catch (error) {
      console.error('Error creating order:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to create order with Cashfree',
        error: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
