import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_INVOICES = [
  { id: 'inv1', userId: 'u1', clientId: 'cl1', amount: 299.00, status: 'paid', dueDate: '2024-10-01T00:00:00Z', paidDate: '2024-09-28T10:00:00Z', items: '[{"description":"Credit Repair Program - Month 1","amount":299}]', notes: null, createdAt: '2024-09-01T10:00:00Z', updatedAt: '2024-09-28T10:00:00Z', payments: [{ id: 'p1', amount: 299, method: 'credit_card', status: 'completed' }], _count: { payments: 1 } },
  { id: 'inv2', userId: 'u2', clientId: 'cl2', amount: 299.00, status: 'paid', dueDate: '2024-11-01T00:00:00Z', paidDate: '2024-10-30T14:00:00Z', items: '[{"description":"Credit Repair Program - Month 2","amount":299}]', notes: null, createdAt: '2024-10-01T10:00:00Z', updatedAt: '2024-10-30T14:00:00Z', payments: [{ id: 'p2', amount: 299, method: 'credit_card', status: 'completed' }], _count: { payments: 1 } },
  { id: 'inv3', userId: 'u3', clientId: 'cl3', amount: 299.00, status: 'paid', dueDate: '2024-12-01T00:00:00Z', paidDate: '2024-11-29T16:00:00Z', items: '[{"description":"Credit Repair Program - Final Payment","amount":299}]', notes: 'Program completed', createdAt: '2024-11-01T10:00:00Z', updatedAt: '2024-11-29T16:00:00Z', payments: [{ id: 'p3', amount: 299, method: 'bank_transfer', status: 'completed' }], _count: { payments: 1 } },
  { id: 'inv4', userId: 'u4', clientId: 'cl4', amount: 299.00, status: 'pending', dueDate: '2024-12-15T00:00:00Z', paidDate: null, items: '[{"description":"Credit Repair Program - Month 1","amount":299}]', notes: null, createdAt: '2024-11-15T10:00:00Z', updatedAt: '2024-11-15T10:00:00Z', payments: [], _count: { payments: 0 } },
  { id: 'inv5', userId: 'u5', clientId: 'cl5', amount: 299.00, status: 'paid', dueDate: '2024-11-01T00:00:00Z', paidDate: '2024-10-25T11:00:00Z', items: '[{"description":"Credit Repair Program - Month 5","amount":299}]', notes: null, createdAt: '2024-10-01T10:00:00Z', updatedAt: '2024-10-25T11:00:00Z', payments: [{ id: 'p4', amount: 299, method: 'credit_card', status: 'completed' }], _count: { payments: 1 } },
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
      const clientId = searchParams.get('clientId') || ''

      const where: Prisma.InvoiceWhereInput = {}

      if (status) where.status = status
      if (clientId) where.clientId = clientId

      // Clients see only their invoices
      if (auth.role === 'client') {
        where.userId = auth.userId
      }

      const [invoices, total] = await Promise.all([
        db.invoice.findMany({
          where,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
            client: {
              select: { id: true },
            },
            payments: true,
            _count: {
              select: { payments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.invoice.count({ where }),
      ])

      return jsonResponse({
        invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo invoices:', dbError)
      return jsonResponse({
        invoices: DEMO_INVOICES,
        pagination: { page: 1, limit: 20, total: DEMO_INVOICES.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      invoices: DEMO_INVOICES,
      pagination: { page: 1, limit: 20, total: DEMO_INVOICES.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { userId, clientId, amount, dueDate, items, notes } = body

    if (!userId || !amount || !dueDate) {
      return errorResponse('userId, amount, and dueDate are required')
    }

    const invoice = await db.invoice.create({
      data: {
        userId,
        clientId: clientId || null,
        amount: parseFloat(amount),
        dueDate: new Date(dueDate),
        items: items ? JSON.stringify(items) : null,
        notes: notes || null,
        status: 'pending',
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        client: {
          select: { id: true },
        },
      },
    })

    await db.activity.create({
      data: {
        userId: auth.userId,
        action: 'invoice_created',
        description: `Created invoice for $${amount}`,
        metadata: JSON.stringify({ invoiceId: invoice.id }),
      },
    })

    return jsonResponse(invoice, 201)
  } catch (error) {
    console.error('Create invoice error:', error)
    return errorResponse('Internal server error', 500)
  }
}
