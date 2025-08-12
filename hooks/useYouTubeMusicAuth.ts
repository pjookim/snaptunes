import { useState, useEffect } from 'react'

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

  // YouTube 토큰 유효성 검사 및 갱신
  const getValidYouTubeToken = async (setToken: (token: string | null) => void) => {
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
  }

  // YouTube 사용자 정보 가져오기
  const getYouTubeUserInfo = async (accessToken: string) => {
    try {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )

      if (!res.ok) return null

      const data = await res.json()
      const channel = data.items?.[0]
      
      if (channel) {
        return {
          id: channel.id,
          displayName: channel.snippet?.title || 'YouTube User',
          imageUrl: channel.snippet?.thumbnails?.medium?.url || 
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