const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Room templates for each room type (prices in INR)
const roomTypes = {
  SINGLE: {
    pricePerNight: 1499,
    capacity: 1,
    amenities: ['High-Speed Wi-Fi', 'Split AC', 'Single Bed', 'Work Desk', 'En-suite Bathroom'],
    description: 'Compact and comfortable single room ideal for solo travelers and business professionals.',
  },
  DOUBLE: {
    pricePerNight: 2499,
    capacity: 2,
    amenities: ['High-Speed Wi-Fi', 'Split AC', 'Double Bed', 'Smart TV', 'Tea & Coffee Maker'],
    description: 'Spacious double room for couples or two guests, with modern comforts.',
  },
  DELUXE: {
    pricePerNight: 3999,
    capacity: 3,
    amenities: ['High-Speed Wi-Fi', 'Split AC', 'King Bed', 'Smart TV', 'Mini Bar', 'Sofa Seating'],
    description: 'Deluxe room with premium furnishing, extra space and a relaxing seating area.',
  },
  SUITE: {
    pricePerNight: 6999,
    capacity: 4,
    amenities: ['High-Speed Wi-Fi', 'Split AC', 'King Bed', 'Separate Living Area', 'Mini Bar', 'Bathtub'],
    description: 'Luxury suite with a separate living area, ideal for families and special occasions.',
  },
};

// Which floor has which room type, and how many rooms per floor
const floorPlan = [
  { floor: 1, type: 'SINGLE' },
  { floor: 2, type: 'DOUBLE' },
  { floor: 3, type: 'DELUXE' },
  { floor: 4, type: 'SUITE' },
];
const roomsPerFloor = 10; // change this number for more or fewer rooms

async function main() {
  console.log('[Seed] Starting database seeding for SmartStay ERP...');

  // 1. Seed Admin User
  const adminPassword = 'Admin@123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@smartstay.com' },
    update: {
      passwordHash: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
    },
    create: {
      email: 'admin@smartstay.com',
      passwordHash: hashedPassword,
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '+91 9876543210',
    },
  });

  console.log(`[Seed] Admin user ready: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Build the list of rooms
  const allRooms = [];
  for (const f of floorPlan) {
    const t = roomTypes[f.type];
    for (let i = 1; i <= roomsPerFloor; i++) {
      allRooms.push({
        roomNumber: `${f.floor}${String(i).padStart(2, '0')}`, // 101 ... 410
        floor: f.floor,
        type: f.type,
        pricePerNight: t.pricePerNight,
        capacity: t.capacity,
        amenities: t.amenities,
        status: 'AVAILABLE',
        description: t.description,
      });
    }
  }

  // 3. Save only the rooms that don't exist yet (safe to run many times)
  const existing = await prisma.room.findMany({ select: { roomNumber: true } });
  const existingNumbers = new Set(existing.map((r) => r.roomNumber));
  const newRooms = allRooms.filter((r) => !existingNumbers.has(r.roomNumber));

  if (newRooms.length > 0) {
    await prisma.room.createMany({ data: newRooms });
  }

  console.log(`[Seed] Rooms created: ${newRooms.length} (skipped existing: ${allRooms.length - newRooms.length})`);
  console.log('[Seed] Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });