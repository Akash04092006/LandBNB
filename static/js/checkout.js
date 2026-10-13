/**
 * LandBNB - Booking Checkout & Payment Integration
 * Handles live pricing recomputation, payment card formatting,
 * simulated payment authorization, and receipt confirmation view.
 */

document.addEventListener('DOMContentLoaded', () => {
    const listingId = document.body.dataset.listingId;
    const pricePerNight = parseFloat(document.body.dataset.price) || 100;
    const cleaningFee = parseFloat(document.body.dataset.cleaning) || 75.00;
    const serviceRate = parseFloat(document.body.dataset.serviceRate) || 0.12;
    const activeUserId = document.body.dataset.userId || 'user-001';

    // DOM Elements
    const checkoutFormView = document.getElementById('checkoutFormView');
    const checkoutSuccessView = document.getElementById('checkoutSuccessView');

    // Trip Edit Elements
    const btnToggleEditDates = document.getElementById('btnToggleEditDates');
    const editDatesBox = document.getElementById('editDatesBox');
    const inputEditCheckIn = document.getElementById('inputEditCheckIn');
    const inputEditCheckOut = document.getElementById('inputEditCheckOut');
    const displayTripDates = document.getElementById('displayTripDates');

    const btnToggleEditGuests = document.getElementById('btnToggleEditGuests');
    const editGuestsBox = document.getElementById('editGuestsBox');
    const btnDecGuestCheckout = document.getElementById('btnDecGuestCheckout');
    const btnIncGuestCheckout = document.getElementById('btnIncGuestCheckout');
    const valGuestCheckout = document.getElementById('valGuestCheckout');
    const displayTripGuests = document.getElementById('displayTripGuests');

    // Payment Form & Inputs
    const inputCardNumber = document.getElementById('inputCardNumber');
    const inputCardExp = document.getElementById('inputCardExp');
    const inputCardCvv = document.getElementById('inputCardCvv');
    const inputCardHolder = document.getElementById('inputCardHolder');
    const inputCardZip = document.getElementById('inputCardZip');
    const inputBillingStreet = document.getElementById('inputBillingStreet');
    const inputBillingCity = document.getElementById('inputBillingCity');
    const inputBillingState = document.getElementById('inputBillingState');
    const cardBrandIcon = document.getElementById('cardBrandIcon');

    const tabCardPay = document.getElementById('tabCardPay');
    const tabApplePay = document.getElementById('tabApplePay');
    const cardPaymentForm = document.getElementById('cardPaymentForm');
    const applePaySimulator = document.getElementById('applePaySimulator');
    const payPlanRadios = document.querySelectorAll('input[name="payPlan"]');

    // Summary Elements
    const summaryFormula = document.getElementById('summaryFormula');
    const summaryAccommodation = document.getElementById('summaryAccommodation');
    const summaryService = document.getElementById('summaryService');
    const summaryTotal = document.getElementById('summaryTotal');
    const btnPayTotalText = document.getElementById('btnPayTotalText');
    const displayPayFullAmt = document.getElementById('displayPayFullAmt');
    const displayPayPartAmt = document.getElementById('displayPayPartAmt');
    const btnConfirmPay = document.getElementById('btnConfirmPay');

    // Receipt Elements
    const receiptCode = document.getElementById('receiptCode');
    const receiptCheckInDate = document.getElementById('receiptCheckInDate');
    const receiptCheckOutDate = document.getElementById('receiptCheckOutDate');
    const receiptTotalPaid = document.getElementById('receiptTotalPaid');

    // Host Contact Modal Elements
    const btnOpenReceiptMessageHost = document.getElementById('btnOpenReceiptMessageHost');
    const checkoutContactHostModal = document.getElementById('checkoutContactHostModal');
    const btnCloseContactHostModal = document.getElementById('btnCloseContactHostModal');
    const btnCancelHostMsg = document.getElementById('btnCancelHostMsg');
    const btnSendHostMsg = document.getElementById('btnSendHostMsg');
    const txtHostMessage = document.getElementById('txtHostMessage');
    const hostMessageSuccessMsg = document.getElementById('hostMessageSuccessMsg');

    let currentNights = 4;
    let currentTotal = 0;
    let currentGuests = parseInt(valGuestCheckout ? valGuestCheckout.textContent : '1') || 1;
    let isApplePaySelected = false;

    // =========================================================================
    // Initialization
    // =========================================================================
    function init() {
        setupDateAndGuestEditing();
        setupPaymentMethods();
        setupCardFormatting();
        setupPayPlanToggles();
        setupContactHostModal();
        recalculatePrices();
        btnConfirmPay.addEventListener('click', handlePaymentSubmit);
    }

    // =========================================================================
    // Trip Editing & Price Calculation
    // =========================================================================
    function setupDateAndGuestEditing() {
        btnToggleEditDates.addEventListener('click', () => {
            editDatesBox.classList.toggle('hidden');
        });

        inputEditCheckIn.addEventListener('change', recalculatePrices);
        inputEditCheckOut.addEventListener('change', recalculatePrices);

        btnToggleEditGuests.addEventListener('click', () => {
            editGuestsBox.classList.toggle('hidden');
        });

        btnIncGuestCheckout.addEventListener('click', () => {
            currentGuests++;
            valGuestCheckout.textContent = currentGuests;
            displayTripGuests.textContent = `${currentGuests} guest${currentGuests > 1 ? 's' : ''}`;
        });

        btnDecGuestCheckout.addEventListener('click', () => {
            if (currentGuests > 1) {
                currentGuests--;
                valGuestCheckout.textContent = currentGuests;
                displayTripGuests.textContent = `${currentGuests} guest${currentGuests > 1 ? 's' : ''}`;
            }
        });
    }

    function recalculatePrices() {
        const dIn = new Date(inputEditCheckIn.value);
        const dOut = new Date(inputEditCheckOut.value);

        if (isNaN(dIn.getTime()) || isNaN(dOut.getTime()) || dOut <= dIn) {
            btnConfirmPay.disabled = true;
            btnConfirmPay.classList.add('opacity-50', 'cursor-not-allowed');
            showCheckoutError('Checkout date must be after check-in date.');
            return;
        }

        hideCheckoutError();
        btnConfirmPay.disabled = false;
        btnConfirmPay.classList.remove('opacity-50', 'cursor-not-allowed');

        currentNights = Math.max(1, Math.round((dOut - dIn) / (1000 * 60 * 60 * 24)));
        const accommodation = currentNights * pricePerNight;
        const service = Math.round(accommodation * serviceRate * 100) / 100;
        currentTotal = accommodation + cleaningFee + service;

        // Update displays
        displayTripDates.textContent = `${inputEditCheckIn.value} to ${inputEditCheckOut.value} (${currentNights} night${currentNights > 1 ? 's' : ''})`;
        summaryFormula.textContent = `$${pricePerNight.toFixed(2)} x ${currentNights} night${currentNights > 1 ? 's' : ''}`;
        summaryAccommodation.textContent = `$${accommodation.toFixed(2)}`;
        summaryService.textContent = `$${service.toFixed(2)}`;
        summaryTotal.textContent = `$${currentTotal.toFixed(2)}`;

        const isPart = document.querySelector('input[name="payPlan"]:checked')?.value === 'part';
        const displayAmt = isPart ? (currentTotal / 2) : currentTotal;
        btnPayTotalText.textContent = `$${displayAmt.toFixed(2)}`;

        displayPayFullAmt.textContent = `$${currentTotal.toFixed(2)}`;
        displayPayPartAmt.textContent = `$${(currentTotal / 2).toFixed(2)}`;
    }

    function setupPayPlanToggles() {
        payPlanRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                const isPart = radio.value === 'part';
                const displayAmt = isPart ? (currentTotal / 2) : currentTotal;
                btnPayTotalText.textContent = `$${displayAmt.toFixed(2)}`;
            });
        });
    }

    // =========================================================================
    // Payment Method Selection & Card Formatting
    // =========================================================================
    function setupPaymentMethods() {
        tabCardPay.addEventListener('click', () => {
            isApplePaySelected = false;
            tabCardPay.classList.remove('border-airbnb-border', 'border-airbnb-dark', 'text-airbnb-gray', 'bg-airbnb-light');
            tabCardPay.classList.add('border-2', 'border-brand', 'text-brand', 'bg-white');
            tabApplePay.classList.remove('border-2', 'border-brand', 'text-brand', 'bg-white');
            tabApplePay.classList.add('border', 'border-airbnb-border', 'text-airbnb-gray', 'bg-airbnb-light');
            cardPaymentForm.classList.remove('hidden');
            applePaySimulator.classList.add('hidden');
        });

        tabApplePay.addEventListener('click', () => {
            isApplePaySelected = true;
            tabApplePay.classList.remove('border-airbnb-border', 'border-airbnb-dark', 'text-airbnb-gray', 'bg-airbnb-light');
            tabApplePay.classList.add('border-2', 'border-brand', 'text-brand', 'bg-white');
            tabCardPay.classList.remove('border-2', 'border-brand', 'text-brand', 'bg-white');
            tabCardPay.classList.add('border', 'border-airbnb-border', 'text-airbnb-gray', 'bg-airbnb-light');
            cardPaymentForm.classList.add('hidden');
            applePaySimulator.classList.remove('hidden');
        });
    }

    function setupCardFormatting() {
        // Auto-format card number: #### #### #### ####
        inputCardNumber.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length > 16) val = val.substring(0, 16);

            // Detect Card Brand
            if (val.startsWith('4')) {
                cardBrandIcon.textContent = '🟦 VISA';
            } else if (val.startsWith('5')) {
                cardBrandIcon.textContent = '🔴 MC';
            } else if (val.startsWith('3')) {
                cardBrandIcon.textContent = '🟩 AMEX';
            } else if (val.startsWith('6')) {
                cardBrandIcon.textContent = '🟧 DISC';
            } else {
                cardBrandIcon.textContent = '💳';
            }

            const formatted = val.match(/.{1,4}/g)?.join(' ') || val;
            e.target.value = formatted;
        });

        // Auto-format expiration MM / YY
        inputCardExp.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, '');
            if (val.length > 4) val = val.substring(0, 4);
            if (val.length >= 2) {
                e.target.value = `${val.substring(0, 2)} / ${val.substring(2)}`;
            } else {
                e.target.value = val;
            }
        });
    }

    const checkoutErrorBanner = document.getElementById('checkoutErrorBanner');
    const checkoutErrorMessage = document.getElementById('checkoutErrorMessage');

    function showCheckoutError(msg) {
        if (checkoutErrorMessage && checkoutErrorBanner) {
            checkoutErrorMessage.textContent = msg;
            checkoutErrorBanner.classList.remove('hidden');
            checkoutErrorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.warn(msg);
        }
    }

    function hideCheckoutError() {
        if (checkoutErrorBanner) {
            checkoutErrorBanner.classList.add('hidden');
        }
    }

    // =========================================================================
    // Contact Host Modal Interactions
    // =========================================================================
    function setupContactHostModal() {
        if (!checkoutContactHostModal) return;

        if (btnOpenReceiptMessageHost) {
            btnOpenReceiptMessageHost.addEventListener('click', () => {
                checkoutContactHostModal.classList.remove('hidden');
                if (txtHostMessage) txtHostMessage.focus();
            });
        }

        if (btnCloseContactHostModal) {
            btnCloseContactHostModal.addEventListener('click', () => {
                checkoutContactHostModal.classList.add('hidden');
            });
        }

        if (btnCancelHostMsg) {
            btnCancelHostMsg.addEventListener('click', () => {
                checkoutContactHostModal.classList.add('hidden');
            });
        }

        if (btnSendHostMsg) {
            btnSendHostMsg.addEventListener('click', () => {
                const msg = txtHostMessage ? txtHostMessage.value.trim() : '';
                if (!msg) {
                    alert('Please enter a short message for the host.');
                    return;
                }

                btnSendHostMsg.disabled = true;
                btnSendHostMsg.textContent = 'Sending...';

                setTimeout(() => {
                    if (hostMessageSuccessMsg) hostMessageSuccessMsg.classList.remove('hidden');
                    btnSendHostMsg.disabled = false;
                    btnSendHostMsg.textContent = 'Sent!';
                    setTimeout(() => {
                        checkoutContactHostModal.classList.add('hidden');
                        if (hostMessageSuccessMsg) hostMessageSuccessMsg.classList.add('hidden');
                        btnSendHostMsg.textContent = 'Send Message';
                        if (txtHostMessage) txtHostMessage.value = '';
                    }, 1200);
                }, 600);
            });
        }
    }

    // =========================================================================
    // Payment Authorization & Booking Creation (POST /api/bookings)
    // =========================================================================
    async function handlePaymentSubmit() {
        hideCheckoutError();

        // Validate card details if card tab is selected
        if (!isApplePaySelected) {
            const rawCard = inputCardNumber.value.replace(/\D/g, '');
            if (rawCard.length < 12) {
                showCheckoutError('Please enter a valid card number (at least 12-16 digits).');
                inputCardNumber.focus();
                return;
            }
            const rawExp = inputCardExp.value.replace(/\D/g, '');
            if (rawExp.length < 4) {
                showCheckoutError('Please enter a valid expiration date (MM / YY).');
                inputCardExp.focus();
                return;
            }
            const rawCvv = inputCardCvv.value.replace(/\D/g, '');
            if (rawCvv.length < 3) {
                showCheckoutError('Please enter a valid 3 or 4-digit CVV security code.');
                inputCardCvv.focus();
                return;
            }
            if (inputCardHolder && !inputCardHolder.value.trim()) {
                showCheckoutError('Please enter the cardholder legal name.');
                inputCardHolder.focus();
                return;
            }
            if (inputBillingStreet && !inputBillingStreet.value.trim()) {
                showCheckoutError('Please enter a valid billing street address.');
                inputBillingStreet.focus();
                return;
            }
            if (inputCardZip && !inputCardZip.value.trim()) {
                showCheckoutError('Please enter a valid ZIP / postal code.');
                inputCardZip.focus();
                return;
            }
        }

        btnConfirmPay.disabled = true;
        btnConfirmPay.innerHTML = `
            <span class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
            <span>Authorizing payment...</span>
        `;

        try {
            const payload = {
                listing_id: listingId,
                user_id: activeUserId,
                check_in: inputEditCheckIn.value,
                check_out: inputEditCheckOut.value,
                guests: currentGuests
            };

            const res = await fetch('/api/bookings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.success && data.booking) {
                const b = data.booking;
                // Populate receipt elements
                receiptCode.textContent = `#${b.booking_id}`;
                receiptCheckInDate.textContent = `${b.check_in} (After 3:00 PM)`;
                receiptCheckOutDate.textContent = `${b.check_out} (Before 11:00 AM)`;
                receiptTotalPaid.textContent = `$${b.total_price.toFixed(2)}`;

                // Switch Views
                checkoutFormView.classList.add('hidden');
                checkoutSuccessView.classList.remove('hidden');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                showCheckoutError(`Checkout failed: ${data.message || 'Unable to process reservation.'}`);
                btnConfirmPay.disabled = false;
                btnConfirmPay.innerHTML = `<span>Confirm and pay</span> · <span>$${currentTotal.toFixed(2)}</span>`;
            }
        } catch (err) {
            console.error('Payment checkout error:', err);
            showCheckoutError('An unexpected error occurred during payment processing. Please try again.');
            btnConfirmPay.disabled = false;
            btnConfirmPay.innerHTML = `<span>Confirm and pay</span> · <span>$${currentTotal.toFixed(2)}</span>`;
        }
    }

    init();
});
