#!/usr/bin/env node

/**
 * Script de test pour l'interface Admin Web
 * Vérifie la connexion et les fonctionnalités principales
 */

const axios = require('axios');

const ADMIN_URL = process.env.ADMIN_URL || 'http://localhost:3000';

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function testAdminWeb() {
    log('\n' + '='.repeat(60), colors.yellow);
    log('CHADCONNECT ADMIN WEB TEST', colors.yellow);
    log('='.repeat(60) + '\n', colors.yellow);

    log(`Testing Admin Web at: ${ADMIN_URL}`, colors.cyan);

    try {
        // Test homepage
        const homeResponse = await axios.get(ADMIN_URL);
        if (homeResponse.status === 200) {
            log('✓ Homepage accessible', colors.green);
        } else {
            log(`✗ Homepage returned status ${homeResponse.status}`, colors.red);
        }

        // Test login page
        const loginResponse = await axios.get(`${ADMIN_URL}/login`);
        if (loginResponse.status === 200) {
            log('✓ Login page accessible', colors.green);
        } else {
            log(`✗ Login page returned status ${loginResponse.status}`, colors.red);
        }

        // Test setup page
        const setupResponse = await axios.get(`${ADMIN_URL}/setup`);
        if (setupResponse.status === 200) {
            log('✓ Setup page accessible', colors.green);
        } else {
            log(`✗ Setup page returned status ${setupResponse.status}`, colors.red);
        }

        log('\n✓ All admin web tests passed!', colors.green);
    } catch (error) {
        log(`\n✗ Admin web test failed: ${error.message}`, colors.red);
        if (error.code === 'ECONNREFUSED') {
            log('  Make sure the admin web server is running:', colors.yellow);
            log('  cd admin_web && npm run dev', colors.yellow);
        }
        process.exit(1);
    }
}

testAdminWeb();
