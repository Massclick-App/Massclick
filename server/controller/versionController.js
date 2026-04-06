import dotenv from 'dotenv';
dotenv.config();

const getAppVersionConfig = (platform = 'android') => {
  const platformKey = platform.toLowerCase() === 'ios' ? 'IOS' : 'ANDROID';

  const latestVersion =
    process.env[`APP_${platformKey}_LATEST_VERSION`] ||
    process.env.APP_LATEST_VERSION ||
    '1.0.0';

  const minRequiredVersion =
    process.env[`APP_${platformKey}_MINIMUM_VERSION`] ||
    process.env.APP_MINIMUM_VERSION ||
    latestVersion;

  const updateUrl =
    process.env[`APP_${platformKey}_UPDATE_URL`] ||
    process.env.APP_UPDATE_URL ||
    'https://play.google.com/store/apps/details?id=com.massclick.massclick';

  return {
    latestVersion,
    minRequiredVersion,
    updateUrl,
    isMaintenanceMode: process.env.APP_MAINTENANCE_MODE === 'true',
    releaseNotes:
      process.env.APP_RELEASE_NOTES ||
      'Bug fixes and performance improvements.',
    platform: platform.toLowerCase(),
  };
};

export const getAppVersionAction = async (req, res) => {
  try {
    const platform = (req.query.platform || 'android').toString();
    const versionConfig = getAppVersionConfig(platform);
    return res.send(versionConfig);
  } catch (error) {
    console.error('getAppVersionAction error:', error);
    return res.status(500).send({ message: 'Unable to fetch app version info' });
  }
};
