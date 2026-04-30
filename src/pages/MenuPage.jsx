import { useState } from 'react';
import { Box, Grid2 as Grid } from '@mui/material';
import AppLayout from '@/components/layout/AppLayout';
import CategoryList from '@/components/menu-management/CategoryList';
import MenuItemList from '@/components/menu-management/MenuItemList';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import useMenu from '@/hooks/useMenu';

export default function MenuPage() {
  const { categories, items, loading } = useMenu();
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
      <Box sx={{ p: { xs: 2, md: 3 }, height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Categories sidebar */}
          <Grid size={{ xs: 12, md: 3 }} sx={{ height: { md: '100%' } }}>
            <CategoryList
              categories={categories}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          </Grid>

          {/* Menu items */}
          <Grid size={{ xs: 12, md: 9 }} sx={{ height: { md: '100%' }, overflow: 'auto' }}>
            <MenuItemList
              items={items}
              categories={categories}
              selectedCategoryId={selectedCategoryId}
            />
          </Grid>
        </Grid>
      </Box>
    </AppLayout>
  );
}
