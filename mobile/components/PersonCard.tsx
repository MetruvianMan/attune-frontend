import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Card, Text } from 'react-native-paper';
import { RelationshipPerson } from '../models';

interface PersonCardProps {
  person: RelationshipPerson;
  onPress?: () => void;
}

export function PersonCard({ person, onPress }: PersonCardProps) {
  const renderStrengthIndicator = (strength?: number) => {
    if (!strength) return null;
    
    const hearts = '❤️'.repeat(strength) + '🤍'.repeat(5 - strength);
    return <Text style={styles.strength}>{hearts}</Text>;
  };

  return (
    <TouchableOpacity onPress={onPress} disabled={!onPress}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.content}>
            <View style={styles.avatar}>
              {person.photoPath ? (
                <Image
                  source={{ uri: person.photoPath }}
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {person.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.info}>
              <Text variant="titleMedium" style={styles.name}>
                {person.name}
              </Text>
              <Text variant="bodyMedium" style={styles.role}>
                {person.role}
              </Text>
              {renderStrengthIndicator(person.relationshipStrength)}
            </View>
          </View>

          {person.notes && (
            <Text variant="bodySmall" style={styles.notes} numberOfLines={2}>
              {person.notes}
            </Text>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    marginRight: 16,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  role: {
    color: '#666',
    marginBottom: 4,
  },
  strength: {
    fontSize: 14,
  },
  notes: {
    marginTop: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});
