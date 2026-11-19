import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe, loginMagic, logout as apiLogout, switchAccount } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { user: u } = await getMe()
      setUser(u)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const loginWithToken = useCallback(async (token) => {
    const { user: u } = await loginMagic(token)
    setUser(u)
    return u
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    setUser(null)
  }, [])

  const switchToUser = useCallback(async (userId) => {
    const { user: u } = await switchAccount(userId)
    setUser(u)
    return u
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, refresh, loginWithToken, logout, switchToUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth requires AuthProvider')
  return ctx
}
