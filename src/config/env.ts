// Environment configuration for frontend
// Variables from .env file (must start with PUBLIC_ in Astro)

export const ENV = {
  // API Configuration
  API_URL: import.meta.env.PUBLIC_API_URL || 'http://localhost:5000',

  // Site Configuration
  SITE_NAME: import.meta.env.PUBLIC_SITE_NAME || 'StyleHub',
  SITE_URL: import.meta.env.PUBLIC_SITE_URL || 'http://localhost:4321',

  // PayPal Configuration
  PAYPAL: {
    CLIENT_ID: import.meta.env.PUBLIC_PAYPAL_CLIENT_ID || '',
    ENVIRONMENT: import.meta.env.PUBLIC_PAYPAL_ENVIRONMENT || 'sandbox',

    // Helper to get PayPal SDK URL
    getSDKUrl(): string {
      const clientId = this.CLIENT_ID;
      const environment = this.ENVIRONMENT;

      if (!clientId) {
        console.warn('PayPal Client ID not configured');
        return '';
      }

      return `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=USD`;
    },

    // Check if PayPal is properly configured
    isConfigured(): boolean {
      return Boolean(this.CLIENT_ID);
    },
  },

  // Features
  FEATURES: {
    ANALYTICS: import.meta.env.PUBLIC_ENABLE_ANALYTICS === 'true',
    CHAT: import.meta.env.PUBLIC_ENABLE_CHAT === 'true',
  },

  // Social Links
  SOCIAL: {
    FACEBOOK: import.meta.env.PUBLIC_FACEBOOK_URL || '',
    INSTAGRAM: import.meta.env.PUBLIC_INSTAGRAM_URL || '',
    TWITTER: import.meta.env.PUBLIC_TWITTER_URL || '',
  },

  // Contact Information
  CONTACT: {
    EMAIL: import.meta.env.PUBLIC_CONTACT_EMAIL || '',
    PHONE: import.meta.env.PUBLIC_CONTACT_PHONE || '',
  },

  // Admin Configuration
  ADMIN: {
    NAME: import.meta.env.PUBLIC_ADMIN_NAME || '',
    EMAIL: import.meta.env.PUBLIC_ADMIN_EMAIL || '',
  },

  // Development helpers
  isDevelopment(): boolean {
    return import.meta.env.DEV;
  },

  isProduction(): boolean {
    return import.meta.env.PROD;
  },

  // Log configuration status
  logConfig(): void {
    if (this.isDevelopment()) {
      console.group('🔧 Environment Configuration');
      console.log('API URL:', this.API_URL);
      console.log(
        'PayPal Client ID:',
        this.PAYPAL.CLIENT_ID ? '✅ Configured' : '❌ Missing'
      );
      console.log('PayPal Environment:', this.PAYPAL.ENVIRONMENT);
      console.log('PayPal SDK URL:', this.PAYPAL.getSDKUrl());
      console.groupEnd();
    }
  },
};

// Log configuration on import (development only)
if (ENV.isDevelopment()) {
  ENV.logConfig();
}

export default ENV;
