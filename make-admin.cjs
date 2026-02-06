const mongoose = require('mongoose');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const makeAdmin = async () => {
    try {
        console.log('\n╔═══════════════════════════════════════╗');
        console.log('║     MAKE USER ADMIN UTILITY          ║');
        console.log('╚═══════════════════════════════════════╝\n');

        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/voting-app');
        console.log('✅ Connected to database\n');

        // Ask for email
        rl.question('Enter user email to make admin: ', async (email) => {
            if (!email || !email.trim()) {
                console.log('Email is required');
                rl.close();
                await mongoose.disconnect();
                process.exit(1);
                return;
            }

            const result = await mongoose.connection.db.collection('users').updateOne(
                { email: email.trim().toLowerCase() },
                { $set: { role: 'admin' } }
            );

            if (result.modifiedCount > 0) {
                console.log('\nUser updated to admin successfully!');
                console.log(`Email: ${email}`);
            } else if (result.matchedCount > 0) {
                console.log('\nUser is already an admin');
                console.log(`Email: ${email}`);
            } else {
                console.log('\nUser not found');
                console.log(`Email: ${email}`);
                console.log('\nMake sure the user is registered first!');
            }

            console.log('\n');
            rl.close();
            await mongoose.disconnect();
            process.exit(0);
        });

    } catch (error) {
        console.error('\nError:', error.message);
        rl.close();
        await mongoose.disconnect();
        process.exit(1);
    }
};

makeAdmin();