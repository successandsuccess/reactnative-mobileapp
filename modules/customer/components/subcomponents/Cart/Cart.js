import React, { useEffect, useContext, useState } from 'react';
import {
    Alert,
    View,
    StyleSheet,
    Text,
    Image,
    TouchableOpacity,
    Dimensions,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import Loading from "react-native-loading-spinner-overlay";

import { CheckoutContext } from '../../../context/CheckoutContext';
import Styles from "../../../../theme/Styles";
import Images from "../../../../theme/Images";
import RoundTextInput from "../RoundTextInput";
import RoundButton from "../RoundButton";
import { API_BASE_URL, ENV } from '../../../../../constants'
import { updatePromoRef } from '../../updatePromoRef'
import { Platform } from 'react-native';
import { useUserProfileData } from '../../../../hooks';



const sWidth = Dimensions.get('window').width;

export default function Cart({ navigation, route }) {
    const { cartItems, setCartItems, appliedCredit, setAppliedCredit, cartQuantity, setCartQuantity, timer, setTime, cartHasItem, setCartHasItem, cartHasPromo, setCartHasPromo } = useContext(CheckoutContext)

    const [isLoading, setIsLoading] = useState(false)
    const { userProfileData, setUserProfileData, refreshUserProfileData } = useUserProfileData();
    const [menuItems, setMenuItems] = useState(cartItems)

    const [promoCode, setPromoCode] = useState('')
    const [promoCodes, setPromoCodes] = useState([])
    const [promoCodeError, setPromoCodeError] = useState('')

    const [isShowSelectPaymentModal, setIsShowSelectPaymentModal] = useState(false)
    const [total, setTotal] = useState(0)
    const [discount, setDiscount] = useState(0)

    const [availableCredit, setAvailableCredit] = useState(parseFloat(route.params.user.credit) ?? 0,)
    const [creditError, setCreditError] = useState('')

    const [usedPromos, setUsedPromos] = useState(route.params.user.used_promo_list)
    const [customerId, setCustomerId] = useState(route.params.user.id)
    const [customerTaxRate, setCustomerTaxRate] = useState(0)

    console.log('total:', total)

    // constructor(props) {
    //     super();
    //     this.state = {
    //         isLoading: false,
    //         profile: props.route.params.user,
    //         cartItems: props.route.params.items,
    //         promoCode: '',
    //         promoCodeError: '',
    //         isShowSelectPaymentModal: false,
    //         total: 0,
    //         discount: 0,
    //         credit: parseFloat(props.route.params.user.credit) ?? 0,
    //         appliedCredit: 0,
    //         applyCredit: false,
    //         usedPromos: props.route.params.user.used_promo_list,
    //         customerId: props.route.params.user.id,
    //         customerTax: 0,
    //         promosTimer: props.route.params.promosTimer,
    //     };
    // }


    useEffect(() => {
        let newCartSize = cartItems.reduce((sum, { quantity }) => sum + quantity, 0)
        setCartQuantity(newCartSize);

        if (newCartSize === 0) {
            setCartHasItem(false);
            setCartHasPromo(false);
            // TODO: Additional actions
        }
    }, [cartItems]); // useEffect depends on cartItems

    useEffect(() => {
        setIsLoading(true);
        refreshUserProfileData().finally(() => setIsLoading(false))
    }, [])

    useEffect(() => {
        getTax().then(tax_rate => setCustomerTaxRate(tax_rate))
    }, [userProfileData])


    const capitalize = (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    const getTax = async () => {
        const url = `https://api.api-ninjas.com/v1/salestax?zip_code=${userProfileData.zipcode}`
        try {
            const response = await fetch(
                url,
                {
                    method: 'GET',
                    headers: {
                        'X-Api-Key': 'jaH4Oz+jJwFIv6T1ms2/yg==SCgMDmF3BoMQbLPB',
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                },
            );

            let jsonData = await response.json();
            if (jsonData.length > 0) {
                return jsonData[0].total_rate;
            } else {
                return 0;
            }
        } catch (e) {
            return 0;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Restaurant //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////


    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Menus //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    const _renderMenus = () => {

        return (
                <SwipeListView
                    style={{ ...styles.listContainer }}
                    data={menuItems}
                    showsVerticalScrollIndicator={true}
                    keyExtractor={(item, index) => {
                        return index
                    }}
                    renderItem={({ item, index }) => {
                        const menuImage = item.content_id ? { uri: item.content_id } : Images.icon_food_placeholder;
                        const menuTitle = item.title ? item.title : '';
                        const price = item.cost ?? 0.00;
                        const quantity = item.quantity ? item.quantity : 0;
                        return (
                            <View style={styles.menuWrapper}>
                                {menuImage && <Image style={styles.menuImage} source={item.content_id && item.content_id != "" ? { uri: item.content_id } : null} />}
                                <View style={styles.menuInfo}>
                                    <Text style={styles.menuTitleText}>{menuTitle}</Text>
                                    <View style={styles.priceWrapper}>
                                        {item.applied_promo ? (
                                            <Text style={[styles.menuPriceText, { justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1 }]}><Text style={{ textDecorationLine: 'line-through' }}>${price.toFixed(2)}</Text><Text style={{ color: 'red' }}>  ${item.discount.toFixed(2)}</Text></Text>
                                        ) :
                                            <Text style={[styles.menuPriceText, { justifyContent: 'flex-start', alignItems: 'flex-start', flex: 1 }]}>${price.toFixed(2)}</Text>
                                        }
                                        <View style={[styles.priceSelector, { justifyContent: 'flex-end', alignItems: 'flex-end', flex: 1 }]}>
                                            <TouchableOpacity style={styles.priceBtn}
                                                onPress={() => onSubtractQuantity(item, index)}>
                                                <Text style={styles.priceBtnText}>-</Text>
                                            </TouchableOpacity>
                                            <View style={styles.priceBtn}>
                                                <Text style={[styles.priceBtnText, { fontSize: 16 }]}>{quantity}</Text>
                                            </View>
                                            <TouchableOpacity style={styles.priceBtn}
                                                onPress={() => onPlusQuantity(item)}>
                                                <Text style={styles.priceBtnText}>+</Text>
                                            </TouchableOpacity>
                                        </View>

                                    </View>
                                </View>
                            </View>
                        )
                    }}
                />
            )
    }


    const onPlusQuantity = (item) => {
        // const relevantUsedPromo = item.id ? (usedPromos != undefined || usedPromos !=  ? usedPromos.filter(up => up.hasOwnProperty(item.id)) : []) : []
        // const instances = menuItems.filter((i) => i.id == item.id).length;
        // let maxUses = !item.max_uses ? 9999 : Math.min((item.max_uses - item.total_ref_used),item.total_purchased);
        let purchasedBefore = userProfileData.used_promo_list.hasOwnProperty(item.id) ? userProfileData.used_promo_list[item.id] : 0
        let canPurchaseNumber = Math.min((item.limit - item.total_ref_used - item.total_purchased), item.max_uses - item.quantity - purchasedBefore)

        if (canPurchaseNumber >= 1) {
            updatedCartItems = cartItems.map(cartItem => cartItem.id === item.id ? {...item, quantity: item.quantity + 1} : cartItem)
            setMenuItems(updatedCartItems)
            setCartItems(updatedCartItems);

            let oldCartSize = cartQuantity
            let newCartSize = cartItems.length;

            setCartQuantity(newCartSize);
            if (oldCartSize == 0 && newCartSize == 1) {
                setCartHasItem(true);
                setCartHasPromo(true);
                // TODO
                // updatePromotionQuantities(item.id, 1, profile.customerId, true);
            }
            updatePromoRef(1, item)
            // let newTime = 600
            // setTime(newTime)
        } else {
            Alert.alert("I'm sorry! You've reached the purchase limit for this promo and can't add anymore to your cart.");
        }
    }

    const onSubtractQuantity = (item, index) => {
        let newCartItems = [...cartItems];

        if (item.quantity <= 1) {
            newCartItems.splice(index, 1);
        } else {
            newCartItems[index].quantity--;
        }

        // Update state asynchronously
        setMenuItems(newCartItems)
        setCartItems(newCartItems)
        setCartQuantity(newCartItems.length);
        updatePromoRef(-1, item)

        if (newCartItems.length < 1) {
            navigation.popToTop();
        }
    };


    // const updatePromotionQuantities = async (id, purchased, customer_id, operation) => {
    //     let body = JSON.stringify({
    //         promo: {
    //             promo_id: id,
    //             total_purchased: purchased
    //         },
    //         incoming_id: customer_id,
    //         add: operation
    //     });
    //     let response;
    //     await fetch(
    //         {
    //             method: 'POST', // *GET, POST, PUT, DELETE, etc.
    //             mode: 'cors', // no-cors, *cors, same-origin
    //             cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
    //             credentials: 'same-origin', // include, *same-origin, omit
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'Connection': 'keep-alive',
    //             },
    //             redirect: 'follow', // manual, *follow, error
    //             referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    //             body: body, // body data type must match “Content-Type” header
    //         },
    //     )
    //         .then(async res => {
    //             response = await res.json()
    //         })
    //         .catch(err => console.error('updatepromotionpurchases', err));
    //     return response;
    // }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Credit /////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    function _renderCredit() {
        const [inputCredit, setInputCredit] = useState(appliedCredit.toFixed(2));

        useEffect(() => {
            if (cartItems.length === 0) {setAppliedCredit(0)}
        }, [cartItems])

        useEffect(() => {
            if (!appliedCredit) return;

            let inputCreditValue = Math.round(parseFloat(inputCredit)*100)/100

            // adjust credit to avoid negative totals
            if (inputCreditValue > total+appliedCredit) {
                inputCreditValue = total+appliedCredit
            }

            setAppliedCredit(inputCreditValue);
            setInputCredit(inputCreditValue.toFixed(2))

        }, [total])

        function handleApplyCredit() {
            let inputCreditValue = Math.round(parseFloat(inputCredit)*100)/100

            if (inputCreditValue > availableCredit) {
                setCreditError("Cannot apply more credit than available")
                return
            }

            // adjust credit to avoid negative totals
            if (inputCreditValue > total+appliedCredit) {
                inputCreditValue = total+appliedCredit
            }

            setAppliedCredit(inputCreditValue);
            setInputCredit(inputCreditValue.toFixed(2))
        }

        console.log('inputtedCredit: ', inputCredit)
        return (
            <View style={[Styles.rowCenterBetween, { alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'lightgrey' }]}>
                <View style={{rowGap: 5}}>
                    <Text style={styles.promoText}>
                        Use Credit:
                    </Text>
                    <Text style={styles.subText}>
                        ${availableCredit.toFixed(2)} available
                    </Text>
                </View>
                <RoundTextInput
                    style={{ width: '50%' }}
                    type="number"
                    textAlign={'right'}
                    value={inputCredit}
                    errorMessage={creditError}
                    returnKeyType="next"
                    onChangeText={inp => setInputCredit(inp)}
                    onEndEditing={() => {
                        if (parseFloat(inputCredit) <= availableCredit) {
                            setCreditError('')
                        } else {
                            setCreditError('Cannot apply more credit than available')
                        }
                    }}
                />
                <TouchableOpacity
                    disabled={creditError ? true : false}
                    style={{ backgroundColor: '#000000', borderRadius: 10, padding: 10}}
                    onPress={handleApplyCredit}
                >
                    <Text style={{ color: 'white', fontSize: 14, opacity: creditError ? 0.6 : 1 }}>
                        Apply
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Total //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    const _renderTotal = () => {
        const subtotal = menuItems.reduce((sub, item) => {
            let price = item.cost ?? 0
            sub += price * item.quantity
            return sub
        }, 0)

        // getTax() rather than using `customerTaxRate` state is intentional
        // -- appliedCredit update listens to `total` state and gets "locked" to
        // the pre-tax total because `customerTaxRate` is an async update
        // 
        // Ideally tax rate would be a global context listening to user profile zipcode :/
        useEffect(() => {
            getTax()
                .then((tax_rate) => {
                    let tax = subtotal * tax_rate;
                    let tot = subtotal - discount - appliedCredit + tax
                    tot = Math.round(tot * 100) / 100;
                    setTotal(tot);

                    console.log("inputted:", JSON.stringify({
                        discount,
                        appliedCredit,
                        menuItems: menuItems.map(({cost, quantity}) => ({cost, quantity}))
                    }))

                    console.log("derived:", JSON.stringify({
                        subtotal,
                        tax,
                        tot
                    }))
                })
        }, [discount, appliedCredit, menuItems])

        return (
            <View style={styles.totalWrapper}>
                <View style={styles.subTotalWrapper}>
                    <View style={Styles.rowCenterBetween}>
                        <Text style={styles.deliveryTitleText}>Subtotal</Text>
                        <Text style={styles.deliveryText}>${subtotal}</Text>
                    </View>
                    {/* <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                        <Text style={styles.deliveryTitleText}>Delivery</Text>
                        <Text style={styles.deliveryText}>Free</Text>
                    </View> */}
                    <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                        <Text style={styles.deliveryTitleText}>Tax</Text>
                        <Text style={styles.deliveryText}>${(customerTaxRate * subtotal).toFixed(2)}</Text>
                    </View>
                    {discount > 0 &&
                        <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                            <Text style={styles.deliveryTitleText}>Discount</Text>
                            <Text style={styles.discountText}>- ${discount.toFixed(2)}</Text>
                        </View>
                    }
                    {appliedCredit > 0 &&
                        <View style={[Styles.rowCenterBetween, Styles.mt1]}>
                            <Text style={styles.deliveryTitleText}>Credit</Text>
                            <Text style={styles.discountText}>- {appliedCredit?.toFixed(2)}</Text>
                        </View>
                    }
                </View>
                <View style={[Styles.rowCenterBetween, Styles.mt2]}>
                    <Text style={styles.totalTitleText}>Total</Text>
                    <Text style={styles.totalTitleText}>${total}</Text>
                </View>
            </View>
        )
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Footer //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////
    const _renderFooter = () => {
        let delivery = 0;
        return (
            <View style={styles.footerWrapper}>
                <RoundButton
                    theme={'main'}
                    enabled={total > 0 ? true : false}
                    title={'CHECKOUT'}
                    style={{ backgroundColor: '#fb322d', borderRadius: 5, }}
                    onPress={_ => onCheckOut()}
                />
            </View>
        )
    }

    const _checkPromoCode = async () => {
        let body = {
            'promo_code': promoCode,
        };
        try {
            const response = await fetch(
                `${API_BASE_URL}/${ENV}/promos/check`,
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
            return data;
        } catch (e) {
            console.error('error', e);
            return false;
        }
    };

    // B1A4-C1FE
    // F4B1-E8F2
    const onSubmit = async () => {
        let similarItems = []
        if (promoCode.length > 0) {
            const promoExists = await _checkPromoCode();

            if (promoExists.valid) {
                let itemsInCart = menuItems.map((item, index) => ({ ...item, originalIndex: index })).filter((item) => item.id === promoExists.promo_id && !item.applied_promo);

                if (itemsInCart.length > 0) {
                    let usedCodeAlready = userProfileData.used_promo_list[promoCode] ? userProfileData.used_promo_list[promoCode] > 0 : false

                    if (!usedCodeAlready) {

                        if (promoExists.customer_id == userProfileData.id && promoExists.times_used < 1) {
                            setPromoCodeError('Promotional code must be used by another user first.')
                        } else {
                            let oi = itemsInCart[0].originalIndex

                            let newMenuItems = menuItems.map((item, index) => oi == index ? { ...item, applied_promo: true } : item)
                            let d = menuItems[oi].cost - menuItems[oi].discount

                            setMenuItems(newMenuItems)
                            setCartItems(newMenuItems)
                            setPromoCodes([...promoCodes, promoCode])
                            setPromoCode("")
                            setUserProfileData({ ...userProfileData, used_promo_list: { ...userProfileData.used_promo_list, [promoCode]: 1 } })

                            setDiscount(discount + d)
                        }
                    } else {
                        setPromoCodeError('You\'ve already used this promo code the maximun number of times!')
                    }
                } else {
                    setPromoCodeError('Promo item is either missing from your cart or already has a promo code applied!')
                }
            } else {
                setPromoCodeError('Invalid Promo Code')
            }
        }
    }

    const onCheckOut = async () => {
        navigation.navigate('CheckoutScreen', { items: menuItems, promoCodes: promoCodes, discount: discount, taxRate: customerTaxRate, profile: userProfileData });
    }

    ////////////////////////////////////////////////////////////////////////////
    ////////////////////////////// Render //////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : -500}
        >
            {/* <Timer
                initialParams={{
                    customerId: profile.CustomerId,
                    isUpdateTime: false
                }}
                initialValue={timer}
            >
            </Timer> */}
            <ScrollView contentContainerStyle={{display: 'flex', height: '100%'}}>
                <View style={{flexGrow: 1}}>
                    {_renderMenus()}
                </View>
                <View style={{flexGrow: 1}}>
                    <View style={[Styles.rowCenterBetween, { paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'lightgrey' }]}>
                    <Text style={styles.promoText}>
                        Promo Code:
                    </Text>
                    <RoundTextInput
                        style={{ width: '50%' }}
                        type="text"
                        textAlign={'right'}
                        value={promoCode}
                        errorMessage={promoCodeError}
                        returnKeyType="next"
                        onChangeText={text => {
                            setPromoCode(text)
                            setPromoCodeError('')
                        }}
                    />
                    <TouchableOpacity
                        rounded={true}
                        enabled={promoCodes.length >= 0 ? true : false}
                        style={{ backgroundColor: '#6D64F8', borderRadius: 10, padding: 10 }}
                        onPress={onSubmit}
                    >
                        <Text style={{ color: 'white', fontSize: 14 }}>
                            Submit
                        </Text>
                    </TouchableOpacity>
                    </View>
                    <View style={[styles.item, { paddingBottom: 50 }]}>
                        {availableCredit > 0 ? _renderCredit() : null}
                        {_renderTotal()}
                        {_renderFooter()}
                    </View>
                </View>
            </ScrollView>
            <Loading visible={isLoading} />
        </KeyboardAvoidingView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column', // Default is 'column'
    },
    item: {
        flex: 1
    },
    restaurantWrapper: {
        margin: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
        flexDirection: 'row',
        alignItems: 'center',
    },
    restaurantImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    restaurantInfo: {
        marginLeft: 15,
    },
    restaurantNameText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'black'
    },
    restaurantTypeText: {
        fontSize: 14,
        color: '#7D849A',
    },
    detailImage: {
        width: 15,
        height: 15,
        marginRight: 5,
        resizeMode: 'contain'
    },
    listContainer: {
        marginHorizontal: 15,
        height: 'auto'
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
        flex: 1,
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
        borderRadius: 5
    },
    menuInfo: {
        flex: 4,
        flexDirection: 'column',
        marginLeft: 15,
        marginRigth: 15,
    },
    menuTitleText: {
        flex: 1,
        color: 'black',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        fontSize: 16
    },
    menuPriceText: {
        fontSize: 14,
        color: '#7D849A',
        paddingTop: 10
    },
    rowBack: {
        width: '100%',
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    priceWrapper: {
        flexDirection: 'row',
        // width: sWidth
    },
    priceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 25,
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    priceBtn: {
        width: 30,
        height: 30,
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    priceBtnText: {
        alignItems: 'flex-end',
        color: '#7D849A',
        fontSize: 20,
    },
    editBtn: {
        backgroundColor: '#4bad38',
        width: 60,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderRightWidth: 0.5,
        borderColor: 'white'
    },
    trashBtn: {
        backgroundColor: '#f66b00',
        width: 60,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopRightRadius: 5,
        borderBottomRightRadius: 5
    },
    trashIcon: {
        width: 30,
        height: 30,
        resizeMode: 'contain',
    },
    totalWrapper: {
        paddingTop: 10,
        marginHorizontal: 15,
        paddingBottom: 30
    },
    promoText: {
        color: 'black',
        fontSize: 14
    },
    promoText2: {
        color: 'black',
        fontSize: 14,
        paddingLeft: 5
    },
    subText: {
        color: 'gray',
        fontSize: 14,
    },
    subTotalWrapper: {
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
        marginTop: 20
    },
    totalTitleText: {
        color: 'black',
        fontSize: 15,
        fontWeight: 'bold'
    },
    deliveryTitleText: {
        color: 'black'
    },
    deliveryText: {
        color: 'black',
        fontSize: 14
    },
    discountText: {
        color: '#6D64F8',
        fontSize: 15
    },
    footerWrapper: {
        backgroundColor: 'white',
        padding: 10,
        borderBottomWidth: 1,
        borderColor: '#E2E2E2',
    },
    paymentWrapper: {
        flex: 1,
        width: '100%',
        backgroundColor: 'white',
        alignItems: 'center',
        paddingVertical: 20,
    },
    cardTitleContainer: {
        width: '100%',
        height: 50,
        top: 0,
        zIndex: 3,
    },
    oneRowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    cardContainer: {
        width: '100%',
        height: 170, //320,
    },
    cardMainContainer: {
        top: -125
    },
    cardCover: {
        top: -70,
        position: 'absolute',
        width: '100%',
        backgroundColor: 'white',
        zIndex: 2,
        justifyContent: 'center',
        paddingTop: 55,
        paddingHorizontal: 20,
    },

    sheetTitleText: {
        fontSize: 19,
        marginBottom: 15,
        textAlign: 'center',
        width: '100%'
    },

    sheetCloseButton: {
        position: 'absolute',
        right: 15,
        top: 2,
    },

    sheetCloseImage: {
        width: 22,
        height: 22,
    },

    sheetButton: {
        width: sWidth - 40,
        backgroundColor: '#fb322d',
        borderRadius: 5,
        marginTop: 20,
    },

    errorText: {
        fontStyle: 'italic',
        color: '#cf0000',
        fontSize: 11,
        marginTop: -30,
        textAlign: 'center',
    },
    timerHeader: {
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: '#6D64F8',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    timerText: {
        color: 'white',
        fontSize: 14,
        paddingLeft: 10,
        flex: 5,
    },
    timerTimerText: {
        fontSize: 18,
        color: 'white',
        flex: 1,
    },
});