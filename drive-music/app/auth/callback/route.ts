import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    const cookieState = request.cookies.get("spotify_auth_state")?.value;

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    // Spotifyから認証エラーが返された場合
    if (error) {
        return NextResponse.json(
            { error: "Spotifyの認証が拒否されました", detail: error },
            { status: 400 }
        );
    }

    // 必要な情報が揃っているか確認
    if (!code || !state || !cookieState) {
        return NextResponse.json(
            { error: "認証情報が不足しています" },
            { status: 400 }
        );
    }

    // Stateを照合
    if (state !== cookieState) {
        return NextResponse.json(
            { error: "stateが一致しません" },
            { status: 400 }
        );
    }

    // 環境変数の確認
    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json(
            { error: "Spotifyの環境変数が設定されていません" },
            { status: 500 }
        );
    }

    // Spotifyに認証コードを送信してTokenを取得
    const tokenResponse = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                Authorization:
                    "Basic " +
                    Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code,
                redirect_uri: redirectUri,
            }),
        }
    );

    const tokenData = await tokenResponse.json();

    // Tokenの取得に失敗した場合
    if (!tokenResponse.ok) {
        return NextResponse.json(
            {
                error: "Tokenの取得に失敗しました",
                detail: tokenData,
            },
            { status: tokenResponse.status }
        );
    }

    // 成功したらCookieに保存
    const response = NextResponse.json({
        message: "Spotify認証・Token取得成功！",
        accessToken: "保存成功",
        refreshToken: tokenData.refresh_token ? "保存成功" : "今回返却なし",
        expiresIn: tokenData.expires_in,
    });

    response.cookies.set("spotify_access_token", tokenData.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: tokenData.expires_in,
    });

    if (tokenData.refresh_token) {
        response.cookies.set("spotify_refresh_token", tokenData.refresh_token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
        });
    }

    // 使用済みstateを削除
    response.cookies.delete("spotify_auth_state");

    return response;
}