// Temporarily disable MongoDB to test basic API functionality
// import { MongoClient } from 'mongodb';

// const MONGODB_URI = 'mongodb+srv://donvaibhav21:<StX7LTcANb9G5NxI>@cluster0.dmd7ds0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
// const DB_NAME = 'CyrptopayDB';

// let cachedClient = null;
// let cachedDb = null;

// async function connectToDatabase() {
//   if (cachedClient && cachedDb) {
//     return { client: cachedClient, db: cachedDb };
//   }

//   const client = new MongoClient(MONGODB_URI);
//   await client.connect();
//   const db = client.db(DB_NAME);

//   cachedClient = client;
//   cachedDb = db;

//   return { client, db };
// }

export default async function handler(req, res) {
  console.log('API Users endpoint called:', req.method, req.url, req.query);
  
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

  try {
    const { uid } = req.query;
    console.log('User ID from query:', uid);
    
    if (!uid) {
      console.log('No UID provided');
      return res.status(400).json({ error: 'User ID is required' });
    }

    console.log('Processing request without database connection...');
    
    if (req.method === 'GET') {
      console.log('Fetching user with UID:', uid);
      
      // Return mock user data for testing
      const mockUser = {
        _id: 'mock_id_' + uid,
        uid: uid,
        email: 'test@example.com',
        displayName: 'Test User',
        name: 'Test User',
        phone: '+1234567890',
        inrBalance: 1000,
        cryptoBalances: {
          BTC: 0.001,
          USDT: 100,
          BXC: 50
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Returning mock user data');
      res.status(200).json(mockUser);
    } else if (req.method === 'POST') {
      console.log('Creating/updating user');
      const userData = req.body;
      
      // Return the user data with mock ID
      const result = {
        ...userData,
        _id: 'mock_id_' + userData.uid,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('User created/updated successfully');
      res.status(200).json(result);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Detailed error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
