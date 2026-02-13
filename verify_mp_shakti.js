
import { madhyaPradeshShaktiTemples } from './src/data/temples/madhyaPradesh-shakti.js';
import https from 'https';

console.log(`Total MP Shakti Temples: ${madhyaPradeshShaktiTemples.length}`);

const brokenUrls = [];
const missingFields = [];

async function checkUrl(url) {
    return new Promise((resolve) => {
        if (!url || url.startsWith('data:')) {
            resolve(true);
            return;
        }

        // Handle Wikimedia special paths for checking
        let checkUrl = url;
        if (url.includes('Special:FilePath')) {
            // logic to just check if it returns 200 or 301/302
        }

        https.get(checkUrl, (res) => {
            if (res.statusCode >= 200 && res.statusCode < 400) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).on('error', () => {
            resolve(false);
        });
    });
}

async function verify() {
    for (const temple of madhyaPradeshShaktiTemples) {
        if (!temple.description && !temple.story) missingFields.push(`${temple.name}: No story/description`);
        if (!temple.image) missingFields.push(`${temple.name}: No image`);

        if (temple.image && !temple.image.startsWith('http')) {
            // Skip local or relative images if any, but we expect http
        } else if (temple.image) {
            const isValid = await checkUrl(temple.image);
            if (!isValid) brokenUrls.push(`${temple.name}: ${temple.image}`);
        }
    }

    console.log('--- Verification Report ---');
    if (missingFields.length > 0) {
        console.log('Missing Fields:');
        missingFields.forEach(f => console.log(f));
    } else {
        console.log('All fields present.');
    }

    if (brokenUrls.length > 0) {
        console.log('Broken URLs:');
        brokenUrls.forEach(u => console.log(u));
    } else {
        console.log('All URLs reachable.');
    }
}

verify();
