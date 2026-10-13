/**
 * LandBNB - User Profile & Dashboard Management Script
 * Controls interactive tab switching, asynchronous booking cancellation (DELETE),
 * saved wishlist item removal, and account settings notifications.
 */

document.addEventListener('DOMContentLoaded', () => {
    const activeUserId = document.body.dataset.userId || 'user-001';
    const initialActiveTab = document.body.dataset.activeTab || 'trips';

    // Tabs DOM references
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    // Badges & Counters
    const profileTripsCountBadge = document.getElementById('profileTripsCountBadge');
    const badgeTripsTab = document.getElementById('badgeTripsTab');
    const profileWishlistCountBadge = document.getElementById('profileWishlistCountBadge');
    const badgeWishlistTab = document.getElementById('badgeWishlistTab');
    const wishlistCountHeader = document.getElementById('wishlistCountHeader');

    // Containers & Empty States
    const tripsListContainer = document.getElementById('tripsListContainer');
    const wishlistGridContainer = document.getElementById('wishlistGridContainer');

    // Toast
    const toastNotification = document.getElementById('toastNotification');
    const toastMessage = document.getElementById('toastMessage');

    // Account Form
    const btnSaveAccountSettings = document.getElementById('btnSaveAccountSettings');

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        setupTabs();
        setupBookingCancellations();
        setupWishlistRemovals();
        setupAccountSettings();
        setupContactHostModal();
        activateInitialTab(initialActiveTab);
    }

    // =========================================================================
    // Interactive Tab Switching
    // =========================================================================
    function setupTabs() {
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-target');
                switchTab(btn, targetId);

                // Update URL parameter without reload
                const tabParam = targetId === 'tabContentWishlists' ? 'wishlists' : (targetId === 'tabContentAccount' ? 'account' : 'trips');
                if (window.history && window.history.replaceState) {
                    const newUrl = `${window.location.pathname}?tab=${tabParam}`;
                    window.history.replaceState(null, '', newUrl);
                }
            });
        });
    }

    function switchTab(activeBtn, targetContentId) {
        // Reset all buttons styling
        tabButtons.forEach(b => {
            b.classList.remove('border-brand', 'text-brand', 'border-airbnb-dark', 'text-airbnb-dark');
            b.classList.add('border-transparent', 'text-airbnb-gray');
            const badge = b.querySelector('span:last-child');
            if (badge) {
                badge.classList.remove('bg-brand', 'text-white');
                badge.classList.add('bg-slate-100', 'text-airbnb-dark');
            }
        });

        // Set active button
        activeBtn.classList.remove('border-transparent', 'text-airbnb-gray', 'border-airbnb-dark', 'text-airbnb-dark');
        activeBtn.classList.add('border-brand', 'text-brand');
        const activeBadge = activeBtn.querySelector('span:last-child');
        if (activeBadge) {
            activeBadge.classList.remove('bg-slate-100', 'text-airbnb-dark');
            activeBadge.classList.add('bg-brand', 'text-white');
        }

        // Hide all tab content
        tabContents.forEach(c => c.classList.add('hidden'));

        // Show target content
        const target = document.getElementById(targetContentId);
        if (target) {
            target.classList.remove('hidden');
        }
    }

    function activateInitialTab(tabName) {
        if (tabName === 'wishlists') {
            const btn = document.getElementById('tabBtnWishlists');
            if (btn) btn.click();
        } else if (tabName === 'account') {
            const btn = document.getElementById('tabBtnAccount');
            if (btn) btn.click();
        } else {
            const btn = document.getElementById('tabBtnTrips');
            if (btn) btn.click();
        }
    }

    // =========================================================================
    // Contact Host Modal Interaction
    // =========================================================================
    function setupContactHostModal() {
        const modal = document.getElementById('profileContactHostModal');
        const modalTitle = document.getElementById('modalHostTitle');
        const modalSubtitle = document.getElementById('modalHostSubtitle');
        const txtMsg = document.getElementById('profileHostMessageTxt');
        const successMsg = document.getElementById('profileHostMsgSuccess');
        const btnClose = document.getElementById('btnCloseProfileHostModal');
        const btnCancel = document.getElementById('btnCancelProfileHostModal');
        const btnSend = document.getElementById('btnSendProfileHostModal');

        if (!modal) return;

        document.querySelectorAll('.btn-contact-host').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const listingTitle = btn.getAttribute('data-listing-title') || 'Stay Reservation';
                const bookingId = btn.getAttribute('data-booking-id') || '';
                if (modalTitle) modalTitle.textContent = `Message Host · ${listingTitle}`;
                if (modalSubtitle) modalSubtitle.textContent = `Reservation #${bookingId}`;
                if (txtMsg) txtMsg.value = '';
                if (successMsg) successMsg.classList.add('hidden');
                modal.classList.remove('hidden');
                if (txtMsg) txtMsg.focus();
            });
        });

        if (btnClose) btnClose.addEventListener('click', () => modal.classList.add('hidden'));
        if (btnCancel) btnCancel.addEventListener('click', () => modal.classList.add('hidden'));

        if (btnSend) {
            btnSend.addEventListener('click', () => {
                const content = txtMsg ? txtMsg.value.trim() : '';
                if (!content) {
                    showToast('Please type a message before sending.');
                    return;
                }
                btnSend.disabled = true;
                btnSend.textContent = 'Sending...';

                setTimeout(() => {
                    if (successMsg) successMsg.classList.remove('hidden');
                    btnSend.disabled = false;
                    btnSend.textContent = 'Sent!';
                    setTimeout(() => {
                        modal.classList.add('hidden');
                        if (successMsg) successMsg.classList.add('hidden');
                        btnSend.textContent = 'Send Message';
                        showToast('Message sent to host.');
                    }, 1200);
                }, 500);
            });
        }
    }

    // =========================================================================
    // Booking Cancellation (DELETE /api/bookings/<id>)
    // =========================================================================
    function setupBookingCancellations() {
        document.querySelectorAll('.btn-cancel-booking').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const bookingId = btn.getAttribute('data-booking-id');
                const card = btn.closest('.booking-card');

                btn.disabled = true;
                btn.textContent = 'Cancelling...';

                try {
                    const res = await fetch(`/api/bookings/${bookingId}`, {
                        method: 'DELETE'
                    });

                    const data = await res.json();
                    if (data.success) {
                        // Smooth removal animation
                        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';

                        setTimeout(() => {
                            card.remove();
                            decrementTripsCount();
                            showToast(`Reservation #${bookingId} cancelled successfully.`);
                        }, 300);
                    } else {
                        showToast(`Failed to cancel booking: ${data.message}`);
                        btn.disabled = false;
                        btn.textContent = 'Cancel Booking';
                    }
                } catch (err) {
                    console.error('Cancel booking error:', err);
                    showToast('An unexpected error occurred while attempting cancellation.');
                    btn.disabled = false;
                    btn.textContent = 'Cancel Booking';
                }
            });
        });
    }

    function decrementTripsCount() {
        const remaining = document.querySelectorAll('.booking-card').length;
        if (profileTripsCountBadge) profileTripsCountBadge.textContent = remaining;
        if (badgeTripsTab) badgeTripsTab.textContent = remaining;

        if (remaining === 0 && tripsListContainer) {
            tripsListContainer.innerHTML = `
                <div id="emptyTripsState" class="text-center py-16 bg-airbnb-light/50 rounded-3xl border border-airbnb-border-light">
                    <div class="text-4xl mb-3">✈️</div>
                    <h3 class="font-bold text-sm text-airbnb-dark mb-1">No upcoming trips!</h3>
                    <p class="text-xs text-airbnb-gray max-w-sm mx-auto mb-4">You have zero active bookings. Time to explore incredible new stays.</p>
                    <a href="/" class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-full transition-colors inline-block shadow">
                        Find places to stay
                    </a>
                </div>
            `;
        }
    }

    // =========================================================================
    // Wishlist Removal (POST /api/wishlist)
    // =========================================================================
    function setupWishlistRemovals() {
        document.querySelectorAll('.btn-remove-wishlist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const listingId = btn.getAttribute('data-listing-id');
                const card = btn.closest('.wishlist-item-card');

                try {
                    const res = await fetch('/api/wishlist', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            user_id: activeUserId,
                            listing_id: listingId
                        })
                    });

                    const data = await res.json();
                    if (data.success && data.action === 'removed') {
                        // Smooth removal animation
                        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                        card.style.opacity = '0';
                        card.style.transform = 'scale(0.95)';

                        setTimeout(() => {
                            card.remove();
                            decrementWishlistCount(data.wishlist.length);
                            showToast('Property removed from saved wishlist.');
                        }, 300);
                    }
                } catch (err) {
                    console.error('Wishlist removal error:', err);
                }
            });
        });
    }

    function decrementWishlistCount(newCount) {
        if (profileWishlistCountBadge) profileWishlistCountBadge.textContent = newCount;
        if (badgeWishlistTab) badgeWishlistTab.textContent = newCount;
        if (wishlistCountHeader) wishlistCountHeader.textContent = newCount;

        const remaining = document.querySelectorAll('.wishlist-item-card').length;
        if (remaining === 0 && wishlistGridContainer) {
            wishlistGridContainer.innerHTML = `
                <div id="emptyWishlistState" class="col-span-full text-center py-16 bg-airbnb-light/50 rounded-3xl border border-airbnb-border-light">
                    <div class="text-4xl mb-3">❤️</div>
                    <h3 class="font-bold text-sm text-airbnb-dark mb-1">Your wishlist is empty</h3>
                    <p class="text-xs text-airbnb-gray max-w-sm mx-auto mb-4">Tap the heart on any property listing to save your favorite vacation stays here.</p>
                    <a href="/" class="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-full transition-colors inline-block shadow">
                        Explore stays
                    </a>
                </div>
            `;
        }
    }

    // =========================================================================
    // Account Settings Save
    // =========================================================================
    function setupAccountSettings() {
        if (btnSaveAccountSettings) {
            btnSaveAccountSettings.addEventListener('click', () => {
                showToast('✨ Account preferences and contact details saved!');
            });
        }
    }

    // =========================================================================
    // Toast Notification Utility
    // =========================================================================
    function showToast(msg) {
        if (!toastNotification || !toastMessage) return;
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
