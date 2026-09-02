const config = require('./config');

/**
 * Keeps a cache of jid -> group subject (name) for all groups the linked
 * account participates in, refreshed on demand, and resolves which of the
 * user-configured target groups (by exact jid or case-insensitive name
 * substring) a given jid matches.
 */
class GroupRegistry {
  constructor(targetGroups) {
    this.targetGroups = targetGroups;
    this.jidToName = new Map();
  }

  async refresh(sock) {
    const metadata = await sock.groupFetchAllParticipating();
    this.jidToName.clear();
    for (const [jid, info] of Object.entries(metadata)) {
      this.jidToName.set(jid, info.subject);
    }
  }

  /** Returns the matched target group's display name, or null if not tracked. */
  resolve(jid) {
    const actualName = this.jidToName.get(jid);
    for (const target of this.targetGroups) {
      if (target.jid && target.jid === jid) return target.name || actualName || jid;
      if (
        target.name &&
        actualName &&
        actualName.toLowerCase().includes(target.name.toLowerCase())
      ) {
        return target.name;
      }
    }
    return null;
  }
}

function createGroupRegistry() {
  return new GroupRegistry(config.loadGroupsConfig());
}

module.exports = { GroupRegistry, createGroupRegistry };
