export default function handler(req, res) {
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
    
    // Generate mock order data
    const orderId = 'order_' + Date.now();
    const sessionId = 'session_' + orderId + '_' + Math.random().toString(36).substr(2, 9);
    
    const mockOrder = {
      order_id: orderId,
      payment_session_id: sessionId,
      order_amount: req.body.amount || 100,
      order_currency: req.body.currency || 'INR',
      order_status: 'created',
      created_at: new Date().toISOString(),
      customer_details: req.body.customerDetails || {
        customer_id: 'customer_' + Date.now(),
        customer_name: 'Test User',
        customer_email: 'test@example.com',
        customer_phone: '+1234567890'
      },
      order_note: req.body.orderNote || 'Crypto Exchange Deposit',
      order_tags: req.body.orderTags || ['crypto', 'deposit']
    };
    
    console.log('Order created successfully:', mockOrder);
    res.status(200).json({
      success: true,
      message: 'Order created successfully',
      order: mockOrder
    });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
