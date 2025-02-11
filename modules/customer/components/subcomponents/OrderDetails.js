import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ButtonGroup, Text } from 'react-native-elements';


export default class OrderDetails extends React.Component {
  constructor(props) {
    super(props);
    this.navigation = props.navigation;
    this.ordersList = props.route.params.ordersList;

    this.state = {
      order: props.route.params.order,
      selectedIndex: 0,
      loading: false,
    };
    const { selectedIndex } = this.state;
  }
  timeout = 0;

  componentDidMount() {
    this.timeout = setInterval(async () => {
      this.setState({ loading: true });
      let body = {
        incoming_id: this.state.order.customer_id,
      };
      fetch(
        'https://wwww',
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
        },
      )
        .then(async res => {
          let response = await res.json();
          console.log("⚠️⚠️", response);
          let orders = response;
          orders = orders.filter((order) => {
            return order.order_status !== 'Rejected'
          })
          let updatedOrder = orders.filter((one) => {
            return one.order_id === this.state.order.order_id;
          });
          this.setState({
            order: updatedOrder[0],
            loading: false
          });
        })
        .catch(err => {
          console.log('responsedataerror', err);
          this.setState({ loading: false });
        });
    }, 60000);
  }

  componentWillUnmount() {
    console.log("##### unmount #####");
    clearTimeout(this.timeout);
  }

  checkForItemDescription(item) {
    if (item.itemDescription !== '') {
      return (
        <Text style={styles.orderDetailsItemDescription}>
          {item.itemDescription}
        </Text>
      );
    }
  }

  checkForSpecialInstructions(item) {
    if (item.specialInstructions !== '') {
      return (
        <Text style={styles.orderDetailsSpecialInstructions}>
          {'Special Instructions: ' + item.instructions}
        </Text>
      );
    }
  }

  render() {
    let itemCount = 0;
    for (let item of this.state.order.menu_items) {
      itemCount += parseInt(item.quantity) ?? 1
    }
    return (
      <View style={styles.general}>
        <View style={styles.orderDetailsHeader}>
          <Text h4 style={styles.dropoffName}>
            {this.state.order.restaurant_name}
          </Text>
          <Text h4 style={styles.orderDetailsPrice}>
            {'$' + this.state.order.order_total}
          </Text>
        </View>
        {this.state.order.order_status !== 'Completed' && (
          <>
            {this.state.order.order_status == 'Being Prepared' && <Text style={styles.orderStatus}>{`Wait time: 15 minutes`}</Text>}

            <ButtonGroup
              selectedIndex={buttons
                .map(item => item.value)
                .indexOf(this.state.order.order_status)}
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
        {this.state.order.menu_items.map((item, i) => {
          return (
            <View
              style={styles.orderDetailsItem}
              key={this.state.order.order_id + '_' + item.item + '_' + i}>
              <View style={styles.orderItemContainer}>
                <Text style={styles.orderDetailsItemName}>{item.quantity}x {item.item}</Text>
                <Text style={styles.orderItemPrice}>{item.item_price}</Text>
              </View>
              {this.checkForSpecialInstructions(item)}
            </View>
          );
        })}
        {this.state.order.comment != "" && (
          <Text style={[styles.orderDetailsItemName, { paddingTop: 10 }]}>
            Order Instructions: {this.state.order.comment}
          </Text>
        )}
        <View style={styles.orderTotalContainer}>
          <Text style={styles.orderDetailsItemName}>Total Order</Text>
          <Text style={styles.orderItemPrice}>{this.state.order.order_total}</Text>
        </View>
      </View>
    );
  }
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
