pragma solidity ^0.8.19;

contract Voting {
    // store admin address to control election lifecycle

    address public admin;

    // election details
    struct Election {
        string title;
        uint256 startTime; // when election starts
        uint256 endTime;   // when election ends
        bool exists;    // to check if election exists
    }

    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount; // increments with each vote
    }

    // mappings
    mapping(uint256 => Election) public elections; // key: electionId, value: Election
    mapping(uint256 => Candidate[]) public candidates; // key: electionId, value: array of Candidates
    mapping(uint256 => mapping(address => bool)) public hasVoted; // prevent double voting

    uint256 public electionCount;

    // events
    event ElectionCreated(uint256 electionId, string title);
    event VoteCast(uint256 electionId, uint256 candidateId, address voter);

    // modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }
    // constructor
    constructor(){
        admin = msg.sender;
    }
    // functions
    function createElection(
        string memory _title,
        string[] memory _candidateNames,
        uint256 _durationInHours
    ) public onlyAdmin {
        uint256 electionId = electionCount++;
        elections[electionId] = Election({
            title:_title,
            startTime: block.timestamp, // current time
            endTime: block.timestamp + (_durationInHours * 1 hours),
            exists: true

        });

        // add candidates
        for(uint256 i = 0; i < _candidateNames.length; i++){
            candidates[electionId].push(Candidate({
                id: i,
                name: _candidateNames[i],
                voteCount: 0 // start with zero votes
            }));
        }

        emit ElectionCreated(electionId, _title); // trigger event

    }

    function vote(uint256 _electionId, uint256 _candidateId) public{
        // security checks
        require(elections[_electionId].exists, "Election does not exist");
        require(block.timestamp >= elections[_electionId].startTime, "Election has not started yet");
        require(block.timestamp <= elections[_electionId].endTime, "Election has ended");
        require(!hasVoted[_electionId][msg.sender], "You have already voted in this election");
        require(_candidateId < candidates[_electionId].length, "Invalid candidate");

        // record the vote
        hasVoted[_electionId][msg.sender] = true;
        candidates[_electionId][_candidateId].voteCount += 1;
        emit VoteCast(_electionId, _candidateId, msg.sender);
    }

    function getResults(uint256 _electionId) public view returns (Candidate[] memory){
        require(elections[_electionId].exists, "Election does not exist");

        return candidates[_electionId];
    }

    function hasAddressVoted(uint256 _electionId, address _voter) public view returns (bool){
        return hasVoted[_electionId][_voter];
    }

    
}