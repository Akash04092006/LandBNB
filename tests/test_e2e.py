"""LandBNB - End-to-End Automated Integration Testing Suite

Comprehensive single-session user journey and cross-module integration tests
verifying routes, data enrichment, price arithmetic, referential persistence integrity,
and error handling across LandBNB.
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


def read_sandbox_json(sandbox_dir: Path, filename: str):
    """Helper to read and parse a JSON dataset directly from the sandbox directory."""
    file_path = sandbox_dir / filename
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ==============================================================================
# 1. Complete End-to-End User Journey Test Session
# ==============================================================================

def test_complete_user_journey_e2e(client, isolate_test_data):
    """Simulates a complete real-world user journey in a single test session:

    1. Query and filter listings by category and location.
    2. Fetch a specific listing detail page and verify enriched host and review data.
    3. Toggle a listing into the user's wishlist and verify persistence in users.json.
    4. Submit a reservation checkout payload (POST /api/bookings), verifying stay calculations and receipt generation.
    5. Retrieve the user's profile trips view and execute an asynchronous cancellation (DELETE /api/bookings/<id>).
    """

    # --------------------------------------------------------------------------
    # Step 1: Query and filter listings by category and location
    # --------------------------------------------------------------------------
    # 1a. User loads the Home page
    home_resp = client.get("/")
    assert home_resp.status_code == 200
    assert b"LandBNB" in home_resp.data
    assert b"Stays available" in home_resp.data

    # 1b. User queries all listings via REST API
    all_listings_resp = client.get("/api/listings")
    assert all_listings_resp.status_code == 200
    all_data = all_listings_resp.get_json()
    assert all_data["success"] is True
    assert all_data["total_count"] >= 15
    assert len(all_data["listings"]) == all_data["total_count"]

    # 1c. User filters by Category "Beachfront"
    cat_resp = client.get("/api/listings?category=Beachfront")
    assert cat_resp.status_code == 200
    cat_data = cat_resp.get_json()
    assert cat_data["success"] is True
    assert cat_data["total_count"] > 0
    for l in cat_data["listings"]:
        assert l["category"].lower() == "beachfront"

    # 1d. User filters by Location "Malibu"
    loc_resp = client.get("/api/listings?location=Malibu")
    assert loc_resp.status_code == 200
    loc_data = loc_resp.get_json()
    assert loc_data["success"] is True
    assert loc_data["total_count"] > 0
    for l in loc_data["listings"]:
        assert "malibu" in l["location"].lower() or "malibu" in l["title"].lower()

    # 1e. Combined filter: category=Beachfront & location=Malibu
    combined_resp = client.get("/api/listings?category=Beachfront&location=Malibu")
    assert combined_resp.status_code == 200
    combined_data = combined_resp.get_json()
    assert combined_data["success"] is True
    assert combined_data["total_count"] > 0
    target_listing_id = combined_data["listings"][0]["id"]
    assert target_listing_id == "listing-001"

    # --------------------------------------------------------------------------
    # Step 2: Fetch specific listing detail page and verify enriched data
    # --------------------------------------------------------------------------
    # 2a. User navigates to full listing detail presentation view
    detail_page_resp = client.get(f"/listings/{target_listing_id}")
    assert detail_page_resp.status_code == 200
    assert b"Luxury Beachfront Villa with Infinity Pool" in detail_page_resp.data
    assert b"Malibu, California" in detail_page_resp.data

    # 2b. User's client fetches enriched listing payload from REST API
    detail_api_resp = client.get(f"/api/listings/{target_listing_id}")
    assert detail_api_resp.status_code == 200
    detail_data = detail_api_resp.get_json()
    assert detail_data["success"] is True
    listing_obj = detail_data["listing"]

    # Verify basic listing attributes
    assert listing_obj["id"] == target_listing_id
    assert listing_obj["price_per_night"] == 950.0
    assert len(listing_obj["images"]) >= 5

    # Verify enriched host metadata
    assert "host" in listing_obj
    host_profile = listing_obj["host"]
    assert host_profile["name"] == "Elena Rostova"
    assert host_profile["user_id"] == "user-003"
    assert host_profile["email"] == "elena.rostova@example.com"
    assert "profile_image" in host_profile and host_profile["profile_image"]

    # Verify matched review data
    assert "reviews" in listing_obj
    assert isinstance(listing_obj["reviews"], list)
    assert len(listing_obj["reviews"]) >= 1
    assert listing_obj["reviews_count"] == len(listing_obj["reviews"])
    for review in listing_obj["reviews"]:
        assert review["listing_id"] == target_listing_id
        assert "rating" in review and review["rating"] >= 1.0
        assert "comment" in review and len(review["comment"]) > 0
        assert "user_name" in review and len(review["user_name"]) > 0

    # --------------------------------------------------------------------------
    # Step 3: Toggle a listing into the user's wishlist and verify persistence
    # --------------------------------------------------------------------------
    test_user_id = "user-001"
    # Choose a listing not currently in user-001's wishlist (listing-002 is not)
    wishlist_target_listing = "listing-002"

    # Verify initial wishlist state via API
    user_initial_resp = client.get(f"/api/users/{test_user_id}")
    assert user_initial_resp.status_code == 200
    initial_user = user_initial_resp.get_json()["user"]
    initial_wishlist = [str(x) for x in initial_user["wishlist"]]
    assert wishlist_target_listing not in initial_wishlist

    # Execute wishlist toggle (ADD)
    toggle_add_resp = client.post("/api/wishlist", json={
        "user_id": test_user_id,
        "listing_id": wishlist_target_listing
    })
    assert toggle_add_resp.status_code == 200
    toggle_data = toggle_add_resp.get_json()
    assert toggle_data["success"] is True
    assert toggle_data["action"] == "added"
    assert wishlist_target_listing in toggle_data["wishlist"]

    # Verify persistence directly in users.json on disk
    users_on_disk = read_sandbox_json(isolate_test_data, "users.json")
    disk_user = next(u for u in users_on_disk if u["user_id"] == test_user_id)
    assert wishlist_target_listing in disk_user["wishlist"]

    # Verify populated saved_listings in GET /api/users/<user_id>
    user_updated_resp = client.get(f"/api/users/{test_user_id}")
    assert user_updated_resp.status_code == 200
    updated_user = user_updated_resp.get_json()["user"]
    saved_ids = [str(s["id"]) for s in updated_user["saved_listings"]]
    assert wishlist_target_listing in saved_ids

    # --------------------------------------------------------------------------
    # Step 4: Submit reservation checkout payload & verify arithmetic and receipt
    # --------------------------------------------------------------------------
    # 4a. User navigates to checkout presentation page
    check_in_date = "2026-11-20"
    check_out_date = "2026-11-25"  # 5 nights
    guests_count = 2

    checkout_view_resp = client.get(
        f"/checkout?listing_id={target_listing_id}&check_in={check_in_date}&check_out={check_out_date}&guests={guests_count}"
    )
    assert checkout_view_resp.status_code == 200
    assert b"Confirm and pay" in checkout_view_resp.data

    # 4b. User submits payment authorization reservation payload (POST /api/bookings)
    booking_payload = {
        "listing_id": target_listing_id,
        "user_id": test_user_id,
        "check_in": check_in_date,
        "check_out": check_out_date,
        "guests": guests_count
    }
    booking_resp = client.post("/api/bookings", json=booking_payload)
    assert booking_resp.status_code == 201
    booking_result = booking_resp.get_json()
    assert booking_result["success"] is True
    new_booking = booking_result["booking"]

    # Verify booking receipt structure
    created_booking_id = new_booking["booking_id"]
    assert created_booking_id.startswith("booking-")
    assert new_booking["listing_id"] == target_listing_id
    assert new_booking["user_id"] == test_user_id
    assert new_booking["check_in"] == check_in_date
    assert new_booking["check_out"] == check_out_date
    assert new_booking["guests"] == guests_count
    assert new_booking["status"] == "confirmed"

    # Verify exact arithmetic calculation breakdown
    expected_nights = 5
    expected_price_per_night = 950.0
    expected_accommodation = expected_nights * expected_price_per_night  # 4750.0
    expected_cleaning = STANDARD_CLEANING_FEE                            # 75.0
    expected_service = round(expected_accommodation * STANDARD_SERVICE_FEE_RATE, 2)  # 570.0
    expected_total = round(expected_accommodation + expected_cleaning + expected_service, 2)  # 5395.0

    assert new_booking["nights"] == expected_nights
    assert new_booking["price_per_night"] == expected_price_per_night
    assert new_booking["accommodation_cost"] == expected_accommodation
    assert new_booking["cleaning_fee"] == expected_cleaning
    assert new_booking["service_fee"] == expected_service
    assert new_booking["total_price"] == expected_total

    # Verify physical persistence in bookings.json on disk
    bookings_on_disk = read_sandbox_json(isolate_test_data, "bookings.json")
    persisted_booking = next((b for b in bookings_on_disk if b["booking_id"] == created_booking_id), None)
    assert persisted_booking is not None
    assert persisted_booking["total_price"] == expected_total
    assert persisted_booking["check_in"] == check_in_date

    # --------------------------------------------------------------------------
    # Step 5: Profile trips dashboard & asynchronous cancellation
    # --------------------------------------------------------------------------
    # 5a. User loads their Profile trips view
    profile_trips_resp = client.get(f"/profile/{test_user_id}?tab=trips")
    assert profile_trips_resp.status_code == 200
    assert b"Confirmed Reservations" in profile_trips_resp.data
    assert created_booking_id.encode("utf-8") in profile_trips_resp.data

    # 5b. User API verifies the new booking is present
    user_bookings_resp = client.get(f"/api/users/{test_user_id}/bookings")
    assert user_bookings_resp.status_code == 200
    user_bookings_data = user_bookings_resp.get_json()
    assert user_bookings_data["success"] is True
    initial_user_booking_ids = [b["booking_id"] for b in user_bookings_data["bookings"]]
    assert created_booking_id in initial_user_booking_ids

    # 5c. User cancels the reservation asynchronously (DELETE /api/bookings/<id>)
    cancel_resp = client.delete(f"/api/bookings/{created_booking_id}")
    assert cancel_resp.status_code == 200
    cancel_data = cancel_resp.get_json()
    assert cancel_data["success"] is True
    assert cancel_data["booking_id"] == created_booking_id

    # 5d. Verify physical removal from bookings.json on disk
    bookings_after_cancel = read_sandbox_json(isolate_test_data, "bookings.json")
    booking_ids_after = [b["booking_id"] for b in bookings_after_cancel]
    assert created_booking_id not in booking_ids_after

    # 5e. Verify user bookings API no longer includes the cancelled reservation
    user_bookings_after = client.get(f"/api/users/{test_user_id}/bookings").get_json()["bookings"]
    after_user_booking_ids = [b["booking_id"] for b in user_bookings_after]
    assert created_booking_id not in after_user_booking_ids

    # 5f. Verify profile trips page no longer contains the cancelled booking ID
    profile_trips_after = client.get(f"/profile/{test_user_id}?tab=trips")
    assert profile_trips_after.status_code == 200
    assert created_booking_id.encode("utf-8") not in profile_trips_after.data


# ==============================================================================
# 2. Cross-Module Routing and Parameter Binding Verification
# ==============================================================================

def test_cross_module_routing_and_views(client):
    """Test all HTML cross-module routes ensuring zero broken redirects or missing parameter bindings."""
    # 1. Home Page
    resp = client.get("/")
    assert resp.status_code == 200
    assert b"LandBNB" in resp.data

    # 2. Listing Detail Page (Valid ID)
    resp = client.get("/listings/listing-001")
    assert resp.status_code == 200
    assert b"Luxury Beachfront Villa with Infinity Pool" in resp.data
    assert b"Reserve" in resp.data

    # 3. Listing Detail Page (Invalid ID -> 404 with friendly message)
    resp = client.get("/listings/listing-unknown-999")
    assert resp.status_code == 404
    assert b"Listing listing-unknown-999 not found" in resp.data

    # 4. Checkout Page (Default parameters)
    resp = client.get("/checkout")
    assert resp.status_code == 200
    assert b"Confirm and pay" in resp.data

    # 5. Checkout Page (Explicit valid parameters)
    resp = client.get("/checkout?listing_id=listing-002&check_in=2026-12-01&check_out=2026-12-05&guests=3")
    assert resp.status_code == 200
    assert b"Confirm and pay" in resp.data
    assert b"listing-002" in resp.data

    # 6. Checkout Page (Non-existent listing -> 404)
    resp = client.get("/checkout?listing_id=nonexistent-listing-999")
    assert resp.status_code == 404

    # 7. User Profile Dashboard (Default route /profile)
    resp = client.get("/profile")
    assert resp.status_code == 200
    assert b"Sophia Chen" in resp.data

    # 8. User Profile Dashboard with active tab query parameters
    # 8a. tab=trips
    resp_trips = client.get("/profile/user-001?tab=trips")
    assert resp_trips.status_code == 200
    assert b"Confirmed Reservations" in resp_trips.data
    assert b"data-active-tab=\"trips\"" in resp_trips.data

    # 8b. tab=wishlists
    resp_wish = client.get("/profile/user-001?tab=wishlists")
    assert resp_wish.status_code == 200
    assert b"Saved Wishlists" in resp_wish.data
    assert b"data-active-tab=\"wishlists\"" in resp_wish.data

    # 8c. tab=account
    resp_acc = client.get("/profile/user-001?tab=account")
    assert resp_acc.status_code == 200
    assert b"Account Preferences" in resp_acc.data
    assert b"data-active-tab=\"account\"" in resp_acc.data

    # 9. User Profile Dashboard (Non-existent user -> 404)
    resp = client.get("/profile/nonexistent-user-999")
    assert resp.status_code == 404


# ==============================================================================
# 3. JSON Referential & Structural Integrity Across Multi-Step Actions
# ==============================================================================

def test_json_referential_integrity_across_mutations(client, isolate_test_data):
    """Verify that listings.json, users.json, bookings.json, and reviews.json
    maintain referential and structural integrity after multi-step operations.
    """
    # Action 1: Toggle wishlist for user-002
    client.post("/api/wishlist", json={"user_id": "user-002", "listing_id": "listing-001"})

    # Action 2: Create multiple bookings
    client.post("/api/bookings", json={
        "listing_id": "listing-003",
        "user_id": "user-002",
        "check_in": "2026-11-10",
        "check_out": "2026-11-12",
        "guests": 2
    })
    b_resp = client.post("/api/bookings", json={
        "listing_id": "listing-005",
        "user_id": "user-003",
        "check_in": "2026-12-01",
        "check_out": "2026-12-04",
        "guests": 1
    })
    new_b_id = b_resp.get_json()["booking"]["booking_id"]

    # Action 3: Cancel one of the newly created bookings
    client.delete(f"/api/bookings/{new_b_id}")

    # Action 4: Toggle wishlist off for user-001
    client.post("/api/wishlist", json={"user_id": "user-001", "listing_id": "listing-004"})

    # Now verify referential integrity across all files
    listings = read_sandbox_json(isolate_test_data, "listings.json")
    users = read_sandbox_json(isolate_test_data, "users.json")
    bookings = read_sandbox_json(isolate_test_data, "bookings.json")
    reviews = read_sandbox_json(isolate_test_data, "reviews.json")

    listing_ids = {str(l["id"]) for l in listings}
    user_ids = {str(u["user_id"]) for u in users}

    # 1. Users integrity: All wishlist items must point to existing listings
    for u in users:
        assert isinstance(u["wishlist"], list)
        for item_id in u["wishlist"]:
            assert str(item_id) in listing_ids, (
                f"User {u['user_id']} wishlist references non-existent listing {item_id}"
            )

    # 2. Bookings integrity: All foreign keys must be valid
    booking_keys = {"booking_id", "listing_id", "user_id", "check_in", "check_out", "total_price"}
    for b in bookings:
        missing = booking_keys - set(b.keys())
        assert not missing, f"Booking missing keys: {missing}"
        assert str(b["listing_id"]) in listing_ids, f"Booking references non-existent listing {b['listing_id']}"
        assert str(b["user_id"]) in user_ids, f"Booking references non-existent user {b['user_id']}"
        assert b["total_price"] > 0
        d_in = date.fromisoformat(b["check_in"])
        d_out = date.fromisoformat(b["check_out"])
        assert d_out > d_in, f"Invalid stay dates in booking {b['booking_id']}"

    # 3. Reviews integrity
    for r in reviews:
        assert str(r["listing_id"]) in listing_ids
        assert 1.0 <= float(r["rating"]) <= 5.0


# ==============================================================================
# 4. Pricing & Stay Calculation Edge Cases
# ==============================================================================

@pytest.mark.parametrize("nights, price_per_night", [
    (1, 100.0),    # Minimum 1 night stay
    (2, 250.0),    # Weekend getaway
    (7, 450.0),    # Weekly stay
    (14, 950.0),   # Fortnight luxury stay
    (30, 320.0),   # Monthly stay
])
def test_stay_calculation_exact_arithmetic(client, nights, price_per_night):
    """Verify exact formula: accommodation = nights * rate, cleaning = $75, service = 12%."""
    # Find or verify a listing with matching price
    start_date = date(2026, 11, 1)
    end_date = start_date + timedelta(days=nights)

    # We use listing-001 (price = 950.0) or listing-002 (price = 380.0)
    # Test through POST /api/bookings
    target_lid = "listing-002"
    actual_rate = 380.0

    resp = client.post("/api/bookings", json={
        "listing_id": target_lid,
        "user_id": "user-001",
        "check_in": start_date.isoformat(),
        "check_out": end_date.isoformat(),
        "guests": 2
    })
    assert resp.status_code == 201
    booking = resp.get_json()["booking"]

    expected_acc = round(nights * actual_rate, 2)
    expected_clean = STANDARD_CLEANING_FEE
    expected_svc = round(expected_acc * STANDARD_SERVICE_FEE_RATE, 2)
    expected_tot = round(expected_acc + expected_clean + expected_svc, 2)

    assert booking["nights"] == nights
    assert booking["accommodation_cost"] == expected_acc
    assert booking["cleaning_fee"] == expected_clean
    assert booking["service_fee"] == expected_svc
    assert booking["total_price"] == expected_tot


# ==============================================================================
# 5. Booking Validation & Error Handling
# ==============================================================================

def test_booking_validation_errors(client):
    """Verify that malformed payloads and invalid requests return proper error responses."""
    # 1. Missing required field
    resp = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "check_in": "2026-11-01",
        "check_out": "2026-11-05"
        # missing user_id
    })
    assert resp.status_code == 400
    assert resp.get_json()["success"] is False

    # 2. Inverted dates (check_out <= check_in)
    resp = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "2026-11-05",
        "check_out": "2026-11-01",
        "guests": 1
    })
    assert resp.status_code == 400
    assert resp.get_json()["success"] is False

    # 3. Same date (0 nights)
    resp = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "2026-11-05",
        "check_out": "2026-11-05",
        "guests": 1
    })
    assert resp.status_code == 400

    # 4. Malformed date format
    resp = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-001",
        "check_in": "11/05/2026",
        "check_out": "2026-11-09",
        "guests": 1
    })
    assert resp.status_code == 400

    # 5. Non-existent listing
    resp = client.post("/api/bookings", json={
        "listing_id": "listing-nonexistent-999",
        "user_id": "user-001",
        "check_in": "2026-11-05",
        "check_out": "2026-11-09",
        "guests": 1
    })
    assert resp.status_code == 404

    # 6. Non-existent user
    resp = client.post("/api/bookings", json={
        "listing_id": "listing-001",
        "user_id": "user-nonexistent-999",
        "check_in": "2026-11-05",
        "check_out": "2026-11-09",
        "guests": 1
    })
    assert resp.status_code == 404

    # 7. Cancellation of non-existent booking
    resp = client.delete("/api/bookings/booking-nonexistent-999")
    assert resp.status_code == 404
