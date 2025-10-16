// src/services/authRefresh.js
export function startTokenAutoRefresh(intervalMinutes = 20) {
  // On évite de lancer plusieurs fois le timer
  if (window.__tokenRefreshInterval) return;

  window.__tokenRefreshInterval = setInterval(async () => {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) return;

    try {
      const response = await fetch('/api/auth/refresh/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.access);
        // Optionnel : console.log('Token rafraîchi automatiquement');
      } else {
        // Si le refresh échoue, on peut déconnecter l'utilisateur
        localStorage.removeItem('token');
        localStorage.removeItem('refresh');
        window.location.href = '/login';
      }
    } catch (e) {
      // En cas d'erreur réseau, on ne fait rien
    }
  }, intervalMinutes * 60 * 1000);
}

export function stopTokenAutoRefresh() {
  if (window.__tokenRefreshInterval) {
    clearInterval(window.__tokenRefreshInterval);
    window.__tokenRefreshInterval = null;
  }
} 