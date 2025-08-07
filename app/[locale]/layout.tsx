import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Toaster } from '@/components/ui/sonner'
import { Geist, Geist_Mono } from 'next/font/google'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
})

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  const t = await getTranslations({ locale, namespace: 'app' })

  return {
    title: t('title'),
    description: t('description'),
    keywords: t('keywords'),
    metadataBase: new URL('https://snaptunes.vercel.app'),
    alternates: {
      canonical: '/',
      languages: {
        en: '/en',
        ko: '/ko',
      },
    },
    openGraph: {
      images: '/opengraph-image.png',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  return (
    <html lang={locale || 'en'}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider>
          <Toaster />
          {children}
        </NextIntlClientProvider>
      </body>
      {process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID &&
        process.env.NODE_ENV === 'production' && (
          <GoogleAnalytics
            gaId={process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID!}
          />
        )}
    </html>
  )
}
