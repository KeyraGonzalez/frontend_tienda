// Global cart service initialization
import { cartService } from '../utils/api/index.js';
import { authService } from '../utils/api/index.js';

// Make services available globally
window.cartService = cartService;
window.authService = authService;

// Global function to update admin access in all components
window.updateAdminAccess = function () {
  const user = authService.getCurrentUser();

  // Update header admin link
  const headerAdminLink = document.getElementById('admin-link');
  if (headerAdminLink) {
    if (user && user.role === 'admin') {
      headerAdminLink.classList.remove('hidden');
    } else {
      headerAdminLink.classList.add('hidden');
    }
  }

  // Update profile admin nav
  const profileAdminNav = document.getElementById('admin-nav');
  if (profileAdminNav) {
    if (user && user.role === 'admin') {
      profileAdminNav.classList.remove('hidden');
    } else {
      profileAdminNav.classList.add('hidden');
    }
  }
};

// Auth state change event
window.addEventListener('storage', function (e) {
  if (e.key === 'auth_token') {
    const isAuthenticated = !!e.newValue;
    window.dispatchEvent(
      new CustomEvent('authStateChanged', {
        detail: { isAuthenticated },
      })
    );

    // Update admin access when auth state changes
    setTimeout(() => {
      if (window.updateAdminAccess) {
        window.updateAdminAccess();
      }
    }, 100);
  }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', function () {
  // Check initial auth state
  const token = localStorage.getItem('auth_token');
  if (token) {
    window.dispatchEvent(
      new CustomEvent('authStateChanged', {
        detail: { isAuthenticated: true },
      })
    );
  }

  // Update admin access on initial load
  setTimeout(() => {
    if (window.updateAdminAccess) {
      window.updateAdminAccess();
    }
  }, 500);
});

export { cartService, authService };
