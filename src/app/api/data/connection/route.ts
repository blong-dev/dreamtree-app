import { NextResponse } from 'next/server';
import { withAuth, type AuthenticatedHandler } from '@/lib/auth/with-auth';
import { ConnectionResolver } from '@/lib/connections/resolver';

/**
 * GET /api/data/connection?connectionId=100000
 *
 * Fetch connected data for a user based on connection definition.
 * Refactored to use withAuth middleware (IMP-009/040).
 */
const handler: AuthenticatedHandler = async (request, { userId, db }) => {
  const { searchParams } = new URL(request.url);
  const connectionId = searchParams.get('connectionId');

  if (!connectionId) {
    return NextResponse.json(
      { error: 'connectionId is required' },
      { status: 400 }
    );
  }

  // Validate connectionId is a positive integer (prevents SQL injection)
  const parsedConnectionId = parseInt(connectionId, 10);
  if (isNaN(parsedConnectionId) || parsedConnectionId <= 0 || !Number.isInteger(parsedConnectionId)) {
    return NextResponse.json(
      { error: 'connectionId must be a positive integer' },
      { status: 400 }
    );
  }

  try {
    // Use ConnectionResolver to fetch the data
    const resolver = new ConnectionResolver(db);
    const result = await resolver.resolve({
      userId,
      connectionId: parsedConnectionId,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error resolving connection:', error);
    return NextResponse.json(
      { error: 'Failed to resolve connection' },
      { status: 500 }
    );
  }
};

export const GET = withAuth(handler);
