import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { AcademicAssociateAssignment, StudentAAMapping } from '../types';

export class AcademicAssociateService {
  private static COLLECTION = 'academic_associate_assignments';

  /**
   * Create a new Academic Associate assignment
   * Assigns multiple students to an AA with optional house/phase filtering
   */
  static async createAssignment(
    academicAssociateId: string,
    studentIds: string[],
    campus: string,
    createdBy: string,
    house?: string,
    phase?: string,
    notes?: string
  ): Promise<string> {
    try {
      if (!studentIds || studentIds.length === 0) {
        throw new Error('At least one student must be selected');
      }

      const assignment = {
        academic_associate_id: academicAssociateId,
        student_ids: studentIds,
        campus,
        house,
        phase,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
        created_by: createdBy,
        notes,
      };

      const docRef = await addDoc(collection(db, this.COLLECTION), assignment);
      console.log('✅ [AcademicAssociateService] Created assignment:', docRef.id, {
        aa: academicAssociateId,
        students: studentIds.length,
        house,
        phase,
      });
      return docRef.id;
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Get all assignments with optional filters
   */
  static async getAssignments(filters?: {
    campus?: string;
    house?: string;
    phase?: string;
  }): Promise<AcademicAssociateAssignment[]> {
    try {
      let q: any = collection(db, this.COLLECTION);
      const constraints = [];

      if (filters?.campus) {
        constraints.push(where('campus', '==', filters.campus));
      }
      if (filters?.house) {
        constraints.push(where('house', '==', filters.house));
      }
      if (filters?.phase) {
        constraints.push(where('phase', '==', filters.phase));
      }

      if (constraints.length > 0) {
        q = query(q, ...constraints);
      }

      const snapshot = await getDocs(q);
      const assignments: AcademicAssociateAssignment[] = [];

      snapshot.forEach(doc => {
        const data = doc.data() as any;
        assignments.push({
          id: doc.id,
          academic_associate_id: data.academic_associate_id,
          student_ids: data.student_ids,
          campus: data.campus,
          house: data.house,
          phase: data.phase,
          created_at: data.created_at?.toDate() || new Date(),
          updated_at: data.updated_at?.toDate() || new Date(),
          created_by: data.created_by,
          notes: data.notes,
        } as AcademicAssociateAssignment);
      });

      console.log(`✅ [AcademicAssociateService] Retrieved ${assignments.length} assignments`, {
        filters,
      });
      return assignments;
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error fetching assignments:', error);
      throw error;
    }
  }

  /**
   * Get all students assigned to a specific AA
   */
  static async getAssignedStudents(
    academicAssociateId: string
  ): Promise<StudentAAMapping[]> {
    try {
      const assignments = await this.getAssignments();
      const aaAssignment = assignments.find(
        a => a.academic_associate_id === academicAssociateId
      );

      if (!aaAssignment) {
        console.log(
          `⚠️ [AcademicAssociateService] No assignment found for AA: ${academicAssociateId}`
        );
        return [];
      }

      const mappings: StudentAAMapping[] = aaAssignment.student_ids.map(
        studentId => ({
          student_id: studentId,
          academic_associate_id: academicAssociateId,
          campus: aaAssignment.campus,
          house: aaAssignment.house,
          phase: aaAssignment.phase,
          assigned_at: aaAssignment.created_at,
          assigned_by: aaAssignment.created_by,
        })
      );

      console.log(
        `✅ [AcademicAssociateService] Retrieved ${mappings.length} students for AA: ${academicAssociateId}`
      );
      return mappings;
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error fetching assigned students:', error);
      throw error;
    }
  }

  /**
   * Get the AA assignment for a specific student (if any)
   */
  static async getStudentAcademicAssociate(
    studentId: string
  ): Promise<AcademicAssociateAssignment | null> {
    try {
      const assignments = await this.getAssignments();
      const assignment = assignments.find(a => a.student_ids.includes(studentId));

      if (assignment) {
        console.log(
          `✅ [AcademicAssociateService] Student ${studentId} assigned to AA: ${assignment.academic_associate_id}`
        );
      }
      return assignment || null;
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error fetching student AA:', error);
      throw error;
    }
  }

  /**
   * Add a single student to an existing AA assignment
   */
  static async addStudentToAssignment(
    studentId: string,
    academicAssociateId: string
  ): Promise<void> {
    try {
      const assignments = await this.getAssignments();
      const assignment = assignments.find(
        a => a.academic_associate_id === academicAssociateId
      );

      if (!assignment) {
        throw new Error(`Assignment not found for AA: ${academicAssociateId}`);
      }

      if (assignment.student_ids.includes(studentId)) {
        throw new Error(`Student ${studentId} already assigned to this AA`);
      }

      const updatedStudentIds = [...assignment.student_ids, studentId];
      await updateDoc(doc(db, this.COLLECTION, assignment.id), {
        student_ids: updatedStudentIds,
        updated_at: Timestamp.now(),
      });

      console.log(
        `✅ [AcademicAssociateService] Added student ${studentId} to AA ${academicAssociateId}`
      );
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error adding student:', error);
      throw error;
    }
  }

  /**
   * Remove a student from an AA assignment
   */
  static async removeStudentFromAssignment(
    studentId: string,
    academicAssociateId: string
  ): Promise<void> {
    try {
      const assignments = await this.getAssignments();
      const assignment = assignments.find(
        a => a.academic_associate_id === academicAssociateId
      );

      if (!assignment) {
        throw new Error(`Assignment not found for AA: ${academicAssociateId}`);
      }

      const updatedStudentIds = assignment.student_ids.filter(id => id !== studentId);
      await updateDoc(doc(db, this.COLLECTION, assignment.id), {
        student_ids: updatedStudentIds,
        updated_at: Timestamp.now(),
      });

      console.log(
        `✅ [AcademicAssociateService] Removed student ${studentId} from AA ${academicAssociateId}`
      );
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error removing student:', error);
      throw error;
    }
  }

  /**
   * Update an assignment (notes, house, phase, etc)
   */
  static async updateAssignment(
    id: string,
    updates: Partial<
      Omit<AcademicAssociateAssignment, 'id' | 'created_at' | 'created_by'>
    >
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, id), {
        ...updates,
        updated_at: Timestamp.now(),
      });
      console.log('✅ [AcademicAssociateService] Updated assignment:', id);
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Delete an entire assignment
   */
  static async deleteAssignment(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, id));
      console.log('✅ [AcademicAssociateService] Deleted assignment:', id);
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error deleting assignment:', error);
      throw error;
    }
  }

  /**
   * Get all Academic Associates with their student counts
   */
  static async getAcademicAssociatesSummary(campus: string): Promise<
    Array<{
      id: string;
      student_count: number;
      house?: string;
      phase?: string;
      notes?: string;
      updated_at: Date;
    }>
  > {
    try {
      const assignments = await this.getAssignments({ campus });

      const summary = assignments.map(assignment => ({
        id: assignment.academic_associate_id,
        student_count: assignment.student_ids.length,
        house: assignment.house,
        phase: assignment.phase,
        notes: assignment.notes,
        updated_at: assignment.updated_at,
      }));

      console.log(
        `✅ [AcademicAssociateService] Retrieved summary for ${summary.length} AAs`
      );
      return summary;
    } catch (error) {
      console.error('❌ [AcademicAssociateService] Error fetching AA summary:', error);
      throw error;
    }
  }
}
