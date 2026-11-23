// Extends app.json. GitHub Pages serves a project site from a sub-path
// (https://<user>.github.io/<repo>/), so web builds for it need that path as
// Expo's baseUrl. It comes from EXPO_BASE_URL (e.g. "/screentime-buddy");
// unset, as in local development, the app is served from "/".
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
});
