import {
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { UserService } from './firestore';
import { User } from '../types';

export class AuthService {
  private static googleProvider: GoogleAuthProvider;

  private static getGoogleProvider(): GoogleAuthProvider {
    if (!this.googleProvider) {
      this.googleProvider = new GoogleAuthProvider();
      this.googleProvider.addScope('email');
      this.googleProvider.addScope('profile');
      // Add Google Calendar API scopes
      this.googleProvider.addScope('https://www.googleapis.com/auth/calendar.readonly');
      this.googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
      
      // Set custom parameters for OAuth with minimal configuration
      this.googleProvider.setCustomParameters({
        prompt: 'select_account',
        access_type: 'offline' // Request offline access for refresh tokens
      });
    }
    return this.googleProvider;
  }

  // Sign in with Google using redirect (primary method)
  static async signInWithGoogle(): Promise<FirebaseUser> {
    try {
      // Use redirect method for better compatibility
      await signInWithRedirect(auth, this.getGoogleProvider());
      // This will cause a page redirect, so we won't reach this point
      // The result will be handled by handleRedirectResult
      throw new Error('Redirect initiated');
    } catch (error: any) {
      console.error('Error signing in with Google redirect:', error);
      throw error;
    }
  }

  // Handle redirect result after page reload
  static async handleRedirectResult(): Promise<FirebaseUser | null> {
    try {
      const result = await getRedirectResult(auth);
      if (result && result.user) {
        return await this.handleGoogleSignInResult(result.user);
      }
      return null;
    } catch (error) {
      console.error('Error handling redirect result:', error);
      throw error;
    }
  }

  // Common handler for both popup and redirect results
  private static async handleGoogleSignInResult(firebaseUser: FirebaseUser): Promise<FirebaseUser> {
    // Check if user's email domain is allowed (Navgurukul domain only)
    const userEmail = firebaseUser.email;
    if (!userEmail) {
      await signOut(auth);
      throw new Error('No email address found in Google account');
    }

    const allowedDomains = ['navgurukul.org'];
    const emailDomain = userEmail.split('@')[1]?.toLowerCase();
    
    if (!allowedDomains.includes(emailDomain)) {
      // Sign out the user immediately if domain is not allowed
      await signOut(auth);
      throw new Error(`Access denied. Only Navgurukul domain emails (@navgurukul.org) are allowed to sign in.`);
    }

    // Check if user exists in Firestore, create if not
    let existingUser = await UserService.getUserById(firebaseUser.uid);
    
    if (!existingUser) {
      // Create new user document for first-time Google sign-in with UID as document ID
      await UserService.createUserWithId(firebaseUser.uid, {
        name: firebaseUser.displayName || 'User',
        email: firebaseUser.email!,
        isAdmin: false,
        skills: [],
        created_at: new Date(),
        updated_at: new Date()
      });
    }

    return firebaseUser;
  }

  // Sign out current user
  static async signOut(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  // Get current user data from Firestore
  static async getCurrentUserData(): Promise<User | null> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;

    try {
      const userData = await UserService.getUserById(firebaseUser.uid);
      return userData;
    } catch (error) {
      console.error('Error getting current user data:', error);
      return null;
    }
  }

  // Subscribe to auth state changes
  static onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  // Check if user is admin
  static async isAdmin(): Promise<boolean> {
    const userData = await this.getCurrentUserData();
    return userData?.isAdmin || false;
  }
}