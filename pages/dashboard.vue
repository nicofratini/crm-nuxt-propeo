<template>
  <div class="min-h-screen bg-gray-50 py-8">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="bg-white rounded-lg shadow px-5 py-6 sm:px-6">
        <div v-if="profileStore.loading" class="text-center py-4">
          <p class="text-gray-500">Chargement...</p>
        </div>
        
        <div v-else-if="profileStore.error" class="text-center py-4">
          <p class="text-red-500">{{ profileStore.error }}</p>
        </div>

        <div v-else-if="!profileStore.profile" class="text-center py-4">
          <p class="text-gray-700 mb-4">Votre profil n'est pas encore configuré.</p>
          <p class="text-sm text-gray-500">Veuillez contacter un administrateur pour configurer votre profil.</p>
        </div>
        
        <div v-else>
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold text-gray-900">
              Bienvenue, {{ profileStore.fullName }}
            </h1>
            <span v-if="profileStore.isAdmin" class="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Admin
            </span>
          </div>

          <div class="border-t border-gray-200 pt-6">
            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h2 class="text-lg font-medium text-gray-900 mb-2">Informations du profil</h2>
                <div class="bg-gray-50 px-4 py-5 rounded-lg">
                  <dl class="space-y-3">
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Email</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ profileStore.profile?.email }}</dd>
                    </div>
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Nom complet</dt>
                      <dd class="mt-1 text-sm text-gray-900">{{ profileStore.profile?.full_name || 'Non défini' }}</dd>
                    </div>
                    <div>
                      <dt class="text-sm font-medium text-gray-500">Membre depuis</dt>
                      <dd class="mt-1 text-sm text-gray-900">
                        {{ new Date(profileStore.profile?.created_at || '').toLocaleDateString() }}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div v-if="profileStore.isAdmin">
                <h2 class="text-lg font-medium text-gray-900 mb-2">Section Admin</h2>
                <div class="bg-gray-50 px-4 py-5 rounded-lg">
                  <p class="text-sm text-gray-600">
                    Vous avez accès aux fonctionnalités d'administration.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const user = useSupabaseUser()
const router = useRouter()
const profileStore = useProfileStore()

// Redirect if not authenticated
watchEffect(() => {
  if (!user.value) {
    router.push('/auth/login')
  }
})

// Fetch profile data when component mounts
onMounted(async () => {
  if (user.value) {
    await profileStore.fetchProfile()
  }
})

// Clear profile on unmount
onUnmounted(() => {
  profileStore.clearProfile()
})
</script>