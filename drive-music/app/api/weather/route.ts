type OpenMeteoResponse = {
    current?: {
        temperature_2m?: unknown;
        weather_code?: unknown;
    };
};

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const latitudeText = params.get("latitude");
    const longitudeText = params.get("longitude");
    const latitude = Number(latitudeText);
    const longitude = Number(longitudeText);

    if (
        latitudeText === null || longitudeText === null ||
        !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) {
        return Response.json({ error: "緯度・経度が正しくありません。" }, { status: 400 });
    }

    const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
    weatherUrl.searchParams.set("latitude", String(latitude));
    weatherUrl.searchParams.set("longitude", String(longitude));
    weatherUrl.searchParams.set("current", "temperature_2m,weather_code");

    try {
        const response = await fetch(weatherUrl, { cache: "no-store" });
        const data = (await response.json()) as OpenMeteoResponse & { reason?: string };
        const temperature = data.current?.temperature_2m;
        const weatherCode = data.current?.weather_code;

        if (!response.ok) {
            console.error("Weather API request failed:", response.status, data.reason);
            return Response.json({ error: "天気情報を取得できませんでした。" }, { status: 502 });
        }
        if (
            typeof temperature !== "number" || !Number.isFinite(temperature) ||
            typeof weatherCode !== "number" || !Number.isFinite(weatherCode)
        ) {
            return Response.json({ error: "天気データを読み取れませんでした。" }, { status: 502 });
        }

        return Response.json({ temperature, weatherCode });
    } catch (error) {
        console.error("Weather API connection failed:", error);
        return Response.json({ error: "天気APIに接続できませんでした。" }, { status: 502 });
    }
}
