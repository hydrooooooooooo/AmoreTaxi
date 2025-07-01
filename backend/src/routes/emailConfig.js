const express = require('express');
const prisma = require('../db/prisma');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Middleware d'authentification pour toutes les routes de ce fichier
router.use(authMiddleware);

// GET /api/email-config - Récupérer la configuration email de l'utilisateur
router.get('/', async (req, res) => {
  try {
    const emailConfig = await prisma.emailConfig.findUnique({
      where: { userId: req.user.id },
    });

    if (!emailConfig) {
      return res.status(404).json({ error: 'Configuration email non trouvée.' });
    }

    // Exclure les informations sensibles si nécessaire avant de les envoyer
    const { password, ...config } = emailConfig;

    res.json({ data: config });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération de la configuration.' });
  }
});

// POST /api/email-config - Créer ou mettre à jour la configuration email
router.post('/', async (req, res) => {
  const { smtpHost, smtpPort, email, password, fromName, toEmail } = req.body;

  if (!smtpHost || !smtpPort || !email || !password || !fromName || !toEmail) {
    return res.status(400).json({ error: 'Tous les champs sont requis.' });
  }

  const configData = {
    smtpHost,
    smtpPort: parseInt(smtpPort, 10),
    email,
    password, // Idéalement, chiffrer ce mot de passe avant de le stocker
    fromName,
    toEmail,
    userId: req.user.id,
  };

  try {
    const newOrUpdatedConfig = await prisma.emailConfig.upsert({
      where: { userId: req.user.id },
      update: configData,
      create: configData,
    });

    res.status(201).json({ message: 'Configuration enregistrée.', data: newOrUpdatedConfig });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la configuration.' });
  }
});

// DELETE /api/email-config - Supprimer la configuration email de l'utilisateur
router.delete('/', async (req, res) => {
  try {
    await prisma.emailConfig.delete({
      where: { userId: req.user.id },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    // Prisma error code for 'Record to delete does not exist.'
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Configuration email non trouvée.' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression de la configuration.' });
  }
});

module.exports = router;
