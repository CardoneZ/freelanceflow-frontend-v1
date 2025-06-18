// assets/js/modules/services.js
import { professionalsAPI } from '../api.js';
import { showToast } from '../utils.js';
import { normalizeUser } from '../utils.js';
import { getCurrentUser } from '../auth.js';
console.log('getCurrentUser imported:', typeof getCurrentUser === 'function');
import { servicesAPI } from '../api.js';

export async function initServices() {
  console.log('Initializing services module');
  try {
    console.log('Before loadServices');
    await loadServices();
    console.log('After loadServices');
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing services:', error);
    showToast('Error initializing services', 'error');
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

async function loadServices() {
  try {
    const professionalId = getCurrentProfessionalId();
    if (!professionalId) {
      throw new Error('Professional ID not found');
    }
    console.log('Fetching services for professionalId:', professionalId);
    const response = await professionalsAPI.getServices(professionalId);
    console.log('Raw API response:', response);
    const services = Array.isArray(response) ? response : [];
    console.log('Services processed for rendering:', services);
    renderServices(services);
  } catch (error) {
    console.error('Error loading services - Details:', error);
    showToast('Error loading services: ' + (error.message || 'Unknown error'), 'error');
  }
}

function renderServices(services) {
  const container = document.getElementById('services-list');
  if (!services || !Array.isArray(services)) {
    container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No services found or invalid data</td></tr>';
    console.error('Invalid services data:', services);
    return;
  }
  
  if (services.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No services found</td></tr>';
    return;
  }
  
  container.innerHTML = services.map(service => `
    <tr class="border-t">
      <td class="px-6 py-4">${service.Name || 'N/A'}</td>
      <td class="px-6 py-4">${service.Description || 'N/A'}</td>
      <td class="px-6 py-4">$${service.Price || 0}/hour</td>
      <td class="px-6 py-4">${service.BaseDuration || 'N/A'} min</td>
      <td class="px-6 py-4 flex space-x-2">
        <button class="text-indigo-600 hover:text-indigo-900 mr-2 edit-service" data-id="${service.ServiceId || ''}">
          Edit
        </button>
        <button class="text-red-600 hover:text-red-900 delete-service" data-id="${service.ServiceId || ''}">
          Delete
        </button>
      </td>
    </tr>
  `).join('');
}

function setupEventListeners() {
  // Add service
  document.getElementById('add-service').addEventListener('click', () => {
    document.getElementById('service-modal').classList.remove('hidden');
  });

  // Refresh services
  document.getElementById('refresh-services')?.addEventListener('click', async () => {
    console.log('Refreshing services');
    await loadServices();
  });

  // Use event delegation for dynamically created buttons
  document.getElementById('services-list').addEventListener('click', (e) => {
    const editBtn = e.target.closest('.edit-service');
    const deleteBtn = e.target.closest('.delete-service');

    if (editBtn) {
      e.preventDefault();
      editService(editBtn.dataset.id);
    }

    if (deleteBtn) {
      e.preventDefault();
      deleteService(deleteBtn.dataset.id);
    }
  });

  // Save service
  document.getElementById('save-service').addEventListener('click', saveService);
}

async function editService(serviceId) {
  try {
    const service = await servicesAPI.getById(serviceId);
    const form = document.getElementById('service-form');
    
    form.name.value = service.Name || '';
    form.description.value = service.Description || '';
    form.price.value = service.Price || '';
    form.duration.value = service.BaseDuration || '';
    
    form.dataset.id = serviceId;
    document.getElementById('service-modal').classList.remove('hidden');
  } catch (error) {
    showToast('Error loading service', 'error');
  }
}

async function deleteService(serviceId) {
  if (!confirm('Are you sure you want to delete this service?')) return;
  
  try {
    await servicesAPI.delete(serviceId);
    showToast('Service deleted', 'success');
    await loadServices();
  } catch (error) {
    showToast('Error deleting service', 'error');
  }
}

async function saveService() {
  const form = document.getElementById('service-form');
  const serviceData = {
    Name: form.name.value,
    Description: form.description.value,
    Price: parseFloat(form.price.value),
    BaseDuration: parseInt(form.duration.value),
    MaxDuration: parseInt(form.maxDuration.value),
    DurationIncrement: parseInt(form.durationIncrement.value),
    PriceType: form.priceType.value,
    ProfessionalId: getCurrentProfessionalId()
  };

  try {
    if (form.dataset.id) {
      await servicesAPI.update(form.dataset.id, serviceData);
      showToast('Service updated', 'success');
    } else {
      await servicesAPI.create(serviceData);
      showToast('Service created', 'success');
    }
    
    document.getElementById('service-modal').classList.add('hidden');
    form.reset();
    await loadServices(); // Refresco automático
  } catch (error) {
    console.error('Error saving service:', error);
    showToast('Error saving service: ' + (error.message || 'Unknown error'), 'error');
  }
}
