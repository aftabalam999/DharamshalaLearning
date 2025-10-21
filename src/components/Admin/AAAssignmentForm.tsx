import React, { useState, useEffect } from 'react';
import { X, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import { UserService } from '../../services/firestore';
import { User } from '../../types';

interface AAAssignmentFormProps {
  campus: string;
  onSave: (academicAssociateId: string, studentIds: string[]) => Promise<void>;
  onClose: () => void;
  editMode?: boolean;
}

const AAAssignmentForm: React.FC<AAAssignmentFormProps> = ({
  campus,
  onSave,
  onClose,
  editMode = false,
}) => {
  const [academicAssociates, setAcademicAssociates] = useState<User[]>([]);
  const [allStudents, setAllStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);

  const [selectedAA, setSelectedAA] = useState<string>('');
  const [selectedHouse, setSelectedHouse] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const houses = ['house_A', 'house_B', 'house_C', 'house_D'];
  const phases = ['phase_1', 'phase_2', 'phase_3', 'phase_4', 'phase_5'];

  // Load AAs and students on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campus]);

  // Filter students whenever house or phase changes
  useEffect(() => {
    filterStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHouse, selectedPhase, allStudents]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all users
      const users = await UserService.getAll<User>('users');
      const campusUsers = users.filter((u: User) => u.campus === campus);

      // Separate AAs and students
      const aas = campusUsers.filter((u: User) => u.role === 'academic_associate');
      const students = campusUsers.filter((u: User) => u.role !== 'academic_associate');

      setAcademicAssociates(aas);
      setAllStudents(students);
      setFilteredStudents(students);

      console.log(
        `✅ [AAAssignmentForm] Loaded ${aas.length} AAs and ${students.length} students`
      );
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load academic associates and students');
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...allStudents];

    if (selectedHouse) {
      filtered = filtered.filter(
        (s: User) => s.house === selectedHouse || s.house === selectedHouse.replace('house_', '')
      );
    }

    if (selectedPhase) {
      filtered = filtered.filter((s: User) => s.current_phase_name === selectedPhase);
    }

    setFilteredStudents(filtered);
  };

  const handleStudentToggle = (studentId: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s.id)));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!selectedAA) {
      setError('Please select an Academic Associate');
      return;
    }

    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    try {
      setSubmitting(true);
      const studentIds = Array.from(selectedStudents);
      await onSave(selectedAA, studentIds);
      setSuccess(true);

      // Close after success
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error saving assignment:', err);
      setError(err instanceof Error ? err.message : 'Failed to save assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editMode ? 'Edit' : 'Create'} Academic Associate Assignment
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <p className="text-green-700">Assignment saved successfully!</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Academic Associate Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Associate *
            </label>
            <select
              value={selectedAA}
              onChange={e => setSelectedAA(e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select an Academic Associate...</option>
              {academicAssociates.map(aa => (
                <option key={aa.id} value={aa.id}>
                  {aa.name} ({aa.email})
                </option>
              ))}
            </select>
            {academicAssociates.length === 0 && (
              <p className="mt-1 text-sm text-yellow-600">
                No Academic Associates found in this campus
              </p>
            )}
          </div>

          {/* Filters */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">
              Filter Students (Optional)
            </p>
            <div className="grid grid-cols-2 gap-4">
              {/* House Filter */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">House</label>
                <select
                  value={selectedHouse}
                  onChange={e => setSelectedHouse(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">All Houses</option>
                  {houses.map(house => (
                    <option key={house} value={house}>
                      {house}
                    </option>
                  ))}
                </select>
              </div>

              {/* Phase Filter */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Phase</label>
                <select
                  value={selectedPhase}
                  onChange={e => setSelectedPhase(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">All Phases</option>
                  {phases.map(phase => (
                    <option key={phase} value={phase}>
                      {phase}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Students Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Select Students * ({selectedStudents.size} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={submitting}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:text-gray-400"
              >
                {selectedStudents.size === filteredStudents.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>

            {filteredStudents.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-500 text-sm">
                  No students found matching the selected filters
                </p>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                {filteredStudents.map(student => (
                  <label
                    key={student.id}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {student.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      {student.house && <span>{student.house}</span>}
                      {student.current_phase_name && <span>•</span>}
                      {student.current_phase_name && <span>{student.current_phase_name}</span>}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || success}
              className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Assignment'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AAAssignmentForm;
