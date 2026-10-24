import os
import json
from datetime import datetime, timedelta
from database import (
    init_db, 
    get_db, 
    insert_receipt, 
    insert_sale, 
    insert_supplier, 
    insert_supplier_transaction, 
    insert_inventory_item,
    insert_customer,
    insert_customer_transaction
)

DEMO_SUPPLIERS = [
    {
        "name": "Amul Dairy & Fresh Milk Distributors",
        "phone": "+91 98390 12345",
        "category": "Dairy & Milk",
        "address": "Shop 4, Mandi Complex, Kanpur",
        "notes": "Daily morning milk, curd, paneer, and butter supply"
    },
    {
        "name": "Britannia & Parle FMCG Agency",
        "phone": "+91 98391 23456",
        "category": "Biscuits & Bakery",
        "address": "Transport Nagar, Kanpur",
        "notes": "Weekly biscuit, rusk, and snack cartons delivery"
    },
    {
        "name": "Tata Consumer Products Mandi Agency",
        "phone": "+91 98392 34567",
        "category": "Tea, Pulses & Salt",
        "address": "Collectorganj Mandi, Kanpur",
        "notes": "Tea packets, Tata Sampann pulses, and iodized salt"
    },
    {
        "name": "Fortune & Gemini Edible Oil Wholesalers",
        "phone": "+91 98393 45678",
        "category": "Edible Oils",
        "address": "Nayaganj, Kanpur",
        "notes": "15L Mustard oil tins, 1L pouch cartons"
    },
    {
        "name": "Hindustan Unilever (HUL) Distribution",
        "phone": "+91 98394 56789",
        "category": "Personal Care & Home",
        "address": "Fazalganj Industrial Area, Kanpur",
        "notes": "Surf Excel, Lifebuoy, Vim Bar, Clinic Plus"
    }
]

DEMO_INVENTORY = [
    {
        "name": "Basmati Rice Premium 25kg",
        "hindi_name": "बासमती चावल 25 किलो",
        "category": "Grains & Pulses",
        "unit": "bag",
        "current_stock": 14.0,
        "min_stock_alert": 4.0,
        "cost_price": 1850.0,
        "selling_price": 2150.0
    },
    {
        "name": "Sugar (M-30 Grade) 50kg Bag",
        "hindi_name": "चीनी 50 किलो बोरी",
        "category": "Grocery Staples",
        "unit": "bag",
        "current_stock": 2.0, # LOW STOCK ALERT!
        "min_stock_alert": 5.0,
        "cost_price": 1950.0,
        "selling_price": 2100.0
    },
    {
        "name": "Fortune Kachi Ghani Mustard Oil 15L Tin",
        "hindi_name": "फॉर्च्यून सरसों तेल 15L टिन",
        "category": "Edible Oils",
        "unit": "tin",
        "current_stock": 1.0, # LOW STOCK ALERT!
        "min_stock_alert": 4.0,
        "cost_price": 2150.0,
        "selling_price": 2350.0
    },
    {
        "name": "Tata Tea Gold 500g Packet",
        "hindi_name": "टाटा टी गोल्ड 500g",
        "category": "Tea & Coffee",
        "unit": "packet",
        "current_stock": 28.0,
        "min_stock_alert": 8.0,
        "cost_price": 240.0,
        "selling_price": 275.0
    },
    {
        "name": "Toor / Arhar Dal Desi 30kg Bag",
        "hindi_name": "अरहर / तूर दाल 30 किलो",
        "category": "Grains & Pulses",
        "unit": "bag",
        "current_stock": 6.0,
        "min_stock_alert": 3.0,
        "cost_price": 3900.0,
        "selling_price": 4350.0
    },
    {
        "name": "Aashirvaad Shudh Chakki Atta 10kg",
        "hindi_name": "आशीर्वाद चक्की आटा 10 किलो",
        "category": "Flour & Atta",
        "unit": "bag",
        "current_stock": 18.0,
        "min_stock_alert": 5.0,
        "cost_price": 365.0,
        "selling_price": 410.0
    },
    {
        "name": "Surf Excel Easy Wash 1kg Pkt",
        "hindi_name": "सर्फ एक्सेल ईज़ी वॉश 1 किलो",
        "category": "Detergents & Soaps",
        "unit": "packet",
        "current_stock": 35.0,
        "min_stock_alert": 10.0,
        "cost_price": 128.0,
        "selling_price": 145.0
    },
    {
        "name": "Amul Butter 500g Pack",
        "hindi_name": "अमूल बटर 500g",
        "category": "Dairy",
        "unit": "packet",
        "current_stock": 3.0, # LOW STOCK ALERT!
        "min_stock_alert": 6.0,
        "cost_price": 255.0,
        "selling_price": 285.0
    }
]

def generate_sample_svg(uploads_dir, filename, vendor, total, date, category):
    os.makedirs(uploads_dir, exist_ok=True)
    target_path = os.path.join(uploads_dir, filename)
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="400" height="520" viewBox="0 0 400 520">
  <defs>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <rect width="400" height="520" fill="#0f172a"/>
  <rect x="20" y="20" width="360" height="480" rx="16" fill="#1e293b" filter="url(#shadow)" stroke="#334155" stroke-width="2"/>
  <rect x="20" y="20" width="360" height="75" rx="16" fill="#312e81"/>
  <text x="40" y="52" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">TAX INVOICE / रसीद</text>
  <text x="40" y="75" font-family="Arial, sans-serif" font-size="12" fill="#c7d2fe">{vendor[:32]}</text>
  <text x="40" y="125" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">Date / दिनांक:</text>
  <text x="160" y="125" font-family="monospace" font-size="13" font-weight="bold" fill="#f8fafc">{date}</text>
  <text x="40" y="155" font-family="Arial, sans-serif" font-size="12" fill="#94a3b8">Category / श्रेणी:</text>
  <text x="160" y="155" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#818cf8">{category}</text>
  <line x1="40" y1="180" x2="360" y2="180" stroke="#334155" stroke-dasharray="4"/>
  <text x="40" y="210" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#e2e8f0">Itemized Description</text>
  <text x="320" y="210" font-family="Arial, sans-serif" font-size="13" font-weight="bold" fill="#e2e8f0" text-anchor="end">Amount (₹)</text>
  <text x="40" y="240" font-family="Arial, sans-serif" font-size="12" fill="#cbd5e1">1. Goods / Service Provision</text>
  <text x="320" y="240" font-family="monospace" font-size="13" fill="#cbd5e1" text-anchor="end">₹{total * 0.95:.2f}</text>
  <text x="40" y="270" font-family="Arial, sans-serif" font-size="12" fill="#cbd5e1">2. GST (CGST+SGST @ 5%)</text>
  <text x="320" y="270" font-family="monospace" font-size="13" fill="#cbd5e1" text-anchor="end">₹{total * 0.05:.2f}</text>
  <line x1="40" y1="360" x2="360" y2="360" stroke="#4f46e5" stroke-width="2"/>
  <text x="40" y="405" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#ffffff">TOTAL / कुल देय:</text>
  <text x="360" y="405" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#34d399" text-anchor="end">₹{total:,.2f}</text>
  <rect x="40" y="435" width="320" height="40" rx="8" fill="#0f172a" stroke="#334155"/>
  <text x="200" y="460" font-family="Arial, sans-serif" font-size="11" fill="#94a3b8" text-anchor="middle">✓ ShopLedger Verified · GST Invoice</text>
</svg>"""
    with open(target_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    return target_path

def seed_indian_shopkeeper_data(db_path=None, uploads_dir=None):
    init_db(db_path)
    conn = get_db(db_path)
    cursor = conn.cursor()

    # Clear existing tables cleanly
    cursor.execute("DELETE FROM stock_logs")
    cursor.execute("DELETE FROM inventory_items")
    cursor.execute("DELETE FROM supplier_transactions")
    cursor.execute("DELETE FROM suppliers")
    cursor.execute("DELETE FROM sales")
    cursor.execute("DELETE FROM receipt_items")
    cursor.execute("DELETE FROM audit_logs")
    cursor.execute("DELETE FROM receipts")
    try:
        cursor.execute("DELETE FROM sqlite_sequence")
    except Exception:
        pass
    conn.commit()
    conn.close()

    actual_uploads = uploads_dir or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    os.makedirs(actual_uploads, exist_ok=True)

    today = datetime.now()
    today_str = today.strftime("%Y-%m-%d")
    yesterday_str = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    two_days_ago = (today - timedelta(days=2)).strftime("%Y-%m-%d")

    # 1. Seed Suppliers
    supplier_map = {}
    for s_data in DEMO_SUPPLIERS:
        s = insert_supplier(s_data, db_path=db_path)
        supplier_map[s["name"]] = s["id"]

    # 2. Seed Supplier Transactions (Purchases and Payments with outstanding Baqi)
    # Amul: Purchased ₹18,500, Paid ₹12,000 -> Baqi ₹6,500 due in 3 days!
    insert_supplier_transaction({
        "supplier_id": supplier_map["Amul Dairy & Fresh Milk Distributors"],
        "date": two_days_ago,
        "type": "purchase",
        "amount": 18500.0,
        "payment_mode": "credit",
        "due_date": (today + timedelta(days=3)).strftime("%Y-%m-%d"),
        "notes": "Milk crate 30 units, butter, paneer wholesale stock"
    }, db_path=db_path)
    insert_supplier_transaction({
        "supplier_id": supplier_map["Amul Dairy & Fresh Milk Distributors"],
        "date": yesterday_str,
        "type": "payment",
        "amount": 12000.0,
        "payment_mode": "upi",
        "notes": "UPI advance payment via PhonePe"
    }, db_path=db_path)

    # Britannia: Purchased ₹14,200, Paid ₹14,200 -> Fully Settled (₹0 Baqi)
    insert_supplier_transaction({
        "supplier_id": supplier_map["Britannia & Parle FMCG Agency"],
        "date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
        "type": "purchase",
        "amount": 14200.0,
        "payment_mode": "credit",
        "due_date": yesterday_str,
        "notes": "Good Day, Marie Gold, Parle-G cartons"
    }, db_path=db_path)
    insert_supplier_transaction({
        "supplier_id": supplier_map["Britannia & Parle FMCG Agency"],
        "date": yesterday_str,
        "type": "payment",
        "amount": 14200.0,
        "payment_mode": "cash",
        "notes": "Cash payment on delivery"
    }, db_path=db_path)

    # Fortune Edible Oils: Purchased ₹21,500, Paid ₹10,000 -> Baqi ₹11,500 (Due tomorrow!)
    insert_supplier_transaction({
        "supplier_id": supplier_map["Fortune & Gemini Edible Oil Wholesalers"],
        "date": two_days_ago,
        "type": "purchase",
        "amount": 21500.0,
        "payment_mode": "credit",
        "due_date": (today + timedelta(days=1)).strftime("%Y-%m-%d"), # Due tomorrow!
        "notes": "10 Tins Kachi Ghani Mustard Oil & Soyabean Oil"
    }, db_path=db_path)
    insert_supplier_transaction({
        "supplier_id": supplier_map["Fortune & Gemini Edible Oil Wholesalers"],
        "date": yesterday_str,
        "type": "payment",
        "amount": 10000.0,
        "payment_mode": "bank_transfer",
        "notes": "Part payment via NetBanking"
    }, db_path=db_path)

    # Tata Consumer: Purchased ₹16,800, Paid ₹16,800
    insert_supplier_transaction({
        "supplier_id": supplier_map["Tata Consumer Products Mandi Agency"],
        "date": (today - timedelta(days=4)).strftime("%Y-%m-%d"),
        "type": "purchase",
        "amount": 16800.0,
        "payment_mode": "cash",
        "notes": "Tata Tea Gold 1 Carton & Sampann Pulses"
    }, db_path=db_path)
    insert_supplier_transaction({
        "supplier_id": supplier_map["Tata Consumer Products Mandi Agency"],
        "date": (today - timedelta(days=4)).strftime("%Y-%m-%d"),
        "type": "payment",
        "amount": 16800.0,
        "payment_mode": "cash",
        "notes": "Settled on receipt"
    }, db_path=db_path)

    # 3. Seed Inventory Items
    for inv in DEMO_INVENTORY:
        insert_inventory_item(inv, db_path=db_path)

    # 4. Seed Daily Sales (Today, Yesterday, 2 Days Ago)
    # Today's Sales
    demo_sales = [
        {"date": today_str, "amount": 850.0, "payment_mode": "cash", "customer_name": "Ramesh Kumar", "notes": "Atta 10kg + Sugar 2kg"},
        {"date": today_str, "amount": 1420.0, "payment_mode": "upi", "customer_name": "Sharma Ji", "notes": "GPay - Mustard oil 1 tin + Tea"},
        {"date": today_str, "amount": 620.0, "payment_mode": "cash", "customer_name": "Sunita Bhabhi", "notes": "Dal 2kg + Spices"},
        {"date": today_str, "amount": 2100.0, "payment_mode": "credit", "customer_name": "Verma Master Ji", "notes": "Monthly Udhar Khata: Rice 25kg bag"},
        {"date": today_str, "amount": 430.0, "payment_mode": "cash", "customer_name": "Walk-in Retail", "notes": "Soap, detergent, toothpaste"},
        {"date": today_str, "amount": 950.0, "payment_mode": "upi", "customer_name": "Amit Saxena", "notes": "PhonePe - Dry fruits & Ghee"},

        # Yesterday's Sales
        {"date": yesterday_str, "amount": 3200.0, "payment_mode": "cash", "customer_name": "General Retail", "notes": "Counter cash sales"},
        {"date": yesterday_str, "amount": 4150.0, "payment_mode": "upi", "customer_name": "UPI QR Code", "notes": "Paytm Soundbox UPI receipts"},
        {"date": yesterday_str, "amount": 1100.0, "payment_mode": "credit", "customer_name": "Gupta Contractor", "notes": "Udhar on notebook ledger"},

        # Two Days Ago
        {"date": two_days_ago, "amount": 2900.0, "payment_mode": "cash", "customer_name": "Counter Cash", "notes": "Morning and evening retail"},
        {"date": two_days_ago, "amount": 3800.0, "payment_mode": "upi", "customer_name": "QR Payments", "notes": "UPI total aggregate"}
    ]
    for s in demo_sales:
        insert_sale(s, db_path=db_path)

    # 5. Seed Realistic Indian Business Receipts / Bills (Stock Purchases + Operating Expenses)
    indian_receipts = [
        # Stock Purchase Receipts
        {
            "vendor": "Amul Dairy & Milk Distributors",
            "date": two_days_ago,
            "total": 18500.0,
            "subtotal": 17619.0,
            "tax": 881.0,
            "currency": "INR",
            "category": "Dairy & Milk",
            "expense_type": "stock_purchase",
            "supplier_id": supplier_map.get("Amul Dairy & Fresh Milk Distributors"),
            "status": "confirmed",
            "payment_method": "Credit / Partial UPI",
            "invoice_number": "AMUL-KN-9921",
            "file_name": "amul_wholesale_invoice.svg",
            "file_type": "image/svg+xml",
            "notes": "Daily milk crate, amul butter cartons & paneer wholesale batch",
            "confidence_score": 0.98,
            "uncertain_fields": [],
            "items": [
                {"description": "Amul Taaza Milk Crates (12 pkts)", "quantity": 10, "unit_price": 720.0, "total_price": 7200.0, "category": "Dairy"},
                {"description": "Amul Butter 500g Boxes", "quantity": 20, "unit_price": 255.0, "total_price": 5100.0, "category": "Dairy"},
                {"description": "Amul Fresh Paneer Blocks 1kg", "quantity": 15, "unit_price": 413.0, "total_price": 6200.0, "category": "Dairy"}
            ]
        },
        {
            "vendor": "Fortune & Gemini Oil Mandi Agency",
            "date": two_days_ago,
            "total": 21500.0,
            "subtotal": 20476.0,
            "tax": 1024.0,
            "currency": "INR",
            "category": "Edible Oils",
            "expense_type": "stock_purchase",
            "supplier_id": supplier_map.get("Fortune & Gemini Edible Oil Wholesalers"),
            "status": "confirmed",
            "payment_method": "Bank Transfer",
            "invoice_number": "FRT-2026-8812",
            "file_name": "fortune_oil_invoice.svg",
            "file_type": "image/svg+xml",
            "notes": "10 Tins Kachi Ghani Mustard Oil Wholesale Mandi Lot",
            "confidence_score": 0.99,
            "uncertain_fields": [],
            "items": [
                {"description": "Fortune Kachi Ghani Mustard Oil 15L Tin", "quantity": 10, "unit_price": 2150.0, "total_price": 21500.0, "category": "Edible Oils"}
            ]
        },
        {
            "vendor": "Tata Consumer Products Mandi Agency",
            "date": (today - timedelta(days=4)).strftime("%Y-%m-%d"),
            "total": 16800.0,
            "subtotal": 16000.0,
            "tax": 800.0,
            "currency": "INR",
            "category": "Tea, Pulses & Salt",
            "expense_type": "stock_purchase",
            "supplier_id": supplier_map.get("Tata Consumer Products Mandi Agency"),
            "status": "confirmed",
            "payment_method": "Cash",
            "invoice_number": "TATA-CP-4401",
            "file_name": "tata_tea_invoice.svg",
            "file_type": "image/svg+xml",
            "notes": "Tata Tea Gold 500g master carton & Tata Sampann Moong Dal",
            "confidence_score": 0.98,
            "uncertain_fields": [],
            "items": [
                {"description": "Tata Tea Gold 500g Master Carton (40 pkts)", "quantity": 1, "unit_price": 9600.0, "total_price": 9600.0, "category": "Tea"},
                {"description": "Tata Sampann Moong Dal 30kg Bag", "quantity": 2, "unit_price": 3600.0, "total_price": 7200.0, "category": "Pulses"}
            ]
        },
        {
            "vendor": "Britannia & Parle FMCG Agency",
            "date": (today - timedelta(days=5)).strftime("%Y-%m-%d"),
            "total": 14200.0,
            "subtotal": 13523.0,
            "tax": 677.0,
            "currency": "INR",
            "category": "Biscuits & Bakery",
            "expense_type": "stock_purchase",
            "supplier_id": supplier_map.get("Britannia & Parle FMCG Agency"),
            "status": "confirmed",
            "payment_method": "Cash",
            "invoice_number": "BRIT-7731",
            "file_name": "britannia_biscuits_bill.svg",
            "file_type": "image/svg+xml",
            "notes": "Good Day, Marie Gold, Parle-G wholesale cartons",
            "confidence_score": 0.97,
            "uncertain_fields": [],
            "items": [
                {"description": "Parle-G Gold Master Box (96 pkts)", "quantity": 1, "unit_price": 4800.0, "total_price": 4800.0, "category": "Biscuits"},
                {"description": "Britannia Good Day Butter Master Box", "quantity": 1, "unit_price": 5200.0, "total_price": 5200.0, "category": "Biscuits"},
                {"description": "Britannia Toastea Premium Rusk Box", "quantity": 1, "unit_price": 4200.0, "total_price": 4200.0, "category": "Bakery"}
            ]
        },

        # Operating Expenses (Shop electricity, freight tempo, packaging bags, refreshments)
        {
            "vendor": "UPPCL Electricity Bill (दुकान बिजली बिल)",
            "date": today_str,
            "total": 2450.0,
            "subtotal": 2450.0,
            "tax": 0.0,
            "currency": "INR",
            "category": "Utilities & Phone",
            "expense_type": "operating_expense",
            "status": "confirmed",
            "payment_method": "UPI Online",
            "invoice_number": "UPPCL-KN-33190",
            "file_name": "electricity_bill_uppcl.svg",
            "file_type": "image/svg+xml",
            "notes": "Shop commercial electricity connection bill for refrigerator & lights",
            "confidence_score": 0.99,
            "uncertain_fields": [],
            "items": [
                {"description": "Commercial Shop Electricity Consumption", "quantity": 1, "unit_price": 2450.0, "total_price": 2450.0, "category": "Utilities & Phone"}
            ]
        },
        {
            "vendor": "Chotu Tempo Transport / Bhada (माल ढुलाई भाड़ा)",
            "date": today_str,
            "total": 650.0,
            "subtotal": 650.0,
            "tax": 0.0,
            "currency": "INR",
            "category": "Other Business Expense",
            "expense_type": "operating_expense",
            "status": "confirmed",
            "payment_method": "Cash",
            "invoice_number": "BHADA-012",
            "file_name": "tempo_bhada_receipt.svg",
            "file_type": "image/svg+xml",
            "notes": "Tempo freight from Collectorganj Mandi to Shop",
            "confidence_score": 0.92,
            "uncertain_fields": [],
            "items": [
                {"description": "Mandi Tempo Cartage Bhada", "quantity": 1, "unit_price": 650.0, "total_price": 650.0, "category": "Freight"}
            ]
        },
        {
            "vendor": "Gupta Packaging & Polythene Store",
            "date": yesterday_str,
            "total": 920.0,
            "subtotal": 876.0,
            "tax": 44.0,
            "currency": "INR",
            "category": "Office Supplies",
            "expense_type": "operating_expense",
            "status": "confirmed",
            "payment_method": "Cash",
            "invoice_number": "GP-883",
            "file_name": "packaging_bags_receipt.svg",
            "file_type": "image/svg+xml",
            "notes": "Oxo-biodegradable packing carry bags & packing tape rolls",
            "confidence_score": 0.95,
            "uncertain_fields": [],
            "items": [
                {"description": "Cloth Carry Bags (100 pcs bundle)", "quantity": 2, "unit_price": 380.0, "total_price": 760.0, "category": "Packaging"},
                {"description": "Brown Packaging Tape Roll", "quantity": 4, "unit_price": 40.0, "total_price": 160.0, "category": "Packaging"}
            ]
        },
        {
            "vendor": "Sharma Tea Stall (दुकान चाय व नाश्ता)",
            "date": today_str,
            "total": 180.0,
            "subtotal": 180.0,
            "tax": 0.0,
            "currency": "INR",
            "category": "Meals & Entertainment",
            "expense_type": "operating_expense",
            "status": "confirmed",
            "payment_method": "Cash",
            "invoice_number": "",
            "file_name": "tea_stall_bill.svg",
            "file_type": "image/svg+xml",
            "notes": "Daily tea and biscuits for shop staff and visiting customers",
            "confidence_score": 0.90,
            "uncertain_fields": [],
            "items": [
                {"description": "Special Masala Chai & Samosa", "quantity": 1, "unit_price": 180.0, "total_price": 180.0, "category": "Refreshments"}
            ]
        },

        # Flagged receipts for testing:
        # 1. Low Confidence / Uncertain fields receipt (Blurry handwritten receipt)
        {
            "vendor": "Shree Ram Hardware Mandi",
            "date": today_str,
            "total": 1250.0,
            "subtotal": 1150.0,
            "tax": 100.0,
            "currency": "INR",
            "category": "Hardware & Equipment",
            "expense_type": "operating_expense",
            "status": "pending_review",
            "payment_method": "Cash",
            "invoice_number": "",
            "file_name": "shree_ram_handwritten_bill.svg",
            "file_type": "image/svg+xml",
            "notes": "Handwritten blurry receipt for shop bulb holder and weighing scale repair",
            "confidence_score": 0.72,
            "uncertain_fields": ["tax", "invoice_number"],
            "items": [
                {"description": "Electronic Weighing Scale Calibration", "quantity": 1, "unit_price": 850.0, "total_price": 850.0, "category": "Repair"},
                {"description": "LED Tube Light 20W", "quantity": 2, "unit_price": 200.0, "total_price": 400.0, "category": "Repair"}
            ]
        },
        # 2. Duplicate receipt candidate (Duplicate of UPPCL electricity bill)
        {
            "vendor": "UPPCL Electricity Bill (दुकान बिजली बिल)",
            "date": today_str,
            "total": 2450.0,
            "subtotal": 2450.0,
            "tax": 0.0,
            "currency": "INR",
            "category": "Utilities & Phone",
            "expense_type": "operating_expense",
            "status": "duplicate_flagged",
            "payment_method": "UPI Online",
            "invoice_number": "UPPCL-KN-33190",
            "file_name": "electricity_bill_uppcl_copy.svg",
            "file_type": "image/svg+xml",
            "notes": "Duplicate statement entry for same UPPCL power bill",
            "confidence_score": 0.99,
            "uncertain_fields": [],
            "items": [
                {"description": "Commercial Electricity Payment Duplicate", "quantity": 1, "unit_price": 2450.0, "total_price": 2450.0, "category": "Utilities & Phone"}
            ]
        }
    ]

    for r_data in indian_receipts:
        rec = r_data.copy()
        items = rec.pop("items", [])
        fn = rec.get("file_name", "invoice.svg")
        fp = generate_sample_svg(
            actual_uploads, fn,
            rec["vendor"], rec["total"],
            rec["date"], rec["category"]
        )
        rec["file_path"] = fp
        insert_receipt(rec, items=items, db_path=db_path)

    # Seed Customer Khata (ग्राहक बहीखाता)
    demo_customers = [
        {
            "name": "Ramesh Kumar (शर्मा जी के पड़ोसी)",
            "phone": "+91 98765 43210",
            "address": "Gali No. 3, Near Shiv Mandir",
            "notes": "Regular monthly family account, pays on 1st of month",
            "credit_limit": 5000.0,
            "opening_balance": 1850.0,
            "opening_type": "given",
            "opening_notes": "Previous month balance (पुराना उधार)"
        },
        {
            "name": "Verma Master Ji (शिक्षक)",
            "phone": "+91 98111 22334",
            "address": "B-42, Adarsh Nagar",
            "notes": "Govt school teacher, weekly ration khata",
            "credit_limit": 8000.0,
            "opening_balance": 2100.0,
            "opening_type": "given",
            "opening_notes": "Rice 25kg + Mustard Oil 5L"
        },
        {
            "name": "Sunita Bhabhi",
            "phone": "+91 97234 56789",
            "address": "Quarter 12, Railway Colony",
            "notes": "Daily milk and bread, clears via UPI on weekends",
            "credit_limit": 3000.0,
            "opening_balance": 620.0,
            "opening_type": "given",
            "opening_notes": "Spices + Pulses"
        },
        {
            "name": "Gupta Contractor",
            "phone": "+91 94567 89012",
            "address": "Site Office, Main Road",
            "notes": "Bulk worker tea, sugar and snacks account",
            "credit_limit": 10000.0,
            "opening_balance": 3450.0,
            "opening_type": "given",
            "opening_notes": "Tea, biscuits and cold drinks for laborers"
        },
        {
            "name": "Amit Saxena (Advance Paid)",
            "phone": "+91 99887 76655",
            "address": "Flat 204, Surya Apartments",
            "notes": "Prepaid advance customer",
            "credit_limit": 5000.0,
            "opening_balance": 500.0,
            "opening_type": "received",
            "opening_notes": "Advance balance deposited (एडवांस जमा)"
        }
    ]

    for c_info in demo_customers:
        c_res = insert_customer(c_info, db_path=db_path)
        # Add a couple of realistic recent transactions
        if "Ramesh" in c_info["name"]:
            insert_customer_transaction(c_res["id"], {
                "date": today_str,
                "type": "given",
                "amount": 450.0,
                "payment_mode": "credit",
                "notes": "Atta 5kg + Ghee 500g",
                "sync_with_hisab": False
            }, db_path=db_path)
            insert_customer_transaction(c_res["id"], {
                "date": yesterday_str,
                "type": "received",
                "amount": 1000.0,
                "payment_mode": "upi",
                "notes": "GPay payment received",
                "sync_with_hisab": False
            }, db_path=db_path)
        elif "Verma" in c_info["name"]:
            insert_customer_transaction(c_res["id"], {
                "date": today_str,
                "type": "given",
                "amount": 320.0,
                "payment_mode": "credit",
                "notes": "Sugar 2kg + Tea 500g",
                "sync_with_hisab": False
            }, db_path=db_path)

    print(f"Successfully seeded database with Indian Shopkeeper records:")
    print(f"- {len(demo_customers)} Customers with Khata balances and transaction histories")
    print(f"- {len(DEMO_SUPPLIERS)} Suppliers with Khata transactions and due dates")
    print(f"- {len(DEMO_INVENTORY)} Tracked Inventory Items (with low-stock alerts)")
    print(f"- {len(demo_sales)} Daily Sales records across Cash, UPI, and Udhar")
    print(f"- {len(indian_receipts)} Business Invoices & Operating Expense Receipts")

if __name__ == "__main__":
    seed_indian_shopkeeper_data()
