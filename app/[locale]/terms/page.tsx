import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { NEO_CARD_COLORS } from '@/lib/constants/neo-color'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'terms' })

  return {
    title: `${t('title')} - SnapTunes`,
    description: t('introduction'),
  }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'terms' })

  const sections = [
    'acceptance',
    'service',
    'usage',
    'accounts',
    'liability',
    'intellectual',
    'modification',
    'governing',
  ]

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex justify-start">
          <Link href={`/${locale}`}>
            <Button variant="default">
              <ArrowLeft size={16} />
              {locale === 'ko' ? '메인으로' : 'Back to Main'}
            </Button>
          </Link>
        </div>

        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-bold text-black tracking-tight">
            {t('title')}
          </h1>
          <p className="text-lg max-w-2xl mx-auto">{t('introduction')}</p>
          <div className="text-sm text-gray-500">{t('lastUpdated')}</div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          {sections.map((sectionKey, index) => (
            <Card
              key={sectionKey}
              className="border-4 border-black"
              style={{
                backgroundColor:
                  NEO_CARD_COLORS[index % NEO_CARD_COLORS.length],
              }}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-2xl font-bold text-black">
                  {t(`sections.${sectionKey}.title`)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-slate max-w-none">
                  <div
                    className="text-gray-800 leading-relaxed space-y-3"
                    dangerouslySetInnerHTML={{
                      __html: t(`sections.${sectionKey}.content`).replace(
                        /\n/g,
                        '<br>',
                      ),
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
