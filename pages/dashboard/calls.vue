<template>
  <div>
    <h1 class="text-2xl font-bold mb-6">Historique des Appels</h1>

    <div v-if="loading" class="text-center py-8">
      <p class="text-gray-600">Chargement des conversations...</p>
    </div>

    <div v-else-if="error" class="bg-red-100 text-red-700 p-4 rounded mb-6">
      {{ error }}
    </div>

    <div v-else-if="conversations.length > 0" class="space-y-4">
      <!-- Conversations List -->
      <div v-for="conversation in conversations" :key="conversation.conversation_id" 
        class="bg-white rounded-lg shadow overflow-hidden"
      >
        <div class="p-4">
          <!-- Header -->
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="font-semibold text-gray-900">{{ conversation.agent_name }}</h3>
              <p class="text-sm text-gray-500">ID: {{ conversation.conversation_id }}</p>
            </div>
            <div :class="{
              'bg-green-100 text-green-800': conversation.call_successful === 'success',
              'bg-red-100 text-red-800': conversation.call_successful === 'failure',
              'bg-gray-100 text-gray-800': conversation.call_successful === 'unknown'
            }" class="px-3 py-1 rounded-full text-xs font-medium">
              {{ getCallStatus(conversation.call_successful) }}
            </div>
          </div>

          <!-- Details -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <span class="text-gray-500">Date:</span>
              <p class="font-medium">{{ formatDate(conversation.start_time_unix_secs) }}</p>
            </div>
            <div>
              <span class="text-gray-500">Durée:</span>
              <p class="font-medium">{{ formatDuration(conversation.call_duration_secs) }}</p>
            </div>
            <div>
              <span class="text-gray-500">Messages:</span>
              <p class="font-medium">{{ conversation.message_count }}</p>
            </div>
            <div>
              <span class="text-gray-500">Statut:</span>
              <p class="font-medium capitalize">{{ conversation.status }}</p>
            </div>
          </div>

          <!-- Actions -->
          <div class="mt-4 flex justify-end">
            <button 
              @click="showTranscript(conversation)"
              class="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Voir la transcription
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="bg-gray-50 rounded-lg p-8 text-center">
      <p class="text-gray-600">Aucune conversation trouvée.</p>
      <p class="text-sm text-gray-500 mt-2">Les conversations apparaîtront ici une fois que votre agent aura effectué des appels.</p>
    </div>

    <!-- Transcript Modal -->
    <div v-if="showModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        <div class="p-6 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-semibold">Transcription de la conversation</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div class="p-6 overflow-y-auto flex-1">
          <div v-if="loadingTranscript" class="text-center py-8">
            <p class="text-gray-600">Chargement de la transcription...</p>
          </div>
          
          <div v-else-if="transcriptError" class="bg-red-100 text-red-700 p-4 rounded">
            {{ transcriptError }}
          </div>
          
          <div v-else-if="transcript.length" class="space-y-4">
            <div v-for="(message, index) in transcript" :key="index" 
              class="flex gap-4"
              :class="message.role === 'agent' ? 'justify-start' : 'justify-end'"
            >
              <div 
                class="max-w-[80%] rounded-lg p-3"
                :class="message.role === 'agent' ? 'bg-blue-50' : 'bg-gray-50'"
              >
                <div class="text-xs text-gray-500 mb-1">
                  {{ message.role === 'agent' ? 'Agent' : 'Client' }}
                </div>
                <div class="text-sm">{{ message.message }}</div>
                <div v-if="message.time_in_call_secs" class="text-xs text-gray-400 mt-1">
                  {{ formatDuration(message.time_in_call_secs) }}
                </div>
              </div>
            </div>
          </div>
          
          <div v-else class="text-center py-8">
            <p class="text-gray-600">Aucun message dans cette conversation.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Conversation {
  agent_id: string;
  agent_name: string;
  conversation_id: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  message_count: number;
  status: string;
  call_successful: 'success' | 'failure' | 'unknown';
}

interface Message {
  role: 'agent' | 'user';
  message: string | null;
  time_in_call_secs: number;
}

interface TranscriptResponse {
  transcript: Message[];
}

const supabase = useSupabaseClient();
const user = useSupabaseUser();

const conversations = ref<Conversation[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

// Modal state
const showModal = ref(false);
const selectedConversation = ref<Conversation | null>(null);
const transcript = ref<Message[]>([]);
const loadingTranscript = ref(false);
const transcriptError = ref<string | null>(null);

const formatDate = (unixTimestamp: number) => {
  return new Date(unixTimestamp * 1000).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDuration = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const getCallStatus = (status: string) => {
  switch (status) {
    case 'success':
      return 'Réussi';
    case 'failure':
      return 'Échoué';
    default:
      return 'Inconnu';
  }
};

const fetchConversations = async () => {
  if (!user.value) {
    loading.value = false;
    return;
  }

  try {
    // Get user's assigned agents
    const { data: assignments, error: err1 } = await supabase
      .from('user_agents')
      .select('agent_id')
      .eq('user_id', user.value.id);

    if (err1) throw err1;

    if (!assignments || assignments.length === 0) {
      loading.value = false;
      return;
    }

    // Fetch conversations for each assigned agent
    const allConversations: Conversation[] = [];
    
    for (const assignment of assignments) {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations?agent_id=${assignment.agent_id}`,
        {
          headers: {
            'xi-api-key': 'sk_c6ce660f7fe4911d0d903a694f1b2c6c9e10d67c20b5b561'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des conversations (${response.status})`);
      }

      const data = await response.json();
      allConversations.push(...data.conversations);
    }

    // Sort conversations by start time (most recent first)
    conversations.value = allConversations.sort(
      (a, b) => b.start_time_unix_secs - a.start_time_unix_secs
    );
  } catch (e) {
    error.value = e instanceof Error ? e.message : "Une erreur s'est produite";
    console.error('Error fetching conversations:', e);
  } finally {
    loading.value = false;
  }
};

const showTranscript = async (conversation: Conversation) => {
  selectedConversation.value = conversation;
  showModal.value = true;
  loadingTranscript.value = true;
  transcriptError.value = null;
  transcript.value = [];

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversation.conversation_id}`,
      {
        headers: {
          'xi-api-key': 'sk_c6ce660f7fe4911d0d903a694f1b2c6c9e10d67c20b5b561'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Erreur lors de la récupération de la transcription (${response.status})`);
    }

    const data = await response.json();
    transcript.value = data.transcript.filter((msg: Message) => msg.message !== null);
  } catch (e) {
    transcriptError.value = e instanceof Error ? e.message : "Une erreur s'est produite";
    console.error('Error fetching transcript:', e);
  } finally {
    loadingTranscript.value = false;
  }
};

const closeModal = () => {
  showModal.value = false;
  selectedConversation.value = null;
  transcript.value = [];
  transcriptError.value = null;
};

// Fetch conversations when component mounts
onMounted(() => {
  fetchConversations();
});

definePageMeta({
  layout: 'dashboard',
  middleware: ['auth']
});
</script>