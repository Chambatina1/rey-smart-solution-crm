import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser, errorResponse, jsonResponse } from '@/lib/auth'

const DEMO_SETTINGS = {
  id: 'settings1',
  companyName: 'Rey Smart Solution',
  companyLogo: null,
  phone: '(407) 432-8872',
  email: 'info@reysmartsolution.com',
  address: '7800 S US Hwy 17/92, Ste 194, Fern Park, FL 32730',
  website: 'https://reysmartsolution.com',
  primaryColor: '#0f766e',
  accentColor: '#14b8a6',
  currency: 'USD',
  timezone: 'America/New_York',
  language: 'en',
  enableSms: false,
  enableEmail: true,
  autoReminders: true,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-12-01T00:00:00Z',
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)

    try {
      let settings = await db.companySettings.findFirst()

      if (!settings) {
        // Create default settings
        settings = await db.companySettings.create({})
      }

      return jsonResponse(settings)
    } catch (dbError) {
      console.warn('DB unavailable, returning demo settings:', dbError)
      return jsonResponse(DEMO_SETTINGS)
    }
  } catch (error) {
    console.error('Route error:', error)
    return jsonResponse(DEMO_SETTINGS)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthUser(request)
    if (!auth) return errorResponse('Unauthorized', 401)
    if (auth.role !== 'admin') return errorResponse('Only admins can update settings', 403)

    const body = await request.json()
    const {
      companyName, companyLogo, phone, email, address, website,
      primaryColor, accentColor, currency, timezone, language,
      enableSms, enableEmail, autoReminders, welcomeEmail, smsTemplate,
    } = body

    let settings = await db.companySettings.findFirst()

    if (!settings) {
      settings = await db.companySettings.create({
        data: {
          ...(companyName && { companyName }),
          ...(companyLogo !== undefined && { companyLogo }),
          ...(phone && { phone }),
          ...(email && { email }),
          ...(address && { address }),
          ...(website && { website }),
          ...(primaryColor && { primaryColor }),
          ...(accentColor && { accentColor }),
          ...(currency && { currency }),
          ...(timezone && { timezone }),
          ...(language && { language }),
          ...(enableSms !== undefined && { enableSms }),
          ...(enableEmail !== undefined && { enableEmail }),
          ...(autoReminders !== undefined && { autoReminders }),
          ...(welcomeEmail !== undefined && { welcomeEmail }),
          ...(smsTemplate !== undefined && { smsTemplate }),
        },
      })
    } else {
      settings = await db.companySettings.update({
        where: { id: settings.id },
        data: {
          ...(companyName && { companyName }),
          ...(companyLogo !== undefined && { companyLogo }),
          ...(phone && { phone }),
          ...(email && { email }),
          ...(address && { address }),
          ...(website && { website }),
          ...(primaryColor && { primaryColor }),
          ...(accentColor && { accentColor }),
          ...(currency && { currency }),
          ...(timezone && { timezone }),
          ...(language && { language }),
          ...(enableSms !== undefined && { enableSms }),
          ...(enableEmail !== undefined && { enableEmail }),
          ...(autoReminders !== undefined && { autoReminders }),
          ...(welcomeEmail !== undefined && { welcomeEmail }),
          ...(smsTemplate !== undefined && { smsTemplate }),
        },
      })
    }

    return jsonResponse(settings)
  } catch (error) {
    console.error('Update settings error:', error)
    return errorResponse('Internal server error', 500)
  }
}
