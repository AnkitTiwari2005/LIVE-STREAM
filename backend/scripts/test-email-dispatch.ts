import * as dotenv from 'dotenv';
dotenv.config();
import { MailerService } from '../src/modules/notifications/mailer.service';

async function testEmail() {
  console.log('--- Testing MailerService Email Dispatch with Loaded .env ---');
  const mailer = new MailerService();

  const success = await mailer.sendVerificationEmail(
    '12328.uspc@gmail.com',
    'Ankit Test Devotee',
    'sample_test_verify_token_1234567890'
  );

  console.log('MailerService.sendVerificationEmail result:', success);
  if (!success) {
    console.error('❌ Failed to dispatch email');
    process.exit(1);
  }
  console.log('✅ MailerService test passed successfully!');
}

testEmail().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
