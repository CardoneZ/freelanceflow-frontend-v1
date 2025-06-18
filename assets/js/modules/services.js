// assets/js/modules/services.js
import { professionalsAPI } from '../api.js';
import { showToast } from '../utils.js';
import { normalizeUser } from '../utils.js';

export async function initServices() {
    try {
        await loadServices();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing services:', error);
        showToast('Error initializing services', 'error');
    }
}

function getCurrentProfessionalId() {
  const user = normalizeUser(getCurrentUser());
  if (!user) {
    console.error('No user found');
    return null;
  }
  return user.UserId; 
}


async function loadServices() {
  try {
    const professionalId = getCurrentProfessionalId();
    if (!professionalId) {
      throw new Error('Professional ID not found');
    }
    
    const services = await professionalsAPI.getServices(professionalId);
    renderServices(services);
  } catch (error) {
    console.error('Error loading services:', error);
    showToast('Error loading services', 'error');
  }
}

function renderServices(services) {
    const container = document.getElementById('services-list');
    
    if (!services.length) {
        container.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No services found</td></tr>';
        return;
    }
    
    container.innerHTML = services.map(service => `
        <tr class="border-t">
            <td class="px-6 py-4">${service.name}</td>
            <td class="px-6 py-4">$${service.price}/hour</td>
            <td class="px-6 py-4">
                <button class="text-indigo-600 hover:text-indigo-900 mr-2 edit-service" data-id="${service.id}">
                    Edit
                </button>
                <button class="text-red-600 hover:text-red-900 delete-service" data-id="${service.id}">
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

    // Edit service
    document.querySelectorAll('.edit-service').forEach(btn => {
        btn.addEventListener('click', () => editService(btn.dataset.id));
    });

    // Delete service
    document.querySelectorAll('.delete-service').forEach(btn => {
        btn.addEventListener('click', () => deleteService(btn.dataset.id));
    });

    // Save service
    document.getElementById('save-service').addEventListener('click', saveService);
}

async function editService(serviceId) {
    try {
        const service = await servicesAPI.getById(serviceId);
        const form = document.getElementById('service-form');
        
        form.name.value = service.name;
        form.description.value = service.description;
        form.price.value = service.price;
        form.duration.value = service.duration;
        
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
        name: form.name.value,
        description: form.description.value,
        price: parseFloat(form.price.value),
        duration: parseInt(form.duration.value),
        professionalId: getCurrentProfessionalId()
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
        await loadServices();
    } catch (error) {
        console.error('Error saving service:', error);
        showToast('Error saving service: ' + (error.message || 'Unknown error'), 'error');
    }
}

