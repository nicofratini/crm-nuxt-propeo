import { useSupabaseUser, useSupabaseClient } from '#imports'
import { navigateTo } from '#app'

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run auth checks on client side to prevent hydration mismatches
  if (process.server) {
    return
  }

  try {
    const supabase = useSupabaseClient()
    if (!supabase?.auth) {
      console.warn('Waiting for Supabase client to initialize...')
      return navigateTo('/auth/login')
    }
    
    // Get current session with error handling
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Session error:', sessionError.message)
      return navigateTo('/auth/login')
    }

    // If user is not logged in and trying to access a protected route
    if (!session && (to.path.startsWith('/dashboard') || to.path.startsWith('/admin'))) {
      return navigateTo('/auth/login')
    }

    // If user is logged in and trying to access auth pages
    if (session && to.path.startsWith('/auth/')) {
      try {
        const user = useSupabaseUser()
        
        // Enhanced check for valid user ID
        if (!user.value?.id || typeof user.value.id !== 'string' || user.value.id.trim() === '') {
          console.warn('Invalid or missing user ID')
          return navigateTo('/auth/login')
        }

        // Get user profile to check admin status
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin, super_admin')
          .eq('id', user.value.id)
          .maybeSingle()

        if (profileError) {
          console.error('Profile fetch error:', profileError.message)
          return navigateTo('/auth/login')
        }

        // Handle case where profile doesn't exist
        if (!profile) {
          console.warn('Profile not found')
          return navigateTo('/auth/login')
        }

        // Check admin access rights
        if (to.path.startsWith('/admin') && !profile.super_admin) {
          console.warn('Unauthorized access attempt to admin area')
          return navigateTo('/dashboard')
        }

        // Redirect based on user role
        let targetPath = '/dashboard'
        if (profile.super_admin) {
          targetPath = '/admin'
        }

        if (to.path.startsWith('/auth/') && to.path !== targetPath) {
          return navigateTo(targetPath)
        }
      } catch (error) {
        console.error('Profile check error:', error)
        return navigateTo('/auth/login')
      }
    }
  } catch (error) {
    console.error('Auth middleware error:', error)
    return navigateTo('/auth/login')
  }
})