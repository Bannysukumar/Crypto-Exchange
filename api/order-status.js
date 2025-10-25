export default function handler(req, res) {
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
    
    // Return mock order status
    const mockStatus = {
      orderId: orderId,
      status: 'PAID',
      paymentStatus: 'SUCCESS',
      amount: 100,
      currency: 'INR',
      createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      paidAt: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
      customerDetails: {
        customerId: 'customer_' + orderId.split('_')[1],
        customerName: 'Test User',
        customerEmail: 'test@example.com',
        customerPhone: '+1234567890'
      },
      paymentMethod: 'UPI',
      paymentId: 'payment_' + orderId.split('_')[1],
      transactionId: 'txn_' + orderId.split('_')[1]
    };
    
    console.log('Order status retrieved:', mockStatus);
    res.status(200).json({
      success: true,
      order: mockStatus
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
