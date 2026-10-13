# LandBNB · Authentic Stays & Vacation Rentals Platform

An exact replica full-stack Airbnb clone built with Flask, Python, and modern Vanilla Web Architecture. Engineered with pixel-perfect Airbnb design aesthetics (#FF385C), responsive multi-breakpoint layout grids, an atomic JSON persistence engine, interactive search popovers, sticky reservation widgets, a 5-photo asymmetric mosaic gallery, a comprehensive booking checkout flow, a user profile management dashboard, and automated end-to-end regression testing.

---

## 🏛️ Project Architecture

```
LandBNB/
├── app.py                      # Core Flask application, routing engine & REST API
├── requirements.txt            # Python dependencies (Flask, pytest, etc.)
├── .gitignore                  # Git exclusions for bytecode, cache, and artifacts
├── README.md                   # Comprehensive architectural documentation
│
├── data/                       # JSON persistence layer with referential integrity
│   ├── listings.json           # Property listings, categories, pricing, and images
│   ├── users.json              # Guest profiles, verified identities, and wishlists
│   ├── bookings.json           # Confirmed reservations and calculated stay receipts
│   └── reviews.json            # Verified property reviews, star ratings, and dates
│
├── static/                     # Frontend static assets
│   ├── css/
│   │   └── style.css           # Production Airbnb design system, shadows, brand colors
│   ├── js/
│   │   ├── main.js             # Home page state, search popovers, categories, calendar
│   │   ├── detail.js           # Mosaic lightbox, live pricing engine, guest selector
│   │   ├── checkout.js         # Payment formatting, simulated authorization, receipts
│   │   └── profile.js          # Tab routing, async cancellations (DELETE), wishlists
│   └── images/                 # Local image assets and branding placeholders
│
├── templates/                  # Jinja2 presentation templates
│   ├── index.html              # Home landing page with category bar and responsive grid
│   ├── listing_detail.html     # Dedicated listing view with 5-photo mosaic & sticky widget
│   ├── checkout.html           # 256-bit SSL secure payment and confirmation receipt view
│   └── profile.html            # Profile dashboard with trips, wishlists, and account tabs
│
└── tests/                      # Automated regression & integration test suite
    ├── test_setup.py           # Dataset schema, required keys, and referential validation
    ├── test_api.py             # REST API endpoint unit and query filtering tests
    └── test_e2e.py             # End-to-end user journey & cross-module integration tests
```

---

## 🚀 Key Modules & Technical Capabilities

### 1. Presentation & Routing Engine (`app.py` & `templates/`)
- **Home Page (`/`)**: Dynamic category filter bar, search popovers (Where / When / Who), multi-date calendar range selector, and responsive listings grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`).
- **Listing Detail Page (`/listings/<listing_id>`)**: Full-page presentation with 5-photo asymmetric mosaic gallery, full-screen lightbox modal, host identity badges, matched reviews list, and sticky reservation checkout widget.
- **Reservation Checkout (`/checkout`)**: URL query parameter binding (`listing_id`, `check_in`, `check_out`, `guests`), live stay arithmetic recalculation, credit card formatting, Apple Pay tab, simulated authorization, and printable booking confirmation receipts.
- **Profile Dashboard (`/profile/<user_id>?tab=trips|wishlists|account`)**: Multi-tab user dashboard managing confirmed trips, saved wishlist items with instant removal, and account settings.

### 2. Airbnb Brand Aesthetics Hardening (`static/css/style.css`)
- **Brand Primary Color**: Enforced Airbnb Coral/Red (`#FF385C`) across all interactive reserve buttons, search buttons, active category tabs, active dashboard indicators, and wishlist heart icons.
- **Typography & Antialiasing**: Modern typography using Google Font *Plus Jakarta Sans* with subpixel antialiasing (`-webkit-font-smoothing: antialiased`).
- **Elevation System**: Exact Airbnb box-shadow tokens (`airbnb-shadow-sm`, `airbnb-shadow-md`, `airbnb-shadow-lg`, `airbnb-shadow-search`).
- **Responsive Geometry**: Standardized card border radiuses (`rounded-2xl` / `rounded-3xl`) and viewport protection ensuring zero horizontal overflow across mobile, tablet, and desktop viewports.

### 3. File I/O Persistence Engine with Referential Integrity
- **Atomic File Writing**: Implements atomic file replacement via temporary `.tmp` files to prevent write collisions and file corruption.
- **Referential Integrity**: Guarantees all foreign-key relationships remain consistent across multi-step mutations:
  - Wishlist item IDs in `users.json` reference valid entries in `listings.json`.
  - Bookings in `bookings.json` link valid `listing_id` and `user_id` entities.
  - Reviews in `reviews.json` link directly to valid properties.
- **Dynamic Price Engine**:
  - $\text{Accommodation Cost} = \text{Nights} \times \text{Price Per Night}$
  - $\text{Standard Cleaning Fee} = \$75.00$
  - $\text{Service Fee} = \text{Accommodation Cost} \times 12\%$
  - $\text{Total Price} = \text{Accommodation Cost} + \text{Cleaning Fee} + \text{Service Fee}$

---

## 🌐 REST API Endpoints Specification

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health-check endpoint returning system status and record counts |
| `GET` | `/api/listings` | Search and filter listings (`location`, `category`, `min_price`, `max_price`, `amenities`) |
| `GET` | `/api/listings/<id>` | Retrieve single listing enriched with matched reviews and host profile |
| `GET` | `/api/users` | Retrieve all registered user accounts |
| `GET` | `/api/users/<id>` | Retrieve user record with populated `saved_listings` objects |
| `POST` | `/api/wishlist` | Toggle listing in user wishlist (add/remove) and persist to storage |
| `GET` | `/api/bookings` | Retrieve all confirmed bookings |
| `POST` | `/api/bookings` | Create new reservation, validate dates, compute stay arithmetic, and persist |
| `DELETE` | `/api/bookings/<id>` | Cancel existing reservation and remove from `bookings.json` |
| `GET` | `/api/users/<id>/bookings` | Retrieve all reservations booked by a specific user |
| `GET` | `/api/reviews` | Retrieve all verified reviews |

---

## 📊 Dataset Schema Overview

### `listings.json`
```json
{
  "id": "listing-001",
  "title": "Luxury Beachfront Villa with Infinity Pool",
  "description": "Breathtaking panoramic ocean views...",
  "location": "Malibu, California",
  "price_per_night": 950.0,
  "rating": 4.98,
  "reviews_count": 128,
  "host_name": "Elena Rostova",
  "category": "Beachfront",
  "images": ["https://images.unsplash.com/...", ...],
  "amenities": ["Wifi", "Pool", "Kitchen", "Hot tub", "Air conditioning"]
}
```

### `users.json`
```json
{
  "user_id": "user-001",
  "name": "Sophia Chen",
  "email": "sophia.chen@example.com",
  "profile_image": "https://images.unsplash.com/...",
  "wishlist": ["listing-004", "listing-007", "listing-001"]
}
```

### `bookings.json`
```json
{
  "booking_id": "booking-001",
  "listing_id": "listing-001",
  "listing_title": "Luxury Beachfront Villa with Infinity Pool",
  "user_id": "user-001",
  "check_in": "2026-11-05",
  "check_out": "2026-11-09",
  "nights": 4,
  "price_per_night": 950.0,
  "accommodation_cost": 3800.0,
  "cleaning_fee": 75.0,
  "service_fee": 456.0,
  "total_price": 4331.0,
  "status": "confirmed"
}
```

---

## 🛠️ Setup & Installation Instructions

### Prerequisites
- Python 3.10 or higher
- Git

### 1. Clone & Enter Repository
```bash
git clone https://github.com/Akash04092006/LandBNB.git
cd LandBNB
```

### 2. Create and Activate Virtual Environment (Optional but Recommended)
```bash
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1

# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Launch the Development Server
```bash
python app.py
```
Open [http://localhost:5000](http://localhost:5000) in your web browser.

---

## 🧪 Automated Testing Suite Execution

The application comes with 100% automated test coverage across three distinct test modules utilizing `pytest` and Flask's isolated test client:

```bash
# Execute the entire automated test suite:
python -m pytest

# Run with verbose output:
python -m pytest -v

# Run the End-to-End user journey integration suite specifically:
python -m pytest tests/test_e2e.py -v

# Run the REST API unit test suite:
python -m pytest tests/test_api.py -v

# Run the schema and dataset integrity verification suite:
python -m pytest tests/test_setup.py -v
```

### Test Isolation Architecture
All automated tests utilize an automated sandbox fixture (`tmp_path / "data"`) that clones the mock JSON datasets into a temporary isolated sandbox for each test session. Any mutations (wishlist toggling, reservation creation, cancellations) are performed purely in the sandbox, ensuring 100% test independence without modifying production master datasets in `data/`.

---

## 🔒 Production Readiness Checklist
- [x] Cross-module routing verified with parameter bindings and 404 fallbacks.
- [x] Exact Airbnb Brand Color (#FF385C) applied to all interactive elements.
- [x] Responsive layout grids scale across mobile, tablet, and desktop viewports.
- [x] Atomic JSON file writes eliminate risk of partial writes.
- [x] End-to-end user journey test suite passes with a 100% pass rate (40/40 tests).
- [x] Git ignore configuration excludes bytecode, cache directories, and temporary artifacts.
