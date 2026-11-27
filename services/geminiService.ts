import { DoodleIdea } from "../types";

const fallbackIdeas: DoodleIdea[] = [
  {
    name: "Grumble-Scribble",
    description: "A stormy ink cloud with three shoes and a grumpy grin.",
    parts: ["Puffy ink cloud body", "Three mismatched shoes", "One giant eyeball"]
  },
  {
    name: "Zigzag Lobber",
    description: "A springy doodle gremlin that throws paper clips like meteors.",
    parts: ["Lightning-bolt arms", "Huge sneakers", "Paper clip satchel"]
  },
  {
    name: "Professor Ooze",
    description: "A slime blob that wears glasses and leaves math equations in puddles.",
    parts: ["Melty blob body", "Tiny square glasses", "Dripping pencil mustache"]
  }
];

const readViteEnv = (key: string): string | undefined => {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  return env?.[key]?.trim() || undefined;
};

/**
 * Optional local key for the upcoming Doodle Idea feature.
 * Note: For public production hosting, prefer proxying requests through a server endpoint
 * rather than bundling an API key into client-side assets.
 */
const getGeminiApiKey = () => readViteEnv("VITE_GEMINI_API_KEY");

export const hasGeminiApiKey = Boolean(getGeminiApiKey());

const getFallbackIdea = (): DoodleIdea => {
  const index = Math.floor(Math.random() * fallbackIdeas.length);
  return fallbackIdeas[index];
};

const getClient = async () => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  const { GoogleGenAI } = await import("@google/genai");
  return new GoogleGenAI({ apiKey });
};

export const generateMonsterIdea = async (): Promise<DoodleIdea> => {
  const ai = await getClient();
  if (!ai) {
    return getFallbackIdea();
  }

  try {
    const { Type } = await import("@google/genai");
    const response = await ai.models.generateContent({
      model: readViteEnv("VITE_GEMINI_MODEL") || "gemini-3-flash-preview",
      contents: "Create a creative idea for a 'Scribble Monster' that an 8-year-old would draw in their notebook. It should be weird and funny.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            parts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Visual features to draw"
            }
          },
          required: ["name", "description", "parts"]
        }
      }
    });

    return JSON.parse(response.text || "{}") as DoodleIdea;
  } catch (error) {
    console.warn("Falling back to local doodle ideas:", error);
    return getFallbackIdea();
  }
};
