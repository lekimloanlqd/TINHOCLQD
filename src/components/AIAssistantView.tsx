import React, { useState } from 'react';
import { api } from '../services/api.ts';
import { Bot, Send, Sparkles, User, AlertCircle, RefreshCw, HelpCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AIAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'm1',
      sender: 'ai',
      text: 'Xin chào! Tôi là Trợ lý AI phân tích thi đua của Đoàn trường THPT Phan Bội Châu. Tôi có thể giải đáp các thắc mắc về xếp hạng, điểm số Sổ đầu bài, 4 tiêu chí thi đua (Học tập, Kỉ luật, Vệ sinh, Chuyên cần) dựa trên số liệu thực tế trong hệ thống. Bạn cần tra cứu thông tin gì hôm nay?',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    'Lớp nào dẫn đầu thi đua tuần 5?',
    'Lớp nào có điểm kỉ luật thấp nhất tuần này?',
    'Đánh giá chung về 4 tiêu chí thi đua tuần 5',
    'Các lớp có nguy cơ tụt hạng và cần nhắc nhở',
    'Lớp 12A1 đang xếp hạng mấy và điểm trung bình bao nhiêu?',
  ];

  const handleSend = async (questionText?: string) => {
    const q = questionText || input;
    if (!q.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: q,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.askAIAssistant(q, 5);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: res.text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Tính năng AI hiện chưa khả dụng. Các chức năng quản lý và thống kê dữ liệu vẫn hoạt động bình thường.',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-indigo-700 via-blue-700 to-blue-800 p-5 rounded-2xl text-white shadow-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
            <Bot className="w-7 h-7 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">TRỢ LÝ THI ĐUA GEMINI AI</h2>
            <p className="text-xs text-blue-100">
              Phân tích số liệu Sổ đầu bài thực tế • Trả lời chính xác không bịa dữ liệu
            </p>
          </div>
        </div>

        <span className="hidden sm:inline-flex text-xs font-semibold px-3 py-1 rounded-full bg-white/20 border border-white/30 text-white">
          Gemini 2.5 Flash
        </span>
      </div>

      {/* Suggested quick questions */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>GỢI Ý CÂU HỎI NHANH:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((sq, i) => (
            <button
              key={i}
              onClick={() => handleSend(sq)}
              className="text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 transition-colors text-left cursor-pointer"
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col h-[520px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white shadow-xs rounded-tr-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-line prose-sm">{m.text}</div>
                <div
                  className={`text-[10px] mt-2 text-right ${
                    m.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  {m.time}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 items-center text-slate-500 text-xs">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Gemini đang đối chiếu dữ liệu thi đua để trả lời...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input box */}
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/70">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Đặt câu hỏi về thi đua các lớp (ví dụ: 'Lớp 11/1 tuần này bị trừ điểm ở tiêu chí nào?')..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Gửi</span>
            </button>
          </form>
          <div className="text-[10px] text-slate-400 mt-2 text-center">
            Trợ lý AI chỉ trả lời dựa trên dữ liệu Sổ đầu bài trong hệ thống, tuân thủ nguyên tắc không bịa số liệu.
          </div>
        </div>
      </div>
    </div>
  );
};
