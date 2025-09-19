import { db } from '../db';
import { ordersTable, shopsTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, or, and, isNull } from 'drizzle-orm';

export const getOrders = async (userId: string, role: string): Promise<Order[]> => {
  try {
    let results: any[];

    switch (role) {
      case 'customer':
        // Customers see only their own orders
        results = await db.select()
          .from(ordersTable)
          .where(eq(ordersTable.customer_id, userId))
          .execute();
        break;

      case 'shop':
        // Shops see orders for their products - need to join with shops table
        results = await db.select({
          orders: ordersTable
        })
          .from(ordersTable)
          .innerJoin(shopsTable, eq(ordersTable.shop_id, shopsTable.id))
          .where(eq(shopsTable.user_id, userId))
          .execute();
        break;

      case 'courier':
        // Couriers see available orders (no courier assigned) and their own assigned orders
        results = await db.select()
          .from(ordersTable)
          .where(
            or(
              isNull(ordersTable.courier_id),
              eq(ordersTable.courier_id, userId)
            )
          )
          .execute();
        break;

      case 'admin':
        // Admins see all orders
        results = await db.select()
          .from(ordersTable)
          .execute();
        break;

      default:
        // Unknown role - return empty array
        return [];
    }

    // Handle different result structures based on join
    return results.map(result => {
      // If shop role (joined), extract data from nested structure
      const orderData = role === 'shop' ? result.orders : result;

      return {
        ...orderData,
        total_amount: parseFloat(orderData.total_amount) // Convert numeric to number
      };
    });
  } catch (error) {
    console.error('Get orders failed:', error);
    throw error;
  }
};