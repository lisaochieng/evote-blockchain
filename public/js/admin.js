// E-VOTE ADMIN PANEL JAVASCRIPT

// state var
let provider = null;
let signer = null;
let contract = null;
let currentAccount = null;
let currentUser = null;
let elections = [];
let users = [];

const API_URL = 'http://localhost:5000/api';

// utility functions

const showAlert = (message, type = 'info') => {
    const container = document.getElementById('alert-container');
    if (!container) return;

    const alert = document.createElement('div');
    alert.style.cssText = `
        padding: 15px 20px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 15px;
        animation: slideIn 0.3s ease;
        background: ${type === 'success' ? 'rgba(0, 255, 136, 0.15)' : type === 'error' ? 'rgba(255, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)'};
        border: 1px solid ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#3b82f6'};
        color: ${type === 'success' ? '#00ff88' : type === 'error' ? '#ff4444' : '#3b82f6'};
        min-width: 300px;
    `;
    alert.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:18px;">×</button>
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
    
    // Check if user is admin
    if (user.role !== 'admin') {
        showAlert('Access denied. Admin only.', 'error');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);
        return false;
    }
    
    currentUser = user;
    return true;
};

const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDate = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// navigation

window.showSection = (sectionName) => {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === sectionName) {
            link.classList.add('active');
        }
    });
    
    // Update sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}Section`);
    if (targetSection) {
        targetSection.classList.add('active');
    }
};

// ethers.js init

const initEthers = async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            showAlert('Please install MetaMask!', 'error');
            return false;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        if (accounts.length === 0) {
            showAlert('Please connect your wallet', 'warning');
            return false;
        }

        currentAccount = accounts[0];
        signer = provider.getSigner();

        const network = await provider.getNetwork();
        if (network.chainId !== 31337) {
            showAlert('Please switch to Hardhat Local network', 'error');
        }

        if (!window.contractConfig) {
            console.error('Contract config not loaded!');
            return false;
        }

        contract = new ethers.Contract(
            window.contractConfig.ADDRESS,
            window.contractConfig.ABI,
            signer
        );
return true;

    } catch (error) {
        console.error('Ethers init error:', error);
        showAlert('Failed to connect: ' + error.message, 'error');
        return false;
    }
};

// load data

const loadElections = async () => {
    try {
        if (!contract) return;

        const electionCount = await contract.electionCount();
        const count = electionCount.toNumber();
        
        elections = [];
        let activeCount = 0;

        for (let i = 0; i < count; i++) {
            const election = await contract.elections(i);
            const candidatesData = await contract.getResults(i);
            
            const candidates = candidatesData.map((c, index) => ({
                id: index,
                name: c.name,
                voteCount: c.voteCount.toNumber()
            }));

            const now = Math.floor(Date.now() / 1000);
            const isActive = election.exists && 
                            now >= election.startTime.toNumber() && 
                            now <= election.endTime.toNumber();

            if (isActive) activeCount++;

            elections.push({
                id: i,
                title: election.title,
                startTime: election.startTime.toNumber(),
                endTime: election.endTime.toNumber(),
                exists: election.exists,
                isActive,
                candidates,
                totalVotes: candidates.reduce((sum, c) => sum + c.voteCount, 0)
            });
        }

        // Update stats
        document.getElementById('statActiveElections').textContent = activeCount;
        document.getElementById('statTotalElections').textContent = count;
        document.getElementById('statTotalVotes').textContent = elections.reduce((sum, e) => sum + e.totalVotes, 0);

        renderElectionsTable();
        renderRecentElections();

    } catch (error) {
        console.error('Load elections error:', error);
    }
};

const loadUsers = async () => {
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            users = data.users;
            document.getElementById('statTotalUsers').textContent = users.length;
            renderUsersTable();
        }
    } catch (error) {
        console.error('Load users error:', error);
    }
};

window.refreshAllData = async () => {
    showAlert('Refreshing data...', 'info');
    await loadElections();
    await loadUsers();
    showAlert('Data refreshed!', 'success');
};

// render functions

const renderElectionsTable = () => {
    const tbody = document.getElementById('electionsTableBody');
    if (!tbody) return;

    if (elections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No elections found</td></tr>';
        return;
    }

    tbody.innerHTML = elections.map(election => {
        const now = Math.floor(Date.now() / 1000);
        const status = election.isActive ? 'active' : (now > election.endTime ? 'ended' : 'pending');
        
        return `
            <tr>
                <td>#${election.id}</td>
                <td><strong>${election.title}</strong></td>
                <td>${election.candidates.length}</td>
                <td>${election.totalVotes}</td>
                <td><span class="status-badge ${status}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
                <td>${formatDate(election.endTime)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action view" onclick="viewResults(${election.id})">Results</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
};

const renderUsersTable = () => {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No users found</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="avatar">${user.name.charAt(0).toUpperCase()}</div>
                    <span class="name">${user.name}</span>
                </div>
            </td>
            <td>${user.email}</td>
            <td class="wallet-cell">${formatAddress(user.walletAddress)}</td>
            <td><span class="status-badge ${user.role}">${user.role}</span></td>
            <td>${user.totalVotesCast || 0}</td>
            <td><span class="status-badge ${user.isActive ? 'active' : 'ended'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    ${user.role !== 'admin' ? `
                        <button class="btn-action promote" onclick="promoteUser('${user._id}')">Make Admin</button>
                    ` : ''}
                    ${user.isActive ? `
                        <button class="btn-action deactivate" onclick="toggleUserStatus('${user._id}', false)">Deactivate</button>
                    ` : `
                        <button class="btn-action activate" onclick="toggleUserStatus('${user._id}', true)">Activate</button>
                    `}
                </div>
            </td>
        </tr>
    `).join('');
};

const renderRecentElections = () => {
    const container = document.getElementById('recentElectionsList');
    if (!container) return;

    if (elections.length === 0) {
        container.innerHTML = '<div class="loading-state">No elections yet</div>';
        return;
    }

    const recent = elections.slice(-5).reverse();
    
    container.innerHTML = recent.map(election => `
        <div class="activity-item">
            <div class="activity-info">
                <div class="activity-icon">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/>
                        <path d="M3 9h14" stroke="currentColor" stroke-width="1.5"/>
                    </svg>
                </div>
                <div class="activity-details">
                    <h4>${election.title}</h4>
                    <p>${election.candidates.length} candidates • ${election.totalVotes} votes</p>
                </div>
            </div>
            <span class="activity-badge ${election.isActive ? 'active' : 'ended'}">
                ${election.isActive ? 'Active' : 'Ended'}
            </span>
        </div>
    `).join('');
};

// create elections

window.openCreateModal = () => {
    document.getElementById('createElectionModal').classList.remove('hidden');
    document.getElementById('electionTitle').value = '';
    document.getElementById('electionDuration').value = '24';
    
    // Reset candidates to 2
    const candidatesList = document.getElementById('candidatesInputList');
    candidatesList.innerHTML = `
        <div class="candidate-input-row">
            <input type="text" placeholder="Candidate name" class="candidate-input" required>
            <button type="button" class="btn-icon remove-candidate" disabled>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
        <div class="candidate-input-row">
            <input type="text" placeholder="Candidate name" class="candidate-input" required>
            <button type="button" class="btn-icon remove-candidate" disabled>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M6 10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
            </button>
        </div>
    `;
    updateRemoveButtons();
};

const closeCreateModal = () => {
    document.getElementById('createElectionModal').classList.add('hidden');
};

const addCandidate = () => {
    const list = document.getElementById('candidatesInputList');
    const newRow = document.createElement('div');
    newRow.className = 'candidate-input-row';
    newRow.innerHTML = `
        <input type="text" placeholder="Candidate name" class="candidate-input" required>
        <button type="button" class="btn-icon remove-candidate">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M6 10h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        </button>
    `;
    list.appendChild(newRow);
    updateRemoveButtons();
};

const updateRemoveButtons = () => {
    const rows = document.querySelectorAll('.candidate-input-row');
    rows.forEach(row => {
        const btn = row.querySelector('.remove-candidate');
        btn.disabled = rows.length <= 2;
        btn.onclick = () => {
            if (rows.length > 2) {
                row.remove();
                updateRemoveButtons();
            }
        };
    });
};

const createElection = async (e) => {
    e.preventDefault();
    
    const title = document.getElementById('electionTitle').value.trim();
    const duration = parseInt(document.getElementById('electionDuration').value);
    const candidateInputs = document.querySelectorAll('.candidate-input');
    const candidates = Array.from(candidateInputs).map(input => input.value.trim()).filter(c => c);

    if (!title) {
        showAlert('Please enter an election title', 'error');
        return;
    }

    if (candidates.length < 2) {
        showAlert('Please add at least 2 candidates', 'error');
        return;
    }

    if (duration < 1 || duration > 720) {
        showAlert('Duration must be between 1 and 720 hours', 'error');
        return;
    }

    const submitBtn = document.getElementById('submitElectionBtn');
    const spinner = document.getElementById('createSpinner');
    
    try {
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');
// Call smart contract
        const tx = await contract.createElection(title, candidates, duration);
        
        showAlert('Transaction submitted! Waiting for confirmation...', 'info');
        
        await tx.wait();
        
        showAlert('🎉 Election created successfully!', 'success');
        
        closeCreateModal();
        await loadElections();

    } catch (error) {
        console.error('Create election error:', error);
        showAlert('Failed to create election: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
    }
};

// view results

window.viewResults = (electionId) => {
    const election = elections.find(e => e.id === electionId);
    if (!election) return;

    const modal = document.getElementById('resultsModal');
    document.getElementById('resultsModalTitle').textContent = election.title;
    
    const body = document.getElementById('resultsModalBody');
    
    // Sort candidates by votes
    const sorted = [...election.candidates].sort((a, b) => b.voteCount - a.voteCount);
    const maxVotes = sorted[0]?.voteCount || 1;

    body.innerHTML = `
        <div class="results-list">
            ${sorted.map((candidate, index) => {
                const percentage = election.totalVotes > 0 
                    ? Math.round((candidate.voteCount / election.totalVotes) * 100) 
                    : 0;
                const isWinner = index === 0 && candidate.voteCount > 0;
                
                return `
                    <div class="result-item ${isWinner ? 'winner' : ''}">
                        <div class="result-rank">${index + 1}</div>
                        <div class="result-info">
                            <div class="result-name">${candidate.name} ${isWinner ? '👑' : ''}</div>
                            <div class="result-bar">
                                <div class="result-bar-fill" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                        <div class="result-votes">${candidate.voteCount}</div>
                    </div>
                `;
            }).join('')}
        </div>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center; color: rgba(255,255,255,0.5); font-size: 13px;">
            Total Votes: ${election.totalVotes} • Status: ${election.isActive ? '🟢 Active' : '🔴 Ended'}
        </div>
    `;
    
    modal.classList.remove('hidden');
};

const closeResultsModal = () => {
    document.getElementById('resultsModal').classList.add('hidden');
};

// user management

window.promoteUser = async (userId) => {
    if (!confirm('Are you sure you want to make this user an admin?')) return;
    
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/admin/users/${userId}/make-admin`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('User promoted to admin!', 'success');
            await loadUsers();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert('Failed to promote user', 'error');
    }
};

window.toggleUserStatus = async (userId, activate) => {
    const action = activate ? 'activate' : 'deactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
        const token = getAuthToken();
        const response = await fetch(`${API_URL}/admin/users/${userId}/${action}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(`User ${action}d successfully!`, 'success');
            await loadUsers();
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        showAlert(`Failed to ${action} user`, 'error');
    }
};

// User search
const initUserSearch = () => {
    const searchInput = document.getElementById('userSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#usersTableBody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(query) ? '' : 'none';
            });
        });
    }
};

// initialization

document.addEventListener('DOMContentLoaded', async () => {
// Check auth
    if (!checkAuth()) return;

    // Update admin info
    const adminName = document.getElementById('adminName');
    const adminInitials = document.getElementById('adminInitials');
    if (adminName && currentUser) adminName.textContent = currentUser.name;
    if (adminInitials && currentUser) adminInitials.textContent = currentUser.name.charAt(0).toUpperCase();

    // Initialize Ethers
    await initEthers();

    // Load data
    await loadElections();
    await loadUsers();

    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(link.dataset.section);
        });
    });

    // Create Election Modal
    document.getElementById('createElectionBtn')?.addEventListener('click', openCreateModal);
    document.getElementById('createModalClose')?.addEventListener('click', closeCreateModal);
    document.getElementById('createModalOverlay')?.addEventListener('click', closeCreateModal);
    document.getElementById('cancelCreateBtn')?.addEventListener('click', closeCreateModal);
    document.getElementById('addCandidateBtn')?.addEventListener('click', addCandidate);
    document.getElementById('createElectionForm')?.addEventListener('submit', createElection);

    // Results Modal
    document.getElementById('resultsModalClose')?.addEventListener('click', closeResultsModal);
    document.getElementById('resultsModalOverlay')?.addEventListener('click', closeResultsModal);

    // User search
    initUserSearch();
});