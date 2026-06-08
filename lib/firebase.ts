import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  User,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDocFromServer,
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Configure Google OAuth provider
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');

// In-memory token caching to avoid storing tokens in localStorage/sessionStorage
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize auth state listener.
export function initAuth(
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token isn't cached yet, we may need to sign in again to get a fresh token or wait.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
}

// User sign-in with popup
export async function googleSignIn(): Promise<{ user: User; accessToken: string } | null> {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Google sign-in credential');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
}

// Access Token Getter
export async function getAccessToken(): Promise<string | null> {
  return cachedAccessToken;
}

// Logout
export async function logout() {
  await signOut(auth);
  cachedAccessToken = null;
}

// Validate connection to Firestore on initialization
export async function testConnection() {
  try {
    // Attempting a simple metadata load to test connection
    await getDocFromServer(doc(db, 'test-connection-placeholder', 'test'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection check: Client is offline or Firestore is unreachable.', error);
    }
  }
}

// Firestore operations for prospecting accounts
export interface Account {
  id: string;
  name: string;
  vertical: string;
  website: string;
  notes: string;
  createdAt: string;
}

export interface ResearchResult {
  id?: string;
  accountId: string;
  orgName: string;
  vertical: string;
  detectedLms: string;
  displacementScore: number;
  lmsPainPoints: string[];
  learningNews: {
    headline: string;
    summary: string;
    source_url: string;
    date: string;
  }[];
  customerStoryAngle: string;
  draftEmail: string;
  researchedAt: string;
  researchNotes?: string;
}

// Fetch all accounts
export async function getAccounts(): Promise<Account[]> {
  try {
    const q = query(collection(db, 'accounts'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

// Add a single account
export async function addAccount(account: Omit<Account, 'id' | 'createdAt'>): Promise<Account> {
  const docRef = doc(collection(db, 'accounts'));
  const newAccount: Account = {
    id: docRef.id,
    ...account,
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, newAccount);
  return newAccount;
}

// Delete an account
export async function deleteAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, 'accounts', id));
}

// Save research result
export async function saveResearchResult(result: ResearchResult): Promise<void> {
  const docRef = doc(db, 'accounts', result.accountId, 'research', 'latest');
  await setDoc(docRef, result);
}

// Get latest research result for an account
export async function getResearchResult(accountId: string): Promise<ResearchResult | null> {
  try {
    const docRef = doc(db, 'accounts', accountId, 'research', 'latest');
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as ResearchResult;
    }
    return null;
  } catch (error) {
    console.error('Error fetching research for account:', accountId, error);
    return null;
  }
}
