import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
const logo = (await readFile('public/brand/qroke-dark.png')).toString('base64')
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  })
  await page.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
 *{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px}
 body{position:relative;overflow:hidden;background:#101214;color:#f4f2eb;font-family:Arial,sans-serif;text-align:center}
 .ring{position:absolute;width:410px;height:410px;border:2px solid #c4f3322e;border-radius:50%;left:-220px;top:-185px;box-shadow:0 0 0 42px #c4f33208,0 0 0 84px #c4f33206}
 .ring.right{left:auto;top:auto;bottom:-270px;right:-180px;border-color:#ff784a66}
 .spark{position:absolute;color:#c4f332;font-size:58px;left:145px;top:355px;transform:rotate(-12deg)}.spark.right{left:auto;right:140px;top:145px;color:#ff784a;font-size:46px}
 .logo{position:relative;width:600px;height:220px;object-fit:contain;margin:65px auto 0;display:block}
 h1{position:relative;font-size:48px;letter-spacing:-1.5px;line-height:1.1;margin:23px 0 22px}
 p{position:relative;font-size:28px;margin:0;color:#c7ccce}
 .domain{display:inline-block;border:1px solid #c4f33266;background:#c4f33210;border-radius:40px;padding:12px 24px;margin-top:34px;color:#c4f332;font-size:22px;font-weight:bold}
 .bar{height:5px;position:absolute;bottom:0;left:0;right:0;background:linear-gradient(90deg,#c4f332 65%,#ff784a 65%)}
 </style></head><body><div class="ring"></div><div class="ring right"></div><span class="spark">✦</span><span class="spark right">♪</span><img class="logo" alt="QRokê" src="data:image/png;base64,${logo}"><h1>Sua música faz a festa.</h1><p>Música · Karaokê · QR Code</p><div class="domain">qroke.com.br</div><div class="bar"></div></body></html>`)
  await page.locator('img').evaluate((el) => el.decode())
  await page.screenshot({ path: 'public/brand/qroke-share-v2.jpg', type: 'jpeg', quality: 90 })
} finally {
  await browser.close()
}
