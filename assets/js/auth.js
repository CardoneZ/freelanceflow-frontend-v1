// assets/js/auth.js
import { authAPI } from './api.js';

export async function login(Email, Password) {
  try {
    const response = await authAPI.login(Email, Password);
    
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify({
      UserId: response.UserId,
      Email: response.Email,
      FirstName: response.FirstName,
      LastName: response.LastName,
      Role: response.Role
    }));
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login.html';
}

export function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

export function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}