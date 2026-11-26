
import { NextRequest, NextResponse } from "next/server";

import {
    getSpotifyUserAccessToken,
    setRefreshedSpotifyTokenCookies,
    clearSpotifyTokenCookies,
    fetchSpotifyApi,
} from "@/app/lib/spotifyUserAuth";

export async function POST(request: NextRequest) {
    // ログイン状態を確認
    const auth = await getSpotifyUserAccessToken(request);

    if (!auth.accessToken) {
        const response = NextResponse.json(
            {
                error:
                    auth.error ??
                    "Spotifyにログインしてください。",
            },
            {
                status: auth.status ?? 401,
            }
        );

        if (auth.clearTokens) {
            clearSpotifyTokenCookies(response);
        }

        return response;
    }

    // リクエスト内容を取得
    let body: {
        trackId?: string;
        deviceId?: string;
    };

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "リクエストの形式が正しくありません。" },
            { status: 400 }
        );
    }

    const { trackId, deviceId } = body;

    // SpotifyのTrack IDを検証
    if (
        typeof trackId !== "string" ||
        !/^[A-Za-z0-9]{22}$/.test(trackId)
    ) {
        return NextResponse.json(
            { error: "正しいSpotifyの曲IDを指定してください。" },
            { status: 400 }
        );
    }

    // 再生先のデバイスを検証
    if (
        typeof deviceId !== "string" ||
        deviceId.length === 0 ||
        deviceId.length > 256
    ) {
        return NextResponse.json(
            {
                error:
                    "Spotifyプレイヤーの接続が完了していません。少し待ってから再度お試しください。",
            },
            { status: 400 }
        );
    }

    // Web Playback SDKのデバイスを指定して再生
    const playUrl = new URL(
        "https://api.spotify.com/v1/me/player/play"
    );

    playUrl.searchParams.set("device_id", deviceId);

    let spotifyResponse: Response;

    try {
        spotifyResponse = await fetchSpotifyApi(
            playUrl.toString(),
            {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${auth.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    uris: [`spotify:track:${trackId}`],
                }),
            }
        );
    } catch {
        return NextResponse.json(
            { error: "Spotifyとの通信に失敗しました。" },
            { status: 502 }
        );
    }

    if (!spotifyResponse.ok) {
        const errorData = await spotifyResponse.json().catch(() => ({}));

        let message = "曲を再生できませんでした。";

        if (spotifyResponse.status === 401) {
            message = "Spotifyの認証が切れています。再ログインしてください。";
        } else if (spotifyResponse.status === 403) {
            message = "Spotify Premiumや再生権限を確認してください。";
        } else if (spotifyResponse.status === 404) {
            message = "再生デバイスが見つかりません。プレイヤーを再接続してください。";
        } else if (spotifyResponse.status === 429) {
            message = "Spotifyへのアクセスが集中しています。少し待って再度お試しください。";
        }

        const response = NextResponse.json(
            {
                error: message,
                detail: errorData.error?.message,
            },
            {
                status: spotifyResponse.status,
            }
        );

        if (auth.refreshedTokens) {
            setRefreshedSpotifyTokenCookies(
                response,
                auth.refreshedTokens
            );
        }

        return response;
    }

    // Spotifyの成功レスポンスは204 No Content
    const response = new NextResponse(null, {
        status: 204,
        headers: {
            "Cache-Control": "no-store",
        },
    });

    if (auth.refreshedTokens) {
        setRefreshedSpotifyTokenCookies(
            response,
            auth.refreshedTokens
        );
    }

    return response;
}
