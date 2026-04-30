import { useState } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Grid2 as Grid,
  Typography,
} from '@mui/material';
import MenuItemCard from './MenuItemCard';
import SearchInput from '@/components/common/SearchInput';

const MenuBrowser = ({ menu, onAddItem }) => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [search, setSearch] = useState('');

  const filteredMenu = menu.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter((cat) => cat.items.length > 0);

  // "All" tab shows every item across all categories
  const allItems = filteredMenu.flatMap((cat) => cat.items);
  const isAllTab = selectedTab === 0;
  const currentCategory = isAllTab ? null : filteredMenu[selectedTab - 1];
  const displayItems = isAllTab ? allItems : (currentCategory?.items || []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Search */}
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search menu..."
        />
      </Box>

      {/* Category tabs */}
      <Tabs
        value={Math.min(selectedTab, filteredMenu.length)}
        onChange={(_, v) => setSelectedTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          px: 1,
          minHeight: 40,
          '& .MuiTab-root': { minHeight: 40, py: 0.5, fontSize: '0.8rem' },
        }}
      >
        <Tab label="All" />
        {filteredMenu.map((cat) => (
          <Tab key={cat.id} label={cat.name} />
        ))}
      </Tabs>

      {/* Items grid */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 2, py: 1 }}>
        {displayItems.length > 0 ? (
          <Grid container spacing={1.5}>
            {displayItems.map((item) => (
              <Grid key={item.id} size={{ xs: 6, sm: 4, md: 4, lg: 3 }}>
                <MenuItemCard item={item} onAdd={onAddItem} />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Typography color="text.secondary">No items found</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MenuBrowser;
