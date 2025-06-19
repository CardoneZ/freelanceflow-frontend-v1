// assets/js/utils.js
export function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

export function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

export function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '';
  
  for (let i = 1; i <= 5; i++) {
    if (i <= fullStars) {
      stars += '<i class="fas fa-star text-yellow-400"></i>';
    } else if (i === fullStars + 1 && hasHalfStar) {
      stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
    } else {
      stars += '<i class="far fa-star text-yellow-400"></i>';
    }
  }
  
  return stars;
}

export function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg text-white ${
    type === 'error' ? 'bg-red-500' : 
    type === 'success' ? 'bg-green-500' : 'bg-blue-500'
  }`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

export async function handleApiCall(apiCall, successMessage = '') {
    try {
        const response = await apiCall();
        if (successMessage) {
            showToast(successMessage, 'success');
        }
        return response;
    } catch (error) {
        console.error('API Error:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Unknown error';
        showToast(`Error: ${errorMsg}`, 'error');
        throw error;
    }
}

export function normalizeUser(user) {
  if (!user) return null;
  
  return {
    UserId: user.UserId,
    Email: user.Email,
    FirstName: user.FirstName,
    LastName: user.LastName,
    Role: user.Role,
    ProfilePicture: user.ProfilePicture,
    id: user.UserId,
    email: user.Email,
    firstName: user.FirstName,
    lastName: user.LastName,
    role: user.Role,
    profilePicture: user.ProfilePicture,
    professionalInfo: {
      title: user.Professional?.Title || null,
      bio: user.Professional?.Bio || null,
      hourlyRate: user.Professional?.HourlyRate || null,
      location: user.Professional?.Location || null
    }
  };
}

export function normalizeAppointment(appt) {
    if (!appt) return null;
    
    return {
        id: appt.AppointmentId || appt.id,
        startTime: appt.StartTime,
        endTime: appt.EndTime,
        status: appt.Status,
        service: {
            id: appt.Service?.ServiceId || appt.service?.id,
            name: appt.Service?.Name || appt.service?.name,
            price: appt.Service?.Price || appt.service?.price
        },
        client: {
            id: appt.Client?.ClientId || appt.client?.id,
            firstName: appt.Client?.User?.FirstName || appt.client?.firstName,
            lastName: appt.Client?.User?.LastName || appt.client?.lastName,
            email: appt.Client?.User?.Email || appt.client?.email,
            profilePicture: appt.Client?.User?.ProfilePicture || appt.client?.profilePicture
        }
    };
}