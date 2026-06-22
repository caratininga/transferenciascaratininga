import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { auth } from "./firebase-config.js";
import { requireAuth } from "./auth.js";

// Initialize auth state check
requireAuth();

const loginForm = document.getElementById('login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMsg = document.getElementById('error-msg');
const errorText = document.getElementById('error-text');
const submitBtn = document.getElementById('submit-btn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> Entrando...`;
  lucide.createIcons();
  errorMsg.classList.add('hidden');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // requireAuth() in auth.js will automatically redirect to dashboard
  } catch (error) {
    errorMsg.classList.remove('hidden');
    errorText.textContent = "Email ou senha incorretos.";
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i data-lucide="log-in" class="w-5 h-5"></i> Entrar no Sistema`;
    lucide.createIcons();
  }
});
