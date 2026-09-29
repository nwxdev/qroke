export default defineEventHandler((event) => ({
  authorized: event.context.qrokeScoped
    ? !!event.context.qrokeMembership
    : !useRuntimeConfig().accessRequired || !!event.context.qrokeAccess,
  role: event.context.qrokeAccess?.role || null,
}))
