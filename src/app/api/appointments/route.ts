import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_APPOINTMENTS = [
  { id: 'ap1', clientId: 'u1', agentId: 'admin', title: 'Initial Consultation', description: 'Credit evaluation and program overview', date: '2026-06-02T10:00:00Z', duration: 60, type: 'consultation', status: 'scheduled', meetingLink: 'https://zoom.us/j/111', notes: null, createdAt: '2024-11-28T10:00:00Z', updatedAt: '2024-11-28T10:00:00Z', clientUser: { id: 'u1', name: 'Maria Garcia' }, agent: { id: 'admin', name: 'Admin' } },
  { id: 'ap2', clientId: 'u2', agentId: 'admin', title: 'Dispute Review', description: 'Review dispute results with Equifax', date: '2026-06-03T14:00:00Z', duration: 30, type: 'follow_up', status: 'confirmed', meetingLink: 'https://zoom.us/j/222', notes: 'Bring dispute letters', createdAt: '2024-11-29T09:00:00Z', updatedAt: '2024-11-30T14:00:00Z', clientUser: { id: 'u2', name: 'Carlos Rodriguez' }, agent: { id: 'admin', name: 'Admin' } },
  { id: 'ap3', clientId: 'u5', agentId: 'admin', title: 'Credit Report Review', description: 'Monthly credit report review', date: '2026-06-04T11:00:00Z', duration: 45, type: 'review', status: 'scheduled', meetingLink: 'https://zoom.us/j/333', notes: null, createdAt: '2024-11-30T08:00:00Z', updatedAt: '2024-11-30T08:00:00Z', clientUser: { id: 'u5', name: 'Luis Hernandez' }, agent: { id: 'admin', name: 'Admin' } },
  { id: 'ap4', clientId: 'u7', agentId: 'admin', title: 'Program Enrollment', description: 'Enroll in advanced credit repair program', date: '2026-06-05T15:00:00Z', duration: 60, type: 'enrollment', status: 'scheduled', meetingLink: null, location: 'Office', notes: 'In-person meeting', createdAt: '2024-12-01T10:00:00Z', updatedAt: '2024-12-01T10:00:00Z', clientUser: { id: 'u7', name: 'Roberto Diaz' }, agent: { id: 'admin', name: 'Admin' } },
  { id: 'ap5', clientId: 'u3', agentId: 'admin', title: 'Final Review', description: 'Program completion review', date: '2026-06-06T10:00:00Z', duration: 30, type: 'review', status: 'completed', meetingLink: 'https://zoom.us/j/555', notes: 'Client completed successfully', createdAt: '2024-11-20T10:00:00Z', updatedAt: '2024-11-25T16:00:00Z', clientUser: { id: 'u3', name: 'Ana Martinez' }, agent: { id: 'admin', name: 'Admin' } },
  { id: 'ap6', clientId: 'u9', agentId: 'admin', title: 'Quarterly Check-in', description: 'Q4 financial check-in', date: '2026-06-10T13:00:00Z', duration: 45, type: 'consultation', status: 'scheduled', meetingLink: 'https://zoom.us/j/666', notes: null, createdAt: '2024-12-01T15:00:00Z', updatedAt: '2024-12-01T15:00:00Z', clientUser: { id: 'u9', name: 'Miguel Flores' }, agent: { id: 'admin', name: 'Admin' } },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const status = searchParams.get('status') || ''
      const type = searchParams.get('type') || ''

      const where: Prisma.AppointmentWhereInput = {}

      if (status) where.status = status
      if (type) where.type = type

      // Clients see only their appointments; agents see their own
      if (auth.role === 'client') {
        where.clientId = auth.userId
      } else if (auth.role === 'agent') {
        where.OR = [
          { clientId: auth.userId },
          { agentId: auth.userId },
        ]
      }

      const [appointments, total] = await Promise.all([
        db.appointment.findMany({
          where,
          include: {
            clientUser: {
              select: { id: true, name: true, email: true, phone: true, avatar: true },
            },
            agent: {
              select: { id: true, name: true, email: true, phone: true, avatar: true },
            },
          },
          orderBy: { date: 'asc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.appointment.count({ where }),
      ])

      if (total === 0) {
        return jsonResponse({
          appointments: DEMO_APPOINTMENTS,
          pagination: { page: 1, limit: 20, total: DEMO_APPOINTMENTS.length, pages: 1 },
        })
      }

      return jsonResponse({
        appointments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo appointments:', dbError)
      return jsonResponse({
        appointments: DEMO_APPOINTMENTS,
        pagination: { page: 1, limit: 20, total: DEMO_APPOINTMENTS.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      appointments: DEMO_APPOINTMENTS,
      pagination: { page: 1, limit: 20, total: DEMO_APPOINTMENTS.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { clientId, agentId, title, description, date, duration, type, meetingLink, notes } = body

    if (!clientId || !agentId || !title || !date) {
      return errorResponse('clientId, agentId, title, and date are required')
    }

    const appointment = await db.appointment.create({
      data: {
        clientId,
        agentId,
        title,
        description: description || null,
        date: new Date(date),
        duration: duration || 60,
        type: type || 'consultation',
        meetingLink: meetingLink || null,
        notes: notes || null,
      },
      include: {
        clientUser: {
          select: { id: true, name: true, email: true },
        },
        agent: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    await db.activity.create({
      data: {
        userId: auth.userId,
        action: 'appointment_created',
        description: `Scheduled appointment: ${title}`,
        metadata: JSON.stringify({ appointmentId: appointment.id }),
      },
    })

    return jsonResponse(appointment, 201)
  } catch (error) {
    console.error('Create appointment error:', error)
    return errorResponse('Internal server error', 500)
  }
}
