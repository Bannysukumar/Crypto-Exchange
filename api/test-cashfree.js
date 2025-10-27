export default function handler(req, res) {
  console.log('Test Cashfree API endpoint called');
  
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
    testCashfreeAPI()
      .then(result => {
        res.status(200).json({
          success: true,
          message: 'Cashfree API test completed',
          data: result
        });
      })
      .catch(error => {
        res.status(500).json({
          success: false,
          message: 'Cashfree API test failed',
          error: error.message
        });
      });
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function testCashfreeAPI() {
  const results = {
    credentials: {
      appId: process.env.VITE_CASHFREE_APP_ID ? 'SET' : 'NOT SET',
      secretKey: process.env.VITE_CASHFREE_SECRET_KEY ? 'SET' : 'NOT SET'
    },
    tests: []
  };
  
  // Test 1: Simple GET request
  try {
    console.log('Test 1: Simple GET request to Cashfree API');
    const test1 = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.VITE_CASHFREE_APP_ID,
        'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY
      }
    });
    
    results.tests.push({
      name: 'GET /pg/orders',
      status: test1.status,
      success: test1.ok,
      error: test1.ok ? null : await test1.text()
    });
  } catch (error) {
    results.tests.push({
      name: 'GET /pg/orders',
      status: 'ERROR',
      success: false,
      error: error.message
    });
  }
  
  // Test 2: Try different API version
  try {
    console.log('Test 2: GET request with 2023-08-01 API version');
    const test2 = await fetch('https://sandbox.cashfree.com/pg/orders', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': process.env.VITE_CASHFREE_APP_ID,
        'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY
      }
    });
    
    results.tests.push({
      name: 'GET /pg/orders (2023-08-01)',
      status: test2.status,
      success: test2.ok,
      error: test2.ok ? null : await test2.text()
    });
  } catch (error) {
    results.tests.push({
      name: 'GET /pg/orders (2023-08-01)',
      status: 'ERROR',
      success: false,
      error: error.message
    });
  }
  
  // Test 3: Try different endpoint
  try {
    console.log('Test 3: GET request to different endpoint');
    const test3 = await fetch('https://sandbox.cashfree.com/pg/orders?limit=1', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2022-09-01',
        'x-client-id': process.env.VITE_CASHFREE_APP_ID,
        'x-client-secret': process.env.VITE_CASHFREE_SECRET_KEY
      }
    });
    
    results.tests.push({
      name: 'GET /pg/orders?limit=1',
      status: test3.status,
      success: test3.ok,
      error: test3.ok ? null : await test3.text()
    });
  } catch (error) {
    results.tests.push({
      name: 'GET /pg/orders?limit=1',
      status: 'ERROR',
      success: false,
      error: error.message
    });
  }
  
  return results;
}
