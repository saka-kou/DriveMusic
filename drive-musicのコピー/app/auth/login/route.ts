
import { NextRequest, NextResponse } from "next/server";

const REQUIRED_SCOPES = [
    "streaming",
    "user-read-private",
    "user-read-email",
    "user-modify-playback-state",
];

function getValidRedirectUri(): string | null {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!redirectUri) {
        return null;
    }

    try {
        const url = new URL(redirectUri);

        const isHttps = url.protocol === "https:";
        const isLocalDevelopment =
            url.protocol === "http:" &&
            url.hostname === "127.0.0.1";

        if (
            !isHttps &&
            !isLocalDevelopment
        ) {
            return null;
        }

        if (
            url.username ||
            url.password ||
            url.hostname.includes("*")
        ) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = getValidRedirectUri();

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            {
                error:
                    "Spotifyの環境変数、またはリダイレクトURIの設定を確認してください。",
            },
            { status: 500 }
        );
    }

    // CSRF対策用のランダムなstateを作成
    const state = crypto.randomUUID();

    const authorizeUrl = new URL(
        "https://accounts.spotify.com/authorize"
    );

    authorizeUrl.searchParams.set(
        "client_id",
        clientId
    );

    authorizeUrl.searchParams.set(
        "response_type",
        "code"
    );

    authorizeUrl.searchParams.set(
        "redirect_uri",
        redirectUri
    );

    authorizeUrl.searchParams.set(
        "scope",
        REQUIRED_SCOPES.join(" ")
    );

    authorizeUrl.searchParams.set(
        "state",
        state
    );

    const response = NextResponse.redirect(authorizeUrl);

    // コールバックでstateを照合するためのCookie
    response.cookies.set("spotify_auth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
    });

    return response;
}

// ログインURL http://127.0.0.1:3000/auth/login
// アプリのページURL http://127.0.0.1:3000
