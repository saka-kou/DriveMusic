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
