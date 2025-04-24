import React, { useEffect, useState } from 'react';
import { View, Text, Button, TextInput, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [expoPushToken, setExpoPushToken] = useState('');
  
  const [targetPushTokens, setTargetPushTokens] = useState([
    'ExponentPushToken[Ts3t-7C48koGhbJqnZ1eDr]', // Replace with actual tokens
    'ExponentPushToken[JHvPnpO4zSMrQtyUdiYZV2]', // Replace with actual tokens
  ]); // List of target device tokens

  const [notification, setNotification] = useState(null);
  const notificationListener = React.useRef();
  const responseListener = React.useRef();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification); // Store notification details
    });

    // Handle notification responses
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  useEffect(() => {
    // Log the notification details when it changes
    if (notification) {
      console.log('Notification token received:', notification);
    }
  }
  , [notification]);

  return (
    <View style={styles.container}>
      <Text>Your Expo Push Token: {expoPushToken}</Text>
      <TextInput
        style={{
          height: 40,
          borderColor: 'gray',
          borderWidth: 1,
          marginVertical: 10,
          width: '80%',
          paddingHorizontal: 10,
        }}
        placeholder="Enter target device push token"
        value={targetPushTokens.join(', ')}
        onChangeText={text => setTargetPushTokens(text.split(',').map(token => token.trim()))}
      />
      <Button
        title="Send Notification to All Devices"
        onPress={async () => {
          if (targetPushTokens.length === 0) {
            alert('No target devices available.');
            return;
          }
          await sendNotificationsToAllDevices(targetPushTokens);
        }}
      />
      <Button
        title="Press to Send Notification"
        onPress={async () => {
          await sendPushNotification(expoPushToken);
        }}
      />
      {notification && (
        <View style={{ marginTop: 20 }}>
          <Text>Notification Received:</Text>
          <Text>Title: {notification.request.content.title}</Text>
          <Text>Body: {notification.request.content.body}</Text>
          <Text>Data: {JSON.stringify(notification.request.content.data)}</Text>
        </View>
      )}
      <StatusBar style="auto" />
    </View>
  );
}

// Function to register for push notifications
async function registerForPushNotificationsAsync() {
  let token;
  try {
    if (Device.isDevice) {
      console.log('Device detected. Checking permissions...');
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      console.log('Existing notification permission status:', existingStatus);

      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        console.log('Requesting notification permissions...');
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
        console.log('Final notification permission status:', finalStatus);
      }

      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification! Permissions not granted.');
        return;
      }

      console.log('Fetching Expo Push Token...');
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'c33f1d5c-70b8-42b3-8d3b-98a0e8a7fbd0', // Replace with the correct projectId from the Expo Developer Dashboard
      })).data;
      console.log('Expo Push Token:', token);
    } else {
      alert('Must use physical device for Push Notifications');
      console.log('Push notifications are not supported on simulators/emulators.');
    }

    if (Platform.OS === 'android') {
      console.log('Setting up Android notification channel...');
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
      console.log('Android notification channel set up.');
    }
  } catch (error) {
    console.error('Error while registering for push notifications:', error);
  }

  return token;
}

// Function to send a push notification
async function sendPushNotification(expoPushToken) {
  console.log('Sending notification to:', expoPushToken);
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: 'Demo Notification',
    body: 'This is a test notification!',
    data: { someData: 'goes here' },
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();
    console.log('Push notification response:', responseData);

    if (!response.ok) {
      if (responseData.data?.details?.error === 'DeviceNotRegistered') {
        console.error('The target device is not registered for push notifications.');
        alert('The target device is not registered for push notifications. Please ensure the app is installed and running.');
      } else {
        console.error('Failed to send notification:', responseData);
        alert(`Failed to send notification: ${responseData.errors[0]?.message || 'Unknown error'}`);
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    alert('Error sending push notification. Check the console for details.');
  }
}

// Function to send notifications to all devices
async function sendNotificationsToAllDevices(pushTokens) {
  for (const token of pushTokens) {
    console.log('Sending notification to:', token);
    const message = {
      to: token,
      sound: 'default',
      title: 'Demo Notification',
      body: 'This is a test notification!',
      data: { someData: 'goes here' },
    };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const responseData = await response.json();
      console.log('Push notification response for token:', token, responseData);

      if (!response.ok) {
        if (responseData.data?.details?.error === 'DeviceNotRegistered') {
          console.error(`Device not registered for token: ${token}`);
        } else {
          console.error(`Failed to send notification to token: ${token}`, responseData);
        }
      }
    } catch (error) {
      console.error(`Error sending notification to token: ${token}`, error);
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
