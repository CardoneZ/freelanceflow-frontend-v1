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
    return user.UserId;
}

async function loadAppointments(page = 1, limit = 10) {
    try {
        const response = await appointmentsAPI.getAll({
            professionalId: getCurrentProfessionalId(),
            page,
            limit
        });
        
        renderAppointmentsList(response.appointments);
        updatePagination(response.total, page, limit);
    } catch (error) {
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
                        <img class="h-10 w-10 rounded-full" src="${appt.client.profilePicture || 'https://ui-avatars.com/api/?name=' + appt.client.name}" alt="">
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${appt.client.name}</div>
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
                ${appt.status === 'pending' ? 
                    `<button class="text-green-600 hover:text-green-900 confirm-appointment" data-id="${appt.id}">
                        Confirm
                    </button>` : ''}
            </td>
        </tr>
    `).join('');
}

function getStatusBadgeClass(appt) {
    switch(appt.status.toLowerCase()) {
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'completed': return 'bg-purple-100 text-purple-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

async function loadCalendarAppointments() {
    try {
        const calendarEl = document.getElementById('calendar');
        
        if (!calendarEl) return;
        
        const calendar = new FullCalendar.Calendar(calendarEl, {
            plugins: [FullCalendar.dayGridPlugin, FullCalendar.timeGridPlugin, FullCalendar.interactionPlugin],
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: async (fetchInfo, successCallback, failureCallback) => {
                try {
                    const appointments = await appointmentsAPI.getAll({
                        professionalId: getCurrentProfessionalId(),
                        start: fetchInfo.startStr,
                        end: fetchInfo.endStr
                    });
                    
                    const events = appointments.map(appt => ({
                        id: appt.id,
                        title: `${appt.service.name} with ${appt.client.name}`,
                        start: appt.startTime,
                        end: appt.endTime,
                        color: getEventColor(appt.status),
                        extendedProps: {
                            status: appt.status
                        }
                    }));
                    
                    successCallback(events);
                } catch (error) {
                    failureCallback(error);
                }
            },
            eventClick: (info) => {
                openAppointmentModal(info.event.id);
            }
        });
        
        calendar.render();
    } catch (error) {
        console.error('Error initializing calendar:', error);
    }
}

function getEventColor(status) {
    switch(status.toLowerCase()) {
        case 'confirmed': return '#10B981'; // green
        case 'completed': return '#8B5CF6'; // purple
        case 'cancelled': return '#EF4444'; // red
        case 'pending': return '#F59E0B'; // yellow
        default: return '#6B7280'; // gray
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
    // Refresh appointments
    document.getElementById('refresh-appointments')?.addEventListener('click', () => {
        loadAppointments();
    });
    
    // Handle appointment actions
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
            await updateAppointmentStatus(appointmentId, 'cancelled');
        }
        
        if (e.target.closest('.complete-appointment')) {
            const appointmentId = e.target.closest('.complete-appointment').dataset.id;
            await updateAppointmentStatus(appointmentId, 'completed');
        }
    });
}

async function openAppointmentModal(appointmentId) {
    try {
        const appointment = await appointmentsAPI.getById(appointmentId);
        const modal = document.getElementById('appointment-modal');
        
        document.getElementById('modal-client').textContent = appointment.client.name;
        document.getElementById('modal-service').textContent = appointment.service.name;
        document.getElementById('modal-date').textContent = formatDate(appointment.startTime);
        document.getElementById('modal-time').textContent = `${formatTime(appointment.startTime)} - ${formatTime(appointment.endTime)}`;
        document.getElementById('modal-status').textContent = appointment.status;
        
        // Set up action buttons based on status
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const completeBtn = document.getElementById('modal-complete-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');
        
        confirmBtn.style.display = appointment.status === 'pending' ? 'block' : 'none';
        completeBtn.style.display = appointment.status === 'confirmed' ? 'block' : 'none';
        cancelBtn.style.display = !['completed', 'cancelled'].includes(appointment.status) ? 'block' : 'none';
        
        // Set appointment ID on buttons
        [confirmBtn, completeBtn, cancelBtn].forEach(btn => {
            btn.dataset.id = appointmentId;
        });
        
        modal.classList.remove('hidden');
    } catch (error) {
        showToast('Error loading appointment details', 'error');
    }
}

async function updateAppointmentStatus(appointmentId, status) {
    try {
        await appointmentsAPI.updateStatus(appointmentId, status);
        showToast(`Appointment ${status} successfully`, 'success');
        await loadAppointments();
        document.getElementById('appointment-modal').classList.add('hidden');
    } catch (error) {
        showToast(`Failed to ${status} appointment`, 'error');
    }
}