import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
	dest: "public",
	cacheOnFrontEndNav: true,
	aggressiveFrontEndNavCaching: true,
	reloadOnOnline: true,
	disable: process.env.NODE_ENV === "development",
	customWorkerSrc: "worker",
	workboxOptions: {
		disableDevLogs: true,
		runtimeCaching: [
			{
				// Cache API responses (NetworkFirst: serve fresh data, fall back to cache when offline)
				// Use a callback to match on pathname only — urlPattern regex is tested against the
				// full URL (including scheme+host), so a pathname-only regex never matches.
				urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith("/api/spots"),
				handler: "NetworkFirst" as const,
				options: {
					cacheName: "api-spots",
					networkTimeoutSeconds: 10,
					expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
					cacheableResponse: { statuses: [200] },
				},
			},
		],
	},
});

const nextConfig: NextConfig = {
	reactStrictMode: true,
	turbopack: {},
};

export default withPWA(nextConfig);
