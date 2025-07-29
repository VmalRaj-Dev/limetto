'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/utils/supabase/client'
import { User, SupabaseClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

interface AuthContextType {
  user: User | null
  loading: boolean
  supabase: SupabaseClient
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] Event:', event, session)

      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user)
        if (window.location.pathname === '/login' || window.location.pathname === '/signup') {
          router.push('/dashboard')
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        router.push('/login')
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUser(session.user)
      }
    })

    // Hydrate user (on first load only after cookie is available)
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut({ scope: 'global' })
    setUser(null)
  }, [supabase])

  const value = useMemo(() => ({
    user,
    loading,
    supabase,
    signOut 
  }), [user, loading, supabase,signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
