import { useState, useEffect, useCallback } from 'react'
import { refreshSpotifyToken, getSpotifyUserInfo } from '@/lib/api/spotify'

function saveSpotifyTokens(
  accessToken: string,
  refreshToken: string,
  expiresAt: number,
) {
  if (typeof window === 'undefined') return
  try {
    const tokens = {
      accessToken,
      refreshToken,
      expiresAt,
      timestamp: Date.now(),
    }
    localStorage.setItem('snaptunes_spotify_tokens', JSON.stringify(tokens))
  } catch (error) {
    console.warn('Failed to save Spotify tokens:', error)
  }
}

function loadSpotifyTokens() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem('snaptunes_spotify_tokens')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('Failed to load Spotify tokens:', error)
    return null
  }
}

function clearSpotifyTokens() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('snaptunes_spotify_tokens')
  } catch (error) {
    console.warn('Failed to clear Spotify tokens:', error)
  }
}

export function useSpotifyAuth() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null)
  const [spotifyUser, setSpotifyUser] = useState<{
    id: string
    displayName: string
    email: string
    imageUrl?: string
  } | null>(null)

  // 안전한 토큰 가져오기 (필요시 갱신)
  const getValidSpotifyToken = useCallback(
    async (
      setTokenCallback?: (token: string | null) => void,
    ): Promise<string | null> => {
      const savedTokens = loadSpotifyTokens()
      if (
        !savedTokens ||
        !savedTokens.accessToken ||
        !savedTokens.refreshToken
      ) {
        return null
      }
      const now = Date.now()
      if (savedTokens.expiresAt > now + 5 * 60 * 1000) {
        return savedTokens.accessToken
      }
      const refreshed = await refreshSpotifyToken(savedTokens.refreshToken)
      if (refreshed) {
        const newExpiresAt = Date.now() + refreshed.expiresIn * 1000
        saveSpotifyTokens(
          refreshed.accessToken,
          refreshed.refreshToken,
          newExpiresAt,
        )
        setSpotifyToken(refreshed.accessToken)
        if (setTokenCallback) setTokenCallback(refreshed.accessToken)
        return refreshed.accessToken
      } else {
        clearSpotifyTokens()
        setSpotifyToken(null)
        if (setTokenCallback) setTokenCallback(null)
        return null
      }
    },
    [],
  )

  // 인증/토큰 초기화 및 사용자 정보 fetch
  useEffect(() => {
    const initializeSpotifyToken = async () => {
      const url = new URL(window.location.href)
      const urlToken = url.searchParams.get('spotify_access_token')
      const urlRefreshToken = url.searchParams.get('spotify_refresh_token')
      if (urlToken && urlRefreshToken) {
        const expiresAt = Date.now() + 3600 * 1000
        saveSpotifyTokens(urlToken, urlRefreshToken, expiresAt)
        setSpotifyToken(urlToken)
        url.searchParams.delete('spotify_access_token')
        url.searchParams.delete('spotify_refresh_token')
        window.history.replaceState({}, document.title, url.toString())
        return
      }
      const savedTokens = loadSpotifyTokens()
      if (savedTokens && savedTokens.accessToken && savedTokens.refreshToken) {
        const now = Date.now()
        if (savedTokens.expiresAt > now + 5 * 60 * 1000) {
          setSpotifyToken(savedTokens.accessToken)
          return
        }
        const refreshed = await refreshSpotifyToken(savedTokens.refreshToken)
        if (refreshed) {
          const newExpiresAt = Date.now() + refreshed.expiresIn * 1000
          saveSpotifyTokens(
            refreshed.accessToken,
            refreshed.refreshToken,
            newExpiresAt,
          )
          setSpotifyToken(refreshed.accessToken)
        } else {
          clearSpotifyTokens()
          setSpotifyToken(null)
        }
      }
    }
    initializeSpotifyToken()
  }, [])

  // 토큰이 바뀔 때마다 사용자 정보 fetch
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (spotifyToken) {
        const userInfo = await getSpotifyUserInfo(spotifyToken)
        setSpotifyUser(userInfo)
      } else {
        setSpotifyUser(null)
      }
    }
    fetchUserInfo()
  }, [spotifyToken])

  // 인증 시작
  const handleSpotifyAuth = useCallback(() => {
    window.location.href = '/api/auth/spotify'
  }, [])

  // 로그아웃
  const handleSpotifyLogout = useCallback(() => {
    clearSpotifyTokens()
    setSpotifyToken(null)
    setSpotifyUser(null)
  }, [])

  return {
    spotifyToken,
    setSpotifyToken,
    spotifyUser,
    setSpotifyUser,
    getValidSpotifyToken,
    handleSpotifyAuth,
    handleSpotifyLogout,
  }
}
