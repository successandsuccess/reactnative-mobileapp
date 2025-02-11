import React, { useState, Dispatch, SetStateAction } from 'react';
import { RFValue } from 'react-native-responsive-fontsize';
import { Text, CheckBox, Button } from 'react-native-elements'
import { View, StyleSheet, SafeAreaView, Alert, Linking, Image, ScrollView } from 'react-native'
import Images from '../../theme/Images';
import { updateDynamoCustomer } from './subcomponents/ProfileEditor/updateDynamoCustomer';
import { ScreenWidth } from 'react-native-elements/dist/helpers';
import Spinner from 'react-native-loading-spinner-overlay';

/**
 * 
 * @param {Object} props
 * @param {import('../../types').UserData} props.profile
 * @param {Dispatch<SetStateAction<import('../../types').UserData>>} props.setProfile
 * @returns {React.ReactNode}
 */
export default function TermsAndPayment({ profile, setProfile }) {
    const [isChecked, setIsChecked] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    async function handleSubmit() {
        const newProfile = {
            ...profile,
            accepted_terms: isChecked
        }

        setIsLoading(true)

        try {
            await updateDynamoCustomer(newProfile);
            console.log("DynamoDB update successful");
        } catch (error) {
        console.error("Failed to update DynamoDB:", error);
        }

        setIsLoading(false)
        setProfile(newProfile)
    }

    return (
        <View style={style.container}>
            {/* <Text h4 h4Style={{ fontSize: RFValue(18, 580) }}>Signup for Dossiay!</Text> */}

            <Image
                source={Images.logo_dark}
                style={style.logo}
                resizeMode='contain'
            />
            <SafeAreaView style={style.safeViewContainer}>
                <ScrollView style={style.scrollView} indicatorStyle='black'>
                    <Text style={style.scrollViewText}>
                        Welcome to Dossiay! An online platform where you can be a content creator.
                        {"\n\n"}
                        With the Dossiay mobile app, you’ll get access to exclusive promotions from
                        a variety of businesses where you can purchase or use to earn rewards.
                        {"\n\n"}
                        You’ll receive your own promotional code for each promotion to give your
                        followers or anyone a discount. You’ll then be rewarded anytime a purchase
                        is made using your promotional code.
                        {"\n\n"}
                        We collect your data to make the platform work and or to improve it. We don’t share your data without your
                        consent.
                        {"\n\n"}
                        Please check Dossiay Private Policy for more details or contact us at <Text style={style.openURLButton} onPress={() => { Linking.openURL('mailto:support@dossiay.com') }}>support@dossiay.com</Text>.
                    </Text>
                </ScrollView>
            </SafeAreaView>
            <View style={style.checkBoxContainer}>
                <CheckBox
                    containerStyle={style.checkBoxStyle}
                    checked={isChecked}
                    onPress={() => setIsChecked(!isChecked)}
                    checkedColor="#D65344"
                />
                <Text style={style.checkBoxText}>
                    {"I've read and agree to Dossiay's\n"}
                    <Text
                        onPress={() => Linking.openURL('https://dossiay.com/termsofuse/')}
                        style={style.openURLButton}
                    >Terms of Use</Text>
                    {" and "}
                    <Text
                        onPress={() => Linking.openURL('https://dossiay.com/privacypolicy/')}
                        style={style.openURLButton}
                    >Privacy Policy</Text>.
                </Text>
            </View>
            <View>
                <Spinner visible={isLoading} />
                <Button
                    buttonStyle={style.buttonStyle}
                    title="Submit"
                    disabled={!isChecked}
                    disabledStyle={[style.buttonStyle, { opacity: 0.8 }]}
                    onPress={handleSubmit}
                />
            </View>
        </View>
    )
}

const style = StyleSheet.create({
    container: {
        display: 'flex',
        flexDirection: 'column',
        width: '95%',
        height: '85%',
        justifyContent: 'center',
        margin: 'auto',
        marginTop: '20%'
    },
    inputStyle: {
        flex: 1,
        marginTop: 5,
        borderRadius: 5,
        borderColor: '#888',
        borderWidth: 1,
        paddingLeft: 15
    },
    buttonStyle: {
        backgroundColor: '#D65344',
        paddingTop: 15,
        paddingBottom: 15,
        marginTop: 30,
    },
    safeViewContainer: {
        height: "80%",
        flex: 8,
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        marginTop: '5%',
        marginHorizontal: '5%',
        marginBottom: 10
    },
    scrollView: {
        alignContent: 'center'
    },
    scrollViewText: {
        fontSize: RFValue(10.5, 580),
        paddingVertical: 10,
        lineHeight: 22
    },
    text: {
        fontSize: 14,
    },
    openURLButton: {
        textDecorationLine: 'underline'
    },
    openURLButtonTitle: {
        fontSize: 15,
        color: "#D65344",
        fontWeight: "600"
    },
    checkBoxView: {
        flex: 1,
        paddingTop: 15
    },
    checkBoxContainer: {
        display: 'flex',
        flexDirection: 'row',
        padding: 0,
        margin: 0,
        alignItems: "center",
        width: '90%'
    },
    checkBoxStyle: {
        padding: 0,
        margin: 0
    },
    checkBoxText: {
        textAlignVertical: 'center',
        flexWrap: 'wrap',
        lineHeight: 25
    },
    logo: {
        alignSelf: 'center',
        width: ScreenWidth * .8,
        height: ScreenWidth * .8 * .5,
        marginBottom: -20,
    },
})