const express = require('express');
const router = express.Router();
const { ApifyClient } = require('apify-client');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Dossier pour stocker les images Instagram en cache
const INSTAGRAM_CACHE_DIR = path.join(__dirname, '../../uploads/instagram-cache');

// Créer le dossier de cache s'il n'existe pas
if (!fs.existsSync(INSTAGRAM_CACHE_DIR)) {
    fs.mkdirSync(INSTAGRAM_CACHE_DIR, { recursive: true });
    console.log(`📂 Dossier de cache Instagram créé: ${INSTAGRAM_CACHE_DIR}`);
}

// Initialiser le client Apify avec le token API
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Route pour récupérer les posts Instagram
router.get('/', async (req, res) => {
    try {
        console.log('📸 Récupération des posts Instagram...');
        
        // Préparer les paramètres pour l'Actor Apify
        const input = {
            "username": ["taxi.amore"],
            "resultsLimit": 7  // Récupérer les 7 derniers posts
        };

        // Exécuter l'Actor et attendre qu'il termine
        const run = await client.actor("nH2AHrwxeTRJoN5hX").call(input);
        
        // Récupérer les résultats depuis le dataset de l'Actor
        const { items } = await client.dataset(run.defaultDatasetId).listItems();
        
        // Transformer les données pour correspondre à notre format
        const posts = items.map(item => {
            // Récupérer l'URL de la première image si c'est un carrousel
            const imageUrl = item.type === 'Carousel' && item.carouselMedia && item.carouselMedia.length > 0
                ? item.carouselMedia[0].displayUrl
                : item.displayUrl;
            
            // Générer un nom de fichier unique pour le cache
            const filename = `instagram-${item.id}.jpg`;
            
            // URL pour accéder à l'image via notre proxy
            const proxyUrl = `/api/instagram/image/${filename}`;
                
            return {
                id: item.id,
                url: `https://www.instagram.com/p/${item.shortCode}/`,
                originalImageUrl: imageUrl,  // Garder l'URL originale pour référence
                thumbnailUrl: proxyUrl,      // Utiliser notre URL proxy
                caption: item.caption || '',
                timestamp: item.timestamp,
                likes: item.likesCount,
                comments: item.commentsCount,
                filename: filename           // Nom du fichier en cache
            };
        });
        
        // Télécharger les images en arrière-plan
        posts.forEach(post => {
            downloadInstagramImage(post.originalImageUrl, post.filename)
                .catch(err => console.error(`Erreur lors du téléchargement de l'image ${post.id}:`, err));
        });

        // Retourner les posts formatés
        res.json({
            success: true,
            posts
        });
    } catch (error) {
        console.error('❌ Erreur lors de la récupération des posts Instagram:', error);
        
        // En cas d'erreur, retourner un message d'erreur
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des posts Instagram',
            message: error.message
        });
    }
});

// Route pour servir les images Instagram via proxy
router.get('/image/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(INSTAGRAM_CACHE_DIR, filename);
        
        // Vérifier si l'image est déjà en cache
        if (fs.existsSync(filePath)) {
            console.log(`📸 Servir l'image Instagram depuis le cache: ${filename}`);
            return res.sendFile(filePath);
        }
        
        // Si l'image n'est pas en cache, renvoyer une erreur 404
        console.error(`❌ Image Instagram non trouvée dans le cache: ${filename}`);
        return res.status(404).json({ error: 'Image non trouvée' });
    } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'image Instagram:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de l\'image Instagram',
            message: error.message
        });
    }
});

/**
 * Télécharge une image Instagram et la stocke dans le cache
 * @param {string} imageUrl - URL de l'image Instagram
 * @param {string} filename - Nom du fichier pour le stockage
 */
async function downloadInstagramImage(imageUrl, filename) {
    const filePath = path.join(INSTAGRAM_CACHE_DIR, filename);
    
    // Vérifier si l'image existe déjà en cache
    if (fs.existsSync(filePath)) {
        console.log(`📸 Image Instagram déjà en cache: ${filename}`);
        return;
    }
    
    console.log(`📸 Téléchargement de l'image Instagram: ${filename}`);
    
    try {
        // Télécharger l'image
        const response = await axios({
            method: 'GET',
            url: imageUrl,
            responseType: 'stream',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.instagram.com/'
            }
        });
        
        // Sauvegarder l'image dans le cache
        const writer = fs.createWriteStream(filePath);
        response.data.pipe(writer);
        
        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log(`✅ Image Instagram téléchargée avec succès: ${filename}`);
                resolve();
            });
            writer.on('error', reject);
        });
    } catch (error) {
        console.error(`❌ Erreur lors du téléchargement de l'image Instagram ${filename}:`, error);
        throw error;
    }
}

module.exports = router;
