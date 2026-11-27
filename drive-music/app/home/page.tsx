"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileCanvas from "@/app/components/MobileCanvas";
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
type RoomStage = "create" | "qr" | "scan" | "ready" | null;

export default function HomePage() {
  const router = useRouter();
  const [roomStage, setRoomStage] = useState<RoomStage>(null);
  const [authChecking, setAuthChecking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("room") === "create") setRoomStage("create");
  }, []);

  async function openRoom() {
    if (authChecking) return;
    setAuthChecking(true);
    try {
      const response = await fetch("/api/spotify/me", { cache: "no-store" });
      if (response.ok) {
        setRoomStage("create");
        return;
      }
    } catch {
      // Spotify未認証時と同じ導線で認証へ進めます。
    } finally {
      setAuthChecking(false);
    }

    const returnTo = "/home?room=create";
    window.location.assign(`/auth/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  function closeRoom() {
    setRoomStage(null);
    router.replace("/home");
  }

  return (
    <MobileCanvas>
      <div className={styles.scene}>
        <div className={styles.sky}>
          <div className={styles.sun} />
        </div>
        <img className={styles.skyEdge} src="/figma/decor/home-sky-edge.png" alt="" />
        <img className={styles.mountains} src="/figma/decor/home-mountain.png" alt="" />
        <img className={styles.roadside} src="/figma/decor/home-roadside.png" alt="" />
        <div className={styles.mirrorStem} />
        <div className={styles.mirror} />
        <img className={styles.road} src="/figma/decor/home-road.png" alt="" />
        <div className={styles.windshield}>
          <button type="button" onClick={openRoom} disabled={authChecking}>
            お出かけしよう
          </button>
        </div>
        <img className={styles.hoodBase} src="/figma/decor/home-hood-base.png" alt="" />
        <img className={styles.hoodStripe} src="/figma/decor/home-hood-stripe.png" alt="" />
        <img className={styles.hoodSurface} src="/figma/decor/home-hood-surface.png" alt="" />
        <img className={styles.steeringWheel} src="/figma/decor/home-steering-wheel.png" alt="" />
        <img className={styles.wheelLines} src="/figma/decor/home-wheel-lines.png" alt="" />

        <section className={styles.musicCard} aria-label="ミニプレイヤー">
          <div className={styles.trackPreview}>
            <img className={styles.albumMock} src="/figma/decor/home-superstar-cover.png" alt="" />
            <span className={styles.trackTitle}><strong>スーパースター</strong><small>back number</small></span>
          </div>
          <div className={styles.progress} />
          <div className={styles.controls}>
            <button type="button" onClick={() => router.push("/music")} aria-label="前の曲">◀◀</button>
            <button type="button" onClick={() => router.push("/music")} aria-label="音楽プレイヤーを開く">Ⅱ</button>
            <button type="button" onClick={() => router.push("/music")} aria-label="次の曲">▶▶</button>
          </div>
        </section>

        <div className={styles.weather} aria-label="現在地と天気（モック）">
          <span className={styles.locationPill}>♧ 山岳部付近</span>
          <span className={styles.temperaturePill}>24° ☼</span>
        </div>

        <nav className={styles.navArt} aria-label="メインメニュー">
          <Link href="/home" className={styles.activeNav}><span className={styles.navIcon}>⌂</span>ホーム</Link>
          <Link href="/music"><span className={styles.navIcon}>♫</span>音楽</Link>
          <Link href="/game"><span className={styles.navIcon}>▣</span>あそぶ</Link>
          <Link href="/profile"><span className={styles.navIcon}>◎</span>プロフィール</Link>
        </nav>
      </div>

      {roomStage && (
        <>
          <div className={styles.shade} />
          <section className={styles.dialog} aria-label={roomStage === "ready" ? "参加メンバー" : "ルーム作成・参加"}>
            <button className={styles.close} type="button" onClick={closeRoom} aria-label="閉じる">×</button>
            <div className={styles.tabs}>
              <button className={roomStage !== "scan" ? styles.selectedTab : ""} type="button" onClick={() => setRoomStage("create")}>ルームを作成</button>
              <button className={roomStage === "scan" || roomStage === "ready" ? styles.selectedTab : ""} type="button" onClick={() => setRoomStage("scan")}>ルームに参加</button>
            </div>

            {roomStage === "create" && (
              <>
                <p className={styles.dialogTitle}>ルームを作成して、友達を招待しよう</p>
                <img className={styles.inviteArt} src="/figma/decor/room-invite.png" alt="友達をルームに招待するイラスト" />
                <button className={styles.roomAction} type="button" onClick={() => setRoomStage("qr")}>作成する</button>
              </>
            )}

            {roomStage === "qr" && (
              <>
                <img className={styles.qrCode} src="/figma/decor/room-qr-code.png" alt="ルーム参加用QRコード" />
                <button className={styles.roomAction} type="button" onClick={() => setRoomStage("ready")}>つぎへ</button>
              </>
            )}

            {roomStage === "scan" && (
              <button className={styles.scanMock} type="button" onClick={() => setRoomStage("ready")} aria-label="QRコードを読み込む（モック）">
                <img src="/figma/decor/qr-scanner.png" alt="" />
              </button>
            )}

            {roomStage === "ready" && (
              <>
                <p className={styles.dialogTitle}>メンバー</p>
                <div className={styles.memberList} role="group" aria-label="ルームのメンバー">
                  <img className={`${styles.member} ${styles.memberOne}`} src="/figma/decor/member-1.png" alt="メンバー" />
                  <img className={`${styles.member} ${styles.memberTwo}`} src="/figma/decor/member-2.png" alt="メンバー" />
                  <img className={`${styles.member} ${styles.memberThree}`} src="/figma/decor/member-3.png" alt="メンバー" />
                  <span className={styles.memberPlus}>＋1</span>
                </div>
                <button className={styles.roomAction} type="button" onClick={() => router.push("/music")}>はじめる</button>
              </>
            )}
          </section>
        </>
      )}
    </MobileCanvas>
  );
}
