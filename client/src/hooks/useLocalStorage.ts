
import { useState, useEffect } from 'react';
import { LocalStorageManager, type StoredWardrobeItem, type StoredOutfit } from '@/lib/localStorage';

export function useLocalStorageWardrobe() {
  const [items, setItems] = useState<StoredWardrobeItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedItems = LocalStorageManager.getWardrobeItems();
    setItems(storedItems);
    setIsLoaded(true);
  }, []);

  const addItem = (item: StoredWardrobeItem) => {
    const newItems = [...items, item];
    setItems(newItems);
    LocalStorageManager.saveWardrobeItems(newItems);
  };

  const removeItem = (id: number) => {
    const newItems = items.filter(item => item.id !== id);
    setItems(newItems);
    LocalStorageManager.saveWardrobeItems(newItems);
  };

  const updateItem = (id: number, updates: Partial<StoredWardrobeItem>) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, ...updates } : item
    );
    setItems(newItems);
    LocalStorageManager.saveWardrobeItems(newItems);
  };

  const clearAll = () => {
    setItems([]);
    LocalStorageManager.saveWardrobeItems([]);
  };

  return {
    items,
    isLoaded,
    addItem,
    removeItem,
    updateItem,
    clearAll
  };
}

export function useLocalStorageOutfits() {
  const [outfits, setOutfits] = useState<StoredOutfit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedOutfits = LocalStorageManager.getOutfits();
    setOutfits(storedOutfits);
    setIsLoaded(true);
  }, []);

  const addOutfit = (outfit: StoredOutfit) => {
    const newOutfits = [...outfits, outfit];
    setOutfits(newOutfits);
    LocalStorageManager.saveOutfits(newOutfits);
  };

  const removeOutfit = (id: number) => {
    const newOutfits = outfits.filter(outfit => outfit.id !== id);
    setOutfits(newOutfits);
    LocalStorageManager.saveOutfits(newOutfits);
  };

  const clearAll = () => {
    setOutfits([]);
    LocalStorageManager.saveOutfits([]);
  };

  return {
    outfits,
    isLoaded,
    addOutfit,
    removeOutfit,
    clearAll
  };
}
