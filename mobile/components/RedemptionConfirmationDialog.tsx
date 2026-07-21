import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import {
  Text,
  Button,
  Portal,
  Surface,
  Divider,
} from 'react-native-paper';
import { Reward } from '../models';

/**
 * RedemptionConfirmationDialog Component
 * 
 * Displays reward redemption confirmation with:
 * - Reward details (emoji, title, point cost)
 * - Current balance and balance after redemption
 * - Parent approval flow when required
 * - Undo button for 5 seconds after redemption
 * 
 * Requirements covered: 14.2, 14.3, 14.4, 14.5, 14.6, 15.1, 15.2, 15.3, 15.4, 15.5, 15.6
 * 
 * @param visible - Whether the dialog is visible
 * @param reward - The reward being redeemed
 * @param currentBalance - Current point balance
 * @param onConfirm - Callback when redemption is confirmed
 * @param onCancel - Callback to close dialog
 */

interface RedemptionConfirmationDialogProps {
  visible: boolean;
  reward: Reward | null;
  currentBalance: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RedemptionConfirmationDialog({
  visible,
  reward,
  currentBalance,
  onConfirm,
  onCancel,
}: RedemptionConfirmationDialogProps) {
  const [needsApproval, setNeedsApproval] = useState(false);

  if (!reward) {
    return null;
  }

  const balanceAfter = currentBalance - reward.pointCost;
  const canAfford = currentBalance >= reward.pointCost;

  // Get balance color
  const getBalanceColor = (balance: number) => {
    if (balance >= 0) return '#4CAF50'; // Green
    return '#FF9800'; // Muted orange
  };

  // Handle initial confirmation
  const handleInitialConfirm = () => {
    if (reward.parentApprovalRequired) {
      setNeedsApproval(true);
    } else {
      onConfirm();
    }
  };

  // Handle parent approval
  const handleApprove = () => {
    setNeedsApproval(false);
    onConfirm();
  };

  const handleDeny = () => {
    setNeedsApproval(false);
    onCancel();
  };

  // Parent approval view
  if (needsApproval) {
    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onCancel}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.surface} elevation={4}>
            <View style={styles.header}>
              <Text style={styles.emoji}>{reward.emoji}</Text>
              <Text variant="headlineSmall" style={styles.title}>
                Parent Approval Required
              </Text>
            </View>

            <Divider />

            <View style={styles.content}>
              <Text variant="bodyLarge" style={styles.message}>
                {reward.title}
              </Text>
              <Text variant="bodyMedium" style={styles.submessage}>
                Your child would like to redeem this reward for{' '}
                <Text style={styles.bold}>{reward.pointCost} points</Text>.
              </Text>

              <View style={styles.balanceRow}>
                <Text variant="bodyMedium">Current balance:</Text>
                <Text
                  variant="titleMedium"
                  style={[styles.balance, { color: getBalanceColor(currentBalance) }]}
                >
                  {currentBalance} pts
                </Text>
              </View>

              <View style={styles.balanceRow}>
                <Text variant="bodyMedium">Balance after:</Text>
                <Text
                  variant="titleMedium"
                  style={[styles.balance, { color: getBalanceColor(balanceAfter) }]}
                >
                  {balanceAfter} pts
                </Text>
              </View>
            </View>

            <Divider />

            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={handleDeny}
                style={styles.actionButton}
              >
                Deny
              </Button>
              <Button
                mode="contained"
                onPress={handleApprove}
                style={styles.actionButton}
              >
                Approve
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  }

  // Insufficient balance view
  if (!canAfford) {
    return (
      <Portal>
        <Modal
          visible={visible}
          onDismiss={onCancel}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.surface} elevation={4}>
            <View style={styles.header}>
              <Text style={styles.emoji}>⚠️</Text>
              <Text variant="headlineSmall" style={styles.title}>
                Not Enough Points
              </Text>
            </View>

            <Divider />

            <View style={styles.content}>
              <Text variant="bodyLarge" style={styles.message}>
                You need {reward.pointCost} points but only have {currentBalance}{' '}
                points.
              </Text>
              <Text variant="bodyMedium" style={styles.submessage}>
                Earn {reward.pointCost - currentBalance} more points to redeem this
                reward!
              </Text>
            </View>

            <Divider />

            <View style={styles.actions}>
              <Button
                mode="contained"
                onPress={onCancel}
                style={styles.actionButton}
              >
                OK
              </Button>
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  }

  // Standard confirmation view
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface} elevation={4}>
          <View style={styles.header}>
            <Text style={styles.emoji}>{reward.emoji}</Text>
            <Text variant="headlineSmall" style={styles.title}>
              Redeem Reward?
            </Text>
          </View>

          <Divider />

          <View style={styles.content}>
            <Text variant="bodyLarge" style={styles.message}>
              {reward.title}
            </Text>

            <View style={styles.costBadge}>
              <Text variant="titleLarge" style={styles.costText}>
                {reward.pointCost} points
              </Text>
            </View>

            <View style={styles.balanceRow}>
              <Text variant="bodyMedium">Current balance:</Text>
              <Text
                variant="titleMedium"
                style={[styles.balance, { color: getBalanceColor(currentBalance) }]}
              >
                {currentBalance} pts
              </Text>
            </View>

            <View style={styles.balanceRow}>
              <Text variant="bodyMedium">Balance after:</Text>
              <Text
                variant="titleMedium"
                style={[styles.balance, { color: getBalanceColor(balanceAfter) }]}
              >
                {balanceAfter} pts
              </Text>
            </View>

            {reward.parentApprovalRequired && (
              <View style={styles.infoBox}>
                <Text variant="bodySmall" style={styles.infoText}>
                  🔒 Parent approval will be required
                </Text>
              </View>
            )}
          </View>

          <Divider />

          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={onCancel}
              style={styles.actionButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleInitialConfirm}
              style={styles.actionButton}
            >
              Redeem
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    margin: 20,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  content: {
    padding: 24,
  },
  message: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#212121',
  },
  submessage: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#757575',
  },
  bold: {
    fontWeight: 'bold',
    color: '#212121',
  },
  costBadge: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  costText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  balance: {
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  infoText: {
    color: '#2196F3',
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    gap: 8,
  },
  actionButton: {
    minWidth: 100,
  },
});
