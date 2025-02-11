import React, { useContext } from 'react';
import { View, StyleSheet } from 'react-native';

import RoundButton from '../RoundButton';
import { CheckoutContext } from '../../../context/CheckoutContext';
import { promosTimer } from '../Timer/Timer';


export default function CartButton(props) {

    const { cartQuantity, setCartQuantity, cartItems } = useContext(CheckoutContext)

    return (
        <View
            style={{
                ...styles.footerWrapper,
                display: cartQuantity > 0 ? 'flex' : 'none'
            }}>
            <RoundButton
                theme={'main'}
                enabled={true}
                title={`CART (` + cartQuantity + `)`}
                style={{ backgroundColor: '#fb322d', }}
                size={'large'}
                onPress={() => {
                    props.navigation.navigate('Cart', {
                        promosTimer: promosTimer - 1,
                        user: props.user,
                        items: cartItems
                    })
                }}
                icon={{
                    name: 'cart',
                    type: 'ionicon',
                }}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    footerWrapper: {
        width: '100%',
        backgroundColor: 'white',
        padding: 10,
        borderColor: '#E2E2E2',
    },
})