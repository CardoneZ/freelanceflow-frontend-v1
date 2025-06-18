// assets/js/modules/appointments.js
import { appointmentsAPI } from '../api.js';
import { formatDate, formatTime, showToast } from '../utils.js';
import { getCurrentUser } from '../auth.js';

export async function initAppointments() {
    await loadAppointments();
    await loadCalendarAppointments();
    setupEventListeners();
}

function getCurrentProfessionalId() {
    const user = getCurrentUser();
    return user?.UserId;
}

async function loadAppointments(page = 1, limit = 10) {
    try {
        console.log('Loading appointments with page:', page, 'limit:', limit);
        const user = getCurrentUser();
        console.log('Current User:', user);
        const queryParams = { page, limit };
        if (user?.Role === 'professional') {
            queryParams.professionalId = user.UserId;
        } else if (user?.Role === 'client') {
            queryParams.clientId = user.UserId;
        }
        console.log('Query Params:', queryParams);
        const response = await appointmentsAPI.getAll(queryParams);
        console.log('API Response:', response);
        const normalizedAppointments = response.data.map(appt => ({
            id: appt.AppointmentId,
            startTime: appt.StartTime,
            endTime: appt.EndTime,
            status: appt.Status,
            service: {
                id: appt.Service?.ServiceId,
                name: appt.Service?.Name,
                price: appt.Service?.Price,
                professional: {
                    id: appt.Professional?.ProfessionalId,
                    firstName: appt.Professional?.User?.FirstName,
                    lastName: appt.Professional?.User?.LastName
                }
            },
            client: {
                id: appt.Client?.ClientId,
                firstName: appt.Client?.User?.FirstName,
                lastName: appt.Client?.User?.LastName,
                email: appt.Client?.User?.Email,
                profilePicture: appt.Client?.User?.ProfilePicture
            }
        }));
        console.log('Normalized Appointments:', normalizedAppointments);
        renderAppointmentsList(normalizedAppointments);
        updatePagination(response.pagination.totalItems, page, limit);
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Error loading appointments', 'error');
    }
}

function renderAppointmentsList(appointments) {
    const container = document.getElementById('appointments-list');
    if (!appointments || !appointments.length) {
        container.innerHTML = '<tr><td colspan="5" class="px-6 py-4 text-center text-gray-500">No appointments found</td></tr>';
        return;
    }
    container.innerHTML = appointments.map(appt => `
        <tr class="hover:bg-gray-50 cursor-pointer" data-id="${appt.id}">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <img class="h-10 w-10 rounded-full" 
                             src="${appt.client.profilePicture ? `http://localhost:4000${appt.client.profilePicture}` : 'https://ui-avatars.com/api/?name=' + (appt.client.firstName + ' ' + appt.client.lastName)}" alt="">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">
                            ${appt.client.firstName} ${appt.client.lastName}
                        </div>
                        <div class="text-sm text-gray-500">${appt.client.email || ''}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${appt.service.name}</div>
                <div class="text-sm text-gray-500">$${appt.service.price}/hour</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${formatDate(appt.startTime)}</div>
                <div class="text-sm text-gray-500">${formatTime(appt.startTime)} - ${formatTime(appt.endTime)}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(appt)}">
                    ${appt.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button class="text-indigo-600 hover:text-indigo-900 mr-2 view-appointment" data-id="${appt.id}">
                    View
                </button>
                ${appt.status === 'pending' && getCurrentUser().Role === 'professional' ? 
                    `<button class="text-green-600 hover:text-green-900 confirm-appointment" data-id="${appt.id}">
                        Confirm
                    </button>` : ''}
                ${(appt.status === 'pending' || appt.status === 'confirmed') && 
                  getCurrentUser().Role === 'client' ? 
                    `<button class="text-red-600 hover:text-red-900 cancel-appointment" data-id="${appt.id}">
                        Cancel
                    </button>` : ''}
                ${appt.status === 'confirmed' && getCurrentUser().Role === 'professional' ? 
                    `<button class="text-purple-600 hover:text-purple-900 complete-appointment" data-id="${appt.id}">
                        Complete
                    </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(appt) {
    switch(appt.status.toLowerCase()) {
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-purple-100 text-purple-800';
        case 'canceled': return 'bg-red-100 text-red-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

async function loadCalendarAppointments() {
    try {
        console.log('Initializing calendar');
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('Calendar element not found');
            return;
        }

        const calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: async (fetchInfo, successCallback, failureCallback) => {
                try {
                    console.log('Fetching calendar events with params:', fetchInfo);
                    const user = getCurrentUser();
                    const params = { start: fetchInfo.startStr, end: fetchInfo.endStr };
                    if (user?.Role === 'professional') params.professionalId = user.UserId;
                    else if (user?.Role === 'client') params.clientId = user.UserId;
                    const response = await appointmentsAPI.getAll(params);
                    console.log('Calendar API Response:', response);

                    const events = response.data.map(appt => {
                        const serviceName = appt.Service?.Name || 'Unknown Service';
                        const clientFirstName = appt.Client?.User?.FirstName || 'Unknown';
                        const proFirstName = appt.Professional?.User?.FirstName || 'Unknown';

                        return {
                            id: appt.AppointmentId,
                            title: user.Role === 'professional'
                                ? `${serviceName} with ${clientFirstName}`
                                : `${serviceName} with ${proFirstName}`,
                            start: appt.StartTime,
                            end: appt.EndTime,
                            color: getEventColor(appt.Status),
                            extendedProps: { status: appt.Status || 'Unknown' }
                        };
                    });
                    console.log('Calendar Events:', events);
                    successCallback(events);
                } catch (error) {
                    console.error('Error loading calendar events:', error);
                    failureCallback(error);
                }
            },
            eventClick: (info) => {
                openAppointmentModal(info.event.id);
            }
        });
        calendar.render();
        console.log('Calendar rendered');
    } catch (error) {
        console.error('Error initializing calendar:', error);
    }
}

function getEventColor(status) {
    switch(status.toLowerCase()) {
        case 'confirmed': return '#10B981';
        case 'completed': return '#8B5CF6';
        case 'canceled': return '#EF4444';
        case 'pending': return '#F59E0B';
        default: return '#6B7280';
    }
}

function updatePagination(total, currentPage, limit) {
    const countElement = document.getElementById('appointments-count');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    
    if (countElement) {
        const start = ((currentPage - 1) * limit) + 1;
        const end = Math.min(currentPage * limit, total);
        countElement.textContent = `Showing ${start}-${end} of ${total} appointments`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage <= 1;
        prevBtn.onclick = () => !prevBtn.disabled && loadAppointments(currentPage - 1, limit);
    }
    
    if (nextBtn) {
        const totalPages = Math.ceil(total / limit);
        nextBtn.disabled = currentPage >= totalPages;
        nextBtn.onclick = () => !nextBtn.disabled && loadAppointments(currentPage + 1, limit);
    }
}

function setupEventListeners() {
    document.getElementById('refresh-appointments')?.addEventListener('click', () => {
        loadAppointments();
    });
    
    document.addEventListener('click', async (e) => {
        if (e.target.closest('.view-appointment')) {
            const appointmentId = e.target.closest('.view-appointment').dataset.id;
            await openAppointmentModal(appointmentId);
        }
        
        if (e.target.closest('.confirm-appointment')) {
            const appointmentId = e.target.closest('.confirm-appointment').dataset.id;
            await updateAppointmentStatus(appointmentId, 'confirmed');
        }
        
        if (e.target.closest('.cancel-appointment')) {
            const appointmentId = e.target.closest('.cancel-appointment').dataset.id;
            await updateAppointmentStatus(appointmentId, 'canceled');
        }
        
        if (e.target.closest('.complete-appointment')) {
            const appointmentId = e.target.closest('.complete-appointment').dataset.id;
            await updateAppointmentStatus(appointmentId, 'completed');
        }
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('appointment-modal').classList.add('hidden');
    });

    document.getElementById('modal-confirm-btn')?.addEventListener('click', async () => {
        const appointmentId = document.getElementById('modal-confirm-btn').dataset.id;
        await updateAppointmentStatus(appointmentId, 'confirmed');
    });

    document.getElementById('modal-complete-btn')?.addEventListener('click', async () => {
        const appointmentId = document.getElementById('modal-complete-btn').dataset.id;
        await updateAppointmentStatus(appointmentId, 'completed');
    });

    document.getElementById('modal-cancel-btn')?.addEventListener('click', async () => {
        const appointmentId = document.getElementById('modal-cancel-btn').dataset.id;
        await updateAppointmentStatus(appointmentId, 'canceled');
    });
}

async function openAppointmentModal(appointmentId) {
    try {
        console.log('Opening modal for appointment:', appointmentId);
        const appointment = await appointmentsAPI.getById(appointmentId);
        const user = getCurrentUser();
        const otherParty = user.Role === 'professional' ? appointment.Client.User : appointment.Professional.User;
        document.getElementById('modal-client').textContent = `${otherParty.FirstName} ${otherParty.LastName}`;
        document.getElementById('modal-service').textContent = appointment.Service.Name;
        document.getElementById('modal-date').textContent = formatDate(appointment.StartTime);
        document.getElementById('modal-time').textContent = `${formatTime(appointment.StartTime)} - ${formatTime(appointment.EndTime)}`;
        document.getElementById('modal-status').textContent = appointment.Status;
        
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const completeBtn = document.getElementById('modal-complete-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        
        confirmBtn.style.display = appointment.Status === 'pending' && user.Role === 'professional' ? 'block' : 'none';
        completeBtn.style.display = appointment.Status === 'confirmed' && user.Role === 'professional' ? 'block' : 'none';
        cancelBtn.style.display = !['completed', 'canceled'].includes(appointment.Status) ? 'block' : 'none';
        
        [confirmBtn, completeBtn, cancelBtn].forEach(btn => {
            btn.dataset.id = appointmentId;
        });
        
        document.getElementById('appointment-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error loading appointment details:', error);
        showToast('Error loading appointment details', 'error');
    }
}

async function updateAppointmentStatus(appointmentId, status) {
  try {
    console.log(`Updating appointment ${appointmentId} to status: ${status}`);
    const user = getCurrentUser();
    if (!user || user.Role !== 'professional') {
      throw new Error('Unauthorized: Only professionals can perform this action');
    }

    await appointmentsAPI.updateAppointmentStatus(appointmentId, status);
    showToast(`Appointment ${status} successfully`, 'success');
    await loadAppointments();
    await loadCalendarAppointments();
    document.getElementById('appointment-modal').classList.add('hidden');
  } catch (error) {
    console.error(`Failed to ${status} appointment:`, error);
    showToast(`Failed to ${status} appointment: ${error.message || 'Server error'}`, 'error');
  }
}