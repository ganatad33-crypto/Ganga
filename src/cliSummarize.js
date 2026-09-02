const config = require('./config');
const { createGroupRegistry } = require('./groups');
const { summarizeAllGroups } = require('./summarizer');

/**
 * Runs a summary pass once, without opening a WhatsApp connection, using
 * whatever messages src/index.js has already collected on disk. Useful for
 * an on-demand summary or for triggering from your own cron/systemd timer.
 */
async function main() {
  if (!config.anthropicApiKey) {
    console.error('חסר ANTHROPIC_API_KEY. הגדר אותו בקובץ .env (ראה .env.example).');
    process.exit(1);
  }

  const registry = createGroupRegistry();
  const groupNames = registry.targetGroups.map((g) => g.name).filter(Boolean);

  const results = await summarizeAllGroups(groupNames);

  if (results.length === 0) {
    console.log('אין הודעות חדשות לסכם באף קבוצה.');
    return;
  }

  for (const result of results) {
    console.log(`\n=== ${result.groupName} (${result.messageCount} הודעות) ===`);
    console.log(result.summaryText);
    console.log(`\nנשמר ב: ${result.filePath}`);
  }
}

main().catch((err) => {
  console.error('שגיאה:', err);
  process.exit(1);
});
