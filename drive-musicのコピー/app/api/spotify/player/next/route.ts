import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    // ① CookieからAccess Tokenを取り出す
    const accessToken = request.cookies.get("spotify_access_token")?.value;

    // ② Tokenが存在しない場合は処理を止める
    if (!accessToken) {
        return NextResponse.json(
            { error: "Access Tokenがありません。Spotifyにログインしてください。" },
            { status: 401 }
        );
    }

    // ③ Spotifyに次の曲へ進むリクエストを送る
    const spotifyResponse = await fetch(
        "https://api.spotify.com/v1/me/player/next",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    // ④ Spotify側でエラーが発生した場合
    if (!spotifyResponse.ok) {
        const errorData = await spotifyResponse.json().catch(() => null);

        return NextResponse.json(
            {
                error: "次の曲に進めませんでした",
                detail: errorData,
            },
            { status: spotifyResponse.status }
        );
    }

    // ⑤ 成功した場合
    return NextResponse.json({ message: "次の曲に進みました！" });
}


//POST https://api.spotify.com/v1/me/player/next
