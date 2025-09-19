import { db } from '../db';
import { ordersTable, shopsTable, usersTable } from '../db/schema';
import { type UpdateOrderStatusInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export const updateOrderStatus = async (input: UpdateOrderStatusInput, userId: string): Promise<Order> => {
  try {
    // First, fetch the order with shop information to validate permissions
    const orderResults = await db.select({
      order: ordersTable,
      shop_user_id: shopsTable.user_id
    })
      .from(ordersTable)
      .innerJoin(shopsTable, eq(ordersTable.shop_id, shopsTable.id))
      .where(eq(ordersTable.id, input.order_id))
      .execute();

    if (orderResults.length === 0) {
      throw new Error('Order not found');
    }

    const { order, shop_user_id } = orderResults[0];

    // Validate permissions based on user role and current status
    const isShopOwner = shop_user_id === userId;
    const isCourier = order.courier_id === userId;

    if (!isShopOwner && !isCourier) {
      throw new Error('Insufficient permissions to update this order');
    }

    // Shop owners can update status until 'picked_up', couriers can update after 'ready'
    const shopStatuses = ['pending', 'confirmed', 'preparing', 'ready'];
    const courierStatuses = ['picked_up', 'on_the_way', 'delivered'];

    if (isShopOwner && !shopStatuses.includes(input.status)) {
      throw new Error('Shop owners can only update order status to: pending, confirmed, preparing, or ready');
    }

    if (isCourier && !courierStatuses.includes(input.status)) {
      throw new Error('Couriers can only update order status to: picked_up, on_the_way, or delivered');
    }

    // Prevent updating already delivered or cancelled orders (check this first)
    const currentStatus = order.status;
    if (currentStatus === 'delivered' || currentStatus === 'cancelled') {
      throw new Error('Cannot update status of delivered or cancelled orders');
    }

    // Additional validation: ensure logical status progression
    const statusProgression = [
      'pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'
    ];

    const currentIndex = statusProgression.indexOf(currentStatus);
    const newIndex = statusProgression.indexOf(input.status);

    // Allow backwards movement only for shop owners and only to earlier statuses
    if (newIndex < currentIndex && !isShopOwner) {
      throw new Error('Only shop owners can move order status backwards');
    }

    // Build update values
    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Add courier-specific fields
    if (isCourier && input.courier_notes !== undefined) {
      updateValues.courier_notes = input.courier_notes;
    }

    if (input.estimated_delivery_time !== undefined) {
      updateValues.estimated_delivery_time = input.estimated_delivery_time;
    }

    // Set actual delivery time when status is delivered
    if (input.status === 'delivered') {
      updateValues.actual_delivery_time = new Date();
    }

    // Update the order
    const result = await db.update(ordersTable)
      .set(updateValues)
      .where(eq(ordersTable.id, input.order_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Failed to update order');
    }

    // Convert numeric fields and return
    const updatedOrder = result[0];
    return {
      ...updatedOrder,
      total_amount: parseFloat(updatedOrder.total_amount)
    };

  } catch (error) {
    console.error('Order status update failed:', error);
    throw error;
  }
};