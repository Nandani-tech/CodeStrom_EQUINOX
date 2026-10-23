import sqlite3
import re
from datetime import datetime, timedelta

def normalize_text(text):
    if not text:
        return ""
    text = text.lower()
    # Strip common business suffixes
    text = re.sub(r'\b(inc|corp|corporation|llc|ltd|co|technologies|services|store)\b', '', text)
    # Strip punctuation and extra spaces
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return ' '.join(text.split())

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%m/%d/%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except ValueError:
            continue
    return None

def detect_duplicates(candidate_data, db_conn, exclude_id=None):
    """
    Checks candidate receipt data against existing receipts in SQLite database.
    Returns:
      {
        "is_duplicate": bool,
        "matches": [
          {
            "receipt_id": int,
            "vendor": str,
            "date": str,
            "total": float,
            "invoice_number": str,
            "match_type": str, # 'exact_invoice', 'exact_vendor_date_total', 'near_date_same_amount', 'similar_vendor_same_amount'
            "similarity_score": float, # 0.0 - 1.0
            "reason": str
          }
        ]
      }
    """
    candidate_vendor = (candidate_data.get("vendor") or "").strip()
    candidate_norm_vendor = normalize_text(candidate_vendor)
    try:
        candidate_total = float(candidate_data.get("total") or 0.0)
    except (ValueError, TypeError):
        candidate_total = 0.0
    candidate_date = candidate_data.get("date")
    candidate_dt = parse_date(candidate_date)
    candidate_invoice = (candidate_data.get("invoice_number") or "").strip()

    if candidate_total <= 0:
        return {"is_duplicate": False, "matches": []}

    cursor = db_conn.cursor()
    query = "SELECT id, vendor, date, total, invoice_number, status, category FROM receipts WHERE 1=1"
    params = []
    if exclude_id:
        query += " AND id != ?"
        params.append(exclude_id)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    matches = []

    for row in rows:
        row_id = row["id"]
        row_vendor = (row["vendor"] or "").strip()
        row_norm_vendor = normalize_text(row_vendor)
        row_total = float(row["total"] or 0.0)
        row_date = row["date"]
        row_dt = parse_date(row_date)
        row_invoice = (row["invoice_number"] or "").strip()

        # 1. Invoice Number Match (Strongest signal)
        if candidate_invoice and row_invoice and candidate_invoice.lower() == row_invoice.lower():
            matches.append({
                "receipt_id": row_id,
                "vendor": row_vendor,
                "date": row_date,
                "total": row_total,
                "invoice_number": row_invoice,
                "status": row["status"],
                "category": row["category"],
                "match_type": "exact_invoice",
                "similarity_score": 0.99,
                "reason": f"Exact invoice number match ('{row_invoice}') with Receipt #{row_id}."
            })
            continue

        # Check total match (within 2 cents for float/currency tolerance)
        total_matches = abs(candidate_total - row_total) <= 0.02
        if not total_matches:
            continue

        vendor_exact = candidate_vendor.lower() == row_vendor.lower()
        vendor_norm_match = candidate_norm_vendor and (candidate_norm_vendor == row_norm_vendor or candidate_norm_vendor in row_norm_vendor or row_norm_vendor in candidate_norm_vendor)

        # 2. Exact vendor, amount, and date match
        if (vendor_exact or vendor_norm_match) and candidate_date and row_date and candidate_date == row_date:
            matches.append({
                "receipt_id": row_id,
                "vendor": row_vendor,
                "date": row_date,
                "total": row_total,
                "invoice_number": row_invoice,
                "status": row["status"],
                "category": row["category"],
                "match_type": "exact_vendor_date_total",
                "similarity_score": 0.95,
                "reason": f"Identical vendor ('{row_vendor}'), total (${row_total:.2f}), and date ({row_date}) found in Receipt #{row_id}."
            })
            continue

        # 3. Near-date match (within 3 days) with matching vendor and amount
        if (vendor_exact or vendor_norm_match) and candidate_dt and row_dt:
            days_diff = abs((candidate_dt - row_dt).days)
            if days_diff <= 3:
                matches.append({
                    "receipt_id": row_id,
                    "vendor": row_vendor,
                    "date": row_date,
                    "total": row_total,
                    "invoice_number": row_invoice,
                    "status": row["status"],
                    "category": row["category"],
                    "match_type": "near_date_same_amount",
                    "similarity_score": 0.82,
                    "reason": f"Same vendor ('{row_vendor}') and amount (${row_total:.2f}) within {days_diff} day(s) of Receipt #{row_id} ({row_date}). Possible statement lag duplicate."
                })
                continue

    matches.sort(key=lambda m: m["similarity_score"], reverse=True)
    return {
        "is_duplicate": len(matches) > 0,
        "highest_score": matches[0]["similarity_score"] if matches else 0.0,
        "matches": matches
    }
