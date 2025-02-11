import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ImageBackground,
  RefreshControl
} from 'react-native';
import { Icon, Card, Button } from 'react-native-elements';
import { createStackNavigator } from '@react-navigation/stack';
import { Auth } from 'aws-amplify';
import Loading from 'react-native-loading-spinner-overlay';
import moment from "moment";
import Modal from 'react-native-modal';
import QRCode from 'react-native-qrcode-svg';

import OrderDetails from './OrderDetails/OrderDetails';
import { API_BASE_URL, ENV } from '../../../constants';


const Stack = createStackNavigator();

export default class Orders extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      restaurants: {},
    };
  }

  render() {
    return (
      <Stack.Navigator intialRouteName="Orders">
        <Stack.Screen
          name="OrdersList"
          component={OrdersList}
          initialParams={{}}
          options={({ navigation }) => ({
            title: 'Orders',
            headerStyle: {
              backgroundColor: '#fff',
            },
            headerTitleStyle: {
              color: 'black',
            },
            headerTitleAlign: 'center',
            headerTintColor: '#E82800',
          })}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetails}
          options={({ navigation }) => ({
            title: "Order Details",
            headerTitleStyle: {
              color: "black",
            },
            headerTitleAlign: "center",
            headerTintColor: "#E82800",
          })}
        />
      </Stack.Navigator>
    );
  }
}

function OrdersList({ navigation, route }) {

  const [orders, setOrders] = useState([]);
  const [activeOrders, setActiveOrders] = useState([]);
  const [usedOrders, setUsedOrders] = useState([])
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [restuarants, setRestaurants] = useState([])
  const [refreshing, setRefreshing] = useState(false);


  useEffect(() => {
    Auth.currentUserInfo().then(info => {
      setUserId(info.username)
      getOrders(info.username)
    });

  }, []);

  const getOrders = async (username) => {

    const response = await fetch(
      `${API_BASE_URL}/${ENV}/orders?id=${username}`,
      {
        method: 'GET',
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
    )

    let data = await response.json();

    let orders = data.sort((a, b) => {
      if (b.end_time - a.end_time > 0) {
        return true;
      } else if (b.end_time == a.end_time) {
        if (b.title > a.title) {
          return true;
        } else {
          return false;
        }
      } else {
        return false;
      }
    });

    const usedOrders = orders.filter((order) => {
      return order.used
    })
    const activeOrders = orders.filter((order) => {
      return !order.used
    })
    setLoading(false)
    setActiveOrders(activeOrders);
    setUsedOrders(usedOrders)
    setOrders(orders)
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await Auth.currentUserInfo().then(info => {
      getOrders(info.username)
    });
    setRefreshing(false);
  };

  return (
    <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flex: 1 }}>
        <Text h2 style={styles.orderHeadings}>
          {'Active Promotions (' + activeOrders.length + ')'}
        </Text>
        {activeOrders && activeOrders.map((promo, index) => {
          return (
            <OrderScreenItem
              key={index}
              promotion={promo}
              rest_name={promo.restaurant_name}
              validity={(promo.end_time - Date.now()) > 0 ? "active" : ""}
              navigation={navigation}
            />
          );
        })}
        <Text h2 style={[styles.orderHeadings, { marginTop: 20 }]}>
          {'Promotion History'}
        </Text>
        <View style={{ flex: 1, minHeight: 200, paddingTop: 5 }}>
          {usedOrders.map((order, index) => {
            return (
              <TouchableOpacity
                style={styles.order}
                onPress={() => {
                  navigation.navigate('OrderDetails', {
                    ordersList: orders,
                    order: order,
                  });
                }}>
                <View key={'completed_order_display_' + index}>
                  <Text h4 style={styles.dropoffName}>
                    <Text style={{ fontWeight: 'bold' }}>{order.restaurant_name}</Text>: {order.title}
                  </Text>
                  <Text h2 style={styles.orderPrice}>
                    Order ID: {order.id}
                  </Text>
                </View>
              </TouchableOpacity>
            );

          })}
        </View>
      </View>
      <Loading visible={loading} />
    </ScrollView>
  );
}

const OrderScreenItem = ({ promotion, rest_name, validity, navigation }) => {
  const [visible, setVisible] = useState(false);
  const [shareVisble, setShareVisible] = useState(false);
  const [code, setCode] = useState("")

  const generateCode = () => {
    let random = Math.floor(1000 + Math.random() * 9000)
    setCode(random)

    const saveCode = async (c) => {
      let body = {
        customer_id: promotion.customer_id,
        code: c,
        order_id: promotion.id,
        promo_id: promotion.promo_id,
      };

      const response = await fetch(
        `${API_BASE_URL}/${ENV}/code`,
        {
          method: 'POST',
          mode: 'cors', // no-cors, *cors, same-origin
          cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
          credentials: 'same-origin', // include, *same-origin, omit
          headers: {
            'Content-Type': 'application/json',
            'Connection': 'keep-alive',
          },
          redirect: 'follow', // manual, *follow, error
          referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
          body: JSON.stringify(body)
        },
      )
      let data = await response.json();
    }

    saveCode(random)
  }

  useEffect(() => {
    generateCode()
  }, []);

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
          </View>
          <View style={[styles.containerItem]}>
            <Text style={[styles.subtitleStyle, { fontWeight: 'bold' }]}>
              {rest_name}
            </Text>
            <Text style={[styles.subtitleStyle, { flex: 1, textAlign: 'right' }]}>
              Exp: {moment(new Date(parseInt(promotion.end_time))).format('MM/DD/YYYY')}
            </Text>
          </View>
          <View style={[styles.containerItem, { paddingVertical: 5 }]}>
            <Text style={[styles.subtitleStyle, { flex: 3 }]}>
              {promotion.description}
            </Text>
            {/* <Text style={[styles.subtitleStyle, { color: '#F1695F', flex: 1, textAlign: 'right' }]}>
              ${promotion.cost.toFixed(2)} value
            </Text> */}
          </View>
          <View style={[styles.containerItem, { paddingBottom: 5 }]}>
            <Button
              buttonStyle={[styles.shareButtonStyle, { backgroundColor: '#e8e8e8' }]}
              style={{ alignItems: 'center' }}
              title="Use Promo"
              titleStyle={{ fontWeight: '500', color: 'black', }}

              onPress={() => {
                setShareVisible(true);
                // if (loggedIn) {
                //   setShareVisible(true);
                //   sharePromo();
                // } else {
                //   Alert.alert("Create an account or login to access promotions and orders.")
                // }
              }}
            />
          </View>
        </View>
      </Card>
      <Modal
        isVisible={shareVisble}
        onBackdropPress={() => { setShareVisible(false); }}
        style={{ justifyContent: 'flex-end', margin: 0 }}>
        <View style={[styles.shareModalStyle]}>
          <View style={{ width: '85%', alignSelf: 'center' }}>
            <Text style={[styles.headerStyle]}>
              <Text style={{ fontWeight: 'bold' }}>To Redeem:</Text>
            </Text>
            <Text>
              <Text style={[styles.headerStyle]}>Step 1:</Text>
            </Text>
            <Text style={{ paddingVertical: 10, fontSize: 16 }}>
              {'\tProvide your name and order number:'}
            </Text>
            <Text style={{ paddingVertical: 10, textAlign: 'center', fontSize: 24, }}>
              {promotion.id}
            </Text>
            <Text>
              <Text style={[styles.headerStyle]}>Step 2:</Text>
            </Text>
            <Text style={{ paddingVertical: 10, fontSize: 16 }}>
              {'\tGive business your 4 digit code:'}
            </Text>
            <Text style={{ paddingVertical: 10, textAlign: 'center', fontSize: 24, }}>
              {code}
            </Text>
          </View>
        </View>
      </Modal>
    </TouchableOpacity >
  );
};

const styles = StyleSheet.create({
  general: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  containerItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  order: {
    borderBottomWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  orderHeadings: {
    textAlign: 'center',
    color: '#E82800',
    padding: 10,
    fontWeight: '600',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    // fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 10,
    marginTop: 10,
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 16,
    marginTop: 10,
  },
  orderItemCount: {
    marginLeft: 10,
    marginBottom: 5,
    fontSize: 15,
  },
  orderPrice: {
    textAlign: 'right',
    fontSize: 14,
    // fontWeight: 'bold',
    color: '#313131',
    marginRight: 10,
    marginTop: 5,
    marginBottom: 15,
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
  shareModalStyle: {
    backgroundColor: '#f4f4f4',
    height: '60%',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },
  subtitleStyle: {
    color: '#888E94',
    fontSize: 14,
    paddingHorizontal: 5
  },
  headerStyle: {
    fontSize: 18,
    alignSelf: 'center',
    paddingTop: 30,
    paddingBottom: 20
  },
  orderSubtitleStyle: {
    color: '#888E94',
    fontSize: 18,
    alignSelf: 'center',
    paddingBottom: 20
  },
  qrcode: {
    alignSelf: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: '10%'
  },
  input: {
    width: 50,
    height: 50,
    borderBottomWidth: 2,
    textAlign: 'center',
    fontSize: 24,
  }
});
