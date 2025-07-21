// Zitadel API Client
// A simple client to interact with the Zitadel API using fetch

const API_BASE_URL = 'http://localhost:3008/api/zitadel';

// Register a new user
async function registerUser(userData) {
  try {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to register user');
    }
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
}

// Verify email with verification code
async function verifyEmail(userId, verificationCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        code: verificationCode,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to verify email');
    }
    
    return data;
  } catch (error) {
    console.error('Email verification error:', error);
    throw error;
  }
}

// Get user details
async function getUserDetails(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get user details');
    }
    
    return data;
  } catch (error) {
    console.error('Get user details error:', error);
    throw error;
  }
}

// Resend verification email
async function resendVerificationEmail(userId) {
  try {
    const response = await fetch(`${API_BASE_URL}/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to resend verification email');
    }
    
    return data;
  } catch (error) {
    console.error('Resend verification error:', error);
    throw error;
  }
}

// Example usage
async function exampleUsage() {
  try {
    // 1. Register a new user
    const newUser = {
      email: 'user@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'SecurePassword123!',
    };
    
    console.log('Registering user...');
    const registrationResult = await registerUser(newUser);
    console.log('User registered:', registrationResult);
    
    const userId = registrationResult.userId || registrationResult.id;
    
    // 2. Get user details
    console.log('Getting user details...');
    const userDetails = await getUserDetails(userId);
    console.log('User details:', userDetails);
    
    // 3. Resend verification email if needed
    console.log('Resending verification email...');
    const resendResult = await resendVerificationEmail(userId);
    console.log('Verification email sent:', resendResult);
    
    // 4. Verify email (this would typically happen after user clicks link in email)
    // For demo purposes, we'd need the verification code from the email
    // const verificationCode = '123456'; // This would come from the email
    // console.log('Verifying email...');
    // const verifyResult = await verifyEmail(userId, verificationCode);
    // console.log('Email verified:', verifyResult);
    
  } catch (error) {
    console.error('Error in example usage:', error.message);
  }
}

// Export functions for use in other files
export {
  registerUser,
  verifyEmail,
  getUserDetails,
  resendVerificationEmail,
  exampleUsage
}; 