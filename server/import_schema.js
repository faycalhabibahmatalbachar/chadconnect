/**
 * Script pour importer le schéma dans la base de données Railway
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const config = {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true,
};

async function importSchema() {
    console.log('🔄 Connecting to Railway MySQL...');

    let conn;
    try {
        conn = await mysql.createConnection(config);
        console.log('✅ Connected to Railway MySQL!');

        // Lire le schéma
        const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
        let schema = fs.readFileSync(schemaPath, 'utf8');

        // Supprimer les commandes CREATE DATABASE et USE (on utilise railway directement)
        schema = schema.replace(/CREATE DATABASE.*?;/gi, '');
        schema = schema.replace(/USE\s+chadconnect\s*;/gi, '');

        console.log('📄 Schema file loaded');
        console.log('🔄 Importing schema...');

        // Exécuter le schéma
        await conn.query(schema);

        console.log('✅ Schema imported successfully!');

        // Vérifier les tables créées
        const [tables] = await conn.query('SHOW TABLES');
        console.log(`\n📊 Tables created (${tables.length}):`);
        tables.forEach(t => {
            const tableName = Object.values(t)[0];
            console.log(`   - ${tableName}`);
        });

        // Créer l'utilisateur admin
        console.log('\n🔄 Creating admin user...');

        // Vérifier si admin existe
        const [existingAdmin] = await conn.query(
            "SELECT id FROM users WHERE username = 'admin' LIMIT 1"
        );

        if (existingAdmin.length === 0) {
            await conn.query(`
        INSERT INTO users (phone, email, username, display_name, role, status)
        VALUES (NULL, NULL, 'admin', 'Administrator', 'admin', 'active')
      `);
            console.log('✅ Admin user created (username: admin, password to set via /setup)');
        } else {
            console.log('ℹ️  Admin user already exists');
        }

        console.log('\n🎉 Database setup complete!');

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
}

importSchema();
