import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { productCategoriesTable } from '../db/schema';
import { getProductCategories } from '../handlers/get_product_categories';

describe('getProductCategories', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no categories exist', async () => {
    const result = await getProductCategories();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return single category', async () => {
    // Create a test category
    await db.insert(productCategoriesTable)
      .values({
        name: 'Electronics',
        description: 'Electronic devices and gadgets'
      })
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(1);
    expect(result[0].name).toEqual('Electronics');
    expect(result[0].description).toEqual('Electronic devices and gadgets');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return multiple categories ordered by name', async () => {
    // Create multiple categories in random order
    await db.insert(productCategoriesTable)
      .values([
        {
          name: 'Zebra Products',
          description: 'Products starting with Z'
        },
        {
          name: 'Apple Products',
          description: 'Products starting with A'
        },
        {
          name: 'Books',
          description: 'Reading materials'
        }
      ])
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(3);
    
    // Should be ordered alphabetically by name
    expect(result[0].name).toEqual('Apple Products');
    expect(result[1].name).toEqual('Books');
    expect(result[2].name).toEqual('Zebra Products');

    // Verify all fields are present
    result.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.created_at).toBeInstanceOf(Date);
      expect(typeof category.description).toBe('string');
    });
  });

  it('should handle categories with null descriptions', async () => {
    // Create categories with both null and non-null descriptions
    await db.insert(productCategoriesTable)
      .values([
        {
          name: 'Category with Description',
          description: 'This has a description'
        },
        {
          name: 'Category without Description',
          description: null
        }
      ])
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(2);
    
    // Find categories by name
    const withDescription = result.find(cat => cat.name === 'Category with Description');
    const withoutDescription = result.find(cat => cat.name === 'Category without Description');

    expect(withDescription?.description).toEqual('This has a description');
    expect(withoutDescription?.description).toBeNull();
  });

  it('should return categories with correct data types', async () => {
    await db.insert(productCategoriesTable)
      .values({
        name: 'Test Category',
        description: 'Test description'
      })
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(1);
    const category = result[0];

    // Verify data types
    expect(typeof category.id).toBe('string');
    expect(typeof category.name).toBe('string');
    expect(typeof category.description).toBe('string');
    expect(category.created_at).toBeInstanceOf(Date);
  });

  it('should handle large number of categories', async () => {
    // Create 50 categories
    const categories = Array.from({ length: 50 }, (_, i) => ({
      name: `Category ${i.toString().padStart(2, '0')}`,
      description: `Description for category ${i}`
    }));

    await db.insert(productCategoriesTable)
      .values(categories)
      .execute();

    const result = await getProductCategories();

    expect(result).toHaveLength(50);
    
    // Verify they are ordered by name
    for (let i = 1; i < result.length; i++) {
      expect(result[i].name > result[i - 1].name).toBe(true);
    }
  });
});