import sqlite3
import os
import json
from datetime import datetime, timedelta

DEFAULT_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "shopledger.db")

def get_db(db_path=None):
    path = db_path or os.environ.get("SHOPLEDGER_DB_PATH", DEFAULT_DB_PATH)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    # 1. Receipts & Expenses Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS receipts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vendor TEXT NOT NULL,
        date TEXT NOT NULL,
        total REAL NOT NULL,
        subtotal REAL,
        tax REAL DEFAULT 0.0,
        tip REAL DEFAULT 0.0,
        currency TEXT DEFAULT 'INR',
        category TEXT NOT NULL DEFAULT 'Other Business Expense',
        expense_type TEXT DEFAULT 'operating_expense', -- 'stock_purchase' or 'operating_expense'
        supplier_id INTEGER,
        status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'pending_review', 'duplicate_flagged'
        payment_method TEXT DEFAULT 'Cash',
        invoice_number TEXT,
        file_path TEXT,
        file_name TEXT,
        file_type TEXT,
        notes TEXT,
        confidence_score REAL DEFAULT 1.0,
        uncertain_fields TEXT DEFAULT '[]',
        raw_extracted_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Safe column additions if receipts table was created previously without them
    try:
        cursor.execute("ALTER TABLE receipts ADD COLUMN expense_type TEXT DEFAULT 'operating_expense'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE receipts ADD COLUMN supplier_id INTEGER")
    except Exception:
        pass

    # 2. Receipt Items Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS receipt_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER NOT NULL,
        description TEXT NOT NULL,
        quantity REAL DEFAULT 1.0,
        unit_price REAL,
        total_price REAL NOT NULL,
        category TEXT,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
    )
    """)

    # 3. Audit Logs Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_id INTEGER,
        action TEXT NOT NULL,
        details TEXT,
        timestamp TEXT NOT NULL
    )
    """)

    # 4. Daily Sales Table (Daily Hisab - बिक्री)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL, -- YYYY-MM-DD
        amount REAL NOT NULL,
        payment_mode TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'upi', 'credit' (उधार)
        customer_name TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 5. Suppliers Table (Supplier Khata - सप्लायर)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS suppliers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        category TEXT DEFAULT 'General Supplier',
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 6. Supplier Transactions (Purchases and Payments)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS supplier_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        supplier_id INTEGER NOT NULL,
        receipt_id INTEGER,
        date TEXT NOT NULL,
        type TEXT NOT NULL, -- 'purchase' (खरीद) or 'payment' (भुगतान)
        amount REAL NOT NULL,
        payment_mode TEXT DEFAULT 'cash', -- 'cash', 'upi', 'bank_transfer', 'cheque'
        due_date TEXT, -- due date if purchase is on credit
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE SET NULL
    )
    """)

    # 7. Inventory Items (Smart Stock - स्टॉक)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inventory_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        hindi_name TEXT,
        category TEXT DEFAULT 'Grocery',
        unit TEXT DEFAULT 'kg', -- 'kg', 'packet', 'box', 'tin', 'litre', 'pcs'
        current_stock REAL NOT NULL DEFAULT 0.0,
        min_stock_alert REAL NOT NULL DEFAULT 5.0,
        cost_price REAL NOT NULL DEFAULT 0.0,
        selling_price REAL NOT NULL DEFAULT 0.0,
        last_restocked_date TEXT,
        created_at TEXT NOT NULL
    )
    """)

    # 8. Stock Movement Logs
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS stock_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        receipt_id INTEGER,
        change_qty REAL NOT NULL,
        type TEXT NOT NULL, -- 'purchase_in', 'sale_out', 'manual_adjustment'
        notes TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
    )
    """)

    # 9. Customers Table (Customer Khata - ग्राहक खाता)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        notes TEXT,
        credit_limit REAL DEFAULT 0.0,
        created_at TEXT NOT NULL
    )
    """)

    # 10. Customer Transactions (You Gave / You Received)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS customer_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id INTEGER NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        type TEXT NOT NULL, -- 'given' (आपने दिए / Udhar) or 'received' (आपको मिले / Payment)
        amount REAL NOT NULL,
        payment_mode TEXT DEFAULT 'cash', -- 'cash', 'upi', 'bank_transfer'
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    )
    """)

    # Indices for performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipts_vendor ON receipts(vendor)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipts_category ON receipts(category)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_supplier_tx_date ON supplier_transactions(date)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_supplier_tx_supplier ON supplier_transactions(supplier_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory_items(current_stock)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_name ON customers(name)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_phone ON customers(phone)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_tx_customer ON customer_transactions(customer_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_customer_tx_date ON customer_transactions(date)")

    conn.commit()
    conn.close()

def log_audit(conn, receipt_id, action, details):
    conn.execute(
        "INSERT INTO audit_logs (receipt_id, action, details, timestamp) VALUES (?, ?, ?, ?)",
        (receipt_id, action, details, datetime.now().isoformat())
    )

def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    if "uncertain_fields" in d and isinstance(d["uncertain_fields"], str):
        try:
            d["uncertain_fields"] = json.loads(d["uncertain_fields"])
        except Exception:
            d["uncertain_fields"] = []
    if "raw_extracted_json" in d and isinstance(d["raw_extracted_json"], str) and d["raw_extracted_json"]:
        try:
            d["raw_extracted_json"] = json.loads(d["raw_extracted_json"])
        except Exception:
            pass
    return d

# ==============================================================================
# RECEIPTS CORE FUNCTIONS (PRESERVED & ENHANCED)
# ==============================================================================

def get_all_receipts(db_path=None, status=None, category=None, search=None, start_date=None, end_date=None, sort_by="date", sort_order="desc"):
    conn = get_db(db_path)
    query = "SELECT * FROM receipts WHERE 1=1"
    params = []

    if status and status != "all":
        query += " AND status = ?"
        params.append(status)

    if category and category != "all":
        query += " AND category = ?"
        params.append(category)

    if start_date:
        query += " AND date >= ?"
        params.append(start_date)

    if end_date:
        query += " AND date <= ?"
        params.append(end_date)

    if search:
        search_pattern = f"%{search}%"
        query += " AND (vendor LIKE ? OR invoice_number LIKE ? OR notes LIKE ? OR category LIKE ?)"
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])

    valid_sort_cols = {"date": "date", "vendor": "vendor", "total": "total", "created_at": "created_at", "status": "status", "category": "category"}
    col = valid_sort_cols.get(sort_by, "date")
    order = "ASC" if str(sort_order).lower() == "asc" else "DESC"
    query += f" ORDER BY {col} {order}, id DESC"

    cursor = conn.cursor()
    cursor.execute(query, params)
    rows = cursor.fetchall()
    receipts = [row_to_dict(r) for r in rows]

    for receipt in receipts:
        c_items = conn.cursor()
        c_items.execute("SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY id ASC", (receipt["id"],))
        receipt["items"] = [dict(item) for item in c_items.fetchall()]

    conn.close()
    return receipts

def get_receipt_by_id(receipt_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM receipts WHERE id = ?", (receipt_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    receipt = row_to_dict(row)
    cursor.execute("SELECT * FROM receipt_items WHERE receipt_id = ? ORDER BY id ASC", (receipt_id,))
    receipt["items"] = [dict(item) for item in cursor.fetchall()]

    cursor.execute("SELECT * FROM audit_logs WHERE receipt_id = ? ORDER BY timestamp DESC", (receipt_id,))
    receipt["audit_logs"] = [dict(log) for log in cursor.fetchall()]

    conn.close()
    return receipt

def insert_receipt(data, items=None, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    uncertain_fields_json = json.dumps(data.get("uncertain_fields", [])) if isinstance(data.get("uncertain_fields"), list) else str(data.get("uncertain_fields", "[]"))
    raw_json = json.dumps(data.get("raw_extracted_json")) if isinstance(data.get("raw_extracted_json"), (dict, list)) else data.get("raw_extracted_json")

    # Auto-classify expense_type if not provided
    category = data.get("category", "Other Business Expense")
    expense_type = data.get("expense_type")
    if not expense_type:
        if category in ("Inventory", "Groceries", "Hardware & Equipment", "Stock Purchase", "Dairy & Milk", "FMCG Wholesale", "Grains & Spices"):
            expense_type = "stock_purchase"
        else:
            expense_type = "operating_expense"

    cursor.execute("""
    INSERT INTO receipts (
        vendor, date, total, subtotal, tax, tip, currency, category, expense_type, supplier_id, status,
        payment_method, invoice_number, file_path, file_name, file_type,
        notes, confidence_score, uncertain_fields, raw_extracted_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("vendor", "Unknown Vendor"),
        data.get("date", datetime.now().strftime("%Y-%m-%d")),
        float(data.get("total", 0.0)),
        float(data.get("subtotal", 0.0)) if data.get("subtotal") is not None else None,
        float(data.get("tax", 0.0)),
        float(data.get("tip", 0.0)),
        data.get("currency", "INR"),
        category,
        expense_type,
        data.get("supplier_id"),
        data.get("status", "confirmed"),
        data.get("payment_method", "Cash"),
        data.get("invoice_number", ""),
        data.get("file_path", ""),
        data.get("file_name", ""),
        data.get("file_type", ""),
        data.get("notes", ""),
        float(data.get("confidence_score", 1.0)),
        uncertain_fields_json,
        raw_json,
        now,
        now
    ))

    receipt_id = cursor.lastrowid

    items_to_insert = items or data.get("items", [])
    for itm in items_to_insert:
        qty = float(itm.get("quantity", 1.0))
        tot = float(itm.get("total_price", itm.get("unit_price", 0.0) * qty))
        unit = float(itm.get("unit_price", tot / qty if qty else tot))
        cursor.execute("""
        INSERT INTO receipt_items (receipt_id, description, quantity, unit_price, total_price, category)
        VALUES (?, ?, ?, ?, ?, ?)
        """, (
            receipt_id,
            itm.get("description", "Item"),
            qty,
            unit,
            tot,
            itm.get("category", category)
        ))

    log_audit(conn, receipt_id, "created", f"Receipt #{receipt_id} created for {data.get('vendor')} (₹{data.get('total')})")

    conn.commit()
    conn.close()
    return get_receipt_by_id(receipt_id, db_path)

def update_receipt(receipt_id, data, items=None, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    existing = get_receipt_by_id(receipt_id, db_path)
    if not existing:
        conn.close()
        return None

    uncertain_fields_json = json.dumps(data.get("uncertain_fields", [])) if isinstance(data.get("uncertain_fields"), list) else str(data.get("uncertain_fields", existing.get("uncertain_fields", "[]")))

    cursor.execute("""
    UPDATE receipts SET
        vendor = ?,
        date = ?,
        total = ?,
        subtotal = ?,
        tax = ?,
        tip = ?,
        currency = ?,
        category = ?,
        expense_type = ?,
        supplier_id = ?,
        status = ?,
        payment_method = ?,
        invoice_number = ?,
        notes = ?,
        confidence_score = ?,
        uncertain_fields = ?,
        updated_at = ?
    WHERE id = ?
    """, (
        data.get("vendor", existing["vendor"]),
        data.get("date", existing["date"]),
        float(data.get("total", existing["total"])),
        float(data.get("subtotal", existing["subtotal"])) if data.get("subtotal") is not None else existing["subtotal"],
        float(data.get("tax", existing["tax"])),
        float(data.get("tip", existing["tip"])),
        data.get("currency", existing["currency"]),
        data.get("category", existing["category"]),
        data.get("expense_type", existing.get("expense_type", "operating_expense")),
        data.get("supplier_id", existing.get("supplier_id")),
        data.get("status", existing["status"]),
        data.get("payment_method", existing["payment_method"]),
        data.get("invoice_number", existing["invoice_number"]),
        data.get("notes", existing["notes"]),
        float(data.get("confidence_score", existing["confidence_score"])),
        uncertain_fields_json,
        now,
        receipt_id
    ))

    if items is not None:
        cursor.execute("DELETE FROM receipt_items WHERE receipt_id = ?", (receipt_id,))
        for itm in items:
            qty = float(itm.get("quantity", 1.0))
            tot = float(itm.get("total_price", itm.get("unit_price", 0.0) * qty))
            unit = float(itm.get("unit_price", tot / qty if qty else tot))
            cursor.execute("""
            INSERT INTO receipt_items (receipt_id, description, quantity, unit_price, total_price, category)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                receipt_id,
                itm.get("description", "Item"),
                qty,
                unit,
                tot,
                itm.get("category", data.get("category", existing["category"]))
            ))

    log_audit(conn, receipt_id, "updated", f"Receipt #{receipt_id} updated. Status: {data.get('status', existing['status'])}")
    conn.commit()
    conn.close()
    return get_receipt_by_id(receipt_id, db_path)

def confirm_receipt(receipt_id, db_path=None):
    return update_receipt(receipt_id, {"status": "confirmed", "uncertain_fields": []}, db_path=db_path)

def delete_receipt(receipt_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM receipt_items WHERE receipt_id = ?", (receipt_id,))
    cursor.execute("DELETE FROM audit_logs WHERE receipt_id = ?", (receipt_id,))
    cursor.execute("DELETE FROM receipts WHERE id = ?", (receipt_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_analytics_summary(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*), COALESCE(SUM(total), 0), COALESCE(AVG(total), 0) FROM receipts WHERE status = 'confirmed'")
    confirmed_count, confirmed_total, avg_receipt = cursor.fetchone()

    cursor.execute("SELECT COUNT(*) FROM receipts WHERE status = 'pending_review'")
    pending_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM receipts WHERE status = 'duplicate_flagged'")
    duplicate_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*), COALESCE(SUM(total), 0) FROM receipts")
    total_count, all_total = cursor.fetchone()

    cursor.execute("""
    SELECT category, COUNT(*) as count, ROUND(SUM(total), 2) as spend
    FROM receipts
    WHERE status = 'confirmed'
    GROUP BY category
    ORDER BY spend DESC
    """)
    category_breakdown = [
        {"category": row["category"], "count": row["count"], "spend": row["spend"],
         "percentage": round((row["spend"] / confirmed_total * 100), 1) if confirmed_total > 0 else 0}
        for row in cursor.fetchall()
    ]

    cursor.execute("""
    SELECT substr(date, 1, 7) as month, ROUND(SUM(total), 2) as total_spend, COUNT(*) as count
    FROM receipts
    WHERE status = 'confirmed'
    GROUP BY month
    ORDER BY month ASC
    """)
    monthly_trend = [
        {"month": row["month"], "total_spend": row["total_spend"], "count": row["count"]}
        for row in cursor.fetchall()
    ]

    cursor.execute("""
    SELECT vendor, COUNT(*) as count, ROUND(SUM(total), 2) as total_spend, category
    FROM receipts
    WHERE status = 'confirmed'
    GROUP BY vendor
    ORDER BY total_spend DESC
    LIMIT 6
    """)
    top_vendors = [
        {"vendor": row["vendor"], "count": row["count"], "total_spend": row["total_spend"], "category": row["category"]}
        for row in cursor.fetchall()
    ]

    cursor.execute("SELECT COUNT(*) FROM receipts WHERE confidence_score < 0.85 OR json_array_length(uncertain_fields) > 0")
    attention_needed_count = cursor.fetchone()[0]

    conn.close()

    return {
        "confirmed_count": confirmed_count,
        "confirmed_total": round(confirmed_total, 2),
        "pending_count": pending_count,
        "duplicate_count": duplicate_count,
        "total_count": total_count,
        "all_total": round(all_total, 2),
        "avg_receipt": round(avg_receipt, 2),
        "attention_needed_count": attention_needed_count,
        "category_breakdown": category_breakdown,
        "monthly_trend": monthly_trend,
        "top_vendors": top_vendors
    }

# ==============================================================================
# 1. DAILY HISAB (दैनिक हिसाब - SALES, EXPENSES, CASH IN HAND)
# ==============================================================================

def insert_sale(data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO sales (date, amount, payment_mode, customer_name, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data.get("date", datetime.now().strftime("%Y-%m-%d")),
        float(data.get("amount", 0.0)),
        data.get("payment_mode", "cash").lower(),
        data.get("customer_name", ""),
        data.get("notes", ""),
        now
    ))
    sale_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM sales WHERE id = ?", (sale_id,))
    sale = dict(cursor.fetchone())
    conn.close()
    return sale

def get_sales(date_str=None, start_date=None, end_date=None, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    query = "SELECT * FROM sales WHERE 1=1"
    params = []
    if date_str:
        query += " AND date = ?"
        params.append(date_str)
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
    query += " ORDER BY date DESC, id DESC"
    cursor.execute(query, params)
    sales = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return sales

def delete_sale(sale_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM sales WHERE id = ?", (sale_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def get_daily_hisab(date_str=None, db_path=None):
    """
    Computes complete Daily Hisab for small shopkeepers:
    - Sales breakdown: Cash, UPI/Online, Udhar (Credit)
    - Stock Purchases made today (from receipts and supplier tx)
    - Operating Expenses (shop electricity, transport/tempo, tea, maintenance)
    - Supplier Payments made today (Cash vs UPI)
    - Estimated Cash in Hand = (Cash Sales) - (Cash Supplier Payments) - (Cash Expenses)
    - Net Day Balance
    """
    target_date = date_str or datetime.now().strftime("%Y-%m-%d")
    conn = get_db(db_path)
    cursor = conn.cursor()

    # 1. Sales on target_date
    cursor.execute("""
    SELECT 
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN amount ELSE 0 END), 0) as upi_sales,
        COALESCE(SUM(CASE WHEN payment_mode = 'credit' THEN amount ELSE 0 END), 0) as credit_sales,
        COALESCE(SUM(amount), 0) as total_sales,
        COUNT(*) as sales_count
    FROM sales
    WHERE date = ?
    """, (target_date,))
    sales_row = cursor.fetchone()
    cash_sales = round(float(sales_row["cash_sales"]), 2)
    upi_sales = round(float(sales_row["upi_sales"]), 2)
    credit_sales = round(float(sales_row["credit_sales"]), 2)
    total_sales = round(float(sales_row["total_sales"]), 2)
    sales_count = sales_row["sales_count"]

    # 2. Operating Expenses on target_date (from receipts marked operating_expense)
    cursor.execute("""
    SELECT 
        COALESCE(SUM(CASE WHEN lower(payment_method) LIKE '%cash%' THEN total ELSE 0 END), 0) as cash_opex,
        COALESCE(SUM(CASE WHEN lower(payment_method) NOT LIKE '%cash%' THEN total ELSE 0 END), 0) as digital_opex,
        COALESCE(SUM(total), 0) as total_opex,
        COUNT(*) as opex_count
    FROM receipts
    WHERE date = ? AND status = 'confirmed' AND (expense_type = 'operating_expense' OR category IN ('Utilities & Phone', 'Meals & Entertainment', 'Office Supplies', 'Marketing & Advertising', 'Professional Services'))
    """, (target_date,))
    opex_row = cursor.fetchone()
    cash_opex = round(float(opex_row["cash_opex"]), 2)
    digital_opex = round(float(opex_row["digital_opex"]), 2)
    total_opex = round(float(opex_row["total_opex"]), 2)
    opex_count = opex_row["opex_count"]

    # 3. Stock purchases on target_date
    cursor.execute("""
    SELECT COALESCE(SUM(total), 0) as total_purchases, COUNT(*) as purchase_count
    FROM receipts
    WHERE date = ? AND status = 'confirmed' AND (expense_type = 'stock_purchase' OR category IN ('Hardware & Equipment', 'Inventory', 'Groceries', 'Stock Purchase', 'Dairy & Milk', 'FMCG Wholesale'))
    """, (target_date,))
    purchases_row = cursor.fetchone()
    total_purchases = round(float(purchases_row["total_purchases"]), 2)
    purchases_count = purchases_row["purchase_count"]

    # 4. Supplier Payments on target_date (from supplier_transactions type = 'payment')
    cursor.execute("""
    SELECT 
        COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN amount ELSE 0 END), 0) as cash_paid,
        COALESCE(SUM(CASE WHEN payment_mode != 'cash' THEN amount ELSE 0 END), 0) as digital_paid,
        COALESCE(SUM(amount), 0) as total_paid_to_suppliers
    FROM supplier_transactions
    WHERE date = ? AND type = 'payment'
    """, (target_date,))
    supp_row = cursor.fetchone()
    cash_supp_paid = round(float(supp_row["cash_paid"]), 2)
    digital_supp_paid = round(float(supp_row["digital_paid"]), 2)
    total_paid_to_suppliers = round(float(supp_row["total_paid_to_suppliers"]), 2)

    # 5. Fetch recent itemized list of sales & expenses for the day
    cursor.execute("SELECT * FROM sales WHERE date = ? ORDER BY id DESC LIMIT 15", (target_date,))
    daily_sales_list = [dict(r) for r in cursor.fetchall()]

    cursor.execute("SELECT * FROM receipts WHERE date = ? AND status = 'confirmed' ORDER BY id DESC LIMIT 15", (target_date,))
    daily_receipts_list = [dict(r) for r in cursor.fetchall()]

    # Net Day Calculations
    estimated_cash_in_hand = round(cash_sales - cash_supp_paid - cash_opex, 2)
    net_daily_cashflow = round((cash_sales + upi_sales) - (total_opex + total_paid_to_suppliers), 2)

    conn.close()

    return {
        "date": target_date,
        "sales": {
            "total": total_sales,
            "cash": cash_sales,
            "upi": upi_sales,
            "credit": credit_sales,
            "count": sales_count,
            "items": daily_sales_list
        },
        "operating_expenses": {
            "total": total_opex,
            "cash": cash_opex,
            "digital": digital_opex,
            "count": opex_count
        },
        "stock_purchases": {
            "total": total_purchases,
            "count": purchases_count
        },
        "supplier_payments": {
            "total": total_paid_to_suppliers,
            "cash": cash_supp_paid,
            "digital": digital_supp_paid
        },
        "summary": {
            "estimated_cash_in_hand": estimated_cash_in_hand,
            "net_daily_cashflow": net_daily_cashflow,
            "customer_credit_given": credit_sales
        },
        "daily_receipts": daily_receipts_list
    }

# ==============================================================================
# 2. SUPPLIER KHATA (सप्लायर खाता - BALANCES & DUE DATES)
# ==============================================================================

def get_all_suppliers(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()

    cursor.execute("""
    SELECT s.*,
        COALESCE((SELECT SUM(amount) FROM supplier_transactions WHERE supplier_id = s.id AND type = 'purchase'), 0) as total_purchased,
        COALESCE((SELECT SUM(amount) FROM supplier_transactions WHERE supplier_id = s.id AND type = 'payment'), 0) as total_paid,
        (SELECT due_date FROM supplier_transactions WHERE supplier_id = s.id AND type = 'purchase' AND due_date IS NOT NULL AND due_date != '' ORDER BY due_date ASC LIMIT 1) as next_due_date
    FROM suppliers s
    ORDER BY s.name ASC
    """)
    rows = cursor.fetchall()
    suppliers = []
    today_str = datetime.now().strftime("%Y-%m-%d")

    for r in rows:
        sup = dict(r)
        purchased = round(float(sup["total_purchased"]), 2)
        paid = round(float(sup["total_paid"]), 2)
        balance_due = round(purchased - paid, 2)
        sup["total_purchased"] = purchased
        sup["total_paid"] = paid
        sup["balance_due"] = balance_due
        
        # Check if due is upcoming or overdue
        due_date = sup.get("next_due_date")
        sup["is_overdue"] = bool(balance_due > 0 and due_date and due_date < today_str)
        sup["is_due_soon"] = bool(balance_due > 0 and due_date and today_str <= due_date <= (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d"))
        suppliers.append(sup)

    conn.close()
    return suppliers

def get_supplier_by_id(supplier_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,))
    sup_row = cursor.fetchone()
    if not sup_row:
        conn.close()
        return None

    supplier = dict(sup_row)
    cursor.execute("SELECT * FROM supplier_transactions WHERE supplier_id = ? ORDER BY date DESC, id DESC", (supplier_id,))
    tx_rows = cursor.fetchall()
    transactions = [dict(tx) for tx in tx_rows]

    purchased = sum(tx["amount"] for tx in transactions if tx["type"] == "purchase")
    paid = sum(tx["amount"] for tx in transactions if tx["type"] == "payment")
    supplier["transactions"] = transactions
    supplier["total_purchased"] = round(purchased, 2)
    supplier["total_paid"] = round(paid, 2)
    supplier["balance_due"] = round(purchased - paid, 2)

    conn.close()
    return supplier

def insert_supplier(data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO suppliers (name, phone, category, address, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        data.get("name", "New Supplier"),
        data.get("phone", ""),
        data.get("category", "General Supplier"),
        data.get("address", ""),
        data.get("notes", ""),
        now
    ))
    supplier_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_supplier_by_id(supplier_id, db_path)

def update_supplier(supplier_id, data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE suppliers SET
        name = COALESCE(?, name),
        phone = COALESCE(?, phone),
        category = COALESCE(?, category),
        address = COALESCE(?, address),
        notes = COALESCE(?, notes)
    WHERE id = ?
    """, (
        data.get("name"),
        data.get("phone"),
        data.get("category"),
        data.get("address"),
        data.get("notes"),
        supplier_id
    ))
    conn.commit()
    conn.close()
    return get_supplier_by_id(supplier_id, db_path)

def delete_supplier(supplier_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM supplier_transactions WHERE supplier_id = ?", (supplier_id,))
    cursor.execute("DELETE FROM suppliers WHERE id = ?", (supplier_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def insert_supplier_transaction(data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO supplier_transactions (supplier_id, receipt_id, date, type, amount, payment_mode, due_date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        int(data.get("supplier_id")),
        data.get("receipt_id"),
        data.get("date", datetime.now().strftime("%Y-%m-%d")),
        data.get("type", "payment").lower(),
        float(data.get("amount", 0.0)),
        data.get("payment_mode", "cash"),
        data.get("due_date"),
        data.get("notes", ""),
        now
    ))
    tx_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_supplier_by_id(data.get("supplier_id"), db_path)

# ==============================================================================
# 3. SMART STOCK (स्मार्ट स्टॉक - INVENTORY & LOW STOCK ALERTS)
# ==============================================================================

def get_all_inventory(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory_items ORDER BY current_stock <= min_stock_alert DESC, name ASC")
    items = []
    for row in cursor.fetchall():
        itm = dict(row)
        itm["is_low_stock"] = itm["current_stock"] <= itm["min_stock_alert"]
        itm["total_inventory_value"] = round(itm["current_stock"] * itm["cost_price"], 2)
        items.append(itm)
    conn.close()
    return items

def get_inventory_item(item_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    itm = dict(row)
    itm["is_low_stock"] = itm["current_stock"] <= itm["min_stock_alert"]

    cursor.execute("SELECT * FROM stock_logs WHERE item_id = ? ORDER BY timestamp DESC LIMIT 20", (item_id,))
    itm["logs"] = [dict(log) for log in cursor.fetchall()]
    conn.close()
    return itm

def insert_inventory_item(data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO inventory_items (name, hindi_name, category, unit, current_stock, min_stock_alert, cost_price, selling_price, last_restocked_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("name", "New Item"),
        data.get("hindi_name", ""),
        data.get("category", "Grocery"),
        data.get("unit", "kg"),
        float(data.get("current_stock", 0.0)),
        float(data.get("min_stock_alert", 5.0)),
        float(data.get("cost_price", 0.0)),
        float(data.get("selling_price", 0.0)),
        data.get("last_restocked_date", datetime.now().strftime("%Y-%m-%d")),
        now
    ))
    item_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_inventory_item(item_id, db_path)

def update_inventory_item(item_id, data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    existing = get_inventory_item(item_id, db_path)
    if not existing:
        conn.close()
        return None

    new_stock = float(data.get("current_stock", existing["current_stock"]))
    stock_diff = new_stock - existing["current_stock"]

    cursor.execute("""
    UPDATE inventory_items SET
        name = ?,
        hindi_name = ?,
        category = ?,
        unit = ?,
        current_stock = ?,
        min_stock_alert = ?,
        cost_price = ?,
        selling_price = ?,
        last_restocked_date = ?
    WHERE id = ?
    """, (
        data.get("name", existing["name"]),
        data.get("hindi_name", existing["hindi_name"]),
        data.get("category", existing["category"]),
        data.get("unit", existing["unit"]),
        new_stock,
        float(data.get("min_stock_alert", existing["min_stock_alert"])),
        float(data.get("cost_price", existing["cost_price"])),
        float(data.get("selling_price", existing["selling_price"])),
        data.get("last_restocked_date", existing["last_restocked_date"]),
        item_id
    ))

    if stock_diff != 0:
        cursor.execute("""
        INSERT INTO stock_logs (item_id, change_qty, type, notes, timestamp)
        VALUES (?, ?, ?, ?, ?)
        """, (
            item_id,
            stock_diff,
            'manual_adjustment',
            data.get("adjustment_reason", "Manual stock count adjustment"),
            datetime.now().isoformat()
        ))

    conn.commit()
    conn.close()
    return get_inventory_item(item_id, db_path)

def delete_inventory_item(item_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM stock_logs WHERE item_id = ?", (item_id,))
    cursor.execute("DELETE FROM inventory_items WHERE id = ?", (item_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

def confirm_stock_addition_from_receipt(receipt_id, items_to_add, db_path=None):
    """
    CRITICAL REQUIREMENT 3:
    Extracts item quantities from receipt and lets users confirm stock additions.
    Updates inventory stock and creates traceable stock logs.
    """
    conn = get_db(db_path)
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    today_str = datetime.now().strftime("%Y-%m-%d")
    results = []

    for item in items_to_add:
        item_name = item.get("name") or item.get("description")
        qty = float(item.get("quantity") or 1.0)
        unit_price = float(item.get("unit_price") or 0.0)
        item_id = item.get("item_id")

        if item_id:
            cursor.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,))
            target = cursor.fetchone()
        else:
            # Match by name case-insensitively
            cursor.execute("SELECT * FROM inventory_items WHERE lower(name) = lower(?) LIMIT 1", (item_name,))
            target = cursor.fetchone()

        if target:
            new_stock = target["current_stock"] + qty
            cursor.execute("""
            UPDATE inventory_items 
            SET current_stock = ?, cost_price = CASE WHEN ? > 0 THEN ? ELSE cost_price END, last_restocked_date = ?
            WHERE id = ?
            """, (new_stock, unit_price, unit_price, today_str, target["id"]))
            actual_id = target["id"]
        else:
            # Create new tracked inventory item
            cursor.execute("""
            INSERT INTO inventory_items (name, category, unit, current_stock, min_stock_alert, cost_price, selling_price, last_restocked_date, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item_name,
                item.get("category", "General"),
                item.get("unit", "kg"),
                qty,
                5.0,
                unit_price,
                round(unit_price * 1.2, 2) if unit_price > 0 else 0.0,
                today_str,
                now_str
            ))
            actual_id = cursor.lastrowid

        # Insert traceable log
        cursor.execute("""
        INSERT INTO stock_logs (item_id, receipt_id, change_qty, type, notes, timestamp)
        VALUES (?, ?, ?, 'purchase_in', ?, ?)
        """, (
            actual_id,
            receipt_id,
            qty,
            f"Stock confirmed from Receipt #{receipt_id}",
            now_str
        ))

        results.append({
            "item_id": actual_id,
            "name": item_name,
            "added_qty": qty,
            "unit_price": unit_price
        })

    conn.commit()
    conn.close()
    return results

def get_low_stock_alerts(db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("""
    SELECT * FROM inventory_items 
    WHERE current_stock <= min_stock_alert
    ORDER BY current_stock ASC
    """)
    alerts = [dict(r) for r in cursor.fetchall()]
    conn.close()
    return alerts

# ==============================================================================
# 4. PROFIT OVERVIEW (मुनाफा रिपोर्ट - TRANSPARENT MATH & MISSING DATA INTEGRITY)
# ==============================================================================

def get_profit_overview(period="month", start_date=None, end_date=None, db_path=None):
    """
    CRITICAL REQUIREMENT 5:
    Separates sales, stock purchases, operating expenses, and estimated profit.
    Clearly identifies missing data and NEVER presents unsupported estimates as actual profit.
    """
    conn = get_db(db_path)
    cursor = conn.cursor()

    today = datetime.now()
    if period == "today":
        s_date = today.strftime("%Y-%m-%d")
        e_date = s_date
    elif period == "week":
        s_date = (today - timedelta(days=7)).strftime("%Y-%m-%d")
        e_date = today.strftime("%Y-%m-%d")
    elif period == "month":
        s_date = today.strftime("%Y-%m-01")
        e_date = today.strftime("%Y-%m-%d")
    else:
        s_date = start_date or (today - timedelta(days=30)).strftime("%Y-%m-%d")
        e_date = end_date or today.strftime("%Y-%m-%d")

    # 1. Total recorded sales
    cursor.execute("""
    SELECT COALESCE(SUM(amount), 0) as total_sales, COUNT(*) as sales_count
    FROM sales
    WHERE date >= ? AND date <= ?
    """, (s_date, e_date))
    s_row = cursor.fetchone()
    total_sales = round(float(s_row["total_sales"]), 2)
    sales_count = s_row["sales_count"]

    # 2. Stock purchases recorded
    cursor.execute("""
    SELECT COALESCE(SUM(total), 0) as stock_purchases, COUNT(*) as purchase_count
    FROM receipts
    WHERE date >= ? AND date <= ? AND status = 'confirmed' 
      AND (expense_type = 'stock_purchase' OR category IN ('Hardware & Equipment', 'Inventory', 'Groceries', 'Stock Purchase', 'Dairy & Milk', 'FMCG Wholesale'))
    """, (s_date, e_date))
    p_row = cursor.fetchone()
    stock_purchases = round(float(p_row["stock_purchases"]), 2)
    purchase_count = p_row["purchase_count"]

    # 3. Operating expenses (rent, electricity, transport, tea, packaging)
    cursor.execute("""
    SELECT COALESCE(SUM(total), 0) as operating_expenses, COUNT(*) as opex_count
    FROM receipts
    WHERE date >= ? AND date <= ? AND status = 'confirmed' 
      AND (expense_type = 'operating_expense' OR category IN ('Utilities & Phone', 'Meals & Entertainment', 'Office Supplies', 'Marketing & Advertising', 'Professional Services', 'Other Business Expense'))
    """, (s_date, e_date))
    o_row = cursor.fetchone()
    operating_expenses = round(float(o_row["operating_expenses"]), 2)
    opex_count = o_row["opex_count"]

    # 4. Data integrity verification
    missing_factors = []
    if sales_count == 0:
        missing_factors.append("No sales recorded for this period")
    if purchase_count == 0:
        missing_factors.append("No stock purchases recorded for this period")
    if opex_count == 0:
        missing_factors.append("No operating expenses recorded for this period")

    # Check unconfirmed pending receipts
    cursor.execute("SELECT COUNT(*) FROM receipts WHERE date >= ? AND date <= ? AND status = 'pending_review'", (s_date, e_date))
    unconfirmed_pending = cursor.fetchone()[0]
    if unconfirmed_pending > 0:
        missing_factors.append(f"{unconfirmed_pending} unconfirmed receipt(s) pending review")

    is_complete = len(missing_factors) == 0

    # Honest calculation
    estimated_gross_profit = round(total_sales - stock_purchases, 2)
    estimated_net_profit = round(total_sales - stock_purchases - operating_expenses, 2)
    profit_margin_pct = round((estimated_net_profit / total_sales * 100), 1) if total_sales > 0 else 0.0

    conn.close()

    return {
        "period": period,
        "start_date": s_date,
        "end_date": e_date,
        "total_sales": total_sales,
        "sales_count": sales_count,
        "stock_purchases": stock_purchases,
        "purchase_count": purchase_count,
        "operating_expenses": operating_expenses,
        "opex_count": opex_count,
        "estimated_gross_profit": estimated_gross_profit,
        "estimated_net_profit": estimated_net_profit,
        "profit_margin_pct": profit_margin_pct,
        "data_integrity": {
            "is_complete": is_complete,
            "missing_factors": missing_factors,
            "disclaimer": "All figures reflect confirmed stored records. Unrecorded cash transactions or inventory shrinkage are not assumed." if is_complete else "Note: Certain ledger records are missing or pending. Figures reflect recorded transactions only."
        }
    }

# ==============================================================================
# 5. SMART ACTIONS (स्मार्ट अलर्ट्स - ACTIONABLE REMINDERS)
# ==============================================================================

def get_smart_actions(db_path=None):
    """
    CRITICAL REQUIREMENT 6:
    Show evidence-based reminders for:
    - Upcoming supplier payments
    - Unusual spending
    - Duplicate receipts
    - Low stock
    """
    conn = get_db(db_path)
    cursor = conn.cursor()
    today_str = datetime.now().strftime("%Y-%m-%d")
    next_7_days = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")

    actions = []

    # 1. Upcoming / Overdue Supplier Payments
    cursor.execute("""
    SELECT st.id, st.amount, st.due_date, s.id as supplier_id, s.name as supplier_name, s.phone
    FROM supplier_transactions st
    JOIN suppliers s ON s.id = st.supplier_id
    WHERE st.type = 'purchase' AND st.due_date IS NOT NULL AND st.due_date != ''
      AND st.due_date <= ?
    ORDER BY st.due_date ASC
    """, (next_7_days,))
    for row in cursor.fetchall():
        is_overdue = row["due_date"] < today_str
        actions.append({
            "type": "supplier_due",
            "priority": "high" if is_overdue else "medium",
            "title": f"Supplier Payment {'Overdue' if is_overdue else 'Due Soon'}: {row['supplier_name']}",
            "hindi_title": f"सप्लायर भुगतान {'बकाया (Overdue)' if is_overdue else 'देय (Due)'}: {row['supplier_name']}",
            "message": f"₹{row['amount']:,.2f} is due on {row['due_date']} to {row['supplier_name']}.",
            "hindi_message": f"₹{row['amount']:,.2f} का भुगतान {row['due_date']} तक {row['supplier_name']} को करना है।",
            "supplier_id": row["supplier_id"],
            "due_date": row["due_date"],
            "amount": row["amount"],
            "action_text": "Pay Now (भुगतान करें)",
            "action_tab": "suppliers"
        })

    # 2. Low Stock Alerts
    cursor.execute("""
    SELECT * FROM inventory_items 
    WHERE current_stock <= min_stock_alert 
    ORDER BY current_stock ASC
    """)
    for row in cursor.fetchall():
        actions.append({
            "type": "low_stock",
            "priority": "high",
            "title": f"Low Stock Alert: {row['name']}",
            "hindi_title": f"स्टॉक कम है: {row['hindi_name'] or row['name']}",
            "message": f"Only {row['current_stock']} {row['unit']} left (Alert threshold: {row['min_stock_alert']} {row['unit']}).",
            "hindi_message": f"केवल {row['current_stock']} {row['unit']} बचा है (न्यूनतम सीमा: {row['min_stock_alert']} {row['unit']})।",
            "item_id": row["id"],
            "current_stock": row["current_stock"],
            "unit": row["unit"],
            "action_text": "Order Stock (स्टॉक ऑर्डर करें)",
            "action_tab": "inventory"
        })

    # 3. Duplicate Receipts Waiting for Review
    cursor.execute("SELECT id, vendor, total, date FROM receipts WHERE status = 'duplicate_flagged'")
    for row in cursor.fetchall():
        actions.append({
            "type": "duplicate_receipt",
            "priority": "medium",
            "title": f"Duplicate Bill Flagged: {row['vendor']}",
            "hindi_title": f"संभावित डुप्लीकेट बिल: {row['vendor']}",
            "message": f"Receipt #{row['id']} (₹{row['total']:,.2f} on {row['date']}) matches an existing invoice.",
            "hindi_message": f"रसीद #{row['id']} (₹{row['total']:,.2f}, {row['date']}) पुराने बिल से मेल खाती है।",
            "receipt_id": row["id"],
            "action_text": "Review Bill (बिल देखें)",
            "action_tab": "receipts"
        })

    # 4. Unusual High Expense Spike (> ₹5,000 in single bill or 2.5x avg)
    cursor.execute("""
    SELECT id, vendor, total, date, category FROM receipts 
    WHERE status = 'confirmed' AND total >= 5000 
    ORDER BY date DESC LIMIT 2
    """)
    for row in cursor.fetchall():
        actions.append({
            "type": "unusual_spending",
            "priority": "low",
            "title": f"High Expense Recorded: {row['vendor']}",
            "hindi_title": f"बड़ा खर्च दर्ज हुआ: {row['vendor']}",
            "message": f"Single transaction of ₹{row['total']:,.2f} recorded on {row['date']} ({row['category']}).",
            "hindi_message": f"₹{row['total']:,.2f} का बड़ा खर्च {row['date']} को ({row['category']}) दर्ज हुआ।",
            "receipt_id": row["id"],
            "action_text": "Inspect (जांच करें)",
            "action_tab": "receipts"
        })

    conn.close()
    return actions

# ==============================================================================
# 6. CUSTOMER KHATA (ग्राहक बहीखाता - आपने दिए / आपको मिले)
# ==============================================================================

def get_all_customers(db_path=None, search=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    
    query = """
    SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN ct.type = 'given' THEN ct.amount ELSE 0 END), 0) AS total_given,
        COALESCE(SUM(CASE WHEN ct.type = 'received' THEN ct.amount ELSE 0 END), 0) AS total_received,
        COALESCE(SUM(CASE WHEN ct.type = 'given' THEN ct.amount ELSE -ct.amount END), 0) AS balance_due,
        MAX(ct.date) AS last_transaction_date,
        COUNT(ct.id) AS tx_count
    FROM customers c
    LEFT JOIN customer_transactions ct ON c.id = ct.customer_id
    """
    params = []
    if search and search.strip():
        s = f"%{search.strip()}%"
        query += " WHERE c.name LIKE ? OR c.phone LIKE ? OR c.notes LIKE ?"
        params.extend([s, s, s])
        
    query += " GROUP BY c.id ORDER BY balance_due DESC, c.name ASC"
    
    cursor.execute(query, params)
    rows = cursor.fetchall()
    customers = [dict(row) for row in rows]
    
    # Calculate global customer khata summary
    total_receivable = sum(c["balance_due"] for c in customers if c["balance_due"] > 0)
    total_advance = sum(abs(c["balance_due"]) for c in customers if c["balance_due"] < 0)
    
    conn.close()
    return {
        "customers": customers,
        "count": len(customers),
        "total_receivable": total_receivable, # मार्केट से कुल लेना है (You'll receive)
        "total_advance": total_advance        # ग्राहकों का एडवांस जमा (You owe)
    }

def get_customer_by_id(customer_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM customers WHERE id = ?", (customer_id,))
    c_row = cursor.fetchone()
    if not c_row:
        conn.close()
        return None
        
    customer = dict(c_row)
    
    # Fetch customer transactions timeline
    cursor.execute("""
    SELECT * FROM customer_transactions 
    WHERE customer_id = ? 
    ORDER BY date DESC, id DESC
    """, (customer_id,))
    tx_rows = cursor.fetchall()
    transactions = [dict(tx) for tx in tx_rows]
    
    total_given = sum(tx["amount"] for tx in transactions if tx["type"] == "given")
    total_received = sum(tx["amount"] for tx in transactions if tx["type"] == "received")
    balance_due = total_given - total_received
    
    customer["total_given"] = total_given
    customer["total_received"] = total_received
    customer["balance_due"] = balance_due
    customer["transactions"] = transactions
    
    conn.close()
    return customer

def insert_customer(data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    
    name = (data.get("name") or "").strip()
    if not name:
        conn.close()
        raise ValueError("Customer name is required")
        
    cursor.execute("""
    INSERT INTO customers (name, phone, address, notes, credit_limit, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (
        name,
        (data.get("phone") or "").strip(),
        (data.get("address") or "").strip(),
        (data.get("notes") or "").strip(),
        float(data.get("credit_limit") or 0.0),
        now_str
    ))
    cid = cursor.lastrowid
    
    # If opening balance provided
    opening_balance = float(data.get("opening_balance") or 0.0)
    opening_type = data.get("opening_type", "given") # 'given' = customer owes shopkeeper
    if opening_balance > 0:
        cursor.execute("""
        INSERT INTO customer_transactions (customer_id, date, type, amount, payment_mode, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            cid,
            data.get("date") or datetime.now().strftime("%Y-%m-%d"),
            opening_type,
            opening_balance,
            "cash",
            data.get("opening_notes") or "Opening Khata Balance (शुरुआती बाकी)",
            now_str
        ))
        
    conn.commit()
    conn.close()
    return get_customer_by_id(cid, db_path)

def update_customer(customer_id, data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    
    name = (data.get("name") or "").strip()
    if not name:
        conn.close()
        raise ValueError("Customer name is required")
        
    cursor.execute("""
    UPDATE customers 
    SET name = ?, phone = ?, address = ?, notes = ?, credit_limit = ?
    WHERE id = ?
    """, (
        name,
        (data.get("phone") or "").strip(),
        (data.get("address") or "").strip(),
        (data.get("notes") or "").strip(),
        float(data.get("credit_limit") or 0.0),
        customer_id
    ))
    conn.commit()
    conn.close()
    return get_customer_by_id(customer_id, db_path)

def delete_customer(customer_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "customer_id": customer_id}

def insert_customer_transaction(customer_id, data, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    now_str = datetime.now().isoformat()
    
    amount = float(data.get("amount") or 0.0)
    if amount <= 0:
        conn.close()
        raise ValueError("Transaction amount must be greater than zero")
        
    tx_type = data.get("type", "given").lower()
    if tx_type not in ["given", "received"]:
        tx_type = "given"
        
    tx_date = data.get("date") or datetime.now().strftime("%Y-%m-%d")
    payment_mode = data.get("payment_mode", "cash")
    notes = (data.get("notes") or "").strip()
    
    cursor.execute("""
    INSERT INTO customer_transactions (customer_id, date, type, amount, payment_mode, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        customer_id,
        tx_date,
        tx_type,
        amount,
        payment_mode,
        notes,
        now_str
    ))
    tx_id = cursor.lastrowid
    
    # Also link to Daily Hisab / sales if type is 'given' (credit sale) or 'received' (payment)
    if data.get("sync_with_hisab", True):
        cursor.execute("SELECT name FROM customers WHERE id = ?", (customer_id,))
        c_row = cursor.fetchone()
        c_name = c_row["name"] if c_row else "Customer"
        
        if tx_type == "given":
            # Record customer credit sale into sales table
            cursor.execute("""
            INSERT INTO sales (date, amount, payment_mode, customer_name, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                tx_date,
                amount,
                "credit",
                c_name,
                f"Khata Udhar: {notes}" if notes else "Khata Udhar",
                now_str
            ))
        elif tx_type == "received":
            # Record payment received into sales table (cash/upi)
            cursor.execute("""
            INSERT INTO sales (date, amount, payment_mode, customer_name, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (
                tx_date,
                amount,
                payment_mode if payment_mode in ["cash", "upi"] else "cash",
                c_name,
                f"Khata Vasooli (Received): {notes}" if notes else "Khata Vasooli (Received)",
                now_str
            ))
            
    conn.commit()
    conn.close()
    return {"id": tx_id, "customer_id": customer_id, "amount": amount, "type": tx_type, "date": tx_date}

def delete_customer_transaction(tx_id, db_path=None):
    conn = get_db(db_path)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM customer_transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()
    return {"deleted": True, "transaction_id": tx_id}

