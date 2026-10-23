import os
import io
import csv
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from database import (
    init_db,
    get_db,
    get_all_receipts,
    get_receipt_by_id,
    insert_receipt,
    update_receipt,
    confirm_receipt,
    delete_receipt,
    get_analytics_summary,
    log_audit,
    # 1. Daily Hisab
    insert_sale,
    get_sales,
    delete_sale,
    get_daily_hisab,
    # 2. Supplier Khata
    get_all_suppliers,
    get_supplier_by_id,
    insert_supplier,
    update_supplier,
    delete_supplier,
    insert_supplier_transaction,
    # 3. Smart Stock
    get_all_inventory,
    get_inventory_item,
    insert_inventory_item,
    update_inventory_item,
    delete_inventory_item,
    confirm_stock_addition_from_receipt,
    get_low_stock_alerts,
    # 4. Profit Overview
    get_profit_overview,
    # 5. Smart Actions
    get_smart_actions
)
from gemini_service import parse_with_gemini, fallback_heuristic_extractor
from receipt_duplicates import detect_duplicates
from ai_assistant import ask_assistant
from seed_indian_data import seed_indian_shopkeeper_data

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}}, expose_headers=["Content-Disposition"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Ensure database is initialized on startup
init_db()

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "pdf", "svg"}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

# ==============================================================================
# GENERAL & HEALTH
# ==============================================================================

@app.route("/api/health", methods=["GET"])
def health():
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    return jsonify({
        "status": "healthy",
        "app": "ShopLedger API",
        "edition": "Indian Shopkeeper Edition",
        "version": "2.0.0",
        "currency": "INR",
        "gemini_configured": bool(gemini_key),
        "gemini_key_preview": f"{gemini_key[:4]}...{gemini_key[-4:]}" if len(gemini_key) > 8 else ("Set" if gemini_key else "Not Configured"),
        "timestamp": datetime.now().isoformat()
    })

@app.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename):
    return send_from_directory(UPLOADS_DIR, filename)

# ==============================================================================
# 1. DAILY HISAB (दैनिक हिसाब API)
# ==============================================================================

@app.route("/api/hisab/daily", methods=["GET"])
def hisab_daily():
    target_date = request.args.get("date")
    data = get_daily_hisab(date_str=target_date)
    return jsonify(data)

@app.route("/api/hisab/sales", methods=["GET"])
def hisab_list_sales():
    target_date = request.args.get("date")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    sales = get_sales(date_str=target_date, start_date=start_date, end_date=end_date)
    return jsonify({"sales": sales, "count": len(sales)})

@app.route("/api/hisab/sales", methods=["POST"])
def hisab_record_sale():
    data = request.get_json() or {}
    if not data.get("amount"):
        return jsonify({"error": "Sale amount is required"}), 400
    try:
        data["amount"] = float(data["amount"])
    except ValueError:
        return jsonify({"error": "Invalid amount"}), 400

    created_sale = insert_sale(data)
    return jsonify({
        "message": "Sale recorded successfully",
        "sale": created_sale
    }), 201

@app.route("/api/hisab/sales/<int:sale_id>", methods=["DELETE"])
def hisab_delete_sale(sale_id):
    success = delete_sale(sale_id)
    if not success:
        return jsonify({"error": f"Sale #{sale_id} not found"}), 404
    return jsonify({"message": f"Sale #{sale_id} deleted successfully", "success": True})

# ==============================================================================
# 2. SUPPLIER KHATA (सप्लायर खाता API)
# ==============================================================================

@app.route("/api/suppliers", methods=["GET"])
def list_suppliers():
    suppliers = get_all_suppliers()
    return jsonify({"suppliers": suppliers, "count": len(suppliers)})

@app.route("/api/suppliers/<int:supplier_id>", methods=["GET"])
def get_supplier_detail(supplier_id):
    sup = get_supplier_by_id(supplier_id)
    if not sup:
        return jsonify({"error": f"Supplier #{supplier_id} not found"}), 404
    return jsonify(sup)

@app.route("/api/suppliers", methods=["POST"])
def create_supplier():
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Supplier name is required"}), 400
    created = insert_supplier(data)
    return jsonify({"message": "Supplier created successfully", "supplier": created}), 201

@app.route("/api/suppliers/<int:supplier_id>", methods=["PUT"])
def edit_supplier(supplier_id):
    data = request.get_json() or {}
    updated = update_supplier(supplier_id, data)
    if not updated:
        return jsonify({"error": f"Supplier #{supplier_id} not found"}), 404
    return jsonify({"message": "Supplier updated successfully", "supplier": updated})

@app.route("/api/suppliers/<int:supplier_id>", methods=["DELETE"])
def remove_supplier(supplier_id):
    success = delete_supplier(supplier_id)
    if not success:
        return jsonify({"error": f"Supplier #{supplier_id} not found"}), 404
    return jsonify({"message": f"Supplier #{supplier_id} deleted successfully", "success": True})

@app.route("/api/suppliers/<int:supplier_id>/transactions", methods=["POST"])
def record_supplier_transaction(supplier_id):
    data = request.get_json() or {}
    if not data.get("amount") or not data.get("type"):
        return jsonify({"error": "Amount and transaction type ('purchase' or 'payment') are required"}), 400
    data["supplier_id"] = supplier_id
    updated_supplier = insert_supplier_transaction(data)
    return jsonify({
        "message": f"Supplier {data.get('type')} recorded successfully",
        "supplier": updated_supplier
    }), 201

# ==============================================================================
# 3. SMART STOCK (स्मार्ट स्टॉक & INVENTORY API)
# ==============================================================================

@app.route("/api/inventory", methods=["GET"])
def list_inventory():
    items = get_all_inventory()
    low_stock_count = len([i for i in items if i.get("is_low_stock")])
    return jsonify({
        "inventory": items,
        "count": len(items),
        "low_stock_count": low_stock_count
    })

@app.route("/api/inventory/<int:item_id>", methods=["GET"])
def get_inventory_detail(item_id):
    itm = get_inventory_item(item_id)
    if not itm:
        return jsonify({"error": f"Inventory item #{item_id} not found"}), 404
    return jsonify(itm)

@app.route("/api/inventory", methods=["POST"])
def create_inventory_item():
    data = request.get_json() or {}
    if not data.get("name"):
        return jsonify({"error": "Item name is required"}), 400
    created = insert_inventory_item(data)
    return jsonify({"message": "Item added to inventory", "item": created}), 201

@app.route("/api/inventory/<int:item_id>", methods=["PUT"])
def edit_inventory_item(item_id):
    data = request.get_json() or {}
    updated = update_inventory_item(item_id, data)
    if not updated:
        return jsonify({"error": f"Item #{item_id} not found"}), 404
    return jsonify({"message": "Item updated successfully", "item": updated})

@app.route("/api/inventory/<int:item_id>", methods=["DELETE"])
def remove_inventory_item(item_id):
    success = delete_inventory_item(item_id)
    if not success:
        return jsonify({"error": f"Item #{item_id} not found"}), 404
    return jsonify({"message": "Item removed from inventory", "success": True})

@app.route("/api/inventory/confirm-from-receipt/<int:receipt_id>", methods=["POST"])
def confirm_stock_from_receipt_endpoint(receipt_id):
    """
    CRITICAL REQUIREMENT 3:
    Allows user to review line items extracted from receipt and confirm stock additions.
    """
    data = request.get_json() or {}
    items = data.get("items")
    if not items or not isinstance(items, list):
        return jsonify({"error": "A list of confirmed items is required"}), 400

    results = confirm_stock_addition_from_receipt(receipt_id, items)
    return jsonify({
        "message": f"Successfully updated stock for {len(results)} items from Receipt #{receipt_id}",
        "added_items": results
    })

@app.route("/api/inventory/alerts", methods=["GET"])
def inventory_alerts():
    alerts = get_low_stock_alerts()
    return jsonify({"low_stock_alerts": alerts, "count": len(alerts)})

# ==============================================================================
# 4. PROFIT OVERVIEW (मुनाफा रिपोर्ट API)
# ==============================================================================

@app.route("/api/profit-overview", methods=["GET"])
def profit_overview_endpoint():
    period = request.args.get("period", "month")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    overview = get_profit_overview(period=period, start_date=start_date, end_date=end_date)
    return jsonify(overview)

# ==============================================================================
# 5. SMART ACTIONS (स्मार्ट अलर्ट्स API)
# ==============================================================================

@app.route("/api/smart-actions", methods=["GET"])
def smart_actions_endpoint():
    actions = get_smart_actions()
    return jsonify({"actions": actions, "count": len(actions)})

# ==============================================================================
# 6. RECEIPTS & OCR ROUTES (PRESERVED & ENHANCED)
# ==============================================================================

@app.route("/api/receipts", methods=["GET"])
def list_receipts():
    status = request.args.get("status")
    category = request.args.get("category")
    search = request.args.get("search")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    sort_by = request.args.get("sort_by", "date")
    sort_order = request.args.get("sort_order", "desc")

    receipts = get_all_receipts(
        status=status,
        category=category,
        search=search,
        start_date=start_date,
        end_date=end_date,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return jsonify({
        "receipts": receipts,
        "count": len(receipts)
    })

@app.route("/api/receipts/<int:receipt_id>", methods=["GET"])
def get_receipt(receipt_id):
    receipt = get_receipt_by_id(receipt_id)
    if not receipt:
        return jsonify({"error": f"Receipt #{receipt_id} not found"}), 404
    return jsonify(receipt)

@app.route("/api/receipts/upload", methods=["POST"])
def upload_receipt():
    if "file" not in request.files and "receipt" not in request.files:
        return jsonify({"error": "No file uploaded. Please send a 'file' or 'receipt' field."}), 400

    uploaded_file = request.files.get("file") or request.files.get("receipt")
    if not uploaded_file or uploaded_file.filename == "":
        return jsonify({"error": "Selected file is empty."}), 400

    filename = uploaded_file.filename
    if not allowed_file(filename):
        return jsonify({"error": f"Unsupported file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    ext = filename.rsplit(".", 1)[1].lower()
    unique_filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{ext}"
    saved_path = os.path.join(UPLOADS_DIR, unique_filename)

    file_bytes = uploaded_file.read()
    with open(saved_path, "wb") as f:
        f.write(file_bytes)

    mime_type = uploaded_file.mimetype or ("application/pdf" if ext == "pdf" else f"image/{ext}")

    extracted_data, err = parse_with_gemini(file_bytes, mime_type, filename=filename)
    if not extracted_data:
        extracted_data = fallback_heuristic_extractor(file_bytes, mime_type, filename=filename)

    receipt_dict = {
        "vendor": extracted_data.get("vendor") or "Unknown Vendor",
        "date": extracted_data.get("date") or datetime.now().strftime("%Y-%m-%d"),
        "total": float(extracted_data.get("total") or 0.0),
        "subtotal": float(extracted_data.get("subtotal")) if extracted_data.get("subtotal") is not None else None,
        "tax": float(extracted_data.get("tax") or 0.0),
        "tip": float(extracted_data.get("tip") or 0.0),
        "currency": extracted_data.get("currency") or "INR",
        "category": extracted_data.get("category") or "Other Business Expense",
        "payment_method": extracted_data.get("payment_method") or "Cash",
        "invoice_number": extracted_data.get("invoice_number") or "",
        "notes": extracted_data.get("notes") or "",
        "confidence_score": float(extracted_data.get("confidence_score", 0.95)),
        "uncertain_fields": extracted_data.get("uncertain_fields", []),
        "file_path": saved_path,
        "file_name": unique_filename,
        "file_type": mime_type,
        "raw_extracted_json": extracted_data
    }

    conn = get_db()
    dup_result = detect_duplicates(receipt_dict, conn)
    conn.close()

    if dup_result["is_duplicate"]:
        receipt_dict["status"] = "duplicate_flagged"
    else:
        receipt_dict["status"] = "pending_review"

    items = extracted_data.get("items", [])
    created_receipt = insert_receipt(receipt_dict, items=items)

    return jsonify({
        "message": "Receipt uploaded and extracted successfully",
        "receipt": created_receipt,
        "duplicate_detection": dup_result,
        "extracted_by": extracted_data.get("extracted_by", "heuristic_fallback")
    }), 201

@app.route("/api/receipts/check-duplicate", methods=["POST"])
def check_duplicate_candidate():
    data = request.get_json() or {}
    exclude_id = data.get("exclude_id")
    conn = get_db()
    result = detect_duplicates(data, conn, exclude_id=exclude_id)
    conn.close()
    return jsonify(result)

@app.route("/api/receipts/<int:receipt_id>", methods=["PUT"])
def edit_receipt(receipt_id):
    data = request.get_json() or {}
    existing = get_receipt_by_id(receipt_id)
    if not existing:
        return jsonify({"error": f"Receipt #{receipt_id} not found"}), 404

    items = data.get("items")
    updated = update_receipt(receipt_id, data, items=items)
    return jsonify({
        "message": "Receipt updated successfully",
        "receipt": updated
    })

@app.route("/api/receipts/<int:receipt_id>/confirm", methods=["POST"])
def confirm_receipt_endpoint(receipt_id):
    existing = get_receipt_by_id(receipt_id)
    if not existing:
        return jsonify({"error": f"Receipt #{receipt_id} not found"}), 404

    confirmed = confirm_receipt(receipt_id)
    return jsonify({
        "message": f"Receipt #{receipt_id} confirmed and recorded to ledger",
        "receipt": confirmed
    })

@app.route("/api/receipts/<int:receipt_id>", methods=["DELETE"])
def delete_receipt_endpoint(receipt_id):
    existing = get_receipt_by_id(receipt_id)
    if not existing:
        return jsonify({"error": f"Receipt #{receipt_id} not found"}), 404

    success = delete_receipt(receipt_id)
    return jsonify({
        "message": f"Receipt #{receipt_id} deleted successfully",
        "success": success
    })

@app.route("/api/analytics", methods=["GET"])
def analytics():
    summary = get_analytics_summary()
    return jsonify(summary)

# ==============================================================================
# 7. AI ASSISTANT CHAT
# ==============================================================================

@app.route("/api/assistant/chat", methods=["POST"])
def assistant_chat():
    data = request.get_json() or {}
    query = data.get("query", "").strip()
    if not query:
        return jsonify({"error": "Query string is required"}), 400

    response_data = ask_assistant(query)
    return jsonify(response_data)

# ==============================================================================
# 8. EXPORT & DEMO SAMPLES
# ==============================================================================

@app.route("/api/receipts/export/csv", methods=["GET"])
def export_csv():
    status_filter = request.args.get("status", "confirmed")
    receipts = get_all_receipts(status=status_filter if status_filter != "all" else None)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Receipt ID",
        "Date",
        "Vendor / Merchant",
        "Category",
        "Total (INR)",
        "Subtotal (INR)",
        "Tax (INR)",
        "Status",
        "Payment Method",
        "Invoice / Ref Number",
        "Items Count",
        "Notes"
    ])

    for r in receipts:
        writer.writerow([
            r["id"],
            r["date"],
            r["vendor"],
            r["category"],
            f"{r['total']:.2f}",
            f"{r['subtotal']:.2f}" if r["subtotal"] is not None else "",
            f"{r['tax']:.2f}",
            r["status"],
            r.get("payment_method") or "",
            r.get("invoice_number") or "",
            len(r.get("items", [])),
            r.get("notes") or ""
        ])

    output.seek(0)
    filename = f"shopledger_expenses_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return send_file(
        io.BytesIO(output.getvalue().encode("utf-8")),
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename
    )

@app.route("/api/demo/seed", methods=["POST"])
def reset_seed():
    seed_indian_shopkeeper_data()
    return jsonify({
        "message": "Successfully seeded database with Indian Kirana Store business records!",
        "success": True
    })

@app.route("/api/demo/samples", methods=["GET"])
def get_sample_files():
    samples = []
    if os.path.exists(UPLOADS_DIR):
        for f in sorted(os.listdir(UPLOADS_DIR)):
            if allowed_file(f):
                clean_name = f.replace("_", " ").replace(".svg", " (Bill)").replace(".pdf", " (PDF)").replace(".png", " (Bill)").title()
                samples.append({
                    "filename": f,
                    "url": f"/uploads/{f}",
                    "name": clean_name
                })
    return jsonify({"samples": samples[:12]})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    print(f"Starting ShopLedger Backend on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
