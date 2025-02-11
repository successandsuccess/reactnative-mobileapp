import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import FeatherIcon from "react-native-vector-icons/Feather";

const LoginPopup = ({ onClose, visible, navigation }) => {
  return (
    <Modal animationType={"fade"} visible={visible} transparent>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={[styles.modalOverlay]}
      >
        <TouchableOpacity activeOpacity={1} style={[styles.modalCard]}>
          <TouchableOpacity style={{ alignSelf: "flex-end" }} onPress={onClose}>
            <FeatherIcon name="x" size={25} color={"#000"} />
          </TouchableOpacity>
          <View>
            <Text style={styles.msgText}>
              Create an account or login to access promotions and orders.
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              style={styles.modalButton}
              onPress={() => {
                onClose();
                navigation.goBack();
              }}
            >
              <Text style={styles.modalButtonText}>Register / Login</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
  },
  modalCard: {
    backgroundColor: "white",
    width: "85%",
    borderRadius: RFValue(20),
    padding: RFValue(20),
  },
  msgText: {
    fontSize: RFValue(14),
    textAlign: "center",
    marginVertical: RFValue(10),
  },
  modalButton: {
    backgroundColor: "#D65344",
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 15,
    borderRadius: RFValue(10),
  },
  modalButtonText: {
    color: "#ffffff",
    fontSize: RFValue(14),
    textAlign: "center",
  },
});

export default LoginPopup;
