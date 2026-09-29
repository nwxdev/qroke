export default defineEventHandler((event) => ({
  authorized: !useRuntimeConfig().accessRequired || !!event.context.qrokeAccess,
  role: event.context.qrokeAccess?.role || null,
}))
