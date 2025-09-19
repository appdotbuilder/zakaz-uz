import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productsTable, shopsTable, usersTable, productCategoriesTable } from '../db/schema';
import { type CreateProductInput } from '../schema';
import { createProduct } from '../handlers/create_product';
import { eq } from 'drizzle-orm';

// Test input with all fields
const testInput: CreateProductInput = {
  category_id: '',
  name: 'Test Product',
  description: 'A product for testing',
  price: 19.99,
  image_url: 'https://example.com/product.jpg',
  quantity: 100
};

describe('createProduct', () => {
  let testShopId: string;
  let testCategoryId: string;
  let testUserId: string;

  beforeEach(async () => {
    await createDB();

    // Create a test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'shop@test.com',
        phone: '+998901234567',
        role: 'shop',
        full_name: 'Shop Owner'
      })
      .returning()
      .execute();
    testUserId = userResult[0].id;

    // Create a test shop
    const shopResult = await db.insert(shopsTable)
      .values({
        user_id: testUserId,
        name: 'Test Shop',
        address: 'Test Address',
        phone: '+998901234567'
      })
      .returning()
      .execute();
    testShopId = shopResult[0].id;

    // Create a test category
    const categoryResult = await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category',
        description: 'A category for testing'
      })
      .returning()
      .execute();
    testCategoryId = categoryResult[0].id;

    // Update test input with valid category ID
    testInput.category_id = testCategoryId;
  });

  afterEach(resetDB);

  it('should create a product', async () => {
    const result = await createProduct(testInput, testShopId);

    // Basic field validation
    expect(result.name).toEqual('Test Product');
    expect(result.description).toEqual(testInput.description);
    expect(result.price).toEqual(19.99);
    expect(typeof result.price).toBe('number');
    expect(result.image_url).toEqual('https://example.com/product.jpg');
    expect(result.quantity).toEqual(100);
    expect(result.shop_id).toEqual(testShopId);
    expect(result.category_id).toEqual(testCategoryId);
    expect(result.is_available).toBe(true);
    expect(result.rating).toBe(0);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save product to database', async () => {
    const result = await createProduct(testInput, testShopId);

    // Query using proper drizzle syntax
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Test Product');
    expect(products[0].description).toEqual(testInput.description);
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(products[0].quantity).toEqual(100);
    expect(products[0].shop_id).toEqual(testShopId);
    expect(products[0].category_id).toEqual(testCategoryId);
    expect(products[0].is_available).toBe(true);
    expect(products[0].rating).toBe(0);
    expect(products[0].created_at).toBeInstanceOf(Date);
    expect(products[0].updated_at).toBeInstanceOf(Date);
  });

  it('should create product with minimal fields', async () => {
    const minimalInput: CreateProductInput = {
      category_id: testCategoryId,
      name: 'Minimal Product',
      description: null,
      price: 5.50,
      image_url: null,
      quantity: 10
    };

    const result = await createProduct(minimalInput, testShopId);

    expect(result.name).toEqual('Minimal Product');
    expect(result.description).toBeNull();
    expect(result.price).toEqual(5.50);
    expect(typeof result.price).toBe('number');
    expect(result.image_url).toBeNull();
    expect(result.quantity).toEqual(10);
    expect(result.id).toBeDefined();
  });

  it('should throw error when shop does not exist', async () => {
    const nonExistentShopId = '00000000-0000-0000-0000-000000000000';

    await expect(createProduct(testInput, nonExistentShopId))
      .rejects.toThrow(/shop not found/i);
  });

  it('should throw error when category does not exist', async () => {
    const invalidInput: CreateProductInput = {
      ...testInput,
      category_id: '00000000-0000-0000-0000-000000000000'
    };

    await expect(createProduct(invalidInput, testShopId))
      .rejects.toThrow(/product category not found/i);
  });

  it('should handle decimal prices correctly', async () => {
    const decimalInput: CreateProductInput = {
      ...testInput,
      price: 123.45
    };

    const result = await createProduct(decimalInput, testShopId);

    expect(result.price).toEqual(123.45);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, result.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(123.45);
  });

  it('should create multiple products for same shop', async () => {
    const input1: CreateProductInput = {
      ...testInput,
      name: 'Product 1'
    };

    const input2: CreateProductInput = {
      ...testInput,
      name: 'Product 2',
      price: 25.00
    };

    const result1 = await createProduct(input1, testShopId);
    const result2 = await createProduct(input2, testShopId);

    expect(result1.name).toEqual('Product 1');
    expect(result2.name).toEqual('Product 2');
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.shop_id).toEqual(testShopId);
    expect(result2.shop_id).toEqual(testShopId);

    // Verify both exist in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.shop_id, testShopId))
      .execute();

    expect(products).toHaveLength(2);
  });
});