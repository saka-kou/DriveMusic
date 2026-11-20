"use client";

import { useEffect, useState } from "react";
import LocationButton, { type DriveContext } from "@/features/location/LocationButton";
import styles from "./home.module.css";

type Song = {
    title: string;
    artist: string;
};

type RecommendationResponse = {
    songs?: Song[];
    error?: string;
};

export default function Home() {
    const [driveContext, setDriveContext] = useState<DriveContext | null>(null);
    const [songs, setSongs] = useState<Song[]>([]);
    const [playlist, setPlaylist] = useState<Song[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!driveContext) return;

        const context = driveContext;
        let cancelled = false;
        setIsLoading(true);
        setError("");
        setSongs([]);
        void (async () => {
            try {
                const response = await fetch("/api/ai/music-recommendations", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(context),
                });
                const data = (await response.json()) as RecommendationResponse;
                if (!response.ok || !data.songs) {
                    throw new Error(data.error ?? "楽曲の提案を取得できませんでした。");
                }
                if (!cancelled) setSongs(data.songs);
            } catch (requestError) {
                if (!cancelled) {
                    setError(
                        requestError instanceof Error
                            ? requestError.message
                            : "楽曲の提案を取得できませんでした。",
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [driveContext]);

    function addToPlaylist(song: Song) {
        setPlaylist((current) =>
            current.some((item) => item.title === song.title && item.artist === song.artist)
                ? current
                : [...current, song],
        );
    }

    return (
        <main className={styles.page}>
            <LocationButton onContextChange={setDriveContext} />
            <section aria-label="AI楽曲提案">
                {isLoading && <p role="status">現在地の情報をもとに曲を選んでいます…</p>}
                <p role="status">{error}</p>

                {songs.length > 0 && (
                    <>
                        <h2>おすすめの5曲</h2>
                        <ul>
                            {songs.map((song, index) => (
                                <li key={`${song.title}-${song.artist}-${index}`}>
                                    <strong>{song.title}</strong> — {song.artist}{" "}
                                    <button type="button" onClick={() => addToPlaylist(song)}>
                                        プレイリストに追加
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </section>

            <section aria-label="プレイリスト">
                <h2>プレイリスト</h2>
                {playlist.length === 0 ? (
                    <p>提案された曲を追加すると、ここに表示されます。</p>
                ) : (
                    <ol>
                        {playlist.map((song, index) => (
                            <li key={`${song.title}-${song.artist}-${index}`}>
                                {song.title} — {song.artist}
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </main>
    );
}
