import React, { useState, useEffect } from 'react';
import { FirestoreService, COLLECTIONS } from '../../services/firestore';
import { Edit, Save, X } from 'lucide-react';

interface ReviewCategory {
  id: string;
  name: string;
  label: string;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
  order: number;
}

const MenteeReviewCategoriesAdmin: React.FC = () => {
  const [categories, setCategories] = useState<ReviewCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ReviewCategory>>({});

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await FirestoreService.getAll<ReviewCategory>(COLLECTIONS.MENTEE_REVIEW_CATEGORIES);
      setCategories(data.sort((a, b) => a.order - b.order));
    } catch (error) {
      console.error('Error loading review categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (category: ReviewCategory) => {
    setEditingId(category.id);
    setEditForm({ ...category });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveCategory = async () => {
    if (!editingId || !editForm.name) return;

    try {
      await FirestoreService.update(COLLECTIONS.MENTEE_REVIEW_CATEGORIES, editingId, {
        ...editForm,
        updated_at: new Date()
      });
      await loadCategories();
      cancelEditing();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  const initializeDefaultCategories = async () => {
    const defaultCategories: Omit<ReviewCategory, 'id'>[] = [
      {
        name: 'morning_exercise',
        label: 'Morning Exercise',
        minLabel: 'Needs to come regularly for morning exercise',
        midLabel: 'Sometimes present in morning exercise',
        maxLabel: 'Actively participate in morning exercise',
        order: 1
      },
      {
        name: 'communication',
        label: 'Communication',
        minLabel: 'Poor communication skills',
        midLabel: 'Basic communication',
        maxLabel: 'Excellent communicator',
        order: 2
      },
      {
        name: 'academic_effort',
        label: 'Academic Effort',
        minLabel: 'Minimal academic effort',
        midLabel: 'Moderate effort',
        maxLabel: 'Exceptional dedication',
        order: 3
      },
      {
        name: 'campus_contribution',
        label: 'Campus Contribution',
        minLabel: 'No campus involvement',
        midLabel: 'Occasional participation',
        maxLabel: 'Active campus leader',
        order: 4
      },
      {
        name: 'behavioural',
        label: 'Behavioural',
        minLabel: 'Disruptive behavior',
        midLabel: 'Neutral behavior',
        maxLabel: 'Exemplary conduct',
        order: 5
      }
    ];

    try {
      for (const category of defaultCategories) {
        await FirestoreService.create(COLLECTIONS.MENTEE_REVIEW_CATEGORIES, {
          ...category,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
      await loadCategories();
    } catch (error) {
      console.error('Error initializing categories:', error);
      alert('Failed to initialize categories');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Mentee Review Categories</h2>
        {categories.length === 0 && (
          <button
            onClick={initializeDefaultCategories}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Initialize Default Categories
          </button>
        )}
      </div>

      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-6">
            {editingId === category.id ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Label
                    </label>
                    <input
                      type="text"
                      value={editForm.label || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, label: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    -2 Label (Needs Improvement)
                  </label>
                  <input
                    type="text"
                    value={editForm.minLabel || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, minLabel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    0 Label (Neutral)
                  </label>
                  <input
                    type="text"
                    value={editForm.midLabel || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, midLabel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    2 Label (Excellent)
                  </label>
                  <input
                    type="text"
                    value={editForm.maxLabel || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, maxLabel: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={cancelEditing}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <X className="h-4 w-4 mr-2 inline" />
                    Cancel
                  </button>
                  <button
                    onClick={saveCategory}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2 inline" />
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">{category.label}</h3>
                  <button
                    onClick={() => startEditing(category)}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Edit category"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="bg-red-50 p-3 rounded-lg">
                    <div className="font-medium text-red-800 mb-1">-2: Needs Improvement</div>
                    <div className="text-red-600">{category.minLabel}</div>
                  </div>
                  <div className="bg-yellow-50 p-3 rounded-lg">
                    <div className="font-medium text-yellow-800 mb-1">0: Neutral</div>
                    <div className="text-yellow-600">{category.midLabel}</div>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <div className="font-medium text-green-800 mb-1">2: Excellent</div>
                    <div className="text-green-600">{category.maxLabel}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No review categories configured yet.</p>
          <button
            onClick={initializeDefaultCategories}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Initialize Default Categories
          </button>
        </div>
      )}
    </div>
  );
};

export default MenteeReviewCategoriesAdmin;