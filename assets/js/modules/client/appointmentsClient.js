import { appointmentsAPI } from '../../api.js';
import { showToast, formatCalendarEvents } from '../../utils.js';
import { getCurrentUser } from '../../auth.js';

export async function initAppointmentsClient() {
  try {
    await loadAppointments();
    setupCalendar();
    setupEventListeners();
  } catch (error) {
    console.error('Error initializing appointments:', error);
    showToast('Error loading appointments', 'error');
  }
}

async function loadAppointments() {
  const user = getCurrentUser();
  if (!user) throw new Error('User not authenticated');
  
  const response = await appointmentsAPI.getClientAppointments(user.UserId);
  renderAppointments(response.data);
  return response.data;
}

function renderAppointments(appointments) {
  const container = document.getElementById('appointments-list');
  
  if (!appointments || appointments.length === 0) {
    container.innerHTML = `
      <tr>
        <td colspan="5" class="px-6 py-4 text-center text-gray-500">
          No appointments found
        </td>
      </tr>
    `;
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
            'bg-yellow-100 text-yellow-800'}">
          ${appt.Status}
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
}

function setupCalendar() {
  const calendarEl = document.getElementById('calendar');
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: async function(fetchInfo, successCallback) {
      try {
        const user = getCurrentUser();
        const response = await appointmentsAPI.getClientAppointments(user.UserId, {
          dateFrom: fetchInfo.start.toISOString(),
          dateTo: fetchInfo.end.toISOString()
        });
        successCallback(formatCalendarEvents(response.data));
      } catch (error) {
        console.error('Error loading calendar events:', error);
      }
    },
    eventClick: function(info) {
      showAppointmentModal(info.event.extendedProps.appointment);
    }
  });
  calendar.render();
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

  // Refresh appointments
  document.getElementById('refresh-appointments').addEventListener('click', loadAppointments);
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
    `${appointment.Professional?.User?.FirstName} ${appointment.Professional?.User?.LastName}`;
  document.getElementById('modal-service').textContent = appointment.Service?.Name;
  document.getElementById('modal-date').textContent = new Date(appointment.StartTime).toLocaleDateString();
  document.getElementById('modal-time').textContent = new Date(appointment.StartTime).toLocaleTimeString();
  document.getElementById('modal-status').textContent = appointment.Status;
  
  // Show/hide action buttons based on status
  document.getElementById('modal-confirm-btn').classList.add('hidden');
  document.getElementById('modal-complete-btn').classList.add('hidden');
  document.getElementById('modal-cancel-btn').classList.toggle('hidden', appointment.Status !== 'pending');
  
  // Set data-id for action buttons
  document.getElementById('modal-cancel-btn').dataset.id = appointment.AppointmentId;
  
  document.getElementById('appointment-modal').classList.remove('hidden');
}

async function cancelAppointment(appointmentId) {
  if (!confirm('Are you sure you want to cancel this appointment?')) return;
  
  try {
    await appointmentsAPI.cancel(appointmentId);
    showToast('Appointment cancelled successfully', 'success');
    await loadAppointments();
  } catch (error) {
    showToast('Error cancelling appointment', 'error');
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', initAppointmentsClient);