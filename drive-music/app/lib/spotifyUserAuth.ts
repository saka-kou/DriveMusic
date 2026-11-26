
import { NextRequest, NextResponse } from "next/server";

const ACCESS_TOKEN_COOKIE = "spotify_access_token";
const ACCESS_TOKEN_EXPIRES_COOKIE = "spotify_access_token_expires_at";
const REFRESH_TOKEN_COOKIE = "spotify_refresh_token";
const REFRESH_TOKEN_ISSUED_COOKIE = "spotify_refresh_token_issued_at";

const REFRESH_TOKEN_LIFETIME_SECONDS = 60 * 60 * 24 * 180;
const ACCESS_TOKEN_REFRESH_BUFFER_MS = 60 * 1000;

export type RefreshedSpotifyTokens = {
    accessToken: string;
    expiresIn: number;
    refreshToken?: string;
    refreshTokenMaxAge?: number;
};

export type SpotifyAuthResult = {
    accessToken: string | null;
    refreshedTokens?: RefreshedSpotifyTokens;
    error?: string;
    status?: number;
    clearTokens?: boolean;
};

/**
 * 有効なアクセストークンを取得する。
 * 期限が近い場合はリフレッシュトークンで更新する。
 */
export async function getSpotifyUserAccessToken(
    request: NextRequest
): Promise<SpotifyAuthResult> {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;

    const expiresAt = Number(
        request.cookies.get(ACCESS_TOKEN_EXPIRES_COOKIE)?.value ?? 0
    );

    // アクセストークンがまだ有効ならそのまま使う
    if (
        accessToken &&
        expiresAt > Date.now() + ACCESS_TOKEN_REFRESH_BUFFER_MS
    ) {
        return { accessToken };
    }

    const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value;

    const issuedAt = Number(
        request.cookies.get(REFRESH_TOKEN_ISSUED_COOKIE)?.value ?? 0
    );

    if (!refreshToken || !Number.isFinite(issuedAt) || issuedAt <= 0) {
        return {
            accessToken: null,
            error: "Spotifyのログイン期限が切れました。もう一度ログインしてください。",
            status: 401,
            clearTokens: true,
        };
    }

    // リフレッシュトークンの残り有効期間を計算
    const refreshTokenMaxAge = Math.floor(
        (
            issuedAt +
            REFRESH_TOKEN_LIFETIME_SECONDS * 1000 -
            Date.now()
        ) / 1000
    );

    if (refreshTokenMaxAge <= 0) {
        return {
            accessToken: null,
            error: "Spotifyの再認証期限が切れました。もう一度ログインしてください。",
            status: 401,
            clearTokens: true,
        };
    }

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return {
            accessToken: null,
            error: "Spotifyの認証用環境変数が設定されていません。",
            status: 500,
        };
    }

    let tokenResponse: Response;
    let tokenData: Record<string, unknown>;

    try {
        tokenResponse = await fetchSpotifyApi(
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
                    grant_type: "refresh_token",
                    refresh_token: refreshToken,
                }),
                cache: "no-store",
            }
        );

        tokenData = await tokenResponse.json().catch(() => ({}));
    } catch {
        return {
            accessToken: null,
            error: "Spotifyへの接続に失敗しました。時間をおいて再度お試しください。",
            status: 502,
        };
    }

    if (!tokenResponse.ok) {
        const oauthError = tokenData.error;
        const invalidGrant = oauthError === "invalid_grant";

        return {
            accessToken: null,
            error: invalidGrant
                ? "Spotifyの再認証期限が切れたか、認証が無効になりました。もう一度ログインしてください。"
                : `Spotifyのトークン更新に失敗しました（${String(
                    oauthError ?? tokenResponse.status
                )}）。`,
            status: invalidGrant ? 401 : tokenResponse.status,
            clearTokens: invalidGrant,
        };
    }

    const newAccessToken = tokenData.access_token;
    const expiresIn = tokenData.expires_in;

    if (
        typeof newAccessToken !== "string" ||
        typeof expiresIn !== "number"
    ) {
        return {
            accessToken: null,
            error: "Spotifyから正しいトークン情報を受け取れませんでした。",
            status: 502,
        };
    }

    const rotatedRefreshToken = tokenData.refresh_token;

    return {
        accessToken: newAccessToken,
        refreshedTokens: {
            accessToken: newAccessToken,
            expiresIn,
            ...(typeof rotatedRefreshToken === "string"
                ? {
                    refreshToken: rotatedRefreshToken,
                    refreshTokenMaxAge,
                }
                : {}),
        },
    };
}

/**
 * 更新したトークンをCookieに保存する。
 */
export function setRefreshedSpotifyTokenCookies(
    response: NextResponse,
    tokens: RefreshedSpotifyTokens
): void {
    const commonOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        path: "/",
    };

    response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        tokens.accessToken,
        {
            ...commonOptions,
            maxAge: tokens.expiresIn,
        }
    );

    response.cookies.set(
        ACCESS_TOKEN_EXPIRES_COOKIE,
        String(Date.now() + tokens.expiresIn * 1000),
        {
            ...commonOptions,
            maxAge: tokens.expiresIn,
        }
    );

    // Spotifyから新しいリフレッシュトークンが返された場合のみ更新
    if (tokens.refreshToken && tokens.refreshTokenMaxAge) {
        response.cookies.set(
            REFRESH_TOKEN_COOKIE,
            tokens.refreshToken,
            {
                ...commonOptions,
                maxAge: tokens.refreshTokenMaxAge,
            }
        );
    }
}

/**
 * 保存されているSpotifyのトークンを削除する。
 */
export function clearSpotifyTokenCookies(
    response: NextResponse
): void {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(ACCESS_TOKEN_EXPIRES_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_ISSUED_COOKIE);
}

/**
 * Spotify APIの429エラーに対応する。
 * Retry-Afterを優先し、指数バックオフで再試行する。
 */
export async function fetchSpotifyApi(
    url: string,
    init: RequestInit,
    maxRetries = 3
): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        const response = await fetch(url, {
            ...init,
            cache: "no-store",
        });

        if (response.status !== 429 || attempt === maxRetries) {
            return response;
        }

        const retryAfter = response.headers.get("Retry-After");

        const retryAfterSeconds = retryAfter
            ? Number(retryAfter)
            : Number.NaN;

        const exponentialDelaySeconds = 2 ** attempt;

        const delaySeconds = Number.isFinite(retryAfterSeconds)
            ? Math.max(
                retryAfterSeconds,
                exponentialDelaySeconds
            )
            : exponentialDelaySeconds;

        // 長い待機が必要な場合は429を返し、無理に再試行しない
        if (delaySeconds > 15) {
            return response;
        }

        await new Promise((resolve) =>
            setTimeout(resolve, delaySeconds * 1000)
        );
    }

    throw new Error("Spotify API request retry limit reached.");
}
