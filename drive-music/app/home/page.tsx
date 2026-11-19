import styles from "./home.module.css";
import LocationButton from "@/features/location/LocationButton"

export default function music() {
    return (
        <main className={styles.page}>

            <LocationButton />
        </main>
    )
}
