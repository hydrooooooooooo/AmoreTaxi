const express = require('express');
const prisma = require('../db/prisma');
const { MessageStatus, ProcessingStatus, PaymentStatus } = require('@prisma/client');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// POST /api/contact-messages - Créer un nouveau message (public)
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message, deliveryAddress } = req.body;

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ error: 'Les champs nom, email, sujet et message sont requis.' });
  }

  try {
    const newMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        phone,
        subject,
        message,
        deliveryAddress,
        ipAddress: req.ip,
      },
    });
    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Erreur lors de la création du message:', error);
    res.status(500).json({ error: 'Erreur lors de la soumission du message.' });
  }
});

// Appliquer le middleware d'authentification pour les routes suivantes
router.use(authMiddleware);

// GET /api/contact-messages - Récupérer tous les messages (protégé)
router.get('/', async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { submittedAt: 'desc' },
    });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la récupération des messages.' });
  }
});

// PATCH /api/contact-messages/:id - Mettre à jour un message (protégé)
router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { status, processingStatus, paymentStatus } = req.body;

  const dataToUpdate = {};

  if (status) {
    if (!Object.values(MessageStatus).includes(status)) {
      return res.status(400).json({ error: `Valeur de statut invalide: ${status}` });
    }
    dataToUpdate.status = status;
  }

  if (processingStatus) {
    if (!Object.values(ProcessingStatus).includes(processingStatus)) {
      return res.status(400).json({ error: `Valeur de statut de traitement invalide: ${processingStatus}` });
    }
    dataToUpdate.processingStatus = processingStatus;
  }

  if (paymentStatus) {
    if (!Object.values(PaymentStatus).includes(paymentStatus)) {
      return res.status(400).json({ error: `Valeur de statut de paiement invalide: ${paymentStatus}` });
    }
    dataToUpdate.paymentStatus = paymentStatus;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ error: 'Aucune donnée de mise à jour fournie.' });
  }

  try {
    const updatedMessage = await prisma.contactMessage.update({
      where: { id },
      data: dataToUpdate,
    });
    res.json(updatedMessage);
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Message non trouvé.' });
    }
    res.status(500).json({ error: 'Erreur lors de la mise à jour du message.' });
  }
});

// DELETE /api/contact-messages/:id - Supprimer un message (protégé)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await prisma.contactMessage.delete({
      where: { id },
    });
    res.status(204).send(); // No Content
  } catch (error) {
    if (error.code === 'P2025') { // Code d'erreur Prisma pour 'non trouvé'
      return res.status(404).json({ error: 'Message non trouvé.' });
    }
    res.status(500).json({ error: 'Erreur lors de la suppression du message.' });
  }
});

module.exports = router;
