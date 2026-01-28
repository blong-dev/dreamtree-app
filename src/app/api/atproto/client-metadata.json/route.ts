/**
 * AT Protocol OAuth client metadata endpoint
 *
 * This endpoint serves the OAuth client metadata required by the AT Protocol.
 * The client_id URL must point to this exact endpoint.
 */

import { NextResponse } from 'next/server';

export async function GET() { // code_id:859
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dreamtree.org';

  return NextResponse.json({
    // client_id MUST be the URL where this metadata is hosted
    client_id: `${baseUrl}/api/atproto/client-metadata.json`,
    client_name: 'DreamTree Career Workbook',
    client_uri: baseUrl,
    logo_uri: `${baseUrl}/acorn.png`,
    tos_uri: `${baseUrl}/terms`,
    policy_uri: `${baseUrl}/privacy`,
    redirect_uris: [`${baseUrl}/api/atproto/callback`],
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    scope: 'atproto transition:generic',
    token_endpoint_auth_method: 'none',
    dpop_bound_access_tokens: true,
    application_type: 'web',
  });
}
