import { v4 as uuidv4 } from "uuid";

// Kept as the existing key so previously-remembered devices aren't
// invalidated by this change. Switch to "device_uuid" only if you're
// okay with every "Remember this device" user re-verifying via OTP once.
const DEVICE_UUID_KEY = "crm_device_uuid";

export const getDeviceUUID = () => {
  let deviceUUID = localStorage.getItem(DEVICE_UUID_KEY);

  if (!deviceUUID) {
    deviceUUID = uuidv4();
    localStorage.setItem(DEVICE_UUID_KEY, deviceUUID);
  }

  return deviceUUID;
};