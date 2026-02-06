

// DASHBOARD

//state variables
let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let currentUser = null;
let elections = [];
let selectedElection = null;
let selectedCandidate = null;

// API URL for backend
const API_URL = 'http://localhost:5000/api';

// dom elements
let userNameEl, walletBadge, walletAddressEl, totalVotesEl;
let activeElectionsEl, pendingVotesEl, electionsContainer;
let historyContainer, votingModal, modalTitle, candidatesList;
let modalVoteBtn, modalCloseBtn, modalCancelBtn, logoutBtn;
let loadingState, emptyState, historyEmptyState;
let voteButtonText, selectedCandidateEl, voteConfirmation;

// Initialize DOM elements
const initDOMElements = () => {
    // Header elements
    userNameEl = document.getElementById('userName');
    walletBadge = document.getElementById('walletBadge');
    walletAddressEl = document.getElementById('walletAddress');
    
    // Stats elements
    totalVotesEl = document.getElementById('totalVotes');
    activeElectionsEl = document.getElementById('activeElections');
    pendingVotesEl = document.getElementById('pendingVotes');
    
    // Elections section
    electionsContainer = document.getElementById('electionsContainer');
    loadingState = document.getElementById('loadingState');
    emptyState = document.getElementById('emptyState');
    
    // History section
    historyContainer = document.getElementById('historyContainer');
    historyEmptyState = document.getElementById('historyEmptyState');
    
    // Modal elements
    votingModal = document.getElementById('votingModal');
    modalTitle = document.getElementById('modalTitle');
    candidatesList = document.getElementById('candidatesList');
    modalVoteBtn = document.getElementById('modalVoteBtn');
    modalCloseBtn = document.getElementById('modalCloseBtn');
    modalCancelBtn = document.getElementById('modalCancelBtn');
    voteButtonText = document.getElementById('voteButtonText');
    selectedCandidateEl = document.getElementById('selectedCandidate');
    voteConfirmation = document.getElementById('voteConfirmation');
    
    // Other
    logoutBtn = document.getElementById('logoutBtn');
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const showAlert = (message, type = 'info') => {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.style.cssText = `
        padding: 15px 20px;
        border-radius: 8px;
        margin-bottom: 15px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'rgba(0, 255, 136, 0.1)' : type === 'error' ? 'rgba(255, 68, 68, 0.1)' : 'rgba(0, 136, 255, 0.1)'};
        border: 1px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#0088ff'};
        color: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#0088ff'};
    `;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px;margin-left:15px;">×</button>
    `;
    container.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
};

const getAuthToken = () => localStorage.getItem('evote_token');

const getUserData = () => {
    const data = localStorage.getItem('evote_user');
    return data ? JSON.parse(data) : null;
};

const checkAuth = () => {
    const token = getAuthToken();
    const user = getUserData();
    
    if (!token || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    currentUser = user;
    return true;
};

const formatAddress = (address) => {
    if (!address) return 'Not Connected';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
    });
};

// ether.js initialization

const initEthers = async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            showAlert('Please install MetaMask to use this app!', 'error');
            return false;
        }

        provider = new ethers.BrowserProvider(window.ethereum);
        
        const accounts = await window.ethereum.request({ 
            method: 'eth_requestAccounts' 
        });
        
        if (accounts.length === 0) {
            showAlert('Please connect your wallet', 'warning');
            return false;
        }

        currentAccount = accounts[0];
        signer = await provider.getSigner();

        const network = await provider.getNetwork();
        if (Number(network.chainId) !== 31337) {
            showAlert('Please switch to Hardhat Local network (chainId: 31337)', 'error');
        }

        if (!window.contractConfig) {
            console.error('❌ Contract config not loaded!');
            return false;
        }

        const contractAddress = window.contractConfig.ADDRESS;
        const contractABI = window.contractConfig.ABI;
        
        contract = new ethers.Contract(contractAddress, contractABI, signer);
updateWalletUI();

        window.ethereum.on('accountsChanged', handleAccountChange);
        window.ethereum.on('chainChanged', () => window.location.reload());
return true;

    } catch (error) {
        console.error('Ethers initialization error:', error);
        showAlert('Failed to connect to blockchain: ' + error.message, 'error');
        return false;
    }
};

const handleAccountChange = async (accounts) => {
    if (accounts.length === 0) {
        showAlert('Wallet disconnected', 'warning');
        currentAccount = null;
    } else {
        currentAccount = accounts[0];
        signer = provider.getSigner();
        contract = contract.connect(signer);
    }
    updateWalletUI();
    await loadElections();
};

const updateWalletUI = () => {
    if (walletAddressEl) {
        walletAddressEl.textContent = currentAccount ? formatAddress(currentAccount) : 'Not Connected';
    }
    if (walletBadge && currentAccount) {
        walletBadge.classList.add('connected');
    }
};

// load elections from blockchain

const loadElections = async () => {
    try {
        if (!contract) {
// Make sure loading is hidden even if contract isn't ready
            if (loadingState) loadingState.classList.add('hidden');
            return;
        }

        // Show loading state
        if (loadingState) loadingState.classList.remove('hidden');
        if (emptyState) emptyState.classList.add('hidden');

        const electionCount = await contract.electionCount();
        const count = Number(electionCount);
elections = [];
        let activeCount = 0;

        for (let i = 0; i < count; i++) {
            try {
                const election = await contract.elections(i);
                const candidatesData = await contract.getResults(i);
                
               const candidates = candidatesData.map((c, index) => ({
    id: index,
    name: c.name,
    voteCount: Number(c.voteCount)
}));

const now = Math.floor(Date.now() / 1000);
const isActive = election.exists && 
                now >= Number(election.startTime) && 
                now <= Number(election.endTime);

                if (isActive) activeCount++;

                let hasVoted = false;
                if (currentAccount) {
                    try {
                        hasVoted = await contract.hasVoted(i, currentAccount);
                    } catch (e) {
}
                }

                const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);

                elections.push({
                    id: i,
                    title: election.title,
                    startTime: Number(election.startTime),
                    endTime: Number(election.endTime),
                    exists: election.exists,
                    isActive,
                    hasVoted,
                    candidates,
                    totalVotes
                });


            } catch (err) {
                console.error(`Error loading election ${i}:`, err);
            }
        }

        // Update stats
        if (activeElectionsEl) activeElectionsEl.textContent = activeCount;
        
        // ALWAYS hide loading state after data is loaded
        if (loadingState) loadingState.classList.add('hidden');
        
        // Render elections
        renderElections();
        
        // Load voting history
        await loadVotingHistory();

    } catch (error) {
        console.error('Load elections error:', error);
        // ALWAYS hide loading state on error
        if (loadingState) loadingState.classList.add('hidden');
        showAlert('Failed to load elections', 'error');
    }
};

// render elections

const renderElections = () => {
    if (!electionsContainer) {
        console.error('electionsContainer not found!');
        return;
    }

    // Clear previous content (except loading and empty states)
    const cards = electionsContainer.querySelectorAll('.election-card');
    cards.forEach(card => card.remove());

    if (elections.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    const activeElections = elections.filter(e => e.isActive);

    if (activeElections.length === 0) {
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    activeElections.forEach(election => {
        const card = document.createElement('div');
        card.className = 'election-card';
        card.innerHTML = `
            <div class="election-header">
                <h3 class="election-title">${election.title}</h3>
                <span class="election-badge active">Active</span>
            </div>
            <div class="election-stats">
                <div class="election-stat">
                    <span class="stat-number">${election.candidates.length}</span>
                    <span class="stat-label">Candidates</span>
                </div>
                <div class="election-stat">
                    <span class="stat-number">${election.totalVotes}</span>
                    <span class="stat-label">Total Votes</span>
                </div>
            </div>
            <div class="candidates-preview">
                ${election.candidates.slice(0, 3).map(c => `
                    <span class="candidate-tag">${c.name}</span>
                `).join('')}
                ${election.candidates.length > 3 ? `<span class="candidate-tag more">+${election.candidates.length - 3}</span>` : ''}
            </div>
            <div class="election-actions">
                <button class="btn-vote ${election.hasVoted ? 'voted' : ''}" 
                        onclick="openVoteModal(${election.id})"
                        ${election.hasVoted ? 'disabled' : ''}>
                    ${election.hasVoted ? '✓ Already Voted' : '🗳️ Vote Now'}
                </button>
                <button class="btn-results" onclick="viewResults(${election.id})">
                    📊 View Results
                </button>
            </div>
        `;
        electionsContainer.appendChild(card);
    });
};

// voting modal

window.openVoteModal = (electionId) => {
    selectedElection = elections.find(e => e.id === electionId);
    if (!selectedElection) return;

    selectedCandidate = null;
    
    if (modalTitle) modalTitle.textContent = selectedElection.title;
    
    if (candidatesList) {
        candidatesList.innerHTML = selectedElection.candidates.map(candidate => `
            <div class="candidate-option" data-id="${candidate.id}" onclick="selectCandidate(${candidate.id})">
                <div class="candidate-info">
                    <span class="candidate-name">${candidate.name}</span>
                    <span class="candidate-votes">${candidate.voteCount} votes</span>
                </div>
                <div class="candidate-radio">
                    <div class="radio-inner"></div>
                </div>
            </div>
        `).join('');
    }

    if (voteButtonText) voteButtonText.textContent = 'Select a Candidate';
    if (modalVoteBtn) modalVoteBtn.disabled = true;
    if (voteConfirmation) voteConfirmation.classList.add('hidden');
    if (votingModal) votingModal.classList.remove('hidden');
};

window.selectCandidate = (candidateId) => {
    selectedCandidate = candidateId;
    
    document.querySelectorAll('.candidate-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    const selected = document.querySelector(`.candidate-option[data-id="${candidateId}"]`);
    if (selected) selected.classList.add('selected');
    
    const candidate = selectedElection.candidates.find(c => c.id === candidateId);
    if (selectedCandidateEl && candidate) {
        selectedCandidateEl.textContent = candidate.name;
    }
    
    if (voteButtonText) voteButtonText.textContent = 'Confirm Vote';
    if (modalVoteBtn) modalVoteBtn.disabled = false;
    if (voteConfirmation) voteConfirmation.classList.remove('hidden');
};

const closeModal = () => {
    if (votingModal) votingModal.classList.add('hidden');
    selectedElection = null;
    selectedCandidate = null;
};

// cast vote

const castVote = async () => {
    if (!selectedElection || selectedCandidate === null) {
        showAlert('Please select a candidate', 'warning');
        return;
    }

    try {
        if (modalVoteBtn) modalVoteBtn.disabled = true;
        if (voteButtonText) voteButtonText.textContent = 'Processing...';
const tx = await contract.vote(selectedElection.id, selectedCandidate);
        
        showAlert('Transaction submitted! Waiting for confirmation...', 'info');
        
        await tx.wait();
// Record vote in backend
        const token = getAuthToken();
        
        const response = await fetch(`${API_URL}/votes/record`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                electionId: selectedElection.id,
                candidateId: selectedCandidate
            })
        });

        const result = await response.json();
showAlert('🎉 Vote cast successfully!', 'success');
        
        closeModal();
        await loadElections();

    } catch (error) {
        console.error('Vote error:', error);
        
        if (error.message.includes('Already voted')) {
            showAlert('You have already voted in this election', 'error');
        } else {
            showAlert('Failed to cast vote: ' + error.message, 'error');
        }
        
        if (modalVoteBtn) modalVoteBtn.disabled = false;
        if (voteButtonText) voteButtonText.textContent = 'Confirm Vote';
    }
};

// load voting history

const loadVotingHistory = async () => {
    try {
        const token = getAuthToken();
        if (!token) return;

        const response = await fetch(`${API_URL}/votes/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
if (!historyContainer) {
            console.error('historyContainer not found!');
            return;
        }

        if (!data.success || !data.history || data.history.length === 0) {
            if (historyEmptyState) historyEmptyState.classList.remove('hidden');
            if (totalVotesEl) totalVotesEl.textContent = '0';
            return;
        }

        // Hide empty state
        if (historyEmptyState) historyEmptyState.classList.add('hidden');
        if (totalVotesEl) totalVotesEl.textContent = data.totalVotes || data.history.length;

        // Clear previous history items
        const existingItems = historyContainer.querySelectorAll('.history-item');
        existingItems.forEach(item => item.remove());

        // Render history items
        data.history.forEach(item => {
            const election = elections.find(e => e.id === item.electionId);
            const electionTitle = election ? election.title : `Election #${item.electionId}`;
            
            // Get candidate name - FIXED
            let candidateName = 'Unknown';
            
            if (item.candidateId === undefined || item.candidateId === null) {
                candidateName = '⚠️ Record incomplete';
            } else if (election && election.candidates) {
                const candidate = election.candidates.find(c => c.id === item.candidateId);
                if (candidate) {
                    candidateName = candidate.name;
                } else if (election.candidates[item.candidateId]) {
                    candidateName = election.candidates[item.candidateId].name;
                } else {
                    candidateName = `Candidate #${item.candidateId}`;
                }
            }

            const voteDate = formatDate(item.votedAt);

            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M9 12l2 2 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                    </svg>
                </div>
                <div class="history-details">
                    <h4 class="history-title">${electionTitle}</h4>
                    <p class="history-meta">Voted for <strong>${candidateName}</strong> • ${voteDate}</p>
                </div>
                <span class="history-badge">Recorded</span>
            `;
            historyContainer.appendChild(historyItem);
        });

    } catch (error) {
        console.error('Load voting history error:', error);
    }
};

// view results

window.viewResults = (electionId) => {
    window.location.href = `results.html?id=${electionId}`;
};

// logout

const logout = () => {
    localStorage.removeItem('evote_token');
    localStorage.removeItem('evote_user');
    window.location.href = 'login.html';
};

// user menu dropdown

const initUserMenu = () => {
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userDropdown = document.getElementById('userDropdown');
    
    if (userMenuBtn && userDropdown) {
        userMenuBtn.addEventListener('click', () => {
            userDropdown.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
                userDropdown.classList.add('hidden');
            }
        });
    }
};

// initialization

document.addEventListener('DOMContentLoaded', async () => {
// Initialize DOM elements
    initDOMElements();

    // Check authentication
    if (!checkAuth()) return;

    // Update UI with user info
    if (userNameEl && currentUser) {
        userNameEl.textContent = currentUser.name || 'User';
    }
    
    // Set user initials
    const userInitials = document.getElementById('userInitials');
    if (userInitials && currentUser && currentUser.name) {
        userInitials.textContent = currentUser.name.charAt(0).toUpperCase();
    }

    // Initialize user menu
    initUserMenu();

    // Initialize Ethers.js
    const ethersReady = await initEthers();
    
    if (ethersReady) {
        await loadElections();
    }

    // Event listeners
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalCancelBtn) modalCancelBtn.addEventListener('click', closeModal);
    if (modalVoteBtn) modalVoteBtn.addEventListener('click', castVote);
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    // Modal overlay click to close
    const modalOverlay = document.getElementById('modalOverlay');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', closeModal);
    }

    // Refresh button
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadElections);
    }
});

// global functions for debugging

window.loadElections = loadElections;
window.loadVotingHistory = loadVotingHistory;

// Fix vote function - run in console to fix missing candidateId
window.fixVote = async (electionId, candidateId) => {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/votes/record`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ electionId, candidateId })
    });
    const result = await response.json();
await loadVotingHistory();
    return result;
};

// Check elections
window.checkElections = () => {
elections.forEach(e => {
e.candidates.forEach(c => {
});
    });
};