export type YoutubeAvailability = {
  status?: { embeddable?: boolean; privacyStatus?: string; uploadStatus?: string }
  contentDetails?: {
    regionRestriction?: { allowed?: string[]; blocked?: string[] }
    contentRating?: { ytRating?: string }
  }
}
export function youtubeRegion(value = 'BR') {
  return /^[A-Z]{2}$/.test(value.toUpperCase()) ? value.toUpperCase() : 'BR'
}
export function youtubeAvailable(video: YoutubeAvailability, region = 'BR', unlisted = false) {
  const status = video.status
  if (
    !status?.embeddable ||
    !(unlisted ? ['public', 'unlisted'] : ['public']).includes(status.privacyStatus || '')
  )
    return false
  if (status.uploadStatus && status.uploadStatus !== 'processed') return false
  if (video.contentDetails?.contentRating?.ytRating === 'ytAgeRestricted') return false
  const restriction = video.contentDetails?.regionRestriction,
    country = youtubeRegion(region)
  return (
    (!restriction?.allowed || restriction.allowed.includes(country)) &&
    !restriction?.blocked?.includes(country)
  )
}
