/**
 * AT Protocol OAuth callback endpoint
 *
 * Handles the OAuth callback by:
 * 1. Validating the state parameter
 * 2. Exchanging the code for tokens
 * 3. Storing the session in D1
 * 4. Redirecting to profile page
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDB } from '@/lib/db/connection';
import { consumeOAuthState } from '@/lib/atproto/oauth/state-store';
import { storeAtpSession } from '@/lib/atproto/oauth/session-store';
import type { SerializedSession } from '@/lib/atproto/types';

export async function GET(request: NextRequest) { // code_id:858
  const db = getDB();

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dreamtree.org';

    // Handle OAuth errors
    if (error) {
      console.error('[ATP Callback] OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${baseUrl}/profile?atp_error=${encodeURIComponent(errorDescription || error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(`${baseUrl}/profile?atp_error=missing_params`);
    }

    // Validate and consume state
    const oauthState = await consumeOAuthState(db, state);
    if (!oauthState) {
      return NextResponse.redirect(`${baseUrl}/profile?atp_error=invalid_state`);
    }

    // Determine PDS URL from handle
    const pdsUrl = oauthState.handle.endsWith('.bsky.social')
      ? 'https://bsky.social'
      : 'https://bsky.social'; // TODO: resolve properly

    // Exchange code for tokens
    const clientId = `${baseUrl}/api/atproto/client-metadata.json`;
    const redirectUri = `${baseUrl}/api/atproto/callback`;

    const tokenResponse = await fetch(`${pdsUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        code_verifier: oauthState.codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[ATP Callback] Token exchange failed:', errorText);
      return NextResponse.redirect(`${baseUrl}/profile?atp_error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info from the access token (decode JWT to get DID)
    // The sub claim contains the DID
    const accessPayload = JSON.parse(
      Buffer.from(tokens.access_token.split('.')[1], 'base64').toString()
    );

    const session: SerializedSession = {
      did: accessPayload.sub,
      handle: oauthState.handle,
      pdsUrl,
      accessJwt: tokens.access_token,
      refreshJwt: tokens.refresh_token,
    };

    // Store session in D1
    await storeAtpSession(db, oauthState.userId, session);

    // Redirect to profile with success
    return NextResponse.redirect(`${baseUrl}/profile?atp=connected`);
  } catch (error) {
    console.error('[ATP Callback] Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dreamtree.org';
    return NextResponse.redirect(`${baseUrl}/profile?atp_error=unknown`);
  }
}
