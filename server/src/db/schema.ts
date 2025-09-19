import { pgTable, text, uuid, timestamp, boolean, numeric, integer, real, pgEnum, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['customer', 'shop', 'courier', 'admin']);
export const orderStatusEnum = pgEnum('order_status', ['pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled']);
export const ratingTargetTypeEnum = pgEnum('rating_target_type', ['shop', 'product', 'courier']);
export const notificationTypeEnum = pgEnum('notification_type', ['order_update', 'new_order', 'rating', 'system']);

// Users table
export const usersTable = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  phone: text('phone').notNull().unique(),
  role: userRoleEnum('role').notNull(),
  full_name: text('full_name').notNull(),
  avatar_url: text('avatar_url'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Uzbek phone number format constraint
  phoneCheck: check('phone_check', sql`phone ~ '^(\\+998|998|0)?9\\d{8}$'`)
}));

// Shops table
export const shopsTable = pgTable('shops', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  address: text('address').notNull(),
  phone: text('phone').notNull(),
  image_url: text('image_url'),
  is_active: boolean('is_active').default(true).notNull(),
  rating: real('rating').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Uzbek phone number format constraint for shop
  phoneCheck: check('shop_phone_check', sql`phone ~ '^(\\+998|998|0)?9\\d{8}$'`)
}));

// Product categories table
export const productCategoriesTable = pgTable('product_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Products table
export const productsTable = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  shop_id: uuid('shop_id').notNull().references(() => shopsTable.id, { onDelete: 'cascade' }),
  category_id: uuid('category_id').notNull().references(() => productCategoriesTable.id),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  image_url: text('image_url'),
  quantity: integer('quantity').notNull().default(0),
  is_available: boolean('is_available').default(true).notNull(),
  rating: real('rating').default(0).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Orders table
export const ordersTable = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  customer_id: uuid('customer_id').notNull().references(() => usersTable.id),
  shop_id: uuid('shop_id').notNull().references(() => shopsTable.id),
  courier_id: uuid('courier_id').references(() => usersTable.id),
  status: orderStatusEnum('status').default('pending').notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  delivery_address: text('delivery_address').notNull(),
  delivery_phone: text('delivery_phone').notNull(),
  customer_notes: text('customer_notes'),
  courier_notes: text('courier_notes'),
  estimated_delivery_time: timestamp('estimated_delivery_time'),
  actual_delivery_time: timestamp('actual_delivery_time'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Uzbek phone number format constraint for delivery
  deliveryPhoneCheck: check('delivery_phone_check', sql`delivery_phone ~ '^(\\+998|998|0)?9\\d{8}$'`)
}));

// Order items table
export const orderItemsTable = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id').notNull().references(() => ordersTable.id, { onDelete: 'cascade' }),
  product_id: uuid('product_id').notNull().references(() => productsTable.id),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total_price: numeric('total_price', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Ratings table
export const ratingsTable = pgTable('ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id),
  target_type: ratingTargetTypeEnum('target_type').notNull(),
  target_id: uuid('target_id').notNull(),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Rating must be between 1 and 5
  ratingCheck: check('rating_check', sql`rating >= 1 AND rating <= 5`)
}));

// Courier locations table
export const courierLocationsTable = pgTable('courier_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  courier_id: uuid('courier_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }).unique(),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  accuracy: real('accuracy'),
  is_online: boolean('is_online').default(false).notNull(),
  last_updated: timestamp('last_updated').defaultNow().notNull()
}, (table) => ({
  // Latitude constraint
  latitudeCheck: check('latitude_check', sql`latitude >= -90 AND latitude <= 90`),
  // Longitude constraint
  longitudeCheck: check('longitude_check', sql`longitude >= -180 AND longitude <= 180`)
}));

// Notifications table
export const notificationsTable = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: notificationTypeEnum('type').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  shop: one(shopsTable, {
    fields: [usersTable.id],
    references: [shopsTable.user_id]
  }),
  customerOrders: many(ordersTable, {
    relationName: 'customerOrders'
  }),
  courierOrders: many(ordersTable, {
    relationName: 'courierOrders'
  }),
  courierLocation: one(courierLocationsTable),
  ratings: many(ratingsTable),
  notifications: many(notificationsTable)
}));

export const shopsRelations = relations(shopsTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [shopsTable.user_id],
    references: [usersTable.id]
  }),
  products: many(productsTable),
  orders: many(ordersTable)
}));

export const productCategoriesRelations = relations(productCategoriesTable, ({ many }) => ({
  products: many(productsTable)
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  shop: one(shopsTable, {
    fields: [productsTable.shop_id],
    references: [shopsTable.id]
  }),
  category: one(productCategoriesTable, {
    fields: [productsTable.category_id],
    references: [productCategoriesTable.id]
  }),
  orderItems: many(orderItemsTable)
}));

export const ordersRelations = relations(ordersTable, ({ one, many }) => ({
  customer: one(usersTable, {
    fields: [ordersTable.customer_id],
    references: [usersTable.id],
    relationName: 'customerOrders'
  }),
  courier: one(usersTable, {
    fields: [ordersTable.courier_id],
    references: [usersTable.id],
    relationName: 'courierOrders'
  }),
  shop: one(shopsTable, {
    fields: [ordersTable.shop_id],
    references: [shopsTable.id]
  }),
  items: many(orderItemsTable)
}));

export const orderItemsRelations = relations(orderItemsTable, ({ one }) => ({
  order: one(ordersTable, {
    fields: [orderItemsTable.order_id],
    references: [ordersTable.id]
  }),
  product: one(productsTable, {
    fields: [orderItemsTable.product_id],
    references: [productsTable.id]
  })
}));

export const ratingsRelations = relations(ratingsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [ratingsTable.user_id],
    references: [usersTable.id]
  })
}));

export const courierLocationsRelations = relations(courierLocationsTable, ({ one }) => ({
  courier: one(usersTable, {
    fields: [courierLocationsTable.courier_id],
    references: [usersTable.id]
  })
}));

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [notificationsTable.user_id],
    references: [usersTable.id]
  })
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Shop = typeof shopsTable.$inferSelect;
export type NewShop = typeof shopsTable.$inferInsert;

export type ProductCategory = typeof productCategoriesTable.$inferSelect;
export type NewProductCategory = typeof productCategoriesTable.$inferInsert;

export type Product = typeof productsTable.$inferSelect;
export type NewProduct = typeof productsTable.$inferInsert;

export type Order = typeof ordersTable.$inferSelect;
export type NewOrder = typeof ordersTable.$inferInsert;

export type OrderItem = typeof orderItemsTable.$inferSelect;
export type NewOrderItem = typeof orderItemsTable.$inferInsert;

export type Rating = typeof ratingsTable.$inferSelect;
export type NewRating = typeof ratingsTable.$inferInsert;

export type CourierLocation = typeof courierLocationsTable.$inferSelect;
export type NewCourierLocation = typeof courierLocationsTable.$inferInsert;

export type Notification = typeof notificationsTable.$inferSelect;
export type NewNotification = typeof notificationsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  shops: shopsTable,
  productCategories: productCategoriesTable,
  products: productsTable,
  orders: ordersTable,
  orderItems: orderItemsTable,
  ratings: ratingsTable,
  courierLocations: courierLocationsTable,
  notifications: notificationsTable
};