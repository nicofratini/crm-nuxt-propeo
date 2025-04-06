<template>
  <div class="w-full px-4">
    <AuthForm
      mode="login"
      :loading="isLoading"
      @submit-form="handleLogin"
    />
    <div
      v-if="errorMessage"
      class="mt-4 p-4 text-red-700 bg-red-100 rounded-md max-w-md mx-auto text-center"
    >
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup lang="ts">
const supabase = useSupabaseClient()
const router = useRouter()

const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async (credentials: { email: string; password: string }) => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    
    const { error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) {
      errorMessage.value = error.message
      return
    }

    await router.push('/dashboard')
  } catch (err) {
    errorMessage.value = "Une erreur s'est produite lors de la connexion"
  } finally {
    isLoading.value = false
  }
}

definePageMeta({
  layout: 'auth'
})
</script>