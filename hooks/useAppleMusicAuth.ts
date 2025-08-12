import { useEffect, useRef, useState } from 'react'

// MusicKit 타입 정의
interface MusicKitConfiguration {
  developerToken: string
  app: {
    name: string
    build: string
  }
}

interface MusicKitInstance {
  isAuthorized: boolean
  musicUserToken?: string
  authorizationStatus?: 'denied' | 'restricted' | 'notDetermined' | 'authorized'
  userSettings?: () => Promise<{ name?: string }>
  api: {
    me?: () => Promise<{ data?: Array<{ attributes?: { name?: string } }> }>
    library?: {
      playlists?: () => Promise<{ data?: Array<unknown> }>
    }
  }
  authorize?: () => Promise<string | null>
  requestAuthorization?: () => Promise<string | null>
  authorizeUser?: () => Promise<string | null>
  authenticate?: () => Promise<string | null>
  unauthorize?: () => Promise<void>
  revokeAuthorization?: () => Promise<void>
  signOut?: () => Promise<void>
}

interface MusicKitGlobal {
  configure: (config: MusicKitConfiguration) => Promise<MusicKitInstance>
}

declare global {
  interface Window {
    MusicKit?: MusicKitGlobal
  }
}

const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js'
const APP_NAME = 'SnapTunes'
const APP_BUILD = '1.0.0'

// Apple Music 사용자 정보 인터페이스
export interface AppleMusicUser {
  id?: string
  displayName: string
  email?: string
  imageUrl?: string
  hasAppleMusicSubscription?: boolean
  libraryPlaylistsCount?: number
}

export function useAppleMusicAuth() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [musicKitReady, setMusicKitReady] = useState(false)
  const [musicKitInstance, setMusicKitInstance] =
    useState<MusicKitInstance | null>(null)
  const [userInfo, setUserInfo] = useState<AppleMusicUser | null>(null)

  const devTokenRef = useRef<string | null>(null)
  const musicRef = useRef<MusicKitInstance | null>(null)

  useEffect(() => {
    let mounted = true

    // 1) fetch developer token early (so authorize() can run synchronously from click)
    const fetchDevToken = async () => {
      try {
        const res = await fetch('/api/auth/apple-music')
        if (!res.ok) throw new Error('developer token 가져오기 실패')
        const json = await res.json()
        if (!json?.developerToken) throw new Error('developerToken 누락')
        devTokenRef.current = json.developerToken
        await tryConfigure()
      } catch (e: unknown) {
        if (!mounted) return
        const errorMessage =
          e instanceof Error ? e.message : 'developer token error'
        console.error('dev token error', e)
        setError(errorMessage)
      }
    }

    // 2) load MusicKit script (if not already present)
    const loadScript = async () => {
      if (window.MusicKit) {
        // already loaded
        setMusicKitReady(true)
        await tryConfigure()
        return
      }

      const existing = document.querySelector(`script[src="${MUSICKIT_SRC}"]`)
      if (existing) {
        // if script tag exists, listen for musickitloaded event
        document.addEventListener('musickitloaded', onMusickitLoaded)
        return
      }

      const script = document.createElement('script')
      script.src = MUSICKIT_SRC
      script.async = true
      script.onload = () => {
        // library dispatches 'musickitloaded' when fully ready; still attach listener
        document.addEventListener('musickitloaded', onMusickitLoaded)
      }
      document.head.appendChild(script)
    }

    const onMusickitLoaded = async () => {
      document.removeEventListener('musickitloaded', onMusickitLoaded)
      setMusicKitReady(true)
      await tryConfigure()
    }

    // configure only when both dev token and script are ready
    const tryConfigure = async () => {
      if (!mounted) return
      if (!devTokenRef.current) return
      if (!window.MusicKit) return
      if (musicRef.current) return // already configured

      try {
        const cfg: MusicKitConfiguration = {
          developerToken: devTokenRef.current,
          app: {
            name: APP_NAME,
            build: APP_BUILD,
          },
        }
        // configure returns a Promise in newer versions
        const instance = await window.MusicKit.configure(cfg)
        musicRef.current = instance
        setMusicKitInstance(instance)
        setMusicKitReady(true)
        setIsAuthorized(Boolean(instance?.isAuthorized))
        console.log(
          'MusicKit configured successfully:',
          Object.getOwnPropertyNames(instance),
        )
      } catch (e: unknown) {
        console.error('configure error', e)
        setError('MusicKit 초기화 실패')
      }
    }

    fetchDevToken()
    loadScript()

    return () => {
      mounted = false
      document.removeEventListener('musickitloaded', onMusickitLoaded)
      // don't forcibly remove the script tag — other parts of the app may rely on it
    }
  }, [])

  // Apple Music 사용자 정보 가져오기
  const fetchUserInfo = async (): Promise<AppleMusicUser | null> => {
    try {
      const music = musicRef.current
      if (!music || !music.isAuthorized) return null

      console.log('Fetching Apple Music user info...')

      // 기본 사용자 정보 구성
      const userInfo: AppleMusicUser = {
        displayName: 'Apple Music User',
        hasAppleMusicSubscription: true, // 인증되었다면 구독자로 간주
      }

      // MusicKit에서 사용 가능한 사용자 정보 확인
      if (music.musicUserToken) {
        userInfo.id = music.musicUserToken // User Token을 ID로 사용
      }

      // Apple Music 라이브러리 접근 시도 (사용자 정보 확인용)
      try {
        // 사용자의 라이브러리 플레이리스트 개수 확인
        if (
          music.api.library?.playlists &&
          typeof music.api.library.playlists === 'function'
        ) {
          const playlists = await music.api.library.playlists()
          if (playlists && playlists.data) {
            userInfo.libraryPlaylistsCount = playlists.data.length
          }
        }
      } catch (libraryError) {
        console.log('Library access not available:', libraryError)
        // 라이브러리 접근이 불가능한 경우도 있음 (권한 문제 등)
      }

      // 사용자 프로필 정보 시도 (제한적)
      try {
        if (music.api.me && typeof music.api.me === 'function') {
          const profile = await music.api.me()
          if (profile && profile.data && profile.data[0]) {
            const userData = profile.data[0]
            if (userData.attributes) {
              userInfo.displayName =
                userData.attributes.name || userInfo.displayName
              // Apple Music은 이메일을 제공하지 않음
            }
          }
        }
      } catch (profileError) {
        console.log('Profile access not available:', profileError)
        // 프로필 접근이 불가능한 경우 기본값 사용
      }

      // 사용자 설정에서 이름 가져오기 시도
      try {
        if (music.userSettings && typeof music.userSettings === 'function') {
          const settings = await music.userSettings()
          if (settings && settings.name) {
            userInfo.displayName = settings.name
          }
        }
      } catch (settingsError) {
        console.log('User settings not available:', settingsError)
      }

      console.log('Apple Music user info:', userInfo)
      return userInfo
    } catch (error) {
      console.error('Failed to fetch Apple Music user info:', error)
      return null
    }
  }

  // IMPORTANT: call this inside a user gesture (e.g. button onClick).
  const authorize = async (): Promise<string | null> => {
    setError(null)
    setIsLoading(true)
    try {
      const music = musicRef.current
      if (!music)
        throw new Error('MusicKit 준비중입니다. 잠시 후 다시 시도해주세요.')

      // MusicKit 인스턴스 상세 분석
      console.log('=== MusicKit Debug Info ===')
      console.log('MusicKit instance:', music)
      console.log('Type of music:', typeof music)
      console.log('Is null/undefined:', music === null || music === undefined)
      console.log('Constructor:', music?.constructor)
      console.log('Prototype:', Object.getPrototypeOf(music))

      // 모든 속성과 메서드 확인
      const allProps = Object.getOwnPropertyNames(music)
      const allSymbols = Object.getOwnPropertySymbols(music)
      console.log('Own properties:', allProps)
      console.log('Own symbols:', allSymbols)

      // 프로토타입 체인 확인
      let proto = Object.getPrototypeOf(music)
      let level = 1
      while (proto && proto !== Object.prototype) {
        console.log(
          `Prototype level ${level}:`,
          Object.getOwnPropertyNames(proto),
        )
        proto = Object.getPrototypeOf(proto)
        level++
      }

      // MusicKit 전역 객체 확인
      console.log('Global MusicKit:', window.MusicKit)
      if (window.MusicKit) {
        console.log(
          'Global MusicKit methods:',
          Object.getOwnPropertyNames(window.MusicKit),
        )
      }

      if (music.isAuthorized) {
        setIsAuthorized(true)
        // 이미 인증된 경우 사용자 정보 가져오기
        const userInfo = await fetchUserInfo()
        setUserInfo(userInfo)
        return music.musicUserToken ?? null
      }

      // 사용 가능한 인증 메서드 확인
      console.log('Available MusicKit methods:', allProps)
      console.log('MusicKit instance:', music)

      // 다양한 인증 메서드 시도
      let musicUserToken: string | null = null

      if (typeof music.authorize === 'function') {
        console.log('Using authorize method')
        musicUserToken = await music.authorize()
      } else if (typeof music.requestAuthorization === 'function') {
        console.log('Using requestAuthorization method')
        musicUserToken = await music.requestAuthorization()
      } else if (typeof music.authorizeUser === 'function') {
        console.log('Using authorizeUser method')
        musicUserToken = await music.authorizeUser()
      } else if (typeof music.authenticate === 'function') {
        console.log('Using authenticate method')
        musicUserToken = await music.authenticate()
      } else {
        // MusicKit의 인증 상태를 직접 확인
        console.log('No direct authorization method found, checking status...')
        console.log('Authorization status:', music.authorizationStatus)
        console.log('Is authorized:', music.isAuthorized)

        // 인증이 필요한 경우 사용자에게 안내
        if (music.authorizationStatus === 'denied') {
          throw new Error(
            'Apple Music 접근이 거부되었습니다. 설정에서 권한을 허용해주세요.',
          )
        } else if (music.authorizationStatus === 'restricted') {
          throw new Error('Apple Music 접근이 제한되었습니다.')
        } else if (music.authorizationStatus === 'notDetermined') {
          throw new Error(
            'Apple Music 인증이 필요합니다. Apple Music 앱에서 인증을 완료해주세요.',
          )
        } else {
          throw new Error(
            'Apple Music 인증 방법을 찾을 수 없습니다. 사용 가능한 메서드: ' +
              allProps.join(', '),
          )
        }
      }

      if (musicUserToken) {
        setIsAuthorized(true)
        console.log('Apple Music authorized successfully')

        // 인증 성공 후 사용자 정보 가져오기
        const userInfo = await fetchUserInfo()
        setUserInfo(userInfo)

        return musicUserToken
      } else {
        throw new Error('사용자가 인증을 취소했습니다.')
      }
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : '인증에 실패했습니다'
      console.error('authorize error', e)
      setError(errorMessage)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const unauthorize = async (): Promise<void> => {
    try {
      console.log('Starting Apple Music logout...')
      const music = musicRef.current

      if (!music) {
        console.log('No MusicKit instance found, clearing state only')
        setIsAuthorized(false)
        setUserInfo(null)
        return
      }

      // MusicKit 인스턴스의 인증 해제 시도
      if (typeof music.unauthorize === 'function') {
        console.log('Calling music.unauthorize()')
        await music.unauthorize()
      } else if (typeof music.revokeAuthorization === 'function') {
        console.log('Calling music.revokeAuthorization()')
        await music.revokeAuthorization()
      } else if (typeof music.signOut === 'function') {
        console.log('Calling music.signOut()')
        await music.signOut()
      } else {
        console.log('No unauthorize method found, manually clearing state')
      }

      // MusicKit 인스턴스 상태 초기화
      try {
        // MusicKit 인스턴스의 인증 상태를 직접 확인하고 초기화
        if (music.isAuthorized !== undefined) {
          console.log('Clearing MusicKit authorization state')
          // MusicKit 인스턴스의 인증 상태를 강제로 초기화
          if (music.musicUserToken) {
            console.log('Clearing musicUserToken')
            // musicUserToken을 직접 수정할 수 없는 경우, 인스턴스를 재생성
          }
        }
      } catch (stateError) {
        console.log('Error clearing MusicKit state:', stateError)
      }

      // 로컬 상태 초기화
      setIsAuthorized(false)
      setUserInfo(null)

      // MusicKit 인스턴스 참조 제거 (다음 인증 시 새로 생성)
      musicRef.current = null
      setMusicKitInstance(null)

      console.log('Apple Music logout completed successfully')
    } catch (e: unknown) {
      console.error('Apple Music logout error:', e)
      // 에러가 발생해도 로컬 상태는 초기화
      setIsAuthorized(false)
      setUserInfo(null)
      musicRef.current = null
      setMusicKitInstance(null)
    }
  }

  const getAccessToken = async (): Promise<string | null> => {
    const music = musicRef.current
    if (!music) return null
    // prefer cached musicUserToken; don't call authorize() again here (that would open a popup)
    return music.musicUserToken ?? null
  }

  return {
    isAuthorized,
    isLoading,
    error,
    musicKitReady,
    userInfo, // 사용자 정보 추가
    authorize,
    unauthorize,
    getAccessToken,
    musicKitInstance,
  }
}
