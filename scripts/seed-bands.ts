import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function parseTime(day: number, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number);
  // Día 1: 14 de febrero, Día 2: 15 de febrero 2026
  const date = new Date(2026, 1, day === 1 ? 14 : 15);

  // Si la hora es menor a 12, es madrugada del día siguiente
  if (hours < 12) {
    date.setDate(date.getDate() + 1);
  }
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// ========== DÍA 1 - 14 DE FEBRERO ==========

const day1Norte = [
  { name: "Caligaris", time: "00:40" },
  { name: "Lali", time: "23:20" },
  { name: "Babasonicos", time: "21:20" },
  { name: "Dillom", time: "19:30" },
  { name: "Turf", time: "17:50" },
  { name: "El Zar", time: "16:00" },
  { name: "Cruca Sativa", time: "15:20" },
  { name: "Kill Flora", time: "14:30" },
];

const day1Sur = [
  { name: "Viejas Locas / Jovenes Pordioseros", time: "00:40" },
  { name: "Las Pelotas", time: "23:20" },
  { name: "La Vela Puerca", time: "21:40" },
  { name: "Ciro y Los Persas", time: "19:40" },
  { name: "Cruzando el Charco", time: "17:50" },
  { name: "CNI", time: "16:30" },
  { name: "La Mississippi", time: "15:20" },
  { name: "Fantasmagoria", time: "14:30" },
];

const day1Montana = [
  { name: "Victoria Whynot", time: "02:00" },
  { name: "The Chemical Brothers (DJ Set)", time: "00:00" },
  { name: "Franz Ferdinand", time: "22:40" },
  { name: "Cuarteto de Nos", time: "20:40" },
  { name: "El Kuelgue", time: "18:40" },
  { name: "Marlina Bertoldi", time: "17:10" },
  { name: "Bersuit Vergarabat", time: "15:50" },
  { name: "Eyan", time: "15:00" },
  { name: "Cheche de Marcos", time: "14:15" },
];

const day1BoomErang = [
  { name: "Amigo de Artistas", time: "00:30" },
  { name: "Coti", time: "23:10" },
  { name: "La Franela", time: "21:50" },
  { name: "Abel Pintos", time: "20:40" },
  { name: "Estelares", time: "19:20" },
  { name: "Indios", time: "18:20" },
  { name: "Hermanos Gutierrez", time: "17:20" },
  { name: "Girl Ultra", time: "16:30" },
  { name: "Un Muerto Mas", time: "15:40" },
  { name: "1915", time: "14:50" },
  { name: "Microtul", time: "14:10" },
];

const day1CasitaBlues = [
  { name: "Les Diabolettes", time: "23:35" },
  { name: "Piti Fernandez", time: "22:30" },
  { name: "Los Espiritus", time: "21:25" },
  { name: "Wayra Iglesias", time: "20:30" },
  { name: "Tango & Roll", time: "19:35" },
  { name: "Misty Soul Choir", time: "18:40" },
  { name: "Perro Suizo", time: "17:45" },
  { name: "Lo Deacs", time: "16:50" },
  { name: "Las Witches", time: "15:55" },
  { name: "Los Mentidores", time: "15:05" },
  { name: "Golo's Band", time: "14:15" },
];

const day1PlazaElectronica = [
  { name: "Arkadyan", time: "22:30" },
  { name: "Sora", time: "21:00" },
  { name: "Lehar B2B Santiago Garcia", time: "19:00" },
  { name: "Valentin Huedo B2B Bruz", time: "17:00" },
  { name: "Claudio Ricci", time: "16:00" },
];

const day1Sorpresa = [
  { name: "Sorpresa", time: "22:20" },
  { name: "Sorpresa", time: "18:40" },
  { name: "Falset", time: "15:50" },
];

// ========== DÍA 2 - 15 DE FEBRERO ==========

const day2Norte = [
  { name: "Caras Extrañas", time: "00:20" },
  { name: "YSY A", time: "23:00" },
  { name: "Airbag", time: "20:55" },
  { name: "Rto Paez", time: "19:10" },
  { name: "Bandidos Chinos", time: "17:50" },
  { name: "Gauchito Club", time: "16:30" },
  { name: "Blair", time: "15:20" },
  { name: "Sor Mora", time: "14:30" },
];

const day2Sur = [
  { name: "Louta", time: "00:50" },
  { name: "Guasones", time: "23:00" },
  { name: "Trueno", time: "21:30" },
  { name: "Divididos", time: "19:40" },
  { name: "El Plan de la Mariposa", time: "17:45" },
  { name: "Pappo x Juanse", time: "16:25" },
  { name: "Kapanga", time: "15:10" },
  { name: "Ainda", time: "14:30" },
];

const day2Montana = [
  { name: "Franky Wah", time: "02:00" },
  { name: "Mariano Mellino", time: "00:00" },
  { name: "Peces Raros", time: "22:20" },
  { name: "Las Pastillas del Abuelo", time: "22:20" },
  { name: "Morat", time: "20:20" },
  { name: "Silvestre y la Naranja", time: "18:30" },
  { name: "Los Pericos", time: "17:00" },
  { name: "Gustavo Cordera", time: "15:50" },
  { name: "Beats Modernos", time: "15:00" },
  { name: "Renzo Leau", time: "14:30" },
];

const day2Paraguay = [
  { name: "El Club de la Serpiente", time: "00:45" },
  { name: "Six Sex", time: "23:35" },
  { name: "CTM", time: "22:35" },
  { name: "David Clifton", time: "21:35" },
  { name: "Marky Ramone", time: "20:30" },
  { name: "Dum Chica", time: "19:30" },
  { name: "Devendra Banhart", time: "18:20" },
  { name: "Gauchos of the Pampa", time: "17:20" },
  { name: "Malandro", time: "16:10" },
  { name: "TGK", time: "15:10" },
  { name: "Wanda Jagl", time: "14:20" },
];

const day2CasitaBlues = [
  { name: "Lorcita Sordillo", time: "23:35" },
  { name: "Ximè Monzon", time: "22:40" },
  { name: "Nina Portela", time: "21:45" },
  { name: "Crystal Thomas & Luca Giordano", time: "20:40" },
  { name: "Gisa Loredro & Tuco y Cosas", time: "19:35" },
  { name: "Grasshopper's", time: "18:40" },
  { name: "Cordelias Blues", time: "17:45" },
  { name: "Bulldozer Blues Band", time: "16:50" },
  { name: "Rudy", time: "15:55" },
  { name: "Labios de Sal", time: "15:05" },
  { name: "Rosy Gomez", time: "14:15" },
];

const day2PlazaElectronica = [
  { name: "Matias Tanzmann", time: "00:00" },
  { name: "Nölsch", time: "22:30" },
  { name: "Franky Wah", time: "21:00" },
  { name: "Deer Jade", time: "19:30" },
  { name: "Brigado Crew", time: "18:00" },
  { name: "Glauco di Mambro", time: "17:00" },
  { name: "Lourdes Lourdes", time: "16:00" },
];

const day2Sorpresa = [
  { name: "Agarrate Catalina", time: "22:20" },
  { name: "Sorpresa", time: "17:10" },
  { name: "Golden Floyd", time: "15:50" },
];

async function seedBands() {
  console.log('Limpiando bandas existentes...');
  await prisma.attendance.deleteMany({});
  await prisma.band.deleteMany({});

  const allBands: any[] = [];

  // Helper para agregar bandas
  const addBands = (bands: { name: string; time: string }[], day: number, stage: string) => {
    for (const band of bands) {
      const startTime = parseTime(day, band.time);
      allBands.push({
        name: band.name,
        day,
        stage,
        startTime,
        endTime: startTime, // mismo que startTime
      });
    }
  };

  // Día 1
  addBands(day1Norte, 1, "NORTE");
  addBands(day1Sur, 1, "SUR");
  addBands(day1Montana, 1, "MONTANA");
  addBands(day1BoomErang, 1, "BOOM_ERANG");
  addBands(day1CasitaBlues, 1, "CASITA_BLUES");
  addBands(day1PlazaElectronica, 1, "PLAZA_ELECTRONICA");
  addBands(day1Sorpresa, 1, "SORPRESA");

  // Día 2
  addBands(day2Norte, 2, "NORTE");
  addBands(day2Sur, 2, "SUR");
  addBands(day2Montana, 2, "MONTANA");
  addBands(day2Paraguay, 2, "PARAGUAY");
  addBands(day2CasitaBlues, 2, "CASITA_BLUES");
  addBands(day2PlazaElectronica, 2, "PLAZA_ELECTRONICA");
  addBands(day2Sorpresa, 2, "SORPRESA");

  console.log(`Insertando ${allBands.length} bandas...`);

  const result = await prisma.band.createMany({
    data: allBands,
  });

  console.log(`${result.count} bandas insertadas.`);

  // Resumen
  const byDayStage: Record<string, number> = {};
  allBands.forEach(b => {
    const key = `Dia ${b.day} - ${b.stage}`;
    byDayStage[key] = (byDayStage[key] || 0) + 1;
  });

  console.log('\nResumen:');
  Object.entries(byDayStage).sort().forEach(([key, count]) => {
    console.log(`  ${key}: ${count} bandas`);
  });

  await prisma.$disconnect();
}

seedBands()
  .then(() => {
    console.log('\nSeed completado!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
