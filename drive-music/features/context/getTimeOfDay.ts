export type TimeOfDay = "朝" | "昼" | "夕方" | "夜";

export function getTimeOfDay(date: Date = new Date()): TimeOfDay {
    const hour = date.getHours();

    if (hour >= 5 && hour < 11) {
        return "朝";
    }

    if (hour >= 11 && hour < 16) {
        return "昼";
    }

    if (hour >= 16 && hour < 19) {
        return "夕方";
    }

    return "夜";
}