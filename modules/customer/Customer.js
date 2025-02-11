import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useRoute } from '@react-navigation/native'; 

import Profile from "./components/Profile";
import Promotion from "./components/Promotions";
import Orders from "./components/Orders"
import TabBar from "./tabbar";
import CheckoutContext from "./context/CheckoutContext";
import LoginPopup from "./components/LoginPopup";
import Cart from "./components/subcomponents/Cart/Cart"
import Help from "./components/Help"
import TermsAndPayment from "./components/TermsAndPayment";

const Tab = createBottomTabNavigator();

/**
 * 
 * @param {Object} props 
 * @param {import('../types').UserData} props.user
 * @returns 
 */
const Customer = ({ navigation, user, promos }) => {
  const route = useRoute();

  const [profile, setProfile] = useState(user)
  const [modalVisible, setModalVisible] = useState(false);
  
  const onModalOpen = () => {
    setModalVisible(true);
  };

  const onModalClose = () => {
    setModalVisible(false);
  };

  return (
    <>
      <LoginPopup
        visible={modalVisible}
        onClose={onModalClose}
        navigation={navigation}
      />
      {
        profile.accepted_terms ? (
          <NavigationBar
            navigation={navigation}
            onModalOpen={onModalOpen}
            isLoggedOut={route?.params?.isLoggedOut}
            user={profile}
            promos={promos}
          />
        ) : (
          <TermsAndPayment profile={profile} setProfile={setProfile}/>
        )
      }
    </>
  );
};

function NavigationBar({ onModalOpen, isLoggedOut, user, promos }) {
  //TODO: Add icons to the nav barr
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <TabBar
          {...props}
          onModalOpen={onModalOpen}
          isLoggedOut={isLoggedOut}
        />
      )}
    >
      <Tab.Screen
        name="Home"
        headerShown="false"
        component={Promotion}
        initialParams={{ user, promos, isLoggedOut }}
      />
      <Tab.Screen
        name="Orders"
        headerShown="false"
        component={Orders}
        initialParams={{ user, promos }}
      />
      <Tab.Screen
        name="Profile"
        headerShown="false"
        component={Profile}
        initialParams={{ user }}
        listeners={({ navigation, route }) => ({
          tabPress: async (e) => {
            e.preventDefault();
            navigation.navigate("Profile");
          },
        })}
      />
      <Tab.Screen
        name="Help"
        headerShown="false"
        component={Help}
        initialParams={{ user }}
      />
    </Tab.Navigator>
  );
}

export default Customer;