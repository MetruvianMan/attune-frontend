import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useAuthContext } from '../../contexts/AuthContext';
import { useProfile } from '../../contexts/ProfileContext';
import { ProfileHeader } from '../../components/ProfileHeader';
import { WeatherView } from '../../components/WeatherView';
import { HeatMapView } from '../../components/HeatMapView';
import { DiaryView } from '../../components/DiaryView';
import { EventsView } from '../../components/EventsView';
import { LocationCalendarView } from '../../components/LocationCalendarView';
import { LocationMapView } from '../../components/LocationMapView';
import { GlossaryView, GLOSSARY_CATEGORIES, GLOSSARY_ALL_CATEGORY, GlossaryCategory } from '../../components/GlossaryView';
import { colors } from '../../constants/theme';

type TabType = 'weather' | 'heatmap' | 'diary' | 'events' | 'location' | 'glossary';
type LocationSubView = 'calendar' | 'map';

export default function InsightsScreen() {
  const { userEmail } = useAuthContext();
  const { activeProfile, profilePhotoUri } = useProfile();
  const params = useLocalSearchParams<{ view?: string }>();
  const [activeTab, setActiveTab] = useState<TabType>('weather');
  const [locationSubView, setLocationSubView] = useState<LocationSubView>('calendar');
  const [glossaryCategory, setGlossaryCategory] = useState<GlossaryCategory | null>(null);

  // Deep-link support (Requirement 7.8) - the Today tab's location
  // indicator (task 16) navigates to '/(tabs)/insights?view=location'.
  // Read on every focus (not just mount) since expo-router keeps this
  // screen mounted across tab switches - a mount-only effect would miss
  // a second deep-link tap after the user had already navigated away and
  // back once.
  useFocusEffect(
    React.useCallback(() => {
      if (params.view === 'location') {
        setActiveTab('location');
      }
    }, [params.view])
  );

  return (
    <View style={styles.container}>
      <ProfileHeader
        emoji="📊"
        title="Insights"
        profileName={activeProfile?.displayName}
        profilePhotoUri={profilePhotoUri}
      />

      {/* Tab Navigation - a plain wrapping View, not a horizontal
          ScrollView. With 6 tabs the row no longer fits one screen
          width, and a horizontal scroll gives no visual signal that
          more tabs exist off-screen (Events was already getting cut off
          with just 5 tabs) - wrapping to a second row keeps every tab
          visible and tappable without relying on a hidden scroll
          affordance, at the fixed, one-time cost of a bit more vertical
          space. */}
      <View style={styles.tabBar}>
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
          style={[styles.tab, activeTab === 'location' && styles.tabActive]}
          onPress={() => setActiveTab('location')}
        >
          <Text style={[styles.tabText, activeTab === 'location' && styles.tabTextActive]}>
            📍 Location
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
        <TouchableOpacity
          style={[styles.tab, activeTab === 'glossary' && styles.tabActive]}
          onPress={() => setActiveTab('glossary')}
        >
          <Text style={[styles.tabText, activeTab === 'glossary' && styles.tabTextActive]}>
            📖 Glossary
          </Text>
        </TouchableOpacity>
      </View>

      {/* Calendar/Map sub-toggle - a nested pill row, only rendered while
          the Location tab is active, per Requirement 4.1 (Map is a
          sub-view within Location, not its own top-level Insights tab). */}
      {activeTab === 'location' && (
        <View style={styles.subTabBar}>
          <TouchableOpacity
            style={[styles.subTab, locationSubView === 'calendar' && styles.subTabActive]}
            onPress={() => setLocationSubView('calendar')}
          >
            <Text style={[styles.subTabText, locationSubView === 'calendar' && styles.subTabTextActive]}>
              Calendar
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTab, locationSubView === 'map' && styles.subTabActive]}
            onPress={() => setLocationSubView('map')}
          >
            <Text style={[styles.subTabText, locationSubView === 'map' && styles.subTabTextActive]}>
              Map
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Glossary's category pill filter - preserved exactly from the
          former standalone glossary.tsx screen (Requirement 8.2, 8.4),
          shown only while the Glossary tab is active, using the same
          nested-pill-row convention as Location's Calendar/Map toggle
          above rather than inventing a second visual pattern for "a
          view's own sub-selector." Horizontal scroll (not wrapping) is
          kept here specifically, unlike the top-level tab bar above -
          this row can have many categories and scrolling a single row
          of filter pills is a well-understood, already-used pattern
          elsewhere in this app (e.g. EventFilters.tsx), unlike the
          top-level tab bar's "which view am I on" tabs. */}
      {activeTab === 'glossary' && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.glossaryPillScroll}
          contentContainerStyle={styles.glossaryPillBar}
        >
          <TouchableOpacity
            style={[styles.subTab, glossaryCategory === null && styles.subTabActive]}
            onPress={() => setGlossaryCategory(null)}
          >
            <Text style={[styles.subTabText, glossaryCategory === null && styles.subTabTextActive]}>
              {GLOSSARY_ALL_CATEGORY.emoji} {GLOSSARY_ALL_CATEGORY.label}
            </Text>
          </TouchableOpacity>
          {GLOSSARY_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[styles.subTab, glossaryCategory === cat.key && styles.subTabActive]}
              onPress={() => setGlossaryCategory(cat.key)}
            >
              <Text style={[styles.subTabText, glossaryCategory === cat.key && styles.subTabTextActive]}>
                {cat.emoji} {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
          {activeTab === 'location' && activeProfile && locationSubView === 'calendar' && (
            <LocationCalendarView childProfileId={activeProfile.id} />
          )}
          {activeTab === 'location' && activeProfile && locationSubView === 'map' && (
            <LocationMapView childProfileId={activeProfile.id} />
          )}
          {activeTab === 'glossary' && (
            <GlossaryView activeCategory={glossaryCategory} />
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
  // flexWrap (not a horizontal ScrollView) - see the JSX comment above
  // this bar for why.
  tabBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 6,
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
  subTabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
  },
  subTab: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(45,52,54,0.04)',
  },
  subTabActive: {
    backgroundColor: colors.sage,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  subTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  glossaryPillScroll: {
    flexGrow: 0,
  },
  glossaryPillBar: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    gap: 8,
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
