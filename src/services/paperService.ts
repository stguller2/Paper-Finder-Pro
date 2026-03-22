import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface PaperInfo {
  doi: string | null;
  title: string;
  authors: string;
  journal: string;
  year: string;
  confidence: number;
  abstract?: string | null;
}

export async function findPaperDoi(citation: string): Promise<PaperInfo> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract or find the DOI for the following research paper citation. 
    The input might be a messy citation, a long text including an abstract, or just a title.
    Focus on extracting the core metadata (Title, Authors, Journal, Year) and finding the correct DOI.
    If the DOI is not explicitly in the text, use your knowledge to find the most likely DOI.
    
    Return the result as a JSON object with the following fields:
    - doi: the DOI string (e.g., "10.1016/S1352-2310(98)00256-4") or null if absolutely not found
    - title: the title of the paper (clean and concise)
    - authors: the authors of the paper
    - journal: the journal name
    - year: the publication year
    - confidence: a number from 0 to 1 representing your confidence in the DOI
    - abstract: a very brief summary of the paper (1-2 sentences) if known

    Citation/Text: "${citation}"`,
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const data = JSON.parse(response.text || "{}");
    return {
      doi: data.doi || null,
      title: data.title || "Unknown Title",
      authors: data.authors || "Unknown Authors",
      journal: data.journal || "Unknown Journal",
      year: data.year || "Unknown Year",
      confidence: data.confidence || 0,
      abstract: data.abstract || null,
    };
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Could not parse the paper information.");
  }
}

export async function extractReferencesFromPdf(pdfBase64: string): Promise<PaperInfo[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
      {
        text: `Please look at the "References" or "Bibliography" section of this paper. 
        Extract all cited papers and find their DOIs.
        Return the result as a JSON array of objects, each with:
        - doi: the DOI string or null
        - title: the title of the cited paper
        - authors: the authors
        - journal: the journal name
        - year: the publication year
        - confidence: confidence in the DOI (0-1)
        
        Only return the JSON array.`,
      },
    ],
    config: {
      responseMimeType: "application/json",
    },
  });

  try {
    const data = JSON.parse(response.text || "[]");
    return Array.isArray(data) ? data.map((item: any) => ({
      doi: item.doi || null,
      title: item.title || "Unknown Title",
      authors: item.authors || "Unknown Authors",
      journal: item.journal || "Unknown Journal",
      year: item.year || "Unknown Year",
      confidence: item.confidence || 0,
    })) : [];
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Could not extract references from the PDF.");
  }
}
