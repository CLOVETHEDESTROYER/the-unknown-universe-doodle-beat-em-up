
import { GoogleGenAI, Type } from "@google/genai";
import { DoodleIdea } from "../types";

// Always use the specified initialization format for GoogleGenAI with process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMonsterIdea = async (): Promise<DoodleIdea> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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

  try {
    // response.text is a property, not a method, used correctly here
    return JSON.parse(response.text || '{}') as DoodleIdea;
  } catch (e) {
    return {
      name: "Grumble-Scribble",
      description: "A very messy cloud of ink with three shoes.",
      parts: ["Ink cloud body", "Three mismatched shoes", "One giant eyeball"]
    };
  }
};
