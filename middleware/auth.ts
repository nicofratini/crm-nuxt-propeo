export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // If user is not logged in and trying to access a protected route
  if (!user.value && (to.path.startsWith('/dashboard') || to.path.startsWith('/admin'))) {
    return navigateTo('/auth/login')
  }

  // If user is logged in and trying to access auth pages
  if (user.value && (to.path.startsWith('/auth/'))) {
    return navigateTo('/dashboard')
  }
})