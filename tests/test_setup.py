"""LandBNB - Setup and Mock Datasets Validation Suite

Validates file presence, JSON syntax, required schema attributes, data types,
and referential integrity across listings, users, bookings, and reviews datasets.
Supports execution via pytest or direct python invocation.
"""

import json
import re
from datetime import datetime
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

LISTINGS_PATH = DATA_DIR / "listings.json"
USERS_PATH = DATA_DIR / "users.json"
BOOKINGS_PATH = DATA_DIR / "bookings.json"
REVIEWS_PATH = DATA_DIR / "reviews.json"

DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load_json(file_path: Path):
    """Load and parse JSON file, ensuring path exists."""
    assert file_path.exists(), f"File does not exist: {file_path}"
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert isinstance(data, list), f"Expected list in {file_path.name}, got {type(data)}"
    return data


def test_listings_dataset():
    """Verify listings.json satisfies all business and schema requirements."""
    listings = load_json(LISTINGS_PATH)
    assert len(listings) >= 15, f"Expected at least 15 listings, found {len(listings)}"

    required_keys = {
        "id",
        "title",
        "description",
        "location",
        "price_per_night",
        "rating",
        "reviews_count",
        "host_name",
        "category",
        "images",
        "amenities",
    }

    seen_ids = set()

    for idx, item in enumerate(listings):
        # 1. Key presence
        missing_keys = required_keys - set(item.keys())
        assert not missing_keys, f"Listing #{idx} missing keys: {missing_keys}"

        # 2. Unique ID
        listing_id = str(item["id"])
        assert listing_id not in seen_ids, f"Duplicate listing ID: {listing_id}"
        seen_ids.add(listing_id)

        # 3. Type & Value Checks
        assert isinstance(item["title"], str) and len(item["title"]) > 0
        assert isinstance(item["description"], str) and len(item["description"]) > 20
        assert isinstance(item["location"], str) and len(item["location"]) > 0
        assert isinstance(item["price_per_night"], (int, float)) and item["price_per_night"] > 0
        assert isinstance(item["rating"], (int, float)) and 4.0 <= item["rating"] <= 5.0, (
            f"Listing {listing_id} rating {item['rating']} not in range [4.0, 5.0]"
        )
        assert isinstance(item["reviews_count"], int) and item["reviews_count"] >= 0
        assert isinstance(item["host_name"], str) and len(item["host_name"]) > 0
        assert isinstance(item["category"], str) and len(item["category"]) > 0

        # 4. Images array (at least 5 images)
        assert isinstance(item["images"], list), f"Listing {listing_id} images must be a list"
        assert len(item["images"]) >= 5, (
            f"Listing {listing_id} must have at least 5 images, found {len(item['images'])}"
        )
        for img in item["images"]:
            assert isinstance(img, str) and len(img) > 0

        # 5. Amenities array
        assert isinstance(item["amenities"], list) and len(item["amenities"]) > 0

    print(f"[OK] listings.json validated successfully: {len(listings)} records with full schema integrity.")


def test_users_dataset():
    """Verify users.json satisfies all business and schema requirements."""
    users = load_json(USERS_PATH)
    listings = load_json(LISTINGS_PATH)
    listing_ids = {str(item["id"]) for item in listings}

    assert len(users) >= 5, f"Expected at least 5 users, found {len(users)}"

    required_keys = {"user_id", "name", "email", "profile_image", "wishlist"}
    seen_ids = set()

    for idx, user in enumerate(users):
        missing_keys = required_keys - set(user.keys())
        assert not missing_keys, f"User #{idx} missing keys: {missing_keys}"

        user_id = str(user["user_id"])
        assert user_id not in seen_ids, f"Duplicate user ID: {user_id}"
        seen_ids.add(user_id)

        assert isinstance(user["name"], str) and len(user["name"]) > 0
        assert isinstance(user["email"], str) and "@" in user["email"]
        assert isinstance(user["profile_image"], str) and len(user["profile_image"]) > 0
        assert isinstance(user["wishlist"], list)

        # Referential integrity: wishlisted listings must exist
        for item_id in user["wishlist"]:
            assert str(item_id) in listing_ids, (
                f"User {user_id} wishlist item {item_id} not found in listings"
            )

    print(f"[OK] users.json validated successfully: {len(users)} profiles with referential integrity.")


def test_bookings_dataset():
    """Verify bookings.json satisfies all business and schema requirements."""
    bookings = load_json(BOOKINGS_PATH)
    listings = load_json(LISTINGS_PATH)
    users = load_json(USERS_PATH)

    listing_ids = {str(item["id"]) for item in listings}
    user_ids = {str(u["user_id"]) for u in users}

    assert len(bookings) >= 5, f"Expected at least 5 bookings, found {len(bookings)}"

    required_keys = {"booking_id", "listing_id", "user_id", "check_in", "check_out", "total_price"}
    seen_ids = set()

    for idx, b in enumerate(bookings):
        missing_keys = required_keys - set(b.keys())
        assert not missing_keys, f"Booking #{idx} missing keys: {missing_keys}"

        booking_id = str(b["booking_id"])
        assert booking_id not in seen_ids, f"Duplicate booking ID: {booking_id}"
        seen_ids.add(booking_id)

        # Referential integrity
        assert str(b["listing_id"]) in listing_ids, (
            f"Booking {booking_id} references non-existent listing {b['listing_id']}"
        )
        assert str(b["user_id"]) in user_ids, (
            f"Booking {booking_id} references non-existent user {b['user_id']}"
        )

        # Date validation
        assert DATE_PATTERN.match(b["check_in"]), f"Invalid check_in format: {b['check_in']}"
        assert DATE_PATTERN.match(b["check_out"]), f"Invalid check_out format: {b['check_out']}"
        d_in = datetime.strptime(b["check_in"], "%Y-%m-%d")
        d_out = datetime.strptime(b["check_out"], "%Y-%m-%d")
        assert d_out > d_in, f"Booking {booking_id} check_out must be after check_in"

        # Price validation
        assert isinstance(b["total_price"], (int, float)) and b["total_price"] > 0

    print(f"[OK] bookings.json validated successfully: {len(bookings)} bookings with date/price validation.")


def test_reviews_dataset():
    """Verify reviews.json satisfies all business and schema requirements."""
    reviews = load_json(REVIEWS_PATH)
    listings = load_json(LISTINGS_PATH)
    listing_ids = {str(item["id"]) for item in listings}

    assert len(reviews) >= 10, f"Expected at least 10 reviews, found {len(reviews)}"

    required_keys = {"review_id", "listing_id", "user_name", "comment", "rating", "date"}
    seen_ids = set()

    for idx, r in enumerate(reviews):
        missing_keys = required_keys - set(r.keys())
        assert not missing_keys, f"Review #{idx} missing keys: {missing_keys}"

        review_id = str(r["review_id"])
        assert review_id not in seen_ids, f"Duplicate review ID: {review_id}"
        seen_ids.add(review_id)

        # Referential integrity
        assert str(r["listing_id"]) in listing_ids, (
            f"Review {review_id} references non-existent listing {r['listing_id']}"
        )

        assert isinstance(r["user_name"], str) and len(r["user_name"]) > 0
        assert isinstance(r["comment"], str) and len(r["comment"]) > 5
        assert isinstance(r["rating"], (int, float)) and 1.0 <= r["rating"] <= 5.0
        assert DATE_PATTERN.match(r["date"]), f"Invalid date format: {r['date']}"

    print(f"[OK] reviews.json validated successfully: {len(reviews)} reviews with referential links.")


def run_all_validations():
    """Main verification runner for terminal execution."""
    print("=" * 65)
    print(" LANDBNB PLATFORM - MOCK DATASET VERIFICATION SUITE")
    print("=" * 65)

    test_listings_dataset()
    test_users_dataset()
    test_bookings_dataset()
    test_reviews_dataset()

    print("=" * 65)
    print(" ALL 4 DATASETS PASSED INTEGRITY & SCHEMA VALIDATION")
    print("=" * 65)


if __name__ == "__main__":
    run_all_validations()
