import os
import json
import io
import pytest
from app import app
from database import init_db, get_db, insert_receipt
from seed_data import seed_database

@pytest.fixture(scope="module")
def client():
    app.config["TESTING"] = True
    # Seed database once for test run
    seed_database()
    with app.test_client() as client:
        yield client

def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "healthy"
    assert "app" in data

def test_list_receipts(client):
    response = client.get("/api/receipts")
    assert response.status_code == 200
    data = response.get_json()
    assert "receipts" in data
    assert len(data["receipts"]) >= 20

def test_receipts_filtering(client):
    # Filter by confirmed status
    response = client.get("/api/receipts?status=confirmed")
    assert response.status_code == 200
    data = response.get_json()
    for r in data["receipts"]:
        assert r["status"] == "confirmed"

    # Filter by category
    response = client.get("/api/receipts?category=Software %26 SaaS")
    assert response.status_code == 200
    data = response.get_json()
    assert len(data["receipts"]) > 0
    for r in data["receipts"]:
        assert r["category"] == "Software & SaaS"

def test_receipt_detail(client):
    # Fetch list first to get valid ID
    list_resp = client.get("/api/receipts")
    assert list_resp.status_code == 200
    receipts = list_resp.get_json()["receipts"]
    assert len(receipts) > 0
    test_id = receipts[0]["id"]

    response = client.get(f"/api/receipts/{test_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["id"] == test_id
    assert "items" in data
    assert "vendor" in data

def test_update_and_confirm_receipt(client):
    list_resp = client.get("/api/receipts")
    receipts = list_resp.get_json()["receipts"]
    test_id = receipts[1]["id"]

    # Edit receipt
    payload = {
        "vendor": "Apple Store HQ",
        "notes": "Updated by test suite",
        "status": "pending_review",
        "items": [
            {"description": "MacBook Air 13-inch M3", "quantity": 1, "unit_price": 1299.0, "total_price": 1299.0}
        ]
    }
    response = client.put(f"/api/receipts/{test_id}", json=payload)
    assert response.status_code == 200
    data = response.get_json()
    assert data["receipt"]["vendor"] == "Apple Store HQ"
    assert data["receipt"]["status"] == "pending_review"

    # Now confirm it
    confirm_resp = client.post(f"/api/receipts/{test_id}/confirm")
    assert confirm_resp.status_code == 200
    confirm_data = confirm_resp.get_json()
    assert confirm_data["receipt"]["status"] == "confirmed"
    assert len(confirm_data["receipt"]["uncertain_fields"]) == 0

def test_duplicate_detection_endpoint(client):
    # Candidate identical to known seeded receipt (Uber $38.45)
    dup_candidate = {
        "vendor": "Uber Technologies",
        "total": 38.45,
        "date": "2026-03-11",
        "invoice_number": ""
    }
    response = client.post("/api/receipts/check-duplicate", json=dup_candidate)
    assert response.status_code == 200
    data = response.get_json()
    assert data["is_duplicate"] is True
    assert len(data["matches"]) > 0
    assert data["matches"][0]["vendor"] == "Uber Technologies"

def test_analytics_summary(client):
    response = client.get("/api/analytics")
    assert response.status_code == 200
    data = response.get_json()
    assert "confirmed_total" in data
    assert data["confirmed_total"] > 0
    assert "category_breakdown" in data
    assert len(data["category_breakdown"]) > 0
    assert "monthly_trend" in data
    assert "top_vendors" in data

def test_ai_assistant_chat(client):
    # Query 1: Total spend
    resp1 = client.post("/api/assistant/chat", json={"query": "What is our total spend?"})
    assert resp1.status_code == 200
    data1 = resp1.get_json()
    assert "answer" in data1
    assert ("₹" in data1["answer"] or "$" in data1["answer"])
    assert len(data1.get("referenced_receipts", [])) > 0

    # Query 2: Category breakdown with citations
    resp2 = client.post("/api/assistant/chat", json={"query": "How much did we spend on Software & SaaS?"})
    assert resp2.status_code == 200
    data2 = resp2.get_json()
    assert ("Software & SaaS" in data2["answer"] or "₹" in data2["answer"])
    assert len(data2.get("referenced_receipts", [])) > 0

    # Query 3: Duplicates
    resp3 = client.post("/api/assistant/chat", json={"query": "Are there any duplicate receipts?"})
    assert resp3.status_code == 200
    data3 = resp3.get_json()
    assert "answer" in data3

def test_csv_export(client):
    response = client.get("/api/receipts/export/csv?status=confirmed")
    assert response.status_code == 200
    assert response.mimetype == "text/csv"
    content = response.data.decode("utf-8")
    assert "Receipt ID,Date" in content
    assert ("Total (INR)" in content or "Total (USD)" in content)
    assert any(v in content for v in ["Amul", "Amazon Web Services", "UPPCL", "Fortune", "Tata"])

def test_receipt_upload_flow(client):
    # Test uploading a simulated receipt PNG
    from PIL import Image
    img = Image.new("RGB", (400, 600), color=(255, 255, 255))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)

    data = {
        "file": (buf, "test_receipt_upload.png")
    }
    response = client.post("/api/receipts/upload", data=data, content_type="multipart/form-data")
    assert response.status_code == 201
    res_data = response.get_json()
    assert "receipt" in res_data
    assert res_data["receipt"]["id"] is not None
    assert "duplicate_detection" in res_data
