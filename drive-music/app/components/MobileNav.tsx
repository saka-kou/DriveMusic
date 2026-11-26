import Link from "next/link";
import styles from "./mobileCanvas.module.css";

export default function MobileNav() {
  return (
    <nav className={styles.bottomNav} aria-label="メインメニュー">
      <Link href="/home" aria-label="ホーム"><span>⌂</span><small>ホーム</small></Link>
      <Link href="/music" aria-label="音楽"><span>♫</span><small>音楽</small></Link>
      <Link href="/game" aria-label="あそぶ"><span>▣</span><small>あそぶ</small></Link>
      <Link href="/profile" aria-label="プロフィール"><span>◎</span><small>プロフィール</small></Link>
    </nav>
  );
}
