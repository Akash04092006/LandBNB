"""LandBNB - REST API Integration and Unit Testing Suite

Comprehensive automated test suite verifying all LandBNB backend endpoints,
query parameter filtering, single resource retrieval, data enrichment,
wishlist toggling, booking creation, arithmetic accuracy, and storage persistence.
Compatible with pytest and direct python invocation.
"""

import json
import shutil
import sys
from datetime import date, timedelta
from pathlib import Path
import pytest

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app import app, STANDARD_CLEANING_FEE, STANDARD_SERVICE_FEE_RATE

REAL_DATA_DIR = BASE_DIR / "data"


# ==============================================================================
# Isolated Test Fixtures
# ==============================================================================

@pytest.fixture(autouse=True)
def isolate_test_data(tmp_path):
    """Provide isolated sandbox copy of all datasets for every test.

    Ensures tests can mutate data (bookings, wishlists) without modifying
    the master mock datasets in /data.
    """
    original_data_dir = app.config.get("DATA_DIR")
    sandbox_dir = tmp_path / "data"
    sandbox_dir.mkdir(parents=True, exist_ok=True)

    # Copy master files to sandbox
    for filename in ["listings.json", "users.json", "bookings.json", "reviews.json"]:
        src = REAL_DATA_DIR / filename
        if src.exists():
            shutil.copy2(src, sandbox_dir / filename)

    app.config["DATA_DIR"] = sandbox_dir
    app.config["TESTING"] = True

    yield sandbox_dir

    # Teardown: Restore original data dir
    app.config["DATA_DIR"] = original_data_dir
    app.config["TESTING"] = False


@pytest.fixture
def client(isolate_test_data):
    """Flask test client instance configured with sandboxed test storage."""
    with app.test_client() as test_client:
        yield test_client


# ==============================================================================
# 1. Health Check Endpoint Tests
# ==============================================================================

def test_health_check_endpoint(client):
    """Test GET /api/health returns 200, healthy status, timestamp, and counts."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["status"] == "healthy"
    assert data["service"] == "LandBNB Core API"
    assert "timestamp" in data
    assert isinstance(data["counts"], dict)
    assert data["counts"]["listings"] >= 15
    assert data["counts"]["users"] >= 5
    assert data["counts"]["bookings"] >= 5
    assert data["counts"]["reviews"] >= 10


# ==============================================================================
# 2. Listings Endpoint Tests (Query Filtering & Edge Cases)
# ==============================================================================

def test_get_all_listings_no_params(client):
    """Test GET /api/listings without parameters returns all listings."""
    response = client.get("/api/listings")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["total_count"] >= 15
    assert len(data["listings"]) == data["total_count"]


def test_get_listings_filter_location(client):
    """Test GET /api/listings?location=Malibu matches location or title case-insensitively."""
    response = client.get("/api/listings?location=malibu")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["total_count"] > 0
    for item in data["listings"]:
        matches_loc = "malibu" in item["location"].lower()
        matches_title = "malibu" in item["title"].lower()
        assert matches_loc or matches_title, f"Listing {item['id']} did not match 'malibu'"


def test_get_listings_filter_category(client):
    """Test GET /api/listings?category=Cabins matches exact category."""
    response = client.get("/api/listings?category=Cabins")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["total_count"] > 0
    for item in data["listings"]:
        assert item["category"].lower() == "cabins"


def test_get_listings_filter_price_range(client):
    """Test GET /api/listings with min_price and max_price bounds."""
    min_p, max_p = 400, 800
    response = client.get(f"/api/listings?min_price={min_p}&max_price={max_p}")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["total_count"] > 0
    for item in data["listings"]:
        assert min_p <= item["price_per_night"] <= max_p


def test_get_listings_filter_amenities(client):
    """Test GET /api/listings?amenities=Wifi,Pool ensures all required amenities exist."""
    response = client.get("/api/listings?amenities=Wifi,Pool")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    assert data["total_count"] > 0
    for item in data["listings"]:
        item_amenities_lower = [a.lower() for a in item["amenities"]]
        assert "wifi" in item_amenities_lower
        assert "pool" in item_amenities_lower


def test_get_listings_invalid_price_params(client):
    """Test validation errors for invalid price parameters."""
    # Non-numeric min_price
    res1 = client.get("/api/listings?min_price=invalid")
    assert res1.status_code == 400
    assert res1.get_json()["success"] is False

    # Negative max_price
    res2 = client.get("/api/listings?max_price=-50")
    assert res2.status_code == 400
    assert res2.get_json()["success"] is False

    # min_price greater than max_price
    res3 = client.get("/api/listings?min_price=900&max_price=300")
    assert res3.status_code == 400
    assert "cannot be greater than" in res3.get_json()["message"]


# ==============================================================================
# 3. Single Listing Detail & Enrichment Tests
# ==============================================================================

def test_get_single_listing_valid(client):
    """Test GET /api/listings/<id> returns enriched reviews and host data."""
    response = client.get("/api/listings/listing-001")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    listing = data["listing"]
    assert listing["id"] == "listing-001"
    assert "reviews" in listing
    assert isinstance(listing["reviews"], list)
    assert len(listing["reviews"]) >= 1

    # Check reviews link to this listing
    for r in listing["reviews"]:
        assert r["listing_id"] == "listing-001"

    # Check host profile enriched
    assert "host" in listing
    assert listing["host"]["name"] == listing["host_name"]


def test_get_single_listing_invalid(client):
    """Test GET /api/listings/<id> with non-existent ID returns structured 404."""
    response = client.get("/api/listings/listing-non-existent-999")
    assert response.status_code == 404
    data = response.get_json()
    assert data["success"] is False
    assert data["error_code"] == 404
    assert "not found" in data["message"].lower()


def test_listing_detail_page_view_valid(client):
    """Test GET /listings/<id> renders full HTML page with mosaic gallery and listing data."""
    response = client.get("/listings/listing-001")
    assert response.status_code == 200
    assert b"Luxury Beachfront Villa with Infinity Pool" in response.data
    assert b"mosaicImg0" in response.data
    assert b"btnOpenLightbox" in response.data
    assert b"btnSubmitReservation" in response.data


def test_listing_detail_page_view_invalid(client):
    """Test GET /listings/<id> returns 404 for unknown listing."""
    response = client.get("/listings/listing-non-existent-999")
    assert response.status_code == 404


# ==============================================================================
# 4. User Profile & Wishlist Toggle Tests
# ==============================================================================

def test_get_user_profile_valid(client):
    """Test GET /api/users/<user_id> returns user with populated wishlist objects."""
    response = client.get("/api/users/user-001")
    assert response.status_code == 200
    data = response.get_json()

    assert data["success"] is True
    user = data["user"]
    assert user["user_id"] == "user-001"
    assert "saved_listings" in user
    assert isinstance(user["saved_listings"], list)

    # Every item in saved_listings must be a full listing object matching an ID in wishlist
    for sl in user["saved_listings"]:
        assert sl["id"] in user["wishlist"]
        assert "title" in sl
        assert "price_per_night" in sl


def test_get_user_profile_not_found(client):
    """Test GET /api/users/<user_id> with unknown ID returns structured 404."""
    response = client.get("/api/users/user-unknown-999")
    assert response.status_code == 404
    data = response.get_json()

    assert data["success"] is False
    assert data["error_code"] == 404


def test_wishlist_toggle_add_and_remove(client, isolate_test_data):
    """Test POST /api/wishlist toggles listing in and out of user's wishlist and persists to storage."""
    user_id = "user-004"
    # listing-001 is initially NOT in user-004's wishlist
    target_listing_id = "listing-001"

    # Step 1: Add to wishlist (Toggle ON)
    payload_add = {"user_id": user_id, "listing_id": target_listing_id}
    res_add = client.post("/api/wishlist", json=payload_add)
    assert res_add.status_code == 200
    data_add = res_add.get_json()

    assert data_add["success"] is True
    assert data_add["action"] == "added"
    assert target_listing_id in data_add["wishlist"]

    # Verify file persistence in sandbox users.json
    users_file = isolate_test_data / "users.json"
    with open(users_file, "r", encoding="utf-8") as f:
        persisted_users = json.load(f)
    u_persisted = next(u for u in persisted_users if u["user_id"] == user_id)
    assert target_listing_id in u_persisted["wishlist"]

    # Step 2: Remove from wishlist (Toggle OFF)
    res_remove = client.post("/api/wishlist", json=payload_add)
    assert res_remove.status_code == 200
    data_remove = res_remove.get_json()

    assert data_remove["success"] is True
    assert data_remove["action"] == "removed"
    assert target_listing_id not in data_remove["wishlist"]

    # Verify file persistence after removal
    with open(users_file, "r", encoding="utf-8") as f:
        persisted_users_after = json.load(f)
    u_after = next(u for u in persisted_users_after if u["user_id"] == user_id)
    assert target_listing_id not in u_after["wishlist"]


def test_wishlist_toggle_validation_errors(client):
    """Test validation errors for wishlist endpoint."""
    # Missing payload
    res1 = client.post("/api/wishlist", data="not json", content_type="text/plain")
    assert res1.status_code == 400

    # Missing listing_id
    res2 = client.post("/api/wishlist", json={"user_id": "user-001"})
    assert res2.status_code == 400

    # Non-existent user
    res3 = client.post("/api/wishlist", json={"user_id": "user-fake", "listing_id": "listing-001"})
    assert res3.status_code == 404

    # Non-existent listing
    res4 = client.post("/api/wishlist", json={"user_id": "user-001", "listing_id": "listing-fake"})
    assert res4.status_code == 404


# ==============================================================================
# 5. Reservation / Booking Creation Tests
# ==============================================================================

def test_create_booking_success_and_arithmetic(client, isolate_test_data):
    """Test POST /api/bookings successfully creates reservation with correct cost arithmetic and file persistence."""
    listing_id = "listing-001"  # Price per night: 950
    user_id = "user-001"
    check_in = "2026-12-01"
    check_out = "2026-12-05"  # 4 nights

    payload = {
        "listing_id": listing_id,
        "user_id": user_id,
        "check_in": check_in,
        "check_out": check_out
    }

    response = client.post("/api/bookings", json=payload)
    assert response.status_code == 201
    data = response.get_json()

    assert data["success"] is True
    assert "booking" in data
    booking = data["booking"]

    # Verify attributes
    assert booking["listing_id"] == listing_id
    assert booking["user_id"] == user_id
    assert booking["check_in"] == check_in
    assert booking["check_out"] == check_out
    assert booking["nights"] == 4
    assert booking["price_per_night"] == 950.0

    # Arithmetic verification
    expected_accommodation = 4 * 950.0  # 3800.0
    expected_cleaning = STANDARD_CLEANING_FEE  # 75.0
    expected_service = round(expected_accommodation * STANDARD_SERVICE_FEE_RATE, 2)  # 456.0
    expected_total = round(expected_accommodation + expected_cleaning + expected_service, 2)  # 4331.0

    assert booking["accommodation_cost"] == expected_accommodation
    assert booking["cleaning_fee"] == expected_cleaning
    assert booking["service_fee"] == expected_service
    assert booking["total_price"] == expected_total

    # Verify persistence into bookings.json
    bookings_file = isolate_test_data / "bookings.json"
    with open(bookings_file, "r", encoding="utf-8") as f:
        persisted_bookings = json.load(f)

    created_in_file = next((b for b in persisted_bookings if b["booking_id"] == booking["booking_id"]), None)
    assert created_in_file is not None
    assert created_in_file["total_price"] == expected_total


def test_create_booking_validation_errors(client):
    """Test booking endpoint input validations."""
    # Missing field
    res1 = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "2026-12-01"
        # missing check_out
    })
    assert res1.status_code == 400
    assert "check_out" in res1.get_json()["message"]

    # Invalid date format
    res2 = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "12-01-2026",
        "check_out": "2026-12-05"
    })
    assert res2.status_code == 400
    assert "Invalid 'check_in' date format" in res2.get_json()["message"]

    # Check out before check in
    res3 = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "2026-12-05",
        "check_out": "2026-12-01"
    })
    assert res3.status_code == 400
    assert "must chronologically follow" in res3.get_json()["message"]

    # Same day check in / check out
    res4 = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "2026-12-05",
        "check_out": "2026-12-05"
    })
    assert res4.status_code == 400

    # Non-existent listing
    res5 = client.post("/api/bookings", json={
        "listing_id": "listing-999-fake",
        "user_id": "user-001",
        "check_in": "2026-12-01",
        "check_out": "2026-12-05"
    })
    assert res5.status_code == 404

    # Non-existent user
    res6 = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-999-fake",
        "check_in": "2026-12-01",
        "check_out": "2026-12-05"
    })
    assert res6.status_code == 404


def test_cancel_booking_success(client, isolate_test_data):
    """Test DELETE /api/bookings/<id> successfully cancels reservation and updates storage."""
    target_id = "booking-001"
    response = client.delete(f"/api/bookings/{target_id}")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "successfully cancelled" in data["message"].lower()

    # Verify storage persistence in sandbox bookings.json
    bookings_file = isolate_test_data / "bookings.json"
    with open(bookings_file, "r", encoding="utf-8") as f:
        persisted = json.load(f)
    remaining_ids = [b["booking_id"] for b in persisted]
    assert target_id not in remaining_ids


def test_cancel_booking_not_found(client):
    """Test DELETE /api/bookings/<id> with non-existent ID returns 404."""
    response = client.delete("/api/bookings/booking-non-existent-999")
    assert response.status_code == 404
    data = response.get_json()
    assert data["success"] is False
    assert data["error_code"] == 404


def test_get_user_bookings(client):
    """Test GET /api/users/<id>/bookings retrieves user's reservations."""
    response = client.get("/api/users/user-001/bookings")
    assert response.status_code == 200
    data = response.get_json()
    assert data["success"] is True
    assert "bookings" in data
    assert isinstance(data["bookings"], list)


def test_checkout_page_view(client):
    """Test GET /checkout renders payment summary view."""
    response = client.get("/checkout?listing_id=listing-001&check_in=2026-11-01&check_out=2026-11-05&guests=2")
    assert response.status_code == 200
    assert b"Confirm and pay" in response.data
    assert b"Price details" in response.data
    assert b"inputCardNumber" in response.data


def test_profile_page_view(client):
    """Test GET /profile renders user dashboard with trips and wishlists."""
    response = client.get("/profile/user-001")
    assert response.status_code == 200
    assert b"Sophia Chen" in response.data
    assert b"My Trips" in response.data
    assert b"Saved Wishlists" in response.data



# ==============================================================================
# 6. Global Error Framework Tests
# ==============================================================================

def test_global_404_error_handling(client):
    """Test requesting non-existent endpoint triggers uniform 404 JSON response."""
    response = client.get("/api/unknown_endpoint_xyz")
    assert response.status_code == 404
    data = response.get_json()
    assert data["success"] is False
    assert data["error_code"] == 404
    assert "message" in data


def test_global_405_error_handling(client):
    """Test wrong HTTP method triggers uniform 405 JSON response."""
    response = client.delete("/api/health")
    assert response.status_code == 405
    data = response.get_json()
    assert data["success"] is False
    assert data["error_code"] == 405
    assert data["message"] == "Method Not Allowed"


# ==============================================================================
# Standalone CLI Test Runner
# ==============================================================================

if __name__ == "__main__":
    import tempfile

    print("=" * 65)
    print(" LANDBNB PLATFORM - REST API TEST SUITE (DIRECT EXECUTION)")
    print("=" * 65)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_p = Path(tmp_dir)
        sandbox = tmp_p / "data"
        sandbox.mkdir(parents=True, exist_ok=True)
        for fn in ["listings.json", "users.json", "bookings.json", "reviews.json"]:
            shutil.copy2(REAL_DATA_DIR / fn, sandbox / fn)

        app.config["DATA_DIR"] = sandbox
        app.config["TESTING"] = True

        with app.test_client() as tc:
            test_health_check_endpoint(tc)
            print("[OK] Health check endpoint passed.")

            test_get_all_listings_no_params(tc)
            test_get_listings_filter_location(tc)
            test_get_listings_filter_category(tc)
            test_get_listings_filter_price_range(tc)
            test_get_listings_filter_amenities(tc)
            test_get_listings_invalid_price_params(tc)
            print("[OK] Listings querying & filtering suite passed.")

            test_get_single_listing_valid(tc)
            test_get_single_listing_invalid(tc)
            test_listing_detail_page_view_valid(tc)
            test_listing_detail_page_view_invalid(tc)
            print("[OK] Single listing detail & enrichment suite passed.")

            test_get_user_profile_valid(tc)
            test_get_user_profile_not_found(tc)
            test_wishlist_toggle_add_and_remove(tc, sandbox)
            test_wishlist_toggle_validation_errors(tc)
            print("[OK] User profile & wishlist toggling suite passed.")

            test_create_booking_success_and_arithmetic(tc, sandbox)
            test_create_booking_validation_errors(tc)
            test_cancel_booking_success(tc, sandbox)
            test_cancel_booking_not_found(tc)
            test_get_user_bookings(tc)
            test_checkout_page_view(tc)
            test_profile_page_view(tc)
            print("[OK] Booking creation, cancellation, and checkout/profile suite passed.")

            test_global_404_error_handling(tc)
            test_global_405_error_handling(tc)
            print("[OK] Global error handlers suite passed.")

    print("=" * 65)
    print(" ALL API TESTS PASSED SUCCESSFULLY!")
    print("=" * 65)
