# Admin Web App Vercel Deployment & Cross-Origin (CORS) Authentication

## Overview
This document records the cloud deployment of the Clenzey Admin Operations Web App (`clenzey_admin-main`) onto Vercel, the diagnosis and resolution of the cross-origin CORS / Cookie authentication restrictions between Vercel (`vercel.app`) and the Render backend (`onrender.com`), and verified production access.

---

## 1. Vercel Deployment Details

* **Repository**: `https://github.com/punkk762-coder/clenzey.git`
* **Root Directory**: `clenzey_admin-main`
* **Framework Preset**: Next.js (App Router / Next.js 15)
* **Live Production URL**: [https://clenzey-admin-tau.vercel.app/login](https://clenzey-admin-tau.vercel.app/login)
* **Default Admin Credentials**:
  * **Username**: `superadmin`
  * **Password**: `Admin@1234`

---

## 2. Root Cause Analysis: Cross-Origin Authentication Failure

When `clenzey-admin-tau.vercel.app` initially attempted to log in, the browser blocked the request with the following console error:
```text
Access to XMLHttpRequest at 'https://clenzey.onrender.com/api/v1/admin/auth/login' from origin 'https://clenzey-admin-tau.vercel.app' has been blocked by CORS policy: Response to preflight request doesn't pass access control check: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

### The Three Contributing Causes:
1. **Credentials vs. Wildcard CORS**:
   The admin web app sends requests with `withCredentials: true` to handle cookies. Under W3C CORS security specifications, when credentials are included, the server **must not** return `Access-Control-Allow-Origin: *`. The server must dynamically reflect the exact requesting origin (`https://clenzey-admin-tau.vercel.app`) and return `Access-Control-Allow-Credentials: true`.
2. **Strict Cookie `SameSite` Policy**:
   The backend previously set `sameSite: "strict"` on the `rft_admin` refresh cookie. Because `vercel.app` and `onrender.com` are different top-level domains (cross-site), browsers rejected the cookie.
3. **Next.js Server Edge Middleware Cookie Inspection**:
   Next.js `middleware.ts` executed on Vercel edge servers and looked for the `rft_admin` cookie on `vercel.app`. Since the cookie was set on `onrender.com`, edge middleware redirected authenticated users back to `/login`.

---

## 3. Changes Implemented

### Backend (`clenzey_backend-main`)

1. **Dynamic CORS Origin Reflection** (`src/configs/corsConfig.ts`):
   Updated `isAllowedCorsOrigin` to whitelist all `*.vercel.app` domains, `localhost`, and dynamic requesting origins when wildcard or preview domains are used:
   ```ts
   export const isAllowedCorsOrigin = (origin: string | undefined): boolean => {
     if (!origin) return true;
     const normalized = normalizeOrigin(origin);
     if (
       envConfig.CORS_ORIGINS.includes("*") ||
       envConfig.CORS_ORIGINS.includes(normalized) ||
       envConfig.SOCKET_CORS_ORIGINS.includes("*") ||
       envConfig.SOCKET_CORS_ORIGINS.includes(normalized) ||
       normalized.endsWith(".vercel.app") ||
       normalized.includes("localhost") ||
       normalized.includes("127.0.0.1") ||
       (envConfig.NODE_ENV !== "prod" && isDevTunnelOrigin(normalized))
     ) {
       return true;
     }
     return false;
   };
   ```

2. **Cross-Site Cookie Compatibility** (`src/utilities/authUtils.ts`):
   Configured `sameSite: "none"` and `secure: true` in production so browsers allow cross-domain refresh tokens:
   ```ts
   export const setRefreshTokenCookie = (
     res: Response,
     refreshToken: string,
     cookieName: string,
   ) => {
     res.cookie(cookieName, refreshToken, {
       httpOnly: true,
       maxAge: THIRTY_DAYS_MS,
       path: "/",
       sameSite: envConfig.NODE_ENV === "prod" ? "none" : "lax",
       secure: envConfig.NODE_ENV === "prod",
     });
   };
   ```

### Admin Web App (`clenzey_admin-main`)

1. **Defensive API & Socket URL Fallbacks** (`src/lib/api/client.ts`, `src/lib/socket/client.ts`):
   Guaranteed default fallback to `https://clenzey.onrender.com/api/v1` and `https://clenzey.onrender.com` so missing Vercel environment variables never break API calls:
   ```ts
   const BASE_URL =
     process.env.NEXT_PUBLIC_API_BASE_URL || "https://clenzey.onrender.com/api/v1";
   ```

2. **Client-Side Auth State Persistence** (`src/lib/auth/context.tsx`):
   Preserved user session on page reloads using the localStorage access token.

3. **Pass-Through Middleware** (`src/middleware.ts`):
   Removed the blocking server-side cookie check so the client SPA handles navigation transitions smoothly.

---

## 4. Verification & Status

* **Vercel Admin Login**: Verified successful login for `superadmin` into `/overview` dashboard.
* **Live Operations Terminal**: Real-time bookings, partner dispatch maps, and platform metrics operational.
* **Mobile Apps**: Completely unaffected by browser CORS (mobile native network stacks bypass browser Same-Origin Policy).
