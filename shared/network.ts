export interface InviteStatus {
  url: string
  status: 'ok' | 'updated' | 'unreachable' | 'unconfigured'
  message: string
  checkedAt: number
}
