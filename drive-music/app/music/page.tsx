"use client";

import { useEffect, useState } from "react";

import type { FormEvent } from "react";
import Link from "next/link";
import SpotifyPlayer from "@/app/components/SpotifyPlayer";
import styles from "./music.module.css";


type Track = {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
};


export default function Musicpage() {
    const [query, setQuery] = useState("");
    //Spotifyから取得した曲
    const [tracks, setTracks] = useState<Track[]>([]);
    //検索処理
    const [selectedTracks, setSelectedTracks] = useState<Track[]>([]);
    const [playlistLoaded, setPlaylistLoaded] = useState(false);

    useEffect(() => {
        try {
            const storedPlaylist = localStorage.getItem("drive-music-playlist");
            if (storedPlaylist) {
                const parsed = JSON.parse(storedPlaylist) as Track[];
                if (Array.isArray(parsed)) setSelectedTracks(parsed);
            }
        } catch {
            localStorage.removeItem("drive-music-playlist");
        } finally {
            setPlaylistLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!playlistLoaded) return;
        localStorage.setItem("drive-music-playlist", JSON.stringify(selectedTracks));
    }, [playlistLoaded, selectedTracks]);
    const searchMusic = async () => {
        try {
            const response = await fetch(
                `/api/spotify/search?q=${encodeURIComponent(query)}`
            );

            const data = await response.json();

            if (!response.ok) {
                console.error("APIエラー:", data);
                alert("検索に失敗しました。Consoleを確認してください。");
                return;
            }

            setTracks(data.tracks.items);
        } catch (error) {
            console.error("通信エラー:", error);
        }
      
type SpotifyUser = { display_name?: string | null };

const mockTracks = [
  { name: "ハチミツ", artist: "aiko" },
  { name: "勿忘", artist: "Awesome City Club" },
  { name: "夏の恋人", artist: "SHISHAMO" },
  { name: "片思い", artist: "miwa" },
  { name: "夏の恋人", artist: "SHISHAMO" },
  { name: "君がくれた夏", artist: "レオ" },
];

export default function MusicPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [userName, setUserName] = useState("");
  const [query, setQuery] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [addedIds, setAddedIds] = useState<Set<string>>(() => new Set());
  const [searchStarted, setSearchStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [autoPlayTrack, setAutoPlayTrack] = useState<Track | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/spotify/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as SpotifyUser;
      })
      .then((user) => {
        if (!active) return;
        setIsLoggedIn(Boolean(user));
        if (user) setUserName(user.display_name || "Spotifyユーザー");
      })
      .catch(() => {
        if (active) setIsLoggedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function searchMusic(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!query.trim()) {
      setSearchStarted(true);
      setTracks([]);
      setError("曲名またはアーティスト名を入力してください。");
      return;
    }

    return (
        <main>
            <h1>Music Serach</h1>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="曲・アーティスト" />
            <button onClick={searchMusic}>
                検索
            </button>
            {tracks.map((track) => (
                <div key={track.id}>
                    <img
                        src={track.album.images[0]?.url}
                        alt={track.album.name}
                        width={150} />
                    <h2>{track.name}</h2>
                    <button onClick={() => handleAddTrack(track)}>
                        プレイリストに追加
                    </button>
                    <p>
                        {track.artists.map((artist) => artist.name).join(".")};
                    </p>
                    <p>{track.album.name}</p>
                </div>
            ))}
            <h2>選択した曲</h2>

            {selectedTracks.map((track) => (
                <div key={track.id}>
                    <img
                        src={track.album.images[0]?.url}
                        alt={track.album.name}
                        width={100}
                    />

                    <p>{track.name}</p>
                    <p>{track.artists[0]?.name}</p>
                    <button
                        type="button"
                        aria-label={`${track.name}をプレイリストから削除`}
                        onClick={() => setSelectedTracks((current) => current.filter((item) => item.id !== track.id))}
                    >
                        削除
                    </button>
                </div>
            ))}
        </main>
    );

    setSearchStarted(true);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(query.trim())}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "検索に失敗しました。");
      setTracks(data.tracks?.items ?? []);
    } catch (cause) {
      setTracks([]);
      setError(cause instanceof Error ? cause.message : "検索に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function playTrack(track: Track) {
    if (!isLoggedIn) {
      window.location.assign(`/auth/login?returnTo=${encodeURIComponent("/music")}`);
      return;
    }
    setAutoPlayTrack({ ...track });
    setNotice(`${track.name} を再生します。`);
  }

  async function playMockTrack(name: string, artist: string) {
    if (!isLoggedIn) {
      window.location.assign(`/auth/login?returnTo=${encodeURIComponent("/music")}`);
      return;
    }
    try {
      const response = await fetch(
        `/api/spotify/search?q=${encodeURIComponent(`${name} ${artist}`)}`,
        { cache: "no-store" },
      );
      const data = await response.json();
      const match: Track | undefined = (data.tracks?.items ?? []).find(
        (track: Track) => track.name === name && track.artists.some((item) => item.name === artist),
      ) ?? data.tracks?.items?.[0];
      if (!response.ok || !match) throw new Error("再生できる曲が見つかりませんでした。");
      playTrack(match);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "曲を再生できませんでした。");
    }
  }

  function addToPlaylist(track: Track) {
    if (addedIds.has(track.id)) return;
    setPlaylist((current) => [...current, track]);
    setAddedIds((current) => new Set(current).add(track.id));
    setNotice(`「${track.name}」をこの画面のプレイリストに追加しました。`);
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/home" className={styles.back} aria-label="ホームに戻る">
          <span className={styles.backIcon} aria-hidden="true">‹</span>
        </Link>
        <h1>PLAYLIST</h1>
        <span className={styles.headerSpacer} />
      </header>

      <form className={styles.searchForm} onSubmit={searchMusic}>
        <label className={styles.searchBox}>
          <span aria-hidden="true">♫</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onFocus={() => setSearchStarted(true)}
            placeholder="曲名またはアーティストを検索してください"
            aria-label="曲名またはアーティストを検索してください"
          />
        </label>
        <button className={styles.searchButton} type="submit" disabled={loading}>
          {loading ? "検索中" : "検索"}
        </button>
      </form>

      <section className={styles.results} aria-label="検索結果">
        <div className={styles.artistHeading}>
          <span>backnumber</span>
        </div>
        {error && <p className={styles.message} role="alert">{error}</p>}
        {searchStarted && !loading && !error && tracks.length === 0 && (
          <p className={styles.message}>検索結果がここに表示されます。</p>
        )}
        {tracks.map((track, index) => {
          const added = addedIds.has(track.id);
          return (
            <div className={styles.resultRow} key={track.id}>
              <button
                className={styles.trackButton}
                type="button"
                onClick={() => playTrack(track)}
                aria-label={`${track.name} / ${track.artists.map((artist) => artist.name).join(", ")} を再生`}
              >
                <span className={styles.trackNumber}>{index + 1}</span>
                {track.album.images[0]?.url ? (
                  <img className={styles.cover} src={track.album.images[0].url} alt="" />
                ) : (
                  <span className={styles.coverPlaceholder} aria-hidden="true">♫</span>
                )}
                <span className={styles.trackInfo}>
                  <strong>{track.name}</strong>
                  <small>{track.artists.map((artist) => artist.name).join(", ")}</small>
                </span>
              </button>
              <button
                className={styles.heartButton}
                type="button"
                disabled
                aria-label="お気に入り（表示のみ）"
                title="お気に入り（表示のみ）"
              >♥</button>
              <button
                className={`${styles.addButton} ${added ? styles.added : ""}`}
                type="button"
                onClick={() => addToPlaylist(track)}
                disabled={added}
                aria-label={added ? "プレイリストに追加済み" : "プレイリストに追加"}
              ><span className={styles.addIcon} aria-hidden="true">{added ? "✓" : "+"}</span></button>
            </div>
          );
        })}
      </section>

      <section className={styles.playlist} aria-label="画面内プレイリスト">
        <div className={styles.playlistHeading}>
          <h2>PLAYLIST</h2>
          <span>next</span>
        </div>
        {playlist.length > 0 && (
          <div className={styles.playlistAdded}>
            {playlist.map((track, index) => (
              <button key={track.id} type="button" className={styles.playlistRow} onClick={() => playTrack(track)}>
                <span className={styles.trackNumber}>{index + 1}</span>
                {track.album.images[0]?.url ? <img className={styles.cover} src={track.album.images[0].url} alt="" /> : null}
                <span className={styles.trackInfo}><strong>{track.name}</strong><small>{track.artists.map((artist) => artist.name).join(", ")}</small></span>
              </button>
            ))}
          </div>
        )}
        {mockTracks.map((track, index) => (
          <button
            type="button"
            className={styles.mockRow}
            key={`${track.name}-${index}`}
            onClick={() => void playMockTrack(track.name, track.artist)}
            aria-label={`${track.name} / ${track.artist} を検索して再生`}
          >
            <span className={styles.trackNumber}>{index + 2}</span>
            <span className={styles.mockCover} aria-hidden="true">♫</span>
            <span className={styles.trackInfo}>
              <strong>{track.name}</strong>
              <small>{track.artist}</small>
            </span>
          </button>
        ))}
      </section>

      {isLoggedIn === false && (
        <div className={styles.loginNote}>
          <span>再生にはSpotifyへのログインが必要です。</span>
          <a href={`/auth/login?returnTo=${encodeURIComponent("/music")}`}>ログイン</a>
        </div>
      )}

      {notice && <p className={styles.notice} role="status">{notice}</p>}

      {isLoggedIn && (
        <section className={styles.player} aria-label="Spotifyプレイヤー">
          <div className={styles.playerUser}>{userName} · Spotify</div>
          <SpotifyPlayer tracks={tracks} autoPlayTrack={autoPlayTrack} />
        </section>
      )}
    </main>
  );
}
