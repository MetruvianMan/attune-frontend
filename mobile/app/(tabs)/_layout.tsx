import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Renders each tab's label with a capped font-scaling multiplier. With 8
// tabs sharing one screen width, labels like "Insights"/"Rewards"/
// "Glossary" already truncate to "Insigh..."/"Rewa..."/"Gloss..." even at
// the default system font size (visible on every device) - a larger iOS
// "Larger Text" accessibility setting shrinks the available room per
// label further, since the label itself grows to honor that. Capping (not
// removing) how much a tab label can grow keeps the accessibility setting
// meaningfully respected everywhere else in the app while keeping labels
// legible in a spot with a hard, fixed width limit and no room to expand
// into. maxFontSizeMultiplier caps growth rather than disabling scaling
// outright (tabBarAllowFontScaling: false would ignore the setting
// entirely here).
const renderTabLabel = (label: string) => ({ color, focused }: { color: string; focused: boolean }) => (
  <Text
    style={{ color, fontSize: 11, fontWeight: focused ? '700' : '400' }}
    maxFontSizeMultiplier={1.15}
    numberOfLines={1}
  >
    {label}
  </Text>
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2196F3',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          headerShown: false,
          tabBarLabel: renderTabLabel('Today'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-today" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          headerShown: false,
          tabBarLabel: renderTabLabel('Insights'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-bar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="conversation"
        options={{
          title: 'Chat',
          headerShown: false,
          tabBarLabel: renderTabLabel('Chat'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="message-text" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          headerShown: false,
          tabBarLabel: renderTabLabel('Rewards'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="gift" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="circle"
        options={{
          title: 'Circle',
          headerShown: false,
          tabBarLabel: renderTabLabel('Circle'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Docs',
          headerShown: false,
          tabBarLabel: renderTabLabel('Docs'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="glossary"
        options={{
          title: 'Glossary',
          headerShown: false,
          tabBarLabel: renderTabLabel('Glossary'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: renderTabLabel('Profile'),
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" size={size} color={color} />
          ),
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen
        name="timeline"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}
