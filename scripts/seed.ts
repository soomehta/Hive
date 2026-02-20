import "dotenv/config";

async function seed() {
  console.log("Seeding database...");
  // Seed data will be added as needed
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
