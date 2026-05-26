import React, { useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
  Dimensions,
  Alert,
} from 'react-native';
import { IconButton, ActivityIndicator } from 'react-native-paper';
import { Photo } from '../models';
import { photoService } from '../services/photo-service';

export interface PhotoGalleryProps {
  photos: Photo[];
  onPhotoPress?: (photo: Photo, index: number) => void;
  onPhotoDelete?: (photo: Photo) => void;
  showDeleteButton?: boolean;
  numColumns?: number;
  imageSize?: number;
}

export function PhotoGallery({
  photos,
  onPhotoPress,
  onPhotoDelete,
  showDeleteButton = false,
  numColumns = 3,
  imageSize = 100,
}: PhotoGalleryProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handlePhotoPress = (photo: Photo, index: number) => {
    if (onPhotoPress) {
      onPhotoPress(photo, index);
    } else {
      setSelectedPhoto(photo);
      setSelectedIndex(index);
    }
  };

  const handleDelete = (photo: Photo) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (onPhotoDelete) {
              onPhotoDelete(photo);
            }
          },
        },
      ]
    );
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <View style={[styles.photoContainer, { width: imageSize, height: imageSize }]}>
      <TouchableOpacity
        onPress={() => handlePhotoPress(item, index)}
        style={styles.photoTouchable}
      >
        <Image
          source={{ uri: photoService.getPhotoUri(item.filePath) }}
          style={styles.photo}
          resizeMode="cover"
        />
      </TouchableOpacity>
      
      {showDeleteButton && (
        <IconButton
          icon="close-circle"
          size={24}
          iconColor="#fff"
          style={styles.deleteButton}
          onPress={() => handleDelete(item)}
        />
      )}
    </View>
  );

  return (
    <>
      <FlatList
        data={photos}
        renderItem={renderPhoto}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.gallery}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <IconButton icon="image-off" size={48} iconColor="#ccc" />
          </View>
        }
      />

      {selectedPhoto && (
        <PhotoViewerModal
          photo={selectedPhoto}
          visible={!!selectedPhoto}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
}

interface PhotoViewerModalProps {
  photo: Photo;
  visible: boolean;
  onClose: () => void;
}

function PhotoViewerModal({ photo, visible, onClose }: PhotoViewerModalProps) {
  const { width, height } = Dimensions.get('window');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.modalBackground}
          activeOpacity={1}
          onPress={onClose}
        >
          <Image
            source={{ uri: photoService.getPhotoUri(photo.filePath) }}
            style={[
              styles.fullscreenPhoto,
              {
                width: width,
                height: height,
              },
            ]}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <IconButton
          icon="close"
          size={32}
          iconColor="#fff"
          style={styles.closeButton}
          onPress={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  gallery: {
    padding: 4,
  },
  photoContainer: {
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  photoTouchable: {
    flex: 1,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPhoto: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
});
