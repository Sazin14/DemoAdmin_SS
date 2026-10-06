'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export type ThemePreference = 'light' | 'dark' | 'system'

type ThemeContextValue = {
  theme: ThemePreference
  setTheme: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const themeStorageKey = 'ecomms-admin-theme'
const initialTheme = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(themeStorageKey)
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
  }))
  const [theme, setThemeState] = useState<ThemePreference>(initialTheme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = () => {
      root.dataset.theme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme
    }
    applyTheme()
    if (theme === 'system') media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [theme])

  const setTheme = (nextTheme: ThemePreference) => {
    window.localStorage.setItem(themeStorageKey, nextTheme)
    setThemeState(nextTheme)
  }

  return <QueryClientProvider client={queryClient}><ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider></QueryClientProvider>
}

export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used within the application Providers.')
  return value
}
