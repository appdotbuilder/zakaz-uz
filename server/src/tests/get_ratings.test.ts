import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable, productsTable, productCategoriesTable, ratingsTable } from '../db/schema';
import { getRatings } from '../handlers/get_ratings';
import { eq } from 'drizzle-orm';

describe('getRatings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no ratings exist', async () => {
    // Use a valid UUID format for the test
    const result = await getRatings('shop', '550e8400-e29b-41d4-a716-446655440000');
    
    expect(result).toEqual([]);
  });

  it('should fetch ratings for a shop', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create shop owner
    const [shopOwner] = await db.insert(usersTable)
      .values({
        email: 'shop@example.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: shopOwner.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234568'
      })
      .returning()
      .execute();

    // Create test rating
    const [rating] = await db.insert(ratingsTable)
      .values({
        user_id: user.id,
        target_type: 'shop',
        target_id: shop.id,
        rating: 5,
        comment: 'Great shop!'
      })
      .returning()
      .execute();

    const result = await getRatings('shop', shop.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(rating.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].target_type).toEqual('shop');
    expect(result[0].target_id).toEqual(shop.id);
    expect(result[0].rating).toEqual(5);
    expect(result[0].comment).toEqual('Great shop!');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should fetch ratings for a product', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create shop owner
    const [shopOwner] = await db.insert(usersTable)
      .values({
        email: 'shop@example.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: shopOwner.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234568'
      })
      .returning()
      .execute();

    // Create product category
    const [category] = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category'
      })
      .returning()
      .execute();

    // Create test product
    const [product] = await db.insert(productsTable)
      .values({
        shop_id: shop.id,
        category_id: category.id,
        name: 'Test Product',
        price: '25.99',
        quantity: 10
      })
      .returning()
      .execute();

    // Create test rating
    const [rating] = await db.insert(ratingsTable)
      .values({
        user_id: user.id,
        target_type: 'product',
        target_id: product.id,
        rating: 4,
        comment: 'Good product'
      })
      .returning()
      .execute();

    const result = await getRatings('product', product.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(rating.id);
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].target_type).toEqual('product');
    expect(result[0].target_id).toEqual(product.id);
    expect(result[0].rating).toEqual(4);
    expect(result[0].comment).toEqual('Good product');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should fetch ratings for a courier', async () => {
    // Create test customer
    const [customer] = await db.insert(usersTable)
      .values({
        email: 'customer@example.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test Customer'
      })
      .returning()
      .execute();

    // Create courier
    const [courier] = await db.insert(usersTable)
      .values({
        email: 'courier@example.com',
        phone: '+998901234568',
        role: 'courier',
        full_name: 'Test Courier'
      })
      .returning()
      .execute();

    // Create test rating
    const [rating] = await db.insert(ratingsTable)
      .values({
        user_id: customer.id,
        target_type: 'courier',
        target_id: courier.id,
        rating: 3,
        comment: 'Average delivery'
      })
      .returning()
      .execute();

    const result = await getRatings('courier', courier.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(rating.id);
    expect(result[0].user_id).toEqual(customer.id);
    expect(result[0].target_type).toEqual('courier');
    expect(result[0].target_id).toEqual(courier.id);
    expect(result[0].rating).toEqual(3);
    expect(result[0].comment).toEqual('Average delivery');
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple ratings ordered by newest first', async () => {
    // Create test users
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'User One'
      })
      .returning()
      .execute();

    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        phone: '+998901234568',
        role: 'customer',
        full_name: 'User Two'
      })
      .returning()
      .execute();

    // Create shop owner
    const [shopOwner] = await db.insert(usersTable)
      .values({
        email: 'shop@example.com',
        phone: '+998901234569',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: shopOwner.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234569'
      })
      .returning()
      .execute();

    // Create first rating (older)
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    const [rating1] = await db.insert(ratingsTable)
      .values({
        user_id: user1.id,
        target_type: 'shop',
        target_id: shop.id,
        rating: 4,
        comment: 'First rating'
      })
      .returning()
      .execute();

    // Create second rating (newer)
    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
    const [rating2] = await db.insert(ratingsTable)
      .values({
        user_id: user2.id,
        target_type: 'shop',
        target_id: shop.id,
        rating: 5,
        comment: 'Second rating'
      })
      .returning()
      .execute();

    const result = await getRatings('shop', shop.id);

    expect(result).toHaveLength(2);
    // Should be ordered by newest first
    expect(result[0].id).toEqual(rating2.id);
    expect(result[0].comment).toEqual('Second rating');
    expect(result[1].id).toEqual(rating1.id);
    expect(result[1].comment).toEqual('First rating');
  });

  it('should handle ratings with null comments', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create shop owner
    const [shopOwner] = await db.insert(usersTable)
      .values({
        email: 'shop@example.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();

    // Create test shop
    const [shop] = await db.insert(shopsTable)
      .values({
        user_id: shopOwner.id,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234568'
      })
      .returning()
      .execute();

    // Create rating without comment
    const [rating] = await db.insert(ratingsTable)
      .values({
        user_id: user.id,
        target_type: 'shop',
        target_id: shop.id,
        rating: 5,
        comment: null
      })
      .returning()
      .execute();

    const result = await getRatings('shop', shop.id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(rating.id);
    expect(result[0].rating).toEqual(5);
    expect(result[0].comment).toBeNull();
  });

  it('should only return ratings for the specified target', async () => {
    // Create test user
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        phone: '+998901234567',
        role: 'customer',
        full_name: 'Test User'
      })
      .returning()
      .execute();

    // Create shop owners
    const [shopOwner1] = await db.insert(usersTable)
      .values({
        email: 'shop1@example.com',
        phone: '+998901234568',
        role: 'shop',
        full_name: 'Shop Owner 1'
      })
      .returning()
      .execute();

    const [shopOwner2] = await db.insert(usersTable)
      .values({
        email: 'shop2@example.com',
        phone: '+998901234569',
        role: 'shop',
        full_name: 'Shop Owner 2'
      })
      .returning()
      .execute();

    // Create test shops
    const [shop1] = await db.insert(shopsTable)
      .values({
        user_id: shopOwner1.id,
        name: 'Test Shop 1',
        address: 'Test Address 1',
        phone: '+998901234568'
      })
      .returning()
      .execute();

    const [shop2] = await db.insert(shopsTable)
      .values({
        user_id: shopOwner2.id,
        name: 'Test Shop 2',
        address: 'Test Address 2',
        phone: '+998901234569'
      })
      .returning()
      .execute();

    // Create ratings for both shops
    await db.insert(ratingsTable)
      .values({
        user_id: user.id,
        target_type: 'shop',
        target_id: shop1.id,
        rating: 4,
        comment: 'Rating for shop 1'
      })
      .execute();

    await db.insert(ratingsTable)
      .values({
        user_id: user.id,
        target_type: 'shop',
        target_id: shop2.id,
        rating: 5,
        comment: 'Rating for shop 2'
      })
      .execute();

    // Should only return ratings for shop1
    const result = await getRatings('shop', shop1.id);

    expect(result).toHaveLength(1);
    expect(result[0].target_id).toEqual(shop1.id);
    expect(result[0].comment).toEqual('Rating for shop 1');
  });

  it('should throw error for invalid target type', async () => {
    await expect(getRatings('invalid', 'some-id'))
      .rejects
      .toThrow(/Invalid target type/i);
  });
});