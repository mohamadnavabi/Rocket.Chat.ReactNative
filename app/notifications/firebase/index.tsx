import { Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';

export default class Firebase {
	constructor() {
		this.init();
	}

	async init() {
		this.requestUserPermission();
		this.prepareLocalNotification();

		if (Platform.OS == 'ios') await messaging().registerForRemoteNotifications();

		messaging().onMessage(({ notification, data }) => {
			this.showNotification(notification);
		});
	}

	async requestUserPermission() {
		const authStatus = await messaging().requestPermission();
		const enabled =
			authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;

		if (enabled) {
			// console.log('Authorization status:', authStatus);
		}
	}

	registerChannel(channels: [string]) {
		channels.forEach(async channel => {
			await messaging().subscribeToTopic(channel);
		});
	}

	prepareLocalNotification() {
		PushNotification.configure({
			// (optional) Called when Token is generated (iOS and Android)
			onRegister: function (token) {
				// console.log("TOKEN:", token);
			},

			// (required) Called when a remote is received or opened, or local notification is opened
			onNotification: function (notification) {
				// process the notification

				// (required) Called when a remote is received or opened, or local notification is opened
				notification.finish(PushNotificationIOS.FetchResult.NoData);
			},

			// (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
			onAction: function (notification) {
				console.log('ACTION:', notification.action);
				console.log('NOTIFICATION:', notification);

				// process the action
			},

			// (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
			onRegistrationError: function (err) {
				console.error(err.message, err);
			},

			// IOS ONLY (optional): default: all - Permissions to register.
			permissions: {
				alert: true,
				badge: true,
				sound: true
			},

			// Should the initial notification be popped automatically
			// default: true
			popInitialNotification: true,

			/**
			 * (optional) default: true
			 * - Specified if permissions (ios) and token (android and ios) will requested or not,
			 * - if not, you must call PushNotificationsHandler.requestPermissions() later
			 * - if you are not using remote notification or do not have Firebase installed, use this:
			 *     requestPermissions: Platform.OS === 'ios'
			 */
			requestPermissions: true
		});

		PushNotification.createChannel(
			{
				channelId: 'chat.khanoumi.reactnative', // (required)
				channelName: 'chat.khanoumi.reactnative', // (required)
				channelDescription: 'A channel to categorise your notifications', // (optional) default: undefined.
				playSound: false, // (optional) default: true
				soundName: 'default', // (optional) See `soundName` parameter of `localNotification` function
				importance: 4, // (optional) default: 4. Int value of the Android notification importance
				vibrate: true // (optional) default: true. Creates the default vibration patten if true.
			},
			created => console.log(`createChannel returned '${created}'`) // (optional) callback returns whether the channel was created, false means it already existed.
		);
	}

	showNotification(notification) {
		const data = {
			channelId: 'chat.khanoumi.reactnative',
			subText: notification.title,
			message: notification.body,
			actions: ''
		};

		if (Platform.OS == 'ios') PushNotificationIOS.localNotification(data);
		else PushNotification.localNotification(data);
	}
}
