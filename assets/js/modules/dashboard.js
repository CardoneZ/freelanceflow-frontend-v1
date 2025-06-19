// assets/js/modules/dashboard.js
import { getCurrentUser } from '../auth.js';
import { formatDate, formatTime, renderStars, showToast } from '../utils.js';
import { normalizeUser } from '../utils.js';
import { appointmentsAPI } from '../api.js';
import { professionalsAPI } from '../api.js';


const API_BASE_URL = 'http://localhost:4000/api';


export async function initDashboard() {
    try {
        const user = normalizeUser(getCurrentUser());
        if (!user) {
            window.location.href = '/login.html';
            return;
        }

        updateUserUI(user);

        await Promise.all([
            loadDashboardStats(user.UserId),
            loadUpcomingAppointments(user.UserId),
            loadRecentReviews(user.UserId),
            loadMyServices(user.UserId)
        ]);
    } catch (error) {
        console.error('Error initializing dashboard:', error);
        showToast('Error loading dashboard data', 'error');
    }
}

function updateUserUI(user) {
    document.getElementById('user-name').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('sidebar-user-name').textContent = `${user.firstName} ${user.lastName}`;
    document.getElementById('welcome-message').textContent = `Welcome back, ${user.firstName}!`;
    
    const avatarUrl = user.profilePicture || 
        `https://ui-avatars.com/api/?background=0ea5e9&color=fff&name=${user.firstName[0]}+${user.lastName[0]}`;
    document.getElementById('user-avatar-img').src = avatarUrl;
    document.getElementById('sidebar-user-avatar').src = avatarUrl;
}

async function loadDashboardStats(professionalId) {
    try {
        const response = await professionalsAPI.getStats(professionalId);
        renderStats(response.stats); // Use the stats object directly
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        renderStats({
            totalAppointments: 0,
            totalEarnings: 0,
            averageRating: 0,
            upcomingToday: 0
        });
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-cards');
    if (!container) return;
    
    const avgRating = parseFloat(stats.averageRating) || 0;
    const displayRating = avgRating.toFixed(1);
    
    container.innerHTML = `
        <!-- Total Appointments -->
        <div class="stat-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200">
            <div class="flex items-center">
                <div class="p-3 rounded-lg bg-primary-50 text-primary-600">
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500 truncate">Total Appointments</p>
                    <p class="mt-1 text-2xl font-semibold text-gray-900">${stats.totalAppointments || 0}</p>
                </div>
            </div>
        </div>

        <!-- Total Earnings -->
        <div class="stat-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200">
            <div class="flex items-center">
                <div class="p-3 rounded-lg bg-green-50 text-green-600">
                    <i class="fas fa-dollar-sign"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500 truncate">Total Earnings</p>
                    <p class="mt-1 text-2xl font-semibold text-gray-900">$${stats.totalEarnings || '0.00'}</p>
                </div>
            </div>
        </div>

        <!-- Average Rating -->
        <div class="stat-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200">
            <div class="flex items-center">
                <div class="p-3 rounded-lg bg-yellow-50 text-yellow-600">
                    <i class="fas fa-star"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500 truncate">Average Rating</p>
                    <div class="flex items-center mt-1">
                        <p class="text-2xl font-semibold text-gray-900 mr-2">${displayRating}</p>
                        ${renderStars(avgRating)}
                    </div>
                </div>
            </div>
        </div>

        <!-- Upcoming Today -->
        <div class="stat-card bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all duration-200">
            <div class="flex items-center">
                <div class="p-3 rounded-lg bg-blue-50 text-blue-600">
                    <i class="fas fa-clock"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-500 truncate">Upcoming Today</p>
                    <p class="mt-1 text-2xl font-semibold text-gray-900">${stats.upcomingToday || 0}</p>
                </div>
            </div>
        </div>
    `;
}

async function loadUpcomingAppointments(professionalId) {
    try {
        const appointments = await appointmentsAPI.getUpcomingAppointments();
        renderAppointments(appointments);
    } catch (error) {
        console.error('Error loading upcoming appointments:', error);
        document.getElementById('upcoming-appointments').innerHTML = 
            '<li class="px-6 py-4 text-center text-red-500">Error loading appointments</li>';
    }
}

function renderAppointments(appointments) {
    const container = document.getElementById('upcoming-appointments');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<li class="px-6 py-4 text-center text-gray-500">No upcoming appointments</li>';
        return;
    }
    
    container.innerHTML = appointments.map(appointment => `
        <li class="px-6 py-4">
            <div class="flex items-center">
                <div class="flex-shrink-0 bg-primary-100 rounded-lg p-3 text-primary-600">
                    <i class="far fa-calendar-alt"></i>
                </div>
                <div class="ml-4">
                    <p class="text-sm font-medium text-gray-900">
                        ${appointment.serviceName || 'Appointment'}
                    </p>
                    <p class="text-sm text-gray-500">
                        ${formatDate(appointment.StartTime)} • ${formatTime(appointment.StartTime)} • ${appointment.duration} min
                    </p>
                    ${appointment.clientName ? `
                        <p class="mt-1 text-sm text-gray-500">
                            With ${appointment.clientName}
                        </p>
                    ` : ''}
                </div>
            </div>
        </li>
    `).join('');
}

async function loadRecentReviews(professionalId) {
    try {
        const response = await fetch(`${API_BASE_URL}/reviews/professional/${professionalId}?limit=3&sort=newest`);
        const data = await response.json();
        renderReviews(data.reviews || []);
    } catch (error) {
        console.error('Error loading recent reviews:', error);
        document.getElementById('recent-reviews').innerHTML = 
            '<li class="px-6 py-4 text-center text-red-500">Error loading reviews</li>';
    }
}

function renderReviews(reviews) {
    const container = document.getElementById('recent-reviews');
    
    if (!reviews || reviews.length === 0) {
        container.innerHTML = '<li class="px-6 py-4 text-center text-gray-500">No reviews yet</li>';
        return;
    }
    
    container.innerHTML = reviews.map(review => `
        <li class="px-6 py-4">
            <div class="flex items-start">
                <div class="flex-shrink-0">
                    <div class="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                        ${review.Client?.User?.FirstName?.charAt(0) || ''}${review.Client?.User?.LastName?.charAt(0) || ''}
                    </div>
                </div>
                <div class="ml-4">
                    <div class="flex items-center">
                        <p class="text-sm font-medium text-gray-900">
                            ${review.Client?.User?.FirstName || 'Client'} ${review.Client?.User?.LastName || ''}
                        </p>
                        <div class="ml-2 flex items-center">
                            ${Array(review.Rating).fill('<i class="fas fa-star text-yellow-400"></i>').join('')}
                            ${Array(5 - review.Rating).fill('<i class="far fa-star text-yellow-400"></i>').join('')}
                        </div>
                    </div>
                    <p class="text-sm text-gray-500 mt-1">
                        ${formatDate(review.Appointment?.StartTime)}
                    </p>
                    <p class="mt-1 text-sm text-gray-700">
                        ${review.Comment || 'No comment provided'}
                    </p>
                </div>
            </div>
        </li>
    `).join('');
}

async function loadMyServices(professionalId) {
    try {
        const response = await fetch(`${API_BASE_URL}/services?professionalId=${professionalId}&limit=3`);
        const services = await response.json();
        renderServices(services);
    } catch (error) {
        console.error('Error loading services:', error);
        document.getElementById('my-services').innerHTML = 
            '<li class="px-6 py-4 text-center text-red-500">Error loading services</li>';
    }
}

function renderServices(services) {
    const container = document.getElementById('my-services');
    
    if (!services || services.length === 0) {
        container.innerHTML = '<li class="px-6 py-4 text-center text-gray-500">No services found</li>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <li class="px-6 py-4">
            <div class="flex justify-between items-center">
                <div>
                    <h4 class="text-sm font-medium text-gray-900">${service.name}</h4>
                    <p class="text-sm text-gray-500">$${service.price} • ${service.duration} min</p>
                </div>
            </div>
        </li>
    `).join('');
}