import { defineEventHandler, readBody } from 'h3';
import OpenAI from 'openai';

interface ExtractedProperty {
  address: string;
  city: string;
  type: 'apartment' | 'house';
  price: number;
  surface: number;
  bedrooms?: number;
  description?: string;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const extractPropertyWithAI = async (html: string): Promise<ExtractedProperty> => {
  const prompt = `
Extract real estate property information from this HTML content and return it in this exact JSON format:
{
  "address": "street address",
  "city": "city name",
  "type": "apartment or house",
  "price": number in euros,
  "surface": number in square meters,
  "bedrooms": number of bedrooms (optional),
  "description": "property description" (optional)
}

Only extract information you're confident about. Required fields are: address, city, type, price, and surface.

HTML Content:
${html}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "You are a real estate data extraction expert. Extract property information from HTML and format it as JSON. Only include fields where you're confident about the extracted information."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0
  });

  try {
    const content = completion.choices[0].message.content;
    // Find the JSON object in the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Validate required fields
    if (!result.address) throw new Error("Adresse non trouvée");
    if (!result.city) throw new Error("Ville non trouvée");
    if (!result.type || !['apartment', 'house'].includes(result.type)) throw new Error("Type de bien non valide");
    if (!result.price || typeof result.price !== 'number') throw new Error("Prix non trouvé ou invalide");
    if (!result.surface || typeof result.surface !== 'number') throw new Error("Surface non trouvée ou invalide");

    return {
      address: result.address,
      city: result.city,
      type: result.type as 'apartment' | 'house',
      price: result.price,
      surface: result.surface,
      bedrooms: result.bedrooms,
      description: result.description
    };
  } catch (error) {
    throw new Error(`Erreur lors de l'extraction des données: ${error.message}`);
  }
};

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { url } = body;

    if (!url || typeof url !== 'string') {
      throw new Error('URL is required');
    }

    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: ${response.status}`);
    }

    const html = await response.text();
    
    // Extract property information using OpenAI
    const property = await extractPropertyWithAI(html);

    console.log('Successfully extracted property:', property);
    return { success: true, data: property };
  } catch (error) {
    console.error('Error scraping property:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Une erreur s'est produite"
    };
  }
});