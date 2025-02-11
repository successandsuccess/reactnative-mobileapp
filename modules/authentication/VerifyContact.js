import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import {
  widthPercentageToDP as wp,
  heightPercentageToDP as hp,
} from 'react-native-responsive-screen';
import { Text, Input, Button } from 'react-native-elements';
import { RFValue } from 'react-native-responsive-fontsize';
import { Auth } from 'aws-amplify';


export default function VerifyContact({ authState, onStateChange }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (authState == 'verifyContact') {
      resend();
    }
  }, [authState]);

  const resend = async () => {
    let res = await Auth.verifyCurrentUserAttribute('email');
  }

  const submit = () => {
    Auth.verifyCurrentUserAttributeSubmit('email', code)
      .then((res) => {
        onStateChange('signedIn');
      }).catch((err) => {
        setError(err.message);
      });
  };

  const skip = () => {
    onStateChange('signIn');
  }

  return (
    authState == 'verifyContact' ? (
      <View style={style.container}>
        <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>
          Verify Contact
        </Text>
        <View style={{ marginTop: 30 }}>
          {error != '' && (
            <Text style={{ color: 'red', textAlign: 'center', marginBottom: 15 }}>
              {error}
            </Text>
          )}
          <Input
            label="Confirmation Code *"
            value={code}
            autoCapitalize="none"
            inputStyle={style.inputStyle}
            inputContainerStyle={{ borderBottomWidth: 0 }}
            style={{ marginTop: 15 }}
            labelStyle={{ color: 'black', fontWeight: 'normal' }}
            onChangeText={value => { setCode(value) }}
          />
          <Button
            buttonStyle={style.buttonStyle}
            disabled={code === ''}
            title="Submit"
            disabledStyle={[style.buttonStyle, { opacity: 0.8 }]}
            onPress={submit}
          />
          <View style={style.buttonContainer}>
            <Button
              buttonStyle={style.buttonStyle2}
              title="Resend"
              titleStyle={style.titleStyle}
              onPress={resend}
            />
            <Button
              buttonStyle={style.buttonStyle2}
              title="Skip"
              titleStyle={style.titleStyle}
              onPress={skip}
            />
          </View>
        </View>
      </View>
    ) : null
  );
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
    marginTop: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-evenly'
  },
  buttonStyle2: {
    backgroundColor: '#00000000',
    paddingTop: 0,
    paddingBottom: 15,
    marginTop: 30,
  },
  titleStyle: {
    color: '#AAAA00'
  },
});
