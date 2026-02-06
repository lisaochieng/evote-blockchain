// ============================================
// E-VOTE - RESULTS PAGE
// Beautiful charts and data visualization
// ============================================

let provider = null;
let contract = null;
let electionId = null;
let electionData = null;
let barChart = null;
let pieChart = null;

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
// Get election ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    electionId = urlParams.get('id');
    
    if (electionId === null) {
        showError('No election ID provided');
        return;
    }
    
    // Initialize blockchain connection
    const success = await initBlockchain();
    if (success) {
        await loadElectionResults();
    } else {
        showError('Failed to connect to blockchain');
    }
});

// ============================================
// BLOCKCHAIN INITIALIZATION
// ============================================

const initBlockchain = async () => {
    try {
        if (typeof window.ethereum === 'undefined') {
            alert('Please install MetaMask!');
            return false;
        }

        provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.request({ method: 'eth_requestAccounts' });

        if (!window.contractConfig) {
            console.error('Contract config not loaded!');
            return false;
        }

        const contractAddress = window.contractConfig.ADDRESS;
        const contractABI = window.contractConfig.ABI;
        
        const signer = provider.getSigner();
        contract = new ethers.Contract(contractAddress, contractABI, signer);
return true;

    } catch (error) {
        console.error('Blockchain init error:', error);
        return false;
    }
};

// ============================================
// LOAD ELECTION RESULTS
// ============================================

const loadElectionResults = async () => {
    try {
// Get election data
        const election = await contract.elections(electionId);
        const candidatesData = await contract.getResults(electionId);
        
        // Process candidates
        const candidates = candidatesData.map((c, index) => ({
            id: index,
            name: c.name,
            voteCount: c.voteCount.toNumber()
        }));
        
        // Calculate totals
        const totalVotes = candidates.reduce((sum, c) => sum + c.voteCount, 0);
        
        // Sort by votes (descending)
        candidates.sort((a, b) => b.voteCount - a.voteCount);
        
        // Add percentages
        candidates.forEach(c => {
            c.percentage = totalVotes > 0 ? (c.voteCount / totalVotes * 100).toFixed(2) : 0;
        });
        
        // Store election data
        electionData = {
            id: electionId,
            title: election.title,
            startTime: election.startTime.toNumber(),
            endTime: election.endTime.toNumber(),
            exists: election.exists,
            candidates,
            totalVotes
        };
        
        // Determine status
        const now = Math.floor(Date.now() / 1000);
        if (now < electionData.startTime) {
            electionData.status = 'Upcoming';
        } else if (now > electionData.endTime) {
            electionData.status = 'Ended';
        } else {
            electionData.status = 'Active';
        }
// Hide loading, show results
        document.getElementById('loadingResults').style.display = 'none';
        document.getElementById('resultsGrid').classList.remove('hidden');
        
        // Render everything
        renderHeroSection();
        renderWinnerCard();
        renderCharts();
        renderResultsTable();
        renderInfoSection();
        
    } catch (error) {
        console.error('Load results error:', error);
        showError('Failed to load election results');
    }
};

// ============================================
// RENDER HERO SECTION
// ============================================

const renderHeroSection = () => {
    document.getElementById('electionTitle').textContent = electionData.title;
    document.getElementById('totalVotesCount').textContent = electionData.totalVotes.toLocaleString();
    document.getElementById('candidatesCount').textContent = electionData.candidates.length;
    document.getElementById('electionStatus').textContent = electionData.status;
};

// ============================================
// RENDER WINNER CARD
// ============================================

const renderWinnerCard = () => {
    if (electionData.candidates.length === 0 || electionData.totalVotes === 0) {
        document.getElementById('winnerName').textContent = 'No votes yet';
        document.getElementById('winnerVotes').textContent = '0';
        document.getElementById('winnerPercent').textContent = '0%';
        return;
    }
    
    const winner = electionData.candidates[0];
    
    document.getElementById('winnerName').textContent = winner.name;
    document.getElementById('winnerVotes').textContent = winner.voteCount.toLocaleString();
    document.getElementById('winnerPercent').textContent = winner.percentage + '%';
};

// ============================================
// RENDER CHARTS
// ============================================

const renderCharts = () => {
    const candidates = electionData.candidates;
    const labels = candidates.map(c => c.name);
    const votes = candidates.map(c => c.voteCount);
    
    // Generate colors
    const colors = [
        'rgba(0, 255, 136, 0.8)',
        'rgba(0, 136, 255, 0.8)',
        'rgba(255, 68, 68, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(168, 85, 247, 0.8)',
        'rgba(236, 72, 153, 0.8)',
    ];
    
    const borderColors = [
        'rgba(0, 255, 136, 1)',
        'rgba(0, 136, 255, 1)',
        'rgba(255, 68, 68, 1)',
        'rgba(251, 191, 36, 1)',
        'rgba(168, 85, 247, 1)',
        'rgba(236, 72, 153, 1)',
    ];
    
    // Bar Chart
    const barCtx = document.getElementById('barChart').getContext('2d');
    barChart = new Chart(barCtx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Votes',
                data: votes,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.95)',
                    titleColor: '#00ff88',
                    bodyColor: '#fafafa',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: (context) => {
                            const candidate = candidates[context.dataIndex];
                            return `${candidate.voteCount} votes (${candidate.percentage}%)`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            size: 12
                        },
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(148, 163, 184, 0.1)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: '#94a3b8',
                        font: {
                            family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                            size: 12,
                            weight: '600'
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Pie Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    pieChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: votes,
                backgroundColor: colors,
                borderColor: borderColors,
                borderWidth: 2,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 14, 39, 0.95)',
                    titleColor: '#00ff88',
                    bodyColor: '#fafafa',
                    borderColor: '#00ff88',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    callbacks: {
                        label: (context) => {
                            const candidate = candidates[context.dataIndex];
                            return ` ${candidate.voteCount} votes (${candidate.percentage}%)`;
                        }
                    }
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true,
                duration: 1500,
                easing: 'easeOutQuart'
            },
            cutout: '65%'
        }
    });
    
    // Render custom pie chart legend
    renderPieChartLegend(labels, colors);
};

const renderPieChartLegend = (labels, colors) => {
    const legendContainer = document.getElementById('pieChartLegend');
    legendContainer.innerHTML = labels.map((label, index) => `
        <span class="legend-item">
            <span class="legend-dot" style="background: ${colors[index]}"></span>
            ${label}
        </span>
    `).join('');
};

// ============================================
// RENDER RESULTS TABLE
// ============================================

const renderResultsTable = () => {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';
    
    electionData.candidates.forEach((candidate, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="rank-cell ${rankClass}">#${rank}</td>
            <td class="candidate-cell">${candidate.name}</td>
            <td class="votes-cell">${candidate.voteCount.toLocaleString()}</td>
            <td class="percent-cell">${candidate.percentage}%</td>
            <td class="visual-cell">
                <div class="vote-bar">
                    <div class="vote-bar-fill" style="width: ${candidate.percentage}%"></div>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
};

// ============================================
// RENDER INFO SECTION
// ============================================

const renderInfoSection = () => {
    const startDate = new Date(electionData.startTime * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const endDate = new Date(electionData.endTime * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    document.getElementById('startDate').textContent = startDate;
    document.getElementById('endDate').textContent = endDate;
    document.getElementById('contractAddress').textContent = formatAddress(window.contractConfig.ADDRESS);
    document.getElementById('electionId').textContent = electionData.id;
};

// ============================================
// EXPORT RESULTS
// ============================================

window.exportResults = () => {
    if (!electionData) return;
    
    // Create CSV content
    let csv = 'Rank,Candidate,Votes,Percentage\n';
    electionData.candidates.forEach((candidate, index) => {
        csv += `${index + 1},${candidate.name},${candidate.voteCount},${candidate.percentage}%\n`;
    });
    
    // Add summary
    csv += `\nTotal Votes,${electionData.totalVotes}\n`;
    csv += `Election,${electionData.title}\n`;
    csv += `Status,${electionData.status}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `election-${electionId}-results.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatAddress = (address) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const showError = (message) => {
    document.getElementById('loadingResults').style.display = 'none';
    const errorState = document.getElementById('errorState');
    errorState.classList.remove('hidden');
    errorState.querySelector('p').textContent = message;
};
