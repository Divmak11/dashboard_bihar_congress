'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';
import Link from 'next/link';

type AuthView = 'signIn' | 'createAccount';

export default function AuthPage() {
  const router = useRouter();
  const [view, setView] = useState<AuthView>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedAssemblies, setSelectedAssemblies] = useState<string[]>([]);
  const [assemblies, setAssemblies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch the Bihar assemblies
  useEffect(() => {
    async function fetchAssemblies() {
      try {
        const response = await fetch('/data/bihar_assemblies.json');
        if (!response.ok) {
          throw new Error('Failed to fetch assemblies');
        }
        const data = await response.json();
        setAssemblies(data);
      } catch (error) {
        console.error('Error fetching assemblies:', error);
        setError('Failed to load assembly data. Please try again later.');
      }
    }

    fetchAssemblies();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // Set auth token cookie
      document.cookie = `auth-token=${await userCredential.user.getIdToken()}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
      router.push('/');
    } catch (error: any) {
      console.error('Sign in error:', error);
      setError(error.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (selectedAssemblies.length === 0) {
      setError('Please select at least one assembly');
      return;
    }
    
    setLoading(true);
    
    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create a document in the admin-users collection
      await setDoc(doc(db, 'admin-users', user.uid), {
        id: user.uid,
        email: user.email,
        assemblies: selectedAssemblies,
        role: 'zonal-incharge', // Default role as specified
        createdAt: serverTimestamp()
      });
      
      // Set auth token cookie
      document.cookie = `auth-token=${await user.getIdToken()}; path=/; max-age=${60 * 60 * 24 * 7}`; // 7 days
      
      router.push('/');
    } catch (error: any) {
      console.error('Create account error:', error);
      setError(error.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAssemblyChange = (assembly: string) => {
    setSelectedAssemblies(prev => {
      if (prev.includes(assembly)) {
        return prev.filter(a => a !== assembly);
      } else {
        return [...prev, assembly];
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {view === 'signIn' ? 'Sign in to your account' : 'Create a new account'}
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {view === 'signIn' ? (
            <>
              <form className="space-y-6" onSubmit={handleSignIn}>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    disabled={loading}
                  >
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="text-center">
                  <button
                    onClick={() => setView('createAccount')}
                    className="font-medium text-indigo-600 hover:text-indigo-500"
                  >
                    Create Account
                  </button>
                </div>
              </div>
            </>
          ) : (
            <form className="space-y-6" onSubmit={handleCreateAccount}>
              <div>
                <label htmlFor="create-email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <input
                    id="create-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="create-password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <input
                    id="create-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <input
                    id="confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="assemblies" className="block text-sm font-medium text-gray-700">
                  Select Assemblies
                </label>
                <div className="mt-1 max-h-60 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {assemblies.length > 0 ? (
                    assemblies.map((assembly) => (
                      <div key={assembly} className="flex items-start my-1">
                        <div className="flex items-center h-5">
                          <input
                            id={`assembly-${assembly}`}
                            name={`assembly-${assembly}`}
                            type="checkbox"
                            checked={selectedAssemblies.includes(assembly)}
                            onChange={() => handleAssemblyChange(assembly)}
                            className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label htmlFor={`assembly-${assembly}`} className="font-medium text-gray-700">
                            {assembly}
                          </label>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">Loading assemblies...</p>
                  )}
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
              </div>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView('signIn')}
                  className="font-medium text-indigo-600 hover:text-indigo-500"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 