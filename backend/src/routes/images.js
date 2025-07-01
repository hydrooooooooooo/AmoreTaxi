const express = require('express');
const upload = require('../middleware/upload');
const ImageProcessor = require('../utils/imageProcessor');
const prisma = require('../db/prisma'); // Importer Prisma
const router = express.Router();

// GET /api/images - Récupérer toutes les images
router.get('/', async (req, res, next) => {
  console.log(`[GET /api/images] Requête reçue avec les paramètres:`, req.query);
  const { category, page = 1, limit = 20 } = req.query;

  try {
        const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || isNaN(limitNum) || pageNum <= 0 || limitNum <= 0) {
      console.error(`[GET /api/images] Paramètres de pagination invalides: page=${page}, limit=${limit}`);
      return res.status(400).json({ error: 'Paramètres de pagination invalides.' });
    }

    const skip = (pageNum - 1) * limitNum;
    console.log(`[GET /api/images] Pagination calculée: page=${pageNum}, limit=${limitNum}, skip=${skip}`);

    let whereClause = {};
    if (category) {
      whereClause = {
        OR: [
          { category: category },
          { category: { startsWith: `${category}_` } }
        ]
      };
    }

        console.log(`[GET /api/images] Clause 'where' de Prisma:`, whereClause);

    const totalImages = await prisma.image.count({ where: whereClause });
    console.log(`[GET /api/images] Nombre total d'images trouvées: ${totalImages}`);

    const images = await prisma.image.findMany({
      where: whereClause,
      skip: skip,
      take: limitNum,
      orderBy: {
        uploadedAt: 'desc'
      }
    });

    console.log(`[GET /api/images] ${images.length} images récupérées de la BDD.`);

    res.json({
      data: images,
      totalPages: Math.ceil(totalImages / limitNum),
      currentPage: pageNum,
      totalImages: totalImages
    });
  } catch (error) {
        console.error('[GET /api/images] ERREUR CRITIQUE DANS LE BLOC TRY/CATCH:', error);
        next(error);
  }
});

// POST /api/images/upload - Upload d'une image
router.post('/upload', upload.single('image'), async (req, res) => {
  console.log('📷 Début du traitement de l\'upload...');
  
  try {
    if (!req.file) {
      console.error('❌ Aucun fichier fourni dans la requête');
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }
    
    console.log(`✅ Fichier reçu: ${req.file.originalname} (${req.file.size} octets)`);

    // Traiter l'image avec Sharp
    console.log(`🔄 Traitement de l'image: ${req.file.filename}...`);
    const processedImages = await ImageProcessor.processUploadedImage(req.file);
    console.log('✅ Traitement terminé avec succès');
    
    // Construction de l'URL complète avec le domaine du serveur
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    
    const imageData = {
      // uuid est généré automatiquement par la DB
      filename: req.file.filename,
      originalName: req.file.originalname,
      url: `${serverUrl}${processedImages.optimized.url}`,
      originalUrl: `${serverUrl}${processedImages.original.url}`,
      thumbnailUrl: `${serverUrl}${processedImages.thumbnail.url}`,
      size: processedImages.optimized.size,
      width: processedImages.optimized.width,
      height: processedImages.optimized.height,
      mimeType: 'image/webp',
      category: req.body.category || 'general',
      altText: req.body.altText || null
    };

    // Ajouter à la base de données via Prisma
    const newImage = await prisma.image.create({
      data: imageData
    });

    console.log(`✅ Image traitée et enregistrée en BDD: ${newImage.filename}`);

    res.status(201).json({
      success: true,
      data: newImage
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload'
    });
  }
});

// DELETE /api/images/:uuid - Supprimer une image par son UUID
router.delete('/:uuid', async (req, res) => {
  const { uuid } = req.params;
  
  try {
    // Optionnel : vous pourriez ajouter ici la logique pour supprimer les fichiers physiques du serveur
    
    await prisma.image.delete({
      where: { uuid }
    });
    
    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });
  } catch (error) {
    console.error(`Erreur lors de la suppression de l'image ${uuid}:`, error);
    // Erreur P2025 de Prisma est levée si l'enregistrement n'est pas trouvé
    res.status(404).json({ 
      success: false,
      error: 'Image non trouvée ou erreur lors de la suppression'
    });
  }
});

module.exports = router;
