<template>
  <form @submit.prevent="$emit('submitForm', { email, password })" class="w-full max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
    <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">
      {{ mode === 'login' ? 'Connexion' : 'Inscription' }}
    </h2>

    <div class="mb-4">
      <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
      <input
        id="email"
        v-model="email"
        type="email"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        :disabled="loading"
      />
    </div>

    <div class="mb-6">
      <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
      <input
        id="password"
        v-model="password"
        type="password"
        required
        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        :disabled="loading"
      />
    </div>

    <button
      type="submit"
      class="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      :disabled="loading"
    >
      <span v-if="!loading">
        {{ mode === 'login' ? 'Se connecter' : "S'inscrire" }}
      </span>
      <span v-else>Chargement...</span>
    </button>

    <div class="mt-4 text-center text-sm text-gray-600">
      <NuxtLink
        :to="mode === 'login' ? '/auth/register' : '/auth/login'"
        class="text-blue-600 hover:text-blue-800"
      >
        {{ mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter' }}
      </NuxtLink>
    </div>
  </form>
</template>

<script setup lang="ts">
const props = defineProps<{
  mode: 'login' | 'register'
  loading?: boolean
}>()

const email = ref('')
const password = ref('')

defineEmits<{
  (e: 'submitForm', credentials: { email: string; password: string }): void
}>()
</script>