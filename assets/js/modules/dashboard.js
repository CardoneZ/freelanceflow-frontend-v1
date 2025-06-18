// assets/js/modules/dashboard.js
import { professionalsAPI, reviewsAPI } from '../api.js';
import { getCurrentUser, logout } from '../auth.js';
import { formatDate, formatTime, renderStars, showToast } from '../utils.js';
import { initAppointments } from './appointments.js';
import { initServices } from './services.js';
import { normalizeUser } from '../utils.js';

export async function initDashboard() {
    try {
        // Load user data
        await loadUserData();
        
        // Initialize all dashboard components
        await Promise.all([
            loadDashboardStats(),
            initAppointments(),
            loadProfessionalReviews(),
            initServices()
        ]);
        
        // Setup event listeners
        setupEventListeners();
    } catch (error) {
        showToast('Error initializing dashboard', 'error');
    }
}

async function loadUserData() {
    const user = normalizeUser(getCurrentUser());
    if (!user) {
        window.location.href = '/auth/login.html';
        return;
    }

    // Update UI with user data
    document.getElementById('user-name').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('sidebar-user-name').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('welcome-message').textContent = `Welcome back, ${user.firstName}!`;
    
    const avatarUrl = user.profilePicture || user.profilePicture || `https://ui-avatars.com/api/?background=667eea&color=fff&name=${user.firstName[0]}+${user.lastName[0]}`;
    document.getElementById('user-avatar-img').src = avatarUrl;
    document.getElementById('sidebar-user-avatar').src = avatarUrl;
}

async function loadDashboardStats() {
    try {
        const stats = await professionalsAPI.getStats(getCurrentProfessionalId());
        renderStats(stats);
    } catch (error) {
        showToast('Error loading dashboard stats', 'error');
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-cards');
    container.innerHTML = `
        <!-- Total Appointments -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                        <i class="fas fa-calendar-alt text-white"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dt class="text-sm font-medium text-gray-500 truncate">
                            Total Appointments
                        </dt>
                        <dd class="flex items-baseline">
                            <div class="text-2xl font-semibold text-gray-900">
                                ${stats.totalAppointments || 0}
                            </div>
                        </dd>
                    </div>
                </div>
            </div>
        </div>

        <!-- Earnings -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-green-500 rounded-md p-3">
                        <i class="fas fa-dollar-sign text-white"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dt class="text-sm font-medium text-gray-500 truncate">
                            Total Earnings
                        </dt>
                        <dd class="flex items-baseline">
                            <div class="text-2xl font-semibold text-gray-900">
                                $${stats.totalEarnings ? stats.totalEarnings.toFixed(2) : '0.00'}
                            </div>
                        </dd>
                    </div>
                </div>
            </div>
        </div>

        <!-- Average Rating -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                        <i class="fas fa-star text-white"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dt class="text-sm font-medium text-gray-500 truncate">
                            Average Rating
                        </dt>
                        <dd class="flex items-baseline">
                            <div class="text-2xl font-semibold text-gray-900">
                                ${stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
                            </div>
                            <div class="flex ml-2">
                                ${renderStars(stats.averageRating || 0)}
                            </div>
                        </dd>
                    </div>
                </div>
            </div>
        </div>

        <!-- Upcoming Today -->
        <div class="bg-white overflow-hidden shadow rounded-lg">
            <div class="px-4 py-5 sm:p-6">
                <div class="flex items-center">
                    <div class="flex-shrink-0 bg-blue-500 rounded-md p-3">
                        <i class="fas fa-clock text-white"></i>
                    </div>
                    <div class="ml-5 w-0 flex-1">
                        <dt class="text-sm font-medium text-gray-500 truncate">
                            Upcoming Today
                        </dt>
                        <dd class="text-2xl font-semibold text-gray-900">
                            ${stats.upcomingToday || 0}
                        </dd>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadProfessionalReviews() {
    try {
        const reviews = await reviewsAPI.getProfessionalReviews(getCurrentProfessionalId(), { limit: 3 });
        renderReviews(reviews);
    } catch (error) {
        showToast('Error loading reviews', 'error');
    }
}

function renderReviews(reviews) {
    const container = document.getElementById('recent-reviews');
    
    if (!reviews.length) {
        container.innerHTML = '<li class="p-4 text-center text-gray-500">No reviews yet</li>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <li class="p-4 hover:bg-gray-50 smooth-transition">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <img class="h-10 w-10 rounded-full" 
                         src="${review.Client?.User?.profilePicture || 'https://via.placeholder.com/40'}" alt="">
                </div>
                <div class="ml-4 flex-1">
                    <div class="flex items-center justify-between">
                        <h4 class="text-sm font-medium text-gray-900">
                            ${review.Client?.User?.FirstName} ${review.Client?.User?.LastName}
                        </h4>
                        <div class="flex">
                            ${renderStars(review.Rating)}
                        </div>
                    </div>
                    <div class="mt-1 text-sm text-gray-500">
                        <p>${review.comments || 'No comments'}</p>
                    </div>
                    <div class="mt-2 text-xs text-gray-400">
                        <i class="far fa-clock mr-1"></i> ${formatReviewDate(review.createdAt)}
                    </div>
                </div>
            </div>
        </li>
    `).join('');
}

function formatReviewDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return formatDate(dateString);
}

function setupEventListeners() {
    // Mobile menu toggle
    document.getElementById('mobile-menu-button').addEventListener('click', () => {
        document.querySelector('.sidebar').classList.toggle('open');
    });

    // User dropdown toggle
    document.getElementById('user-menu-button').addEventListener('click', () => {
        document.querySelector('[role="menu"]').classList.toggle('hidden');
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
        if (!event.target.closest('#user-menu-button') && !event.target.closest('[role="menu"]')) {
            document.querySelector('[role="menu"]').classList.add('hidden');
        }
    });
    
    // Logout handlers
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('sidebar-logout-btn').addEventListener('click', logout);
}

function getCurrentProfessionalId() {
  const user = normalizeUser(getCurrentUser());
  return user?.UserId;
}