// ============================================
// E-VOTE - WEB3 UTILITIES
// MetaMask and wallet integration helpers
// ============================================

// Check if MetaMask is installed
const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
};

// Connect to MetaMask wallet
const connectWalletUtil = async () => {
    if (!isMetaMaskInstalled()) {
        throw new Error('MetaMask is not installed. Please install MetaMask extension.');
    }

    try {
        // Request account access
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });

        if (accounts.length === 0) {
            throw new Error('No accounts found. Please unlock MetaMask.');
        }

        // Get the first account
        const account = accounts[0];

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);

        return account;
    } catch (error) {
        console.error('Error connecting wallet:', error);
        throw error;
    }
};

// Get current connected account
const getCurrentAccount = async () => {
    if (!isMetaMaskInstalled()) {
        return null;
    }

    try {
        const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
        });
        return accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
        console.error('Error getting current account:', error);
        return null;
    }
};

// Handle account changes
const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
        // User disconnected wallet
window.location.reload();
    } else {
        // Account changed
window.location.reload();
    }
};

// Format wallet address for display (0x1234...5678)
const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

// Validate Ethereum address
const isValidAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

// Disconnect wallet (clear listeners)
const disconnectWallet = () => {
    if (window.ethereum && window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    }
};

// Export utilities
window.web3Utils = {
    isMetaMaskInstalled,
    connectWallet: connectWalletUtil,
    getCurrentAccount,
    formatAddress,
    isValidAddress,
    disconnectWallet
};
