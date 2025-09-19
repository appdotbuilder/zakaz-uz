import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  shopsTable, 
  productsTable, 
  productCategoriesTable,
  ordersTable,
  orderItemsTable,
  ratingsTable 
} from '../db/schema';
import { type CreateRatingInput } from '../schema';
import { createRating } from '../handlers/create_rating';
import { eq, and } from 'drizzle-orm';

describe('createRating', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let customerId: string;
  let shopId: string;
  let productId: string;
  let courierId: string;
  let categoryId: string;
  let orderId: string;

  beforeEach(async () => {
    // Create test users
    const customerResult = await db.insert(usersTable)
      .values({
        email: 'customer@test.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test Customer'
      })
      .returning()
      .execute();
    customerId = customerResult[0].id;

    const shopOwnerResult = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    const courierResult = await db.insert(usersTable)
      .values({
        email: 'courier@test.com',
        phone: '+998901234569',
        role: 'courier',
        full_name: 'Test Courier'
      })
      .returning()
      .execute();
    courierId = courierResult[0].id;

    // Create test shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: shopOwnerResult[0].id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234568'
      })
      .returning()
      .execute();
    shopId = shopResult[0].id;

    // Create test category
    const categoryResult = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();
    categoryId = categoryResult[0].id;

    // Create test product
    const productResult = await db.insert(productsTable)
      .values({
        shop_id: shopId,
        category_id: categoryId,
        name: 'Test Product',
        price: '19.99',
        quantity: 10
      })
      .returning()
      .execute();
    productId = productResult[0].id;

    // Create delivered order for interaction validation
    const orderResult = await db.insert(ordersTable)
      .values({
        customer_id: customerId,
        shop_id: shopId,
        courier_id: courierId,
        status: 'delivered',
        total_amount: '19.99',
        delivery_address: 'Test Delivery Address',
        delivery_phone: '+998901234567'
      })
      .returning()
      .execute();
    orderId = orderResult[0].id;

    // Create order item
    await db.insert(orderItemsTable)
      .values({
        order_id: orderId,
        product_id: productId,
        quantity: 1,
        unit_price: '19.99',
        total_price: '19.99'
      })
      .execute();
  });

  describe('shop rating', () => {
    it('should create a rating for shop', async () => {
      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: shopId,
        rating: 5,
        comment: 'Excellent shop!'
      };

      const result = await createRating(input, customerId);

      expect(result.user_id).toEqual(customerId);
      expect(result.target_type).toEqual('shop');
      expect(result.target_id).toEqual(shopId);
      expect(result.rating).toEqual(5);
      expect(result.comment).toEqual('Excellent shop!');
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should update shop average rating', async () => {
      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: shopId,
        rating: 4,
        comment: null
      };

      await createRating(input, customerId);

      const shops = await db.select()
        .from(shopsTable)
        .where(eq(shopsTable.id, shopId))
        .execute();

      expect(shops[0].rating).toEqual(4);
    });

    it('should save rating to database', async () => {
      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: shopId,
        rating: 3,
        comment: 'Good service'
      };

      const result = await createRating(input, customerId);

      const ratings = await db.select()
        .from(ratingsTable)
        .where(eq(ratingsTable.id, result.id))
        .execute();

      expect(ratings).toHaveLength(1);
      expect(ratings[0].user_id).toEqual(customerId);
      expect(ratings[0].target_type).toEqual('shop');
      expect(ratings[0].rating).toEqual(3);
      expect(ratings[0].comment).toEqual('Good service');
    });
  });

  describe('product rating', () => {
    it('should create a rating for product', async () => {
      const input: CreateRatingInput = {
        target_type: 'product',
        target_id: productId,
        rating: 4,
        comment: 'Great product!'
      };

      const result = await createRating(input, customerId);

      expect(result.target_type).toEqual('product');
      expect(result.target_id).toEqual(productId);
      expect(result.rating).toEqual(4);
      expect(result.comment).toEqual('Great product!');
    });

    it('should update product average rating', async () => {
      const input: CreateRatingInput = {
        target_type: 'product',
        target_id: productId,
        rating: 5,
        comment: null
      };

      await createRating(input, customerId);

      const products = await db.select()
        .from(productsTable)
        .where(eq(productsTable.id, productId))
        .execute();

      expect(products[0].rating).toEqual(5);
    });
  });

  describe('courier rating', () => {
    it('should create a rating for courier', async () => {
      const input: CreateRatingInput = {
        target_type: 'courier',
        target_id: courierId,
        rating: 4,
        comment: 'Fast delivery!'
      };

      const result = await createRating(input, customerId);

      expect(result.target_type).toEqual('courier');
      expect(result.target_id).toEqual(courierId);
      expect(result.rating).toEqual(4);
      expect(result.comment).toEqual('Fast delivery!');
    });

    it('should not update courier table rating (handled separately)', async () => {
      const input: CreateRatingInput = {
        target_type: 'courier',
        target_id: courierId,
        rating: 5,
        comment: null
      };

      await createRating(input, customerId);

      // Verify rating is stored in ratings table
      const ratings = await db.select()
        .from(ratingsTable)
        .where(and(
          eq(ratingsTable.target_type, 'courier'),
          eq(ratingsTable.target_id, courierId)
        ))
        .execute();

      expect(ratings).toHaveLength(1);
      expect(ratings[0].rating).toEqual(5);
    });
  });

  describe('validation', () => {
    it('should throw error for non-existent shop', async () => {
      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: '00000000-0000-0000-0000-000000000000',
        rating: 5,
        comment: null
      };

      await expect(createRating(input, customerId)).rejects.toThrow(/shop topilmadi/i);
    });

    it('should throw error for non-existent product', async () => {
      const input: CreateRatingInput = {
        target_type: 'product',
        target_id: '00000000-0000-0000-0000-000000000000',
        rating: 4,
        comment: null
      };

      await expect(createRating(input, customerId)).rejects.toThrow(/product topilmadi/i);
    });

    it('should throw error for non-existent courier', async () => {
      const input: CreateRatingInput = {
        target_type: 'courier',
        target_id: '00000000-0000-0000-0000-000000000000',
        rating: 3,
        comment: null
      };

      await expect(createRating(input, customerId)).rejects.toThrow(/courier topilmadi/i);
    });

    it('should throw error for user not courier role when rating courier', async () => {
      const input: CreateRatingInput = {
        target_type: 'courier',
        target_id: customerId, // customerId has role 'customer', not 'courier'
        rating: 4,
        comment: null
      };

      await expect(createRating(input, customerId)).rejects.toThrow(/courier topilmadi/i);
    });
  });

  describe('interaction validation', () => {
    it('should throw error if user has not ordered from shop', async () => {
      // Create another customer who hasn't ordered from the shop
      const anotherCustomer = await db.insert(usersTable)
        .values({
          email: 'another@test.com',
          phone: '+998901234570',
          role: 'customer',
          full_name: 'Another Customer'
        })
        .returning()
        .execute();

      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: shopId,
        rating: 5,
        comment: null
      };

      await expect(createRating(input, anotherCustomer[0].id)).rejects.toThrow(/hali o'zaro aloqada bo'lmagansiz/i);
    });

    it('should throw error if user has not ordered the product', async () => {
      // Create another product that customer hasn't ordered
      const anotherProduct = await db.insert(productsTable)
        .values({
          shop_id: shopId,
          category_id: categoryId,
          name: 'Another Product',
          price: '29.99',
          quantity: 5
        })
        .returning()
        .execute();

      const input: CreateRatingInput = {
        target_type: 'product',
        target_id: anotherProduct[0].id,
        rating: 4,
        comment: null
      };

      await expect(createRating(input, customerId)).rejects.toThrow(/hali o'zaro aloqada bo'lmagansiz/i);
    });

    it('should throw error if order is not delivered', async () => {
      // Create another shop and pending order
      const anotherOwner = await db.insert(usersTable)
        .values({
          email: 'owner2@test.com',
          phone: '+998901234571',
          role: 'shop',
          full_name: 'Another Owner'
        })
        .returning()
        .execute();

      const anotherShop = await db.insert(shopsTable)
        .values({
          user_id: anotherOwner[0].id,
          name: 'Another Shop',
          address: 'Another Address',
          phone: '+998901234571'
        })
        .returning()
        .execute();

      // Create pending order (not delivered)
      await db.insert(ordersTable)
        .values({
          customer_id: customerId,
          shop_id: anotherShop[0].id,
          status: 'pending',
          total_amount: '15.00',
          delivery_address: 'Test Address',
          delivery_phone: '+998901234567'
        })
        .execute();

      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: anotherShop[0].id,
        rating: 3,
        comment: null
      };

      await expect(createRating(input, customerId)).rejects.toThrow(/hali o'zaro aloqada bo'lmagansiz/i);
    });
  });

  describe('duplicate rating prevention', () => {
    it('should throw error if user tries to rate same shop twice', async () => {
      const input: CreateRatingInput = {
        target_type: 'shop',
        target_id: shopId,
        rating: 5,
        comment: 'First rating'
      };

      // First rating should succeed
      await createRating(input, customerId);

      // Second rating should fail
      const secondInput: CreateRatingInput = {
        target_type: 'shop',
        target_id: shopId,
        rating: 3,
        comment: 'Second rating'
      };

      await expect(createRating(secondInput, customerId)).rejects.toThrow(/allaqachon baholagansiz/i);
    });

    it('should throw error if user tries to rate same product twice', async () => {
      const input: CreateRatingInput = {
        target_type: 'product',
        target_id: productId,
        rating: 4,
        comment: null
      };

      // First rating should succeed
      await createRating(input, customerId);

      // Second rating should fail
      await expect(createRating(input, customerId)).rejects.toThrow(/allaqachon baholagansiz/i);
    });
  });

  describe('average rating calculation', () => {
    it('should calculate correct average rating for shop with multiple ratings', async () => {
      // Create another customer
      const customer2 = await db.insert(usersTable)
        .values({
          email: 'customer2@test.com',
          phone: '+998901234572',
          role: 'customer',
          full_name: 'Customer 2'
        })
        .returning()
        .execute();

      // Create delivered order for second customer
      await db.insert(ordersTable)
        .values({
          customer_id: customer2[0].id,
          shop_id: shopId,
          status: 'delivered',
          total_amount: '25.00',
          delivery_address: 'Address 2',
          delivery_phone: '+998901234572'
        })
        .execute();

      // First rating: 5 stars
      await createRating({
        target_type: 'shop',
        target_id: shopId,
        rating: 5,
        comment: null
      }, customerId);

      // Second rating: 3 stars
      await createRating({
        target_type: 'shop',
        target_id: shopId,
        rating: 3,
        comment: null
      }, customer2[0].id);

      // Check average rating: (5 + 3) / 2 = 4
      const shops = await db.select()
        .from(shopsTable)
        .where(eq(shopsTable.id, shopId))
        .execute();

      expect(shops[0].rating).toEqual(4);
    });
  });
});