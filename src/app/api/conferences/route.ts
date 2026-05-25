import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_CONFERENCES = [
  { id: 'conf1', courseId: 'c1', titleEn: 'Credit Score Masterclass', titleEs: 'Taller de Puntaje de Credito', descriptionEn: 'Live masterclass on understanding and improving your credit score.', descriptionEs: 'Taller en vivo sobre entender y mejorar tu puntaje de credito.', type: 'webinar', date: '2026-06-15T18:00:00Z', duration: 90, maxAttendees: 100, meetingLink: 'https://zoom.us/j/123456', location: null, isPublished: true, isRecurring: false, recurrenceRule: null, createdAt: '2024-11-01T10:00:00Z', updatedAt: '2024-11-15T14:00:00Z', _count: { registrations: 45 } },
  { id: 'conf2', courseId: 'c4', titleEn: 'Home Buying Workshop', titleEs: 'Taller de Compra de Casa', descriptionEn: 'Step-by-step workshop for first-time homebuyers.', descriptionEs: 'Taller paso a paso para compradores primerizos de vivienda.', type: 'workshop', date: '2026-06-22T15:00:00Z', duration: 180, maxAttendees: 30, meetingLink: null, location: '7800 S US Hwy 17/92, Ste 194, Fern Park, FL 32730', isPublished: true, isRecurring: false, recurrenceRule: null, createdAt: '2024-11-05T09:00:00Z', updatedAt: '2024-11-20T11:00:00Z', _count: { registrations: 22 } },
  { id: 'conf3', courseId: null, titleEn: 'Financial Freedom Seminar', titleEs: 'Seminario de Libertad Financiera', descriptionEn: 'Comprehensive seminar on achieving financial independence.', descriptionEs: 'Seminario completo sobre como lograr la independencia financiera.', type: 'seminar', date: '2026-07-10T10:00:00Z', duration: 240, maxAttendees: 200, meetingLink: 'https://zoom.us/j/789012', location: null, isPublished: true, isRecurring: false, recurrenceRule: null, createdAt: '2024-11-10T14:00:00Z', updatedAt: '2024-11-25T16:00:00Z', _count: { registrations: 87 } },
  { id: 'conf4', courseId: null, titleEn: 'One-on-One Financial Consultation', titleEs: 'Consulta Financiera Individual', descriptionEn: 'Personal financial consultation session.', descriptionEs: 'Sesion de consulta financiera personalizada.', type: 'one_on_one', date: '2026-06-18T14:00:00Z', duration: 60, maxAttendees: 1, meetingLink: 'https://zoom.us/j/345678', location: null, isPublished: true, isRecurring: true, recurrenceRule: '{"freq":"weekly","byDay":["TU","TH"]}', createdAt: '2024-11-15T08:00:00Z', updatedAt: '2024-11-30T10:00:00Z', _count: { registrations: 8 } },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const type = searchParams.get('type') || ''
      const published = searchParams.get('published')

      const where: Prisma.ConferenceWhereInput = {}

      if (type) where.type = type
      if (published !== null && published !== undefined) {
        where.isPublished = published === 'true'
      }

      const [conferences, total] = await Promise.all([
        db.conference.findMany({
          where,
          include: {
            course: {
              select: { id: true, titleEn: true, titleEs: true },
            },
            _count: {
              select: { registrations: true },
            },
          },
          orderBy: { date: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.conference.count({ where }),
      ])

      return jsonResponse({
        conferences,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo conferences:', dbError)
      return jsonResponse({
        conferences: DEMO_CONFERENCES,
        pagination: { page: 1, limit: 20, total: DEMO_CONFERENCES.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      conferences: DEMO_CONFERENCES,
      pagination: { page: 1, limit: 20, total: DEMO_CONFERENCES.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { titleEn, titleEs, descriptionEn, descriptionEs, type, date, duration, maxAttendees, meetingLink, location, isPublished, isRecurring, recurrenceRule, courseId } = body

    if (!titleEn || !titleEs || !date) {
      return errorResponse('titleEn, titleEs, and date are required')
    }

    const conference = await db.conference.create({
      data: {
        titleEn,
        titleEs,
        descriptionEn: descriptionEn || null,
        descriptionEs: descriptionEs || null,
        type: type || 'webinar',
        date: new Date(date),
        duration: duration || null,
        maxAttendees: maxAttendees || null,
        meetingLink: meetingLink || null,
        location: location || null,
        isPublished: isPublished || false,
        isRecurring: isRecurring || false,
        recurrenceRule: recurrenceRule ? JSON.stringify(recurrenceRule) : null,
        courseId: courseId || null,
      },
    })

    await db.activity.create({
      data: {
        userId: auth.userId,
        action: 'conference_created',
        description: `Created conference: ${titleEn}`,
        metadata: JSON.stringify({ conferenceId: conference.id }),
      },
    })

    return jsonResponse(conference, 201)
  } catch (error) {
    console.error('Create conference error:', error)
    return errorResponse('Internal server error', 500)
  }
}
