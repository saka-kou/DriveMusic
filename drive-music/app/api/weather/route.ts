type OpenMeteoResponse = {
    current?: {
        temperature_2m?: number;
        weather_code?: number;
    };
};

export async function GET(request: Request) {
    const requestUrl = new URL(request.url);
    const latitudeParam = requestUrl.searchParams.get("latitude");
    const longitudeParam = requestUrl.searchParams.get("longitude");
    const latitude = Number(latitudeParam);
    const longitude = Number(longitudeParam);

    if (
        latitudeParam === null ||
        longitudeParam === null ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return Response.json({ error: "緯度・経度が正しくありません。" }, { status: 400 });
    }

    const params = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        current: "temperature_2m,weather_code",
        temperature_unit: "celsius",
        timezone: "auto",
    });

    try {
        const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?${params.toString()}`,
            { cache: "no-store" },
        );
        if (!response.ok) {
            return Response.json(
                { error: "Open-Meteoから天気を取得できませんでした。" },
                { status: 502 },
            );
        }

        const data = (await response.json()) as OpenMeteoResponse;
        const temperature = data.current?.temperature_2m;
        const weatherCode = data.current?.weather_code;
        if (typeof temperature !== "number" || typeof weatherCode !== "number") {
            return Response.json(
                { error: "Open-Meteoの応答に現在の天気情報がありません。" },
                { status: 502 },
            );
        }

        return Response.json({ temperature, weatherCode });
    } catch {
        return Response.json(
            { error: "天気サービスに接続できませんでした。" },
            { status: 502 },
        );
    }
}
