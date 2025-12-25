import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { registerForPushNotificationsAsync } from '@/lib/pushNotifications';

export default function TabsLayout() {
  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
