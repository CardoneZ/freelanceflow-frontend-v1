// assets/js/modules/appointments.js
import { appointmentsAPI } from '../api.js';
import { formatDate, formatTime, showToast } from '../utils.js';

export async function initAppointments() {
    await loadUpcomingAppointments();
    setupEventListeners();
}

async function loadUpcomingAppointments() {
    try {
        const appointments = await appointmentsAPI.getUpcoming();
        renderAppointments(appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
        showToast('Error loading appointments', 'error');
    }
}

function renderAppointments(appointments) {
    const container = document.getElementById('upcoming-appointments');
    
    if (!appointments.length) {
        container.innerHTML = '<li class="p-4 text-center text-gray-500">No upcoming appointments</li>';
        return;
    }
    
    container.innerHTML = appointments.map(appt => `
        <li class="p-4 hover:bg-gray-50 smooth-transition">
            <div class="flex items-center">
                <div class="flex-shrink-0 ${getAppointmentColorClass(appt)} rounded-lg p-3">
                    <i class="${getAppointmentIcon(appt)} ${getAppointmentTextColor(appt)}"></i>
                </div>
                <div class="ml-4 flex-1">
                    <div class="flex items-center justify-between">
                        <h4 class="text-sm font-medium text-gray-900">${appt.serviceName} with ${appt.clientName}</h4>
                        <span class="text-xs ${getStatusBadgeClass(appt)} px-2 py-1 rounded-full">
                            ${appt.status}
                        </span>
                    </div>
                    <div class="mt-1 flex items-center text-sm text-gray-500">
                        <i class="far fa-clock mr-1"></i>
                        <span>${formatAppointmentDate(appt.startTime)} - ${formatTime(appt.endTime)}</span>
                    </div>
                </div>
            </div>
        </li>
    `).join('');
}

// Helper functions...
function getAppointmentColorClass(appt) {
    const status = appt.status.toLowerCase();
    if (status === 'confirmed') return 'bg-green-100';
    if (status === 'pending') return 'bg-blue-100';
    if (status === 'cancelled') return 'bg-red-100';
    if (status === 'completed') return 'bg-purple-100';
    return 'bg-gray-100';
}

function formatAppointmentDate(dateTime) {
    const date = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return `Today, ${formatTime(dateTime)}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${formatTime(dateTime)}`;
    } else {
        return `${formatDate(dateTime)}, ${formatTime(dateTime)}`;
    }
}

function setupEventListeners() {
    // Add event listeners for appointment actions
    document.querySelectorAll('.appointment-action').forEach(button => {
        button.addEventListener('click', handleAppointmentAction);
    });
}

async function handleAppointmentAction(event) {
    const action = event.target.dataset.action;
    const appointmentId = event.target.dataset.id;
    
    try {
        let response;
        switch(action) {
            case 'confirm':
                response = await appointmentsAPI.confirm(appointmentId);
                break;
            case 'cancel':
                response = await appointmentsAPI.cancel(appointmentId);
                break;
            case 'complete':
                response = await appointmentsAPI.complete(appointmentId);
                break;
        }
        
        showToast(`Appointment ${action}ed successfully`, 'success');
        await loadUpcomingAppointments();
    } catch (error) {
        showToast(`Failed to ${action} appointment`, 'error');
    }
}