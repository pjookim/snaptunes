import { NextRequest, NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'

// 곡 정보 타입 정의
interface Song {
  title: string
  artist: string
}

// OpenAI API 응답 타입 정의
interface OpenAIResponse {
  id: string
  object: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

// OpenAI 응답에서 content로 파싱되는 JSON 타입
interface ExtractSongsContent {
  songs?: Song[]
  playlist_title?: string
  data?: Song[] // 혹시 data로 올 경우
}

function isSongArray(arr: unknown): arr is Song[] {
  return (
    Array.isArray(arr) &&
    arr.every(
      (song) =>
        song &&
        typeof song.title === 'string' &&
        typeof song.artist === 'string',
    )
  )
}

// locale에 따른 프롬프트 생성
function getPromptsByLocale(locale: string, inputType: 'image' | 'text' | 'both', t: any) {
  const isKorean = locale === 'ko'
  
  if (inputType === 'image') {
    if (isKorean) {
      return {
        systemPrompt: `당신은 음악 분석 전문가입니다. 제공된 이미지를 분석하고 곡 정보를 추출하거나 내용에 맞는 곡을 추천합니다.

이미지에 곡 제목과 아티스트가 명확하게 나열되어 있다면 JSON 형식으로 추출하세요.
이미지가 분위기, 테마, 맥락(파티, 운동, 공부 등)을 보여준다면 해당 맥락에 맞는 인기곡 10-15곡을 추천하세요.
이미지가 불분명하거나 음악 관련 내용이 없다면 다양한 장르의 인기곡 10-15곡을 추천하세요.

항상 다음 형식의 유효한 JSON 객체로 응답하세요:
{
  "songs": [ { "title": "곡 제목", "artist": "아티스트" } ],
  "playlist_title": "이 곡 목록에 대한 추천 플레이리스트 제목"
}

- 항상 songs 배열에 10-15곡을 반환하세요
- 제목이 비어있지 않은 곡만 포함하세요
- 아티스트가 명확하지 않으면 "artist"를 빈 문자열로 설정하세요
- 적절한 플레이리스트 제목을 추천하기 어려우면 "playlist_title"을 빈 문자열로 설정하세요
- 사람들이 실제로 듣고 싶어할 만한 진짜 인기곡들을 반환하세요
- 한국어 곡과 영어 곡을 모두 고려하세요`,
        userPrompt: `이 이미지를 분석하고 곡 정보를 추출하거나 내용에 맞는 곡을 추천하세요.

이미지에 특정 곡 제목과 아티스트가 포함되어 있다면 추출하세요. 분위기, 활동, 테마를 보여준다면 해당 맥락에 맞는 인기곡을 추천하세요.

예시:
- 체육관/운동 이미지 → 활기찬, 동기부여가 되는 곡 추천
- 파티/축하 이미지 → 경쾌하고 춤추기 좋은 곡 추천
- 공부/사무실 이미지 → 차분하고 기악곡 추천
- 자연/여행 이미지 → 평화롭고 앰비언트한 곡 추천

사람들이 실제로 듣고 싶어할 만한 인기곡 10-15곡을 반환하세요. 한국어 곡과 영어 곡을 모두 포함하세요.`
      }
    } else {
      return {
        systemPrompt: `You are a music analysis expert. Analyze the provided image and extract song information or recommend songs based on the content.

If the image contains a clear list of songs with titles and artists, extract them in JSON format.
If the image shows a mood, theme, or context (like a party, workout, study, etc.), recommend 10-15 popular and well-known songs for that context.
If the image is unclear or doesn't contain music-related content, recommend 10-15 popular songs from various genres.

Always respond with a valid JSON object in this format:
{
  "songs": [ { "title": "Song Title", "artist": "Artist" } ],
  "playlist_title": "A recommended playlist title for this list of songs"
}

- Always return 10-15 songs in the songs array
- Only include songs where the "title" is a non-empty string
- If the artist is not clear, set "artist" to an empty string
- If it is difficult to recommend a suitable playlist title, set "playlist_title" to an empty string
- Make sure to return real, popular songs that people would actually want to listen to`,
        userPrompt: `Analyze this image and extract song information or recommend songs based on the content.

If the image contains specific song titles and artists, extract them. If it shows a mood, activity, or theme, recommend popular songs that fit that context.

Examples:
- Gym/workout image → recommend energetic, motivational songs
- Party/celebration image → recommend upbeat, danceable songs
- Study/office image → recommend calm, instrumental songs
- Nature/travel image → recommend peaceful, ambient songs

Make sure to return 10-15 popular, well-known songs that people would actually want to listen to.`
      }
    }
  } else {
    // text input
    if (isKorean) {
      return {
        systemPrompt: `당신은 음악 분석 전문가입니다. 제공된 텍스트를 분석하고 곡 정보를 추출하거나 내용에 맞는 곡을 추천합니다.

텍스트에 곡 제목과 아티스트가 명확하게 나열되어 있다면 JSON 형식으로 추출하세요.
텍스트가 분위기, 테마, 맥락(운동할 때 듣는 곡, 파티 음악, 공부 플레이리스트 등)을 설명한다면 해당 맥락에 맞는 인기곡 10-15곡을 추천하세요.
텍스트가 불분명하거나 음악 관련 내용이 없다면 다양한 장르의 인기곡 10-15곡을 추천하세요.

항상 다음 형식의 유효한 JSON 객체로 응답하세요:
{
  "songs": [ { "title": "곡 제목", "artist": "아티스트" } ],
  "playlist_title": "이 곡 목록에 대한 추천 플레이리스트 제목"
}

- 항상 songs 배열에 10-15곡을 반환하세요
- 제목이 비어있지 않은 곡만 포함하세요
- 아티스트가 명확하지 않으면 "artist"를 빈 문자열로 설정하세요
- 적절한 플레이리스트 제목을 추천하기 어려우면 "playlist_title"을 빈 문자열로 설정하세요
- 사람들이 실제로 듣고 싶어할 만한 진짜 인기곡들을 반환하세요
- 한국어 곡과 영어 곡을 모두 고려하세요`,
                 userPrompt: `이 텍스트를 분석하고 곡 정보를 추출하거나 내용에 맞는 곡을 추천하세요.

텍스트에 특정 곡이 언급되어 있다면 추출하세요. 분위기나 활동을 설명한다면 해당 테마에 맞는 인기곡을 추천하세요.

예시:
- "운동할 때 듣는 곡" → 활기찬, 동기부여가 되는 곡 추천
- "파티 음악" → 경쾌하고 춤추기 좋은 곡 추천
- "공부할 때 듣는 곡" → 차분하고 기악곡 추천
- "로드트립" → 클래식하고 따라 부르기 좋은 곡 추천

텍스트: `
      }
    } else if (inputType === 'both') {
      // 이미지와 텍스트 모두 있는 경우
      if (isKorean) {
        return {
          systemPrompt: `당신은 음악 분석 전문가입니다. 제공된 이미지와 텍스트를 모두 분석하고 곡 정보를 추출하거나 내용에 맞는 곡을 추천합니다.

이미지와 텍스트를 모두 고려하여 분석하세요:
- 이미지에 곡 목록이 있다면 추출
- 텍스트에 곡 목록이 있다면 추출
- 이미지의 분위기와 텍스트의 테마를 결합하여 추천
- 텍스트가 이미지의 맥락을 설명하는 경우도 고려

항상 다음 형식의 유효한 JSON 객체로 응답하세요:
{
  "songs": [ { "title": "곡 제목", "artist": "아티스트" } ],
  "playlist_title": "이 곡 목록에 대한 추천 플레이리스트 제목"
}

- 항상 songs 배열에 10-15곡을 반환하세요
- 제목이 비어있지 않은 곡만 포함하세요
- 아티스트가 명확하지 않으면 "artist"를 빈 문자열로 설정하세요
- 적절한 플레이리스트 제목을 추천하기 어려우면 "playlist_title"을 빈 문자열로 설정하세요
- 사람들이 실제로 듣고 싶어할 만한 진짜 인기곡들을 반환하세요
- 한국어 곡과 영어 곡을 모두 고려하세요`,
          userPrompt: `이미지와 텍스트를 모두 분석하고 곡 정보를 추출하거나 내용에 맞는 곡을 추천하세요.

이미지와 텍스트를 모두 고려하여:
- 정확한 곡 목록이 있다면 추출
- 분위기나 테마가 있다면 해당 맥락에 맞는 곡 추천
- 이미지와 텍스트의 정보를 결합하여 더 정확한 추천 제공

텍스트: `
        }
      } else {
        return {
          systemPrompt: `You are a music analysis expert. Analyze both the provided image and text to extract song information or recommend songs based on the content.

Consider both image and text in your analysis:
- Extract song lists from either image or text
- Combine image mood with text themes for recommendations
- Consider text as context for the image when relevant

Always respond with a valid JSON object in this format:
{
  "songs": [ { "title": "Song Title", "artist": "Artist" } ],
  "playlist_title": "A recommended playlist title for this list of songs"
}

- Always return 10-15 songs in the songs array
- Only include songs where the "title" is a non-empty string
- If the artist is not clear, set "artist" to an empty string
- If it is difficult to recommend a suitable playlist title, set "playlist_title" to an empty string
- Make sure to return real, popular songs that people would actually want to listen to`,
          userPrompt: `Analyze both the image and text to extract song information or recommend songs based on the content.

Consider both image and text to:
- Extract song lists from either source
- Combine mood and themes for better recommendations
- Use text as context for image when relevant

Text: `
        }
      }
    } else {
      return {
        systemPrompt: `You are a music analysis expert. Analyze the provided text and extract song information or recommend songs based on the content.

If the text contains a clear list of songs with titles and artists, extract them in JSON format.
If the text describes a mood, theme, or context (like "songs for workout", "party music", "study playlist", etc.), recommend 10-15 popular and well-known songs for that context.
If the text is unclear or doesn't contain music-related content, recommend 10-15 popular songs from various genres.

Always respond with a valid JSON object in this format:
{
  "songs": [ { "title": "Song Title", "artist": "Artist" } ],
  "playlist_title": "A recommended playlist title for this list of songs"
}

- Always return 10-15 songs in the songs array
- Only include songs where the "title" is a non-empty string
- If the artist is not clear, set "artist" to an empty string
- If it is difficult to recommend a suitable playlist title, set "playlist_title" to an empty string
- Make sure to return real, popular songs that people would actually want to listen to`,
        userPrompt: `Analyze this text and extract song information or recommend songs based on the content.

If the text mentions specific songs, extract them. If it describes a mood or activity, recommend popular songs that fit that theme.

Examples:
- "workout music" → recommend energetic, motivational songs
- "party music" → recommend upbeat, danceable songs  
- "study music" → recommend calm, instrumental songs
- "road trip" → recommend classic, sing-along songs

Text:`
      }
    }
  }
}

export async function POST(req: NextRequest) {
  console.log('[API] 곡명 추출 v2 요청 시작')

  try {
    const { text, image, locale = 'en' } = await req.json()
    
    console.log('[API] Received locale from client:', locale)
    
    // getTranslations를 사용하여 번역 가져오기
    const t = await getTranslations({ locale })

    if (!process.env.OPENAI_API_KEY) {
      console.error('[API] OpenAI API 키가 설정되지 않았습니다.')
      return NextResponse.json(
        { error: '서버 설정 오류가 발생했습니다.' },
        { status: 500 },
      )
    }

    // 입력 타입 결정 (이미지와 텍스트 모두 있는 경우 'both'로 처리)
    let inputType: 'image' | 'text' | 'both' = 'text'
    if (image && text.trim()) {
      inputType = 'both'
    } else if (image) {
      inputType = 'image'
    } else if (text.trim()) {
      inputType = 'text'
    } else {
      return NextResponse.json(
        { error: locale === 'ko' ? '이미지나 텍스트를 입력해주세요.' : 'Please enter an image or text.' },
        { status: 400 },
      )
    }

    // locale과 입력 타입에 따른 프롬프트 결정
    const prompts = getPromptsByLocale(locale, inputType, t)
    let systemPrompt = prompts.systemPrompt
    let userPrompt = prompts.userPrompt

    // 텍스트 입력의 경우 userPrompt에 실제 텍스트 추가
    if (inputType === 'text' || inputType === 'both') {
      userPrompt += text
    }

    console.log('[API] OpenAI API 호출 시작', { 
      inputType, 
      textLength: text?.length, 
      locale,
      systemPromptLength: systemPrompt.length,
      userPromptLength: userPrompt.length
    })
    console.log('[API] System Prompt (first 200 chars):', systemPrompt.substring(0, 200))
    console.log('[API] User Prompt (first 200 chars):', userPrompt.substring(0, 200))

    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    // 이미지가 있는 경우 vision 모델 사용
    if ((inputType === 'image' || inputType === 'both') && image) {
      messages[1] = {
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          {
            type: 'image_url',
            image_url: {
              url: image,
              detail: 'high'
            }
          }
        ]
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: (inputType === 'image' || inputType === 'both') ? 'gpt-5-nano' : 'gpt-5-mini',
        messages,
        response_format: { type: 'json_object' },
        // max_completion_tokens: inputType === 'image' ? 2000 : 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[API] OpenAI API 오류:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      })
      throw new Error(`OpenAI API 오류: ${response.status}`)
    }

    const data = (await response.json()) as OpenAIResponse
    console.log('[API] OpenAI API 응답 받음', {
      usage: data.usage,
      finishReason: data.choices[0]?.finish_reason,
    })

    const content = data.choices?.[0]?.message?.content ?? '{}'
    console.log('[API] OpenAI 원본 응답:', content)
    let parsedContent: ExtractSongsContent = {}
    try {
      parsedContent = JSON.parse(content) as ExtractSongsContent
      console.log('[API] JSON 파싱 성공:', parsedContent)
    } catch (error) {
      console.error('[API] JSON 파싱 오류:', { content, error })
      parsedContent = {}
    }

    // songs 필드만 추출, 없으면 빈 배열 반환
    let songs: Song[] = []
    let playlistTitle: string = ''
    if (isSongArray(parsedContent.songs)) {
      songs = parsedContent.songs
      if (typeof parsedContent.playlist_title === 'string') {
        playlistTitle = parsedContent.playlist_title
      }
    } else if (isSongArray(parsedContent.data)) {
      // 혹시 data 필드로 올 경우도 대비
      songs = parsedContent.data
      if (typeof parsedContent.playlist_title === 'string') {
        playlistTitle = parsedContent.playlist_title
      }
    } else if (isSongArray(parsedContent as unknown)) {
      // 혹시 배열만 올 경우
      songs = parsedContent as unknown as Song[]
      // playlist_title은 없음
    }

    return NextResponse.json({ songs, playlist_title: playlistTitle })
  } catch (error) {
    console.error('[API] 처리 중 오류 발생:', error)
    return NextResponse.json(
      { songs: [], error: '서버 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
} 