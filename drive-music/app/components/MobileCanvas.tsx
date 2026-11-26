import type { ReactNode } from "react";
import styles from "./mobileCanvas.module.css";

type MobileCanvasProps = {
  children?: ReactNode;
  className?: string;
};

export default function MobileCanvas({
  children,
  className,
}: MobileCanvasProps) {
  return (
    <main className={`${styles.page} ${className ?? ""}`}>
      <div className={styles.canvas}>
        {children}
      </div>
    </main>
  );
}
