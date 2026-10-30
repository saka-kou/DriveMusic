import Link from "next/link";
import styles from "./nav.module.css";

export default function nav() {
    return (
        <nav className={styles.nav}>
            <Link className={styles.link} href="/home">ホーム</Link>
            <Link className={styles.link} href="/music">ミュージック</Link>
            <Link className={styles.link} href="/game">ゲーム</Link>
            <Link className={styles.link} href="/profile">プロフィール</Link>
        </nav>
    );
}
