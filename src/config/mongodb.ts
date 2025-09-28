import { MongoClient, Db, Collection } from 'mongodb'

const MONGODB_URI = 'mongodb+srv://donvaibhav21:<StX7LTcANb9G5NxI>@cluster0.dmd7ds0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
const DB_NAME = 'CyrptopayDB'

let client: MongoClient | null = null
let db: Db | null = null

export const connectToDatabase = async (): Promise<Db> => {
  if (db) {
    return db
  }

  try {
    client = new MongoClient(MONGODB_URI)
    await client.connect()
    db = client.db(DB_NAME)
    console.log('✅ Connected to MongoDB successfully')
    return db
  } catch (error) {
    console.error('❌ MongoDB connection error:', error)
    throw error
  }
}

export const getDatabase = (): Db => {
  if (!db) {
    throw new Error('Database not connected. Call connectToDatabase() first.')
  }
  return db
}

export const getCollection = (collectionName: string): Collection => {
  const database = getDatabase()
  return database.collection(collectionName)
}

export const closeConnection = async (): Promise<void> => {
  if (client) {
    await client.close()
    client = null
    db = null
    console.log('🔌 MongoDB connection closed')
  }
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  PAYMENTS: 'payments',
  BALANCES: 'balances'
} as const

// Initialize connection on module load
connectToDatabase().catch(console.error)
