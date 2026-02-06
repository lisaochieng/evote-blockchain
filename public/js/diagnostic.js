// DIAGNOSTIC

//  Check current voting history
async function checkVotingHistory() {
    const token = localStorage.getItem('evote_token');
    if (!token) {
        console.error('❌ Not logged in! Please login first.');
        return null;
    }

    const response = await fetch('http://localhost:5000/api/votes/history', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
console.table(data.history);
    
    // Check for missing candidateId
    const missingCandidateId = data.history.filter(h => 
        h.candidateId === undefined || h.candidateId === null
    );
    
if (missingCandidateId.length > 0) {
    console.warn(`⚠️ Found ${missingCandidateId.length} votes with missing candidateId!`);
} else {
    console.log('✅ All votes have candidateId');
}
    
    return data;
}

// Fix a specific vote
async function fixVote(electionId, candidateId) {
    const token = localStorage.getItem('evote_token');
    if (!token) {
        console.error('❌ Not logged in!');
        return;
    }
const response = await fetch('http://localhost:5000/api/votes/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
            electionId: electionId, 
            candidateId: candidateId 
        })
    });
    
const result = await response.json();
if (result.success) {
    console.log('✅ Vote recorded successfully!');
} else {
    console.error(`❌ Failed: ${result.message}`);
}
    
    return result;
}

// Check elections and their candidates
async function checkElections() {
    if (typeof elections === 'undefined' || elections.length === 0) {
        await loadElections();
    }
    elections.forEach(e => {
        e.candidates.forEach(c => {
            console.log(`Election: ${e.name}, Candidate: ${c.name}`);
        });
    });
    
    return elections;
}

// Run diagnostics
async function runDiagnostics() {
    // Check history
    const history = await checkVotingHistory();
    
    // Check elections
    await checkElections();


}

// Auto-run
runDiagnostics();