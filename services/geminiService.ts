
import { GoogleGenAI, Type } from "@google/genai";
import { Stock, GroundingSource } from "../types";

/**
 * ฟังก์ชันดึงข้อมูลราคาหุ้นแบบ Batch พร้อมระบบ Retry ภายใน
 */
export const fetchGeminiMarketDataBatch = async (symbols: string[], retryCount = 0): Promise<{ data: any[], sources: GroundingSource[] }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const querySymbols = symbols.join(", ");
  
  // Prompt ที่กระชับที่สุดเพื่อลด RPM Load
  const prompt = `Thai Stocks: ${querySymbols}. Get current price and %change from Google Finance/SET. Output JSON.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            stocks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  changePercent: { type: Type.NUMBER },
                  lastTradeTime: { type: Type.STRING }
                },
                required: ["symbol", "price", "changePercent"]
              }
            }
          },
          required: ["stocks"]
        }
      }
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources: GroundingSource[] = groundingChunks
      ?.map((chunk: any) => ({
        title: chunk.web?.title || "Google Finance",
        uri: chunk.web?.uri || ""
      })).filter((s: GroundingSource) => s.uri !== "") || [];

    const resultData = JSON.parse(response.text || '{"stocks":[]}');
    
    return {
      data: resultData.stocks || [],
      sources
    };
  } catch (error: any) {
    const errorMsg = error?.message?.toLowerCase() || "";
    const isRateLimit = errorMsg.includes("429") || errorMsg.includes("quota") || errorMsg.includes("limit");

    // ถ้าเจอ 429 และยัง retry ไม่เกิน 1 ครั้ง ให้ลองใหม่หลังรอ 3-5 วินาที
    if (isRateLimit && retryCount < 1) {
      const waitTime = 3000 + Math.random() * 2000;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return fetchGeminiMarketDataBatch(symbols, retryCount + 1);
    }

    if (isRateLimit) throw new Error("QUOTA_EXCEEDED");
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzePortfolio = async (stocks: Stock[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const stockContext = stocks.slice(0, 5).map(s => `${s.symbol}:${s.price}`).join(",");
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `SET analysis: ${stockContext}. JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            riskLevel: { type: Type.STRING },
            recommendations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  symbol: { type: Type.STRING },
                  action: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  } catch (error: any) {
    if (error?.message?.includes("429") || error?.message?.includes("Quota")) throw new Error("QUOTA_EXCEEDED");
    throw error;
  }
};
