const INITIAL_STATE = {
  isMaintenanceMode: false,
  lastUpdated: null,
};

const MAINTENANCE_MODE_ON = "MAINTENANCE_MODE_ON";
const MAINTENANCE_MODE_OFF = "MAINTENANCE_MODE_OFF";

export const maintenanceReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case MAINTENANCE_MODE_ON:
      return {
        ...state,
        isMaintenanceMode: true,
        lastUpdated: new Date().toISOString(),
      };
    case MAINTENANCE_MODE_OFF:
      return {
        ...state,
        isMaintenanceMode: false,
        lastUpdated: new Date().toISOString(),
      };
    default:
      return state;
  }
};

// Action creators
export const setMaintenanceModeOn = () => ({
  type: MAINTENANCE_MODE_ON,
});

export const setMaintenanceModeOff = () => ({
  type: MAINTENANCE_MODE_OFF,
});
