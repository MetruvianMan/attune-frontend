import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Banner } from 'react-native-paper';
import NetInfo from '@react-native-community/netinfo';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !state.isConnected;
      setIsOffline(offline);
      setVisible(offline);
    });

    return () => unsubscribe();
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Banner
      visible={visible}
      actions={[
        {
          label: 'Dismiss',
          onPress: () => setVisible(false),
        },
      ]}
      icon="wifi-off"
      style={styles.banner}
    >
      You're offline. Changes will sync when you reconnect.
    </Banner>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF3E0',
  },
});
