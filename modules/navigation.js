/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
import React from "react";
import { StyleSheet, View, ActivityIndicator, Alert } from "react-native";
import {
  withAuthenticator,
  ConfirmSignIn,
  Greetings,
  Loading,
  RequireNewPassword,
} from "aws-amplify-react-native";
import { Amplify, Auth } from "aws-amplify";
import { Colors } from "react-native/Libraries/NewAppScreen";
import "react-native-gesture-handler";

import {
  Signin,
  Signup,
  ConfirmSignup,
  ForgotPassword,
  VerifyContact,
} from "../modules/authentication";
import awsconfig from "../aws-exports.js";
import Customer from "../modules/customer/Customer";

import { API_BASE_URL, ENV } from '../constants';


Amplify.configure({
  ...awsconfig,
  Analytics: {
    disabled: true,
  },
});

class AppAuth extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: {},
      signedIn: false,
      loading: true,
      promos: [],
    };
  }
  async componentDidMount() {
    // Auth.signOut()
    try {
      Auth.currentUserInfo().then((info) => {
        //If you make an account with cognito you can use this, and just populate the dynamo db
        //If you just want to mess with restaurant ui
        console.log(info)
        this.getUser(info['attributes']);
        //If you just want to mess with customer ui
        //this.getUser('cc3fc7b4-e715-4700-a811-31a23034d32c');
      });
    } catch (e) {
      Alert.alert("Unable to load user data");
    }
  }

  async getUser(info) {
    let retrievedData = await getUser(info);

    this.setState({
      user: retrievedData.user,
      loading: false,
      promos: retrievedData.promos,
      poc_name: "poc name",
      credit: retrievedData.user.credit ?? 0,
    });

    async function getUser(info) {
      const body = JSON.stringify({
        incoming_id: info.sub,
        email: info.email,
        preferred_name: info.preferredName ?? "",
        street: info.street ?? "",
        state: info.state ?? "",
        zipcode: info.zipcode ?? "",
      });
      let token = null;
      let prom = Auth.currentSession().then(
        (info) => (token = info.getIdToken().getJwtToken())
      );
      await prom;
      const response = await fetch(
        `${API_BASE_URL}/${ENV}/customer`,
        {
          method: "POST", // *GET, POST, PUT, DELETE, etc.
          mode: "cors", // no-cors, *cors, same-origin
          cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
          credentials: "same-origin", // include, *same-origin, omit
          headers: {
            "Content-Type": "application/json",
            Connection: "keep-alive",
            Authorization: token,
          },
          redirect: "follow", // manual, *follow, error
          referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
          body: body, // body data type must match “Content-Type” header
        }
      );
      let data = await response.json(); // parses JSON response into native JavaScript objects
      return data;
    }
  }

  render() {
    if (!this.state.loading) {
      return (
        <Customer
          user={this.state.user}
          promos={this.state.promos}
        />
      );
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
  container: {
    flex: 1,
    justifyContent: "center",
  },
  horizontal: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
  },
  scrollView: {
    backgroundColor: Colors.lighter,
  },
  appView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  engine: {
    position: "absolute",
    right: 0,
  },
  body: {
    backgroundColor: Colors.white,
  },
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.black,
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "400",
    color: Colors.dark,
  },
  highlight: {
    fontWeight: "700",
  },
  header: {
    fontSize: 25,
    padding: 100,
    textAlign: "center",
  },
  footer: {
    color: Colors.dark,
    fontSize: 12,
    fontWeight: "600",
    padding: 4,
    paddingRight: 12,
    textAlign: "right",
  },
  loadingScreen: {
    marginTop: 250,
    marginLeft: 75,
  },
});

export default withAuthenticator(AppAuth, false, [
  <Loading />,
  <Signin />,
  <ConfirmSignIn />,
  <VerifyContact />,
  <Signup />,
  <ConfirmSignup />,
  <ForgotPassword />,
  <RequireNewPassword />,
  <Greetings />,
]);
