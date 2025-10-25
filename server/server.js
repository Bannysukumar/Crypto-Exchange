import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGODB_URI = 'mongodb+srv://donvaibhav21:<StX7LTcANb9G5NxI>@cluster0.dmd7ds0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'CyrptopayDB';

let client;
let db;

// Connect to MongoDB
async function connectToDatabase() {
  if (db) return db;
  
  try {
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB successfully');
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

// CORS configuration - Allow your Vercel domain
const corsOptions = {
  origin: [
    'https://crypto-exchange-at4l1vvfg-bannysukumars-projects.vercel.app',
    'https://*.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Crypto Exchange API Server is running',
    timestamp: new Date().toISOString()
  });
});

// Get user by UID
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const database = await connectToDatabase();
    const users = database.collection('users');
    
    const user = await users.findOne({ uid });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update user
app.post('/api/users', async (req, res) => {
  try {
    const userData = req.body;
    const database = await connectToDatabase();
    const users = database.collection('users');
    
    const result = await users.findOneAndUpdate(
      { uid: userData.uid },
      { 
        $set: { 
          ...userData,
          updatedAt: new Date()
        }
      },
      { 
        upsert: true, 
        returnDocument: 'after' 
      }
    );
    
    res.json(result.value);
  } catch (error) {
    console.error('Error creating/updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user transactions
app.get('/api/users/:uid/transactions', async (req, res) => {
  try {
    const { uid } = req.params;
    const database = await connectToDatabase();
    const transactions = database.collection('transactions');
    
    const userTransactions = await transactions
      .find({ userId: uid })
      .sort({ createdAt: -1 })
      .toArray();
    
    res.json(userTransactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create transaction
app.post('/api/transactions', async (req, res) => {
  try {
    const transactionData = req.body;
    const database = await connectToDatabase();
    const transactions = database.collection('transactions');
    
    const result = await transactions.insertOne({
      ...transactionData,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.json({ 
      success: true, 
      transactionId: result.insertedId,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cashfree endpoints
app.post('/api/create-order', async (req, res) => {
  try {
    const orderData = req.body;
    // Add your Cashfree order creation logic here
    res.json({ 
      success: true, 
      message: 'Order creation endpoint - implement Cashfree integration',
      data: orderData
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    // Add your Cashfree order status logic here
    res.json({ 
      success: true, 
      message: 'Order status endpoint - implement Cashfree integration',
      orderId
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Webhook endpoint
app.post('/api/webhook/cashfree', (req, res) => {
  try {
    const webhookData = req.body;
    console.log('Cashfree webhook received:', webhookData);
    // Add your webhook processing logic here
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Crypto Exchange API Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  if (client) {
    await client.close();
  }
  process.exit(0);
});
