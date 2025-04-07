require('dotenv').config(); // Load environment variables from .env file
const { publishToNostr } = require('./src/nostr');

const testNostrSecretKeyNsec = process.env.TESTING_ACCOUNT_NSEC; // Use TESTING_ACCOUNT_NSEC
// Add a hashtag with an underscore
const testContent = `Test post from nostr-test.js at ${new Date().toISOString()} #test #nostr #Gemini2_5_Pro #another_test`;

async function runTest() {
    console.log("Running Nostr test using TESTING_ACCOUNT_NSEC...");

    if (!testNostrSecretKeyNsec) {
        console.error("TESTING_ACCOUNT_NSEC environment variable not found in .env file.");
        return;
    }

    try {
        await publishToNostr(testContent, testNostrSecretKeyNsec); // Pass the test key
        console.log("Nostr test completed.");
    } catch (error) {
        console.error("Error during Nostr test:", error);
    }
}

runTest();
