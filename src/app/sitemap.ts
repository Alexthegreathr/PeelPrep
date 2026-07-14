import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = (
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  ).replace(/\/+$/, "");
  const paths = [
    "",
    "/features",
    "/how-it-works",
    "/pricing",
    "/privacy",
    "/terms",
    "/login",
    "/signup",
  ];
  return paths.map((p) => ({
    url: `${base}${p}`,
    changeFrequency: "monthly" as const,
    priority: p === "" ? 1 : 0.6,
  }));
}
