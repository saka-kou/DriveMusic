"use client";

import { useEffect, useState } from "react";
import { getTimeOfDay } from "../context/getTimeOfDay";


type Coordinates = {
    latitude: number;
    longitude: number;
};

type Weather = {
    temperature: number;
    weatherCode: number;
};

function describeWeather(code: number): string {
    if (code === 0) return "快晴";
    if (code === 1) return "晴れ";
    if (code === 2) return "一部くもり";
    if (code === 3) return "くもり";
    if ([45, 48].includes(code)) return "霧";
    if ([51, 53, 55, 56, 57].includes(code)) return "霧雨";
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "雨";
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "雪";
    if ([95, 96, 99].includes(code)) return "雷雨";
    return "不明";
}

type WeatherApiResponse = {
    temperature?: number;
    weatherCode?: number;
    error?: string;
};

export default function LocationButton() {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [message, setMessage] = useState("");
    const [weather, setWeather] = useState<Weather | null>(null);
    const [weatherMessage, setWeatherMessage] = useState("");

    async function getWeather(location: Coordinates) {
        const params = new URLSearchParams({
            latitude: String(location.latitude),
            longitude: String(location.longitude),
        });

        setWeather(null);
        setWeatherMessage("現在の天気を取得しています…");

        try {
            const response = await fetch(
                `/api/weather?${params.toString()}`,
            );
            const data = (await response.json()) as WeatherApiResponse;
            if (!response.ok) {
                throw new Error(data.error ?? "天気APIへの接続に失敗しました。");
            }

            const temperature = data.temperature;
            const weatherCode = data.weatherCode;
            if (typeof temperature !== "number" || typeof weatherCode !== "number") {
                throw new Error("天気データを読み取れませんでした。");
            }

            setWeather({ temperature, weatherCode });
            setWeatherMessage("");
        } catch (error) {
            setWeather(null);
            setWeatherMessage(
                error instanceof Error
                    ? error.message
                    : "天気を取得できませんでした。通信状況を確認してください。",
            );
        }
    }


    function getCurrentLocation() {
        if (!navigator.geolocation) {
            setMessage("このブラウザーでは位置情報を利用できません。");
            return;
        }

        setMessage("現在地を取得しています…");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                };
                setCoordinates(location);
                setMessage("");
                void getWeather(location);
            },
            (error) => {
                setCoordinates(null);
                setWeather(null);
                setWeatherMessage("");

                if (error.code === error.PERMISSION_DENIED) {
                    setMessage("位置情報の利用が許可されませんでした。");
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    setMessage("現在地を確認できませんでした。");
                } else if (error.code === error.TIMEOUT) {
                    setMessage("位置情報の取得がタイムアウトしました。");
                } else {
                    setMessage("位置情報の取得中にエラーが発生しました。");
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10_000,
                maximumAge: 0,
            },
        );
    }

    // プリレンダリング中に現在時刻を評価しないよう、マウント後に取得する
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    useEffect(() => {
        setCurrentTime(new Date());
    }, []);
    const timeOfDay = currentTime ? getTimeOfDay(currentTime) : "";

    return (
        <>
            <section>
                <button type="button" onClick={getCurrentLocation}>
                    現在地を取得ボタン
                </button>

                <p role="status">{message}</p>

                {coordinates && (
                    <p>
                        緯度: {coordinates.latitude}
                        <br />
                        経度: {coordinates.longitude}
                    </p>
                )}

                {weatherMessage && <p role="status">{weatherMessage}</p>}
                {weather && (
                    <section aria-label="現在の天気">
                        <h2>現在の天気</h2>
                        <p>気温: {weather.temperature}°C</p>
                        <p>天気: {describeWeather(weather.weatherCode)}</p>
                    </section>
                )}
            </section>


            {currentTime && (
                <p>
                    時間帯: {timeOfDay}
                </p>
            )}
        </>
    );
}
