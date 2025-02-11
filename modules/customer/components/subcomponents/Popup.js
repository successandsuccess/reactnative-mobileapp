import React from 'react';
import { Modal, StyleSheet, TouchableWithoutFeedback, View } from 'react-native';
import PopupContent from './PopupContent';

const Popup = ({ visible, onClose, navigation }) => {
    return (
        <Modal transparent visible={visible} animationType="slide">
            <View style={styles.container}>
                <PopupContent onClose={onClose} navigation={navigation} />
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
});

export default Popup;
