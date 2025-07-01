const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const ADMIN_EMAIL = 'hydrocaptorix@gmail.com';

async function main() {
  const newPassword = process.argv[2];

  if (!newPassword) {
    console.error('Veuillez fournir un mot de passe en argument.');
    console.log('Usage: node scripts/reset-password.js <nouveau_mot_de_passe>');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: { password: hashedPassword },
      create: {
        email: ADMIN_EMAIL,
        password: hashedPassword,
        name: 'Admin',
      },
    });

    console.log(`Le mot de passe pour l'administrateur (${ADMIN_EMAIL}) a été créé/mis à jour avec succès.`);
    console.log('Vous pouvez maintenant vous connecter avec le nouveau mot de passe.');

  } catch (error) {
    console.error(`Erreur lors de la création/mise à jour de l'utilisateur administrateur :`, error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
