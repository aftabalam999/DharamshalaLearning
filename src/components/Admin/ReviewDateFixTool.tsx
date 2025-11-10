/**
 * Review Date Fix Component
 * 
 * Add this to your Admin panel to fix review dates in the browser
 * This updates all reviews to have correct week_start dates (Monday at midnight)
 */

import React, { useState } from 'react';
import { collection, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';

interface FixResult {
  collection: string;
  total: number;
  fixed: number;
  alreadyCorrect: number;
  errors: number;
}

/**
 * Calculate Monday of the week for a given date
 */
function getWeekStartForDate(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0); // Midnight
  
  return weekStart;
}

export const ReviewDateFixTool: React.FC = () => {
  const [fixing, setFixing] = useState(false);
  const [results, setResults] = useState<FixResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
    console.log(message);
  };

  const fixReviewsInCollection = async (collectionName: string): Promise<FixResult> => {
    addLog(`\n🔍 Processing ${collectionName}...`);
    
    const snapshot = await getDocs(collection(db, collectionName));
    addLog(`📊 Found ${snapshot.size} reviews`);
    
    let fixed = 0;
    let alreadyCorrect = 0;
    let errors = 0;
    
    for (const docSnapshot of snapshot.docs) {
      try {
        const data = docSnapshot.data();
        const weekStartTimestamp = data.week_start;
        
        if (!weekStartTimestamp) {
          addLog(`⚠️  Review ${docSnapshot.id} has no week_start field - skipping`);
          continue;
        }
        
        // Convert Firestore timestamp to Date
        const weekStartDate = weekStartTimestamp.toDate();
        
        // Check if it's already at Monday midnight
        const hours = weekStartDate.getHours();
        const minutes = weekStartDate.getMinutes();
        const seconds = weekStartDate.getSeconds();
        const milliseconds = weekStartDate.getMilliseconds();
        
        const isAtMidnight = hours === 0 && minutes === 0 && seconds === 0 && milliseconds === 0;
        const dayOfWeek = weekStartDate.getDay();
        const isMonday = dayOfWeek === 1;
        
        if (isMonday && isAtMidnight) {
          alreadyCorrect++;
          addLog(`✅ Review ${docSnapshot.id.substring(0, 8)}... already correct`);
          continue;
        }
        
        // Calculate correct week start (Monday at midnight)
        const correctWeekStart = getWeekStartForDate(weekStartDate);
        
        addLog(`🔧 Fixing review ${docSnapshot.id.substring(0, 8)}...`);
        addLog(`   Old: ${weekStartDate.toLocaleString()}`);
        addLog(`   New: ${correctWeekStart.toLocaleString()}`);
        
        // Update document
        await updateDoc(doc(db, collectionName, docSnapshot.id), {
          week_start: Timestamp.fromDate(correctWeekStart),
          updated_at: Timestamp.now()
        });
        
        fixed++;
        
      } catch (error: any) {
        addLog(`❌ Error processing review ${docSnapshot.id}: ${error.message}`);
        errors++;
      }
    }
    
    const result: FixResult = {
      collection: collectionName,
      total: snapshot.size,
      fixed,
      alreadyCorrect,
      errors
    };
    
    addLog(`\n📈 ${collectionName} Summary:`);
    addLog(`   ✅ Already correct: ${alreadyCorrect}`);
    addLog(`   🔧 Fixed: ${fixed}`);
    addLog(`   ❌ Errors: ${errors}`);
    addLog(`   📊 Total: ${snapshot.size}`);
    
    return result;
  };

  const runFix = async () => {
    setFixing(true);
    setLogs([]);
    setResults([]);
    
    try {
      addLog('🚀 Starting review date fix...');
      addLog('📅 Target: Set all week_start dates to Monday at 00:00:00');
      
      // Fix both collections
      const menteeResults = await fixReviewsInCollection('mentee_reviews');
      const mentorResults = await fixReviewsInCollection('mentor_reviews');
      
      setResults([menteeResults, mentorResults]);
      
      addLog('\n🎉 Fix Complete!');
      addLog('\n📊 Overall Summary:');
      addLog(`   Total reviews processed: ${menteeResults.total + mentorResults.total}`);
      addLog(`   Total fixed: ${menteeResults.fixed + mentorResults.fixed}`);
      addLog(`   Already correct: ${menteeResults.alreadyCorrect + mentorResults.alreadyCorrect}`);
      addLog(`   Errors: ${menteeResults.errors + mentorResults.errors}`);
      
      addLog('\n✅ All reviews now have correct week_start dates!');
      addLog('🔄 Refresh your dashboard to see the updates.');
      
    } catch (error: any) {
      addLog(`❌ Fatal error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          🔧 Review Date Fix Tool
        </h2>
        <p className="text-sm text-gray-600">
          This tool fixes reviews that have incorrect week_start dates.
          Reviews should have week_start set to Monday at 00:00:00.
        </p>
      </div>

      <button
        onClick={runFix}
        disabled={fixing}
        className={`px-4 py-2 rounded font-medium ${
          fixing
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {fixing ? '⏳ Fixing Reviews...' : '🚀 Fix Review Dates'}
      </button>

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="mt-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Results</h3>
          {results.map((result) => (
            <div key={result.collection} className="bg-gray-50 rounded p-4">
              <h4 className="font-medium text-gray-900 mb-2">{result.collection}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Total:</span>
                  <span className="ml-2 font-medium">{result.total}</span>
                </div>
                <div>
                  <span className="text-gray-600">Fixed:</span>
                  <span className="ml-2 font-medium text-green-600">{result.fixed}</span>
                </div>
                <div>
                  <span className="text-gray-600">Already Correct:</span>
                  <span className="ml-2 font-medium text-blue-600">{result.alreadyCorrect}</span>
                </div>
                <div>
                  <span className="text-gray-600">Errors:</span>
                  <span className="ml-2 font-medium text-red-600">{result.errors}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Logs Console */}
      <div className="mt-6">
        <h3 className="font-semibold text-gray-900 mb-2">Console Output</h3>
        <div className="bg-gray-900 text-gray-100 rounded p-4 h-96 overflow-y-auto font-mono text-xs">
          {logs.length === 0 ? (
            <p className="text-gray-500">Click "Fix Review Dates" to start...</p>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">
                {log}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
