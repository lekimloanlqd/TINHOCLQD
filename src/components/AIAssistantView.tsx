import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { useSettings } from '../contexts/SettingsContext.tsx';
import { Bot, Send, Sparkles, User, AlertCircle, RefreshCw, HelpCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  time: string;
}

export const AIAssistantView: React.FC = () => {
  const { settings } = useSettings();
  const currentWeek = settings?.current_week || 1;

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
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; keyPrefix?: string; defaultModel?: string } | null>(null);
  const [testingAi, setTestingAi] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    api.getAIStatus().then(setAiStatus).catch(() => {});
  }, []);

  const handleTestAI = async () => {
    try {
      setTestingAi(true);
      setTestFeedback(null);
      const res = await api.testAIConnection();
      if (res.success) {
        setTestFeedback({ type: 'success', message: res.message });
      } else {
        setTestFeedback({ type: 'error', message: res.message });
      }
      const st = await api.getAIStatus();
      setAiStatus(st);
    } catch (err: any) {
      setTestFeedback({
        type: 'error',
        message: err.message || 'Không thể kết nối máy chủ AI lúc này.',
      });
    } finally {
      setTestingAi(false);
    }
  };

  const sampleQuestions = [
    `Lớp nào dẫn đầu thi đua tuần ${currentWeek}?`,
    `Lớp nào có điểm kỉ luật thấp nhất tuần ${currentWeek}?`,
    `Đánh giá chung về 4 tiêu chí thi đua tuần ${currentWeek}`,
    'Các lớp có nguy cơ tụt hạng và cần nhắc nhở',
    'Lớp 12/1B đang xếp hạng mấy và điểm trung bình bao nhiêu?',
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
      const res = await api.askAIAssistant(q, currentWeek);
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
        text: err?.message || 'Tính năng AI hiện chưa phản hồi. Vui lòng kiểm tra lại cấu hình GEMINI_API_KEY trên Vercel và bấm Redeploy.',
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
      <div className="bg-linear-to-r from-indigo-700 via-blue-700 to-blue-800 p-5 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20 shrink-0">
            <Bot className="w-7 h-7 text-indigo-200" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold">TRỢ LÝ THI ĐUA GEMINI AI</h2>
            <p className="text-xs text-blue-100">
              Phân tích số liệu Sổ đầu bài thực tế • Trả lời chính xác không bịa dữ liệu
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full border backdrop-blur-xs flex items-center gap-1.5 ${
              aiStatus?.configured
                ? 'bg-emerald-500/20 border-emerald-300 text-emerald-100'
                : 'bg-amber-500/20 border-amber-300 text-amber-100'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                aiStatus?.configured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
              }`}
            />
            {aiStatus?.configured
              ? `Gemini AI (${aiStatus.keyPrefix || 'Đã nạp key'})`
              : 'Chưa có GEMINI_API_KEY'}
          </span>

          <button
            onClick={handleTestAI}
            disabled={testingAi}
            className="text-xs bg-white/10 hover:bg-white/20 active:bg-white/30 px-3 py-1 rounded-full border border-white/30 text-white font-medium transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Kiểm tra kết nối trực tiếp đến Gemini API"
          >
            <RefreshCw className={`w-3 h-3 ${testingAi ? 'animate-spin' : ''}`} />
            <span>{testingAi ? 'Đang test...' : 'Kiểm tra kết nối'}</span>
          </button>
        </div>
      </div>

      {/* AI Test Feedback Bar */}
      {testFeedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2 text-xs sm:text-sm animate-in fade-in duration-200 ${
            testFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {testFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{testFeedback.message}</span>
        </div>
      )}

      {/* Help Alert if Key not configured */}
      {aiStatus && !aiStatus.configured && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Cách kích hoạt tính năng Gemini AI trên Vercel:</div>
            <p className="text-amber-800 leading-relaxed">
              1. Vào <strong>Vercel &gt; Settings &gt; Environment Variables</strong>, thêm biến: <code className="bg-white px-1 py-0.5 rounded border font-mono font-bold">GEMINI_API_KEY</code>
              <br />
              2. Vào tab <strong>Deployments &gt; Bấm dấu ... &gt; Chọn Redeploy</strong> để Vercel nạp khóa vào máy chủ.
              <br />
              3. Mọi thiết bị (điện thoại, máy tính, iPad) truy cập trang web sẽ tự động sử dụng được AI ngay lập tức!
            </p>
          </div>
        </div>
      )}

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
