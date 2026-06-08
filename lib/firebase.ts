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
  collection,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  getDoc
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google OAuth provider — Drive scope is required for the export-to-Doc feature
export const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive');

// Drive access token is intentionally kept in memory only (not persisted).
// It is lost on page refresh, which is expected: users re-sign-in to regain export access.
let cachedAccessToken: string | null = null;

// Listens to Firebase auth state. Calls onAuthSuccess whenever a Firebase user exists,
// passing the cached Drive token (null if the user hasn't done the sign-in popup this session).
// Calls onAuthFailure only when Firebase reports no authenticated user.
export function initAuth(
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      onAuthSuccess?.(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      onAuthFailure?.();
    }
  });
}

export async function googleSignIn(): Promise<{ user: User; accessToken: string }> {
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (!credential?.accessToken) {
    throw new Error('Failed to get access token from Google credential');
  }
  cachedAccessToken = credential.accessToken;
  return { user: result.user, accessToken: credential.accessToken };
}

export async function logout() {
  await signOut(auth);
  cachedAccessToken = null;
}

export interface Account {
  id: string;
  userId: string;
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

export async function getAccounts(): Promise<Account[]> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) return [];
    const q = query(collection(db, 'accounts'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as Account))
      .filter(a => a.userId === uid);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return [];
  }
}

export async function addAccount(account: Omit<Account, 'id' | 'createdAt' | 'userId'>): Promise<Account> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('Must be signed in to add accounts');
  const docRef = doc(collection(db, 'accounts'));
  const newAccount: Account = {
    id: docRef.id,
    userId: uid,
    ...account,
    createdAt: new Date().toISOString()
  };
  await setDoc(docRef, newAccount);
  return newAccount;
}

export async function deleteAccount(id: string): Promise<void> {
  await deleteDoc(doc(db, 'accounts', id));
}

export async function saveResearchResult(result: ResearchResult): Promise<void> {
  await setDoc(doc(db, 'accounts', result.accountId, 'research', 'latest'), result);
}

export async function getResearchResult(accountId: string): Promise<ResearchResult | null> {
  try {
    const snapshot = await getDoc(doc(db, 'accounts', accountId, 'research', 'latest'));
    return snapshot.exists() ? (snapshot.data() as ResearchResult) : null;
  } catch (error) {
    console.error('Error fetching research for account:', accountId, error);
    return null;
  }
}
