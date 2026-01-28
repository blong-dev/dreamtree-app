import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDB } from '@/lib/db/connection';
import { trackServer } from '@/lib/analytics/server';
import {
  validateEventData,
  type TrackRequest,
  type TrackResponse,
  type AnalyticsEventType,
} from '@/lib/analytics/types';

// Valid event types (controlled vocabulary)
const VALID_EVENT_TYPES: AnalyticsEventType[] = [
  'session_start',
  'page_view',
  'exercise_start',
  'exercise_complete',
  'prompt_view',
  'prompt_submit',
  'tool_open',
  'tool_submit',
  'error',
];

// Valid target types
const VALID_TARGET_TYPES = ['exercise', 'prompt', 'tool', 'page', 'api'];

/**
 * POST /api/analytics/track
 *
 * Track an analytics event. Accepts events from authenticated and
 * unauthenticated users. Privacy-enforced: no content, metadata only.
 */
export async function POST(request: NextRequest): Promise<NextResponse> { // code_id:133
  try {
    const db = getDB();

    // Parse request body
    let body: TrackRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' } as TrackResponse,
        { status: 400 }
      );
    }

    // Validate event type
    if (
      !body.eventType ||
      !VALID_EVENT_TYPES.includes(body.eventType as AnalyticsEventType)
    ) {
      return NextResponse.json(
        { success: false, error: 'Invalid event type' } as TrackResponse,
        { status: 400 }
      );
    }

    // Validate target type if provided
    if (body.targetType && !VALID_TARGET_TYPES.includes(body.targetType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid target type' } as TrackResponse,
        { status: 400 }
      );
    }

    // Validate event data (privacy enforcement)
    if (body.data && !validateEventData(body.data)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid event data: contains disallowed keys',
        } as TrackResponse,
        { status: 400 }
      );
    }

    // Get session info (optional - analytics works for anonymous users too)
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('dt_session')?.value;

    // Get user ID from session if available
    let userId: string | undefined;
    if (sessionId) {
      const session = await db
        .prepare('SELECT user_id FROM sessions WHERE id = ?')
        .bind(sessionId)
        .first();
      userId = session?.user_id as string | undefined;
    }

    // Track the event
    const eventId = await trackServer(db, body.eventType as AnalyticsEventType, {
      userId,
      sessionId,
      targetType: body.targetType,
      targetId: body.targetId,
      data: body.data,
    });

    return NextResponse.json({
      success: true,
      eventId,
    } as TrackResponse);
  } catch (error) {
    console.error('Analytics track error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to track event' } as TrackResponse,
      { status: 500 }
    );
  }
}
