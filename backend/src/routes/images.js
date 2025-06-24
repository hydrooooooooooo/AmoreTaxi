const express = require('express');
const upload = require('../middleware/upload');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ImageProcessor = require('../utils/imageProcessor');
const router = express.Router();

// Base de données simple en mémoire (remplacez par une vraie DB plus tard)
let images = [];

// GET /api/images - Récupérer toutes les images
router.get('/', (req, res) => {
  const { category } = req.query;
  
  let filteredImages = images;
  if (category) {
    filteredImages = images.filter(img => img.category === category);
  }
  
  res.json({
    success: true,
    data: filteredImages
  });
});

// POST /api/images/upload - Upload d'une image
router.post('/upload', upload.single('image'), async (req, res) => {
  console.log('📷 Début du traitement de l\'upload...');
  console.log('Headers de la requête:', req.headers);
  
  try {
    if (!req.file) {
      console.error('❌ Aucun fichier fourni dans la requête');
      return res.status(400).json({
        success: false,
        error: 'Aucun fichier fourni'
      });
    }
    
    console.log(`✅ Fichier reçu: ${req.file.originalname} (${req.file.size} octets)`);

    // Traiter l'image avec Sharp pour créer des versions optimisées et miniatures
    console.log(`🔄 Traitement de l'image: ${req.file.filename}...`);
    const processedImages = await ImageProcessor.processUploadedImage(req.file);
    console.log('✅ Traitement terminé avec succès');
    
    // Construction de l'URL complète avec le domaine du serveur
    const serverUrl = `${req.protocol}://${req.get('host')}`;
    
    const imageData = {
      id: uuidv4(),
      filename: req.file.filename,
      originalName: req.file.originalname,
      // Utiliser les URLs absolues pour éviter les problèmes CORS
      url: `${serverUrl}${processedImages.optimized.url}`,
      originalUrl: `${serverUrl}${processedImages.original.url}`,
      thumbnailUrl: `${serverUrl}${processedImages.thumbnail.url}`,
      size: processedImages.optimized.size,
      width: processedImages.optimized.width,
      height: processedImages.optimized.height,
      mimeType: 'image/webp', // Les images optimisées sont converties en WebP
      category: req.body.category || 'general',
      uploadedAt: new Date().toISOString()
    };

    // Ajouter à la "base de données"
    images.push(imageData);

    console.log(`✅ Image traitée et uploadée: ${imageData.filename}`);

    res.json({
      success: true,
      data: imageData
    });
  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'upload'
    });
  }
});

// DELETE /api/images/:id - Supprimer une image
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  const index = images.findIndex(img => img.id === id);
  
  if (index === -1) {
    return res.status(404).json({
      success: false,
      error: 'Image non trouvée'
    });
  }
  
  images.splice(index, 1);
  
  res.json({
    success: true,
    message: 'Image supprimée'
  });
});

module.exports = router;
