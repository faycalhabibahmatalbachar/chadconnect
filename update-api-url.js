#!/usr/bin/env node

/**
 * Script pour mettre à jour l'URL de l'API dans l'application mobile
 * Utilisation: node update-api-url.js <nouvelle_url>
 * Exemple: node update-api-url.js https://chadconnect-api.onrender.com
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
    console.log('\n❌ Erreur: URL manquante\n');
    console.log('Usage: node update-api-url.js <url>\n');
    console.log('Exemples:');
    console.log('  node update-api-url.js https://chadconnect-api.onrender.com');
    console.log('  node update-api-url.js http://localhost:3001\n');
    process.exit(1);
}

const newUrl = args[0];

// Valider l'URL
if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
    console.log('\n❌ Erreur: URL invalide (doit commencer par http:// ou https://)\n');
    process.exit(1);
}

// Retirer le slash final si présent
const cleanUrl = newUrl.endsWith('/') ? newUrl.slice(0, -1) : newUrl;

console.log('\n🔄 Mise à jour de l\'URL de l\'API...\n');
console.log(`Nouvelle URL: ${cleanUrl}\n`);

// Fichier à modifier
const apiBaseFile = path.join(__dirname, 'lib', 'src', 'core', 'api', 'api_base.dart');

if (!fs.existsSync(apiBaseFile)) {
    console.log(`❌ Fichier non trouvé: ${apiBaseFile}\n`);
    process.exit(1);
}

// Lire le contenu actuel
let content = fs.readFileSync(apiBaseFile, 'utf8');

// Extraire l'URL actuelle
const currentUrlMatch = content.match(/return '(https?:\/\/[^']+)'/);
const currentUrl = currentUrlMatch ? currentUrlMatch[1] : 'inconnu';

console.log(`URL actuelle: ${currentUrl}`);
console.log(`Nouvelle URL: ${cleanUrl}\n`);

// Remplacer l'URL
const updatedContent = content.replace(
    /return '(https?:\/\/[^']+)'/,
    `return '${cleanUrl}'`
);

// Vérifier si le remplacement a fonctionné
if (updatedContent === content) {
    console.log('⚠️  Aucun changement effectué (l\'URL est peut-être déjà à jour)\n');
} else {
    // Écrire le nouveau contenu
    fs.writeFileSync(apiBaseFile, updatedContent, 'utf8');
    console.log('✅ URL mise à jour avec succès!\n');
    console.log('📱 Prochaines étapes:\n');
    console.log('1. Vérifiez le fichier: lib/src/core/api/api_base.dart');
    console.log('2. Rebuild l\'APK: flutter build apk --release');
    console.log('3. Testez la connexion à l\'API\n');
}
