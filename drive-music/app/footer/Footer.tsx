import Link from "next/link";
import css from "./Footer.module.css";

export default function Footer() {
    return (
        <footer className={css.footer}>
            <Link href="/home">ホーム</Link>
            <Link href="/music">ミュージック</Link>
            <Link href="/game">ゲーム</Link>
            <Link href="/profile">プロフィール</Link>
        </footer>
    );
}
