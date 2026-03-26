// ============================================================
// ART-CORE — Migration Runner
// Exécute le SQL directement sur Supabase via pg (node-postgres)
// Usage : node scripts/run-migration.js [fichier.sql]
// ============================================================

const { Client } = require('pg');
const fs          = require('fs');
const path        = require('path');
const dotenv      = require('dotenv');

// ── Chargement .env.local ─────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('\n❌  .env.local introuvable.');
  console.error('   Copie .env.example → .env.local et remplis DATABASE_URL.\n');
  console.error('   Exemple :');
  console.error('   DATABASE_URL=postgresql://postgres.xxxx:MOT_DE_PASSE@aws-0-eu-central-1.pooler.supabase.com:6543/postgres\n');
  console.error('   Trouve cette URL dans : Supabase Dashboard → Settings → Database → Connection string → URI\n');
  process.exit(1);
}
dotenv.config({ path: envPath });

// ── Résolution du fichier SQL ──────────────────────────────────
const defaultSql = path.join(__dirname, '..', 'supabase', 'migrations', '20240101000000_initial_schema.sql');
const sqlFile    = process.argv[2]
  ? path.resolve(process.argv[2])
  : defaultSql;

if (!fs.existsSync(sqlFile)) {
  console.error(`\n❌  Fichier SQL introuvable : ${sqlFile}\n`);
  process.exit(1);
}

// ── Résolution DATABASE_URL ────────────────────────────────────
// Option 1 : DATABASE_URL directe
// Option 2 : SUPABASE_URL + SUPABASE_DB_PASSWORD (on construit la string)
function resolveConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const dbPassword  = process.env.SUPABASE_DB_PASSWORD;

  if (supabaseUrl && dbPassword) {
    // https://xxxx.supabase.co → project ref = xxxx
    const ref = supabaseUrl.replace('https://', '').split('.')[0];
    return `postgresql://postgres.${ref}:${dbPassword}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`;
  }

  console.error('\n❌  Aucune connexion DB trouvée dans .env.local.');
  console.error('   Ajoute l\'une de ces options :\n');
  console.error('   Option A (recommandée) :');
  console.error('   DATABASE_URL=postgresql://postgres.xxxx:PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres\n');
  console.error('   Option B :');
  console.error('   SUPABASE_DB_PASSWORD=ton-mot-de-passe-db\n');
  console.error('   → Supabase Dashboard → Settings → Database → Connection string\n');
  process.exit(1);
}

// ── Parser SQL : découpe en statements individuels ─────────────
// Gère les blocs dollar-quotés ($$ ... $$), les strings, et les commentaires
function splitStatements(sql) {
  const statements = [];
  let current      = '';
  let i            = 0;
  let dollarTag    = null;   // ex: '$$' ou '$function$'
  let inSingleQ    = false;
  let lineNumber   = 1;
  let stmtStartLine = 1;

  while (i < sql.length) {
    const ch   = sql[i];
    const rest = sql.slice(i);

    // Suivi des numéros de ligne
    if (ch === '\n') lineNumber++;

    // ── Dans un bloc dollar-quoté ─────────────────────────────
    if (dollarTag !== null) {
      current += ch;
      if (rest.startsWith(dollarTag)) {
        // Fin du bloc dollar-quoté
        current += dollarTag.slice(1); // ajouter le reste du tag (sans le premier $)
        i += dollarTag.length;
        // Recompter les newlines dans le tag
        for (const c of dollarTag.slice(1)) if (c === '\n') lineNumber++;
        dollarTag = null;
        continue;
      }
      i++;
      continue;
    }

    // ── Dans une string single-quote ─────────────────────────
    if (inSingleQ) {
      current += ch;
      if (ch === "'" && sql[i + 1] === "'") {
        // Escaped quote ''
        current += sql[i + 1];
        i += 2;
        continue;
      }
      if (ch === "'") inSingleQ = false;
      i++;
      continue;
    }

    // ── Commentaire ligne -- ──────────────────────────────────
    if (rest.startsWith('--')) {
      const end = sql.indexOf('\n', i);
      if (end === -1) { i = sql.length; break; }
      current += sql.slice(i, end + 1);
      lineNumber++;
      i = end + 1;
      continue;
    }

    // ── Commentaire bloc /* */ ────────────────────────────────
    if (rest.startsWith('/*')) {
      const end = sql.indexOf('*/', i + 2);
      if (end === -1) { i = sql.length; break; }
      const block = sql.slice(i, end + 2);
      for (const c of block) if (c === '\n') lineNumber++;
      current += block;
      i = end + 2;
      continue;
    }

    // ── Début d'un bloc dollar-quoté ─────────────────────────
    if (ch === '$') {
      // Chercher le tag complet : $tag$ ou $$
      const tagMatch = rest.match(/^(\$[A-Za-z0-9_]*\$)/);
      if (tagMatch) {
        dollarTag = tagMatch[1];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }

    // ── Début string single-quote ─────────────────────────────
    if (ch === "'") {
      inSingleQ = true;
      current += ch;
      i++;
      continue;
    }

    // ── Fin de statement ──────────────────────────────────────
    if (ch === ';') {
      current += ch;
      const trimmed = current.trim();
      if (trimmed.length > 1) {
        statements.push({ sql: trimmed, line: stmtStartLine });
      }
      current = '';
      i++;
      // La prochaine instruction commence à la ligne suivante
      stmtStartLine = lineNumber + (sql[i] === '\n' ? 1 : 0);
      continue;
    }

    current += ch;
    i++;
  }

  // Résidu sans ; final
  const trimmed = current.trim();
  if (trimmed.length > 1) {
    statements.push({ sql: trimmed, line: stmtStartLine });
  }

  return statements;
}

// ── Runner principal ───────────────────────────────────────────
async function run() {
  const connectionString = resolveConnectionString();
  const sqlContent       = fs.readFileSync(sqlFile, 'utf8');
  const statements       = splitStatements(sqlContent);

  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║          ART-CORE — Migration Runner                 ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');
  console.log(`📄 Fichier   : ${path.basename(sqlFile)}`);
  console.log(`📊 Statements: ${statements.length} détectés`);
  console.log(`🔌 Connexion : ${connectionString.replace(/:([^:@]+)@/, ':****@')}\n`);
  console.log('─'.repeat(56));

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },  // Supabase cloud requiert SSL
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    console.log('✅ Connecté à PostgreSQL\n');
  } catch (err) {
    console.error(`\n❌ Connexion échouée : ${err.message}`);
    console.error('\n💡 Vérifie DATABASE_URL dans .env.local');
    console.error('   Supabase Dashboard → Settings → Database → Connection string\n');
    process.exit(1);
  }

  let ok = 0, errors = 0;
  const errorLog = [];

  for (let idx = 0; idx < statements.length; idx++) {
    const { sql: stmt, line } = statements[idx];

    // Label court pour l'affichage
    const label = stmt
      .replace(/\s+/g, ' ')
      .slice(0, 72)
      .replace(/DO \$\$.*/, 'DO $$ ... END $$');

    try {
      await client.query(stmt);
      ok++;
      process.stdout.write(`  ✅ [${String(idx + 1).padStart(3)}] ${label}\n`);
    } catch (err) {
      errors++;
      const msg = err.message.split('\n')[0];
      process.stdout.write(`  ❌ [${String(idx + 1).padStart(3)}] Ligne ${line} — ${msg}\n`);
      process.stdout.write(`       └─ ${label.slice(0, 60)}\n`);
      errorLog.push({ idx: idx + 1, line, msg, stmt: label });
      // Continue — n'interrompt pas
    }
  }

  await client.end();

  // ── Rapport final ──────────────────────────────────────────
  console.log('\n' + '─'.repeat(56));
  console.log(`\n📊 Résultat : ${ok} OK  |  ${errors} erreur(s)\n`);

  if (errorLog.length > 0) {
    console.log('⚠️  Erreurs détectées :');
    errorLog.forEach(e => {
      console.log(`   [${e.idx}] Ligne ${e.line} → ${e.msg}`);
    });
    console.log('');
  }

  if (errors === 0) {
    console.log('🎉 Migration exécutée avec succès !\n');
  } else if (ok > 0) {
    console.log('⚠️  Migration partielle. Certains objets existent peut-être déjà.\n');
  } else {
    console.log('❌ Migration échouée. Vérifie les erreurs ci-dessus.\n');
    process.exit(1);
  }
}

run().catch(err => {
  console.error('\n❌ Erreur inattendue :', err.message);
  process.exit(1);
});
