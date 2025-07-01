const express = require('express');
const router = express.Router();
const prisma = require('../db/prisma');

// GET all expenses
router.get('/', async (req, res) => {
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { date: 'desc' },
    });
    res.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// POST a new expense
router.post('/', async (req, res) => {
  try {
    const { date, amount, category, description, supplier, receiptUrl, paymentMethod, status, notes, tags } = req.body;
    const newExpense = await prisma.expense.create({
      data: {
        date: new Date(date),
        amount: parseFloat(amount),
        category,
        description,
        supplier,
        receiptUrl,
        paymentMethod,
        status,
        notes,
        tags,
      },
    });
    res.status(201).json(newExpense);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// PUT to update an expense
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { date, amount, category, description, supplier, receiptUrl, paymentMethod, status, notes, tags } = req.body;
    const updatedExpense = await prisma.expense.update({
      where: { id: parseInt(id, 10) },
      data: {
        date: new Date(date),
        amount: parseFloat(amount),
        category,
        description,
        supplier,
        receiptUrl,
        paymentMethod,
        status,
        notes,
        tags,
      },
    });
    res.json(updatedExpense);
  } catch (error) {
    console.error(`Error updating expense ${id}:`, error);
    res.status(500).json({ error: `Failed to update expense ${id}` });
  }
});

// DELETE an expense
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.expense.delete({
      where: { id: parseInt(id, 10) },
    });
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting expense ${id}:`, error);
    res.status(500).json({ error: `Failed to delete expense ${id}` });
  }
});

module.exports = router;
