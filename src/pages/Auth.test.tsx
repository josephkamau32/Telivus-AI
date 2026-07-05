import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Auth from './Auth';

const { signInWithPassword, signUp, getSession, onAuthStateChange, signOut } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
      signOut,
      signInWithPassword,
      signUp,
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useTranslation: () => ({
    t: {
      welcomeToTelivus: 'Welcome to Telivus',
      signInOrCreateAccount: 'Sign in or create an account to get started',
      alreadySignedIn: 'You are already signed in',
      email: 'Email',
      password: 'Password',
      usernameOptional: 'Username (optional)',
      youExampleCom: 'you@example.com',
      johndoe: 'johndoe',
      sixCharacters: '••••••••',
      signingIn: 'Signing in...',
      signingOut: 'Signing out...',
      creatingAccount: 'Creating account...',
      goToDashboard: 'Go to Dashboard',
      validationError: 'Validation Error',
      pleaseFillAllFields: 'Please fill in all fields',
      passwordMin6Chars: 'Password must be at least 6 characters',
      emailAndPasswordRequired: 'Email and password are required',
      success: 'Success!',
      checkEmailConfirm: 'Check your email to confirm your account',
      signedOut: 'Signed Out',
      signedOutSuccessfully: 'You have been signed out successfully',
      signOutError: 'Sign Out Error',
      failedToSignOut: 'Failed to sign out',
      authenticationError: 'Authentication Error',
      signInFailed: 'Sign In Failed',
      unexpectedError: 'An unexpected error occurred',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      signOut: 'Sign Out',
    },
  }),
}));

vi.mock('@/components/Navbar', () => ({ Navbar: () => <div>Navbar</div> }));
vi.mock('@/components/Footer', () => ({ Footer: () => <div>Footer</div> }));

describe('Auth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    signOut.mockResolvedValue({ error: null });
    signInWithPassword.mockResolvedValue({ error: null });
    signUp.mockResolvedValue({ error: null });
  });

  it('shows a clear inline error when sign in fails', async () => {
    signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    render(
      <MemoryRouter>
        <Auth />
      </MemoryRouter>
    );

    const emailInput = await screen.findByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);

    fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrong-pass' } });
    fireEvent.click(screen.getAllByRole('button', { name: /sign in/i }).find((button) => button.getAttribute('type') === 'submit')!);

    await waitFor(() => {
      expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument();
  });
});
