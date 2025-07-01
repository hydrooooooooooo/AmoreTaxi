const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');
const upload = require('./middleware/upload');
const ImageProcessor = require('./utils/imageProcessor');
const { v4: uuidv4 } = require('uuid');

// Charger les variables d'environnement
dotenv.config();

// Créer l'application Express
const app = express();
// Forcer le port 3000 pour garantir la cohérence avec le frontend
const PORT = 3000;

// Base de données simple en mémoire pour stocker les images
// let images = []; // Remplacé par la base de données Prisma

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: false // Désactivé pour faciliter le développement
}));

// Configuration CORS simplifiée pour le développement
app.use(cors({
  origin: '*', // Autoriser toutes les origines en développement
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));

// Ajouter des en-têtes CORS globaux pour tous les endpoints
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

// Parser pour JSON et formulaires
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging pour le débogage
app.use((req, res, next) => {
  console.log(`🔎 ${req.method} ${req.originalUrl}`);
  next();
});

// Créer le dossier uploads s'il n'existe pas
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`📂 Dossier uploads créé: ${uploadsDir}`);
}

// Configuration simplifiée pour servir les fichiers statiques
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, filePath) => {
    // Ajouter des en-têtes pour tous les fichiers statiques
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    
    // Cache pour les images
    if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.set('Cache-Control', 'public, max-age=86400'); // Cache de 24h
    }
  }
}));

// Middleware de débogage pour les requêtes vers /uploads
app.use('/uploads', (req, res, next) => {
  console.log(`💾 Accès fichier statique: ${req.path}`);
  next();
});

// Routes API
app.use('/api/images', require('./routes/images'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/instagram', require('./routes/instagram'));
app.use('/api/events', require('./routes/events'));
app.use('/api/contact-messages', require('./routes/contactMessages'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/email-config', require('./routes/emailConfig'));
app.use('/api/expenses', require('./routes/expenses'));

// Route spéciale pour servir les images via l'API avec CORS appropriés
app.get('/api/serve-image/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, '../uploads', filename);
  
  console.log(`💾 Requête pour servir l'image: ${filename}`);
  
  // Vérifier si le fichier existe
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Fichier non trouvé: ${filePath}`);
    return res.status(404).json({ error: 'Image non trouvée' });
  }
  
  // Déterminer le type MIME
  let contentType = 'image/jpeg';
  if (filename.endsWith('.png')) contentType = 'image/png';
  if (filename.endsWith('.webp')) contentType = 'image/webp';
  if (filename.endsWith('.gif')) contentType = 'image/gif';
  
  // Définir les en-têtes CORS et de cache
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Content-Type', contentType);
  res.header('Cache-Control', 'public, max-age=86400'); // Cache de 24h
  
  // Envoyer le fichier
  fs.createReadStream(filePath).pipe(res);
});

// Redirection de l'ancien endpoint d'upload vers le nouveau
app.post('/images/upload', (req, res) => {
  console.log('🛠️ Redirection de l\'ancien endpoint d\'upload vers le nouveau');
  // Rediriger vers le bon endpoint
  res.redirect(307, '/api/images/upload');
});

// Route de test pour vérifier que le serveur fonctionne
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Le serveur fonctionne correctement!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Route racine pour vérifier que le serveur fonctionne (alternative)
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API Taxi Amore Love - Serveur en ligne',
    timestamp: new Date().toISOString()
  });
});

// Servir la page de test HTML
app.get('/test-upload', (req, res) => {
  res.sendFile(path.join(__dirname, '../test-upload.html'));
});

// Middleware pour les routes non trouvées (404)
// Ce middleware doit être placé après toutes les autres routes.
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Route non trouvée: ${req.method} ${req.originalUrl}`
  });
});

// Gestionnaire d'erreurs global
// Ce middleware doit être le tout dernier middleware `app.use`.
app.use((err, req, res, next) => {
  console.error('❌ Erreur non gérée:', err.stack);
  res.status(500).json({ 
    error: 'Une erreur interne est survenue sur le serveur.',
    message: process.env.NODE_ENV === 'development' ? err.message : err.toString()
  });
});

app.listen(PORT, () => {
  console.log(`
✨ Serveur démarré sur http://localhost:${PORT}
✅ Endpoints disponibles:
  - GET /api/health - Vérifier l'état du serveur
  - GET /api/images - Récupérer toutes les images
  - POST /api/images/upload - Uploader une image
  - DELETE /api/images/:id - Supprimer une image
  - GET /api/categories - Récupérer toutes les catégories
  - GET /api/categories/:id - Récupérer une catégorie par ID
  - POST /api/categories - Créer une nouvelle catégorie
  - PUT /api/categories/:id - Mettre à jour une catégorie
  - DELETE /api/categories/:id - Supprimer une catégorie
  - GET /api/instagram - Récupérer les posts Instagram
  - GET /test-upload - Page de test HTML
`);
});
