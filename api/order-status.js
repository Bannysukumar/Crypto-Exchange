export default async function handler(req, res) {
  console.log('Order Status API called:', req.method, req.url, req.query);
  
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
  
  if (req.method === 'GET') {
    const { orderId } = req.query;
    console.log('Checking status for order:', orderId);
    
    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
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
      // Get real order status from Cashfree API
      const cashfreeResponse = await fetch(`https://sandbox.cashfree.com/pg/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-api-version': '2022-09-01',
          'x-client-id': process.env.VITE_CASHFREE_APP_ID,
          'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY
        }
      });
      
      if (!cashfreeResponse.ok) {
        const errorText = await cashfreeResponse.text();
        console.error('Cashfree API error:', errorText);
        throw new Error(`Cashfree API error: ${cashfreeResponse.status} - ${errorText}`);
      }
      
      const orderStatus = await cashfreeResponse.json();
      console.log('Order status from Cashfree:', orderStatus);
      
      res.status(200).json({
        success: true,
        order: orderStatus,
        status: orderStatus.order_status || orderStatus.status || 'UNKNOWN',
        order_status: orderStatus.order_status || orderStatus.status || 'UNKNOWN'
      });
      
    } catch (error) {
      console.error('Error checking order status:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to check order status with Cashfree',
        error: error.message
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
