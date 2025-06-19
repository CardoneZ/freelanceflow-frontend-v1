// assets/js/modules/availability.js
import { availabilityAPI } from '../api.js';
import { showToast, formatTime } from '../utils.js';
import { getCurrentUser } from '../auth.js';

let calendar;

export async function initAvailability() {
  try {
    console.log('Initializing availability module');
    await loadRecurringAvailability();
    setupCalendar();
    setupEventListeners();
  } catch (error) {
    console.error('Error in initAvailability:', error);
    showToast('Error initializing availability: ' + error.message, 'error');
  }
}

function getCurrentProfessionalId() {
  const user = getCurrentUser();
  if (!user) {
    console.error('No user found');
    return null;
  }
  return user.UserId;
}

async function loadRecurringAvailability() {
  const container = document.getElementById('recurring-availability');
  if (!container) return;

  try {
    container.innerHTML = '<tr><td colspan="3" class="px-6 py-4 text-center"><i class="fas fa-spinner fa-spin"></i> Loading...</td></tr>';
    
    const professionalId = getCurrentProfessionalId();
    if (!professionalId) {
      throw new Error('Professional ID not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const response = await availabilityAPI.getProfessionalAvailability(professionalId, today);
    
    renderRecurringAvailability(response.recurring || []);
    document.getElementById('showing-count').textContent = response.recurring?.length || 0;
  } catch (error) {
    console.error('Error loading availability:', error);
    showToast('Error loading availability: ' + error.message, 'error');
    renderRecurringAvailability([]);
  }
}

function renderRecurringAvailability(availability) {
    const container = document.getElementById('recurring-availability');
    if (!container) return;

    if (!availability || availability.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="3" class="px-6 py-4 text-center text-gray-500">
                    No recurring availability set
                    <div class="mt-2">
                        <button id="add-first-slot" class="text-blue-600 hover:text-blue-900">
                            Add your first slot
                        </button>
                    </div>
                </td>
            </tr>`;
        return;
    }

    // Mapear días numéricos a nombres de días
    const dayMap = {
        '0': 'sunday', '1': 'monday', '2': 'tuesday', '3': 'wednesday',
        '4': 'thursday', '5': 'friday', '6': 'saturday'
    };

    // Agrupar por día
    const groupedByDay = availability.reduce((acc, slot) => {
        const dayName = dayMap[slot.DayOfWeek] || slot.DayOfWeek;
        const displayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        
        if (!acc[displayName]) {
            acc[displayName] = [];
        }
        acc[displayName].push(slot);
        return acc;
    }, {});

    container.innerHTML = Object.entries(groupedByDay)
        .map(([dayName, slots]) => slots.map(slot => `
            <tr data-id="${slot.AvailabilityId}">
                <td class="px-6 py-4">${dayName}</td>
                <td class="px-6 py-4">${slot.StartTime.slice(0,5)} - ${slot.EndTime.slice(0,5)}</td>
                <td class="px-6 py-4">
                    <button class="text-blue-600 hover:text-blue-900 edit-slot mr-2" data-id="${slot.AvailabilityId}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-slot" data-id="${slot.AvailabilityId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join(''))
        .join('');

    document.getElementById('showing-count').textContent = availability.length;
}

function getDayName(dayString) {
  const daysMap = {
    '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
    '4': 'Thursday', '5': 'Friday', '6': 'Saturday'
  };
  return daysMap[dayString] || dayString || 'Unknown';
}

function setupCalendar() {
  const calendarEl = document.getElementById('availability-calendar');
  if (!calendarEl) {
    console.error('Calendar element not found');
    return;
  }

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    selectable: true,
    select: handleDateSelect,
    selectOverlap: false, // Prevent overlapping selections
    selectAllow: (selectInfo) => {
      // Only allow selections in the future
      return selectInfo.start >= new Date();
    },
    eventClick: handleEventClick,
    events: fetchCalendarAvailability,
    height: 'auto',
    selectMinDistance: 10, // Minimum pixels to count as a selection
    selectLongPressDelay: 100 // Delay before selection starts (ms)
  });

  calendar.render();
}

async function fetchCalendarAvailability(fetchInfo, successCallback, failureCallback) {
    try {
        const professionalId = getCurrentProfessionalId();
        if (!professionalId) {
            throw new Error('Professional ID not found');
        }

        const date = fetchInfo.startStr.split('T')[0];
        const response = await availabilityAPI.getProfessionalAvailability(professionalId, date);

        console.log('API Response:', response);

        // Verificar si response.calendar existe y es un array
        const events = (response.calendar || []).map(slot => ({
            id: slot.id || `slot-${date}-${slot.StartTime}`,
            title: 'Available',
            start: `${date}T${slot.StartTime}`,
            end: `${date}T${slot.EndTime}`,
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            borderColor: 'rgba(14, 165, 233, 0.8)',
            textColor: '#0ea5e9',
            extendedProps: {
                type: 'availability'
            }
        }));

        successCallback(events);
    } catch (error) {
        console.error('Error loading calendar availability:', error);
        showToast('Error loading availability slots', 'error');
        successCallback([]);
    }
}

// Nueva función para manejar mejor la selección
function handleDateSelect(selectInfo) {
    // Solo permitir selecciones futuras
    if (selectInfo.start < new Date()) {
        calendar.unselect();
        return showToast("Can't add availability in the past", 'error');
    }

    const modal = document.getElementById('availability-modal');
    const form = document.getElementById('availability-form');
    
    // Formatear horas (HH:MM)
    const startTime = selectInfo.start.toTimeString().substring(0, 5);
    const endTime = selectInfo.end.toTimeString().substring(0, 5);
    
    // Actualizar formulario
    form.startTime.value = startTime;
    form.endTime.value = endTime;
    form.dayOfWeek.value = selectInfo.start.getDay();
    
    // Mostrar modal
    modal.classList.remove('hidden');
    
    // Auto-seleccionar recurrente si es día de semana
    const isWeekday = selectInfo.start.getDay() >= 1 && selectInfo.start.getDay() <= 5;
    form.recurring.checked = isWeekday;
    document.getElementById('day-of-week-container').classList.toggle('hidden', !isWeekday);
    
    // Enfocar primer campo
    form.startTime.focus();
}

function handleEventClick(clickInfo) {
  if (confirm('Are you sure you want to delete this availability slot?')) {
    deleteAvailabilitySlot(clickInfo.event.id);
  }
}

async function deleteAvailabilitySlot(slotId) {
  try {
    const professionalId = getCurrentProfessionalId();
    if (!professionalId) {
      throw new Error('Professional ID not found');
    }

    await availabilityAPI.delete(professionalId, slotId);
    showToast('Availability slot deleted', 'success');
    calendar.refetchEvents();
    await loadRecurringAvailability();
  } catch (error) {
    showToast('Error deleting availability slot: ' + error.message, 'error');
  }
}

function validateForm(form) {
  const startTime = form.startTime.value;
  const endTime = form.endTime.value;
  if (!startTime || !endTime) {
    showToast('Please select start and end times', 'error');
    return false;
  }
  if (startTime >= endTime) {
    showToast('Start time must be earlier than end time', 'error');
    return false;
  }
  return true;
}

async function saveAvailability() {
    const form = document.getElementById('availability-form');
    const saveBtn = document.getElementById('save-availability');
    const originalText = saveBtn.innerHTML;
    
    try {
        // Validación básica
        if (!form.startTime.value || !form.endTime.value) {
            showToast('Please select start and end times', 'error');
            return;
        }
        
        if (form.startTime.value >= form.endTime.value) {
            showToast('End time must be after start time', 'error');
            return;
        }

        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        saveBtn.disabled = true;

        const professionalId = getCurrentProfessionalId();
        if (!professionalId) {
            throw new Error('Professional not found');
        }

        const availabilityData = {
            StartTime: form.startTime.value + ':00', // Asegurar formato HH:MM:SS
            EndTime: form.endTime.value + ':00',     // Asegurar formato HH:MM:SS
            IsRecurring: form.recurring.checked,
            DayOfWeek: form.recurring.checked ? form.dayOfWeek.value : null,
            ValidFrom: form.recurring.checked ? null : new Date().toISOString().split('T')[0]
        };

        console.log('Sending availability data:', availabilityData);

        const response = await availabilityAPI.create(professionalId, [availabilityData]);
        
        if (!response) {
            throw new Error('No response from server');
        }

        showToast('Availability saved successfully!', 'success');
        document.getElementById('availability-modal').classList.add('hidden');
        
        await loadRecurringAvailability();
        calendar.refetchEvents();
        
    } catch (error) {
        console.error('Save error:', error);
        showToast(`Error: ${error.message || 'Failed to save availability'}`, 'error', 5000);
    } finally {
        saveBtn.innerHTML = originalText;
        saveBtn.disabled = false;
    }
}


function setupEventListeners() {
  // Save availability
  document.getElementById('save-availability').addEventListener('click', async (e) => {
    e.preventDefault();
    await saveAvailability();
  });

  // Add availability button
  document.getElementById('add-availability').addEventListener('click', () => {
    const form = document.getElementById('availability-form');
    form.reset();
    document.getElementById('day-of-week-container').classList.add('hidden');
    document.getElementById('availability-modal').classList.remove('hidden');
  });

  // Recurring checkbox
  document.getElementById('recurring').addEventListener('change', (e) => {
    document.getElementById('day-of-week-container').classList.toggle('hidden', !e.target.checked);
  });

  // Close modal buttons
  document.getElementById('close-availability-modal').addEventListener('click', () => {
    document.getElementById('availability-modal').classList.add('hidden');
  });
  
  document.getElementById('cancel-availability').addEventListener('click', () => {
    document.getElementById('availability-modal').classList.add('hidden');
  });

  // Refresh button
  document.getElementById('refresh-availability').addEventListener('click', async () => {
    await loadRecurringAvailability();
    calendar.refetchEvents();
    showToast('Availability refreshed', 'success');
  });

  document.getElementById('add-first-slot').addEventListener('click', () => {
    const form = document.getElementById('availability-form');
    form.reset();
    document.getElementById('recurring').checked = true;
    document.getElementById('day-of-week-container').classList.remove('hidden');
    document.getElementById('availability-modal').classList.remove('hidden');
});


  // Delete slot buttons (event delegation)
  document.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.delete-slot');
    if (deleteBtn) {
      e.preventDefault();
      const slotId = deleteBtn.dataset.id;
      if (confirm('Are you sure you want to delete this availability slot?')) {
        deleteAvailabilitySlot(slotId);
      }
    }
  });
}