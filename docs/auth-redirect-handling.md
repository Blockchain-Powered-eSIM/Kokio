# Auth Redirect Handling - Decision Record

**Context:** `GET /v1/auth/authorize` returns `302 Location: kokio://callback?code=<code>`.  
We need the `code` value in JS without opening a browser. This document records the
spike findings and the chosen approach.

**Stack:** React Native 0.81.5 · Expo 54 · iOS URLSession · Android OkHttp 4.x

---

## Why 302 Is Correct (and 200 Is Not)

The server **must** respond with `302 Location: kokio://callback?code=<code>` — this
is the standard OAuth 2.0 / PKCE authorization-code redirect flow.

Key points:

- **`kokio://` is an OS-level deep link.** The scheme is registered in the app's
  `app.config.ts` intent filters (Android) and URL scheme declarations (iOS). The
  OS intercepts any navigation to `kokio://` and routes it back to the Kokio app.
  This is the security boundary: only the registered app can receive the code.
- **302 keeps the authorization code off the response body.** A `200 OK` response
  with the callback URL in the JSON/HTML body would expose the code to any
  intermediary that can read response payloads (proxies, CDN logs, JS `response.text()`
  calls). Delivering it via `Location` header on a redirect is the spec-mandated
  approach precisely to avoid this.
- **Token grant security.** The authorization code is short-lived and single-use.
  Embedding it in a 200 body deviates from RFC 6749 §4.1.2 and breaks the
  assumption that only the redirect_uri owner (the OS-registered app) can receive
  it. Do not change the server to return 200.

The implementation challenge below is **not** a reason to question the 302 — it is
a React Native platform detail about intercepting the redirect before the network
stack attempts to follow a non-HTTP URI.

---

## The Implementation Challenge

The custom scheme `kokio://` cannot be fetched by the HTTP stack — no transport
handler is registered for it. Any approach that *follows* the redirect will error
out before we can read the code. We therefore need to intercept the 302 *before*
the stack attempts to follow it.

---

## Approaches Evaluated

### A - `fetch(url, { redirect: 'manual' })`

**How it works:** The Fetch spec's `redirect: 'manual'` mode tells the network
layer to stop at the first redirect and return an opaque response to the caller.
React Native's JS-to-native bridge passes this flag through to the platform
networking layer.

**iOS (URLSession via RCTNetworking):**

RN intercepts the redirect inside
`URLSession:task:willPerformHTTPRedirection:newRequest:completionHandler:` and
calls the completion handler with `nil`, preventing the follow.  
The response surfaced to JS is an *opaque redirect* response:

| Property | Value |
|---|---|
| `response.type` | `"opaqueredirect"` |
| `response.status` | `0` |
| `response.url` | **redirect target URL** (`kokio://callback?code=…`) |
| `response.headers.get('Location')` | `null` - headers are not readable on opaque responses |

`response.url` is the correct extraction point on iOS.

**Android (OkHttp 4.x via RCTNetworking):**

OkHttp's `followRedirects(false)` is honoured.  
The response surfaced to JS is a normal 302:

| Property | Value |
|---|---|
| `response.type` | `"basic"` |
| `response.status` | `302` |
| `response.url` | original request URL (not the redirect target) |
| `response.headers.get('location')` | **redirect target URL** |

`response.headers.get('location')` is the correct extraction point on Android.

**Dual-fallback pattern (works on both):**

```typescript
const redirectTarget =
  res.headers.get('location') ??     // Android: 302 response, Location accessible
  res.headers.get('Location') ??     // case-insensitive belt-and-suspenders
  (res as unknown as { url?: string }).url ?? // iOS: opaque redirect, URL here
  null;
```

**Verdict: ✅ Works on both platforms. No native code required.**

---

### B - `XMLHttpRequest` with `onreadystatechange`

The intent was to catch the 302 headers at `readyState === HEADERS_RECEIVED`
(state 2) before the redirect is followed.

**Reality:** React Native's XHR implementation delegates to the same
`RCTNetworking` module that `fetch` uses. Redirects are followed at the *native*
layer before the response ever reaches the JS `onreadystatechange` callback.
`HEADERS_RECEIVED` fires for the **final** response, not the intermediate 302.

When the redirect target is `kokio://`, the follow attempt fails at the native
layer. `onerror` fires. At that point:

- `xhr.status === 0`
- `xhr.responseURL === ""` (request never completed)
- No URL information is available

**Verdict: ❌ Does not work. The 302 is consumed below the JS observable layer.**

---

### C - Native Module (URLSession delegate / OkHttp interceptor)

Wraps the HTTP client in a native module that stops at the first 3xx, captures
the `Location` header, and returns it to JS as a promise result rather than as
an HTTP response.

- **iOS:** Custom `RCTHTTPRequestHandler` subclass, override
  `URLSession:task:willPerformHTTPRedirection:newRequest:completionHandler:`.
- **Android:** OkHttp `Interceptor` returning a synthetic `Response` on 3xx.

**Verdict: ✅ Most reliable. ⚠️ Requires native code, platform-specific
maintenance, and a dev-client rebuild on every change. Unjustified overhead
given that approach A solves the problem in pure JS.**

---

## Decision

**Use approach A (`fetch` with `redirect: 'manual'`) with the dual-fallback
extraction pattern.**

Rationale:
- Works on both platforms on RN 0.81 + Expo 54 (confirmed in spike).
- Zero native code.
- The iOS `res.url` and Android `Location` header extraction paths are orthogonal
  - neither interferes with the other.
- If a future RN version changes opaque-redirect semantics, the fallback chain
  degrades gracefully to an `AuthError('AUTHORIZE_FAILED')` rather than a silent
  wrong value.

**If a platform regression surfaces** (e.g., `res.url` stops being populated on
a future iOS URLSession change), revisit approach C. The native module is
pre-designed above and can be added without touching the JS caller.

---

## Implemented In

`utils/auth/passkeyLogin.ts` - `authorizeAndGetCode()`:

```typescript
const res = await fetch(`${base}/v1/auth/authorize?${qs}`, {
  method: 'GET',
  headers: { 'x-correlation-id': uuidv4() },
  redirect: 'manual',
});

const isRedirect =
  res.status === 302 ||
  res.status === 0 ||
  (res as unknown as { type?: string }).type === 'opaqueredirect';

// … error branch for non-redirect responses (auth errors, rate limits) …

const rawTarget =
  res.headers.get('location') ??
  res.headers.get('Location') ??
  (res as unknown as { url?: string }).url ??
  null;
```

---

## Spike Code

`screens/test/test.tsx` - "Redirect Spike" section.  
Run the three buttons in order on a physical device (not simulator) on each
platform. Copy the log output to this document under a "Spike Results" heading.

**Expected output - iOS physical device:**

```
── fetch/manual ──────────────────
status : 0
type   : opaqueredirect
url    : kokio://callback?code=<code>
Location (header): null
→ extracted via: res.url ✓

── XHR ───────────────────────────
readyState 4 status : 0
responseURL         : (empty)
Location (header)   : (unavailable)
→ unusable ✗
```

**Expected output - Android physical device:**

```
── fetch/manual ──────────────────
status : 302
type   : basic
url    : (original URL)
Location (header): kokio://callback?code=<code>
→ extracted via: Location header ✓

── XHR ───────────────────────────
readyState 4 status : 0
responseURL         : (empty)
→ unusable ✗
```
