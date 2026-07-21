import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { colors, shadows, radius } from '../constants/theme';

/**
 * UndoToast Component
 * 
 * Task: 12.3 Create UndoToast component
 * 
 * Requirements covered:
 * - 10.4: Display confirmation message with undo button for 5 seconds
 * - 10.5: Auto-dismiss after timeout
 * - 11.3: Support undo for demerit behaviors with muted visual styling
 * - 15.6: Provide undo button for 5 seconds after redemption
 * 
 * Features:
 * - Toast/Snackbar that appears at bottom of screen
 * - Success message with point value (e.g., "+10 points logged!")
 * - "Undo" button on the right
 * - Auto-dismiss after 5 seconds (configurable)
 * - Manual dismiss via X button or tap outside
 * - Smooth slide-in/slide-out animation using Animated API
 * - Green background for positive points, blue for redemptions
 * - Neutral/muted background for negative points (demerits)
 * 
 * Design:
 * - Rounded card with shadow
 * - Emoji-forward messaging
 * - Consistent with Attune's visual language
 */

export interface UndoToastProps {
  /** Whether the toast is visible */
  visible: boolean;
  /** Success message to display (e.g., "+10 points logged!") */
  message: string;
  /** Callback when undo button is pressed */
  onUndo: () => void;
  /** Callback when toast is dismissed (auto or manual) */
  onDismiss: () => void;
  /** Auto-dismiss duration in milliseconds (default: 5000ms) */
  duration?: number;
  /** Type of toast for color theming: 'positive' (green), 'negative' (orange), 'neutral' (blue) */
  type?: 'positive' | 'negative' | 'neutral';
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const TOAST_MARGIN = 18;
const TOAST_WIDTH = SCREEN_WIDTH - TOAST_MARGIN * 2;

export function UndoToast({
  visible,
  message,
  onUndo,
  onDismiss,
  duration = 5000,
  type = 'positive',
}: UndoToastProps) {
  // Animation value for slide up/down
  const translateY = useRef(new Animated.Value(200)).current;
  
  // Timer for auto-dismiss
  const dismissTimer = useRef<NodeJS.Timeout | null>(null);

  // Animate in/out based on visible prop
  useEffect(() => {
    if (visible) {
      // Clear any existing timer
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }

      // Slide in animation
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();

      // Set auto-dismiss timer
      dismissTimer.current = setTimeout(() => {
        handleDismiss();
      }, duration);
    } else {
      // Slide out animation
      Animated.timing(translateY, {
        toValue: 200,
        duration: 250,
        useNativeDriver: true,
      }).start();

      // Clear timer
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
      }
    };
  }, [visible, duration]);

  const handleDismiss = () => {
    // Clear timer
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    // Call onDismiss callback
    onDismiss();
  };

  const handleUndo = () => {
    // Clear timer
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    // Call onUndo callback
    onUndo();
  };

  // Don't render if not visible (after animation completes)
  if (!visible && translateY._value === 200) {
    return null;
  }

  // Determine background color based on type
  const getBackgroundStyle = () => {
    switch (type) {
      case 'positive':
        return styles.toastPositive;
      case 'negative':
        return styles.toastNegative;
      case 'neutral':
      default:
        return styles.toastNeutral;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'positive':
        return styles.messageTextPositive;
      case 'negative':
        return styles.messageTextNegative;
      case 'neutral':
      default:
        return styles.messageTextNeutral;
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.toast,
          getBackgroundStyle(),
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, getTextStyle()]} numberOfLines={2}>
            {message}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsContainer}>
          {/* Undo button */}
          <TouchableOpacity
            style={styles.undoButton}
            onPress={handleUndo}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>

          {/* Dismiss button */}
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 90 : 70, // Above tab bar
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  toast: {
    width: TOAST_WIDTH,
    minHeight: 56,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingLeft: 18,
    paddingRight: 12,
    ...shadows.elevated,
  },
  toastPositive: {
    backgroundColor: '#4CAF50', // Green for positive points
    borderWidth: 1,
    borderColor: '#388E3C',
  },
  toastNegative: {
    backgroundColor: '#FF9800', // Muted orange for demerits (not harsh red)
    borderWidth: 1,
    borderColor: '#F57C00',
  },
  toastNeutral: {
    backgroundColor: '#2196F3', // Blue for redemptions/neutral
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  messageContainer: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 12,
  },
  messageText: {
    fontSize: 14.5,
    fontWeight: '600',
    lineHeight: 20,
  },
  messageTextPositive: {
    color: '#FFFFFF',
  },
  messageTextNegative: {
    color: '#FFFFFF',
  },
  messageTextNeutral: {
    color: '#FFFFFF',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  undoButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  undoButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dismissButtonText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#FFFFFF',
    lineHeight: 18,
  },
});
