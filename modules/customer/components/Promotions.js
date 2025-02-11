import React, { useState, useContext, useEffect } from 'react';
import {
  ActivityIndicator,
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageBackground,
  Linking,
  Alert,
  RefreshControl,
  FlatList
} from 'react-native';
import { Icon, Text, Card, Button } from 'react-native-elements';
import { createStackNavigator } from '@react-navigation/stack';
import { RFValue } from 'react-native-responsive-fontsize';
import moment from 'moment';
import md5 from 'md5';
import Clipboard from '@react-native-community/clipboard'
// import Share from 'react-native-share';
import Modal from 'react-native-modal';
import { API_BASE_URL, BUSINESS_CATEGORIES, ENV } from "../../../constants"
import Popup from './subcomponents/Popup'


import { CheckoutContext } from '../context/CheckoutContext';
import { default as CartButton } from './subcomponents/Cart/CartButton'
import { updatePromoRef } from './updatePromoRef'

const Stack = createStackNavigator();
let loggedIn = false

async function getPromos() {
  const response = await fetch(
    `${API_BASE_URL}/${ENV}/promos`,
    {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    },
  );
  let dataResponse = await response.json(); // parses JSON response into native JavaScript objects
  return dataResponse;
}

async function getRestaurants() {
  const response = await fetch(
    `${API_BASE_URL}/${ENV}/restaurants`,
    {
      method: 'GET', // *GET, POST, PUT, DELETE, etc.
      mode: 'cors', // no-cors, *cors, same-origin
      cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
      credentials: 'same-origin', // include, *same-origin, omit
      headers: {
        'Content-Type': 'application/json',
        'Connection': 'keep-alive',
      },
      redirect: 'follow', // manual, *follow, error
      referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
    },
  );
  let dataResponse = await response.json(); // parses JSON response into native JavaScript objects

  return dataResponse;
}

export default function Promotion({ route }) {
  loggedIn = !route.params.isLoggedOut

  return (
    <Stack.Navigator initialRouteName="PromotionDisplay">
      <Stack.Screen
        headerShown="false"
        name="PromotionDisplay"
        component={PromotionScreen}
        initialParams={{
          restaurantList: route.params.restaurants,
          profile: route.params.user
        }}
        options={{
          headerTitleAlign: 'center',
          headerTitle: 'Promotions',
        }}
      />
    </Stack.Navigator>
  );
}

const PromotionScreen = ({ navigation, route }) => {
  const [promos, setPromos] = useState([])
  const [restaurants, setRestaurants] = useState([])
  const [profile] = useState(route.params.profile)
  const [helpVisible, setHelpVisible] = useState(false)
  const [categoryFilters, setCategoryFilters] = useState(["Restaurant"])

  const [isLoading, setIsLoading] = useState(false)

  const openPopup = () => setHelpVisible(true);
  const closePopup = () => setHelpVisible(false);


  const promoFetch = async () => {
    // Your async logic here
    // For example, setTimeout to simulate fetching data
    setIsLoading(true)
    let promos = await getPromos()
    setIsLoading(false)
    setPromos(promos)
  };

  useEffect(() => {
    let ft = route.params.profile?.first_time || false

    // Simulating an asynchronous operation
    const restaurantFetch = async () => {
      let restaurants = await getRestaurants()
      setRestaurants(restaurants)
    }

    promoFetch()
    restaurantFetch()

    if (ft) {
      openPopup()
    }
  }, []);

  // console.log("Expired Promos:", JSON.stringify(promos.map(promo => (promo.end_time - (new Date()))/1000/60/60/24).filter(timeLeft => timeLeft < 0), undefined, 2))
  let activeList = promos.filter(promo => promo.end_time >= (new Date()).getTime());
  let expList = promos.filter(promo => promo.end_time < (new Date()).getTime());
  let soldList = activeList?.filter(promo => promo.limit <= promo.total_purchased);
  activeList = activeList?.filter(promo => promo.limit > promo.total_purchased);
  activeList = activeList?.sort((a, b) => a.end_time >= b.end_time);
  expList = expList?.sort((a, b) => a.end_time < b.end_time);
  soldList = soldList?.sort((a, b) => a.end_time < b.end_time);

  // console.log("Restaurants: ", JSON.stringify(restaurants.map(({name, id, category}) => ({name, id, category}))))
  const activePromoList = activeList.map(promo => {
    const restaurant = restaurants.find(restaurant => restaurant.id === promo.restaurant_id)??{}
    const {name: restaurantName, category } = restaurant;

    return {
      ...promo,
      restaurantName,
      category,
      restaurant,
    }
  }).filter(promo => categoryFilters.includes(promo.category))
  // console.log("Active Promos:\n", JSON.stringify(activePromoList, undefined, 2))

  const { cartQuantity, setCartQuantity, setCartHasItem, setCartHasPromo, cartItems, setCartItems, setTime } = useContext(CheckoutContext);
  const addToCart = (item, timesUsed) => {
    let itemInCart = cartItems.find(i => i.id == item.id)
    let amountInCart = itemInCart?.quantity ?? 0;
    let purchasedBefore = 0
    if ('used_promo_list' in profile && profile.used_promo_list.hasOwnProperty(item.id)) {
      purchasedBefore = profile.used_promo_list[item.id]
    }
    
    let canPurchaseNumber = Math.min((item.limit - item.total_ref_used - item.total_purchased), item.max_uses - amountInCart - purchasedBefore)

    if (canPurchaseNumber > 0) {
      setCartHasItem(true)
      setCartHasPromo(true)
 
      if (itemInCart) {
        itemInCart.quantity += 1;
      } else {
        newItems = [...cartItems, { ...item, quantity: 1, applied_promo: false }]
      }

      setCartItems(newItems)

      setCartQuantity(cartQuantity + 1)
      updatePromoRef(1, item)
    }
  }

  // console.log(JSON.stringify({activeList: activeList.map(({title, description, cost, discount, start_time, end_time, restaurant_id}) => ({title, description, cost, discount, start_time, end_time, restaurant_id}))}, undefined, 2))
  return (
    <>
      {isLoading ? (
        <View style={[styles.horizontal]}>
          <ActivityIndicator size="large" color="#F86D64" />
        </View>
      ) : (
        <>
          <ScrollView 
            horizontal 
            style={{
              marginHorizontal: 20, 
              borderBottomWidth: 2,
              paddingVertical: 10,
              flexGrow: 0,
            }}
            indicatorStyle='black'
            showsHorizontalScrollIndicator={true}
          >
            {BUSINESS_CATEGORIES.map(category => (
              <Button
                key={category}
                buttonStyle={{ 
                  borderRadius: 15, 
                  marginHorizontal: 5,
                  padding: 10
                }}
                type={categoryFilters.includes(category) ? 'solid' : 'outline'}
                title={category}
                onPress={() => {
                  if (categoryFilters.includes(category)) {
                    setCategoryFilters(categoryFilters.filter(c => c !== category))
                  } else {
                    setCategoryFilters([...categoryFilters, category])
                  }
                }}
              />
            ))}
          </ScrollView>
          <FlatList
            data={activePromoList}
            renderItem={({item: promo}) => (
              <PromotionScreenItem
                key={promo.id}
                promotion={promo}
                profile={profile}
                rest_name={promo.restaurantName??''}
                validity="active"
                curr_restaurant={promo.restaurant}
                navigation={navigation}
                addToCart={addToCart}
              />
            )}
            refreshControl={<RefreshControl refreshing={isLoading} onRefresh={promoFetch} />}
          >
          </FlatList>
          <CartButton navigation={navigation} CheckoutContext={CheckoutContext} user={profile} />
          <Popup visible={helpVisible} onClose={closePopup} navigation={navigation} />
        </>
      )}
    </>

  );
};

const PromotionScreenItem = ({ promotion, profile, rest_name, validity, curr_restaurant, navigation, addToCart }) => {

  let purchasedBefore = 0
  if ('used_promo_list' in profile && profile.used_promo_list.hasOwnProperty(promotion.id)) {
    purchasedBefore = profile.used_promo_list[promotion.id]
  }

  const getCode = () => {
    return md5(
      promotion.restaurant_id +
      promotion.title +
      promotion.discount +
      profile?.CustomerId,
    ).substr(0, 3);
  };

  const [visible, setVisible] = useState(false);

  const [shareVisble, setShareVisible] = useState(false);
  const cards = profile?.paymentOptions?.cards;
  const [select, setSelect] = useState('');

  const code = getCode();

  const [promoCode, setPromoCode] = useState('Loading ...')
  const [copiedText, setCopiedText] = useState('')
  const [purchaseDisabled] = useState(!loggedIn)
  const [timesUsed, setTimesUsed] = useState(0)
  const [eligableToPurchase, setEligableToPurchase] = useState(
    String(Math.max((Math.min((promotion.limit - promotion.total_ref_used - promotion.total_purchased), promotion.max_uses - purchasedBefore)), 0))
  )

  useEffect(() => {
    sharePromo();
  }, [])

  useEffect(() => {
    setEligableToPurchase(String(Math.max((Math.min((promotion.limit - promotion.total_ref_used - promotion.total_purchased), promotion.max_uses - purchasedBefore)), 0)))
  }, [timesUsed])

  const overuseAlert = () =>
    Alert.alert(
      "Promo Limit Reached",
      "You have reached the limit of purchasing this promotion.",
      [
        { text: "OK", onPress: () => console.log("OK Pressed") }
      ]
    );

  const copyToClipboard = () => {
    Clipboard.setString(promoCode)
    setCopiedText('Code Copied!')
  }

  const sharePromo = async () => {
    try {
      let body = {
        'promo_id': promotion.id,
        'cust_id': profile?.id,
      };
      const response = await fetch(
        `${API_BASE_URL}/${ENV}/promos/share`,
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
      setPromoCode(data['code']);
      setTimesUsed(data['times_used'])
    } catch (e) {
      console.error('error', e);
    }
  };

  
  return (
    <TouchableOpacity
      key={
        rest_name +
        '_' +
        promotion.promo_id
      }
      activeOpacity={1}
      style={{}}
    >
      <Card containerStyle={[styles.cardStyle, (validity != "active" && styles.expiredStyle)]}>

        <View style={styles.imageStyle}>
          <ImageBackground
            source={promotion.content_id && promotion.content_id != '' ? { uri: promotion.content_id } : null}
            resizeMode='cover'
            style={[styles.imageStyle, { height: 100 }]} // Change resize mode based on requirements
            imageStyle={styles.imageStyle}
          >
          </ImageBackground>
        </View>

        <View style={{ paddingHorizontal: 15, paddingTop: 5 }}>
          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={styles.restaurantName}>
              {promotion.title}
            </Text>
            {(validity == "active" && promotion.limit != 0 && promotion.total_purchased / (Math.floor(promotion.budget / (promotion.discount * 0.3))) >= 0.75 &&
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Icon
                  name={'star'}
                  size={10}
                  color={'#F1695F'}
                  solid={true}
                  type={'font-awesome'}
                  style={{ paddingRight: 4 }}
                />
                <Text style={[styles.subtitleStyle, { fontWeight: 'bold', color: '#F1695F', fontStyle: 'italic' }]}>
                  Few Left!
                </Text>
              </View>)}
          </View>

          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={[styles.subtitleStyle, { fontWeight: 'bold' }]}>
              {rest_name}
            </Text>
            <Text style={[styles.subtitleStyle, { flex: 1, textAlign: 'right' }]}>
              Exp: {moment(new Date(parseInt(promotion.end_time))).format('MM/DD/YYYY')}
            </Text>
          </View>

          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Text style={[styles.subtitleStyle, { flex: 3 }]}>
              {promotion.description}
            </Text>
            <Text style={[styles.subtitleStyle, { color: 'black', flex: 1, textAlign: 'right' }]}>
              ${promotion.cost.toFixed(2)}
            </Text>
          </View>
          {
            (validity == "sold")
              ? <View style={[styles.containerItem, { marginTop: 10, justifyContent: 'center' }]}>
                <Text style={[styles.subtitleStyle, { color: 'black', fontSize: 18 }]}>Sold Out</Text>
              </View>
              : (validity == "expired")
                ? <View style={[styles.containerItem, { marginTop: 10, justifyContent: 'center' }]}>
                  <Text style={[styles.subtitleStyle, { color: 'black', fontSize: 18 }]}>Expired</Text>
                </View>
                :
                <View style={[styles.containerItem]}>
                  <Button
                    buttonStyle={[styles.shareButtonStyle, { backgroundColor: '#e8e8e8' }]}
                    style={{ alignItems: 'center' }}
                    title="Share"
                    titleStyle={{ fontWeight: '500', color: 'black', }}
                    disabled={!loggedIn}
                    onPress={() => {
                      if (loggedIn) {
                        setShareVisible(true);
                      } else {
                        Alert.alert("Create an account or login to access promotions and orders.")
                      }
                    }}
                  />
                  {/* <View style={{flex: 1}}></View> */}
                  <Button
                    buttonStyle={[styles.shareButtonStyle, { backgroundColor: '#e8e8e8' }]}
                    style={{ alignItems: 'center' }}
                    title="Purchase"
                    disabled={(purchaseDisabled || eligableToPurchase < 1)}
                    titleStyle={{ fontWeight: '500', color: 'black', }}
                    onPress={() => {
                      if (loggedIn) {
                        addToCart(promotion, timesUsed)
                      } else {
                        Alert.alert("Create an account or login to access promotions and orders.")
                      }
                    }}
                  />
                </View>
          }
          {loggedIn && (
            <Text style={styles.disabledMessage}>Total times your code was used: {timesUsed}</Text>
          )}
          {(loggedIn && !eligableToPurchase && promotion.total_purchased <= 0) && (
            <Text style={styles.disabledMessage}>You can only purchase this promo when 'total purchased using your code' is greater than 0.</Text>
          )}
          {/* {(loggedIn && !eligableToPurchase && promotion.total_ref_used >= promotion.max_uses) && (
            <Text style={styles.disabledMessage}>You have purchased the maximum amount: {promotion.total_ref_used}</Text>
          )} */}
          {(loggedIn && eligableToPurchase) && (
            <Text style={styles.disabledMessage}>Limit {eligableToPurchase} per user</Text>
          )}
          {(!loggedIn) && (
            <Text style={styles.disabledMessage}>Please login/register to manage promotions!</Text>
          )}
        </View>
      </Card>
      <Modal
        isVisible={shareVisble}
        onBackdropPress={() => { setShareVisible(false); setCopiedText('') }}
        style={{ justifyContent: 'flex-end', margin: 0 }}>
        <View style={[styles.shareModalStyle]}>
          {!promotion.content_id
            ?
            <Text style={{
              textAlign: 'center', fontSize: 20, paddingTop: 30, fontStyle: 'italic',
            }}>{rest_name}</Text>
            :
            <View>
              <ImageBackground
                source={{ uri: promotion.content_id }}
                resizeMode='cover'
                style={[styles.imageStyle, { height: 150, padding: 2, justifyContent: 'flex-end' }]} // Change resize mode based on requirements
                imageStyle={[styles.imageStyle]}
              >
              </ImageBackground>
              <Text style={{
                textAlign: 'center', fontSize: 20, fontStyle: 'italic', paddingTop: 10,
              }}>{rest_name}</Text>
            </View>
          }

          <View style={{}}>
            <Text style={{ textAlign: 'center', fontSize: 22, padding: 10, fontWeight: 'bold' }}>{promotion.title}</Text>
            <Text style={{ textAlign: 'center', }}>
              Promotion Discount Price: ${promotion.discount}
            </Text>
            <Text style={{ textAlign: 'center' }}>Details: {promotion.description}</Text>
          </View>
          <View>
            <Text style={{ textAlign: 'center', padding: 10, fontSize: 20, marginTop: 30, fontWeight: 'bold' }}>Copy your Promo Code</Text>
          </View>
          <View>
            <TouchableOpacity
              style={{ borderWidth: 2, borderStyle: 'dotted', borderRadius: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15, marginHorizontal: 50 }}
              onPress={() => copyToClipboard()}
            >
              {
                promoCode == 'Loading ...'
                  ? <Text style={{ textAlign: 'center', fontStyle: 'italic' }}>{promoCode}</Text>
                  : <Text style={{ textAlign: 'center', color: 'black' }}>{promoCode}</Text>
              }
            </TouchableOpacity>
            <Text style={{ textAlign: 'center', padding: 10, fontSize: 10, fontStyle: 'italic', color: '#8BBB81' }}>{copiedText}</Text>
          </View>
          <View>
            <Text style={{ textAlign: 'center', padding: 10, fontSize: 20, fontWeight: 'bold' }}>Share to Others!</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: 20 }}>
              <TouchableOpacity
                style={{ borderWidth: 2, borderRightWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15, borderTopLeftRadius: 15, borderBottomLeftRadius: 15 }}
                onPress={() =>
                  Linking.openURL(`fb://profile/61559962252315`)
                    .catch(() => {
                      Linking.openURL('https://www.facebook.com/people/Dossiay/61559962252315/');
                    })
                }
              >
                <Icon
                  name={'social-facebook'}
                  size={40}
                  color={'#000000'}
                  solid={true}
                  type={'simple-line-icon'}
                  style={{ padding: 10, }}
                />

              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15 }}
                onPress={() =>
                  Linking.openURL(`instagram://user?username=dossiay`)
                    .catch(() => {
                      Linking.openURL('https://www.instagram.com/dossiay');
                    })
                }
              >
                <Icon
                  name={'social-instagram'}
                  size={40}
                  color={'#000000'}
                  solid={true}
                  type={'simple-line-icon'}
                  style={{ padding: 10, }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ justifyContent: 'center', borderWidth: 2, borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 20 }}
                onPress={() =>
                  Linking.openURL(`tiktok://@dossiay`)
                    .catch(() => {
                      Linking.openURL(`https://www.tiktok.com/@dossiay?_t=8jFYpT9WLoA&_r=1`);
                    })
                }
              >
                <Image
                  source={require('../../assets/tik-tok.png')} // Replace with the path to your image
                  style={{ width: 40, height: 40, padding: 15, alignItems: 'center' }}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={{ borderWidth: 2, borderLeftWidth: 1, borderColor: '#e9e9e9', backgroundColor: '#ffffff', padding: 15, borderTopRightRadius: 15, borderBottomRightRadius: 15 }}
                onPress={() =>
                  Share.open({
                    title:
                      promotion.title +
                      ' on ' +
                      rest_name,
                    message: promotion.description,
                  })
                }
              >
                <Icon
                  name={'options'}
                  size={40}
                  color={'#000000'}
                  solid={true}
                  type={'simple-line-icon'}
                  style={{ padding: 10, }}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
};




const styles = StyleSheet.create({
  horizontal: {
    paddingTop: '50%'
  },
  shareModalStyle: {
    backgroundColor: '#f4f4f4',
    height: '80%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  restaurantName: {
    color: '#111C26',
    fontSize: 18,
    fontWeight: "bold",
    paddingVertical: 5,
  },
  subtitleStyle: {
    color: 'black',
    fontSize: 14,
    paddingHorizontal: 5
  },
  buttonStyle: {
    backgroundColor: '#E82800',
    paddingTop: 5,
    paddingBottom: 5,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center'
  },
  shareButtonStyle: {
    flex: 1,
    backgroundColor: '#E82800',
    paddingTop: 5,
    paddingBottom: 5,
    paddingHorizontal: 40,
    marginHorizontal: 10,
    marginTop: 5,
    borderRadius: 5,
  },
  orderHeadings: {
    textAlign: 'center',
    color: '#03a5fc',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  promotionItem: {
    backgroundColor: 'white',
    marginBottom: 3,
    display: 'flex',
    flexDirection: 'row',
    padding: 5,
  },
  containerItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  modalInside: {
    backgroundColor: 'white',
    alignItems: 'center',
    padding: 5,
    paddingTop: 15,
    paddingBottom: 15,
    borderTopRightRadius: 15,
    borderTopLeftRadius: 15,
  },
  cardcontainer: {
    padding: 5,
    paddingLeft: 15,
    paddingRight: 15,
    backgroundColor: 'white',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#979797',
    display: 'flex',
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
    marginLeft: 15,
    marginRight: 15,
  },
  check: {
    width: RFValue(30, 580),
    height: RFValue(30, 580),
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: RFValue(15, 580),
    borderWidth: 1,
    borderColor: '#F86D64',
  },
  cardStyle: {
    backgroundColor: '#ffffff',
    opacity: 1,
    shadowOpacity: 0,
    borderWidth: 0,
    padding: 0,
    margin: 30,
    borderRadius: 10,
    paddingBottom: 15,
  },
  imageStyle: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  expiredStyle: {
    opacity: 0.5,
  },
  disabledMessage: {
    paddingTop: 10,
    alignSelf: 'center'
  }
});
