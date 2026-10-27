'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  getCurrentUser,
  logout as logoutRequest,
  type AuthUser,
} from '@/lib/auth'


interface AuthContextValue {

  user: AuthUser | null

  loading: boolean

  authenticated: boolean

  refreshUser: () => Promise<AuthUser | null>

  logout: () => Promise<void>
}


const AuthContext =
  createContext<AuthContextValue | undefined>(
    undefined
  )


interface AuthProviderProps {
  children: ReactNode
}


export default function AuthProvider({
  children,
}: AuthProviderProps) {

  const [user, setUser] =
    useState<AuthUser | null>(null)

  const [loading, setLoading] =
    useState(true)


  const refreshUser =
    async (): Promise<AuthUser | null> => {

      setLoading(true)

      try {

        const currentUser =
          await getCurrentUser()

        setUser(currentUser)

        return currentUser

      } finally {

        setLoading(false)

      }
    }


  const logout =
    async (): Promise<void> => {

      try {

        await logoutRequest()

      } finally {

        setUser(null)

      }

    }


  useEffect(() => {

    refreshUser()

  }, [])


  const value: AuthContextValue = {

    user,

    loading,

    authenticated: Boolean(user),

    refreshUser,

    logout,

  }


  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}


export function useAuth(): AuthContextValue {

  const context =
    useContext(AuthContext)

  if (!context) {

    throw new Error(
      'useAuth must be used inside AuthProvider'
    )

  }

  return context
}
