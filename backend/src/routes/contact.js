const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

// GET /api/contact - Lister tous les messages de contact
router.get('/', async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: "Impossible de récupérer les messages" });
  }
});

// POST /api/contact - Créer un nouveau message de contact
router.post('/', async (req, res) => {
  try {
    const newMessage = await prisma.contactMessage.create({
      data: req.body,
    });
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ error: "Impossible de créer le message" });
  }
});

module.exports = router;
