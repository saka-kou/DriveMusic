"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MobileCanvas from "@/app/components/MobileCanvas";
import styles from "./home.module.css";

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
