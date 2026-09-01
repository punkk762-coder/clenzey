import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Platform,
} from 'react-native';
import { HugeiconsIcon } from '@hugeicons/react-native';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { colors } from '@clenzey/design-system';
import { locationApi } from '../lib/api';
import {
  normalizePlaceDetails,
  normalizePlacePredictions,
} from '../utils/location-response';

/**
 * Data returned when a place is selected from the autocomplete list.
 */
export interface PlaceSearchResult {
  latitude: number;
  longitude: number;
  address: import('@clenzey/api-client').GeocodedAddress;
  labelSuggestion?: string;
}

interface PlaceSearchProps {
  /** Callback when a place is selected and its details are fetched */
  onPlaceSelect: (result: PlaceSearchResult) => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Use compact input sizing */
  compact?: boolean;
}

export function PlaceSearch({
  onPlaceSelect,
  placeholder = 'Search for a place...',
  compact = false,
}: PlaceSearchProps) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<ReturnType<typeof normalizePlacePredictions>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.trim().length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await locationApi.placesSearch(text.trim());
        const nextPredictions = normalizePlacePredictions(response);
        setPredictions(nextPredictions);
        setShowDropdown(nextPredictions.length > 0);
      } catch {
        setPredictions([]);
        setShowDropdown(false);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

  const handlePredictionSelect = useCallback(
    async (prediction: { placeId: string; description: string }) => {
      setQuery(prediction.description);
      setShowDropdown(false);
      setPredictions([]);
      setIsLoadingDetails(true);

      try {
        const response = await locationApi.placesDetails(prediction.placeId);
        const details = normalizePlaceDetails(response);
        if (details) {
          onPlaceSelect({
            ...details,
            labelSuggestion: prediction.description.split(',')[0]?.trim(),
          });
        }
      } finally {
        setIsLoadingDetails(false);
      }
    },
    [onPlaceSelect],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          showDropdown && styles.inputContainerOpen,
        ]}
      >
        <View style={styles.searchIcon}>
          <HugeiconsIcon
            icon={Search01Icon}
            size={compact ? 16 : 18}
            color={colors.textSecondary}
            strokeWidth={1.5}
          />
        </View>
        <TextInput
          style={[styles.input, compact && styles.inputCompact]}
          value={query}
          onChangeText={handleQueryChange}
          onFocus={() => {
            if (predictions.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          autoCorrect={false}
          returnKeyType="search"
        />
        {(isSearching || isLoadingDetails) && (
          <ActivityIndicator style={styles.loader} size="small" color={colors.primary} />
        )}
      </View>

      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item, index) => `${item.placeId}-${index}`}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            showsVerticalScrollIndicator
            bounces={false}
            style={styles.dropdownList}
            contentContainerStyle={styles.dropdownListContent}
            renderItem={({ item, index }) => (
              <View>
                <TouchableOpacity
                  style={styles.predictionItem}
                  onPress={() => handlePredictionSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.predictionText} numberOfLines={2}>
                    {item.description}
                  </Text>
                </TouchableOpacity>
                {index < predictions.length - 1 ? <View style={styles.separator} /> : null}
              </View>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 48,
  },
  inputContainerOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderColor: colors.primary,
  },
  searchIcon: {
    marginLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
    minHeight: 48,
  },
  inputCompact: {
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 40,
  },
  loader: {
    marginRight: 14,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
    zIndex: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#03045E',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {
        boxShadow: '0 8px 24px rgba(3, 4, 94, 0.12)',
      },
    }),
  },
  dropdownList: {
    flex: 1,
  },
  dropdownListContent: {
    paddingBottom: 4,
  },
  predictionItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  predictionText: {
    fontSize: 14,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
});
