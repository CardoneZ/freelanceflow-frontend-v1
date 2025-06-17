// assets/js/modules/profile.js
import { usersAPI } from '../api.js';
import { showToast } from '../utils.js';

export async function initProfile() {
    await loadProfile();
    setupEventListeners();
}

async function loadProfile() {
    try {
        const user = await usersAPI.getCurrentUser();
        renderProfile(user);
    } catch (error) {
        showToast('Error loading profile', 'error');
    }
}

function renderProfile(user) {
    const form = document.getElementById('profile-form');
    
    form.firstName.value = user.firstName || '';
    form.lastName.value = user.lastName || '';
    form.email.value = user.email || '';
    form.profession.value = user.profession || '';
    form.bio.value = user.bio || '';
    
    if (user.profilePicture) {
        document.getElementById('profile-picture').src = user.profilePicture;
    }
}

function setupEventListeners() {
    document.getElementById('save-profile').addEventListener('click', saveProfile);
    document.getElementById('upload-picture').addEventListener('change', handlePictureUpload);
}

async function handlePictureUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('profile-picture').src = e.target.result;
    };
    reader.readAsDataURL(file);
}

async function saveProfile() {
    const form = document.getElementById('profile-form');
    const formData = new FormData();
    
    formData.append('firstName', form.firstName.value);
    formData.append('lastName', form.lastName.value);
    formData.append('email', form.email.value);
    formData.append('profession', form.profession.value);
    formData.append('bio', form.bio.value);
    
    const pictureInput = document.getElementById('upload-picture');
    if (pictureInput.files[0]) {
        formData.append('profilePicture', pictureInput.files[0]);
    }

    try {
        await usersAPI.updateProfile(formData);
        showToast('Profile saved successfully', 'success');
    } catch (error) {
        showToast('Error saving profile', 'error');
    }
}