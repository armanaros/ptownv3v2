import { Card, CardContent, Typography, Box, Chip, CardMedia } from '@mui/material';
import { Restaurant } from '@mui/icons-material';
import { formatCurrency } from '@/utils/formatters';

const MenuItemCard = ({ item, onAdd }) => {
  const isLowStock = (item.stockLevel || 0) > 0 && (item.stockLevel || 0) <= (item.lowStockThreshold || 5);

  return (
    <Card
      onClick={() => onAdd(item)}
      sx={{
        cursor: 'pointer',
        height: '100%',
        transition: 'transform 0.15s, box-shadow 0.15s',
        opacity: item.isAvailable ? 1 : 0.5,
        pointerEvents: item.isAvailable ? 'auto' : 'none',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        },
        '&:active': {
          transform: 'scale(0.97)',
        },
      }}
    >
      {item.imageUrl ? (
        <CardMedia
          component="img"
          height="100"
          image={item.imageUrl}
          alt={item.name}
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box
          sx={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'action.hover',
          }}
        >
          <Restaurant sx={{ fontSize: 36, color: 'text.disabled' }} />
        </Box>
      )}
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.5 }}
          noWrap
        >
          {item.name}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
            {formatCurrency(item.price)}
          </Typography>
          {isLowStock && (
            <Chip label={`${item.stockLevel} left`} size="small" color="warning" sx={{ height: 22, fontSize: '0.7rem' }} />
          )}
          {!item.isAvailable && (
            <Chip label="Sold out" size="small" color="error" sx={{ height: 22, fontSize: '0.7rem' }} />
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default MenuItemCard;
