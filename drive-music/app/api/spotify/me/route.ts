
import { NextRequest, NextResponse } from "next/server";
import {
    getSpotifyUserAccessToken,
    setRefreshedSpotifyTokenCookies,
    clearSpotifyTokenCookies,
} from "@/app/lib/spotifyUserAuth";

export async function GET(request: NextRequest) {
    const auth = await getSpotifyUserAccessToken(request);

    if (!auth.accessToken) {
        const response = NextResponse.json(
            { error: auth.error ?? "Spotifyにログインしてください。" },
            { status: auth.status ?? 401 }
        );

        if (auth.clearTokens) {
            clearSpotifyTokenCookies(response);
        }

        return response;
    }

    let spotifyResponse: Response;

    try {
        spotifyResponse = await fetch(
            "https://api.spotify.com/v1/me",
            {
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                },
                cache: "no-store",
            }
        );
    } catch {
        return NextResponse.json(
            { error: "Spotifyへの接続に失敗しました。" },
            { status: 502 }
        );
    }

    if (!spotifyResponse.ok) {
        return NextResponse.json(
            {
                error: "Spotifyのユーザー情報を取得できませんでした。",
            },
            { status: spotifyResponse.status }
        );
    }

    const user = await spotifyResponse.json();

    const response = NextResponse.json({
        id: user.id,
        display_name: user.display_name,
        email: user.email,
        images: user.images,
        product: user.product,
    });

    if (auth.refreshedTokens) {
        setRefreshedSpotifyTokenCookies(
            response,
            auth.refreshedTokens
        );
    }

    return response;
}
