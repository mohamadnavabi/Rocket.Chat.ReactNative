import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';

import Avatar from '../../containers/Avatar';
import TypeIcon from './TypeIcon';

import styles from './styles';
import { DISPLAY_MODE_CONDENSED, DISPLAY_MODE_EXPANDED } from './constantDisplayMode';

const IconOrAvatar = ({
	avatar,
	type,
	rid,
	showAvatar,
	prid,
	status,
	isGroupChat,
	teamMain,
	showLastMessage,
	theme,
	displayMode
}) => {
	if (showAvatar) {
		return (
			<Avatar
				text={avatar}
				size={displayMode === DISPLAY_MODE_CONDENSED ? 36 : 48}
				type={type}
				style={styles.avatar}
				rid={rid}
			/>
		);
	}

	if (displayMode === DISPLAY_MODE_EXPANDED && showLastMessage) {
		return (
			<View style={styles.typeIcon}>
				<TypeIcon
					type={type}
					prid={prid}
					status={status}
					isGroupChat={isGroupChat}
					theme={theme}
					teamMain={teamMain}
					size={18}
				/>
			</View>
		);
	}

	return null;
};

IconOrAvatar.propTypes = {
	avatar: PropTypes.string,
	type: PropTypes.string,
	theme: PropTypes.string,
	rid: PropTypes.string,
	showAvatar: PropTypes.bool,
	displayMode: PropTypes.string,
	prid: PropTypes.string,
	status: PropTypes.string,
	isGroupChat: PropTypes.bool,
	teamMain: PropTypes.bool,
	showLastMessage: PropTypes.bool
};

export default IconOrAvatar;
