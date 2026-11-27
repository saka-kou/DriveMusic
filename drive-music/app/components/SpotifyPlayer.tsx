
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

type Track = {
    id: string;
    name: string;
    artists: {
        name: string;
    }[];
    album: {
        name: string;
        images: {
            url: string;
        }[];
    };
};

type SpotifyPlayerInstance = {
    connect: () => Promise<boolean>;
    disconnect: () => void;
    togglePlay: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    seek: (positionMs: number) => Promise<void>;
    addListener: (
        event: string,
        callback: (data: any) => void
    ) => boolean;
};

declare global {
    interface Window {
        Spotify?: {
            Player: new (options: {
                name: string;
                volume?: number;
                getOAuthToken: (callback: (token: string) => void) => void;
            }) => SpotifyPlayerInstance;
        };
        onSpotifyWebPlaybackSDKReady?: () => void;
    }
}

type SpotifyPlayerProps = {
    tracks: Track[];
    autoPlayTrack?: Track | null;
};

export default function SpotifyPlayer({
    tracks,
    autoPlayTrack = null,
}: SpotifyPlayerProps) {
    const playerRef = useRef<SpotifyPlayerInstance | null>(null);
    const deviceIdRef = useRef<string | null>(null);
    const lastAutoPlayRequestRef = useRef<Track | null>(null);

    const [isReady, setIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
    const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Spotifyプレイヤーの初期化
    useEffect(() => {
        let cancelled = false;

        const initializePlayer = () => {
            if (cancelled || !window.Spotify || playerRef.current) {
                return;
            }

            const player = new window.Spotify.Player({
                name: "DriveMusic Player",
                volume: 0.5,

                getOAuthToken: async (callback) => {
                    try {
                        const response = await fetch("/api/spotify/sdk-token", {
                            cache: "no-store",
                        });

                        const data = await response.json();

                        if (!response.ok || !data.access_token) {
                            throw new Error(
                                data.error ?? "Spotifyの認証に失敗しました。"
                            );
                        }

                        callback(data.access_token);
                    } catch (err) {
                        console.error(err);
                        setError(
                            "Spotifyの認証に失敗しました。再ログインしてください。"
                        );
                    }
                },
            });

            playerRef.current = player;

            // プレイヤー接続完了
            player.addListener("ready", (data: { device_id: string }) => {
                if (cancelled) return;

                deviceIdRef.current = data.device_id;
                setIsReady(true);
                setError("");
            });

            // プレイヤー切断
            player.addListener("not_ready", () => {
                if (cancelled) return;

                deviceIdRef.current = null;
                setIsReady(false);
                setIsPlaying(false);
            });

            // 再生状態の変更
            player.addListener("player_state_changed", (state: any) => {
                if (cancelled || !state) return;

                const track = state.track_window.current_track;

                setIsPlaying(!state.paused);
                setPosition(state.position);
                setDuration(state.duration);

                if (track) {
                    const nextTrack: Track = {
                        id: track.id,
                        name: track.name,
                        artists: track.artists,
                        album: {
                            name: track.album.name,
                            images: track.album.images,
                        },
                    };

                    setCurrentTrack(nextTrack);
                }
            });

            player.addListener(
                "initialization_error",
                (data: { message: string }) => {
                    setError(`プレイヤーの初期化エラー: ${data.message}`);
                }
            );

            player.addListener(
                "authentication_error",
                (data: { message: string }) => {
                    setError(`Spotifyの認証エラー: ${data.message}`);
                }
            );

            player.addListener(
                "account_error",
                (data: { message: string }) => {
                    setError(`アカウントエラー: ${data.message}`);
                }
            );

            player.addListener(
                "playback_error",
                (data: { message: string }) => {
                    setError(`再生エラー: ${data.message}`);
                }
            );

            player.addListener("autoplay_failed", () => {
                setError(
                    "ブラウザの自動再生が制限されています。再生ボタンを押してください。"
                );
            });

            player.connect().then((success) => {
                if (!success && !cancelled) {
                    setError("Spotifyプレイヤーに接続できませんでした。");
                }
            });
        };

        const existingScript = document.querySelector(
            'script[src="https://sdk.scdn.co/spotify-player.js"]'
        );

        window.onSpotifyWebPlaybackSDKReady = initializePlayer;

        if (window.Spotify) {
            initializePlayer();
        } else if (!existingScript) {
            const script = document.createElement("script");

            script.src = "https://sdk.scdn.co/spotify-player.js";
            script.async = true;

            script.onerror = () => {
                if (!cancelled) {
                    setError("Spotify Web Playback SDKを読み込めませんでした。");
                }
            };

            document.body.appendChild(script);
        } else {
            existingScript.addEventListener(
                "error",
                () => {
                    if (!cancelled) {
                        setError("Spotify SDKの読み込みに失敗しました。");
                    }
                },
                { once: true }
            );
        }

        return () => {
            cancelled = true;

            window.onSpotifyWebPlaybackSDKReady = undefined;

            playerRef.current?.disconnect();
            playerRef.current = null;
            deviceIdRef.current = null;
        };
    }, []);

    // 選択した曲を再生する
    const playTrack = useCallback(async (track: Track) => {
        if (!isReady || !deviceIdRef.current) {
            setError(
                "Spotifyプレイヤーの接続を待ってから再生してください。"
            );
            return;
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/spotify/player/play", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    trackId: track.id,
                    deviceId: deviceIdRef.current,
                }),
            });

            if (!response.ok) {
                const data = await response.json();

                throw new Error(
                    data.error ?? "曲を再生できませんでした。"
                );
            }

            setSelectedTrack(track);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "曲を再生できませんでした。"
            );
        } finally {
            setIsLoading(false);
        }
    }, [isReady]);

    useEffect(() => {
        if (
            !autoPlayTrack ||
            !isReady ||
            lastAutoPlayRequestRef.current === autoPlayTrack
        ) {
            return;
        }

        lastAutoPlayRequestRef.current = autoPlayTrack;
        void playTrack(autoPlayTrack);
    }, [autoPlayTrack, isReady, playTrack]);

    // 共通の再生・一時停止ボタン
    const togglePlayback = async () => {
        if (!playerRef.current || !isReady) return;

        setError("");

        try {
            // 再生中なら一時停止
            if (isPlaying) {
                await playerRef.current.pause();
                return;
            }

            // 選択中の曲が現在の曲と違う場合は、その曲を再生
            const trackToPlay = selectedTrack ?? currentTrack;

            if (!trackToPlay) {
                setError("先に検索結果から曲を選択してください。");
                return;
            }

            if (currentTrack?.id !== trackToPlay.id) {
                await playTrack(trackToPlay);
                return;
            }

            // 同じ曲なら続きから再生
            await playerRef.current.resume();
        } catch (err) {
            console.error(err);
            setError("再生状態を変更できませんでした。");
        }
    };

    // 再生位置を変更
    const handleSeek = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        if (!playerRef.current) return;

        const nextPosition = Number(event.target.value);

        setPosition(nextPosition);

        try {
            await playerRef.current.seek(nextPosition);
        } catch {
            setError("再生位置を変更できませんでした。");
        }
    };

    // 時間表示
    const formatTime = (milliseconds: number) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    };

    return (
        <section className="spotify-player">
            <h2>Spotify Player</h2>

            <p>
                接続状態：
                {isReady ? "接続済み" : "接続中..."}
            </p>

            {error && (
                <p role="alert" style={{ color: "red" }}>
                    {error}
                </p>
            )}

            {/* 現在再生中の曲 */}
            <div className="now-playing">
                {currentTrack ? (
                    <>
                        {currentTrack.album.images[0]?.url && (
                            <img
                                src={currentTrack.album.images[0].url}
                                alt={currentTrack.album.name}
                                width={120}
                            />
                        )}

                        <h3>{currentTrack.name}</h3>

                        <p>
                            {currentTrack.artists
                                .map((artist) => artist.name)
                                .join(", ")}
                        </p>
                    </>
                ) : (
                    <p>まだ曲が再生されていません。</p>
                )}

                {/* 共通の再生・一時停止ボタン */}
                <button
                    type="button"
                    onClick={togglePlayback}
                    disabled={
                        !isReady ||
                        isLoading ||
                        (!selectedTrack && !currentTrack)
                    }
                    style={{
                        padding: "12px 32px",
                        borderRadius: "30px",
                        border: "none",
                        backgroundColor: "#1DB954",
                        color: "#fff",
                        fontWeight: "bold",
                        cursor: "pointer",
                        margin: "16px 0",
                    }}
                >
                    {isLoading
                        ? "読み込み中..."
                        : isPlaying
                            ? "⏹ 停止"
                            : "▶ 再生"}
                </button>

                {/* 再生位置 */}
                <div>
                    <span>{formatTime(position)}</span>

                    <input
                        type="range"
                        min={0}
                        max={duration || 1}
                        value={Math.min(position, duration || 1)}
                        onChange={handleSeek}
                        disabled={!duration}
                    />

                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* 曲の選択リスト */}
            <div className="spotify-track-list">
                <h3>再生する曲を選択</h3>

                <p>曲を選択してから、上の再生ボタンを押してください。</p>

                {tracks.map((track) => (
                    <button
                        key={track.id}
                        type="button"
                        onClick={() => {
                            setSelectedTrack(track);
                            setError("");
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            width: "100%",
                            padding: "12px",
                            marginBottom: "8px",
                            textAlign: "left",
                            border: selectedTrack?.id === track.id
                                ? "2px solid #1DB954"
                                : "1px solid #ddd",
                            borderRadius: "8px",
                            backgroundColor: selectedTrack?.id === track.id
                                ? "rgba(29, 185, 84, 0.08)"
                                : "transparent",
                            cursor: "pointer",
                        }}
                    >
                        {track.album.images[0]?.url && (
                            <img
                                src={track.album.images[0].url}
                                alt={track.album.name}
                                width={56}
                                height={56}
                                style={{
                                    objectFit: "cover",
                                    borderRadius: "6px",
                                }}
                            />
                        )}

                        <span>
                            <strong>{track.name}</strong>
                            <br />
                            <span style={{ color: "#777" }}>
                                {track.artists
                                    .map((artist) => artist.name)
                                    .join(", ")}
                            </span>
                        </span>

                        {selectedTrack?.id === track.id && (
                            <span style={{ marginLeft: "auto", color: "#1DB954" }}>
                                選択中
                            </span>
                        )}
                    </button>
                ))}
            </div>
        </section>
    );
}
