import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, courierLocationsTable } from '../db/schema';
import { type UpdateCourierLocationInput } from '../schema';
import { updateCourierLocation } from '../handlers/update_courier_location';
import { eq } from 'drizzle-orm';

// Test input for updating courier location
const testLocationInput: UpdateCourierLocationInput = {
  latitude: 41.2995,
  longitude: 69.2401,
  accuracy: 10.5,
  is_online: true
};

// Create test courier user
const createTestCourier = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'courier@test.com',
      phone: '+998901234567',
      role: 'courier',
      full_name: 'Test Courier',
      is_active: true
    })
    .returning()
    .execute();
  
  return result[0];
};

// Create test customer user (for negative testing)
const createTestCustomer = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'customer@test.com',
      phone: '+998901234568',
      role: 'customer',
      full_name: 'Test Customer',
      is_active: true
    })
    .returning()
    .execute();
  
  return result[0];
};

describe('updateCourierLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create new courier location when none exists', async () => {
    const courier = await createTestCourier();
    
    const result = await updateCourierLocation(testLocationInput, courier.id);

    // Verify returned data structure
    expect(result.courier_id).toEqual(courier.id);
    expect(result.latitude).toEqual(41.2995);
    expect(result.longitude).toEqual(69.2401);
    expect(result.accuracy).toEqual(10.5);
    expect(result.is_online).toBe(true);
    expect(result.id).toBeDefined();
    expect(result.last_updated).toBeInstanceOf(Date);
  });

  it('should update existing courier location', async () => {
    const courier = await createTestCourier();
    
    // Create initial location
    await updateCourierLocation({
      latitude: 40.0,
      longitude: 68.0,
      accuracy: 5.0,
      is_online: false
    }, courier.id);

    // Update with new location
    const updatedInput: UpdateCourierLocationInput = {
      latitude: 41.5,
      longitude: 69.5,
      accuracy: 15.0,
      is_online: true
    };

    const result = await updateCourierLocation(updatedInput, courier.id);

    // Verify updated values
    expect(result.courier_id).toEqual(courier.id);
    expect(result.latitude).toEqual(41.5);
    expect(result.longitude).toEqual(69.5);
    expect(result.accuracy).toEqual(15.0);
    expect(result.is_online).toBe(true);
    expect(result.last_updated).toBeInstanceOf(Date);

    // Verify only one location record exists for this courier
    const allLocations = await db.select()
      .from(courierLocationsTable)
      .where(eq(courierLocationsTable.courier_id, courier.id))
      .execute();
    
    expect(allLocations).toHaveLength(1);
    expect(allLocations[0].latitude).toEqual(41.5);
  });

  it('should save location data to database correctly', async () => {
    const courier = await createTestCourier();
    
    const result = await updateCourierLocation(testLocationInput, courier.id);

    // Query database directly to verify data was saved
    const savedLocation = await db.select()
      .from(courierLocationsTable)
      .where(eq(courierLocationsTable.id, result.id))
      .execute();

    expect(savedLocation).toHaveLength(1);
    expect(savedLocation[0].courier_id).toEqual(courier.id);
    expect(savedLocation[0].latitude).toEqual(41.2995);
    expect(savedLocation[0].longitude).toEqual(69.2401);
    expect(savedLocation[0].accuracy).toEqual(10.5);
    expect(savedLocation[0].is_online).toBe(true);
    expect(savedLocation[0].last_updated).toBeInstanceOf(Date);
  });

  it('should handle location updates with null accuracy', async () => {
    const courier = await createTestCourier();
    
    const inputWithoutAccuracy: UpdateCourierLocationInput = {
      latitude: 41.2995,
      longitude: 69.2401,
      accuracy: null,
      is_online: true
    };

    const result = await updateCourierLocation(inputWithoutAccuracy, courier.id);

    expect(result.accuracy).toBe(null);
    expect(result.latitude).toEqual(41.2995);
    expect(result.longitude).toEqual(69.2401);
    expect(result.is_online).toBe(true);
  });

  it('should update last_updated timestamp on each update', async () => {
    const courier = await createTestCourier();
    
    // Create initial location
    const first = await updateCourierLocation(testLocationInput, courier.id);
    
    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update location again
    const second = await updateCourierLocation({
      ...testLocationInput,
      latitude: 41.3000
    }, courier.id);

    expect(second.last_updated.getTime()).toBeGreaterThan(first.last_updated.getTime());
  });

  it('should set courier offline correctly', async () => {
    const courier = await createTestCourier();
    
    // Set courier online first
    await updateCourierLocation({
      ...testLocationInput,
      is_online: true
    }, courier.id);

    // Set courier offline
    const result = await updateCourierLocation({
      ...testLocationInput,
      is_online: false
    }, courier.id);

    expect(result.is_online).toBe(false);
  });

  it('should throw error for non-existent courier', async () => {
    const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    
    await expect(updateCourierLocation(testLocationInput, nonExistentId))
      .rejects.toThrow(/courier not found/i);
  });

  it('should throw error for non-courier user', async () => {
    const customer = await createTestCustomer();
    
    await expect(updateCourierLocation(testLocationInput, customer.id))
      .rejects.toThrow(/not a courier/i);
  });

  it('should handle edge case coordinates correctly', async () => {
    const courier = await createTestCourier();
    
    // Test with boundary coordinates
    const edgeCaseInput: UpdateCourierLocationInput = {
      latitude: -90.0, // Minimum latitude
      longitude: 180.0, // Maximum longitude
      accuracy: 0.1,
      is_online: true
    };

    const result = await updateCourierLocation(edgeCaseInput, courier.id);

    expect(result.latitude).toEqual(-90.0);
    expect(result.longitude).toEqual(180.0);
    expect(result.accuracy).toEqual(0.1);
  });

  it('should maintain courier_id uniqueness constraint', async () => {
    const courier = await createTestCourier();
    
    // Create first location
    await updateCourierLocation(testLocationInput, courier.id);
    
    // Update should not create duplicate record
    await updateCourierLocation({
      ...testLocationInput,
      latitude: 42.0
    }, courier.id);

    // Verify only one record exists
    const locations = await db.select()
      .from(courierLocationsTable)
      .where(eq(courierLocationsTable.courier_id, courier.id))
      .execute();
    
    expect(locations).toHaveLength(1);
    expect(locations[0].latitude).toEqual(42.0);
  });
});