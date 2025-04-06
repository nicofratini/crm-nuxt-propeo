import { defineEventHandler, createError } from 'h3';
import { serverSupabaseClient, serverSupabaseUser } from '#supabase/server';

export default defineEventHandler(async (event) => {
  try {
    // Get Supabase client first
    const supabase = await serverSupabaseClient(event);

    // Get authenticated user with error handling
    const user = await serverSupabaseUser(event);
    if (!user) {
      console.error('[API KB List] Auth session missing!');
      throw createError({ 
        statusCode: 401, 
        statusMessage: 'Authentication required' 
      });
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[API KB List] Error fetching profile:', profileError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching user profile'
      });
    }

    const isAdmin = profile?.is_admin ?? false;

    // Get API key from environment
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      console.error('[API KB List] ElevenLabs API Key missing on server!');
      throw createError({ 
        statusCode: 500, 
        statusMessage: 'Server configuration error: ElevenLabs API Key missing' 
      });
    }

    // Get documents from Supabase
    const query = supabase
      .from('knowledge_base_documents')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by user if not admin
    if (!isAdmin) {
      query.eq('user_id', user.id);
    }

    const { data: documents, error: dbError } = await query;

    if (dbError) {
      console.error('[API KB List] Database error:', dbError);
      throw createError({
        statusCode: 500,
        statusMessage: 'Error fetching documents from database'
      });
    }

    // Get full document details from ElevenLabs
    const documentDetails = [];
    for (const doc of documents) {
      try {
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/knowledge-base/${doc.id}`, {
          headers: {
            'xi-api-key': elevenLabsApiKey,
          }
        });

        if (response.ok) {
          const data = await response.json();
          documentDetails.push(data);
        } else {
          console.error(`[API KB List] Failed to fetch document ${doc.id} from ElevenLabs:`, await response.text());
          // Delete from Supabase if not found in ElevenLabs
          if (response.status === 404) {
            await supabase
              .from('knowledge_base_documents')
              .delete()
              .eq('id', doc.id);
          }
        }
      } catch (error) {
        console.error(`[API KB List] Error fetching document ${doc.id}:`, error);
      }
    }

    return { 
      success: true, 
      documents: documentDetails,
      isAdmin
    };

  } catch (error: any) {
    console.error('[API KB List] Error:', error);
    
    // If it's already a H3 error, throw it as is
    if (error.statusCode) throw error;
    
    // Otherwise, create a new error
    throw createError({ 
      statusCode: error.status || 500,
      statusMessage: error.message || 'Internal server error'
    });
  }
});