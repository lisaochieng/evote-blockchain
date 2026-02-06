import { expect } from "chai";
import { network } from "hardhat";

describe("Voting Contract", function () {
    let voting: any;
    let admin: any;
    let voter1: any;
    let voter2: any;

    beforeEach(async function () {
        const { ethers } = await network.connect();
        [admin, voter1, voter2] = await ethers.getSigners();
        
        const Voting = await ethers.getContractFactory("Voting");
        voting = await Voting.deploy();
    });
    // test 1: admin assignment
    it("Should set the deployer as admin", async function () {
        expect(await voting.admin()).to.equal(admin.address);
    });
    // test 2: election creation
    it("Should create an election with candidates", async function () {
        await voting.createElection(
            "Best Programming Language",
            ["JavaScript", "Python", "Solidity"],
            24
        );

        const election = await voting.elections(0);
        expect(election.title).to.equal("Best Programming Language");
        expect(election.exists).to.equal(true);

        const results = await voting.getResults(0);
        expect(results.length).to.equal(3);
        expect(results[0].name).to.equal("JavaScript");
        expect(results[0].voteCount).to.equal(0);
    });

    // test 3: security - admin only
    it("Should prevent non-admin from creating election", async function () {
        await expect(
            voting.connect(voter1).createElection(
                // non admin trying to create election
                "Unauthorized Election",
                ["Option A", "Option B"],
                24
            )
        ).to.be.revertedWith("Only admin can perform this action");
    });
    // test 4: voting functionality
    it("Should allow voters to cast votes", async function () {
        await voting.createElection("Test Election", ["Alice", "Bob"], 24);

        await voting.connect(voter1).vote(0, 0); // voter1 votes for Alice
        const results = await voting.getResults(0);
        expect(results[0].voteCount).to.equal(1); // Alice should have 1 vote
        expect(await voting.hasAddressVoted(0, voter1.address)).to.equal(true);
    });
    // test 5: prevent double voting
    it("Should prevent double voting by the same voter", async function () {
        await voting.createElection("Test Election", ["Alice", "Bob"], 24);
        await voting.connect(voter1).vote(0, 0); // voter1 votes for Alice
        await expect(
            voting.connect(voter1).vote(0, 1) // voter1 tries to vote again for Bob
        ).to.be.revertedWith("You have already voted in this election");
    });

    // test 6: multiple voters
    it("Should allow multiple different voters to vote", async function () {
        await voting.createElection("Test Election", ["Alice", "Bob"], 24);
        await voting.connect(voter1).vote(0, 0);
        await voting.connect(voter2).vote(0, 1);
        const results = await voting.getResults(0);
        expect(results[0].voteCount).to.equal(1); 
        expect(results[1].voteCount).to.equal(1); 
    });

    // test 7: invalid candidate
    it("Should reject votes for non-existent candidates", async function () {
        await voting.createElection("Test Election", ["Alice", "Bob"], 24);
        await expect(
            voting.connect(voter1).vote(0, 5)
        ).to.be.revertedWith("Invalid candidate");
    });

    // test 8: invalid election
    it("Should reject votes for non-existent elections", async function () {
        await expect(
            voting.connect(voter1).vote(999, 0)
        ).to.be.revertedWith("Election does not exist");
    });
});