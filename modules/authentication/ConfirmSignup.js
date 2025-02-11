// @ts-check
import React, { useState, useEffect } from 'react';
import { Text, Input, Button } from 'react-native-elements';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { RFValue } from 'react-native-responsive-fontsize';
import { Auth } from 'aws-amplify';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, ENV } from '../../constants';

export default function ConfirmSignup({ authState, onStateChange }) {
  const [data, setData] = useState({
    confirmation_code: '',
    email: '',
    userId: '',
    preferredName: '',
    street: '',
    state: '',
    zipcode: '',
    user_type: '',
    access_code: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;
    AsyncStorage.getItem('userdata').then(res => {
      if (!res) throw new Error("AsyncStorage NULL retrieval error received for 'userdata'")

      /** @type {import("../types").AsyncUserData} */
      const asyncUserData = JSON.parse(res);
      if (isMounted)
        setData({
          confirmation_code: '',
          email: asyncUserData.email,
          userId: asyncUserData.userId,
          preferredName: asyncUserData.preferredName,
          street: asyncUserData.street,
          state: asyncUserData.state,
          zipcode: asyncUserData.zipcode,
          user_type: asyncUserData.user_type,
          access_code: asyncUserData.access_code,
        });
      setError('');
    }).catch(err => {
      setError(err)
    })
    return () => {
      isMounted = false;
    };
  }, [authState]);

  const confirm = () => {
    Auth.confirmSignUp(data.email, data.confirmation_code)
      .then(_ => {
        getUserTable();
        onStateChange('signedUp');
        setData({ ...data, confirmation_code: '' });
        Alert.alert("Your account has successfully been made.");
      })
      .catch(err => setError(err.message));
  };

  const resendCode = () => {
    Auth.resendSignUp(data.email)
      .then(_ => { })
      .catch(err => setError(err.message));
  };

  async function getUserTable() {
    const body = JSON.stringify({
      incoming_id: data.userId,
      email: data.email,
      preferred_name: data.preferredName,
      street: data.street,
      state: data.state,
      zipcode: data.zipcode,
      access_code: data.access_code,
      user_type: data.user_type,
    });

    console.log("POST /customer w/ body:\n", JSON.stringify(body, undefined, 2))

    const response = await fetch(
      `${API_BASE_URL}/${ENV}/customer`,
      {
        method: 'POST', // *GET, POST, PUT, DELETE, etc.
        mode: 'cors', // no-cors, *cors, same-origin
        cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
        credentials: 'same-origin', // include, *same-origin, omit
        headers: {
          'Content-Type': 'application/json',
          'Connection': 'keep-alive',
        },
        redirect: 'follow', // manual, *follow, error
        referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
        body: body, // body data type must match “Content-Type” header
      },
    );
    let dataResponse = await response.json(); // parses JSON response into native JavaScript objects

    console.log("API response:\n", JSON.stringify(dataResponse, undefined, 2))

    return dataResponse;
  }

  return authState == 'confirmSignUp' ? (
    <View style={style.container}>
      <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>
        Confirm Email
      </Text>
      <View style={{ marginTop: 15 }}>
        {error != '' && (
          <Text style={{ color: 'red', textAlign: 'center', marginBottom: 15 }}>
            {error}
          </Text>
        )}
        <Input
          label="Confirmation Code *"
          value={data.confirmation_code}
          autoCapitalize="none"
          inputStyle={style.inputStyle}
          inputContainerStyle={{ borderBottomWidth: 0 }}
          style={{ marginTop: 15 }}
          labelStyle={{ color: 'black', fontWeight: 'normal' }}
          onChangeText={value => setData({ ...data, confirmation_code: value })}
        />
        <Button
          buttonStyle={style.buttonStyle}
          disabled={data.email === '' || data.confirmation_code === ''}
          title="Confirm"
          disabledStyle={[style.buttonStyle, { opacity: 0.8 }]}
          onPress={confirm}
        />
        <View style={{ display: 'flex', flexDirection: 'row', marginTop: 25 }}>
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={resendCode}>
            <Text style={{ color: '#AAAA00', fontSize: RFValue(12, 580) }}>
              {' '}
              Resend Code
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            onPress={() => onStateChange('signIn')}>
            <Text style={{ color: '#AAAA00', fontSize: RFValue(12, 580) }}>
              Back To Signin
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  ) : null;
}

const style = StyleSheet.create({
  container: {
    flex: 1,
    width: wp('100'),
    height: hp('100'),
    padding: 24,
  },
  inputStyle: {
    flex: 1,
    marginTop: 5,
    borderRadius: 5,
    borderColor: '#888',
    borderWidth: 1,
    paddingLeft: 15,
  },
  buttonStyle: {
    backgroundColor: '#F86D64',
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 30,
  },
});
