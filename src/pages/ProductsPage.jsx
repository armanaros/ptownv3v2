import { useState } from 'react';
import { Box, Grid2 as Grid, Alert } from '@mui/material';
import AppLayout from '@/components/layout/AppLayout';
import CategoryList from '@/components/products/CategoryList';
import ProductList from '@/components/products/ProductList';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useProducts from '@/hooks/useProducts';

export default function ProductsPage() {
  const { categories, products, lowStockProducts, loading } = useProducts();
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  if (loading) {
    return (
      <AppLayout>
        <LoadingSpinner />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Box sx={{ p: { xs: 2, md: 3 }, height: 'calc(100vh - 64px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {lowStockProducts.length > 0 && (
          <Alert severity="warning" sx={{ flexShrink: 0 }}>
            {lowStockProducts.length} product{lowStockProducts.length > 1 ? 's are' : ' is'} at or below reorder level.
          </Alert>
        )}

        <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
          {/* Category sidebar */}
          <Grid size={{ xs: 12, md: 3 }} sx={{ height: { md: '100%' } }}>
            <CategoryList
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </Grid>

          {/* Product grid */}
          <Grid size={{ xs: 12, md: 9 }} sx={{ height: { md: '100%' }, overflow: 'auto' }}>
            <ProductList
              products={products}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
            />
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}

