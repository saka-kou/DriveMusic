
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

    // SDKに必要なアクセストークンだけを返す。
    // Client SecretとRefresh Tokenはブラウザへ渡さない。
    const response = NextResponse.json(
        {
            access_token: auth.accessToken,
        },
        {
            headers: {
                "Cache-Control": "no-store",
            },
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
