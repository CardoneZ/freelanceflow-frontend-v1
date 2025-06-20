// assets/js/modules/reviewsClient.js
import { reviewsAPI, clientsAPI } from '../api.js';
import { getCurrentUser } from '../auth.js';
import { showToast } from '../utils.js';

export async function initReviews() {
  try {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = '../logIn.html';
      return;
    }

    // 1. Obtener el ClientId asociado al usuario
    const clientData = await clientsAPI.getByUserId(user.UserId);
    
    if (!clientData || !clientData.ClientId) {
      throw new Error('No se pudo obtener el perfil de cliente');
    }

    const clientId = clientData.ClientId;

    // 2. Cargar las citas que pueden ser evaluadas
    await loadReviewableAppointments(clientId);
    
    // 3. Cargar las reviews existentes de este cliente
    await loadClientReviews(clientId);

  } catch (error) {
    console.error('Error inicializando reviews:', error);
    showToast('Error al cargar reseñas', 'error');
  }
}

async function loadReviewableAppointments(clientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/appointments/reviewable?clientId=${clientId}`, {
      headers: getAuthHeader()
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar citas');
    }

    const { appointments } = await response.json();
    const container = document.getElementById('reviewable-appointments');
    
    if (!appointments || appointments.length === 0) {
      container.innerHTML = '<p class="text-gray-500 py-4">No tienes citas completadas para evaluar</p>';
      return;
    }
    
    let html = '<div class="space-y-4">';
    appointments.forEach(appt => {
      html += `
        <div class="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div class="flex justify-between items-start">
            <div>
              <h4 class="font-medium">${appt.Service?.Name || 'Servicio'}</h4>
              <p class="text-sm text-gray-500">${new Date(appt.StartTime).toLocaleString()}</p>
              <p class="text-sm mt-1">Profesional: ${appt.Professional?.User?.FirstName || ''} ${appt.Professional?.User?.LastName || ''}</p>
            </div>
            <button onclick="showReviewForm('${appt.AppointmentId}')" 
              class="px-3 py-1 bg-primary-600 text-white rounded-md text-sm hover:bg-primary-700">
              Escribir reseña
            </button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando citas:', error);
    document.getElementById('reviewable-appointments').innerHTML = 
      '<p class="text-red-500 py-4">Error al cargar citas</p>';
  }
}

async function loadClientReviews(clientId) {
  try {
    const response = await fetch(`${API_BASE_URL}/reviews/client/${clientId}`, {
      headers: getAuthHeader()
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar reseñas');
    }

    const { reviews, totalReviews, averageRating } = await response.json();
    const container = document.getElementById('reviews-list');
    
    // Actualizar estadísticas
    document.getElementById('total-reviews').textContent = totalReviews || '0';
    document.getElementById('average-rating').textContent = 
      averageRating ? averageRating.toFixed(1) : '—';
    
    if (!reviews || reviews.length === 0) {
      container.innerHTML = `
        <div class="px-6 py-4 text-center text-gray-500">
          <i class="far fa-star text-gray-400 text-xl mb-2"></i>
          <p>No has escrito ninguna reseña todavía</p>
        </div>
      `;
      return;
    }
    
    let html = '';
    reviews.forEach(review => {
      html += `
        <div class="px-6 py-4">
          <div class="flex items-start">
            <div class="flex-shrink-0">
              <img class="h-10 w-10 rounded-full" 
                src="https://ui-avatars.com/api/?name=${review.Professional?.User?.FirstName}+${review.Professional?.User?.LastName}" 
                alt="Profesional">
            </div>
            <div class="ml-4 flex-1">
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium text-gray-900">
                  ${review.Professional?.User?.FirstName} ${review.Professional?.User?.LastName}
                </h4>
                <div class="star-rating">
                  <div class="filled" style="width: ${(review.Rating / 5) * 100}%">
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                  <div>
                    <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                  </div>
                </div>
              </div>
              <p class="text-sm text-gray-500 mt-1">
                ${new Date(review.createdAt).toLocaleDateString()}
              </p>
              <p class="mt-2 text-sm text-gray-700">
                ${review.Comment || 'No hay comentario'}
              </p>
              <div class="mt-3 flex space-x-3">
                <button onclick="editReview('${review.ReviewId}')" 
                  class="text-sm text-primary-600 hover:text-primary-800">
                  Editar
                </button>
                <button onclick="deleteReview('${review.ReviewId}')" 
                  class="text-sm text-red-600 hover:text-red-800">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
    
  } catch (error) {
    console.error('Error cargando reseñas:', error);
    document.getElementById('reviews-list').innerHTML = `
      <div class="px-6 py-4 text-center text-red-500">
        <i class="fas fa-exclamation-circle text-xl mb-2"></i>
        <p>Error al cargar reseñas</p>
      </div>
    `;
  }
}

// Helper para headers de autenticación
function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

// Funciones globales para los botones
window.showReviewForm = async (appointmentId) => {
  // Implementar modal para crear reseña
  console.log('Mostrar formulario para cita:', appointmentId);
};

window.editReview = async (reviewId) => {
  // Implementar edición de reseña
  console.log('Editar reseña:', reviewId);
};

window.deleteReview = async (reviewId) => {
  if (confirm('¿Estás seguro de eliminar esta reseña?')) {
    try {
      await reviewsAPI.delete(reviewId);
      const user = getCurrentUser();
      const client = await clientsAPI.getByUserId(user.UserId);
      await loadClientReviews(client.ClientId);
      showToast('Reseña eliminada correctamente', 'success');
    } catch (error) {
      console.error('Error eliminando reseña:', error);
      showToast('Error al eliminar reseña', 'error');
    }
  }
};