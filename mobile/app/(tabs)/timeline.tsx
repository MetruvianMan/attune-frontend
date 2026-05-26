import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Text, FAB } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { EventCard } from '../../components/EventCard';
import { EventFilters, EventFilterOptions } from '../../components/EventFilters';
import { databaseService } from '../../services/database';
import { syncService } from '../../services/sync-service';
import { Event } from '../../models';

const PAGE_SIZE = 20;

export default function TimelineScreen() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [filters, setFilters] = useState<EventFilterOptions>({
    eventTypes: [],
    tags: [],
    dateRange: undefined,
  });
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // TODO: Get actual child profile ID from context/state
  const childProfileId = 'default-profile-id';

  useEffect(() => {
    loadEvents();
    loadAvailableTags();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [events, filters]);

  const loadEvents = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setIsLoading(true);
      }

      const allEvents = await databaseService.getEvents({
        childProfileId,
        limit: PAGE_SIZE * pageNum,
      });

      if (append) {
        setEvents(prev => [...prev, ...allEvents.slice(prev.length)]);
      } else {
        setEvents(allEvents);
      }

      setHasMore(allEvents.length === PAGE_SIZE * pageNum);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAvailableTags = async () => {
    try {
      const allEvents = await databaseService.getEvents({ childProfileId });
      const tagsSet = new Set<string>();
      allEvents.forEach(event => {
        event.tags?.forEach(tag => tagsSet.add(tag));
      });
      setAvailableTags(Array.from(tagsSet).sort());
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    // Filter by event types
    if (filters.eventTypes.length > 0) {
      filtered = filtered.filter(event => 
        filters.eventTypes.includes(event.eventType)
      );
    }

    // Filter by date range
    if (filters.dateRange) {
      const startTime = filters.dateRange.start.getTime();
      const endTime = filters.dateRange.end.getTime();
      filtered = filtered.filter(event => {
        const eventTime = new Date(event.timestamp).getTime();
        return eventTime >= startTime && eventTime <= endTime;
      });
    }

    // Filter by tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(event =>
        event.tags?.some(tag => filters.tags.includes(tag))
      );
    }

    setFilteredEvents(filtered);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await syncService.sync();
      await loadEvents(1, false);
      await loadAvailableTags();
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!isLoading && hasMore) {
      loadEvents(page + 1, true);
    }
  };

  const handleEventPress = (event: Event) => {
    router.push(`/event-detail?eventId=${event.id}`);
  };

  const handleNewEvent = () => {
    router.push('/event-form');
  };

  const renderEvent = ({ item }: { item: Event }) => (
    <EventCard event={item} onPress={() => handleEventPress(item)} />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="titleMedium" style={styles.emptyTitle}>
        No Events Yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptyMessage}>
        Start logging events to see them here
      </Text>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading || page === 1) return null;
    return (
      <View style={styles.footer}>
        <Text variant="bodySmall" style={styles.footerText}>
          Loading more...
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.filtersContainer}>
        <EventFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={availableTags}
        />
      </View>

      <FlatList
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleNewEvent}
        label="New Event"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  filtersContainer: {
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  emptyMessage: {
    color: '#666',
  },
  footer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#666',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
  },
});
