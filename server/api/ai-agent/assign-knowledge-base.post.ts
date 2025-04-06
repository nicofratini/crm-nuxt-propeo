import { defineEventHandler, readBody, createError } from 'h3';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
  try {
    // Verify authentication
    const user = await serverSupabaseUser(event);
    if (!user) {
      throw createError({ 
        statusCode: 401, 
        statusMessage: 'Authentication required' 
      });
    }

    // Read request body
    const body = await readBody<{ agentId: string; documentId: string }>(event);
    const { agentId, documentId } = body;

    if (!agentId || !documentId) {
      throw createError({ 
        statusCode: 400, 
        statusMessage: 'Agent ID and Document ID are required' 
      });
    }

    // Get API key
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw createError({ 
        statusCode: 500, 
        statusMessage: 'Server configuration error: ElevenLabs API Key missing' 
      });
    }

    // Verify permissions
    const supabase = await serverSupabaseClient(event);

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;

    const isAdmin = profile?.is_admin || false;

    // Check agent assignment if not admin
    if (!isAdmin) {
      const { data: agentAssignment, error: agentError } = await supabase
        .from('user_agents')
        .select('agent_id')
        .eq('user_id', user.id)
        .eq('agent_id', agentId)
        .maybeSingle();

      if (agentError) throw agentError;
      
      if (!agentAssignment) {
        throw createError({
          statusCode: 403,
          statusMessage: "Vous n'avez pas accès à cet agent"
        });
      }
    }

    // Check document access
    const { data: document, error: docError } = await supabase
      .from('knowledge_base_documents')
      .select('id, name')
      .eq('id', documentId)
      .maybeSingle();

    if (docError) throw docError;

    if (!document) {
      throw createError({
        statusCode: 404,
        statusMessage: "Document non trouvé"
      });
    }

    // First, remove any existing assignments for this agent
    const { error: deleteError } = await supabase
      .from('agent_knowledge_base')
      .delete()
      .eq('agent_id', agentId);

    if (deleteError) throw deleteError;

    // Get current agent configuration
    const getAgentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      }
    });

    if (!getAgentResponse.ok) {
      const errorData = await getAgentResponse.json().catch(() => ({}));
      throw createError({ 
        statusCode: getAgentResponse.status,
        statusMessage: errorData.detail || `Error fetching agent configuration: ${getAgentResponse.statusText}`
      });
    }

    const agentConfig = await getAgentResponse.json();

    // Prepare the knowledge base configuration
    const knowledgeBaseConfig = {
      type: 'file',
      id: documentId,
      name: document.name,
      usage_mode: 'auto'
    };

    // Update agent configuration
    const updatedConfig = {
      ...agentConfig,
      conversation_config: {
        ...agentConfig.conversation_config || {},
        agent: {
          ...agentConfig.conversation_config?.agent || {},
          prompt: {
            ...agentConfig.conversation_config?.agent?.prompt || {},
            knowledge_base: [knowledgeBaseConfig]
          }
        }
      }
    };

    const updateResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: 'PATCH',
      headers: {
        'xi-api-key': elevenLabsApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatedConfig)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json().catch(() => ({}));
      throw createError({ 
        statusCode: updateResponse.status,
        statusMessage: errorData.detail || `Error updating agent: ${updateResponse.statusText}`
      });
    }

    // Save new assignment in database
    const { error: insertError } = await supabase
      .from('agent_knowledge_base')
      .insert({
        agent_id: agentId,
        document_id: documentId
      });

    if (insertError) throw insertError;

    // Get the updated agent configuration to return
    const updatedAgentResponse = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      headers: {
        'xi-api-key': elevenLabsApiKey,
      }
    });

    if (!updatedAgentResponse.ok) {
      throw createError({ 
        statusCode: updatedAgentResponse.status,
        statusMessage: `Error fetching updated agent configuration: ${updatedAgentResponse.statusText}`
      });
    }

    const updatedAgentConfig = await updatedAgentResponse.json();

    return { 
      success: true,
      message: 'Base de connaissances assignée avec succès',
      agent: updatedAgentConfig
    };

  } catch (error: any) {
    // If it's already a H3 error, throw it as is
    if (error.statusCode) throw error;
    
    // Otherwise, create a new error
    throw createError({ 
      statusCode: error.status || 500,
      statusMessage: error.message || 'Internal server error'
    });
  }
});