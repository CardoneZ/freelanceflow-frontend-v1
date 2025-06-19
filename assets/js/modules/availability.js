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
    if (calendar) calendar.refetchEvents();
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

  const dayMap = {
    'sunday': 'Sunday', 'monday': 'Monday', 'tuesday': 'Tuesday', 
    'wednesday': 'Wednesday', 'thursday': 'Thursday', 'friday': 'Friday', 
    'saturday': 'Saturday',
    '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
    '4': 'Thursday', '5': 'Friday', '6': 'Saturday'
  };

  const groupedByDay = availability.reduce((acc, slot) => {
    let dayName;
    if (typeof slot.DayOfWeek === 'number') {
      dayName = dayMap[slot.DayOfWeek.toString()];
    } else {
      dayName = dayMap[slot.DayOfWeek?.toLowerCase()] || 'Unknown';
    }
    
    if (!acc[dayName]) acc[dayName] = [];
    acc[dayName].push(slot);
    return acc;
  }, {});

  container.innerHTML = Object.entries(groupedByDay)
    .map(([dayName, slots]) => slots.map(slot => `
      <tr data-id="${slot.AvailabilityId}">
        <td class="px-6 py-4">${dayName}</td>
        <td class="px-6 py-4">${slot.StartTime.slice(0, 5)} - ${slot.EndTime.slice(0, 5)}</td>
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

function handleDateSelect(selectInfo) {
  if (selectInfo.start < new Date()) {
    calendar.unselect();
    return showToast("Can't add availability in the past", 'error');
  }

  const modal = document.getElementById('availability-modal');
  const form = document.getElementById('availability-form');
  
  const startTime = selectInfo.start.toTimeString().substring(0, 5);
  const endTime = selectInfo.end.toTimeString().substring(0, 5);
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayOfWeek = dayNames[selectInfo.start.getDay()];
  
  form.startTime.value = startTime;
  form.endTime.value = endTime;
  form.dayOfWeek.value = selectInfo.start.getDay();
  
  modal.classList.remove('hidden');
  
  const isWeekday = selectInfo.start.getDay() >= 1 && selectInfo.start.getDay() <= 5;
  form.recurring.checked = isWeekday;
  document.getElementById('day-of-week-container').classList.toggle('hidden', !isWeekday);
  
  form.startTime.focus();
}

function handleEventClick(clickInfo) {
  if (clickInfo.event.extendedProps.type === 'availability') {
    if (confirm('Are you sure you want to delete this availability slot?')) {
      deleteAvailabilitySlot(clickInfo.event.id);
    }
  }
}

async function deleteAvailabilitySlot(slotId) {
  try {
    if (!confirm('Are you sure you want to delete this availability slot?')) return;

    const professionalId = getCurrentProfessionalId();
    if (!professionalId) throw new Error('Professional ID not found');

    const slot = await availabilityAPI.getSlot(professionalId, slotId);
    
    if (slot.IsRecurring) {
      const deleteChoice = confirm('This is a recurring slot. Do you want to:\n\n' +
        'OK - Delete only this instance\n' +
        'Cancel - Delete the entire recurring pattern');
      
      if (deleteChoice) {
        await availabilityAPI.createException(professionalId, {
          OriginalSlotId: slotId,
          ExceptionDate: new Date().toISOString().split('T')[0]
        });
        showToast('Recurring slot exception created', 'success');
      } else {
        await availabilityAPI.delete(professionalId, slotId);
        showToast('Recurring pattern deleted', 'success');
      }
    } else {
      await availabilityAPI.delete(professionalId, slotId);
      showToast('Availability slot deleted', 'success');
    }

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
    if (!validateForm(form)) return;

    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    saveBtn.disabled = true;

    const professionalId = getCurrentProfessionalId();
    if (!professionalId) {
      throw new Error('Professional not found');
    }

    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = form.recurring.checked ? dayNames[parseInt(form.dayOfWeek.value)] : null;

    const availabilityData = {
      StartTime: form.startTime.value + ':00',
      EndTime: form.endTime.value + ':00',
      IsRecurring: form.recurring.checked,
      DayOfWeek: dayOfWeek,
      ValidFrom: new Date().toISOString().split('T')[0],
      ValidTo: form.recurring.checked ? '2025-12-31' : new Date().toISOString().split('T')[0]
    };

    console.log('Sending availability data:', availabilityData);

    const response = await availabilityAPI.create(professionalId, [availabilityData]);
    
    if (!response) {
      throw new Error('No response from server');
    }

    showToast('Availability saved successfully!', 'success');
    document.getElementById('availability-modal').classList.add('hidden');
    
    await loadRecurringAvailability();
    if (calendar) {
      calendar.refetchEvents();
      calendar.render();
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast(`Error: ${error.message || 'Failed to save availability'}`, 'error', 5000);
  } finally {
    saveBtn.innerHTML = originalText;
    saveBtn.disabled = false;
  }
}

async function fetchCalendarAvailability(fetchInfo, successCallback, failureCallback) {
  try {
    const professionalId = getCurrentProfessionalId();
    if (!professionalId) throw new Error('Professional ID not found');

    const date = fetchInfo.startStr.split('T')[0];
    const response = await availabilityAPI.getProfessionalAvailability(professionalId, date);

    const events = response.calendar.map(slot => {
      let dayOfWeek = null;
      if (slot.IsRecurring && slot.DayOfWeek !== null) {
        if (typeof slot.DayOfWeek === 'string') {
          dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
            .indexOf(slot.DayOfWeek.toLowerCase());
        } else {
          dayOfWeek = slot.DayOfWeek;
        }
      }

      if (slot.IsRecurring && dayOfWeek !== null) {
        return {
          id: slot.AvailabilityId,
          title: 'Available (Recurring)',
          daysOfWeek: [dayOfWeek],
          startTime: slot.StartTime,
          endTime: slot.EndTime,
          startRecur: slot.startRecur ? new Date(slot.startRecur).toISOString() : null,
          endRecur: slot.endRecur ? new Date(slot.endRecur).toISOString() : null,
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: 'rgba(16, 185, 129, 0.8)',
          extendedProps: {
            type: 'availability',
            isRecurring: true
          }
        };
      }

      return null; // Skip non-recurring for now (handled separately if needed)
    }).filter(event => event !== null);

    successCallback(events);
  } catch (error) {
    console.error('Error loading calendar availability:', error);
    failureCallback(error);
  }
}

function setupEventListeners() {
  const saveBtn = document.getElementById('save-availability');
  const addBtn = document.getElementById('add-availability');
  const refreshBtn = document.getElementById('refresh-availability');
  const recurringCheckbox = document.getElementById('recurring');
  const closeModalBtn = document.getElementById('close-availability-modal');
  const cancelBtn = document.getElementById('cancel-availability');
  const addFirstSlotBtn = document.getElementById('add-first-slot');

  if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await saveAvailability();
    });
  } else {
    console.warn('save-availability button not found');
  }

  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const form = document.getElementById('availability-form');
      if (form) {
        form.reset();
        document.getElementById('day-of-week-container').classList.add('hidden');
        document.getElementById('availability-modal').classList.remove('hidden');
      }
    });
  } else {
    console.warn('add-availability button not found');
  }

  if (recurringCheckbox) {
    recurringCheckbox.addEventListener('change', (e) => {
      document.getElementById('day-of-week-container').classList.toggle('hidden', !e.target.checked);
    });
  } else {
    console.warn('recurring checkbox not found');
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      document.getElementById('availability-modal').classList.add('hidden');
    });
  } else {
    console.warn('close-availability-modal button not found');
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      document.getElementById('availability-modal').classList.add('hidden');
    });
  } else {
    console.warn('cancel-availability button not found');
  }

  if (refreshBtn) {
    refreshBtn.addEventListener('click', async () => {
      await loadRecurringAvailability();
      calendar.refetchEvents();
      showToast('Availability refreshed', 'success');
    });
  } else {
    console.warn('refresh-availability button not found');
  }

  if (addFirstSlotBtn) {
    addFirstSlotBtn.addEventListener('click', () => {
      const form = document.getElementById('availability-form');
      if (form) {
        form.reset();
        document.getElementById('recurring').checked = true;
        document.getElementById('day-of-week-container').classList.remove('hidden');
        document.getElementById('availability-modal').classList.remove('hidden');
      }
    });
  } else {
    console.warn('add-first-slot button not found');
  }

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
    selectOverlap: false,
    selectAllow: (selectInfo) => selectInfo.start >= new Date(),
    eventClick: handleEventClick,
    events: fetchCalendarAvailability,
    height: 'auto',
    selectMinDistance: 10,
    selectLongPressDelay: 100,
    eventDidMount: (info) => {
      if (info.event.extendedProps.type === 'availability') {
        info.el.style.cursor = 'pointer';
      }
    },
    now: new Date().toISOString(), // Ensure current date is set
    dayRender: (info) => {
      console.log('Rendering day:', info.dateStr); // Debug which days are rendered
    }
  });

  calendar.render();
}