import hre from "hardhat";

async function main() {
    console.log("\n╔═══════════════════════════════════════╗");
    console.log("║   DEPLOYING VOTING SMART CONTRACT    ║");
    console.log("╚═══════════════════════════════════════╝\n");

    const [deployer] = await hre.ethers.getSigners();
    
    console.log("Deploying with account:", deployer.address);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();

    await voting.waitForDeployment();
    const contractAddress = await voting.getAddress();
    
    console.log("\n✅ Deployed successfully!");
    console.log("\n📍 Contract Address:", contractAddress);
    console.log(`\n➡️  CONTRACT_ADDRESS = '${contractAddress}'\n`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});