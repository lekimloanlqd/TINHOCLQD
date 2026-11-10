import { GoogleGenAI } from '@google/genai';

let cachedClient: GoogleGenAI | null = null;
let lastUsedKey = '';

// Support multiple environment variable conventions and trim any accidental whitespace/quotes
export function getGeminiApiKey(): string | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    '';
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '');
  return cleanKey || null;
}

export function getGeminiStatus(): {
  configured: boolean;
  keyPrefix?: string;
  defaultModel: string;
} {
  const key = getGeminiApiKey();
  return {
    configured: !!key,
    keyPrefix: key ? `${key.substring(0, 6)}...${key.substring(key.length - 4)}` : undefined,
    defaultModel: 'gemini-3.8-flash',
  };
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }

  if (!cachedClient || lastUsedKey !== apiKey) {
    lastUsedKey = apiKey;
    cachedClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedClient;
}

// Valid models to try in sequence per gemini-api guidelines
const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];

export async function generateAIContent(
  prompt: string,
  systemInstruction?: string
): Promise<{ text: string; error?: boolean; modelUsed?: string }> {
  const apiKey = getGeminiApiKey();
  const client = getAiClient();

  if (!apiKey || !client) {
    return {
      text: 'Tính năng AI hiện chưa khả dụng (Chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel). Sau khi thêm biến môi trường trên Vercel, vui lòng Redeploy để hệ thống nhận diện.',
      error: true,
    };
  }

  const sysInstruction =
    systemInstruction ||
    'Bạn là trợ lý AI chuyên gia thi đua học đường cho hệ thống SMART CLASSBOOK AI của Đoàn trường THPT Phan Bội Châu TP Đà Nẵng. Hãy trả lời chính xác, mạch lạc bằng tiếng Việt, dựa trên số liệu thực tế được cung cấp.';

  let lastErrorMsg = '';

  for (const modelName of CANDIDATE_MODELS) {
    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.7,
        },
      });

      const text = response.text || 'Không nhận được nội dung phản hồi từ AI.';
      return { text, error: false, modelUsed: modelName };
    } catch (err: any) {
      lastErrorMsg = err?.message || String(err);
      console.warn(`Model ${modelName} failed:`, lastErrorMsg);
      // If temporary high demand, wait 600ms and try once more on next model
      if (lastErrorMsg.includes('503') || lastErrorMsg.includes('high demand')) {
        await new Promise((r) => setTimeout(r, 600));
      }
      // If error is invalid API key or permission denied, trying other models won't help
      if (lastErrorMsg.includes('API_KEY_INVALID') || lastErrorMsg.includes('PERMISSION_DENIED')) {
        break;
      }
    }
  }

  // If all candidate models failed, give a user-friendly and actionable explanation
  let userFriendlyError = 'Tính năng AI hiện chưa khả dụng.';
  if (lastErrorMsg.includes('API_KEY_INVALID')) {
    userFriendlyError =
      'Khóa API Gemini không hợp lệ (API_KEY_INVALID). Vui lòng kiểm tra lại giá trị biến GEMINI_API_KEY trên Vercel.';
  } else if (lastErrorMsg.includes('PERMISSION_DENIED')) {
    userFriendlyError =
      'Khóa API không có quyền truy cập mô hình Gemini. Vui lòng tạo khóa API mới tại https://aistudio.google.com/app/apikey.';
  } else if (lastErrorMsg.includes('503') || lastErrorMsg.includes('high demand') || lastErrorMsg.includes('UNAVAILABLE')) {
    userFriendlyError =
      'Mô hình AI của Google hiện đang có lượng yêu cầu tăng đột biến (503 High Demand). Vui lòng thử lại sau giây lát.';
  } else if (lastErrorMsg.includes('RESOURCE_EXHAUSTED') || lastErrorMsg.includes('429')) {
    userFriendlyError =
      'Đã đạt hạn mức truy vấn của khóa API Gemini (Quota limit reached). Vui lòng thử lại sau giây lát.';
  } else if (lastErrorMsg) {
    userFriendlyError = `Lỗi kết nối Gemini API (${lastErrorMsg.substring(0, 100)}). Vui lòng thử lại.`;
  }

  return {
    text: userFriendlyError,
    error: true,
  };
}

export async function testGeminiConnection(): Promise<{
  success: boolean;
  message: string;
  modelUsed?: string;
  keyPrefix?: string;
}> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      success: false,
      message: 'Chưa cấu hình biến môi trường GEMINI_API_KEY trên máy chủ Vercel.',
    };
  }

  const result = await generateAIContent('Xin chào, hãy phản hồi "Sẵn sàng hoạt động" trong đúng 1 câu ngắn.');
  if (result.error) {
    return {
      success: false,
      message: result.text,
      keyPrefix: `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
    };
  }

  return {
    success: true,
    message: `Kết nối Gemini AI thành công! Mô hình đang sử dụng: ${result.modelUsed || 'gemini-3.8-flash'}`,
    modelUsed: result.modelUsed,
    keyPrefix: `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`,
  };
}
