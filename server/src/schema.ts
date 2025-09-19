import { z } from 'zod';

// Uzbek phone number validation regex
const UZBEK_PHONE_REGEX = /^(\+998|998|0)?9\d{8}$/;

// User role enum
export const userRoleSchema = z.enum(['customer', 'shop', 'courier', 'admin']);
export type UserRole = z.infer<typeof userRoleSchema>;

// Order status enum
export const orderStatusSchema = z.enum(['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  username: z.string().nullable(),
  phone: z.string().regex(UZBEK_PHONE_REGEX, "Telefon raqami noto'g'ri formatda"),
  role: userRoleSchema,
  full_name: z.string(),
  avatar_url: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User registration input schema
export const registerUserInputSchema = z.object({
  email: z.string().email("Email manzili noto'g'ri formatda"),
  username: z.string().min(3, "Foydalanuvchi nomi kamida 3 ta belgidan iborat bo'lishi kerak").optional(),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
  phone: z.string().regex(UZBEK_PHONE_REGEX, "Telefon raqami noto'g'ri formatda"),
  role: userRoleSchema,
  full_name: z.string().min(2, "To'liq ism kamida 2 ta belgidan iborat bo'lishi kerak")
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// Shop schema
export const shopSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  address: z.string(),
  phone: z.string().regex(UZBEK_PHONE_REGEX),
  image_url: z.string().nullable(),
  is_active: z.boolean(),
  rating: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Shop = z.infer<typeof shopSchema>;

// Create shop input schema
export const createShopInputSchema = z.object({
  name: z.string().min(2, "Do'kon nomi kamida 2 ta belgidan iborat bo'lishi kerak"),
  description: z.string().nullable(),
  address: z.string().min(5, "Manzil kamida 5 ta belgidan iborat bo'lishi kerak"),
  phone: z.string().regex(UZBEK_PHONE_REGEX, "Telefon raqami noto'g'ri formatda"),
  image_url: z.string().url("Rasm havolasi noto'g'ri formatda").nullable()
});

export type CreateShopInput = z.infer<typeof createShopInputSchema>;

// Product category schema
export const productCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  created_at: z.coerce.date()
});

export type ProductCategory = z.infer<typeof productCategorySchema>;

// Product schema
export const productSchema = z.object({
  id: z.string(),
  shop_id: z.string(),
  category_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number().positive(),
  image_url: z.string().nullable(),
  quantity: z.number().int().nonnegative(),
  is_available: z.boolean(),
  rating: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Product = z.infer<typeof productSchema>;

// Create product input schema
export const createProductInputSchema = z.object({
  category_id: z.string().min(1, "Kategoriya tanlanishi kerak"),
  name: z.string().min(2, "Mahsulot nomi kamida 2 ta belgidan iborat bo'lishi kerak"),
  description: z.string().nullable(),
  price: z.number().positive("Narx musbat son bo'lishi kerak"),
  image_url: z.string().url("Rasm havolasi noto'g'ri formatda").nullable(),
  quantity: z.number().int().nonnegative("Miqdor manfiy bo'lishi mumkin emas")
});

export type CreateProductInput = z.infer<typeof createProductInputSchema>;

// Update product input schema
export const updateProductInputSchema = z.object({
  id: z.string(),
  category_id: z.string().optional(),
  name: z.string().min(2, "Mahsulot nomi kamida 2 ta belgidan iborat bo'lishi kerak").optional(),
  description: z.string().nullable().optional(),
  price: z.number().positive("Narx musbat son bo'lishi kerak").optional(),
  image_url: z.string().url("Rasm havolasi noto'g'ri formatda").nullable().optional(),
  quantity: z.number().int().nonnegative("Miqdor manfiy bo'lishi mumkin emas").optional(),
  is_available: z.boolean().optional()
});

export type UpdateProductInput = z.infer<typeof updateProductInputSchema>;

// Order schema
export const orderSchema = z.object({
  id: z.string(),
  customer_id: z.string(),
  shop_id: z.string(),
  courier_id: z.string().nullable(),
  status: orderStatusSchema,
  total_amount: z.number().positive(),
  delivery_address: z.string(),
  delivery_phone: z.string().regex(UZBEK_PHONE_REGEX),
  customer_notes: z.string().nullable(),
  courier_notes: z.string().nullable(),
  estimated_delivery_time: z.coerce.date().nullable(),
  actual_delivery_time: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Order = z.infer<typeof orderSchema>;

// Order item schema
export const orderItemSchema = z.object({
  id: z.string(),
  order_id: z.string(),
  product_id: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  total_price: z.number().positive(),
  created_at: z.coerce.date()
});

export type OrderItem = z.infer<typeof orderItemSchema>;

// Create order input schema
export const createOrderInputSchema = z.object({
  shop_id: z.string().min(1, "Do'kon tanlanishi kerak"),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().int().positive("Miqdor musbat butun son bo'lishi kerak")
  })).min(1, "Kamida bitta mahsulot tanlanishi kerak"),
  delivery_address: z.string().min(5, "Yetkazib berish manzili kamida 5 ta belgidan iborat bo'lishi kerak"),
  delivery_phone: z.string().regex(UZBEK_PHONE_REGEX, "Telefon raqami noto'g'ri formatda"),
  customer_notes: z.string().nullable()
});

export type CreateOrderInput = z.infer<typeof createOrderInputSchema>;

// Update order status input schema
export const updateOrderStatusInputSchema = z.object({
  order_id: z.string(),
  status: orderStatusSchema,
  courier_notes: z.string().nullable(),
  estimated_delivery_time: z.coerce.date().nullable()
});

export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusInputSchema>;

// Rating schema
export const ratingSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  target_type: z.enum(['shop', 'product', 'courier']),
  target_id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.coerce.date()
});

export type Rating = z.infer<typeof ratingSchema>;

// Create rating input schema
export const createRatingInputSchema = z.object({
  target_type: z.enum(['shop', 'product', 'courier']),
  target_id: z.string().min(1, "Baholanayotgan obyekt tanlanishi kerak"),
  rating: z.number().int().min(1, "Baho kamida 1 bo'lishi kerak").max(5, "Baho ko'pi bilan 5 bo'lishi kerak"),
  comment: z.string().max(500, "Sharh 500 ta belgidan oshmasligi kerak").nullable()
});

export type CreateRatingInput = z.infer<typeof createRatingInputSchema>;

// Courier location schema
export const courierLocationSchema = z.object({
  id: z.string(),
  courier_id: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number().nullable(),
  is_online: z.boolean(),
  last_updated: z.coerce.date()
});

export type CourierLocation = z.infer<typeof courierLocationSchema>;

// Update courier location input schema
export const updateCourierLocationInputSchema = z.object({
  latitude: z.number().min(-90).max(90, "Kenglik -90 dan 90 gacha bo'lishi kerak"),
  longitude: z.number().min(-180).max(180, "Uzunlik -180 dan 180 gacha bo'lishi kerak"),
  accuracy: z.number().positive().nullable(),
  is_online: z.boolean()
});

export type UpdateCourierLocationInput = z.infer<typeof updateCourierLocationInputSchema>;

// Notification schema
export const notificationSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  message: z.string(),
  type: z.enum(['order_update', 'new_order', 'rating', 'system']),
  is_read: z.boolean(),
  created_at: z.coerce.date()
});

export type Notification = z.infer<typeof notificationSchema>;

// Create notification input schema
export const createNotificationInputSchema = z.object({
  user_id: z.string(),
  title: z.string().min(1, "Sarlavha bo'sh bo'lishi mumkin emas"),
  message: z.string().min(1, "Xabar bo'sh bo'lishi mumkin emas"),
  type: z.enum(['order_update', 'new_order', 'rating', 'system'])
});

export type CreateNotificationInput = z.infer<typeof createNotificationInputSchema>;