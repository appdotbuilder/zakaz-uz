import { db } from '../db';
import { ordersTable, orderItemsTable, productsTable, shopsTable, usersTable, notificationsTable } from '../db/schema';
import { type CreateOrderInput, type Order } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function createOrder(input: CreateOrderInput, customerId: string): Promise<Order> {
  try {
    // Validate that customer exists and is active
    const customer = await db.select()
      .from(usersTable)
      .where(and(eq(usersTable.id, customerId), eq(usersTable.is_active, true)))
      .execute();

    if (customer.length === 0) {
      throw new Error('Customer not found or inactive');
    }

    // Validate that shop exists and is active
    const shop = await db.select()
      .from(shopsTable)
      .where(and(eq(shopsTable.id, input.shop_id), eq(shopsTable.is_active, true)))
      .execute();

    if (shop.length === 0) {
      throw new Error('Shop not found or inactive');
    }

    // Get all products in the order and validate availability
    const productIds = input.items.map(item => item.product_id);
    const products = await db.select()
      .from(productsTable)
      .where(and(
        eq(productsTable.shop_id, input.shop_id),
        eq(productsTable.is_available, true)
      ))
      .execute();

    // Create a map for quick product lookup
    const productMap = new Map(products.map(p => [p.id, p]));

    // Validate each item and calculate total
    let totalAmount = 0;
    const orderItemsToCreate = [];

    for (const item of input.items) {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new Error(`Product ${item.product_id} not found or not available in this shop`);
      }

      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.name}. Available: ${product.quantity}, requested: ${item.quantity}`);
      }

      const unitPrice = parseFloat(product.price);
      const itemTotalPrice = unitPrice * item.quantity;
      totalAmount += itemTotalPrice;

      orderItemsToCreate.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: unitPrice.toString(),
        total_price: itemTotalPrice.toString()
      });
    }

    // Create the order
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        shop_id: input.shop_id,
        total_amount: totalAmount.toString(),
        delivery_address: input.delivery_address,
        delivery_phone: input.delivery_phone,
        customer_notes: input.customer_notes
      })
      .returning()
      .execute();

    const order = orderResult[0];

    // Create order items
    const orderItemsWithOrderId = orderItemsToCreate.map(item => ({
      ...item,
      order_id: order.id
    }));

    await db.insert(orderItemsTable)
      .values(orderItemsWithOrderId)
      .execute();

    // Update product quantities
    for (const item of input.items) {
      const product = productMap.get(item.product_id)!;
      await db.update(productsTable)
        .set({ quantity: product.quantity - item.quantity })
        .where(eq(productsTable.id, item.product_id))
        .execute();
    }

    // Send notification to shop owner
    await db.insert(notificationsTable)
      .values({
        user_id: shop[0].user_id,
        title: 'Yangi buyurtma',
        message: `Sizga ${customer[0].full_name} tomonidan yangi buyurtma keldi. Umumiy summa: ${totalAmount.toLocaleString()} so'm`,
        type: 'new_order'
      })
      .execute();

    // Return the created order with converted numeric fields
    return {
      ...order,
      total_amount: parseFloat(order.total_amount)
    };
  } catch (error) {
    console.error('Order creation failed:', error);
    throw error;
  }
}