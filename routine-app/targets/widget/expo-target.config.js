/** @type {import('@bacons/apple-targets/app.plugin').Config} */
module.exports = {
  type: 'widget',
  name: 'TickleWidget',
  displayName: 'Tickle',
  colors: {
    $accent: '#1B76E8',
    $widgetBackground: '#2A2A2E',
  },
  deploymentTarget: '15.1',
  frameworks: ['WidgetKit', 'SwiftUI'],
  // An explicit (even empty) `entitlements` object is required to trigger this plugin's
  // App Groups auto-sync from app.json's ios.entitlements — omitting the key entirely skips it.
  entitlements: {},
};
