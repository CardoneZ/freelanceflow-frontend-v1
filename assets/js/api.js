// assets/js/api.js
export const API_BASE_URL = window.API_BASE_URL || 'http://localhost:4000/api';

// Helper mejorado para manejar respuestas
async function handleResponse(response) {
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    if (response.status === 401) {
      const auth = await import('./auth.js');
      auth.logout();
      window.location.href = '/login.html';
      return;
    }

    const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  return response.json();
}

// Configuración común mejorada para fetch
function fetchConfig(method, data = null, headers = {}) {
  const token = localStorage.getItem('token');
  console.log('Token:', token); // Agregar para depuración
  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...headers
    },
    credentials: 'include' // Asegura que las cookies se envíen si usas sesiones
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  return config;
}

// Auth API
export const authAPI = {
  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, 
      fetchConfig('POST', userData));
    return handleResponse(response);
  },

  async login(Email, Password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, 
      fetchConfig('POST', { Email, Password }));
    const data = await handleResponse(response);
    
    if (data.token) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    
    return data;
  },

  async getMe() {
    const response = await fetch(`${API_BASE_URL}/auth/me`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async changePassword(currentPassword, newPassword) {
    const response = await fetch(`${API_BASE_URL}/auth/change-password`, 
      fetchConfig('PUT', { currentPassword, newPassword }));
    return handleResponse(response);
  },

  async upgradeToProfessional(professionalData) {
    const response = await fetch(`${API_BASE_URL}/auth/upgrade`, 
      fetchConfig('POST', professionalData));
    return handleResponse(response);
  }
};

// Users API
export const usersAPI = {
  async getCurrentUser() {
    const response = await fetch(`${API_BASE_URL}/users/me`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

 updateUser: async (userId, userData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, 
      fetchConfig('PUT', userData));
    return await handleResponse(response);
  } catch (error) {
    console.error('API updateUser error:', error);
    throw error;
  }
},

  async uploadProfilePicture(formData) {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/users/upload-profile`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    return handleResponse(response);
  }
};

// Professionals API
export const professionalsAPI = {
  async getAll(queryParams = {}) {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${API_BASE_URL}/professionals?${params}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/professionals/${id}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getStats(professionalId) {
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}/stats`, 
        fetchConfig('GET'));
    const data = await handleResponse(response);
    
    if (data.success && data.stats) {
        return {
            ...data,
            stats: {
                totalAppointments: parseInt(data.stats.totalAppointments) || 0,
                totalEarnings: parseFloat(data.stats.totalEarnings) || 0,
                averageRating: parseFloat(data.stats.averageRating) || 0,
                upcomingToday: parseInt(data.stats.upcomingToday) || 0
            }
        };
    }
    return data;
  },

  async getServices(professionalId) {
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}/services`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getAvailability(professionalId, date) {
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}/availability?date=${date}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async updateProfessional(professionalId, professionalData) {
    const response = await fetch(`${API_BASE_URL}/professionals/${professionalId}`, 
      fetchConfig('PUT', professionalData));
    return handleResponse(response);
  }
};

// Services API
export const servicesAPI = {
  async getAll(queryParams = {}) {
    const params = new URLSearchParams(queryParams).toString();
    const response = await fetch(`${API_BASE_URL}/services?${params}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/services/${id}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async create(serviceData) {
    const response = await fetch(`${API_BASE_URL}/services`, 
      fetchConfig('POST', serviceData));
    return handleResponse(response);
  },

  async update(serviceId, serviceData) {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, 
      fetchConfig('PUT', serviceData));
    return handleResponse(response);
  },

  async delete(serviceId) {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}`, 
      fetchConfig('DELETE'));
    return handleResponse(response);
  },

  async validateDuration(serviceId, duration) {
    const response = await fetch(`${API_BASE_URL}/services/${serviceId}/validate/${duration}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  }
};

// Appointments API
export const appointmentsAPI = {
  async getProfessionalAppointments(professionalId, params = {}) {
    const { page, limit, ...otherParams } = params;
    const queryParams = new URLSearchParams({
      ...otherParams,
      ...(page && { page }),
      ...(limit && { limit })
    }).toString();
    
    const response = await fetch(`${API_BASE_URL}/appointments?professionalId=${professionalId}&${queryParams}`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async getUpcomingAppointments() {
    const response = await fetch(`${API_BASE_URL}/appointments/upcoming/me`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async getAll(params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/appointments?${queryParams}`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async updateAppointmentStatus(id, status) {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader()
      },
      body: JSON.stringify({ Status: status })
    });
    return handleResponse(response);
  },

  async cancelAppointment(id) {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  },

  async completeAppointment(id) {
    const response = await fetch(`${API_BASE_URL}/appointments/${id}/complete`, {
      method: 'PATCH',
      headers: getAuthHeader()
    });
    return handleResponse(response);
  }
  
};

// Availability API
export const availabilityAPI = {
    async getProfessionalAvailability(professionalId, date) {
        const url = `${API_BASE_URL}/availability/${professionalId}?date=${date}&duration=60`;
        console.log('Fetching availability from:', url); // Debug log
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        console.log('Availability API response:', data); // Debug log
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return data;
    },
    async create(professionalId, availabilityData) {
    const url = `${API_BASE_URL}/availability/${professionalId}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${localStorage.getItem('token')}` 
        },
        body: JSON.stringify({ availability: availabilityData })
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.message || `HTTP error! status: ${response.status}`);
        error.status = response.status;
        error.data = errorData;
        throw error;
    }
    
    return response.json();
},
    async delete(professionalId, slotId) {
        const url = `${API_BASE_URL}/availability/${professionalId}/${slotId}`;
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    }
};

// Reviews API
export const reviewsAPI = {
  async create(reviewData) {
    const response = await fetch(`${API_BASE_URL}/reviews`, 
      fetchConfig('POST', reviewData));
    return handleResponse(response);
  },

  async getProfessionalReviews(professionalId, queryParams = {}) {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${API_BASE_URL}/reviews/professional/${professionalId}?${params}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/reviews/${id}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async update(reviewId, reviewData) {
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, 
      fetchConfig('PUT', reviewData));
    return handleResponse(response);
  },

  async delete(reviewId) {
    const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`, 
      fetchConfig('DELETE'));
    return handleResponse(response);
  }
};

// Clients API
export const clientsAPI = {
  async getAll(queryParams = {}) {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${API_BASE_URL}/clients?${params}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getById(id) {
    const response = await fetch(`${API_BASE_URL}/clients/${id}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getAppointments(clientId, queryParams = {}) {
    const params = new URLSearchParams(queryParams);
    const response = await fetch(`${API_BASE_URL}/clients/${clientId}/appointments?${params}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  }
};

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}


// Exportación global para facilitar el acceso
export default {
  auth: authAPI,
  users: usersAPI,
  professionals: professionalsAPI,
  services: servicesAPI,
  appointments: appointmentsAPI,
  availability: availabilityAPI,
  reviews: reviewsAPI,
  clients: clientsAPI
};