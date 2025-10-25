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
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Add content-type header
  res.setHeader('Content-Type', 'application/json');

  try {
    const { uid } = req.query;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const { db } = await connectToDatabase();
    const users = db.collection('users');
    
    if (req.method === 'GET') {
      const user = await users.findOne({ uid });
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.status(200).json(user);
    } else if (req.method === 'POST') {
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
      
      res.status(200).json(result.value);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
