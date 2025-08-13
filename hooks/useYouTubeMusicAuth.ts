import { useState, useEffect } from 'react'
import { toast } from 'sonner'

// YouTube 토큰 관련 함수들
function saveYouTubeTokens(
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
    localStorage.setItem('snaptunes_youtube_tokens', JSON.stringify(tokens))
  } catch (error) {
    console.warn('Failed to save YouTube tokens:', error)
  }
}

function loadYouTubeTokens() {
  if (typeof window === 'undefined') return null
  try {
    const saved = localStorage.getItem('snaptunes_youtube_tokens')
    return saved ? JSON.parse(saved) : null
  } catch (error) {
    console.warn('Failed to load YouTube tokens:', error)
    return null
  }
}

function clearYouTubeTokens() {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem('snaptunes_youtube_tokens')
  } catch (error) {
    console.warn('Failed to clear YouTube tokens:', error)
  }
}

async function refreshYouTubeToken(refreshToken: string) {
  try {
    const res = await fetch('/api/auth/youtube-music/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) return null

    const data = await res.json()
    return data
  } catch (error) {
    console.error('Failed to refresh YouTube token:', error)
    return null
  }
}

export function useYouTubeMusicAuth() {
  const [youtubeToken, setYouTubeToken] = useState<string | null>(null)
  const [youtubeUser, setYouTubeUser] = useState<{
    id: string
    displayName: string
    email?: string
    imageUrl?: string
  } | null>(null)

  // YouTube 인증/토큰 초기화 및 사용자 정보 fetch
  useEffect(() => {
    const initializeYouTubeToken = async () => {
      const url = new URL(window.location.href)
      const urlToken = url.searchParams.get('youtube_access_token')
      const urlRefreshToken = url.searchParams.get('youtube_refresh_token')
      const youtubeError = url.searchParams.get('youtube_error')

      // 에러가 있는 경우 처리
      if (youtubeError) {
        console.warn('YouTube Music authentication error:', youtubeError)

        // 에러 메시지 표시
        if (youtubeError === 'access_denied') {
          toast.error('YouTube Music 로그인이 취소되었습니다.')
        } else if (youtubeError === 'no_code_provided') {
          toast.error('YouTube Music 인증 코드를 받지 못했습니다.')
        } else if (youtubeError === 'token_failed') {
          toast.error('YouTube Music 토큰 발급에 실패했습니다.')
        } else if (youtubeError === 'network_error') {
          toast.error('YouTube Music 인증 중 네트워크 오류가 발생했습니다.')
        } else {
          toast.error(`YouTube Music 인증 오류: ${youtubeError}`)
        }

        // URL에서 에러 파라미터 제거
        url.searchParams.delete('youtube_error')
        url.searchParams.delete('youtube_error_detail')
        window.history.replaceState({}, document.title, url.toString())
        return
      }

      if (urlToken && urlRefreshToken) {
        const expiresAt = Date.now() + 3600 * 1000
        saveYouTubeTokens(urlToken, urlRefreshToken, expiresAt)
        setYouTubeToken(urlToken)

        // 성공 메시지 표시
        toast.success('YouTube Music 로그인에 성공했습니다!')

        url.searchParams.delete('youtube_access_token')
        url.searchParams.delete('youtube_refresh_token')
        window.history.replaceState({}, document.title, url.toString())
        return
      }

      const savedTokens = loadYouTubeTokens()
      if (savedTokens && savedTokens.accessToken && savedTokens.refreshToken) {
        const now = Date.now()
        if (savedTokens.expiresAt > now + 5 * 60 * 1000) {
          setYouTubeToken(savedTokens.accessToken)
          return
        }
        const refreshed = await refreshYouTubeToken(savedTokens.refreshToken)
        if (refreshed) {
          const newExpiresAt = Date.now() + refreshed.expires_in * 1000
          saveYouTubeTokens(
            refreshed.access_token,
            refreshed.refresh_token,
            newExpiresAt,
          )
          setYouTubeToken(refreshed.access_token)
          toast.success('YouTube Music 토큰이 갱신되었습니다.')
        } else {
          clearYouTubeTokens()
          setYouTubeToken(null)
          toast.error('YouTube Music 토큰 갱신에 실패했습니다.')
        }
      }
    }
    initializeYouTubeToken()
  }, [])

  // 토큰이 바뀔 때마다 사용자 정보 fetch
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (youtubeToken) {
        const userInfo = await getYouTubeUserInfo(youtubeToken)
        setYouTubeUser(userInfo)
      } else {
        setYouTubeUser(null)
      }
    }
    fetchUserInfo()
  }, [youtubeToken])

  // YouTube 토큰 유효성 검사 및 갱신
  const getValidYouTubeToken = async (
    setToken: (token: string | null) => void,
  ) => {
    const savedTokens = loadYouTubeTokens()
    if (!savedTokens || !savedTokens.accessToken || !savedTokens.refreshToken) {
      return null
    }

    const now = Date.now()
    // 토큰이 만료되었는지 확인 (5분 여유)
    if (savedTokens.expiresAt > now + 5 * 60 * 1000) {
      return savedTokens.accessToken
    }

    // 토큰 갱신 시도
    const refreshed = await refreshYouTubeToken(savedTokens.refreshToken)
    if (refreshed) {
      const newExpiresAt = Date.now() + refreshed.expires_in * 1000
      saveYouTubeTokens(
        refreshed.access_token,
        refreshed.refresh_token,
        newExpiresAt,
      )
      setToken(refreshed.access_token)
      return refreshed.access_token
    } else {
      // 갱신 실패: 저장된 토큰 삭제
      clearYouTubeTokens()
      setToken(null)
      toast.error(
        'YouTube Music 토큰 갱신에 실패했습니다. 다시 로그인해주세요.',
      )
      return null
    }
  }

  // YouTube 인증 시작
  const handleYouTubeAuth = () => {
    window.location.href = '/api/auth/youtube-music'
  }

  // YouTube 로그아웃
  const handleYouTubeLogout = () => {
    clearYouTubeTokens()
    setYouTubeToken(null)
    setYouTubeUser(null)
    toast.success('YouTube Music 로그아웃되었습니다.')
  }

  // YouTube 사용자 정보 가져오기
  const getYouTubeUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      )

      if (!res.ok) return null

      const data = await res.json()
      const channel = data.items?.[0]

      if (channel) {
        return {
          id: channel.id,
          displayName: channel.snippet?.title || 'YouTube User',
          imageUrl:
            channel.snippet?.thumbnails?.medium?.url ||
            channel.snippet?.thumbnails?.default?.url,
        }
      }
      return null
    } catch (error) {
      console.error('Failed to get YouTube user info:', error)
      return null
    }
  }

  return {
    youtubeToken,
    setYouTubeToken,
    youtubeUser,
    setYouTubeUser,
    getValidYouTubeToken,
    handleYouTubeAuth,
    handleYouTubeLogout,
    getYouTubeUserInfo,
  }
}
