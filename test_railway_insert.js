#!/usr/bin/env node
/**
 * Test insertion dans Railway MySQL
 */

const mysql = require('mysql2/promise');

const RAILWAY_DB = {
  host: 'centerbeam.proxy.rlwy.net',
  port: 50434,
  user: 'root',
  password: 'atKzKjEakYCsiPVQjUYeppMRCFUQWTaf',
  database: 'railway'
};

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m'
  };
  console.log(`${colors[type]}${msg}\x1b[0m`);
}

async function testRailwayInsertions() {
  let connection;

  try {
    log('\n═══════════════════════════════════════', 'info');
    log('  TEST RAILWAY MYSQL - INSERTIONS', 'info');
    log('═══════════════════════════════════════', 'info');

    // Connexion
    log('\n[1] Connexion à Railway MySQL...', 'info');
    connection = await mysql.createConnection({
      host: RAILWAY_DB.host,
      port: RAILWAY_DB.port,
      user: RAILWAY_DB.user,
      password: RAILWAY_DB.password,
      database: RAILWAY_DB.database
    });
    log('✓ Connexion établie', 'success');

    // Vérifier les tables existantes
    log('\n[2] Vérification des tables...', 'info');
    const [tables] = await connection.execute('SHOW TABLES');
    log(`✓ ${tables.length} tables trouvées`, 'success');
    tables.forEach(table => {
      log(`  - ${Object.values(table)[0]}`, 'info');
    });

    // Test d'insertion dans users
    log('\n[3] Test insertion dans users...', 'info');
    const testEmail = `test_${Date.now()}@chadconnect.test`;
    const testUsername = `testuser_${Date.now()}`;

    const [insertResult] = await connection.execute(
      `INSERT INTO users (email, username, display_name, password_hash, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', NOW(), NOW())`,
      [testEmail, testUsername, 'Test User Railway', '$2a$10$abcdefghijklmnopqrstuv']
    );

    const userId = insertResult.insertId;
    log(`✓ User inséré avec ID: ${userId}`, 'success');

    // Vérifier l'insertion
    log('\n[4] Vérification de l\'insertion...', 'info');
    const [users] = await connection.execute(
      'SELECT id, email, username, display_name, status FROM users WHERE id = ?',
      [userId]
    );

    if (users.length > 0) {
      log('✓ User récupéré:', 'success');
      log(`  - ID: ${users[0].id}`, 'info');
      log(`  - Email: ${users[0].email}`, 'info');
      log(`  - Username: ${users[0].username}`, 'info');
      log(`  - Display Name: ${users[0].display_name}`, 'info');
      log(`  - Status: ${users[0].status}`, 'info');
    }

    // Test insertion dans posts
    log('\n[5] Test insertion dans posts...', 'info');
    const [postResult] = await connection.execute(
      `INSERT INTO posts (user_id, body, status, created_at)
       VALUES (?, ?, 'published', NOW())`,
      [userId, `Test post from Railway insertion test - ${new Date().toISOString()}`]
    );

    const postId = postResult.insertId;
    log(`✓ Post inséré avec ID: ${postId}`, 'success');

    // Vérifier le post
    log('\n[6] Vérification du post...', 'info');
    const [posts] = await connection.execute(
      'SELECT id, user_id, body, status, created_at FROM posts WHERE id = ?',
      [postId]
    );

    if (posts.length > 0) {
      log('✓ Post récupéré:', 'success');
      log(`  - ID: ${posts[0].id}`, 'info');
      log(`  - User ID: ${posts[0].user_id}`, 'info');
      log(`  - Body: ${posts[0].body}`, 'info');
      log(`  - Status: ${posts[0].status}`, 'info');
    }

    // Compter les users
    log('\n[7] Statistiques de la base...', 'info');
    const [userCount] = await connection.execute('SELECT COUNT(*) as count FROM users');
    log(`✓ Total users: ${userCount[0].count}`, 'success');

    const [postCount] = await connection.execute('SELECT COUNT(*) as count FROM posts');
    log(`✓ Total posts: ${postCount[0].count}`, 'success');

    // Cleanup (optionnel)
    log('\n[8] Nettoyage (suppression du test)...', 'info');
    await connection.execute('DELETE FROM posts WHERE id = ?', [postId]);
    await connection.execute('DELETE FROM users WHERE id = ?', [userId]);
    log('✓ Test data supprimée', 'success');

    log('\n🎉 TOUS LES TESTS RAILWAY RÉUSSIS!', 'success');
    return true;

  } catch (error) {
    log(`\n💥 ERREUR: ${error.message}`, 'error');
    log(error.stack, 'error');
    return false;
  } finally {
    if (connection) {
      await connection.end();
      log('\n✓ Connexion fermée', 'info');
    }
  }
}

// Exécution
if (require.main === module) {
  testRailwayInsertions().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testRailwayInsertions };
