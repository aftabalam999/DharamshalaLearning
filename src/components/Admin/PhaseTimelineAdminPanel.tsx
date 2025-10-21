import React, { useState, useEffect } from 'react';
import { PhaseTimelineService, PhaseService } from '../../services/dataServices';
import { useAuth } from '../../contexts/AuthContext';

interface PhaseTimelineRow {
  name: string;
  expectedDays: number | null;
  isStandalone: boolean;
}

const PhaseTimelineAdminPanel: React.FC = () => {
  const { userData } = useAuth();
  const [rows, setRows] = useState<PhaseTimelineRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadAllPhases = async () => {
      try {
        setLoading(true);
        
        // Get all phases from database
        const allPhases = await PhaseService.getAllPhases();
        
        // Get existing timeline data
        const existingTimelines = await PhaseTimelineService.getAllPhaseTimelines();
        const timelineMap = new Map(existingTimelines.map(t => [t.phaseId, t]));
        
        // Sort by order and create editable rows
        const sortedPhases = allPhases.sort((a, b) => {
          // Handle special order values
          if (a.order === -1 && b.order === -1) return 0;
          if (a.order === -1) return 1; // -1 goes to end
          if (b.order === -1) return -1;
          return a.order - b.order;
        });

        const phaseRows = sortedPhases.map(phase => {
          const existingTimeline = timelineMap.get(phase.id);
          return {
            name: phase.name,
            expectedDays: existingTimeline?.expectedDays || null,
            isStandalone: existingTimeline?.isStandalone || false
          };
        });

        setRows(phaseRows);
      } catch (error) {
        console.error('Error loading phases:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllPhases();
  }, []);

  const handleDaysChange = (idx: number, value: string) => {
    const days = value === '' ? null : Math.max(0, parseInt(value));
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, expectedDays: days } : row));
  };

  const handleStandaloneChange = (idx: number, checked: boolean) => {
    setRows(rows => rows.map((row, i) => i === idx ? { ...row, isStandalone: checked, expectedDays: checked ? null : row.expectedDays } : row));
  };

  // Save logic
  const handleSave = async () => {
    if (!userData) {
      alert('User not authenticated');
      return;
    }

    try {
      setSaving(true);
      
      // Get all phases to map names to IDs
      const allPhases = await PhaseService.getAllPhases();
      const phaseMap = new Map(allPhases.map(p => [p.name, p.id]));
      
      // Prepare timeline data
      const timelineData = rows.map(row => {
        const phaseId = phaseMap.get(row.name);
        if (!phaseId) {
          throw new Error(`Phase not found: ${row.name}`);
        }
        return {
          phaseId,
          phaseName: row.name,
          expectedDays: row.expectedDays,
          isStandalone: row.isStandalone,
          updatedBy: userData.id
        };
      });
      
      await PhaseTimelineService.savePhaseTimelines(timelineData, userData.id);
      alert('Phase timeline saved successfully!');
    } catch (error) {
      console.error('Error saving phase timeline:', error);
      alert('Error saving phase timeline. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading phases...</span>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Phase Timeline Management</h2>
          <p className="text-gray-600 mt-1">Set expected completion days for each learning phase.</p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
          >
            Edit Timeline
          </button>
        ) : (
          <div className="flex space-x-2">
            <button
              onClick={() => setIsEditing(false)}
              disabled={saving}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
      <table className="w-full border rounded-lg mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-2 px-4 text-left">Phase Name</th>
            <th className="py-2 px-4 text-left">Expected Days</th>
            <th className="py-2 px-4 text-left">Standalone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.name} className="border-t">
              <td className="py-2 px-4">{row.name}</td>
              <td className="py-2 px-4">
                {isEditing ? (
                  <input
                    type="number"
                    min="0"
                    value={row.expectedDays ?? ''}
                    disabled={row.isStandalone}
                    onChange={e => handleDaysChange(idx, e.target.value)}
                    className="border rounded px-2 py-1 w-24"
                  />
                ) : (
                  <span className={row.expectedDays ? 'text-gray-900' : 'text-gray-400'}>
                    {row.expectedDays ? `${row.expectedDays} days` : 'Not set'}
                  </span>
                )}
              </td>
              <td className="py-2 px-4">
                {isEditing ? (
                  <input
                    type="checkbox"
                    checked={row.isStandalone}
                    onChange={e => handleStandaloneChange(idx, e.target.checked)}
                  />
                ) : (
                  <span className={row.isStandalone ? 'text-green-600' : 'text-gray-400'}>
                    {row.isStandalone ? 'Yes' : 'No'}
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PhaseTimelineAdminPanel;
