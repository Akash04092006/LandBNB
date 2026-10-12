/**
 * LandBNB - Listing Detail & Checkout Integration Script
 * Manages asymmetric photo lightbox, live pricing engine, guest selector,
 * wishlist toggling, and asynchronous reservation creation.
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Page State & Elements
    // =========================================================================
    const listingId = document.body.dataset.listingId || window.location.pathname.split('/').pop();
    const pricePerNight = parseFloat(document.body.dataset.price) || 0;
    const activeUserId = 'user-001';

    const STANDARD_CLEANING_FEE = 75.00;
    const STANDARD_SERVICE_FEE_RATE = 0.12;

    const state = {
        adults: 1,
        children: 0,
        nights: 4,
        checkInDate: null,
        checkOutDate: null,
        isWishlisted: false
    };

    // DOM References
    const detailCheckIn = document.getElementById('detailCheckIn');
    const detailCheckOut = document.getElementById('detailCheckOut');
    const detailCalcFormula = document.getElementById('detailCalcFormula');
    const detailCalcAccommodation = document.getElementById('detailCalcAccommodation');
    const detailCalcServiceFee = document.getElementById('detailCalcServiceFee');
    const detailCalcTotal = document.getElementById('detailCalcTotal');
    const btnSubmitReservation = document.getElementById('btnSubmitReservation');
    const detailConfirmationBox = document.getElementById('detailConfirmationBox');
    const detailConfirmationDetails = document.getElementById('detailConfirmationDetails');

    // Guest Selector
    const btnDetailGuestTrigger = document.getElementById('btnDetailGuestTrigger');
    const detailGuestDropdown = document.getElementById('detailGuestDropdown');
    const btnCloseGuestDropdown = document.getElementById('btnCloseGuestDropdown');
    const detailGuestLabel = document.getElementById('detailGuestLabel');
    const valAdults = document.getElementById('valAdults');
    const valChildren = document.getElementById('valChildren');
    const decAdults = document.getElementById('decAdults');
    const incAdults = document.getElementById('incAdults');
    const decChildren = document.getElementById('decChildren');
    const incChildren = document.getElementById('incChildren');

    // Lightbox Gallery
    const btnOpenLightbox = document.getElementById('btnOpenLightbox');
    const lightboxModal = document.getElementById('lightboxModal');
    const btnCloseLightbox = document.getElementById('btnCloseLightbox');

    // Share & Wishlist
    const btnShareListing = document.getElementById('btnShareListing');
    const btnDetailWishlist = document.getElementById('btnDetailWishlist');
    const detailHeartIcon = document.getElementById('detailHeartIcon');
    const detailWishlistText = document.getElementById('detailWishlistText');
    const toastNotification = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');

    // Description
    const btnToggleDesc = document.getElementById('btnToggleDesc');
    const descExtraText = document.getElementById('descExtraText');

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        initDefaultDates();
        calculatePricing();
        setupEventListeners();
        checkUserWishlist();
    }

    function initDefaultDates() {
        const today = new Date();
        const defCheckIn = new Date(today);
        defCheckIn.setDate(today.getDate() + 14);

        const defCheckOut = new Date(defCheckIn);
        defCheckOut.setDate(defCheckIn.getDate() + 4);

        detailCheckIn.value = defCheckIn.toISOString().split('T')[0];
        detailCheckOut.value = defCheckOut.toISOString().split('T')[0];

        state.checkInDate = detailCheckIn.value;
        state.checkOutDate = detailCheckOut.value;
    }

    // =========================================================================
    // Dynamic Pricing Calculation
    // =========================================================================
    function calculatePricing() {
        const dIn = new Date(detailCheckIn.value);
        const dOut = new Date(detailCheckOut.value);

        if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut <= dIn) {
            detailCalcFormula.textContent = 'Invalid date selection';
            detailCalcAccommodation.textContent = '$0.00';
            detailCalcServiceFee.textContent = '$0.00';
            detailCalcTotal.textContent = '$0.00';
            btnSubmitReservation.disabled = true;
            btnSubmitReservation.classList.add('opacity-50', 'cursor-not-allowed');
            return;
        }

        btnSubmitReservation.disabled = false;
        btnSubmitReservation.classList.remove('opacity-50', 'cursor-not-allowed');

        const nights = Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
        state.nights = nights;
        state.checkInDate = detailCheckIn.value;
        state.checkOutDate = detailCheckOut.value;

        const accommodation = nights * pricePerNight;
        const service = Math.round(accommodation * STANDARD_SERVICE_FEE_RATE * 100) / 100;
        const total = accommodation + STANDARD_CLEANING_FEE + service;

        detailCalcFormula.textContent = `$${pricePerNight} x ${nights} night${nights === 1 ? '' : 's'}`;
        detailCalcAccommodation.textContent = `$${accommodation.toFixed(2)}`;
        detailCalcServiceFee.textContent = `$${service.toFixed(2)}`;
        detailCalcTotal.textContent = `$${total.toFixed(2)}`;
    }

    // =========================================================================
    // Event Handlers
    // =========================================================================
    function setupEventListeners() {
        // Date Change Events
        detailCheckIn.addEventListener('change', calculatePricing);
        detailCheckOut.addEventListener('change', calculatePricing);

        // Guest Selector Dropdown Toggle
        btnDetailGuestTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            detailGuestDropdown.classList.toggle('hidden');
        });

        btnCloseGuestDropdown.addEventListener('click', () => {
            detailGuestDropdown.classList.add('hidden');
        });

        document.addEventListener('click', (e) => {
            if (!detailGuestDropdown.contains(e.target) && !btnDetailGuestTrigger.contains(e.target)) {
                detailGuestDropdown.classList.add('hidden');
            }
        });

        // Guest Increment/Decrement
        incAdults.addEventListener('click', () => {
            state.adults++;
            updateGuestCounts();
        });
        decAdults.addEventListener('click', () => {
            if (state.adults > 1) {
                state.adults--;
                updateGuestCounts();
            }
        });
        incChildren.addEventListener('click', () => {
            state.children++;
            updateGuestCounts();
        });
        decChildren.addEventListener('click', () => {
            if (state.children > 0) {
                state.children--;
                updateGuestCounts();
            }
        });

        // Lightbox Gallery Modal
        btnOpenLightbox.addEventListener('click', openLightbox);
        btnCloseLightbox.addEventListener('click', closeLightbox);

        // Clicking any photo in the mosaic opens lightbox
        for (let i = 0; i <= 4; i++) {
            const img = document.getElementById(`mosaicImg${i}`);
            if (img) {
                img.addEventListener('click', openLightbox);
            }
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightboxModal.classList.contains('hidden')) {
                closeLightbox();
            }
        });

        // Share Button (Copy Link)
        btnShareListing.addEventListener('click', () => {
            if (navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                showToast('Listing URL copied to clipboard!');
            } else {
                showToast('Link ready: ' + window.location.href);
            }
        });

        // Wishlist Toggle
        btnDetailWishlist.addEventListener('click', toggleWishlist);

        // Expandable Description Toggle
        btnToggleDesc.addEventListener('click', () => {
            const isExpanded = !descExtraText.classList.contains('hidden');
            if (isExpanded) {
                descExtraText.classList.add('hidden');
                btnToggleDesc.innerHTML = '<span>Show more</span> <span>›</span>';
            } else {
                descExtraText.classList.remove('hidden');
                btnToggleDesc.innerHTML = '<span>Show less</span> <span>‹</span>';
            }
        });

        // Reserve Action
        btnSubmitReservation.addEventListener('click', submitReservation);
    }

    function updateGuestCounts() {
        valAdults.textContent = state.adults;
        valChildren.textContent = state.children;

        const total = state.adults + state.children;
        detailGuestLabel.textContent = `${total} guest${total === 1 ? '' : 's'}`;

        decAdults.disabled = state.adults <= 1;
        decChildren.disabled = state.children <= 0;
    }

    // =========================================================================
    // Lightbox Gallery
    // =========================================================================
    function openLightbox() {
        lightboxModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightboxModal.classList.add('hidden');
        document.body.style.overflow = '';
    }

    // =========================================================================
    // Wishlist Integration
    // =========================================================================
    async function checkUserWishlist() {
        try {
            const res = await fetch(`/api/users/${activeUserId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.user) {
                const list = (data.user.wishlist || []).map(String);
                state.isWishlisted = list.includes(String(listingId));
                updateHeartDisplay();
            }
        } catch (e) {
            console.error('Error fetching user wishlist:', e);
        }
    }

    async function toggleWishlist() {
        try {
            detailHeartIcon.classList.add('heart-pop');
            setTimeout(() => detailHeartIcon.classList.remove('heart-pop'), 350);

            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: activeUserId,
                    listing_id: listingId
                })
            });

            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                state.isWishlisted = (data.action === 'added');
                updateHeartDisplay();
                showToast(data.message || (state.isWishlisted ? 'Saved to your wishlist' : 'Removed from wishlist'));
            }
        } catch (e) {
            console.error('Wishlist toggle error:', e);
        }
    }

    function updateHeartDisplay() {
        if (state.isWishlisted) {
            detailHeartIcon.setAttribute('fill', '#FF385C');
            detailHeartIcon.setAttribute('stroke', '#FF385C');
            detailWishlistText.textContent = 'Saved';
        } else {
            detailHeartIcon.setAttribute('fill', 'none');
            detailHeartIcon.setAttribute('stroke', 'currentColor');
            detailWishlistText.textContent = 'Save';
        }
    }

    // =========================================================================
    // Reservation Checkout Flow (Navigate to /checkout)
    // =========================================================================
    function submitReservation() {
        const checkIn = detailCheckIn.value;
        const checkOut = detailCheckOut.value;
        const guests = state.adults + state.children;
        window.location.href = `/checkout?listing_id=${listingId}&check_in=${checkIn}&check_out=${checkOut}&guests=${guests}`;
    }

    // =========================================================================
    // Toast Notification Utility
    // =========================================================================
    function showToast(msg) {
        toastMessage.textContent = msg;
        toastNotification.classList.remove('opacity-0');
        toastNotification.classList.add('opacity-100');

        setTimeout(() => {
            toastNotification.classList.remove('opacity-100');
            toastNotification.classList.add('opacity-0');
        }, 2800);
    }

    init();
});
