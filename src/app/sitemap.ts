import type { MetadataRoute } from "next";
import { todayUTC } from "@/lib/daily";

const SITE_URL = "https://www.extremle.io";
const LAUNCH_DATE = "2026-08-04";

function pastDates(today: string): string[] {
  const [ty, tm, td] = today.split("-").map(Number);
  const todayMs = Date.UTC(ty, tm - 1, td);
  const [ly, lm, ld] = LAUNCH_DATE.split("-").map(Number);
  const launchMs = Date.UTC(ly, lm - 1, ld);

  const dates: string[] = [];
  for (let ms = launchMs; ms <= todayMs; ms += 86_400_000) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const archiveDates = pastDates(todayUTC());

  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/archive`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/how-to-play`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/stats`, changeFrequency: "monthly", priority: 0.3 },
    ...archiveDates.map((date) => ({
      url: `${SITE_URL}/archive/${date}`,
      changeFrequency: "never" as const,
      priority: 0.4,
    })),
  ];
}
