export async function refreshSpotifyToken(refreshToken: string): Promise<{
  accessToken: string
  refreshToken: string
  expiresIn: number
} | null> {
  try {
    const response = await fetch('/api/auth/spotify/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!response.ok) {
      throw new Error('Failed to refresh token')
    }
    const data = await response.json()
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    }
  } catch (error) {
    console.error('Token refresh failed:', error)
    return null
  }
}

export async function getSpotifyUserInfo(accessToken: string): Promise<{
  id: string
  displayName: string
  email: string
  imageUrl?: string
} | null> {
  try {
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      throw new Error('Failed to fetch user info')
    }
    const userData = await response.json()
    return {
      id: userData.id,
      displayName: userData.display_name,
      email: userData.email,
      imageUrl: userData.images?.[0]?.url,
    }
  } catch (error) {
    console.error('Failed to get Spotify user info:', error)
    return null
  }
}
