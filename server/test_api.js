#!/usr/bin/env node

/**
 * Script de test complet pour ChadConnect
 * Teste toutes les fonctionnalités de l'API
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

let testsPassed = 0;
let testsFailed = 0;
let authToken = null;
let userId = null;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  testsPassed++;
  log(`✓ ${message}`, colors.green);
}

function logError(message, error) {
  testsFailed++;
  log(`✗ ${message}`, colors.red);
  if (error) {
    log(`  Error: ${error.message}`, colors.red);
    if (error.response) {
      log(`  Status: ${error.response.status}`, colors.red);
      log(`  Data: ${JSON.stringify(error.response.data)}`, colors.red);
    }
  }
}

function logInfo(message) {
  log(`ℹ ${message}`, colors.cyan);
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, colors.blue);
  log(message, colors.blue);
  log('='.repeat(60), colors.blue);
}

async function testHealthCheck() {
  logSection('1. TEST HEALTH CHECK');
  try {
    const response = await axios.get(`${API_URL}/health`);
    if (response.data.ok === true) {
      logSuccess('Health check passed');
    } else {
      logError('Health check failed - unexpected response');
    }
  } catch (error) {
    logError('Health check failed', error);
  }
}

async function testUserRegistration() {
  logSection('2. TEST USER REGISTRATION');
  const timestamp = Date.now();
  const testUser = {
    phone: `+235${timestamp.toString().slice(-8)}`,
    display_name: `Test User ${timestamp}`,
    password: 'Test@123456',
  };

  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, testUser);
    if (response.data.user && response.data.access_token) {
      authToken = response.data.access_token;
      userId = response.data.user.id;
      logSuccess(`User registered: ${testUser.phone}`);
      logInfo(`User ID: ${userId}`);
    } else {
      logError('Registration failed - missing data');
    }
  } catch (error) {
    logError('User registration failed', error);
  }
}

async function testUserLogin() {
  logSection('3. TEST USER LOGIN');

  // Get the phone number from the previous test
  // For this test, we'll create a new user
  const timestamp = Date.now();
  const testUser = {
    phone: `+235${timestamp.toString().slice(-8)}`,
    display_name: `Login Test ${timestamp}`,
    password: 'Login@123',
  };

  try {
    // First register
    await axios.post(`${API_URL}/api/auth/register`, testUser);

    // Then login
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      phone: testUser.phone,
      password: testUser.password,
    });

    if (response.data.access_token) {
      logSuccess('User login successful');
    } else {
      logError('Login failed - no token returned');
    }
  } catch (error) {
    logError('User login failed', error);
  }
}

async function testGetProfile() {
  logSection('4. TEST GET PROFILE');
  if (!authToken) {
    logError('Cannot test profile - no auth token');
    return;
  }

  try {
    const response = await axios.get(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (response.data.user) {
      logSuccess('Profile retrieved successfully');
      logInfo(`Display Name: ${response.data.user.display_name}`);
    } else {
      logError('Profile retrieval failed - no user data');
    }
  } catch (error) {
    logError('Get profile failed', error);
  }
}

async function testInstitutions() {
  logSection('5. TEST INSTITUTIONS');
  if (!authToken) {
    logError('Cannot test institutions - no auth token');
    return;
  }

  try {
    // List institutions
    const listResponse = await axios.get(`${API_URL}/api/institutions`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (Array.isArray(listResponse.data)) {
      logSuccess(`Listed ${listResponse.data.length} institutions`);
    } else {
      logError('List institutions failed');
    }

    // Create institution
    const newInstitution = {
      name: `Test Institution ${Date.now()}`,
      city: 'N\'Djamena',
      country: 'Chad',
    };

    const createResponse = await axios.post(
      `${API_URL}/api/institutions`,
      newInstitution,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (createResponse.data.institution) {
      logSuccess('Institution created successfully');
    } else {
      logError('Create institution failed');
    }
  } catch (error) {
    logError('Institutions test failed', error);
  }
}

async function testSocialPosts() {
  logSection('6. TEST SOCIAL POSTS');
  if (!authToken) {
    logError('Cannot test posts - no auth token');
    return;
  }

  try {
    // Create a text post
    const newPost = {
      body: `Test post created at ${new Date().toISOString()}`,
    };

    const createResponse = await axios.post(
      `${API_URL}/api/posts`,
      newPost,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (createResponse.data.id) {
      const postId = createResponse.data.id;
      logSuccess('Post created successfully');
      logInfo(`Post ID: ${postId}`);

      // Get feed
      const feedResponse = await axios.get(`${API_URL}/api/posts`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      if (Array.isArray(feedResponse.data.items)) {
        logSuccess(`Feed retrieved: ${feedResponse.data.items.length} posts`);
      } else {
        logError('Get feed failed');
      }

      // Like the post
      const likeResponse = await axios.post(
        `${API_URL}/api/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${authToken}` } }
      );

      if (likeResponse.data.ok) {
        logSuccess('Post liked successfully');
      } else {
        logError('Like post failed');
      }
    } else {
      logError('Create post failed');
    }
  } catch (error) {
    logError('Social posts test failed', error);
  }
}

async function testPlanning() {
  logSection('7. TEST PLANNING (Weekly Goals)');
  if (!authToken) {
    logError('Cannot test planning - no auth token');
    return;
  }

  try {
    // Get current week's goals
    const getResponse = await axios.get(`${API_URL}/api/planning/goals`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (Array.isArray(getResponse.data)) {
      logSuccess(`Retrieved ${getResponse.data.length} goals`);
    } else {
      logError('Get goals failed');
    }

    // Create a new goal
    const newGoal = {
      title: `Test Goal ${Date.now()}`,
    };

    const createResponse = await axios.post(
      `${API_URL}/api/planning/goals`,
      newGoal,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (createResponse.data.goal) {
      logSuccess('Goal created successfully');
    } else {
      logError('Create goal failed');
    }
  } catch (error) {
    logError('Planning test failed', error);
  }
}

async function testStudyContent() {
  logSection('8. TEST STUDY CONTENT');
  if (!authToken) {
    logError('Cannot test study content - no auth token');
    return;
  }

  try {
    // Get subjects
    const subjectsResponse = await axios.get(`${API_URL}/api/subjects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (Array.isArray(subjectsResponse.data)) {
      logSuccess(`Retrieved ${subjectsResponse.data.length} subjects`);

      // If there are subjects, get chapters for the first one
      if (subjectsResponse.data.length > 0) {
        const subjectId = subjectsResponse.data[0].id;
        const chaptersResponse = await axios.get(
          `${API_URL}/api/subjects/${subjectId}/chapters`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (Array.isArray(chaptersResponse.data)) {
          logSuccess(`Retrieved ${chaptersResponse.data.length} chapters for subject ${subjectId}`);
        } else {
          logError('Get chapters failed');
        }
      }
    } else {
      logError('Get subjects failed');
    }
  } catch (error) {
    logError('Study content test failed', error);
  }
}

async function testPushNotifications() {
  logSection('9. TEST PUSH NOTIFICATIONS');
  if (!authToken) {
    logError('Cannot test push notifications - no auth token');
    return;
  }

  try {
    // Register FCM token
    const fakeToken = `test_fcm_token_${Date.now()}`;
    const registerResponse = await axios.post(
      `${API_URL}/api/push/register`,
      { token: fakeToken, platform: 'android' },
      { headers: { Authorization: `Bearer ${authToken}` } }
    );

    if (registerResponse.data.ok) {
      logSuccess('FCM token registered successfully');
    } else {
      logError('FCM token registration failed');
    }
  } catch (error) {
    logError('Push notifications test failed', error);
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), colors.yellow);
  log('CHADCONNECT API TEST SUITE', colors.yellow);
  log('='.repeat(60) + '\n', colors.yellow);

  logInfo(`Testing API at: ${API_URL}`);
  logInfo(`Starting tests at: ${new Date().toISOString()}\n`);

  await testHealthCheck();
  await testUserRegistration();
  await testUserLogin();
  await testGetProfile();
  await testInstitutions();
  await testSocialPosts();
  await testPlanning();
  await testStudyContent();
  await testPushNotifications();

  // Summary
  log('\n' + '='.repeat(60), colors.yellow);
  log('TEST SUMMARY', colors.yellow);
  log('='.repeat(60), colors.yellow);

  const total = testsPassed + testsFailed;
  log(`Total Tests: ${total}`, colors.cyan);
  log(`Passed: ${testsPassed}`, colors.green);
  log(`Failed: ${testsFailed}`, colors.red);

  const percentage = total > 0 ? ((testsPassed / total) * 100).toFixed(2) : 0;
  log(`Success Rate: ${percentage}%`, colors.cyan);

  log('='.repeat(60) + '\n', colors.yellow);

  // Exit code
  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch((error) => {
  logError('Unexpected error during test execution', error);
  process.exit(1);
});
