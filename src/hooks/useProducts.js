import { useState, useEffect } from 'react';
import { subscribeToCategories, subscribeToProducts } from '@/services/product.service';
import logger from '@/utils/logger';

const useProducts = () => {
  const [categories, setCategories] = useState([]);
  const [products, setProducts]     = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let catsReady  = false;
    let prodsReady = false;

    const done = () => { if (catsReady && prodsReady) setLoading(false); };

    const unsubCats = subscribeToCategories((cats) => {
      setCategories(cats);
      catsReady = true;
      done();
    });

    const unsubProds = subscribeToProducts((prods) => {
      setProducts(prods);
      prodsReady = true;
      done();
    });

    return () => { unsubCats(); unsubProds(); };
  }, []);

  const lowStockProducts = products.filter(
    (p) => p.isActive !== false && p.stockLevel <= (p.reorderLevel ?? 10)
  );

  const getCategory = (catId) => categories.find((c) => c.id === catId) || null;

  return { categories, products, lowStockProducts, loading, getCategory };
};

export default useProducts;
