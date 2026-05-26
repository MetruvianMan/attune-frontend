import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { Document } from '../models/document';

interface DocumentCardProps {
  document: Document;
  onPress: () => void;
}

export function DocumentCard({ document, onPress }: DocumentCardProps) {
  const getDocumentIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return '🖼️';
    } else if (mimeType === 'application/pdf') {
      return '📄';
    }
    return '📎';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getDocumentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'IEP': '#4CAF50',
      'Evaluation': '#2196F3',
      'Report': '#FF9800',
      'Medical': '#F44336',
      'School': '#9C27B0',
      'Therapy': '#00BCD4',
      'Other': '#757575',
    };
    return colors[type] || colors['Other'];
  };

  return (
    <TouchableOpacity onPress={onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>{getDocumentIcon(document.mimeType)}</Text>
            </View>
            <View style={styles.info}>
              <Text variant="titleMedium" numberOfLines={2}>
                {document.fileName}
              </Text>
              <Text variant="bodySmall" style={styles.date}>
                {formatDate(document.uploadedAt)}
              </Text>
            </View>
          </View>

          {document.documentType && (
            <Chip
              style={[
                styles.typeChip,
                { backgroundColor: getDocumentTypeColor(document.documentType) },
              ]}
              textStyle={styles.chipText}
            >
              {document.documentType}
            </Chip>
          )}

          {document.documentDate && (
            <Text variant="bodySmall" style={styles.documentDate}>
              Document Date: {formatDate(document.documentDate)}
            </Text>
          )}

          {document.source && (
            <Text variant="bodySmall" style={styles.source}>
              Source: {document.source}
            </Text>
          )}

          {document.syncStatus === 'pending' && (
            <Chip style={styles.syncChip} textStyle={styles.syncChipText}>
              Pending Sync
            </Chip>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  info: {
    flex: 1,
  },
  date: {
    color: '#666',
    marginTop: 4,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  chipText: {
    color: '#fff',
    fontSize: 12,
  },
  documentDate: {
    color: '#666',
    marginBottom: 4,
  },
  source: {
    color: '#666',
    marginBottom: 4,
  },
  syncChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFF3E0',
    marginTop: 8,
  },
  syncChipText: {
    color: '#F57C00',
    fontSize: 11,
  },
});
