import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const EditProfileScreen = ({ route, navigation }) => {
  const { userData } = route.params;
  const [name, setName] = useState('');
  const [email, setEmail] = useState(userData?.email || '');
  const [dob, setDob] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!userData?.uid) {
        Alert.alert('Error', 'User ID is missing.');
        navigation.goBack();
        return;
      }

      try {
        const userRef = doc(db, 'users', userData.uid);
        const userSnapshot = await getDoc(userRef);

        if (userSnapshot.exists()) {
          const userDetails = userSnapshot.data();
          setName(userDetails.name || '');
          setEmail(userDetails.email || '');
          setDob(userDetails.dob || '');
          setMobile(userDetails.mobile || '');
          setAddress(userDetails.address || '');
        } else {
          Alert.alert('Error', 'User data not found.');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        Alert.alert('Error', 'Failed to fetch user details.');
      }
    };

    fetchUserData();
  }, [userData]);

  // Handle saving user data to Firestore
  const handleSave = async () => {
    if (!name || !email || !dob || !mobile || !address) {
      Alert.alert('Error', 'All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', userData.uid);
      await setDoc(userRef, { name, email, dob, mobile, address }, { merge: true });
      Alert.alert('Success', 'Profile updated successfully!');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Name"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        editable={false} // Email should not be editable
      />
      <TextInput
        style={styles.input}
        placeholder="Date of Birth (YYYY-MM-DD)"
        value={dob}
        onChangeText={setDob}
      />
      <TextInput
        style={styles.input}
        placeholder="Mobile Number"
        value={mobile}
        onChangeText={setMobile}
        keyboardType="phone-pad"
      />
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Address"
        value={address}
        onChangeText={setAddress}
        multiline
      />
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.saveButtonText}>Save Changes</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    color: '#2196F3',
    fontSize: 16,
    marginRight: 10,
  },
  headerTitle: {
    color: '#E0E0E0',
    fontSize: 20,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: '#1E1E1E',
    color: '#E0E0E0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditProfileScreen;
