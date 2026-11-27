type RecommendationRequest = {
    areaName?: unknown;
    areaCategory?: unknown;
    timeOfDay?: unknown;
    weather?: unknown;
    temperature?: unknown;
};

type GeminiResponse = {
    candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
    }>;
    error?: { code?: number; status?: string; message?: string };
};

function isShortText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
}

async function fetchGeminiWithRetry(
    url: string,
    init: RequestInit,
    maxAttempts = 3,
): Promise<Response> {
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            const response = await fetch(url, init);
            if (response.status !== 503 || attempt === maxAttempts) return response;
        } catch (error) {
            if (attempt === maxAttempts) throw error;
        }

        await new Promise((resolve) => setTimeout(resolve, 600 * 2 ** (attempt - 1)));
    }

    throw new Error("Gemini API の再試行に失敗しました。");
}

export async function POST(request: Request) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        return Response.json(
            { error: "Gemini API キーが設定されていません。.env.local に GEMINI_API_KEY を設定してください。" },
            { status: 500 },
        );
    }

    let body: RecommendationRequest;
    try {
        body = (await request.json()) as RecommendationRequest;
    } catch {
        return Response.json({ error: "リクエスト形式が正しくありません。" }, { status: 400 });
    }

    if (
        !isShortText(body.areaName) ||
        !isShortText(body.areaCategory) ||
        !isShortText(body.timeOfDay) ||
        !isShortText(body.weather) ||
        typeof body.temperature !== "number" ||
        !Number.isFinite(body.temperature)
    ) {
        return Response.json({ error: "場所・時間帯・天気の情報が不足しています。" }, { status: 400 });
    }

    const prompt = `${body.areaName}（${body.areaCategory}）・${body.timeOfDay}・${body.weather}・気温${body.temperature}℃のドライブに合う、実在する楽曲を2曲提案してください。`;
    const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.8-flash";

    try {
        const response = await fetchGeminiWithRetry(
            `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": apiKey,
                },
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: "あなたはドライブ向けの音楽キュレーターです。会話文や説明は返さず、楽曲2曲のJSONだけを返してください。",
                            },
                        ],
                    },
                    contents: [{ role: "user", parts: [{ text: prompt }] }],
                    generationConfig: {
                        responseMimeType: "application/json",
                        responseJsonSchema: {
                            type: "object",
                            properties: {
                                songs: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            title: { type: "string" },
                                            artist: { type: "string" },
                                        },
                                        required: ["title", "artist"],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ["songs"],
                            additionalProperties: false,
                        },
                    },
                }),
                cache: "no-store",
            },
        );

        const data = (await response.json()) as GeminiResponse;
        if (!response.ok) {
            const errorMessage =
                response.status === 401 || response.status === 403
                    ? "Gemini API キーを認証できません。Google AI Studio のキー設定を確認してください。"
                    : response.status === 503
                        ? "Gemini API が一時的に混み合っています。少し待ってからもう一度お試しください。"
                        : response.status === 429
                            ? "Gemini API の利用上限に達しました。Google AI Studio の使用量と上限を確認してください。"
                            : data.error?.message ?? "Gemini API で楽曲提案に失敗しました。";
            console.error("Gemini recommendation request failed:", response.status, data.error?.status);
            return Response.json(
                { error: errorMessage, code: data.error?.status },
                { status: response.status },
            );
        }

        const outputText = data.candidates
            ?.flatMap((candidate) => candidate.content?.parts ?? [])
            .find((part) => typeof part.text === "string")?.text;
        if (!outputText) {
            return Response.json({ error: "Gemini の応答を読み取れませんでした。" }, { status: 502 });
        }

        const result: unknown = JSON.parse(outputText);
        if (
            typeof result !== "object" ||
            result === null ||
            !("songs" in result) ||
            !Array.isArray(result.songs) ||
            result.songs.length !== 2 ||
            !result.songs.every(
                (song) =>
                    typeof song === "object" &&
                    song !== null &&
                    "title" in song && typeof song.title === "string" &&
                    "artist" in song && typeof song.artist === "string",
            )
        ) {
            return Response.json({ error: "Gemini の楽曲データが正しい形式ではありません。" }, { status: 502 });
        }

        return Response.json({ songs: result.songs });
    } catch (error) {
        console.error("Gemini recommendation request error:", error);
        return Response.json({ error: "Gemini API に接続できませんでした。" }, { status: 502 });
    }
}
