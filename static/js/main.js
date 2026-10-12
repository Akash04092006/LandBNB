// LandBNB Interactive Client-side Script
document.addEventListener('DOMContentLoaded', () => {
    const categoryChips = document.querySelectorAll('.category-chip');
    const listingCards = document.querySelectorAll('.listing-card');
    const listingsCountSpan = document.getElementById('listingsCount');

    categoryChips.forEach(chip => {
        chip.addEventListener('click', () => {
            // Toggle active state
            categoryChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');

            const selectedCategory = chip.getAttribute('data-category');
            let visibleCount = 0;

            listingCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                if (selectedCategory === 'All' || cardCategory === selectedCategory) {
                    card.style.display = 'flex';
                    visibleCount++;
                } else {
                    card.style.display = 'none';
                }
            });

            if (listingsCountSpan) {
                listingsCountSpan.textContent = visibleCount;
            }
        });
    });
});
