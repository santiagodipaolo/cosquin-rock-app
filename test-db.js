const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing database connection...');
    const count = await prisma.band.count();
    console.log(`Total bands in database: ${count}`);

    if (count > 0) {
      const sample = await prisma.band.findFirst();
      console.log('Sample band:', sample);
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
