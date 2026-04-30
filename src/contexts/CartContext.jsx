import { createContext, useContext, useReducer, useCallback } from 'react';

const CartContext = createContext(null);

const initialState = {
  items: [],
  coupon: null,
  discount: 0,
  orderType: 'dine-in',
  tableNumber: '',
  customerName: '',
  customerPhone: '',
  deliveryAddress: '',
  notes: '',
  paymentMethod: 'cash',
};

const cartReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.menuItemId === action.payload.menuItemId);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.menuItemId === action.payload.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.payload, quantity: 1 }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.menuItemId !== action.payload) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items
          .map((i) =>
            i.menuItemId === action.payload.menuItemId
              ? { ...i, quantity: action.payload.quantity }
              : i
          )
          .filter((i) => i.quantity > 0),
      };
    case 'SET_SPECIAL_INSTRUCTIONS':
      return {
        ...state,
        items: state.items.map((i) =>
          i.menuItemId === action.payload.menuItemId
            ? { ...i, specialInstructions: action.payload.text }
            : i
        ),
      };
    case 'SET_COUPON':
      return { ...state, coupon: action.payload.coupon, discount: action.payload.discount };
    case 'CLEAR_COUPON':
      return { ...state, coupon: null, discount: 0 };
    case 'SET_ORDER_DETAILS':
      return { ...state, ...action.payload };
    case 'CLEAR_CART':
      return { ...initialState };
    default:
      return state;
  }
};

export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addItem = useCallback((item) => {
    dispatch({
      type: 'ADD_ITEM',
      payload: {
        menuItemId: item.id || item.menuItemId,
        name: item.name,
        unitPrice: item.price || item.unitPrice,
        categoryId: item.categoryId || '',
        categoryName: item.categoryName || '',
      },
    });
  }, []);

  const removeItem = useCallback((menuItemId) => {
    dispatch({ type: 'REMOVE_ITEM', payload: menuItemId });
  }, []);

  const updateQuantity = useCallback((menuItemId, quantity) => {
    dispatch({ type: 'UPDATE_QUANTITY', payload: { menuItemId, quantity } });
  }, []);

  const setSpecialInstructions = useCallback((menuItemId, text) => {
    dispatch({ type: 'SET_SPECIAL_INSTRUCTIONS', payload: { menuItemId, text } });
  }, []);

  const applyCoupon = useCallback((coupon, discount) => {
    dispatch({ type: 'SET_COUPON', payload: { coupon, discount } });
  }, []);

  const clearCoupon = useCallback(() => {
    dispatch({ type: 'CLEAR_COUPON' });
  }, []);

  const setOrderDetails = useCallback((details) => {
    dispatch({ type: 'SET_ORDER_DETAILS', payload: details });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR_CART' });
  }, []);

  const subtotal = state.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const total = Math.max(0, subtotal - state.discount);
  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);

  const value = {
    ...state,
    subtotal,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    setSpecialInstructions,
    applyCoupon,
    clearCoupon,
    setOrderDetails,
    clearCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};

export default CartContext;
