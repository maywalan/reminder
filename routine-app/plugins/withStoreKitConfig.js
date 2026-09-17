const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const STOREKIT_SOURCE = path.join(__dirname, '..', 'ios-storekit', 'Tickle.storekit');
const STOREKIT_FILENAME = 'Tickle.storekit';

function injectReference(xml) {
  if (xml.includes('StoreKitConfigurationFileReference')) return xml;
  const ref = `      <StoreKitConfigurationFileReference\n         identifier = "../../../${STOREKIT_FILENAME}">\n      </StoreKitConfigurationFileReference>\n`;
  return xml.replace(/(<LaunchAction[^>]*>\n)/, `$1${ref}`);
}

/**
 * Attaches the local StoreKit Configuration file (ios-storekit/Tickle.storekit) to the main
 * scheme's Run action, so `npx expo run:ios` gets working sandbox purchases in the Simulator
 * with no App Store Connect account. `expo prebuild --clean` regenerates `ios/` from scratch
 * every time, wiping any manual Xcode scheme edit — this plugin re-applies it on every prebuild
 * instead, the same way @bacons/apple-targets treats `targets/` as the source of truth for
 * things prebuild would otherwise erase.
 */
module.exports = function withStoreKitConfig(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosDir = path.join(config.modRequest.projectRoot, 'ios');
      fs.copyFileSync(STOREKIT_SOURCE, path.join(iosDir, STOREKIT_FILENAME));

      const xcodeprojName = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcodeproj'));
      if (!xcodeprojName) return config;

      const schemesDir = path.join(iosDir, xcodeprojName, 'xcshareddata', 'xcschemes');
      if (!fs.existsSync(schemesDir)) return config;

      for (const schemeFile of fs.readdirSync(schemesDir).filter((f) => f.endsWith('.xcscheme'))) {
        const schemePath = path.join(schemesDir, schemeFile);
        fs.writeFileSync(schemePath, injectReference(fs.readFileSync(schemePath, 'utf8')));
      }

      return config;
    },
  ]);
};
