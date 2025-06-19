// assets/js/modules/reviews.js
import { reviewsAPI } from '../api.js';
import { showToast } from '../utils.js';
import { normalizeUser } from '../utils.js';
import { getCurrentUser } from '../auth.js';

export async function initReviews() {
  console.log('Initializing reviews module');
  try {
    console.log('Before loadReviews');
    await loadReviews();
    console.log('After loadReviews');
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing reviews:', error);
    showToast('Error initializing reviews', 'error');
  }
}

function getCurrentProfessionalId() {
  console.log('Entering getCurrentProfessionalId');
  const user = normalizeUser(getCurrentUser());
  if (!user) {
    console.error('No user found');
    return null;
  }
  console.log('User found:', user);
  return user.UserId;
}

async function loadReviews(page = 1, limit = 10) {
  try {
    const professionalId = getCurrentProfessionalId();
    if (!professionalId) {
      throw new Error('Professional ID not found');
    }
    console.log('Fetching reviews for professionalId:', professionalId, 'Page:', page, 'Limit:', limit);
    const response = await reviewsAPI.getProfessionalReviews(professionalId, { page, limit });
    console.log('Raw API response:', response);
    const reviews = Array.isArray(response.reviews) ? response.reviews : [];
    const totalReviews = response.totalReviews || reviews.length; // Adjust based on backend response
    const totalPages = Math.ceil(totalReviews / limit);
    console.log('Reviews processed for rendering:', reviews, 'Total Pages:', totalPages);

    renderReviews(reviews);
    updateReviewStats(reviews, totalReviews);
    updatePagination(page, totalPages);
  } catch (error) {
    console.error('Error loading reviews - Details:', error);
    showToast('Error loading reviews: ' + (error.message || 'Unknown error'), 'error');
  }
}

function renderReviews(reviews) {
  const container = document.getElementById('reviews-list');
  if (!container) {
    console.error('Reviews container not found');
    return;
  }

  if (!reviews || !Array.isArray(reviews)) {
    container.innerHTML = '<div class="px-6 py-4 text-center text-gray-500">No reviews found or invalid data</div>';
    console.error('Invalid reviews data:', reviews);
    return;
  }

  if (reviews.length === 0) {
    container.innerHTML = '<div class="px-6 py-4 text-center text-gray-500">No reviews found</div>';
    return;
  }

  container.innerHTML = reviews.map(review => `
    <div class="border-t px-6 py-4">
      <div class="flex justify-between">
        <div>
          <p class="font-semibold">${review.Client?.User?.FirstName || 'N/A'} ${review.Client?.User?.LastName || ''}</p>
          <p class="text-gray-600">${new Date(review.createdAt).toLocaleDateString()}</p>
          <p class="text-yellow-500">${'★'.repeat(review.Rating)}${'☆'.repeat(5 - review.Rating)}</p>
          <p class="mt-2">${review.Comment || 'No comment provided'}</p>
        </div>
      </div>
    </div>
  `).join('');
}

function updateReviewStats(reviews, totalReviews) {
  const avgRatingElement = document.getElementById('average-rating');
  const totalReviewsElement = document.getElementById('total-reviews');

  if (!avgRatingElement || !totalReviewsElement) {
    console.error('Review stats elements not found');
    return;
  }

  const total = totalReviews || reviews.length;
  const avgRating = total > 0
    ? (reviews.reduce((sum, review) => sum + review.Rating, 0) / reviews.length).toFixed(1)
    : '—';

  avgRatingElement.textContent = avgRating;
  totalReviewsElement.textContent = total;
  document.getElementById('reviews-count').textContent = `Showing ${reviews.length} of ${total} reviews`;
}

function updatePagination(currentPage, totalPages) {
  const container = document.getElementById('reviews-list');
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');

  if (!container || !prevButton || !nextButton) {
    console.error('Pagination elements not found');
    return;
  }

  container.dataset.page = currentPage;
  prevButton.disabled = currentPage <= 1;
  nextButton.disabled = currentPage >= totalPages;

  console.log('Updated pagination - Page:', currentPage, 'Total Pages:', totalPages);
}

function setupEventListeners() {
  // Previous page button
  document.getElementById('prev-page')?.addEventListener('click', async () => {
    const currentPage = parseInt(document.getElementById('reviews-list').dataset.page || 1);
    if (currentPage > 1) {
      await loadReviews(currentPage - 1);
    }
  });

  // Next page button
  document.getElementById('next-page')?.addEventListener('click', async () => {
    const currentPage = parseInt(document.getElementById('reviews-list').dataset.page || 1);
    await loadReviews(currentPage + 1);
  });
}