import { getRouterParam, createError } from 'h3'
import localStream from '../../../library/[id].get'
export default defineEventHandler((event) => {
  if (getRouterParam(event, 'provider') !== 'local')
    throw createError({ statusCode: 501, statusMessage: 'Esta plataforma usa seu próprio player.' })
  return localStream(event)
})
