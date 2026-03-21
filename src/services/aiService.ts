import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client
// Note: process.env.GEMINI_API_KEY is injected by Vite define in vite.config.ts
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * PROMPT TEMPLATES
 */

export const COMPRESSION_PROMPT = `
You are a legal data architect specializing in Indian Law. Your task is to compress the following legal text into a high-density structured format for a citizen's dashboard.
Remove all boilerplate (e.g., "Be it enacted by Parliament"), repetitions, and verbose legal jargon.

Extract:
1. Key Provisions (The core rules/sections)
2. Definitions (Crucial terms defined in the act)
3. Obligations (What entities or citizens MUST do)
4. Penalties (Specific consequences or fines for violations)
5. Stakeholders (Who is affected by this law)

Output ONLY a valid JSON object with these keys.
`;

export const CITIZEN_SUMMARY_PROMPT = `
You are a helpful legal guide for Indian citizens. 
Based on the provided legal data, answer the user's query in plain, simple English.
Focus on:
- "What does this mean for me?"
- "What are my rights?"
- "What should I be careful about?"

Avoid legal jargon. Use bullet points for readability. If the answer is not in the context, say you don't know based on the current document.
`;

/**
 * AI SERVICES
 */

export async function compressLegalText(text: string, onProgress?: (step: string) => void) {
  try {
    // Hierarchical Compression Logic
    // 1. Split text into manageable chunks (e.g., 15,000 characters ~ 4000 tokens)
    const CHUNK_SIZE = 15000;
    const chunks = [];
    for (let i = 0; i < text.length; i += CHUNK_SIZE) {
      chunks.push(text.slice(i, i + CHUNK_SIZE));
    }

    onProgress?.(`Processing ${chunks.length} chunks...`);

    // 2. Compress each chunk in parallel (or sequence if rate limited)
    const compressedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      onProgress?.(`Compressing chunk ${i + 1}/${chunks.length}...`);
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: `${COMPRESSION_PROMPT}\n\nTEXT CHUNK:\n${chunks[i]}` }] }],
        config: {
          responseMimeType: "application/json",
        },
      });
      try {
        compressedChunks.push(JSON.parse(response.text || "{}"));
      } catch (e) {
        console.warn("Failed to parse chunk JSON, skipping...", e);
      }
    }

    // 3. Final Hierarchical Merge
    onProgress?.("Generating final citizen impact analysis...");
    const mergePrompt = `
      You are a senior legislative analyst. You have been given several compressed summaries of parts of a new law.
      Your task is to merge them into a single, cohesive, high-density master summary for a citizen dashboard.
      
      Ensure you capture:
      - The overall Title of the Act
      - A one-sentence summary (oneLiner)
      - A comprehensive list of Key Provisions (KeyProvisions)
      - A combined list of Penalties & Obligations (Penalties)
      - All affected Stakeholders (Stakeholders)

      Output ONLY a valid JSON object.
    `;

    const finalResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ 
        parts: [{ 
          text: `${mergePrompt}\n\nCOMPRESSED CHUNKS:\n${JSON.stringify(compressedChunks)}` 
        }] 
      }],
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(finalResponse.text || "{}");
  } catch (error) {
    console.error("Compression Error:", error);
    throw error;
  }
}

export async function generateCitizenExplanation(query: string, context: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ 
        parts: [{ 
          text: `${CITIZEN_SUMMARY_PROMPT}\n\nCONTEXT DATA:\n${JSON.stringify(context)}\n\nUSER QUERY: ${query}` 
        }] 
      }],
    });
    return response.text || "I couldn't generate an explanation at this time.";
  } catch (error) {
    console.error("Explanation Error:", error);
    return "Error generating AI response. Please check your API key.";
  }
}

export async function getEmbeddings(text: string) {
  try {
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview", // Updated to a supported model
      contents: [text],
    });
    return result.embeddings[0].values;
  } catch (error) {
    console.error("Embedding Error:", error);
    throw error;
  }
}
