import { describe, expect, it } from 'vitest'
import { identifyDevice, deviceLabel } from '../app/utils/device-identity'
describe('identificação de aparelhos', () => {
  it('usa modelo e versões disponibilizados pelo Android', () => {
    const info = identifyDevice(
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome/146.0.0.0 Mobile Safari/537.36',
      {
        platform: 'Android',
        mobile: true,
        model: 'SM-S921B',
        platformVersion: '16.0.0',
        fullVersionList: [
          { brand: 'Not A Brand', version: '99' },
          { brand: 'Google Chrome', version: '146.0.7777.10' },
        ],
      },
    )
    expect(info).toMatchObject({
      kind: 'phone',
      platform: 'Android',
      platformVersion: '16.0.0',
      model: 'SM-S921B',
      browser: 'Chrome',
      browserVersion: '146.0.7777.10',
    })
    expect(deviceLabel(info)).toBe('SM-S921B · Chrome')
  })
  it('não inventa modelo/versão de Android reduzido nem versão real do Windows', () => {
    expect(
      identifyDevice('Mozilla/5.0 (Linux; Android 10; K) Chrome/146.0.0.0 Mobile'),
    ).toMatchObject({ model: '', platformVersion: '', kind: 'phone' })
    expect(
      identifyDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/146.0.0.0 Edg/146.0.1.2'),
    ).toMatchObject({ platform: 'Windows', platformVersion: '', browser: 'Edge' })
  })
  it('distingue Safari/iPhone, Samsung Internet, tablet e TV', () => {
    expect(
      identifyDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) Version/18.5 Mobile/15E148 Safari/604.1',
      ),
    ).toMatchObject({
      kind: 'phone',
      model: 'iPhone',
      platform: 'iOS',
      platformVersion: '18.5',
      browser: 'Safari',
    })
    expect(
      identifyDevice(
        'Mozilla/5.0 (Linux; Android 14; SM-X700 Build/UP1A) SamsungBrowser/25.0 Chrome/121.0.0.0 Safari/537.36',
      ),
    ).toMatchObject({ kind: 'tablet', model: 'SM-X700', browser: 'Samsung Internet' })
    expect(identifyDevice('Mozilla/5.0 (SMART-TV; Linux; Tizen 7.0)')).toMatchObject({
      kind: 'tv',
      platform: 'Tizen',
    })
  })
  it('mantém fallback para navegadores não identificados', () => {
    expect(identifyDevice('')).toMatchObject({
      kind: 'unknown',
      browser: 'Navegador',
      platform: 'Não informado',
      model: '',
    })
  })
})
