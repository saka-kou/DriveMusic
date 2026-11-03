export async function GET() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    console.log("CLIENT ID exists:", !!clientId);
    console.log("CLIENT SECRET exists:", !!clientSecret);

    const credentials = Buffer.from(
        `${clientId}:${clientSecret}`
    ).toString("base64");

    console.log("Credentials created:", !!credentials);

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

    console.log("Spotify response:", data);

    return Response.json(data);
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