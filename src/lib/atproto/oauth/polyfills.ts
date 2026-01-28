/**
 * Edge runtime polyfills for AT Protocol OAuth
 *
 * Cloudflare Workers have some incompatibilities with the atproto OAuth client.
 * These polyfills work around those issues.
 *
 * Based on: https://gist.github.com/kaytwo/d5e553a6fce20e28f6d5573a520fb525
 */

/**
 * Sanitize a Request object for Cloudflare Workers compatibility.
 *
 * Workers don't support:
 * - `cache` option in Request
 * - `redirect: "error"` (only "follow" and "manual")
 */
export function sanitizeRequest(input: RequestInfo | URL, init?: RequestInit): Request { // code_id:876
  const sanitizedInit = { ...init };

  // Remove unsupported 'cache' option
  if ('cache' in sanitizedInit) {
    delete (sanitizedInit as Record<string, unknown>).cache;
  }

  // Convert 'redirect: "error"' to 'manual' (we'll handle errors ourselves)
  if (sanitizedInit.redirect === 'error') {
    sanitizedInit.redirect = 'manual';
  }

  return new Request(input, sanitizedInit);
}

/**
 * Wrapper for fetch that sanitizes requests for Workers compatibility.
 */
export async function edgeFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> { // code_id:877
  const request = sanitizeRequest(input, init);
  const response = await fetch(request);

  // If we converted 'redirect: "error"' to 'manual', check for redirects
  if (init?.redirect === 'error' && response.type === 'opaqueredirect') {
    throw new Error('Unexpected redirect');
  }

  return response;
}

/**
 * Generate a cryptographically secure random string for OAuth state/PKCE.
 * Uses Web Crypto API which is available in Workers.
 */
export function generateRandomString(length: number): string { // code_id:878
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate PKCE code verifier (43-128 chars, URL-safe)
 */
export function generateCodeVerifier(): string { // code_id:879
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate PKCE code challenge from verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> { // code_id:880
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Base64 URL encode (no padding, URL-safe chars)
 */
function base64UrlEncode(data: Uint8Array): string { // code_id:881
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
