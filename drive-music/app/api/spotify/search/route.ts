export async function GET(request: Request) {
    // URLから検索ワードを取得
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query) {
        return Response.json(
            { error: "検索ワードがありません" },
            { status: 400 }
        );
    }

    // Spotify の認証情報はサーバー専用の環境変数から取得する。
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
        return Response.json(
            {
                error: "Spotify API の認証情報が設定されていません",
                error_description:
                    "プロジェクト直下の .env.local に SPOTIFY_CLIENT_ID と SPOTIFY_CLIENT_SECRET を設定してください。",
            },
            { status: 500 }
        );
    }

    //アクセストークンを取得
    const auth = Buffer.from(
        `${clientId}:${clientSecret}`
    ).toString("base64");

    const tokenResponse = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${auth}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "grant_type=client_credentials",
            cache: "no-store",
        }
    );

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
        return Response.json(tokenData, {
            status: tokenResponse.status,
        });
    }
    // 曲を検索
    const spotifyResponse = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`,
        {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
            cache: "no-store",
        }
    );
    const data = await spotifyResponse.json();
    return Response.json(data, {
        status: spotifyResponse.status,
    });
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
