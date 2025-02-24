import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface MinimalUser {
  id: string;
  email?: string;
  user_metadata: {
    name?: string;
    is_landlord?: boolean;
    company_name?: string;
  };
  aud?: string;
  role?: string;
}

// Custom storage adapter that uses localStorage for web and SecureStore for native
const CustomStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const safeKey = encodeURIComponent(key);
      if (Platform.OS === 'web') {
        return localStorage.getItem(safeKey);
      }
      return await SecureStore.getItemAsync(safeKey);
    } catch (error) {
      console.warn('Storage getItem error:', error);
      return null;
    }
  },

  setItem: async (key: string, value: string): Promise<void> => {
    try {
      const safeKey = encodeURIComponent(key);
      if (Platform.OS === 'web') {
        localStorage.setItem(safeKey, value);
        return;
      }

      const data = JSON.parse(value);
      
      if (data?.user) {
        const minimalUser: MinimalUser = {
          id: data.user.id,
          email: data.user.email,
          user_metadata: {
            name: data.user.user_metadata?.name,
            is_landlord: data.user.user_metadata?.is_landlord,
            company_name: data.user.user_metadata?.company_name,
          },
          aud: data.user.aud,
          role: data.user.role,
        };

        // Clean up null/undefined values
        Object.entries(minimalUser.user_metadata).forEach(([key, value]) => {
          if (value == null) {
            delete minimalUser.user_metadata[key];
          }
        });

        data.user = minimalUser;
        
        try {
          await SecureStore.setItemAsync(safeKey, JSON.stringify(data));
        } catch (storageError: any) {
          // If still too large, fall back to minimal storage
          if (storageError.message?.includes('larger than 2048 bytes')) {
            const fallbackData = {
              ...data,
              user: {
                id: data.user.id,
                user_metadata: {
                  is_landlord: data.user.user_metadata?.is_landlord
                }
              }
            };
            await SecureStore.setItemAsync(safeKey, JSON.stringify(fallbackData));
          } else {
            throw storageError;
          }
        }
      } else {
        await SecureStore.setItemAsync(safeKey, value);
      }
    } catch (error) {
      console.warn('Storage setItem error:', error);
      throw error;
    }
  },

  removeItem: async (key: string): Promise<void> => {
    try {
      const safeKey = encodeURIComponent(key);
      if (Platform.OS === 'web') {
        localStorage.removeItem(safeKey);
        return;
      }
      await SecureStore.deleteItemAsync(safeKey);
    } catch (error) {
      console.warn('Storage removeItem error:', error);
      throw error;
    }
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://tyesyozsnskdypxytttu.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR5ZXN5b3pzbnNrZHlweHl0dHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk5NTU5MTgsImV4cCI6MjA1NTUzMTkxOH0.o8ejRJ_SLlBDjbXx3U_ltuUbsrRI_N_Ow_Ulkqq-UAM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: CustomStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});