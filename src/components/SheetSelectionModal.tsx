import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { COLORS } from '../constants/design';
import { apiFetch } from '../api/client';
import { getStoredUser } from '../storage/auth';

interface Sheet {
  _id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: string;
}

interface SheetSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onSheetSelected: (sheetId: string, sheetName: string) => void;
}

export function SheetSelectionModal({ visible, onClose, onSheetSelected }: SheetSelectionModalProps) {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      fetchSheets();
    }
  }, [visible]);

  const fetchSheets = async () => {
    setLoading(true);
    try {
      const user = await getStoredUser();
      if (!user?.token) {
        throw new Error('User not authenticated');
      }

      const response = await apiFetch<Sheet[]>('/sheets', {
        token: user.token,
      });
      
      setSheets(response);
      
      // Auto-select default sheet if available
      const defaultSheet = response.find(sheet => sheet.isDefault);
      if (defaultSheet) {
        setSelectedSheetId(defaultSheet._id);
      }
    } catch (error) {
      console.error('Failed to fetch sheets:', error);
      Alert.alert('Error', 'Failed to load sheets. Please try again.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSheetPress = (sheet: Sheet) => {
    setSelectedSheetId(sheet._id);
  };

  const handleConfirmSelection = () => {
    if (!selectedSheetId) {
      Alert.alert('No Selection', 'Please select a sheet to merge your data into.');
      return;
    }

    const selectedSheet = sheets.find(sheet => sheet._id === selectedSheetId);
    if (selectedSheet) {
      onSheetSelected(selectedSheet._id, selectedSheet.name);
      onClose();
    }
  };

  const renderSheetItem = ({ item }: { item: Sheet }) => (
    <TouchableOpacity
      style={[
        styles.sheetItem,
        selectedSheetId === item._id && styles.selectedSheetItem
      ]}
      onPress={() => handleSheetPress(item)}
    >
      <View style={styles.sheetInfo}>
        <Text style={[
          styles.sheetName,
          selectedSheetId === item._id && styles.selectedSheetName
        ]}>
          {item.name}
        </Text>
        {item.description && (
          <Text style={styles.sheetDescription}>{item.description}</Text>
        )}
        {item.isDefault && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      <View style={[
        styles.radioButton,
        selectedSheetId === item._id && styles.selectedRadioButton
      ]}>
        {selectedSheetId === item._id && (
          <View style={styles.radioButtonInner} />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Select Sheet for Merge</Text>
          <Text style={styles.subtitle}>
            Choose which sheet to merge your guest data into
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading sheets...</Text>
          </View>
        ) : (
          <>
            <FlatList
              data={sheets}
              renderItem={renderSheetItem}
              keyExtractor={(item) => item._id}
              style={styles.sheetsList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No sheets found</Text>
                  <Text style={styles.emptySubtext}>
                    Create a sheet first to merge your data
                  </Text>
                </View>
              }
            />

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.confirmButton,
                  !selectedSheetId && styles.disabledButton
                ]}
                onPress={handleConfirmSelection}
                disabled={!selectedSheetId}
              >
                <Text style={styles.confirmButtonText}>
                  Merge Data
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 22,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  sheetsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedSheetItem: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  sheetInfo: {
    flex: 1,
  },
  sheetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  selectedSheetName: {
    color: COLORS.primary,
  },
  sheetDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  defaultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginLeft: 12,
  },
  selectedRadioButton: {
    borderColor: COLORS.primary,
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    alignSelf: 'center',
    marginTop: 3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
