import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Text, ActivityIndicator } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getPlaceVisitCounts,
  getDailyLocations,
  getSavedPlaceIcon,
  DailyLocations,
} from '../services/location-service';
import { databaseService } from '../services/database';
import { LocationDetailSheet, LocationDetailSheetContent } from './LocationDetailSheet';
import { SavedPlace } from '../models';
import { colors } from '../constants/theme';

interface LocationMapViewProps {
  childProfileId: string;
}

const MIN_PIN_SIZE = 40;
const MAX_PIN_SIZE = 72;
// Each additional visited day grows the pin by this many px, clamped
// between MIN_PIN_SIZE/MAX_PIN_SIZE - same clamped-linear-scale approach
// as HeatMapView's computeCellOpacity, per design.md.
const PIN_SCALE_FACTOR = 2.5;

const MAP_PADDING = 32;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 320;
const MAP_WIDTH = SCREEN_WIDTH - 2 * 14 - 2 * 14; // account for container + card padding

interface PlacedPin {
  place: SavedPlace;
  dayCount: number;
  x: number;
  y: number;
  size: number;
  isHomePlace: boolean;
}

interface UnplacedPlace {
  place: SavedPlace;
  dayCount: number;
  isHomePlace: boolean;
}

function computePinSize(dayCount: number): number {
  return Math.max(MIN_PIN_SIZE, Math.min(MAX_PIN_SIZE, MIN_PIN_SIZE + dayCount * PIN_SCALE_FACTOR));
}

/**
 * Static, non-interactive pin layout - no map tile library (no pan/zoom/
 * live tiles per Requirement 4.2, see design.md's "Location Map
 * rendering" section for why react-native-maps is unnecessary here).
 * Pins with a latitude/longitude are projected linearly onto this view's
 * bounding box; SavedPlaces with no coordinate (geocoding never ran or
 * failed) render in a separate "Other places" list below instead of
 * being silently dropped (Requirement 4.6, Property 7).
 */
export function LocationMapView({ childProfileId }: LocationMapViewProps) {
  const router = useRouter();
  const [placedPins, setPlacedPins] = useState<PlacedPin[]>([]);
  const [unplacedPlaces, setUnplacedPlaces] = useState<UnplacedPlace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetContent, setSheetContent] = useState<LocationDetailSheetContent | null>(null);
  // Cached per load, so a pin/row tap can build its day list without a
  // second getDailyLocations call - getPlaceVisitCounts only returns a
  // count, not the day list itself (see LocationDetailSheet.tsx's own
  // comment on this), so this is fetched once here and reused for every
  // tap handler during this load cycle.
  const allDailyLocationsRef = React.useRef<DailyLocations[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadMapData();
    }, [childProfileId])
  );

  const loadMapData = async () => {
    setIsLoading(true);
    try {
      const [visitCounts, settings] = await Promise.all([
        getPlaceVisitCounts(childProfileId),
        databaseService.getHouseholdLocationSettings(childProfileId),
      ]);

      const homePlaceIds = new Set(
        [settings.childHomePlaceId, settings.momHomePlaceId, settings.dadHomePlaceId].filter(
          (id): id is string => !!id
        )
      );

      const withCoords: Array<{ place: SavedPlace; dayCount: number }> = [];
      const withoutCoords: UnplacedPlace[] = [];

      for (const { savedPlace, dayCount } of visitCounts.values()) {
        if (savedPlace.latitude !== undefined && savedPlace.longitude !== undefined) {
          withCoords.push({ place: savedPlace, dayCount });
        } else {
          withoutCoords.push({ place: savedPlace, dayCount, isHomePlace: homePlaceIds.has(savedPlace.id) });
        }
      }

      // Fetch the full day-by-day history once, bounded the same way
      // getPlaceVisitCounts bounds itself (earliest child LocationPeriod
      // through today) - reused by every pin/row tap this load cycle to
      // build that place's day list for LocationDetailSheet.
      if (withCoords.length > 0 || withoutCoords.length > 0) {
        const childPeriods = await databaseService.getLocationPeriodsByProfile(childProfileId, 'child');
        if (childPeriods.length > 0) {
          const earliestStart = childPeriods.reduce(
            (min, p) => (p.startDate < min ? p.startDate : min),
            childPeriods[0].startDate
          );
          const today = new Date();
          const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          allDailyLocationsRef.current = await getDailyLocations(childProfileId, {
            start: earliestStart,
            end: todayKey,
          });
        } else {
          allDailyLocationsRef.current = [];
        }
      } else {
        allDailyLocationsRef.current = [];
      }

      setPlacedPins(projectPins(withCoords, homePlaceIds));
      setUnplacedPlaces(withoutCoords);
    } finally {
      setIsLoading(false);
    }
  };

  const projectPins = (
    places: Array<{ place: SavedPlace; dayCount: number }>,
    homePlaceIds: Set<string>
  ): PlacedPin[] => {
    if (places.length === 0) return [];

    const lats = places.map((p) => p.place.latitude!);
    const longs = places.map((p) => p.place.longitude!);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLong = Math.min(...longs);
    const maxLong = Math.max(...longs);

    const latRange = maxLat - minLat || 1;
    const longRange = maxLong - minLong || 1;

    const usableWidth = MAP_WIDTH - 2 * MAP_PADDING;
    const usableHeight = MAP_HEIGHT - 2 * MAP_PADDING;

    return places.map(({ place, dayCount }) => {
      // Linear projection, not a real Mercator projection - sufficient
      // for "relative position on a stylized map," per design.md.
      // Longitude increases eastward (left-to-right maps naturally).
      // Latitude increases northward, so y is inverted (north = up =
      // smaller y).
      const xRatio = (place.longitude! - minLong) / longRange;
      const yRatio = 1 - (place.latitude! - minLat) / latRange;

      // Places.length === 1 means lat/longRange defaulted to 1 with a
      // zero actual range - center that single pin rather than pinning
      // it to a corner.
      const x = places.length === 1 ? usableWidth / 2 : xRatio * usableWidth;
      const y = places.length === 1 ? usableHeight / 2 : yRatio * usableHeight;

      return {
        place,
        dayCount,
        x: x + MAP_PADDING,
        y: y + MAP_PADDING,
        size: computePinSize(dayCount),
        isHomePlace: homePlaceIds.has(place.id),
      };
    });
  };

  const buildDaysForPlace = (place: SavedPlace): DailyLocations[] => {
    return allDailyLocationsRef.current.filter((day) => {
      const childEntry = day.entries.find((e) => e.householdMember === 'child');
      return childEntry?.savedPlace?.id === place.id;
    });
  };

  const handlePinPress = (place: SavedPlace) => {
    setSheetContent({ kind: 'place', place, days: buildDaysForPlace(place) });
    setSheetVisible(true);
  };

  const handleManageLocations = () => {
    router.push('/(location-forms)/saved-places-list');
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  const hasAnyData = placedPins.length > 0 || unplacedPlaces.length > 0;

  if (!hasAnyData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyEmoji}>🗺️</Text>
          <Text style={styles.emptyTitle}>No Location Data Yet</Text>
          <Text style={styles.emptySubtitle}>
            Add a few Saved Places and some Location Periods to see where
            your family's spent time.
          </Text>
          <TouchableOpacity style={styles.manageButton} onPress={handleManageLocations}>
            <Text style={styles.manageButtonText}>Manage Locations</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {placedPins.length > 0 && (
        <View style={styles.mapArea}>
          {placedPins.map((pin) => (
            <TouchableOpacity
              key={pin.place.id}
              style={[
                styles.pin,
                {
                  left: pin.x - pin.size / 2,
                  top: pin.y - pin.size / 2,
                  width: pin.size,
                  height: pin.size,
                },
                pin.isHomePlace && styles.pinHome,
              ]}
              onPress={() => handlePinPress(pin.place)}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: pin.size * 0.42 }}>{getSavedPlaceIcon(pin.place)}</Text>
              {pin.isHomePlace && <View style={styles.homeBadge}><Text style={styles.homeBadgeText}>🏠</Text></View>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {placedPins.length > 0 && (
        <View style={styles.pinLabelsRow}>
          {placedPins.map((pin) => (
            <View key={pin.place.id} style={styles.pinLabelItem}>
              <Text style={styles.pinLabelText}>{pin.place.name}</Text>
              <Text style={styles.pinLabelCount}>
                {pin.dayCount} {pin.dayCount === 1 ? 'day' : 'days'}
              </Text>
            </View>
          ))}
        </View>
      )}

      {unplacedPlaces.length > 0 && (
        <View style={styles.otherPlacesSection}>
          <Text style={styles.otherPlacesTitle}>OTHER PLACES</Text>
          <ScrollView style={styles.otherPlacesScroll}>
            {unplacedPlaces.map(({ place, dayCount, isHomePlace }) => (
              <TouchableOpacity
                key={place.id}
                style={styles.otherPlaceRow}
                onPress={() => handlePinPress(place)}
                activeOpacity={0.7}
              >
                <Text style={styles.otherPlaceIcon}>{getSavedPlaceIcon(place)}</Text>
                <View style={styles.otherPlaceTextInfo}>
                  <Text style={styles.otherPlaceName}>
                    {place.name}
                    {isHomePlace ? ' 🏠' : ''}
                  </Text>
                  <Text style={styles.otherPlaceDayCount}>
                    {dayCount} {dayCount === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <TouchableOpacity style={styles.manageLink} onPress={handleManageLocations}>
        <Text style={styles.manageLinkText}>Manage Locations</Text>
      </TouchableOpacity>

      <LocationDetailSheet
        visible={sheetVisible}
        content={sheetContent}
        onDismiss={() => setSheetVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
  },
  loadingContainer: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapArea: {
    height: MAP_HEIGHT,
    borderRadius: 14,
    backgroundColor: colors.bgDeep,
    position: 'relative',
    overflow: 'hidden',
  },
  pin: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  pinHome: {
    borderColor: colors.sage,
    borderWidth: 3,
  },
  homeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.sage,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeBadgeText: {
    fontSize: 11,
  },
  pinLabelsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 12,
    justifyContent: 'center',
  },
  pinLabelItem: {
    alignItems: 'center',
  },
  pinLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  pinLabelCount: {
    fontSize: 10.5,
    color: colors.textDim,
  },
  otherPlacesSection: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  otherPlacesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textDim,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  otherPlacesScroll: {
    maxHeight: 220,
  },
  otherPlaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  otherPlaceIcon: {
    fontSize: 26,
    marginRight: 12,
  },
  otherPlaceTextInfo: {
    flex: 1,
  },
  otherPlaceName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.text,
  },
  otherPlaceDayCount: {
    fontSize: 11.5,
    color: colors.textDim,
  },
  manageLink: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 44,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  manageButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
});
