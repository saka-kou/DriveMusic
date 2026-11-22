
import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Spotifyの環境変数が設定されていません" },
            { status: 500 }
        );
    }

    // 認証確認用state生成
    const state = randomBytes(16).toString("hex");

    // Spotifyに許可してもらいたい権限
    const scopes = [
        "streaming",
        "user-read-private",
        "user-read-email",
        "user-read-playback-state",
        "user-modify-playback-state"
    ];

    // SpotifyのログインURLを生成
    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes.join(" "),
        state,
    });

    const url = `https://accounts.spotify.com/authorize?${params.toString()}`;

    // Spotifyのログイン画面へ移動
    const response = NextResponse.redirect(url);

    // StateをCookieに保存してcallback時に照合
    response.cookies.set("spotify_auth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
    });

    return response;
}
// ログインURL http://127.0.0.1:3000/auth/login
// アプリのページURL http://127.0.0.1:3000
