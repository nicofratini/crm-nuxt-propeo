import { ref } from 'vue';
import { useSupabaseClient } from '#imports';

export interface Property {
  id: string;
  user_id: string;
  address: string;
  city: string;
  type: 'apartment' | 'house';
  price: number;
  surface: number;
  bedrooms?: number;
  description?: string;
  source: 'url' | 'csv' | 'pdf';
  source_url?: string;
  created_at: string;
  updated_at: string;
}

export function useProperties() {
  const supabase = useSupabaseClient();
  const properties = ref<Property[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchProperties = async () => {
    loading.value = true;
    error.value = null;

    try {
      const { data, error: err } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (err) throw err;
      properties.value = (data || []).filter((p): p is Property => p !== null);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Une erreur s'est produite";
      console.error('Error fetching properties:', e);
    } finally {
      loading.value = false;
    }
  };

  const createProperty = async (property: Omit<Property, 'id' | 'created_at' | 'updated_at' | 'user_id'>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Non authentifié');
      }

      const { data, error: err } = await supabase
        .from('properties')
        .insert({
          ...property,
          user_id: session.user.id
        })
        .select()
        .single();

      if (err) throw err;
      if (data) {
        properties.value = [data, ...properties.value];
      }
      return data;
    } catch (e) {
      throw e;
    }
  };

  const deleteProperty = async (id: string) => {
    try {
      const { error: err } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (err) throw err;
      properties.value = properties.value.filter(p => p.id !== id);
    } catch (e) {
      throw e;
    }
  };

  const updateProperty = async (property: Partial<Property> & { id: string }) => {
    try {
      const { data, error: err } = await supabase
        .from('properties')
        .update(property)
        .eq('id', property.id)
        .select()
        .single();

      if (err) throw err;
      if (data) {
        const index = properties.value.findIndex(p => p.id === property.id);
        if (index !== -1) {
          properties.value = [
            ...properties.value.slice(0, index),
            data,
            ...properties.value.slice(index + 1)
          ];
        }
      }
      return data;
    } catch (e) {
      throw e;
    }
  };

  const scanWebsite = async (url: string) => {
    try {
      const response = await fetch('/api/scrape-property', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error(`Erreur lors de la récupération des données (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Une erreur s'est produite");
      }

      // Save the extracted property to the database
      const property = await createProperty({
        ...result.data,
        source: 'url',
        source_url: url
      });

      return { success: true, data: property };
    } catch (error) {
      console.error('Error scanning website:', error);
      throw new Error(error instanceof Error ? error.message : "Une erreur s'est produite lors de l'analyse du site");
    }
  };

  return {
    properties,
    loading,
    error,
    fetchProperties,
    createProperty,
    updateProperty,
    deleteProperty,
    scanWebsite
  };
}