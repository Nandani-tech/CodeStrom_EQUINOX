# ShopLedger - AI Business Expense Tracker & Receipt Auditor

[![Google for Developers](https://img.shields.io/badge/Google%20for%20Developers-Hackathon%20Project-4285F4?style=for-the-badge&logo=google)](https://developers.google.com/)
[![React](https://img.shields.io/badge/React%2019-Vite-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Python Flask](https://img.shields.io/badge/Python-Flask%203.1-000000?style=for-the-badge&logo=flask)](https://flask.palletsprojects.com/)
[![Google Gemini API](https://img.shields.io/badge/Google%20Gemini-2.5%20Flash-8E75C2?style=for-the-badge&logo=google-gemini)](https://aistudio.google.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite)](https://www.sqlite.org/)

> **Built for the 24-Hour Google for Developers Hackathon**  
> Turn receipt photos and PDFs into organized business expense records using Google Gemini AI, real-time duplicate detection, and factual conversational financial intelligence.

---

## 💡 The Problem & Solution

* **The Problem:** Small businesses, freelancers, and finance teams drown in messy receipt photos, blurred screenshots, and email invoice PDFs. Manual data entry is slow, prone to missing sales tax, leads to accidental duplicate reimbursements, and leaves business owners guessing their true cash outflow.
* **The Solution (ShopLedger):** An end-to-end audit ledger powered by **Google Gemini API** that parses unstructured receipts, highlights missing or low-confidence fields for human review, flags statement duplicates before confirmation, provides interactive Recharts financial analytics, and offers an AI assistant that answers spending questions using verified database figures and clickable receipt citations.

---

## 🌟 Key Features

1. **Multimodal Receipt Extraction (Gemini 2.5 Flash)**
   - Upload receipt images (`.png`, `.jpg`, `.jpeg`, `.webp`) and invoice `.pdf` files.
   - Gemini multimodal OCR extracts merchant/vendor, date, total amount, subtotal, tax, tip, payment method, invoice number, and itemized line items.
   - Graceful fallback: Built-in intelligent heuristic parser and financial engine for seamless offline hackathon demos if an API key is not configured.

2. **Editable Review Form & Low-Confidence Highlighting**
   - Interactive review form highlights uncertain, estimated, or blurred fields with amber warning chips (e.g. `tax?`, `date?`).
   - Dynamic line items editor with 1-click **Recalculate Total** from line items.
   - Single-click **Confirm & Add to Ledger** approving receipts into the confirmed ledger.

3. **Real-Time Duplicate Detection Engine**
   - Multi-tier duplicate detection comparing candidate receipts against SQLite records:
     - **Exact Invoice Match** (`similarity_score: 0.99`)
     - **Identical Vendor, Date, and Amount Match** (`similarity_score: 0.95`)
     - **Near-Date Match** within 3 days for statement billing lag (`similarity_score: 0.82`)
   - Visual warning banners detailing matched receipt IDs and reasons.

4. **Executive Financial Dashboard**
   - **Confirmed Spending KPI**: Real-time audit-verified total (starts at `$5,353.04` across confirmed demo receipts).
   - **Monthly Expense Trajectory**: Interactive Recharts gradient Area Chart.
   - **Category Breakdown**: Recharts Donut Chart with percentage distribution across 9 standard expense categories.
   - **Top Vendors Leaderboard**: Visual bar chart ranking top spending recipients.
   - **Action Alerts Banner**: Instant indicator of items needing review or duplicate flags.

5. **Conversational AI Financial Assistant**
   - Answers spending questions using real database figures and Python-calculated aggregates.
   - **Clickable Proof Citations**: Every answer references exact receipt IDs (e.g., `[Receipt #4]`). Clicking a citation immediately opens the full receipt inspection modal!
   - Instant suggested prompt chips for rapid testing.

6. **Export Confirmed Records to CSV**
   - Stream or download clean, audit-compliant CSV reports with receipt ID, date, vendor, category, total, subtotal, tax, tip, payment method, invoice number, and notes.

7. **20 Synthetic Business Receipts & 1-Click Demo Pills**
   - Pre-seeded with 20 realistic business receipts spanning Software (AWS, GitHub, Slack), Hardware (Apple, Best Buy), Travel (Delta, Marriott, Uber), Meals (Capital Grille, Sweetgreen), and Professional Services (Cooley LLP).
   - Includes real duplicate test cases (Uber duplicate ride) and low-confidence tests (Sweetgreen blurry receipt).
   - **1-Click Demo Pills** in the Upload tab allowing judges to test upload extraction instantly without searching for local files!

8. **Automated Backend Test Suite**
   - 10 automated unit and integration tests passing with 100% test coverage via `pytest`.

---

## 🛠️ Architecture & Tech Stack

```
shopledger/
├── backend/
│   ├── app.py                  # Flask REST API server (CORS, file uploads, endpoints)
│   ├── database.py             # SQLite schema, persistent records, analytics queries
│   ├── gemini_service.py       # Google Gemini 2.5 Flash multimodal extraction & fallback
│   ├── receipt_duplicates.py   # Multi-tier duplicate detection engine
│   ├── ai_assistant.py         # Financial reasoning engine with factual DB math
│   ├── seed_data.py            # 20 synthetic business receipts generator with SVG documents
│   ├── test_app.py             # Pytest test suite (10/10 passed)
│   └── requirements.txt        # Python backend dependencies
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Navigation header, Gemini status, demo reset
│   │   │   ├── DashboardView.jsx       # KPIs, Area & Donut charts, top vendors
│   │   │   ├── ReceiptsTableView.jsx   # Filterable & sortable ledger table
│   │   │   ├── UploadView.jsx          # Drag-and-drop, 1-click pills, review form
│   │   │   ├── AIAssistantView.jsx     # Conversational chat with clickable [Receipt #ID]
│   │   │   ├── ReceiptDetailModal.jsx  # Inspection modal & document viewer
│   │   │   ├── ReceiptEditModal.jsx    # Full modal editor
│   │   │   └── Toast.jsx               # Animated alert notifications
│   │   ├── api.js                      # Centralized API client
│   │   ├── App.jsx                     # Main application layout & global state
│   │   ├── index.css                   # Glassmorphism & custom utility styles
│   │   └── main.jsx                    # React 19 entry point
│   ├── package.json                    # Frontend dependencies (React 19, Lucide, Recharts)
│   ├── tailwind.config.js              # Custom dark-mode slate & indigo design tokens
│   └── vite.config.js                  # Vite dev server configuration with proxy
├── uploads/                            # Persisted receipt documents (SVGs, PNGs, PDFs)
├── shopledger.db                       # SQLite database
├── .env.example                        # Example environment config
└── README.md                           # Documentation & Walkthrough
```

---

## 🚀 Quickstart Guide (Run Locally)

### 1. Prerequisites
- **Python 3.10+**
- **Node.js 18+** and **npm**

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(Optional)* Add your Google Gemini API key in `.env`:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
PORT=5002
FLASK_ENV=development
```
> *Note: If no Gemini API key is provided, ShopLedger automatically activates its built-in intelligent fallback financial engine and heuristic parser so you can still test all features smoothly!*

### 3. Backend Setup & Run
Activate the virtual environment and start the Flask server:
```bash
# From workspace root
source venv/bin/activate

# Start backend server on port 5002
PORT=5002 python backend/app.py
```
Backend will start at: `http://127.0.0.1:5002`

### 4. Frontend Setup & Run
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at: **`http://localhost:5173`**

### 5. Running Automated Tests
Run the pytest suite to verify all backend endpoints:
```bash
./venv/bin/pytest backend/test_app.py -v
```

---

## 🎯 Demo Walkthrough for Hackathon Judges

1. **Explore the Dashboard (`/`)**:
   - Check the **Confirmed Spend KPI** (`$5,353.04`) across 18 confirmed receipts.
   - Hover over the **Monthly Expense Trajectory** chart and **Category Breakdown** donut chart.
   - View top vendors like Apple Store, Cooley LLP, WeWork, and Delta Air Lines.
2. **Review Pending & Duplicate Receipts**:
   - Click the **"Needs Attention"** card or **Receipts Ledger** tab.
   - Switch to the **Pending Review** tab to see receipts with flagged uncertain fields (e.g. Sweetgreen with uncertain tax).
   - Switch to the **Duplicate Flagged** tab to see the Uber duplicate warning.
3. **Test 1-Click Upload & Review**:
   - Navigate to the **Upload & Review** tab.
   - Click any sample receipt pill (e.g., `Aws March Invoice` or `Apple Macbook Receipt`).
   - Watch the animated AI extraction, inspect the pre-filled fields, and click **Confirm & Add to Ledger**.
4. **Chat with AI Financial Assistant**:
   - Navigate to the **AI Assistant** tab.
   - Click a quick prompt: *"What is our total confirmed spend?"* or *"How much did we spend on Software & SaaS?"*.
   - In the response, click any **`[Receipt #X]`** evidence button to inspect the receipt in the detail modal.
5. **Export to CSV**:
   - Click the **Export CSV** button in the navbar to download the verified expense records.
6. **Reset Demo Data Anytime**:
   - Click **Reset Demo** in the top navbar to instantly restore the initial 20 synthetic business receipts.

---

## 📄 License
MIT License. Built for the Google for Developers Hackathon.
