import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, StatusBar } from 'react-native';

const WelcomeScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#121212" />

      {/* Logo Section */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>CertifyGov</Text>
      </View>

      {/* Description */}
      <Text style={styles.descriptionText}>
        Manage all your certificates in one place with ease and security.
      </Text>

      {/* Sign-In Button */}
      <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Login')}>
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoText: {
    color: '#E0E0E0',
    fontSize: 32,
    fontWeight: 'bold',
  },
  descriptionText: {
    color: '#B3B3B3',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  signInButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 50,
    borderRadius: 10,
  },
  buttonText: {
    color: '#E0E0E0',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WelcomeScreen;
