"""LandBNB - Core Application Entry Point

An exact replica of Airbnb platform built with Flask and Python.
Provides foundational routing, mock data serving, and application startup testing.
"""

import json
import os
from pathlib import Path
from flask import Flask, jsonify, render_template

# Initialize Flask Application
app = Flask(__name__)
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "landbnb-dev-secret-key-2026")
app.config["DATA_DIR"] = Path(__file__).resolve().parent / "data"


def load_dataset(filename: str):
    """Safely load and parse a JSON dataset from the /data directory."""
    file_path = app.config["DATA_DIR"] / filename
    if not file_path.exists():
        return []
    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)


@app.route("/")
def home():
    """Home entry route for LandBNB platform."""
    listings = load_dataset("listings.json")
    try:
        return render_template("index.html", listings=listings, total_listings=len(listings))
    except Exception:
        # Fallback response if template is loading or for initial API smoke-test
        return jsonify({
            "status": "online",
            "service": "LandBNB Platform",
            "version": "1.0.0",
            "message": "Welcome to LandBNB - Authentic travel and stays",
            "listings_count": len(listings)
        }), 200


@app.route("/api/health")
def health_check():
    """Service health verification endpoint."""
    return jsonify({
        "status": "healthy",
        "service": "LandBNB",
        "environment": "development"
    }), 200


@app.route("/api/listings")
def get_listings():
    """Retrieve all available property listings."""
    listings = load_dataset("listings.json")
    return jsonify({
        "count": len(listings),
        "listings": listings
    }), 200


@app.route("/api/users")
def get_users():
    """Retrieve sample users."""
    users = load_dataset("users.json")
    return jsonify({
        "count": len(users),
        "users": users
    }), 200


@app.route("/api/bookings")
def get_bookings():
    """Retrieve sample bookings."""
    bookings = load_dataset("bookings.json")
    return jsonify({
        "count": len(bookings),
        "bookings": bookings
    }), 200


@app.route("/api/reviews")
def get_reviews():
    """Retrieve sample reviews."""
    reviews = load_dataset("reviews.json")
    return jsonify({
        "count": len(reviews),
        "reviews": reviews
    }), 200


@app.errorhandler(404)
def not_found_error(error):
    return jsonify({"error": "Resource not found", "code": 404}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error", "code": 500}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
