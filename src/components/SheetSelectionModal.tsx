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
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Plus, Pencil, Trash2, X, Check, ArrowRight } from 'lucide-react-native';
import { apiFetch } from '../api/client';
import { getStoredUser } from '../storage/auth';
import theme from '../theme/theme';

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
  
  // Create/Edit states
  const [isCreating, setIsCreating] = useState(false);
  const [isEditingId, setIsEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchSheets();
    } else {
      resetActions();
    }
  }, [visible]);

  const resetActions = () => {
    setIsCreating(false);
    setIsEditingId(null);
    setEditName('');
    setActionLoading(false);
  };

  const fetchSheets = async (autoSelect = true) => {
    setLoading(true);
    try {
      const user = await getStoredUser();
      if (!user?.token) {
        throw new Error('User not authenticated');
      }

      const response = await apiFetch<any[]>('/team/sheets', {
        token: user.token,
      });
      
      const formattedSheets: Sheet[] = response.map(s => ({
        _id: s.sheetId,
        name: s.sheetName,
        description: s.description || '',
        isDefault: s.isDefault,
        createdAt: new Date().toISOString(),
      }));

      setSheets(formattedSheets);
      
      if (autoSelect) {
        // Auto-select default sheet if available
        const defaultSheet = formattedSheets.find(sheet => sheet.isDefault);
        if (defaultSheet) {
          setSelectedSheetId(defaultSheet._id);
        } else if (formattedSheets.length > 0) {
          setSelectedSheetId(formattedSheets[0]._id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch sheets:', error);
      Alert.alert('Error', 'Failed to load sheets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    const name = editName.trim();
    if (!name) return;

    setActionLoading(true);
    try {
      const user = await getStoredUser();
      const created = await apiFetch<any>('/team/sheets', {
        method: 'POST',
        token: user?.token,
        body: JSON.stringify({ name }),
      });
      
      await fetchSheets(false);
      setSelectedSheetId(created.sheetId);
      resetActions();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create sheet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSheet = async (sheetId: string) => {
    const name = editName.trim();
    if (!name) return;

    setActionLoading(true);
    try {
      const user = await getStoredUser();
      await apiFetch(`/team/sheets/${sheetId}`, {
        method: 'PATCH',
        token: user?.token,
        body: JSON.stringify({ name }),
      });
      
      await fetchSheets(false);
      resetActions();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update sheet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSheet = async (sheetId: string) => {
    Alert.alert(
      'Delete Workspace?',
      'All transactions and data in this sheet will be permanently deleted. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const user = await getStoredUser();
              await apiFetch(`/team/sheets/${sheetId}`, {
                method: 'DELETE',
                token: user?.token,
              });
              
              if (selectedSheetId === sheetId) setSelectedSheetId(null);
              await fetchSheets(true);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete sheet');
            } finally {
              setActionLoading(false);
            }
          }
        }
      ]
    );
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

  const renderSheetItem = ({ item }: { item: Sheet }) => {
    const isEditing = isEditingId === item._id;
    const isSelected = selectedSheetId === item._id;

    if (isEditing) {
      return (
        <View style={[styles.sheetItem, styles.editingItem]}>
          <TextInput
            style={styles.editInput}
            value={editName}
            onChangeText={setEditName}
            autoFocus
            placeholder="Workspace Name"
          />
          <View style={styles.actionRow}>
            <TouchableOpacity onPress={() => handleUpdateSheet(item._id)} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator size="small" color={theme.COLORS.primary} /> : <Check size={20} color={theme.COLORS.success} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={resetActions}>
              <X size={20} color={theme.COLORS.text3} />
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={[
          styles.sheetItem,
          isSelected && styles.selectedSheetItem
        ]}
        onPress={() => handleSheetPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.sheetInfo}>
          <Text style={[
            styles.sheetName,
            isSelected && styles.selectedSheetName
          ]}>
            {item.name}
          </Text>
          {item.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>Default</Text>
            </View>
          )}
        </View>

        <View style={styles.itemActions}>
          <TouchableOpacity 
            onPress={() => {
              setIsEditingId(item._id);
              setEditName(item.name);
            }}
            style={styles.iconBtn}
          >
            <Pencil size={18} color={theme.COLORS.text3} />
          </TouchableOpacity>
          
          {!item.isDefault && (
            <TouchableOpacity 
              onPress={() => handleDeleteSheet(item._id)}
              style={styles.iconBtn}
            >
              <Trash2 size={18} color={theme.COLORS.error} />
            </TouchableOpacity>
          )}

          <View style={[
            styles.radioButton,
            isSelected && styles.selectedRadioButton
          ]}>
            {isSelected && (
              <View style={styles.radioButtonInner} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={styles.title}>Workspaces</Text>
                <Text style={styles.subtitle}>Select where to merge your data</Text>
              </View>
              <TouchableOpacity 
                style={styles.addBtn}
                onPress={() => {
                  setIsCreating(true);
                  setEditName('');
                }}
              >
                <Plus size={24} color={theme.COLORS.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.COLORS.primary} />
              <Text style={styles.loadingText}>Loading workspaces...</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={sheets}
                renderItem={renderSheetItem}
                keyExtractor={(item) => item._id}
                style={styles.sheetsList}
                contentContainerStyle={{ paddingBottom: 100 }}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                  isCreating ? (
                    <View style={[styles.sheetItem, styles.createCard]}>
                      <TextInput
                        style={styles.editInput}
                        value={editName}
                        onChangeText={setEditName}
                        autoFocus
                        placeholder="New Workspace Name"
                      />
                      <TouchableOpacity 
                        style={styles.createBtn}
                        onPress={handleCreateSheet}
                        disabled={actionLoading || !editName.trim()}
                      >
                        {actionLoading ? <ActivityIndicator size="small" color="#fff" /> : <ArrowRight size={20} color="#fff" />}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={resetActions} style={{ marginLeft: 10 }}>
                        <X size={20} color={theme.COLORS.text3} />
                      </TouchableOpacity>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No workspaces yet</Text>
                    <TouchableOpacity 
                      style={styles.initBtn}
                      onPress={() => {
                        setEditName('Personal Workspace');
                        handleCreateSheet();
                      }}
                    >
                      <Text style={styles.initBtnText}>Create Default Workspace</Text>
                    </TouchableOpacity>
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
                    (!selectedSheetId || actionLoading) && styles.disabledButton
                  ]}
                  onPress={handleConfirmSelection}
                  disabled={!selectedSheetId || actionLoading}
                >
                  <Text style={styles.confirmButtonText}>
                    Confirm & Merge
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: theme.COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.COLORS.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...theme.TYPOGRAPHY.h2,
    color: theme.COLORS.text,
  },
  subtitle: {
    ...theme.TYPOGRAPHY.bodySmall,
    color: theme.COLORS.text3,
  },
  addBtn: {
    padding: 8,
    backgroundColor: theme.COLORS.primary + '15',
    borderRadius: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...theme.TYPOGRAPHY.body,
    marginTop: 12,
    color: theme.COLORS.text3,
  },
  sheetsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.COLORS.border,
    ...theme.SHADOWS.sm,
  },
  selectedSheetItem: {
    borderColor: theme.COLORS.primary,
    backgroundColor: theme.COLORS.primary + '05',
  },
  editingItem: {
    borderColor: theme.COLORS.primary,
    backgroundColor: theme.COLORS.surface,
  },
  createCard: {
    borderStyle: 'dashed',
    borderColor: theme.COLORS.primary,
    backgroundColor: theme.COLORS.primary + '03',
  },
  sheetInfo: {
    flex: 1,
  },
  sheetName: {
    ...theme.TYPOGRAPHY.bodyBold,
    color: theme.COLORS.text,
  },
  selectedSheetName: {
    color: theme.COLORS.primary,
  },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.COLORS.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  defaultBadgeText: {
    ...theme.TYPOGRAPHY.caption,
    color: theme.COLORS.success,
    fontWeight: '800',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editInput: {
    flex: 1,
    ...theme.TYPOGRAPHY.body,
    color: theme.COLORS.text,
    padding: 0,
  },
  createBtn: {
    backgroundColor: theme.COLORS.primary,
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  selectedRadioButton: {
    borderColor: theme.COLORS.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.COLORS.primary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    ...theme.TYPOGRAPHY.h3,
    color: theme.COLORS.text3,
    marginBottom: 20,
  },
  initBtn: {
    backgroundColor: theme.COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  initBtnText: {
    ...theme.TYPOGRAPHY.buttonText,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: theme.COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: theme.COLORS.border,
    gap: 12,
  },
  button: {
    flex: 1,
    ...theme.COMPONENT_STYLES.button,
  },
  cancelButton: {
    ...theme.COMPONENT_STYLES.buttonGhost,
    backgroundColor: theme.COLORS.surface2,
  },
  cancelButtonText: {
    ...theme.TYPOGRAPHY.buttonText,
    color: theme.COLORS.text2,
  },
  confirmButton: {
    backgroundColor: theme.COLORS.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmButtonText: {
    ...theme.TYPOGRAPHY.buttonText,
  },
});
