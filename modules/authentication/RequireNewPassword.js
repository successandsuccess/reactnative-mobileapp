import React, { useState, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import { Text, Input, Button } from 'react-native-elements'
import { 
    widthPercentageToDP as wp, 
    heightPercentageToDP as hp 
} from 'react-native-responsive-screen'
import { RFValue } from 'react-native-responsive-fontsize'
import { Auth } from 'aws-amplify';


export default function ForgotPassword({ authState, onStateChange }) {
    const [email, setEmail] = useState("")
    const [error, setError] = useState("")
    const [confirmed, setConfirmed] = useState(false)
    const [data, setData] = useState({
        password: "",
        code: ""
    })
    useEffect(() => {
        setConfirmed(false)
    }, [authState])

    const send = () => {
        Auth.forgotPassword(email).then(res => {
            setConfirmed(true)
            setData({ password: "", code: "" })
        }).catch(err => setError(err.message))
    }

    const submit = () => {
        Auth.forgotPasswordSubmit(email, data.code, data.password).then(res => {

        }).catch(err => setError(err.message))
    }

    return authState == 'forgotPassword' ? (
        <View style={style.container}>
            <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>Reset Your Password</Text>
            <View style={{ marginTop: 15 }}>
                {
                    error != "" && (
                        <Text style={{ color: 'red', textAlign: 'center', marginBottom: 15 }}>{error}</Text>
                    )
                }
                {
                    !confirmed ? (
                        <>
                            <Input label="Email *" value={email} autoCapitalize="none" inputStyle={style.inputStyle} inputContainerStyle={{ borderBottomWidth: 0 }} style={{ marginTop: 15 }} labelStyle={{ color: 'black', fontWeight: 'normal' }} onChangeText={value => setEmail(value)}></Input>
                            <Button buttonStyle={style.buttonStyle} disabled={email === ""} title="Send" disabledStyle={[style.buttonStyle, { opacity: 0.8 }]} onPress={send}></Button>
                        </>
                    ) : (
                        <>
                            <Input label="Confirmation Code *" value={data.code} autoCapitalize="none" inputStyle={style.inputStyle} inputContainerStyle={{ borderBottomWidth: 0 }} style={{ marginTop: 15 }} labelStyle={{ color: 'black', fontWeight: 'normal' }} onChangeText={value => setData({ ...data, code: value })}></Input>
                            <Input label="New Password *" value={data.password} autoCapitalize="none" inputStyle={style.inputStyle} inputContainerStyle={{ borderBottomWidth: 0 }} style={{ marginTop: 15 }} labelStyle={{ color: 'black', fontWeight: 'normal' }} onChangeText={value => setData({ ...data, password: value })}></Input>
                            <Button buttonStyle={style.buttonStyle} disabled={data.password === "" || data.code === ""} title="Submit" disabledStyle={[style.buttonStyle, { opacity: 0.8 }]} onPress={submit}></Button>
                        </>
                    )
                }

            </View>
        </View>
    ) : null

}

const style = StyleSheet.create({
    container: {
        flex: 1,
        width: wp('100'),
        height: hp('100'),
        padding: 24
    },
    inputStyle: {
        flex: 1, marginTop: 5, borderRadius: 5, borderColor: '#888', borderWidth: 1, paddingLeft: 15
    },
    buttonStyle: {
        backgroundColor: '#F86D64',
        paddingTop: 15,
        paddingBottom: 15,
        marginTop: 30,
    }
})