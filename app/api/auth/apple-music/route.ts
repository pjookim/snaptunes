import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Apple Music은 MusicKit JS를 사용하므로 클라이언트 사이드에서 인증을 처리합니다.
// 이 엔드포인트는 MusicKit 초기화를 위한 설정을 제공합니다.

export async function GET() {
  try {
    // Apple Music 설정 확인
    const teamId = process.env.APPLE_TEAM_ID
    const keyId = process.env.APPLE_KEY_ID
    const privateKey = process.env.APPLE_PRIVATE_KEY
    
    if (!teamId || !keyId || !privateKey) {
      return NextResponse.json(
        { error: 'Apple Music 설정이 완료되지 않았습니다. APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY를 확인해주세요.' },
        { status: 500 }
      )
    }

    // 개인키를 PEM 형식으로 변환 (환경 변수에서 \n이 문자열로 저장된 경우 처리)
    let formattedPrivateKey = privateKey
    
    // \n을 실제 개행으로 변환
    if (privateKey.includes('\\n')) {
      formattedPrivateKey = privateKey.replace(/\\n/g, '\n')
    }
    
    // PEM 헤더/푸터가 없는 경우 추가
    if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      // Base64 문자열을 64자마다 개행 추가하여 PEM 형식으로 변환
      const base64Content = formattedPrivateKey.replace(/[^A-Za-z0-9+/]/g, '')
      const chunks = base64Content.match(/.{1,64}/g) || []
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----`
    }

    console.log('Formatted private key length:', formattedPrivateKey.length)
    console.log('Private key starts with:', formattedPrivateKey.substring(0, 50))
    console.log('Private key ends with:', formattedPrivateKey.substring(formattedPrivateKey.length - 50))

    // JWT 토큰 생성 (Apple Music Developer Token) - ES256 알고리즘 사용
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: teamId,
      iat: now,
      exp: now + 15777000, // 6개월 (최대)
    }

    // Apple Music API는 ES256 알고리즘만 지원
    const developerToken = jwt.sign(payload, formattedPrivateKey, {
      algorithm: 'ES256',
      keyid: keyId,
    })

    return NextResponse.json({
      developerToken,
      teamId,
      keyId,
      algorithm: 'ES256',
    })
  } catch (error) {
    console.error('Apple Music configuration error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { error: 'Apple Music 설정 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : '알 수 없는 오류') },
      { status: 500 }
    )
  }
} 