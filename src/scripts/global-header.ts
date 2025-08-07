// Global header management script
// This script handles dynamic header updates based on authentication state

import { authService } from '../utils/api/auth';

declare global {
  interface Window {
    updateHeaderAuth: () => void;
    updateCartCounter: () => void;
    updateHeaderCartCount: () => Promise<void>;
  }
}

// Function to update header based on auth state
function updateHeaderAuth(): void {
  const guestButtons = document.getElementById('guest-buttons');
  const userMenu = document.getElementById('user-menu');
  const userName = document.getElementById('user-name');
  const adminLink = document.getElementById('admin-link');

  if (authService.isAuthenticated()) {
    // Hide guest buttons, show user menu
    if (guestButtons) guestButtons.style.display = 'none';
    if (userMenu) {
      userMenu.classList.remove('hidden');
      userMenu.style.display = 'flex';
    }

    // Set user name with truncation
    if (userName) {
      const displayName = authService.getDisplayName(15); // Limitar a 15 caracteres
      userName.textContent = displayName.toUpperCase();
    }

    // Show/hide admin link based on role
    if (adminLink) {
      if (authService.isAdmin()) {
        adminLink.classList.remove('hidden');
      } else {
        adminLink.classList.add('hidden');
      }
    }
  } else {
    // Show guest buttons, hide user menu
    if (guestButtons) guestButtons.style.display = 'flex';
    if (userMenu) {
      userMenu.classList.add('hidden');
      userMenu.style.display = 'none';
    }

    // Hide admin link
    if (adminLink) {
      adminLink.classList.add('hidden');
    }
  }
}

// Function to update cart counter
function updateCartCounter(): void {
  const cartCounter = document.getElementById('cart-counter');

  if (!authService.isAuthenticated() || !cartCounter) {
    if (cartCounter) cartCounter.classList.add('hidden');
    return;
  }

  try {
    // Get cart from localStorage
    const cartData = localStorage.getItem('cart_data');
    let totalItems = 0;

    if (cartData) {
      try {
        const cart = JSON.parse(cartData);
        if (cart.items && Array.isArray(cart.items)) {
          totalItems = cart.items.reduce((total: number, item: any) => {
            return total + (item.quantity || 0);
          }, 0);
        }
      } catch (error) {
        console.error('Error parsing cart data:', error);
      }
    }

    if (totalItems > 0) {
      cartCounter.textContent = totalItems.toString();
      cartCounter.classList.remove('hidden');
    } else {
      cartCounter.classList.add('hidden');
    }
  } catch (error) {
    console.error('Error updating cart counter:', error);
    if (cartCounter) cartCounter.classList.add('hidden');
  }
}

// Función mejorada para actualizar contador del carrito (compatible con otros scripts)
async function updateHeaderCartCount(): Promise<void> {
  updateCartCounter();
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Update header state
  updateHeaderAuth();
  updateCartCounter();

  // Make functions available globally
  window.updateHeaderAuth = updateHeaderAuth;
  window.updateCartCounter = updateCartCounter;
  window.updateHeaderCartCount = updateHeaderCartCount;

  // Set up periodic updates if user is authenticated
  if (authService.isAuthenticated()) {
    // Update cart counter every 30 seconds
    setInterval(updateCartCounter, 30000);
  }
});

// Listen for storage changes (for cross-tab sync)
window.addEventListener('storage', (e) => {
  if (
    e.key === 'auth_token' ||
    e.key === 'user_data' ||
    e.key === 'cart_data'
  ) {
    updateHeaderAuth();
    updateCartCounter();
  }
});

// Export functions for use in other modules
export { updateHeaderAuth, updateCartCounter, updateHeaderCartCount };
