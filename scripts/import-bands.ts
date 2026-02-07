import * as xlsx from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapeo de escenarios desde Excel a nombre normalizado
const stageMap: Record<string, string> = {
  'ESCENARIO SUR': 'SUR',
  'ESCENARIO NORTE': 'NORTE',
  'ESCENARIO MONTAÑA': 'MONTANA',
  'ESCENARIO BOOM ERANG': 'BOOM_ERANG',
  'ESCENARIO LA CASITA DEL BLUES': 'CASITA_BLUES',
  'ESCENARIO PARAGUAY': 'PARAGUAY',
};

function parseTime(day: number, timeStr: string): Date {
  // Formato: "17:20"
  const [hours, minutes] = timeStr.split(':').map(Number);

  // Usar fecha del festival (15 y 16 de febrero 2026)
  const date = new Date(2026, 1, day === 1 ? 15 : 16); // Mes 1 = Febrero
  date.setHours(hours, minutes, 0, 0);

  return date;
}

function normalizeStage(stageHeader: string): string {
  const normalized = stageMap[stageHeader];
  if (!normalized) {
    console.warn(`Escenario desconocido: ${stageHeader}`);
    return stageHeader;
  }
  return normalized;
}

async function importBands() {
  try {
    console.log('📖 Leyendo archivo Excel...');

    const workbook = xlsx.readFile('/Users/santiagodipaolo/Desktop/COSQUIN 1 y 2.xlsx');

    // Procesar Día 1
    console.log('\n📅 Procesando DÍA 1 - SÁBADO...');
    const day1Sheet = workbook.Sheets['DIA 1 - SABADO'];
    const day1Data = xlsx.utils.sheet_to_json(day1Sheet);

    let day1Bands: any[] = [];

    for (const row of day1Data as any[]) {
      const horario = row['HORARIO'];
      if (!horario) continue;

      // Buscar en cada columna de escenario
      for (const col of Object.keys(row)) {
        if (col === 'HORARIO' || col.startsWith('__')) continue;

        const bandName = row[col];
        if (bandName && typeof bandName === 'string' && bandName.trim()) {
          // Remover estrellas del nombre
          const cleanName = bandName.replace(/★/g, '').trim();

          day1Bands.push({
            name: cleanName,
            day: 1,
            stage: normalizeStage(col),
            startTime: parseTime(1, horario),
            endTime: parseTime(1, horario), // Por ahora igual al start
          });
        }
      }
    }

    // Procesar Día 2
    console.log('\n📅 Procesando DÍA 2 - DOMINGO...');
    const day2Sheet = workbook.Sheets['DIA 2 - DOMINGO'];
    const day2Data = xlsx.utils.sheet_to_json(day2Sheet);

    let day2Bands: any[] = [];

    for (const row of day2Data as any[]) {
      const horario = row['HORARIO'];
      if (!horario) continue;

      for (const col of Object.keys(row)) {
        if (col === 'HORARIO' || col.startsWith('__')) continue;

        const bandName = row[col];
        if (bandName && typeof bandName === 'string' && bandName.trim()) {
          const cleanName = bandName.replace(/★/g, '').replace(/⭐⭐/g, '').trim();

          day2Bands.push({
            name: cleanName,
            day: 2,
            stage: normalizeStage(col),
            startTime: parseTime(2, horario),
            endTime: parseTime(2, horario),
          });
        }
      }
    }

    const allBands = [...day1Bands, ...day2Bands];

    console.log(`\n✅ Total de bandas encontradas: ${allBands.length}`);
    console.log(`   - Día 1: ${day1Bands.length} bandas`);
    console.log(`   - Día 2: ${day2Bands.length} bandas`);

    // Limpiar base de datos
    console.log('\n🗑️  Limpiando base de datos...');
    await prisma.band.deleteMany({});

    // Insertar bandas
    console.log('\n💾 Insertando bandas en la base de datos...');
    const result = await prisma.band.createMany({
      data: allBands,
    });

    console.log(`\n✨ ${result.count} bandas importadas exitosamente!`);

    // Mostrar resumen por escenario
    const byStage = allBands.reduce((acc, band) => {
      acc[band.stage] = (acc[band.stage] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📊 Bandas por escenario:');
    Object.entries(byStage).forEach(([stage, count]) => {
      console.log(`   ${stage}: ${count} bandas`);
    });

  } catch (error) {
    console.error('❌ Error importando bandas:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
importBands()
  .then(() => {
    console.log('\n✅ Importación completada!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
