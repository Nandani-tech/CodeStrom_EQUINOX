import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Receipt, 
  DollarSign, 
  HelpCircle, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Cpu
} from 'lucide-react';
import { askAssistant } from '../api';

const QUICK_PROMPTS = [
  "What is our total confirmed spend?",
  "How much did we spend on Software & SaaS?",
  "Who are our top 5 vendors?",
  "Are there any duplicate or pending receipts?",
  "What is our largest confirmed expense?",
  "Show spending on Travel & Lodging"
];

export default function AIAssistantView({ onSelectReceiptId, onShowToast }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm your **ShopLedger Financial AI Assistant**. I query actual database records and Python-calculated figures to answer spending questions with verifiable evidence.\n\nTry clicking any suggested prompt below or type your own question!`,
      referenced_receipts: [],
      engine: 'ShopLedger Core Engine'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (queryToSend) => {
    const text = (queryToSend || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await askAssistant(text);
      const aiMsg = {
        role: 'assistant',
        content: response.answer,
        referenced_receipts: response.referenced_receipts || [],
        calculated_metrics: response.calculated_metrics,
        engine: response.engine || 'Gemini 2.5 Flash'
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error fetching response: ${err.message || 'Please check if server is running.'}`,
          referenced_receipts: [],
          engine: 'Error'
        }
      ]);
      onShowToast({ type: 'error', message: err.message || 'Assistant request failed' });
    }
  };

  // Helper to render text with clickable [Receipt #ID] tags
  const renderMessageContent = (content) => {
    // Split by [Receipt #(\d+)]
    const regex = /\[Receipt #(\d+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }
      const receiptId = parseInt(match[1], 10);
      parts.push(
        <button
          key={`receipt-btn-${match.index}`}
          onClick={() => onSelectReceiptId(receiptId)}
          className="inline-flex items-center space-x-1 mx-1 px-2 py-0.5 rounded-lg text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 hover:scale-105 active:scale-95 transition-all shadow-sm"
        >
          <Receipt className="w-3 h-3 text-indigo-400" />
          <span>Receipt #{receiptId}</span>
        </button>
      );
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-apricot-200 shadow-sm">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-apricot-500 to-amber-500 text-white shadow-md shadow-apricot-500/25">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-stone-900">DukanDesk AI Munim (सहायक)</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-apricot-100 text-apricot-800 border border-apricot-300">
                Gemini 2.5 Live
              </span>
            </div>
            <p className="text-xs text-stone-600 font-medium mt-0.5">
              Ask questions in Hindi, Hinglish, or English about your sales, kharcha, udhaar, and stock.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-apricot-800 bg-apricot-50 px-3 py-1.5 rounded-xl border border-apricot-200">
          <Cpu className="w-4 h-4 text-apricot-600" />
          <span>Multimodal OCR + Real DB Data</span>
        </div>
      </div>

      {/* Suggested Prompts Grid - Clear, 1-Click Shopkeeper Questions */}
      <div className="space-y-2">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500 px-1">
          💡 तुरंत पूछें (1-Click Questions)
        </span>
        <div className="flex flex-wrap gap-2">
          {[
            "आज की कुल बिक्री और गल्ला कितना है?",
            "ग्राहकों का कुल उधार (Udhaar) कितना बाकी है?",
            "Who are our top 5 suppliers by balance due?",
            "कम स्टॉक वाले कौन-कौन से सामान हैं?",
            "What is our estimated gross profit this month?",
            "Are there any duplicate or pending bills?"
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-apricot-100 text-stone-700 hover:text-apricot-900 border border-apricot-200 hover:border-apricot-300 transition-all active:scale-95 disabled:opacity-50 shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-apricot-500" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="glass-panel rounded-3xl border border-apricot-200 flex flex-col h-[520px] overflow-hidden shadow-lg bg-white/95">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user';

            return (
              <div 
                key={index} 
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 text-xs font-black ${
                  isUser 
                    ? 'bg-gradient-to-tr from-apricot-500 to-amber-500 text-white shadow-xs' 
                    : 'bg-morning-100 border border-apricot-300 text-apricot-800 shadow-xs'
                }`}>
                  {isUser ? 'आप' : <Bot className="w-5 h-5 text-apricot-600" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[85%] rounded-3xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser 
                    ? 'bg-gradient-to-r from-apricot-500 to-amber-500 text-white font-bold shadow-md shadow-apricot-500/20' 
                    : 'bg-morning-50 border border-apricot-200 text-stone-800 shadow-2xs font-medium'
                }`}>
                  
                  {/* Content with markdown formatting & clickable receipt tags */}
                  <div className="whitespace-pre-wrap space-y-1">
                    {renderMessageContent(msg.content)}
                  </div>

                  {/* Evidence Receipts footer */}
                  {msg.referenced_receipts && msg.referenced_receipts.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-apricot-200 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[10px] text-stone-500 font-extrabold uppercase tracking-wider mr-1">
                        प्रमाणित बिल / Evidence:
                      </span>
                      {msg.referenced_receipts.map(id => (
                        <button
                          key={id}
                          onClick={() => onSelectReceiptId(id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-apricot-100 text-apricot-900 border border-apricot-300 hover:bg-apricot-200 transition-colors shadow-2xs cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5 text-apricot-700" />
                          <span>Receipt #{id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Engine Tag */}
                  {!isUser && msg.engine && (
                    <div className="mt-2 text-[10px] text-stone-400 font-semibold flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-apricot-500" />
                      <span>Answered by {msg.engine}</span>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-morning-100 border border-apricot-300 flex items-center justify-center text-apricot-600">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-morning-50 border border-apricot-200 rounded-3xl p-4 text-xs text-apricot-800 font-bold flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-apricot-500 animate-ping" />
                <span>दुकान डेटा की जांच और हिसाब लगाया जा रहा है...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-apricot-200">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center space-x-2.5"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about sales, expenses, suppliers, or stock (Hindi / English)..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-2xl text-xs sm:text-sm bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400 placeholder:text-stone-400 font-medium"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="inline-flex items-center justify-center px-5 py-3 rounded-2xl bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 hover:to-amber-600 text-white font-bold transition-all shadow-md shadow-apricot-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4 mr-1.5" />
              <span className="hidden sm:inline">पूछें / Send</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
