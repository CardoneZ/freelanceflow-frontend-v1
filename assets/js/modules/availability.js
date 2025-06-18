// assets/js/modules/availability.js
import { availabilityAPI } from '../api.js';
import { showToast, formatTime } from '../utils.js';
import { getCurrentUser } from '../auth.js';

let calendar;

export async function initAvailability() {
    await loadRecurringAvailability();
    setupCalendar();
    setupEventListeners();
}

function getCurrentProfessionalId() {
    const user = getCurrentUser();
    return user.UserId;
}

async function loadRecurringAvailability() {
    try {
        const response = await availabilityAPI.getProfessionalAvailability(
            getCurrentProfessionalId(), 
            new Date().toISOString()
        );
        renderRecurringAvailability(response.recurring || []);
    } catch (error) {
        showToast('Error loading availability', 'error');
    }
}

function renderRecurringAvailability(availability) {
    const container = document.getElementById('recurring-availability');
    
    if (!availability.length) {
        container.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center text-gray-500">No recurring availability set</td></tr>';
        return;
    }
    
    container.innerHTML = availability.map(slot => `
        <tr data-id="${slot.id}">
            <td class="px-6 py-4">${getDayName(slot.DayOfWeek)}</td>
            <td class="px-6 py-4">${formatTime(slot.StartTime)} - ${formatTime(slot.EndTime)}</td>
            <td class="px-6 py-4">
                <button class="text-red-600 hover:text-red-900 delete-slot" data-id="${slot.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function getDayName(dayString) {
    const daysMap = {
        'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
        'thursday': 4, 'friday': 5, 'saturday': 6
    };
    return daysMap[dayString.toLowerCase()] || dayString;
}

function setupCalendar() {
    const calendarEl = document.getElementById('availability-calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        plugins: [FullCalendar.dayGridPlugin, FullCalendar.timeGridPlugin, FullCalendar.interactionPlugin],
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        selectable: true,
        select: handleDateSelect,
        eventClick: handleEventClick,
        events: fetchCalendarAvailability,
        height: 'auto'
    });
    
    calendar.render();
}

async function fetchCalendarAvailability(fetchInfo, successCallback, failureCallback) {
    try {
        const availability = await availabilityAPI.getProfessionalAvailability(
            getCurrentProfessionalId(),
            fetchInfo.startStr,
            fetchInfo.endStr
        );
        successCallback(availability.calendar || []);
    } catch (error) {
        showToast('Error loading availability', 'error');
        failureCallback(error);
    }
}

function handleDateSelect(selectInfo) {
    const modal = document.getElementById('availability-modal');
    const form = document.getElementById('availability-form');
    
    form.startTime.value = selectInfo.start.toTimeString().substring(0, 5);
    form.endTime.value = selectInfo.end.toTimeString().substring(0, 5);
    form.dayOfWeek.value = selectInfo.start.getDay();
    
    modal.classList.remove('hidden');
}

function handleEventClick(clickInfo) {
    if (confirm('Are you sure you want to delete this availability slot?')) {
        deleteAvailabilitySlot(clickInfo.event.id);
    }
}

async function deleteAvailabilitySlot(slotId) {
    try {
        await availabilityAPI.delete(getCurrentProfessionalId(), slotId);
        showToast('Availability slot deleted', 'success');
        calendar.refetchEvents();
        await loadRecurringAvailability();
    } catch (error) {
        showToast('Error deleting availability slot', 'error');
    }
}

async function saveAvailability() {
    const form = document.getElementById('availability-form');
    const isRecurring = form.recurring.checked;
    
    const availabilityData = {
        startTime: form.startTime.value,
        endTime: form.endTime.value,
        isRecurring: isRecurring,
        dayOfWeek: isRecurring ? parseInt(form.dayOfWeek.value) : null,
        startDate: isRecurring ? null : new Date().toISOString()
    };

    try {
        await availabilityAPI.create(getCurrentProfessionalId(), availabilityData);
        showToast('Availability saved successfully', 'success');
        calendar.refetchEvents();
        await loadRecurringAvailability();
        form.reset();
        document.getElementById('availability-modal').classList.add('hidden');
    } catch (error) {
        showToast('Error saving availability: ' + (error.message || 'Unknown error'), 'error');
    }
}

function setupEventListeners() {
    // Save availability
    document.getElementById('save-availability').addEventListener('click', saveAvailability);
    
    // Add new availability
    document.getElementById('add-availability').addEventListener('click', () => {
        const form = document.getElementById('availability-form');
        form.reset();
        document.getElementById('availability-modal').classList.remove('hidden');
    });
    
    // Recurring toggle
    document.getElementById('recurring').addEventListener('change', (e) => {
        document.getElementById('day-of-week-container').classList.toggle('hidden', !e.target.checked);
    });
    
    // Close modal
    document.getElementById('close-availability-modal').addEventListener('click', () => {
        document.getElementById('availability-modal').classList.add('hidden');
    });
    
    document.getElementById('cancel-availability').addEventListener('click', () => {
        document.getElementById('availability-modal').classList.add('hidden');
    });
    
    // Delete recurring slots
    document.addEventListener('click', (e) => {
        if (e.target.closest('.delete-slot')) {
            const slotId = e.target.closest('.delete-slot').dataset.id;
            if (confirm('Delete this recurring availability?')) {
                deleteAvailabilitySlot(slotId);
            }
        }
    });
}