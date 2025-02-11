/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
import React, { useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Customer from "./modules/customer/Customer";
import AppAuth from "./modules/navigation";
import CheckoutContext from "./modules/customer/context/CheckoutContext";
import Cart from "./modules/customer/components/subcomponents/Cart/Cart"
import CheckoutScreen from './modules/customer/components/subcomponents/CheckoutScreen'
import { StripeProvider } from '@stripe/stripe-react-native';
import { STRIPE_PUB_KEY } from "./constants";
import { useStripe } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking"

export const navigationRef = React.createRef();

export function navigate(name, params) {
  if (navigationRef && navigationRef.current) {
    navigationRef.current?.navigate(name, params);
  }
}

const Stack = createStackNavigator();


const App = () => {
  const {handleURLCallback } = useStripe();

  // Handle callback linking
  const url = Linking.useURL();
  useEffect(() => {
    handleURLCallback(url)
      .then(isHandledByStripe => {
        if (isHandledByStripe) return
        if (!url) return
        const { hostname, path, queryParams } = Linking.parse(url)
        console.log(`Received link to app with the following:\n${JSON.stringify({hostname, path, queryParams}, undefined, 2)}`)
        console.log("...")
        console.log("...")
        console.log("...")
        console.log("¯\\_(ツ)_/¯")
      })
  }, [url])

  return (
    <StripeProvider
      publishableKey={STRIPE_PUB_KEY}
      // merchantIdentifier="merchant.com.{{YOUR_APP_NAME}}" // required for Apple Pay
    >
      <CheckoutContext>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            screenOptions={{
              gesturesEnabled: true,
            }}
          >
            <Stack.Screen
              name="Login/Register"
              component={AppAuth}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Dashboard"
              initialParams={{ isLoggedOut: true }}
              component={Customer}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Cart"
              component={Cart}
              options={{
                headerShown: true,
                title: 'Cart',
                headerBackTitle: 'Back', // Customize the back button text
              }}
            />
            <Stack.Screen
              name="CheckoutScreen"
              component={CheckoutScreen}
              options={{
                headerShown: true,
                title: 'CheckoutScreen',
                headerBackTitle: 'Back', // Customize the back button text
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </CheckoutContext>
    </StripeProvider>
  );
};

export default App;
