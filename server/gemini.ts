import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

export async function generateAIContent(prompt: string, systemInstruction?: string): Promise<{ text: string; error?: boolean }> {
  const client = getAiClient();
  if (!client) {
    return {
      text: 'Tính năng AI hiện chưa khả dụng (Chưa cấu hình GEMINI_API_KEY trên môi trường máy chủ). Các chức năng quản lý, tính điểm và thống kê dữ liệu vẫn hoạt động bình thường.',
      error: true,
    };
  }

  try {
    const response = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || 'Bạn là trợ lý AI chuyên gia thi đua học đường cho hệ thống SMART CLASSBOOK AI của Đoàn trường THPT Phan Bội Châu TP Đà Nẵng. Hãy trả lời chính xác, mạch lạc bằng tiếng Việt, dựa trên số liệu thực tế được cung cấp.',
        temperature: 0.7,
      },
    });

    const text = response.text || 'Không nhận được phản hồi từ AI.';
    return { text, error: false };
  } catch (err: any) {
    console.error('Gemini API execution error:', err?.message || err);
    return {
      text: 'Tính năng AI hiện chưa khả dụng. Các chức năng quản lý và thống kê dữ liệu vẫn hoạt động bình thường.',
      error: true,
    };
  }
}
