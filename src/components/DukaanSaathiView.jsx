import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  BookOpen,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Store,
  Package,
  Receipt,
  HelpCircle,
  Plus,
  Trash2,
  Edit3,
  X,
  MessageCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  Check,
  AlertCircle
} from 'lucide-react';
import {
  askDukaanSaathi,
  generateDailyRecap,
  parseVoiceKhataSmart,
  fetchShopDictionary,
  addCustomerNickname,
  deleteCustomerNickname,
  addCommonPhrase,
  deleteCommonPhrase,
  recordMisunderstandingCorrection,
  fetchMisunderstandings,
  fetchCustomers,
  createCustomer,
  recordCustomerTransaction
} from '../api';

const QUICK_QUESTIONS = [
  { label: 'आज की बिक्री और गल्ला कितना है?', query: 'आज की बिक्री और गल्ला कितना है?' },
  { label: 'किन ग्राहकों से उधार लेना बाकी है?', query: 'किन ग्राहकों से उधार लेना बाकी है?' },
  { label: 'सुरेश जी का कितना बैलेंस बाकी है?', query: 'सुरेश जी का कितना बैलेंस बाकी है?' },
  { label: 'सप्लायरों को कितना पैसा देना बाकी है?', query: 'सप्लायरों को कितना बाकी है?' },
  { label: 'कौन सा सामान खत्म हो रहा है?', query: 'दुकान में कम स्टॉक वाला सामान कौन सा है?' },
  { label: 'इस महीने का कुल मुनाफा कितना है?', query: 'इस महीने का मुनाफा कितना है?' }
];

export default function DukaanSaathiView({
  onNavigateTab,
  onSelectReceiptId,
  onShowToast,
  lang = 'hi',
  t
}) {
  // --- Daily Recap State ---
  const [recap, setRecap] = useState(null);
  const [recapDate, setRecapDate] = useState(new Date().toISOString().split('T')[0]);
  const [isReadingRecap, setIsReadingRecap] = useState(false);
  const [isRecapLoading, setIsRecapLoading] = useState(false);

  // --- Voice / Text Transaction Station State ---
  const [isListening, setIsListening] = useState(false);
  const [voiceQuery, setVoiceQuery] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [proposedTx, setProposedTx] = useState(null);
  const [isSavingTx, setIsSavingTx] = useState(false);
  const [allCustomers, setAllCustomers] = useState([]);
  const [saveAsNicknameCheck, setSaveAsNicknameCheck] = useState(false);
  const recognitionRef = useRef(null);

  // --- Chat / Q&A State ---
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'राम-राम! 🙏 मैं आपका **दुकान साथी** हूँ।\n\nआप मुझसे दुकान के बहीखाते, ग्राहकों के उधार, गल्ले, स्टॉक या सप्लायरों के बारे में बेझिझक हिंदी या हिंग्लिश में पूछ सकते हैं।\n\nऊपर माइक दबाकर बोलकर सीधा **उधार/जमा** भी दर्ज कर सकते हैं!',
      cards: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatScrollRef = useRef(null);

  // --- Dictionary & Settings Modal State ---
  const [showDictionaryModal, setShowDictionaryModal] = useState(false);
  const [dictionaryTab, setDictionaryTab] = useState('nicknames'); // 'nicknames' | 'phrases' | 'corrections'
  const [dictionary, setDictionary] = useState({ customer_nicknames: [], common_phrases: [] });
  const [misunderstandings, setMisunderstandings] = useState([]);
  const [newNickForm, setNewNickForm] = useState({ nickname: '', customer_id: '' });
  const [newPhraseForm, setNewPhraseForm] = useState({ phrase: '', intent: 'udhar_given' });

  // Format currency in Indian Rupees
  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  // Load initial data
  const loadInitialData = async () => {
    try {
      const [recapRes, custRes, dictRes, misRes] = await Promise.all([
        generateDailyRecap(recapDate),
        fetchCustomers(),
        fetchShopDictionary(),
        fetchMisunderstandings()
      ]);
      setRecap(recapRes);
      setAllCustomers(custRes.customers || []);
      setDictionary(dictRes);
      setMisunderstandings(misRes);
    } catch (err) {
      console.error('Failed to load Dukaan Saathi data', err);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [recapDate]);

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Handle TTS for Daily Recap
  const toggleRecapAudio = () => {
    if (!('speechSynthesis' in window)) {
      onShowToast?.({ type: 'warning', message: 'Speech synthesis is not supported on this browser.' });
      return;
    }

    if (isReadingRecap) {
      window.speechSynthesis.cancel();
      setIsReadingRecap(false);
      return;
    }

    if (!recap || !recap.narration_hindi) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(recap.narration_hindi);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;

    // Pick a Hindi voice if available
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi') || v.lang.includes('IN'));
    if (hindiVoice) utterance.voice = hindiVoice;

    utterance.onstart = () => setIsReadingRecap(true);
    utterance.onend = () => setIsReadingRecap(false);
    utterance.onerror = () => setIsReadingRecap(false);

    window.speechSynthesis.speak(utterance);
  };

  // --- Voice Input Handlers for Voice Khata ---
  const startSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onShowToast?.({
        type: 'warning',
        message: 'आपके ब्राउज़र में आवाज पहचान की सुविधा नहीं है। कृपया लिखकर दर्ज करें।'
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = async (event) => {
        const spoken = event.results[0][0].transcript;
        setIsListening(false);
        setVoiceQuery(spoken);
        await handleProcessVoiceInput(spoken);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        const errorMsg = event.error === 'not-allowed'
          ? 'माइक्रोफ़ोन की अनुमति नहीं मिली।'
          : 'कोई आवाज सुनाई नहीं दी, कृपया दोबारा बोलें।';
        onShowToast?.({ type: 'warning', message: errorMsg });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      onShowToast?.({ type: 'error', message: err.message || 'Microphone error' });
    }
  };

  const stopSpeechRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Process Voice / Text input for Transaction Station
  const handleProcessVoiceInput = async (textToProcess) => {
    const text = (textToProcess || voiceQuery).trim();
    if (!text) return;

    setIsProcessingVoice(true);
    try {
      const parsed = await parseVoiceKhataSmart(text);
      setProposedTx(parsed);
      setSaveAsNicknameCheck(false);
      setIsProcessingVoice(false);
    } catch (err) {
      setIsProcessingVoice(false);
      onShowToast?.({ type: 'error', message: 'आवाज समझने में परेशानी हुई। कृपया लिखकर दर्ज करें।' });
    }
  };

  // Ambiguity Resolution Choice Click
  const handleSelectCustomerChoice = (customer) => {
    if (!proposedTx) return;
    setProposedTx(prev => ({
      ...prev,
      matched_customer: customer,
      customer_name: customer.name,
      is_ambiguous: false,
      ambiguity_message: null
    }));
  };

  // Confirm and Save the Voice Transaction
  const handleConfirmTransaction = async () => {
    if (!proposedTx) return;

    if (!proposedTx.amount || proposedTx.amount <= 0) {
      onShowToast?.({ type: 'warning', message: 'कृपया सही राशि दर्ज करें' });
      return;
    }

    if (!proposedTx.customer_name?.trim()) {
      onShowToast?.({ type: 'warning', message: 'कृपया ग्राहक का नाम चुनें या लिखें' });
      return;
    }

    setIsSavingTx(true);
    try {
      let targetCustId = proposedTx.matched_customer?.id;

      // If customer doesn't exist yet, create them automatically
      if (!targetCustId) {
        const newCustRes = await createCustomer({
          name: proposedTx.customer_name.trim(),
          notes: 'दुकान साथी वॉइस एंट्री द्वारा जोड़ा गया'
        });
        targetCustId = newCustRes.customer.id;
      }

      // Record the transaction
      await recordCustomerTransaction(targetCustId, {
        amount: parseFloat(proposedTx.amount),
        type: proposedTx.type, // 'given' (उधार) or 'received' (जमा)
        notes: proposedTx.notes || proposedTx.raw_text,
        payment_mode: 'cash',
        date: new Date().toISOString().split('T')[0]
      });

      // If shopkeeper opted to save custom nickname or there was an ambiguity resolved
      if (saveAsNicknameCheck && proposedTx.raw_customer_token && targetCustId) {
        await addCustomerNickname(proposedTx.raw_customer_token, targetCustId);
        onShowToast?.({
          type: 'success',
          message: `उपनाम '${proposedTx.raw_customer_token}' को याद रख लिया गया!`
        });
      }

      onShowToast?.({
        type: 'success',
        message: proposedTx.type === 'given'
          ? `✓ ₹${proposedTx.amount} उधार ${proposedTx.customer_name} के खाते में दर्ज हुआ!`
          : `✓ ₹${proposedTx.amount} जमा ${proposedTx.customer_name} से प्राप्त हुआ!`
      });

      // Clear state
      setProposedTx(null);
      setVoiceQuery('');
      setIsSavingTx(false);

      // Refresh recap & customers
      loadInitialData();
    } catch (err) {
      setIsSavingTx(false);
      onShowToast?.({ type: 'error', message: err.message || 'लेन-देन सेव करने में त्रुटि' });
    }
  };

  // Record a correction when user fixes what was heard
  const handleCancelOrCorrect = async () => {
    if (proposedTx) {
      // Record in misunderstanding log for auditability
      await recordMisunderstandingCorrection({
        spoken: proposedTx.raw_text,
        heard_customer: proposedTx.customer_name,
        heard_amount: proposedTx.amount,
        heard_type: proposedTx.type,
        action: 'Cancelled or Manually edited by shopkeeper'
      });
      const misRes = await fetchMisunderstandings();
      setMisunderstandings(misRes);
    }
    setProposedTx(null);
    setVoiceQuery('');
  };

  // --- Natural Language Chat / Q&A Handler ---
  const handleSendChat = async (queryToSend) => {
    const text = (queryToSend || chatInput).trim();
    if (!text || isChatLoading) return;

    const userMessage = {
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await askDukaanSaathi(text);
      const assistantMessage = {
        role: 'assistant',
        text: response.answer_hindi || response.answer,
        cards: response.cards || [],
        followups: response.suggested_followups || [],
        engine: response.engine || 'दुकान साथी इंजन',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMessage]);
      setIsChatLoading(false);
    } catch (err) {
      setIsChatLoading(false);
      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ क्षमा करें, उत्तर प्राप्त करने में समस्या आई: ${err.message || 'कृपया दोबारा प्रयास करें।'}`,
          cards: [],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  // --- Dictionary Management Handlers ---
  const handleAddNickname = async (e) => {
    e.preventDefault();
    if (!newNickForm.nickname.trim() || !newNickForm.customer_id) {
      onShowToast?.({ type: 'warning', message: 'कृपया उपनाम और ग्राहक दोनों चुनें।' });
      return;
    }
    try {
      await addCustomerNickname(newNickForm.nickname.trim(), parseInt(newNickForm.customer_id, 10));
      const dictRes = await fetchShopDictionary();
      setDictionary(dictRes);
      setNewNickForm({ nickname: '', customer_id: '' });
      onShowToast?.({ type: 'success', message: 'उपनाम सफलता से जुड़ गया!' });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  const handleDeleteNickname = async (id) => {
    try {
      await deleteCustomerNickname(id);
      const dictRes = await fetchShopDictionary();
      setDictionary(dictRes);
      onShowToast?.({ type: 'success', message: 'उपनाम हटा दिया गया।' });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  const handleAddPhrase = async (e) => {
    e.preventDefault();
    if (!newPhraseForm.phrase.trim()) return;
    try {
      await addCommonPhrase(newPhraseForm.phrase.trim(), newPhraseForm.intent);
      const dictRes = await fetchShopDictionary();
      setDictionary(dictRes);
      setNewPhraseForm({ phrase: '', intent: 'udhar_given' });
      onShowToast?.({ type: 'success', message: 'मुहावरा जुड़ गया!' });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  const handleDeletePhrase = async (id) => {
    try {
      await deleteCommonPhrase(id);
      const dictRes = await fetchShopDictionary();
      setDictionary(dictRes);
      onShowToast?.({ type: 'success', message: 'मुहावरा हटा दिया गया।' });
    } catch (err) {
      onShowToast?.({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* ============================================================== */}
      {/* 1. DUKAAN SAATHI HEADER BANNER & DICTIONARY TRIGGER             */}
      {/* ============================================================== */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-apricot-300 bg-gradient-to-br from-white via-morning-50 to-apricot-50 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3.5 rounded-2xl bg-gradient-to-tr from-apricot-500 via-amber-500 to-apricot-600 text-white shadow-lg shadow-apricot-500/30 shrink-0">
            <Sparkles className="w-7 h-7" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                दुकान साथी (Dukaan Saathi)
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% प्रमाणित डेटा (No Guesswork)</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-600 font-medium mt-1 max-w-2xl">
              छोटे दुकानदारों का समझदार AI साथी — बोलकर उधार/जमा दर्ज करें, देसी भाषा में सवाल पूछें, और बिना किसी मनगढ़ंत आंकड़े के सच्चा दैनिक हिसाब जानें।
            </p>
          </div>
        </div>

        {/* Dictionary Trigger Button */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowDictionaryModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black bg-white hover:bg-apricot-50 text-apricot-900 border border-apricot-300 shadow-xs hover:border-apricot-400 active:scale-95 transition-all cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-apricot-600" />
            <span>दुकान शब्दावली (Dictionary)</span>
            {dictionary.customer_nicknames?.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-apricot-100 text-apricot-800">
                {dictionary.customer_nicknames.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. VERIFIED DAILY RECAP (सच्चा दैनिक रीकैप)                     */}
      {/* ============================================================== */}
      {recap && (
        <div className="glass-card p-5 sm:p-6 rounded-3xl border-2 border-emerald-200/80 bg-gradient-to-br from-emerald-50/50 via-white to-morning-50 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-emerald-100 gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-black text-stone-900">
                    {recap.headline}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {recap.date_formatted}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 font-semibold">
                  केवल दुकान के वास्तविक दर्ज रिकॉर्ड्स से तैयार सारांश (Strictly Zero Hallucination)
                </p>
              </div>
            </div>

            {/* Listen Button & Date Picker */}
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={recapDate}
                onChange={(e) => setRecapDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white border border-stone-200 text-stone-700 outline-none"
              />
              <button
                onClick={toggleRecapAudio}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 cursor-pointer ${
                  isReadingRecap
                    ? 'bg-rose-600 text-white animate-pulse'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                }`}
              >
                {isReadingRecap ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                <span>{isReadingRecap ? 'रोकें (Stop)' : '🔊 रीकैप सुनें (Audio)'}</span>
              </button>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-4">
            <div className="p-3 rounded-2xl bg-white border border-apricot-200/80 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-stone-500 block">कुल बिक्री (Sales)</span>
              <span className="text-lg font-black text-stone-900 mt-1 block">{fmt(recap.metrics.total_sales)}</span>
              <span className="text-[10px] text-stone-400 font-medium">{recap.metrics.sales_count} बिल/कटौती</span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-emerald-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-emerald-700 block">गल्ले में नकद (Galla)</span>
              <span className="text-lg font-black text-emerald-700 mt-1 block">{fmt(recap.metrics.cash_in_hand)}</span>
              <span className="text-[10px] text-emerald-600 font-medium">नकद रोकड़</span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-rose-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-rose-700 block">आज उधार दिया (Udhar)</span>
              <span className="text-lg font-black text-rose-700 mt-1 block">{fmt(recap.metrics.udhar_given_today)}</span>
              <span className="text-[10px] text-rose-500 font-medium">ग्राहकों को दिया</span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-teal-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-teal-700 block">उधार जमा हुआ (Jama)</span>
              <span className="text-lg font-black text-teal-700 mt-1 block">{fmt(recap.metrics.jama_collected_today)}</span>
              <span className="text-[10px] text-teal-600 font-medium">ग्राहकों से आया</span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-amber-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-amber-700 block">मार्केट से कुल लेना</span>
              <span className="text-lg font-black text-amber-800 mt-1 block">{fmt(recap.metrics.total_market_receivable)}</span>
              <span className="text-[10px] text-amber-600 font-medium">ग्राहकों पर बाकी</span>
            </div>

            <div className="p-3 rounded-2xl bg-white border border-indigo-200 shadow-2xs">
              <span className="text-[10px] font-extrabold uppercase text-indigo-700 block">कम स्टॉक अलर्ट</span>
              <span className="text-lg font-black text-indigo-800 mt-1 block">{recap.metrics.low_stock_count} सामान</span>
              <span className="text-[10px] text-indigo-500 font-medium">खत्म होने वाले</span>
            </div>
          </div>

          {/* Bullet Insights */}
          <div className="mt-4 pt-3 border-t border-emerald-100 flex flex-wrap gap-2 text-xs">
            {recap.bullets?.map((b, idx) => (
              <span key={idx} className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white/80 border border-stone-200 text-stone-700 font-semibold shadow-2xs">
                <span>{b}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. VOICE & TEXT TRANSACTION STATION (बोलकर हिसाब लिखें)        */}
      {/* ============================================================== */}
      <div className="glass-panel p-5 sm:p-6 rounded-3xl border border-apricot-300 bg-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-apricot-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-apricot-100 text-apricot-800">
              <Mic className="w-5 h-5 text-apricot-600" />
            </div>
            <div>
              <h3 className="text-base font-black text-stone-900">
                बोलकर या लिखकर एंट्री करें (Voice / Quick Khata Entry)
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                देसी अंदाज़ में बोलें, स्क्रीन पर जांचें और कन्फर्म करके ही खाते में सेव करें।
              </p>
            </div>
          </div>

          <div className="text-[11px] text-stone-500 font-semibold flex items-center space-x-1 bg-morning-100 px-3 py-1.5 rounded-xl border border-apricot-200">
            <span>उदाहरण: "शर्मा जी को 350 का सामान उधार दिया" या "चिंटू ने 500 जमा किए"</span>
          </div>
        </div>

        {/* Input Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {/* Big Mic Button */}
          <button
            onClick={isListening ? stopSpeechRecognition : startSpeechRecognition}
            className={`w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-5 py-3.5 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer shrink-0 ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-600/30'
                : 'bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 hover:to-amber-600 text-white shadow-apricot-500/25'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span>{isListening ? 'सुन रहे हैं... (रोकने के लिए दबाएं)' : '🎤 बोलें (Tap to Speak)'}</span>
          </button>

          {/* Manual Text Fallback */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleProcessVoiceInput(); }}
            className="w-full flex items-center space-x-2"
          >
            <input
              type="text"
              value={voiceQuery}
              onChange={(e) => setVoiceQuery(e.target.value)}
              placeholder="या यहाँ लिखें: जैसे 'राजू को 250 का तेल दिया' या 'गुप्ता जी 1000 जमा'..."
              className="flex-1 px-4 py-3 rounded-2xl text-xs sm:text-sm bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400 font-semibold"
            />
            <button
              type="submit"
              disabled={!voiceQuery.trim() || isProcessingVoice}
              className="px-5 py-3 rounded-2xl text-xs font-black bg-stone-900 hover:bg-stone-800 text-white disabled:opacity-50 transition-all shadow-xs shrink-0 cursor-pointer"
            >
              {isProcessingVoice ? 'समझ रहे हैं...' : 'जांचें (Preview)'}
            </button>
          </form>
        </div>

        {/* ========================================================== */}
        {/* EDITABLE TRANSACTION PREVIEW CARD (Strict Confirmation)     */}
        {/* ========================================================== */}
        {proposedTx && (
          <div className="p-5 rounded-3xl bg-morning-50 border-2 border-apricot-300 shadow-md space-y-4 animate-in zoom-in-95 duration-200">
            
            {/* Header of Preview */}
            <div className="flex items-center justify-between pb-3 border-b border-apricot-200">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-apricot-500 animate-pulse" />
                <h4 className="text-sm font-black text-stone-900">
                  लेन-देन पूर्वावलोकन (Editable Preview — बिना पुष्टि के सेव नहीं होगा)
                </h4>
              </div>
              <button
                onClick={handleCancelOrCorrect}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                title="रद्द करें"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Spoken words prompt */}
            <div className="p-3 rounded-2xl bg-white border border-apricot-200 text-xs flex items-center space-x-2 text-stone-700">
              <Volume2 className="w-4 h-4 text-apricot-600 shrink-0" />
              <span className="font-semibold text-stone-500">पहचानी गई आवाज:</span>
              <span className="font-bold text-stone-900 italic">"{proposedTx.raw_text}"</span>
            </div>

            {/* AMBIGUITY WARNING IF ANY */}
            {proposedTx.is_ambiguous && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs space-y-2.5">
                <div className="flex items-start space-x-2 text-amber-900 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{proposedTx.ambiguity_message || 'नाम या विवरण में एक से ज्यादा विकल्प मिले — कृपया सही ग्राहक चुनें:'}</span>
                </div>

                {/* Suggested Customers Chips */}
                {proposedTx.suggested_customers && proposedTx.suggested_customers.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {proposedTx.suggested_customers.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomerChoice(c)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-stone-800 border border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-2xs"
                      >
                        <Users className="w-3.5 h-3.5 text-amber-700" />
                        <span>{c.name}</span>
                        <span className="text-[10px] text-stone-500 font-normal">({c.phone || `बाकी: ₹${c.balance_due}`})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Editable Fields Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              
              {/* 1. Transaction Type Toggle */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">लेन-देन प्रकार (Type)</label>
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white border border-apricot-200">
                  <button
                    type="button"
                    onClick={() => setProposedTx({ ...proposedTx, type: 'given' })}
                    className={`py-2 rounded-lg font-black text-xs transition-all ${
                      proposedTx.type === 'given'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    🔴 उधार (दिया)
                  </button>
                  <button
                    type="button"
                    onClick={() => setProposedTx({ ...proposedTx, type: 'received' })}
                    className={`py-2 rounded-lg font-black text-xs transition-all ${
                      proposedTx.type === 'received'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    🟢 जमा (मिला)
                  </button>
                </div>
              </div>

              {/* 2. Customer Name / Dropdown */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">ग्राहक का नाम (Customer)</label>
                <input
                  type="text"
                  value={proposedTx.customer_name || ''}
                  onChange={(e) => setProposedTx({ ...proposedTx, customer_name: e.target.value })}
                  placeholder="ग्राहक का नाम..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-apricot-200 text-stone-900 font-bold text-sm outline-none focus:ring-2 focus:ring-apricot-400"
                />
                {proposedTx.matched_customer ? (
                  <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                    ✓ खाता मिला: {proposedTx.matched_customer.name} (मौजूदा बाकी: {fmt(proposedTx.matched_customer.balance_due)})
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 font-semibold mt-1 block">
                    + नया ग्राहक बनेगा (यदि पहले से नहीं है)
                  </span>
                )}
              </div>

              {/* 3. Amount Field with Quick Pills */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">रकम / रुपया (Amount)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 font-black text-stone-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={proposedTx.amount || ''}
                    onChange={(e) => setProposedTx({ ...proposedTx, amount: parseFloat(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full pl-8 pr-3.5 py-2 rounded-xl bg-white border border-apricot-200 text-stone-900 font-black text-base outline-none focus:ring-2 focus:ring-apricot-400"
                  />
                </div>
                {/* Quick Amount Pills */}
                <div className="flex items-center space-x-1 mt-1.5 overflow-x-auto pb-0.5">
                  {[50, 100, 200, 500, 1000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setProposedTx({ ...proposedTx, amount: amt })}
                      className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-stone-700 border border-stone-200 hover:bg-apricot-100"
                    >
                      +₹{amt}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Notes / Details */}
            <div>
              <label className="block font-bold text-stone-700 mb-1 text-xs">सामान या विवरण (वैकल्पिक)</label>
              <input
                type="text"
                value={proposedTx.notes || ''}
                onChange={(e) => setProposedTx({ ...proposedTx, notes: e.target.value })}
                placeholder="जैसे: 5 किलो चीनी, तेल, दाल..."
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-apricot-200 text-stone-800 text-xs font-semibold outline-none"
              />
            </div>

            {/* Save as Nickname Checkbox if informal name was used */}
            {proposedTx.raw_customer_token && proposedTx.matched_customer && (
              <label className="flex items-center space-x-2 text-xs font-bold text-stone-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={saveAsNicknameCheck}
                  onChange={(e) => setSaveAsNicknameCheck(e.target.checked)}
                  className="rounded border-stone-300 text-apricot-600 focus:ring-apricot-500"
                />
                <span>
                  भविष्य के लिए याद रखें: "{proposedTx.raw_customer_token}" को {proposedTx.matched_customer.name} का उपनाम बनाएं।
                </span>
              </label>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-apricot-200">
              <button
                type="button"
                onClick={handleCancelOrCorrect}
                className="px-4 py-2.5 rounded-xl text-stone-600 hover:text-stone-900 bg-white border border-stone-200 font-bold text-xs cursor-pointer"
              >
                रद्द करें / छोड़ें
              </button>
              <button
                type="button"
                disabled={isSavingTx || !proposedTx.amount || proposedTx.is_ambiguous}
                onClick={handleConfirmTransaction}
                className={`inline-flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-xs font-black text-white shadow-md active:scale-95 transition-all cursor-pointer ${
                  proposedTx.type === 'given'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                } disabled:opacity-50`}
              >
                <Check className="w-4 h-4" />
                <span>{isSavingTx ? 'सेव हो रहा है...' : '✓ पुष्टि करें और खाते में जोड़ें (Confirm & Save)'}</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* ============================================================== */}
      {/* 4. CHAT / NATURAL HINDI Q&A STATION (खाता सवाल-जवाब)            */}
      {/* ============================================================== */}
      <div className="glass-panel rounded-3xl border border-apricot-300 bg-white shadow-lg overflow-hidden flex flex-col h-[600px]">
        
        {/* Chat Header */}
        <div className="p-4 sm:p-5 border-b border-apricot-200 bg-morning-50/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-apricot-500 to-amber-500 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-stone-900">दुकान साथी बातचीत (Khata Q&A)</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-apricot-100 text-apricot-900 border border-apricot-300">
                  हिंदी / Hinglish
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">
                बहीखाते की हर जानकारी इंटरैक्टिव कार्ड्स और सीधे लिंक्स के साथ मिलेगी।
              </p>
            </div>
          </div>
        </div>

        {/* Suggested Quick Prompt Chips */}
        <div className="px-4 py-2.5 border-b border-apricot-100 bg-white flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <span className="text-[10px] font-extrabold uppercase text-stone-400 shrink-0">
            तुरंत पूछें:
          </span>
          {QUICK_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendChat(q.query)}
              disabled={isChatLoading}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-morning-50 hover:bg-apricot-100 text-stone-800 border border-apricot-200 transition-all shrink-0 cursor-pointer disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {chatMessages.map((msg, index) => {
            const isUser = msg.role === 'user';

            return (
              <div
                key={index}
                className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black ${
                  isUser
                    ? 'bg-stone-800 text-white'
                    : 'bg-gradient-to-tr from-apricot-500 to-amber-500 text-white shadow-xs'
                }`}>
                  {isUser ? 'आप' : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`max-w-[88%] sm:max-w-[80%] rounded-3xl p-4 text-xs sm:text-sm leading-relaxed space-y-3 ${
                  isUser
                    ? 'bg-stone-900 text-white font-bold'
                    : 'bg-morning-50 border border-apricot-200 text-stone-900 shadow-2xs font-medium'
                }`}>
                  
                  {/* Text Content */}
                  <div className="whitespace-pre-wrap">
                    {msg.text}
                  </div>

                  {/* Render Rich Interactive Cards if any */}
                  {msg.cards && msg.cards.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-apricot-200/80">
                      {msg.cards.map((card, cIdx) => (
                        <div key={cIdx} className="rounded-2xl bg-white border border-apricot-300 p-4 shadow-sm space-y-3">
                          
                          {/* Card Header */}
                          <div className="flex items-center justify-between pb-2 border-b border-apricot-100">
                            <span className="text-xs font-black text-stone-900">{card.title}</span>
                            {card.badge && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-apricot-100 text-apricot-800 border border-apricot-200">
                                {card.badge}
                              </span>
                            )}
                          </div>

                          {/* 1. HISAB CARD */}
                          {card.type === 'hisab_card' && (
                            <div className="space-y-3 text-xs">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="p-2 rounded-xl bg-morning-50 border border-apricot-100">
                                  <span className="text-[10px] text-stone-500 block">कुल बिक्री</span>
                                  <span className="text-sm font-black text-stone-900">{fmt(card.data.total_sales)}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200">
                                  <span className="text-[10px] text-emerald-700 block">गल्ला (नकद)</span>
                                  <span className="text-sm font-black text-emerald-800">{fmt(card.data.cash_in_hand)}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200">
                                  <span className="text-[10px] text-indigo-700 block">UPI / ऑनलाइन</span>
                                  <span className="text-sm font-black text-indigo-800">{fmt(card.data.upi_sales)}</span>
                                </div>
                                <div className="p-2 rounded-xl bg-rose-50 border border-rose-200">
                                  <span className="text-[10px] text-rose-700 block">उधार बिक्री</span>
                                  <span className="text-sm font-black text-rose-800">{fmt(card.data.credit_sales)}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 2. CUSTOMER CARD */}
                          {card.type === 'customer_card' && (
                            <div className="space-y-2.5 text-xs">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="text-base font-black text-stone-900">{card.data.customer_name}</span>
                                  {card.data.phone && <span className="text-stone-500 block text-xs">{card.data.phone}</span>}
                                </div>
                                <div className="text-right">
                                  <span className={`text-lg font-black ${card.data.balance_due > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                    {fmt(Math.abs(card.data.balance_due))}
                                  </span>
                                  <span className="text-[10px] font-bold block text-stone-500">
                                    {card.data.balance_due > 0 ? 'लेना बाकी है' : 'एडवांस जमा'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* 3. DEBTORS CARD (Highest pending credit with mini bars) */}
                          {card.type === 'debtors_card' && (
                            <div className="space-y-2 text-xs">
                              {card.data.debtors?.map((deb) => (
                                <div key={deb.id} className="p-2.5 rounded-xl bg-morning-50 border border-apricot-100 flex items-center justify-between">
                                  <div>
                                    <span className="font-black text-stone-900">{deb.name}</span>
                                    {deb.phone && <span className="text-[10px] text-stone-500 block">{deb.phone}</span>}
                                  </div>
                                  <div className="text-right">
                                    <span className="text-sm font-black text-rose-600">{fmt(deb.balance_due)}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 4. STOCK CARD */}
                          {card.type === 'stock_card' && (
                            <div className="space-y-2 text-xs">
                              {card.data.items?.map((item) => (
                                <div key={item.id} className="p-2 rounded-xl bg-rose-50/50 border border-rose-200 flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-stone-900">{item.name} {item.hindi_name ? `(${item.hindi_name})` : ''}</span>
                                    <span className="text-[10px] text-stone-500 block">अलर्ट सीमा: {item.min_alert_qty} {item.unit}</span>
                                  </div>
                                  <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-100 text-rose-800">
                                    बाकी: {item.current_stock} {item.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 5. SUPPLIER CARD */}
                          {card.type === 'supplier_card' && (
                            <div className="space-y-2 text-xs">
                              {card.data.suppliers?.map((sup) => (
                                <div key={sup.id} className="p-2 rounded-xl bg-morning-50 border border-apricot-100 flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-stone-900">{sup.name}</span>
                                    {sup.next_due_date && <span className="text-[10px] text-stone-500 block">भुगतान तारीख: {sup.next_due_date}</span>}
                                  </div>
                                  <span className="text-sm font-black text-rose-600">{fmt(sup.balance_due)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 6. RECEIPT CARD */}
                          {card.type === 'receipt_card' && (
                            <div className="space-y-2 text-xs">
                              <p className="text-stone-700 font-semibold">{card.data.summary}</p>
                              {card.data.receipt_ids?.map(rId => (
                                <button
                                  key={rId}
                                  onClick={() => onSelectReceiptId?.(rId)}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-apricot-100 text-apricot-900 border border-apricot-300 hover:bg-apricot-200 transition-colors mr-2 cursor-pointer"
                                >
                                  <Receipt className="w-3.5 h-3.5" />
                                  <span>बिल #{rId} देखें</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Interactive Card Action Links */}
                          {card.actions && card.actions.length > 0 && (
                            <div className="pt-2 border-t border-apricot-100 flex flex-wrap gap-2">
                              {card.actions.map((act, aIdx) => (
                                <button
                                  key={aIdx}
                                  onClick={() => {
                                    if (act.tab && onNavigateTab) onNavigateTab(act.tab);
                                  }}
                                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-black bg-stone-900 hover:bg-stone-800 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
                                >
                                  <span>{act.label}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ))}
                            </div>
                          )}

                        </div>
                      ))}
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {msg.followups && msg.followups.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.followups.map((f, fIdx) => (
                        <button
                          key={fIdx}
                          onClick={() => handleSendChat(f)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-stone-700 border border-apricot-200 hover:bg-apricot-100 transition-colors cursor-pointer"
                        >
                          → {f}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Engine Tag */}
                  {!isUser && msg.engine && (
                    <div className="text-[10px] text-stone-400 font-bold flex items-center space-x-1 pt-1">
                      <Sparkles className="w-3 h-3 text-apricot-500" />
                      <span>{msg.engine}</span>
                    </div>
                  )}

                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isChatLoading && (
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 rounded-xl bg-apricot-100 border border-apricot-300 flex items-center justify-center text-apricot-600">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-morning-50 border border-apricot-200 rounded-2xl p-3 text-xs text-stone-700 font-bold flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-apricot-500 animate-ping" />
                <span>दुकान बहीखाते की जांच कर रहे हैं...</span>
              </div>
            </div>
          )}

          <div ref={chatScrollRef} />
        </div>

        {/* Chat Input Bar */}
        <div className="p-4 bg-white border-t border-apricot-200">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="दुकान के हिसाब, उधार, बिक्री या सप्लायर के बारे में पूछें..."
              disabled={isChatLoading}
              className="flex-1 px-4 py-3 rounded-2xl text-xs sm:text-sm bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400 font-medium"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 text-white font-black text-xs sm:text-sm transition-all shadow-md shadow-apricot-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

      {/* ============================================================== */}
      {/* 5. SHOP DICTIONARY & CORRECTIONS MODAL (दुकान शब्दावली डायरी)     */}
      {/* ============================================================== */}
      {showDictionaryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-2xl rounded-3xl bg-white border border-apricot-200 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-apricot-200">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 rounded-xl bg-apricot-100 text-apricot-800">
                  <BookOpen className="w-5 h-5 text-apricot-700" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    दुकान शब्दावली व सुधार डायरी (Shop Dictionary)
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">
                    अपने ग्राहकों के बोलचाल के उपनाम व स्थानीय मुहावरे जोड़ें ताकि AI कभी गलती न करे।
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex items-center space-x-2 border-b border-apricot-100 pb-2">
              <button
                onClick={() => setDictionaryTab('nicknames')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  dictionaryTab === 'nicknames'
                    ? 'bg-apricot-500 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-morning-100'
                }`}
              >
                ग्राहक उपनाम ({dictionary.customer_nicknames?.length || 0})
              </button>
              <button
                onClick={() => setDictionaryTab('phrases')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  dictionaryTab === 'phrases'
                    ? 'bg-apricot-500 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-morning-100'
                }`}
              >
                बोलचाल के मुहावरे ({dictionary.common_phrases?.length || 0})
              </button>
              <button
                onClick={() => setDictionaryTab('corrections')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  dictionaryTab === 'corrections'
                    ? 'bg-apricot-500 text-white shadow-xs'
                    : 'text-stone-600 hover:bg-morning-100'
                }`}
              >
                सुधार डायरी ({misunderstandings.length})
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* TAB 1: NICKNAMES */}
              {dictionaryTab === 'nicknames' && (
                <div className="space-y-4">
                  {/* Add Nickname Form */}
                  <form onSubmit={handleAddNickname} className="p-4 rounded-2xl bg-morning-50 border border-apricot-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">उपनाम (Nickname)</label>
                      <input
                        type="text"
                        required
                        value={newNickForm.nickname}
                        onChange={(e) => setNewNickForm({ ...newNickForm, nickname: e.target.value })}
                        placeholder="जैसे: चिंटू, मास्टर जी, फौजी..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 font-bold text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">असली ग्राहक खाता</label>
                      <select
                        required
                        value={newNickForm.customer_id}
                        onChange={(e) => setNewNickForm({ ...newNickForm, customer_id: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 font-bold text-stone-900"
                      >
                        <option value="">-- ग्राहक चुनें --</option>
                        {allCustomers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-black shadow-xs cursor-pointer"
                      >
                        + उपनाम जोड़ें
                      </button>
                    </div>
                  </form>

                  {/* Nicknames List */}
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-extrabold uppercase text-stone-400">मौजूदा उपनाम सूची</h5>
                    {dictionary.customer_nicknames?.length > 0 ? (
                      dictionary.customer_nicknames.map(item => (
                        <div key={item.id} className="p-3 rounded-xl bg-white border border-apricot-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-stone-900 text-sm">"{item.nickname}"</span>
                            <span className="mx-2 text-stone-400">→</span>
                            <span className="font-bold text-apricot-800">{item.customer_name}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteNickname(item.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600"
                            title="हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400 italic">अभी कोई उपनाम नहीं जोड़ा गया है।</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: COMMON PHRASES */}
              {dictionaryTab === 'phrases' && (
                <div className="space-y-4">
                  {/* Add Phrase Form */}
                  <form onSubmit={handleAddPhrase} className="p-4 rounded-2xl bg-morning-50 border border-apricot-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">मुहावरा / शब्द (Phrase)</label>
                      <input
                        type="text"
                        required
                        value={newPhraseForm.phrase}
                        onChange={(e) => setNewPhraseForm({ ...newPhraseForm, phrase: e.target.value })}
                        placeholder="जैसे: खाते में लिख लो, कटवा दो..."
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 font-bold text-stone-900"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-stone-700 mb-1">अर्थ (Intent)</label>
                      <select
                        value={newPhraseForm.intent}
                        onChange={(e) => setNewPhraseForm({ ...newPhraseForm, intent: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-white border border-stone-200 font-bold text-stone-900"
                      >
                        <option value="udhar_given">🔴 उधार दिया (Udhar Given)</option>
                        <option value="jama_received">🟢 जमा प्राप्त (Payment Got)</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full py-2 px-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-black shadow-xs cursor-pointer"
                      >
                        + मुहावरा जोड़ें
                      </button>
                    </div>
                  </form>

                  {/* Phrases List */}
                  <div className="space-y-2">
                    <h5 className="text-[11px] font-extrabold uppercase text-stone-400">सक्रिय मुहावरे</h5>
                    {dictionary.common_phrases?.length > 0 ? (
                      dictionary.common_phrases.map(p => (
                        <div key={p.id} className="p-3 rounded-xl bg-white border border-apricot-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-black text-stone-900">"{p.phrase}"</span>
                            <span className="mx-2 text-stone-400">→</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              p.intent === 'udhar_given'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}>
                              {p.intent === 'udhar_given' ? 'उधार (दिया)' : 'जमा (मिला)'}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeletePhrase(p.id)}
                            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600"
                            title="हटाएं"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-stone-400 italic">कोई मुहावरा दर्ज नहीं है।</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: CORRECTIONS & MISUNDERSTANDINGS LOG */}
              {dictionaryTab === 'corrections' && (
                <div className="space-y-3">
                  <p className="text-xs text-stone-600 font-medium">
                    जब भी आप AI द्वारा पहचानी गई बात को बदलते या रद्द करते हैं, वह यहाँ दर्ज होता है ताकि आप समीक्षा कर सकें कि क्या गलत समझा गया था।
                  </p>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto">
                    {misunderstandings.length > 0 ? (
                      misunderstandings.map(log => (
                        <div key={log.id} className="p-3 rounded-xl bg-morning-50 border border-apricot-200 text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-stone-400 font-semibold">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span className="text-amber-800 font-bold">{log.action}</span>
                          </div>
                          <p className="font-bold text-stone-800">बोला गया: "{log.spoken}"</p>
                          <p className="text-stone-600 text-[11px]">
                            AI ने समझा: ग्राहक: {log.heard_customer || 'अज्ञात'}, राशि: ₹{log.heard_amount}, प्रकार: {log.heard_type === 'given' ? 'उधार' : 'जमा'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-stone-400 text-xs italic">
                        कोई सुधार रिकॉर्ड नहीं है — सब कुछ सही समझा गया!
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-apricot-200 flex justify-end">
              <button
                onClick={() => setShowDictionaryModal(false)}
                className="px-5 py-2.5 rounded-2xl bg-stone-900 text-white font-bold text-xs"
              >
                बंद करें (Close)
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
