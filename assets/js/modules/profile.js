// assets/js/modules/profile.js
import { usersAPI } from '../api.js';
import { showToast } from '../utils.js';



export async function initProfile() {
  await loadProfile();
  setupEventListeners();
}

function normalizeUser(user) {
  if (!user) return null;
  
  return {
    UserId: user.UserId || user.id,
    FirstName: user.FirstName || user.firstName,
    LastName: user.LastName || user.lastName,
    Email: user.Email || user.email,
    Role: user.Role || user.role,
    ProfilePicture: user.ProfilePicture || user.profilePicture,
    Professional: user.Professional || user.professionalInfo
  };
}


async function loadProfile() {
  try {
    const user = normalizeUser(await usersAPI.getCurrentUser());
    if (!user) throw new Error('No user data received');
    renderProfile(user);
  } catch (error) {
    console.error('Profile load error:', error);
    showToast('Failed to load profile data', 'error');
  }
}

function renderProfile(user) {
  const form = document.getElementById('profile-form');
  if (!form) return;

  // Personal info
  form.firstName.value = user.FirstName || user.firstName || '';
  form.lastName.value = user.LastName || user.lastName || '';
  form.email.value = user.Email || user.email || '';

  // Professional info
  if (user.Role === 'professional' || user.role === 'professional') {
    const profInfo = user.Professional || user.professionalInfo;
    form.profession.value = profInfo?.title || '';
    form.bio.value = profInfo?.bio || '';
    form.hourlyRate.value = profInfo?.hourlyRate || '';
    form.location.value = profInfo?.location || '';
  }
}

function setupEventListeners() {
  const saveBtn = document.getElementById('save-profile');
  if (saveBtn) saveBtn.addEventListener('click', saveProfile);
}

function validateForm(form) {
  // Check required fields
  if (!form.firstName.value.trim()) {
    showToast('First name is required', 'error');
    form.firstName.focus();
    return false;
  }
  
  if (!form.lastName.value.trim()) {
    showToast('Last name is required', 'error');
    form.lastName.focus();
    return false;
  }
  
  if (!form.email.value.trim()) {
    showToast('Email is required', 'error');
    form.email.focus();
    return false;
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(form.email.value)) {
    showToast('Please enter a valid email address', 'error');
    form.email.focus();
    return false;
  }
  
  // Validate hourly rate if provided
  if (form.hourlyRate.value && isNaN(parseFloat(form.hourlyRate.value))) {
    showToast('Hourly rate must be a number', 'error');
    form.hourlyRate.focus();
    return false;
  }
  
  return true;
}

async function saveProfile() {
  const form = document.getElementById('profile-form');
  if (!form) return;

  try {
    const userId = (await usersAPI.getCurrentUser()).id;
    
    const userData = {
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      email: form.email.value.trim(),
      professionalInfo: {
        title: form.profession.value.trim(),
        bio: form.bio.value.trim(),
        hourlyRate: form.hourlyRate.value ? parseFloat(form.hourlyRate.value) : null,
        location: form.location.value.trim()
      }
    };

    const response = await usersAPI.updateUser(userId, userData);
    
    if (response.success) {
      showToast('Profile saved successfully', 'success');
      
      // Actualizar el localStorage
      const currentUser = JSON.parse(localStorage.getItem('user'));
      const updatedUser = {
        ...currentUser,
        FirstName: response.user.firstName,
        LastName: response.user.lastName,
        Email: response.user.email,
        professionalInfo: response.user.professionalInfo
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      // Actualizar el DOM
      updateUserUI(updatedUser);
    } else {
      throw new Error(response.message || 'Update failed');
    }
  } catch (error) {
    console.error('Save error:', error);
    showToast(`Save failed: ${error.message}`, 'error');
  }
}

// Nueva función para actualizar la UI
function updateUserUI(user) {
  // Actualizar nombre en el navbar
  document.getElementById('user-name').textContent = `${user.FirstName} ${user.LastName}`;
  
  // Actualizar nombre en el sidebar
  document.getElementById('sidebar-user-name').textContent = `${user.FirstName} ${user.LastName}`;
  
  // Actualizar avatar si es necesario (puedes agregar lógica para la imagen aquí)
  const avatarUrl = user.ProfilePicture || `https://ui-avatars.com/api/?background=0ea5e9&color=fff&name=${encodeURIComponent(user.FirstName[0]+user.LastName[0])}`;
  document.getElementById('user-avatar-img').src = avatarUrl;
  document.getElementById('sidebar-user-avatar').src = avatarUrl;
}