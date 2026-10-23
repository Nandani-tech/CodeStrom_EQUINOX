import os
import json
import re
from datetime import datetime
from database import (
    get_db, 
    row_to_dict, 
    get_daily_hisab, 
    get_all_suppliers, 
    get_all_inventory, 
    get_profit_overview, 
    get_smart_actions
)

def run_db_query_for_assistant(user_query, db_path=None):
    """
    Fetches real records and calculates factual business aggregates from SQLite.
    Returns complete Shopkeeper context:
    - Hisab (today's sales, cash in hand, expenses)
    - Khata (suppliers, outstanding dues)
    - Smart Stock (inventory items, low-stock items)
    - Profit (gross/net profit with integrity flags)
    - Receipts & Duplicates
    """
    conn = get_db(db_path)
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM receipts ORDER BY date DESC, id DESC")
    all_receipts = [row_to_dict(r) for r in cursor.fetchall()]
    conn.close()

    total_spend = sum(r["total"] for r in all_receipts if r["status"] == "confirmed")
    confirmed_receipts = [r for r in all_receipts if r["status"] == "confirmed"]

    # Category totals
    category_totals = {}
    vendor_totals = {}
    flagged = []
    for r in all_receipts:
        cat = r["category"]
        ven = r["vendor"]
        tot = r["total"]
        if r["status"] == "confirmed":
            category_totals[cat] = round(category_totals.get(cat, 0.0) + tot, 2)
            vendor_totals[ven] = round(vendor_totals.get(ven, 0.0) + tot, 2)
        if r["status"] in ("pending_review", "duplicate_flagged") or len(r.get("uncertain_fields", [])) > 0 or r.get("confidence_score", 1.0) < 0.85:
            flagged.append(r)

    # Get Shopkeeper metrics
    daily_hisab = get_daily_hisab(db_path=db_path)
    suppliers = get_all_suppliers(db_path=db_path)
    inventory = get_all_inventory(db_path=db_path)
    low_stock_items = [itm for itm in inventory if itm.get("is_low_stock")]
    profit_data = get_profit_overview("month", db_path=db_path)
    smart_actions = get_smart_actions(db_path=db_path)

    total_supplier_dues = sum(s["balance_due"] for s in suppliers if s["balance_due"] > 0)

    return {
        "all_receipts": all_receipts,
        "confirmed_receipts": confirmed_receipts,
        "total_spend": round(total_spend, 2),
        "category_totals": category_totals,
        "vendor_totals": dict(sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)),
        "flagged_records": flagged,
        "daily_hisab": daily_hisab,
        "suppliers": suppliers,
        "total_supplier_dues": round(total_supplier_dues, 2),
        "inventory": inventory,
        "low_stock_items": low_stock_items,
        "profit_data": profit_data,
        "smart_actions": smart_actions
    }

def synthesize_fallback_response(query, context):
    """
    Intelligent Python-calculated financial reasoning engine for Indian Shopkeepers.
    Supports Hindi, Hinglish, and English queries. Always computes from real DB records.
    """
    q = query.lower()
    hisab = context["daily_hisab"]
    suppliers = context["suppliers"]
    inventory = context["inventory"]
    low_stock = context["low_stock_items"]
    profit = context["profit_data"]
    confirmed = context["confirmed_receipts"]
    flagged = context["flagged_records"]

    referenced_receipts = []
    referenced_suppliers = []
    referenced_stock = []

    # Detect if user asks in Hindi/Hinglish
    is_hindi = any(word in q for word in [
        "aaj", "hisab", "kitna", "baqi", "baaki", "udhar", "rupiya", "rupaye", "rupees", 
        "munafa", "khatam", "batao", "dikhao", "dukan", "bikri", "rokad", "nagad", "kharcha",
        "सप्लायर", "हिसाब", "मुनाफा", "बिक्री", "स्टॉक", "बाकी", "दुकान"
    ])

    # 1. DAILY HISAB (आज का हिसाब / बिक्री / कैश)
    if any(k in q for k in ["aaj ka hisab", "hisab", "today's hisab", "todays hisab", "aaj kitni sale", "bikri", "cash in hand", "rokad", "daily hisab"]):
        sales_tot = hisab["sales"]["total"]
        cash_sales = hisab["sales"]["cash"]
        upi_sales = hisab["sales"]["upi"]
        credit_sales = hisab["sales"]["credit"]
        cash_in_hand = hisab["summary"]["estimated_cash_in_hand"]
        opex_tot = hisab["operating_expenses"]["total"]

        if is_hindi:
            ans = f"📊 **आज का दैनिक हिसाब ({hisab['date']}):**\n\n" \
                  f"- **कुल बिक्री (Total Sales):** ₹{sales_tot:,.2f} ({hisab['sales']['count']} ग्राहक)\n" \
                  f"  • नकद (Cash): ₹{cash_sales:,.2f}\n" \
                  f"  • UPI / Online: ₹{upi_sales:,.2f}\n" \
                  f"  • उधार खाता (Credit): ₹{credit_sales:,.2f}\n" \
                  f"- **दुकान खर्चे (Operating Expenses):** ₹{opex_tot:,.2f}\n" \
                  f"- **अपेक्षित गल्ला / नकद हाथ में (Cash in Hand):** ₹{cash_in_hand:,.2f}\n\n" \
                  f"💡 *सलाह: आज ₹{credit_sales:,.2f} का उधार दिया गया है, समय पर तगादा अवश्य करें।*"
        else:
            ans = f"📊 **Today's Daily Hisab ({hisab['date']}):**\n\n" \
                  f"- **Total Sales:** ₹{sales_tot:,.2f} across {hisab['sales']['count']} transactions\n" \
                  f"  • Cash: ₹{cash_sales:,.2f}\n" \
                  f"  • UPI/Online: ₹{upi_sales:,.2f}\n" \
                  f"  • Customer Credit (Udhar): ₹{credit_sales:,.2f}\n" \
                  f"- **Shop Expenses:** ₹{opex_tot:,.2f}\n" \
                  f"- **Estimated Cash in Hand:** ₹{cash_in_hand:,.2f}\n\n" \
                  f"All figures verified from current registered sales and expense vouchers."

        recent_recs = confirmed[:3]
        return {
            "answer": ans,
            "referenced_receipts": [r["id"] for r in recent_recs],
            "referenced_suppliers": [],
            "referenced_stock": []
        }

    # 2. SUPPLIER KHATA / BAQI (सप्लायर बकाया / उधारी)
    if any(k in q for k in ["supplier", "khata", "baqi", "baaki", "udhar", "dena", "due", "amul", "britannia", "fortune", "tata"]):
        # Check if specific supplier mentioned
        for sup in suppliers:
            name_parts = sup["name"].lower().split()
            if any(part in q for part in name_parts if len(part) > 3):
                referenced_suppliers.append(sup["id"])
                due_status = f"देय तिथि (Due Date): {sup.get('next_due_date') or 'N/A'}"
                if is_hindi:
                    return {
                        "answer": f"🤝 **सप्लायर खाता - {sup['name']} (Supplier #{sup['id']}):**\n\n" \
                                  f"- **कुल माल खरीद:** ₹{sup['total_purchased']:,.2f}\n" \
                                  f"- **कुल भुगतान किया:** ₹{sup['total_paid']:,.2f}\n" \
                                  f"- **कुल बाकी रुपया (Outstanding Due):** **₹{sup['balance_due']:,.2f}**\n" \
                                  f"- **{due_status}**\n\n" \
                                  f"सप्लायर फोन: `{sup.get('phone') or 'N/A'}`",
                        "referenced_receipts": [],
                        "referenced_suppliers": [sup["id"]],
                        "referenced_stock": []
                    }
                else:
                    return {
                        "answer": f"🤝 **Supplier Khata Record - {sup['name']} (Supplier #{sup['id']}):**\n\n" \
                                  f"- **Total Purchased:** ₹{sup['total_purchased']:,.2f}\n" \
                                  f"- **Total Paid:** ₹{sup['total_paid']:,.2f}\n" \
                                  f"- **Outstanding Balance Due:** **₹{sup['balance_due']:,.2f}**\n" \
                                  f"- **Next Due Date:** {sup.get('next_due_date') or 'No pending due date'}\n\n" \
                                  f"Phone: {sup.get('phone') or 'N/A'}",
                        "referenced_receipts": [],
                        "referenced_suppliers": [sup["id"]],
                        "referenced_stock": []
                    }

        # General supplier dues query
        due_suppliers = [s for s in suppliers if s["balance_due"] > 0]
        sup_lines = "\n".join([f"- **{s['name']}** (Supplier #{s['id']}): **₹{s['balance_due']:,.2f}** (Due: {s.get('next_due_date') or 'N/A'})" for s in due_suppliers])
        
        if is_hindi:
            ans = f"📋 **सप्लायरों का कुल बकाया (Supplier Khata Dues):**\n\n" \
                  f"वर्तमान में **₹{context['total_supplier_dues']:,.2f}** कुल सप्लायर बाकी है:\n\n{sup_lines}\n\n" \
                  f"💡 *सलाह: Fortune Edible Oils और Amul का भुगतान समय से करने से नकद छूट मिलती है।*"
        else:
            ans = f"📋 **Total Outstanding Supplier Balances:**\n\n" \
                  f"Total outstanding balance across suppliers is **₹{context['total_supplier_dues']:,.2f}**:\n\n{sup_lines}"

        return {
            "answer": ans,
            "referenced_receipts": [],
            "referenced_suppliers": [s["id"] for s in due_suppliers],
            "referenced_stock": []
        }

    # 3. SMART STOCK / LOW STOCK (स्टॉक की स्थिति / कौन सा सामान कम है)
    if any(k in q for k in ["stock", "saman", "khatam", "low stock", "sugar", "rice", "oil", "tea", "inventory"]):
        if low_stock:
            stock_lines = "\n".join([
                f"- **{s['name']}** ({s['hindi_name'] or ''}): केवल **{s['current_stock']} {s['unit']}** बचा है (न्यूनतम सीमा: {s['min_stock_alert']} {s['unit']})"
                for s in low_stock
            ])
            if is_hindi:
                ans = f"⚠️ **कम स्टॉक की चेतावनी (Low Stock Alert):**\n\n" \
                      f"दुकान में **{len(low_stock)} आइटम** न्यूनतम सीमा से कम बचे हैं और जल्द मंगवाने की जरूरत है:\n\n{stock_lines}\n\n" \
                      f"💡 *तुरंत सप्लायर को नया ऑर्डर भेजें ताकि ग्राहक खाली हाथ न जाएं।*"
            else:
                ans = f"⚠️ **Low Stock Alert ({len(low_stock)} Items):**\n\n" \
                      f"The following tracked items have fallen below safety reorder threshold:\n\n{stock_lines}"
            return {
                "answer": ans,
                "referenced_receipts": [],
                "referenced_suppliers": [],
                "referenced_stock": [s["id"] for s in low_stock]
            }
        else:
            return {
                "answer": "✅ सभी स्टॉक वस्तुएं पर्याप्त मात्रा में उपलब्ध हैं। किसी भी आइटम का स्टॉक न्यूनतम सीमा से नीचे नहीं है।",
                "referenced_receipts": [],
                "referenced_suppliers": [],
                "referenced_stock": []
            }

    # 4. PROFIT OVERVIEW / MUNAFA (मुनाफा / फायदा)
    if any(k in q for k in ["profit", "munafa", "fayda", "net profit", "gross profit", "kamai", "earning"]):
        tot_s = profit["total_sales"]
        stk_p = profit["stock_purchases"]
        op_ex = profit["operating_expenses"]
        net_p = profit["estimated_net_profit"]
        margin = profit["profit_margin_pct"]
        integrity = profit["data_integrity"]

        disclaimer = f"*(नोट: {integrity['disclaimer']})*"
        if is_hindi:
            ans = f"📈 **इस महीने का मुनाफा विश्लेषण (Profit Overview):**\n\n" \
                  f"- **कुल दर्ज बिक्री (Sales):** ₹{tot_s:,.2f}\n" \
                  f"- **स्टॉक खरीद (Stock Purchases):** ₹{stk_p:,.2f}\n" \
                  f"- **दुकान खर्चे (Operating Expenses):** ₹{op_ex:,.2f}\n" \
                  f"- **अनुमानित शुद्ध मुनाफा (Estimated Net Profit):** **₹{net_p:,.2f}** ({margin}% मार्जिन)\n\n" \
                  f"{disclaimer}"
        else:
            ans = f"📈 **Monthly Profit & Loss Overview:**\n\n" \
                  f"- **Recorded Total Sales:** ₹{tot_s:,.2f}\n" \
                  f"- **Stock Purchases (COGS):** ₹{stk_p:,.2f}\n" \
                  f"- **Shop Operating Expenses:** ₹{op_ex:,.2f}\n" \
                  f"- **Estimated Net Profit:** **₹{net_p:,.2f}** ({margin}% margin)\n\n" \
                  f"{disclaimer}"
        return {
            "answer": ans,
            "referenced_receipts": [r["id"] for r in confirmed[:3]],
            "referenced_suppliers": [],
            "referenced_stock": []
        }

    # 5. DUPLICATE BILLS / REVIEWS (डुप्लीकेट रसीद / पेंडिंग बिल)
    if any(k in q for k in ["duplicate", "review", "pending", "flag", "bill", "receipt"]):
        if flagged:
            flag_lines = "\n".join([f"- **[Receipt #{r['id']}]** {r['vendor']} (₹{r['total']:,.2f}) on {r['date']} - Status: `{r['status']}`" for r in flagged[:5]])
            if is_hindi:
                ans = f"🔍 **जांच योग्य रसीदें / डुप्लीकेट बिल ({len(flagged)}):**\n\n{flag_lines}\n\n" \
                      f"कृपया रसीद लेजर में जाकर पुष्टि (Confirm) या हटाएं।"
            else:
                ans = f"🔍 **Flagged / Duplicate Receipts ({len(flagged)}):**\n\n{flag_lines}\n\n" \
                      f"Please review or confirm them in the Receipts Ledger."
            return {
                "answer": ans,
                "referenced_receipts": [r["id"] for r in flagged[:5]],
                "referenced_suppliers": [],
                "referenced_stock": []
            }

    # Default overview
    top_3_sup = suppliers[:3]
    top_sup_str = ", ".join([f"{s['name']} (₹{s['balance_due']:,.2f})" for s in top_3_sup if s["balance_due"] > 0]) or "कोई बकाया नहीं"

    if is_hindi:
        ans = f"नमस्ते! मैं आपका **ShopLedger दुकान सहायक** हूँ।\n\n" \
              f"- **आज की बिक्री (Today's Sales):** ₹{hisab['sales']['total']:,.2f}\n" \
              f"- **गल्ले में नकद (Cash in Hand):** ₹{hisab['summary']['estimated_cash_in_hand']:,.2f}\n" \
              f"- **सप्लायर बाकी (Supplier Dues):** ₹{context['total_supplier_dues']:,.2f} ({top_sup_str})\n" \
              f"- **कम स्टॉक वाले आइटम:** {len(low_stock)} आइटम\n\n" \
              f"आप बोलकर या लिखकर पूछ सकते हैं: *'आज का हिसाब'*, *'अमुल का कितना बाकी है'*, *'कौन सा स्टॉक कम है'*, या *'इस महीने का मुनाफा'*"
    else:
        ans = f"Hello! I am your **ShopLedger Business AI Assistant**.\n\n" \
              f"- **Today's Total Sales:** ₹{hisab['sales']['total']:,.2f}\n" \
              f"- **Cash in Hand:** ₹{hisab['summary']['estimated_cash_in_hand']:,.2f}\n" \
              f"- **Supplier Balances Due:** ₹{context['total_supplier_dues']:,.2f}\n" \
              f"- **Low Stock Items:** {len(low_stock)} items need reordering\n\n" \
              f"You can ask in English or Hindi: *'Show today's hisab'*, *'How much do we owe Amul?'*, or *'Which items are low in stock?'*."

    return {
        "answer": ans,
        "referenced_receipts": [r["id"] for r in confirmed[:3]],
        "referenced_suppliers": [s["id"] for s in top_3_sup],
        "referenced_stock": [s["id"] for s in low_stock[:2]]
    }

def ask_assistant(user_query, db_path=None):
    """
    Answers business questions in simple language or voice with verified DB figures.
    Uses Gemini (if configured) or factual Python calculation engine.
    """
    context = run_db_query_for_assistant(user_query, db_path)
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)

            # Build factual context prompt
            prompt = f"""
You are the ShopLedger AI Business Assistant for an Indian shopkeeper (Kirana / Retail General Store).
User Query: "{user_query}"

VERIFIED REAL DATABASE RECORDS (Currency: Indian Rupee ₹ INR):
- Today's Date: {context['daily_hisab']['date']}
- Today's Sales: Total: ₹{context['daily_hisab']['sales']['total']}, Cash: ₹{context['daily_hisab']['sales']['cash']}, UPI: ₹{context['daily_hisab']['sales']['upi']}, Udhar: ₹{context['daily_hisab']['sales']['credit']}
- Cash in Hand: ₹{context['daily_hisab']['summary']['estimated_cash_in_hand']}
- Operating Expenses: ₹{context['daily_hisab']['operating_expenses']['total']}
- Total Supplier Outstanding Dues: ₹{context['total_supplier_dues']}
- Suppliers Khata: {json.dumps([{'id': s['id'], 'name': s['name'], 'purchased': s['total_purchased'], 'paid': s['total_paid'], 'balance_due': s['balance_due'], 'due_date': s.get('next_due_date')} for s in context['suppliers'][:6]])}
- Low Stock Items: {json.dumps([{'id': i['id'], 'name': i['name'], 'current_stock': i['current_stock'], 'min': i['min_stock_alert'], 'unit': i['unit']} for i in context['low_stock_items']])}
- Monthly Profit: Sales: ₹{context['profit_data']['total_sales']}, Purchases: ₹{context['profit_data']['stock_purchases']}, OpEx: ₹{context['profit_data']['operating_expenses']}, Net: ₹{context['profit_data']['estimated_net_profit']}
- Flagged Receipts: {json.dumps([{'id': r['id'], 'vendor': r['vendor'], 'total': r['total'], 'status': r['status']} for r in context['flagged_records'][:4]])}

CRITICAL RULES:
1. Answer in the same language as user: If Hindi/Hinglish, reply in warm, respectful, clear Hindi/Hinglish (e.g. "नमस्ते", "हिसाब", "रुपया"). If English, reply in English.
2. Use ONLY the verified numbers above. Do not invent numbers.
3. ALWAYS cite evidence when discussing receipts: '[Receipt #ID]', suppliers: '[Supplier #ID: Name]', or stock: '[Stock #ID: Name]'.
4. Keep the tone helpful, concise, and easy to read for busy shopkeepers with bullet points and bold numbers.
"""
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )

            if response and response.text:
                text = response.text.strip()
                receipt_ids = [int(m) for m in re.findall(r'\[Receipt #(\d+)\]', text)]
                return {
                    "answer": text,
                    "referenced_receipts": list(set(receipt_ids)),
                    "referenced_suppliers": [],
                    "referenced_stock": [],
                    "engine": "gemini-2.5-flash"
                }
        except Exception as e:
            print(f"Gemini assistant error: {e}")

    # Fallback to deterministic financial engine
    result = synthesize_fallback_response(user_query, context)
    result["engine"] = "shopledger-python-analytics"
    return result
