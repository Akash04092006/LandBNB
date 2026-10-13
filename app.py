"""LandBNB - Core Application & REST API Persistence Engine

An exact replica backend of Airbnb (LandBNB) built with Flask and Python.
Provides high-performance query filtering, data persistence to JSON storage,
global HTTP error handling, and robust endpoint validations.
"""

import json
import logging
import os
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

from flask import Flask, jsonify, render_template, request

# ==============================================================================
# Logging & Application Configuration
# ==============================================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("LandBNB")

app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "landbnb-dev-secret-key-2026")
app.config["DATA_DIR"] = Path(__file__).resolve().parent / "data"

# Standard fees configuration
STANDARD_CLEANING_FEE = 75.00
STANDARD_SERVICE_FEE_RATE = 0.12  # 12% service fee


# ==============================================================================
# Robust File I/O Persistence Engine
# ==============================================================================

def get_data_dir() -> Path:
    """Resolve and return current data directory path from application config."""
    return Path(app.config.get("DATA_DIR", Path(__file__).resolve().parent / "data"))


def load_json_file(filename: str) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
    """Safely load and parse a JSON dataset from the configured DATA_DIR.

    Catches FileNotFoundError, PermissionError, and json.JSONDecodeError,
    logging detailed diagnostics and returning safe fallback data structures.
    """
    file_path = get_data_dir() / filename
    try:
        if not file_path.exists():
            logger.warning("Dataset file '%s' does not exist at %s. Returning fallback [].", filename, file_path)
            return []

        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            logger.debug("Loaded dataset '%s' containing %d records.", filename, len(data) if isinstance(data, list) else 1)
            return data

    except FileNotFoundError as e:
        logger.error("FileNotFoundError encountered reading '%s': %s", filename, e)
        return []
    except PermissionError as e:
        logger.error("PermissionError encountered reading '%s': %s", filename, e)
        return []
    except json.JSONDecodeError as e:
        logger.error("JSONDecodeError encountered parsing '%s': %s", filename, e)
        return []
    except Exception as e:
        logger.error("Unexpected error loading dataset '%s': %s", filename, e)
        return []


def save_json_file(filename: str, data: Any) -> bool:
    """Safely persist in-memory data back to a JSON file in DATA_DIR.

    Catches FileNotFoundError, PermissionError, TypeError, and general IOErrors.
    Performs an atomic write via a temporary file to prevent file corruption.
    """
    data_dir = get_data_dir()
    file_path = data_dir / filename
    temp_path = data_dir / f"{filename}.tmp"

    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Atomic replacement of target file
        temp_path.replace(file_path)
        logger.info("Successfully persisted dataset to '%s'.", file_path)
        return True

    except FileNotFoundError as e:
        logger.error("FileNotFoundError saving dataset '%s': %s", filename, e)
        if temp_path.exists():
            try:
                temp_path.unlink()
            except Exception:
                pass
        return False
    except PermissionError as e:
        logger.error("PermissionError saving dataset '%s': %s", filename, e)
        return False
    except TypeError as e:
        logger.error("TypeError serializing dataset '%s': %s", filename, e)
        return False
    except OSError as e:
        logger.error("OSError saving dataset '%s': %s", filename, e)
        return False
    except Exception as e:
        logger.error("Unexpected error saving dataset '%s': %s", filename, e)
        return False


# ==============================================================================
# Global HTTP Error Handling Framework
# ==============================================================================

def make_error_response(message: str, error_code: int = 400) -> Tuple[Any, int]:
    """Helper to return uniform error responses across all API endpoints."""
    return jsonify({
        "success": False,
        "error_code": error_code,
        "message": message
    }), error_code


@app.errorhandler(400)
def handle_bad_request(error):
    """Handle 400 Bad Request globally."""
    message = getattr(error, "description", "Bad Request")
    return make_error_response(message, 400)


@app.errorhandler(404)
def handle_not_found(error):
    """Handle 404 Not Found globally."""
    message = getattr(error, "description", "Resource Not Found")
    return make_error_response(message, 404)


@app.errorhandler(405)
def handle_method_not_allowed(error):
    """Handle 405 Method Not Allowed globally."""
    return make_error_response("Method Not Allowed", 405)


@app.errorhandler(500)
def handle_internal_server_error(error):
    """Handle 500 Internal Server Error globally."""
    logger.error("Internal Server Error: %s", error, exc_info=True)
    return make_error_response("Internal Server Error", 500)


# ==============================================================================
# Web Presentation Route
# ==============================================================================

@app.route("/")
def home():
    """Home landing page rendering active listings on LandBNB."""
    listings = load_json_file("listings.json")
    try:
        return render_template("index.html", listings=listings, total_listings=len(listings))
    except Exception:
        return jsonify({
            "success": True,
            "status": "online",
            "service": "LandBNB Platform",
            "version": "1.0.0",
            "message": "Welcome to LandBNB - Authentic travel and stays",
            "listings_count": len(listings) if isinstance(listings, list) else 0
        }), 200


@app.route("/listings/<listing_id>")
def listing_detail_page(listing_id: str):
    """Full-page presentation view for an individual property listing."""
    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    target_listing = next((l for l in listings if str(l.get("id")) == str(listing_id)), None)
    if not target_listing:
        # Fallback to home page or 404
        return render_template("index.html", error=f"Listing {listing_id} not found"), 404

    all_reviews = load_json_file("reviews.json")
    matching_reviews = [r for r in all_reviews if str(r.get("listing_id")) == str(listing_id)] if isinstance(all_reviews, list) else []

    all_users = load_json_file("users.json")
    host_name = target_listing.get("host_name", "")
    host_user = next(
        (u for u in all_users if str(u.get("name", "")).strip().lower() == host_name.strip().lower()),
        None
    ) if isinstance(all_users, list) else None

    return render_template(
        "listing_detail.html",
        listing=target_listing,
        reviews=matching_reviews,
        host=host_user,
        listing_id=listing_id
    )


@app.route("/checkout")
def checkout_page():
    """Dedicated booking checkout and payment summary view."""
    listing_id = request.args.get("listing_id", "listing-001")
    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    target_listing = next((l for l in listings if str(l.get("id")) == str(listing_id)), None)
    if not target_listing and listings:
        target_listing = listings[0]
    elif not target_listing:
        return render_template("index.html", error="No listing selected"), 404

    # Resolve active user and host
    all_users = load_json_file("users.json")
    if not isinstance(all_users, list):
        all_users = []

    user_id = request.args.get("user_id", "user-001")
    target_user = next((u for u in all_users if str(u.get("user_id")) == str(user_id)), None)
    if not target_user and all_users:
        target_user = all_users[0]

    host_name = target_listing.get("host_name", "")
    host_user = next(
        (u for u in all_users if str(u.get("name", "")).strip().lower() == host_name.strip().lower()),
        None
    )

    # Extract or calculate dates
    check_in = request.args.get("check_in", "")
    check_out = request.args.get("check_out", "")
    guests = request.args.get("guests", "1")

    today = datetime.now(timezone.utc).date()
    if not check_in:
        check_in = (today + timedelta(days=14)).isoformat()
    if not check_out:
        check_out = (today + timedelta(days=18)).isoformat()

    try:
        d_in = datetime.strptime(check_in, "%Y-%m-%d").date()
        d_out = datetime.strptime(check_out, "%Y-%m-%d").date()
        if d_out <= d_in:
            d_out = d_in + timedelta(days=4)
            check_out = d_out.isoformat()
        nights = (d_out - d_in).days
    except ValueError:
        nights = 4
        check_in = (today + timedelta(days=14)).isoformat()
        check_out = (today + timedelta(days=18)).isoformat()

    price_per_night = float(target_listing.get("price_per_night", 100))
    accommodation_cost = round(nights * price_per_night, 2)
    cleaning_fee = round(STANDARD_CLEANING_FEE, 2)
    service_fee = round(accommodation_cost * STANDARD_SERVICE_FEE_RATE, 2)
    total_taxes = 0.00
    total_price = round(accommodation_cost + cleaning_fee + service_fee, 2)

    return render_template(
        "checkout.html",
        listing=target_listing,
        user=target_user,
        host=host_user,
        check_in=check_in,
        check_out=check_out,
        guests=guests,
        nights=nights,
        price_per_night=price_per_night,
        accommodation_cost=accommodation_cost,
        cleaning_fee=cleaning_fee,
        service_fee=service_fee,
        total_taxes=total_taxes,
        total_price=total_price
    )


@app.route("/profile")
@app.route("/profile/<user_id>")
def profile_page(user_id: str = "user-001"):
    """User profile dashboard displaying trips, saved wishlists, and settings."""
    users = load_json_file("users.json")
    if not isinstance(users, list):
        users = []

    target_user = next((u for u in users if str(u.get("user_id")) == str(user_id)), None)
    if not target_user and users:
        target_user = users[0]
    elif not target_user:
        return render_template("index.html", error="User not found"), 404

    # Fetch user bookings and listing index
    all_bookings = load_json_file("bookings.json")
    all_listings = load_json_file("listings.json")
    listings_by_id = {str(l.get("id")): l for l in all_listings} if isinstance(all_listings, list) else {}

    user_bookings = []
    if isinstance(all_bookings, list):
        for b in all_bookings:
            if str(b.get("user_id")) == str(target_user.get("user_id")):
                b_copy = dict(b)
                listing_obj = listings_by_id.get(str(b.get("listing_id")), {})
                if not b_copy.get("listing_title"):
                    b_copy["listing_title"] = listing_obj.get("title", b.get("listing_id"))
                if not b_copy.get("listing_image"):
                    images = listing_obj.get("images", [])
                    b_copy["listing_image"] = images[0] if (isinstance(images, list) and len(images) > 0) else listing_obj.get("primary_image", "")
                if not b_copy.get("listing_location"):
                    loc = listing_obj.get("location", "")
                    if isinstance(loc, dict):
                        b_copy["listing_location"] = f"{loc.get('city', '')}, {loc.get('state', '')}".strip(", ")
                    else:
                        b_copy["listing_location"] = str(loc)
                if not b_copy.get("nights") and b.get("check_in") and b.get("check_out"):
                    try:
                        d1 = datetime.strptime(b["check_in"], "%Y-%m-%d")
                        d2 = datetime.strptime(b["check_out"], "%Y-%m-%d")
                        b_copy["nights"] = (d2 - d1).days
                    except Exception:
                        pass
                user_bookings.append(b_copy)

    # Sort bookings with latest reservations first
    user_bookings.reverse()

    wishlist_listings = [
        listings_by_id[str(item_id)]
        for item_id in target_user.get("wishlist", [])
        if str(item_id) in listings_by_id
    ]

    active_tab = request.args.get("tab", "trips")

    return render_template(
        "profile.html",
        user=target_user,
        bookings=user_bookings,
        wishlist_listings=wishlist_listings,
        active_tab=active_tab
    )




# ==============================================================================
# REST API Endpoints
# ==============================================================================

@app.route("/api/health", methods=["GET"])
def get_health_status():
    """GET /api/health

    Lightweight health-check endpoint returning application status,
    UTC timestamp, and record summary counts across all datasets.
    """
    listings = load_json_file("listings.json")
    users = load_json_file("users.json")
    bookings = load_json_file("bookings.json")
    reviews = load_json_file("reviews.json")

    return jsonify({
        "success": True,
        "status": "healthy",
        "service": "LandBNB Core API",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "counts": {
            "listings": len(listings) if isinstance(listings, list) else 0,
            "users": len(users) if isinstance(users, list) else 0,
            "bookings": len(bookings) if isinstance(bookings, list) else 0,
            "reviews": len(reviews) if isinstance(reviews, list) else 0,
        }
    }), 200


@app.route("/api/listings", methods=["GET"])
def get_listings():
    """GET /api/listings

    Advanced property search endpoint supporting query parameter filters:
    - location: case-insensitive partial substring match
    - category: exact match against listing category
    - min_price: numeric floor comparison
    - max_price: numeric ceiling comparison
    - amenities: comma-separated list ensuring all requested amenities are present
    """
    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    location_query = request.args.get("location", "").strip()
    category_query = request.args.get("category", "").strip()
    min_price_str = request.args.get("min_price", "").strip()
    max_price_str = request.args.get("max_price", "").strip()
    amenities_str = request.args.get("amenities", "").strip()

    # Validate price query parameters
    min_price: Optional[float] = None
    if min_price_str:
        try:
            min_price = float(min_price_str)
            if min_price < 0:
                return make_error_response("Query parameter 'min_price' must be non-negative", 400)
        except ValueError:
            return make_error_response("Invalid query parameter 'min_price'. Must be a numeric value.", 400)

    max_price: Optional[float] = None
    if max_price_str:
        try:
            max_price = float(max_price_str)
            if max_price < 0:
                return make_error_response("Query parameter 'max_price' must be non-negative", 400)
        except ValueError:
            return make_error_response("Invalid query parameter 'max_price'. Must be a numeric value.", 400)

    if min_price is not None and max_price is not None and min_price > max_price:
        return make_error_response("'min_price' cannot be greater than 'max_price'", 400)

    # Parse requested amenities
    requested_amenities: List[str] = []
    if amenities_str:
        requested_amenities = [a.strip() for a in amenities_str.split(",") if a.strip()]

    # Filter listings
    filtered_listings = []
    for item in listings:
        # 1. Location filter (case-insensitive substring)
        if location_query:
            loc = item.get("location", "").lower()
            title = item.get("title", "").lower()
            q_loc = location_query.lower()
            if q_loc not in loc and q_loc not in title:
                continue

        # 2. Category filter (exact match, case-insensitive)
        if category_query:
            cat = item.get("category", "").strip().lower()
            if cat != category_query.lower():
                continue

        # 3. Min price filter
        price = float(item.get("price_per_night", 0))
        if min_price is not None and price < min_price:
            continue

        # 4. Max price filter
        if max_price is not None and price > max_price:
            continue

        # 5. Amenities filter (all requested amenities must exist in listing)
        if requested_amenities:
            listing_amenities = [a.lower() for a in item.get("amenities", [])]
            has_all_amenities = all(req.lower() in listing_amenities for req in requested_amenities)
            if not has_all_amenities:
                continue

        filtered_listings.append(item)

    return jsonify({
        "success": True,
        "total_count": len(filtered_listings),
        "filters_applied": {
            "location": location_query if location_query else None,
            "category": category_query if category_query else None,
            "min_price": min_price,
            "max_price": max_price,
            "amenities": requested_amenities if requested_amenities else None
        },
        "listings": filtered_listings
    }), 200


@app.route("/api/listings/<listing_id>", methods=["GET"])
def get_listing_detail(listing_id: str):
    """GET /api/listings/<listing_id>

    Retrieve single listing enriched with matched reviews and host metadata.
    Returns structured 404 if listing is not found.
    """
    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    target_listing = next((l for l in listings if str(l.get("id")) == str(listing_id)), None)
    if not target_listing:
        return make_error_response(f"Listing with ID '{listing_id}' not found", 404)

    # Enrich with reviews from reviews.json
    all_reviews = load_json_file("reviews.json")
    if not isinstance(all_reviews, list):
        all_reviews = []
    matching_reviews = [r for r in all_reviews if str(r.get("listing_id")) == str(listing_id)]

    # Enrich with host information from users.json
    all_users = load_json_file("users.json")
    if not isinstance(all_users, list):
        all_users = []

    host_name = target_listing.get("host_name", "")
    host_user = next(
        (u for u in all_users if str(u.get("name", "")).strip().lower() == host_name.strip().lower()),
        None
    )

    host_profile = {
        "name": host_name,
        "user_id": host_user.get("user_id") if host_user else None,
        "email": host_user.get("email") if host_user else None,
        "profile_image": host_user.get("profile_image") if host_user else None,
    }

    enriched_listing = dict(target_listing)
    enriched_listing["reviews"] = matching_reviews
    enriched_listing["reviews_count"] = len(matching_reviews) if matching_reviews else target_listing.get("reviews_count", 0)
    enriched_listing["host"] = host_profile

    return jsonify({
        "success": True,
        "listing": enriched_listing
    }), 200


@app.route("/api/users", methods=["GET"])
def get_all_users():
    """GET /api/users - Retrieve list of all users."""
    users = load_json_file("users.json")
    return jsonify({
        "success": True,
        "count": len(users) if isinstance(users, list) else 0,
        "users": users
    }), 200


@app.route("/api/users/<user_id>", methods=["GET"])
def get_user_profile(user_id: str):
    """GET /api/users/<user_id>

    Fetch a user profile record and populate saved listing objects
    corresponding to IDs stored in the user's wishlist array.
    """
    users = load_json_file("users.json")
    if not isinstance(users, list):
        users = []

    target_user = next((u for u in users if str(u.get("user_id")) == str(user_id)), None)
    if not target_user:
        return make_error_response(f"User with ID '{user_id}' not found", 404)

    # Populate wishlist listings from listings.json
    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    listings_by_id = {str(l.get("id")): l for l in listings}
    wishlist_ids = target_user.get("wishlist", [])

    saved_listings = [
        listings_by_id[str(item_id)]
        for item_id in wishlist_ids
        if str(item_id) in listings_by_id
    ]

    enriched_user = dict(target_user)
    enriched_user["saved_listings"] = saved_listings

    return jsonify({
        "success": True,
        "user": enriched_user
    }), 200


@app.route("/api/wishlist", methods=["POST"])
def toggle_wishlist():
    """POST /api/wishlist

    Toggles a listing in a user's wishlist.
    - If already present, removes it (toggle off).
    - If absent, adds it (toggle on).
    Persists updated state back to users.json.
    """
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        return make_error_response("Invalid JSON payload or missing Content-Type: application/json", 400)

    user_id = payload.get("user_id")
    listing_id = payload.get("listing_id")

    if not user_id or not str(user_id).strip():
        return make_error_response("Missing or empty required field: 'user_id'", 400)
    if not listing_id or not str(listing_id).strip():
        return make_error_response("Missing or empty required field: 'listing_id'", 400)

    user_id_str = str(user_id).strip()
    listing_id_str = str(listing_id).strip()

    # Verify both user and listing exist
    users = load_json_file("users.json")
    if not isinstance(users, list):
        users = []

    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    target_user = next((u for u in users if str(u.get("user_id")) == user_id_str), None)
    if not target_user:
        return make_error_response(f"User with ID '{user_id_str}' not found", 404)

    target_listing = next((l for l in listings if str(l.get("id")) == listing_id_str), None)
    if not target_listing:
        return make_error_response(f"Listing with ID '{listing_id_str}' not found", 404)

    # Perform toggle operation
    current_wishlist = target_user.get("wishlist", [])
    current_ids_normalized = [str(x) for x in current_wishlist]

    if listing_id_str in current_ids_normalized:
        # Remove from wishlist
        target_user["wishlist"] = [x for x in current_wishlist if str(x) != listing_id_str]
        action = "removed"
        message = f"Listing '{listing_id_str}' removed from wishlist."
    else:
        # Add to wishlist
        target_user["wishlist"].append(target_listing["id"])
        action = "added"
        message = f"Listing '{listing_id_str}' added to wishlist."

    # Persist updated state to users.json
    save_success = save_json_file("users.json", users)
    if not save_success:
        return make_error_response("Failed to persist updated user wishlist to storage", 500)

    return jsonify({
        "success": True,
        "action": action,
        "message": message,
        "user_id": target_user["user_id"],
        "listing_id": target_listing["id"],
        "wishlist": target_user["wishlist"]
    }), 200


@app.route("/api/bookings", methods=["GET"])
def get_all_bookings():
    """GET /api/bookings - Retrieve all booking records."""
    bookings = load_json_file("bookings.json")
    return jsonify({
        "success": True,
        "count": len(bookings) if isinstance(bookings, list) else 0,
        "bookings": bookings
    }), 200


@app.route("/api/bookings", methods=["POST"])
def create_booking():
    """POST /api/bookings

    Reservation creation endpoint.
    Validates required fields, date formats, chronological validity,
    listing/user existence, computes arithmetic stay breakdown,
    and appends confirmed booking to bookings.json.
    """
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        return make_error_response("Invalid JSON payload or missing Content-Type: application/json", 400)

    # Required fields validation
    required_fields = ["listing_id", "user_id", "check_in", "check_out"]
    for field in required_fields:
        val = payload.get(field)
        if val is None or not str(val).strip():
            return make_error_response(f"Missing or empty required field: '{field}'", 400)

    listing_id_str = str(payload["listing_id"]).strip()
    user_id_str = str(payload["user_id"]).strip()
    check_in_str = str(payload["check_in"]).strip()
    check_out_str = str(payload["check_out"]).strip()

    # Date parsing and chronological validation
    try:
        check_in_date = datetime.strptime(check_in_str, "%Y-%m-%d").date()
    except ValueError:
        return make_error_response(f"Invalid 'check_in' date format '{check_in_str}'. Expected YYYY-MM-DD.", 400)

    try:
        check_out_date = datetime.strptime(check_out_str, "%Y-%m-%d").date()
    except ValueError:
        return make_error_response(f"Invalid 'check_out' date format '{check_out_str}'. Expected YYYY-MM-DD.", 400)

    if check_out_date <= check_in_date:
        return make_error_response(
            "Reservation 'check_out' date must chronologically follow 'check_in' date (minimum 1 night stay).",
            400
        )

    # Verify listing and user exist
    listings = load_json_file("listings.json")
    if not isinstance(listings, list):
        listings = []

    users = load_json_file("users.json")
    if not isinstance(users, list):
        users = []

    target_listing = next((l for l in listings if str(l.get("id")) == listing_id_str), None)
    if not target_listing:
        return make_error_response(f"Listing with ID '{listing_id_str}' not found", 404)

    target_user = next((u for u in users if str(u.get("user_id")) == user_id_str), None)
    if not target_user:
        return make_error_response(f"User with ID '{user_id_str}' not found", 404)

    # Price arithmetic calculation
    nights = (check_out_date - check_in_date).days
    price_per_night = float(target_listing.get("price_per_night", 0))
    accommodation_cost = round(nights * price_per_night, 2)
    cleaning_fee = round(STANDARD_CLEANING_FEE, 2)
    service_fee = round(accommodation_cost * STANDARD_SERVICE_FEE_RATE, 2)
    total_price = round(accommodation_cost + cleaning_fee + service_fee, 2)

    # Generate unique booking receipt
    booking_id = f"booking-{uuid.uuid4().hex[:8]}"
    listing_images = target_listing.get("images", [])
    primary_img = listing_images[0] if (isinstance(listing_images, list) and len(listing_images) > 0) else target_listing.get("primary_image", "")
    loc_val = target_listing.get("location", "")
    loc_str = f"{loc_val.get('city', '')}, {loc_val.get('state', '')}".strip(", ") if isinstance(loc_val, dict) else str(loc_val)

    booking_record = {
        "booking_id": booking_id,
        "listing_id": target_listing["id"],
        "listing_title": target_listing.get("title", ""),
        "listing_image": primary_img,
        "listing_location": loc_str,
        "user_id": target_user["user_id"],
        "user_name": target_user.get("name", ""),
        "check_in": check_in_str,
        "check_out": check_out_str,
        "guests": int(payload.get("guests", 1)),
        "nights": nights,
        "price_per_night": price_per_night,
        "accommodation_cost": accommodation_cost,
        "cleaning_fee": cleaning_fee,
        "service_fee": service_fee,
        "total_price": total_price,
        "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    # Persist into bookings.json
    bookings = load_json_file("bookings.json")
    if not isinstance(bookings, list):
        bookings = []

    bookings.append(booking_record)
    save_success = save_json_file("bookings.json", bookings)
    if not save_success:
        return make_error_response("Failed to persist booking record to storage", 500)

    return jsonify({
        "success": True,
        "message": "Booking reservation created successfully",
        "booking": booking_record
    }), 201


@app.route("/api/reviews", methods=["GET"])
def get_all_reviews():
    """GET /api/reviews - Retrieve all review items."""
    reviews = load_json_file("reviews.json")
    return jsonify({
        "success": True,
        "count": len(reviews) if isinstance(reviews, list) else 0,
        "reviews": reviews
    }), 200


@app.route("/api/bookings/<booking_id>", methods=["DELETE"])
def cancel_booking(booking_id: str):
    """DELETE /api/bookings/<booking_id>

    Cancel / remove an existing booking record.
    Persists updated state back to bookings.json.
    """
    bookings = load_json_file("bookings.json")
    if not isinstance(bookings, list):
        bookings = []

    target_booking = next((b for b in bookings if str(b.get("booking_id")) == str(booking_id)), None)
    if not target_booking:
        return make_error_response(f"Booking with ID '{booking_id}' not found", 404)

    # Remove the booking from active bookings
    updated_bookings = [b for b in bookings if str(b.get("booking_id")) != str(booking_id)]
    save_success = save_json_file("bookings.json", updated_bookings)
    if not save_success:
        return make_error_response("Failed to update bookings storage", 500)

    logger.info("Successfully cancelled booking '%s'", booking_id)
    return jsonify({
        "success": True,
        "message": f"Booking '{booking_id}' successfully cancelled.",
        "booking_id": booking_id
    }), 200


@app.route("/api/users/<user_id>/bookings", methods=["GET"])
def get_user_bookings(user_id: str):
    """GET /api/users/<user_id>/bookings

    Retrieve all reservations booked by a specific user.
    """
    bookings = load_json_file("bookings.json")
    if not isinstance(bookings, list):
        bookings = []

    user_bookings = [b for b in bookings if str(b.get("user_id")) == str(user_id)]
    return jsonify({
        "success": True,
        "user_id": user_id,
        "count": len(user_bookings),
        "bookings": user_bookings
    }), 200



# ==============================================================================
# Application Startup
# ==============================================================================

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
