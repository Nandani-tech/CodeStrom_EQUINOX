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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl glass-panel border border-slate-800">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-bold text-white">ShopLedger Financial AI</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Live Data Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Ask questions about spending, vendors, duplicates, and category math with clickable receipt proof.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
          <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          <span>Multimodal + Factual DB Aggregations</span>
        </div>
      </div>

      {/* Suggested Prompts Grid */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Suggested Financial Inquiries
        </span>
        <div className="flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 hover:bg-indigo-600/20 text-slate-300 hover:text-indigo-300 border border-slate-800 hover:border-indigo-500/30 transition-all active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{prompt}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="glass-panel rounded-3xl border border-slate-800 flex flex-col h-[520px] overflow-hidden shadow-2xl">
        
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
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs ${
                  isUser 
                    ? 'bg-indigo-600 text-white' 
                    : 'bg-slate-800 border border-slate-700 text-indigo-400 shadow-md'
                }`}>
                  {isUser ? 'You' : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser 
                    ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/20' 
                    : 'bg-slate-900/90 border border-slate-800 text-slate-200'
                }`}>
                  
                  {/* Content with markdown formatting & clickable receipt tags */}
                  <div className="whitespace-pre-wrap space-y-1">
                    {renderMessageContent(msg.content)}
                  </div>

                  {/* Evidence Receipts footer */}
                  {msg.referenced_receipts && msg.referenced_receipts.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                        Proof Evidence:
                      </span>
                      {msg.referenced_receipts.map(id => (
                        <button
                          key={id}
                          onClick={() => onSelectReceiptId(id)}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors"
                        >
                          <Receipt className="w-3 h-3 text-indigo-400" />
                          <span>Receipt #{id}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Engine Tag */}
                  {!isUser && msg.engine && (
                    <div className="mt-2 text-[10px] text-slate-500 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5 text-indigo-400" />
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
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-indigo-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-xs text-indigo-400 flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span className="font-mono">Analyzing database figures & generating audit reasoning...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-slate-900/80 border-t border-slate-800">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask anything about confirmed expenses, categories, top vendors, or duplicates..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 rounded-xl text-xs sm:text-sm bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-500 outline-none transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-md shadow-indigo-600/25 flex items-center justify-center active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}
