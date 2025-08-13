import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')

  // 에러가 있는 경우 (사용자가 로그인을 취소한 경우)
  if (error) {
    const redirectUrl = new URL('/', req.nextUrl.origin)
    redirectUrl.searchParams.set('youtube_error', error)
    return NextResponse.redirect(redirectUrl.toString())
  }

  // 코드가 없는 경우
  if (!code) {
    const redirectUrl = new URL('/', req.nextUrl.origin)
    redirectUrl.searchParams.set('youtube_error', 'no_code_provided')
    return NextResponse.redirect(redirectUrl.toString())
  }

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
  })

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const data = await res.json()

    if (!data.access_token) {
      const redirectUrl = new URL('/', req.nextUrl.origin)
      redirectUrl.searchParams.set('youtube_error', 'token_failed')
      redirectUrl.searchParams.set('youtube_error_detail', JSON.stringify(data))
      return NextResponse.redirect(redirectUrl.toString())
    }

    const redirectUrl = new URL('/', req.nextUrl.origin)
    redirectUrl.searchParams.set('youtube_access_token', data.access_token)
    redirectUrl.searchParams.set(
      'youtube_refresh_token',
      data.refresh_token ?? '',
    )
    return NextResponse.redirect(redirectUrl.toString())
  } catch (error) {
    const redirectUrl = new URL('/', req.nextUrl.origin)
    redirectUrl.searchParams.set('youtube_error', 'network_error')
    return NextResponse.redirect(redirectUrl.toString())
  }
}
