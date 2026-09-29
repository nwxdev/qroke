import type { DeviceInfo } from '../../shared/types'
export interface DeviceHints {
  platform?: string
  platformVersion?: string
  mobile?: boolean
  model?: string
  fullVersionList?: { brand: string; version: string }[]
}
const clean = (value = '') =>
  value
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, '')
    .trim()
    .slice(0, 64)
export function identifyDevice(
  ua: string,
  hints: DeviceHints = {},
): Omit<DeviceInfo, 'view' | 'appMode' | 'appVersion'> {
  let platform = 'Não informado',
    platformVersion = '',
    model = clean(hints.model)
  if (/Android/i.test(ua) || hints.platform === 'Android') {
    platform = 'Android'
    const legacy = ua.match(
      /Android\s+([\d.]+)(?:;\s*(?:[a-z]{2}[-_][A-Z]{2};\s*)?([^)]*?)(?:\s+Build\/|\)))/,
    )
    model ||= clean(legacy?.[2])
    if (model === 'K') model = ''
    platformVersion = clean(hints.platformVersion || (legacy?.[2] === 'K' ? '' : legacy?.[1]))
  } else if (/iPhone|iPad|iPod/.test(ua)) {
    platform = 'iOS'
    platformVersion = (ua.match(/(?:CPU (?:iPhone )?OS|iPhone OS) ([\d_]+)/)?.[1] || '').replaceAll(
      '_',
      '.',
    )
    model ||= /iPad/.test(ua) ? 'iPad' : /iPhone/.test(ua) ? 'iPhone' : 'iPod'
  } else if (/Windows/.test(ua) || hints.platform === 'Windows') platform = 'Windows'
  else if (/CrOS/.test(ua)) platform = 'ChromeOS'
  else if (/Macintosh|Mac OS X/.test(ua) || hints.platform === 'macOS') platform = 'macOS'
  else if (/Tizen/i.test(ua)) platform = 'Tizen'
  else if (/Web0S|webOS/i.test(ua)) platform = 'webOS'
  else if (/Linux/.test(ua) || hints.platform === 'Linux') platform = 'Linux'
  let browser = 'Navegador',
    browserVersion = ''
  const browsers: [string, RegExp][] = [
    ['Edge', /(?:EdgA|EdgiOS|Edg)\/([\d.]+)/],
    ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
    ['Opera', /(?:OPR|OPiOS)\/([\d.]+)/],
    ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
    ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
    ['Safari', /Version\/([\d.]+).*Safari/],
  ]
  for (const [name, pattern] of browsers) {
    const match = ua.match(pattern)
    if (match) {
      browser = name
      browserVersion = match[1] || ''
      break
    }
  }
  const hintBrand = hints.fullVersionList?.find(
    (item) =>
      item.brand ===
      (
        { Chrome: 'Google Chrome', Edge: 'Microsoft Edge', Opera: 'Opera' } as Record<
          string,
          string
        >
      )[browser],
  )
  if (hintBrand) browserVersion = clean(hintBrand.version)
  if (/; wv\)/.test(ua)) browser += ' WebView'
  const kind: DeviceInfo['kind'] =
    /SmartTV|SMART-TV|HbbTV|Tizen|Web0S|webOS|Android TV|CrKey/i.test(ua)
      ? 'tv'
      : /iPad/.test(ua) || (platform === 'Android' && !(hints.mobile ?? /Mobile/.test(ua)))
        ? 'tablet'
        : /iPhone|iPod/.test(ua) || platform === 'Android'
          ? 'phone'
          : platform === 'Não informado'
            ? 'unknown'
            : 'computer'
  return { kind, platform, platformVersion, model, browser, browserVersion }
}
export function deviceLabel(info: Pick<DeviceInfo, 'kind' | 'platform' | 'model' | 'browser'>) {
  const kind = {
    phone: 'Celular',
    tablet: 'Tablet',
    computer: 'Computador',
    tv: 'TV',
    unknown: 'Aparelho',
  }[info.kind]
  return `${info.model || kind + ' ' + info.platform} · ${info.browser}`.slice(0, 60)
}
