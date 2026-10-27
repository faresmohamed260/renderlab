import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRuntimeUiConfig } from '@/features/runtime-ui/RuntimeUiConfigProvider';
import { colors } from '@/theme/tokens';

/** Route identities stay fixed; the existing backend changes only their presentation/order. */
export default function TabLayout() {
  const { tabs } = useRuntimeUiConfig();
  const shared = {
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textMuted,
    tabBarStyle: {
      backgroundColor: colors.surface1,
      borderTopColor: colors.border,
    },
    sceneStyle: { backgroundColor: colors.canvas },
  };

  return (
    <Tabs screenOptions={shared}>
      {tabs.map(tab => (
        <Tabs.Screen
          key={tab.id}
          name={tab.id}
          options={{
            title: tab.label,
            tabBarAccessibilityLabel: tab.label,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name={tab.icon} color={typeof color === 'string' ? color : colors.textMuted} size={size} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
