const { connectWhatsApp } = require('./whatsapp');

/** One-off utility: connects, prints every group the account is in (name + JID), then exits. */
async function main() {
  await connectWhatsApp(null, async (sock) => {
    const metadata = await sock.groupFetchAllParticipating();
    const groups = Object.values(metadata);

    if (groups.length === 0) {
      console.log('לא נמצאו קבוצות.');
    } else {
      console.log(`\nנמצאו ${groups.length} קבוצות:\n`);
      for (const g of groups) {
        console.log(`- ${g.subject}\n  jid: ${g.id}\n`);
      }
    }

    console.log('העתק את השם או ה-jid המדויק לתוך config/groups.json.');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('שגיאה:', err);
  process.exit(1);
});
