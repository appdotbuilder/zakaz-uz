import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, shopsTable, productsTable, productCategoriesTable } from '../db/schema';
import { type UpdateProductInput } from '../schema';
import { updateProduct } from '../handlers/update_product';
import { eq } from 'drizzle-orm';

describe('updateProduct', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test data
  let testUser: any;
  let testShop: any;
  let testCategory: any;
  let testProduct: any;
  let anotherUser: any;
  let anotherShop: any;

  beforeEach(async () => {
    // Create test user and shop
    const userResult = await db.insert(usersTable).values({
      email: 'shop@test.com',
      phone: '998901234567',
      role: 'shop',
      full_name: 'Test Shop Owner'
    }).returning().execute();
    testUser = userResult[0];

    const shopResult = await db.insert(shopsTable).values({
      user_id: testUser.id,
      name: 'Test Shop',
      address: 'Test Address',
      phone: '998901234567'
    }).returning().execute();
    testShop = shopResult[0];

    // Create test category
    const categoryResult = await db.insert(productCategoriesTable).values({
      name: 'Test Category',
      description: 'Test category description'
    }).returning().execute();
    testCategory = categoryResult[0];

    // Create test product
    const productResult = await db.insert(productsTable).values({
      shop_id: testShop.id,
      category_id: testCategory.id,
      name: 'Test Product',
      description: 'Test product description',
      price: '29.99',
      quantity: 50,
      is_available: true
    }).returning().execute();
    testProduct = productResult[0];

    // Create another user and shop for authorization tests
    const anotherUserResult = await db.insert(usersTable).values({
      email: 'another@test.com',
      phone: '998987654321',
      role: 'shop',
      full_name: 'Another Shop Owner'
    }).returning().execute();
    anotherUser = anotherUserResult[0];

    const anotherShopResult = await db.insert(shopsTable).values({
      user_id: anotherUser.id,
      name: 'Another Shop',
      address: 'Another Address',
      phone: '998987654321'
    }).returning().execute();
    anotherShop = anotherShopResult[0];
  });

  it('should update product with all fields', async () => {
    // Create another category for testing category change
    const newCategoryResult = await db.insert(productCategoriesTable).values({
      name: 'New Category',
      description: 'New category description'
    }).returning().execute();
    const newCategory = newCategoryResult[0];

    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      category_id: newCategory.id,
      name: 'Updated Product Name',
      description: 'Updated product description',
      price: 39.99,
      image_url: 'https://example.com/updated-image.jpg',
      quantity: 75,
      is_available: false
    };

    const result = await updateProduct(updateInput, testUser.id);

    // Verify all fields were updated
    expect(result.id).toEqual(testProduct.id);
    expect(result.category_id).toEqual(newCategory.id);
    expect(result.name).toEqual('Updated Product Name');
    expect(result.description).toEqual('Updated product description');
    expect(result.price).toEqual(39.99);
    expect(typeof result.price).toBe('number');
    expect(result.image_url).toEqual('https://example.com/updated-image.jpg');
    expect(result.quantity).toEqual(75);
    expect(result.is_available).toEqual(false);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(testProduct.updated_at.getTime());
  });

  it('should update product with partial fields', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      name: 'Partially Updated Name',
      price: 24.99
    };

    const result = await updateProduct(updateInput, testUser.id);

    // Verify only specified fields were updated
    expect(result.name).toEqual('Partially Updated Name');
    expect(result.price).toEqual(24.99);
    expect(typeof result.price).toBe('number');
    
    // Verify other fields remained unchanged
    expect(result.category_id).toEqual(testProduct.category_id);
    expect(result.description).toEqual(testProduct.description);
    expect(result.quantity).toEqual(testProduct.quantity);
    expect(result.is_available).toEqual(testProduct.is_available);
  });

  it('should update product availability only', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      is_available: false
    };

    const result = await updateProduct(updateInput, testUser.id);

    expect(result.is_available).toEqual(false);
    // Verify other fields remained unchanged
    expect(result.name).toEqual(testProduct.name);
    expect(result.price).toEqual(parseFloat(testProduct.price));
    expect(result.quantity).toEqual(testProduct.quantity);
  });

  it('should persist changes to database', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      name: 'Database Test Product',
      price: 19.99
    };

    await updateProduct(updateInput, testUser.id);

    // Query database directly to verify changes persisted
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct.id))
      .execute();

    expect(products).toHaveLength(1);
    expect(products[0].name).toEqual('Database Test Product');
    expect(parseFloat(products[0].price)).toEqual(19.99);
    expect(products[0].updated_at).toBeInstanceOf(Date);
    expect(products[0].updated_at.getTime()).toBeGreaterThan(testProduct.updated_at.getTime());
  });

  it('should throw error when product not found', async () => {
    const updateInput: UpdateProductInput = {
      id: '00000000-0000-0000-0000-000000000000',
      name: 'Non-existent Product'
    };

    await expect(updateProduct(updateInput, testUser.id))
      .rejects.toThrow(/Product not found/i);
  });

  it('should throw error when user does not own the product shop', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      name: 'Unauthorized Update'
    };

    await expect(updateProduct(updateInput, anotherUser.id))
      .rejects.toThrow(/Unauthorized.*does not belong/i);
  });

  it('should throw error when category does not exist', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      category_id: '00000000-0000-0000-0000-000000000000',
      name: 'Test Product'
    };

    await expect(updateProduct(updateInput, testUser.id))
      .rejects.toThrow(/Category not found/i);
  });

  it('should handle null values correctly', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      description: null,
      image_url: null
    };

    const result = await updateProduct(updateInput, testUser.id);

    expect(result.description).toBeNull();
    expect(result.image_url).toBeNull();
  });

  it('should update quantity to zero', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      quantity: 0
    };

    const result = await updateProduct(updateInput, testUser.id);

    expect(result.quantity).toEqual(0);
  });

  it('should handle price updates correctly', async () => {
    const updateInput: UpdateProductInput = {
      id: testProduct.id,
      price: 99.95
    };

    const result = await updateProduct(updateInput, testUser.id);

    expect(result.price).toEqual(99.95);
    expect(typeof result.price).toBe('number');

    // Verify in database
    const products = await db.select()
      .from(productsTable)
      .where(eq(productsTable.id, testProduct.id))
      .execute();

    expect(parseFloat(products[0].price)).toEqual(99.95);
  });
});