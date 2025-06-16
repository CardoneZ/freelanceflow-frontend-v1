export function getLoggedUser() {
  try {
    return JSON.parse(localStorage.getItem('user'));
  } catch { return null; }
}

export function clearAuth(){
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
