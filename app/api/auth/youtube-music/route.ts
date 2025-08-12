import { NextResponse } from 'next/server'

const SCOPE = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/youtubepartner',
].join(' ')

export async function GET() {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.YOUTUBE_CLIENT_ID!,
    scope: SCOPE,
    redirect_uri: process.env.YOUTUBE_REDIRECT_URI!,
    access_type: 'offline',
    prompt: 'consent',
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  )
}
