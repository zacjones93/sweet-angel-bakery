import type { Route } from "next"

export const SITE_NAME = "Sweet Angel Bakery"
export const SITE_DESCRIPTION = "Handcrafted cakes and cookies made with love, using the finest ingredients. Order online for pickup."
export const SITE_URL = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://nextjs-saas-template.lubomirgeorgiev.com"
export const GITHUB_REPO_URL = "https://github.com/LubomirGeorgiev/cloudflare-workers-nextjs-saas-template"

export const SITE_DOMAIN = new URL(SITE_URL).hostname
export const PASSWORD_RESET_TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60 // 24 hours
export const EMAIL_VERIFICATION_TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60 // 24 hours
export const MAX_SESSIONS_PER_USER = 5;
export const MAX_TEAMS_CREATED_PER_USER = 3;
export const MAX_TEAMS_JOINED_PER_USER = 10;
export const SESSION_COOKIE_NAME = "session";
export const GOOGLE_OAUTH_STATE_COOKIE_NAME = "google-oauth-state";
export const GOOGLE_OAUTH_CODE_VERIFIER_COOKIE_NAME = "google-oauth-code-verifier";

export const REDIRECT_AFTER_SIGN_IN = "/dashboard" as Route;

// Sales Tax Configuration
// Idaho state sales tax rate for Boise/Caldwell area (6% state + 0% local)
// See docs/idaho-sales-tax-requirements.md for details
export const SALES_TAX_RATE = 0.06; // 6%
