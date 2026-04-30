import { useState, useEffect } from 'react';
import {
  subscribeToCategories,
  subscribeToItems,
} from '@/services/menu.service';
import logger from '@/utils/logger';

const useMenu = () => {
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let catLoaded = false;
    let itemsLoaded = false;

    const checkDone = () => {
      if (catLoaded && itemsLoaded) setLoading(false);
    };

    const unsubCategories = subscribeToCategories((cats) => {
      setCategories(cats);
      catLoaded = true;
      checkDone();
    });

    const unsubItems = subscribeToItems((its) => {
      setItems(its);
      itemsLoaded = true;
      checkDone();
    });

    return () => {
      unsubCategories();
      unsubItems();
    };
  }, []);

  // Group items by category
  const fullMenu = categories.map((cat) => ({
    ...cat,
    items: items
      .filter((item) => String(item.categoryId) === String(cat.id))
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
  }));

  // Available items only (for POS)
  const availableMenu = fullMenu
    .filter((cat) => cat.isActive !== false)
    .map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (item) => item.isAvailable && item.isActive !== false && item.availableOnPOS !== false
      ),
    }))
    .filter((cat) => cat.items.length > 0);

  return {
    categories,
    items,
    fullMenu,
    availableMenu,
    loading,
  };
};

export default useMenu;
