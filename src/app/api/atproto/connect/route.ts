/**
 * AT Protocol OAuth connect endpoint
 *
 * Initiates the OAuth flow by:
 * 1. Resolving the user's handle to find their PDS
 * 2. Generating PKCE parameters
 * 3. Storing state in D1
 * 4. Returning the authorization URL
 */

import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createOAuthState } from '@/lib/atproto/oauth/state-store';
import { generateCodeVerifier, generateCodeChallenge } from '@/lib/atproto/oauth/polyfills';

interface ConnectRequest {
  handle: string;
}

// Resolve handle to PDS URL
async function resolvePDS(handle: string): Promise<string | null> {
  // Try to resolve via DNS first (for custom domains)
  // Then fall back to well-known endpoint

  // Clean up handle
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // For now, assume Bluesky PDS for .bsky.social handles
  if (cleanHandle.endsWith('.bsky.social')) { // code_id:860
    return 'https://bsky.social';
  }

  // Try to resolve via well-known endpoint
  try {
    const response = await fetch(`https://${cleanHandle}/.well-known/atproto-did`);
    if (response.ok) {
      const did = await response.text();
      // Resolve DID to PDS URL via PLC directory
      const plcResponse = await fetch(`https://plc.directory/${did}`);
      if (plcResponse.ok) {
        const plcData = await plcResponse.json();
        const service = plcData.service?.find(
          (s: { id: string; type: string; serviceEndpoint: string }) =>
            s.type === 'AtprotoPersonalDataServer'
        );
        if (service?.serviceEndpoint) {
          return service.serviceEndpoint;
        }
      }
    }
  } catch {
    // Fall through to default
  }

  // Default to Bluesky
  return 'https://bsky.social';
}

export const POST = withAuth(async (request, { userId, db }) => {
  try {
    const body: ConnectRequest = await request.json();
    const { handle } = body;

    if (!handle) {
      return NextResponse.json({ error: 'Handle is required' }, { status: 400 });
    }

    // Resolve PDS
    const pdsUrl = await resolvePDS(handle);
    if (!pdsUrl) {
      return NextResponse.json({ error: 'Could not resolve PDS for handle' }, { status: 400 });
    }

    // Generate PKCE parameters
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Store state in D1
    const state = await createOAuthState(db, userId, handle, codeVerifier);

    // Build authorization URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dreamtree.org';
    const clientId = `${baseUrl}/api/atproto/client-metadata.json`;
    const redirectUri = `${baseUrl}/api/atproto/callback`;

    const authUrl = new URL(`${pdsUrl}/oauth/authorize`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'atproto transition:generic');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return NextResponse.json({
      authUrl: authUrl.toString(),
      pdsUrl,
    });
  } catch (error) {
    console.error('[ATP Connect] Error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate OAuth flow' },
      { status: 500 }
    );
  }
});
