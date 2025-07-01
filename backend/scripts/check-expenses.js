const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Recherche des dépenses dans la base de données...');
  try {
    const expenses = await prisma.expense.findMany();
    if (expenses.length > 0) {
      console.log('✅ Dépenses trouvées :');
      console.dir(expenses, { depth: null });
    } else {
      console.log('ℹ️ Aucune dépense trouvée dans la base de données.');
    }
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des dépenses:', error);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
