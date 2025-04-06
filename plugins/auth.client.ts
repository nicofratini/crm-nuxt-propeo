import { useNuxtApp, useSupabaseUser } from '#imports'
import { useProfileStore } from '~/stores/profile'

export default defineNuxtPlugin(async (nuxtApp) => {
  // Ensure we only run this on client side
  if (!process.client) {
    return
  }

  try {
    const { $supabase } = useNuxtApp()
    
    // Wait for Supabase client to be ready
    if (!$supabase?.auth) {
      console.warn('Waiting for Supabase client to initialize...')
      return
    }

    // Initialize auth with proper error handling
    const { data: { session }, error: sessionError } = await $supabase.auth.getSession()
    
    if (sessionError) {
      console.error('Failed to get session:', sessionError.message)
      return
    }
    
    const user = useSupabaseUser()
    const profileStore = useProfileStore()

    // Watch for user changes with error handling
    watch(user, async (newUser) => {
      try {
        if (newUser) {
          await profileStore.fetchProfile()
        } else {
          profileStore.clearProfile()
        }
      } catch (error) {
        console.error('Error handling user change:', error)
      }
    }, { immediate: true })
  } catch (error) {
    console.error('Auth plugin initialization error:', error)
  }
})