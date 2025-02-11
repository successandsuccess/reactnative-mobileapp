import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, Image } from "react-native";
import { RFValue } from "react-native-responsive-fontsize";

const home = require("../assets/tab/home.png");
const home_outline = require("../assets/tab/home-outline.png");
const help = require("../assets/tab/help.png");
const help_outline = require("../assets/tab/help-outline.png");
const menu = require("../assets/tab/menu.png");
const menu_outline = require("../assets/tab/menu-outline.png");
const order = require("../assets/tab/order.png");
const order_outline = require("../assets/tab/order-outline.png");
const profile = require("../assets/tab/profile.png");
const profile_outline = require("../assets/tab/profile-outline.png");
const promotion = require("../assets/tab/promotion.png");
const promotion_outline = require("../assets/tab/promotion-outline.png");

export default function Tabbar({
  state,
  navigation,
  onModalOpen,
  isLoggedOut,
}) {
  const { routes, index } = state;

  const geticon = (name) => {
    switch (name) {
      case "Home":
        return { selected: home, unselected: home_outline };
      case "Orders":
        return { selected: order, unselected: order_outline };
      case "Profile":
        return { selected: profile, unselected: profile_outline };
      case "Promotion":
        return { selected: promotion, unselected: promotion_outline };
      case "Help":
        return { selected: help, unselected: help_outline };
      default:
        return { selected: promotion, unselected: promotion_outline };
    }
  };

  return (
    <View style={style.container}>
      {routes.map((item, indexitem) => {
        const icon = geticon(item.name);
        return (
          <TouchableOpacity
            style={{ flex: 1, alignItems: "center" }}
            onPress={() => {
              if (
                isLoggedOut &&
                (item.name == "Promotion" ||
                  item.name == "Orders" ||
                  item.name == "Profile")
              ) {
                onModalOpen();
                return;
              } else {
                navigation.navigate(item.name);
              }
            }}
            key={indexitem}
          >
            {icon && (
              <Image
                source={index == indexitem ? icon.selected : icon.unselected}
                style={style.icon}
              />
            )}
            <Text style={[style.item, { color: "#E82800" }]}>{item.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const style = StyleSheet.create({
  container: {
    bottom: 0,
    display: "flex",
    flexDirection: "row",
    backgroundColor: "#fff",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    minHeight: 80,
    width: "100%",
    shadowOpacity: 0.4,
    shadowRadius: 16.0,
    elevation: 24,
    padding: 12,
    paddingBottom: 25,
  },
  item: {
    fontSize: RFValue(10, 580),
    color: "#fff",
    fontWeight: "600",
  },
  icon: {
    width: RFValue(22, 580),
    height: RFValue(22, 580),
    tintColor: "#E82800",
  },
});
