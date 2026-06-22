import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";

// Check authentication status
export function requireAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/vanilla/');
      
      if (!user && !isLoginPage) {
        window.location.href = 'index.html';
      } else if (user && isLoginPage) {
        window.location.href = 'dashboard.html';
      } else {
        if (user) {
          // Update user profile UI if elements exist
          const userNameEl = document.getElementById('user-name-display');
          const userEmailEl = document.getElementById('user-email-display');
          const userInitialsEl = document.getElementById('user-initials-display');
          
          const name = user.displayName || user.email.split('@')[0];
          if (userNameEl) userNameEl.textContent = name;
          if (userEmailEl) userEmailEl.textContent = user.email;
          if (userInitialsEl) userInitialsEl.textContent = name.charAt(0).toUpperCase();
        }
        resolve(user);
      }
    });
  });
}

// Setup logout button if it exists
export function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await signOut(auth);
        window.location.href = 'index.html';
      } catch (error) {
        console.error("Erro ao sair:", error);
      }
    });
  }
}

// Mobile menu toggle
export function setupMobileMenu() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('hidden');
    });
  }
}
