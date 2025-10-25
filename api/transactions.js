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
    console.log('Transactions API called:', req.method, req.url, req.query);
    
    if (req.method === 'GET') {
      const { userId, type, limit } = req.query;
      
      console.log('Fetching transactions for user:', userId, 'type:', type, 'limit:', limit);
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      // Return mock transaction data
      const mockTransactions = [
        {
          _id: 'mock_tx_1',
          userId: userId,
          type: 'deposit',
          amount: 100,
          currency: 'USDT',
          description: 'Deposit from wallet',
          status: 'completed',
          txHash: '0x1234567890abcdef',
          timestamp: new Date(Date.now() - 86400000), // 1 day ago
          createdAt: new Date(Date.now() - 86400000),
          updatedAt: new Date(Date.now() - 86400000)
        },
        {
          _id: 'mock_tx_2',
          userId: userId,
          type: 'withdrawal',
          amount: 50,
          currency: 'BTC',
          description: 'Withdrawal to wallet',
          status: 'completed',
          txHash: '0xabcdef1234567890',
          timestamp: new Date(Date.now() - 172800000), // 2 days ago
          createdAt: new Date(Date.now() - 172800000),
          updatedAt: new Date(Date.now() - 172800000)
        },
        {
          _id: 'mock_tx_3',
          userId: userId,
          type: 'transfer',
          amount: 25,
          currency: 'BXC',
          description: 'Transfer to another user',
          status: 'completed',
          timestamp: new Date(Date.now() - 259200000), // 3 days ago
          createdAt: new Date(Date.now() - 259200000),
          updatedAt: new Date(Date.now() - 259200000)
        }
      ];
      
      // Filter by type if specified
      let filteredTransactions = mockTransactions;
      if (type) {
        filteredTransactions = mockTransactions.filter(tx => tx.type === type);
      }
      
      // Apply limit
      const limitNum = parseInt(limit) || 100;
      const limitedTransactions = filteredTransactions.slice(0, limitNum);
      
      console.log('Returning mock transactions:', limitedTransactions.length);
      res.status(200).json(limitedTransactions);
    } else if (req.method === 'POST') {
      console.log('Creating transaction');
      const transactionData = req.body;
      
      // Return mock created transaction
      const result = {
        _id: 'mock_tx_' + Date.now(),
        ...transactionData,
        status: 'pending',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Transaction created successfully');
      res.status(200).json({ 
        success: true, 
        transactionId: result._id,
        message: 'Transaction created successfully',
        transaction: result
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
