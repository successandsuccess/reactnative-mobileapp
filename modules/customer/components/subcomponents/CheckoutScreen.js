import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, Text, Image, ScrollView, FlatList, Alert, Dimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Auth } from "aws-amplify";
import Loading from "react-native-loading-spinner-overlay";

import { CheckoutContext } from '../../context/CheckoutContext';
import Styles from '../../../theme/Styles';
import Images from "../../../theme/Images";
import RoundTextInput from "./RoundTextInput";
import RoundButton from "./RoundButton";
import config from "../../config";

import { useStripe } from '@stripe/stripe-react-native';

import { API_BASE_URL, ENV } from "../../../../constants"

const sWidth = Dimensions.get('window').width;



export default function CheckoutScreen({ navigation, route }) {
    const { initPaymentSheet, presentPaymentSheet } = useStripe();
    const { cartItems, setCartItems, appliedCredit, setAppliedCredit, cartQuantity, setCartQuantity, timer, setTime, cartHasItem, setCartHasItem, cartHasPromo, setCartHasPromo } = useContext(CheckoutContext)

    const [profile, setProfile] = useState(route.params.profile)
    const [isLoading, setIsLoading] = useState(false)
    const [menuItems, setMenuItems] = useState(route.params.items)
    const [promoCodes, setPromoCodes] = useState(route.params.promoCodes)
    const [discount, setDiscount] = useState(route.params.discount)
    const [customerTaxRate] = useState(route.params.taxRate)
    const [total, setTotal] = useState(0)
    const [cost, setCost] = useState(0)
    const [checkoutReady, setCheckOutReady] = useState(false)

    useEffect(() => {
        // Call getPaymentIntent here with appropriate dependencies
        setIsLoading(true)
        const getTotal = () => {
            let subtotal = 0;

            for (const item of cartItems) {

                if (item.cost != "NaN") {
                    setCost(cost + item.cost)
                    console.log(cost)
                    subtotal += (parseFloat(item.cost) * item.quantity);
                }
            }

            let t = (subtotal * (1 + parseFloat(customerTaxRate))) - discount - appliedCredit;
            console.log(t)
            let parsedTotal = t.toFixed(2)

            return parsedTotal
        }

        const getPaymentIntent = async () => {
            let t = getTotal()
            setTotal(t)

            try {
                let body = {
                    // multiply by 100 for Stripe, they count in pennies
                    'amount': Math.floor(t * 100),
                    'customer': profile,
                };
                console.log(body)
                const response = await fetch(
                    `${API_BASE_URL}/${ENV}/payment/intent`,
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
                        body: JSON.stringify(body), // body data type must match “Content-Type” header
                    },
                );
                let data = await response.json();
                console.log(JSON.stringify(data, undefined, 2))

                console.log('initializing payment sheet')
                console.log(data)
                const { error } = await initPaymentSheet({
                    merchantDisplayName: "Dossiay",
                    customerId: data['stripe_customer_id'],
                    customerEphemeralKeySecret: data['ephemeral_key'],
                    paymentIntentClientSecret: data['payment_intent'],
                    // Set `allowsDelayedPaymentMethods` to true if your business can handle payment
                    //methods that complete payment after a delay, like SEPA Debit and Sofort.
                    allowsDelayedPaymentMethods: false,
                });
                if (error) {
                    Alert.alert(`Error code: ${error.code}`, error.message);
                }

            } catch (e) {
                console.error('error', e);
            }
        }
        setIsLoading(false)
        getPaymentIntent().then(_ => setCheckOutReady(true))

    }, []);

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Content //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    const _renderContent = () => {
        // const restaurantName = restaurant ? restaurant.Profile.restaurantInfo.restaurantName : '';
        return (
            <View style={styles.contentWrapper}>
                <View style={{ flex: 1, flexGrow: 1 }}>
                    <View style={styles.itemWrapper}>
                        <View style={Styles.rowCenter}>
                            <Text style={styles.itemTitleText}>{`Finalize Order${promoCodes.length > 0 ? ' (with Discount!)?' : '?'}`}</Text>
                        </View>
                    </View>
                    {/* MENU ITEMS */}
                    <FlatList
                        style={{ ...styles.listContainer, minHeight: '25%', }}
                        data={cartItems}
                        showsVerticalScrollIndicator={true}
                        keyExtractor={(item, index) => {
                            if (item.title) {
                                return index + cartItems.length;
                            } else {
                                return index
                            }
                        }}
                        renderItem={({ item, index }) => {
                            const menuImage = item.content_id ? { uri: item.content_id } : Images.icon_food_placeholder;
                            const menuTitle = item.title ?? '';
                            const price = item.cost ?? 0.00;
                            const quantity = item.quantity ?? 0;
                            return (
                                <View style={styles.menuWrapper}>
                                    <Image style={styles.menuImage} source={menuImage} />
                                    <View style={styles.menuInfo}>
                                        <Text style={styles.menuTitleText}>{menuTitle}</Text>
                                        <View style={styles.priceWrapper}>
                                            {item.applied_promo ? (
                                                <Text style={[styles.menuPriceText, { justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1 }]}><Text style={{ textDecorationLine: 'line-through' }}>${price.toFixed(2)}</Text><Text style={{ color: 'red' }}>  ${item.discount.toFixed(2)}</Text></Text>
                                            ) :
                                                <Text style={[styles.menuPriceText, { justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1 }]}>${price.toFixed(2)}</Text>
                                            }
                                            <View style={styles.priceSelector}>
                                                <View style={styles.priceBtn}>
                                                    <Text style={[styles.priceBtnText, { fontSize: 16 }]}>{quantity}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )
                        }}
                    />
                    <View style={styles.itemWrapper}>
                        <View style={[Styles.rowBetween, styles.border]}>
                            <Text style={styles.totalText}>Total to be charged:</Text>
                            <Text style={styles.priceText}>${total}</Text>
                        </View>
                    </View>
                </View>
            </View>
        )
    }

    const openPaymentSheet = async () => {
        setIsLoading(true);
        const { error } = await presentPaymentSheet();

        if (error) {
            Alert.alert(`Error code: ${error.code}`, error.message);
        } else {
            setIsLoading(false)

            let postPurchaseBody = {
                total: total,
                cost: cost,
                tax: customerTaxRate * cost,
                incoming_id: profile.id,
                credit: appliedCredit,
                items: cartItems,
                promo_codes: promoCodes
            };

            const postPurchase = await fetch(
                `${API_BASE_URL}/${ENV}/payment/complete`,
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
                    body: JSON.stringify(postPurchaseBody), // body data type must match “Content-Type” header
                },
            );

            let postPurchaseInfo = await postPurchase.json()

            Alert.alert('Success', 'Your order is confirmed!',
                [
                    {
                        text: 'Ok',
                        onPress: () => {
                            setCartItems([])
                            setAppliedCredit(0)
                            setCartQuantity(0)
                            setCartHasItem(false)
                            setCartHasPromo(false)
                            navigation.popToTop();
                        },
                    }
                ]
            );
        }
    };


    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Footer //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    const _renderFooter = () => {
        return (
            <View style={styles.footerWrapper}>
                <RoundButton
                    style={{
                        backgroundColor: '#fb322d',
                        borderRadius: 5
                    }}
                    theme={'main'}
                    enabled={checkoutReady}
                    title={'CONFIRM ORDER'}
                    onPress={openPaymentSheet}
                />
            </View>
        )
    }

    const onSendOrder = () => {
        // CAUTION ON THIS *100 TEMP SOLUTION FOR STRIPE PAYMENT SUCCESS



    }



    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Render //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    return (
        <View style={{ flex: 1, backgroundColor: '#EFF3FC' }}>

            <View style={{ flex: 1 }}>
                <View style={styles.container}>

                    <>
                        {_renderContent()}
                        {_renderFooter()}
                    </>

                </View>
            </View>
            <Loading visible={isLoading} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentWrapper: {
        flex: 1,
        padding: 15
    },
    border: {
        marginHorizontal: 10,
        paddingBottom: 5,
        borderColor: '#E2E2E2',
        borderBottomWidth: 1,
        marginTop: 10
    },
    itemWrapper: {
        paddingVertical: 10
    },
    itemImage: {
        width: 20,
        height: 20,
        resizeMode: 'contain'
    },
    itemTitleText: {
        fontSize: 18,
        color: '#222222',
        marginLeft: 10
    },
    contentImage: {
        width: 14,
        height: 14,
        resizeMode: 'contain'
    },
    contentText: {
        fontSize: 15,
        color: '#7D849A',
        marginLeft: 10
    },
    totalText: {
        color: '#222222',
        justifyContent: 'flex-start',
        fontSize: 18
    },
    priceText: {
        color: '#E83939',
        justifyContent: 'flex-end',
        fontSize: 18
    },
    footerWrapper: {
        backgroundColor: 'white',
        padding: 10,
        paddingBottom: 50,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
    },
    listContainer: {
        flex: 1,
        marginHorizontal: 15,
        paddingBottom: 15
    },
    menuPriceText: {
        fontSize: 14,
        color: '#7D849A'
    },
    priceBtnText: {
        color: '#7D849A',
        fontSize: 20
    },
    menuWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 5,
        backgroundColor: 'white',
        marginBottom: 10,
        height: 80
    },
    menuImage: {
        width: 80,
        height: 80,
        resizeMode: 'cover',
        borderRadius: 5
    },
    menuInfo: {
        marginLeft: 15
    },
    priceWrapper: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: sWidth - 140
    },
    priceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 30,
    },
    priceBtn: {
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center'
    },
    priceBtnText: {
        color: '#7D849A',
        fontSize: 20
    },
});