const fs = require('fs');
const { IOSConfig, withEntitlementsPlist, withFinalizedMod } = require('expo/config-plugins');
const plistModule = require('@expo/plist');
const plist = plistModule.default ?? plistModule;

const APS_ENVIRONMENT = 'aps-environment';

/**
 * expo-notifications 57.0.x always writes aps-environment. That SDK has no
 * enableRemoteNotifications option, so local reminders still request the
 * Push Notifications capability unless a later mod removes the key.
 *
 * Entitlements mods run outer-first: the last plugin registered runs first,
 * then nextMod walks back toward earlier plugins. This plugin must be listed
 * before expo-notifications so the delete runs after that plugin adds the key.
 * A finalized pass rewrites the plist in case another mod put the key back.
 */
function stripApsEnvironment(entitlements) {
  if (entitlements && Object.prototype.hasOwnProperty.call(entitlements, APS_ENVIRONMENT)) {
    delete entitlements[APS_ENVIRONMENT];
  }
}

function withoutRemotePushEntitlement(config) {
  config = withEntitlementsPlist(config, (mod) => {
    stripApsEnvironment(mod.modResults);
    stripApsEnvironment(mod.ios?.entitlements);
    return mod;
  });

  return withFinalizedMod(config, [
    'ios',
    async (mod) => {
      stripApsEnvironment(mod.ios?.entitlements);
      if (mod.modRequest.introspect) return mod;

      const filePath = IOSConfig.Entitlements.getEntitlementsPath(mod.modRequest.projectRoot);
      if (!filePath || !fs.existsSync(filePath)) return mod;

      const parsed = plist.parse(fs.readFileSync(filePath, 'utf8'));
      if (!parsed || !Object.prototype.hasOwnProperty.call(parsed, APS_ENVIRONMENT)) return mod;

      delete parsed[APS_ENVIRONMENT];
      fs.writeFileSync(filePath, plist.build(parsed));
      return mod;
    },
  ]);
}

module.exports = withoutRemotePushEntitlement;
