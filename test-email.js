const { emailService } = require('./apps/api/src/services/emailService');

async function testEmail() {
  console.log('Testing email service...');
  try {
    const token = await emailService.sendVerificationEmail(
      'test@example.com',
      'Test User',
      'test-user-id'
    );
    console.log('Email sent successfully, token:', token);
  } catch (error) {
    console.error('Email test failed:', error.message);
  }
}

testEmail();