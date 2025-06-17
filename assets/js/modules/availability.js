// assets/js/modules/availability.js
import { availabilityAPI } from '../api.js';
import { showToast } from '../utils.js';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

let calendar;

export async function initAvailability() {
    setupCalendar();
    setupEventListeners();
}

function setupCalendar() {
    calendar = new FullCalendar(document.getElementById('availability-calendar'), {
        plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
        initialView: 'timeGridWeek',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        selectable: true,
        select: handleDateSelect,
        eventClick: handleEventClick,
        events: fetchAvailability
    });
    calendar.render();
}

async function fetchAvailability(fetchInfo, successCallback) {
    try {
        const availability = await availabilityAPI.getProfessionalAvailability(
            getCurrentProfessionalId(),
            fetchInfo.startStr,
            fetchInfo.endStr
        );
        successCallback(availability);
    } catch (error) {
        showToast('Error loading availability', 'error');
    }
}

function handleDateSelect(selectInfo) {
    document.getElementById('start-time').value = selectInfo.start.toTimeString().substring(0, 5);
    document.getElementById('end-time').value = selectInfo.end.toTimeString().substring(0, 5);
    document.getElementById('availability-modal').classList.remove('hidden');
}

function handleEventClick(clickInfo) {
    if (confirm('Delete this availability slot?')) {
        deleteAvailabilitySlot(clickInfo.event.id);
    }
}

async function saveAvailability() {
    const form = document.getElementById('availability-form');
    const formData = {
        startTime: form.startTime.value,
        endTime: form.endTime.value,
        recurring: form.recurring.checked,
        daysOfWeek: form.recurring.checked ? [form.dayOfWeek.value] : null
    };

    try {
        await availabilityAPI.create(getCurrentProfessionalId(), formData);
        calendar.refetchEvents();
        document.getElementById('availability-modal').classList.add('hidden');
        showToast('Availability saved successfully', 'success');
    } catch (error) {
        showToast('Error saving availability', 'error');
    }
}

function setupEventListeners() {
    document.getElementById('save-availability').addEventListener('click', saveAvailability);
    document.getElementById('add-availability-btn').addEventListener('click', () => {
        document.getElementById('availability-modal').classList.remove('hidden');
    });
}