const cron = require('node-cron');
const config = require('./config');
const { connectWhatsApp, extractMessageText } = require('./whatsapp');
const { createGroupRegistry } = require('./groups');
const store = require('./store');
const { summarizeAllGroups } = require('./summarizer');

if (!config.anthropicApiKey) {
  console.error('חסר ANTHROPIC_API_KEY. הגדר אותו בקובץ .env (ראה .env.example).');
  process.exit(1);
}

const registry = createGroupRegistry();

async function runSummaryCycle(sock) {
  const groupNames = registry.targetGroups.map((g) => g.name).filter(Boolean);
  console.log(`\nמריץ סיכום עבור ${groupNames.length} קבוצות...`);
  const results = await summarizeAllGroups(groupNames);

  if (results.length === 0) {
    console.log('אין הודעות חדשות לסכם.');
    return;
  }

  for (const result of results) {
    console.log(`✔ נוצר סיכום עבור "${result.groupName}" (${result.messageCount} הודעות) → ${result.filePath}`);
    if (config.sendSummaryToSelf && sock?.user?.id) {
      try {
        await sock.sendMessage(sock.user.id, {
          text: `*סיכום קבוצה: ${result.groupName}*\n\n${result.summaryText}`,
        });
      } catch (err) {
        console.error('שליחת הסיכום לעצמי נכשלה:', err.message);
      }
    }
  }
}

async function main() {
  let sock;
  let scheduled = false;

  sock = await connectWhatsApp(
    async (activeSock, msg) => {
      const jid = msg.key.remoteJid;
      if (!jid || !jid.endsWith('@g.us')) return;
      if (msg.key.fromMe) return;

      const groupName = registry.resolve(jid);
      if (!groupName) return;

      const text = extractMessageText(msg);
      if (!text) return;

      store.appendMessage(groupName, {
        timestamp: msg.messageTimestamp || Math.floor(Date.now() / 1000),
        sender: msg.pushName || msg.key.participant || 'לא ידוע',
        text,
      });
    },
    async (readySock) => {
      sock = readySock;
      await registry.refresh(readySock);
      console.log(`עוקב אחרי ${registry.targetGroups.length} קבוצות מוגדרות.`);
      console.log(`תזמון סיכום אוטומטי: ${config.summaryCron}`);

      if (!scheduled) {
        scheduled = true;
        cron.schedule(config.summaryCron, () => runSummaryCycle(sock));
      }
    }
  );
}

main().catch((err) => {
  console.error('שגיאה קריטית:', err);
  process.exit(1);
});
