'use client'

import { useLocale } from 'next-intl'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const switchLanguage = (newLocale: string) => {
    // 현재 경로에서 언어 부분을 제거하고 새로운 언어로 교체
    const pathWithoutLocale = pathname.replace(`/${locale}`, '')

    // 현재 쿼리 파라미터들을 유지
    const currentParams = new URLSearchParams(searchParams.toString())

    // 새로운 URL 생성
    const newUrl = `/${newLocale}${pathWithoutLocale}${currentParams.toString() ? `?${currentParams.toString()}` : ''}`

    router.push(newUrl)
  }

  return (
    <Select value={locale} onValueChange={switchLanguage}>
      <SelectTrigger className="w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="ko">한국어</SelectItem>
      </SelectContent>
    </Select>
  )
}
