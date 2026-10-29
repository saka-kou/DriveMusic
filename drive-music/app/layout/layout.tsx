import css from "./layout.module.css";
import Footer from "../footer/Footer";

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ja">
            <body>
                {children}
                <Footer />
            </body>
        </html>
    );
}