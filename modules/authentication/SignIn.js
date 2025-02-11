//TODO: get this external module connected async with google and facebook login sdk
import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  SafeAreaView,
  ActivityIndicator
} from "react-native";
import { RFValue } from "react-native-responsive-fontsize";
import { Input, Button } from "react-native-elements";
import { Auth } from "aws-amplify";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";

import Images from "../theme/Images";
import { navigate } from "../../App";

import { API_BASE_URL, ENV } from '../../constants'

const sWidth = Dimensions.get("window").width;
const sHeight = Dimensions.get("window").height;



export default class signIn extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      email: "",
      password: "",
      error: "",
      loading: false,
      promos: []
    };
  }

  signin = () => {
    try {
      let self = this;
      Auth.signIn({
        username: this.state.email.toLowerCase(),
        password: this.state.password,
      })
        .then(() => {
          self.props.onStateChange("signedIn");
        })
        .catch((err) => {
          console.log("err", { err });
          this.setState({ error: err.message });
        });
    } catch (e) {
      this.setState({ error: e.message });
    }
  };

  render() {
    if (!this.state.loading) {
      if (
        this.props.authState == "signIn" ||
        this.props.authState == "signedUp"
      ) {
        return (
          <View style={{ flex: 1 }}>
            <View style={styles.loginBg} />
            <TouchableOpacity
              activeOpacity={0.6}
              style={{
                position: "absolute",
                backgroundColor: "white",
                alignSelf: "flex-end",
                marginTop: RFValue(10),
                right: RFValue(10),
                paddingVertical: RFValue(5),
                paddingHorizontal: RFValue(10),
                borderRadius: RFValue(20),
                zIndex: 999,
              }}
              onPress={() => navigate("Dashboard")}
            >
              <Text style={{ color: "#D65344" }}>Skip</Text>
            </TouchableOpacity>
            <SafeAreaView style={{ flex: 1, height: "100%" }}>
              <View style={styles.contentView}>
                <KeyboardAwareScrollView showsVerticalScrollIndicator={false}>
                  <View>
                    <View style={styles.logoContainer}>
                      <Image
                        source={Images.logo}
                        style={styles.logo}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.subContainer}>
                      <Input
                        autoCapitalize="none"
                        placeholder="Email Address"
                        placeholderTextColor="white"
                        TextColor="white"
                        inputStyle={{ color: "white" }}
                        containerStyle={{ paddingHorizontal: 0 }}
                        inputContainerStyle={{
                          borderBottomColor: "#ffffff",
                          borderBottomWidth: 1,
                          marginLeft: 0,
                        }}
                        onChangeText={(value) =>
                          this.setState({ email: value.toLowerCase(), error: "" })
                        }
                      />
                      <Input
                        autoCapitalize="none"
                        placeholder="Password"
                        placeholderTextColor="white"
                        inputStyle={{ color: "white" }}
                        containerStyle={{ paddingHorizontal: 0 }}
                        inputContainerStyle={{
                          borderBottomColor: "#ffffff",
                          borderBottomWidth: 1,
                        }}
                        secureTextEntry={true}
                        onChangeText={(value) =>
                          this.setState({ password: value, error: "" })
                        }
                      />
                      <Button
                        title="SIGN IN"
                        buttonStyle={{
                          backgroundColor: "white",
                          paddingTop: 15,
                          paddingBottom: 15,
                          marginTop: 30,
                        }}
                        titleStyle={{ color: "#D65344" }}
                        onPress={this.signin}
                      />
                      {this.state.error != "" && (
                        <Text style={styles.error}>{this.state.error}</Text>
                      )}
                      <Button
                        title="SIGN UP"
                        buttonStyle={{
                          backgroundColor: "clear",
                          paddingTop: 15,
                          paddingBottom: 15,
                          marginTop: 25, //30, same as SingUp page
                        }}
                        titleStyle={styles.signupBtn}
                        onPress={() => this.props.onStateChange("signUp")}
                      />
                    </View>
                  </View>
                </KeyboardAwareScrollView>
                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={() => this.props.onStateChange("forgotPassword")}
                >
                  <Text style={styles.forgot}>Forgot Password</Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </View>
        );
      } else {
        return null;
      }
    } else {
      return (
        <View style={[styles.container, styles.horizontal]}>
          <ActivityIndicator size="large" color="#F86D64" />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  loginBg: {
    backgroundColor: "black",
    position: "absolute",
    left: -10,
    top: -50,
    width: sWidth + 20,
    height: sHeight + 30,
    resizeMode: "cover",
  },
  logoContainer: {
    flex: 1,
    width: sWidth - 50,
  },
  logo: {
    width: sWidth - 100,
    height: sWidth - 100,
    alignSelf: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  contentView: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
  },
  subContainer: {
    width: "100%",
  },
  signintext: {
    color: "white",
    fontSize: RFValue(17, 580),
    marginTop: 5,
  },
  signupBtn: {
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  forgotBtn: {
    position: "absolute",
    bottom: 0,
    alignSelf: "center",
  },
  forgot: {
    color: "white",
    fontSize: RFValue(15, 580),
    textAlign: "center",
  },
  error: {
    color: "white",
    textAlign: "center",
    marginTop: 10,
  },
});
