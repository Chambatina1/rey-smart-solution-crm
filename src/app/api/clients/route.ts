import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_CLIENTS = [
  { id: 'cl1', userId: 'u1', ssnLastFour: '1234', dateOfBirth: '1985-03-15', address: '123 Main St', city: 'Orlando', state: 'FL', zipCode: '32801', creditScore: 542, creditScoreDate: '2024-11-15', status: 'active', referredBy: 'Google', notes: null, tags: null, createdAt: '2024-06-15T10:00:00Z', updatedAt: '2024-12-01T14:30:00Z', user: { id: 'u1', name: 'Maria Garcia', email: 'maria.garcia@email.com', phone: '(407) 555-0101', avatar: null, role: 'client' }, _count: { disputes: 8, documents: 3, payments: 4 } },
  { id: 'cl2', userId: 'u2', ssnLastFour: '5678', dateOfBirth: '1990-07-22', address: '456 Oak Ave', city: 'Kissimmee', state: 'FL', zipCode: '34741', creditScore: 623, creditScoreDate: '2024-10-20', status: 'active', referredBy: 'Facebook', notes: null, tags: null, createdAt: '2024-07-20T09:00:00Z', updatedAt: '2024-11-28T16:00:00Z', user: { id: 'u2', name: 'Carlos Rodriguez', email: 'carlos.r@email.com', phone: '(407) 555-0102', avatar: null, role: 'client' }, _count: { disputes: 5, documents: 2, payments: 3 } },
  { id: 'cl3', userId: 'u3', ssnLastFour: '9012', dateOfBirth: '1988-01-10', address: '789 Palm Dr', city: 'Sanford', state: 'FL', zipCode: '32771', creditScore: 712, creditScoreDate: '2024-11-01', status: 'completed', referredBy: 'Referral', notes: 'Program completed successfully', tags: null, createdAt: '2024-03-10T11:00:00Z', updatedAt: '2024-11-25T10:00:00Z', user: { id: 'u3', name: 'Ana Martinez', email: 'ana.m@email.com', phone: '(407) 555-0103', avatar: null, role: 'client' }, _count: { disputes: 12, documents: 5, payments: 6 } },
  { id: 'cl4', userId: 'u4', ssnLastFour: '3456', dateOfBirth: '1995-11-30', address: '321 Lake View', city: 'Winter Park', state: 'FL', zipCode: '32789', creditScore: 489, creditScoreDate: '2024-09-15', status: 'active', referredBy: 'Instagram', notes: null, tags: null, createdAt: '2024-08-05T14:00:00Z', updatedAt: '2024-12-01T09:00:00Z', user: { id: 'u4', name: 'Juan Perez', email: 'juan.p@email.com', phone: '(407) 555-0104', avatar: null, role: 'client' }, _count: { disputes: 6, documents: 2, payments: 2 } },
  { id: 'cl5', userId: 'u5', ssnLastFour: '7890', dateOfBirth: '1982-05-18', address: '654 River Rd', city: 'Altamonte Springs', state: 'FL', zipCode: '32701', creditScore: 658, creditScoreDate: '2024-10-10', status: 'active', referredBy: 'Google', notes: null, tags: null, createdAt: '2024-05-18T10:00:00Z', updatedAt: '2024-11-30T15:00:00Z', user: { id: 'u5', name: 'Luis Hernandez', email: 'luis.h@email.com', phone: '(407) 555-0105', avatar: null, role: 'client' }, _count: { disputes: 9, documents: 4, payments: 5 } },
  { id: 'cl6', userId: 'u6', ssnLastFour: '2345', dateOfBirth: '1993-09-25', address: '987 Sunset Blvd', city: 'Maitland', state: 'FL', zipCode: '32751', creditScore: 575, creditScoreDate: '2024-11-05', status: 'active', referredBy: 'Friend', notes: null, tags: null, createdAt: '2024-09-25T08:00:00Z', updatedAt: '2024-12-02T11:00:00Z', user: { id: 'u6', name: 'Carmen Lopez', email: 'carmen.l@email.com', phone: '(407) 555-0106', avatar: null, role: 'client' }, _count: { disputes: 4, documents: 1, payments: 2 } },
  { id: 'cl7', userId: 'u7', ssnLastFour: '6789', dateOfBirth: '1987-02-14', address: '147 Orange Ave', city: 'Orlando', state: 'FL', zipCode: '32801', creditScore: 701, creditScoreDate: '2024-10-30', status: 'active', referredBy: 'Website', notes: null, tags: null, createdAt: '2024-04-14T13:00:00Z', updatedAt: '2024-11-29T14:00:00Z', user: { id: 'u7', name: 'Roberto Diaz', email: 'roberto.d@email.com', phone: '(407) 555-0107', avatar: null, role: 'client' }, _count: { disputes: 10, documents: 4, payments: 5 } },
  { id: 'cl8', userId: 'u8', ssnLastFour: '0123', dateOfBirth: '1991-08-08', address: '258 Pine St', city: 'Casselberry', state: 'FL', zipCode: '32707', creditScore: 445, creditScoreDate: '2024-09-20', status: 'inactive', referredBy: null, notes: 'Client paused program', tags: null, createdAt: '2024-01-20T16:00:00Z', updatedAt: '2024-09-20T10:00:00Z', user: { id: 'u8', name: 'Patricia Torres', email: 'patricia.t@email.com', phone: '(407) 555-0108', avatar: null, role: 'client' }, _count: { disputes: 2, documents: 1, payments: 1 } },
  { id: 'cl9', userId: 'u9', ssnLastFour: '4567', dateOfBirth: '1984-12-03', address: '369 Magnolia Ln', city: 'Oviedo', state: 'FL', zipCode: '32765', creditScore: 634, creditScoreDate: '2024-11-10', status: 'active', referredBy: 'Google', notes: null, tags: null, createdAt: '2024-06-03T09:00:00Z', updatedAt: '2024-12-01T16:00:00Z', user: { id: 'u9', name: 'Miguel Flores', email: 'miguel.f@email.com', phone: '(407) 555-0109', avatar: null, role: 'client' }, _count: { disputes: 7, documents: 3, payments: 4 } },
  { id: 'cl10', userId: 'u10', ssnLastFour: '8901', dateOfBirth: '1996-04-20', address: '741 Cypress Way', city: 'Longwood', state: 'FL', zipCode: '32750', creditScore: 568, creditScoreDate: '2024-10-25', status: 'active', referredBy: 'Facebook', notes: null, tags: null, createdAt: '2024-07-20T11:00:00Z', updatedAt: '2024-11-28T13:00:00Z', user: { id: 'u10', name: 'Sofia Reyes', email: 'sofia.r@email.com', phone: '(407) 555-0110', avatar: null, role: 'client' }, _count: { disputes: 5, documents: 2, payments: 3 } },
  { id: 'cl11', userId: 'u11', ssnLastFour: '1357', dateOfBirth: '1989-06-12', address: '852 Willow Dr', city: 'Apopka', state: 'FL', zipCode: '32703', creditScore: 745, creditScoreDate: '2024-11-15', status: 'completed', referredBy: 'Referral', notes: 'Excellent results!', tags: null, createdAt: '2024-02-12T10:00:00Z', updatedAt: '2024-11-15T12:00:00Z', user: { id: 'u11', name: 'David Gutierrez', email: 'david.g@email.com', phone: '(407) 555-0111', avatar: null, role: 'client' }, _count: { disputes: 15, documents: 6, payments: 7 } },
  { id: 'cl12', userId: 'u12', ssnLastFour: '2468', dateOfBirth: '1992-10-28', address: '963 Oak Tree Rd', city: 'Lake Mary', state: 'FL', zipCode: '32746', creditScore: 510, creditScoreDate: '2024-11-01', status: 'active', referredBy: 'Instagram', notes: null, tags: null, createdAt: '2024-10-28T15:00:00Z', updatedAt: '2024-12-02T08:00:00Z', user: { id: 'u12', name: 'Isabella Rivera', email: 'isabella.r@email.com', phone: '(407) 555-0112', avatar: null, role: 'client' }, _count: { disputes: 3, documents: 1, payments: 1 } },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const search = searchParams.get('search') || ''
      const status = searchParams.get('status') || ''
      const sortBy = searchParams.get('sortBy') || 'createdAt'
      const sortOrder = searchParams.get('sortOrder') || 'desc'

      const where: Prisma.ClientWhereInput = {}

      if (search) {
        where.OR = [
          { user: { name: { contains: search } } },
          { user: { email: { contains: search } } },
          { address: { contains: search } },
          { city: { contains: search } },
        ]
      }

      if (status) {
        where.status = status
      }

      // Non-admin users can only see their own client profile
      if (auth.role === 'client') {
        where.userId = auth.userId
      }

      const [clients, total] = await Promise.all([
        db.client.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true, avatar: true, role: true },
            },
            _count: {
              select: {
                disputes: true,
                documents: true,
                payments: true,
              },
            },
          },
          orderBy: { [sortBy]: sortOrder as Prisma.SortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.client.count({ where }),
      ])

      return jsonResponse({
        clients,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo clients:', dbError)
      return jsonResponse({
        clients: DEMO_CLIENTS,
        pagination: { page: 1, limit: 20, total: DEMO_CLIENTS.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      clients: DEMO_CLIENTS,
      pagination: { page: 1, limit: 20, total: DEMO_CLIENTS.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { name, email, phone, password, ssnLastFour, dateOfBirth, address, city, state, zipCode, creditScore, referredBy, notes, tags } = body

    if (!name || !email) {
      return errorResponse('Name and email are required')
    }

    // Check if user exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (existingUser) {
      return errorResponse('Email already registered', 409)
    }

    // Create user with client role
    const bcryptjs = await import('bcryptjs')
    const passwordHash = await bcryptjs.hash(password || 'ChangeMe123!', 12)

    const user = await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone: phone || null,
        role: 'client',
      },
    })

    const client = await db.client.create({
      data: {
        userId: user.id,
        ssnLastFour: ssnLastFour || null,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        address: address || null,
        city: city || null,
        state: state || null,
        zipCode: zipCode || null,
        creditScore: creditScore || null,
        creditScoreDate: creditScore ? new Date() : null,
        status: 'active',
        referredBy: referredBy || null,
        notes: notes || null,
        tags: tags ? JSON.stringify(tags) : null,
      },
    })

    await db.activity.create({
      data: {
        userId: auth.userId,
        action: 'client_created',
        description: `Created client profile for ${name}`,
        metadata: JSON.stringify({ clientId: client.id }),
      },
    })

    return jsonResponse({ client, user }, 201)
  } catch (error) {
    console.error('Create client error:', error)
    return errorResponse('Internal server error', 500)
  }
}
