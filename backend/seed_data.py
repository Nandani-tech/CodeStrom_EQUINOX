import os
import json
from datetime import datetime, timedelta
from database import init_db, get_db, insert_receipt

# 20 realistic synthetic business receipts
DEMO_RECEIPTS = [
    {
        "vendor": "Amazon Web Services",
        "date": "2026-03-01",
        "total": 342.50,
        "subtotal": 314.22,
        "tax": 28.28,
        "tip": 0.0,
        "currency": "USD",
        "category": "Software & SaaS",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "AWS-2026-9921",
        "file_name": "aws_march_invoice.pdf",
        "file_type": "application/pdf",
        "notes": "Production EC2, RDS PostgreSQL, and S3 backup hosting",
        "confidence_score": 0.98,
        "uncertain_fields": [],
        "items": [
            {"description": "EC2 t4g.xlarge instances", "quantity": 2, "unit_price": 110.00, "total_price": 220.00, "category": "Software & SaaS"},
            {"description": "RDS PostgreSQL db.m6g.large", "quantity": 1, "unit_price": 82.50, "total_price": 82.50, "category": "Software & SaaS"},
            {"description": "S3 Standard Storage & Transfer", "quantity": 1, "unit_price": 11.72, "total_price": 11.72, "category": "Software & SaaS"}
        ]
    },
    {
        "vendor": "Apple Store",
        "date": "2026-03-02",
        "total": 1299.00,
        "subtotal": 1199.00,
        "tax": 100.00,
        "tip": 0.0,
        "currency": "USD",
        "category": "Hardware & Equipment",
        "status": "confirmed",
        "payment_method": "Corporate Visa (...8821)",
        "invoice_number": "APL-774921",
        "file_name": "apple_macbook_receipt.png",
        "file_type": "image/png",
        "notes": "MacBook Air M3 for newly onboarded backend engineer",
        "confidence_score": 0.99,
        "uncertain_fields": [],
        "items": [
            {"description": "MacBook Air 13-inch M3 16GB/512GB", "quantity": 1, "unit_price": 1199.00, "total_price": 1199.00, "category": "Hardware & Equipment"}
        ]
    },
    {
        "vendor": "GitHub Inc",
        "date": "2026-03-05",
        "total": 84.00,
        "subtotal": 84.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Software & SaaS",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "GH-88310",
        "file_name": "github_enterprise_sub.pdf",
        "file_type": "application/pdf",
        "notes": "GitHub Enterprise 4 active developer seats",
        "confidence_score": 0.97,
        "uncertain_fields": [],
        "items": [
            {"description": "GitHub Enterprise User Seat", "quantity": 4, "unit_price": 21.00, "total_price": 84.00, "category": "Software & SaaS"}
        ]
    },
    {
        "vendor": "Delta Air Lines",
        "date": "2026-03-08",
        "total": 485.20,
        "subtotal": 435.00,
        "tax": 50.20,
        "tip": 0.0,
        "currency": "USD",
        "category": "Travel & Lodging",
        "status": "confirmed",
        "payment_method": "Corporate Visa (...8821)",
        "invoice_number": "DAL-891024",
        "file_name": "delta_flight_ticket.pdf",
        "file_type": "application/pdf",
        "notes": "Roundtrip SFO to Austin for Google Cloud Hackathon",
        "confidence_score": 0.96,
        "uncertain_fields": [],
        "items": [
            {"description": "Roundtrip Economy Comfort Flight", "quantity": 1, "unit_price": 435.00, "total_price": 435.00, "category": "Travel & Lodging"}
        ]
    },
    {
        "vendor": "Marriott Downtown",
        "date": "2026-03-10",
        "total": 380.00,
        "subtotal": 330.43,
        "tax": 49.57,
        "tip": 0.0,
        "currency": "USD",
        "category": "Travel & Lodging",
        "status": "confirmed",
        "payment_method": "Corporate Visa (...8821)",
        "invoice_number": "MAR-2026-449",
        "file_name": "marriott_hotel_folio.pdf",
        "file_type": "application/pdf",
        "notes": "2 nights lodging for conference attendance",
        "confidence_score": 0.95,
        "uncertain_fields": [],
        "items": [
            {"description": "Standard King Room (2 nights)", "quantity": 2, "unit_price": 165.22, "total_price": 330.43, "category": "Travel & Lodging"}
        ]
    },
    {
        "vendor": "Uber Technologies",
        "date": "2026-03-11",
        "total": 38.45,
        "subtotal": 31.50,
        "tax": 2.95,
        "tip": 4.00,
        "currency": "USD",
        "category": "Travel & Lodging",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "UBR-9021-A",
        "file_name": "uber_airport_ride.png",
        "file_type": "image/png",
        "notes": "Ride from Austin airport to convention venue",
        "confidence_score": 0.94,
        "uncertain_fields": [],
        "items": [
            {"description": "UberX Airport Transfer", "quantity": 1, "unit_price": 31.50, "total_price": 31.50, "category": "Travel & Lodging"}
        ]
    },
    {
        "vendor": "Uber Technologies",
        "date": "2026-03-11",
        "total": 38.45,
        "subtotal": 31.50,
        "tax": 2.95,
        "tip": 4.00,
        "currency": "USD",
        "category": "Travel & Lodging",
        "status": "duplicate_flagged",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "UBR-9021-A",
        "file_name": "uber_airport_ride_copy.png",
        "file_type": "image/png",
        "notes": "Flagged duplicate: matches identical vendor, date, and amount as Receipt #6",
        "confidence_score": 0.92,
        "uncertain_fields": [],
        "items": [
            {"description": "UberX Airport Transfer (Duplicate Submission)", "quantity": 1, "unit_price": 31.50, "total_price": 31.50, "category": "Travel & Lodging"}
        ]
    },
    {
        "vendor": "The Capital Grille",
        "date": "2026-03-12",
        "total": 215.80,
        "subtotal": 170.00,
        "tax": 15.80,
        "tip": 30.00,
        "currency": "USD",
        "category": "Meals & Entertainment",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "TCG-44021",
        "file_name": "capital_grille_dinner.png",
        "file_type": "image/png",
        "notes": "Dinner with enterprise prospective client and lead engineer",
        "confidence_score": 0.93,
        "uncertain_fields": [],
        "items": [
            {"description": "Steak & Seafood Entrees (3x)", "quantity": 3, "unit_price": 45.00, "total_price": 135.00, "category": "Meals & Entertainment"},
            {"description": "Appetizers & Beverages", "quantity": 1, "unit_price": 35.00, "total_price": 35.00, "category": "Meals & Entertainment"}
        ]
    },
    {
        "vendor": "Google Workspace",
        "date": "2026-02-15",
        "total": 72.00,
        "subtotal": 72.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Software & SaaS",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "GW-2026-02",
        "file_name": "google_workspace_feb.pdf",
        "file_type": "application/pdf",
        "notes": "Google Workspace Business Standard (6 user licenses)",
        "confidence_score": 0.99,
        "uncertain_fields": [],
        "items": [
            {"description": "Google Workspace Business Standard", "quantity": 6, "unit_price": 12.00, "total_price": 72.00, "category": "Software & SaaS"}
        ]
    },
    {
        "vendor": "Slack Technologies",
        "date": "2026-02-18",
        "total": 125.00,
        "subtotal": 125.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Software & SaaS",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "SLK-7712",
        "file_name": "slack_pro_subscription.pdf",
        "file_type": "application/pdf",
        "notes": "Slack Pro Plan monthly subscription for 10 users",
        "confidence_score": 0.98,
        "uncertain_fields": [],
        "items": [
            {"description": "Slack Pro Active Members", "quantity": 10, "unit_price": 12.50, "total_price": 125.00, "category": "Software & SaaS"}
        ]
    },
    {
        "vendor": "Best Buy",
        "date": "2026-02-20",
        "total": 189.99,
        "subtotal": 174.30,
        "tax": 15.69,
        "tip": 0.0,
        "currency": "USD",
        "category": "Hardware & Equipment",
        "status": "confirmed",
        "payment_method": "Corporate Visa (...8821)",
        "invoice_number": "BBY-99014",
        "file_name": "bestbuy_monitor_receipt.png",
        "file_type": "image/png",
        "notes": "LG 27-inch 4K IPS monitor for office workstation",
        "confidence_score": 0.96,
        "uncertain_fields": [],
        "items": [
            {"description": "LG 27-inch 4K UHD Monitor", "quantity": 1, "unit_price": 174.30, "total_price": 174.30, "category": "Hardware & Equipment"}
        ]
    },
    {
        "vendor": "Blue Bottle Coffee",
        "date": "2026-02-22",
        "total": 24.50,
        "subtotal": 20.00,
        "tax": 1.70,
        "tip": 2.80,
        "currency": "USD",
        "category": "Meals & Entertainment",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "BBC-88210",
        "file_name": "bluebottle_receipt.png",
        "file_type": "image/png",
        "notes": "Sprint planning breakfast and specialty coffee",
        "confidence_score": 0.94,
        "uncertain_fields": [],
        "items": [
            {"description": "Oat Milk Lattes (3x)", "quantity": 3, "unit_price": 5.50, "total_price": 16.50, "category": "Meals & Entertainment"},
            {"description": "Croissants (1x)", "quantity": 1, "unit_price": 3.50, "total_price": 3.50, "category": "Meals & Entertainment"}
        ]
    },
    {
        "vendor": "Staples Office Supplies",
        "date": "2026-02-25",
        "total": 68.40,
        "subtotal": 62.75,
        "tax": 5.65,
        "tip": 0.0,
        "currency": "USD",
        "category": "Office Supplies",
        "status": "confirmed",
        "payment_method": "Corporate Visa (...8821)",
        "invoice_number": "STP-38821",
        "file_name": "staples_receipt.png",
        "file_type": "image/png",
        "notes": "Whiteboard markers, sticky pads, and notebook packs",
        "confidence_score": 0.95,
        "uncertain_fields": [],
        "items": [
            {"description": "Dry Erase Marker Pack 12ct", "quantity": 2, "unit_price": 14.50, "total_price": 29.00, "category": "Office Supplies"},
            {"description": "Executive Grid Notebooks", "quantity": 3, "unit_price": 11.25, "total_price": 33.75, "category": "Office Supplies"}
        ]
    },
    {
        "vendor": "WeWork Shared Workspace",
        "date": "2026-02-01",
        "total": 550.00,
        "subtotal": 550.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Office Supplies",
        "status": "confirmed",
        "payment_method": "ACH Direct Debit",
        "invoice_number": "WW-2026-02-SF",
        "file_name": "wework_monthly_membership.pdf",
        "file_type": "application/pdf",
        "notes": "February dedicated desks membership downtown",
        "confidence_score": 0.99,
        "uncertain_fields": [],
        "items": [
            {"description": "Hot Desk All-Access Membership (2 pax)", "quantity": 2, "unit_price": 275.00, "total_price": 550.00, "category": "Office Supplies"}
        ]
    },
    {
        "vendor": "Meta Ads",
        "date": "2026-01-20",
        "total": 250.00,
        "subtotal": 250.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Marketing & Advertising",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "FB-ADS-99120",
        "file_name": "meta_ads_invoice.pdf",
        "file_type": "application/pdf",
        "notes": "Developer waitlist acquisition ads campaign",
        "confidence_score": 0.97,
        "uncertain_fields": [],
        "items": [
            {"description": "Targeted Tech Lead Ad Impressions", "quantity": 1, "unit_price": 250.00, "total_price": 250.00, "category": "Marketing & Advertising"}
        ]
    },
    {
        "vendor": "Google Ads",
        "date": "2026-01-28",
        "total": 320.00,
        "subtotal": 320.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Marketing & Advertising",
        "status": "confirmed",
        "payment_method": "Corporate Amex (...1004)",
        "invoice_number": "GOOG-ADS-1882",
        "file_name": "google_ads_jan.pdf",
        "file_type": "application/pdf",
        "notes": "High-intent search keyword ads for receipt auditor SaaS",
        "confidence_score": 0.98,
        "uncertain_fields": [],
        "items": [
            {"description": "Search Network Clicks", "quantity": 1, "unit_price": 320.00, "total_price": 320.00, "category": "Marketing & Advertising"}
        ]
    },
    {
        "vendor": "Stripe",
        "date": "2026-01-31",
        "total": 48.20,
        "subtotal": 48.20,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Professional Services",
        "status": "confirmed",
        "payment_method": "Deducted from Payouts",
        "invoice_number": "STR-FEE-202601",
        "file_name": "stripe_monthly_fees.pdf",
        "file_type": "application/pdf",
        "notes": "Monthly payment processing & fraud prevention fees",
        "confidence_score": 0.99,
        "uncertain_fields": [],
        "items": [
            {"description": "Merchant Gateway Processing Fees", "quantity": 1, "unit_price": 48.20, "total_price": 48.20, "category": "Professional Services"}
        ]
    },
    {
        "vendor": "Cooley LLP Legal Advisory",
        "date": "2026-01-15",
        "total": 750.00,
        "subtotal": 750.00,
        "tax": 0.0,
        "tip": 0.0,
        "currency": "USD",
        "category": "Professional Services",
        "status": "confirmed",
        "payment_method": "Wire Transfer",
        "invoice_number": "COOLEY-10924",
        "file_name": "cooley_legal_retainer.pdf",
        "file_type": "application/pdf",
        "notes": "Corporate governance and Delaware incorporation filing review",
        "confidence_score": 0.99,
        "uncertain_fields": [],
        "items": [
            {"description": "Senior Partner Corporate Counsel (1.5 hrs)", "quantity": 1.5, "unit_price": 500.00, "total_price": 750.00, "category": "Professional Services"}
        ]
    },
    {
        "vendor": "AT&T Business Fiber",
        "date": "2026-02-10",
        "total": 110.00,
        "subtotal": 98.50,
        "tax": 11.50,
        "tip": 0.0,
        "currency": "USD",
        "category": "Utilities & Phone",
        "status": "confirmed",
        "payment_method": "Auto-Pay Bank ACH",
        "invoice_number": "ATT-992144",
        "file_name": "att_fiber_internet.pdf",
        "file_type": "application/pdf",
        "notes": "1 Gbps dedicated symmetrical fiber line for studio",
        "confidence_score": 0.97,
        "uncertain_fields": [],
        "items": [
            {"description": "Business Fiber 1000 Service", "quantity": 1, "unit_price": 98.50, "total_price": 98.50, "category": "Utilities & Phone"}
        ]
    },
    {
        "vendor": "Sweetgreen Salad Lab",
        "date": "2026-03-14",
        "total": 42.30,
        "subtotal": 38.60,
        "tax": 3.70,
        "tip": 0.0,
        "currency": "USD",
        "category": "Meals & Entertainment",
        "status": "pending_review",
        "payment_method": "Corporate Visa (...8821)",
        "invoice_number": "SG-8819",
        "file_name": "sweetgreen_blurry_receipt.png",
        "file_type": "image/png",
        "notes": "Client working lunch - missing itemized tax breakdown",
        "confidence_score": 0.74,
        "uncertain_fields": ["tax"],
        "items": [
            {"description": "Warm Bowls & Seasonal Drinks (2x)", "quantity": 2, "unit_price": 19.30, "total_price": 38.60, "category": "Meals & Entertainment"}
        ]
    }
]

def generate_sample_file(uploads_dir, file_name, vendor, total, date, category):
    """
    Generates a readable visual receipt file (SVG/HTML representation) in uploads folder
    so clicking 'View Receipt' displays a realistic visual document.
    """
    os.makedirs(uploads_dir, exist_ok=True)
    target_path = os.path.join(uploads_dir, file_name)
    if os.path.exists(target_path):
        return target_path

    # Create an SVG receipt graphic
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560">
  <defs>
    <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15"/>
    </filter>
  </defs>

  <!-- Receipt Paper -->
  <rect x="20" y="20" width="360" height="520" rx="12" fill="url(#paperGrad)" filter="url(#shadow)" stroke="#e2e8f0" stroke-width="1"/>

  <!-- Top Jagged Edge / Header -->
  <rect x="20" y="20" width="360" height="70" rx="12" fill="#1e1b4b"/>
  <text x="200" y="55" font-family="Inter, sans-serif" font-size="16" font-weight="bold" fill="#ffffff" text-anchor="middle">SHOPLEDGER VERIFIED</text>
  <text x="200" y="75" font-family="Inter, sans-serif" font-size="11" fill="#818cf8" text-anchor="middle">AUDITED EXPENSE RECORD</text>

  <!-- Merchant Info -->
  <text x="200" y="130" font-family="Inter, sans-serif" font-size="20" font-weight="800" fill="#0f172a" text-anchor="middle">{vendor}</text>
  <text x="200" y="152" font-family="Inter, sans-serif" font-size="12" fill="#64748b" text-anchor="middle">Date: {date} • {category}</text>

  <!-- Divider -->
  <line x1="45" y1="175" x2="355" y2="175" stroke="#cbd5e1" stroke-dasharray="4,4" stroke-width="1.5"/>

  <!-- Items -->
  <text x="50" y="210" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#475569">Item / Description</text>
  <text x="350" y="210" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="#475569" text-anchor="end">Amount</text>

  <text x="50" y="240" font-family="Inter, sans-serif" font-size="13" fill="#1e293b">1x Primary Verified Service</text>
  <text x="350" y="240" font-family="Inter, sans-serif" font-size="13" font-weight="600" fill="#0f172a" text-anchor="end">${total:.2f}</text>

  <text x="50" y="270" font-family="Inter, sans-serif" font-size="11" fill="#94a3b8">Reference: {file_name}</text>

  <!-- Divider -->
  <line x1="45" y1="360" x2="355" y2="360" stroke="#cbd5e1" stroke-width="1"/>

  <!-- Total Section -->
  <text x="50" y="395" font-family="Inter, sans-serif" font-size="13" fill="#64748b">Subtotal</text>
  <text x="350" y="395" font-family="Inter, sans-serif" font-size="13" fill="#64748b" text-anchor="end">${total * 0.9:.2f}</text>

  <text x="50" y="420" font-family="Inter, sans-serif" font-size="13" fill="#64748b">Taxes & Fees</text>
  <text x="350" y="420" font-family="Inter, sans-serif" font-size="13" fill="#64748b" text-anchor="end">${total * 0.1:.2f}</text>

  <line x1="45" y1="440" x2="355" y2="440" stroke="#0f172a" stroke-width="2"/>

  <text x="50" y="475" font-family="Inter, sans-serif" font-size="18" font-weight="800" fill="#0f172a">TOTAL PAID</text>
  <text x="350" y="475" font-family="Inter, sans-serif" font-size="22" font-weight="900" fill="#4f46e5" text-anchor="end">${total:.2f} USD</text>

  <!-- Barcode / Footer -->
  <rect x="70" y="500" width="260" height="20" fill="#f1f5f9" rx="4"/>
  <text x="200" y="514" font-family="monospace" font-size="10" fill="#64748b" text-anchor="middle">||| | |||| ||| ||||| |||| || ||||</text>
</svg>"""

    with open(target_path, "w", encoding="utf-8") as f:
        f.write(svg_content)
    return target_path

def seed_database(db_path=None, uploads_dir=None):
    init_db(db_path)
    conn = get_db(db_path)
    cursor = conn.cursor()

    # Clear existing demo data
    cursor.execute("DELETE FROM receipt_items")
    cursor.execute("DELETE FROM audit_logs")
    cursor.execute("DELETE FROM receipts")
    try:
        cursor.execute("DELETE FROM sqlite_sequence WHERE name IN ('receipts', 'receipt_items', 'audit_logs')")
    except Exception:
        pass
    conn.commit()
    conn.close()

    actual_uploads = uploads_dir or os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "uploads")
    os.makedirs(actual_uploads, exist_ok=True)

    inserted_count = 0
    for r in DEMO_RECEIPTS:
        receipt_data = r.copy()
        items = receipt_data.pop("items", [])
        
        # Create graphic preview file
        fn = receipt_data.get("file_name", "receipt.svg")
        file_path = generate_sample_file(
            actual_uploads, fn,
            receipt_data["vendor"], receipt_data["total"],
            receipt_data["date"], receipt_data["category"]
        )
        receipt_data["file_path"] = file_path
        
        insert_receipt(receipt_data, items=items, db_path=db_path)
        inserted_count += 1

    print(f"Successfully seeded database with {inserted_count} synthetic business receipts!")
    return inserted_count

if __name__ == "__main__":
    seed_database()
