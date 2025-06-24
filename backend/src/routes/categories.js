const express = require('express');
const router = express.Router();
const categoryService = require('../models/categories');

/**
 * Routes pour la gestion des catégories d'images
 */

// GET /api/categories - Récupérer toutes les catégories
router.get('/', (req, res) => {
  try {
    const categories = categoryService.getAllCategories();
    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des catégories:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des catégories'
    });
  }
});

// GET /api/categories/:id - Récupérer une catégorie par son ID
router.get('/:id', (req, res) => {
  try {
    const category = categoryService.getCategoryById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Catégorie non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la catégorie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération de la catégorie'
    });
  }
});

// POST /api/categories - Créer une nouvelle catégorie
router.post('/', (req, res) => {
  try {
    const { id, name, description, icon } = req.body;
    
    // Validation des données
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        error: 'ID et nom sont requis'
      });
    }
    
    // Créer la catégorie
    const newCategory = categoryService.addCategory({
      id: id.toLowerCase(),
      name,
      description: description || '',
      icon: icon || 'folder',
      isDefault: false
    });
    
    res.status(201).json({
      success: true,
      data: newCategory
    });
  } catch (error) {
    console.error('Erreur lors de la création de la catégorie:', error);
    
    if (error.message.includes('existe déjà')) {
      return res.status(409).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la catégorie'
    });
  }
});

// PUT /api/categories/:id - Mettre à jour une catégorie
router.put('/:id', (req, res) => {
  try {
    const { name, description, icon } = req.body;
    const id = req.params.id;
    
    // Validation des données
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Le nom est requis'
      });
    }
    
    // Mettre à jour la catégorie
    const updatedCategory = categoryService.updateCategory(id, {
      name,
      description,
      icon
    });
    
    if (!updatedCategory) {
      return res.status(404).json({
        success: false,
        error: 'Catégorie non trouvée'
      });
    }
    
    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la catégorie:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la mise à jour de la catégorie'
    });
  }
});

// DELETE /api/categories/:id - Supprimer une catégorie
router.delete('/:id', (req, res) => {
  try {
    const result = categoryService.deleteCategory(req.params.id);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Catégorie non trouvée'
      });
    }
    
    res.json({
      success: true,
      message: 'Catégorie supprimée avec succès'
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la catégorie:', error);
    
    if (error.message.includes('prédéfinie')) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la catégorie'
    });
  }
});

module.exports = router;
