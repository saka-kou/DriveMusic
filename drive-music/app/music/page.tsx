"use client";

import { useEffect, useState } from "react";

type Track = {
    id: string;
    name: string;
    artists: {
        name: string;
    }[];
    album: {
        name: string
        images: {
            url: string;
        }[];
    };
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
    };
    const handleAddTrack = (track: Track) => {
        //すでに追加されている曲か確認
        const alreadyAdded = selectedTracks.some(
            (item) => item.id === track.id
        );
        if (alreadyAdded) {
            return;
        }

        //曲を追加
        setSelectedTracks([...selectedTracks, track]);
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
}
