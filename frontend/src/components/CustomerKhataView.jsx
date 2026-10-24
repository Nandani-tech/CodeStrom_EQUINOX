import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Search,
  Plus,
  Mic,
  MicOff,
  Phone,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  X,
  CheckCircle,
  Trash2,
  Calendar,
  Sparkles,
  Volume2
} from 'lucide-react';
import {
  fetchCustomers,
  createCustomer,
  recordCustomerTransaction,
  deleteCustomerTransaction,
  deleteCustomer,
  parseVoiceKhata
} from '../api';

export default function CustomerKhataView({ lang = 'en', t, onShowToast }) {
  const [customers, setCustomers] = useState([]);
  const [summary, setSummary] = useState({ total_receivable: 0, total_advance: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Selected Customer for Detailed Ledger View
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Modals
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showTxModal, setShowTxModal] = useState(false); // { type: 'given' | 'received', customer: obj }
  const [txType, setTxType] = useState('given'); // 'given' (आपने दिए - Udhar) or 'received' (आपको मिले - Payment)
  
  // Forms
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: '',
    opening_balance: '',
    opening_type: 'given'
  });

  const [txForm, setTxForm] = useState({
    amount: '',
    notes: '',
    payment_mode: 'cash',
    date: new Date().toISOString().split('T')[0]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Voice Input State
  const [isListening, setIsListening] = useState(false);
  const [voiceSpeechResult, setVoiceSpeechResult] = useState('');
  const [voiceParsedData, setVoiceParsedData] = useState(null);
  const [isParsingVoice, setIsParsingVoice] = useState(false);
  const [showVoiceConfirmModal, setShowVoiceConfirmModal] = useState(false);
  const recognitionRef = useRef(null);

  // Indian Rupee Formatter with Indian grouping
  const fmt = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const loadData = async (query = '') => {
    setIsLoading(true);
    try {
      const res = await fetchCustomers(query);
      setCustomers(res.customers || []);
      setSummary({
        total_receivable: res.total_receivable || 0,
        total_advance: res.total_advance || 0
      });
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to load customer khata' });
    }
  };

  useEffect(() => {
    loadData(searchQuery);
  }, [searchQuery]);

  // Handle Add Customer
  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.name.trim()) {
      onShowToast({ type: 'warning', message: lang === 'hi' ? 'कृपया ग्राहक का नाम लिखें' : 'Please enter customer name' });
      return;
    }

    setIsSubmitting(true);
    try {
      await createCustomer({
        ...customerForm,
        opening_balance: customerForm.opening_balance ? parseFloat(customerForm.opening_balance) : 0
      });
      onShowToast({
        type: 'success',
        message: lang === 'hi' ? `नया ग्राहक '${customerForm.name}' जुड़ गया!` : `Customer '${customerForm.name}' added!`
      });
      setShowAddCustomerModal(false);
      setCustomerForm({ name: '', phone: '', address: '', notes: '', opening_balance: '', opening_type: 'given' });
      setIsSubmitting(false);
      loadData(searchQuery);
    } catch (err) {
      setIsSubmitting(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to add customer' });
    }
  };

  // Handle Record Transaction (You gave / You received)
  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    const customer = showTxModal?.customer || selectedCustomer;
    if (!customer) return;

    if (!txForm.amount || parseFloat(txForm.amount) <= 0) {
      onShowToast({ type: 'warning', message: lang === 'hi' ? 'कृपया सही राशि दर्ज करें' : 'Please enter a valid amount' });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await recordCustomerTransaction(customer.id, {
        amount: parseFloat(txForm.amount),
        type: txType,
        notes: txForm.notes,
        payment_mode: txForm.payment_mode,
        date: txForm.date
      });
      onShowToast({
        type: 'success',
        message: lang === 'hi' 
          ? (txType === 'given' ? `₹${txForm.amount} उधार दर्ज हुआ` : `₹${txForm.amount} जमा प्राप्त हुआ`)
          : res.message
      });
      setShowTxModal(false);
      setTxForm({ amount: '', notes: '', payment_mode: 'cash', date: new Date().toISOString().split('T')[0] });
      setIsSubmitting(false);

      // Refresh
      if (selectedCustomer && selectedCustomer.id === customer.id) {
        setSelectedCustomer(res.customer);
      }
      loadData(searchQuery);
    } catch (err) {
      setIsSubmitting(false);
      onShowToast({ type: 'error', message: err.message || 'Transaction failed' });
    }
  };

  // Handle Voice Input Initiation (Web Speech API - Zero tracking, privacy safe)
  const startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onShowToast({
        type: 'warning',
        message: lang === 'hi'
          ? 'आपके ब्राउज़र में आवाज पहचान समर्थित नहीं है। कृपया लिखकर दर्ज करें।'
          : 'Speech recognition is not supported on this browser. Please enter manually.'
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
        setVoiceSpeechResult(spoken);
        await processVoiceSpeech(spoken);
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        let errorMsg = 'Voice recognition error';
        if (event.error === 'not-allowed') {
          errorMsg = lang === 'hi' ? 'माइक्रोफ़ोन की अनुमति अस्वीकृत है।' : 'Microphone permission denied.';
        } else if (event.error === 'no-speech') {
          errorMsg = lang === 'hi' ? 'कोई आवाज सुनाई नहीं दी।' : 'No speech detected.';
        }
        onShowToast({ type: 'warning', message: errorMsg });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to start microphone' });
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const processVoiceSpeech = async (spoken) => {
    setIsParsingVoice(true);
    try {
      const res = await parseVoiceKhata(spoken);
      setVoiceParsedData(res);
      setIsParsingVoice(false);
      setShowVoiceConfirmModal(true);
    } catch (err) {
      setIsParsingVoice(false);
      onShowToast({ type: 'error', message: 'Could not parse voice statement. Please enter manually.' });
    }
  };

  // Confirming Voice Transaction after Human Review
  const handleConfirmVoiceTransaction = async () => {
    if (!voiceParsedData || !voiceParsedData.amount) {
      onShowToast({ type: 'warning', message: 'Please ensure valid amount is present' });
      return;
    }

    setIsSubmitting(true);
    try {
      let targetCustId = voiceParsedData.matched_customer?.id;

      // If customer doesn't exist, create customer on the fly
      if (!targetCustId) {
        const newCust = await createCustomer({
          name: voiceParsedData.customer_name || (lang === 'hi' ? 'काउंटर ग्राहक' : 'Counter Retail'),
          notes: 'Added via Voice Entry'
        });
        targetCustId = newCust.customer.id;
      }

      await recordCustomerTransaction(targetCustId, {
        amount: parseFloat(voiceParsedData.amount),
        type: voiceParsedData.type || 'given',
        notes: voiceParsedData.notes || voiceParsedData.raw_text,
        payment_mode: 'cash',
        date: new Date().toISOString().split('T')[0]
      });

      onShowToast({
        type: 'success',
        message: lang === 'hi' ? 'आवाज से खाता एंट्री सफलता से दर्ज हो गई!' : 'Voice transaction confirmed and saved!'
      });

      setShowVoiceConfirmModal(false);
      setVoiceParsedData(null);
      setVoiceSpeechResult('');
      setIsSubmitting(false);
      loadData(searchQuery);
    } catch (err) {
      setIsSubmitting(false);
      onShowToast({ type: 'error', message: err.message || 'Failed to save voice transaction' });
    }
  };

  // WhatsApp Reminder Generator
  const sendWhatsAppReminder = (customer) => {
    if (!customer.phone) {
      onShowToast({ type: 'warning', message: lang === 'hi' ? 'ग्राहक का फ़ोन नंबर दर्ज नहीं है' : 'No phone number for customer' });
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const msg = lang === 'hi'
      ? `नमस्ते ${customer.name} जी, आपकी दुकान का बहीखाता बकाया ₹${customer.balance_due.toLocaleString('en-IN')} है। कृपया समय पर भुगतान करें। धन्यवाद!`
      : `Hello ${customer.name}, your outstanding ledger balance at our store is ₹${customer.balance_due.toLocaleString('en-IN')}. Please clear it at your convenience. Thank you!`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header & Fast Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-apricot-500 to-amber-500 text-white shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {lang === 'hi' ? 'ग्राहक बहीखाता (Customer Khata)' : 'Customer Khata (Ledger)'}
              </h2>
              <p className="text-xs text-stone-500 font-medium">
                {lang === 'hi' ? 'ग्राहकों का उधार (आपने दिए) व जमा (आपको मिले) का पक्का हिसाब' : 'Track customer credit, payments, balances & voice entry'}
              </p>
            </div>
          </div>
        </div>

        {/* 1-Tap Action Buttons */}
        <div className="flex items-center space-x-2.5">
          {/* Voice Mic Button */}
          <button
            onClick={isListening ? stopVoiceInput : startVoiceInput}
            title={lang === 'hi' ? 'बोलकर हिसाब जोड़ें' : 'Speak to record transaction'}
            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/30'
                : 'bg-white hover:bg-apricot-50 text-apricot-800 border border-apricot-300 shadow-apricot-500/10'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-apricot-600" />}
            <span>{isListening ? (lang === 'hi' ? 'सुन रहे हैं...' : 'Listening...') : (lang === 'hi' ? 'बोलकर लिखें' : 'Voice Entry')}</span>
          </button>

          {/* Add Customer Button */}
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 hover:to-amber-600 shadow-md shadow-apricot-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{lang === 'hi' ? '+ नया ग्राहक' : '+ Add Customer'}</span>
          </button>
        </div>
      </div>

      {/* Main Ledger Summary Cards - Big Clear Numbers for Shopkeepers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Total to Receive (मार्केट से लेना है) */}
        <div className="glass-card p-5 rounded-3xl border-emerald-300 bg-gradient-to-br from-emerald-50/90 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider">
              {lang === 'hi' ? 'मार्केट से कुल लेना है (You will receive)' : 'Total to Receive (Market Credit)'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-800 mt-2 tracking-tight">
            {fmt(summary.total_receivable)}
          </p>
          <span className="text-[11px] text-emerald-700 font-bold mt-1 block">
            {lang === 'hi' ? 'दुकान का कुल उधार जो ग्राहकों से आना है' : 'Total money owed by customers to shop'}
          </span>
        </div>

        {/* Total Advance (ग्राहकों का जमा) */}
        <div className="glass-card p-5 rounded-3xl border-apricot-200 bg-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider">
              {lang === 'hi' ? 'ग्राहकों का एडवांस जमा (Advance Balance)' : 'Advance Deposited by Customers'}
            </span>
            <div className="p-2 rounded-xl bg-apricot-100 text-apricot-700">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-stone-800 mt-2 tracking-tight">
            {fmt(summary.total_advance)}
          </p>
          <span className="text-[11px] text-stone-500 font-medium mt-1 block">
            {lang === 'hi' ? 'ग्राहकों द्वारा पहले से जमा रुपया' : 'Prepaid balance in customer wallets'}
          </span>
        </div>

      </div>

      {/* Search & Quick Filter Bar */}
      <div className="flex items-center space-x-3 bg-white p-2.5 rounded-2xl border border-apricot-200 shadow-2xs">
        <Search className="w-5 h-5 text-stone-400 ml-1.5" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={lang === 'hi' ? 'ग्राहक का नाम या फ़ोन नंबर खोजें...' : 'Search customer by name or phone...'}
          className="flex-1 bg-transparent text-sm font-semibold text-stone-800 outline-none placeholder:text-stone-400"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="p-1 text-stone-400 hover:text-stone-700">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customers List & Ledger Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Customer Cards Column (List of all customers) */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black uppercase tracking-wider text-stone-500">
              {lang === 'hi' ? `सभी ग्राहक (${customers.length})` : `All Customers (${customers.length})`}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {customers.length > 0 ? (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                const isOwed = c.balance_due > 0;
                const isAdvance = c.balance_due < 0;

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomer(c)}
                    className={`p-4 rounded-2xl transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-apricot-50 border-apricot-400 shadow-sm'
                        : 'bg-white hover:bg-morning-100/60 border-apricot-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 pr-2">
                        <h4 className="font-black text-sm text-stone-900 truncate">{c.name}</h4>
                        {c.phone ? (
                          <p className="text-xs text-stone-500 font-semibold mt-0.5">{c.phone}</p>
                        ) : (
                          <p className="text-[10px] text-stone-400 mt-0.5">{lang === 'hi' ? 'फ़ोन नंबर नहीं है' : 'No phone'}</p>
                        )}
                      </div>

                      {/* Balance Badge */}
                      <div className="text-right shrink-0">
                        <span className={`text-base font-black tracking-tight ${
                          isOwed ? 'text-rose-600' : isAdvance ? 'text-emerald-700' : 'text-stone-500'
                        }`}>
                          {fmt(Math.abs(c.balance_due))}
                        </span>
                        <span className={`block text-[10px] font-extrabold uppercase ${
                          isOwed ? 'text-rose-600' : isAdvance ? 'text-emerald-700' : 'text-stone-400'
                        }`}>
                          {isOwed 
                            ? (lang === 'hi' ? 'लेना है (Due)' : 'Due') 
                            : isAdvance 
                            ? (lang === 'hi' ? 'एडवांस जमा' : 'Advance') 
                            : (lang === 'hi' ? 'बराबर (Zero)' : 'Settled')}
                        </span>
                      </div>
                    </div>

                    {/* Quick 1-Tap Action Bar for Mobile Shopkeeper */}
                    <div className="mt-3 pt-2.5 border-t border-apricot-100 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-stone-700"
                            title="Call Customer"
                          >
                            <Phone className="w-3.5 h-3.5 text-stone-600" />
                          </a>
                        )}
                        {c.phone && isOwed && (
                          <button
                            onClick={(e) => { e.stopPropagation(); sendWhatsAppReminder(c); }}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                            title="WhatsApp Reminder"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                            setTxType('given');
                            setShowTxModal({ type: 'given', customer: c });
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200"
                        >
                          {lang === 'hi' ? 'दिए (-)' : 'Gave (-)'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(c);
                            setTxType('received');
                            setShowTxModal({ type: 'received', customer: c });
                          }}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                        >
                          {lang === 'hi' ? 'मिले (+)' : 'Got (+)'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-3xl border border-apricot-200 text-stone-400">
                <Users className="w-8 h-8 mx-auto text-stone-300 mb-2" />
                <p className="text-xs font-bold">{lang === 'hi' ? 'कोई ग्राहक नहीं मिला' : 'No customers found'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Selected Customer Detailed Ledger View (Timeline of You Gave / You Received) */}
        <div className="lg:col-span-2">
          {selectedCustomer ? (
            <div className="glass-panel p-6 rounded-3xl border border-apricot-200 space-y-6">
              
              {/* Customer Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-apricot-200 gap-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-black text-stone-900">{selectedCustomer.name}</h3>
                    {selectedCustomer.notes && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-apricot-100 text-apricot-800">
                        {selectedCustomer.notes}
                      </span>
                    )}
                  </div>
                  {selectedCustomer.phone && (
                    <p className="text-xs text-stone-500 font-semibold mt-0.5 flex items-center space-x-1">
                      <Phone className="w-3.5 h-3.5 text-apricot-600" />
                      <span>{selectedCustomer.phone}</span>
                      {selectedCustomer.address && <span>• {selectedCustomer.address}</span>}
                    </p>
                  )}
                </div>

                {/* Big Net Balance Callout */}
                <div className="text-left sm:text-right">
                  <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider block">
                    {lang === 'hi' ? 'कुल बाकी रकम (Net Balance)' : 'Total Balance'}
                  </span>
                  <span className={`text-2xl font-black ${
                    selectedCustomer.balance_due > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}>
                    {fmt(Math.abs(selectedCustomer.balance_due))}
                  </span>
                  <span className="text-[11px] font-bold text-stone-500 block">
                    {selectedCustomer.balance_due > 0 
                      ? (lang === 'hi' ? 'ग्राहक से लेना बाकी है' : 'Owed by customer') 
                      : (lang === 'hi' ? 'ग्राहक का एडवांस जमा' : 'Customer advance')}
                  </span>
                </div>
              </div>

              {/* Action Buttons for this customer */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setTxType('given');
                    setShowTxModal({ type: 'given', customer: selectedCustomer });
                  }}
                  className="py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 flex items-center justify-center space-x-2 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                  <span>{lang === 'hi' ? 'आपने दिए (सामान / उधार दिया)' : 'You Gave (Credit / Udhar)'}</span>
                </button>

                <button
                  onClick={() => {
                    setTxType('received');
                    setShowTxModal({ type: 'received', customer: selectedCustomer });
                  }}
                  className="py-3 px-4 rounded-2xl text-xs sm:text-sm font-black text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 flex items-center justify-center space-x-2 shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                  <span>{lang === 'hi' ? 'आपको मिले (रुपया प्राप्त हुआ)' : 'You Received (Payment / जमा)'}</span>
                </button>
              </div>

              {/* Transactions Timeline Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-stone-500">
                  {lang === 'hi' ? 'लेन-देन इतिहास (Transactions Timeline)' : 'Transaction History'}
                </h4>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-[10px] uppercase text-stone-400 border-b border-apricot-200">
                      <tr>
                        <th className="pb-2.5 font-bold">{lang === 'hi' ? 'तारीख' : 'Date'}</th>
                        <th className="pb-2.5 font-bold">{lang === 'hi' ? 'विवरण' : 'Details'}</th>
                        <th className="pb-2.5 font-bold text-right text-rose-600">{lang === 'hi' ? 'आपने दिए (-)' : 'You Gave'}</th>
                        <th className="pb-2.5 font-bold text-right text-emerald-700">{lang === 'hi' ? 'आपको मिले (+)' : 'You Received'}</th>
                        <th className="pb-2.5 font-bold text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-apricot-100">
                      {selectedCustomer.transactions && selectedCustomer.transactions.length > 0 ? (
                        selectedCustomer.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-apricot-50/50 transition-colors">
                            <td className="py-3 font-semibold text-stone-600">{tx.date}</td>
                            <td className="py-3 text-stone-800 font-bold">
                              <span>{tx.notes || (tx.type === 'given' ? 'सामान उधार' : 'रुपया जमा')}</span>
                              <span className="block text-[10px] text-stone-400 font-normal uppercase">{tx.payment_mode}</span>
                            </td>
                            <td className="py-3 text-right font-black text-rose-600">
                              {tx.type === 'given' ? fmt(tx.amount) : '-'}
                            </td>
                            <td className="py-3 text-right font-black text-emerald-700">
                              {tx.type === 'received' ? fmt(tx.amount) : '-'}
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={async () => {
                                  if (!window.confirm(lang === 'hi' ? 'इस लेन-देन को हटाना चाहते हैं?' : 'Delete this transaction?')) return;
                                  try {
                                    await deleteCustomerTransaction(tx.id);
                                    onShowToast({ type: 'success', message: 'Transaction removed' });
                                    loadData(searchQuery);
                                  } catch (err) {
                                    onShowToast({ type: 'error', message: err.message });
                                  }
                                }}
                                className="p-1 text-stone-400 hover:text-rose-600"
                                title="Delete Entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-stone-400 font-medium">
                            {lang === 'hi' ? 'अभी कोई लेन-देन दर्ज नहीं है।' : 'No transactions recorded yet.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="glass-panel p-12 rounded-3xl border border-apricot-200 text-center flex flex-col items-center justify-center space-y-3">
              <Users className="w-12 h-12 text-apricot-300" />
              <h3 className="text-base font-black text-stone-800">
                {lang === 'hi' ? 'ग्राहक का खाता चुनें' : 'Select a Customer to View Ledger'}
              </h3>
              <p className="text-xs text-stone-500 max-w-sm font-medium">
                {lang === 'hi' 
                  ? 'बाएं हाथ की सूची से किसी ग्राहक पर क्लिक करें या नया लेन-देन जोड़ने के लिए "बोलकर लिखें" बटन दबाएं।' 
                  : 'Click on any customer in the list to view running balances, record credit/payment, or send WhatsApp reminders.'}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Record Transaction Modal (आपने दिए / आपको मिले) */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-3xl bg-white border border-apricot-200 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-apricot-100">
              <div>
                <h3 className="text-base font-extrabold text-stone-900">
                  {txType === 'given' 
                    ? (lang === 'hi' ? 'आपने दिए (उधार दिया)' : 'You Gave (Credit)')
                    : (lang === 'hi' ? 'आपको मिले (रुपया प्राप्त हुआ)' : 'You Received (Payment)')}
                </h3>
                <p className="text-xs text-stone-500 font-bold mt-0.5">
                  {showTxModal.customer?.name}
                </p>
              </div>
              <button onClick={() => setShowTxModal(false)} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              {/* Type Toggle Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-morning-100 border border-apricot-200">
                <button
                  type="button"
                  onClick={() => setTxType('given')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    txType === 'given' ? 'bg-rose-600 text-white shadow-xs' : 'text-stone-600'
                  }`}
                >
                  🔴 {lang === 'hi' ? 'आपने दिए (उधार)' : 'You Gave'}
                </button>
                <button
                  type="button"
                  onClick={() => setTxType('received')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    txType === 'received' ? 'bg-emerald-600 text-white shadow-xs' : 'text-stone-600'
                  }`}
                >
                  🟢 {lang === 'hi' ? 'आपको मिले (जमा)' : 'You Received'}
                </button>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {lang === 'hi' ? 'रुपया / राशि' : 'Amount'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-500 text-base font-black">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={txForm.amount}
                    onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3.5 py-3 rounded-2xl text-xl font-black bg-morning-50 border border-apricot-200 text-stone-900 outline-none focus:ring-2 focus:ring-apricot-400"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">{lang === 'hi' ? 'तारीख' : 'Date'}</label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none font-semibold"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {lang === 'hi' ? 'सामान / विवरण (वैकल्पिक)' : 'Items / Notes (Optional)'}
                </label>
                <input
                  type="text"
                  value={txForm.notes}
                  onChange={(e) => setTxForm({ ...txForm, notes: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: 10 किलो आटा, दाल, या GPay भुगतान' : 'e.g. Rice 10kg, milk, or UPI'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-stone-600 hover:text-stone-900 bg-morning-100 font-bold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-6 py-2.5 rounded-2xl font-black text-white shadow-md active:scale-95 transition-all disabled:opacity-50 cursor-pointer ${
                    txType === 'given' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : (lang === 'hi' ? 'खाते में जोड़ें' : 'Save Entry')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-3xl bg-white border border-apricot-200 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-apricot-100">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-apricot-600" />
                <span>{lang === 'hi' ? 'नया ग्राहक जोड़ें' : 'Add New Customer'}</span>
              </h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="p-1.5 rounded-xl text-stone-400 hover:text-stone-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {lang === 'hi' ? 'ग्राहक का नाम' : 'Customer Name'} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: रमेश जी, शर्मा मास्टर' : 'e.g. Ramesh Kumar'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none font-bold text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {lang === 'hi' ? 'फ़ोन नंबर (व्हाट्सएप के लिए)' : 'Phone Number (for WhatsApp reminders)'}
                </label>
                <input
                  type="text"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {lang === 'hi' ? 'पता / गली (वैकल्पिक)' : 'Address / Area'}
                </label>
                <input
                  type="text"
                  value={customerForm.address}
                  onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                  placeholder={lang === 'hi' ? 'जैसे: गली नंबर 3, मंदिर के पास' : 'e.g. Near Shiv Mandir'}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  {lang === 'hi' ? 'पुराना बाकी / शुरुआती बैलेंस (वैकल्पिक)' : 'Opening Balance (Optional)'}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-stone-500 text-base font-black">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customerForm.opening_balance}
                    onChange={(e) => setCustomerForm({ ...customerForm, opening_balance: e.target.value })}
                    placeholder="0.00"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl bg-morning-50 border border-apricot-200 text-stone-900 outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-stone-600 hover:text-stone-900 bg-morning-100 font-bold"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-2xl font-black bg-gradient-to-r from-apricot-500 to-amber-500 hover:from-apricot-600 text-white shadow-md shadow-apricot-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : (lang === 'hi' ? 'ग्राहक जोड़ें' : 'Add Customer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voice Input Confirmation Modal (Safety Confirmation Gate) */}
      {showVoiceConfirmModal && voiceParsedData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="w-full max-w-md rounded-3xl bg-white border-2 border-apricot-400 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-apricot-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-apricot-100 text-apricot-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-stone-900">
                    {lang === 'hi' ? 'जांचें और कन्फर्म करें' : 'Confirm Voice Transaction'}
                  </h3>
                  <p className="text-[11px] text-stone-500 font-medium">
                    {lang === 'hi' ? 'बिना पुष्टि के कोई लेन-देन सेव नहीं होगा' : 'Review details extracted from your speech'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowVoiceConfirmModal(false)} className="p-1 rounded-lg text-stone-400 hover:text-stone-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Speech Transcript Audio Chip */}
            <div className="p-3 rounded-2xl bg-morning-100 border border-apricot-200 text-xs text-stone-700 flex items-start space-x-2.5">
              <Volume2 className="w-4 h-4 text-apricot-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-[10px] uppercase text-stone-400 block">
                  {lang === 'hi' ? 'आपने जो बोला:' : 'Spoken words:'}
                </span>
                <p className="font-semibold text-stone-800 italic mt-0.5">"{voiceParsedData.raw_text}"</p>
              </div>
            </div>

            {/* Editable Proposed Transaction */}
            <div className="space-y-3.5 p-4 rounded-2xl bg-morning-50 border border-apricot-200 text-xs">
              
              {/* Type Badge */}
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-600">{lang === 'hi' ? 'लेन-देन प्रकार:' : 'Transaction Type:'}</span>
                <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                  voiceParsedData.type === 'given' 
                    ? 'bg-rose-100 text-rose-800 border border-rose-300' 
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}>
                  {voiceParsedData.type === 'given' 
                    ? (lang === 'hi' ? '🔴 आपने दिए (उधार)' : 'You Gave') 
                    : (lang === 'hi' ? '🟢 आपको मिले (जमा)' : 'You Received')}
                </span>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">{lang === 'hi' ? 'ग्राहक' : 'Customer'}</label>
                <input
                  type="text"
                  value={voiceParsedData.customer_name || ''}
                  onChange={(e) => setVoiceParsedData({ ...voiceParsedData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-apricot-200 text-stone-900 font-bold"
                />
                {voiceParsedData.matched_customer && (
                  <span className="text-[10px] text-emerald-700 font-bold mt-1 block">
                    ✓ {lang === 'hi' ? `मौजूदा ग्राहक: ${voiceParsedData.matched_customer.name} (बाकी: ₹${voiceParsedData.matched_customer.balance_due})` : `Matched existing customer`}
                  </span>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">{lang === 'hi' ? 'रुपया / राशि' : 'Amount (₹)'}</label>
                <input
                  type="number"
                  step="0.01"
                  value={voiceParsedData.amount || ''}
                  onChange={(e) => setVoiceParsedData({ ...voiceParsedData, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-apricot-200 text-stone-900 font-black text-lg"
                />
              </div>

            </div>

            {/* Confirmation Buttons */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowVoiceConfirmModal(false)}
                className="flex-1 py-3 rounded-2xl bg-morning-100 hover:bg-morning-200 text-stone-700 font-bold text-xs"
              >
                {lang === 'hi' ? 'रद्द करें' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={isSubmitting || !voiceParsedData.amount}
                onClick={handleConfirmVoiceTransaction}
                className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : (lang === 'hi' ? '✓ कन्फर्म करें' : 'Confirm & Save')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
