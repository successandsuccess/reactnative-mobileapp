import React, { useState, useRef } from 'react';
import { View, StyleSheet, Linking } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Text, Input, Button } from 'react-native-elements';
import { RFValue } from 'react-native-responsive-fontsize';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import SelectDropdown from 'react-native-select-dropdown'
import { API_BASE_URL, ENV } from '../../constants';
import Spinner from 'react-native-loading-spinner-overlay';
import { Alert } from 'react-native';

const states = ["AK", "AL", "AR", "AS", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "GU", "HI", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MP", "MS", "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "PR", "RI", "SC", "SD", "TN", "TT", "TX", "UT", "VI", "VT", "VA", "WA", "WI", "WV", "WY"]

/** @typedef {'email' | 'password' | 'confirmPassword' | 'preferredName' | 'state' | 'zipcode' | 'access_code'} RequiredFields */

/** @type {import("../types").SignupData} */
const initialDataState = {
  email: '',
  password: '',
  confirmPassword: '',
  preferredName: '',
  street: '',
  state: '',
  zipcode: '',
}

/** 
 * @typedef {{[k in RequiredFields]: string}} ErrorData 
 * @type {ErrorData}
*/
const initialErrorState = {
  email: "",
  password: "",
  confirmPassword: "",
  preferredName: "",
  state: "",
  zipcode: "",
  access_code: "",
}

export default function Signup({ authState, onStateChange }) {
  const [data, setData] = useState(initialDataState);
  const [errors, setErrors] = useState(initialErrorState)
  const [accessCode, setAccessCode] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [color, setColor] = useState('grey')

  /** @type {RequiredFields[]} */
  const required_fields = ['email', 'password', 'confirmPassword', 'preferredName', 'state', 'zipcode', 'access_code']

  /** @type {{[k in RequiredFields]: React.RefObject<import("react-native-elements/dist/input/Input").Input>}} */
  const refs = {
    email: useRef(null),
    password: useRef(null),
    confirmPassword: useRef(null),
    preferredName: useRef(null),
    state: useRef(null),
    zipcode: useRef(null),
    access_code: useRef(null),
  }

  /**
   * @param {import("../types").SignupData} submittedData 
   * @returns 
   */
  async function handleSubmit (submittedData) {
    let invalid = false
    const newErrors = {...initialErrorState}

    /**
     * Helper function for error handling
     * 
     * @param {RequiredFields} fieldName 
     * @param {string} msg
     */
    function handleError(fieldName, msg) {
      invalid = true
      newErrors[fieldName] = msg;
      const input = refs[fieldName].current

      // State dropdown doesn't support shaking
      if (fieldName === 'state') {
        return
      }

      if (input) input.shake()
    }

    for (const required_field of required_fields) {
      if (submittedData[required_field] === "") handleError(required_field, 'Required Field - Please fill out')
    }

    if (!states.includes(submittedData.state)) handleError('state', "Invalid State - Please select an option from the dropdown")

    if (!/\d{5}(-\d{4})?/.test(submittedData.zipcode)) handleError('zipcode', 'Invalid Zipcode - Please enter a valid zipcode')
    
    if (submittedData.password !== submittedData.confirmPassword) {
      handleError('password', "Mismatched Passwords - Please double check that passwords match")
      handleError('confirmPassword', "Mismatched Passwords - Please double check that passwords match")
    } 

    if (!/[A-Z0-9]{6}/.test(accessCode)) handleError('access_code', "Invalid Access Code")

    if (invalid) {
      console.log("newErrors", JSON.stringify(newErrors, undefined, 2))
      setErrors(newErrors)
      return
    }

    // If not early terminated from errors, continue with Access Code verification
    console.log(`GET /access-code/verify?code=${accessCode}`)
    const response = await fetch(
      `${API_BASE_URL}/${ENV}/access-code/verify?code=${accessCode}`,
      {
        method: 'GET', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
      },
    );
    if (response.status === 401) {
      const {valid, used} = await response.json()
      if (!valid) {
        handleError("access_code", "Invalid access code - please double check and try again")
        setErrors(newErrors)
      } else if (used) {
        handleError("access_code", "Already used access code - please try a different code")
        setErrors(newErrors)
      }
      return
    }
    if (!response.ok || response.status !== 200) {
      const responseBody = await response.json()
        .catch((err) => `Err reading JSON body: ${err}`)
      console.error(`Failed to process access code ${accessCode}: received [${response.status}] ${response.statusText} ${responseBody}`)

      const {subject, body} = {
        subject: "SignUp client error - verify access code",
        body: `For access code ${accessCode} on ${(new Date).toUTCString()}:\n\n${responseBody}`
      }
      Alert.alert(
        "Failed to process access code",
        `Encountered unexpected error while processing access code.\nPlease wait and try again\n\nIf you continue to experience issues, please contact support@dossiay.com with the button below and the following relevant information will be pre-filled out:\n\n${responseBody}`,
        [
          {text: "Contact Support", onPress: () => Linking.openURL(`mailto:support@dossiay.com?subject=${subject}&body=${body}`)},
          {text: "Cancel", style: 'cancel'}
        ]
      )
      return;
    }

    const data = await response.json(); // parses JSON response into native JavaScript objects
    console.log("Sucessfully verified access code request w/ response message: ", JSON.stringify(data))

    const { user_type } = data
    Auth.signUp({
      username: submittedData.email.toLowerCase(),
      password: submittedData.password,
      attributes: {
        email: submittedData.email.toLowerCase()
      },
    })
      .then(res => {
        /** @type {import("../types").AsyncUserData} */
        const asyncUserData = {
          email: submittedData.email.toLowerCase(),
          userId: res.userSub,
          preferredName: submittedData.preferredName,
          street: submittedData.street,
          state: submittedData.state,
          zipcode: submittedData.zipcode,
          user_type,
          access_code: accessCode
        }
        AsyncStorage.setItem(
          'userdata',
          JSON.stringify(asyncUserData),
        );
        setData(initialDataState);
        setErrors(initialErrorState);
        onStateChange('confirmSignUp');
      })
      .catch(err => {
        Alert.alert("Issue with SignUp", `Encountered unexpected error while setting up user.\n\n${err}`)
        console.error('Auth.signUp err: ', err);
      });
  }

  if (authState == 'signUp') {
    return (
      <KeyboardAwareScrollView style={style.container}>
        <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>
          Create a new account
        </Text>
        <View style={{ marginTop: 20 }}>
          <Input
            label="Email"
            value={data.email}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={style.inputContainerStyle}
            containerStyle={style.inputBoxStyle}
            labelStyle={style.labelStyle}
            onChangeText={value => {
              setData({ ...data, email: value.toLowerCase() })
              setErrors({ ...errors, email: '' })
            }}
            renderErrorMessage={false}
            ref={refs.email}
            errorMessage={errors.email}
          />
          <Input
            label="Preferred Name"
            value={data.preferredName}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
            containerStyle={style.inputBoxStyle}
            labelStyle={style.labelStyle}
            onChangeText={value => {
              setData({ ...data, preferredName: value })
              setErrors({ ...errors, preferredName: '' })
            }}
            renderErrorMessage={false}
            ref={refs.preferredName}
            errorMessage={errors.preferredName}
          />

          <Input
            label="Password"
            value={data.password}
            secureTextEntry={true}
            inputStyle={style.inputStyle}
            inputContainerStyle={style.inputContainerStyle}
            containerStyle={style.inputBoxStyle}
            labelStyle={style.labelStyle}
            onChangeText={value => {
              setData({ ...data, password: value })
              setErrors({ ...errors, password: '' })
            }}
            renderErrorMessage={false}
            ref={refs.password}
            errorMessage={errors.password}
          />
          <Input
            label="Confirm Password"
            value={data.confirmPassword}
            secureTextEntry={true}
            inputStyle={style.inputStyle}
            inputContainerStyle={style.inputContainerStyle}
            containerStyle={style.inputBoxStyle}
            labelStyle={style.labelStyle}
            onChangeText={value => {
              setData({ ...data, confirmPassword: value })
              setErrors({ ...errors, confirmPassword: '' })
            }}
            renderErrorMessage={false}
            ref={refs.confirmPassword}
            errorMessage={errors.confirmPassword}
          />
          <Text style={{ fontWeight: 'bold', paddingLeft: 10, paddingTop: 20 }}>Billing Info:</Text>
          {/* <Input
            label="Street Address"
            value={data.street}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
            containerStyle={style.inputBoxStyle}
            labelStyle={style.labelStyle}
            onChangeText={value => setData({ ...data, street: value })}
            renderErrorMessage={false}
          /> */}
          <View style={{ display: 'flex', flexDirection: 'row', width: '50%', paddingLeft: 10 }}>
            <View style={[style.labelContainer, { height: '100%' }]}>
              <Text style={[style.labelStyle]}>State</Text>
              <SelectDropdown
                // label="State (ex. MA)"
                value={data.state}
                data={states}
                onSelect={(selectedItem) => {
                  setData({ ...data, state: selectedItem })
                  setErrors({ ...errors, state: '' })
                }}
                buttonTextAfterSelection={(selectedItem) => {
                  setColor('black')
                  return selectedItem
                }}
                rowTextForSelection={(item) => {
                  return item
                }}
                buttonStyle={{
                  marginTop: 5,
                  borderRadius: 5,
                  borderColor: '#888',
                  backgroundColor: 'white',
                  borderWidth: 1,
                  minHeight: undefined,
                  // padding: 5,
                  width: '100%',
                  height: 33.5,
                }}
                buttonTextStyle={{color}}
                dropdownStyle={style.inputStyle}
                ref={refs.state}
              />
              <Text style={style.dropdownError} >{errors.state}</Text>
            </View>
            {/* <Input
              label="State (ex. MA)"
              value={data.state}
              autoCapitalize="none"
              inputStyle={style.inputStyle}
              inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
              containerStyle={style.inputBoxStyle}
              labelStyle={style.labelStyle}
              maxLength={2}
              onChangeText={value => setData({ ...data, state: value })}
              renderErrorMessage={false}
            /> */}
            <View style={{ width: '100%', alignSelf: 'flex-start' }}>
              <Input
                label="Zipcode"
                value={data.zipcode}
                autoCapitalize="none"
                inputStyle={[style.inputStyle, { padding: 0 }]}
                inputContainerStyle={[style.inputContainerStyle]}
                containerStyle={style.inputBoxStyle}
                labelStyle={style.labelStyle}
                keyboardType="numeric"
                maxLength={5}
                onChangeText={value => {
                  setData({ ...data, zipcode: value })
                  setErrors({ ...errors, zipcode: '' })
                }}
                renderErrorMessage={false}
                ref={refs.zipcode}
                errorMessage={errors.zipcode}
              />
            </View>
          </View>
          <Input
            label="Access Code"
            value={accessCode}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={[style.inputFlex, style.inputContainerStyle]}
            containerStyle={style.inputBoxStyle}
            labelStyle={style.labelStyle}
            onChangeText={(value) => {
              setAccessCode(value)
              setErrors({ ...errors, access_code: '' })
            }}
            renderErrorMessage={false}
            ref={refs.access_code}
            errorMessage={errors.access_code}
          />
          <Button
            buttonStyle={style.buttonStyle}
            title="NEXT"
            onPress={() => {
              setIsLoading(true)
              handleSubmit(data)
                .finally(() => setIsLoading(false))
            }}
          />
          <Button
            type="clear"
            title="Sign In"
            titleStyle={{ color: '#AAAA00' }}
            buttonStyle={{ marginTop: 25 }}
            containerStyle={{ paddingBottom: '30%' }}
            onPress={() => onStateChange('signIn')}
          />
        </View>
        <Spinner visible={isLoading} key={isLoading} />
      </KeyboardAwareScrollView>
    );
  } else {
    return null;
  }
}


const style = StyleSheet.create({
  container: {
    flex: 1,
    width: wp('90'),
    height: hp('90'),
    top: hp('5')
    // padding: 24,
  },
  labelStyle: {
    color: 'black',
    fontWeight: 'normal',
    marginTop: 10,
    fontSize: 16
  },
  inputStyle: {
    flex: 1,
    marginTop: 5,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    minHeight: undefined,
    paddingVertical: 5,
    paddingHorizontal: 5,
    marginBottom: 5
  },
  lastInputStyle: {
    marginTop: 2,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    minHeight: undefined,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  addressInputStyle: {
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    minHeight: undefined,
    paddingVertical: 3,
    paddingHorizontal: 5,
  },
  inputContainerStyle: {
    borderBottomWidth: 0,
  },
  inputBoxStyle: {
  },
  buttonStyle: {
    backgroundColor: '#D65344',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 30,
  },
  inputFlexView: {
    display: 'flex',
    flexDirection: 'row',
    flex: 1,
    width: '50%'
  },
  inputFlex: {
    flex: 1
  },
  labelContainer: {
    width: '100%',
  },
  dropdownError: {
    marginTop: 10,
    paddingHorizontal: 5,
    color: 'red',
    fontSize: 12,
  }
});
