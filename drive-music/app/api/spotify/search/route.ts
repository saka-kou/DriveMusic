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

    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

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

export async function POST(request: Request) {
    let queries: unknown;
    try {
        ({ queries } = (await request.json()) as { queries?: unknown });
    } catch {
        return Response.json({ error: "検索リクエストの形式が正しくありません。" }, { status: 400 });
    }

    if (
        !Array.isArray(queries) ||
        queries.length !== 2 ||
        !queries.every((query) => typeof query === "string" && query.trim().length > 0 && query.length <= 200)
    ) {
        return Response.json({ error: "検索する曲の情報が正しくありません。" }, { status: 400 });
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) {
        return Response.json(
            { error: "Spotify API の認証情報が未設定です。.env.local の設定を確認してください。" },
            { status: 500 },
        );
    }

    try {
        const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
        const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
            cache: "no-store",
        });
        const tokenData = (await tokenResponse.json()) as {
            access_token?: string;
            error_description?: string;
        };
        if (!tokenResponse.ok || !tokenData.access_token) {
            return Response.json(
                { error: tokenData.error_description ?? "Spotify の認証に失敗しました。" },
                { status: 502 },
            );
        }

        const results = await Promise.all(
            queries.map(async (query) => {
                const response = await fetch(
                    `https://api.spotify.com/v1/search?q=${encodeURIComponent(query.trim())}&type=track&limit=10`,
                    {
                        headers: { Authorization: `Bearer ${tokenData.access_token}` },
                        cache: "no-store",
                    },
                );
                if (!response.ok) throw new Error("Spotify の曲検索に失敗しました。");
                return response.json();
            }),
        );

        return Response.json({ results });
    } catch (error) {
        console.error("Spotify batch search failed:", error);
        return Response.json({ error: "Spotify の曲検索に接続できませんでした。" }, { status: 502 });
    }
}
