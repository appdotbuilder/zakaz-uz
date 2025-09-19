import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  registerUserInputSchema,
  createShopInputSchema,
  createProductInputSchema,
  updateProductInputSchema,
  createOrderInputSchema,
  updateOrderStatusInputSchema,
  updateCourierLocationInputSchema,
  createRatingInputSchema,
  createNotificationInputSchema,
  userRoleSchema

} from './schema';

// Import handlers
import { registerUser } from './handlers/register_user';
import { createShop } from './handlers/create_shop';
import { getShops } from './handlers/get_shops';
import { getShopById } from './handlers/get_shop_by_id';
import { createProduct } from './handlers/create_product';
import { updateProduct } from './handlers/update_product';
import { getProducts } from './handlers/get_products';
import { getProductCategories } from './handlers/get_product_categories';
import { createOrder } from './handlers/create_order';
import { updateOrderStatus } from './handlers/update_order_status';
import { getOrders } from './handlers/get_orders';
import { acceptOrder } from './handlers/accept_order';
import { updateCourierLocation } from './handlers/update_courier_location';
import { getCourierLocation } from './handlers/get_courier_location';
import { createRating } from './handlers/create_rating';
import { getRatings } from './handlers/get_ratings';
import { createNotification } from './handlers/create_notification';
import { getNotifications } from './handlers/get_notifications';
import { markNotificationRead } from './handlers/mark_notification_read';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      message: 'ZakaZ server ishlamoqda' // "ZakaZ server is running" in Uzbek
    };
  }),

  // User authentication and management
  registerUser: publicProcedure
    .input(registerUserInputSchema)
    .mutation(({ input }) => registerUser(input)),

  // Shop management
  createShop: publicProcedure
    .input(createShopInputSchema.extend({
      userId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => createShop(input, input.userId)),

  getShops: publicProcedure
    .query(() => getShops()),

  getShopById: publicProcedure
    .input(z.object({ shopId: z.string() }))
    .query(({ input }) => getShopById(input.shopId)),

  // Product management
  createProduct: publicProcedure
    .input(createProductInputSchema.extend({
      shopId: z.string() // In real implementation, this would be derived from authenticated user's shop
    }))
    .mutation(({ input }) => createProduct(input, input.shopId)),

  updateProduct: publicProcedure
    .input(updateProductInputSchema.extend({
      userId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => updateProduct(input, input.userId)),

  getProducts: publicProcedure
    .input(z.object({
      shopId: z.string().optional(),
      categoryId: z.string().optional()
    }).optional())
    .query(({ input }) => getProducts(input?.shopId, input?.categoryId)),

  getProductCategories: publicProcedure
    .query(() => getProductCategories()),

  // Order management
  createOrder: publicProcedure
    .input(createOrderInputSchema.extend({
      customerId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => createOrder(input, input.customerId)),

  updateOrderStatus: publicProcedure
    .input(updateOrderStatusInputSchema.extend({
      userId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => updateOrderStatus(input, input.userId)),

  getOrders: publicProcedure
    .input(z.object({
      userId: z.string(), // In real implementation, this would come from authentication context
      role: userRoleSchema
    }))
    .query(({ input }) => getOrders(input.userId, input.role)),

  acceptOrder: publicProcedure
    .input(z.object({
      orderId: z.string(),
      courierId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => acceptOrder(input.orderId, input.courierId)),

  // Courier location tracking
  updateCourierLocation: publicProcedure
    .input(updateCourierLocationInputSchema.extend({
      courierId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => updateCourierLocation(input, input.courierId)),

  getCourierLocation: publicProcedure
    .input(z.object({ courierId: z.string() }))
    .query(({ input }) => getCourierLocation(input.courierId)),

  // Rating system
  createRating: publicProcedure
    .input(createRatingInputSchema.extend({
      userId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => createRating(input, input.userId)),

  getRatings: publicProcedure
    .input(z.object({
      targetType: z.enum(['shop', 'product', 'courier']),
      targetId: z.string()
    }))
    .query(({ input }) => getRatings(input.targetType, input.targetId)),

  // Notification system
  createNotification: publicProcedure
    .input(createNotificationInputSchema)
    .mutation(({ input }) => createNotification(input)),

  getNotifications: publicProcedure
    .input(z.object({
      userId: z.string() // In real implementation, this would come from authentication context
    }))
    .query(({ input }) => getNotifications(input.userId)),

  markNotificationRead: publicProcedure
    .input(z.object({
      notificationId: z.string(),
      userId: z.string() // In real implementation, this would come from authentication context
    }))
    .mutation(({ input }) => markNotificationRead(input.notificationId, input.userId)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      // Enable CORS for all origins (configure appropriately for production)
      cors({
        origin: process.env['CLIENT_URL'] || 'http://localhost:3000',
        credentials: true
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });

  server.listen(port);
  console.log(`🚀 ZakaZ TRPC server ${port}-portda ishlamoqda`); // "ZakaZ TRPC server running on port" in Uzbek
  console.log(`📱 Barcha xizmatlar Uzbek tilida taqdim etiladi`); // "All services are provided in Uzbek language" in Uzbek
}

start();