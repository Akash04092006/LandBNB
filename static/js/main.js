/**
 * LandBNB - Modern Airbnb Client Application Architecture
 * Handles reactive state management, asynchronous REST API querying,
 * search popovers, multi-date calendar, interactive carousels, and reservation workflows.
 */

document.addEventListener('DOMContentLoaded', () => {
    // =========================================================================
    // Application State
    // =========================================================================
    const state = {
        activeUserId: 'user-001',
        currentUser: null,
        userWishlistSet: new Set(),
        allListings: [],
        currentCategory: 'All',
        searchLocation: '',
        checkInDate: null,
        checkOutDate: null,
        guestCounts: {
            adults: 1,
            children: 0,
            infants: 0,
            pets: 0
        },
        minPrice: null,
        maxPrice: null,
        selectedAmenities: new Set(),
        calendarYear: 2026,
        calendarMonth: 10, // 0-indexed: 10 = November 2026
        carouselIndices: {},
        activeListingDetail: null
    };

    // Standard Pricing Configuration (synchronized with backend)
    const STANDARD_CLEANING_FEE = 75.00;
    const STANDARD_SERVICE_FEE_RATE = 0.12;

    // =========================================================================
    // DOM Elements Cache
    // =========================================================================
    const mainHeader = document.getElementById('mainHeader');
    const listingsGrid = document.getElementById('listingsGrid');
    const emptyState = document.getElementById('emptyState');
    const resultsCountBadge = document.getElementById('resultsCountBadge');

    // Search Pill & Popovers
    const searchBarPill = document.getElementById('searchBarPill');
    const triggerWhere = document.getElementById('triggerWhere');
    const triggerWhen = document.getElementById('triggerWhen');
    const triggerWho = document.getElementById('triggerWho');
    const inputWhere = document.getElementById('inputWhere');
    const displayWhen = document.getElementById('displayWhen');
    const displayWho = document.getElementById('displayWho');
    const btnSearchSubmit = document.getElementById('btnSearchSubmit');

    const popoverWhere = document.getElementById('popoverWhere');
    const popoverWhen = document.getElementById('popoverWhen');
    const popoverWho = document.getElementById('popoverWho');

    // Calendar Elements
    const calendarMonthTitle = document.getElementById('calendarMonthTitle');
    const calendarDaysGrid = document.getElementById('calendarDaysGrid');
    const btnPrevMonth = document.getElementById('btnPrevMonth');
    const btnNextMonth = document.getElementById('btnNextMonth');
    const btnClearDates = document.getElementById('btnClearDates');
    const btnApplyDates = document.getElementById('btnApplyDates');
    const chipThisWeekend = document.getElementById('chipThisWeekend');
    const chipNextWeek = document.getElementById('chipNextWeek');

    // Guest Counter Elements
    const countAdults = document.getElementById('countAdults');
    const countChildren = document.getElementById('countChildren');
    const countInfants = document.getElementById('countInfants');
    const countPets = document.getElementById('countPets');
    const btnClearGuests = document.getElementById('btnClearGuests');
    const btnApplyGuests = document.getElementById('btnApplyGuests');

    // User Menu Elements
    const btnUserMenu = document.getElementById('btnUserMenu');
    const userDropdownMenu = document.getElementById('userDropdownMenu');
    const userAvatar = document.getElementById('userAvatar');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const userEmailDisplay = document.getElementById('userEmailDisplay');
    const userBookingsBadge = document.getElementById('userBookingsBadge');
    const userWishlistBadge = document.getElementById('userWishlistBadge');
    const menuItemTrips = document.getElementById('menuItemTrips');
    const menuItemWishlist = document.getElementById('menuItemWishlist');

    // Category Elements
    const categoryContainer = document.getElementById('categoryContainer');
    const btnScrollCatLeft = document.getElementById('btnScrollCatLeft');
    const btnScrollCatRight = document.getElementById('btnScrollCatRight');

    // Filters Modal Elements
    const btnOpenFilters = document.getElementById('btnOpenFilters');
    const filtersModal = document.getElementById('filtersModal');
    const btnCloseFilters = document.getElementById('btnCloseFilters');
    const filterMinPrice = document.getElementById('filterMinPrice');
    const filterMaxPrice = document.getElementById('filterMaxPrice');
    const btnClearModalFilters = document.getElementById('btnClearModalFilters');
    const btnApplyModalFilters = document.getElementById('btnApplyModalFilters');
    const activeFiltersBadge = document.getElementById('activeFiltersBadge');
    const activeFiltersTags = document.getElementById('activeFiltersTags');
    const btnClearAllFilters = document.getElementById('btnClearAllFilters');
    const btnResetSearch = document.getElementById('btnResetSearch');

    // Detail & Booking Modal Elements
    const listingDetailModal = document.getElementById('listingDetailModal');
    const btnCloseDetailModal = document.getElementById('btnCloseDetailModal');
    const modalListingTitle = document.getElementById('modalListingTitle');
    const modalListingRating = document.getElementById('modalListingRating');
    const modalListingReviewsCount = document.getElementById('modalListingReviewsCount');
    const modalListingLocation = document.getElementById('modalListingLocation');
    const modalListingDesc = document.getElementById('modalListingDesc');
    const modalHostHeader = document.getElementById('modalHostHeader');
    const modalHostAvatar = document.getElementById('modalHostAvatar');
    const modalAmenitiesGrid = document.getElementById('modalAmenitiesGrid');
    const modalReviewsList = document.getElementById('modalReviewsList');
    const modalReviewsHeader = document.getElementById('modalReviewsHeader');
    const modalPricePerNight = document.getElementById('modalPricePerNight');
    const modalBookingRating = document.getElementById('modalBookingRating');
    const btnDetailWishlistHeart = document.getElementById('btnDetailWishlistHeart');

    const modalGalleryMain = document.getElementById('modalGalleryMain');
    const modalGalleryImg1 = document.getElementById('modalGalleryImg1');
    const modalGalleryImg2 = document.getElementById('modalGalleryImg2');
    const modalGalleryImg3 = document.getElementById('modalGalleryImg3');
    const modalGalleryImg4 = document.getElementById('modalGalleryImg4');

    const bookingInputCheckIn = document.getElementById('bookingInputCheckIn');
    const bookingInputCheckOut = document.getElementById('bookingInputCheckOut');
    const bookingGuestsDisplay = document.getElementById('bookingGuestsDisplay');
    const calcNightsLabel = document.getElementById('calcNightsLabel');
    const calcAccommodationCost = document.getElementById('calcAccommodationCost');
    const calcServiceFee = document.getElementById('calcServiceFee');
    const calcTotalPrice = document.getElementById('calcTotalPrice');
    const btnSubmitReservation = document.getElementById('btnSubmitReservation');
    const bookingSuccessBanner = document.getElementById('bookingSuccessBanner');
    const bookingConfirmationText = document.getElementById('bookingConfirmationText');

    // Bookings & Wishlist Modals
    const userBookingsModal = document.getElementById('userBookingsModal');
    const btnCloseBookingsModal = document.getElementById('btnCloseBookingsModal');
    const userBookingsList = document.getElementById('userBookingsList');

    const userWishlistModal = document.getElementById('userWishlistModal');
    const btnCloseWishlistModal = document.getElementById('btnCloseWishlistModal');
    const userWishlistContent = document.getElementById('userWishlistContent');

    // =========================================================================
    // Core Initialization
    // =========================================================================
    async function init() {
        setupScrollHeader();
        setupSearchPopovers();
        setupCalendar();
        setupGuestCounters();
        setupCategoryScroll();
        setupFiltersModal();
        setupModals();
        
        await loadUserData();
        await fetchAndRenderListings();
    }

    // Sticky Header Scroll Shadow
    function setupScrollHeader() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 15) {
                mainHeader.classList.add('shadow-sm');
            } else {
                mainHeader.classList.remove('shadow-sm');
            }
        });
    }

    // =========================================================================
    // User Data & Wishlist Management
    // =========================================================================
    async function loadUserData() {
        try {
            const res = await fetch(`/api/users/${state.activeUserId}`);
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.user) {
                state.currentUser = data.user;
                userNameDisplay.textContent = data.user.name;
                userEmailDisplay.textContent = data.user.email;
                if (data.user.profile_image) {
                    userAvatar.src = data.user.profile_image;
                }
                state.userWishlistSet = new Set((data.user.wishlist || []).map(String));
                updateWishlistBadges();
            }

            // Also load user bookings count
            const bRes = await fetch('/api/bookings');
            if (bRes.ok) {
                const bData = await bRes.json();
                if (bData.success) {
                    const myBookings = bData.bookings.filter(b => b.user_id === state.activeUserId);
                    userBookingsBadge.textContent = myBookings.length;
                }
            }
        } catch (err) {
            console.error('Error loading user profile:', err);
        }
    }

    function updateWishlistBadges() {
        if (userWishlistBadge) {
            userWishlistBadge.textContent = state.userWishlistSet.size;
        }
    }

    async function handleWishlistToggle(listingId, heartButton) {
        try {
            // Heart pop animation
            heartButton.classList.add('heart-pop');
            setTimeout(() => heartButton.classList.remove('heart-pop'), 350);

            const res = await fetch('/api/wishlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: state.activeUserId,
                    listing_id: listingId
                })
            });

            if (!res.ok) return;
            const data = await res.json();
            if (data.success) {
                state.userWishlistSet = new Set(data.wishlist.map(String));
                updateWishlistBadges();
                updateAllHeartButtons(listingId, data.action === 'added');
            }
        } catch (err) {
            console.error('Error toggling wishlist:', err);
        }
    }

    function updateAllHeartButtons(listingId, isLiked) {
        const buttons = document.querySelectorAll(`.wishlist-btn[data-id="${listingId}"]`);
        buttons.forEach(btn => {
            const svg = btn.querySelector('.heart-icon');
            if (isLiked) {
                svg.setAttribute('fill', '#FF385C');
                svg.setAttribute('stroke', '#FF385C');
            } else {
                svg.setAttribute('fill', 'rgba(0, 0, 0, 0.45)');
                svg.setAttribute('stroke', '#FFFFFF');
            }
        });

        // Also update detail modal heart if active
        if (state.activeListingDetail && String(state.activeListingDetail.id) === String(listingId)) {
            const modalSvg = btnDetailWishlistHeart.querySelector('.heart-icon');
            if (isLiked) {
                modalSvg.setAttribute('fill', '#FF385C');
                modalSvg.setAttribute('stroke', '#FF385C');
            } else {
                modalSvg.setAttribute('fill', 'none');
                modalSvg.setAttribute('stroke', 'currentColor');
            }
        }
    }

    // =========================================================================
    // REST API Listings Fetching & Query Parameters
    // =========================================================================
    async function fetchAndRenderListings() {
        // Show loading state skeleton
        listingsGrid.innerHTML = `
            <div class="col-span-full py-16 text-center text-airbnb-gray">
                <div class="inline-block w-8 h-8 border-3 border-brand border-t-transparent rounded-full animate-spin mb-3"></div>
                <div class="text-sm font-semibold">Discovering authentic stays...</div>
            </div>
        `;

        try {
            const params = new URLSearchParams();

            // 1. Category Filter
            if (state.currentCategory && state.currentCategory !== 'All') {
                params.append('category', state.currentCategory);
            }

            // 2. Location Search
            if (state.searchLocation) {
                params.append('location', state.searchLocation);
            }

            // 3. Price Range Filters
            if (state.minPrice !== null && state.minPrice > 0) {
                params.append('min_price', state.minPrice);
            }
            if (state.maxPrice !== null && state.maxPrice > 0) {
                params.append('max_price', state.maxPrice);
            }

            // 4. Amenities Filter
            if (state.selectedAmenities.size > 0) {
                params.append('amenities', Array.from(state.selectedAmenities).join(','));
            }

            const url = `/api/listings?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to retrieve listings');

            const data = await res.json();
            state.allListings = data.listings || [];

            renderListings(state.allListings);
            updateFiltersBadge();
        } catch (err) {
            console.error('Fetch listings error:', err);
            listingsGrid.innerHTML = `
                <div class="col-span-full py-12 text-center text-red-500 text-sm">
                    Unable to load stays at this moment. Please refresh the page.
                </div>
            `;
        }
    }

    function renderListings(listings) {
        if (!listings || listings.length === 0) {
            listingsGrid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            resultsCountBadge.textContent = '(0 properties)';
            return;
        }

        listingsGrid.classList.remove('hidden');
        emptyState.classList.add('hidden');
        resultsCountBadge.textContent = `(${listings.length} ${listings.length === 1 ? 'property' : 'properties'})`;

        listingsGrid.innerHTML = '';
        listings.forEach(item => {
            const card = createListingCard(item);
            listingsGrid.appendChild(card);
        });
    }

    // =========================================================================
    // Property Card Component Construction
    // =========================================================================
    function createListingCard(item) {
        const listingId = String(item.id);
        if (!(listingId in state.carouselIndices)) {
            state.carouselIndices[listingId] = 0;
        }

        const isLiked = state.userWishlistSet.has(listingId);
        const images = Array.isArray(item.images) && item.images.length > 0
            ? item.images
            : ['https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=800&q=80'];

        const card = document.createElement('article');
        card.className = 'listing-card group flex flex-col cursor-pointer transition-transform duration-200';
        card.setAttribute('data-id', listingId);

        card.innerHTML = `
            <!-- Image Carousel Container -->
            <div class="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-100 mb-3 select-none">
                <img class="carousel-img w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" 
                     src="${images[0]}" 
                     alt="${item.title}" 
                     loading="lazy">

                <!-- Category Badge -->
                <span class="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-airbnb-dark px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    ${item.category}
                </span>

                <!-- Wishlist Heart Button -->
                <button type="button" 
                        class="wishlist-btn absolute top-3 right-3 p-1.5 rounded-full hover:scale-110 active:scale-90 transition-transform z-10" 
                        data-id="${listingId}" 
                        title="Save to wishlist">
                    <svg class="heart-icon w-6 h-6 transition-colors duration-200 drop-shadow-md" 
                         viewBox="0 0 24 24" 
                         fill="${isLiked ? '#FF385C' : 'rgba(0, 0, 0, 0.45)'}" 
                         stroke="${isLiked ? '#FF385C' : '#FFFFFF'}" 
                         stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>

                <!-- Left Navigation Chevron -->
                <button type="button" 
                        class="carousel-nav-btn carousel-prev absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 shadow-md flex items-center justify-center text-airbnb-dark z-10 hover:bg-white" 
                        data-id="${listingId}"
                        title="Previous photo">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/></svg>
                </button>

                <!-- Right Navigation Chevron -->
                <button type="button" 
                        class="carousel-nav-btn carousel-next absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/85 shadow-md flex items-center justify-center text-airbnb-dark z-10 hover:bg-white" 
                        data-id="${listingId}"
                        title="Next photo">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
                </button>

                <!-- Carousel Pagination Dots -->
                <div class="carousel-dots absolute bottom-2.5 left-0 right-0 flex items-center justify-center gap-1.5 z-10 pointer-events-none">
                    ${images.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}
                </div>
            </div>

            <!-- Card Information Details -->
            <div class="flex flex-col gap-0.5 text-xs">
                <div class="flex justify-between items-baseline font-bold text-airbnb-dark">
                    <span class="truncate text-sm pr-2">${item.location}</span>
                    <span class="flex items-center gap-1 flex-shrink-0">
                        <span class="text-brand">★</span>
                        <span>${Number(item.rating).toFixed(2)}</span>
                    </span>
                </div>
                <div class="text-airbnb-gray truncate">${item.category} · Hosted by ${item.host_name}</div>
                <div class="text-airbnb-gray font-medium">Available Nov 5 – 10</div>
                <div class="mt-1 flex items-baseline gap-1">
                    <span class="text-sm font-extrabold text-airbnb-dark">$${item.price_per_night}</span>
                    <span class="text-airbnb-gray">night</span>
                </div>
            </div>
        `;

        // Card Click navigates to dedicated Listing Detail Page
        card.addEventListener('click', () => {
            window.location.href = `/listings/${listingId}`;
        });

        // Wishlist Button Handler
        const wishlistBtn = card.querySelector('.wishlist-btn');
        wishlistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleWishlistToggle(listingId, wishlistBtn);
        });

        // Carousel Previous Button
        const prevBtn = card.querySelector('.carousel-prev');
        prevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleCarouselImage(card, listingId, images, -1);
        });

        // Carousel Next Button
        const nextBtn = card.querySelector('.carousel-next');
        nextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleCarouselImage(card, listingId, images, 1);
        });

        return card;
    }

    function cycleCarouselImage(cardElement, listingId, images, direction) {
        let currentIndex = state.carouselIndices[listingId] || 0;
        currentIndex = (currentIndex + direction + images.length) % images.length;
        state.carouselIndices[listingId] = currentIndex;

        const imgElement = cardElement.querySelector('.carousel-img');
        imgElement.src = images[currentIndex];

        const dots = cardElement.querySelectorAll('.carousel-dot');
        dots.forEach((dot, idx) => {
            if (idx === currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    // =========================================================================
    // Search Popover Toggle Controls & Suggestions
    // =========================================================================
    function setupSearchPopovers() {
        // Toggle Where
        triggerWhere.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePopover(popoverWhere, triggerWhere);
        });

        // Toggle When
        triggerWhen.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePopover(popoverWhen, triggerWhen);
        });

        // Toggle Who
        triggerWho.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePopover(popoverWho, triggerWho);
        });

        // Destination Tiles Click
        document.querySelectorAll('.destination-tile').forEach(tile => {
            tile.addEventListener('click', (e) => {
                e.stopPropagation();
                const dest = tile.getAttribute('data-destination');
                state.searchLocation = dest;
                inputWhere.value = dest || 'Anywhere';
                closeAllPopovers();
                fetchAndRenderListings();
            });
        });

        // Search Submit Action Button
        btnSearchSubmit.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllPopovers();
            fetchAndRenderListings();
        });

        // User Menu Pill Toggle
        btnUserMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdownMenu.classList.toggle('hidden');
        });

        // Click Outside to Dismiss All Popovers & Dropdowns
        document.addEventListener('click', (e) => {
            if (!searchBarPill.contains(e.target) && 
                !popoverWhere.contains(e.target) && 
                !popoverWhen.contains(e.target) && 
                !popoverWho.contains(e.target)) {
                closeAllPopovers();
            }
            if (!btnUserMenu.contains(e.target) && !userDropdownMenu.contains(e.target)) {
                userDropdownMenu.classList.add('hidden');
            }
        });
    }

    function togglePopover(targetPopover, activeTrigger) {
        const isCurrentlyOpen = !targetPopover.classList.contains('hidden');
        closeAllPopovers();

        if (!isCurrentlyOpen) {
            targetPopover.classList.remove('hidden');
            activeTrigger.classList.add('active');
        }
    }

    function closeAllPopovers() {
        popoverWhere.classList.add('hidden');
        popoverWhen.classList.add('hidden');
        popoverWho.classList.add('hidden');
        triggerWhere.classList.remove('active');
        triggerWhen.classList.remove('active');
        triggerWho.classList.remove('active');
    }

    // =========================================================================
    // Interactive Multi-Date Calendar
    // =========================================================================
    function setupCalendar() {
        renderCalendarDays();

        btnPrevMonth.addEventListener('click', (e) => {
            e.stopPropagation();
            state.calendarMonth--;
            if (state.calendarMonth < 0) {
                state.calendarMonth = 11;
                state.calendarYear--;
            }
            renderCalendarDays();
        });

        btnNextMonth.addEventListener('click', (e) => {
            e.stopPropagation();
            state.calendarMonth++;
            if (state.calendarMonth > 11) {
                state.calendarMonth = 0;
                state.calendarYear++;
            }
            renderCalendarDays();
        });

        btnClearDates.addEventListener('click', (e) => {
            e.stopPropagation();
            state.checkInDate = null;
            state.checkOutDate = null;
            displayWhen.textContent = 'Add dates';
            renderCalendarDays();
        });

        btnApplyDates.addEventListener('click', (e) => {
            e.stopPropagation();
            updateWhenDisplayLabel();
            closeAllPopovers();
            fetchAndRenderListings();
        });

        chipThisWeekend.addEventListener('click', (e) => {
            e.stopPropagation();
            // Set weekend dates: Nov 6 to Nov 8, 2026
            state.checkInDate = '2026-11-06';
            state.checkOutDate = '2026-11-08';
            updateWhenDisplayLabel();
            renderCalendarDays();
        });

        chipNextWeek.addEventListener('click', (e) => {
            e.stopPropagation();
            state.checkInDate = '2026-11-09';
            state.checkOutDate = '2026-11-15';
            updateWhenDisplayLabel();
            renderCalendarDays();
        });
    }

    function renderCalendarDays() {
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        calendarMonthTitle.textContent = `${monthNames[state.calendarMonth]} ${state.calendarYear}`;
        calendarDaysGrid.innerHTML = '';

        const firstDayIndex = new Date(state.calendarYear, state.calendarMonth, 1).getDay();
        const totalDaysInMonth = new Date(state.calendarYear, state.calendarMonth + 1, 0).getDate();

        // Empty padding cells
        for (let i = 0; i < firstDayIndex; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'w-10 h-10';
            calendarDaysGrid.appendChild(emptyCell);
        }

        // Days of current month
        for (let day = 1; day <= totalDaysInMonth; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'calendar-day mx-auto';
            dayCell.textContent = day;

            const dateStr = `${state.calendarYear}-${String(state.calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            // Styling based on check-in / check-out selection range
            if (state.checkInDate && dateStr === state.checkInDate) {
                dayCell.classList.add('range-start');
            } else if (state.checkOutDate && dateStr === state.checkOutDate) {
                dayCell.classList.add('range-end');
            } else if (state.checkInDate && state.checkOutDate && dateStr > state.checkInDate && dateStr < state.checkOutDate) {
                dayCell.classList.add('in-range');
            }

            dayCell.addEventListener('click', (e) => {
                e.stopPropagation();
                handleDateCellClick(dateStr);
            });

            calendarDaysGrid.appendChild(dayCell);
        }
    }

    function handleDateCellClick(dateStr) {
        if (!state.checkInDate || (state.checkInDate && state.checkOutDate)) {
            state.checkInDate = dateStr;
            state.checkOutDate = null;
        } else if (state.checkInDate && !state.checkOutDate) {
            if (dateStr > state.checkInDate) {
                state.checkOutDate = dateStr;
            } else {
                state.checkInDate = dateStr;
                state.checkOutDate = null;
            }
        }
        updateWhenDisplayLabel();
        renderCalendarDays();
    }

    function updateWhenDisplayLabel() {
        if (state.checkInDate && state.checkOutDate) {
            const d1 = new Date(state.checkInDate);
            const d2 = new Date(state.checkOutDate);
            const m1 = d1.toLocaleString('default', { month: 'short' });
            const m2 = d2.toLocaleString('default', { month: 'short' });
            displayWhen.textContent = `${m1} ${d1.getDate()} – ${m2} ${d2.getDate()}`;
        } else if (state.checkInDate) {
            const d1 = new Date(state.checkInDate);
            displayWhen.textContent = `${d1.toLocaleString('default', { month: 'short' })} ${d1.getDate()} – ...`;
        } else {
            displayWhen.textContent = 'Add dates';
        }
    }

    // =========================================================================
    // Interactive Guest Counter Selector
    // =========================================================================
    function setupGuestCounters() {
        document.querySelectorAll('.guest-btn-inc').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.getAttribute('data-type');
                state.guestCounts[type]++;
                updateGuestCountersDisplay();
            });
        });

        document.querySelectorAll('.guest-btn-dec').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const type = btn.getAttribute('data-type');
                const min = type === 'adults' ? 1 : 0;
                if (state.guestCounts[type] > min) {
                    state.guestCounts[type]--;
                    updateGuestCountersDisplay();
                }
            });
        });

        btnClearGuests.addEventListener('click', (e) => {
            e.stopPropagation();
            state.guestCounts = { adults: 1, children: 0, infants: 0, pets: 0 };
            updateGuestCountersDisplay();
            displayWho.textContent = 'Add guests';
        });

        btnApplyGuests.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllPopovers();
        });
    }

    function updateGuestCountersDisplay() {
        countAdults.textContent = state.guestCounts.adults;
        countChildren.textContent = state.guestCounts.children;
        countInfants.textContent = state.guestCounts.infants;
        countPets.textContent = state.guestCounts.pets;

        const totalGuests = state.guestCounts.adults + state.guestCounts.children;
        let label = `${totalGuests} ${totalGuests === 1 ? 'guest' : 'guests'}`;
        if (state.guestCounts.infants > 0) {
            label += `, ${state.guestCounts.infants} infant`;
        }
        if (state.guestCounts.pets > 0) {
            label += `, ${state.guestCounts.pets} pet`;
        }

        displayWho.textContent = label;
        bookingGuestsDisplay.textContent = label;

        // Manage disabled states
        document.querySelectorAll('.guest-btn-dec').forEach(btn => {
            const type = btn.getAttribute('data-type');
            const min = type === 'adults' ? 1 : 0;
            btn.disabled = state.guestCounts[type] <= min;
        });
    }

    // =========================================================================
    // Category Filter Bar & Horizontal Scrolling
    // =========================================================================
    function setupCategoryScroll() {
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                categoryItems.forEach(c => c.classList.remove('active'));
                item.classList.add('active');

                const selectedCat = item.getAttribute('data-category');
                state.currentCategory = selectedCat;
                fetchAndRenderListings();
            });
        });

        // Horizontal scroll chevrons
        const checkScrollButtons = () => {
            const sl = categoryContainer.scrollLeft;
            const maxScroll = categoryContainer.scrollWidth - categoryContainer.clientWidth;
            btnScrollCatLeft.style.display = sl > 10 ? 'flex' : 'none';
            btnScrollCatRight.style.display = sl < maxScroll - 10 ? 'flex' : 'none';
        };

        categoryContainer.addEventListener('scroll', checkScrollButtons);
        btnScrollCatLeft.addEventListener('click', () => {
            categoryContainer.scrollBy({ left: -240, behavior: 'smooth' });
        });
        btnScrollCatRight.addEventListener('click', () => {
            categoryContainer.scrollBy({ left: 240, behavior: 'smooth' });
        });

        // Initial check
        setTimeout(checkScrollButtons, 100);
    }

    // =========================================================================
    // Filters Modal (Price & Amenities)
    // =========================================================================
    function setupFiltersModal() {
        btnOpenFilters.addEventListener('click', () => {
            filtersModal.classList.remove('hidden');
        });

        btnCloseFilters.addEventListener('click', () => {
            filtersModal.classList.add('hidden');
        });

        btnClearModalFilters.addEventListener('click', () => {
            filterMinPrice.value = '';
            filterMaxPrice.value = '';
            document.querySelectorAll('.filter-amenity-checkbox').forEach(cb => cb.checked = false);
            state.minPrice = null;
            state.maxPrice = null;
            state.selectedAmenities.clear();
        });

        btnApplyModalFilters.addEventListener('click', () => {
            const min = parseFloat(filterMinPrice.value);
            const max = parseFloat(filterMaxPrice.value);
            state.minPrice = !isNaN(min) && min >= 0 ? min : null;
            state.maxPrice = !isNaN(max) && max >= 0 ? max : null;

            state.selectedAmenities.clear();
            document.querySelectorAll('.filter-amenity-checkbox:checked').forEach(cb => {
                state.selectedAmenities.add(cb.value);
            });

            filtersModal.classList.add('hidden');
            fetchAndRenderListings();
        });

        btnClearAllFilters.addEventListener('click', resetAllFilters);
        btnResetSearch.addEventListener('click', resetAllFilters);
    }

    function resetAllFilters() {
        state.searchLocation = '';
        state.currentCategory = 'All';
        state.minPrice = null;
        state.maxPrice = null;
        state.selectedAmenities.clear();
        inputWhere.value = '';

        document.querySelectorAll('.category-item').forEach(c => {
            if (c.getAttribute('data-category') === 'All') {
                c.classList.add('active');
            } else {
                c.classList.remove('active');
            }
        });

        fetchAndRenderListings();
    }

    function updateFiltersBadge() {
        let activeCount = 0;
        if (state.minPrice !== null) activeCount++;
        if (state.maxPrice !== null) activeCount++;
        activeCount += state.selectedAmenities.size;

        if (activeCount > 0) {
            activeFiltersBadge.textContent = activeCount;
            activeFiltersBadge.classList.remove('hidden');
            activeFiltersTags.classList.remove('hidden');
        } else {
            activeFiltersBadge.classList.add('hidden');
            activeFiltersTags.classList.add('hidden');
        }
    }

    // =========================================================================
    // Listing Detail Modal & Interactive Booking Engine
    // =========================================================================
    function setupModals() {
        btnCloseDetailModal.addEventListener('click', () => {
            listingDetailModal.classList.add('hidden');
            bookingSuccessBanner.classList.add('hidden');
        });

        // Detail Wishlist Heart Toggle
        btnDetailWishlistHeart.addEventListener('click', () => {
            if (state.activeListingDetail) {
                handleWishlistToggle(String(state.activeListingDetail.id), btnDetailWishlistHeart);
            }
        });

        // Date Pickers Change inside Booking Box
        bookingInputCheckIn.addEventListener('change', calculateBookingPrice);
        bookingInputCheckOut.addEventListener('change', calculateBookingPrice);

        // Submit Reservation Button
        btnSubmitReservation.addEventListener('click', submitBookingReservation);

        // Trips & Wishlist Modals
        menuItemTrips.addEventListener('click', openUserBookingsModal);
        btnCloseBookingsModal.addEventListener('click', () => userBookingsModal.classList.add('hidden'));

        menuItemWishlist.addEventListener('click', openUserWishlistModal);
        btnCloseWishlistModal.addEventListener('click', () => userWishlistModal.classList.add('hidden'));
    }

    async function openListingDetailModal(listing) {
        state.activeListingDetail = listing;
        bookingSuccessBanner.classList.add('hidden');

        // Populate basic info
        modalListingTitle.textContent = listing.title;
        modalListingRating.textContent = Number(listing.rating).toFixed(2);
        modalListingReviewsCount.textContent = `${listing.reviews_count} reviews`;
        modalListingLocation.textContent = listing.location;
        modalListingDesc.textContent = listing.description;
        modalHostHeader.textContent = `Hosted by ${listing.host_name}`;
        modalPricePerNight.textContent = `$${listing.price_per_night}`;
        modalBookingRating.textContent = `${Number(listing.rating).toFixed(2)} (${listing.reviews_count})`;

        // Photos mosaic
        const imgs = listing.images || [];
        modalGalleryMain.src = imgs[0] || '';
        modalGalleryImg1.src = imgs[1] || imgs[0] || '';
        modalGalleryImg2.src = imgs[2] || imgs[0] || '';
        modalGalleryImg3.src = imgs[3] || imgs[0] || '';
        modalGalleryImg4.src = imgs[4] || imgs[0] || '';

        // Amenities
        modalAmenitiesGrid.innerHTML = '';
        (listing.amenities || []).forEach(am => {
            const item = document.createElement('div');
            item.className = 'flex items-center gap-2 p-1.5 rounded-lg bg-airbnb-light/60';
            item.innerHTML = `<span>✓</span><span>${am}</span>`;
            modalAmenitiesGrid.appendChild(item);
        });

        // Wishlist button state
        const isLiked = state.userWishlistSet.has(String(listing.id));
        const heartSvg = btnDetailWishlistHeart.querySelector('.heart-icon');
        if (isLiked) {
            heartSvg.setAttribute('fill', '#FF385C');
            heartSvg.setAttribute('stroke', '#FF385C');
        } else {
            heartSvg.setAttribute('fill', 'none');
            heartSvg.setAttribute('stroke', 'currentColor');
        }

        // Initialize Booking Box Dates
        const today = new Date();
        const defCheckIn = new Date(today);
        defCheckIn.setDate(today.getDate() + 14);
        const defCheckOut = new Date(defCheckIn);
        defCheckOut.setDate(defCheckIn.getDate() + 4);

        bookingInputCheckIn.value = state.checkInDate || defCheckIn.toISOString().split('T')[0];
        bookingInputCheckOut.value = state.checkOutDate || defCheckOut.toISOString().split('T')[0];

        calculateBookingPrice();

        // Fetch enriched reviews from backend endpoint
        try {
            const res = await fetch(`/api/listings/${listing.id}`);
            if (res.ok) {
                const detailData = await res.json();
                if (detailData.success && detailData.listing) {
                    renderDetailReviews(detailData.listing.reviews || []);
                    if (detailData.listing.host && detailData.listing.host.profile_image) {
                        modalHostAvatar.src = detailData.listing.host.profile_image;
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching enriched details:', e);
        }

        listingDetailModal.classList.remove('hidden');
    }

    function renderDetailReviews(reviews) {
        modalReviewsHeader.textContent = `${reviews.length} ${reviews.length === 1 ? 'Review' : 'Reviews'}`;
        modalReviewsList.innerHTML = '';

        if (reviews.length === 0) {
            modalReviewsList.innerHTML = '<p class="text-xs text-airbnb-gray italic">No written reviews yet for this listing.</p>';
            return;
        }

        reviews.forEach(r => {
            const div = document.createElement('div');
            div.className = 'p-3 rounded-2xl bg-airbnb-light/50 border border-airbnb-border-light text-xs';
            div.innerHTML = `
                <div class="flex items-center justify-between mb-1.5">
                    <span class="font-bold text-airbnb-dark">${r.user_name}</span>
                    <span class="text-[11px] text-airbnb-gray">${r.date}</span>
                </div>
                <div class="flex items-center gap-1 text-[11px] text-brand mb-1">
                    <span>${'★'.repeat(Math.round(r.rating))}</span>
                    <span class="font-semibold text-airbnb-dark ml-1">${r.rating}</span>
                </div>
                <p class="text-airbnb-gray leading-normal">${r.comment}</p>
            `;
            modalReviewsList.appendChild(div);
        });
    }

    function calculateBookingPrice() {
        if (!state.activeListingDetail) return;

        const dIn = new Date(bookingInputCheckIn.value);
        const dOut = new Date(bookingInputCheckOut.value);

        if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut <= dIn) {
            calcNightsLabel.textContent = 'Invalid date range';
            calcAccommodationCost.textContent = '$0';
            calcServiceFee.textContent = '$0';
            calcTotalPrice.textContent = '$0';
            btnSubmitReservation.disabled = true;
            btnSubmitReservation.classList.add('opacity-50', 'cursor-not-allowed');
            return;
        }

        btnSubmitReservation.disabled = false;
        btnSubmitReservation.classList.remove('opacity-50', 'cursor-not-allowed');

        const nights = Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
        const price = state.activeListingDetail.price_per_night;
        const accommodation = nights * price;
        const service = Math.round(accommodation * STANDARD_SERVICE_FEE_RATE * 100) / 100;
        const total = accommodation + STANDARD_CLEANING_FEE + service;

        calcNightsLabel.textContent = `$${price} x ${nights} nights`;
        calcAccommodationCost.textContent = `$${accommodation.toFixed(2)}`;
        calcServiceFee.textContent = `$${service.toFixed(2)}`;
        calcTotalPrice.textContent = `$${total.toFixed(2)}`;
    }

    async function submitBookingReservation() {
        if (!state.activeListingDetail) return;

        btnSubmitReservation.disabled = true;
        btnSubmitReservation.textContent = 'Confirming...';

        try {
            const payload = {
                listing_id: state.activeListingDetail.id,
                user_id: state.activeUserId,
                check_in: bookingInputCheckIn.value,
                check_out: bookingInputCheckOut.value
            };

            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (data.success && data.booking) {
                bookingSuccessBanner.classList.remove('hidden');
                bookingConfirmationText.textContent = `Receipt #${data.booking.booking_id} · Total: $${data.booking.total_price}`;
                btnSubmitReservation.textContent = 'Reserved!';
                
                // Refresh booking count
                await loadUserData();
            } else {
                alert(`Booking failed: ${data.message || 'Unknown error'}`);
                btnSubmitReservation.textContent = 'Reserve';
                btnSubmitReservation.disabled = false;
            }
        } catch (err) {
            console.error('Reservation error:', err);
            alert('An unexpected error occurred while placing reservation.');
            btnSubmitReservation.textContent = 'Reserve';
            btnSubmitReservation.disabled = false;
        }
    }

    // =========================================================================
    // User Trips / Bookings Modal
    // =========================================================================
    async function openUserBookingsModal() {
        userDropdownMenu.classList.add('hidden');
        userBookingsList.innerHTML = '<p class="text-xs text-airbnb-gray">Loading bookings...</p>';
        userBookingsModal.classList.remove('hidden');

        try {
            const res = await fetch('/api/bookings');
            const data = await res.json();
            if (data.success) {
                const myBookings = data.bookings.filter(b => b.user_id === state.activeUserId);
                if (myBookings.length === 0) {
                    userBookingsList.innerHTML = '<p class="text-xs text-airbnb-gray py-4">No trips booked yet.</p>';
                    return;
                }

                userBookingsList.innerHTML = '';
                myBookings.forEach(b => {
                    const div = document.createElement('div');
                    div.className = 'p-4 rounded-2xl border border-airbnb-border-light bg-airbnb-light/60 text-xs flex justify-between items-center';
                    div.innerHTML = `
                        <div>
                            <div class="font-bold text-sm text-airbnb-dark">${b.listing_title || b.listing_id}</div>
                            <div class="text-airbnb-gray mt-1">Dates: ${b.check_in} to ${b.check_out} (${b.nights || '—'} nights)</div>
                            <div class="text-[11px] font-mono text-emerald-600 mt-1">Receipt ID: ${b.booking_id}</div>
                        </div>
                        <div class="text-right">
                            <div class="font-extrabold text-base text-brand">$${b.total_price}</div>
                            <span class="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">Confirmed</span>
                        </div>
                    `;
                    userBookingsList.appendChild(div);
                });
            }
        } catch (err) {
            console.error('Bookings load error:', err);
        }
    }

    // =========================================================================
    // User Wishlist Modal
    // =========================================================================
    async function openUserWishlistModal() {
        userDropdownMenu.classList.add('hidden');
        userWishlistContent.innerHTML = '<p class="text-xs text-airbnb-gray">Loading wishlist...</p>';
        userWishlistModal.classList.remove('hidden');

        try {
            const res = await fetch(`/api/users/${state.activeUserId}`);
            const data = await res.json();
            if (data.success && data.user) {
                const saved = data.user.saved_listings || [];
                if (saved.length === 0) {
                    userWishlistContent.innerHTML = '<p class="text-xs text-airbnb-gray py-4">Your wishlist is empty. Tap the heart on any property to save it.</p>';
                    return;
                }

                userWishlistContent.innerHTML = '';
                saved.forEach(item => {
                    const row = document.createElement('div');
                    row.className = 'flex items-center gap-4 p-3 rounded-2xl border border-airbnb-border-light hover:bg-airbnb-light cursor-pointer transition-colors';
                    row.innerHTML = `
                        <img src="${item.images[0]}" class="w-16 h-16 rounded-xl object-cover" alt="${item.title}">
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-xs truncate text-airbnb-dark">${item.title}</div>
                            <div class="text-airbnb-gray text-[11px] truncate">${item.location} · $${item.price_per_night}/night</div>
                            <div class="text-brand font-bold text-[11px]">★ ${Number(item.rating).toFixed(2)}</div>
                        </div>
                        <button type="button" class="text-xs font-semibold text-brand hover:underline">View</button>
                    `;
                    row.addEventListener('click', () => {
                        userWishlistModal.classList.add('hidden');
                        openListingDetailModal(item);
                    });
                    userWishlistContent.appendChild(row);
                });
            }
        } catch (err) {
            console.error('Wishlist load error:', err);
        }
    }

    // Initialize application
    init();
});
