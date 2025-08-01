import { NextRequest, NextResponse } from "next/server";

// 곡 정보 타입 정의
interface Song {
  title: string;
  artist: string;
}

// OpenAI API 응답 타입 정의
interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// OpenAI 응답에서 content로 파싱되는 JSON 타입
interface ExtractSongsContent {
  songs?: Song[];
  playlist_title?: string;
  data?: Song[]; // 혹시 data로 올 경우
}

function isSongArray(arr: unknown): arr is Song[] {
  return Array.isArray(arr) && arr.every(
    (song) => song && typeof song.title === 'string' && typeof song.artist === 'string'
  );
}

export async function POST(req: NextRequest) {
  console.log("[API] 곡명 추출 요청 시작");
  
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      console.error("[API] 잘못된 입력:", { text });
      return NextResponse.json({ error: "텍스트가 필요합니다." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error("[API] OpenAI API 키가 설정되지 않았습니다.");
      return NextResponse.json(
        { error: "서버 설정 오류가 발생했습니다." },
        { status: 500 }
      );
    }

    console.log("[API] OpenAI API 호출 시작", { textLength: text.length });

    const prompt = `Extract song titles and artists from the text below and return ONLY a JSON object in the following format:
{
  "songs": [ { "title": "Song Title", "artist": "Artist" } ],
  "playlist_title": "A recommended playlist title for this list of songs"
}
- Only include songs where the "title" is a non-empty string (do not include songs with empty or whitespace-only titles).
- If the artist is not clear, set "artist" to an empty string.
- If it is difficult to recommend a suitable playlist title, set "playlist_title" to an empty string.
- The response must be a valid JSON object and nothing else.
Text:
${text}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo-0125",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("[API] OpenAI API 오류:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });
      throw new Error(`OpenAI API 오류: ${response.status}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    console.log("[API] OpenAI API 응답 받음", {
      usage: data.usage,
      finishReason: data.choices[0]?.finish_reason,
    });

    const content = data.choices?.[0]?.message?.content ?? "{}";
    let parsedContent: ExtractSongsContent = {};
    try {
      parsedContent = JSON.parse(content) as ExtractSongsContent;
      console.log("[API] JSON 파싱 성공:", parsedContent);
    } catch (error) {
      console.error("[API] JSON 파싱 오류:", { content, error });
      parsedContent = {};
    }

    // songs 필드만 추출, 없으면 빈 배열 반환
    let songs: Song[] = [];
    let playlistTitle: string = "";
    if (isSongArray(parsedContent.songs)) {
      songs = parsedContent.songs;
      if (typeof parsedContent.playlist_title === 'string') {
        playlistTitle = parsedContent.playlist_title;
      }
    } else if (isSongArray(parsedContent.data)) {
      // 혹시 data 필드로 올 경우도 대비
      songs = parsedContent.data;
      if (typeof parsedContent.playlist_title === 'string') {
        playlistTitle = parsedContent.playlist_title;
      }
    } else if (isSongArray(parsedContent as unknown)) {
      // 혹시 배열만 올 경우
      songs = parsedContent as unknown as Song[];
      // playlist_title은 없음
    }
    // 각 song 객체가 title, artist를 반드시 가지도록 보정
    // songs = songs.filter((song: any): song is Song => song && typeof song.title === 'string' && typeof song.artist === 'string');

    return NextResponse.json({ songs, playlist_title: playlistTitle });
  } catch (error) {
    console.error("[API] 처리 중 오류 발생:", error);
    return NextResponse.json(
      { songs: [], error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
} 