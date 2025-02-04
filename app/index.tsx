import React from 'react';
import { Dimensions, Linking } from 'react-native';
import { AppearanceProvider } from 'react-native-appearance';
import { Provider } from 'react-redux';
import { KeyCommandsEmitter } from 'react-native-keycommands';
import RNScreens from 'react-native-screens';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

import { defaultTheme, newThemeState, subscribeTheme, unsubscribeTheme } from './utils/theme';
import UserPreferences from './lib/userPreferences';
import EventEmitter from './utils/events';
import { appInit, appInitLocalSettings, setMasterDetail as setMasterDetailAction } from './actions/app';
import { deepLinkingOpen } from './actions/deepLinking';
import parseQuery from './lib/methods/helpers/parseQuery';
import { initializePushNotifications, onNotification } from './notifications/push';
import store from './lib/createStore';
import { toggleAnalyticsEventsReport, toggleCrashErrorsReport } from './utils/log';
import { ThemeContext } from './theme';
import { DimensionsContext } from './dimensions';
import RocketChat, { THEME_PREFERENCES_KEY } from './lib/rocketchat';
import { MIN_WIDTH_MASTER_DETAIL_LAYOUT } from './constants/tablet';
import { isTablet, supportSystemTheme } from './utils/deviceInfo';
import { KEY_COMMAND } from './commands';
import AppContainer from './AppContainer';
import TwoFactor from './containers/TwoFactor';
import ScreenLockedView from './views/ScreenLockedView';
import ChangePasscodeView from './views/ChangePasscodeView';
import Toast from './containers/Toast';
import InAppNotification from './containers/InAppNotification';
import { ActionSheetProvider } from './containers/ActionSheet';
import debounce from './utils/debounce';
import { isFDroidBuild } from './constants/environment';
import Firebase from './notifications/firebase';
import { Notifications } from 'react-native-notifications';

RNScreens.enableScreens();

interface IDimensions {
	width: number;
	height: number;
	scale: number;
	fontScale: number;
}

interface IState {
	theme: string;
	themePreferences: {
		currentTheme: 'automatic' | 'light';
		darkLevel: string;
	};
	width: number;
	height: number;
	scale: number;
	fontScale: number;
}

const parseDeepLinking = (url: string) => {
	if (url) {
		url = url.replace(/rocketchat:\/\/|https:\/\/go.rocket.chat\//, '');
		const regex = /^(room|auth|invite)\?/;
		if (url.match(regex)) {
			url = url.replace(regex, '').trim();
			if (url) {
				return parseQuery(url);
			}
		}
		const call = /^(https:\/\/)?jitsi.rocket.chat\//;
		if (url.match(call)) {
			url = url.replace(call, '').trim();
			if (url) {
				return { path: url, isCall: true };
			}
		}
	}
	return null;
};

export default class Root extends React.Component<{}, IState> {
	private listenerTimeout!: any;

	private onKeyCommands: any;

	constructor(props: any) {
		super(props);
		this.init();
		if (!isFDroidBuild) {
			this.initCrashReport();
		}
		const { width, height, scale, fontScale } = Dimensions.get('window');
		this.state = {
			theme: defaultTheme(),
			themePreferences: {
				currentTheme: supportSystemTheme() ? 'automatic' : 'light',
				darkLevel: 'black'
			},
			width,
			height,
			scale,
			fontScale
		};
		if (isTablet) {
			this.initTablet();
		}
	}

	componentDidMount() {
		// define firebase notification
		const firebase = new Firebase();
		firebase.registerChannel(['default']);
		// TODO: add your custom channels here

		this.listenerTimeout = setTimeout(() => {
			Linking.addEventListener('url', ({ url }) => {
				const parsedDeepLinkingURL = parseDeepLinking(url);
				if (parsedDeepLinkingURL) {
					store.dispatch(deepLinkingOpen(parsedDeepLinkingURL));
				}
			});
		}, 5000);
		Dimensions.addEventListener('change', this.onDimensionsChange);
	}

	componentWillUnmount() {
		clearTimeout(this.listenerTimeout);
		Dimensions.removeEventListener('change', this.onDimensionsChange);

		unsubscribeTheme();

		if (this.onKeyCommands && this.onKeyCommands.remove) {
			this.onKeyCommands.remove();
		}
	}

	init = async () => {
		UserPreferences.getMapAsync(THEME_PREFERENCES_KEY).then((theme: any) => this.setTheme(theme));
		store.dispatch(appInitLocalSettings());

		// Open app from push notification
		const notification = await initializePushNotifications();
		if (notification) {
			onNotification(notification);
			return;
		}

		// Open app from deep linking
		const deepLinking = await Linking.getInitialURL();
		const parsedDeepLinkingURL = parseDeepLinking(deepLinking!);
		if (parsedDeepLinkingURL) {
			store.dispatch(deepLinkingOpen(parsedDeepLinkingURL));
			return;
		}

		// Open app from app icon
		store.dispatch(appInit());
	};

	getMasterDetail = (width: number) => {
		if (!isTablet) {
			return false;
		}
		return width > MIN_WIDTH_MASTER_DETAIL_LAYOUT;
	};

	setMasterDetail = (width: number) => {
		const isMasterDetail = this.getMasterDetail(width);
		store.dispatch(setMasterDetailAction(isMasterDetail));
	};

	// Dimensions update fires twice
	onDimensionsChange = debounce(({ window: { width, height, scale, fontScale } }: { window: IDimensions }) => {
		this.setDimensions({
			width,
			height,
			scale,
			fontScale
		});
		this.setMasterDetail(width);
	});

	setTheme = (newTheme = {}) => {
		// change theme state
		this.setState(
			prevState => newThemeState(prevState, newTheme),
			() => {
				const { themePreferences } = this.state;
				// subscribe to Appearance changes
				subscribeTheme(themePreferences, this.setTheme);
			}
		);
	};

	setDimensions = ({ width, height, scale, fontScale }: IDimensions) => {
		this.setState({ width, height, scale, fontScale });
	};

	initTablet = () => {
		const { width } = this.state;
		this.setMasterDetail(width);
		this.onKeyCommands = KeyCommandsEmitter.addListener('onKeyCommand', (command: unknown) => {
			EventEmitter.emit(KEY_COMMAND, { event: command });
		});
	};

	initCrashReport = () => {
		RocketChat.getAllowCrashReport().then(allowCrashReport => {
			toggleCrashErrorsReport(allowCrashReport);
		});
		RocketChat.getAllowAnalyticsEvents().then(allowAnalyticsEvents => {
			toggleAnalyticsEventsReport(allowAnalyticsEvents);
		});
	};

	render() {
		const { themePreferences, theme, width, height, scale, fontScale } = this.state;

		return (
			<SafeAreaProvider initialMetrics={initialWindowMetrics}>
				<AppearanceProvider>
					<Provider store={store}>
						<ThemeContext.Provider
							value={{
								theme,
								themePreferences,
								setTheme: this.setTheme
							}}>
							<DimensionsContext.Provider
								value={{
									width,
									height,
									scale,
									fontScale,
									setDimensions: this.setDimensions
								}}>
								<ActionSheetProvider>
									<AppContainer />
									<TwoFactor />
									<ScreenLockedView />
									<ChangePasscodeView />
									<InAppNotification />
									<Toast />
								</ActionSheetProvider>
							</DimensionsContext.Provider>
						</ThemeContext.Provider>
					</Provider>
				</AppearanceProvider>
			</SafeAreaProvider>
		);
	}
}
