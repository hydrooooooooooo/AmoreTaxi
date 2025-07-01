const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

// GET /api/events - Lister tous les événements
router.get('/', async (req, res) => {
  try {
    const events = await prisma.event.findMany();
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: "Impossible de récupérer les événements" });
  }
});

// POST /api/events - Créer un nouvel événement
router.post('/', async (req, res) => {
  try {
    const newEvent = await prisma.event.create({
      data: req.body,
    });
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(500).json({ error: "Impossible de créer l'événement" });
  }
});

module.exports = router;
