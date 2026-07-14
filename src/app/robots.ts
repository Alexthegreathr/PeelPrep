import type { MetadataRoute } from "next";

function baseUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

export default function robots(): MetadataRoute.Robots {
  const base = baseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Authenticated + API surfaces are not for indexing.
      disallow: [
        "/dashboard",
        "/interviews",
        "/history",
        "/profile",
        "/billing",
        "/settings",
        "/api/",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
