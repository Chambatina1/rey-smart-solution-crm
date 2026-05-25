import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'
import { Prisma } from '@prisma/client'

const DEMO_COURSES = [
  { id: 'c1', titleEn: 'Credit Fundamentals 101', titleEs: 'Fundamentos de Credito 101', descriptionEn: 'Learn the basics of credit scores, reports, and how to build a strong credit profile.', descriptionEs: 'Aprende los fundamentos de los puntajes de credito, reportes y como construir un perfil solido.', category: 'credit_basics', level: 'beginner', thumbnail: null, videoUrl: null, content: null, duration: 120, isPublished: true, isFree: true, price: 0, createdBy: 'admin', createdAt: '2024-06-01T10:00:00Z', updatedAt: '2024-11-15T14:00:00Z', _count: { enrollments: 45, lessons: 8 } },
  { id: 'c2', titleEn: 'Debt Consolidation Strategies', titleEs: 'Estrategias de Consolidacion de Deudas', descriptionEn: 'Discover proven strategies to consolidate debt and reduce monthly payments.', descriptionEs: 'Descubre estrategias comprobadas para consolidar deudas y reducir pagos mensuales.', category: 'consolidation', level: 'intermediate', thumbnail: null, videoUrl: null, content: null, duration: 180, isPublished: true, isFree: false, price: 49.99, createdBy: 'admin', createdAt: '2024-07-15T09:00:00Z', updatedAt: '2024-11-20T16:00:00Z', _count: { enrollments: 28, lessons: 12 } },
  { id: 'c3', titleEn: 'Budgeting & Financial Planning', titleEs: 'Presupuesto y Planificacion Financiera', descriptionEn: 'Master budgeting techniques to take control of your finances.', descriptionEs: 'Domina las tecnicas de presupuesto para tomar control de tus finanzas.', category: 'budgeting', level: 'beginner', thumbnail: null, videoUrl: null, content: null, duration: 90, isPublished: true, isFree: true, price: 0, createdBy: 'admin', createdAt: '2024-08-01T11:00:00Z', updatedAt: '2024-10-15T10:00:00Z', _count: { enrollments: 62, lessons: 6 } },
  { id: 'c4', titleEn: 'First-Time Homebuyer Guide', titleEs: 'Guia para Compradores Primerizos', descriptionEn: 'Everything you need to know to buy your first home with the best credit.', descriptionEs: 'Todo lo que necesitas saber para comprar tu primera casa con el mejor credito.', category: 'home_buying', level: 'intermediate', thumbnail: null, videoUrl: null, content: null, duration: 210, isPublished: true, isFree: false, price: 79.99, createdBy: 'admin', createdAt: '2024-09-10T14:00:00Z', updatedAt: '2024-11-25T12:00:00Z', _count: { enrollments: 19, lessons: 15 } },
  { id: 'c5', titleEn: 'Advanced Credit Repair Techniques', titleEs: 'Tecnicas Avanzadas de Reparacion de Credito', descriptionEn: 'Advanced strategies for complex credit repair scenarios.', descriptionEs: 'Estrategias avanzadas para escenarios complejos de reparacion de credito.', category: 'credit_basics', level: 'advanced', thumbnail: null, videoUrl: null, content: null, duration: 300, isPublished: true, isFree: false, price: 99.99, createdBy: 'admin', createdAt: '2024-10-01T10:00:00Z', updatedAt: '2024-12-01T09:00:00Z', _count: { enrollments: 15, lessons: 20 } },
  { id: 'c6', titleEn: 'Business Credit Building', titleEs: 'Construccion de Credito Empresarial', descriptionEn: 'Learn how to build business credit separate from personal credit.', descriptionEs: 'Aprende como construir credito empresarial separado del credito personal.', category: 'business_credit', level: 'intermediate', thumbnail: null, videoUrl: null, content: null, duration: 240, isPublished: true, isFree: false, price: 89.99, createdBy: 'admin', createdAt: '2024-10-20T13:00:00Z', updatedAt: '2024-11-30T15:00:00Z', _count: { enrollments: 12, lessons: 16 } },
]

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      const { searchParams } = new URL(request.url)
      const page = parseInt(searchParams.get('page') || '1')
      const limit = parseInt(searchParams.get('limit') || '20')
      const category = searchParams.get('category') || ''
      const level = searchParams.get('level') || ''
      const published = searchParams.get('published')

      const where: Prisma.CourseWhereInput = {}

      if (category) where.category = category
      if (level) where.level = level
      if (published !== null && published !== undefined) {
        where.isPublished = published === 'true'
      }

      const [courses, total] = await Promise.all([
        db.course.findMany({
          where,
          include: {
            creator: {
              select: { id: true, name: true, avatar: true },
            },
            _count: {
              select: {
                enrollments: true,
                lessons: true,
                conferences: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        db.course.count({ where }),
      ])

      if (total === 0) {
        return jsonResponse({
          courses: DEMO_COURSES,
          pagination: { page: 1, limit: 20, total: DEMO_COURSES.length, pages: 1 },
        })
      }

      return jsonResponse({
        courses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      })
    } catch (dbError) {
      console.warn('DB unavailable, returning demo courses:', dbError)
      return jsonResponse({
        courses: DEMO_COURSES,
        pagination: { page: 1, limit: 20, total: DEMO_COURSES.length, pages: 1 },
      })
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse({
      courses: DEMO_COURSES,
      pagination: { page: 1, limit: 20, total: DEMO_COURSES.length, pages: 1 },
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    const body = await request.json()
    const { titleEn, titleEs, descriptionEn, descriptionEs, category, level, thumbnail, videoUrl, content, duration, isPublished, isFree, price } = body

    if (!titleEn || !titleEs || !category) {
      return errorResponse('titleEn, titleEs, and category are required')
    }

    const course = await db.course.create({
      data: {
        titleEn,
        titleEs,
        descriptionEn: descriptionEn || null,
        descriptionEs: descriptionEs || null,
        category,
        level: level || 'beginner',
        thumbnail: thumbnail || null,
        videoUrl: videoUrl || null,
        content: content || null,
        duration: duration || null,
        isPublished: isPublished || false,
        isFree: isFree !== undefined ? isFree : true,
        price: price || null,
        createdBy: auth.userId,
      },
      include: {
        creator: {
          select: { id: true, name: true },
        },
      },
    })

    await db.activity.create({
      data: {
        userId: auth.userId,
        action: 'course_created',
        description: `Created course: ${titleEn}`,
        metadata: JSON.stringify({ courseId: course.id }),
      },
    })

    return jsonResponse(course, 201)
  } catch (error) {
    console.error('Create course error:', error)
    return errorResponse('Internal server error', 500)
  }
}
