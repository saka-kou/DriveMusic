import Link from "next/link";
import MobileCanvas from "@/app/components/MobileCanvas";
import styles from "./game.module.css";

const games = [
  { title: "イントロドン", detail: "3秒で曲名を当てよう！", color: "orange" },
  { title: "リリース年代当て", detail: "この曲、いつの時代？", color: "yellow" },
  { title: "歌って当てよう", detail: "お題に合う曲で歌合戦！", color: "green" },
  { title: "楽器モード", detail: "曲に音を重ねてセッション", color: "blue" },
];

export default function GamePage() {
  return (
    <MobileCanvas className={styles.canvas}>
      <img className={styles.wheel} src="/figma/decor/game-wheel.png" alt="" />
      <header className={styles.header}>
        <h1>Drive Games!</h1>
        <p>音楽を使ったゲームでドライブをもっと楽しく。</p>
      </header>
      <section className={styles.games} aria-label="ゲームメニュー">
        {games.map((game) => (
          <Link className={styles[game.color]} href="/home" key={game.title} aria-label={game.title + "（未設定のためホームへ）"}>
            <strong>{game.title}</strong>
            <small>{game.detail}</small>
          </Link>
        ))}
      </section>
      <Link className={styles.back} href="/home" aria-label="ホームに戻る">⌂</Link>
    </MobileCanvas>
  );
}
