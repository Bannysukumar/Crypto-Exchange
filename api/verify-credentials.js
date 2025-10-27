export default function handler(req, res) {
  console.log('Verify Cashfree credentials endpoint called');
  
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
    const credentials = {
      appId: process.env.VITE_CASHFREE_APP_ID,
      secretKey: process.env.VITE_CASHFREE_SECRET_KEY,
      appIdLength: process.env.VITE_CASHFREE_APP_ID ? process.env.VITE_CASHFREE_APP_ID.length : 0,
      secretKeyLength: process.env.VITE_CASHFREE_SECRET_KEY ? process.env.VITE_CASHFREE_SECRET_KEY.length : 0,
      appIdPrefix: process.env.VITE_CASHFREE_APP_ID ? process.env.VITE_CASHFREE_APP_ID.substring(0, 4) : 'N/A',
      secretKeyPrefix: process.env.VITE_CASHFREE_SECRET_KEY ? process.env.VITE_CASHFREE_SECRET_KEY.substring(0, 10) : 'N/A'
    };
    
    console.log('Current credentials:', credentials);
    
    res.status(200).json({
      success: true,
      message: 'Current Cashfree credentials',
      data: credentials
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
