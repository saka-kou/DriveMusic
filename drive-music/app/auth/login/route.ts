import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const RETURN_TO_COOKIE = "spotify_return_to";

function getSafeReturnTo(request: NextRequest): string {
    const requested = request.nextUrl.searchParams.get("returnTo");
    if (!requested || !requested.startsWith("/") || requested.startsWith("//") || requested.includes("\\")) {
        return "/music";
    }

    try {
        const destination = new URL(requested, request.nextUrl.origin);
        return destination.origin === request.nextUrl.origin
            ? `${destination.pathname}${destination.search}`
            : "/music";
    } catch {
        return "/music";
    }
}

function isAllowedRedirectUri(value: string): boolean {
    try {
        const uri = new URL(value);
        const isLocalDevelopment =
            uri.protocol === "http:" && uri.hostname === "127.0.0.1";
        const isHttps = uri.protocol === "https:";

        return (isLocalDevelopment || isHttps) &&
            !uri.username &&
            !uri.password &&
            !uri.hostname.includes("*");
    } catch {
        return false;
    }
}

export async function GET(request: NextRequest) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!clientId || !redirectUri) {
        return NextResponse.json(
            { error: "Spotifyの環境変数が設定されていません。" },
            { status: 500 }
        );
    }

    if (!isAllowedRedirectUri(redirectUri)) {
        return NextResponse.json(
            {
                error:
                    "Redirect URIはHTTPS、またはローカル開発用のhttp://127.0.0.1を指定してください。localhostは使用できません。",
            },
            { status: 500 }
        );
    }

    const state = randomBytes(32).toString("hex");

    // Only request scopes required by the current profile and playback features.
    // user-read-playback-state is omitted because the current app does not read it.
    const scopes = [
        "streaming",
        "user-read-private",
        "user-read-email",
        "user-modify-playback-state",
    ];

    const params = new URLSearchParams({
        client_id: clientId,
        response_type: "code",
        redirect_uri: redirectUri,
        scope: scopes.join(" "),
        state,
    });

    const response = NextResponse.redirect(
        `https://accounts.spotify.com/authorize?${params.toString()}`
    );

    response.cookies.set("spotify_auth_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
    });

    response.cookies.set(RETURN_TO_COOKIE, getSafeReturnTo(request), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 10 * 60,
    });

    return response;
}
