import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Starting seed...');

  // Pre-register hardware device codes (from Database.md §7)
  const deviceCodes = [
    { code: 'SBP-A1B2C3D4E5F6', firmware: '1.0.0' },
    { code: 'SBP-B2C3D4E5F6A7', firmware: '1.0.0' },
  ];

  for (const { code, firmware } of deviceCodes) {
    await prisma.device.upsert({
      where: { deviceCode: code },
      update: {},
      create: {
        deviceCode: code,
        firmwareVersion: firmware,
      },
    });
    console.log(`  ✓ Device seeded: ${code}`);
  }

  console.log('✅ Seed complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
