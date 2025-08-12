import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const { userToken } = await req.json()
    
    if (!userToken) {
      return NextResponse.json(
        { error: 'User token is required' },
        { status: 400 }
      )
    }

    // Apple Music Developer Token 생성
    const teamId = process.env.APPLE_TEAM_ID
    const keyId = process.env.APPLE_KEY_ID
    const privateKey = process.env.APPLE_PRIVATE_KEY

    if (!teamId || !keyId || !privateKey) {
      return NextResponse.json(
        { error: 'Apple Music 설정이 완료되지 않았습니다' },
        { status: 500 }
      )
    }

    // JWT 토큰 생성 (Apple Music Developer Token)
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 15777000, // 6개월 (최대)
    }

    const developerToken = jwt.sign(payload, privateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    })

    return NextResponse.json({
      developerToken,
      userToken,
    })
  } catch (error) {
    console.error('Apple Music token generation error:', error)
    return NextResponse.json(
      { error: '토큰 생성 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
} 