import { NextRequest, NextResponse } from "next/server";
export async function GET(request: NextRequest) {
    // ① CookieからAccess Tokenを取り出す
    const accessToken = request.cookies.get("spotify_access_token")?.value;

    // ② Tokenが存在しない場合は処理を止める
    if (!accessToken) {
        return NextResponse.json(
            { error: "Access Tokenがありません。Spotifyにログインしてください。" },
            { status: 401 }
        );
    }
    const spotifyResponse = await fetch("https://api.spotify.com/v1/me", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const userData = await spotifyResponse.json();
    if (!spotifyResponse.ok) {
        return NextResponse.json(
            { error: "Spotifyからユーザー情報を取得できませんでした", detail: userData },
            { status: spotifyResponse.status }
        );
    }
    return NextResponse.json(userData);
}