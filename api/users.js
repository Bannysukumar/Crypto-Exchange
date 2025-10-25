import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://donvaibhav21:<StX7LTcANb9G5NxI>@cluster0.dmd7ds0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'CyrptopayDB';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

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

    console.log('Connecting to database...');
    const { db } = await connectToDatabase();
    console.log('Database connected successfully');
    
    const users = db.collection('users');
    console.log('Users collection accessed');
    
    if (req.method === 'GET') {
      console.log('Fetching user with UID:', uid);
      const user = await users.findOne({ uid });
      console.log('User found:', user ? 'Yes' : 'No');
      
      if (!user) {
        console.log('User not found, returning 404');
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('Returning user data');
      res.status(200).json(user);
    } else if (req.method === 'POST') {
      console.log('Creating/updating user');
      const userData = req.body;
      
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
      
      console.log('User created/updated successfully');
      res.status(200).json(result.value);
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
