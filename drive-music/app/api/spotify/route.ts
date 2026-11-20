export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID?.trim();
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
        return Response.json(
            { error: "Spotify API credentials are not configured" },
            { status: 500 }
        );
    }

    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

    const response = await fetch(
        "https://accounts.spotify.com/api/token",
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
            }),
        }
    );

    const data = await response.json();

    // アクセストークンや認証レスポンスをクライアントへ返さない。
    return Response.json(
        response.ok
            ? { ok: true, expires_in: data.expires_in }
            : { error: data.error, error_description: data.error_description },
        { status: response.status }
    );
}

// import { NextResponse } from "next/server";

// export async function GET() {
//     const clientId = process.env.SPOTIFY_CLIENT_ID;
//     const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
//     // console.log("CLIENT ID:", clientId);
//     // console.log("CLIENT SECRET:", clientSecret);

//     const credentials = Buffer.from(
//         `${clientId};${clientSecret}`
//     ).toString("base64");

//     const response = await fetch(
//         "https://accounts.spotify.com/api/token",
//         {
//             method: "POST",
//             headers: {
//                 Authorization: `Basic ${credentials}`,
//                 "Content-Type": "application/x-www-form-urlencoded",
//             },
//             body: new URLSearchParams({
//                 grant_type: "client_credentials",
//             }),
//         }
//     );

//     const data = await response.json();

//     return NextResponse.json(data);
// }
