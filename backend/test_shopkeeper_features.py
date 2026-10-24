import os
import json
import pytest
from app import app
from seed_indian_data import seed_indian_shopkeeper_data

@pytest.fixture(scope="module")
def client():
    app.config["TESTING"] = True
    seed_indian_shopkeeper_data()
    with app.test_client() as client:
        yield client

# 1. DAILY HISAB TESTS
def test_daily_hisab_summary(client):
    response = client.get("/api/hisab/daily")
    assert response.status_code == 200
    data = response.get_json()
    assert "sales" in data
    assert "operating_expenses" in data
    assert "summary" in data
    assert data["sales"]["total"] > 0
    assert data["sales"]["cash"] >= 0
    assert data["sales"]["upi"] >= 0
    assert "estimated_cash_in_hand" in data["summary"]

def test_record_sale_and_hisab_update(client):
    # Record new UPI sale
    new_sale = {
        "amount": 550.0,
        "payment_mode": "upi",
        "customer_name": "Test Customer",
        "notes": "Basmati rice loose 5kg"
    }
    create_res = client.post("/api/hisab/sales", json=new_sale)
    assert create_res.status_code == 201
    sale_data = create_res.get_json()
    assert sale_data["sale"]["amount"] == 550.0
    sale_id = sale_data["sale"]["id"]

    # Verify hisab reflects it
    hisab_res = client.get("/api/hisab/daily")
    assert hisab_res.status_code == 200
    hisab_data = hisab_res.get_json()
    assert hisab_data["sales"]["total"] >= 550.0

    # Delete test sale
    del_res = client.delete(f"/api/hisab/sales/{sale_id}")
    assert del_res.status_code == 200

# 2. SUPPLIER KHATA TESTS
def test_supplier_khata_balances(client):
    response = client.get("/api/suppliers")
    assert response.status_code == 200
    data = response.get_json()
    assert "suppliers" in data
    assert len(data["suppliers"]) >= 5

    # Check Amul supplier balance calculation
    amul = next((s for s in data["suppliers"] if "Amul" in s["name"]), None)
    assert amul is not None
    assert amul["total_purchased"] > 0
    assert amul["total_paid"] > 0
    assert amul["balance_due"] == round(amul["total_purchased"] - amul["total_paid"], 2)

def test_record_supplier_payment(client):
    response = client.get("/api/suppliers")
    suppliers = response.get_json()["suppliers"]
    amul = next(s for s in suppliers if "Amul" in s["name"])
    initial_balance = amul["balance_due"]

    # Record partial payment of ₹2,000
    payment_payload = {
        "type": "payment",
        "amount": 2000.0,
        "payment_mode": "upi",
        "notes": "Partial weekly settlement"
    }
    tx_res = client.post(f"/api/suppliers/{amul['id']}/transactions", json=payment_payload)
    assert tx_res.status_code == 201
    updated_supplier = tx_res.get_json()["supplier"]
    assert round(updated_supplier["balance_due"], 2) == round(initial_balance - 2000.0, 2)

# 3. SMART STOCK TESTS
def test_inventory_list_and_low_stock(client):
    response = client.get("/api/inventory")
    assert response.status_code == 200
    data = response.get_json()
    assert "inventory" in data
    assert len(data["inventory"]) >= 8
    assert data["low_stock_count"] > 0

    # Check low stock alerts endpoint
    alerts_res = client.get("/api/inventory/alerts")
    assert alerts_res.status_code == 200
    alerts_data = alerts_res.get_json()
    assert alerts_data["count"] > 0
    for itm in alerts_data["low_stock_alerts"]:
        assert itm["current_stock"] <= itm["min_stock_alert"]

def test_confirm_stock_from_receipt(client):
    # Fetch an inventory item
    inv_res = client.get("/api/inventory")
    items = inv_res.get_json()["inventory"]
    sugar = next(i for i in items if "Sugar" in i["name"])
    initial_stock = sugar["current_stock"]

    # Confirm adding 5 bags of sugar from Receipt #1
    payload = {
        "items": [
            {
                "item_id": sugar["id"],
                "name": sugar["name"],
                "quantity": 5.0,
                "unit_price": 1950.0
            }
        ]
    }
    confirm_res = client.post("/api/inventory/confirm-from-receipt/1", json=payload)
    assert confirm_res.status_code == 200
    res_data = confirm_res.get_json()
    assert len(res_data["added_items"]) == 1

    # Verify inventory stock was increased
    updated_res = client.get(f"/api/inventory/{sugar['id']}")
    assert updated_res.status_code == 200
    assert updated_res.get_json()["current_stock"] == initial_stock + 5.0

# 4. PROFIT OVERVIEW TESTS
def test_profit_overview_and_integrity(client):
    response = client.get("/api/profit-overview?period=month")
    assert response.status_code == 200
    data = response.get_json()
    assert "total_sales" in data
    assert "stock_purchases" in data
    assert "operating_expenses" in data
    assert "estimated_net_profit" in data
    assert "data_integrity" in data
    assert "disclaimer" in data["data_integrity"]
    # Check formula: Net profit = Sales - Purchases - OpEx
    expected_net = round(data["total_sales"] - data["stock_purchases"] - data["operating_expenses"], 2)
    assert data["estimated_net_profit"] == expected_net

# 5. SMART ACTIONS TESTS
def test_smart_actions(client):
    response = client.get("/api/smart-actions")
    assert response.status_code == 200
    data = response.get_json()
    assert "actions" in data
    assert data["count"] > 0
    types = [a["type"] for a in data["actions"]]
    assert "supplier_due" in types
    assert "low_stock" in types

# 6. HINDI / HINGLISH AI ASSISTANT TESTS
def test_assistant_hindi_hisab_query(client):
    res = client.post("/api/assistant/chat", json={"query": "aaj ka hisab kya hai?"})
    assert res.status_code == 200
    data = res.get_json()
    assert "answer" in data
    assert "₹" in data["answer"]
    assert any(w in data["answer"] for w in ["बिक्री", "हिसाब", "Sales", "Cash"])

def test_assistant_supplier_query(client):
    res = client.post("/api/assistant/chat", json={"query": "Amul distributor ko kitna rupiya dena baqi hai?"})
    assert res.status_code == 200
    data = res.get_json()
    assert "answer" in data
    assert "Amul" in data["answer"]
    assert "₹" in data["answer"]

def test_assistant_stock_query(client):
    res = client.post("/api/assistant/chat", json={"query": "kaun sa stock khatam hone wala hai?"})
    assert res.status_code == 200
    data = res.get_json()
    assert "answer" in data
    assert any(w in data["answer"] for w in ["स्टॉक", "Stock", "चीनी", "Sugar", "तेल", "Oil"])

# 7. CUSTOMER KHATA (ग्राहक बहीखाता) & VOICE TESTS
def test_customer_khata_list_and_balances(client):
    res = client.get("/api/customers")
    assert res.status_code == 200
    data = res.get_json()
    assert "customers" in data
    assert "total_receivable" in data
    assert data["total_receivable"] > 0
    assert len(data["customers"]) >= 5

    # Check search functionality
    search_res = client.get("/api/customers?search=Ramesh")
    assert search_res.status_code == 200
    s_data = search_res.get_json()
    assert len(s_data["customers"]) >= 1
    assert "Ramesh" in s_data["customers"][0]["name"]

def test_customer_transaction_given_and_received(client):
    # 1. Add new customer
    add_res = client.post("/api/customers", json={
        "name": "Kailash General Store Neighbor",
        "phone": "+91 91234 56789",
        "opening_balance": 500.0,
        "opening_type": "given"
    })
    assert add_res.status_code == 201
    cid = add_res.get_json()["customer"]["id"]

    # 2. You gave (सामान दिया / Udhar) ₹300
    tx1 = client.post(f"/api/customers/{cid}/transactions", json={
        "amount": 300.0,
        "type": "given",
        "notes": "10kg Atta"
    })
    assert tx1.status_code == 201
    c_after_give = tx1.get_json()["customer"]
    assert c_after_give["balance_due"] == 800.0 # 500 + 300

    # 3. You received (रुपया मिला / Payment) ₹400
    tx2 = client.post(f"/api/customers/{cid}/transactions", json={
        "amount": 400.0,
        "type": "received",
        "payment_mode": "cash",
        "notes": "Partial payment"
    })
    assert tx2.status_code == 201
    c_after_recv = tx2.get_json()["customer"]
    assert c_after_recv["balance_due"] == 400.0 # 800 - 400

    # Cleanup
    del_res = client.delete(f"/api/customers/{cid}")
    assert del_res.status_code == 200

def test_voice_khata_speech_parsing(client):
    # 1. Received test
    res1 = client.post("/api/voice/parse-khata", json={
        "speech_text": "Received 500 rupees from Ramesh"
    })
    assert res1.status_code == 200
    d1 = res1.get_json()
    assert d1["success"] is True
    assert d1["amount"] == 500.0
    assert d1["type"] == "received"

    # 2. Hindi Given test
    res2 = client.post("/api/voice/parse-khata", json={
        "speech_text": "रमेश को 350 रुपये का सामान उधार दिया"
    })
    assert res2.status_code == 200
    d2 = res2.get_json()
    assert d2["success"] is True
    assert d2["amount"] == 350.0
    assert d2["type"] == "given"

