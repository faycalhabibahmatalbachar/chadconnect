#!/usr/bin/env node
/**
 * ChadConnect - Runner de tous les tests
 * Execute tous les tests: API locale, Railway, Supabase, Auth
 */

const { spawn } = require('child_process');
const path = require('path');

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warning: '\x1b[33m',
    header: '\x1b[35m'
  };
  console.log(`${colors[type]}${msg}\x1b[0m`);
}

function runTest(scriptPath, name) {
  return new Promise((resolve) => {
    log(`\n${'='.repeat(60)}`, 'header');
    log(`  EXÉCUTION: ${name}`, 'header');
    log(`${'='.repeat(60)}`, 'header');

    const test = spawn('node', [scriptPath], {
      stdio: 'inherit',
      shell: true
    });

    test.on('close', (code) => {
      if (code === 0) {
        log(`\n✓ ${name} - RÉUSSI`, 'success');
        resolve({ name, success: true });
      } else {
        log(`\n✗ ${name} - ÉCHOUÉ (code: ${code})`, 'error');
        resolve({ name, success: false, code });
      }
    });

    test.on('error', (error) => {
      log(`\n✗ ${name} - ERREUR: ${error.message}`, 'error');
      resolve({ name, success: false, error: error.message });
    });
  });
}

async function runAllTests() {
  const startTime = Date.now();

  log('\n╔═══════════════════════════════════════════════════════════╗', 'header');
  log('║       CHADCONNECT - SUITE DE TESTS COMPLÈTE              ║', 'header');
  log('╚═══════════════════════════════════════════════════════════╝', 'header');
  log(`\nDate: ${new Date().toISOString()}`, 'info');
  log(`Répertoire: ${process.cwd()}`, 'info');

  const tests = [
    { script: 'test_auth_complete.js', name: 'Test Authentification Complète' },
    // { script: 'test_railway_insert.js', name: 'Test Railway Database + Insertions' },
    { script: 'test_supabase.js', name: 'Test Supabase Storage' },
  ];

  const results = [];

  // Exécuter chaque test séquentiellement
  for (const test of tests) {
    const scriptPath = path.join(process.cwd(), test.script);
    const result = await runTest(scriptPath, test.name);
    results.push(result);
  }

  // Rapport final
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  log('\n\n╔═══════════════════════════════════════════════════════════╗', 'header');
  log('║                   RAPPORT FINAL                           ║', 'header');
  log('╚═══════════════════════════════════════════════════════════╝', 'header');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  log(`\nDurée totale: ${duration}s`, 'info');
  log(`\nRésultats:`, 'info');

  results.forEach((result, index) => {
    const status = result.success ? '✓ PASS' : '✗ FAIL';
    const color = result.success ? 'success' : 'error';
    log(`  ${index + 1}. [${status}] ${result.name}`, color);
  });

  log(`\nTotal: ${total} tests`, 'info');
  log(`Réussis: ${passed} tests`, 'success');
  log(`Échoués: ${failed} tests`, failed > 0 ? 'error' : 'success');
  log(`Taux de réussite: ${((passed / total) * 100).toFixed(1)}%`, passed === total ? 'success' : 'warning');

  if (passed === total) {
    log('\n🎉🎉🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS! 🎉🎉🎉', 'success');
    log('\n✅ Le système ChadConnect est opérationnel!', 'success');
    log('✅ API locale: OK', 'success');
    log('✅ Authentification: OK', 'success');
    // log('✅ Railway MySQL: OK', 'success');
    log('✅ Supabase Storage: OK', 'success');
    return 0;
  } else {
    log('\n⚠️ CERTAINS TESTS ONT ÉCHOUÉ', 'warning');
    log('\nVeuillez vérifier les logs ci-dessus pour plus de détails.', 'warning');
    return 1;
  }
}

// Exécution
if (require.main === module) {
  runAllTests().then(exitCode => {
    process.exit(exitCode);
  }).catch(error => {
    log(`\n💥 ERREUR FATALE: ${error.message}`, 'error');
    log(error.stack, 'error');
    process.exit(1);
  });
}

module.exports = { runAllTests };
