# ShopLedger - AI Business Expense Tracker & Shopkeeper Khata

> AI Business Expense Tracker, Smart Khata, Daily Hisab & Receipt Auditor for Small Retailers.
> Built as a modern, high-performance React application powered by Google Gemini AI, client-side persistence, real-time duplicate detection, and conversational financial analytics.

---

## 🌟 Features

1. **Customer Khata (ग्राहक बहीखाता)**
   - "आपने दिए (You gave / Udhar)" and "आपको मिले (You received / Payment)" accounting ledger.
   - Real-time customer search, credit limit monitoring, and outstanding balance tracking.
   - **Voice Khata Input**: Voice and natural speech entry in Hindi and English (e.g. *"Ramesh ko 500 rupaye udhar diye"*).
   - Instant WhatsApp payment reminder generator with custom regional greeting templates.

2. **Daily Hisab (दैनिक हिसाब)**
   - Complete daily counter ledger: Total Sales, Cash Sales, UPI QR payments, and Credit Udhar.
   - Galla (Cash in Hand) tracker and shop expense deductions.
   - Quick sale recording with payment mode categorization.

3. **Supplier Khata (सप्लायर खाता)**
   - Wholesale vendor directory (Amul Dairy, Britannia, Tata Consumer, Fortune Oils, HUL).
   - Track purchases, payments, and Baqi dues with automated due date tracking.
   - Visual alerts for overdue payments and payments due soon.

4. **Smart Stock (स्मार्ट स्टॉक & Inventory)**
   - Real-time inventory tracking with unit metrics (kg, bag, tin, packet, box).
   - Safety threshold alerts for low-stock items.
   - 1-click **Stock Sync from Receipts**: automatically imports itemized line items into inventory.

5. **Profit & Loss Overview (मुनाफा रिपोर्ट)**
   - Comprehensive Gross Profit, COGS, Operating Expenses, and Net Profit margins.
   - Flexible period filters (Today, This Week, This Month, This Year, Custom).
   - Interactive trend charts powered by Recharts.

6. **Receipt OCR & Audit-Grade Duplicate Detection**
   - Multimodal invoice parsing with extraction of merchant, date, total, tax, and itemized line items.
   - 3-tier duplicate detection: exact invoice number, identical vendor/date/total, and near-date statement lag matching.
   - Low-confidence and blurry document flags.
   - 1-click demo test bills for instant testing.

7. **Conversational Financial AI Assistant**
   - Query shop finances in English, Hindi, or Hinglish (*"Aaj ka hisab batao"*, *"Amul ka kitna baqi hai"*, *"Kaunsa stock khatam hone wala hai"*).
   - Factual calculations directly computed from store records with verifiable receipt citations.

8. **Bilingual Support (English / हिन्दी)**
   - Complete dual-language interface with one-click instant toggle in the navbar.

9. **Data Persistence & Export**
   - In-browser localStorage engine with instant zero-latency reactivity.
   - One-click CSV ledger export download.
   - One-click "Reset Demo Data" button to restore the pristine Kirana store records anytime.

---

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Start development server on port 3000
npm run dev

# Build production bundle
npm run build
```

---

## 📄 License
MIT License.
