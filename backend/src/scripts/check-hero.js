#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHeroImage() {
  console.log('🔍 Recherche de l\'image de catégorie "hero" dans la base de données...');

  try {
    const heroImage = await prisma.image.findFirst({
      where: {
        category: 'hero',
      },
    });

    if (heroImage) {
      console.log('✅ Image "hero" trouvée ! Voici les détails :');
      console.log(JSON.stringify(heroImage, null, 2));
    } else {
      console.log('❌ Aucune image avec la catégorie "hero" n\'a été trouvée dans la base de données.');
      
      console.log('\n🔍 Recherche de toutes les catégories présentes en base...');
      const allCategories = await prisma.image.groupBy({
        by: ['category'],
        _count: {
          category: true,
        },
      });

      if (allCategories.length > 0) {
        console.log('Voici les catégories trouvées et le nombre d\'images pour chacune :');
        console.log(allCategories.map(c => ({ categorie: c.category, nombre: c._count.category })));
      } else {
        console.log('La table des images semble être vide.');
      }
    }
  } catch (error) {
    console.error('❌ Une erreur est survenue lors de la lecture de la base de données :', error);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Connexion à la base de données fermée.');
  }
}

checkHeroImage();
