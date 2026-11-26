import { NextRequest, NextResponse } from "next/server";
import { fetchSpotifyApi } from "@/app/lib/spotifyUserAuth";

export async function GET(request: NextRequest) {
    const query = new URL(request.url).searchParams.get("q")?.trim();

    if (!query) {
        return NextResponse.json(
            { error: "検索ワードを入力してください。" },
            { status: 400 }
        );
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return NextResponse.json(
            { error: "SpotifyのAPI認証情報が設定されていません。" },
            { status: 500 }
        );
    }

    try {
        // Public catalog search: Client Credentials is appropriate here.
        const credentials = Buffer.from(
            `${clientId}:${clientSecret}`
        ).toString("base64");

        const tokenResponse = await fetchSpotifyApi(
            "https://accounts.spotify.com/api/token",
            {
                method: "POST",
                headers: {
                    Authorization: `Basic ${credentials}`,
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({ grant_type: "client_credentials" }),
            }
        );
        const tokenData = await tokenResponse.json().catch(() => ({}));

        if (!tokenResponse.ok || typeof tokenData.access_token !== "string") {
            const response = NextResponse.json(
                {
                    error:
                        tokenData.error_description ??
                        tokenData.error ??
                        "Spotifyの検索用トークンを取得できませんでした。",
                },
                { status: tokenResponse.status || 502 }
            );
            const retryAfter = tokenResponse.headers.get("Retry-After");
            if (retryAfter) response.headers.set("Retry-After", retryAfter);
            return response;
        }

        const searchUrl = new URL("https://api.spotify.com/v1/search");
        searchUrl.searchParams.set("q", query);
        searchUrl.searchParams.set("type", "track");
        searchUrl.searchParams.set("limit", "10");

        const spotifyResponse = await fetchSpotifyApi(searchUrl.toString(), {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });
        const data = await spotifyResponse.json().catch(() => ({}));
        const response = NextResponse.json(
            spotifyResponse.ok
                ? data
                : {
                      error:
                          data.error?.message ??
                          "Spotifyで楽曲を検索できませんでした。",
                      detail: data,
                  },
            { status: spotifyResponse.status }
        );

        const retryAfter = spotifyResponse.headers.get("Retry-After");
        if (retryAfter) response.headers.set("Retry-After", retryAfter);
        return response;
    } catch {
        return NextResponse.json(
            { error: "Spotifyへの接続に失敗しました。時間をおいて再度お試しください。" },
            { status: 502 }
        );
    }
}
