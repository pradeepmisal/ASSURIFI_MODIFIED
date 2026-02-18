import https from 'https';
import http from 'http';

/**
 * Keep-Alive Service
 * Pings the server's own health endpoint every 14 minutes to prevent Render Free Tier from sleeping.
 */
const startKeepAlive = () => {
    // Render provides RENDER_EXTERNAL_URL automatically. 
    // If not on Render, use localhost or a configured SERVER_URL.
    const SERVER_URL = process.env.SERVER_URL ||
        process.env.RENDER_EXTERNAL_URL ||
        `http://localhost:${process.env.PORT || 3002}`;

    // Only run if we have a valid URL
    if (!SERVER_URL) {
        console.log('⚠️ Keep-Alive: No SERVER_URL found. Skipping.');
        return;
    }

    const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds

    console.log(`\n🔄 Keep-Alive Service initiated.`);
    console.log(`   Target: ${SERVER_URL}/health`);
    console.log(`   Interval: 14 minutes`);

    const ping = () => {
        const protocol = SERVER_URL.startsWith('https') ? https : http;

        protocol.get(`${SERVER_URL}/health`, (res) => {
            console.log(`\n💓 Keep-Alive Ping: Status ${res.statusCode} at ${new Date().toISOString()}`);
        }).on('error', (err) => {
            console.error(`\n⚠️ Keep-Alive Ping Error: ${err.message}`);
        });
    };

    // Initial ping (wait 5 seconds for server to start)
    setTimeout(ping, 5000);

    // Schedule periodic pings
    setInterval(ping, PING_INTERVAL);
};

export default startKeepAlive;
