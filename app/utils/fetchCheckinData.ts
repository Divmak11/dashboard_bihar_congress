/**
 * Utility functions to fetch check-in data from Firebase
 */

import { db } from './firebase';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { UserCheckin, CheckinHomeSummary } from '../../models/checkinTypes';

/**
 * Fetch all user check-in data from Firebase
 * @returns Promise with array of user check-in data
 */
export async function fetchAllCheckinData(): Promise<UserCheckin[]> {
  try {
    console.log('[fetchAllCheckinData] Fetching check-in data from Firebase');
    
    const checkinCollection = collection(db, 'checkin_data');
    const q = query(checkinCollection, orderBy('totalCount', 'desc'));
    const snapshot = await getDocs(q);
    
    const checkinData: UserCheckin[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      checkinData.push({
        user_id: data.user_id || '',
        name: data.name || '',
        totalCount: data.totalCount || 0,
        dailyCounts: data.dailyCounts || []
      });
    });
    
    console.log(`[fetchAllCheckinData] Fetched ${checkinData.length} user check-in records`);
    return checkinData;
  } catch (error) {
    console.error('[fetchAllCheckinData] Error fetching check-in data:', error);
    throw error;
  }
}

/**
 * Fetch check-in summary for home page card
 * @returns Promise with summary metrics
 */
export async function fetchCheckinHomeSummary(): Promise<CheckinHomeSummary> {
  try {
    console.log('[fetchCheckinHomeSummary] Fetching check-in summary');
    
    const allData = await fetchAllCheckinData();
    
    // Calculate total check-ins
    const totalCheckins = allData.reduce((sum, user) => sum + user.totalCount, 0);
    
    // Calculate active users in last week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const oneWeekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    
    const activeUsersLastWeek = allData.filter(user => 
      user.dailyCounts.some(daily => daily.date >= oneWeekAgoStr)
    ).length;
    
    const summary: CheckinHomeSummary = {
      totalUsers: allData.length,
      totalCheckins,
      activeUsersLastWeek
    };
    
    console.log('[fetchCheckinHomeSummary] Summary:', summary);
    return summary;
  } catch (error) {
    console.error('[fetchCheckinHomeSummary] Error fetching summary:', error);
    throw error;
  }
}

/**
 * Fetch check-in data for a specific user
 * @param userId - User phone number
 * @returns Promise with user check-in data or null
 */
export async function fetchUserCheckinData(userId: string): Promise<UserCheckin | null> {
  try {
    const allData = await fetchAllCheckinData();
    const userData = allData.find(user => user.user_id === userId);
    return userData || null;
  } catch (error) {
    console.error(`[fetchUserCheckinData] Error fetching data for user ${userId}:`, error);
    throw error;
  }
}
