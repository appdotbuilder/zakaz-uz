import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, courierLocationsTable } from '../db/schema';
import { getCourierLocation } from '../handlers/get_courier_location';

describe('getCourierLocation', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return courier location for existing courier', async () => {
    // Create a test courier user
    const courierResult = await db.insert(usersTable)
      .values({
        email: 'courier@test.com',
        username: 'testcourier',
        phone: '+998901234567',
        role: 'courier',
        full_name: 'Test Courier',
        avatar_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const courier = courierResult[0];

    // Create courier location
    const locationResult = await db.insert(courierLocationsTable)
      .values({
        courier_id: courier.id,
        latitude: 41.2995,
        longitude: 69.2401,
        accuracy: 5.0,
        is_online: true
      })
      .returning()
      .execute();

    const expectedLocation = locationResult[0];

    // Test the handler
    const result = await getCourierLocation(courier.id);

    expect(result).not.toBeNull();
    expect(result!.id).toEqual(expectedLocation.id);
    expect(result!.courier_id).toEqual(courier.id);
    expect(result!.latitude).toEqual(41.2995);
    expect(result!.longitude).toEqual(69.2401);
    expect(result!.accuracy).toEqual(5.0);
    expect(result!.is_online).toEqual(true);
    expect(result!.last_updated).toBeInstanceOf(Date);
  });

  it('should return null for non-existent courier', async () => {
    const result = await getCourierLocation('550e8400-e29b-41d4-a716-446655440000');

    expect(result).toBeNull();
  });

  it('should return courier location with null accuracy', async () => {
    // Create a test courier user
    const courierResult = await db.insert(usersTable)
      .values({
        email: 'courier2@test.com',
        username: 'testcourier2',
        phone: '+998901234568',
        role: 'courier',
        full_name: 'Test Courier 2',
        avatar_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const courier = courierResult[0];

    // Create courier location without accuracy
    await db.insert(courierLocationsTable)
      .values({
        courier_id: courier.id,
        latitude: 40.1234,
        longitude: 68.5678,
        accuracy: null,
        is_online: false
      })
      .execute();

    // Test the handler
    const result = await getCourierLocation(courier.id);

    expect(result).not.toBeNull();
    expect(result!.courier_id).toEqual(courier.id);
    expect(result!.latitude).toEqual(40.1234);
    expect(result!.longitude).toEqual(68.5678);
    expect(result!.accuracy).toBeNull();
    expect(result!.is_online).toEqual(false);
    expect(result!.last_updated).toBeInstanceOf(Date);
  });

  it('should return offline courier location', async () => {
    // Create a test courier user
    const courierResult = await db.insert(usersTable)
      .values({
        email: 'courier3@test.com',
        username: 'testcourier3',
        phone: '+998901234569',
        role: 'courier',
        full_name: 'Test Courier 3',
        avatar_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const courier = courierResult[0];

    // Create offline courier location
    await db.insert(courierLocationsTable)
      .values({
        courier_id: courier.id,
        latitude: 42.5555,
        longitude: 70.9999,
        accuracy: 10.5,
        is_online: false
      })
      .execute();

    // Test the handler
    const result = await getCourierLocation(courier.id);

    expect(result).not.toBeNull();
    expect(result!.courier_id).toEqual(courier.id);
    expect(result!.is_online).toEqual(false);
    expect(result!.latitude).toEqual(42.5555);
    expect(result!.longitude).toEqual(70.9999);
    expect(result!.accuracy).toEqual(10.5);
  });

  it('should return null for courier without location data', async () => {
    // Create a test courier user without location
    const courierResult = await db.insert(usersTable)
      .values({
        email: 'courier4@test.com',
        username: 'testcourier4',
        phone: '+998901234570',
        role: 'courier',
        full_name: 'Test Courier 4',
        avatar_url: null,
        is_active: true
      })
      .returning()
      .execute();

    const courier = courierResult[0];

    // Test the handler without inserting location
    const result = await getCourierLocation(courier.id);

    expect(result).toBeNull();
  });
});