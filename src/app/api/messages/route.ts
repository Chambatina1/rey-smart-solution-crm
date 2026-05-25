import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_MESSAGES = [
  { id: 'm1', senderId: 'u1', receiverId: 'admin', subject: 'Question about my disputes', content: 'Hello, I wanted to check the status of my disputes with Equifax. Can you provide an update?', isRead: false, readAt: null, createdAt: '2024-12-01T14:30:00Z', sender: { id: 'u1', name: 'Maria Garcia', avatar: null }, receiver: { id: 'admin', name: 'Admin', avatar: null } },
  { id: 'm2', senderId: 'admin', receiverId: 'u2', subject: 'Documents Needed', content: 'Hi Carlos, we need your most recent bank statements and ID to continue with your dispute process. Please upload them when you get a chance.', isRead: true, readAt: '2024-11-28T10:00:00Z', createdAt: '2024-11-27T16:00:00Z', sender: { id: 'admin', name: 'Admin', avatar: null }, receiver: { id: 'u2', name: 'Carlos Rodriguez', avatar: null } },
  { id: 'm3', senderId: 'u3', receiverId: 'admin', subject: 'Thank you!', content: 'Thank you so much for helping me improve my credit score. I was able to get approved for a car loan at a great rate!', isRead: false, readAt: null, createdAt: '2024-11-26T09:00:00Z', sender: { id: 'u3', name: 'Ana Martinez', avatar: null }, receiver: { id: 'admin', name: 'Admin', avatar: null } },
  { id: 'm4', senderId: 'admin', receiverId: 'u5', subject: 'Appointment Confirmation', content: 'Your appointment for December 4th at 11:00 AM has been confirmed. We will review your latest credit report updates.', isRead: true, readAt: '2024-11-30T09:00:00Z', createdAt: '2024-11-29T14:00:00Z', sender: { id: 'admin', name: 'Admin', avatar: null }, receiver: { id: 'u5', name: 'Luis Hernandez', avatar: null } },
  { id: 'm5', senderId: 'u6', receiverId: 'admin', subject: 'Dispute update request', content: 'Hi, I sent my dispute to TransUnion 2 weeks ago. Should I have received a response by now?', isRead: true, readAt: '2024-11-29T11:00:00Z', createdAt: '2024-11-28T16:30:00Z', sender: { id: 'u6', name: 'Carmen Lopez', avatar: null }, receiver: { id: 'admin', name: 'Admin', avatar: null } },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const folder = searchParams.get('folder') || 'inbox' // inbox, sent

      const where: Prisma.MessageWhereInput = {}

      if (folder === 'inbox') {
        where.receiverId = auth.userId
      } else if (folder === 'sent') {
        where.senderId = auth.userId
      }

      const [messages, total] = await Promise.all([
        db.message.findMany({
          where,
          include: {
            sender: {
              select: { id: true, name: true, avatar: true },
            },
            receiver: {
              select: { id: true, name: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.message.count({ where }),
      ])

      return jsonResponse({
        messages,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo messages:', dbError)
      return jsonResponse({
        messages: DEMO_MESSAGES,
        pagination: { page: 1, limit: 20, total: DEMO_MESSAGES.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      messages: DEMO_MESSAGES,
      pagination: { page: 1, limit: 20, total: DEMO_MESSAGES.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { receiverId, subject, content } = body

    if (!receiverId || !content) {
      return errorResponse('receiverId and content are required')
    }

    const receiver = await db.user.findUnique({ where: { id: receiverId } })
    if (!receiver) {
      return errorResponse('Receiver not found', 404)
    }

    const message = await db.message.create({
      data: {
        senderId: auth.userId,
        receiverId,
        subject: subject || null,
        content,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true },
        },
        receiver: {
          select: { id: true, name: true, avatar: true },
        },
      },
    })

    // Create notification for receiver
    await db.notification.create({
      data: {
        userId: receiverId,
        title: 'New Message',
        message: `${auth.role === 'admin' ? 'Agent' : 'Client'} sent you a message${subject ? `: ${subject}` : ''}`,
        type: 'info',
      },
    })

    return jsonResponse(message, 201)
  } catch (error) {
    console.error('Send message error:', error)
    return errorResponse('Internal server error', 500)
  }
}
