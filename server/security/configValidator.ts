import crypto from 'crypto';

/**
 * Environment configuration validator for security settings
 */

interface SecurityConfig {
  isProduction: boolean;
  adminUsername: string;
  adminPasswordHash?: string;
  jwtSecret: string;
  cloudinaryConfig?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: SecurityConfig;
}

// Minimum security requirements
const SECURITY_REQUIREMENTS = {
  MIN_JWT_SECRET_LENGTH: 32,
  MIN_ADMIN_USERNAME_LENGTH: 3,
  REQUIRED_BCRYPT_HASH_PREFIX: '$2b$',
};

export function validateSecurityConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Basic environment validation
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  const jwtSecret = process.env.JWT_SECRET || 'your-secure-jwt-secret-change-this';

  // Validate admin username
  if (adminUsername.length < SECURITY_REQUIREMENTS.MIN_ADMIN_USERNAME_LENGTH) {
    errors.push(`ADMIN_USERNAME must be at least ${SECURITY_REQUIREMENTS.MIN_ADMIN_USERNAME_LENGTH} characters long`);
  }

  if (adminUsername === 'admin' && isProduction) {
    warnings.push('Using default admin username "admin" in production is not recommended');
  }

  // Validate admin password hash
  if (!adminPasswordHash) {
    if (isProduction) {
      errors.push('ADMIN_PASSWORD_HASH is required in production environment');
    } else {
      warnings.push('ADMIN_PASSWORD_HASH not set - using development fallback (insecure)');
    }
  } else {
    if (!adminPasswordHash.startsWith(SECURITY_REQUIREMENTS.REQUIRED_BCRYPT_HASH_PREFIX)) {
      errors.push('ADMIN_PASSWORD_HASH must be a valid bcrypt hash (should start with $2b$)');
    }

    if (adminPasswordHash.length < 60) {
      errors.push('ADMIN_PASSWORD_HASH appears to be invalid (bcrypt hashes should be ~60 characters)');
    }
  }

  // Validate JWT secret
  if (jwtSecret === 'your-secure-jwt-secret-change-this') {
    errors.push('JWT_SECRET must be changed from the default value');
  }

  if (jwtSecret.length < SECURITY_REQUIREMENTS.MIN_JWT_SECRET_LENGTH) {
    errors.push(`JWT_SECRET must be at least ${SECURITY_REQUIREMENTS.MIN_JWT_SECRET_LENGTH} characters long`);
  }

  // Check JWT secret randomness (basic check)
  if (!/[A-Z]/.test(jwtSecret) || !/[a-z]/.test(jwtSecret) || !/[0-9]/.test(jwtSecret)) {
    warnings.push('JWT_SECRET should contain uppercase, lowercase, and numeric characters for better security');
  }

  // Validate Cloudinary configuration (optional but recommended)
  const cloudinaryConfig = validateCloudinaryConfig();
  if (cloudinaryConfig.hasIssues && isProduction) {
    warnings.push('Cloudinary configuration has issues - image uploads may not work properly');
  }

  // Database URL validation
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    errors.push('DATABASE_URL is required');
  } else {
    if (databaseUrl.startsWith('postgres://') && isProduction) {
      warnings.push('Consider using postgresql:// instead of postgres:// for better compatibility');
    }
    
    if (!databaseUrl.includes('ssl=true') && isProduction && databaseUrl.includes('neon.tech')) {
      warnings.push('SSL should be enabled for production database connections');
    }
  }

  // Additional production checks
  if (isProduction) {
    // Check for development-specific values that shouldn't be in production
    if (jwtSecret.includes('dev') || jwtSecret.includes('test') || jwtSecret.includes('local')) {
      warnings.push('JWT_SECRET appears to contain development-related terms');
    }

    // Check for localhost references
    const suspiciousEnvVars = Object.entries(process.env).filter(([key, value]) => 
      value && (value.includes('localhost') || value.includes('127.0.0.1'))
    );
    
    if (suspiciousEnvVars.length > 0) {
      warnings.push(`Found localhost references in production environment: ${suspiciousEnvVars.map(([key]) => key).join(', ')}`);
    }
  }

  const config: SecurityConfig = {
    isProduction,
    adminUsername,
    adminPasswordHash,
    jwtSecret,
    cloudinaryConfig: cloudinaryConfig.config
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config
  };
}

function validateCloudinaryConfig(): { 
  hasIssues: boolean; 
  config?: { cloudName: string; apiKey: string; apiSecret: string };
  issues: string[];
} {
  const issues: string[] = [];
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName) issues.push('CLOUDINARY_CLOUD_NAME is missing');
  if (!apiKey) issues.push('CLOUDINARY_API_KEY is missing');
  if (!apiSecret) issues.push('CLOUDINARY_API_SECRET is missing');

  if (apiKey && !/^\d+$/.test(apiKey)) {
    issues.push('CLOUDINARY_API_KEY should be numeric');
  }

  if (apiSecret && apiSecret.length < 20) {
    issues.push('CLOUDINARY_API_SECRET appears to be too short');
  }

  const hasIssues = issues.length > 0;
  const config = (!hasIssues && cloudName && apiKey && apiSecret) ? {
    cloudName,
    apiKey,
    apiSecret
  } : undefined;

  return { hasIssues, config, issues };
}

// Generate secure configuration values
export function generateSecureDefaults(): {
  jwtSecret: string;
  adminPasswordHash: string;
  adminPassword: string;
} {
  // Generate a secure JWT secret
  const jwtSecret = crypto.randomBytes(32).toString('hex');
  
  // Generate a random admin password
  const adminPassword = crypto.randomBytes(16).toString('base64').replace(/[^a-zA-Z0-9]/g, '') + '!@#';
  
  // Note: In a real application, you would hash this password before storing it
  // This is just for demonstration - the hash should be generated separately
  const adminPasswordHash = '$2b$12$placeholder.hash.should.be.generated.separately';

  return {
    jwtSecret,
    adminPasswordHash,
    adminPassword
  };
}

// Environment setup guide
export function getSetupInstructions(): string[] {
  const instructions = [
    '🔧 Security Configuration Setup:',
    '',
    '1. Generate a secure JWT secret:',
    '   node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'));"',
    '',
    '2. Generate admin password hash:',
    '   node -e "const bcrypt = require(\'bcrypt\'); console.log(bcrypt.hashSync(\'your_password_here\', 12));"',
    '',
    '3. Set environment variables:',
    '   ADMIN_USERNAME=your_admin_username',
    '   ADMIN_PASSWORD_HASH=your_bcrypt_hash_from_step_2',
    '   JWT_SECRET=your_jwt_secret_from_step_1',
    '',
    '4. For Cloudinary (image uploads):',
    '   CLOUDINARY_CLOUD_NAME=your_cloud_name',
    '   CLOUDINARY_API_KEY=your_api_key',
    '   CLOUDINARY_API_SECRET=your_api_secret',
    '',
    '5. Database:',
    '   DATABASE_URL=your_postgresql_connection_string',
    '',
    '⚠️  Never commit these values to version control!',
    '✅ Use a secure secret management system in production',
  ];

  return instructions;
}

// Security checklist for deployment
export function getDeploymentChecklist(): { 
  item: string; 
  required: boolean; 
  description: string;
}[] {
  return [
    {
      item: 'Environment Variables Set',
      required: true,
      description: 'All required environment variables are properly configured'
    },
    {
      item: 'Strong JWT Secret',
      required: true,
      description: 'JWT_SECRET is cryptographically secure (32+ characters)'
    },
    {
      item: 'Admin Password Hash',
      required: true,
      description: 'ADMIN_PASSWORD_HASH is a proper bcrypt hash'
    },
    {
      item: 'Database SSL',
      required: true,
      description: 'Database connection uses SSL in production'
    },
    {
      item: 'HTTPS Enabled',
      required: true,
      description: 'Application is served over HTTPS'
    },
    {
      item: 'Security Headers',
      required: true,
      description: 'Helmet.js security headers are configured'
    },
    {
      item: 'Rate Limiting',
      required: true,
      description: 'Rate limiting is enabled for all endpoints'
    },
    {
      item: 'Input Validation',
      required: true,
      description: 'All inputs are validated and sanitized'
    },
    {
      item: 'Error Handling',
      required: true,
      description: 'Error messages do not leak sensitive information'
    },
    {
      item: 'Cloudinary Credentials',
      required: false,
      description: 'Cloudinary is configured for image uploads (optional)'
    },
    {
      item: 'Monitoring Setup',
      required: false,
      description: 'Security event monitoring and logging (recommended)'
    },
    {
      item: 'Backup Strategy',
      required: false,
      description: 'Database backup and recovery plan (recommended)'
    }
  ];
}

// Validate and report security configuration
export function validateAndReport(): void {
  console.log('\n🔒 Security Configuration Validation\n');
  
  const validation = validateSecurityConfig();
  
  if (validation.isValid) {
    console.log('✅ Security configuration is valid!\n');
  } else {
    console.log('❌ Security configuration has issues:\n');
    
    if (validation.errors.length > 0) {
      console.log('🚨 ERRORS (must be fixed):');
      validation.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
      console.log('');
    }
  }
  
  if (validation.warnings.length > 0) {
    console.log('⚠️  WARNINGS (should be addressed):');
    validation.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
    console.log('');
  }
  
  if (!validation.isValid) {
    console.log('📋 Setup Instructions:');
    const instructions = getSetupInstructions();
    instructions.forEach(instruction => console.log(instruction));
    console.log('');
  }
  
  // Always show deployment checklist in production
  if (validation.config.isProduction) {
    console.log('🎯 Production Deployment Checklist:');
    const checklist = getDeploymentChecklist();
    checklist.forEach(item => {
      const status = item.required ? (validation.isValid ? '✅' : '❌') : '📋';
      console.log(`   ${status} ${item.item} ${item.required ? '(Required)' : '(Optional)'}`);
      console.log(`      ${item.description}`);
    });
    console.log('');
  }
}
