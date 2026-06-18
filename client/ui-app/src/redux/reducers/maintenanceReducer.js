const INITIAL_STATE = {
  isMaintenanceMode: false,
  message: "",
  detail: "",
  retryAfter: null,
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
        message: action.payload?.message || state.message || "Service Unavailable",
        detail:
          action.payload?.detail ||
          state.detail ||
          "We're making a few improvements right now. We'll be back soon.",
        retryAfter: action.payload?.retryAfter ?? state.retryAfter ?? null,
        lastUpdated: new Date().toISOString(),
      };
    case MAINTENANCE_MODE_OFF:
      return {
        ...state,
        isMaintenanceMode: false,
        message: "",
        detail: "",
        retryAfter: null,
        lastUpdated: new Date().toISOString(),
      };
    default:
      return state;
  }
};

// Action creators
export const setMaintenanceModeOn = (payload) => ({
  type: MAINTENANCE_MODE_ON,
  payload,
});

export const setMaintenanceModeOff = () => ({
  type: MAINTENANCE_MODE_OFF,
});
