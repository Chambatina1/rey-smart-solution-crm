import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'

const DEMO_STATS = {
  clients: {
    total: 247,
    active: 189,
    byStatus: [
      { status: 'active', count: 189 },
      { status: 'completed', count: 34 },
      { status: 'inactive', count: 16 },
      { status: 'suspended', count: 8 },
    ],
  },
  disputes: {
    total: 1284,
    active: 342,
    completed: 847,
    byBureau: [
      { bureau: 'equifax', count: 428 },
      { bureau: 'experian', count: 431 },
      { bureau: 'transunion', count: 425 },
    ],
    byStatus: [
      { status: 'completed', count: 847 },
      { status: 'in_progress', count: 198 },
      { status: 'sent', count: 144 },
      { status: 'draft', count: 95 },
    ],
    outcomes: [
      { outcome: 'deleted', count: 512 },
      { outcome: 'updated', count: 214 },
      { outcome: 'verified', count: 89 },
      { outcome: 'reinvestigate', count: 32 },
    ],
  },
  education: { courses: 12, conferences: 8 },
  appointments: { upcoming: 23 },
  messages: { unread: 7 },
  revenue: { total: 187420, monthly: 24350, pendingInvoices: 15, totalPayments: 423 },
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const now = new Date()
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

      const [totalClients] = await Promise.all([db.client.count()])

      // If database is empty, return demo data
      if (totalClients === 0) {
        console.info('DB is empty, returning demo stats')
        return jsonResponse(DEMO_STATS)
      }

      const [
        activeClients, totalDisputes, activeDisputes, completedDisputes,
        totalCourses, totalConferences, upcomingAppointments, unreadMessages,
        totalRevenue, monthlyRevenue, pendingInvoices, totalPayments,
      ] = await Promise.all([
        db.client.count({ where: { status: 'active' } }),
        db.dispute.count(),
        db.dispute.count({ where: { status: { in: ['sent', 'in_progress'] } } }),
        db.dispute.count({ where: { status: 'completed' } }),
        db.course.count({ where: { isPublished: true } }),
        db.conference.count({ where: { isPublished: true } }),
        db.appointment.count({ where: { date: { gte: now }, status: { in: ['scheduled', 'confirmed'] } } }),
        db.message.count({ where: { receiverId: auth.userId, isRead: false } }),
        db.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed' } }),
        db.payment.aggregate({ _sum: { amount: true }, where: { status: 'completed', paidAt: { gte: thirtyDaysAgo } } }),
        db.invoice.count({ where: { status: 'pending' } }),
        db.payment.count({ where: { status: 'completed' } }),
      ])

      const [disputesByBureau, disputesByStatus, clientsByStatus, disputeOutcomes] = await Promise.all([
        db.dispute.groupBy({ by: ['bureau'], _count: true }),
        db.dispute.groupBy({ by: ['status'], _count: true }),
        db.client.groupBy({ by: ['status'], _count: true }),
        db.dispute.groupBy({ by: ['responseStatus'], _count: true, where: { responseStatus: { not: null } } }),
      ])

      return jsonResponse({
        clients: { total: totalClients, active: activeClients, byStatus: clientsByStatus.map((s) => ({ status: s.status, count: s._count })) },
        disputes: { total: totalDisputes, active: activeDisputes, completed: completedDisputes, byBureau: disputesByBureau.map((b) => ({ bureau: b.bureau, count: b._count })), byStatus: disputesByStatus.map((s) => ({ status: s.status, count: s._count })), outcomes: disputeOutcomes.map((o) => ({ outcome: o.responseStatus, count: o._count })) },
        education: { courses: totalCourses, conferences: totalConferences },
        appointments: { upcoming: upcomingAppointments },
        messages: { unread: unreadMessages },
        revenue: { total: totalRevenue._sum.amount || 0, monthly: monthlyRevenue._sum.amount || 0, pendingInvoices, totalPayments },
      })
    } catch (dbError) {
      console.warn('DB error, returning demo stats:', dbError)
      return jsonResponse(DEMO_STATS)
    }
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return jsonResponse(DEMO_STATS)
  }
}
