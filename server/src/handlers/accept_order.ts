import { db } from '../db';
import { ordersTable, usersTable, notificationsTable, shopsTable } from '../db/schema';
import { type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const acceptOrder = async (orderId: string, courierId: string): Promise<Order> => {
  try {
    // Start a transaction to ensure data consistency
    return await db.transaction(async (tx) => {
      // 1. Validate courier exists and has courier role
      const courier = await tx.select()
        .from(usersTable)
        .where(and(
          eq(usersTable.id, courierId),
          eq(usersTable.role, 'courier'),
          eq(usersTable.is_active, true)
        ))
        .limit(1)
        .execute();

      if (courier.length === 0) {
        throw new Error('Courier not found or invalid');
      }

      // 2. Get the order and validate it's ready for pickup
      const existingOrders = await tx.select()
        .from(ordersTable)
        .where(eq(ordersTable.id, orderId))
        .limit(1)
        .execute();

      if (existingOrders.length === 0) {
        throw new Error('Order not found');
      }

      const existingOrder = existingOrders[0];

      if (existingOrder.courier_id !== null) {
        throw new Error('Order has already been accepted by another courier');
      }

      if (existingOrder.status !== 'ready') {
        throw new Error('Order is not ready for pickup');
      }

      // 3. Update the order with courier assignment
      const updatedOrders = await tx.update(ordersTable)
        .set({
          courier_id: courierId,
          status: 'picked_up',
          updated_at: new Date()
        })
        .where(eq(ordersTable.id, orderId))
        .returning()
        .execute();

      // 4. Get shop owner for notification
      const shop = await tx.select()
        .from(shopsTable)
        .where(eq(shopsTable.id, existingOrder.shop_id))
        .limit(1)
        .execute();

      if (shop.length === 0) {
        throw new Error('Shop not found');
      }

      // 5. Create notifications for customer and shop owner
      await tx.insert(notificationsTable)
        .values([
          {
            user_id: existingOrder.customer_id,
            title: 'Buyurtmangiz qabul qilindi',
            message: `Buyurtmangiz kuryer tomonidan qabul qilindi va tez orada yetkazib beriladi.`,
            type: 'order_update'
          },
          {
            user_id: shop[0].user_id,
            title: 'Buyurtma kuryer tomonidan qabul qilindi',
            message: `Buyurtma #${orderId.substring(0, 8)} kuryer tomonidan qabul qilindi.`,
            type: 'order_update'
          }
        ])
        .execute();

      // Convert numeric fields and return
      const updatedOrder = updatedOrders[0];
      return {
        ...updatedOrder,
        total_amount: parseFloat(updatedOrder.total_amount)
      };
    });
  } catch (error) {
    console.error('Order acceptance failed:', error);
    throw error;
  }
};