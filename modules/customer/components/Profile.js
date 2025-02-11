// @ts-check
import React, { useEffect, useState } from "react";
import { Auth } from "aws-amplify";
import { createStackNavigator } from "@react-navigation/stack";
import { Button, Icon, Input, Text } from "react-native-elements";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { widthPercentageToDP } from "react-native-responsive-screen";
import { RFValue } from "react-native-responsive-fontsize";
import { launchImageLibraryAsync, MediaTypeOptions } from "expo-image-picker";
import Spinner from "react-native-loading-spinner-overlay";
import { updateDynamoCustomer } from "./subcomponents/ProfileEditor/updateDynamoCustomer";
import {
  isEmpty,
  objDiff,
  uploadImageToS3,
  runWithTimeLimit,
} from "../../utils";
import { API_BASE_URL, ENV } from "../../../constants";
import { SetupPaymentButton } from "./subcomponents/SetupPayment";

const Stack = createStackNavigator();

export default function NewProfile({ navigation, route }) {
  const { user } = route.params;

  console.log(
    "Global route params\n",
    JSON.stringify(route.params, undefined, 2)
  );

  return (
    <Stack.Navigator initialRouteName="Profile">
      <Stack.Screen
        name="User Information"
        component={Edit}
        initialParams={{
          user,
          needsUpdate: false,
        }}
        options={({ navigation, route }) => ({
          headerTitleAlign: "center",
          headerRight: () =>
            !route.params.editMode && (
              <Button
                icon={
                  <Icon
                    name="pencil"
                    type="simple-line-icon"
                    color="#E82800"
                    style={{ paddingRight: 5 }}
                  />
                }
                style={{ paddingRight: 15 }}
                titleStyle={{ color: "#E82800" }}
                title="Edit"
                type="clear"
                onPress={() => navigation.setParams({ editMode: true })}
              />
            ),
        })}
      />
    </Stack.Navigator>
  );
}

function Edit({ navigation, route }) {
  /** @type {{user: import('../../types').UserData, editMode: boolean}} */
  const { user, editMode } = route.params;

  const [profile, setProfile] = useState(user);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [image, setImage] = useState({
    uri: profile.picture,
    fileName: "",
    mimeType: "",
  });

  console.log(
    "Local state:\n",
    JSON.stringify({ user: profile }, undefined, 2)
  );

  /**
   * Handler for image picker using expo library to set relevant image state info
   *
   */
  function handleImagePicker() {
    launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [200, 200],
      quality: 1,
    }).then((res) => {
      const { uri, fileName, mimeType } = (res.assets??[])[0];

      setImage({
        uri,
        fileName: fileName??"",
        mimeType: mimeType??"",
      });
    });
  }

  /**
   * Handler
   *
   * @param {any} credit
   * @param {any} id
   */
  function handleTransferCredit(credit, id) {
    setSaveInProgress(true);
    const body = JSON.stringify({
      credit,
      customer_id: id,
    });

    fetch(
      `${API_BASE_URL}/${ENV}/update/transfer-credit`,
      {
        method: "POST", // *GET, POST, PUT, DELETE, etc.
        mode: "cors", // no-cors, *cors, same-origin
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        credentials: "same-origin", // include, *same-origin, omit
        headers: {
          "Content-Type": "application/json",
          Connection: "keep-alive",
        },
        redirect: "follow", // manual, *follow, error
        referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: body, // body data type must match “Content-Type” header
      }
    )
      .then((response) => {
        if (response.ok && response.status === 200) {
          setProfile({ ...profile, credit: 0 });
          navigation.setParams({ ...profile, credit: 0 });
        } else {
          throw new Error(`Received [${response.status}] status from endpoint`)
        }
      })
      .then(() => {
        Alert.alert(
          "Transfer Credit request sent",
          "Your credit transfer request will be processed within 2-5 business days"
        )
      })
      .catch((err) => {
        Alert.alert(
          "Transfer Credit Error",
          `Encountered the following error while processing credit transfer:\n\n${err}`
        );
        console.log("⚠️ Profile: ", err);
      })
      .finally(() => setSaveInProgress(false));
  }

  /**
   * Resets/syncs local state to provided state
   *
   * @param {typeof profile} state
   */
  function resetState(state) {
    setImage({
      uri: state.picture,
      fileName: "",
      mimeType: `image/${/\.\w+$/.exec(state.picture)}`,
    });
    setProfile(state);
  }

  function handleCancel() {
    resetState(user);
    navigation.setParams({ editMode: false });
  }

  /**
   * Promise wrapper for email Alert prompt to allow awaits
   *
   * @returns {Promise<string>}
   */
  function confirmEmailCodePrompt() {
    return new Promise((resolve) => {
      Alert.prompt(
        "Enter confirmation code",
        "An email has been sent with your confirmation code.",
        [
          {
            text: "OK",
            onPress: (txt) => resolve(txt??""),
          },
          {
            text: "Cancel",
            onPress: () => resolve("CANCELLED"),
            style: "destructive",
          },
        ],
        "plain-text",
        "",
        "number-pad"
      );
    });
  }

  /**
   * Handler for "Save & Update" button
   *
   * Includes extra logic for profile picture and email address change.
   * - picture change requires upload to S3
   * - email change requires user confirmation
   *
   * Upon encountering any S3 upload error, ALL changes will be reset.
   *
   * User cancellation of email confirmation code will only reset email.
   */
  async function handleSaveProfile() {
    console.log(
      "[profile, user] diff:\n",
      JSON.stringify(objDiff(profile, user), undefined, 2)
    );

    try {
      // Can't rely on state updates within an async function so we need a deep copy in a new const
      const newProfile = { ...profile };
      setSaveInProgress(true);

      if (image.uri !== user.picture) {
        let S3ImageUrl = await runWithTimeLimit(5000, () =>
          uploadImageToS3(image)
        );
        newProfile.picture = S3ImageUrl;
      }

      if (newProfile.email !== user.email) {
        let authUser = await Auth.currentAuthenticatedUser();
        console.log("authUser:\n", JSON.stringify(authUser, undefined, 2));

        let response = await Auth.updateUserAttributes(authUser, {
          email: newProfile.email,
        });

        // Once email has been sent, keep prompting user for code until either
        // 1. They cancel (revert to original email)
        // 2. They input the right code (keep changes)
        if (response === "SUCCESS") {
          do {
            const confirmationCode = await confirmEmailCodePrompt();

            if (confirmationCode === "CANCELLED") {
              // User pressed "Cancel"
              newProfile.email = user.email;
              Alert.alert(
                "Confirmation cancelled",
                "\nReverting back to stored email address."
              );
              break;
            }

            try {
              let result = await Auth.verifyCurrentUserAttributeSubmit(
                "email",
                confirmationCode
              );
              console.log("submit email confirmation code result: ", result);

              if (result === "SUCCESS") {
                Alert.alert("Your email has successfully been updated.");
                break;
              }
            } catch (e) {
              console.log("⚠️ Profile.js", e);
              await new Promise((resolve) => {
                Alert.alert(
                  "Invalid confirmation code",
                  "\nUnable to verify confirmation code. Please try again.",
                  [
                    {
                      onPress: () => resolve(null),
                    },
                  ]
                );
              });
            }
          } while (true);
        }
      }

      const serverDiff = objDiff(newProfile, user)
      console.log(
        "[newProfile, user] server state diff:\n",
        JSON.stringify(serverDiff, undefined, 2)
      );
      if (!isEmpty(serverDiff)) {
        console.log("Resetting user to: ", newProfile)
        await navigation.setParams({ user: newProfile });
        console.log("Updating DDB to: ", newProfile)
        updateDynamoCustomer(newProfile);
      } 

      const localDiff = objDiff(newProfile, profile);
      console.log(
        "[newProfile, profile] local state diff:\n",
        JSON.stringify(localDiff, undefined, 2)
      );
      if (!isEmpty(localDiff)) {
        console.log("Resetting local state to: ", newProfile)
        resetState(newProfile);
      }

    } catch (e) {
      console.log("⚠️ ERROR", e);
      Alert.alert(
        "Failed to save",
        `Encountered the following error while saving profile changes:\n\n${e}\n\nPlease try again`
      );
      resetState(user);
    } finally {
      navigation.setParams({ editMode: false });
      setSaveInProgress(false);
    }
  }

  /**
   * Handler for "DELETE Profile" button
   *
   * Deletion follows the flow:
   * - delete user from Customer database
   * - delete user from Cognito user pool
   * - sign user out of current session
   *
   * Upon encountering any error w/ API gateway for DDB deletion, aborts the entire process
   *
   */
  async function handleDeleteProfile() {
    const user = await Auth.currentUserInfo()
    console.log(user)
    const { attributes: { sub: incoming_id }} = user
    
    const response = await fetch(`${API_BASE_URL}/${ENV}/delete`, {
      method: "DELETE", // *GET, POST, PUT, DELETE, etc.
      mode: "cors", // no-cors, *cors, same-origin
      cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
      credentials: "same-origin", // include, *same-origin, omit
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive",
      },
      redirect: "follow", // manual, *follow, error
      referrerPolicy: "no-referrer", // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      body: JSON.stringify({ incomingId: incoming_id }), // body data type must match “Content-Type” header
    })
    console.log(
      "/delete response:\n",
      JSON.stringify(response, undefined, 2)
    );

    if (response.status === 418) {
      const {credit, credit_on_hold} = await response.json()
      Alert.alert(
        "Cannot Delete User",
        `This user still has a credit balance of $${credit.toFixed(2)} and an outstanding credit transfer amount of $${credit_on_hold.toFixed(2)}.\n\nPlease wait for the credit transfer process to finish before deleting your account, thank you.`
      )
      return
    }

    if (response.status !== 200) {
      const message = await response.json()
      Alert.alert(
        "Delete Error",
        "Encountered unexpected error while processing profile deletion."
      )
      console.error(`DELETE customer [${response.status}] ${JSON.stringify(message)}`)
      return
    }

    /** @type {import("amazon-cognito-identity-js").CognitoUser} */
    const authUser = await Auth.currentAuthenticatedUser()
    console.log("authUser:\n", JSON.stringify(authUser, undefined, 2)),

    authUser.deleteUser((error) => {
      if (error) {
        Alert.alert(
          "Delete Error",
          "Encountered unexpected error while processing user dleetion."
        )
        console.error("Auth user deletion err: ", error)
        return
      }
      Auth.signOut()
    })
  }

  return (
    <ScrollView>
      <View style={styles.general}>
        <View
          style={{
            display: "flex",
            columnGap: 10,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingVertical: 30,
            paddingLeft: 10,
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            disabled={!editMode}
            style={[styles.picture]}
            onPress={handleImagePicker}
          >
            {image.uri ? (
              <Image
                style={styles.picture}
                source={{
                  uri: `${image.uri}?date=${new Date().getTime()}`,
                }}
              />
            ) : (
              <Icon name="image" size={RFValue(30, 580)} />
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Input
              label="Preferred Name"
              inputContainerStyle={{ borderBottomWidth: 0 }}
              placeholder="Preferred Name"
              disabled={!editMode}
              value={profile.preferred_name}
              onChangeText={(value) =>
                setProfile({
                  ...profile,
                  preferred_name: value,
                })
              }
              inputStyle={styles.input}
            />
          </View>
        </View>
        <View>
          <Input
            label="Email Address"
            autoCapitalize="none"
            inputStyle={styles.input}
            placeholder="Email Address"
            inputContainerStyle={{ borderBottomWidth: 0 }}
            disabled={!editMode}
            value={profile.email}
            onChangeText={(value) => setProfile({ ...profile, email: value })}
          />
          <View style={{ display: "flex", flexDirection: "row", width: "50%" }}>
            <Input
              label="State"
              autoCapitalize="none"
              inputStyle={styles.input}
              placeholder="State"
              inputContainerStyle={{ borderBottomWidth: 0 }}
              disabled={!editMode}
              value={profile.state}
              onChangeText={(value) => setProfile({ ...profile, state: value })}
            />
            <Input
              label="Zipcode"
              autoCapitalize="none"
              inputStyle={styles.input}
              inputMode="numeric"
              placeholder="Zipcode"
              inputContainerStyle={{ borderBottomWidth: 0 }}
              disabled={!editMode}
              value={profile.zipcode}
              onChangeText={(value) =>
                setProfile({ ...profile, zipcode: value })
              }
            />
          </View>
          <View style={styles.buttonContainer}>
            <SetupPaymentButton
              profile={profile}
              buttonStyle={styles.updatePaymentButtonStyle}
              buttonTitle="Manage Payment Methods"
              preCallback={() => {
                setSaveInProgress(true);
              }}
              finallyCallback={() => {
                setSaveInProgress(false);
              }}
            />
          </View>
        </View>
        {editMode ? (
          <View style={styles.buttonContainer}>
            <Button
              title="Cancel"
              type="outline"
              buttonStyle={styles.secondaryTitleStyle}
              titleStyle={styles.secondaryButtonTitleStyle}
              onPress={handleCancel}
            />
            <Button
              title="Save & Update"
              buttonStyle={styles.buttonStyle}
              onPress={handleSaveProfile}
            />
            <View style={{ justifyContent: "center", paddingTop: 20 }}>
              <Text
                style={styles.titles}
                onPress={() =>
                  Alert.alert(
                    "Delete Profile?",
                    "Do you want to delete your account?  This can only be done if you have no credit balance or outstanding cashout request!",
                    [
                      { text: "Ok", onPress: handleDeleteProfile },
                      { text: "Cancel" },
                    ]
                  )
                }
              >
                DELETE Profile
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <Button
              title={`Transfer Credit: $${Number(profile.credit).toFixed(2)}`}
              disabled={profile.credit <= 0}
              type="outline"
              buttonStyle={styles.secondaryTitleStyle}
              titleStyle={styles.secondaryButtonTitleStyle}
              onPress={() =>
                Alert.alert(
                  "Are you sure?",
                  "You will no longer be able to use this credit inside of Dossiay.",
                  [
                    {
                      text: "Ok",
                      onPress: () => {
                        handleTransferCredit(profile.credit, profile.id);
                      },
                    },
                    {
                      text: "Cancel",
                    },
                  ]
                )
              }
            />
            <Button
              buttonStyle={styles.buttonStyle}
              title="Sign Out"
              titleStyle={styles.titleStyle}
              onPress={() => Auth.signOut()}
            />
          </View>
        )}
      </View>
      <Spinner visible={saveInProgress} key={saveInProgress} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  general: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    justifyContent: "center",
    textAlign: "center",
  },
  titles: {
    textAlign: "center",
    color: "#E82800",
    padding: 10,
    fontWeight: "600",
  },
  signOutButton: {
    marginTop: 50,
    padding: 15,
  },
  titleStyle: {
    fontWeight: "600",
  },
  picture: {
    width: widthPercentageToDP("30"),
    height: widthPercentageToDP("30"),
    borderRadius: 15,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    backgroundColor: "white",
    borderColor: "#979797",
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },
  cardcontainer: {
    padding: 5,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: "white",
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#979797",
    display: "flex",
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
    marginLeft: 15,
    marginRight: 15,
  },
  buttonStyle: {
    backgroundColor: "#fb322d",
    paddingVertical: 15,
    marginHorizontal: 15,
    borderRadius: 5,
  },
  secondaryTitleStyle: {
    backgroundColor: "white",
    borderColor: "#888",
    paddingVertical: 15,
    marginHorizontal: 15,
    borderRadius: 5,
  },
  secondaryButtonTitleStyle: {
    color: "#888"
  },
  updatePaymentButtonStyle: {
    backgroundColor: "#000000",
    paddingVertical: 15,
    marginHorizontal: 15,
    borderRadius: 5,
  },
  buttonContainer: {
    padding: 15,
    paddingBottom: 0,
    rowGap: 15,
  },
  check: {
    width: RFValue(30, 580),
    height: RFValue(30, 580),
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: RFValue(15, 580),
    borderWidth: 1,
    borderColor: "#F86D64",
  },
  /* Modal */
  modalInputStyle: {
    flex: 1,
    marginTop: 5,
    borderRadius: 5,
    borderColor: "#888",
    borderWidth: 1,
    paddingLeft: 15,
  },
  modalButtonStyle: {
    backgroundColor: "#F86D64",
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 30,
  },
});
