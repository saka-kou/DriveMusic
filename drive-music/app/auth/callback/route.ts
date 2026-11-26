
import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "spotify_access_token";
const ACCESS_TOKEN_EXPIRES_COOKIE = "spotify_access_token_expires_at";
const REFRESH_TOKEN_COOKIE = "spotify_refresh_token";
const REFRESH_TOKEN_ISSUED_COOKIE = "spotify_refresh_token_issued_at";
const STATE_COOKIE = "spotify_auth_state";
const RETURN_TO_COOKIE = "spotify_return_to";

function getReturnUrl(request: NextRequest): URL {
    const requested = request.cookies.get(RETURN_TO_COOKIE)?.value ?? "/music";
    try {
        const destination = new URL(requested, request.url);
        if (destination.origin === request.nextUrl.origin && requested.startsWith("/") && !requested.startsWith("//")) {
            return destination;
        }
    } catch {
        // Use the existing music page when the saved path is invalid.
    }
    return new URL("/music", request.url);
}

function getRedirectUri(): string | null {
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    if (!redirectUri) {
        return null;
    }

    try {
        const url = new URL(redirectUri);

        const isHttps = url.protocol === "https:";
        const isLocal =
            url.protocol === "http:" &&
            url.hostname === "127.0.0.1";

        if (!isHttps && !isLocal) {
            return null;
        }

        return url.toString();
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = getRedirectUri();

    const code = request.nextUrl.searchParams.get("code");
    const returnedState = request.nextUrl.searchParams.get("state");
    const spotifyError = request.nextUrl.searchParams.get("error");

    const savedState = request.cookies.get(STATE_COOKIE)?.value;

    const returnUrl = getReturnUrl(request);

    if (spotifyError) {
        returnUrl.searchParams.set("spotify", "cancelled");
        const response = NextResponse.redirect(returnUrl);
        response.cookies.delete(RETURN_TO_COOKIE);
        response.cookies.delete(STATE_COOKIE);
        return response;
    }

    if (!clientId || !clientSecret || !redirectUri) {
        return NextResponse.json(
            { error: "Spotifyの環境変数を確認してください。" },
            { status: 500 }
        );
    }

    if (
        !code ||
        !returnedState ||
        !savedState ||
        returnedState !== savedState
    ) {
        return NextResponse.json(
            { error: "Spotifyの認証情報を確認できませんでした。もう一度ログインしてください。" },
            { status: 400 }
        );
    }

    let tokenResponse: Response;

    try {
        tokenResponse = await fetch(
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
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: redirectUri,
                }),
                cache: "no-store",
            }
        );
    } catch {
        return NextResponse.json(
            { error: "Spotifyへの接続に失敗しました。" },
            { status: 502 }
        );
    }

    const tokenData: Record<string, unknown> =
        await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok) {
        return NextResponse.json(
            {
                error: "Spotifyのトークン取得に失敗しました。",
                detail: tokenData.error_description ?? tokenData.error,
            },
            { status: tokenResponse.status }
        );
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (
        typeof accessToken !== "string" ||
        typeof refreshToken !== "string" ||
        typeof expiresIn !== "number"
    ) {
        return NextResponse.json(
            { error: "Spotifyから正しいトークン情報を取得できませんでした。" },
            { status: 502 }
        );
    }

    const now = Date.now();

    returnUrl.searchParams.set("spotify", "connected");
    const response = NextResponse.redirect(returnUrl);

    const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
    };

    response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        accessToken,
        {
            ...cookieOptions,
            maxAge: expiresIn,
        }
    );

    response.cookies.set(
        ACCESS_TOKEN_EXPIRES_COOKIE,
        String(now + expiresIn * 1000),
        {
            ...cookieOptions,
            maxAge: expiresIn,
        }
    );

    response.cookies.set(
        REFRESH_TOKEN_COOKIE,
        refreshToken,
        {
            ...cookieOptions,
            maxAge: 60 * 60 * 24 * 180,
        }
    );

    response.cookies.set(
        REFRESH_TOKEN_ISSUED_COOKIE,
        String(now),
        {
            ...cookieOptions,
            maxAge: 60 * 60 * 24 * 180,
        }
    );

    // 認証に使ったstateは削除
    response.cookies.delete(STATE_COOKIE);
    response.cookies.delete(RETURN_TO_COOKIE);

    return response;
}
