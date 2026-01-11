#!/usr/bin/env node
/**
 * Test Supabase Storage
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://karymcppcwnjybtebqsm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthcnltY3BwY3duanlidGVicXNtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzk4MDk4MiwiZXhwIjoyMDgzNTU2OTgyfQ.8KNLF9lgt46hvfgHp_vQO5uR_rgGgDFANDAABVcLCJE';

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
    const req = https.request(url, options, (res) => {
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

async function testSupabase() {
  try {
    log('\n═══════════════════════════════════════', 'info');
    log('  TEST SUPABASE STORAGE', 'info');
    log('═══════════════════════════════════════', 'info');

    // Test 1: Connexion Supabase
    log('\n[1] Test connexion Supabase...', 'info');
    const connectionResult = await request(
      `${SUPABASE_URL}/rest/v1/`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (connectionResult.status === 200) {
      log('✓ Connexion Supabase OK', 'success');
    } else {
      log(`⚠ Connexion Supabase: ${connectionResult.status}`, 'warning');
    }

    // Test 2: Liste des buckets
    log('\n[2] Liste des buckets...', 'info');
    const bucketsResult = await request(
      `${SUPABASE_URL}/storage/v1/bucket`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (bucketsResult.status === 200 && Array.isArray(bucketsResult.data)) {
      log(`✓ ${bucketsResult.data.length} bucket(s) trouvé(s):`, 'success');
      bucketsResult.data.forEach(bucket => {
        log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`, 'info');
      });
    } else {
      log(`⚠ Erreur liste buckets: ${bucketsResult.status}`, 'warning');
    }

    // Test 3: Créer un fichier de test
    log('\n[3] Upload fichier test...', 'info');
    const testFileName = `test_${Date.now()}.txt`;
    const testContent = `Test upload from ChadConnect - ${new Date().toISOString()}`;

    const uploadResult = await request(
      `${SUPABASE_URL}/storage/v1/object/chadconnect/${testFileName}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'text/plain',
          'Content-Length': Buffer.byteLength(testContent)
        },
        body: testContent
      }
    );

    if (uploadResult.status === 200 || uploadResult.status === 201) {
      log(`✓ Fichier uploadé: ${testFileName}`, 'success');

      // Test 4: Liste des fichiers dans le bucket
      log('\n[4] Liste des fichiers dans le bucket...', 'info');
      const filesResult = await request(
        `${SUPABASE_URL}/storage/v1/object/list/chadconnect`,
        {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ limit: 10, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
        }
      );

      if (filesResult.status === 200 && Array.isArray(filesResult.data)) {
        log(`✓ ${filesResult.data.length} fichier(s) dans le bucket`, 'success');
        filesResult.data.slice(0, 5).forEach(file => {
          log(`  - ${file.name} (${Math.round(file.metadata?.size / 1024) || 0} KB)`, 'info');
        });
      }

      // Test 5: Télécharger le fichier
      log('\n[5] Téléchargement du fichier test...', 'info');
      const downloadResult = await request(
        `${SUPABASE_URL}/storage/v1/object/chadconnect/${testFileName}`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (downloadResult.status === 200) {
        log(`✓ Fichier téléchargé (${downloadResult.data.length} bytes)`, 'success');
      }

      // Test 6: Supprimer le fichier test
      log('\n[6] Suppression du fichier test...', 'info');
      const deleteResult = await request(
        `${SUPABASE_URL}/storage/v1/object/chadconnect/${testFileName}`,
        {
          method: 'DELETE',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (deleteResult.status === 200) {
        log('✓ Fichier test supprimé', 'success');
      }
    } else {
      log(`⚠ Erreur upload: ${uploadResult.status}`, 'warning');
      if (uploadResult.data) {
        log(`  ${JSON.stringify(uploadResult.data)}`, 'warning');
      }
    }

    log('\n🎉 TESTS SUPABASE TERMINÉS!', 'success');
    return true;

  } catch (error) {
    log(`\n💥 ERREUR: ${error.message}`, 'error');
    log(error.stack, 'error');
    return false;
  }
}

// Exécution
if (require.main === module) {
  testSupabase().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testSupabase };
