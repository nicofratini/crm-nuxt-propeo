<template>
  <div class="min-h-screen flex bg-gray-100">
    <!-- Sidebar -->
    <div class="w-64 bg-gray-900 text-gray-100 flex flex-col h-screen fixed">
      <!-- App Name/Logo -->
      <div class="p-4 border-b border-gray-700">
        <h1 class="text-xl font-bold">Prospeo</h1>
      </div>

      <!-- User Info -->
      <div class="p-4 border-b border-gray-700">
        <p class="font-semibold">{{ profileStore.profile?.full_name || profileStore.profile?.email }}</p>
        <p v-if="profileStore.isAdmin" class="text-xs text-blue-400 font-medium">Administrateur</p>
        <p v-else class="text-xs text-gray-400">Utilisateur</p>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-2 py-4 space-y-1">
        <NuxtLink 
          to="/dashboard" 
          class="block px-4 py-2 rounded transition-colors duration-200"
          :class="route.path === '/dashboard' ? 'bg-gray-800 text-white' : 'hover:bg-gray-700'"
        >
          Dashboard
        </NuxtLink>
        <NuxtLink 
          to="/dashboard/properties" 
          class="block px-4 py-2 rounded transition-colors duration-200"
          :class="route.path === '/dashboard/properties' ? 'bg-gray-800 text-white' : 'hover:bg-gray-700'"
        >
          Propriétés
        </NuxtLink>
        <NuxtLink 
          to="/dashboard/ai-agent" 
          class="block px-4 py-2 rounded transition-colors duration-200"
          :class="route.path === '/dashboard/ai-agent' ? 'bg-gray-800 text-white' : 'hover:bg-gray-700'"
        >
          Agent IA
        </NuxtLink>
        <NuxtLink 
          to="/dashboard/calls" 
          class="block px-4 py-2 rounded transition-colors duration-200"
          :class="route.path === '/dashboard/calls' ? 'bg-gray-800 text-white' : 'hover:bg-gray-700'"
        >
          Appels
        </NuxtLink>
        <NuxtLink 
          to="/dashboard/calendar" 
          class="block px-4 py-2 rounded transition-colors duration-200"
          :class="route.path === '/dashboard/calendar' ? 'bg-gray-800 text-white' : 'hover:bg-gray-700'"
        >
          Calendrier
        </NuxtLink>
        <NuxtLink 
          v-if="profileStore.isAdmin"
          to="/admin" 
          class="block px-4 py-2 rounded transition-colors duration-200"
          :class="route.path.startsWith('/admin') ? 'bg-gray-800 text-white' : 'hover:bg-gray-700'"
        >
          Administration
        </NuxtLink>
      </nav>

      <!-- Logout Button -->
      <div class="p-4 mt-auto border-t border-gray-700">
        <button 
          @click="handleLogout" 
          class="w-full px-4 py-2 text-left rounded bg-red-600 hover:bg-red-700 text-white font-semibold transition duration-200"
        >
          Déconnexion
        </button>
      </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 ml-64">
      <div class="p-8">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const profileStore = useProfileStore()
const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    await router.push('/auth/login')
  } catch (err) {
    console.error('Error during logout:', err)
    await router.push('/auth/login')
  }
}
</script>