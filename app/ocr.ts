// OCR 및 곡명 추출

export interface SongInfo {
  title: string;
  artist: string;
}

export interface APIResponse {
  songs?: SongInfo[];
  error?: string;
}

export async function extractSongTitlesFromImage(image: File): Promise<SongInfo[]> {
  // TODO: OCR 또는 OpenAI API로 곡명 추출 구현
  return [
    { title: "Song Title 1", artist: "Artist 1" },
    { title: "Song Title 2", artist: "Artist 2" }
  ];
}

export async function extractSongTitlesFromText(text: string): Promise<SongInfo[]> {
  console.log("[Client] 곡명 추출 요청 시작", { textLength: text.length });

  try {
    const res = await fetch("/api/extract-songs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      const errorData = await res.json() as APIResponse;
      console.error("[Client] API 요청 실패:", {
        status: res.status,
        statusText: res.statusText,
        error: errorData.error,
      });
      throw new Error(errorData.error || "API 요청이 실패했습니다.");
    }

    const data = await res.json() as APIResponse;
    
    if (!data.songs) {
      console.error("[Client] 잘못된 API 응답:", data);
      throw new Error("API 응답 형식이 잘못되었습니다.");
    }

    console.log("[Client] 곡명 추출 성공:", { 
      songCount: data.songs.length,
      songs: data.songs 
    });

    return data.songs;
  } catch (error) {
    console.error("[Client] 곡명 추출 오류:", error);
    throw error;
  }
} 