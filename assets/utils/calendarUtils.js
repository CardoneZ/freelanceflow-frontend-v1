export function formatCalendarEvents(appointments) {
  return appointments.map(appt => ({
    id: appt.AppointmentId,
    title: appt.Service?.Name || 'Appointment',
    start: appt.StartTime,
    end: appt.EndTime,
    extendedProps: {
      appointment: appt
    },
    color: getStatusColor(appt.Status)
  }));
}

function getStatusColor(status) {
  switch (status) {
    case 'confirmed': return '#3B82F6'; // blue
    case 'completed': return '#10B981'; // green
    case 'cancelled': return '#EF4444'; // red
    default: return '#F59E0B'; // yellow (pending)
  }
}