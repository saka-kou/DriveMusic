"use client";

import { useEffect, useState } from "react";
import LocationButton, { type DriveContext } from "@/features/location/LocationButton";
import styles from "./home.module.css";

type SongSuggestion = {
    title: string;
    artist: string;
};

type SpotifyTrack = {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
        name: string;
        images: Array<{ url: string }>;
    };
};

type PlaylistTrack = {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
        name: string;
        images: Array<{ url: string }>;
    };
};

const PLAYLIST_STORAGE_KEY = "drive-music-playlist";

type RecommendationResponse = {
    songs?: SongSuggestion[];
    error?: string;
};

type SpotifySearchResponse = {
    tracks?: { items?: SpotifyTrack[] };
};

type SpotifyBatchSearchResponse = {
    results?: SpotifySearchResponse[];
    error?: string;
};

export default function Home() {
    const [driveContext, setDriveContext] = useState<DriveContext | null>(null);
    const [playlist, setPlaylist] = useState<PlaylistTrack[]>([]);
    const [playlistLoaded, setPlaylistLoaded] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [progress, setProgress] = useState("");

    useEffect(() => {
        try {
            const storedPlaylist = localStorage.getItem(PLAYLIST_STORAGE_KEY);
            if (storedPlaylist) {
                const parsed = JSON.parse(storedPlaylist) as PlaylistTrack[];
                if (Array.isArray(parsed)) setPlaylist(parsed);
            }
        } catch {
            localStorage.removeItem(PLAYLIST_STORAGE_KEY);
        } finally {
            setPlaylistLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!playlistLoaded) return;
        localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(playlist));
    }, [playlist, playlistLoaded]);

    useEffect(() => {
        if (!driveContext) return;

        const context = driveContext;
        let cancelled = false;
        setIsLoading(true);
        setError("");
        setProgress("AIにドライブに合う曲を依頼しています…");
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

                if (!cancelled) setProgress("Spotifyで提案された2曲を検索しています…");
                const searchResponse = await fetch("/api/spotify/search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        queries: data.songs.map((song) => `${song.title} ${song.artist}`),
                    }),
                });
                const searchData = (await searchResponse.json()) as SpotifyBatchSearchResponse;
                if (!searchResponse.ok || !searchData.results) {
                    throw new Error(searchData.error ?? "Spotifyの曲検索に失敗しました。");
                }

                const matchedTracks = data.songs.map((song, index): PlaylistTrack => {
                    const track = searchData.results?.[index]?.tracks?.items?.[0];
                    if (!track) {
                        return {
                            id: `suggestion-${song.title}-${song.artist}-${index}`,
                            name: "曲が見つかりません",
                            artists: [],
                            album: { name: "", images: [] },
                        };
                    }

                    return {
                        id: track.id,
                        name: track.name,
                        artists: track.artists,
                        album: track.album,
                    };
                });

                if (!cancelled) {
                    setPlaylist((current) => {
                        const existingIds = new Set(current.map((track) => track.id));
                        const additions = matchedTracks.filter((track) => {
                            if (existingIds.has(track.id)) return false;
                            existingIds.add(track.id);
                            return true;
                        });
                        return [...current, ...additions];
                    });
                    setProgress("提案曲の検索が完了し、プレイリストに追加しました。");
                }
            } catch (requestError) {
                if (!cancelled) {
                    setProgress("");
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

    return (
        <main className={styles.page}>
            <LocationButton onContextChange={setDriveContext} />
            <section aria-label="AI楽曲提案">
                {progress && <p role="status">{progress}</p>}
                <p role="status">{error}</p>

            </section>

            <section aria-label="プレイリスト">
                <h2>プレイリスト</h2>
                {playlist.length === 0 && !isLoading && <p>現在地を取得すると、おすすめ曲がここに追加されます。</p>}
                <div className={styles.playlist}>
                    {playlist.map((track) => (
                        <article className={styles.track} key={track.id}>
                            {track.album.images[0]?.url ? (
                                <img src={track.album.images[0].url} alt={`${track.album.name}のジャケット`} />
                            ) : (
                                <div className={styles.placeholder} aria-label="ジャケット画像なし">♪</div>
                            )}
                            <div>
                                <h3>{track.name}</h3>
                                <p>{track.artists.map((artist) => artist.name).join(", ")}</p>
                            </div>
                            <button
                                className={styles.deleteButton}
                                type="button"
                                aria-label={`${track.name}をプレイリストから削除`}
                                onClick={() => setPlaylist((current) => current.filter((item) => item.id !== track.id))}
                            >
                                削除
                            </button>
                        </article>
                    ))}
                </div>
            </section>
        </main>
    );
}
