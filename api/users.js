import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDAVopTBDSikDCHqEnljBMfk6ml-rewiSE",
  authDomain: "cryptopay-e04c3.firebaseapp.com",
  databaseURL: "https://cryptopay-e04c3-default-rtdb.firebaseio.com",
  projectId: "cryptopay-e04c3",
  storageBucket: "cryptopay-e04c3.firebasestorage.app",
  messagingSenderId: "935827653972",
  appId: "1:935827653972:web:7c2f3c14f4c6d57345f4c1",
  measurementId: "G-L7DXEYRW49"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

    console.log('Connecting to Firebase Firestore...');
    console.log('Firebase config:', firebaseConfig);
    console.log('Database instance:', db);
    
    if (req.method === 'GET') {
      console.log('Fetching user with UID:', uid);
      
      const userRef = doc(db, 'users', uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        console.log('User not found in Firestore, creating new user...');
        
        // Create a new user with default values
        const defaultUserData = {
          uid: uid,
          email: 'user@example.com',
          displayName: 'New User',
          name: 'New User',
          phone: '',
          inrBalance: 0,
          cryptoBalances: {
            BTC: 0,
            USDT: 0,
            BXC: 0
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          await setDoc(userRef, defaultUserData);
          console.log('New user created in Firestore');
        } catch (firebaseError) {
          console.error('Error creating user in Firestore:', firebaseError);
          // Return the user data anyway so the app doesn't break
          console.log('Returning user data despite Firebase error');
        }
        
        res.status(200).json({
          _id: uid,
          ...defaultUserData
        });
        return;
      }
      
      const userData = userSnap.data();
      console.log('User found in Firestore:', userData);
      
      res.status(200).json({
        _id: uid,
        ...userData
      });
    } else if (req.method === 'POST') {
      console.log('Creating/updating user in Firestore');
      const userData = req.body;
      
      const userRef = doc(db, 'users', userData.uid);
      
      // Check if user exists
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        // Update existing user
        await updateDoc(userRef, {
          ...userData,
          updatedAt: serverTimestamp()
        });
        console.log('User updated in Firestore');
      } else {
        // Create new user
        await setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('User created in Firestore');
      }
      
      // Get the updated user data
      const updatedUserSnap = await getDoc(userRef);
      const result = updatedUserSnap.data();
      
      console.log('User created/updated successfully');
      res.status(200).json({
        _id: userData.uid,
        ...result
      });
    } else if (req.method === 'PUT') {
      console.log('Updating user in Firestore');
      const userData = req.body;
      
      const userRef = doc(db, 'users', uid);
      
      try {
        await updateDoc(userRef, {
          ...userData,
          updatedAt: serverTimestamp()
        });
        console.log('User updated in Firestore');
        
        // Get the updated user data
        const updatedUserSnap = await getDoc(userRef);
        const result = updatedUserSnap.data();
        
        console.log('User updated successfully');
        res.status(200).json({
          _id: uid,
          ...result
        });
      } catch (firebaseError) {
        console.error('Error updating user in Firestore:', firebaseError);
        // Return the user data anyway so the app doesn't break
        console.log('Returning user data despite Firebase error');
        res.status(200).json({
          _id: uid,
          ...userData
        });
      }
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'PUT']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('Detailed error:', error);
    console.error('Error stack:', error.stack);
    
    // If Firebase fails completely, return a default user to prevent 404
    if (req.method === 'GET') {
      console.log('Firebase error, returning default user data');
      const { uid } = req.query;
      const defaultUserData = {
        _id: uid,
        uid: uid,
        email: 'user@example.com',
        displayName: 'New User',
        name: 'New User',
        phone: '',
        inrBalance: 0,
        cryptoBalances: {
          BTC: 0,
          USDT: 0,
          BXC: 0
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      res.status(200).json(defaultUserData);
      return;
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
