const fs = require('fs');
const path = require('path');
const config = require('./config');

function safeFileName(groupName) {
  return groupName.replace(/[^\p{L}\p{N}_-]+/gu, '_').slice(0, 80) || 'group';
}

function paths(groupName) {
  const base = safeFileName(groupName);
  fs.mkdirSync(config.dataFolder, { recursive: true });
  return {
    log: path.join(config.dataFolder, `${base}.jsonl`),
    state: path.join(config.dataFolder, `${base}.state.json`),
  };
}

/** Appends one message record ({ timestamp, sender, text }) to the group's log. */
function appendMessage(groupName, record) {
  const { log } = paths(groupName);
  fs.appendFileSync(log, JSON.stringify(record) + '\n');
}

function readState(groupName) {
  const { state } = paths(groupName);
  if (!fs.existsSync(state)) return { summarizedLines: 0 };
  return JSON.parse(fs.readFileSync(state, 'utf8'));
}

function writeState(groupName, newState) {
  const { state } = paths(groupName);
  fs.writeFileSync(state, JSON.stringify(newState, null, 2));
}

/** Returns messages appended since the last summarization run for this group. */
function readUnsummarizedMessages(groupName) {
  const { log } = paths(groupName);
  if (!fs.existsSync(log)) return [];
  const lines = fs.readFileSync(log, 'utf8').split('\n').filter(Boolean);
  const { summarizedLines } = readState(groupName);
  return lines.slice(summarizedLines).map((line) => JSON.parse(line));
}

/** Marks all currently-stored messages for this group as summarized. */
function markSummarized(groupName) {
  const { log } = paths(groupName);
  const totalLines = fs.existsSync(log)
    ? fs.readFileSync(log, 'utf8').split('\n').filter(Boolean).length
    : 0;
  writeState(groupName, { summarizedLines: totalLines });
}

module.exports = { appendMessage, readUnsummarizedMessages, markSummarized, safeFileName };
