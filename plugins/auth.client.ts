export default defineNuxtPlugin(async () => {
  const user = useSupabaseUser()
  const profileStore = useProfileStore()

  watch(user, async () => {
    if (user.value) {
      await profileStore.fetchProfile()
    } else {
      profileStore.clearProfile()
    }
  }, { immediate: true })
})