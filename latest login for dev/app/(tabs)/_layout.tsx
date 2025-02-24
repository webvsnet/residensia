import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function TabLayout() {
  // const { user, session } = useAuth();
  // const isLandlord = user?.user_metadata?.is_landlord;

  // console.log("user",user)

  // Ensure user is authenticated
  // useEffect(() => {
  //   if (!session) {
  //     router.replace('/login');
  //   }
  // }, [session]);

  // if (!session) {
  //   return null;
  // }

  return (
    <Tabs screenOptions={{ headerShown: false }}>
     
          <Tabs.Screen
            name="dashboard"
            options={{
              title: 'Dashboard',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="grid-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: 'Settings',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="settings-outline" size={size} color={color} />
              ),
            }}
          />
     
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="home-outline" size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: 'Profile',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="person-outline" size={size} color={color} />
              ),
            }}
          />
 
    </Tabs>
  );
}