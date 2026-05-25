import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'

const DEMO_ACTIVITY = [
  { id: '1', action: 'client_created', description: 'New client Maria Garcia registered', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), user: { id: 'u1', name: 'Admin', avatar: null } },
  { id: '2', action: 'dispute_sent', description: 'Dispute #D-1234 sent to Equifax for client Carlos Rodriguez', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), user: { id: 'u2', name: 'Agent Smith', avatar: null } },
  { id: '3', action: 'dispute_completed', description: 'Dispute #D-1198 completed - item deleted from Experian', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), user: { id: 'u1', name: 'Admin', avatar: null } },
  { id: '4', action: 'appointment_scheduled', description: 'Consultation scheduled with Ana Martinez for tomorrow at 10:00 AM', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), user: { id: 'u3', name: 'Sarah Lopez', avatar: null } },
  { id: '5', action: 'payment_received', description: 'Payment of $299.00 received from Juan Perez', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), user: { id: 'u1', name: 'Admin', avatar: null } },
  { id: '6', action: 'course_published', description: 'New course "Credit Fundamentals 101" published', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(), user: { id: 'u2', name: 'Agent Smith', avatar: null } },
  { id: '7', action: 'client_completed', description: 'Client Luis Hernandez completed the credit repair program', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), user: { id: 'u3', name: 'Sarah Lopez', avatar: null } },
  { id: '8', action: 'conference_created', description: 'New webinar "Debt Consolidation Strategies" scheduled for next week', metadata: null, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), user: { id: 'u1', name: 'Admin', avatar: null } },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const { searchParams } = new URL(request.url)
      const limit = parseInt(searchParams.get('limit') || '20')

      const activities = await db.activity.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, avatar: true } } },
      })

      return jsonResponse(activities)
    } catch (dbError) {
      console.warn('DB unavailable, returning demo activity:', dbError)
      return jsonResponse(DEMO_ACTIVITY)
    }
  } catch (error) {
    console.error('Recent activity error:', error)
    return jsonResponse(DEMO_ACTIVITY)
  }
}
