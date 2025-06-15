// assets/js/api.js
const API_BASE_URL = 'http://localhost:4000/api'; // Ajusta según tu configuración

// Helper para manejar respuestas
async function handleResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

// Configuración común para fetch
function fetchConfig(method, data, headers = {}) {
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    }
  };
  if (data) {
    config.body = JSON.stringify(data);
  }
  return config;
}

// Auth API
export const authAPI = {
  async register(data) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, 
      fetchConfig('POST', data));
    return handleResponse(response);
  },

  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, 
      fetchConfig('POST', { Email: email, Password: password }));
    return handleResponse(response);
  },

  async getMe() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse(response);
  },

  async changePassword(currentPassword, newPassword) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, 
      fetchConfig('POST', { CurrentPassword: currentPassword, NewPassword: newPassword }, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  }
};

// Users API
export const usersAPI = {
  async getCurrentUser() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse(response);
  },

  async updateUser(userId, data) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, 
      fetchConfig('PUT', data, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  }
};

// Professionals API
export const professionalsAPI = {
  async getAll(query = {}) {
    const params = new URLSearchParams(query);
    const response = await fetch(`${API_BASE_URL}/professionals?${params}`);
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/professionals/${id}`);
    return handleResponse(response);
  },

  async getStats(professionalId) {
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}/stats`);
    return handleResponse(response);
  },

  async getServices(professionalId) {
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}/services`);
    return handleResponse(response);
  }
};

// Clients API
export const clientsAPI = {
  async getAppointments(clientId, query = {}) {
    const params = new URLSearchParams(query);
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/appointments?${params}`);
    return handleResponse(response);
  }
};

// Appointments API
export const appointmentsAPI = {
  async create(appointmentData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/appointments`, 
      fetchConfig('POST', appointmentData, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  },

  async getUpcoming() {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/appointments/upcoming`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    return handleResponse(response);
  },

  async cancel(appointmentId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/appointments/${appointmentId}/cancel`, 
      fetchConfig('PUT', {}, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  }
};

// Availability API
export const availabilityAPI = {
  async getProfessionalAvailability(professionalId, date, duration) {
    const params = new URLSearchParams({ date, duration });
    const response = await fetch(`${API_BASE_URL}/availability/${professionalId}?${params}`);
    return handleResponse(response);
  },

  async create(professionalId, availabilityData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/availability/${professionalId}`, 
      fetchConfig('POST', { availability: availabilityData }, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  }
};

// Services API
export const servicesAPI = {
  async getAll(query = {}) {
    const params = new URLSearchParams(query);
    const response = await fetch(`${API_BASE_URL}/services?${params}`);
    return handleResponse(response);
  },

  async create(serviceData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/services`, 
      fetchConfig('POST', serviceData, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  },

  async validateDuration(serviceId, duration) {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/validate/${duration}`);
    return handleResponse(response);
  }
};

// Reviews API
export const reviewsAPI = {
  async create(reviewData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/reviews`, 
      fetchConfig('POST', reviewData, {
        'Authorization': `Bearer ${token}`
      }));
    return handleResponse(response);
  },

  async getProfessionalReviews(professionalId, query = {}) {
    const params = new URLSearchParams(query);
    const response = await fetch(`${API_BASE_URL}/reviews/professional/${professionalId}?${params}`);
    return handleResponse(response);
  }
};

// Helper para manejar errores
export function handleApiError(error, elementId = 'error-message') {
  console.error('API Error:', error);
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = error.message;
    errorElement.classList.remove('hidden');
  }
  return Promise.reject(error);
}