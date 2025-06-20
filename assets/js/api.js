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

  async updateUser(userId, userData) {
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

  async getAllProfessionals(queryParams = {}) {
  const params = new URLSearchParams(queryParams);
  const response = await fetch(`${API_BASE_URL}/professionals/clients?${params}`, fetchConfig('GET'));
  const professionals = await handleResponse(response);
  const withStats = await Promise.all(professionals.map(async (p) => {
    const stats = await professionalsAPI.getStats(p.ProfessionalId);
    return { ...p, averageRating: stats.averageRating || 0 };
  }));
  
  return withStats;
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
  }, 
  
  async createException(professionalId, exceptionData) {
    const response = await fetch(`${API_BASE_URL}/${professionalId}/availability/exceptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exceptionData)
    });
    return await response.json();
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
  },

  async create(appointmentData) {
  const response = await fetch(`${API_BASE_URL}/appointments`, 
    fetchConfig('POST', appointmentData));
  
  const data = await handleResponse(response);
  
  if (!data.success) {
    throw new Error(data.message || 'Booking failed');
  }
  
  return data;
  },

  async getClientAppointments(userId, params = {}) {
  try {
    // First get the ClientId for this UserId
    const clientData = await clientsAPI.getByUserId(userId);
    
    if (!clientData || !clientData.ClientId) {
      throw new Error('No client profile found');
    }

    const queryParams = new URLSearchParams({
      ...params,
      clientId: clientData.ClientId // Use the actual ClientId
    }).toString();

    const response = await fetch(`${API_BASE_URL}/appointments?${queryParams}`, {
      headers: getAuthHeader(),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in getClientAppointments:', error);
    throw error;
  }
},

  async cancel(id) {
  const response = await fetch(`${API_BASE_URL}/appointments/${id}/cancel`, {
    method: 'PATCH',
    headers: getAuthHeader(),
    credentials: 'include'
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || `Failed to cancel appointment: ${response.status}`);
    error.status = response.status;
    throw error;
  }
  
  return await response.json();
  }
};

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}


// Availability API
export const availabilityAPI = {
  async getProfessionalAvailability(professionalId, date) {
    const response = await fetch(`${API_BASE_URL}/availability/${professionalId}?date=${date}`, 
      fetchConfig('GET'));
    return handleResponse(response);
  },

  async getSlot(professionalId, slotId) {
    const response = await fetch(`${API_BASE_URL}/availability/${professionalId}/${slotId}`, 
      fetchConfig('GET'));
    return handleResponse(response);
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

  async update(professionalId, slotId, availabilityData) {
    const url = `${API_BASE_URL}/availability/${professionalId}/${slotId}`;
    const response = await fetch(url, {
      method: 'PUT',
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
  },
  async getByUserId(userId) {
  const response = await fetch(`${API_BASE_URL}/clients/user/${userId}`, 
    fetchConfig('GET'));
  return handleResponse(response);
  }
};

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