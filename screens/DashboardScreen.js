import React, { useState , useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import AWS from 'aws-sdk';
import {AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY,AWS_REGION,AWS_BUCKET_NAME} from '@env';
import { Linking } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, PermissionsAndroid } from 'react-native';
import * as Permissions from 'expo-permissions';
AWS.config.update({
  region: AWS_REGION, // Replace with your S3 bucket region
  accessKeyId: AWS_ACCESS_KEY_ID, // Replace with your access key
  secretAccessKey: AWS_SECRET_ACCESS_KEY, // Replace with your secret key
});

const s3 = new AWS.S3();
const BUCKET_NAME = AWS_BUCKET_NAME; // Replace with your S3 bucket name

const DashboardScreen = ({ navigation }) => {
  const [certificates, setCertificates] = useState([]);
  const [certificateName, setCertificateName] = useState('');
  const [certificateType, setCertificateType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
const [learnMoreModalVisible, setLearnMoreModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const certificateTypes = [
    { label: 'Educational', value: 'Educational' },
    { label: 'Government', value: 'Government' },
    { label: 'Personal', value: 'Personal' },
  ];
  const generatePresignedUrl = async (fileKey) => {
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: 300, // URL valid for 5 mins
    };
  
    try {
      const url = s3.getSignedUrl('getObject', params);
      return url;
    } catch (error) {
      console.error('Error generating pre-signed URL:', error);
      return null;
    }
  };
  

  const handleFileSelection = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*', // Allow all file types
        copyToCacheDirectory: true,
      });
  
      // Handle file selection
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0]; // Get the first file from the assets array
  
        // Set the selected file
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          size: file.size || 0,
        });
  
        Alert.alert('File Selected', `File Name: ${file.name}`);
      } else if (res.canceled) {
        Alert.alert('Cancelled', 'File selection was cancelled.');
      } else {
        Alert.alert('Error', 'Unexpected response structure from file picker.');
      }
    } catch (error) {
      console.error('Error during file selection:', error);
      Alert.alert('Error', 'An error occurred while selecting the file.');
    }
  };
  
  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      const { status } = await Permissions.askAsync(Permissions.MEDIA_LIBRARY);
      return status === 'granted';
    }
    return true; // No permissions needed for iOS
  };

  const handleUpload = async () => {
    console.log('Add Certificate button clicked');
  
    if (!certificateName || !certificateType || !selectedFile) {
      Alert.alert('Error', 'Please fill in all fields and select a file.');
      return;
    }
  
    setUploading(true);
  
    try {
      const fileBlob = await fetch(selectedFile.uri).then((res) => res.blob());
      console.log('File Blob created successfully.');
  
      const fileKey = `certificates/${Date.now()}_${selectedFile.name}`; // S3 file key
      const params = {
        Bucket: BUCKET_NAME,
        Key: fileKey,
        Body: fileBlob,
        ContentType: selectedFile.type,
      };
  
      // Upload the file to S3
      const s3UploadPromise = new Promise((resolve, reject) => {
        s3.upload(params, (err, data) => {
          if (err) {
            console.error('Error uploading to S3:', err);
            reject(err);
          } else {
            console.log('S3 Upload successful:', data);
            resolve(data.Key); // Only store the file key
          }
        });
      });
  
      const uploadedFileKey = await s3UploadPromise;
      console.log('File uploaded to S3 with key:', uploadedFileKey);
  
      // Store metadata in Firestore with the file key instead of direct URL
      const certificateData = {
        name: certificateName,
        type: certificateType,
        fileKey: uploadedFileKey, // Save the S3 key
        createdAt: new Date(),
      };
  
      await addDoc(collection(db, 'users', auth.currentUser.uid, 'certificates'), certificateData);
  
      console.log('Certificate metadata saved to Firestore.');
  
      setCertificates((prevCertificates) => [
        ...prevCertificates,
        { id: Date.now().toString(), ...certificateData },
      ]);
  
      Alert.alert('Success', `Certificate "${certificateName}" added successfully!`);
      setCertificateName('');
      setCertificateType(null);
      setSelectedFile(null);
      setUploadModalVisible(false);
    } catch (error) {
      console.error('Error during upload:', error);
      Alert.alert('Error', 'Failed to upload certificate. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  const shareCertificate = async (fileKey) => {
    try {
      
      const fileUrl = await generatePresignedUrl(fileKey);
      console.log('Generated pre-signed URL:', fileUrl);
  
      // Handle permissions for Android
      if (Platform.OS === 'android') {
        const hasPermission = await requestStoragePermission();
        if (!hasPermission) {
          Alert.alert('Permission Denied', 'Storage permission is required to share certificates.');
          return;
        }
      }
  
      // Define the local path for saving the downloaded file
      const directory = `${FileSystem.documentDirectory}certificates`;
      const localUri = `${directory}/${Date.now()}.pdf`;
  
      // Check and create directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(directory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }
  
      console.log('Directory ensured:', directory);
  
      // Download the file using the pre-signed URL
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);
  
      console.log('File downloaded to:', downloadResult.uri);
  
      if (downloadResult.status === 200) {
        // Check if sharing is available
        if (await Sharing.isAvailableAsync()) {
          // Share the file
          await Sharing.shareAsync(downloadResult.uri);
          console.log('File shared successfully.');
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
      } else {
        Alert.alert('Error', 'Failed to download the file.');
        console.log(downloadResult);
      }
    } catch (error) {
      console.error('Error sharing certificate:', error);
      Alert.alert('Error', 'An error occurred while sharing the certificate.');
    }
  };
  
  const fetchCertificates = async () => {
    const currentUser = auth.currentUser;
  
    if (!currentUser) {
      console.error('User not logged in.');
      return;
    }
  
    try {
      const certificatesRef = collection(db, 'users', currentUser.uid, 'certificates');
      const q = query(certificatesRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
  
      const userCertificates = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  
      console.log('Fetched Certificates:', userCertificates);
  
      setCertificates(userCertificates);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      Alert.alert('Error', 'Failed to fetch certificates.');
    }
  };
  
  useEffect(() => {
    fetchCertificates();
  }, []);
    
  
  const filteredCertificates = certificates.filter((cert) =>
    cert.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const openCertificate = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("Failed to open URL:", err)
    );
  };

  const groupedCertificates = certificateTypes
    .map((type) => ({
      type: type.value,
      data: filteredCertificates.filter((cert) => cert.type === type.value),
    }))
    .filter((group) => group.data.length > 0);

  return (
    <View style={styles.container}>
      {/* Floating Menu */}
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => setMenuVisible(true)}
      >
        <Ionicons name="menu-outline" size={24} color="#E0E0E0" />
      </TouchableOpacity>
      {learnMoreModalVisible && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={learnMoreModalVisible}
          onRequestClose={() => setLearnMoreModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setLearnMoreModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#E0E0E0" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>How We Secure Your Certificates</Text>
              <Text style={styles.modalTitle}>
                Encrypted using AES-256 encryption.
              </Text>
              <Text style={styles.modalTitle}>
                Data is transmitted securely using HTTPS protocols to prevent unauthorized
                access.
              </Text>
            </View>
          </View>
        </Modal>
      )}
      {/* Menu Modal */}
      {menuVisible && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={menuVisible}
          onRequestClose={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setMenuVisible(false)}
              >
                <Ionicons name="close" size={24} color="#E0E0E0" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  console.log('Auth Current User :',auth.currentUser);
                  navigation.navigate('EditProfile', { userData: auth.currentUser });
    
                }}
              >
                <Ionicons name="person-outline" size={20} color="#E0E0E0" />
                <Text style={styles.menuOptionText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                  setMenuVisible(false);
                  setLearnMoreModalVisible(true)}
                }
              >
                <Ionicons name="information-circle-outline" size={20} color="#E0E0E0" />
                <Text style={styles.menuOptionText}>Learn More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuOption}
                onPress={() => {
                    setMenuVisible(false);
                    navigation.navigate('Login')
                }}>
                <Ionicons name="log-out-outline" size={20} color="#E0E0E0" />
                <Text style={styles.menuOptionText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search certificates by name"
        placeholderTextColor="#B3B3B3"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Grouped Certificates */}
      <FlatList
  data={groupedCertificates}
  keyExtractor={(item) => item.type}
  renderItem={({ item }) => (
    <View style={styles.groupContainer}>
      <Text style={styles.groupTitle}>{item.type} Certificates</Text>
      {item.data.map((cert) => (
        <View key={cert.id} style={styles.certificateCard}>
          <Text style={styles.certificateName}>{cert.name}</Text>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => {
              Alert.alert(
                "View Certificate",
                "Do you want to view the certificate?",
                [
                  {
                    text: "Cancel",
                    style: "cancel",
                  },
                  {
                    text: "View",
                    onPress: () => {
                        navigation.navigate('CertificateViewer', { fileKey: cert.fileKey, generatePresignedUrl  })
                    },
                  },
                ]
              );
            }}
          >
            <Text style={styles.viewButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
    style={styles.shareButton}
    onPress={() => shareCertificate(cert.fileKey)}
  >
    <Ionicons name="share-social-outline" size={20} color="#E0E0E0" />
    <Text style={styles.shareButtonText}>Share</Text>
  </TouchableOpacity>
        </View>
      ))}
    </View>
  )}
/>

      {/* Upload Button */}
      <View style={styles.uploadButtonContainer}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => setUploadModalVisible(true)}
        >
          <Text style={styles.buttonText}>
            {uploading ? 'Uploading...' : 'Upload Certificate'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Upload Modal */}
      {uploadModalVisible && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={uploadModalVisible}
          onRequestClose={() => setUploadModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setUploadModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#E0E0E0" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Upload Certificate</Text>

              {/* Certificate Name Input */}
              <TextInput
                style={styles.input}
                placeholder="Certificate Name"
                placeholderTextColor="#B3B3B3"
                value={certificateName}
                onChangeText={setCertificateName}
              />

              {/* Dropdown for Certificate Type */}
              <DropDownPicker
                open={dropdownOpen}
                value={certificateType}
                items={certificateTypes}
                setOpen={setDropdownOpen}
                setValue={setCertificateType}
                placeholder="Select Certificate Type"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
                textStyle={{ color: '#FFFFFF' }}
              />

              {/* File Selection */}
              <View style={styles.fileSelectContainer}>
                <Text style={styles.fileLabel}>
                  {selectedFile ? selectedFile.name : 'No file selected'}
                </Text>
                <TouchableOpacity
                  style={styles.fileButtonSmall}
                  onPress={handleFileSelection}
                >
                  <Text style={styles.fileButtonTextSmall}>Select File</Text>
                </TouchableOpacity>
              </View>

              {/* Add Certificate Button */}
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUpload}
                disabled={uploading}
              >
                <Text style={styles.buttonText}>Add Certificate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  menuButton: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  searchInput: {
    backgroundColor: '#1E1E1E',
    color: '#E0E0E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  uploadButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  uploadButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  groupContainer: {
    marginBottom: 20,
  },
  groupTitle: {
    color: '#E0E0E0',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  certificateItem: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
  },
  certificateName: {
    color: '#FFFFFF', // White color
    fontSize: 16,
    fontWeight: 'bold', // Bold text
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 10,
    width: '90%',
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalTitle: {
    color: '#E0E0E0',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#333',
    color: '#E0E0E0',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
  },
  dropdown: {
    backgroundColor: '#333',
    borderWidth: 0,
    marginBottom: 20,
    width: '100%',
  },
  dropdownContainer: {
    backgroundColor: '#1E1E1E',
    borderWidth: 0,
  },
  fileSelectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
  },
  fileLabel: {
    color: '#B3B3B3',
    fontSize: 14,
    flex: 1,
    marginRight: 10,
  },
  fileButtonSmall: {
    backgroundColor: '#2196F3',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  fileButtonTextSmall: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  menuContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  menuContent: {
    backgroundColor: '#1E1E1E',
    padding: 20,
    borderRadius: 10,
    alignSelf: 'center',
    width: '80%',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  menuOptionText: {
    color: '#E0E0E0',
    fontSize: 16,
    marginLeft: 10,
  },
  certificateCard: {
    backgroundColor: '#1E1E1E',
    padding: 15,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 5, // For Android shadow
    borderWidth: 1,
    borderColor: '#333',
  },
  viewButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#2196F3',
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  viewButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 5,
  },
  
});

export default DashboardScreen;
