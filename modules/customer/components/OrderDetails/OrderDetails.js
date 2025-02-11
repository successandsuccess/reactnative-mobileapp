import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ButtonGroup, Text } from 'react-native-elements';
import { API_BASE_URL } from '../../../../constants';

export default function OrderDetails({navigation, route}) {
  console.log(JSON.stringify(route, undefined, 2))

  const [ordersList, setOrdersList] = useState(route.params.ordersList)
  const [order, setOrder] = useState(route.params.order)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const [intervalRef, setIntervalRef] = useState(0)

  // 60s timer for fetch polling
  const timeout = 60000;

  function initiatePolling() {
    const newIntervalRef = setInterval(async() => {
      setLoading(true)

      let body = {
        incoming_id: order.customer_id
      }

      const resp = await fetch(
        `${API_BASE_URL}/${ENV}/customerorders`,
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
          body: JSON.stringify(body),
        }
      ).catch(err => {
        console.error('POST /custmoerorders response err: ', err)
        setLoading(false)
      })

      const orders = await resp.json()

      console.log("⚠️⚠️", orders);

      /**
       * @type {Object[]}
       */
      const acceptedOrders = orders.filter(({order_status}) => order_status !== 'Rejected')
      const updatedOrder = acceptedOrders.find(({order_status}) => order_status === order.order_id)

      setOrder(updatedOrder)
      setLoading(false)
    }, timeout)

    setIntervalRef(newIntervalRef)
  }

  const checkForItemDescription = (item) => (
    item.itemDescription !== '' ? (
      <Text style={styles.orderDetailsItemDescription}>
        {item.itemDescription}
      </Text>
    ) : (
      <>
      </>
    )
  );

  const checkForSpecialInstructions = (item) => (
    item.specialInstructions !== '' ? (
      <Text style={styles.orderDetailsSpecialInstructions}>
        {'Special Instructions: ' + item.instructions}
      </Text>
    ) : (
      <></>
    )
  )
  
  useEffect(() => {
    initiatePolling()

    return () => {
      console.log('#### unmount ####')
      clearInterval(intervalRef)
    }
  }, [])


  const itemCount = (order.menu_items??[{quantity: 1}]).reduce((sumCount, item) => sumCount + (parseInt(item.quantity) ?? 1), 0)

  return (
    <View style={styles.general}>
      <View style={styles.orderDetailsHeader}>
        <Text h4 style={styles.dropoffName}>
          {order.restaurant_name}
        </Text>
        <Text h4 style={styles.orderDetailsPrice}>
          {'$' + order.order_total}
        </Text>
      </View>
      {order.order_status !== 'Completed' && (
        <>
          {order.order_status == 'Being Prepared' && <Text style={styles.orderStatus}>{`Wait time: 15 minutes`}</Text>}

          <ButtonGroup
            selectedIndex={buttons
              .map(item => item.value)
              .indexOf(order.order_status)}
            buttons={buttons.map(item => item.title)}
            innerBorderStyle={{ width: 1.5 }}
            buttonStyle={styles.orderStatusButtons}
            containerStyle={{ height: 200 }}
            selectedButtonStyle={{ backgroundColor: '#E82800' }}
            vertical={true}
          />
        </>
      )}

      <Text h5 style={styles.orderItemCount}>
        {itemCount + (itemCount > 1 ? ' items' : ' item')}
      </Text>
      {(order.menu_items??[]).map((item, i) => {
        return (
          <View
            style={styles.orderDetailsItem}
            key={order.order_id + '_' + item.item + '_' + i}>
            <View style={styles.orderItemContainer}>
              <Text style={styles.orderDetailsItemName}>{item.quantity}x {item.item}</Text>
              <Text style={styles.orderItemPrice}>{item.item_price}</Text>
            </View>
            {checkForSpecialInstructions(item)}
          </View>
        );
      })}
      {order.comment != "" && (
        <Text style={[styles.orderDetailsItemName, { paddingTop: 10 }]}>
          Order Instructions: {order.comment}
        </Text>
      )}
      <View style={styles.orderTotalContainer}>
        <Text style={styles.orderDetailsItemName}>Total Order</Text>
        <Text style={styles.orderItemPrice}>{order.order_total}</Text>
      </View>
    </View>
  )
}

const buttons = [
  { title: 'Awaiting Confirmation', value: 'Awaiting Confirmation' },
  { title: 'Being Prepared', value: 'Being Prepared' },
  { title: 'Ready For Pick Up', value: 'Ready For Pick Up' }, // Ready For Pick Up || OUT for Delivery
  { title: 'Order Complete', value: 'Completed' },
];

const styles = StyleSheet.create({
  general: {
    flex: 1,
    backgroundColor: '#fff',
  },
  orderDetailsHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  orderHeadings: {
    textAlign: 'left',
    color: '#313131',
    padding: 10,
    fontWeight: 'bold',
    fontSize: 24,
    backgroundColor: '#fff',
  },
  dropoffName: {
    textAlign: 'left',
    color: '#313131',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
    marginTop: 20,
    flex: 2,
  },
  orderStatusButtons: {
    height: 50,
  },
  orderStatus: {
    color: '#242424',
    fontSize: 22,
    marginLeft: 10,
    textAlign: 'left',
  },
  orderDate: {
    marginLeft: 10,
    fontSize: 16,
  },
  orderItemCount: {
    marginTop: 10,
    marginLeft: 10,
    fontSize: 17,
    color: '#838383',
  },
  orderDetailsItem: {
    borderBottomWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  orderDetailsItemName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#313131',
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 10,
  },
  orderDetailsPrice: {
    textAlign: 'right',
    flex: 1,
    marginRight: 10,
    marginTop: 20,
  },
  orderDetailsItemDescription: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 10,
    fontSize: 18,
    color: '#363636',
  },
  orderDetailsSpecialInstructions: {
    marginLeft: 10,
    marginRight: 10,
    marginBottom: 5,
    fontSize: 16,
    color: '#363636',
  },
  orderDetailsItem: {
    borderBottomWidth: 2,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  orderItemContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 5,
  },
  orderDetailsItemName: {
    fontSize: 17,
    color: '#313131',
    marginLeft: 10,
  },
  orderItemPrice: {
    marginRight: 10,
    textAlign: 'right',
    fontSize: 17,
  },
  orderDetailsPrice: {
    textAlign: 'right',
    flex: 1,
    marginRight: 10,
    marginTop: 20,
  },
  orderTotalContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 5,
  },
});
