import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useAuthContext } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { ProfileHeader } from '../../components/ProfileHeader';
import { WeatherView } from '../../components/WeatherView';
import { HeatMapView } from '../../components/HeatMapView';
import { DiaryView } from '../../components/DiaryView';
import { EventsView } from '../../components/EventsView';
import { colors } from '../../constants/theme';

type TabType = 'weather' | 'heatmap' | 'diary' | 'events';

export default function InsightsScreen() {
  const { userEmail } = useAuthContext();
  const { activeProfile, profilePhotoUri } = useProfile();
  const [activeTab, setActiveTab] = useState<TabType>('weather');

  return (
    <View style={styles.container}>
      <ProfileHeader
        emoji="📊"
        title="Insights"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      {/* Tab Navigation */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBarScroll}
        contentContainerStyle={styles.tabBar}
      >
        <TouchableOpacity
          style={[styles.tab, activeTab === 'weather' && styles.tabActive]}
          onPress={() => setActiveTab('weather')}
        >
          <Text style={[styles.tabText, activeTab === 'weather' && styles.tabTextActive]}>
            ⛅ Weather
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'heatmap' && styles.tabActive]}
          onPress={() => setActiveTab('heatmap')}
        >
          <Text style={[styles.tabText, activeTab === 'heatmap' && styles.tabTextActive]}>
            🌡️ Heat Map
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'diary' && styles.tabActive]}
          onPress={() => setActiveTab('diary')}
        >
          <Text style={[styles.tabText, activeTab === 'diary' && styles.tabTextActive]}>
            📔 Diary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'events' && styles.tabActive]}
          onPress={() => setActiveTab('events')}
        >
          <Text style={[styles.tabText, activeTab === 'events' && styles.tabTextActive]}>
            📅 Events
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          {activeTab === 'weather' && activeProfile && (
            <WeatherView childProfileId={activeProfile.id} />
          )}
          {activeTab === 'heatmap' && activeProfile && (
            <HeatMapView childProfileId={activeProfile.id} />
          )}
          {activeTab === 'diary' && activeProfile && (
            <DiaryView childProfileId={activeProfile.id} />
          )}
          {activeTab === 'events' && activeProfile && (
            <EventsView childProfileId={activeProfile.id} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tabBarScroll: {
    flexGrow: 0,
  },
  tabBar: {
    flexDirection: 'row',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 4,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(45,52,54,0.06)',
  },
  tabActive: {
    backgroundColor: '#4A90E2',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 14,
  },
  placeholderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: colors.textDim,
  },
});
