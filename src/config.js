require('dotenv').config();
const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const groupsConfigPath = path.join(rootDir, 'config', 'groups.json');

function loadGroupsConfig() {
  if (!fs.existsSync(groupsConfigPath)) {
    throw new Error(
      'לא נמצא config/groups.json. העתק את config/groups.example.json לקובץ config/groups.json ומלא בו את הקבוצות שברצונך לעקוב אחריהן.'
    );
  }
  const parsed = JSON.parse(fs.readFileSync(groupsConfigPath, 'utf8'));
  if (!Array.isArray(parsed.groups) || parsed.groups.length === 0) {
    throw new Error('config/groups.json חייב להכיל מערך "groups" עם לפחות קבוצה אחת.');
  }
  return parsed.groups;
}

module.exports = {
  rootDir,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5',
  summaryCron: process.env.SUMMARY_CRON || '0 20 * * *',
  sendSummaryToSelf: (process.env.SEND_SUMMARY_TO_SELF || 'true').toLowerCase() === 'true',
  authFolder: path.join(rootDir, 'auth'),
  dataFolder: path.join(rootDir, 'data'),
  summariesFolder: path.join(rootDir, 'summaries'),
  loadGroupsConfig,
};
