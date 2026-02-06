// LOGIN PAGE

const API_URL = 'http://localhost:5000/api';

// DOM Elements
const loginForm = document.getElementById('loginForm');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const submitSpinner = document.getElementById('submitSpinner');
const alertContainer = document.getElementById('alert-container');
const togglePasswordBtn = document.getElementById('togglePassword');
const metamaskLoginBtn = document.getElementById('metamaskLoginBtn');

// utility functions

// Show alert message
const showAlert = (message, type = 'info') => {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    alert.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    
    alertContainer.innerHTML = '';
    alertContainer.appendChild(alert);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 5000);
};

// Clear alerts
const clearAlerts = () => {
    alertContainer.innerHTML = '';
};

// Save login state
const saveLoginState = (token, user, remember = false) => {
    // ALWAYS save to localStorage for consistency
    localStorage.setItem('evote_token', token);
    localStorage.setItem('evote_user', JSON.stringify(user));
    
    if (remember) {
        localStorage.setItem('evote_remember', 'true');
    }
};

// Check if already logged in
const checkExistingLogin = () => {
    const token = localStorage.getItem('evote_token') || sessionStorage.getItem('evote_token');
    if (token) {
// Already logged in, redirect to dashboard
        window.location.href = 'dashboard.html';
    }
};

// password toggle

togglePasswordBtn.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
});

// form submission

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    // Get form values
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
    const rememberMe = rememberMeCheckbox.checked;

    // Basic validation
    if (!email || !password) {
        showAlert('Please enter both email and password', 'error');
        return;
    }

    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Signing In...';
    submitSpinner.classList.remove('hidden');

    try {
        // Make API request
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Login successful!
            showAlert('Login successful! Redirecting...', 'success');

            // Save token and user data
            saveLoginState(data.token, data.user, rememberMe);

            // Admins can access admin panel from the dashboard menu
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } else {
            // Login failed
            let errorMessage = data.message || 'Login failed. Please check your credentials.';
            
            // Handle specific error messages
            if (errorMessage.includes('locked')) {
                errorMessage = 'Your account is locked due to multiple failed login attempts. Please try again later.';
            } else if (errorMessage.includes('deactivated')) {
                errorMessage = 'Your account has been deactivated. Please contact support.';
            } else if (errorMessage.includes('Invalid')) {
                errorMessage = 'Invalid email or password. Please try again.';
            }
            
            showAlert(errorMessage, 'error');
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Sign In';
            submitSpinner.classList.add('hidden');
        }

    } catch (error) {
        console.error('Login error:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Sign In';
        submitSpinner.classList.add('hidden');
    }
});

// metamask login

metamaskLoginBtn.addEventListener('click', async () => {
    try {
        // Check if MetaMask is installed
        if (!window.web3Utils.isMetaMaskInstalled()) {
            showAlert('MetaMask is not installed. Please install it to use this feature.', 'error');
            setTimeout(() => {
                window.open('https://metamask.io/download/', '_blank');
            }, 2000);
            return;
        }

        // Disable button while connecting
        metamaskLoginBtn.disabled = true;
        metamaskLoginBtn.innerHTML = '<span>Connecting...</span>';

        // Connect wallet
        const account = await window.web3Utils.connectWallet();

        showAlert('Wallet connected! Checking registration...', 'info');

        
        setTimeout(() => {
            showAlert('MetaMask login not yet implemented. Please use email/password.', 'warning');
            metamaskLoginBtn.disabled = false;
            metamaskLoginBtn.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10m-8-10v10l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span>Sign in with MetaMask</span>
            `;
        }, 1500);

    } catch (error) {
        console.error('MetaMask login error:', error);
        
        let errorMessage = 'Failed to connect wallet. ';
        if (error.code === 4001) {
            errorMessage += 'You rejected the connection request.';
        } else {
            errorMessage += 'Please try again.';
        }
        
        showAlert(errorMessage, 'error');
        
        // Re-enable button
        metamaskLoginBtn.disabled = false;
        metamaskLoginBtn.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10m-8-10v10l8 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span>Sign in with MetaMask</span>
        `;
    }
});

// keyboard shortcuts

// Submit form on Enter key
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginForm.dispatchEvent(new Event('submit'));
    }
});

// initialization

// Check if already logged in on page load
window.addEventListener('load', () => {
    checkExistingLogin();
});
