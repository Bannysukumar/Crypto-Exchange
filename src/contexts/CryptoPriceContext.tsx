import React, { createContext, useContext, useEffect, useState } from 'react'

export interface CryptoPrices {
  BTC: number
  USDT: number
  BXC: number
}

interface CryptoPriceContextType {
  prices: CryptoPrices
  loading: boolean
  lastUpdated: Date | null
  refreshPrices: () => Promise<void>
  fetchPrices: () => Promise<void>
  convertToINR: (amount: number, currency: keyof CryptoPrices) => number
  convertFromINR: (inrAmount: number, currency: keyof CryptoPrices) => number
}

const CryptoPriceContext = createContext<CryptoPriceContextType | undefined>(undefined)

export const useCryptoPrices = () => {
  const context = useContext(CryptoPriceContext)
  if (context === undefined) {
    throw new Error('useCryptoPrices must be used within a CryptoPriceProvider')
  }
  return context
}

export const CryptoPriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<CryptoPrices>({
    BTC: 4500000, // Default fallback prices
    USDT: 83,
    BXC: 25
  })
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchCryptoPrices = async (): Promise<void> => {
    setLoading(true)
    try {
      // Skip API calls in demo mode, use realistic demo prices
      
      // Simulate realistic crypto prices with small variations
      const btcBase = 4500000 // ~₹45,00,000 for 1 BTC
      const usdtBase = 83.5   // ~₹83.5 for 1 USDT
      
      // Add small random variation (±1%) to simulate market movement
      const variation = () => 0.99 + Math.random() * 0.02
      
      const demoData = {
        bitcoin: { inr: Math.round(btcBase * variation()) },
        tether: { inr: Math.round(usdtBase * variation() * 100) / 100 }
      }
      
      let data = demoData

      if (data && data.bitcoin && data.tether) {
        setPrices({
          BTC: data.bitcoin?.inr || 4500000,
          USDT: data.tether?.inr || 83,
          BXC: 25 // Custom token, fixed price for now
        })
        setLastUpdated(new Date())
      } else {
        throw new Error('No valid price data received')
      }
    } catch (error) {
      console.warn('All price APIs failed, using fallback prices:', error)
      // Use realistic fallback prices with slight randomization to simulate market changes
      const btcBase = 4500000
      const usdtBase = 83
      const randomFactor = 0.98 + Math.random() * 0.04 // ±2% variation
      
      setPrices(prev => ({
        BTC: prev.BTC || Math.round(btcBase * randomFactor),
        USDT: prev.USDT || Math.round(usdtBase * randomFactor * 100) / 100,
        BXC: 25 // Fixed price for custom token
      }))
      
      if (!lastUpdated) {
        setLastUpdated(new Date())
      }
    } finally {
      setLoading(false)
    }
  }

  const refreshPrices = async (): Promise<void> => {
    await fetchCryptoPrices()
  }

  const fetchPrices = async (): Promise<void> => {
    await fetchCryptoPrices()
  }

  const convertToINR = (amount: number, currency: keyof CryptoPrices): number => {
    return amount * prices[currency]
  }

  const convertFromINR = (inrAmount: number, currency: keyof CryptoPrices): number => {
    return inrAmount / prices[currency]
  }

  useEffect(() => {
    // Initial price fetch
    fetchCryptoPrices()

    // Set up price refresh interval (every 60 seconds)
    const interval = setInterval(() => {
      fetchCryptoPrices()
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const value: CryptoPriceContextType = {
    prices,
    loading,
    lastUpdated,
    refreshPrices,
    fetchPrices,
    convertToINR,
    convertFromINR
  }

  return (
    <CryptoPriceContext.Provider value={value}>
      {children}
    </CryptoPriceContext.Provider>
  )
}
