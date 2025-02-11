import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Linking
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Text } from 'react-native-elements';
import Loading from 'react-native-loading-spinner-overlay';
import Gif from 'react-native-gif';
import { updateDynamoCustomer } from './subcomponents/ProfileEditor/updateDynamoCustomer';


const Stack = createStackNavigator();


const Help = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState(route.params.user)

  useEffect(() => {
    if (user && user.first_time) {
      let updatedProfile = { ...user, first_time: false }
      console.log(updatedProfile)
      updateDynamoCustomer(updatedProfile)
      console.log(updatedProfile)

      setUser(updatedProfile)
    }
  }, []);

  return (
    <View style={styles.general}>
      <NavigationContainer 
        independent={true}
      >
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Screen1" component={Screen1} />
          <Stack.Screen name="Screen2" component={Screen2} />
          <Stack.Screen name="Screen3" component={Screen3} />
          <Stack.Screen name="Screen4" component={Screen4} />
          <Stack.Screen name="Screen5" component={Screen5} />
        </Stack.Navigator>
      </NavigationContainer>
      <Loading visible={loading} />
    </View>
  );
}

const Screen1 = ({ navigation }) => {

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headerText}>Welcome to Dossiay!</Text>
        <Text style={styles.midText}>You have the fantastic opportunity to become a content creator for businesses.</Text>
        <Text style={styles.midText}>Get ready to unleash your creativity!</Text>
      </View>
      <View style={styles.bottomButtons}>
        <View style={styles.placeholder}></View>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Screen2')}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Screen2 = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.headerText, { fontSize: 18, textAlign: 'center', marginTop: 50 }]}>Get access to order exclusive promotions.</Text>
        <View style={{ paddingBottom: 10, alignItems: 'center' }}>
          {/* Using the 'Gif' component */}
          <Gif
            style={{ width: 200, height: 500 }}
            source={require('./../../assets/LMOrder.gif')}
            resizeMode="cover"
            autoPlay
            loop
          />
        </View>
        <View style={styles.numberedContainer}>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>1.</Text> Select <Text style={{ fontWeight: '600' }}>Add to Cart</Text> to add a promotion to your cart.</Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>2.</Text> When you're ready to purchase, open your cart and <Text style={{ fontWeight: '600' }}>Checkout</Text>.</Text>
        </View>
      </View>
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Screen3')}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Screen3 = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.headerText, { fontSize: 18, textAlign: 'center', marginTop: 50 }]}>Redeem your promotion.</Text>
        <View style={{ paddingBottom: 10, alignItems: 'center' }}>
          {/* Using the 'Gif' component */}
          <Gif
            style={{ width: 200, height: 500 }}
            source={require('./../../assets/LMRedeem.gif')}
            resizeMode="cover"
            autoPlay
            loop
          />
        </View>
        <View style={styles.numberedContainer}>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>1.</Text> Click <Text style={{ fontWeight: '600' }}>Use Promo</Text>.</Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>2.</Text> Provide business your name and order number.</Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>3.</Text> Give the business your four (4) digit code to redeem your purchased promotion.</Text>
        </View>
      </View>
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Screen4')}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Screen4 = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={[styles.headerText, { fontSize: 18, textAlign: 'center', marginTop: 50 }]}>Get access to order exclusive promotions.</Text>
        <View style={{ paddingBottom: 10, alignItems: 'center' }}>
          {/* Using the 'Gif' component */}
          <Gif
            style={{ width: 200, height: 400 }}
            source={require('./../../assets/LMShare.gif')}
            resizeMode="cover"
            autoPlay
            loop
          />
        </View>
        <View style={styles.numberedContainer}>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>1.</Text> Select <Text style={{ fontWeight: '600' }}>Share</Text> to see your personal promo code.</Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>2.</Text> Create content and post your code on your social media.</Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>3.</Text> Anyone that uses your promo code to purchase a promotion will get a discount.</Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>4.</Text> Earn up to 10% commission each time your promo code is used to purchase a promo on Dossiay!<Text style={{ fontWeight: '600' }}> *</Text></Text>
          <Text style={styles.listItem}><Text style={{ fontWeight: '600' }}>*</Text> Commision is applied to the Promotional Sale Price.</Text>
        </View>
      </View>
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Screen5')}
        >
          <Text style={styles.buttonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Screen5 = ({ navigation, route, user }) => {

  const email = 'support@dossiay.com'

  const handleEmailPress = () => {
    const mailtoLink = `mailto:${email}`;
    Linking.openURL(mailtoLink);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.headerText}>Congratulations!</Text>
        <Text style={styles.midText}>You're now ready to be a Dossiay content creator and earn!</Text>
        <Text style={styles.midText}>For more help, please contact <Text style={{ fontWeight: '600' }} onPress={handleEmailPress}>{email}</Text></Text>
      </View>
      <View style={styles.bottomButtons}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  general: {
    flex: 1,
    paddingLeft: 20,
    paddingRight: 20,
    textAlign: 'center',
    backgroundColor: 'white'

  },
  container: {
    flex: 2,
    justifyContent: 'space-between',
    backgroundColor: 'white'
  },
  placeholder: {
    flex: 1, // Takes up the space for the "Back" button
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
    paddingHorizontal: 30
  },
  button: {
    backgroundColor: 'white',
    borderColor: '#979797',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 80,
  },
  buttonText: {
    textAlign: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  midText: {
    fontSize: 16,
    marginVertical: 20,
  },
  numberedContainer: {
    maxWidth: 400, // Set a maximum width for the container
    marginHorizontal: 'auto', // Center the container horizontally
    marginTop: 10
  },
  listItem: {
    fontSize: 14,
    textAlign: 'left', // Align text to the left
    lineHeight: 20, // Adjust line height for spacing
    marginBottom: 10, // Add bottom margin between list items
  },
})

export default Help;