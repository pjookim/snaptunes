import { useState, useEffect, useCallback } from 'react'
import { refreshSpotifyToken, getSpotifyUserInfo } from '@/lib/api/spotify'
import { toast } from 'sonner'

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

export function useSpotifyAuth() {
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null)
  const [spotifyUser, setSpotifyUser] = useState<{
    id: string
    displayName: string
    email: string
    imageUrl?: string
  } | null>(null)

  // 토큰 제거 함수
  const clearSpotifyTokens = () => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem('snaptunes_spotify_tokens')
    } catch (error) {
      console.warn('Failed to clear Spotify tokens:', error)
    }
  }

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
        toast.error('Spotify 토큰 갱신에 실패했습니다. 다시 로그인해주세요.')
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
      const spotifyError = url.searchParams.get('spotify_error')

      // 에러가 있는 경우 처리
      if (spotifyError) {
        console.warn('Spotify authentication error:', spotifyError)

        // 에러 메시지 표시
        if (spotifyError === 'access_denied') {
          toast.error('Spotify 로그인이 취소되었습니다.')
        } else if (spotifyError === 'no_code_provided') {
          toast.error('Spotify 인증 코드를 받지 못했습니다.')
        } else if (spotifyError === 'token_failed') {
          toast.error('Spotify 토큰 발급에 실패했습니다.')
        } else if (spotifyError === 'network_error') {
          toast.error('Spotify 인증 중 네트워크 오류가 발생했습니다.')
        } else {
          toast.error(`Spotify 인증 오류: ${spotifyError}`)
        }

        // URL에서 에러 파라미터 제거
        url.searchParams.delete('spotify_error')
        url.searchParams.delete('spotify_error_detail')
        window.history.replaceState({}, document.title, url.toString())
        return
      }

      if (urlToken && urlRefreshToken) {
        const expiresAt = Date.now() + 3600 * 1000
        saveSpotifyTokens(urlToken, urlRefreshToken, expiresAt)
        setSpotifyToken(urlToken)

        // 성공 메시지 표시
        toast.success('Spotify 로그인에 성공했습니다!')

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
          toast.success('Spotify 토큰이 갱신되었습니다.')
        } else {
          clearSpotifyTokens()
          setSpotifyToken(null)
          toast.error('Spotify 토큰 갱신에 실패했습니다.')
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
    toast.success('Spotify 로그아웃되었습니다.')
  }, [])

  return {
    spotifyToken,
    setSpotifyToken,
    spotifyUser,
    setSpotifyUser,
    getValidSpotifyToken,
    handleSpotifyAuth,
    handleSpotifyLogout,
    clearSpotifyTokens,
  }
}
