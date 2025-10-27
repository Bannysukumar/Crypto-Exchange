export default function handler(req, res) {
  console.log('Debug Environment Variables API called');
  
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
    const envCheck = {
      VITE_CASHFREE_APP_ID: {
        exists: !!process.env.VITE_CASHFREE_APP_ID,
        value: process.env.VITE_CASHFREE_APP_ID ? 
          process.env.VITE_CASHFREE_APP_ID.substring(0, 10) + '...' : 
          'NOT SET',
        length: process.env.VITE_CASHFREE_APP_ID ? 
          process.env.VITE_CASHFREE_APP_ID.length : 0
      },
      VITE_CASHFREE_SECRET_KEY: {
        exists: !!process.env.VITE_CASHFREE_SECRET_KEY,
        value: process.env.VITE_CASHFREE_SECRET_KEY ? 
          process.env.VITE_CASHFREE_SECRET_KEY.substring(0, 10) + '...' : 
          'NOT SET',
        length: process.env.VITE_CASHFREE_SECRET_KEY ? 
          process.env.VITE_CASHFREE_SECRET_KEY.length : 0
      },
      allEnvVars: Object.keys(process.env).filter(key => key.includes('CASHFREE'))
    };
    
    console.log('Environment check result:', envCheck);
    
    res.status(200).json({
      success: true,
      message: 'Environment variables check',
      data: envCheck
    });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
