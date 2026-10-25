import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme/tokens';

export default function TabLayout() {
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
      <Tabs.Screen
        name="index"
        options={{
          title: 'Create',
          tabBarAccessibilityLabel: 'Create',
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" color={typeof color === 'string' ? color : colors.textMuted} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarAccessibilityLabel: 'Library',
          tabBarIcon: ({ color, size }) => <Ionicons name="images-outline" color={typeof color === 'string' ? color : colors.textMuted} size={size} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarAccessibilityLabel: 'Activity',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={typeof color === 'string' ? color : colors.textMuted} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={typeof color === 'string' ? color : colors.textMuted} size={size} />,
        }}
      />
    </Tabs>
  );
}
