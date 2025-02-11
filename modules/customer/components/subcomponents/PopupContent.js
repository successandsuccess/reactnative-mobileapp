import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

const PopupContent = ({ onClose, navigation }) => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>
                Thank you for joining Dossiay!
            </Text>
            <Text style={styles.text}>
                Would you like a quick tutorial?
            </Text>
            {/* Add any other content here */}
            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.cancelButton]}
                    onPress={onClose}
                >
                    <Text style={styles.buttonText}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.okButton]}
                    onPress={() => {
                        navigation.navigate("Help")
                        onClose()
                    }}
                >
                    <Text style={[styles.buttonText, { color: 'white' }]}>Yes</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    text: {
        fontSize: 18,
        marginBottom: 10,
        alignSelf: 'center'
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 10,
        marginBottom: 5
    },
    button: {
        paddingTop: 5,
        paddingBottom: 5,
        paddingHorizontal: 30,
        marginHorizontal: 10,
        marginTop: 5,
        borderRadius: 5,
    },
    cancelButton: {
        backgroundColor: '#e8e8e8',
    },
    okButton: {
        backgroundColor: 'green', // Button background color
    },
    buttonText: {
        fontSize: 18,
        fontWeight: 400,
    },
});

export default PopupContent;
