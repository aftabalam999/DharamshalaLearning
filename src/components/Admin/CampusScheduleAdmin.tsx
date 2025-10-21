import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Clock, AlertCircle, Users, Loader } from 'lucide-react';
import { CampusSchedule, AcademicAssociateAssignment } from '../../types';
import { AcademicAssociateService } from '../../services/academicAssociateService';
import AAAssignmentForm from './AAAssignmentForm';

const CampusScheduleAdmin: React.FC = () => {
  // Campus Schedule State
  const [campuses, setCampuses] = useState<CampusSchedule[]>([
    {
      id: 'cs-1',
      campus: 'Dharamshala',
      timezone: 'Asia/Kolkata',
      working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start_time: '09:00',
      end_time: '18:00',
      break_start: '12:00',
      break_end: '13:00',
      max_sessions_per_day: 4,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<CampusSchedule>>({});

  // Academic Associates State
  const [selectedCampus, setSelectedCampus] = useState<string>('Dharamshala');
  const [aaAssignments, setAAAssignments] = useState<AcademicAssociateAssignment[]>([]);
  const [aaSummary, setAASummary] = useState<any[]>([]);
  const [loadingAA, setLoadingAA] = useState(false);
  const [showAAForm, setShowAAForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedules' | 'academicAssociates'>('schedules');

  const dayOptions = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  // Load Academic Associates assignments
  useEffect(() => {
    if (activeTab === 'academicAssociates') {
      (async () => {
        try {
          setLoadingAA(true);
          const assignments = await AcademicAssociateService.getAssignments({
            campus: selectedCampus,
          });
          setAAAssignments(assignments);

          // Get summary
          const summary = await AcademicAssociateService.getAcademicAssociatesSummary(
            selectedCampus
          );
          setAASummary(summary);
        } catch (error) {
          console.error('Error loading AA assignments:', error);
        } finally {
          setLoadingAA(false);
        }
      })();
    }
  }, [activeTab, selectedCampus]);

  const loadAAAssignments = async () => {
    try {
      setLoadingAA(true);
      const assignments = await AcademicAssociateService.getAssignments({
        campus: selectedCampus,
      });
      setAAAssignments(assignments);

      // Get summary
      const summary = await AcademicAssociateService.getAcademicAssociatesSummary(
        selectedCampus
      );
      setAASummary(summary);
    } catch (error) {
      console.error('Error loading AA assignments:', error);
    } finally {
      setLoadingAA(false);
    }
  };

  const handleSaveAAAssignment = async (aaId: string, studentIds: string[]) => {
    try {
      // Get current user ID (from auth context - using placeholder)
      const userId = 'admin-user-id';

      await AcademicAssociateService.createAssignment(
        aaId,
        studentIds,
        selectedCampus,
        userId
      );

      // Refresh the list
      await loadAAAssignments();
    } catch (error) {
      console.error('Error saving AA assignment:', error);
      throw error;
    }
  };

  const handleDeleteAAAssignment = async (assignmentId: string) => {
    if (window.confirm('Are you sure you want to delete this assignment?')) {
      try {
        await AcademicAssociateService.deleteAssignment(assignmentId);
        await loadAAAssignments();
      } catch (error) {
        console.error('Error deleting AA assignment:', error);
      }
    }
  };

  const handleAddCampus = () => {
    setFormData({
      campus: '',
      timezone: 'Asia/Kolkata',
      working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
      start_time: '09:00',
      end_time: '18:00',
      break_start: '12:00',
      break_end: '13:00',
      max_sessions_per_day: 4,
    });
    setEditingId('new');
  };

  const handleEdit = (campus: CampusSchedule) => {
    setFormData(campus);
    setEditingId(campus.id);
  };

  const handleSave = () => {
    if (!formData.campus) {
      alert('Campus name is required');
      return;
    }

    if (editingId === 'new') {
      const newCampus: CampusSchedule = {
        id: `cs-${Date.now()}`,
        campus: formData.campus,
        timezone: formData.timezone || 'Asia/Kolkata',
        working_days: formData.working_days || [],
        start_time: formData.start_time || '09:00',
        end_time: formData.end_time || '18:00',
        break_start: formData.break_start,
        break_end: formData.break_end,
        max_sessions_per_day: formData.max_sessions_per_day || 4,
        created_at: new Date(),
        updated_at: new Date(),
      };
      setCampuses([...campuses, newCampus]);
    } else if (editingId) {
      setCampuses(campuses.map(c => (c.id === editingId ? ({ ...formData as CampusSchedule, updated_at: new Date() }) : c)));
    }
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this campus schedule?')) {
      setCampuses(campuses.filter(c => c.id !== id));
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleWorkingDayToggle = (day: string) => {
    const current = formData.working_days || [];
    const updated = current.includes(day as any) ? current.filter(d => d !== day) : [...current, day as any];
    setFormData({ ...formData, working_days: updated });
  };

  if (editingId) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">
          {editingId === 'new' ? 'Add Campus Schedule' : 'Edit Campus Schedule'}
        </h2>

        <div className="space-y-4">
          {/* Campus Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campus Name*</label>
            <input
              type="text"
              value={formData.campus || ''}
              onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Dharamshala"
            />
          </div>

          {/* Timezone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
            <input
              type="text"
              value={formData.timezone || ''}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Asia/Kolkata"
            />
          </div>

          {/* Working Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Days</label>
            <div className="flex flex-wrap gap-2">
              {dayOptions.map((day) => (
                <button
                  key={day}
                  onClick={() => handleWorkingDayToggle(day)}
                  className={`px-3 py-2 rounded-md font-medium text-sm capitalize transition ${
                    (formData.working_days || []).includes(day as any)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          {/* Working Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formData.start_time || '09:00'}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formData.end_time || '18:00'}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Break Times */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Break Start (Lunch)</label>
              <input
                type="time"
                value={formData.break_start || '12:00'}
                onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Break End</label>
              <input
                type="time"
                value={formData.break_end || '13:00'}
                onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Max Sessions per Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Sessions Per Day</label>
            <input
              type="number"
              value={formData.max_sessions_per_day || 4}
              onChange={(e) => setFormData({ ...formData, max_sessions_per_day: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Tips for Campus Schedule:</p>
              <ul className="list-disc ml-5 mt-1 space-y-1">
                <li>Set working hours to match campus functioning time</li>
                <li>Specify lunch and recreation break times</li>
                <li>This schedule helps allocate pair programming sessions</li>
              </ul>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Campus Administration</h1>
          <p className="text-gray-600 mt-1">Manage schedules and academic associate assignments</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'schedules'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Clock className="h-5 w-5 inline mr-2" />
          Campus Schedules
        </button>
        <button
          onClick={() => setActiveTab('academicAssociates')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors ${
            activeTab === 'academicAssociates'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <Users className="h-5 w-5 inline mr-2" />
          Academic Associates
        </button>
      </div>

      {/* Campus Schedules Tab */}
      {activeTab === 'schedules' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={handleAddCampus}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              Add Campus Schedule
            </button>
          </div>

          {/* Campus List */}
      <div className="grid grid-cols-1 gap-4">
        {campuses.map((campus) => (
          <div key={campus.id} className="bg-white rounded-lg shadow p-5 hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{campus.campus}</h3>
                <p className="text-sm text-gray-600 mt-1">{campus.timezone}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-medium">Working Hours</p>
                    <p className="font-semibold text-gray-900">{campus.start_time} - {campus.end_time}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-medium">Lunch Break</p>
                    <p className="font-semibold text-gray-900">{campus.break_start || '-'} - {campus.break_end || '-'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-medium">Max Sessions/Day</p>
                    <p className="font-semibold text-gray-900">{campus.max_sessions_per_day}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-xs text-gray-600 font-medium">Working Days</p>
                    <p className="font-semibold text-gray-900">{campus.working_days.length}/7</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Updated: {new Date(campus.updated_at).toLocaleDateString()}
                </p>
              </div>

              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => handleEdit(campus)}
                  className="p-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(campus.id)}
                  className="p-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {campuses.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No campus schedules configured yet.</p>
            <button
              onClick={handleAddCampus}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create First Campus Schedule
            </button>
          </div>
        )}
        </div>
        </>
      )}

      {/* Academic Associates Tab */}
      {activeTab === 'academicAssociates' && (
        <div className="space-y-6">
          {/* Campus Selector */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Campus
              </label>
              <select
                value={selectedCampus}
                onChange={(e) => setSelectedCampus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.campus}>
                    {campus.campus}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowAAForm(true)}
              className="mt-6 flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <Plus className="h-5 w-5" />
              New Assignment
            </button>
          </div>

          {/* Loading State */}
          {loadingAA && (
            <div className="text-center py-8">
              <Loader className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
              <p className="text-gray-600 mt-2">Loading assignments...</p>
            </div>
          )}

          {/* Assignments Table */}
          {!loadingAA && (
            <>
              {aaAssignments.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    No assignments yet for {selectedCampus}
                  </p>
                  <button
                    onClick={() => setShowAAForm(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Assignment
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Academic Associate
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Students
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          House
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Phase
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {aaAssignments.map((assignment) => {
                        const aaSummaryItem = aaSummary.find(
                          (s) => s.academic_associate_id === assignment.academic_associate_id
                        );
                        return (
                          <tr key={assignment.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                              {aaSummaryItem?.name || 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {assignment.student_ids?.length || 0} students
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {assignment.house || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {assignment.phase || '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {new Date(assignment.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-right text-sm">
                              <button
                                onClick={() => handleDeleteAAAssignment(assignment.id)}
                                className="inline-flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* AA Assignment Form Modal */}
      {showAAForm && (
        <AAAssignmentForm
          campus={selectedCampus}
          onSave={handleSaveAAAssignment}
          onClose={() => setShowAAForm(false)}
        />
      )}
    </div>
  );
};

export default CampusScheduleAdmin;
