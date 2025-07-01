const express = require('express');
const router = express.Router();
const { ApifyClient } = require('apify-client');
const prisma = require('../db/prisma');

// Initialiser le client Apify avec le token API
const client = new ApifyClient({
    token: process.env.APIFY_API_TOKEN,
});

// Durée de validité du cache en millisecondes (1 heure)
const CACHE_DURATION_MS = 60 * 60 * 1000;

// Formatter les données de la BDD pour le frontend
const formatPostsForFrontend = (posts) => {
    return posts.map(p => ({
        id: p.id,
        caption: p.caption,
        url: p.permalink, // Mapper permalink vers url
        thumbnailUrl: p.mediaUrl, // Mapper mediaUrl vers thumbnailUrl
        timestamp: p.timestamp,
    }));
};

// Route pour récupérer le flux Instagram
router.get('/', async (req, res) => {
    try {
        // 1. Vérifier le cache dans la base de données
        const latestPost = await prisma.instagramPost.findFirst({
            orderBy: { createdAt: 'desc' },
        });

        const isCacheStale = !latestPost || (new Date() - new Date(latestPost.createdAt) > CACHE_DURATION_MS);

        if (!isCacheStale) {
            console.log('📸 Servir le flux Instagram depuis le cache de la BDD');
            const postsFromDb = await prisma.instagramPost.findMany({
                orderBy: { timestamp: 'desc' },
            });
            return res.json({ success: true, posts: formatPostsForFrontend(postsFromDb), source: 'cache' });
        }

        console.log('🔄 Le cache est obsolète, récupération des nouveaux posts depuis l\'API...');
        
        // 2. Si le cache est obsolète, appeler Apify
        const input = {
            "username": ["taxi.amore"],
            "resultsLimit": 12 // On récupère 12 posts pour avoir un cache conséquent
        };

        const run = await client.actor("nH2AHrwxeTRJoN5hX").call(input);
        const { items } = await client.dataset(run.defaultDatasetId).listItems();

        if (!items || items.length === 0) {
            throw new Error('Aucun post retourné par Apify');
        }

        // 3. Transformer les données pour le format de la BDD
        const postsForDb = items.map(item => {
            const mediaUrl = item.type === 'Carousel' && item.carouselMedia && item.carouselMedia.length > 0
                ? item.carouselMedia[0].displayUrl
                : item.displayUrl;
            
            return {
                id: item.id,
                caption: item.caption || null,
                mediaType: item.type,
                mediaUrl: mediaUrl,
                permalink: `https://www.instagram.com/p/${item.shortCode}/`,
                timestamp: new Date(item.timestamp),
            };
        });

        // 4. Mettre à jour la base de données via une transaction d'upsert
        const upsertOperations = postsForDb.map(post =>
            prisma.instagramPost.upsert({
                where: { id: post.id },
                update: { ...post, updatedAt: new Date() },
                create: post,
            })
        );
        
        await prisma.$transaction(upsertOperations);
        console.log(`✅ ${postsForDb.length} posts ont été insérés/mis à jour dans la base de données.`);

        // 5. Renvoyer les nouveaux posts formatés pour le frontend
        res.json({ success: true, posts: formatPostsForFrontend(postsForDb), source: 'api' });

    } catch (error) {
        console.error('❌ Erreur lors de la récupération du flux Instagram:', error);
        
        // En cas d'échec de l'API, essayer de servir une version obsolète du cache
        try {
            const stalePosts = await prisma.instagramPost.findMany({
                orderBy: { timestamp: 'desc' },
            });
            if (stalePosts && stalePosts.length > 0) {
                console.log('⚠️ L\'appel API a échoué. Service du cache obsolète comme solution de secours.');
                return res.json({ success: true, posts: formatPostsForFrontend(stalePosts), source: 'stale_cache' });
            }
        } catch (cacheError) {
             console.error('❌ Erreur lors de la récupération du cache de secours:', cacheError);
        }

        // Si tout échoue, renvoyer une erreur
        res.status(500).json({
            success: false,
            error: 'Impossible de récupérer le flux Instagram',
            message: error.message,
        });
    }
});

module.exports = router;
