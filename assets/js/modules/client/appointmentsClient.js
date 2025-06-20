import { appointmentsAPI, clientsAPI} from '../../api.js';
import { showToast } from '../../utils.js';
import { formatCalendarEvents } from '../../../utils/calendarUtils.js'; 
import { getCurrentUser } from '../../auth.js';

export async function initAppointmentsClient() {
  try {
    await loadAppointments();
    setupCalendar();
    setupTabNavigation();
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing appointments:', error);
    showToast('Error loading appointments', 'error');
  }
}

let currentPage = 1;
const itemsPerPage = 10;
let totalAppointments = 0;

async function loadAppointments(page = 1) {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  
  console.log('Current user:', user); // Debug log
  
  // Show loading state
  document.getElementById('appointments-list').innerHTML = `
    <tr>
      <td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
        Loading appointments...
      </td>
    </tr>
  `;

  try {
    // Step 1: Get the ClientId for this User
    const clientResponse = await clientsAPI.getByUserId(user.UserId);
    console.log('Client response:', clientResponse); // Debug
    
    if (!clientResponse || !clientResponse.ClientId) {
      throw new Error('No client profile found for this user');
    }

    const clientId = clientResponse.ClientId;
    
    // Step 2: Fetch appointments using the correct ClientId
    const response = await appointmentsAPI.getAll({
      page,
      limit: itemsPerPage,
      clientId: clientId // Use the actual ClientId here
    });
    
    console.log('Appointments API response:', response); // Debug

    if (response && Array.isArray(response)) {
      // Handle direct array response
      totalAppointments = response.length;
      renderAppointments(response);
      updatePagination(page, {
        totalItems: response.length,
        currentPage: page,
        itemsPerPage,
        totalPages: Math.ceil(response.length / itemsPerPage),
        hasNextPage: page * itemsPerPage < response.length,
        hasPreviousPage: page > 1
      });
    } else if (response && response.data) {
      // Handle paginated response
      totalAppointments = response.pagination?.totalItems || 0;
      renderAppointments(response.data);
      updatePagination(page, response.pagination || {});
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    console.error('Error loading appointments:', error);
    showToast(error.message || 'Error loading appointments', 'error');
    
    document.getElementById('appointments-list').innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
          ${error.message || 'Error loading appointments'}
        </td>
      </tr>
    `;
  }
}

function renderAppointments(appointments) {
   const container = document.getElementById('appointments-list');
  
  // Debug log
  console.log('Rendering appointments:', appointments);
  
  if (!appointments || appointments.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
          No appointments found for client ID ${getCurrentUser()?.UserId}
        </td>
      </tr>
    `;
    document.getElementById('appointments-count').textContent = 'Showing 0 appointments';
    return;
  }

  container.innerHTML = appointments.map(appt => `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center">
          <div class="text-sm font-medium text-gray-900">
            ${appt.Professional?.User?.FirstName || 'Professional'} ${appt.Professional?.User?.LastName || ''}
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">${appt.Service?.Name || 'Service'}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="text-sm text-gray-900">
          ${new Date(appt.StartTime).toLocaleDateString()} 
          ${new Date(appt.StartTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
          ${appt.Status === 'completed' ? 'bg-green-100 text-green-800' : 
            appt.Status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 
            appt.Status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'}">
          ${appt.Status.charAt(0).toUpperCase() + appt.Status.slice(1)}
        </span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button class="view-btn text-primary-600 hover:text-primary-900 mr-2" data-id="${appt.AppointmentId}">
          View
        </button>
        ${appt.Status === 'pending' ? `
          <button class="cancel-btn text-red-600 hover:text-red-900" data-id="${appt.AppointmentId}">
            Cancel
          </button>
        ` : ''}
      </td>
    </tr>
  `).join('');

  document.getElementById('appointments-count').textContent = 
    `Showing ${appointments.length} of ${totalAppointments} appointments`;
}

  export async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  
  try {
    showToast('Cancelling appointment...', 'info');
    
    const result = await appointmentsAPI.cancel(appointmentId);
    
    if (result.success) {
      showToast('Appointment cancelled successfully', 'success');
      await loadAppointments(currentPage);
    } else {
      showToast(result.message || 'Appointment cancellation failed', 'error');
    }
  } catch (error) {
    console.error('Cancellation error:', error);
    console.log('Error details:', error.response ? error.response.data : error.message);
    showToast(error.message || 'Error cancelling appointment', 'error');
    
    if (error.message.includes('24 hours')) {
      showToast(`Cancellation failed: ${error.message}`, 'error', 5000);
    } else if (error.message.includes('authorized')) {
      window.location.href = '/login.html';
    }
  }
}


function updatePagination(current, pagination) {
  currentPage = current;
  const prevBtn = document.getElementById('prev-page');
  const nextBtn = document.getElementById('next-page');

  prevBtn.disabled = !pagination.hasPreviousPage;
  nextBtn.disabled = !pagination.hasNextPage;
}

function setupCalendar() {
  const calendarEl = document.getElementById('calendar');
  
  // Make sure the calendar element is visible
  calendarEl.style.display = 'block';
  
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    height: 'auto',
    contentHeight: 'auto',
    aspectRatio: 1.5,
    events: async function(fetchInfo, successCallback) {
      try {
        const user = getCurrentUser();
        const response = await appointmentsAPI.getClientAppointments(user.UserId, {
          dateFrom: fetchInfo.start.toISOString(),
          dateTo: fetchInfo.end.toISOString(),
          clientId: user.UserId
        });
        
        // Debug log for calendar events
        console.log('Calendar events:', response.data);
        
        if (response.data && response.data.length > 0) {
          successCallback(formatCalendarEvents(response.data));
        } else {
          successCallback([]);
          showToast('No appointments found for this period', 'info');
        }
      } catch (error) {
        console.error('Error loading calendar events:', error);
        showToast('Error loading calendar events', 'error');
        successCallback([]);
      }
    },
    eventClick: function(info) {
      showAppointmentModal(info.event.extendedProps.appointment);
    }
  });
  
  calendar.render();
  
  // Force a refresh after rendering
  setTimeout(() => {
    calendar.updateSize();
  }, 100);
}

function setupTabNavigation() {
  const listTab = document.getElementById('tab-list');
  const calendarTab = document.getElementById('tab-calendar');
  const listView = document.getElementById('appointments-view');
  const calendarView = document.getElementById('calendar-view');

  listTab.addEventListener('click', () => {
    listTab.classList.add('border-primary-500', 'text-primary-600');
    listTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    calendarTab.classList.remove('border-primary-500', 'text-primary-600');
    calendarTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    listView.classList.remove('hidden');
    calendarView.classList.add('hidden');
  });

  calendarTab.addEventListener('click', () => {
    calendarTab.classList.add('border-primary-500', 'text-primary-600');
    calendarTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    listTab.classList.remove('border-primary-500', 'text-primary-600');
    listTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    calendarView.classList.remove('hidden');
    listView.classList.add('hidden');
  });
}

function setupEventListeners() {
  // View appointment details
  document.getElementById('appointments-list').addEventListener('click', (e) => {
    const viewBtn = e.target.closest('.view-btn');
    if (viewBtn) {
      const appointmentId = viewBtn.dataset.id;
      showAppointmentDetails(appointmentId);
    }
    
    const cancelBtn = e.target.closest('.cancel-btn');
    if (cancelBtn) {
      const appointmentId = cancelBtn.dataset.id;
      cancelAppointment(appointmentId);
    }
  });

  // Pagination
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      loadAppointments(currentPage - 1);
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    if (currentPage * itemsPerPage < totalAppointments) {
      loadAppointments(currentPage + 1);
    }
  });

  // Refresh appointments
  document.getElementById('refresh-appointments').addEventListener('click', () => loadAppointments(currentPage));

  // Modal close
  document.getElementById('modal-close-btn').addEventListener('click', () => {
    document.getElementById('appointment-modal').classList.add('hidden');
  });

  // Modal cancel
  document.getElementById('modal-cancel-btn').addEventListener('click', async (e) => {
    const appointmentId = e.target.dataset.id;
    await cancelAppointment(appointmentId);
    document.getElementById('appointment-modal').classList.add('hidden');
  });
}

async function showAppointmentDetails(appointmentId) {
  try {
    const appointment = await appointmentsAPI.getById(appointmentId);
    showAppointmentModal(appointment);
  } catch (error) {
    showToast('Error loading appointment details', 'error');
  }
}


function showAppointmentModal(appointment) {
  document.getElementById('modal-client').textContent = 
    `${appointment.Professional?.User?.FirstName || 'Professional'} ${appointment.Professional?.User?.LastName || ''}`;
  document.getElementById('modal-service').textContent = appointment.Service?.Name || 'Service';
  document.getElementById('modal-date').textContent = new Date(appointment.StartTime).toLocaleDateString();
  document.getElementById('modal-time').textContent = new Date(appointment.StartTime).toLocaleTimeString();
  document.getElementById('modal-status').textContent = appointment.Status.charAt(0).toUpperCase() + appointment.Status.slice(1);
  
  document.getElementById('modal-cancel-btn').classList.toggle('hidden', appointment.Status !== 'pending');
  document.getElementById('modal-cancel-btn').dataset.id = appointment.AppointmentId;
  
  document.getElementById('appointment-modal').classList.remove('hidden');
};
