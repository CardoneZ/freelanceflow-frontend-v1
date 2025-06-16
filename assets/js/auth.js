import { authAPI } from './api.js';

export async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ Email: email, Password: password })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }

    const userData = await response.json();
    
    localStorage.setItem('token', userData.token);
    localStorage.setItem('user', JSON.stringify({
      UserId: userData.UserId,
      Email: userData.Email,
      FirstName: userData.FirstName,
      LastName: userData.LastName,
      Role: userData.Role
    }));
    
    return userData;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/auth/login.html';
}

export function getCurrentUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}