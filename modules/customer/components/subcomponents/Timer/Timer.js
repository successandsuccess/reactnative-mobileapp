import React, { Component } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-elements';
import CountDown from 'react-native-countdown-fixed';

import { CheckoutContext } from '../../../context/CheckoutContext';

export var promosTimer = 0;
export const setPromosTimer = (timer) => {
    promosTimer = timer;
}

export default class Timer extends Component {
    
    static contextType = CheckoutContext;

    constructor(props) {
        super();
        this.state = {
            customerId: props.initialParams.customerId,
            isUpdateTime: props.initialParams.isUpdateTime,
        };
    }

    render() {
        return (
            <View>
                {
                    this.context.cartHasPromo && (
                        <View style={styles.timerHeader}>
                            <Text style={styles.timerText}>
                                Time left to checkout with promo:
                            </Text>
                            <CountDown
                                size={12}
                                until={this.props.initialValue}
                                onFinish={() => {
                                    let items = this.context.cartItems.map(i => {
                                        if (i.item_type == 'promotions') {
                                            updatePromotionQuantities(i.promo_id, i.quantity, this.state.customerId, false)
                                            return { ...i, quantity: 0 }
                                        } else {
                                            return i
                                        }
                                    })
                                    let cartQ = 0
                                    this.context.cartItems.map(i => cartQ + i.quantity)

                                    this.context.setCartItems(items)
                                    this.context.setCartQuantity(cartQ)
                                    this.context.setCartHasPromo(false)

                                    let cartItemQuantity = items.filter(i => i.quantity > 0)

                                    if (cartItemQuantity.length == 0) {
                                        this.context.setCartHasItem(false)
                                    }
                                }}
                                digitStyle={{ backgroundColor: '#FFF', borderWidth: 2, borderColor: '#1CC625' }}
                                digitTxtStyle={{ color: '#1CC625' }}
                                timeLabelStyle={{ color: 'red', fontWeight: 'bold' }}
                                separatorStyle={{ color: '#1CC625' }}
                                timeToShow={['M', 'S']}
                                timeLabels={{ m: null, s: null }}
                                showSeparator
                                style={styles.timerTimerText}
                                running={!this.context.pause}
                                onChange={value => {
                                    if (this.state.isUpdateTime == true) {
                                        setPromosTimer(value);
                                    }
                                }}
                            />
                        </View>
                    )
                }
            </View>
        )
    }
}

async function updatePromotionQuantities(id, purchased, customer_id, operation) {
    let body = JSON.stringify({
        promo: {
            promo_id: id,
            total_purchased: purchased
        },
        incoming_id: customer_id,
        add: operation
    });
    let response;
    await fetch(
        'https://wwww',
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
    )
        .then(async res => {
            response = await res.json()
        })
        .catch(err => console.error('updatepromotionpurchases', err));
    return response;
}

const styles = StyleSheet.create({
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
        fontSize: 15,
        paddingLeft: 10,
        flex: 5,
    },
    timerTimerText: {
        fontSize: 18,
        color: 'white',
        flex: 1,
        paddingRight: 10
    }
})