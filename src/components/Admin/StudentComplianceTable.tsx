import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Send,
  User as UserIcon,
  Calendar,
  TrendingUp
} from 'lucide-react';
import { collection, query, getDocs, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { getCurrentWeekStart, getReviewDeadline, getDaysOverdue } from '../../utils/reviewDateUtils';

interface StudentData {
  id: string;
  name: string;
  email: string;
  campus: string;
  house: string;
  mentorId?: string;
  mentorName?: string;
  hasReviewedMentor: boolean;
  lastReviewDate?: Date;
  daysSinceLastReview?: number;
  daysOverdue: number;
  status: 'completed' | 'pending' | 'overdue';
  reviewDetails?: {
    week_start: Date;
    created_at: Date;
    aggregateScore: number;
  };
}

interface Props {
  filters?: {
    campus: string;
    house: string;
    dateRange: string;
  };
}

const StudentComplianceTable: React.FC<Props> = ({ filters }) => {
  const [students, setStudents] = useState<StudentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'overdue' | 'lastReview'>('overdue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    loadStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      // Get current week info
      const weekStart = getCurrentWeekStart();
      const deadline = getReviewDeadline(weekStart);
      const currentDaysOverdue = getDaysOverdue(deadline);

      // Fetch all users (not filtering by role since users can have multiple roles)
      const usersRef = collection(db, 'users');
      let usersQuery = query(usersRef);

      if (filters?.campus && filters.campus !== 'all') {
        usersQuery = query(usersQuery, where('campus', '==', filters.campus));
      }

      const usersSnapshot = await getDocs(usersQuery);
      const studentDataList: StudentData[] = [];

      for (const userDoc of usersSnapshot.docs) {
        const user = userDoc.data();
        const userId = userDoc.id;

        // Include user if they have a mentor (indicating they are in a student role)
        // This handles multi-role users properly
        if (!user.mentor_id) {
          continue; // Skip users without mentors
        }

        // Get mentor info
        let mentorName = 'Unassigned';
        if (user.mentor_id) {
          const mentorDoc = await getDocs(query(
            collection(db, 'users'),
            where('__name__', '==', user.mentor_id)
          ));
          mentorName = mentorDoc.docs[0]?.data()?.name || 'Unknown Mentor';
        }

        // Check if student reviewed their mentor this week
        const reviewsRef = collection(db, 'mentor_reviews');
        const reviewQuery = query(
          reviewsRef,
          where('student_id', '==', userId),
          where('mentor_id', '==', user.mentor_id),
          where('week_start', '==', weekStart)
        );
        const reviewSnapshot = await getDocs(reviewQuery);
        const hasReviewedMentor = reviewSnapshot.size > 0;

        // Get latest review (for last review date)
        const allReviewsQuery = query(
          reviewsRef,
          where('student_id', '==', userId),
          where('mentor_id', '==', user.mentor_id)
        );
        const allReviewsSnapshot = await getDocs(allReviewsQuery);
        
        let lastReviewDate: Date | undefined;
        let daysSinceLastReview: number | undefined;
        let reviewDetails: StudentData['reviewDetails'];

        if (allReviewsSnapshot.size > 0) {
          // Sort by created_at to get most recent
          const reviews = allReviewsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              created_at: data.created_at,
              week_start: data.week_start,
              morning_exercise: data.morning_exercise,
              communication: data.communication,
              academic_effort: data.academic_effort,
              campus_contribution: data.campus_contribution,
              behavioural: data.behavioural,
              mentorship_level: data.mentorship_level
            };
          });
          reviews.sort((a, b) => {
            const aDate = a.created_at?.toDate?.() || new Date(0);
            const bDate = b.created_at?.toDate?.() || new Date(0);
            return bDate.getTime() - aDate.getTime();
          });

          const latestReview = reviews[0];
          lastReviewDate = latestReview.created_at?.toDate?.() || undefined;
          
          if (lastReviewDate) {
            const now = new Date();
            const diffMs = now.getTime() - lastReviewDate.getTime();
            daysSinceLastReview = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          }

          // Calculate aggregate score
          const scores = [
            latestReview.morning_exercise || 0,
            latestReview.communication || 0,
            latestReview.academic_effort || 0,
            latestReview.campus_contribution || 0,
            latestReview.behavioural || 0,
            latestReview.mentorship_level || 0
          ];
          const aggregateScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

          reviewDetails = {
            week_start: latestReview.week_start?.toDate?.() || new Date(),
            created_at: lastReviewDate || new Date(),
            aggregateScore: Number(aggregateScore.toFixed(2))
          };
        }

        let status: 'completed' | 'pending' | 'overdue' = 'completed';
        if (!hasReviewedMentor) {
          status = currentDaysOverdue > 0 ? 'overdue' : 'pending';
        }

        studentDataList.push({
          id: userId,
          name: user.name || 'Unknown',
          email: user.email || '',
          campus: user.campus || 'Unknown',
          house: user.house || 'Unknown',
          mentorId: user.mentor_id,
          mentorName,
          hasReviewedMentor,
          lastReviewDate,
          daysSinceLastReview,
          daysOverdue: hasReviewedMentor ? 0 : currentDaysOverdue,
          status,
          reviewDetails
        });
      }

      // Sort students
      const sorted = sortStudents(studentDataList, sortBy, sortOrder);
      setStudents(sorted);

    } catch (error) {
      console.error('Error loading student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortStudents = (
    data: StudentData[], 
    by: 'name' | 'overdue' | 'lastReview',
    order: 'asc' | 'desc'
  ): StudentData[] => {
    const sorted = [...data].sort((a, b) => {
      let comparison = 0;
      
      switch (by) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'overdue':
          comparison = a.daysOverdue - b.daysOverdue;
          break;
        case 'lastReview':
          const aDate = a.lastReviewDate?.getTime() || 0;
          const bDate = b.lastReviewDate?.getTime() || 0;
          comparison = aDate - bDate;
          break;
      }

      return order === 'asc' ? comparison : -comparison;
    });

    return sorted;
  };

  const handleSort = (by: 'name' | 'overdue' | 'lastReview') => {
    if (sortBy === by) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(by);
      setSortOrder(by === 'lastReview' ? 'asc' : 'desc');
    }
  };

  const toggleRowExpansion = (studentId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(studentId)) {
      newExpanded.delete(studentId);
    } else {
      newExpanded.add(studentId);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const getRowColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50';
      case 'pending':
        return 'bg-yellow-50';
      case 'overdue':
        return 'bg-red-50';
      default:
        return 'bg-white';
    }
  };

  const formatDate = (date?: Date) => {
    if (!date) return 'Never';
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleSendReminder = (studentId: string) => {
    // TODO: Integrate with ReviewReminderService
    alert(`Reminder will be sent to student ${studentId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Student Compliance</h3>
        <p className="text-sm text-gray-600 mt-1">
          {students.length} student{students.length !== 1 ? 's' : ''} found
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                {/* Expand icon column */}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Student Name
                  {sortBy === 'name' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Campus
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Mentor
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('lastReview')}
              >
                <div className="flex items-center">
                  Last Reviewed
                  {sortBy === 'lastReview' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Days Since
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('overdue')}
              >
                <div className="flex items-center">
                  Overdue
                  {sortBy === 'overdue' && (
                    sortOrder === 'asc' ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map((student) => (
              <React.Fragment key={student.id}>
                {/* Main Row */}
                <tr className={`${getRowColor(student.status)} hover:bg-opacity-75 transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.reviewDetails && (
                      <button
                        onClick={() => toggleRowExpansion(student.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedRows.has(student.id) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(student.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{student.name}</div>
                    <div className="text-sm text-gray-500">{student.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {student.campus}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">{student.mentorName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(student.lastReviewDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${
                      !student.daysSinceLastReview ? 'text-gray-400' :
                      student.daysSinceLastReview > 14 ? 'text-red-600' :
                      student.daysSinceLastReview > 7 ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {student.daysSinceLastReview !== undefined ? `${student.daysSinceLastReview}d` : 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {student.daysOverdue > 0 ? (
                      <span className="text-sm font-semibold text-red-600">
                        {student.daysOverdue}d
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {student.status !== 'completed' && (
                      <button
                        onClick={() => handleSendReminder(student.id)}
                        className="text-purple-600 hover:text-purple-900 flex items-center ml-auto"
                      >
                        <Send className="h-4 w-4 mr-1" />
                        Remind
                      </button>
                    )}
                  </td>
                </tr>

                {/* Expanded Row - Review Details */}
                {expandedRows.has(student.id) && student.reviewDetails && (
                  <tr>
                    <td colSpan={9} className="px-6 py-4 bg-gray-50">
                      <div className="ml-8">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">
                          Latest Review Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center mb-2">
                              <Calendar className="h-4 w-4 mr-2 text-purple-600" />
                              <span className="text-xs font-medium text-gray-500">Week Start</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(student.reviewDetails.week_start)}
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center mb-2">
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              <span className="text-xs font-medium text-gray-500">Submitted On</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(student.reviewDetails.created_at)}
                            </p>
                          </div>
                          <div className="bg-white p-4 rounded-lg border border-gray-200">
                            <div className="flex items-center mb-2">
                              <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                              <span className="text-xs font-medium text-gray-500">Aggregate Score</span>
                            </div>
                            <p className={`text-sm font-semibold ${
                              student.reviewDetails.aggregateScore >= 1.0 ? 'text-green-600' :
                              student.reviewDetails.aggregateScore >= 0 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {student.reviewDetails.aggregateScore > 0 ? '+' : ''}
                              {student.reviewDetails.aggregateScore.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {students.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No students found matching the current filters.</p>
        </div>
      )}
    </div>
  );
};

export default StudentComplianceTable;
