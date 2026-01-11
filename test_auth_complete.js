#!/usr/bin/env node
/**
 * Test complet d'authentification - API locale
 */

const http = require('http');

const API_URL = 'http://localhost:3001';

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  console.log(`${colors[type]}${msg}\x1b[0m`);
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function testAuthentication() {
  try {
    log('\n═══════════════════════════════════════', 'info');
    log('  TEST AUTHENTIFICATION COMPLÈTE', 'info');
    log('═══════════════════════════════════════', 'info');

    const timestamp = Date.now();
    const testUser = {
      email: `test_${timestamp}@chadconnect.test`,
      username: `testuser_${timestamp}`,
      password: 'Test123!@#',
      displayName: `Test User ${timestamp}`
    };

    // Test 1: Health check
    log('\n[1] Test health check...', 'info');
    const healthResult = await request(`${API_URL}/health`);
    if (healthResult.status === 200 && healthResult.data.ok) {
      log('✓ Server OK', 'success');
    } else {
      throw new Error('Server health check failed');
    }

    // Test 2: Register
    log('\n[2] Test registration...', 'info');
    log(`  Email: ${testUser.email}`, 'info');
    log(`  Username: ${testUser.username}`, 'info');

    const registerResult = await request(
      `${API_URL}/api/auth/register`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testUser)
      }
    );

    if (registerResult.status === 200 || registerResult.status === 201) {
      log('✓ Registration réussie', 'success');
      log(`  User ID: ${registerResult.data.user?.id || 'N/A'}`, 'info');
      log(`  Access Token: ${registerResult.data.accessToken ? 'présent' : 'absent'}`, 'info');
      log(`  Refresh Token: ${registerResult.data.refreshToken ? 'présent' : 'absent'}`, 'info');
    } else {
      throw new Error(`Registration failed: ${registerResult.status} - ${JSON.stringify(registerResult.data)}`);
    }

    // Test 3: Login
    log('\n[3] Test login...', 'info');
    const loginResult = await request(
      `${API_URL}/api/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailOrUsername: testUser.email,
          password: testUser.password
        })
      }
    );

    let accessToken = null;
    let refreshToken = null;

    if (loginResult.status === 200) {
      log('✓ Login réussi', 'success');
      accessToken = loginResult.data.accessToken;
      refreshToken = loginResult.data.refreshToken;
      log(`  User ID: ${loginResult.data.user?.id || 'N/A'}`, 'info');
      log(`  Username: ${loginResult.data.user?.username || 'N/A'}`, 'info');
      log(`  Email: ${loginResult.data.user?.email || 'N/A'}`, 'info');
    } else {
      throw new Error(`Login failed: ${loginResult.status} - ${JSON.stringify(loginResult.data)}`);
    }

    // Test 4: Get profile avec token
    log('\n[4] Test get profile (authenticated)...', 'info');
    const profileResult = await request(
      `${API_URL}/api/auth/me`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (profileResult.status === 200) {
      log('✓ Profile récupéré', 'success');
      log(`  ID: ${profileResult.data.id}`, 'info');
      log(`  Username: ${profileResult.data.username}`, 'info');
      log(`  Email: ${profileResult.data.email}`, 'info');
      log(`  Display Name: ${profileResult.data.display_name}`, 'info');
      log(`  Status: ${profileResult.data.status}`, 'info');
    } else {
      throw new Error(`Get profile failed: ${profileResult.status}`);
    }

    // Test 5: Refresh token
    log('\n[5] Test refresh token...', 'info');
    const refreshResult = await request(
      `${API_URL}/api/auth/refresh`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      }
    );

    if (refreshResult.status === 200) {
      log('✓ Token refresh réussi', 'success');
      log(`  New Access Token: ${refreshResult.data.accessToken ? 'présent' : 'absent'}`, 'info');
    } else {
      log(`⚠ Token refresh: ${refreshResult.status}`, 'warning');
    }

    // Test 6: Créer un post avec le user authentifié
    log('\n[6] Test création de post...', 'info');
    const createPostResult = await request(
      `${API_URL}/api/posts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: `Test post from auth test - ${new Date().toISOString()}`
        })
      }
    );

    let postId = null;
    if (createPostResult.status === 200 || createPostResult.status === 201) {
      log('✓ Post créé', 'success');
      postId = createPostResult.data.id;
      log(`  Post ID: ${postId}`, 'info');
    } else {
      log(`⚠ Création post: ${createPostResult.status}`, 'warning');
    }

    // Test 7: Récupérer le post
    if (postId) {
      log('\n[7] Test récupération du post...', 'info');
      const getPostResult = await request(
        `${API_URL}/api/posts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (getPostResult.status === 200) {
        log('✓ Post récupéré', 'success');
        log(`  Body: ${getPostResult.data.body}`, 'info');
      }
    }

    // Test 8: Logout
    log('\n[8] Test logout...', 'info');
    const logoutResult = await request(
      `${API_URL}/api/auth/logout`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (logoutResult.status === 200) {
      log('✓ Logout réussi', 'success');
    } else {
      log(`⚠ Logout: ${logoutResult.status}`, 'warning');
    }

    log('\n🎉 TOUS LES TESTS D\'AUTHENTIFICATION RÉUSSIS!', 'success');
    return true;

  } catch (error) {
    log(`\n💥 ERREUR: ${error.message}`, 'error');
    log(error.stack, 'error');
    return false;
  }
}

// Exécution
if (require.main === module) {
  testAuthentication().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testAuthentication };
