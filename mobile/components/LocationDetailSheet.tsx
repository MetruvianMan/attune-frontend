import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Modal, Dimensions, Animated, PanResponder } from 'react-native';
import { Text } from 'react-native-paper';
import { DailyLocations, DailyLocationEntry, getSavedPlaceIcon } from '../services/location-service';
import { useProfile } from '../contexts/ProfileContext';
import { SavedPlace, HouseholdMember } from '../models';
import { colors, radius, shadows, spacing, typography } from '../constants/theme';

// 'Child' is replaced with the active profile's actual first name
// everywhere this is used - see useHouseholdMemberLabels below.
const STATIC_HOUSEHOLD_MEMBER_LABELS: Record<HouseholdMember, string> = {
  child: 'Child',
  mom: 'Mom',
  dad: 'Dad',
};

const PLACE_TYPE_LABELS: Record<string, string> = {
  home: 'Home',
  family_visit: 'Family Visit',
  vacation: 'Vacation',
  camp_or_school_trip: 'Camp / School Trip',
  other: 'Other',
};

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDateKeyForDisplay(dateKey: string): string {
  return parseDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Either variant the sheet can be opened with (Requirement 3.6, 4.5):
 * - 'day': a single day's DailyLocations entry, for LocationCalendarView's
 *   day-tap - shows each HouseholdMember's resolved place for that one day.
 * - 'place': a SavedPlace plus every DailyLocations entry across the
 *   profile's history where the CHILD resolved to that place, for
 *   LocationMapView's pin-tap - shows the date list for that place.
 *   getPlaceVisitCounts only returns a count, not the day list itself, so
 *   callers filter their own getDailyLocations results by
 *   `entry.entries.find(e => e.householdMember === 'child')?.savedPlace?.id
 *   === place.id` to build this list before opening the sheet.
 */
export type LocationDetailSheetContent =
  | { kind: 'day'; day: DailyLocations }
  | { kind: 'place'; place: SavedPlace; days: DailyLocations[] };

// A percentage maxHeight (e.g. '85%') only resolves reliably in React
// Native when the element's PARENT has an explicitly defined height.
// Here the sheet's parent (sheetTouchGuard, inside the Modal's own
// TouchableOpacity overlay) has no explicit height - it just wraps
// around its content - so a percentage maxHeight has no well-defined
// basis to be a percentage OF, and Yoga's layout engine resolved that
// ambiguous case inconsistently (confirmed on-device: raising 70% to
// 85% did not actually make the sheet taller, Dad's row stayed ~60%
// clipped). Computing an explicit pixel value from Dimensions.get
// ('window') up front sidesteps that ambiguity entirely.
const SHEET_MAX_HEIGHT = Dimensions.get('window').height * 0.85;
// A `maxHeight` alone only caps how tall the sheet CAN grow - it has no
// effect on a short 3-row 'day' variant, whose content never reaches
// that cap in the first place (confirmed on-device: raising maxHeight
// twice produced no visible change, because maxHeight was never the
// binding constraint for this content). To actually make the sheet
// start higher up the screen regardless of content length, it needs a
// MINIMUM height instead - forcing the box itself to be taller, with
// any leftover space simply appearing as padding below the content
// (which also doubles as safe clearance above the home indicator).
// Reduced from 0.5 by roughly two memberRow's worth (~120px: each row is
// paddingVertical 10+10 plus its content line) per feedback that 0.5
// pushed the sheet too high.
const SHEET_MIN_HEIGHT = Dimensions.get('window').height * 0.5 - 120;
// How far down the sheet must be dragged before a release counts as
// "dismiss" rather than "snap back open."
const DISMISS_THRESHOLD = 80;
const SCREEN_HEIGHT = Dimensions.get('window').height;

interface LocationDetailSheetProps {
  visible: boolean;
  content: LocationDetailSheetContent | null;
  onDismiss: () => void;
}

/**
 * Shared bottom-sheet modal used by both LocationCalendarView (day-tap)
 * and LocationMapView (pin-tap) - a single detail-rendering component
 * rather than two separate ones, per design.md's Architecture section.
 *
 * Built as a plain React Native `Modal` (not react-native-paper's
 * Portal-based Modal/Dialog) - react-native-paper's Menu was confirmed
 * broken this session when rendered from a screen presented via expo-
 * router's Stack `presentation: 'modal'` (its Portal-rendered content
 * ends up behind the modal's own native layer, invisible, even though
 * state updates correctly). A plain RN Modal has no such dependency on
 * reaching a Portal.Host, so it renders correctly regardless of what
 * kind of screen it's opened from. Follows HeatMapView.tsx's existing
 * tap-to-popover structure (transparent Modal + dismiss-on-overlay-tap
 * TouchableOpacity + inner card View), sized as a bottom sheet instead
 * of a small centered card since this content can run longer (3
 * household members per day, or many days per place).
 */
export function LocationDetailSheet({ visible, content, onDismiss }: LocationDetailSheetProps) {
  const { activeProfile } = useProfile();
  const householdMemberLabels: Record<HouseholdMember, string> = {
    ...STATIC_HOUSEHOLD_MEMBER_LABELS,
    child: activeProfile?.displayName || STATIC_HOUSEHOLD_MEMBER_LABELS.child,
  };

  // Previous attempt only fixed the DRAG-release path, but the Modal's
  // own animationType="slide" still played on every OTHER path that
  // flips `visible` to false (tapping the overlay, Android back button)
  // - so two separate animation systems (ours + the Modal's built-in
  // one) were still both active, just colliding less often. The only
  // way to fully remove the stutter is to stop the Modal from animating
  // at all (animationType="none" below) and drive 100% of the open/close
  // motion ourselves through dragY, for every dismiss path uniformly -
  // not just the drag-release one.
  //
  // modalVisible is intentionally separate from the `visible` prop: when
  // the parent sets visible=false, we don't want the Modal to unmount
  // instantly (that would just reintroduce an abrupt cut, the thing
  // animationType="slide" was there to avoid) - instead we play our own
  // slide-out first, and only drop modalVisible to false once that
  // finishes.
  const [modalVisible, setModalVisible] = React.useState(visible);
  const dragY = useRef(new Animated.Value(visible ? 0 : SCREEN_HEIGHT)).current;

  // `visible` only ever flips to false as a RESULT of one of this
  // component's own dismiss paths calling the `onDismiss` prop (overlay
  // tap, drag release past threshold) - the parent (LocationCalendarView
  // /LocationMapView) never flips it false any other way. So reacting to
  // `visible` turning false here as a signal to START the close
  // animation would be reacting to an animation this component itself
  // already finished running - a second, redundant trigger. Only the
  // true->false->true "open" transition is reacted to here; every close
  // path calls animateOutThenDismiss directly instead (see the overlay
  // TouchableOpacity's onPress and the PanResponder's release handler
  // below), which is the single source of truth for closing.
  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      dragY.setValue(SCREEN_HEIGHT);
      Animated.timing(dragY, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible]);

  const animateOutThenDismiss = () => {
    Animated.timing(dragY, { toValue: SCREEN_HEIGHT, duration: 180, useNativeDriver: true }).start(() => {
      setModalVisible(false);
      onDismiss();
    });
  };

  // Real drag-to-dismiss, wired to the handle bar - the handle previously
  // was purely decorative (no gesture attached at all), which looked
  // draggable but did nothing when dragged, confirmed on-device. Only
  // downward movement is tracked (translateY clamped to >= 0, so the
  // sheet can't be dragged UP past its resting position); releasing
  // past DISMISS_THRESHOLD finishes the slide-out and THEN calls
  // onDismiss, releasing short of it snaps back to 0 via a spring.
  const panResponder = useRef(
    PanResponder.create({
      // onStartShouldSetPanResponder (not onMoveShouldSetPanResponder) -
      // the handle sits inside a TouchableOpacity (the sheet card
      // itself), which claims the touch responder immediately on
      // finger-down to track its own press state. Waiting for movement
      // to claim the responder meant the TouchableOpacity had already
      // won the gesture by the time any drag happened, so the handle
      // never actually received move events (confirmed on-device: drag
      // did nothing at all). Claiming on touch-START instead wins the
      // negotiation before the TouchableOpacity gets a chance to.
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 4,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          dragY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD) {
          // Calls the plain onDismiss prop directly (not
          // animateOutThenDismiss) - dragY is already most of the way
          // off-screen from the drag itself, so this just finishes that
          // same motion the rest of the way, then flips modalVisible off
          // and notifies the parent. Using animateOutThenDismiss here
          // instead would restart the timing from dragY's CURRENT
          // (already-dragged) position with a fresh 180ms duration,
          // which reads as a slight re-acceleration right at the
          // handoff point - finishing the existing gesture reads as one
          // continuous motion instead.
          Animated.timing(dragY, { toValue: SCREEN_HEIGHT, duration: 120, useNativeDriver: true }).start(() => {
            setModalVisible(false);
            onDismiss();
          });
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const renderDayEntry = (entry: DailyLocationEntry) => (
    <View key={entry.householdMember} style={styles.memberRow}>
      <Text style={styles.memberLabel}>{householdMemberLabels[entry.householdMember]}</Text>
      {entry.savedPlace ? (
        <View style={styles.placeInfo}>
          <Text style={styles.placeIcon}>{getSavedPlaceIcon(entry.savedPlace)}</Text>
          <View style={styles.placeTextInfo}>
            <Text style={styles.placeName}>{entry.savedPlace.name}</Text>
            <Text style={styles.placeTypeLabel}>
              {PLACE_TYPE_LABELS[entry.savedPlace.placeType] ?? entry.savedPlace.placeType}
              {entry.isHomePlace ? ' · Home Place' : ''}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.unknownText}>Unknown</Text>
      )}
    </View>
  );

  const renderDayVariant = (day: DailyLocations) => (
    <>
      <Text style={styles.sheetTitle}>{formatDateKeyForDisplay(day.dateKey)}</Text>
      {day.isTransitionDay && (
        <View style={styles.transitionBadge}>
          <Text style={styles.transitionBadgeText}>Away from Home</Text>
        </View>
      )}
      {/* This sheet is a plain Modal, not a real bottom-sheet library,
          so there's no built-in content-scroll - the handle bar now has
          a real drag-to-dismiss gesture (see panResponder above), but
          this fixed 3-row list (child, mom, dad) still doesn't need its
          own scroll: the simpler fix is making the sheet itself (see
          `sheet` style's maxHeight below) tall enough that these 3 rows
          always fit without clipping. */}
      <View style={styles.memberList}>
        {day.entries.map(renderDayEntry)}
      </View>
    </>
  );

  const renderPlaceVariant = (place: SavedPlace, days: DailyLocations[]) => {
    const sortedDays = [...days].sort((a, b) => (a.dateKey < b.dateKey ? 1 : -1));
    return (
      <>
        <View style={styles.placeHeaderRow}>
          <Text style={styles.placeHeaderIcon}>{getSavedPlaceIcon(place)}</Text>
          <View>
            <Text style={styles.sheetTitle}>{place.name}</Text>
            <Text style={styles.placeTypeLabel}>
              {PLACE_TYPE_LABELS[place.placeType] ?? place.placeType}
            </Text>
          </View>
        </View>
        <Text style={styles.dayCountLabel}>
          {sortedDays.length} {sortedDays.length === 1 ? 'day' : 'days'} visited
        </Text>
        <ScrollView style={styles.dayListScroll}>
          {sortedDays.map((day) => (
            <View key={day.dateKey} style={styles.dayListRow}>
              <Text style={styles.dayListDate}>{formatDateKeyForDisplay(day.dateKey)}</Text>
              {day.isTransitionDay && (
                <View style={styles.transitionBadgeSmall}>
                  <Text style={styles.transitionBadgeSmallText}>Away</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      </>
    );
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      // animationType="none" (not "slide") - the Modal's own built-in
      // slide was the second animation system colliding with dragY's;
      // disabling it entirely and driving 100% of the motion through
      // dragY (both open and close) is what actually removes the
      // stutter, rather than just reducing how often the two collide.
      animationType="none"
      onRequestClose={animateOutThenDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={animateOutThenDismiss}
      >
        {/* Inner card is a separate element from the overlay touchable,
            so tapping the card itself doesn't bubble up and dismiss -
            same structure as HeatMapView's popover. */}
        <View style={styles.sheetTouchGuard}>
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <Animated.View style={{ transform: [{ translateY: dragY }] }}>
              {/* panHandlers scoped to just the handle's touch area (not
                  the whole sheet) so dragging the handle dismisses, but
                  scrolling the 'place' variant's day list (dayListScroll)
                  isn't hijacked by this same gesture. */}
              <View {...panResponder.panHandlers} style={styles.handleArea}>
                <View style={styles.handle} />
              </View>
              {content?.kind === 'day' && renderDayVariant(content.day)}
              {content?.kind === 'place' && renderPlaceVariant(content.place, content.days)}
            </Animated.View>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetTouchGuard: {
    // Separate wrapper so the inner TouchableOpacity's own activeOpacity
    // doesn't visually dim the whole sheet on tap.
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.cardPadding,
    // Explicit pixel value, not a percentage string - see
    // SHEET_MAX_HEIGHT's comment above for why. Since there's no
    // working drag/scroll gesture on this plain Modal (see memberList's
    // comment), the sheet needs to be tall enough on its own that the
    // 'day' variant's fixed 3-row list (child/mom/dad) is never at risk
    // of clipping, even on shorter phone screens. The 'place' variant's
    // day list can still run long (many visited days), so it keeps its
    // own internal dayListScroll regardless.
    maxHeight: SHEET_MAX_HEIGHT,
    minHeight: SHEET_MIN_HEIGHT,
    ...shadows.elevated,
  },
  // Generous vertical padding gives the drag gesture (wired via
  // panResponder.panHandlers on this View) a comfortably large hit area,
  // not just the thin 4px bar itself.
  handleArea: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    alignSelf: 'center',
  },
  sheetTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.text,
  },
  transitionBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.warmLight,
    borderRadius: radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  transitionBadgeText: {
    fontSize: typography.small.fontSize,
    fontWeight: '600',
    color: '#8A6D1F',
  },
  memberList: {
    marginTop: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  memberLabel: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
    width: 60,
  },
  placeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  placeIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  placeTextInfo: {
    alignItems: 'flex-end',
  },
  placeName: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
    color: colors.text,
  },
  placeTypeLabel: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
  },
  unknownText: {
    fontSize: typography.body.fontSize,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  placeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  placeHeaderIcon: {
    fontSize: 40,
  },
  dayCountLabel: {
    fontSize: typography.small.fontSize,
    color: colors.textDim,
    marginTop: 12,
    marginBottom: 8,
  },
  dayListScroll: {
    maxHeight: 320,
  },
  dayListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  dayListDate: {
    fontSize: typography.body.fontSize,
    color: colors.text,
  },
  transitionBadgeSmall: {
    backgroundColor: colors.warmLight,
    borderRadius: radius.chip,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  transitionBadgeSmallText: {
    fontSize: typography.tiny.fontSize,
    fontWeight: '600',
    color: '#8A6D1F',
  },
});
