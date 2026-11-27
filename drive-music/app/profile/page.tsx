import Link from "next/link";
import MobileCanvas from "@/app/components/MobileCanvas";
import MobileNav from "@/app/components/MobileNav";
import styles from "./profile.module.css";

const favorites = [
  ["夏の恋人", "SHISHAMO", "#ffb97b"],
  ["片思い", "miwa", "#d95a68"],
  ["スーパースター", "back number", "#ab4a42"],
  ["ハチミツ", "aiko", "#a5c48a"],
];

export default function ProfilePage() {
  return (
    <MobileCanvas className={styles.canvas}>
      <section className={styles.identity}>
        <div className={styles.avatar} aria-hidden="true"><span /></div>
        <Link href="/home" className={styles.nickname} aria-label="ニックネーム変更（未設定のためホームへ）">
          ニックネーム <span>✎</span>
        </Link>
      </section>

      <Link href="/home" className={styles.favorites} aria-label="お気に入りをすべて見る（ホームへ）">
        <div className={styles.cardHeader}><strong>お気に入り</strong><small>すべて見る ›</small></div>
        <div className={styles.favoriteList}>
          {favorites.map(([title, artist, color]) => (
            <div className={styles.favorite} key={title}>
              <span className={styles.cover} style={{ background: `linear-gradient(145deg, ${color}, #fff5d3)` }}>♫</span>
              <strong>{title}</strong><small>{artist}</small>
            </div>
          ))}
        </div>
      </Link>

      <h1 className={styles.playlistTitle}>プレイリスト</h1>
      <section className={styles.playlists} aria-label="過去のプレイリスト">
        {["11月20日", "11月20日", "11月20日"].map((date, index) => (
          <Link className={styles.playlist} href="/home" key={`${date}-${index}`} aria-label="プレイリスト（未設定のためホームへ）">
            <span className={styles.car}>🚘</span>
            <span><strong>{date}</strong><small>10曲</small></span>
            <b>›</b>
          </Link>
        ))}
      </section>
      <Link href="/home" className={styles.more}>もっと見る</Link>
      <MobileNav />
    </MobileCanvas>
  );
}
