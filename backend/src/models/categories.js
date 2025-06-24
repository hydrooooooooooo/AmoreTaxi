/**
 * Modèle pour la gestion des catégories d'images
 */

// Liste des catégories prédéfinies
const predefinedCategories = [
  {
    id: 'fleurs',
    name: 'Fleurs',
    description: 'Fleurs individuelles et compositions florales',
    icon: 'flower'
  },
  {
    id: 'bouquets',
    name: 'Bouquets',
    description: 'Bouquets pour toutes occasions',
    icon: 'bouquet'
  },
  {
    id: 'evenements',
    name: 'Événements',
    description: 'Décorations florales pour événements',
    icon: 'event'
  },
  {
    id: 'mariage',
    name: 'Mariage',
    description: 'Compositions florales pour mariages',
    icon: 'ring'
  },
  {
    id: 'deuil',
    name: 'Deuil',
    description: 'Compositions florales pour obsèques',
    icon: 'wreath'
  },
  {
    id: 'general',
    name: 'Général',
    description: 'Images diverses',
    icon: 'image',
    isDefault: true
  }
];

// Base de données simple en mémoire pour les catégories
let categories = [...predefinedCategories];

/**
 * Service de gestion des catégories
 */
const categoryService = {
  /**
   * Récupère toutes les catégories
   * @returns {Array} Liste des catégories
   */
  getAllCategories() {
    return categories;
  },

  /**
   * Récupère une catégorie par son ID
   * @param {string} id - ID de la catégorie
   * @returns {Object|null} Catégorie trouvée ou null
   */
  getCategoryById(id) {
    return categories.find(cat => cat.id === id) || null;
  },

  /**
   * Ajoute une nouvelle catégorie
   * @param {Object} category - Données de la catégorie
   * @returns {Object} Catégorie créée
   */
  addCategory(category) {
    // Vérifier si la catégorie existe déjà
    if (categories.some(cat => cat.id === category.id)) {
      throw new Error(`La catégorie avec l'ID ${category.id} existe déjà`);
    }

    categories.push(category);
    return category;
  },

  /**
   * Met à jour une catégorie existante
   * @param {string} id - ID de la catégorie à mettre à jour
   * @param {Object} data - Nouvelles données
   * @returns {Object|null} Catégorie mise à jour ou null
   */
  updateCategory(id, data) {
    const index = categories.findIndex(cat => cat.id === id);
    if (index === -1) return null;

    // Mettre à jour la catégorie
    categories[index] = { ...categories[index], ...data };
    return categories[index];
  },

  /**
   * Supprime une catégorie
   * @param {string} id - ID de la catégorie à supprimer
   * @returns {boolean} Succès de l'opération
   */
  deleteCategory(id) {
    // Empêcher la suppression des catégories prédéfinies
    const isPredefined = predefinedCategories.some(cat => cat.id === id);
    if (isPredefined) {
      throw new Error('Impossible de supprimer une catégorie prédéfinie');
    }

    const initialLength = categories.length;
    categories = categories.filter(cat => cat.id !== id);
    return categories.length < initialLength;
  },

  /**
   * Récupère la catégorie par défaut
   * @returns {Object} Catégorie par défaut
   */
  getDefaultCategory() {
    return categories.find(cat => cat.isDefault) || categories[0];
  },

  /**
   * Valide une catégorie
   * @param {string} categoryId - ID de la catégorie à valider
   * @returns {string} ID de la catégorie validée ou ID de la catégorie par défaut
   */
  validateCategory(categoryId) {
    if (!categoryId) return this.getDefaultCategory().id;
    
    const exists = this.getCategoryById(categoryId);
    return exists ? categoryId : this.getDefaultCategory().id;
  }
};

module.exports = categoryService;
