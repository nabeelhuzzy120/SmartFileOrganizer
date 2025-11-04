
import { GoogleGenAI } from "@google/genai";
import { CATEGORIES } from '../constants';
import { FileCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const classifyFile = async (fileName: string): Promise<FileCategory> => {
  try {
    const prompt = `You are an expert file organizer. Classify the following file name into one of these categories: ${CATEGORIES.join(', ')}.
    File name: "${fileName}"
    
    Respond with ONLY the category name and nothing else. If you are unsure, classify it as "Other".`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const category = response.text.trim() as FileCategory;
    
    if (CATEGORIES.includes(category)) {
      return category;
    }
    
    console.warn(`Gemini returned an unexpected category: "${category}". Defaulting to "Other".`);
    return 'Other';

  } catch (error) {
    console.error("Error classifying file with Gemini:", error);
    // Fallback to a default category in case of an API error
    return 'Other';
  }
};
