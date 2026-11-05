import { Redirect } from 'expo-router';

/** Equipment tab removed — keep file so Expo Router route stays valid but hidden. */
export default function EquipmentRemoved() {
  return <Redirect href="/(tabs)/hospitals" />;
}
