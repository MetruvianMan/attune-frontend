import React from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { List, IconButton, Text } from 'react-native-paper';
import { Document } from '../models';
import { documentService } from '../services/document-service';

export interface DocumentListProps {
  documents: Document[];
  onDocumentPress?: (document: Document) => void;
  onDocumentDelete?: (document: Document) => void;
  showDeleteButton?: boolean;
}

export function DocumentList({
  documents,
  onDocumentPress,
  onDocumentDelete,
  showDeleteButton = false,
}: DocumentListProps) {
  const handleDocumentPress = (document: Document) => {
    if (onDocumentPress) {
      onDocumentPress(document);
    }
  };

  const handleDelete = (document: Document) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${document.fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onDocumentDelete) {
              onDocumentDelete(document);
            }
          },
        },
      ]
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderDocument = ({ item }: { item: Document }) => {
    const icon = documentService.getDocumentIcon(item);
    const typeLabel = documentService.getDocumentTypeLabel(item);
    const sizeLabel = documentService.formatBytes(item.fileSize);
    const dateLabel = formatDate(item.uploadedAt);

    return (
      <TouchableOpacity
        onPress={() => handleDocumentPress(item)}
        disabled={!onDocumentPress}
      >
        <List.Item
          title={item.fileName}
          description={`${typeLabel} • ${sizeLabel} • ${dateLabel}`}
          left={(props) => <List.Icon {...props} icon={icon} />}
          right={(props) =>
            showDeleteButton ? (
              <IconButton
                {...props}
                icon="delete"
                onPress={() => handleDelete(item)}
              />
            ) : null
          }
          style={styles.listItem}
        />
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={documents}
      renderItem={renderDocument}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <IconButton icon="file-document-outline" size={48} iconColor="#ccc" />
          <Text style={styles.emptyText}>No documents yet</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 1,
  },
  listItem: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#999',
  },
});
