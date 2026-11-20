type RecommendationRequest = {
    areaName?: unknown;
    areaCategory?: unknown;
    timeOfDay?: unknown;
    weather?: unknown;
    temperature?: unknown;
};

type OpenAIResponse = {
    status?: string;
    output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
    }>;
};

function isShortText(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0 && value.length <= 100;
}

export async function POST(request: Request) {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
        return Response.json(
            { error: "OpenAI API キーが設定されていません。プロジェクト直下の .env.local を確認してください。" },
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

    const prompt = `${body.areaName}（${body.areaCategory}）・${body.timeOfDay}・${body.weather}・気温${body.temperature}℃のドライブに合う楽曲を5曲提案してください。`;

    try {
        const response = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: process.env.OPENAI_MODEL || "gpt-6-luna",
                store: false,
                input: [
                    {
                        role: "system",
                        content: "あなたはドライブ向けの音楽キュレーターです。実在する楽曲を選び、日本語で簡潔に回答してください。ユーザーに会話文は返さず、指定されたJSONだけを返してください。",
                    },
                    { role: "user", content: prompt },
                ],
                text: {
                    format: {
                        type: "json_schema",
                        name: "music_recommendations",
                        strict: true,
                        schema: {
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
                },
            }),
            cache: "no-store",
        });

        const data = (await response.json()) as OpenAIResponse & {
            error?: { message?: string };
        };
        if (!response.ok) {
            console.error("OpenAI recommendation request failed:", response.status, data.error?.message);
            return Response.json(
                { error: "楽曲の提案を取得できませんでした。OpenAI API の設定を確認してください。" },
                { status: response.status === 401 ? 502 : response.status },
            );
        }

        if (data.status !== "completed") {
            return Response.json({ error: "楽曲の提案が完了しませんでした。もう一度お試しください。" }, { status: 502 });
        }

        const outputText = data.output
            ?.flatMap((item) => item.content ?? [])
            .find((item) => item.type === "output_text")?.text;
        if (!outputText) {
            return Response.json({ error: "AIの応答を読み取れませんでした。" }, { status: 502 });
        }

        const result: unknown = JSON.parse(outputText);
        if (
            typeof result !== "object" ||
            result === null ||
            !("songs" in result) ||
            !Array.isArray(result.songs) ||
            result.songs.length !== 5 ||
            !result.songs.every(
                (song) =>
                    typeof song === "object" &&
                    song !== null &&
                    "title" in song && typeof song.title === "string" &&
                    "artist" in song && typeof song.artist === "string",
            )
        ) {
            return Response.json({ error: "AIの楽曲データが正しい形式ではありません。" }, { status: 502 });
        }

        return Response.json({ songs: result.songs });
    } catch (error) {
        console.error("OpenAI recommendation request error:", error);
        return Response.json({ error: "OpenAI API に接続できませんでした。" }, { status: 502 });
    }
}
