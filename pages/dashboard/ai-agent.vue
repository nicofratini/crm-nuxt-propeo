<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Configuration Agent IA</h1>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Chargement de vos agents...</p>
    </div>

    <div v-else-if="error" class="bg-red-100 text-red-700 p-4 rounded mb-6">
      {{ error }}
    </div>

    <div v-else-if="agents.length > 0" class="grid gap-6">
      <div v-for="agent in agents" :key="agent.agent_id" class="bg-white rounded-lg shadow p-6">
        <div class="mb-6">
          <h2 class="text-xl font-semibold mb-2">{{ agent.name }}</h2>
          <p class="text-gray-600 text-sm">ID: {{ agent.agent_id }}</p>
          <p class="text-gray-600 text-sm">Créé le: {{ formatDate(agent.created_at_unix_secs) }}</p>
        </div>

        <div class="border-t pt-4">
          <h3 class="font-medium mb-2">Informations créateur</h3>
          <p class="text-gray-600 text-sm">Nom: {{ agent.access_info.creator_name }}</p>
          <p class="text-gray-600 text-sm">Email: {{ agent.access_info.creator_email }}</p>
          <p class="text-gray-600 text-sm">Rôle: {{ agent.access_info.role }}</p>
        </div>
      </div>
    </div>

    <div v-else class="bg-gray-50 rounded-lg p-8 text-center">
      <p class="text-gray-600">Aucun agent IA ne vous a été assigné.</p>
      <p class="text-sm text-gray-500 mt-2">Contactez un administrateur pour obtenir l'accès à un agent.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AccessInfo {
  is_creator: boolean;
  creator_name: string;
  creator_email: string;
  role: string;
}

interface Agent {
  agent_id: string;
  name: string;
  created_at_unix_secs: number;
  access_info: AccessInfo;
}

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const agents = ref<Agent[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const formatDate = (unixTimestamp: number) => {
  return new Date(unixTimestamp * 1000).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const fetchAssignedAgents = async () => {
  if (!user.value) {
    loading.value = false;
    return;
  }
  
  try {
    // Get all agent assignments for the user
    const { data: assignments, error: err1 } = await supabase
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', user.value.id);

    if (err1) throw err1;

    // If no assignments found, return early
    if (!assignments || assignments.length === 0) {
      loading.value = false;
      return;
    }

    // Fetch the agent details from ElevenLabs
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': 'sk_c6ce660f7fe4911d0d903a694f1b2c6c9e10d67c20b5b561'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des agents (${response.status})`);
    }

    const data = await response.json();
    
    // Filter agents to only include those assigned to the user
    const assignedAgentIds = assignments.map(a => a.agent_id);
    agents.value = data.agents.filter((a: Agent) => assignedAgentIds.includes(a.agent_id));
    
    if (agents.value.length === 0) {
      error.value = "Aucun des agents assignés n'a été trouvé";
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Une erreur s'est produite";
    console.error('Error fetching assigned agents:', e);
  } finally {
    loading.value = false;
  }
};

// Fetch the assigned agents when component mounts
onMounted(() => {
  fetchAssignedAgents();
});

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
});
</script>