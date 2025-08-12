# SnapTunes - From Snap to Sound

사진 한 장으로 완성하는 음악 플레이리스트 생성 서비스입니다. AI와 OCR 기술을 활용하여 이미지나 텍스트에서 곡을 추출하고, Spotify 또는 Apple Music 플레이리스트를 자동으로 생성합니다.

## 주요 기능

- 📸 **이미지 기반 곡 추출**: OCR 기술로 이미지에서 텍스트를 추출하여 곡 정보를 자동으로 인식
- 🤖 **AI 기반 곡 추천**: GPT Vision AI가 이미지의 분위기나 텍스트의 테마를 분석하여 적절한 곡을 추천
- 🎵 **다중 음악 서비스 지원**: Spotify, Apple Music, YouTube Music 모두 지원
- 🌍 **다국어 지원**: 한국어와 영어 지원
- 🎨 **모던 UI/UX**: 직관적이고 아름다운 사용자 인터페이스

## 기술 스택

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI/ML**: OpenAI GPT Vision API, OCR (Tesseract.js)
- **음악 서비스**: Spotify Web API, Apple Music API (MusicKit JS), YouTube Music API
- **인증**: OAuth 2.0 (Spotify, YouTube Music), MusicKit JS (Apple Music)
- **국제화**: next-intl

## 사용법

1. **음악 서비스 인증**: Spotify, Apple Music, 또는 YouTube Music 계정으로 로그인
2. **이미지 업로드**: 곡 목록이 포함된 이미지를 업로드하거나 텍스트 직접 입력
3. **곡 검색**: 추출된 곡을 선택한 음악 서비스에서 검색
4. **플레이리스트 생성**: 선택한 곡들로 플레이리스트 생성

프로젝트 링크: [https://github.com/yourusername/snaptunes](https://github.com/yourusername/snaptunes)
