/**
 * One-time migration: shifts all existing appointment datetimes by +3 hours.
 *
 * Before this fix, the backend treated bare datetime strings (no timezone) as
 * UTC, storing e.g. "09:00 BRT" as "09:00 UTC". With the new fix, times are
 * stored as "12:00 UTC" (= 09:00 BRT). This script corrects legacy records.
 *
 * Run ONCE with: npx ts-node scripts/fix-appointment-timezones.ts
 * Safe to re-run: it only processes appointments whose startDateTime has
 * hours in the 0–20 range (i.e., not already shifted past UTC 21).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

async function main() {
  const appointments = await prisma.appointment.findMany({
    select: { id: true, startDateTime: true, endDateTime: true },
  });

  console.log(`Found ${appointments.length} appointments to migrate.`);
  let updated = 0;

  for (const appt of appointments) {
    const startUTCHour = appt.startDateTime.getUTCHours();
    // Skip if already shifted (UTC hour 21+ means BRT 18:00+ = end of business day)
    if (startUTCHour >= 21) {
      console.log(`  skip id=${appt.id} (already at UTC ${startUTCHour}h)`);
      continue;
    }

    await prisma.appointment.update({
      where: { id: appt.id },
      data: {
        startDateTime: new Date(appt.startDateTime.getTime() + THREE_HOURS_MS),
        endDateTime: new Date(appt.endDateTime.getTime() + THREE_HOURS_MS),
      },
    });
    console.log(`  ✓ id=${appt.id} shifted +3h`);
    updated++;
  }

  console.log(`Done — ${updated} records updated.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
