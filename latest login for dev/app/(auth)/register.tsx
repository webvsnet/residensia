import { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, Image, Alert, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLandlord, setIsLandlord] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickImage() {
    try {
      setError(null);
      let result;
      
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        const promise = new Promise((resolve) => {
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => resolve({ 
                canceled: false, 
                assets: [{
                  uri: reader.result as string,
                  type: file.type,
                  name: file.name,
                  width: 0,
                  height: 0
                }]
              });
              reader.readAsDataURL(file);
            } else {
              resolve({ canceled: true, assets: [] });
            }
          };
        });
        
        input.click();
        result = await promise as ImagePicker.ImagePickerResult;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          setError('Permission to access photo library is required');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
          selectionLimit: 1,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      setError('Failed to pick image. Please try again.');
    }
  }

  const handleLandlordToggle = () => {
    setError(null);
    setIsLandlord(!isLandlord);
    if (isLandlord) {
      setCompanyName('');
      setProfileImage(null);
    }
  };

  const validateForm = () => {
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!password) {
      setError('Password is required');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (!name) {
      setError('Name is required');
      return false;
    }
    if (isLandlord) {
      if (!profileImage) {
        setError('Profile photo is required for landlords');
        return false;
      }
      if (!companyName) {
        setError('Company name is required for landlords');
        return false;
      }
    }
    return true;
  };

  async function signUpWithEmail() {
    try {
      setError(null);
      if (!validateForm()) {
        return;
      }

      setLoading(true);

      // Upload profile image if exists
      let profileImageUrl = null;
      if (profileImage) {
        try {
          let blob;
          if (profileImage.startsWith('data:')) {
            const base64Data = profileImage.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512);
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              byteArrays.push(byteArray);
            }
            
            blob = new Blob(byteArrays, { type: 'image/jpeg' });
          } else {
            const imageResponse = await fetch(profileImage);
            blob = await imageResponse.blob();
          }

          const fileName = `profile-${Date.now()}.jpg`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('profiles')
            .upload(fileName, blob, {
              contentType: 'image/jpeg',
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('profiles')
            .getPublicUrl(fileName);
            
          profileImageUrl = publicUrl;
        } catch (error: any) {
          throw new Error('Failed to upload profile image: ' + error.message);
        }
      }

      // Sign up the user
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            is_landlord: isLandlord,
            company_name: isLandlord ? companyName : null,
            profile_image: profileImageUrl,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // Create profile in the database
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: signUpData.user.id,
            name,
            is_landlord: isLandlord,
            company_name: isLandlord ? companyName : null,
            profile_image: profileImageUrl,
          })
          .select()
          .single();

        if (profileError) throw profileError;

        // Sign in the user immediately
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Redirect to the appropriate dashboard
        router.replace(isLandlord ? '/dashboard' : '/home');
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <ExpoImage 
              source="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267"
              placeholder={blurhash}
              contentFit="cover"
              transition={1000}
              style={styles.logo}
            />
          </View>
          <Text style={styles.title}>Create Account</Text>
        </View>

        <View style={styles.formContainer}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              setError(null);
            }}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(null);
            }}
            secureTextEntry
          />

          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Register as Landlord</Text>
            <TouchableOpacity 
              style={[styles.toggleButton, isLandlord && styles.toggleButtonActive]}
              onPress={handleLandlordToggle}
            >
              <Text style={[styles.toggleText, isLandlord && styles.toggleTextActive]}>
                {isLandlord ? 'Yes' : 'No'}
              </Text>
            </TouchableOpacity>
          </View>

          {isLandlord && (
            <>
              <TextInput
                style={styles.input}
                placeholder="Company Name"
                value={companyName}
                onChangeText={(text) => {
                  setCompanyName(text);
                  setError(null);
                }}
              />
              
              <TouchableOpacity 
                style={[styles.imageButton, !profileImage && styles.imageButtonRequired]} 
                onPress={pickImage}
              >
                {profileImage ? (
                  <View style={styles.profileImageWrapper}>
                    <ExpoImage
                      source={{ uri: profileImage }}
                      placeholder={blurhash}
                      contentFit="cover"
                      transition={300}
                      style={styles.profileImage}
                    />
                  </View>
                ) : (
                  <>
                    <Ionicons name="camera" size={24} color="#666" />
                    <Text style={styles.imageButtonText}>Add Profile Photo (Required)</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={signUpWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.link}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 20,
  },
  logoWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  formContainer: {
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFB8B8',
  },
  errorText: {
    color: '#D00000',
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
    fontSize: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  toggleButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleText: {
    color: '#666',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  imageButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    height: 80,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageButtonRequired: {
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  imageButtonText: {
    color: '#666',
    marginTop: 8,
    fontSize: 14,
  },
  profileImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
    fontSize: 16,
  },
  link: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});