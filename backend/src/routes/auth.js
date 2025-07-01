const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db/prisma');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// POST /api/auth/register - Inscription d'un nouvel utilisateur
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe sont requis.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    res.status(201).json({ message: 'Utilisateur créé avec succès.', userId: user.id });
  } catch (error) {
    // P2002 est le code d'erreur de Prisma pour une contrainte unique violée (ex: email déjà utilisé)
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Cet email est déjà utilisé.' });
    }
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
  }
});

// POST /api/auth/login - Connexion d'un utilisateur
router.post('/login', async (req, res) => {
  const { password } = req.body;
  const adminEmail = 'hydrocaptorix@gmail.com'; // L'email de l'administrateur est fixé

  if (!password) {
    return res.status(400).json({ error: 'Le mot de passe est requis.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!user) {
      return res.status(401).json({ error: 'Utilisateur administrateur non configuré. Veuillez exécuter le script de configuration.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Mot de passe incorrect.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' } // Le token expire après 24 heures
    );

    res.json({ message: 'Connexion réussie.', token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erreur lors de la connexion.' });
  }
});

// GET /api/auth/me - Vérifier le token et récupérer les infos de l'utilisateur
router.get('/me', authMiddleware, (req, res) => {
  // Si le middleware passe, l'utilisateur est authentifié.
  // Les informations de l'utilisateur (sans le mot de passe) sont dans req.user
  res.json({ user: req.user });
});

module.exports = router;
