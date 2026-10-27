"use client";

import { useState } from "react";

type Coordinates = {
    latitude: number;
    longitude: number;
};

export default function LocationButton() {
    const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
    const [message, setMessage] = useState("");

    function getCurrentLocation() {
        if (!navigator.geolocation) {
            setMessage("このブラウザーでは位置情報を利用できません。");
            return;
        }

        setMessage("現在地を取得しています…");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setCoordinates({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
                setMessage("現在地を取得しました。");
            },
            (error) => {
                setCoordinates(null);

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

    return (
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
        </section>
    );
}