// assets/js/modules/client/servicesClient.js
import { clientsAPI, professionalsAPI, servicesAPI, availabilityAPI, appointmentsAPI } from '../../api.js';
import { showToast } from '../../utils.js';
import { getCurrentUser } from '../../auth.js';


export async function initServicesClient() {
  console.log('Initializing client services module');
  try {
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing client services:', error);
    showToast('Error initializing services', 'error');
  }
}

function setupEventListeners() {
  // Search button
  document.getElementById('search-btn').addEventListener('click', performSearch);
  
  // Event delegation for booking buttons
  document.getElementById('search-results').addEventListener('click', (e) => {
    const bookBtn = e.target.closest('.book-btn');
    if (bookBtn) {
      e.preventDefault();
      const professionalId = bookBtn.dataset.id;
      const serviceId = bookBtn.dataset.serviceId;
      showBookingModal(professionalId, serviceId);
    }
  });
}

async function performSearch() {
  try {
    const serviceQuery = document.getElementById('service-search').value;
    const locationQuery = document.getElementById('location-search').value;
    const params = {};
    if (serviceQuery) params.search = serviceQuery; // Maps to search parameter
    if (locationQuery) params.location = locationQuery;
    const results = await professionalsAPI.getAllProfessionals(params); // Use getAllProfessionals
    renderSearchResults(results);
  } catch (error) {
    console.error('Search error:', error);
    showToast('Error performing search', 'error');
  }
}

function renderSearchResults(results) {
  const container = document.getElementById('search-results');
  console.log('Received results:', results);
  if (!results || results.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-4 text-center text-gray-500">
          No professionals found matching your criteria
        </td>
      </tr>
    `;
    return;
  }
  
  container.innerHTML = results.map(professional => {
    console.log('Professional data:', professional);
    return `
      <tr>
        <td class="px-6 py-4">
          <div class="flex items-center">
            <div class="flex-shrink-0 h-10 w-10">
              <img class="h-10 w-10 rounded-full" src="${professional.User?.ProfilePicture || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(professional.User?.FirstName + ' ' + professional.User?.LastName)}" alt="">
            </div>
            <div class="ml-4">
              <div class="text-sm font-medium text-gray-900">${professional.User?.FirstName} ${professional.User?.LastName}</div>
              <div class="text-sm text-gray-500">${professional.Title || 'Professional'}</div>
            </div>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="text-sm text-gray-900">${professional.services?.map(s => s.Name).join(', ') || 'No services listed'}</div>
        </td>
        <td class="px-6 py-4">
          <div class="text-sm text-gray-900">${professional.Location || 'N/A'}</div>
        </td>
        <td class="px-6 py-4">
          <div class="flex items-center">
            <div class="text-sm text-gray-900 mr-1">${professional.averageRating || '0'}</div>
            <i class="fas fa-star text-yellow-400"></i>
          </div>
        </td>
        <td class="px-6 py-4">
          <div class="flex flex-wrap gap-2">
            ${professional.services?.map(service => `
              <button class="book-btn px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700" 
                data-id="${professional.ProfessionalId}" 
                data-service-id="${service.ServiceId}">
                Book ${service.Name}
              </button>
            `).join('') || '<span class="text-gray-500 text-xs">No services available</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function showBookingModal(professionalId, serviceId) {
  try {
    // Load professional, service, and availability data
    const [professional, service, availability] = await Promise.all([
      professionalsAPI.getById(professionalId),
      servicesAPI.getById(serviceId),
      availabilityAPI.getProfessionalAvailability(professionalId, new Date().toISOString().split('T')[0])
    ]);
    console.log('Availability response:', availability); // Debug the response

    // Render booking form
    document.getElementById('booking-content').innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 class="font-medium text-gray-900">${service.Name}</h3>
          <p class="text-sm text-gray-500 mt-1">${service.Description || 'No description'}</p>
          <div class="mt-4">
            <div class="text-lg font-medium">$${service.Price} ${service.PriceType === 'hour' ? '/hour' : 'flat rate'}</div>
            <div class="text-sm text-gray-500">Duration: ${service.BaseDuration} minutes</div>
          </div>
        </div>
        
        <div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input type="date" id="appointment-date" class="w-full border-gray-300 rounded-md shadow-sm" min="${new Date().toISOString().split('T')[0]}">
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Available Times</label>
            <div id="time-slots" class="grid grid-cols-3 gap-2">
              <!-- Time slots will be loaded here -->
              <div class="text-center py-2 text-sm text-gray-500">Select a date first</div>
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
            <textarea id="appointment-notes" class="w-full border-gray-300 rounded-md shadow-sm" rows="3"></textarea>
          </div>
          
          <button id="confirm-booking" class="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Confirm Booking
          </button>
        </div>
      </div>
    `;
    
    // Add date change listener
    document.getElementById('appointment-date').addEventListener('change', async (e) => {
      const date = e.target.value;
      if (!date) return;
      
      const availability = await availabilityAPI.getProfessionalAvailability(professionalId, date);
      console.log('Slots for date:', availability.calendar); // Debug calendar slots
      renderTimeSlots(availability.calendar, service.BaseDuration);
    });
    
    // Add booking confirmation
    document.getElementById('confirm-booking').addEventListener('click', async () => {
      await bookAppointment(professionalId, serviceId);
    });
    
    // Show modal
    document.getElementById('booking-modal').classList.remove('hidden');
  } catch (error) {
    console.error('Error loading booking modal:', error);
    showToast('Error loading booking information', 'error');
  }
}

function renderTimeSlots(slots, duration) {
  const container = document.getElementById('time-slots');
  if (!slots || !Array.isArray(slots) || slots.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center py-2 text-sm text-gray-500">No availability for selected date</div>';
    return;
  }
  
  // Extract start times from calendar slots
  const timeSlots = slots
    .filter(slot => slot.start || (slot.daysOfWeek && slot.startTime))
    .map(slot => {
      if (slot.start) {
        return { startTime: moment(slot.start).format('HH:mm') };
      } else if (slot.daysOfWeek && slot.startTime) {
        return { startTime: slot.startTime };
      }
    })
    .filter(slot => slot);

  if (timeSlots.length === 0) {
    container.innerHTML = '<div class="col-span-3 text-center py-2 text-sm text-gray-500">No availability for selected date</div>';
    return;
  }

  container.innerHTML = timeSlots.map(slot => `
    <button class="time-slot-btn px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50" 
      data-start="${slot.startTime}">
      ${slot.startTime}
    </button>
  `).join('');

  // Add click event listener for selection
  container.querySelectorAll('.time-slot-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove selection from all buttons
      container.querySelectorAll('.time-slot-btn').forEach(b => {
        b.removeAttribute('aria-selected');
        b.classList.remove('bg-blue-100', 'border-blue-500');
      });
      // Select the clicked button
      btn.setAttribute('aria-selected', 'true');
      btn.classList.add('bg-blue-100', 'border-blue-500');
    });
  });
}

async function bookAppointment(professionalId, serviceId) {
  try {
    // 1. Get form values with validation
    const selectedDate = document.getElementById('appointment-date').value;
    const selectedTimeBtn = document.querySelector('.time-slot-btn[aria-selected="true"]');
    const selectedTime = selectedTimeBtn?.dataset.start;
    const notes = document.getElementById('appointment-notes').value;
    
    if (!selectedDate || !selectedTime) {
      showToast('Please select both date and time', 'error');
      return;
    }

    // 2. Construct ISO 8601 datetime string
    const timeParts = selectedTime.split(':');
    const isoString = `${selectedDate}T${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:00`;
    const startDate = new Date(isoString);
    
    if (isNaN(startDate.getTime())) {
      console.error('Invalid datetime:', { selectedDate, selectedTime, isoString });
      throw new Error('Invalid date/time combination');
    }

    // 3. Get authenticated user and verify client record
    const user = await getCurrentUser();
    if (!user) throw new Error('Session expired - please login again');
    
    const clientData = await clientsAPI.getByUserId(user.UserId);
    if (!clientData?.ClientId) {
      throw new Error('Your client profile is incomplete');
    }

    // 4. Get service details
    const service = await servicesAPI.getById(serviceId);
    if (!service) {
      throw new Error('Service no longer available');
    }

    // 5. Prepare appointment payload
    const payload = {
      ServiceId: serviceId,
      ProfessionalId: professionalId,
      ClientId: clientData.ClientId,
      StartTime: isoString,
      DurationMinutes: service.BaseDuration,
      Notes: notes?.trim() || undefined  // Send undefined if empty
    };

    console.debug('Submitting appointment:', payload);
    
    // 6. Submit to API with enhanced error handling
    const response = await appointmentsAPI.create({
      ServiceId: serviceId,
      ProfessionalId: professionalId,
      ClientId: clientData.ClientId,
      StartTime: isoString,
      DurationMinutes: service.BaseDuration,
      Notes: notes || undefined
    });

    if (!response.success) {
      throw new Error(response.message || 'Booking failed - server error');
    }

    showToast('Appointment booked successfully!', 'success');
    document.getElementById('booking-modal').classList.add('hidden');
    
    setTimeout(() => {
      window.location.href = 'appointmentsClient.html';
    }, 1500);

  } catch (error) {
    console.error('Booking error details:', {
      error,
      professionalId,
      serviceId,
      isoString,
      duration: service?.BaseDuration
    });
    
    showToast(
      error.message.includes('server') 
        ? 'Server error - please try later' 
        : 'Please check your data and try again',
      'error'
    );
  }
}

// Initialize the module
document.addEventListener('DOMContentLoaded', initServicesClient);