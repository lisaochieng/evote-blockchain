// REGISTRATION PAGE

const API_URL = 'http://localhost:5000/api';

// DOM Elements
const registerForm = document.getElementById('registerForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const walletAddressInput = document.getElementById('walletAddress');
const connectWalletBtn = document.getElementById('connectWalletBtn');
const walletBtnText = document.getElementById('walletBtnText');
const walletStatus = document.getElementById('walletStatus');
const connectedAddressSpan = document.getElementById('connectedAddress');
const termsCheckbox = document.getElementById('terms');
const submitBtn = document.getElementById('submitBtn');
const submitBtnText = document.getElementById('submitBtnText');
const submitSpinner = document.getElementById('submitSpinner');
const alertContainer = document.getElementById('alert-container');
const togglePasswordBtn = document.getElementById('togglePassword');

// State
let isWalletConnected = false;

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

// Format address for display
const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Validate Ethereum address
const isValidAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Enable/disable submit button
const updateSubmitButton = () => {
    const isValid = 
        nameInput.value.trim() !== '' &&
        emailInput.value.trim() !== '' &&
        passwordInput.value.length >= 8 &&
        confirmPasswordInput.value === passwordInput.value &&
        isWalletConnected &&
        termsCheckbox.checked;
    
    submitBtn.disabled = !isValid;
};

// Update wallet connection UI
const updateWalletUI = (account) => {
    walletAddressInput.value = account;
    isWalletConnected = true;
    
    // Show success status
    walletStatus.classList.remove('hidden');
    connectedAddressSpan.textContent = formatAddress(account);
    
    // Update connect button
    connectWalletBtn.disabled = true;
    walletBtnText.textContent = 'Wallet Connected';
    connectWalletBtn.style.background = 'rgba(0, 255, 136, 0.2)';
    connectWalletBtn.style.color = 'var(--color-primary)';
    
    // Update submit button state
    updateSubmitButton();
};

// password toggle

if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        confirmPasswordInput.type = type;
    });
}

// wallet connection

connectWalletBtn.addEventListener('click', async () => {
    try {
        // Check if MetaMask is installed
        if (typeof window.ethereum === 'undefined') {
            showAlert('MetaMask is not installed. Please install it to continue.', 'error');
            setTimeout(() => {
                window.open('https://metamask.io/download/', '_blank');
            }, 2000);
            return;
        }

        // Disable button while connecting
        connectWalletBtn.disabled = true;
        walletBtnText.textContent = 'Connecting...';

        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length === 0) {
            throw new Error('No accounts found');
        }

        const account = accounts[0];
        
        // Update UI
        updateWalletUI(account);
        showAlert('Wallet connected successfully!', 'success');

    } catch (error) {
        console.error('Wallet connection error:', error);
        
        let errorMessage = 'Failed to connect wallet. ';
        if (error.code === 4001) {
            errorMessage += 'You rejected the connection request.';
        } else if (error.message) {
            errorMessage += error.message;
        } else {
            errorMessage += 'Please try again.';
        }
        
        showAlert(errorMessage, 'error');
        
        // Re-enable button
        connectWalletBtn.disabled = false;
        walletBtnText.textContent = 'Connect MetaMask';
    }
});

// Check if wallet is already connected on page load
window.addEventListener('load', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Check if already connected
            const accounts = await window.ethereum.request({ 
                method: 'eth_accounts' 
            });
            
            if (accounts.length > 0) {
                updateWalletUI(accounts[0]);
            }
        } catch (error) {
            console.error('Failed to check wallet connection:', error);
        }
    }
});

// Listen for account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
            updateWalletUI(accounts[0]);
            showAlert('Wallet account changed', 'info');
        } else {
            // Disconnected
            isWalletConnected = false;
            walletAddressInput.value = '';
            walletStatus.classList.add('hidden');
            connectWalletBtn.disabled = false;
            walletBtnText.textContent = 'Connect MetaMask';
            connectWalletBtn.style.background = '';
            connectWalletBtn.style.color = '';
            updateSubmitButton();
            showAlert('Wallet disconnected', 'warning');
        }
    });
}

// form validation

// Real-time validation
nameInput.addEventListener('input', updateSubmitButton);
emailInput.addEventListener('input', updateSubmitButton);
passwordInput.addEventListener('input', () => {
    updateSubmitButton();
    // Check password match
    if (confirmPasswordInput.value !== '') {
        if (confirmPasswordInput.value !== passwordInput.value) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    }
});
confirmPasswordInput.addEventListener('input', () => {
    updateSubmitButton();
    // Check password match
    if (confirmPasswordInput.value !== passwordInput.value) {
        confirmPasswordInput.setCustomValidity('Passwords do not match');
    } else {
        confirmPasswordInput.setCustomValidity('');
    }
});
termsCheckbox.addEventListener('change', updateSubmitButton);

// Allow manual editing of wallet address
walletAddressInput.addEventListener('input', () => {
    const address = walletAddressInput.value.trim();
    if (isValidAddress(address)) {
        isWalletConnected = true;
        updateSubmitButton();
    } else {
        isWalletConnected = false;
        updateSubmitButton();
    }
});

// form submission

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlerts();

    // Validate passwords match
    if (passwordInput.value !== confirmPasswordInput.value) {
        showAlert('Passwords do not match', 'error');
        return;
    }

    // Validate wallet address
    if (!isValidAddress(walletAddressInput.value)) {
        showAlert('Invalid wallet address', 'error');
        return;
    }

    // Disable submit button and show loading
    submitBtn.disabled = true;
    submitBtnText.textContent = 'Creating Account...';
    submitSpinner.classList.remove('hidden');

    try {
        // Prepare registration data
        const registrationData = {
            name: nameInput.value.trim(),
            email: emailInput.value.trim().toLowerCase(),
            password: passwordInput.value,
            walletAddress: walletAddressInput.value.toLowerCase()
        };

        // Make API request
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registrationData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            // Registration successful
            showAlert('Account created successfully! Redirecting to dashboard...', 'success');

            // Store token in localStorage
            localStorage.setItem('evote_token', data.token);
            localStorage.setItem('evote_user', JSON.stringify(data.user));

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);

        } else {
            // Registration failed
            const errorMessage = data.message || 'Registration failed. Please try again.';
            showAlert(errorMessage, 'error');
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtnText.textContent = 'Create Account';
            submitSpinner.classList.add('hidden');
        }

    } catch (error) {
        console.error('Registration error:', error);
        showAlert('Network error. Please check your connection and try again.', 'error');
        
        // Re-enable button
        submitBtn.disabled = false;
        submitBtnText.textContent = 'Create Account';
        submitSpinner.classList.add('hidden');
    }
});

// Initial button state check
updateSubmitButton();