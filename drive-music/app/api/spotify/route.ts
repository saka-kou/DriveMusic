
import { NextRequest, NextResponse } from "next/server";
import { fetchSpotifyApi } from "@/app/lib/spotifyUserAuth";

export async function GET(request: NextRequest) {
    const query = request.nextUrl.searchParams.get("q")?.trim();

    if (!query) {
        return NextResponse.json(
            { error: "検索する曲名やアーティスト名を入力してください。" },
            { status: 400 }
        );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.json(
            { error: "Spotifyの環境変数が設定されていません。" },
            { status: 500 }
        );
    }

    try {
        // Client Credentials Flowで公開カタログ検索用トークンを取得
        const tokenResponse = await fetchSpotifyApi(
            "https://accounts.spotify.com/api/token",
            {
                method: "POST",
                headers: {
                    Authorization:
                        "Basic " +
                        Buffer.from(
                            `${clientId}:${clientSecret}`
                        ).toString("base64"),
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                    grant_type: "client_credentials",
                }),
            }
        );

        if (!tokenResponse.ok) {
            return NextResponse.json(
                { error: "Spotifyの検索用認証に失敗しました。" },
                { status: tokenResponse.status }
            );
        }

        const tokenData = await tokenResponse.json();

        if (typeof tokenData.access_token !== "string") {
            return NextResponse.json(
                { error: "検索用アクセストークンを取得できませんでした。" },
                { status: 502 }
            );
        }

        // Spotifyの検索API
        const searchUrl = new URL(
            "https://api.spotify.com/v1/search"
        );

        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("type", "track");
        searchUrl.searchParams.set("limit", "10");
        searchUrl.searchParams.set("market", "JP");

        const searchResponse = await fetchSpotifyApi(
            searchUrl.toString(),
            {
                headers: {
                    Authorization: `Bearer ${tokenData.access_token}`,
                },
            }
        );

        const searchData = await searchResponse.json().catch(() => ({}));

        if (!searchResponse.ok) {
            return NextResponse.json(
                {
                    error: "Spotifyの曲検索に失敗しました。",
                    detail: searchData.error?.message,
                },
                { status: searchResponse.status }
            );
        }

        return NextResponse.json(searchData, {
            headers: {
                "Cache-Control": "no-store",
            },
        });
    } catch {
        return NextResponse.json(
            { error: "Spotifyとの通信に失敗しました。" },
            { status: 502 }
        );
    }
}
