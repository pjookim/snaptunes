import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 })
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
  })

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  const data = await res.json()

  if (!data.access_token) {
    return NextResponse.json(
      { error: 'Failed to get access token', detail: data },
      { status: 400 },
    )
  }

  const redirectUrl = new URL('/', req.nextUrl.origin)
  redirectUrl.searchParams.set('youtube_access_token', data.access_token)
  redirectUrl.searchParams.set(
    'youtube_refresh_token',
    data.refresh_token ?? '',
  )
  return NextResponse.redirect(redirectUrl.toString())
}
