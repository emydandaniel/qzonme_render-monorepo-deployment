// Test Google Analytics implementation
export const testGoogleAnalytics = () => {
  // Check if Google Analytics is loaded
  if (typeof window === 'undefined') {
    console.log('❌ GA Test: Window not available (SSR)');
    return false;
  }

  if (!window.gtag) {
    console.log('❌ GA Test: gtag function not found');
    return false;
  }

  if (!window.dataLayer) {
    console.log('❌ GA Test: dataLayer not found');
    return false;
  }

  console.log('✅ GA Test: Google Analytics is properly loaded');
  console.log('📊 GA Test: dataLayer contains:', window.dataLayer.length, 'items');
  
  // Send a test event
  try {
    window.gtag('event', 'test_analytics', {
      event_category: 'debug',
      event_label: 'analytics_test',
      value: 1,
    });
    console.log('✅ GA Test: Test event sent successfully');
    return true;
  } catch (error) {
    console.log('❌ GA Test: Error sending test event:', error);
    return false;
  }
};

// Check Google Analytics Real-Time reporting
export const checkGARealTime = () => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.log('❌ GA Real-Time: Google Analytics not available');
    return;
  }

  // Send multiple test events to show up in real-time
  const events = [
    { name: 'page_view_test', category: 'navigation' },
    { name: 'user_engagement', category: 'engagement' },
    { name: 'quiz_interaction_test', category: 'quiz' }
  ];

  events.forEach((event, index) => {
    setTimeout(() => {
      window.gtag('event', event.name, {
        event_category: event.category,
        event_label: 'realtime_test',
        value: index + 1,
      });
      console.log(`📊 GA Real-Time: Sent ${event.name} event`);
    }, index * 1000); // Send events 1 second apart
  });

  console.log('📊 GA Real-Time: Check your Google Analytics Real-Time reports in 1-2 minutes');
  console.log('📊 GA Real-Time: Go to Analytics > Real-time > Events to see the test events');
};
