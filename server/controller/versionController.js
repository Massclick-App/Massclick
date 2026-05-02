import systemSettingsModel from '../model/systemSettings/systemSettingsModel.js';

export const getAppVersionAction = async (req, res) => {
  try {
    const platform = (req.query.platform || 'android').toLowerCase();
    const isIos = platform === 'ios';

    const settings = await systemSettingsModel.findOne().lean();

    const latestVersion = isIos
      ? (settings?.app_ios_latest_version || '1.0.0')
      : (settings?.app_android_latest_version || '1.0.0');

    const minRequiredVersion = isIos
      ? (settings?.app_ios_min_version || latestVersion)
      : (settings?.app_android_min_version || latestVersion);

    const updateUrl = isIos
      ? (settings?.app_ios_update_url || '')
      : (settings?.app_android_update_url || 'https://play.google.com/store/apps/details?id=com.massclick.massclick');

    return res.send({
      latestVersion,
      minRequiredVersion,
      updateUrl,
      isMaintenanceMode: settings?.app_maintenance_mode ?? false,
      releaseNotes: settings?.app_release_notes || 'Bug fixes and performance improvements.',
      platform,
    });
  } catch (error) {
    console.error('getAppVersionAction error:', error);
    return res.status(500).send({ message: 'Unable to fetch app version info' });
  }
};
