const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

/**
 * Utilitaire pour le traitement des images
 * Permet de redimensionner, optimiser et créer des versions miniatures des images
 */
class ImageProcessor {
  /**
   * Redimensionne et optimise une image
   * @param {string} inputPath - Chemin de l'image source
   * @param {string} outputPath - Chemin de destination
   * @param {Object} options - Options de redimensionnement
   * @returns {Promise<Object>} - Informations sur l'image traitée
   */
  static async resizeAndOptimize(inputPath, outputPath, options = {}) {
    const {
      width = 1200,
      height = null,
      quality = 80,
      format = 'webp'
    } = options;

    try {
      // Créer le dossier de destination s'il n'existe pas
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Traitement de l'image avec Sharp
      let sharpInstance = sharp(inputPath);
      
      // Redimensionnement
      sharpInstance = sharpInstance.resize({
        width,
        height,
        fit: 'inside',
        withoutEnlargement: true
      });

      // Conversion de format et optimisation
      if (format === 'webp') {
        sharpInstance = sharpInstance.webp({ quality });
      } else if (format === 'jpeg' || format === 'jpg') {
        sharpInstance = sharpInstance.jpeg({ quality });
      } else if (format === 'png') {
        sharpInstance = sharpInstance.png({ quality });
      }

      // Enregistrement de l'image
      await sharpInstance.toFile(outputPath);
      
      // Récupération des métadonnées
      const metadata = await sharp(outputPath).metadata();
      
      return {
        path: outputPath,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: fs.statSync(outputPath).size
      };
    } catch (error) {
      console.error('Erreur lors du traitement de l\'image:', error);
      throw error;
    }
  }

  /**
   * Crée une miniature d'une image
   * @param {string} inputPath - Chemin de l'image source
   * @param {string} outputPath - Chemin de destination pour la miniature
   * @param {number} size - Taille de la miniature (carré)
   * @returns {Promise<Object>} - Informations sur la miniature
   */
  static async createThumbnail(inputPath, outputPath, size = 300) {
    try {
      // Créer le dossier de destination s'il n'existe pas
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'centre'
        })
        .webp({ quality: 70 })
        .toFile(outputPath);
      
      return {
        path: outputPath,
        width: size,
        height: size,
        format: 'webp'
      };
    } catch (error) {
      console.error('Erreur lors de la création de la miniature:', error);
      throw error;
    }
  }

  /**
   * Traite une image téléchargée en créant différentes versions
   * @param {Object} file - Fichier téléchargé via Multer
   * @returns {Promise<Object>} - Chemins des différentes versions de l'image
   */
  static async processUploadedImage(file) {
    const originalPath = file.path;
    const filename = path.basename(file.filename, path.extname(file.filename));
    const uploadsDir = path.dirname(originalPath);
    
    // Chemins pour les différentes versions
    const optimizedPath = path.join(uploadsDir, `${filename}-optimized.webp`);
    const thumbnailPath = path.join(uploadsDir, `${filename}-thumbnail.webp`);
    
    try {
      // Créer les versions optimisées et miniatures
      const [optimized, thumbnail] = await Promise.all([
        this.resizeAndOptimize(originalPath, optimizedPath),
        this.createThumbnail(originalPath, thumbnailPath)
      ]);
      
      // Générer des URLs compatibles avec CORS en utilisant l'endpoint API
      // Cela évite les problèmes de chargement d'images dans le frontend
      return {
        original: {
          path: originalPath,
          // Deux formats d'URL pour assurer la compatibilité
          url: `/api/serve-image/${path.basename(originalPath)}`,
          directUrl: `/uploads/${path.basename(originalPath)}`,
          size: file.size
        },
        optimized: {
          path: optimizedPath,
          url: `/api/serve-image/${path.basename(optimizedPath)}`,
          directUrl: `/uploads/${path.basename(optimizedPath)}`,
          size: optimized.size,
          width: optimized.width,
          height: optimized.height
        },
        thumbnail: {
          path: thumbnailPath,
          url: `/api/serve-image/${path.basename(thumbnailPath)}`,
          directUrl: `/uploads/${path.basename(thumbnailPath)}`,
          width: thumbnail.width,
          height: thumbnail.height
        }
      };
    } catch (error) {
      console.error('Erreur lors du traitement de l\'image:', error);
      throw error;
    }
  }
}

module.exports = ImageProcessor;
