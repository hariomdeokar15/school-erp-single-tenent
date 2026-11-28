const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

if (!configuredApiBaseUrl) {
  throw new Error(
    "VITE_API_BASE_URL is required. Configure it in apps/web/.env.local.",
  );
}

export const env = {
  apiBaseUrl: configuredApiBaseUrl.replace(/\/+$/, ""),
};
