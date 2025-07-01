#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// --- Configuration ---
const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const DEFAULT_HERO_IMAGE = '1751345498261-ac03ee50-bff0-4036-b925-ce80f0209e15.JPG';

/**
 * Garantit la présence de l'image "hero" par défaut dans la base de données.
 */
async function ensureDefaultHeroImage() {
  console.log('🛡️  Vérification de la présence de l\'image hero par défaut...');

  const heroCategory = 'hero';
  const heroImage = await prisma.image.findFirst({
    where: { category: heroCategory },
  });

  if (heroImage) {
    console.log('✅ L\'image hero par défaut est déjà présente en base.');
    return true; // Indique que l'image hero est présente
  }

  console.log('⚠️ Aucune image de catégorie "hero" trouvée. Tentative de création...');

  const heroImagePath = path.join(UPLOADS_DIR, DEFAULT_HERO_IMAGE);

  try {
    await fs.access(heroImagePath);
  } catch (error) {
    console.error(`❌ Fichier de l'image hero par défaut introuvable : ${heroImagePath}`);
    console.error('Veuillez vous assurer que le fichier existe et que le script a les permissions de le lire.');
    return false; // Indique un échec
  }

  try {
    const stats = await fs.stat(heroImagePath);
    const metadata = await sharp(heroImagePath).metadata();
    const fileUrl = `/uploads/${DEFAULT_HERO_IMAGE}`;

    const imageData = {
      id: uuidv4(),
      title: 'Image Hero par défaut',
      altText: 'Image principale du site',
      url: fileUrl,
      originalUrl: `${SERVER_URL}${fileUrl}`,
      optimizedUrl: `${SERVER_URL}/uploads/1751345498261-ac03ee50-bff0-4036-b925-ce80f0209e15-optimized.webp`,
      thumbnailUrl: `${SERVER_URL}/uploads/1751345498261-ac03ee50-bff0-4036-b925-ce80f0209e15-thumbnail.webp`,
      category: heroCategory,
      size: stats.size,
      width: metadata.width || 0,
      height: metadata.height || 0,
      mimeType: `image/${metadata.format}`,
    };

    await prisma.image.create({ data: imageData });
    console.log('✅ L\'image hero par défaut a été ajoutée à la base de données.');
    return true;

  } catch (dbError) {
    console.error('❌ Erreur lors de la création de l\'image hero en base de données :', dbError);
    return false;
  }
}

/**
 * Scanne les sous-dossiers d'uploads pour synchroniser les images par catégorie.
 */
async function syncCategoryImages() {
  console.log('\n🔄 Démarrage de la synchronisation des images par catégorie...');
  const categories = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
  let newImagesCount = 0;
  let processedImagesCount = 0;

  for (const categoryDir of categories) {
    if (categoryDir.isDirectory()) {
      const category = categoryDir.name;
      console.log(`\n🔎 Traitement de la catégorie : ${category}`);
      const categoryPath = path.join(UPLOADS_DIR, category);
      const files = await fs.readdir(categoryPath);

      for (const file of files) {
        processedImagesCount++;
        const filePath = path.join(categoryPath, file);
        const fileUrl = `/uploads/${category}/${file}`;

        const existingImage = await prisma.image.findUnique({ where: { url: fileUrl } });
        if (existingImage) {
          console.log(`- Image déjà en base : ${fileUrl}`);
          continue;
        }

        console.log(`+ Nouvelle image détectée : ${fileUrl}. Ajout en cours...`);
        try {
          const stats = await fs.stat(filePath);
          const metadata = await sharp(filePath).metadata();
          const imageData = {
            id: uuidv4(),
            title: path.basename(file, path.extname(file)).replace(/[-_]/g, ' '),
            altText: `Image pour la catégorie ${category}`,
            url: fileUrl,
            originalUrl: `${SERVER_URL}${fileUrl}`,
            optimizedUrl: `${SERVER_URL}${fileUrl}`,
            thumbnailUrl: `${SERVER_URL}${fileUrl}`,
            category: category.toLowerCase(),
            size: stats.size,
            width: metadata.width || 0,
            height: metadata.height || 0,
            mimeType: `image/${metadata.format}`,
          };
          await prisma.image.create({ data: imageData });
          console.log(`✅ Image ajoutée avec succès : ${file}`);
          newImagesCount++;
        } catch (sharpError) {
          console.error(`❌ Erreur lors du traitement de l'image ${file} :`, sharpError.message);
        }
      }
    }
  }
  return { processedImagesCount, newImagesCount };
}

/**
 * Fonction principale du script.
 */
async function main() {
  console.log('🚀 Démarrage du script de synchronisation des images...');
  try {
    const heroReady = await ensureDefaultHeroImage();
    if (!heroReady) {
      console.log('\n🛑 Le script ne peut pas continuer sans l\'image hero. Arrêt.');
      return;
    }

    const { processedImagesCount, newImagesCount } = await syncCategoryImages();

    console.log('\n-----------------------------------------');
    console.log('🎉 Synchronisation terminée !');
    console.log(`🖼️  Images des catégories traitées : ${processedImagesCount}`);
    console.log(`✨ Nouvelles images des catégories ajoutées : ${newImagesCount}`);
    console.log('-----------------------------------------');

  } catch (error) {
    console.error('❌ Une erreur critique est survenue durant la synchronisation :', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    console.log('🔌 Connexion à la base de données fermée.');
  }
}

// Lancement du script
main();
