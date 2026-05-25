import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_DISPUTES = [
  { id: 'd1', clientId: 'cl1', tradeLineId: null, bureau: 'equifax', disputeType: 'late_payment', disputeReason: 'Payment was made on time - bank statement shows correct payment date', status: 'in_progress', letterTemplate: 'late_payment', letterContent: null, sentDate: '2024-11-20', responseDate: null, responseStatus: null, notes: null, round: 2, createdAt: '2024-11-15T10:00:00Z', updatedAt: '2024-12-01T14:00:00Z', client: { id: 'cl1', user: { id: 'u1', name: 'Maria Garcia', email: 'maria.garcia@email.com' } }, tradeLine: null, _count: { responses: 1 } },
  { id: 'd2', clientId: 'cl2', tradeLineId: null, bureau: 'experian', disputeType: 'collection', disputeReason: 'This collection was paid in full and should be removed', status: 'completed', letterTemplate: 'collection', letterContent: null, sentDate: '2024-10-15', responseDate: '2024-11-10', responseStatus: 'deleted', notes: 'Successfully deleted!', round: 1, createdAt: '2024-10-10T09:00:00Z', updatedAt: '2024-11-10T16:00:00Z', client: { id: 'cl2', user: { id: 'u2', name: 'Carlos Rodriguez', email: 'carlos.r@email.com' } }, tradeLine: null, _count: { responses: 1 } },
  { id: 'd3', clientId: 'cl3', tradeLineId: null, bureau: 'transunion', disputeType: 'charge_off', disputeReason: 'Account was never charged off - payments were current', status: 'completed', letterTemplate: 'charge_off', letterContent: null, sentDate: '2024-09-01', responseDate: '2024-09-28', responseStatus: 'deleted', notes: 'Deleted from TransUnion', round: 1, createdAt: '2024-08-28T11:00:00Z', updatedAt: '2024-09-28T10:00:00Z', client: { id: 'cl3', user: { id: 'u3', name: 'Ana Martinez', email: 'ana.m@email.com' } }, tradeLine: null, _count: { responses: 1 } },
  { id: 'd4', clientId: 'cl4', tradeLineId: null, bureau: 'equifax', disputeType: 'incorrect_info', disputeReason: 'Account balance is incorrect - should show $0', status: 'sent', letterTemplate: 'incorrect_info', letterContent: null, sentDate: '2024-12-01', responseDate: null, responseStatus: null, notes: null, round: 1, createdAt: '2024-11-28T14:00:00Z', updatedAt: '2024-12-01T09:00:00Z', client: { id: 'cl4', user: { id: 'u4', name: 'Juan Perez', email: 'juan.p@email.com' } }, tradeLine: null, _count: { responses: 0 } },
  { id: 'd5', clientId: 'cl5', tradeLineId: null, bureau: 'experian', disputeType: 'late_payment', disputeReason: 'Late payment reported in error - was on auto-pay', status: 'completed', letterTemplate: 'late_payment', letterContent: null, sentDate: '2024-08-15', responseDate: '2024-09-12', responseStatus: 'updated', notes: 'Status updated to current', round: 1, createdAt: '2024-08-10T10:00:00Z', updatedAt: '2024-09-12T15:00:00Z', client: { id: 'cl5', user: { id: 'u5', name: 'Luis Hernandez', email: 'luis.h@email.com' } }, tradeLine: null, _count: { responses: 1 } },
  { id: 'd6', clientId: 'cl6', tradeLineId: null, bureau: 'transunion', disputeType: 'identity_theft', disputeReason: 'This account was opened fraudulently - never applied for this card', status: 'in_progress', letterTemplate: 'identity_theft', letterContent: null, sentDate: '2024-11-25', responseDate: null, responseStatus: null, notes: 'FTC report attached', round: 1, createdAt: '2024-11-20T08:00:00Z', updatedAt: '2024-11-25T11:00:00Z', client: { id: 'cl6', user: { id: 'u6', name: 'Carmen Lopez', email: 'carmen.l@email.com' } }, tradeLine: null, _count: { responses: 0 } },
  { id: 'd7', clientId: 'cl7', tradeLineId: null, bureau: 'equifax', disputeType: 'outdated', disputeReason: 'Negative item should be removed - over 7 years old', status: 'completed', letterTemplate: 'outdated', letterContent: null, sentDate: '2024-07-01', responseDate: '2024-07-30', responseStatus: 'deleted', notes: 'Removed successfully', round: 1, createdAt: '2024-06-28T13:00:00Z', updatedAt: '2024-07-30T10:00:00Z', client: { id: 'cl7', user: { id: 'u7', name: 'Roberto Diaz', email: 'roberto.d@email.com' } }, tradeLine: null, _count: { responses: 1 } },
  { id: 'd8', clientId: 'cl1', tradeLineId: null, bureau: 'transunion', disputeType: 'collection', disputeReason: 'Collection account not mine - identity theft report filed', status: 'draft', letterTemplate: 'collection', letterContent: null, sentDate: null, responseDate: null, responseStatus: null, notes: null, round: 1, createdAt: '2024-12-01T16:00:00Z', updatedAt: '2024-12-01T16:00:00Z', client: { id: 'cl1', user: { id: 'u1', name: 'Maria Garcia', email: 'maria.garcia@email.com' } }, tradeLine: null, _count: { responses: 0 } },
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
      const bureau = searchParams.get('bureau') || ''
      const clientId = searchParams.get('clientId') || ''
      const disputeType = searchParams.get('disputeType') || ''

      const where: Prisma.DisputeWhereInput = {}

      if (status) where.status = status
      if (bureau) where.bureau = bureau
      if (clientId) where.clientId = clientId
      if (disputeType) where.disputeType = disputeType

      // Non-admin users see only their disputes
      if (auth.role === 'client') {
        const client = await db.client.findUnique({ where: { userId: auth.userId } })
        if (client) where.clientId = client.id
      }

      const [disputes, total] = await Promise.all([
        db.dispute.findMany({
          where,
          include: {
            client: {
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
            tradeLine: {
              select: {
                id: true,
                accountName: true,
                accountType: true,
                balance: true,
              },
            },
            _count: {
              select: { responses: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.dispute.count({ where }),
      ])

      if (total === 0) {
        return jsonResponse({
          disputes: DEMO_DISPUTES,
          pagination: { page: 1, limit: 20, total: DEMO_DISPUTES.length, pages: 1 },
        })
      }

      return jsonResponse({
        disputes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo disputes:', dbError)
      return jsonResponse({
        disputes: DEMO_DISPUTES,
        pagination: { page: 1, limit: 20, total: DEMO_DISPUTES.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      disputes: DEMO_DISPUTES,
      pagination: { page: 1, limit: 20, total: DEMO_DISPUTES.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { clientId, tradeLineId, bureau, disputeType, disputeReason, letterContent } = body

    if (!clientId || !bureau || !disputeType) {
      return errorResponse('ClientId, bureau, and dispute type are required')
    }

    const dispute = await db.dispute.create({
      data: {
        clientId,
        tradeLineId: tradeLineId || null,
        bureau,
        disputeType,
        disputeReason: disputeReason || null,
        letterContent: letterContent || null,
        status: 'draft',
      },
      include: {
        client: {
          include: {
            user: { select: { name: true } },
          },
        },
        tradeLine: true,
      },
    })

    await db.activity.create({
      data: {
        userId: auth.userId,
        action: 'dispute_created',
        description: `Created ${disputeType} dispute for ${bureau}`,
        metadata: JSON.stringify({ disputeId: dispute.id }),
      },
    })

    return jsonResponse(dispute, 201)
  } catch (error) {
    console.error('Create dispute error:', error)
    return errorResponse('Internal server error', 500)
  }
}
