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

export const hasGeminiApiKey = Boolean(process.env.API_KEY || process.env.GEMINI_API_KEY);

const getFallbackIdea = (): DoodleIdea => {
  const index = Math.floor(Math.random() * fallbackIdeas.length);
  return fallbackIdeas[index];
};

const getClient = async () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
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
      model: "gemini-3-flash-preview",
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
