<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Section Administration</h1>
    
    <!-- Agents List -->
    <div class="bg-white rounded-lg shadow p-6">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-xl font-semibold">Agents IA ElevenLabs</h2>
        <button 
          @click="fetchAgents" 
          class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          :disabled="loading"
        >
          <span v-if="!loading">Rafraîchir</span>
          <span v-else>Chargement...</span>
        </button>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="mb-4 p-4 bg-red-100 text-red-700 rounded">
        {{ error }}
      </div>

      <!-- Agents List -->
      <div v-if="agents.length" class="space-y-6">
        <div v-for="agent in agents" :key="agent.agent_id" 
          class="border border-gray-200 rounded-lg overflow-hidden"
        >
          <!-- Agent Header -->
          <div class="bg-gray-50 p-4 flex items-center justify-between">
            <div>
              <h3 class="text-lg font-semibold text-gray-900">{{ agent.name }}</h3>
              <p class="text-sm text-gray-500">ID: {{ agent.agent_id }}</p>
            </div>
            <span class="px-3 py-1 text-xs font-medium rounded-full"
              :class="agent.access_info.role === 'owner' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'"
            >
              {{ agent.access_info.role }}
            </span>
          </div>

          <!-- Agent Content -->
          <div class="p-4">
            <div class="mb-4">
              <p class="text-sm text-gray-600">Créé le: {{ formatDate(agent.created_at_unix_secs) }}</p>
              <p class="text-sm text-gray-600">Créateur: {{ agent.access_info.creator_name }}</p>
            </div>

            <!-- User Assignment Section -->
            <div class="mt-4 border-t pt-4">
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-gray-700">Utilisateurs assignés</label>
                <button 
                  @click="openAssignmentModal(agent)"
                  class="text-sm text-blue-600 hover:text-blue-800"
                >
                  Gérer les assignations
                </button>
              </div>
              
              <!-- Assigned Users List -->
              <div class="mt-2 flex flex-wrap gap-2">
                <div v-for="userId in selectedUsers[agent.agent_id] || []" :key="userId"
                  class="bg-gray-100 px-3 py-1 rounded-full text-sm text-gray-700 flex items-center gap-2"
                >
                  {{ getUserEmail(userId) }}
                </div>
                <div v-if="!selectedUsers[agent.agent_id]?.length" class="text-sm text-gray-500 italic">
                  Aucun utilisateur assigné
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="!loading" class="text-center py-8">
        <div class="mx-auto h-12 w-12 text-gray-400">
          <svg class="h-full w-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 20h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="mt-2 text-sm font-medium text-gray-900">Aucun agent trouvé</h3>
        <p class="mt-1 text-sm text-gray-500">Commencez par créer un agent dans ElevenLabs.</p>
      </div>
    </div>

    <!-- Assignment Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div class="p-6">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">Assigner des utilisateurs</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div class="mb-4">
            <p class="text-sm text-gray-600">Agent: {{ selectedAgent?.name }}</p>
          </div>

          <!-- Users Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Sélectionner les utilisateurs
            </label>
            <div class="border border-gray-300 rounded-lg max-h-60 overflow-y-auto">
              <div v-for="user in users" :key="user.id" class="p-2 hover:bg-gray-50">
                <label class="flex items-center space-x-3">
                  <input 
                    type="checkbox" 
                    :value="user.id"
                    v-model="tempSelectedUsers"
                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  >
                  <span class="text-sm text-gray-700">{{ user.email }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Modal Actions -->
          <div class="flex justify-end space-x-3">
            <button 
              @click="closeModal"
              class="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              :disabled="isAssigning[selectedAgent?.agent_id || '']"
            >
              Annuler
            </button>
            <button 
              @click="saveAssignments"
              class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-2"
              :disabled="isAssigning[selectedAgent?.agent_id || '']"
            >
              <span v-if="!isAssigning[selectedAgent?.agent_id || '']">Enregistrer</span>
              <span v-else class="flex items-center space-x-2">
                <svg class="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>En cours...</span>
              </span>
            </button>
          </div>
        </div>
      </div>
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

interface AgentsResponse {
  agents: Agent[];
  next_cursor: string | null;
  has_more: boolean;
}

interface User {
  id: string;
  email: string;
}

const supabase = useSupabaseClient();
const agents = ref<Agent[]>([]);
const users = ref<User[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const selectedUsers = ref<Record<string, string[]>>({});
const isAssigning = ref<Record<string, boolean>>({});

// Modal state
const showModal = ref(false);
const selectedAgent = ref<Agent | null>(null);
const tempSelectedUsers = ref<string[]>([]);

const formatDate = (unixTimestamp: number) => {
  return new Date(unixTimestamp * 1000).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getUserEmail = (userId: string): string => {
  return users.value.find(u => u.id === userId)?.email || userId;
};

const fetchAgents = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/convai/agents', {
      headers: {
        'xi-api-key': 'sk_c6ce660f7fe4911d0d903a694f1b2c6c9e10d67c20b5b561'
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération des agents (${response.status})`);
    }

    const data: AgentsResponse = await response.json();
    agents.value = data.agents;

    // Fetch current assignments for these agents
    await fetchCurrentAssignments();
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Une erreur s'est produite";
    console.error('Error fetching agents:', e);
  } finally {
    loading.value = false;
  }
};

const fetchUsers = async () => {
  try {
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, email');
    
    if (err) throw err;
    users.value = data;
  } catch (e) {
    console.error('Error fetching users:', e);
    error.value = "Erreur lors de la récupération des utilisateurs";
  }
};

const fetchCurrentAssignments = async () => {
  try {
    const { data, error: err } = await supabase
      .from('user_agents')
      .select('agent_id, user_id');
    
    if (err) throw err;

    // Reset assignments
    selectedUsers.value = {};
    
    // Group assignments by agent_id
    data.forEach(assignment => {
      if (!selectedUsers.value[assignment.agent_id]) {
        selectedUsers.value[assignment.agent_id] = [];
      }
      selectedUsers.value[assignment.agent_id].push(assignment.user_id);
    });
  } catch (e) {
    console.error('Error fetching assignments:', e);
  }
};

const openAssignmentModal = (agent: Agent) => {
  selectedAgent.value = agent;
  tempSelectedUsers.value = selectedUsers.value[agent.agent_id] || [];
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  selectedAgent.value = null;
  tempSelectedUsers.value = [];
};

const saveAssignments = async () => {
  if (!selectedAgent.value) return;
  
  const agentId = selectedAgent.value.agent_id;
  
  try {
    isAssigning.value[agentId] = true;
    error.value = null;

    // First, remove all existing assignments for this agent
    const { error: deleteError } = await supabase
      .from('user_agents')
      .delete()
      .eq('agent_id', agentId);
    
    if (deleteError) throw deleteError;

    // Then, create new assignments for selected users
    if (tempSelectedUsers.value.length > 0) {
      const assignments = tempSelectedUsers.value.map(userId => ({
        user_id: userId,
        agent_id: agentId
      }));

      const { error: insertError } = await supabase
        .from('user_agents')
        .insert(assignments);
      
      if (insertError) throw insertError;
    }

    // Update the local state
    selectedUsers.value[agentId] = [...tempSelectedUsers.value];
    closeModal();
  } catch (e) {
    console.error('Error updating assignments:', e);
    error.value = "Erreur lors de l'assignation de l'agent";
  } finally {
    isAssigning.value[agentId] = false;
  }
};

// Fetch initial data
onMounted(async () => {
  await Promise.all([fetchAgents(), fetchUsers()]);
});

definePageMeta({
  layout: 'dashboard',
  middleware: 'auth'
});
</script>