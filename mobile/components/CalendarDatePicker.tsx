import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { colors, radius, shadows } from '../constants/theme';

interface CalendarDatePickerProps {
  visible: boolean;
  selectedDate: Date;
  onSelect: (date: Date) => void;
  onClose: () => void;
  maxDate?: Date;
}

export function CalendarDatePicker({ 
  visible, 
  selectedDate, 
  onSelect, 
  onClose,
  maxDate = new Date()
}: CalendarDatePickerProps) {
  const [tempSelectedDate, setTempSelectedDate] = useState(selectedDate);
  const [scaleAnim] = useState(new Animated.Value(0.9));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0.9);
    }
  }, [visible]);

  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseDate = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const markedDates = {
    [formatDate(tempSelectedDate)]: {
      selected: true,
      selectedColor: colors.accent,
      selectedTextColor: '#FFFFFF',
    },
  };

  const handleDayPress = (day: any) => {
    const newDate = parseDate(day.dateString);
    setTempSelectedDate(newDate);
    // No animation needed - immediate selection
  };

  const handleConfirm = () => {
    // Immediate confirmation without animation
    onSelect(tempSelectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ scale: scaleAnim }] }
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Select Date</Text>
          </View>

          <Calendar
            current={formatDate(tempSelectedDate)}
            maxDate={formatDate(maxDate)}
            onDayPress={handleDayPress}
            markedDates={markedDates}
            theme={{
              backgroundColor: colors.card,
              calendarBackground: colors.card,
              textSectionTitleColor: colors.textDim,
              selectedDayBackgroundColor: colors.accent,
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: colors.accent,
              dayTextColor: colors.text,
              textDisabledColor: colors.textMuted,
              monthTextColor: colors.text,
              textMonthFontWeight: '700',
              textDayFontSize: 15,
              textMonthFontSize: 17,
              textDayHeaderFontSize: 12,
              textDayHeaderFontWeight: '600',
              'stylesheet.calendar.header': {
                week: {
                  marginTop: 14,
                  marginBottom: 10,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                },
              },
              'stylesheet.day.basic': {
                base: {
                  width: 38,
                  height: 38,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                selected: {
                  backgroundColor: colors.accent,
                  borderRadius: 19,
                },
                today: {
                  backgroundColor: colors.accentLight,
                  borderRadius: 19,
                },
              },
            }}
            style={styles.calendar}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setTempSelectedDate(selectedDate);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 22,
    width: '100%',
    maxWidth: 400,
    ...shadows.elevated,
  },
  header: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  calendar: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: 'rgba(0,0,0,0.02)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDim,
  },
  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
