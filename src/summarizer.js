const fs = require('fs');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const config = require('./config');
const store = require('./store');

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey });

const SYSTEM_PROMPT = `אתה עוזר שמסכם שיחות קבוצתיות בוואטסאפ בעברית.
סכם את השיחה הבאה בצורה תמציתית וברורה, עם כותרות ותבליטים:
- נושאים מרכזיים שעלו בשיחה
- החלטות שהתקבלו (אם היו)
- משימות / דברים לביצוע (action items) שעלו, ולמי הם משויכים אם ידוע
- לינקים או פרטים חשובים (תאריכים, מקומות, סכומים)
אל תמציא מידע שלא מופיע בשיחה בפועל. אם השיחה לא מכילה תוכן משמעותי לסיכום, ציין זאת בקצרה.`;

function formatMessages(messages) {
  return messages
    .map((m) => {
      const time = new Date(m.timestamp * 1000).toLocaleString('he-IL');
      return `[${time}] ${m.sender}: ${m.text}`;
    })
    .join('\n');
}

/** Anthropic context budget per summarization call, in characters (conservative). */
const CHUNK_CHAR_LIMIT = 60000;

function chunkMessages(messages) {
  const chunks = [];
  let current = [];
  let currentLen = 0;
  for (const m of messages) {
    const lineLen = m.text.length + m.sender.length + 40;
    if (currentLen + lineLen > CHUNK_CHAR_LIMIT && current.length > 0) {
      chunks.push(current);
      current = [];
      currentLen = 0;
    }
    current.push(m);
    currentLen += lineLen;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function askClaude(userContent) {
  const response = await anthropic.messages.create({
    model: config.anthropicModel,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  });
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

/**
 * Summarizes all messages accumulated for a group since its last summary,
 * writes the result to summaries/<group>-<date>.md, and marks those
 * messages as summarized. Returns null if there was nothing new to summarize.
 */
async function summarizeGroup(groupName) {
  const messages = store.readUnsummarizedMessages(groupName);
  if (messages.length === 0) return null;

  const chunks = chunkMessages(messages);
  let summaryText;

  if (chunks.length === 1) {
    summaryText = await askClaude(`קבוצה: ${groupName}\n\nהשיחה:\n${formatMessages(chunks[0])}`);
  } else {
    const partialSummaries = [];
    for (const [i, chunk] of chunks.entries()) {
      const partial = await askClaude(
        `קבוצה: ${groupName} (חלק ${i + 1} מתוך ${chunks.length})\n\nהשיחה:\n${formatMessages(chunk)}`
      );
      partialSummaries.push(partial);
    }
    summaryText = await askClaude(
      `להלן סיכומים חלקיים של אותה שיחת קבוצה בוואטסאפ ("${groupName}"), לפי סדר כרונולוגי. אחד אותם לסיכום אחד קוהרנטי, ללא כפילויות:\n\n${partialSummaries
        .map((s, i) => `--- חלק ${i + 1} ---\n${s}`)
        .join('\n\n')}`
    );
  }

  fs.mkdirSync(config.summariesFolder, { recursive: true });
  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${store.safeFileName(groupName)}-${dateStr}.md`;
  const filePath = path.join(config.summariesFolder, fileName);
  const header = `# סיכום קבוצה: ${groupName}\n\nנוצר ב-${new Date().toLocaleString('he-IL')} · ${messages.length} הודעות\n\n`;
  fs.writeFileSync(filePath, header + summaryText + '\n');

  store.markSummarized(groupName);

  return { groupName, summaryText, filePath, messageCount: messages.length };
}

/** Runs summarizeGroup for every configured group, skipping ones with nothing new. */
async function summarizeAllGroups(groupNames) {
  const results = [];
  for (const groupName of groupNames) {
    try {
      const result = await summarizeGroup(groupName);
      if (result) results.push(result);
    } catch (err) {
      console.error(`שגיאה בסיכום הקבוצה "${groupName}":`, err.message);
    }
  }
  return results;
}

module.exports = { summarizeGroup, summarizeAllGroups };
