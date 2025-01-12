import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

const CertificateViewer = ({ route, navigation }) => {
  const { fileKey, generatePresignedUrl } = route.params; // Pass the function and fileKey as params
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFileUrlAndOpen = async () => {
      try {
        // Use the generatePresignedUrl function from DashboardScreen
        const presignedUrl = await generatePresignedUrl(fileKey);

        if (!presignedUrl) {
          throw new Error('Failed to generate pre-signed URL.');
        }

        setFileUrl(presignedUrl);

        // Open the PDF in the in-app browser
        const result = await WebBrowser.openBrowserAsync(presignedUrl);
        console.log('WebBrowser result:', result);

        // Close the viewer and navigate back after the browser is closed
        if (result.type === 'dismiss') {
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching pre-signed URL or opening PDF:', error);
        Alert.alert('Error', 'Failed to load the certificate.');
        navigation.goBack(); // Navigate back if there's an error
      } finally {
        setLoading(false);
      }
    };

    fetchFileUrlAndOpen();
  }, [fileKey]);

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" color="#4CAF50" />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
});

export default CertificateViewer;
