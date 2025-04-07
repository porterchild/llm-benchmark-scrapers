// Make WebSocket globally available for nostr-tools in Node.js
global.WebSocket = require('ws');

// Import Relay along with other functions
const { Relay, finalizeEvent, nip19 } = require('nostr-tools');

// Define relays to publish to (Removed problematic/paid relays)
const nostrRelays = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nostr.mom',
    'wss://no.str.cr',
    'wss://nostr.oxtr.dev',
    // 'wss://relay.snort.social', // Consistently fails with subscription error
    // 'wss://nos.lol', // Requires PoW
    // 'wss://nostr.wine', // Requires payment
];

/**
 * Extracts hashtags (like #word) from a given text.
 * @param {string} text - The text to parse.
 * @returns {string[]} - An array of unique hashtags found (without the # prefix).
 */
function extractHashtags(text) {
    if (!text) return [];
    const regex = /#([a-zA-Z0-9_]+)/g;
    const matches = text.match(regex);
    if (!matches) return [];
    // Remove '#' prefix, convert to lowercase, and ensure uniqueness
    return [...new Set(matches.map(tag => tag.substring(1).toLowerCase()))];
}

/**
 * Publishes a text note (kind 1) to specified Nostr relays.
 * @param {string} postContent - The content of the note to publish.
 * @param {string} nostrSecretKeyNsec - The Nostr secret key in nsec format.
 * @returns {Promise<void>}
 */
async function publishToNostr(postContent, nostrSecretKeyNsec) {
    if (!postContent || !nostrSecretKeyNsec) {
        console.error("Missing post content or Nostr secret key for publishing.");
        return;
    }

    console.log(`Attempting to publish post to ${nostrRelays.length} Nostr relays...`);
    let sk;

    try {
        const decodedSecret = nip19.decode(nostrSecretKeyNsec);
        if (decodedSecret.type !== 'nsec') {
            // Use the actual variable name in the error message
            const keyName = nostrSecretKeyNsec === process.env.TESTING_ACCOUNT_NSEC ? 'TESTING_ACCOUNT_NSEC' : 'NOSTR_BOT_NSEC';
            throw new Error(`Invalid nsec format in ${keyName}`);
        }
        sk = decodedSecret.data; // Raw secret key bytes
    } catch (e) {
        console.error("Error decoding Nostr secret key:", e.message);
        return; // Stop if key is invalid
    }

    if (!sk) {
        console.error("Failed to obtain raw secret key.");
        return;
    }

    let signedEvent;
    try {
        // Extract hashtags from content and combine with defaults
        const extractedTags = extractHashtags(postContent);
        const defaultTags = ['llm', 'ai'];
        const allTags = [...new Set([...defaultTags, ...extractedTags])]; // Combine and ensure uniqueness
        const nostrTags = allTags.map(tag => ['t', tag]); // Format for Nostr event

        const eventTemplate = {
            kind: 1, // Text note
            created_at: Math.floor(Date.now() / 1000),
            tags: nostrTags, // Use dynamically generated tags
            content: postContent,
        };

        signedEvent = finalizeEvent(eventTemplate, sk);
    } catch (error) {
        console.error("Failed during Nostr event creation:", error);
        return; // Stop if event creation fails
    }

    // Publish to each relay individually
    console.log(`Publishing event ${signedEvent.id} to ${nostrRelays.length} relays...`);
    const publishPromises = nostrRelays.map(async (url) => {
        let relay;
        try {
            console.log(`Connecting to ${url}...`);
            relay = await Relay.connect(url);
            console.log(`Connected to ${url}. Publishing event ${signedEvent.id}...`);
            // The publish method on Relay returns a promise that resolves on OK/rejects on error/timeout
            await relay.publish(signedEvent);
            console.log(`Published successfully to ${url}`);
            return { status: 'fulfilled', url: url };
        } catch (error) {
            console.error(`Failed to publish to ${url}:`, error.message || error);
            // Return an object that matches the structure expected by Promise.allSettled
            return { status: 'rejected', url: url, reason: error.message || error };
        } finally {
            if (relay) {
                try {
                    await relay.close();
                    console.log(`Connection closed for ${url}`);
                } catch (closeError) {
                    // Log closing error but don't let it mask the publish error
                    console.error(`Error closing connection to ${url}:`, closeError);
                }
            }
        }
    });

    // Wait for all publish attempts to settle
    const results = await Promise.allSettled(publishPromises);
    console.log("\n--- Publishing Summary ---");
    results.forEach(result => {
            if (result.status === 'fulfilled') {
                console.log(`- Success: ${result.value.url}`);
            } else { // status === 'rejected'
                // Correctly access the properties of the rejected value
                console.log(`- Failed:  ${result.reason.url} (Reason: ${result.reason.reason})`);
            }
        });
    console.log("------------------------\n");
}

module.exports = { publishToNostr };
